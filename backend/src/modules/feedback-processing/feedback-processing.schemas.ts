import { FeedbackChannel } from "@prisma/client";
import { z } from "zod";
import type { JsonObject, JsonValue } from "./feedback-processing.types.js";

const MAX_SOURCE_METADATA_BYTES = 8_192;
const MAX_ATTACHMENT_METADATA_BYTES = 2_048;
export const MAX_FEEDBACK_ATTACHMENTS = 10;

const noNullByte = (value: string) => !value.includes("\u0000");

const requiredTextSchema = (max: number): z.ZodType<string, z.ZodTypeDef, unknown> =>
  z
    .string()
    .trim()
    .min(1, "Required text is missing.")
    .max(max)
    .refine(noNullByte, "String contains invalid characters.");

const optionalStringSchema = (
  max: number
): z.ZodType<string | undefined, z.ZodTypeDef, unknown> =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(max)
      .refine(noNullByte, "String contains invalid characters.")
      .optional()
  );

const optionalEmailSchema: z.ZodType<string | undefined, z.ZodTypeDef, unknown> =
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email().max(255).refine(noNullByte).optional()
  );

const optionalPhoneSchema: z.ZodType<string | undefined, z.ZodTypeDef, unknown> =
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[+\d][\d\s().-]{2,39}$/, "Enter a valid phone number.")
      .refine(noNullByte)
      .optional()
  );

const optionalUrlSchema: z.ZodType<string | undefined, z.ZodTypeDef, unknown> =
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().url().max(1024).refine(noNullByte).optional()
  );

const optionalDateSchema: z.ZodType<Date | undefined, z.ZodTypeDef, unknown> =
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.date().optional()
  );

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(2_000).refine(noNullByte),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(100),
    z.record(jsonValueSchema)
  ])
);

const jsonObjectSchema: z.ZodType<JsonObject> = z.record(jsonValueSchema);

function metadataSchema(maxBytes: number): z.ZodType<JsonObject> {
  return jsonObjectSchema.refine((value) => serializedByteLength(value) <= maxBytes, {
    message: "Metadata is too large."
  });
}

export const feedbackCustomerInputSchema = z
  .object({
    name: optionalStringSchema(160),
    email: optionalEmailSchema,
    phone: optionalPhoneSchema
  })
  .strict()
  .optional();

export const feedbackAttachmentInputSchema = z
  .object({
    filename: requiredTextSchema(255),
    mimeType: requiredTextSchema(120),
    sizeBytes: z.coerce.number().int().min(0).max(2_147_483_647).optional(),
    externalUrl: optionalUrlSchema,
    checksum: optionalStringSchema(255),
    metadata: metadataSchema(MAX_ATTACHMENT_METADATA_BYTES).optional()
  })
  .strict();

export const normalizedFeedbackInputSchema = z
  .object({
    businessId: requiredTextSchema(191),
    branchId: optionalStringSchema(191),
    channel: z.nativeEnum(FeedbackChannel),
    externalId: optionalStringSchema(255),
    idempotencyKey: requiredTextSchema(255),
    title: optionalStringSchema(250),
    message: requiredTextSchema(10_000),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    occurredAt: optionalDateSchema,
    sourceUrl: optionalUrlSchema,
    languageCode: optionalStringSchema(20).refine(
      (value) =>
        value === undefined || /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/.test(value),
      "Enter a valid language code."
    ),
    customer: feedbackCustomerInputSchema,
    attachments: z
      .array(feedbackAttachmentInputSchema)
      .max(MAX_FEEDBACK_ATTACHMENTS)
      .optional(),
    metadata: metadataSchema(MAX_SOURCE_METADATA_BYTES).optional()
  })
  .strict();

export type ParsedFeedbackInput = z.infer<typeof normalizedFeedbackInputSchema>;

function serializedByteLength(value: JsonObject): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}
