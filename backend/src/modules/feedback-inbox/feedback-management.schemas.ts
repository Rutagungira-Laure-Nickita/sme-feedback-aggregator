import { z } from "zod";

const feedbackStatusSchema = z.enum(["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"]);
const feedbackPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const feedbackChannelSchema = z.enum([
  "MANUAL",
  "PUBLIC_FORM",
  "QR_CODE",
  "WHATSAPP",
  "EMAIL"
]);

export const feedbackEditSchema = z
  .object({
    title: z.string().trim().max(250).nullable().optional(),
    message: z.string().trim().min(1).max(20_000).optional(),
    customerName: z.string().trim().max(160).nullable().optional(),
    customerEmail: z.string().trim().email().max(255).nullable().optional(),
    customerPhone: z.string().trim().max(40).nullable().optional(),
    branchId: z.string().min(1).optional(),
    categoryId: z.string().min(1).nullable().optional(),
    status: feedbackStatusSchema.optional(),
    priority: feedbackPrioritySchema.optional(),
    expectedUpdatedAt: z.string().datetime()
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "expectedUpdatedAt"),
    "At least one editable field is required."
  );

const bulkFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  branchId: z.string().optional(),
  channel: feedbackChannelSchema.optional(),
  status: feedbackStatusSchema.optional(),
  priority: feedbackPrioritySchema.optional(),
  categoryId: z.string().optional(),
  categoryState: z.enum(["categorized", "uncategorized"]).optional(),
  assignedTo: z.string().optional(),
  assignmentState: z.enum(["assigned", "unassigned"]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  ratingMin: z.number().int().min(1).max(5).optional(),
  ratingMax: z.number().int().min(1).max(5).optional(),
  includeUnrated: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  customerLinkState: z.enum(["linked", "unlinked"]).optional(),
  customerId: z.string().optional(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]).optional(),
  aiStatus: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "SKIPPED"])
    .optional(),
  aiSuggestionState: z.enum(["AVAILABLE", "APPLIED", "DISMISSED", "NONE"]).optional()
});

export const feedbackSelectionSchema = z
  .object({
    feedbackIds: z.array(z.string().min(1)).max(5_000).optional(),
    excludedFeedbackIds: z.array(z.string().min(1)).max(5_000).optional(),
    allMatching: z.boolean().optional(),
    filters: bulkFilterSchema.optional()
  })
  .refine(
    (value) =>
      value.allMatching === true ||
      Boolean(value.feedbackIds && value.feedbackIds.length),
    "Select at least one feedback record."
  )
  .refine(
    (value) => value.allMatching === true || !value.excludedFeedbackIds?.length,
    "Excluded feedback records are only valid with an all-matching selection."
  );

export const bulkStatusSchema = z.object({
  selection: feedbackSelectionSchema,
  status: feedbackStatusSchema
});

export const bulkCategorySchema = z.object({
  selection: feedbackSelectionSchema,
  categoryId: z.string().min(1).nullable()
});

export const bulkDeleteSchema = z.object({
  selection: feedbackSelectionSchema,
  confirmation: z.literal("DELETE").optional()
});

export type FeedbackEditInput = z.infer<typeof feedbackEditSchema>;
export type FeedbackSelectionInput = z.infer<typeof feedbackSelectionSchema>;
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
export type BulkCategoryInput = z.infer<typeof bulkCategorySchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
