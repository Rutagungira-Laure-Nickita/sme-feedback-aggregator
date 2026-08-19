import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  FeedbackChannel,
  IntegrationConnectionStatus,
  IntegrationCredentialType,
  IntegrationMode,
  IntegrationProvider,
  IntegrationWebhookDeliveryStatus
} from "../../lib/prisma-runtime.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { canonicalStringify } from "../feedback-processing/feedback-hash.service.js";
import {
  feedbackProcessingService,
  type JsonObject,
  type JsonValue,
  type NormalizedFeedbackInput
} from "../feedback-processing/index.js";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  getIntegrationEncryptionKeyVersion
} from "./integration-credential-encryption.js";
import {
  INTEGRATION_ERRORS,
  IntegrationError,
  type IntegrationErrorCode,
  safeIntegrationError
} from "./integration.errors.js";
import {
  timingSafeStringEqual,
  verifyMetaWebhookSignature
} from "./meta-webhook-security.js";
import type {
  ConnectorHealth,
  ExternalFeedbackConnector,
  ExternalFeedbackItem,
  IntegrationConnectionContext,
  IntegrationProviderCapabilities,
  SafeExternalItemPreview
} from "./integration.types.js";

const META_WEBHOOK_BODY_LIMIT_BYTES = 3 * 1024 * 1024;
const MAX_PREVIEW_CHARS = 180;
const MAX_MESSAGE_CHARS = 10_000;
type MetaSocialProvider =
  typeof IntegrationProvider.FACEBOOK | typeof IntegrationProvider.INSTAGRAM;

type MetaSocialProviderClient = {
  getFacebookPage(input: {
    graphApiVersion: string;
    pageId: string;
    accessToken: string;
  }): Promise<{ id: string; name: string | null }>;
  getInstagramAccount(input: {
    graphApiVersion: string;
    accountId: string;
    accessToken: string;
  }): Promise<{ id: string; username: string | null; accountType: string | null }>;
};

type MetaWebhookPayload = {
  object?: unknown;
  entry?: unknown;
};

type MetaSocialWebhookResult = {
  received: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
};

type SocialConnection = NonNullable<
  Awaited<ReturnType<typeof loadSocialConnectionByProviderAccountId>>
>;

type SocialEvent = {
  provider: MetaSocialProvider;
  providerObjectId: string;
  eventId: string | null;
  eventType: "comment" | "mention" | "unsupported";
  message: string | null;
  authorName: string | null;
  occurredAt: Date;
  parentReference: string | null;
  mediaReference: string | null;
  sourceUrl: string | null;
  resultCode: string;
  safeMessage: string;
};

export class MetaSocialGraphProviderClient implements MetaSocialProviderClient {
  public async getFacebookPage(input: {
    graphApiVersion: string;
    pageId: string;
    accessToken: string;
  }): Promise<{ id: string; name: string | null }> {
    const url = new URL(
      `https://graph.facebook.com/${input.graphApiVersion}/${encodeURIComponent(
        input.pageId
      )}`
    );
    url.searchParams.set("fields", "id,name");
    const data = await getJson<{ id?: string; name?: string }>(url, input.accessToken, {
      notFoundCode: INTEGRATION_ERRORS.FACEBOOK_PAGE_NOT_FOUND,
      tokenCode: INTEGRATION_ERRORS.META_TOKEN_INVALID,
      permissionCode: INTEGRATION_ERRORS.FACEBOOK_PERMISSION_REQUIRED
    });
    if (!data.id) {
      throw new IntegrationError(
        "Facebook Page could not be verified.",
        INTEGRATION_ERRORS.FACEBOOK_PAGE_NOT_FOUND,
        409
      );
    }
    return { id: data.id, name: data.name ?? null };
  }

  public async getInstagramAccount(input: {
    graphApiVersion: string;
    accountId: string;
    accessToken: string;
  }): Promise<{ id: string; username: string | null; accountType: string | null }> {
    const url = new URL(
      `https://graph.instagram.com/${input.graphApiVersion}/${encodeURIComponent(
        input.accountId
      )}`
    );
    url.searchParams.set("fields", "id,username,account_type");
    const data = await getJson<{ id?: string; username?: string; account_type?: string }>(
      url,
      input.accessToken,
      {
        notFoundCode: INTEGRATION_ERRORS.INSTAGRAM_ACCOUNT_NOT_FOUND,
        tokenCode: INTEGRATION_ERRORS.META_TOKEN_INVALID,
        permissionCode: INTEGRATION_ERRORS.INSTAGRAM_PERMISSION_REQUIRED
      }
    );
    if (!data.id) {
      throw new IntegrationError(
        "Instagram professional account could not be verified.",
        INTEGRATION_ERRORS.INSTAGRAM_ACCOUNT_NOT_FOUND,
        409
      );
    }
    return {
      id: data.id,
      username: data.username ?? null,
      accountType: data.account_type ?? null
    };
  }
}

