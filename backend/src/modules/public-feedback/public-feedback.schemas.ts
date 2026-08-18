import { z } from "zod";

const noNullByte = (value: string) => !value.includes("\u0000");

const idSchema = z
  .string()
  .trim()
  .min(1, "ID is required.")
  .max(191, "ID is too long.")
  .refine(noNullByte, "ID contains invalid characters.");

const portalTokenSchema = z
  .string()
  .trim()
  .min(20, "Portal token is required.")
  .max(128, "Portal token is too long.")
  .regex(/^[A-Za-z0-9_-]+$/, "Portal token contains invalid characters.");

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

const requiredTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Feedback message is required.")
    .max(max, "Feedback message is too long.")
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

const optionalIsoDateTimeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().datetime({ offset: true }).optional()
);

export const publicFeedbackBusinessParamsSchema = z.object({
  businessId: idSchema
});

export const publicFeedbackPortalParamsSchema = z.object({
  portalToken: portalTokenSchema
});

export const publicFeedbackIdempotencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(noNullByte, "Idempotency-Key contains invalid characters.");

export const publicFeedbackSettingsPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    welcomeMessage: z
      .preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? null : value),
        z
          .string()
          .trim()
          .max(500, "Welcome message is too long.")
          .refine(noNullByte, "Welcome message contains invalid characters.")
          .nullable()
          .optional()
      )
      .optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one setting is required."
  });

export const publicFeedbackSubmissionSchema = z
  .object({
    branchId: idSchema,
    rating: z.number().int().min(1).max(5),
    message: requiredTextSchema(5_000),
    occurredAt: optionalIsoDateTimeSchema,
    customer: z
      .object({
        name: optionalTextSchema(160),
        email: optionalEmailSchema,
        phone: optionalPhoneSchema
      })
      .strict()
      .optional(),
    allowFollowUp: z.boolean().optional().default(false),
    website: z.string().max(1_000).optional().default("")
  })
  .strict()
  .refine(
    (value) =>
      !value.allowFollowUp || Boolean(value.customer?.email || value.customer?.phone),
    {
      path: ["allowFollowUp"],
      message: "Provide an email or phone number if follow-up is allowed."
    }
  );

export type PublicFeedbackSettingsPatchInput = z.infer<
  typeof publicFeedbackSettingsPatchSchema
>;
export type PublicFeedbackSubmissionInput = z.infer<
  typeof publicFeedbackSubmissionSchema
>;
