import {
  AccountStatus,
  BusinessMemberRole,
  FeedbackAISentiment,
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus,
  IntegrationConnectionStatus,
  IntegrationMode,
  IntegrationProvider,
  PlatformAppearance,
  UserRole
} from "../../lib/prisma-runtime.js";
import { z } from "zod";

export const adminPeriodSchema = z.enum(["7d", "30d", "90d", "12m"]);

const optionalId = z.string().trim().min(1).max(191).optional();
const optionalSearch = z.string().trim().max(160).optional();

const safePlainText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine(
      (value) =>
        ![...value].some((character) => {
          const code = character.charCodeAt(0);
          return (
            character === "<" ||
            character === ">" ||
            (code < 32 && code !== 9 && code !== 10 && code !== 13)
          );
        }),
      { message: "Use plain text without HTML or control characters." }
    );

const safeLogoUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
    message: "Logo URLs must use HTTP or HTTPS."
  })
  .nullable();

const optionalSafePhone = z
  .string()
  .trim()
  .max(40)
  .regex(/^[+\d][\d\s().-]{2,39}$/, "Enter a valid phone number.")
  .nullable();

export const platformSettingsUpdateSchema = z
  .object({
    platformName: safePlainText(80).optional(),
    brandTagline: safePlainText(120).optional(),
    headline: safePlainText(180).optional(),
    platformDescription: safePlainText(500).optional(),
    heroSupportingText: safePlainText(320).optional(),
    primaryCtaLabel: safePlainText(60).optional(),
    secondaryCtaLabel: safePlainText(60).optional(),
    logoUrl: safeLogoUrl.optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    defaultAppearance: z.nativeEnum(PlatformAppearance).optional(),
    supportEmail: z.string().trim().email().max(255).optional(),
    supportPhone: optionalSafePhone.optional(),
    defaultReportRangeDays: z.number().int().min(7).max(366).optional(),
    reportFooterText: safePlainText(180).optional(),
    footerText: safePlainText(180).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one platform setting is required."
  });

export const adminDashboardQuerySchema = z.object({
  period: adminPeriodSchema.default("30d")
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: optionalSearch,
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
  businessId: optionalId
});

export const adminEntityParamsSchema = z.object({
  entityId: z.string().trim().min(1).max(191)
});

export const adminUserUpdateSchema = z
  .object({
    firstName: safePlainText(100).optional(),
    lastName: safePlainText(100).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one user field is required."
  });

export const adminUserActionSchema = z.object({
  action: z.enum([
    "VERIFY_EMAIL",
    "UNVERIFY_EMAIL",
    "SUSPEND",
    "REACTIVATE",
    "DISABLE",
    "REVOKE_SESSIONS"
  ])
});

export const adminIntegrationActionSchema = z.object({
  action: z.enum(["PAUSE", "RESUME", "DISCONNECT"])
});

export const adminFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: optionalSearch,
  businessId: optionalId,
  branchId: optionalId,
  channel: z.nativeEnum(FeedbackChannel).optional(),
  status: z.nativeEnum(FeedbackStatus).optional(),
  priority: z.nativeEnum(FeedbackPriority).optional(),
  categoryId: optionalId,
  sentiment: z.nativeEnum(FeedbackAISentiment).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

export const adminIntegrationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: optionalSearch,
  businessId: optionalId,
  provider: z.nativeEnum(IntegrationProvider).optional(),
  mode: z.nativeEnum(IntegrationMode).optional(),
  status: z.nativeEnum(IntegrationConnectionStatus).optional(),
  health: z.enum(["HEALTHY", "NEEDS_ATTENTION"]).optional()
});

export const adminReportTypeSchema = z.enum([
  "EXECUTIVE_PLATFORM",
  "FEEDBACK_CUSTOMER_EXPERIENCE",
  "OPERATIONS_SYSTEM_HEALTH"
]);

const adminReportBaseSchema = z.object({
  reportType: adminReportTypeSchema,
  outputFormat: z.enum(["PDF", "CSV"]).default("PDF"),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  businessId: optionalId,
  branchId: optionalId,
  channel: z.nativeEnum(FeedbackChannel).optional(),
  status: z.nativeEnum(FeedbackStatus).optional(),
  sentiment: z.nativeEnum(FeedbackAISentiment).optional(),
  provider: z.nativeEnum(IntegrationProvider).optional(),
  comparePreviousPeriod: z.boolean().default(false)
});

function validateReportAwareFilters(
  value: {
    reportType: z.infer<typeof adminReportTypeSchema>;
    branchId?: string;
    channel?: FeedbackChannel;
    status?: FeedbackStatus;
    sentiment?: FeedbackAISentiment;
    provider?: IntegrationProvider;
  },
  context: z.RefinementCtx
) {
  const unsupported =
    value.reportType === "EXECUTIVE_PLATFORM"
      ? (["channel", "status", "sentiment", "provider"] as const)
      : value.reportType === "FEEDBACK_CUSTOMER_EXPERIENCE"
        ? (["provider"] as const)
        : (["branchId", "channel", "status", "sentiment"] as const);

  for (const field of unsupported) {
    if (value[field] !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is not supported for the selected report type.`
      });
    }
  }
}

export const adminReportRequestSchema = adminReportBaseSchema
  .superRefine(validateReportAwareFilters)
  .refine((value) => value.dateFrom <= value.dateTo, {
    message: "The report start date must be before the end date.",
    path: ["dateTo"]
  })
  .refine(
    (value) => value.dateTo.getTime() - value.dateFrom.getTime() <= 366 * 86_400_000,
    {
      message: "Reports can cover at most 366 days.",
      path: ["dateTo"]
    }
  );

export const adminReportPreviewSchema = adminReportBaseSchema
  .omit({ outputFormat: true })
  .superRefine(validateReportAwareFilters)
  .refine((value) => value.dateFrom <= value.dateTo, {
    message: "The report start date must be before the end date.",
    path: ["dateTo"]
  })
  .refine(
    (value) => value.dateTo.getTime() - value.dateFrom.getTime() <= 366 * 86_400_000,
    {
      message: "Reports can cover at most 366 days.",
      path: ["dateTo"]
    }
  );

export type AdminPeriod = z.infer<typeof adminPeriodSchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;
export type AdminUserAction = z.infer<typeof adminUserActionSchema>["action"];
export type AdminIntegrationAction = z.infer<
  typeof adminIntegrationActionSchema
>["action"];
export type AdminFeedbackQuery = z.infer<typeof adminFeedbackQuerySchema>;
export type AdminIntegrationsQuery = z.infer<typeof adminIntegrationsQuerySchema>;
export type AdminReportRequest = z.infer<typeof adminReportRequestSchema>;
export type AdminReportType = z.infer<typeof adminReportTypeSchema>;
export type PlatformSettingsUpdate = z.infer<typeof platformSettingsUpdateSchema>;

export const reportRoleSchema = z.nativeEnum(BusinessMemberRole);
