import { createHash, randomBytes } from "node:crypto";
import { htmlToText } from "html-to-text";
import {
  EmailProviderType,
  FeedbackChannel,
  IntegrationConnectionStatus,
  IntegrationCredentialType,
  IntegrationMode,
  IntegrationProvider
} from "../../lib/prisma-runtime.js";
import { CodeChallengeMethod } from "google-auth-library";
import { google, type gmail_v1 } from "googleapis";
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

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const DEFAULT_GMAIL_FEEDBACK_LABEL = "Customer Feedback";
const USER_ID = "me";
const INBOX_LABEL = "INBOX";
const MAX_EMAIL_SYNC_ITEMS = 20;
const MAX_MIME_DEPTH = 8;
const MAX_MIME_PARTS = 100;
const MAX_BODY_CHARS = 10_000;
const MAX_SUBJECT_CHARS = 250;

type GmailTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  expiryDate: Date | null;
  scopeSummary: string | null;
};

type GmailAuthorizationResult = {
  accessToken: string | null;
  refreshToken: string | null;
  expiryDate: Date | null;
  scopes: string[];
};

type GmailAccountIdentity = {
  id: string;
  emailAddress: string;
  historyId: string | null;
};

type GmailProviderClient = {
  getAuthorizationUrl(input: { state: string; codeChallenge: string }): string;
  exchangeCode(input: {
    code: string;
    codeVerifier: string;
  }): Promise<GmailAuthorizationResult>;
  getAccountIdentity(tokens: GmailTokens): Promise<GmailAccountIdentity>;
  listInboxMessages(
    tokens: GmailTokens,
    feedbackLabel: string
  ): Promise<{
    messages: Array<{ id: string; threadId?: string | null }>;
    feedbackLabelId: string;
  }>;
  listHistoryMessages(
    tokens: GmailTokens,
    cursor: string,
    feedbackLabel: string
  ): Promise<{
    messages: Array<{ id: string; threadId?: string | null }>;
    historyId: string | null;
    feedbackLabelId: string;
  }>;
  getMessage(tokens: GmailTokens, messageId: string): Promise<gmail_v1.Schema$Message>;
  revoke(tokens: GmailTokens): Promise<void>;
};

export type GmailAuthorizationSession = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
};

