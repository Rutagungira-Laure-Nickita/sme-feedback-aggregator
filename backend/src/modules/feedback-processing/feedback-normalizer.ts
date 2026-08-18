import {
  FeedbackProcessingError,
  FEEDBACK_ERROR_CODES
} from "./feedback-processing.errors.js";
import type { ParsedFeedbackInput } from "./feedback-processing.schemas.js";
import type {
  JsonObject,
  JsonValue,
  PreparedFeedbackAttachment,
  PreparedFeedbackInput
} from "./feedback-processing.types.js";

const SENSITIVE_METADATA_KEY_PATTERN =
  /(^|[_-])(authorization|cookie|password|secret|token|access-token|refresh-token|api-key|apikey)([_-]|$)/i;

export function normalizeFeedbackInput(
  input: ParsedFeedbackInput
): PreparedFeedbackInput {
  return {
    businessId: normalizeIdentifier(input.businessId) ?? "",
    branchId: normalizeIdentifier(input.branchId),
    channel: input.channel,
    externalId: normalizeSingleLine(input.externalId),
    idempotencyKey: normalizeSingleLine(input.idempotencyKey) ?? "",
    title: normalizeSingleLine(input.title),
    message: normalizeMessage(input.message),
    rating: input.rating ?? null,
    occurredAt: input.occurredAt ?? null,
    sourceUrl: normalizeSingleLine(input.sourceUrl),
    languageCode: normalizeLanguageCode(input.languageCode),
    customerName: normalizeSingleLine(input.customer?.name),
    customerEmail: normalizeEmail(input.customer?.email),
    customerPhone: normalizeSingleLine(input.customer?.phone),
    attachments: normalizeAttachments(input.attachments ?? []),
    metadata: normalizeMetadata(input.metadata)
  };
}

export function withResolvedBranch(
  input: PreparedFeedbackInput,
  branchId: string
): PreparedFeedbackInput & { branchId: string } {
  return {
    ...input,
    branchId
  };
}

function normalizeAttachments(
  attachments: ParsedFeedbackInput["attachments"]
): PreparedFeedbackAttachment[] {
  return (attachments ?? []).map((attachment) => ({
    filename: normalizeSingleLine(attachment.filename) ?? "",
    mimeType: normalizeSingleLine(attachment.mimeType) ?? "",
    sizeBytes: attachment.sizeBytes ?? null,
    externalUrl: normalizeSingleLine(attachment.externalUrl),
    checksum: normalizeSingleLine(attachment.checksum),
    metadata: normalizeMetadata(attachment.metadata)
  }));
}

function normalizeIdentifier(value: string | undefined): string | null {
  return normalizeSingleLine(value);
}

function normalizeEmail(value: string | undefined): string | null {
  const normalized = normalizeSingleLine(value);

  return normalized ? normalized.toLowerCase() : null;
}

function normalizeLanguageCode(value: string | undefined): string | null {
  const normalized = normalizeSingleLine(value);

  return normalized ? normalized.toLowerCase() : null;
}

function normalizeSingleLine(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : null;
}

function normalizeMessage(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]{2,}/g, " "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeMetadata(value: JsonObject | undefined): JsonObject | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeMetadataObject(value);

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeMetadataObject(value: JsonObject): JsonObject {
  const entries = Object.entries(value)
    .filter(([key]) => !SENSITIVE_METADATA_KEY_PATTERN.test(key))
    .map(([key, nestedValue]): [string, JsonValue] => [
      normalizeMetadataKey(key),
      normalizeJsonValue(nestedValue)
    ])
    .filter(([key]) => key.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(entries);
}

function normalizeMetadataKey(value: string): string {
  if (value.includes("\u0000")) {
    throw new FeedbackProcessingError(
      "Metadata contains invalid characters.",
      FEEDBACK_ERROR_CODES.INPUT_INVALID,
      400
    );
  }

  return value.trim().slice(0, 120);
}

function normalizeJsonValue(value: JsonValue): JsonValue {
  if (typeof value === "string") {
    if (value.includes("\u0000")) {
      throw new FeedbackProcessingError(
        "Metadata contains invalid characters.",
        FEEDBACK_ERROR_CODES.INPUT_INVALID,
        400
      );
    }

    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (value && typeof value === "object") {
    return normalizeMetadataObject(value);
  }

  return value;
}
