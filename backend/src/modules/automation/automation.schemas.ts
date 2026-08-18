import { z } from "zod";

export const automationRuleTriggerSchema = z.enum([
  "FEEDBACK_CREATED",
  "AI_ANALYSIS_COMPLETED"
]);

export const automationRuleStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED"
]);

export const automationConditionTypeSchema = z.enum([
  "BRANCH",
  "CHANNEL",
  "RATING",
  "STATUS",
  "PRIORITY",
  "CATEGORY",
  "ASSIGNMENT_STATE",
  "CUSTOMER_LINK_STATE",
  "AI_STATUS",
  "SENTIMENT",
  "SENTIMENT_CONFIDENCE",
  "AI_SUGGESTED_CATEGORY",
  "AI_CATEGORY_CONFIDENCE",
  "AI_SUGGESTION_STATE"
]);

export const automationConditionOperatorSchema = z.enum([
  "EQUALS",
  "NOT_EQUALS",
  "IN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN_OR_EQUAL",
  "IS_EMPTY",
  "IS_NOT_EMPTY"
]);

export const automationActionTypeSchema = z.enum([
  "SET_PRIORITY",
  "SET_CATEGORY",
  "ASSIGN_TO_MEMBERSHIP",
  "UNASSIGN",
  "SET_STATUS"
]);

export const conditionInputSchema = z.object({
  type: automationConditionTypeSchema,
  operator: automationConditionOperatorSchema,
  value: z.string().trim().max(255).optional().nullable(),
  values: z.array(z.string().trim().max(255)).max(25).optional(),
  valueNumber: z.number().finite().optional().nullable(),
  branchId: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable()
});

export const actionInputSchema = z.object({
  type: automationActionTypeSchema,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  membershipId: z.string().trim().optional().nullable(),
  status: z.enum(["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"]).optional().nullable()
});

export const ruleDefinitionSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "Name is required.")
    .refine((value) => value.length <= 120, "Name must be at most 120 characters.")
    .refine((value) => !value.includes("\0"), "Name contains invalid characters."),
  description: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 500, "Description must be at most 500 characters.")
    .refine((value) => !value.includes("\0"), "Description contains invalid characters.")
    .optional()
    .nullable(),
  trigger: automationRuleTriggerSchema,
  branchScope: z.enum(["ALL_BRANCHES", "SELECTED_BRANCHES"]).default("ALL_BRANCHES"),
  branchIds: z.array(z.string().trim()).max(50).default([]),
  matchMode: z.enum(["ALL", "ANY"]).default("ALL"),
  stopProcessingAfterMatch: z.boolean().default(false),
  conditions: z.array(conditionInputSchema).max(10).default([]),
  actions: z.array(actionInputSchema).max(5).default([])
});

export const ruleUpdateSchema = ruleDefinitionSchema.extend({
  expectedUpdatedAt: z.string().datetime().optional()
});

export const ruleListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: automationRuleStatusSchema.optional(),
  trigger: automationRuleTriggerSchema.optional(),
  branchScope: z.enum(["ALL_BRANCHES", "SELECTED_BRANCHES"]).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const executionListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["SUCCESS", "PARTIAL", "FAILED", "SKIPPED", "NOT_MATCHED"]).optional(),
  trigger: automationRuleTriggerSchema.optional(),
  ruleId: z.string().trim().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const ruleParamsSchema = z.object({
  businessId: z.string(),
  ruleId: z.string()
});

export const executionParamsSchema = z.object({
  businessId: z.string(),
  executionId: z.string()
});

export const businessParamsSchema = z.object({
  businessId: z.string()
});

export const previewRunSchema = z.object({
  feedbackId: z.string().trim().min(1),
  requestKey: z.string().trim().min(1).max(120).optional()
});

export const reorderRulesSchema = z.object({
  ruleIds: z.array(z.string().trim().min(1)).min(1).max(200)
});

export type RuleDefinitionInput = z.infer<typeof ruleDefinitionSchema>;
export type RuleUpdateInput = z.infer<typeof ruleUpdateSchema>;
export type RuleListQuery = z.infer<typeof ruleListQuerySchema>;
export type ExecutionListQuery = z.infer<typeof executionListQuerySchema>;
export type PreviewRunInput = z.infer<typeof previewRunSchema>;
