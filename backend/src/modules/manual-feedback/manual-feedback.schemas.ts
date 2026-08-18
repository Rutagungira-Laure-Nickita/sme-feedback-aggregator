import { z } from "zod";
import {
  MAX_FEEDBACK_ATTACHMENTS,
  feedbackAttachmentInputSchema
} from "../feedback-processing/feedback-processing.schemas.js";

const noNullByte = (value: string) => !value.includes("\u0000");

const idSchema = z
  .string()
  .trim()
  .min(1, "ID is required.")
  .max(191, "ID is too long.")
  .refine(noNullByte, "ID contains invalid characters.");

const optionalTextSchema = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(max)
      .refine(noNullByte, "String contains invalid characters.")
      .optional()
  );

const messageSchema = z
  .string()
  .trim()
  .min(1, "Feedback message is required.")
  .max(10_000, "Feedback message is too long.")
  .refine(noNullByte, "Feedback message contains invalid characters.");

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(255)
    .refine(noNullByte, "Email contains invalid characters.")
    .transform((value) => value.toLowerCase())
    .optional()
);

const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[+\d][\d\s().-]{2,39}$/, "Enter a valid phone number.")
    .refine(noNullByte, "Phone contains invalid characters.")
    .optional()
);

const optionalHttpUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .url()
    .max(1024)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "URL must use HTTP or HTTPS.")
    .refine(noNullByte, "URL contains invalid characters.")
    .optional()
);

const optionalIsoDateTimeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().datetime({ offset: true }).optional()
);

const optionalLanguageCodeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(20)
    .refine(noNullByte, "Language code contains invalid characters.")
    .transform((value) => value.toLowerCase())
    .refine(
      (value) => /^[a-z]{2,3}(-[a-z0-9]{2,8}){0,2}$/.test(value),
      "Enter a valid language code."
    )
    .optional()
);

export const manualSourceTypeSchema = z.enum([
  "PHONE_CALL",
  "IN_PERSON",
  "SUGGESTION_BOX",
  "SMS",
  "EMAIL_COPY",
  "SOCIAL_MEDIA_COPY",
  "OTHER"
]);

export const manualFeedbackParamsSchema = z.object({
  businessId: idSchema
});

export const manualFeedbackIdempotencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(noNullByte, "Idempotency-Key contains invalid characters.");

export const manualFeedbackRequestSchema = z
  .object({
    branchId: idSchema,
    title: optionalTextSchema(250),
    message: messageSchema,
    rating: z.number().int().min(1).max(5).optional(),
    occurredAt: optionalIsoDateTimeSchema,
    languageCode: optionalLanguageCodeSchema,
    customer: z
      .object({
        name: optionalTextSchema(160),
        email: optionalEmailSchema,
        phone: optionalPhoneSchema
      })
      .strict()
      .optional(),
    source: z
      .object({
        type: manualSourceTypeSchema,
        note: optionalTextSchema(1_000),
        reference: optionalTextSchema(255),
        sourceUrl: optionalHttpUrlSchema
      })
      .strict(),
    attachments: z
      .array(feedbackAttachmentInputSchema)
      .max(MAX_FEEDBACK_ATTACHMENTS)
      .optional()
  })
  .strict();

export type ManualFeedbackInput = z.infer<typeof manualFeedbackRequestSchema>;