export class GoogleApisGmailProviderClient implements GmailProviderClient {
  public getAuthorizationUrl(input: { state: string; codeChallenge: string }): string {
    return this.createOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [GMAIL_READONLY_SCOPE],
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      include_granted_scopes: false
    });
  }

  public async exchangeCode(input: {
    code: string;
    codeVerifier: string;
  }): Promise<GmailAuthorizationResult> {
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken({
      code: input.code,
      codeVerifier: input.codeVerifier
    });

    return {
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: typeof tokens.scope === "string" ? tokens.scope.split(/\s+/) : []
    };
  }

  public async getAccountIdentity(tokens: GmailTokens): Promise<GmailAccountIdentity> {
    const client = this.authorizedClient(tokens);
    const gmail = google.gmail({ version: "v1", auth: client });
    const profile = await gmail.users.getProfile({ userId: USER_ID });
    const emailAddress = profile.data.emailAddress;
    if (!emailAddress) {
      throw new IntegrationError(
        "Gmail mailbox identity could not be loaded.",
        INTEGRATION_ERRORS.EMAIL_MAILBOX_NOT_FOUND,
        409
      );
    }

    await persistRefreshedAccessToken(tokens, client.credentials);
    return {
      id: emailAddress.toLowerCase(),
      emailAddress,
      historyId: profile.data.historyId ?? null
    };
  }

  public async listInboxMessages(tokens: GmailTokens, feedbackLabel: string) {
    const client = this.authorizedClient(tokens);
    const gmail = google.gmail({ version: "v1", auth: client });
    const feedbackLabelId = await resolveGmailLabelId(gmail, feedbackLabel);
    const result = await gmail.users.messages.list({
      userId: USER_ID,
      labelIds: [INBOX_LABEL, feedbackLabelId],
      includeSpamTrash: false,
      maxResults: MAX_EMAIL_SYNC_ITEMS
    });
    await persistRefreshedAccessToken(tokens, client.credentials);
    return {
      feedbackLabelId,
      messages: (result.data.messages ?? [])
        .filter((message): message is gmail_v1.Schema$Message & { id: string } =>
          Boolean(message.id)
        )
        .map((message) => ({ id: message.id, threadId: message.threadId }))
    };
  }

  public async listHistoryMessages(
    tokens: GmailTokens,
    cursor: string,
    feedbackLabel: string
  ) {
    const client = this.authorizedClient(tokens);
    const gmail = google.gmail({ version: "v1", auth: client });
    const feedbackLabelId = await resolveGmailLabelId(gmail, feedbackLabel);
    try {
      const result = await gmail.users.history.list({
        userId: USER_ID,
        startHistoryId: cursor,
        labelId: feedbackLabelId,
        historyTypes: ["messageAdded", "labelAdded"],
        maxResults: MAX_EMAIL_SYNC_ITEMS
      });
      const messages = (result.data.history ?? [])
        .flatMap((history) => [
          ...(history.messagesAdded ?? []).map((entry) => entry.message),
          ...(history.labelsAdded ?? []).map((entry) => entry.message)
        ])
        .filter((message): message is gmail_v1.Schema$Message => Boolean(message?.id))
        .slice(0, MAX_EMAIL_SYNC_ITEMS)
        .map((message) => ({ id: message.id!, threadId: message.threadId }));
      await persistRefreshedAccessToken(tokens, client.credentials);
      return {
        messages,
        historyId: result.data.historyId ?? null,
        feedbackLabelId
      };
    } catch (error) {
      if (isGoogleStatus(error, 404)) {
        throw new IntegrationError(
          "Gmail history cursor is no longer valid. Reauthorize and run a bounded sync.",
          INTEGRATION_ERRORS.EMAIL_CURSOR_INVALID,
          409
        );
      }
      throw error;
    }
  }

  public async getMessage(
    tokens: GmailTokens,
    messageId: string
  ): Promise<gmail_v1.Schema$Message> {
    const client = this.authorizedClient(tokens);
    const gmail = google.gmail({ version: "v1", auth: client });
    const result = await gmail.users.messages.get({
      userId: USER_ID,
      id: messageId,
      format: "full"
    });
    await persistRefreshedAccessToken(tokens, client.credentials);
    return result.data;
  }

  public async revoke(tokens: GmailTokens): Promise<void> {
    const client = this.authorizedClient(tokens);
    const token = tokens.refreshToken ?? tokens.accessToken;
    if (!token) return;
    await client.revokeToken(token);
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      env.GMAIL_OAUTH_CLIENT_ID,
      env.GMAIL_OAUTH_CLIENT_SECRET,
      env.GMAIL_OAUTH_REDIRECT_URI
    );
  }

  private authorizedClient(tokens: GmailTokens) {
    const client = this.createOAuthClient();
    client.setCredentials({
      access_token: tokens.accessToken ?? undefined,
      refresh_token: tokens.refreshToken ?? undefined,
      expiry_date: tokens.expiryDate?.getTime()
    });
    return client;
  }
}

let providerClient: GmailProviderClient = new GoogleApisGmailProviderClient();

export function setGmailProviderClientForTests(client: GmailProviderClient): void {
  providerClient = client;
}

export function resetGmailProviderClientForTests(): void {
  providerClient = new GoogleApisGmailProviderClient();
}

export function assertLiveEmailConfigured(): void {
  if (
    !env.LIVE_EMAIL_ENABLED ||
    !env.GMAIL_OAUTH_CLIENT_ID ||
    !env.GMAIL_OAUTH_CLIENT_SECRET ||
    !env.GMAIL_OAUTH_REDIRECT_URI
  ) {
    throw new IntegrationError(
      "Live Email is not configured for this workspace yet.",
      INTEGRATION_ERRORS.LIVE_EMAIL_NOT_CONFIGURED,
      503
    );
  }
}

export function createGmailAuthorizationSession(): GmailAuthorizationSession {
  assertLiveEmailConfigured();
  const state = randomBase64Url(32);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  return {
    authorizationUrl: providerClient.getAuthorizationUrl({ state, codeChallenge }),
    state,
    codeVerifier,
    codeChallenge
  };
}

