import type { FeedbackChannel } from "@prisma/client";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
  readonly [key: string]: JsonValue;
};

export type FeedbackCustomerInput = {
  name?: string;
  email?: string;
  phone?: string;
};

export type FeedbackAttachmentInput = {
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  externalUrl?: string;
  checksum?: string;
  metadata?: JsonObject;
};

export type NormalizedFeedbackInput = {
  businessId: string;
  branchId?: string;
  channel: FeedbackChannel;
  externalId?: string;
  idempotencyKey: string;
  title?: string;
  message: string;
  rating?: number;
  occurredAt?: Date | string;
  sourceUrl?: string;
  languageCode?: string;
  customer?: FeedbackCustomerInput;
  attachments?: FeedbackAttachmentInput[];
  metadata?: JsonObject;
};

export type PreparedFeedbackAttachment = {
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  externalUrl: string | null;
  checksum: string | null;
  metadata: JsonObject | null;
};

export type PreparedFeedbackInput = {
  businessId: string;
  branchId: string | null;
  channel: FeedbackChannel;
  externalId: string | null;
  idempotencyKey: string;
  title: string | null;
  message: string;
  rating: number | null;
  occurredAt: Date | null;
  sourceUrl: string | null;
  languageCode: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  attachments: PreparedFeedbackAttachment[];
  metadata: JsonObject | null;
};

export type ResolvedFeedbackInput = PreparedFeedbackInput & {
  branchId: string;
};

export type FeedbackProcessingResult = {
  feedbackId: string;
  ingestionId: string;
  businessId: string;
  branchId: string;
  channel: FeedbackChannel;
  created: boolean;
  duplicate: boolean;
  processedAt: string;
};

export type FeedbackProcessingValidationResult = {
  accepted: boolean;
  businessId: string;
  branchId: string;
  channel: FeedbackChannel;
  duplicate: boolean;
  created: false;
  payloadHash: string;
};
