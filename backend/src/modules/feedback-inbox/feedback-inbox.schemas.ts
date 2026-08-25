import { z } from "zod";
import { normalizeOptionalSearch } from "../../utils/search-normalization.js";

const PAGE_SIZE_ALLOWLIST = [10, 20, 50] as const;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((value): T[number] | undefined =>
      value && values.includes(value as T[number]) ? value : undefined
    );

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        return undefined;
      }
      return parsed;
    });

const optionalBoolean = z
  .string()
  .optional()
  .transform((value) => (value === "true" ? true : undefined));

const optionalDate = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : value;
  });

export const feedbackInboxQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .default("1")
      .transform((val) => {
        const parsed = Number.parseInt(val, 10);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
      }),
    pageSize: z
      .string()
      .optional()
      .default("20")
      .transform((val) => {
        const parsed = Number.parseInt(val, 10);
        return PAGE_SIZE_ALLOWLIST.includes(
          parsed as (typeof PAGE_SIZE_ALLOWLIST)[number]
        )
          ? parsed
          : 20;
      }),
    search: z
      .string()
      .optional()
      .transform((val) => normalizeOptionalSearch(val, 200)),
    branchId: z.string().optional(),
    channel: optionalEnum(["MANUAL", "PUBLIC_FORM", "QR_CODE", "WHATSAPP", "EMAIL"]),
    status: optionalEnum(["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"]),
    sentiment: optionalEnum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]),
    aiStatus: optionalEnum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "SKIPPED"]),
    aiSuggestionState: optionalEnum(["AVAILABLE", "APPLIED", "DISMISSED", "NONE"]),
    assignedTo: z.string().optional(),
    assignmentState: optionalEnum(["assigned", "unassigned"]),
    categoryId: z.string().optional(),
    categoryState: optionalEnum(["categorized", "uncategorized"]),
    priority: optionalEnum(["LOW", "NORMAL", "HIGH", "URGENT"]),
    rating: optionalInt(1, 5),
    ratingMin: optionalInt(1, 5),
    ratingMax: optionalInt(1, 5),
    includeUnrated: optionalBoolean,
    datePreset: optionalEnum([
      "today",
      "last_7_days",
      "last_30_days",
      "this_month",
      "previous_month",
      "custom"
    ]),
    dateFrom: optionalDate,
    dateTo: optionalDate,
    customerLinkState: optionalEnum(["linked", "unlinked"]),
    customerId: z.string().optional(),
    sort: optionalEnum(["newest", "oldest"]).transform((value) => value ?? "newest")
  })
  .refine(
    (data) => {
      const ratingMin = data.ratingMin ?? data.rating;
      const ratingMax = data.ratingMax ?? data.rating;
      if (ratingMin && ratingMax && ratingMin > ratingMax) {
        return false;
      }
      return true;
    },
    {
      message: "ratingMin must be before or equal to ratingMax",
      path: ["ratingMax"]
    }
  )
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        const from = new Date(data.dateFrom);
        const to = new Date(data.dateTo);

        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          return from <= to;
        }
      }
      return true;
    },
    {
      message: "dateFrom must be before or equal to dateTo",
      path: ["dateTo"]
    }
  );

export const feedbackIdParamsSchema = z.object({
  businessId: z.string(),
  feedbackId: z.string()
});

export type FeedbackInboxQueryInput = z.infer<typeof feedbackInboxQuerySchema>;