let providerClient: MetaSocialProviderClient = new MetaSocialGraphProviderClient();

export function setMetaSocialProviderClientForTests(
  client: MetaSocialProviderClient
): void {
  providerClient = client;
}

export function resetMetaSocialProviderClientForTests(): void {
  providerClient = new MetaSocialGraphProviderClient();
}

export function assertLiveMetaSocialConfigured(): void {
  if (
    !env.LIVE_META_SOCIAL_ENABLED ||
    !env.META_WHATSAPP_APP_SECRET ||
    !env.META_WHATSAPP_VERIFY_TOKEN
  ) {
    throw new IntegrationError(
      "Live Meta social integrations are not configured for this workspace yet.",
      INTEGRATION_ERRORS.META_SOCIAL_NOT_CONFIGURED,
      503
    );
  }
}

export class MetaSocialLiveConnector implements ExternalFeedbackConnector {
  public readonly provider: MetaSocialProvider;
  public readonly mode = IntegrationMode.LIVE;

  public constructor(provider: MetaSocialProvider) {
    this.provider = provider;
  }

  public supportsMode(mode: IntegrationMode): boolean {
    return mode === IntegrationMode.LIVE;
  }

  public getCapabilities(): IntegrationProviderCapabilities {
    const facebook = this.provider === IntegrationProvider.FACEBOOK;
    return {
      provider: this.provider,
      mode: IntegrationMode.LIVE,
      label: facebook ? "Facebook" : "Instagram",
      channel: facebook ? FeedbackChannel.FACEBOOK : FeedbackChannel.INSTAGRAM,
      demoSupported: false,
      liveSupported: env.LIVE_META_SOCIAL_ENABLED,
      supportsRatings: false,
      supportsAttachments: false,
      description: facebook
        ? "Connect Meta Page webhooks and import supported Facebook Page comments."
        : "Connect Instagram professional webhooks and import supported comments."
    };
  }

  public async testConnection(
    context: IntegrationConnectionContext
  ): Promise<ConnectorHealth> {
    assertLiveMetaSocialConfigured();
    const accountId = context.providerAccountId;
    if (!accountId) {
      throw new IntegrationError(
        "Meta social account ID is missing.",
        this.provider === IntegrationProvider.FACEBOOK
          ? INTEGRATION_ERRORS.FACEBOOK_CONNECTION_INVALID
          : INTEGRATION_ERRORS.INSTAGRAM_CONNECTION_INVALID,
        409
      );
    }

    const token = await loadMetaSocialAccessToken(context.connectionId, this.provider);
    const checkedAt = new Date();
    if (this.provider === IntegrationProvider.FACEBOOK) {
      const page = await providerClient.getFacebookPage({
        graphApiVersion: env.META_WHATSAPP_GRAPH_API_VERSION,
        pageId: accountId,
        accessToken: token
      });
      if (page.id !== accountId) {
        throw new IntegrationError(
          "Facebook Page ID did not match the configured Page.",
          INTEGRATION_ERRORS.FACEBOOK_CONNECTION_INVALID,
          409
        );
      }
      await prisma.integrationConnection.update({
        where: { id: context.connectionId },
        data: {
          providerAccountLabel: page.name ?? context.providerAccountLabel,
          lastConnectionTestAt: checkedAt,
          lastConnectionTestStatus: "PASSED",
          lastErrorCode: null
        }
      });
      return {
        ok: true,
        code: "FACEBOOK_CONNECTION_READY",
        message: "Facebook Page configuration is reachable.",
        checkedAt,
        providerAccountLabel: page.name
      };
    }

    const account = await providerClient.getInstagramAccount({
      graphApiVersion: env.META_WHATSAPP_GRAPH_API_VERSION,
      accountId,
      accessToken: token
    });
    if (account.id !== accountId) {
      throw new IntegrationError(
        "Instagram account ID did not match the configured account.",
        INTEGRATION_ERRORS.INSTAGRAM_CONNECTION_INVALID,
        409
      );
    }
    const accountType = normalizeInstagramAccountType(account.accountType);
    if (accountType !== "BUSINESS" && accountType !== "CREATOR") {
      throw new IntegrationError(
        "Instagram account must be a professional Business or Creator account.",
        INTEGRATION_ERRORS.INSTAGRAM_PROFESSIONAL_ACCOUNT_REQUIRED,
        409
      );
    }
    const label = account.username ? `@${account.username.replace(/^@/, "")}` : null;
    await prisma.integrationConnection.update({
      where: { id: context.connectionId },
      data: {
        providerAccountLabel: label ?? context.providerAccountLabel,
        providerTenantId: accountType,
        lastConnectionTestAt: checkedAt,
        lastConnectionTestStatus: "PASSED",
        lastErrorCode: null
      }
    });
    return {
      ok: true,
      code: "INSTAGRAM_CONNECTION_READY",
      message: "Instagram professional account configuration is reachable.",
      checkedAt,
      providerAccountLabel: label
    };
  }

