import { FeedbackAISentiment, FeedbackStatus } from "../../lib/prisma-runtime.js";
import { z } from "zod";

const optionalId = z.string().trim().min(1).max(191).optional();

/**
 * Business Owner reports never accept a businessId or reportType.
 * The authorized Business comes from the authenticated membership of the
 * route business, and there is exactly one owner report type.
 */
const businessReportBaseSchema = z
  .object({
    outputFormat: z.enum(["PDF", "CSV"]).default("PDF"),
    dateFrom: z.coerce.date(),
    dateTo: z.coerce.date(),
    branchId: optionalId,
    channel: z.enum(["EMAIL", "WHATSAPP", "MANUAL", "PUBLIC_FORM"]).optional(),
    status: z.nativeEnum(FeedbackStatus).optional(),
    sentiment: z.nativeEnum(FeedbackAISentiment).optional(),
    comparePreviousPeriod: z.boolean().default(false)
  })
  .strict();

function validateOwnerReportWindow(
  value: { dateFrom: Date; dateTo: Date },
  context: z.RefinementCtx
) {
  if (value.dateFrom > value.dateTo) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateTo"],
      message: "The report start date must be before the end date."
    });
  }
  if (value.dateTo.getTime() - value.dateFrom.getTime() > 366 * 86_400_000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateTo"],
      message: "Reports can cover at most 366 days."
    });
  }
}

export const businessReportPreviewSchema = businessReportBaseSchema
  .omit({ outputFormat: true })
  .superRefine(validateOwnerReportWindow);

export const businessReportRequestSchema = businessReportBaseSchema.superRefine(
  validateOwnerReportWindow
);

export type BusinessReportRequest = z.infer<typeof businessReportRequestSchema>;
export type BusinessReportPreview = z.infer<typeof businessReportPreviewSchema>;
