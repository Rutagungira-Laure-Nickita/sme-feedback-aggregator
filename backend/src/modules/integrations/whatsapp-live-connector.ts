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

const WHATSAPP_WEBHOOK_BODY_LIMIT_BYTES = 3 * 1024 * 1024;
const MAX_PREVIEW_CHARS = 180;
const MAX_MESSAGE_CHARS = 10_000;

type WhatsAppProviderClient = {
  getPhoneNumber(input: {
    graphApiVersion: string;
    phoneNumberId: string;
    accessToken: string;
  }): Promise<{
    id: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
  }>;
};

export type WhatsAppWebhookProcessingResult = {
  received: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
};

type WhatsAppWebhookPayload = {
  object?: unknown;
  entry?: unknown;
};

type WhatsAppChangeValue = {
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    wa_id?: string;
    profile?: { name?: string };
  }>;
  messages?: WhatsAppWebhookMessage[];
};

type WhatsAppWebhookMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WhatsAppConnection = NonNullable<Awaited<ReturnType<typeof loadWhatsAppConnection>>>;

export class MetaGraphWhatsAppProviderClient implements WhatsAppProviderClient {
  public async getPhoneNumber(input: {
    graphApiVersion: string;
    phoneNumberId: string;
    accessToken: string;
  }): Promise<{
    id: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
  }> {
    const url = new URL(
      `https://graph.facebook.com/${input.graphApiVersion}/${encodeURIComponent(
        input.phoneNumberId
      )}`
    );
    url.searchParams.set("fields", "id,display_phone_number,verified_name");

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${input.accessToken}` }
    });

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError(
        "Meta WhatsApp credential could not be verified.",
        INTEGRATION_ERRORS.WHATSAPP_CREDENTIAL_INVALID,
        409
      );
    }
    if (!response.ok) {
      throw new IntegrationError(
        "Meta WhatsApp provider is unavailable.",
        INTEGRATION_ERRORS.WHATSAPP_PROVIDER_UNAVAILABLE,
        503
      );
    }

    const data = (await response.json()) as {
      id?: string;
      display_phone_number?: string;
      verified_name?: string;
    };
    if (!data.id) {
      throw new IntegrationError(
        "Meta WhatsApp phone number could not be verified.",
        INTEGRATION_ERRORS.WHATSAPP_CREDENTIAL_INVALID,
        409
      );
    }

    return {
      id: data.id,
      displayPhoneNumber: data.display_phone_number ?? null,
      verifiedName: data.verified_name ?? null
    };
  }
}

let providerClient: WhatsAppProviderClient = new MetaGraphWhatsAppProviderClient();

export function setWhatsAppProviderClientForTests(client: WhatsAppProviderClient): void {
  providerClient = client;
}

export function resetWhatsAppProviderClientForTests(): void {
  providerClient = new MetaGraphWhatsAppProviderClient();
}

export function assertLiveWhatsAppConfigured(): void {
  if (
    !env.LIVE_WHATSAPP_ENABLED ||
    !env.META_WHATSAPP_APP_SECRET ||
    !env.META_WHATSAPP_VERIFY_TOKEN
  ) {
    throw new IntegrationError(
      "Live WhatsApp is not configured for this workspace yet.",
      INTEGRATION_ERRORS.LIVE_WHATSAPP_NOT_CONFIGURED,
      503
    );
  }
}

export class WhatsAppLiveConnector implements ExternalFeedbackConnector {
  public readonly provider = IntegrationProvider.WHATSAPP;
  public readonly mode = IntegrationMode.LIVE;

  public supportsMode(mode: IntegrationMode): boolean {
    return mode === IntegrationMode.LIVE;
  }

  public getCapabilities(): IntegrationProviderCapabilities {
    return {
      provider: IntegrationProvider.WHATSAPP,
      mode: IntegrationMode.LIVE,
      label: "WhatsApp",
      channel: FeedbackChannel.WHATSAPP,
      demoSupported: false,
      liveSupported: env.LIVE_WHATSAPP_ENABLED,
      supportsRatings: false,
      supportsAttachments: false,
      description:
        "Connect Meta WhatsApp Cloud API webhooks and import inbound text messages."
    };
  }

  public async testConnection(
    context: IntegrationConnectionContext
  ): Promise<ConnectorHealth> {
    assertLiveWhatsAppConfigured();
    const token = await loadWhatsAppAccessToken(context.connectionId);
    const phoneNumberId = context.whatsappPhoneNumberId;
    if (!phoneNumberId) {
      throw new IntegrationError(
        "Meta WhatsApp phone number ID is missing.",
        INTEGRATION_ERRORS.WHATSAPP_CREDENTIAL_INVALID,
        409
      );
    }

    const phone = await providerClient.getPhoneNumber({
      graphApiVersion: env.META_WHATSAPP_GRAPH_API_VERSION,
      phoneNumberId,
      accessToken: token
    });

    await prisma.integrationConnection.update({
      where: { id: context.connectionId },
      data: {
        providerAccountId: phone.id,
        providerAccountLabel: maskPhone(
          phone.displayPhoneNumber ?? context.whatsappDisplayPhoneNumber
        ),
        lastConnectionTestAt: new Date(),
        lastConnectionTestStatus: "PASSED",
        lastErrorCode: null
      }
    });

    return {
      ok: true,
      code: "WHATSAPP_CONNECTION_READY",
      message: "Meta WhatsApp Cloud API configuration is reachable.",
      checkedAt: new Date(),
      providerAccountLabel: maskPhone(
        phone.displayPhoneNumber ?? context.whatsappDisplayPhoneNumber
      )
    };
  }

  public async fetchDemoItems(): Promise<ExternalFeedbackItem[]> {
    throw new IntegrationError(
      "Live WhatsApp is webhook-driven and does not support manual synchronization.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  public async fetchItems(): Promise<ExternalFeedbackItem[]> {
    throw new IntegrationError(
      "Live WhatsApp is webhook-driven and does not support manual synchronization.",
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
        INTEGRATION_ERRORS.WHATSAPP_MESSAGE_INVALID,
        400
      );
    }

    return {
      businessId: context.businessId,
      branchId: context.defaultBranchId,
      channel: FeedbackChannel.WHATSAPP,
      externalId: item.externalId,
      idempotencyKey: item.externalId,
      title: item.title,
      message: item.message,
      occurredAt: item.occurredAt,
      customer: item.customer,
      metadata: {
        sourceType: "live-whatsapp",
        provider: IntegrationProvider.WHATSAPP,
        providerLabel: "WhatsApp",
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
      provider: IntegrationProvider.WHATSAPP,
      providerLabel: "WhatsApp",
      sourceType: item.sourceLabel,
      author: item.authorName,
      textPreview: previewText(item.message),
      occurredAt: item.occurredAt,
      externalId: item.externalId,
      liveMode: true,
      demoMode: false,
      simulatedExternalData: false,
      messageType:
        typeof item.metadata.messageType === "string" ? item.metadata.messageType : null
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

export async function storeWhatsAppAccessToken(input: {
  connectionId: string;
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
        whatsAppAccessTokenAssociatedData(input.connectionId)
      ),
      encryptionKeyVersion: getIntegrationEncryptionKeyVersion(),
      scopeSummary: "whatsapp-cloud-api",
      rotatedAt: new Date()
    },
    update: {
      encryptedAccessToken: encryptIntegrationSecret(
        input.accessToken,
        whatsAppAccessTokenAssociatedData(input.connectionId)
      ),
      encryptionKeyVersion: getIntegrationEncryptionKeyVersion(),
      scopeSummary: "whatsapp-cloud-api",
      rotatedAt: new Date(),
      revokedAt: null
    }
  });
}

export async function verifyWhatsAppWebhookChallenge(query: {
  mode?: unknown;
  verifyToken?: unknown;
  challenge?: unknown;
}): Promise<string> {
  assertLiveWhatsAppConfigured();
  const mode = typeof query.mode === "string" ? query.mode : "";
  const verifyToken = typeof query.verifyToken === "string" ? query.verifyToken : "";
  const challenge = typeof query.challenge === "string" ? query.challenge : "";

  if (
    mode !== "subscribe" ||
    !challenge ||
    !timingSafeStringEqual(verifyToken, env.META_WHATSAPP_VERIFY_TOKEN ?? "")
  ) {
    throw new IntegrationError(
      "WhatsApp webhook verification failed.",
      INTEGRATION_ERRORS.WHATSAPP_WEBHOOK_VERIFICATION_FAILED,
      403
    );
  }

  await prisma.integrationConnection.updateMany({
    where: {
      provider: IntegrationProvider.WHATSAPP,
      mode: IntegrationMode.LIVE,
      webhookVerifyTokenHash: sha256(verifyToken)
    },
    data: {
      webhookStatus: "ACTIVE",
      lastWebhookVerifiedAt: new Date(),
      lastErrorCode: null
    }
  });

  return challenge;
}

export async function processWhatsAppWebhookDelivery(input: {
  rawBody: Buffer;
  signatureHeader?: string | string[];
}): Promise<WhatsAppWebhookProcessingResult> {
  assertLiveWhatsAppConfigured();
  if (input.rawBody.length > WHATSAPP_WEBHOOK_BODY_LIMIT_BYTES) {
    throw new IntegrationError(
      "WhatsApp webhook payload is too large.",
      INTEGRATION_ERRORS.WHATSAPP_MESSAGE_INVALID,
      413
    );
  }
  verifyWhatsAppSignature(input.rawBody, input.signatureHeader);
  const payload = parseWebhookPayload(input.rawBody);
  const changes = extractMessageChanges(payload);
  const totals: WhatsAppWebhookProcessingResult = {
    received: 0,
    imported: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0
  };

  for (const change of changes) {
    const phoneNumberId = change.value.metadata?.phone_number_id;
    if (!phoneNumberId) {
      totals.skipped += 1;
      continue;
    }

    const connection = await loadWhatsAppConnection({
      phoneNumberId,
      wabaId: change.entryId
    });
    if (!connection) {
      totals.skipped += 1;
      continue;
    }

    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { lastWebhookReceivedAt: new Date() }
    });

    const messages = change.value.messages ?? [];
    if (messages.length === 0) {
      totals.skipped += 1;
      continue;
    }

    for (const message of messages) {
      totals.received += 1;
      const status = await processWebhookMessage({ connection, change, message });
      if (status === IntegrationWebhookDeliveryStatus.IMPORTED) totals.imported += 1;
      if (status === IntegrationWebhookDeliveryStatus.DUPLICATE) totals.duplicates += 1;
      if (status === IntegrationWebhookDeliveryStatus.SKIPPED) totals.skipped += 1;
      if (status === IntegrationWebhookDeliveryStatus.FAILED) totals.failed += 1;
    }
  }

  return totals;
}

function verifyWhatsAppSignature(
  rawBody: Buffer,
  signatureHeader?: string | string[]
): void {
  verifyMetaWebhookSignature({
    rawBody,
    signatureHeader,
    errorCode: INTEGRATION_ERRORS.WHATSAPP_WEBHOOK_SIGNATURE_INVALID
  });
}

async function processWebhookMessage(input: {
  connection: WhatsAppConnection;
  change: { entryId: string; value: WhatsAppChangeValue };
  message: WhatsAppWebhookMessage;
}): Promise<IntegrationWebhookDeliveryStatus> {
  const messageId = cleanProviderId(input.message.id);
  const messageType = cleanMessageType(input.message.type);
  const externalEventId = messageId
    ? truncate(`whatsapp:${input.connection.id}:${messageId}`, 255)
    : null;
  const receivedAt = timestampToDate(input.message.timestamp);
  const sender = normalizeWhatsAppSender(
    input.message.from ?? findContact(input.change.value, input.message.from)?.wa_id
  );
  const senderName = findContact(input.change.value, input.message.from)?.profile?.name;
  const payloadHash = hashJson({
    externalEventId,
    messageType,
    text: input.message.text?.body ?? null,
    receivedAt: receivedAt.toISOString(),
    sender,
    phoneNumberId: input.connection.whatsappPhoneNumberId
  });

  if (externalEventId) {
    const existing = await prisma.integrationWebhookDelivery.findUnique({
      where: {
        connectionId_externalEventId: {
          connectionId: input.connection.id,
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

  if (input.connection.status !== IntegrationConnectionStatus.CONNECTED) {
    await upsertWebhookDelivery({
      connection: input.connection,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.SKIPPED,
      resultCode: INTEGRATION_ERRORS.WHATSAPP_CONNECTION_INACTIVE,
      safeMessage: "Live WhatsApp connection is not active.",
      messageType,
      sender,
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.SKIPPED;
  }

  if (
    input.connection.defaultBranch.status !== "ACTIVE" ||
    input.connection.business.status !== "ACTIVE"
  ) {
    await upsertWebhookDelivery({
      connection: input.connection,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.FAILED,
      resultCode: INTEGRATION_ERRORS.WHATSAPP_BRANCH_INACTIVE,
      safeMessage: "Live WhatsApp default branch is inactive.",
      messageType,
      sender,
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.FAILED;
  }

  if (messageType !== "text") {
    await upsertWebhookDelivery({
      connection: input.connection,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.SKIPPED,
      resultCode: INTEGRATION_ERRORS.WHATSAPP_MESSAGE_UNSUPPORTED,
      safeMessage:
        "Unsupported WhatsApp message type was skipped without media download.",
      messageType,
      sender,
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.SKIPPED;
  }

  const text =
    typeof input.message.text?.body === "string" ? input.message.text.body.trim() : "";
  if (!externalEventId || !text) {
    await upsertWebhookDelivery({
      connection: input.connection,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.FAILED,
      resultCode: INTEGRATION_ERRORS.WHATSAPP_MESSAGE_INVALID,
      safeMessage: "WhatsApp text message was missing required fields.",
      messageType,
      sender,
      textPreview: null,
      processedAt: new Date()
    });
    return IntegrationWebhookDeliveryStatus.FAILED;
  }

  const connector = new WhatsAppLiveConnector();
  const context = toConnectorContext(input.connection);
  const item: ExternalFeedbackItem = {
    externalId: externalEventId,
    sourceLabel: "WhatsApp inbound text message",
    authorName: senderName?.trim() || maskPhone(sender) || "WhatsApp sender",
    title: "WhatsApp message",
    message: truncate(text, MAX_MESSAGE_CHARS),
    occurredAt: receivedAt.toISOString(),
    customer: {
      ...(senderName?.trim() ? { name: senderName.trim() } : {}),
      ...(sender ? { phone: sender } : {})
    },
    metadata: {
      messageType,
      whatsappBusinessAccountId: input.connection.whatsappBusinessAccountId,
      phoneNumberId: input.connection.whatsappPhoneNumberId,
      displayPhoneNumber: maskPhone(input.connection.whatsappDisplayPhoneNumber),
      sender: maskPhone(sender),
      providerMessageIdHash: messageId ? sha256(messageId) : null
    }
  };

  try {
    const result = await feedbackProcessingService.process(
      connector.normalizeItem(item, context)
    );
    const status = result.duplicate
      ? IntegrationWebhookDeliveryStatus.DUPLICATE
      : IntegrationWebhookDeliveryStatus.IMPORTED;
    await upsertWebhookDelivery({
      connection: input.connection,
      externalEventId,
      payloadHash,
      status,
      resultCode: result.duplicate
        ? INTEGRATION_ERRORS.WHATSAPP_MESSAGE_DUPLICATE
        : "IMPORTED",
      safeMessage: result.duplicate
        ? "WhatsApp message already exists. No duplicate feedback was created."
        : "WhatsApp message imported through the feedback-processing pipeline.",
      messageType,
      sender,
      textPreview: previewText(text),
      processedAt: new Date()
    });
    await prisma.integrationConnection.update({
      where: { id: input.connection.id },
      data: {
        totalImported: result.duplicate ? undefined : { increment: 1 },
        lastInboundMessageAt: receivedAt,
        lastErrorCode: null,
        webhookStatus: "ACTIVE"
      }
    });
    return status;
  } catch (error) {
    const safeError = safeIntegrationError(error);
    await upsertWebhookDelivery({
      connection: input.connection,
      externalEventId,
      payloadHash,
      status: IntegrationWebhookDeliveryStatus.FAILED,
      resultCode:
        safeError.code === "FEEDBACK_EXTERNAL_ID_CONFLICT" ||
        safeError.code === "FEEDBACK_IDEMPOTENCY_CONFLICT"
          ? safeError.code
          : INTEGRATION_ERRORS.WHATSAPP_PROCESSING_FAILED,
      safeMessage: "WhatsApp message could not be processed safely.",
      messageType,
      sender,
      textPreview: previewText(text),
      processedAt: new Date()
    });
    await prisma.integrationConnection.updateMany({
      where: { id: input.connection.id },
      data: {
        webhookStatus: "FAILING",
        lastErrorCode: INTEGRATION_ERRORS.WHATSAPP_PROCESSING_FAILED
      }
    });
    return IntegrationWebhookDeliveryStatus.FAILED;
  }
}

async function upsertWebhookDelivery(input: {
  connection: WhatsAppConnection;
  externalEventId: string | null;
  payloadHash: string;
  status: IntegrationWebhookDeliveryStatus;
  resultCode: string;
  safeMessage: string;
  messageType: string | null;
  sender: string | null;
  textPreview: string | null;
  processedAt: Date;
}): Promise<void> {
  const data = {
    businessId: input.connection.businessId,
    provider: IntegrationProvider.WHATSAPP,
    payloadHash: input.payloadHash,
    status: input.status,
    resultCode: input.resultCode,
    safeMessage: input.safeMessage,
    messageType: input.messageType,
    senderHash: input.sender ? sha256(input.sender) : null,
    safePreview: {
      provider: IntegrationProvider.WHATSAPP,
      providerLabel: "WhatsApp",
      liveMode: true,
      demoMode: false,
      messageType: input.messageType,
      sender: maskPhone(input.sender),
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

async function loadWhatsAppConnection(input: { phoneNumberId: string; wabaId: string }) {
  return prisma.integrationConnection.findFirst({
    where: {
      provider: IntegrationProvider.WHATSAPP,
      mode: IntegrationMode.LIVE,
      whatsappPhoneNumberId: input.phoneNumberId,
      ...(input.wabaId ? { whatsappBusinessAccountId: input.wabaId } : {})
    },
    include: {
      business: { select: { status: true } },
      defaultBranch: { select: { id: true, name: true, status: true } }
    }
  });
}

async function loadWhatsAppAccessToken(connectionId: string): Promise<string> {
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
      "Meta WhatsApp credential is required.",
      INTEGRATION_ERRORS.WHATSAPP_CREDENTIAL_INVALID,
      409
    );
  }

  return decryptIntegrationSecret(
    credential.encryptedAccessToken,
    whatsAppAccessTokenAssociatedData(connectionId)
  );
}

function parseWebhookPayload(rawBody: Buffer): WhatsAppWebhookPayload {
  try {
    return JSON.parse(rawBody.toString("utf8")) as WhatsAppWebhookPayload;
  } catch {
    throw new IntegrationError(
      "WhatsApp webhook payload is invalid JSON.",
      INTEGRATION_ERRORS.WHATSAPP_MESSAGE_INVALID,
      400
    );
  }
}

function extractMessageChanges(
  payload: WhatsAppWebhookPayload
): Array<{ entryId: string; value: WhatsAppChangeValue }> {
  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    throw new IntegrationError(
      "WhatsApp webhook payload is invalid.",
      INTEGRATION_ERRORS.WHATSAPP_MESSAGE_INVALID,
      400
    );
  }

  const changes: Array<{ entryId: string; value: WhatsAppChangeValue }> = [];
  for (const entry of payload.entry as Array<{ id?: unknown; changes?: unknown }>) {
    if (!Array.isArray(entry.changes)) continue;
    for (const change of entry.changes as Array<{ field?: unknown; value?: unknown }>) {
      if (
        change.field !== "messages" ||
        !change.value ||
        typeof change.value !== "object"
      ) {
        continue;
      }
      changes.push({
        entryId: typeof entry.id === "string" ? entry.id : "",
        value: change.value as WhatsAppChangeValue
      });
    }
  }

  return changes;
}

function findContact(
  value: WhatsAppChangeValue,
  sender: string | undefined
): { wa_id?: string; profile?: { name?: string } } | null {
  return (
    value.contacts?.find((contact) => contact.wa_id && contact.wa_id === sender) ??
    value.contacts?.[0] ??
    null
  );
}

function normalizeWhatsAppSender(value?: string | null): string | null {
  if (!value) return null;
  const compact = value.trim().replace(/[^\d+]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  const digits = compact.replace(/\D/g, "");
  if (/^07\d{8}$/.test(digits)) return `+250${digits.slice(1)}`;
  if (/^2507\d{8}$/.test(digits)) return `+${digits}`;
  if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return null;
}

function timestampToDate(value?: string): Date {
  const seconds = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date();
  return new Date(seconds * 1000);
}

function cleanProviderId(value?: string): string | null {
  const cleaned = value?.trim();
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

function cleanMessageType(value?: string): string | null {
  const cleaned = value?.trim().toLowerCase();
  if (!cleaned || !/^[a-z_]{1,40}$/.test(cleaned)) return null;
  return cleaned;
}

function toConnectorContext(
  connection: WhatsAppConnection
): IntegrationConnectionContext {
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
    lastProviderCursor: connection.lastProviderCursor,
    whatsappPhoneNumberId: connection.whatsappPhoneNumberId,
    whatsappBusinessAccountId: connection.whatsappBusinessAccountId,
    whatsappDisplayPhoneNumber: connection.whatsappDisplayPhoneNumber
  };
}

function verifyTokenHash(): string | null {
  return env.META_WHATSAPP_VERIFY_TOKEN ? sha256(env.META_WHATSAPP_VERIFY_TOKEN) : null;
}

export function currentWhatsAppVerifyTokenHash(): string | null {
  return verifyTokenHash();
}

function whatsAppAccessTokenAssociatedData(connectionId: string): string {
  return `integration:${connectionId}:meta-whatsapp:access-token`;
}

export function maskPhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return "WhatsApp number";
  return `+${digits.slice(0, Math.min(3, digits.length - 4))}***${digits.slice(-4)}`;
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

export const whatsAppLiveConnectorTestUtils = {
  verifyWhatsAppSignature,
  normalizeWhatsAppSender,
  maskPhone,
  hashJson
};
