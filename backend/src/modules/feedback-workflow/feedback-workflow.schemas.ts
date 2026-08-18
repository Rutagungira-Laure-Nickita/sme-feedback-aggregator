import { z } from "zod";

export const statusUpdateSchema = z.object({
  status: z.enum(["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"])
});

export const addNoteSchema = z.object({
  note: z
    .string()
    .min(1, "Note is required")
    .max(2000, "Note must be at most 2000 characters")
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, "Note cannot be only whitespace")
    .refine((val) => !val.includes("\0"), "Note contains invalid characters")
});

export const assignmentSchema = z.object({
  membershipId: z
    .string()
    .nullable()
    .transform((val) => (val?.trim() ? val.trim() : null))
});

export const feedbackCategoryUpdateSchema = z.object({
  categoryId: z
    .string()
    .nullable()
    .transform((val) => (val?.trim() ? val.trim() : null))
});

export const priorityUpdateSchema = z.object({
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"])
});

export const feedbackParamsSchema = z.object({
  businessId: z.string(),
  feedbackId: z.string()
});

export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type FeedbackCategoryUpdateInput = z.infer<typeof feedbackCategoryUpdateSchema>;
export type PriorityUpdateInput = z.infer<typeof priorityUpdateSchema>;