  public async fetchItems(): Promise<ExternalFeedbackItem[]> {
    throw new IntegrationError(
      "Live social integrations are webhook-driven and do not support manual synchronization.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  public async fetchDemoItems(): Promise<ExternalFeedbackItem[]> {
    throw new IntegrationError(
      "Live social integrations are webhook-driven and do not support manual synchronization.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  public normalizeItem(
    item: ExternalFeedbackItem,
    context: IntegrationConnectionContext
  ): NormalizedFeedbackInput {
    if (item.invalidReason) {
      throw new IntegrationError(
        item.invalidReason,
        this.provider === IntegrationProvider.FACEBOOK
          ? INTEGRATION_ERRORS.FACEBOOK_COMMENT_INVALID
          : INTEGRATION_ERRORS.INSTAGRAM_COMMENT_INVALID,
        400
      );
    }

    const label =
      this.provider === IntegrationProvider.FACEBOOK ? "Facebook" : "Instagram";
    return {
      businessId: context.businessId,
      branchId: context.defaultBranchId,
      channel:
        this.provider === IntegrationProvider.FACEBOOK
          ? FeedbackChannel.FACEBOOK
          : FeedbackChannel.INSTAGRAM,
      externalId: item.externalId,
      idempotencyKey: item.externalId,
      title: item.title,
      message: item.message,
      occurredAt: item.occurredAt,
      sourceUrl: item.sourceUrl,
      customer: item.customer,
      metadata: {
        sourceType:
          this.provider === IntegrationProvider.FACEBOOK
            ? "live-facebook"
            : "live-instagram",
        provider: this.provider,
        providerLabel: label,
        liveMode: true,
        demoMode: false,
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
      provider: this.provider,
      providerLabel:
        this.provider === IntegrationProvider.FACEBOOK ? "Facebook" : "Instagram",
      sourceType: item.sourceLabel,
      author: item.authorName,
      textPreview: previewText(item.message),
      occurredAt: item.occurredAt,
      externalId: item.externalId,
      liveMode: true,
      demoMode: false,
      simulatedExternalData: false
    };
  }

  public getPayloadHash(item: ExternalFeedbackItem): string {
    return hashJson({
      externalId: item.externalId,
      sourceLabel: item.sourceLabel,
      authorName: item.authorName,
      title: item.title ?? null,
      message: item.message,
      occurredAt: item.occurredAt,
      customer: item.customer ?? null,
      sourceUrl: item.sourceUrl ?? null,
      metadata: item.metadata
    });
  }

  public async revokeAuthorization(context: IntegrationConnectionContext): Promise<void> {
    await prisma.integrationCredential.deleteMany({
      where: {
        connectionId: context.connectionId,
        credentialType: IntegrationCredentialType.META_WHATSAPP
      }
    });
  }
}

export async function storeMetaSocialAccessToken(input: {
  connectionId: string;
  provider: MetaSocialProvider;
  accessToken: string;
}): Promise<void> {
  await prisma.integrationCredential.upsert({
    where: {
      connectionId_credentialType: {
        connectionId: input.connectionId,
        credentialType: IntegrationCredentialType.META_WHATSAPP
      }
    },
    create: {
      connectionId: input.connectionId,
      credentialType: IntegrationCredentialType.META_WHATSAPP,
      encryptedAccessToken: encryptIntegrationSecret(
        input.accessToken,
        metaSocialAccessTokenAssociatedData(input.connectionId, input.provider)
      ),
      encryptionKeyVersion: getIntegrationEncryptionKeyVersion(),
      scopeSummary:
        input.provider === IntegrationProvider.FACEBOOK
          ? "facebook-page-comments"
          : "instagram-professional-comments",
      rotatedAt: new Date()
    },
    update: {
      encryptedAccessToken: encryptIntegrationSecret(
        input.accessToken,
        metaSocialAccessTokenAssociatedData(input.connectionId, input.provider)
      ),
      encryptionKeyVersion: getIntegrationEncryptionKeyVersion(),
      scopeSummary:
        input.provider === IntegrationProvider.FACEBOOK
          ? "facebook-page-comments"
          : "instagram-professional-comments",
      rotatedAt: new Date(),
      revokedAt: null
    }
  });
}

export async function verifyMetaSocialWebhookChallenge(query: {
  mode?: unknown;
  verifyToken?: unknown;
  challenge?: unknown;
}): Promise<string> {
  assertLiveMetaSocialConfigured();
  const mode = typeof query.mode === "string" ? query.mode : "";
  const verifyToken = typeof query.verifyToken === "string" ? query.verifyToken : "";
  const challenge = typeof query.challenge === "string" ? query.challenge : "";

  if (!mode || !verifyToken || !challenge) {
    throw new IntegrationError(
      "Meta webhook verification parameters are required.",
      INTEGRATION_ERRORS.META_WEBHOOK_VERIFICATION_FAILED,
      400
    );
  }

  if (
    mode !== "subscribe" ||
    !timingSafeStringEqual(verifyToken, env.META_WHATSAPP_VERIFY_TOKEN ?? "")
  ) {
    throw new IntegrationError(
      "Meta social webhook verification failed.",
      INTEGRATION_ERRORS.META_WEBHOOK_VERIFICATION_FAILED,
      403
    );
  }

  return challenge;
}

export async function processMetaSocialWebhookDelivery(input: {
  rawBody: Buffer;
  signatureHeader?: string | string[];
}): Promise<MetaSocialWebhookResult> {
  assertLiveMetaSocialConfigured();
  if (input.rawBody.length > META_WEBHOOK_BODY_LIMIT_BYTES) {
    throw new IntegrationError(
      "Meta social webhook payload is too large.",
      INTEGRATION_ERRORS.META_EVENT_PROCESSING_FAILED,
      413
    );
  }
  verifyMetaWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    errorCode: INTEGRATION_ERRORS.META_WEBHOOK_SIGNATURE_INVALID
  });

  const payload = parseWebhookPayload(input.rawBody);
  const events = extractSocialEvents(payload);
  const totals: MetaSocialWebhookResult = {
    received: 0,
    imported: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0
  };

  for (const event of events) {
    totals.received += 1;
    const connection = await loadSocialConnectionByProviderAccountId({
      provider: event.provider,
      providerAccountId: event.providerObjectId
    });
    if (!connection) {
      totals.skipped += 1;
      continue;
    }

    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { lastWebhookReceivedAt: new Date() }
    });

