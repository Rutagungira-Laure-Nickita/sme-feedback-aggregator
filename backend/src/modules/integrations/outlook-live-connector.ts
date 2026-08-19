import { createHash, randomBytes } from "node:crypto";
import {
  EmailProviderType,
  FeedbackChannel,
  IntegrationConnectionStatus,
  IntegrationCredentialType,
  IntegrationMode,
  IntegrationProvider
} from "../../lib/prisma-runtime.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { canonicalStringify } from "../feedback-processing/feedback-hash.service.js";
import type { NormalizedFeedbackInput } from "../feedback-processing/index.js";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  getIntegrationEncryptionKeyVersion
} from "./integration-credential-encryption.js";
import { INTEGRATION_ERRORS, IntegrationError } from "./integration.errors.js";
import type {
  ConnectorHealth,
  ExternalFeedbackConnector,
  ExternalFeedbackItem,
  IntegrationConnectionContext,
  IntegrationProviderCapabilities,
  SafeExternalItemPreview
} from "./integration.types.js";
import { maskEmail } from "./gmail-live-connector.js";

export const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.Read"
];

const MAX_EMAIL_SYNC_ITEMS = 20;
const MAX_BODY_CHARS = 10_000;
const MAX_SUBJECT_CHARS = 250;
const MAX_DELTA_PAGES = 3;
const TOKEN_REFRESH_SKEW_MS = 60_000;
const GRAPH_PREFER = 'IdType="ImmutableId", outlook.body-content-type="text"';

type OutlookTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  expiryDate: Date | null;
  scopeSummary: string | null;
};

type OutlookTokenResult = {
  accessToken: string | null;
  refreshToken: string | null;
  expiryDate: Date | null;
  scopes: string[];
};

type OutlookAccountIdentity = {
  id: string;
  emailAddress: string;
  tenantId: string | null;
};

type OutlookMessage = {
  id?: string;
  internetMessageId?: string | null;
  subject?: string | null;
  from?: { emailAddress?: { name?: string | null; address?: string | null } | null };
  sender?: { emailAddress?: { name?: string | null; address?: string | null } | null };
  receivedDateTime?: string | null;
  body?: { contentType?: string | null; content?: string | null } | null;
  hasAttachments?: boolean | null;
  conversationId?: string | null;
  "@removed"?: unknown;
};

type OutlookAttachment = {
  id?: string | null;
  name?: string | null;
  contentType?: string | null;
  size?: number | null;
  isInline?: boolean | null;
};

type OutlookListResult = {
  value: OutlookMessage[];
  nextLink?: string | null;
  deltaLink?: string | null;
};

type OutlookGraphClient = {
  getAuthorizationUrl(input: { state: string; codeChallenge: string }): string;
  exchangeCode(input: {
    code: string;
    codeVerifier: string;
  }): Promise<OutlookTokenResult>;
  getAccountIdentity(tokens: OutlookTokens): Promise<OutlookAccountIdentity>;
  listInitialInboxMessages(tokens: OutlookTokens): Promise<OutlookListResult>;
  getDeltaMessages(tokens: OutlookTokens, cursor: string): Promise<OutlookListResult>;
  initializeDeltaCursor(
    tokens: OutlookTokens,
    earliestReceivedAt: string
  ): Promise<string | null>;
  listAttachmentMetadata(
    tokens: OutlookTokens,
    messageId: string
  ): Promise<OutlookAttachment[]>;
};

export type OutlookAuthorizationSession = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
};