export class GmailLiveConnector implements ExternalFeedbackConnector {
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
      liveSupported: env.LIVE_EMAIL_ENABLED,
      supportsRatings: false,
      supportsAttachments: true,
      description: "Connect Gmail with OAuth and import Inbox messages as feedback."
    };
  }

  public async testConnection(
    context: IntegrationConnectionContext
  ): Promise<ConnectorHealth> {
    assertLiveEmailConfigured();
    const tokens = await loadTokens(context.connectionId);
    const identity = await providerClient.getAccountIdentity(tokens);
    if (
      context.providerAccountId &&
      identity.id.toLowerCase() !== context.providerAccountId.toLowerCase()
    ) {
      throw new IntegrationError(
        "Connected Gmail account does not match this connection.",
        INTEGRATION_ERRORS.EMAIL_MAILBOX_NOT_FOUND,
        409
      );
    }

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
      code: "GMAIL_CONNECTION_READY",
      message: "Gmail connection is ready. Inbox access is available.",
      checkedAt: new Date(),
      providerAccountLabel: maskEmail(identity.emailAddress)
    };
  }

  public async fetchDemoItems(): Promise<ExternalFeedbackItem[]> {
    throw new IntegrationError(
      "Live Gmail uses the live synchronization path.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  public async fetchItems(
    context: IntegrationConnectionContext
  ): Promise<ExternalFeedbackItem[]> {
    assertLiveEmailConfigured();
    const tokens = await loadTokens(context.connectionId);
    const feedbackLabel = resolveGmailFeedbackLabel(context.synchronizationFolder);
    const listed = context.lastProviderCursor
      ? await providerClient.listHistoryMessages(
          tokens,
          context.lastProviderCursor,
          feedbackLabel
        )
      : await providerClient.listInboxMessages(tokens, feedbackLabel);
    const uniqueIds = [
      ...new Map(listed.messages.map((message) => [message.id, message])).values()
    ].slice(0, MAX_EMAIL_SYNC_ITEMS);
    const items: ExternalFeedbackItem[] = [];

    for (const message of uniqueIds) {
      try {
        const detail = await providerClient.getMessage(tokens, message.id);
        if (!hasRequiredGmailLabels(detail, listed.feedbackLabelId)) continue;
        items.push(toExternalFeedbackItem(context, detail, feedbackLabel));
      } catch (error) {
        items.push({
          externalId: gmailExternalId(context.connectionId, message.id),
          sourceLabel: "Gmail message",
          authorName: "Gmail sender",
          message: "Message could not be fetched.",
          occurredAt: new Date().toISOString(),
          metadata: {
            liveMode: true,
            provider: "GMAIL",
            gmailMessageId: message.id
          },
          invalidReason:
            error instanceof IntegrationError
              ? error.message
              : "Gmail message could not be fetched safely."
        });
      }
    }

    return items;
  }

  public normalizeItem(
    item: ExternalFeedbackItem,
    context: IntegrationConnectionContext
  ): NormalizedFeedbackInput {
    if (item.invalidReason) {
      throw new IntegrationError(
        item.invalidReason,
        INTEGRATION_ERRORS.EMAIL_MESSAGE_INVALID,
        400
      );
    }

    return {
      businessId: context.businessId,
      branchId: context.defaultBranchId,
      channel: FeedbackChannel.EMAIL,
      externalId: item.externalId,
      idempotencyKey: `email:gmail:${context.connectionId}:${item.externalId}`,
      title: item.title,
      message: item.message,
      occurredAt: item.occurredAt,
      customer: item.customer,
      attachments: item.attachments,
      metadata: {
        sourceType: "live-email",
        provider: IntegrationProvider.EMAIL,
        providerLabel: "Gmail",
        liveMode: true,
        demoMode: false,
        liveProviderType: EmailProviderType.GMAIL,
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
      providerLabel: "Gmail",
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

  public async onSyncComplete(
    context: IntegrationConnectionContext,
    result: { status: string; completedAt: Date; failed: number }
  ): Promise<void> {
    if (result.status === "FAILED") return;
    const tokens = await loadTokens(context.connectionId);
    const identity = await providerClient.getAccountIdentity(tokens);
    if (!identity.historyId) return;

    await prisma.integrationConnection.update({
      where: { id: context.connectionId },
      data: {
        lastProviderCursor: identity.historyId,
        lastProviderCursorAt: result.completedAt
      }
    });
  }

  public async revokeAuthorization(context: IntegrationConnectionContext): Promise<void> {
    const tokens = await loadTokens(context.connectionId).catch(() => null);
    if (!tokens) return;
    await providerClient.revoke(tokens).catch(() => undefined);
  }
}

export async function exchangeGmailAuthorizationCode(input: {
  connectionId: string;
  code: string;
  codeVerifier: string;
}): Promise<{
  identity: GmailAccountIdentity;
  accessTokenExpiresAt: Date | null;
  scopeSummary: string;
}> {
  assertLiveEmailConfigured();
  const result = await providerClient.exchangeCode({
    code: input.code,
    codeVerifier: input.codeVerifier
  });
  if (!result.scopes.includes(GMAIL_READONLY_SCOPE)) {
    throw new IntegrationError(
      "Gmail read-only permission was not granted.",
      INTEGRATION_ERRORS.GMAIL_PERMISSION_MISSING,
      400
    );
  }
  if (!result.refreshToken) {
    throw new IntegrationError(
      "Gmail authorization did not include a refresh token. Please reauthorize access.",
      INTEGRATION_ERRORS.LIVE_EMAIL_AUTHORIZATION_FAILED,
      409
    );
  }

  const identity = await providerClient.getAccountIdentity({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiryDate: result.expiryDate,
    scopeSummary: GMAIL_READONLY_SCOPE
  });
  await storeTokens(input.connectionId, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiryDate: result.expiryDate,
    scopeSummary: GMAIL_READONLY_SCOPE
  });

  return {
    identity,
    accessTokenExpiresAt: result.expiryDate,
    scopeSummary: GMAIL_READONLY_SCOPE
  };
}

async function loadTokens(connectionId: string): Promise<GmailTokens> {
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
      "Gmail authorization is required before synchronizing.",
      INTEGRATION_ERRORS.EMAIL_REAUTHORIZATION_REQUIRED,
      409
    );
  }

  return {
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
}

async function storeTokens(connectionId: string, tokens: GmailTokens): Promise<void> {
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

async function persistRefreshedAccessToken(
  tokens: GmailTokens,
  credentials: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }
): Promise<void> {
  void tokens;
  void credentials;
}

function toExternalFeedbackItem(
  context: IntegrationConnectionContext,
  message: gmail_v1.Schema$Message,
  feedbackLabel = resolveGmailFeedbackLabel(context.synchronizationFolder)
): ExternalFeedbackItem {
  if (!message.id) {
    throw new IntegrationError(
      "Gmail message is missing a stable identifier.",
      INTEGRATION_ERRORS.EMAIL_MESSAGE_INVALID,
      400
    );
  }
  const headers = headerMap(message.payload?.headers ?? []);
  const sender = parseSender(headers.get("from"));
  if (!sender.email) {
    throw new IntegrationError(
      "Gmail message is missing a sender email.",
      INTEGRATION_ERRORS.EMAIL_MESSAGE_INVALID,
      400
    );
  }
  const parsedBody = extractBody(message.payload);
  const body = parsedBody.text.trim();
  if (!body) {
    throw new IntegrationError(
      "Gmail message has no usable plain text body.",
      INTEGRATION_ERRORS.EMAIL_BODY_EMPTY,
      400
    );
  }
  const subject = truncate(headers.get("subject") ?? "", MAX_SUBJECT_CHARS);
  const occurredAt = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString();
  const rfcMessageId = headers.get("message-id") ?? null;
  const automatedReason = automatedGmailMessageReason(headers, message.labelIds ?? []);

  return {
    externalId: gmailExternalId(context.connectionId, message.id),
    sourceLabel: "Gmail Customer Feedback message",
    authorName: sender.name ?? sender.email,
    title: subject || `Email from ${maskEmail(sender.email)}`,
    message: truncate(body, MAX_BODY_CHARS),
    occurredAt,
    customer: {
      name: sender.name ?? sender.email.split("@")[0] ?? "Email sender",
      email: sender.email
    },
    attachments: parsedBody.attachments,
    metadata: {
      liveProviderType: EmailProviderType.GMAIL,
      gmailMessageId: message.id,
      gmailThreadId: message.threadId ?? null,
      rfcMessageIdHash: rfcMessageId ? sha256(rfcMessageId) : null,
      hasRfcMessageId: Boolean(rfcMessageId),
      providerAccountLabel: context.providerAccountLabel
        ? maskEmail(context.providerAccountLabel)
        : null,
      attachmentCount: parsedBody.attachments.length,
      inboxFolder: INBOX_LABEL,
      feedbackLabel
    },
    ...(automatedReason ? { skipReason: automatedReason } : {})
  };
}

async function resolveGmailLabelId(
  gmail: gmail_v1.Gmail,
  labelName: string
): Promise<string> {
  const result = await gmail.users.labels.list({ userId: USER_ID });
  const normalized = resolveGmailFeedbackLabel(labelName).toLocaleLowerCase();
  const label = (result.data.labels ?? []).find(
    (candidate) => candidate.name?.trim().toLocaleLowerCase() === normalized
  );
  if (!label?.id) {
    throw new IntegrationError(
      `Gmail label “${resolveGmailFeedbackLabel(labelName)}” was not found. Create or select the label, apply it to customer feedback messages, then sync again.`,
      INTEGRATION_ERRORS.GMAIL_FEEDBACK_LABEL_NOT_FOUND,
      409
    );
  }
  return label.id;
}

export function resolveGmailFeedbackLabel(value?: string | null): string {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized && normalized.toUpperCase() !== INBOX_LABEL
    ? normalized.slice(0, 80)
    : DEFAULT_GMAIL_FEEDBACK_LABEL;
}

export function hasRequiredGmailLabels(
  message: Pick<gmail_v1.Schema$Message, "labelIds">,
  feedbackLabelId: string
): boolean {
  const labels = new Set(message.labelIds ?? []);
  return labels.has(INBOX_LABEL) && labels.has(feedbackLabelId);
}

export function automatedGmailMessageReason(
  headers: Map<string, string>,
  labelIds: string[]
): string | null {
  const from = headers.get("from")?.toLowerCase() ?? "";
  const autoSubmitted = headers.get("auto-submitted")?.toLowerCase() ?? "";
  const precedence = headers.get("precedence")?.toLowerCase() ?? "";
  const listUnsubscribe = headers.get("list-unsubscribe")?.trim();
  const listId = headers.get("list-id")?.trim();
  const automatedSender =
    /(^|[<._+-])(no-?reply|donotreply|mailer-daemon|notifications?)([>@._+-]|$)/i.test(
      from
    );
  const automatedCategory = labelIds.includes("CATEGORY_PROMOTIONS");
  if (
    (autoSubmitted && autoSubmitted !== "no") ||
    ["bulk", "list", "junk"].includes(precedence) ||
    listUnsubscribe ||
    listId ||
    automatedSender ||
    (automatedCategory && /newsletter|marketing|campaign/i.test(from))
  ) {
    return "Automated, bulk, newsletter, or promotional email was skipped by the customer-feedback safeguard.";
  }
  return null;
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): {
  text: string;
  attachments: NonNullable<ExternalFeedbackItem["attachments"]>;
} {
  const state = {
    partCount: 0,
    plain: [] as string[],
    html: [] as string[],
    attachments: [] as NonNullable<ExternalFeedbackItem["attachments"]>
  };
  walkPart(payload, 0, state);

  const rawText =
    state.plain.join("\n\n").trim() ||
    htmlToText(state.html.join("\n\n"), {
      wordwrap: false,
      selectors: [
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "img", format: "skip" },
        { selector: "form", format: "skip" }
      ]
    }).trim();

  return {
    text: rawText
      .replace(/\s+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n")
      .trim(),
    attachments: state.attachments.slice(0, 10)
  };
}

function walkPart(
  part: gmail_v1.Schema$MessagePart | undefined,
  depth: number,
  state: {
    partCount: number;
    plain: string[];
    html: string[];
    attachments: NonNullable<ExternalFeedbackItem["attachments"]>;
  }
): void {
  if (!part || depth > MAX_MIME_DEPTH || state.partCount >= MAX_MIME_PARTS) return;
  state.partCount += 1;

  const filename = part.filename?.trim();
  if (filename && state.attachments.length < 10) {
    state.attachments.push({
      filename: truncate(filename, 255),
      mimeType: truncate(part.mimeType || "application/octet-stream", 120),
      sizeBytes: part.body?.size ?? undefined,
      metadata: {
        source: "gmail",
        metadataOnly: true,
        inline:
          part.headers?.some(
            (header) =>
              header.name?.toLowerCase() === "content-disposition" &&
              header.value?.toLowerCase().includes("inline")
          ) ?? false,
        providerAttachmentId: part.body?.attachmentId
          ? sha256(part.body.attachmentId)
          : null
      }
    });
  }

  const decoded = decodeBody(part.body?.data);
  if (decoded) {
    if (part.mimeType === "text/plain") state.plain.push(decoded);
    if (part.mimeType === "text/html") state.html.push(decoded);
  }

  for (const child of part.parts ?? []) {
    walkPart(child, depth + 1, state);
  }
}

function decodeBody(data: string | null | undefined): string | null {
  if (!data) return null;
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
  } catch {
    throw new IntegrationError(
      "Gmail message body could not be decoded.",
      INTEGRATION_ERRORS.EMAIL_MIME_PARSE_FAILED,
      400
    );
  }
}

