import { z } from "zod";
import { publicFeedbackSubmissionSchema } from "./public-feedback.schemas.js";

const noNullByte = (value: string) => !value.includes("\u0000");

const idSchema = z
  .string()
  .trim()
  .min(1, "ID is required.")
  .max(191, "ID is too long.")
  .refine(noNullByte, "ID contains invalid characters.");

const optionalIdSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  idSchema.optional()
);

const qrTokenSchema = z
  .string()
  .trim()
  .min(20, "QR token is required.")
  .max(128, "QR token is too long.")
  .regex(/^[A-Za-z0-9_-]+$/, "QR token contains invalid characters.");

const qrNameSchema = z
  .string()
  .trim()
  .min(1, "QR code name is required.")
  .max(120, "QR code name is too long.")
  .refine(noNullByte, "QR code name contains invalid characters.");

export const publicFeedbackQrBusinessParamsSchema = z.object({
  businessId: idSchema
});

export const publicFeedbackQrCodeParamsSchema = z.object({
  businessId: idSchema,
  qrCodeId: idSchema
});

export const publicFeedbackQrPublicParamsSchema = z.object({
  qrToken: qrTokenSchema
});

export const publicFeedbackQrCreateSchema = z
  .object({
    name: qrNameSchema,
    branchId: optionalIdSchema
  })
  .strict();

export const publicFeedbackQrUpdateSchema = z
  .object({
    name: qrNameSchema.optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one QR code update is required."
  });

export const publicFeedbackQrSubmissionSchema = publicFeedbackSubmissionSchema;

export type PublicFeedbackQrCreateInput = z.infer<typeof publicFeedbackQrCreateSchema>;
export type PublicFeedbackQrUpdateInput = z.infer<typeof publicFeedbackQrUpdateSchema>;
export type PublicFeedbackQrSubmissionInput = z.infer<
  typeof publicFeedbackQrSubmissionSchema
>;