export class MicrosoftGraphOutlookClient implements OutlookGraphClient {
  public getAuthorizationUrl(input: { state: string; codeChallenge: string }): string {
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_OAUTH_CLIENT_ID ?? "",
      response_type: "code",
      redirect_uri: env.MICROSOFT_OAUTH_REDIRECT_URI ?? "",
      response_mode: "query",
      scope: OUTLOOK_SCOPES.join(" "),
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account"
    });
    return `${microsoftAuthorityUrl()}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  public async exchangeCode(input: {
    code: string;
    codeVerifier: string;
  }): Promise<OutlookTokenResult> {
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_OAUTH_CLIENT_ID ?? "",
      client_secret: env.MICROSOFT_OAUTH_CLIENT_SECRET ?? "",
      code: input.code,
      redirect_uri: env.MICROSOFT_OAUTH_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
      scope: OUTLOOK_SCOPES.join(" ")
    });
    return parseTokenResponse(await this.tokenRequest(params));
  }

  public async getAccountIdentity(
    tokens: OutlookTokens
  ): Promise<OutlookAccountIdentity> {
    const data = (await graphJson(tokens, "/me?$select=id,mail,userPrincipalName")) as {
      id?: string;
      mail?: string | null;
      userPrincipalName?: string | null;
    };
    const emailAddress = (data.mail || data.userPrincipalName || "").trim();
    if (!data.id || !emailAddress.includes("@")) {
      throw new IntegrationError(
        "Outlook mailbox identity could not be loaded.",
        INTEGRATION_ERRORS.OUTLOOK_MAILBOX_NOT_FOUND,
        409
      );
    }

    return {
      id: data.id,
      emailAddress: emailAddress.toLowerCase(),
      tenantId: null
    };
  }

  public async listInitialInboxMessages(
    tokens: OutlookTokens
  ): Promise<OutlookListResult> {
    const query = new URLSearchParams({
      $select:
        "id,internetMessageId,subject,from,sender,receivedDateTime,body,hasAttachments,conversationId",
      $orderby: "receivedDateTime desc",
      $top: String(MAX_EMAIL_SYNC_ITEMS)
    });
    return graphList(tokens, `/me/mailFolders/inbox/messages?${query.toString()}`);
  }

  public async getDeltaMessages(
    tokens: OutlookTokens,
    cursor: string
  ): Promise<OutlookListResult> {
    return graphList(tokens, cursor);
  }

  public async initializeDeltaCursor(
    tokens: OutlookTokens,
    earliestReceivedAt: string
  ): Promise<string | null> {
    const query = new URLSearchParams({
      changeType: "created",
      $select:
        "id,internetMessageId,subject,from,sender,receivedDateTime,body,hasAttachments,conversationId",
      $filter: `receivedDateTime ge ${earliestReceivedAt}`,
      $orderby: "receivedDateTime desc",
      $top: String(MAX_EMAIL_SYNC_ITEMS)
    });
    let page = await graphList(
      tokens,
      `/me/mailFolders/inbox/messages/delta?${query.toString()}`
    );
    for (let i = 0; i < MAX_DELTA_PAGES; i += 1) {
      if (page.deltaLink) return page.deltaLink;
      if (!page.nextLink) return null;
      page = await graphList(tokens, page.nextLink);
    }
    return page.deltaLink ?? page.nextLink ?? null;
  }

  public async listAttachmentMetadata(
    tokens: OutlookTokens,
    messageId: string
  ): Promise<OutlookAttachment[]> {
    const query = new URLSearchParams({
      $select: "id,name,contentType,size,isInline"
    });
    const result = await graphList(
      tokens,
      `/me/messages/${encodeURIComponent(messageId)}/attachments?${query.toString()}`
    );
    return result.value as OutlookAttachment[];
  }

  private async tokenRequest(params: URLSearchParams): Promise<unknown> {
    const response = await fetch(`${microsoftAuthorityUrl()}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    if (!response.ok) {
      throw new IntegrationError(
        "Outlook authorization could not be completed.",
        response.status === 401 || response.status === 400
          ? INTEGRATION_ERRORS.OUTLOOK_TOKEN_REFRESH_FAILED
          : INTEGRATION_ERRORS.OUTLOOK_PROVIDER_UNAVAILABLE,
        response.status === 429 || response.status >= 500 ? 503 : 409
      );
    }
    return response.json();
  }
}

let graphClient: OutlookGraphClient = new MicrosoftGraphOutlookClient();

