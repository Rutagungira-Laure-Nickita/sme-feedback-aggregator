import { createHash } from "node:crypto";
import type { JsonValue, ResolvedFeedbackInput } from "./feedback-processing.types.js";

export function createFeedbackPayloadHash(input: ResolvedFeedbackInput): string {
  const canonicalPayload = canonicalStringify(toHashablePayload(input));

  return createHash("sha256").update(canonicalPayload).digest("hex");
}

function toHashablePayload(input: ResolvedFeedbackInput): JsonValue {
  return {
    businessId: input.businessId,
    branchId: input.branchId,
    channel: input.channel,
    externalId: input.externalId,
    title: input.title,
    message: input.message,
    rating: input.rating,
    occurredAt: input.occurredAt ? input.occurredAt.toISOString() : null,
    sourceUrl: input.sourceUrl,
    languageCode: input.languageCode,
    categoryId: input.categoryId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    attachments: input.attachments,
    metadata: input.metadata
  };
}

export function canonicalStringify(value: JsonValue): string {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return `{${entries
    .map(
      ([key, nestedValue]) => `${JSON.stringify(key)}:${canonicalStringify(nestedValue)}`
    )
    .join(",")}}`;
}