    const status = await processSocialEvent(connection, event);
    if (status === IntegrationWebhookDeliveryStatus.IMPORTED) totals.imported += 1;
    if (status === IntegrationWebhookDeliveryStatus.DUPLICATE) totals.duplicates += 1;
    if (status === IntegrationWebhookDeliveryStatus.SKIPPED) totals.skipped += 1;
    if (status === IntegrationWebhookDeliveryStatus.FAILED) totals.failed += 1;
  }

  return totals;
}

async function processSocialEvent(
  connection: SocialConnection,
  event: SocialEvent
): Promise<IntegrationWebhookDeliveryStatus> {
  const externalEventId =
    event.eventId && cleanProviderId(event.eventId)
      ? truncate(`${providerSlug(event.provider)}:${connection.id}:${event.eventId}`, 255)
      : null;
  const payloadHash = hashJson({
    provider: event.provider,
    providerObjectId: event.providerObjectId,
    eventId: event.eventId,
    eventType: event.eventType,
    message: event.message,
    authorName: event.authorName,
    occurredAt: event.occurredAt.toISOString(),
    parentReference: event.parentReference,
    mediaReference: event.mediaReference,
    sourceUrl: event.sourceUrl
  });

  if (externalEventId) {
    const existing = await prisma.integrationWebhookDelivery.findUnique({
      where: {
        connectionId_externalEventId: {
          connectionId: connection.id,
          externalEventId
        }
      }
    });
    if (
      existing?.status === IntegrationWebhookDeliveryStatus.IMPORTED ||
      existing?.status === IntegrationWebhookDeliveryStatus.DUPLICATE
    ) {
      return IntegrationWebhookDeliveryStatus.DUPLICATE;
    }
  }

  if (connection.status !== IntegrationConnectionStatus.CONNECTED) {
    await upsertSocialWebhookDelivery({
      connection,
      event,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.SKIPPED,
      resultCode: INTEGRATION_ERRORS.META_WEBHOOK_CONNECTION_NOT_FOUND,
      safeMessage: "Live social connection is not active.",
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.SKIPPED;
  }

  if (
    connection.defaultBranch.status !== "ACTIVE" ||
    connection.business.status !== "ACTIVE"
  ) {
    await upsertSocialWebhookDelivery({
      connection,
      event,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.FAILED,
      resultCode: INTEGRATION_ERRORS.BRANCH_INACTIVE,
      safeMessage: "Live social default branch is inactive.",
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.FAILED;
  }

  if (event.eventType !== "comment") {
    await upsertSocialWebhookDelivery({
      connection,
      event,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.SKIPPED,
      resultCode: event.resultCode,
      safeMessage: event.safeMessage,
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.SKIPPED;
  }

  const text = event.message?.trim() ?? "";
  if (!externalEventId || !text) {
    await upsertSocialWebhookDelivery({
      connection,
      event,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.FAILED,
      resultCode:
        event.provider === IntegrationProvider.FACEBOOK
          ? INTEGRATION_ERRORS.FACEBOOK_COMMENT_INVALID
          : INTEGRATION_ERRORS.INSTAGRAM_COMMENT_INVALID,
      safeMessage: "Meta social comment was missing required fields.",
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.FAILED;
  }

  const connector = new MetaSocialLiveConnector(event.provider);
  const item: ExternalFeedbackItem = {
    externalId: externalEventId,
    sourceLabel:
      event.provider === IntegrationProvider.FACEBOOK
        ? "Facebook Page comment"
        : "Instagram professional comment",
    authorName:
      event.authorName?.trim() ||
      (event.provider === IntegrationProvider.FACEBOOK
        ? "Facebook commenter"
        : "Instagram commenter"),
    title:
      event.provider === IntegrationProvider.FACEBOOK
        ? "Facebook comment"
        : "Instagram comment",
    message: truncate(text, MAX_MESSAGE_CHARS),
    occurredAt: event.occurredAt.toISOString(),
    sourceUrl: event.sourceUrl ?? undefined,
    customer: event.authorName?.trim() ? { name: event.authorName.trim() } : undefined,
    metadata: {
      accountId: connection.providerAccountId,
      accountName: connection.providerAccountLabel,
      parentReference: event.parentReference,
      mediaReference: event.mediaReference,
      providerEventIdHash: event.eventId ? sha256(event.eventId) : null
    }
  };

  try {
    const result = await feedbackProcessingService.process(
      connector.normalizeItem(item, toConnectorContext(connection))
    );
    const status = result.duplicate
      ? IntegrationWebhookDeliveryStatus.DUPLICATE
      : IntegrationWebhookDeliveryStatus.IMPORTED;
    await upsertSocialWebhookDelivery({
      connection,
      event,
      externalEventId,
      payloadHash,
      status,
      resultCode: result.duplicate ? INTEGRATION_ERRORS.META_EVENT_DUPLICATE : "IMPORTED",
      safeMessage: result.duplicate
        ? "Meta social event already exists. No duplicate feedback was created."
        : "Meta social event imported through the feedback-processing pipeline.",
      textPreview: previewText(text),
      processedAt: new Date()
    });
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        totalImported: result.duplicate ? undefined : { increment: 1 },
        lastInboundMessageAt: event.occurredAt,
        lastErrorCode: null,
        webhookStatus: "ACTIVE"
      }
    });
    return status;
  } catch (error) {
    const safeError = safeIntegrationError(error);
    await upsertSocialWebhookDelivery({
      connection,
      event,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.FAILED,
      resultCode:
        safeError.code === "FEEDBACK_EXTERNAL_ID_CONFLICT" ||
        safeError.code === "FEEDBACK_IDEMPOTENCY_CONFLICT"
          ? safeError.code
          : INTEGRATION_ERRORS.META_EVENT_PROCESSING_FAILED,
      safeMessage: "Meta social event could not be processed safely.",
      textPreview: previewText(text),
      processedAt: new Date()
    });
    await prisma.integrationConnection.updateMany({
      where: { id: connection.id },
      data: {
        webhookStatus: "FAILING",
        lastErrorCode: INTEGRATION_ERRORS.META_EVENT_PROCESSING_FAILED
      }
    });
    return IntegrationWebhookDeliveryStatus.FAILED;
  }
}

async function upsertSocialWebhookDelivery(input: {
  connection: SocialConnection;
  event: SocialEvent;
  externalEventId: string | null;
  payloadHash: string;
  status: IntegrationWebhookDeliveryStatus;
  resultCode: string;
  safeMessage: string;
  textPreview: string | null;
  processedAt: Date;
}): Promise<void> {
  const data = {
    businessId: input.connection.businessId,
    provider: input.event.provider,
    payloadHash: input.payloadHash,
    status: input.status,
    resultCode: input.resultCode,
    safeMessage: input.safeMessage,
    messageType: input.event.eventType,
    senderHash: input.event.authorName ? sha256(input.event.authorName) : null,
    safePreview: {
      provider: input.event.provider,
      providerLabel:
        input.event.provider === IntegrationProvider.FACEBOOK ? "Facebook" : "Instagram",
      liveMode: true,
      demoMode: false,
      messageType: input.event.eventType,
      sender: input.event.authorName,
      textPreview: input.textPreview
    } satisfies JsonObject,
    processedAt: input.processedAt
  };

  if (!input.externalEventId) {
    await prisma.integrationWebhookDelivery.create({
      data: {
        ...data,
        connectionId: input.connection.id,
        externalEventId: null,
        safePreview: data.safePreview as Prisma.InputJsonValue
      }
    });
    return;
  }

  await prisma.integrationWebhookDelivery.upsert({
    where: {
      connectionId_externalEventId: {
        connectionId: input.connection.id,
        externalEventId: input.externalEventId
      }
    },
    create: {
      ...data,
      connectionId: input.connection.id,
      externalEventId: input.externalEventId,
      safePreview: data.safePreview as Prisma.InputJsonValue
    },
    update: {
      ...data,
      safePreview: data.safePreview as Prisma.InputJsonValue
    }
  });
}

async function loadSocialConnectionByProviderAccountId(input: {
  provider: MetaSocialProvider;
  providerAccountId: string;
}) {
  return prisma.integrationConnection.findFirst({
    where: {
      provider: input.provider,
      mode: IntegrationMode.LIVE,
      providerAccountId: input.providerAccountId
    },
    include: {
      business: { select: { status: true } },
      defaultBranch: { select: { id: true, name: true, status: true } }
    }
  });
}

async function loadMetaSocialAccessToken(
  connectionId: string,
  provider: MetaSocialProvider
): Promise<string> {
  const credential = await prisma.integrationCredential.findUnique({
    where: {
      connectionId_credentialType: {
        connectionId,
        credentialType: IntegrationCredentialType.META_WHATSAPP
      }
    }
  });
  if (!credential?.encryptedAccessToken || credential.revokedAt) {
    throw new IntegrationError(
      "Meta social credential is required.",
      provider === IntegrationProvider.FACEBOOK
        ? INTEGRATION_ERRORS.FACEBOOK_CONNECTION_INVALID
        : INTEGRATION_ERRORS.INSTAGRAM_CONNECTION_INVALID,
      409
    );
  }
  return decryptIntegrationSecret(
    credential.encryptedAccessToken,
    metaSocialAccessTokenAssociatedData(connectionId, provider)
  );
}

function parseWebhookPayload(rawBody: Buffer): MetaWebhookPayload {
  try {
    return JSON.parse(rawBody.toString("utf8")) as MetaWebhookPayload;
  } catch {
    throw new IntegrationError(
      "Meta social webhook payload is invalid JSON.",
      INTEGRATION_ERRORS.META_EVENT_PROCESSING_FAILED,
      400
    );
  }
}

function extractSocialEvents(payload: MetaWebhookPayload): SocialEvent[] {
  if (!Array.isArray(payload.entry)) {
    throw new IntegrationError(
      "Meta social webhook payload is invalid.",
      INTEGRATION_ERRORS.META_EVENT_PROCESSING_FAILED,
      400
    );
  }

  if (payload.object === "page") return extractFacebookEvents(payload.entry);
  if (payload.object === "instagram") return extractInstagramEvents(payload.entry);
  return [];
}

function extractFacebookEvents(entry: unknown[]): SocialEvent[] {
  const events: SocialEvent[] = [];
  for (const rawEntry of entry as Array<{ id?: unknown; changes?: unknown }>) {
    const pageId = typeof rawEntry.id === "string" ? rawEntry.id : "";
    if (!pageId || !Array.isArray(rawEntry.changes)) continue;
    for (const change of rawEntry.changes as Array<{
      field?: unknown;
      value?: unknown;
    }>) {
      if (change.field !== "feed" || !change.value || typeof change.value !== "object") {
        continue;
      }
      const value = change.value as Record<string, unknown>;
      const item = typeof value.item === "string" ? value.item : "";
      const verb = typeof value.verb === "string" ? value.verb : "";
      if (item !== "comment" || verb !== "add") {
        events.push(skippedSocialEvent(IntegrationProvider.FACEBOOK, pageId, value));
        continue;
      }
      const commentId = stringValue(value.comment_id) ?? stringValue(value.commentId);
      const message = stringValue(value.message);
      const from = typeof value.from === "object" && value.from ? value.from : null;
      const authorName =
        from && "name" in from && typeof from.name === "string" ? from.name : null;
      events.push({
        provider: IntegrationProvider.FACEBOOK,
        providerObjectId: pageId,
        eventId: commentId,
        eventType: "comment",
        message,
        authorName,
        occurredAt: metaTimestampToDate(value.created_time),
        parentReference: stringValue(value.post_id) ?? stringValue(value.parent_id),
        mediaReference: null,
        sourceUrl: stringValue(value.permalink_url),
        resultCode: INTEGRATION_ERRORS.FACEBOOK_COMMENT_INVALID,
        safeMessage: "Facebook Page comment was missing required fields."
      });
    }
  }
  return events;
}

function extractInstagramEvents(entry: unknown[]): SocialEvent[] {
  const events: SocialEvent[] = [];
  for (const rawEntry of entry as Array<{
    id?: unknown;
    time?: unknown;
    changes?: unknown;
  }>) {
    const accountId = typeof rawEntry.id === "string" ? rawEntry.id : "";
    if (!accountId || !Array.isArray(rawEntry.changes)) continue;
    for (const change of rawEntry.changes as Array<{
      field?: unknown;
      value?: unknown;
    }>) {
      if (!change.value || typeof change.value !== "object") continue;
      const value = change.value as Record<string, unknown>;
      if (change.field !== "comments") {
        events.push({
          provider: IntegrationProvider.INSTAGRAM,
          providerObjectId: accountId,
          eventId: stringValue(value.id),
          eventType: change.field === "mentions" ? "mention" : "unsupported",
          message: stringValue(value.text) ?? stringValue(value.message),
          authorName: instagramAuthorName(value),
          occurredAt: metaTimestampToDate(value.created_time ?? rawEntry.time),
          parentReference: null,
          mediaReference: mediaReference(value),
          sourceUrl: null,
          resultCode:
            change.field === "mentions"
              ? INTEGRATION_ERRORS.INSTAGRAM_WEBHOOK_EVENT_INVALID
              : INTEGRATION_ERRORS.INSTAGRAM_WEBHOOK_EVENT_INVALID,
          safeMessage:
            change.field === "mentions"
              ? "Instagram mentions are deferred in this MVP."
              : "Unsupported Instagram webhook event was skipped."
        });
        continue;
      }
      events.push({
        provider: IntegrationProvider.INSTAGRAM,
        providerObjectId: accountId,
        eventId: stringValue(value.id) ?? stringValue(value.comment_id),
        eventType: "comment",
        message: stringValue(value.text) ?? stringValue(value.message),
        authorName: instagramAuthorName(value),
        occurredAt: metaTimestampToDate(value.created_time ?? rawEntry.time),
        parentReference: null,
        mediaReference: mediaReference(value),
        sourceUrl: null,
        resultCode: INTEGRATION_ERRORS.INSTAGRAM_COMMENT_INVALID,
        safeMessage: "Instagram comment was missing required fields."
      });
    }
  }
  return events;
}

function skippedSocialEvent(
  provider: MetaSocialProvider,
  providerObjectId: string,
  value: Record<string, unknown>
): SocialEvent {
  return {
    provider,
    providerObjectId,
    eventId: stringValue(value.comment_id) ?? stringValue(value.id),
    eventType: "unsupported",
    message: null,
    authorName: null,
    occurredAt: metaTimestampToDate(value.created_time),
    parentReference: stringValue(value.post_id),
    mediaReference: null,
    sourceUrl: null,
    resultCode:
      provider === IntegrationProvider.FACEBOOK
        ? INTEGRATION_ERRORS.FACEBOOK_WEBHOOK_EVENT_INVALID
        : INTEGRATION_ERRORS.INSTAGRAM_WEBHOOK_EVENT_INVALID,
    safeMessage: "Unsupported Meta social webhook event was skipped."
  };
}

function toConnectorContext(connection: SocialConnection): IntegrationConnectionContext {
  return {
    connectionId: connection.id,
    businessId: connection.businessId,
    defaultBranchId: connection.defaultBranchId,
    displayName: connection.displayName,
    provider: connection.provider,
    mode: connection.mode,
    demoScenario: connection.demoScenario,
    liveProviderType: connection.liveProviderType,
    providerAccountId: connection.providerAccountId,
    providerAccountLabel: connection.providerAccountLabel,
    synchronizationFolder: connection.synchronizationFolder,
    lastProviderCursor: connection.lastProviderCursor
  };
}

async function getJson<T>(
  url: URL,
  accessToken: string,
  codes: {
    notFoundCode: IntegrationErrorCode;
    tokenCode: IntegrationErrorCode;
    permissionCode: IntegrationErrorCode;
  }
): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 401) {
    throw new IntegrationError("Meta access token is invalid.", codes.tokenCode, 409);
  }
  if (response.status === 403) {
    throw new IntegrationError(
      "Meta permissions are not sufficient for this connection.",
      codes.permissionCode,
      409
    );
  }
  if (response.status === 404) {
    throw new IntegrationError("Meta account was not found.", codes.notFoundCode, 404);
  }
  if (!response.ok) {
    throw new IntegrationError(
      "Meta provider is unavailable.",
      INTEGRATION_ERRORS.META_PROVIDER_UNAVAILABLE,
      503
    );
  }
  return (await response.json()) as T;
}

function metaSocialAccessTokenAssociatedData(
  connectionId: string,
  provider: MetaSocialProvider
): string {
  return `integration:${connectionId}:meta-${providerSlug(provider)}:access-token`;
}

function providerSlug(provider: MetaSocialProvider): string {
  return provider === IntegrationProvider.FACEBOOK ? "facebook" : "instagram";
}

function normalizeInstagramAccountType(value?: string | null): string | null {
  const upper = value?.trim().toUpperCase();
  return upper || null;
}

function instagramAuthorName(value: Record<string, unknown>): string | null {
  const from = typeof value.from === "object" && value.from ? value.from : null;
  if (from && "username" in from && typeof from.username === "string") {
    return `@${from.username.replace(/^@/, "")}`;
  }
  if (from && "name" in from && typeof from.name === "string") {
    return from.name;
  }
  return stringValue(value.username);
}

function mediaReference(value: Record<string, unknown>): string | null {
  const media = typeof value.media === "object" && value.media ? value.media : null;
  if (media && "id" in media && typeof media.id === "string") return media.id;
  return stringValue(value.media_id);
}

function metaTimestampToDate(value: unknown): Date {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value > 10_000_000_000 ? value : value * 1000);
  }
  if (typeof value === "string") {
    const numeric = Number.parseInt(value, 10);
    if (Number.isFinite(numeric) && numeric > 0) {
      return new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function cleanProviderId(value: string): string | null {
  const cleaned = value.trim();
  if (
    !cleaned ||
    cleaned.length > 180 ||
    cleaned.includes(String.fromCharCode(0)) ||
    /\s/.test(cleaned)
  ) {
    return null;
  }
  return cleaned;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function previewText(message: string): string {
  return message.length <= MAX_PREVIEW_CHARS
    ? message
    : `${message.slice(0, MAX_PREVIEW_CHARS - 3).trimEnd()}...`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max).trimEnd();
}

function hashJson(value: JsonValue): string {
  return createHash("sha256").update(canonicalStringify(value)).digest("hex");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const metaSocialLiveConnectorTestUtils = {
  verifyMetaWebhookSignature,
  extractSocialEvents,
  metaTimestampToDate,
  hashJson
};