export function setOutlookGraphClientForTests(client: OutlookGraphClient): void {
  graphClient = client;
}

export function resetOutlookGraphClientForTests(): void {
  graphClient = new MicrosoftGraphOutlookClient();
}

export function assertLiveOutlookConfigured(): void {
  if (
    !env.LIVE_OUTLOOK_ENABLED ||
    !env.MICROSOFT_OAUTH_CLIENT_ID ||
    !env.MICROSOFT_OAUTH_CLIENT_SECRET ||
    !env.MICROSOFT_OAUTH_REDIRECT_URI
  ) {
    throw new IntegrationError(
      "Live Outlook is not configured for this workspace yet.",
      INTEGRATION_ERRORS.OUTLOOK_NOT_CONFIGURED,
      503
    );
  }
}

export function createOutlookAuthorizationSession(): OutlookAuthorizationSession {
  assertLiveOutlookConfigured();
  const state = randomBase64Url(32);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  return {
    authorizationUrl: graphClient.getAuthorizationUrl({ state, codeChallenge }),
    state,
    codeVerifier,
    codeChallenge
  };
}

export class OutlookLiveConnector implements ExternalFeedbackConnector {
  public readonly provider = IntegrationProvider.EMAIL;
  public readonly mode = IntegrationMode.LIVE;

  public supportsMode(mode: IntegrationMode): boolean {
    return mode === IntegrationMode.LIVE;
  }

  public getCapabilities(): IntegrationProviderCapabilities {
    return {
      provider: IntegrationProvider.EMAIL,
      mode: IntegrationMode.LIVE,
      label: "Email",
      channel: FeedbackChannel.EMAIL,
      demoSupported: false,
      liveSupported: env.LIVE_OUTLOOK_ENABLED,
      supportsRatings: false,
      supportsAttachments: true,
      description:
        "Connect Outlook or Microsoft 365 with OAuth and import Inbox messages as feedback."
    };
  }

  public async testConnection(
    context: IntegrationConnectionContext
  ): Promise<ConnectorHealth> {
    assertLiveOutlookConfigured();
    const tokens = await loadTokens(context.connectionId);
    const identity = await graphClient.getAccountIdentity(tokens);
    if (
      context.providerAccountId &&
      identity.id.toLowerCase() !== context.providerAccountId.toLowerCase()
    ) {
      throw new IntegrationError(
        "Connected Outlook account does not match this connection.",
        INTEGRATION_ERRORS.OUTLOOK_MAILBOX_NOT_FOUND,
        409
      );
    }
    await graphClient.listInitialInboxMessages(tokens);
    await prisma.integrationConnection.update({
      where: { id: context.connectionId },
      data: {
        lastConnectionTestAt: new Date(),
        lastConnectionTestStatus: "PASSED",
        lastErrorCode: null,
        requiresReauthorization: false
      }
    });
    return {
      ok: true,
      code: "OUTLOOK_CONNECTION_READY",
      message: "Outlook connection is ready. Inbox access is available.",
      checkedAt: new Date(),
      providerAccountLabel: maskEmail(identity.emailAddress)
    };
  }