function headerMap(headers: gmail_v1.Schema$MessagePartHeader[]) {
  const map = new Map<string, string>();
  headers.forEach((header) => {
    if (header.name && header.value) {
      map.set(header.name.toLowerCase(), header.value);
    }
  });
  return map;
}

function parseSender(value: string | undefined): {
  name: string | null;
  email: string | null;
} {
  if (!value) return { name: null, email: null };
  const angleMatch = value.match(/^(.*?)<([^<>@\s]+@[^<>@\s]+)>/);
  if (angleMatch) {
    return {
      name: cleanHeaderName(angleMatch[1] ?? ""),
      email: (angleMatch[2] ?? "").trim().toLowerCase()
    };
  }
  const emailMatch = value.match(/([^<>\s]+@[^<>\s]+)/);
  return {
    name: null,
    email: emailMatch ? emailMatch[1]!.trim().toLowerCase() : null
  };
}

function cleanHeaderName(value: string): string | null {
  const cleaned = value.trim().replace(/^"|"$/g, "").trim();
  return cleaned || null;
}

function gmailExternalId(connectionId: string, messageId: string): string {
  return truncate(`gmail:${connectionId}:${messageId}`, 255);
}

function accessTokenAssociatedData(connectionId: string): string {
  return `integration:${connectionId}:gmail:access-token`;
}

function refreshTokenAssociatedData(connectionId: string): string {
  return `integration:${connectionId}:gmail:refresh-token`;
}

export function oauthVerifierAssociatedData(connectionId: string): string {
  return `integration:${connectionId}:gmail:pkce-verifier`;
}

export function maskEmail(value: string): string {
  const [local = "", domain = ""] = value.split("@");
  if (!domain) return "Gmail account";
  const visible = local.length <= 2 ? (local[0] ?? "*") : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
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

function isGoogleStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === status
  );
}

export async function markLiveConnectionReauthorizationRequired(
  connectionId: string,
  code = INTEGRATION_ERRORS.EMAIL_REAUTHORIZATION_REQUIRED
): Promise<void> {
  await prisma.integrationConnection.updateMany({
    where: { id: connectionId },
    data: {
      status: IntegrationConnectionStatus.ERROR,
      requiresReauthorization: true,
      lastErrorCode: code
    }
  });
}

export const gmailLiveConnectorTestUtils = {
  toExternalFeedbackItem,
  extractBody,
  gmailExternalId,
  automatedGmailMessageReason,
  hasRequiredGmailLabels,
  resolveGmailFeedbackLabel
};
