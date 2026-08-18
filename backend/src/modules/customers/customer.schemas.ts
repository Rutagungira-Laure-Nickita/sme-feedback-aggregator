import { CustomerStatus } from "@prisma/client";
import { z } from "zod";
import { normalizeOptionalSearch } from "../../utils/search-normalization.js";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === null ? undefined : value));

const optionalDate = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : value;
  });

export const customerIdParamsSchema = z.object({
  businessId: z.string().min(1),
  customerId: z.string().min(1)
});

export const feedbackCustomerParamsSchema = z.object({
  businessId: z.string().min(1),
  feedbackId: z.string().min(1)
});

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z
    .string()
    .optional()
    .transform((value) => normalizeOptionalSearch(value, 120)),
  status: z
    .string()
    .optional()
    .transform((value) =>
      value === CustomerStatus.ACTIVE || value === CustomerStatus.ARCHIVED
        ? value
        : undefined
    ),
  branchId: z.string().optional(),
  channel: z
    .string()
    .optional()
    .transform((value) =>
      ["MANUAL", "PUBLIC_FORM", "QR_CODE"].includes(value ?? "")
        ? (value as "MANUAL" | "PUBLIC_FORM" | "QR_CODE")
        : undefined
    ),
  ratingMin: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  ratingMax: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  latestFeedbackFrom: optionalDate,
  latestFeedbackTo: optionalDate,
  contactState: z
    .enum(["has_email", "has_phone", "missing_email", "missing_phone"])
    .optional()
    .catch(undefined),
  sort: z.enum(["latestFeedback", "updated", "name"]).default("latestFeedback")
});

export const customerFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z
    .string()
    .optional()
    .transform((value) => normalizeOptionalSearch(value, 160)),
  branchId: z.string().optional(),
  channel: z
    .string()
    .optional()
    .transform((value) =>
      ["MANUAL", "PUBLIC_FORM", "QR_CODE"].includes(value ?? "")
        ? (value as "MANUAL" | "PUBLIC_FORM" | "QR_CODE")
        : undefined
    ),
  status: z.enum(["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"]).optional().catch(undefined),
  assignedTo: z.string().optional(),
  categoryId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().catch(undefined),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  ratingMin: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  ratingMax: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  includeUnrated: z
    .string()
    .optional()
    .transform((value) => (value === "true" ? true : undefined)),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  sort: z.enum(["newest", "oldest"]).default("newest").catch("newest")
});

export const customerCreateSchema = z.object({
  displayName: optionalText(160),
  firstName: optionalText(100),
  lastName: optionalText(100),
  email: optionalText(255),
  phone: optionalText(40)
});

export const customerUpdateSchema = customerCreateSchema.extend({
  expectedUpdatedAt: z.string().datetime()
});

export const expectedUpdatedAtSchema = z.object({
  expectedUpdatedAt: z.string().datetime()
});

export const feedbackCustomerLinkSchema = z.object({
  customerId: z.string().min(1).nullable(),
  expectedCustomerId: z.string().min(1).nullable()
});

export const createCustomerFromFeedbackSchema = customerCreateSchema.extend({
  expectedCustomerId: z.string().min(1).nullable()
});

export const customerMatchesQuerySchema = z.object({
  search: z.string().trim().max(120).optional()
});

export type CustomerListQueryInput = z.infer<typeof customerListQuerySchema>;
export type CustomerFeedbackQueryInput = z.infer<typeof customerFeedbackQuerySchema>;
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type ExpectedUpdatedAtInput = z.infer<typeof expectedUpdatedAtSchema>;
export type FeedbackCustomerLinkInput = z.infer<typeof feedbackCustomerLinkSchema>;
export type CreateCustomerFromFeedbackInput = z.infer<
  typeof createCustomerFromFeedbackSchema
>;
export type CustomerMatchesQueryInput = z.infer<typeof customerMatchesQuerySchema>;