  public async fetchDemoItems(): Promise<ExternalFeedbackItem[]> {
    throw new IntegrationError(
      "Live Outlook uses the live synchronization path.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  public async fetchItems(
    context: IntegrationConnectionContext
  ): Promise<ExternalFeedbackItem[]> {
    assertLiveOutlookConfigured();
    const tokens = await loadTokens(context.connectionId);
    const listed = context.lastProviderCursor
      ? await graphClient.getDeltaMessages(tokens, context.lastProviderCursor)
      : await graphClient.listInitialInboxMessages(tokens);
    const items: ExternalFeedbackItem[] = [];

    for (const message of listed.value.slice(0, MAX_EMAIL_SYNC_ITEMS)) {
      if (message["@removed"]) continue;
      try {
        items.push(await toExternalFeedbackItem(context, tokens, message));
      } catch (error) {
        const messageId = message.id ?? randomBase64Url(12);
        items.push({
          externalId: outlookExternalId(context.connectionId, messageId),
          sourceLabel: "Outlook message",
          authorName: "Outlook sender",
          message: "Message could not be processed.",
          occurredAt: new Date().toISOString(),
          metadata: {
            liveMode: true,
            provider: "OUTLOOK",
            outlookMessageIdHash: sha256(messageId)
          },
          invalidReason:
            error instanceof IntegrationError
              ? error.message
              : "Outlook message could not be processed safely."
        });
      }
    }

    await persistOutlookCursor(context, tokens, listed, items);
    return items;
  }

  public normalizeItem(
    item: ExternalFeedbackItem,
    context: IntegrationConnectionContext
  ): NormalizedFeedbackInput {
    if (item.invalidReason) {
      throw new IntegrationError(
        item.invalidReason,
        INTEGRATION_ERRORS.OUTLOOK_MESSAGE_INVALID,
        400
      );
    }
    return {
      businessId: context.businessId,
      branchId: context.defaultBranchId,
      channel: FeedbackChannel.EMAIL,
      externalId: item.externalId,
      idempotencyKey: `email:outlook:${context.connectionId}:${item.externalId}`,
      title: item.title,
      message: item.message,
      occurredAt: item.occurredAt,
      customer: item.customer,
      attachments: item.attachments,
      metadata: {
        sourceType: "live-email",
        provider: IntegrationProvider.EMAIL,
        providerLabel: "Email",
        liveMode: true,
        demoMode: false,
        liveProviderType: EmailProviderType.MICROSOFT,
        connectionId: context.connectionId,
        connectionName: context.displayName,
        externalSourceItemId: item.externalId,
        externalReceivedAt: item.occurredAt,
        sourceLabel: item.sourceLabel,
        originalPreview: previewText(item.message),
        ...item.metadata
      }
    };
  }

  public getSafePreview(item: ExternalFeedbackItem): SafeExternalItemPreview {
    return {
      provider: IntegrationProvider.EMAIL,
      providerLabel: "Email",
      sourceType: item.sourceLabel,
      author: item.authorName,
      textPreview: previewText(item.message),
      title: item.title ?? null,
      occurredAt: item.occurredAt,
      externalId: item.externalId,
      liveMode: true,
      demoMode: false,
      simulatedExternalData: false,
      attachmentCount: item.attachments?.length ?? 0
    };
  }

  public getPayloadHash(item: ExternalFeedbackItem): string {
    return createHash("sha256")
      .update(
        canonicalStringify({
          externalId: item.externalId,
          sourceLabel: item.sourceLabel,
          authorName: item.authorName,
          title: item.title ?? null,
          message: item.message,
          occurredAt: item.occurredAt,
          customer: item.customer ?? null,
          attachments: item.attachments ?? [],
          metadata: item.metadata
        })
      )
      .digest("hex");
  }
}

export async function exchangeOutlookAuthorizationCode(input: {
  connectionId: string;
  code: string;
  codeVerifier: string;
}): Promise<{
  identity: OutlookAccountIdentity;
  accessTokenExpiresAt: Date | null;
  scopeSummary: string;
}> {
  assertLiveOutlookConfigured();
  const result = await graphClient.exchangeCode({
    code: input.code,
    codeVerifier: input.codeVerifier
  });
  const missingScope = OUTLOOK_SCOPES.filter(
    (scope) =>
      !["openid", "profile"].includes(scope) &&
      !result.scopes.some((granted) => granted.toLowerCase() === scope.toLowerCase())
  );
  if (missingScope.length > 0) {
    throw new IntegrationError(
      "Outlook Mail.Read permission was not granted.",
      INTEGRATION_ERRORS.OUTLOOK_PERMISSION_MISSING,
      400
    );
  }
  if (!result.refreshToken) {
    throw new IntegrationError(
      "Outlook authorization did not include a refresh token. Please reauthorize access.",
      INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REQUIRED,
      409
    );
  }
  const tokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiryDate: result.expiryDate,
    scopeSummary: OUTLOOK_SCOPES.join(" ")
  };
  const identity = await graphClient.getAccountIdentity(tokens);
  await storeTokens(input.connectionId, tokens);
  return {
    identity,
    accessTokenExpiresAt: result.expiryDate,
    scopeSummary: OUTLOOK_SCOPES.join(" ")
  };
}

async function toExternalFeedbackItem(
  context: IntegrationConnectionContext,
  tokens: OutlookTokens,
  message: OutlookMessage
): Promise<ExternalFeedbackItem> {
  if (!message.id) {
    throw new IntegrationError(
      "Outlook message is missing a stable identifier.",
      INTEGRATION_ERRORS.OUTLOOK_MESSAGE_INVALID,
      400
    );
  }
  const sender = message.from?.emailAddress ?? message.sender?.emailAddress ?? null;
  const senderEmail = sender?.address?.trim().toLowerCase() ?? null;
  if (!senderEmail) {
    throw new IntegrationError(
      "Outlook message is missing a sender email.",
      INTEGRATION_ERRORS.OUTLOOK_MESSAGE_INVALID,
      400
    );
  }
  const body = normalizeBody(message.body?.content ?? "");
  if (!body) {
    throw new IntegrationError(
      "Outlook message has no usable plain text body.",
      INTEGRATION_ERRORS.OUTLOOK_BODY_EMPTY,
      400
    );
  }
  const attachments = message.hasAttachments
    ? (await graphClient.listAttachmentMetadata(tokens, message.id))
        .slice(0, 10)
        .map((attachment) => ({
          filename: truncate(attachment.name || "Outlook attachment", 255),
          mimeType: truncate(attachment.contentType || "application/octet-stream", 120),
          sizeBytes: attachment.size ?? undefined,
          metadata: {
            source: "outlook",
            metadataOnly: true,
            inline: attachment.isInline === true,
            providerAttachmentId: attachment.id ? sha256(attachment.id) : null
          }
        }))
    : [];

  const receivedAt = message.receivedDateTime
    ? new Date(message.receivedDateTime).toISOString()
    : new Date().toISOString();
  const displayName = sender?.name?.trim() || senderEmail;

  return {
    externalId: outlookExternalId(context.connectionId, message.id),
    sourceLabel: "Outlook Inbox message",
    authorName: displayName,
    title:
      truncate(message.subject?.trim() ?? "", MAX_SUBJECT_CHARS) ||
      `Email from ${maskEmail(senderEmail)}`,
    message: truncate(body, MAX_BODY_CHARS),
    occurredAt: receivedAt,
    customer: {
      name: displayName,
      email: senderEmail
    },
    attachments,
    metadata: {
      liveProviderType: EmailProviderType.MICROSOFT,
      outlookMessageIdHash: sha256(message.id),
      internetMessageIdHash: message.internetMessageId
        ? sha256(message.internetMessageId)
        : null,
      hasInternetMessageId: Boolean(message.internetMessageId),
      conversationIdHash: message.conversationId ? sha256(message.conversationId) : null,
      providerAccountLabel: context.providerAccountLabel
        ? maskEmail(context.providerAccountLabel)
        : null,
      attachmentCount: attachments.length,
      inboxFolder: "inbox",
      immutableIdRequested: true
    }
  };
}

async function persistOutlookCursor(
  context: IntegrationConnectionContext,
  tokens: OutlookTokens,
  listed: OutlookListResult,
  items: ExternalFeedbackItem[]
): Promise<void> {
  let cursor = listed.deltaLink ?? listed.nextLink ?? null;
  if (!context.lastProviderCursor && items.length > 0) {
    const earliest = items
      .map((item) => item.occurredAt)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    if (earliest) {
      cursor = (await graphClient.initializeDeltaCursor(tokens, earliest)) ?? cursor;
    }
  }
  if (!cursor) return;
  await prisma.integrationConnection.update({
    where: { id: context.connectionId },
    data: {
      lastProviderCursor: cursor,
      lastProviderCursorAt: new Date()
    }
  });
}

async function loadTokens(connectionId: string): Promise<OutlookTokens> {
  const credential = await prisma.integrationCredential.findUnique({
    where: {
      connectionId_credentialType: {
        connectionId,
        credentialType: IntegrationCredentialType.OAUTH2
      }
    }
  });
  if (!credential || credential.revokedAt || !credential.encryptedRefreshToken) {
    throw new IntegrationError(
      "Outlook authorization is required before synchronizing.",
      INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REQUIRED,
      409
    );
  }
  const tokens = {
    accessToken: credential.encryptedAccessToken
      ? decryptIntegrationSecret(
          credential.encryptedAccessToken,
          accessTokenAssociatedData(connectionId)
        )
      : null,
    refreshToken: decryptIntegrationSecret(
      credential.encryptedRefreshToken,
      refreshTokenAssociatedData(connectionId)
    ),
    expiryDate: credential.accessTokenExpiresAt,
    scopeSummary: credential.scopeSummary
  };
  if (
    !tokens.accessToken ||
    !tokens.expiryDate ||
    tokens.expiryDate.getTime() - Date.now() < TOKEN_REFRESH_SKEW_MS
  ) {
    return refreshTokens(connectionId, tokens);
  }
  return tokens;
}

async function refreshTokens(
  connectionId: string,
  tokens: OutlookTokens
): Promise<OutlookTokens> {
  if (!tokens.refreshToken) {
    throw new IntegrationError(
      "Outlook reauthorization is required.",
      INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REQUIRED,
      409
    );
  }
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_OAUTH_CLIENT_ID ?? "",
    client_secret: env.MICROSOFT_OAUTH_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    scope: OUTLOOK_SCOPES.join(" ")
  });
  const response = await fetch(`${microsoftAuthorityUrl()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  if (!response.ok) {
    await prisma.integrationConnection.updateMany({
      where: { id: connectionId },
      data: {
        status: IntegrationConnectionStatus.ERROR,
        requiresReauthorization: true,
        lastErrorCode: INTEGRATION_ERRORS.OUTLOOK_TOKEN_REFRESH_FAILED
      }
    });
    throw new IntegrationError(
      "Outlook access expired. Reauthorize this connection.",
      INTEGRATION_ERRORS.OUTLOOK_TOKEN_REFRESH_FAILED,
      409
    );
  }
  const refreshed = parseTokenResponse(await response.json());
  const nextTokens = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
    expiryDate: refreshed.expiryDate,
    scopeSummary: OUTLOOK_SCOPES.join(" ")
  };
  await storeTokens(connectionId, nextTokens);
  return nextTokens;
}

async function storeTokens(connectionId: string, tokens: OutlookTokens): Promise<void> {
  await prisma.integrationCredential.upsert({
    where: {
      connectionId_credentialType: {
        connectionId,
        credentialType: IntegrationCredentialType.OAUTH2
      }
    },
    create: {
      connectionId,
      credentialType: IntegrationCredentialType.OAUTH2,
      encryptedAccessToken: tokens.accessToken
        ? encryptIntegrationSecret(
            tokens.accessToken,
            accessTokenAssociatedData(connectionId)
          )
        : null,
      encryptedRefreshToken: tokens.refreshToken
        ? encryptIntegrationSecret(
            tokens.refreshToken,
            refreshTokenAssociatedData(connectionId)
          )
        : null,
      encryptionKeyVersion: getIntegrationEncryptionKeyVersion(),
      accessTokenExpiresAt: tokens.expiryDate,
      scopeSummary: tokens.scopeSummary,
      rotatedAt: new Date()
    },
    update: {
      encryptedAccessToken: tokens.accessToken
        ? encryptIntegrationSecret(
            tokens.accessToken,
            accessTokenAssociatedData(connectionId)
          )
        : undefined,
      encryptedRefreshToken: tokens.refreshToken
        ? encryptIntegrationSecret(
            tokens.refreshToken,
            refreshTokenAssociatedData(connectionId)
          )
        : undefined,
      encryptionKeyVersion: getIntegrationEncryptionKeyVersion(),
      accessTokenExpiresAt: tokens.expiryDate,
      scopeSummary: tokens.scopeSummary,
      rotatedAt: new Date(),
      revokedAt: null
    }
  });
}

async function graphJson(tokens: OutlookTokens, pathOrUrl: string): Promise<unknown> {
  const response = await fetch(graphUrl(pathOrUrl), {
    headers: {
      Authorization: `Bearer ${tokens.accessToken ?? ""}`,
      Prefer: GRAPH_PREFER
    }
  });
  if (response.status === 429) {
    throw new IntegrationError(
      "Microsoft Graph rate limit was reached. Try again later.",
      INTEGRATION_ERRORS.OUTLOOK_RATE_LIMITED,
      503
    );
  }
  if (!response.ok) {
    throw new IntegrationError(
      "Microsoft Graph request failed safely.",
      response.status === 401 || response.status === 403
        ? INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REVOKED
        : INTEGRATION_ERRORS.OUTLOOK_PROVIDER_UNAVAILABLE,
      response.status === 401 || response.status === 403 ? 409 : 503
    );
  }
  return response.json();
}

async function graphList(
  tokens: OutlookTokens,
  pathOrUrl: string
): Promise<OutlookListResult> {
  try {
    const data = (await graphJson(tokens, pathOrUrl)) as {
      value?: OutlookMessage[];
      "@odata.nextLink"?: string;
      "@odata.deltaLink"?: string;
    };
    return {
      value: Array.isArray(data.value) ? data.value : [],
      nextLink: data["@odata.nextLink"] ?? null,
      deltaLink: data["@odata.deltaLink"] ?? null
    };
  } catch (error) {
    if (
      error instanceof IntegrationError &&
      error.code === INTEGRATION_ERRORS.OUTLOOK_PROVIDER_UNAVAILABLE &&
      pathOrUrl.includes("/delta")
    ) {
      throw new IntegrationError(
        "Outlook delta cursor is no longer valid.",
        INTEGRATION_ERRORS.OUTLOOK_DELTA_INVALID,
        409
      );
    }
    throw error;
  }
}

function parseTokenResponse(data: unknown): OutlookTokenResult {
  const value = data as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  return {
    accessToken: value.access_token ?? null,
    refreshToken: value.refresh_token ?? null,
    expiryDate:
      typeof value.expires_in === "number"
        ? new Date(Date.now() + value.expires_in * 1000)
        : null,
    scopes: typeof value.scope === "string" ? value.scope.split(/\s+/) : []
  };
}

function graphUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${env.MICROSOFT_GRAPH_BASE_URL.replace(/\/+$/, "")}/${pathOrUrl.replace(/^\/+/, "")}`;
}

function microsoftAuthorityUrl(): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(env.MICROSOFT_OAUTH_TENANT)}`;
}

function outlookExternalId(connectionId: string, messageId: string): string {
  return truncate(`outlook:${connectionId}:${messageId}`, 255);
}

function accessTokenAssociatedData(connectionId: string): string {
  return `integration:${connectionId}:outlook:access-token`;
}

function refreshTokenAssociatedData(connectionId: string): string {
  return `integration:${connectionId}:outlook:refresh-token`;
}

export function outlookVerifierAssociatedData(connectionId: string): string {
  return `integration:${connectionId}:outlook:pkce-verifier`;
}

function normalizeBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

function previewText(message: string): string {
  return message.length <= 180 ? message : `${message.slice(0, 177).trimEnd()}...`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max).trimEnd();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomBase64Url(bytes: number): string {
  return base64Url(randomBytes(bytes));
}

function base64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export const outlookLiveConnectorTestUtils = {
  outlookExternalId,
  GRAPH_PREFER,
  toExternalFeedbackItemForTests: toExternalFeedbackItem
};
