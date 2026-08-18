import "dotenv/config";
import { z } from "zod";

const tokenDurationSchema = z
  .string()
  .trim()
  .regex(/^\d+[smhd]$/, "Use a duration like 15m, 1h, or 30d.");

const optionalTrimmedStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional()
);

const booleanStringSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: tokenDurationSchema.default("15m"),
    JWT_REFRESH_EXPIRES_IN: tokenDurationSchema.default("30d"),
    COOKIE_SECURE: booleanStringSchema,
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    COOKIE_DOMAIN: z.string().min(1).optional(),
    GOOGLE_AUTH_ENABLED: booleanStringSchema,
    GOOGLE_CLIENT_ID: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().min(1).optional()
    ),
    EMAIL_ENABLED: booleanStringSchema,
    SMTP_HOST: optionalTrimmedStringSchema,
    SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
    SMTP_SECURE: booleanStringSchema,
    SMTP_USER: optionalTrimmedStringSchema,
    SMTP_PASS: optionalTrimmedStringSchema,
    EMAIL_FROM_NAME: z.string().trim().min(1).max(100).default("SME Feedback Aggregator"),
    EMAIL_FROM_ADDRESS: optionalTrimmedStringSchema,
    APP_FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .max(10_080)
      .default(1440),
    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .max(1440)
      .default(30),
    STAFF_INVITATION_EXPIRES_IN_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .max(720)
      .default(48),
    AI_ANALYSIS_ENABLED: booleanStringSchema,
    AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
    AI_MODEL: z.string().trim().min(1).max(120).default("gemini-3.5-flash"),
    GEMINI_API_KEY: optionalTrimmedStringSchema,
    AI_AUTO_APPLY_CATEGORY: booleanStringSchema,
    AI_CATEGORY_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
    AI_DAILY_BUSINESS_LIMIT: z.coerce.number().int().positive().max(10_000).default(100),
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
    AI_WORKER_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(300_000)
      .default(5000),
    AI_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(20).default(5),
    AI_MAX_INPUT_CHARS: z.coerce.number().int().positive().max(50_000).default(8000),
    AUTOMATION_WORKER_ENABLED: booleanStringSchema.default("true"),
    AUTOMATION_WORKER_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(300_000)
      .default(5000),
    AUTOMATION_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(10),
    AUTOMATION_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
    INTEGRATION_SYNC_WORKER_ENABLED: booleanStringSchema.default("false"),
    INTEGRATION_SYNC_WORKER_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(300_000)
      .default(5000),
    INTEGRATION_SYNC_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(20).default(5),
    INTEGRATION_SYNC_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(3),
    LIVE_EMAIL_ENABLED: booleanStringSchema,
    GMAIL_OAUTH_CLIENT_ID: optionalTrimmedStringSchema,
    GMAIL_OAUTH_CLIENT_SECRET: optionalTrimmedStringSchema,
    GMAIL_OAUTH_REDIRECT_URI: optionalTrimmedStringSchema,
    LIVE_OUTLOOK_ENABLED: booleanStringSchema,
    MICROSOFT_OAUTH_CLIENT_ID: optionalTrimmedStringSchema,
    MICROSOFT_OAUTH_CLIENT_SECRET: optionalTrimmedStringSchema,
    MICROSOFT_OAUTH_REDIRECT_URI: optionalTrimmedStringSchema,
    MICROSOFT_OAUTH_TENANT: z.string().trim().min(1).max(120).default("common"),
    MICROSOFT_GRAPH_BASE_URL: z
      .string()
      .url()
      .default("https://graph.microsoft.com/v1.0"),
    LIVE_WHATSAPP_ENABLED: booleanStringSchema,
    META_WHATSAPP_APP_ID: optionalTrimmedStringSchema,
    META_WHATSAPP_APP_SECRET: optionalTrimmedStringSchema,
    META_WHATSAPP_VERIFY_TOKEN: optionalTrimmedStringSchema,
    META_WHATSAPP_GRAPH_API_VERSION: z
      .string()
      .trim()
      .regex(/^v\d+\.\d+$/, "Use a Meta Graph API version like v26.0.")
      .default("v26.0"),
    LIVE_META_SOCIAL_ENABLED: booleanStringSchema,
    INTEGRATION_CREDENTIALS_ENCRYPTION_KEY: optionalTrimmedStringSchema,
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info")
  })
  .refine((value) => value.COOKIE_SAME_SITE !== "none" || value.COOKIE_SECURE, {
    message: "COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.",
    path: ["COOKIE_SECURE"]
  })
  .refine((value) => !value.GOOGLE_AUTH_ENABLED || Boolean(value.GOOGLE_CLIENT_ID), {
    message: "GOOGLE_CLIENT_ID is required when GOOGLE_AUTH_ENABLED is true.",
    path: ["GOOGLE_CLIENT_ID"]
  })
  .refine((value) => !value.EMAIL_ENABLED || Boolean(value.SMTP_HOST), {
    message: "SMTP_HOST is required when EMAIL_ENABLED is true.",
    path: ["SMTP_HOST"]
  })
  .refine((value) => !value.EMAIL_ENABLED || Boolean(value.EMAIL_FROM_ADDRESS), {
    message: "EMAIL_FROM_ADDRESS is required when EMAIL_ENABLED is true.",
    path: ["EMAIL_FROM_ADDRESS"]
  })
  .superRefine((value, context) => {
    if (value.LIVE_EMAIL_ENABLED && !value.GMAIL_OAUTH_CLIENT_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GMAIL_OAUTH_CLIENT_ID is required when LIVE_EMAIL_ENABLED is true.",
        path: ["GMAIL_OAUTH_CLIENT_ID"]
      });
    }
    if (value.LIVE_EMAIL_ENABLED && !value.GMAIL_OAUTH_CLIENT_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GMAIL_OAUTH_CLIENT_SECRET is required when LIVE_EMAIL_ENABLED is true.",
        path: ["GMAIL_OAUTH_CLIENT_SECRET"]
      });
    }
    if (value.LIVE_EMAIL_ENABLED && !value.GMAIL_OAUTH_REDIRECT_URI) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GMAIL_OAUTH_REDIRECT_URI is required when LIVE_EMAIL_ENABLED is true.",
        path: ["GMAIL_OAUTH_REDIRECT_URI"]
      });
    }
    if (value.LIVE_OUTLOOK_ENABLED && !value.MICROSOFT_OAUTH_CLIENT_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "MICROSOFT_OAUTH_CLIENT_ID is required when LIVE_OUTLOOK_ENABLED is true.",
        path: ["MICROSOFT_OAUTH_CLIENT_ID"]
      });
    }
    if (value.LIVE_OUTLOOK_ENABLED && !value.MICROSOFT_OAUTH_CLIENT_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "MICROSOFT_OAUTH_CLIENT_SECRET is required when LIVE_OUTLOOK_ENABLED is true.",
        path: ["MICROSOFT_OAUTH_CLIENT_SECRET"]
      });
    }
    if (value.LIVE_OUTLOOK_ENABLED && !value.MICROSOFT_OAUTH_REDIRECT_URI) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "MICROSOFT_OAUTH_REDIRECT_URI is required when LIVE_OUTLOOK_ENABLED is true.",
        path: ["MICROSOFT_OAUTH_REDIRECT_URI"]
      });
    }
    if (
      (value.LIVE_EMAIL_ENABLED || value.LIVE_OUTLOOK_ENABLED) &&
      !isBase64EncodedKey(value.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "INTEGRATION_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key when Live integrations are enabled.",
        path: ["INTEGRATION_CREDENTIALS_ENCRYPTION_KEY"]
      });
    }
  })
  .superRefine((value, context) => {
    if (!value.LIVE_WHATSAPP_ENABLED) return;

    if (!value.META_WHATSAPP_APP_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "META_WHATSAPP_APP_SECRET is required when LIVE_WHATSAPP_ENABLED is true.",
        path: ["META_WHATSAPP_APP_SECRET"]
      });
    }
    if (!value.META_WHATSAPP_VERIFY_TOKEN) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "META_WHATSAPP_VERIFY_TOKEN is required when LIVE_WHATSAPP_ENABLED is true.",
        path: ["META_WHATSAPP_VERIFY_TOKEN"]
      });
    }
    if (!isBase64EncodedKey(value.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "INTEGRATION_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key when Live integrations are enabled.",
        path: ["INTEGRATION_CREDENTIALS_ENCRYPTION_KEY"]
      });
    }
  })
  .superRefine((value, context) => {
    if (!value.LIVE_META_SOCIAL_ENABLED) return;

    if (!value.META_WHATSAPP_APP_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "META_WHATSAPP_APP_SECRET is required when LIVE_META_SOCIAL_ENABLED is true.",
        path: ["META_WHATSAPP_APP_SECRET"]
      });
    }
    if (!value.META_WHATSAPP_VERIFY_TOKEN) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "META_WHATSAPP_VERIFY_TOKEN is required when LIVE_META_SOCIAL_ENABLED is true.",
        path: ["META_WHATSAPP_VERIFY_TOKEN"]
      });
    }
    if (!isBase64EncodedKey(value.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "INTEGRATION_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key when Live integrations are enabled.",
        path: ["INTEGRATION_CREDENTIALS_ENCRYPTION_KEY"]
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid backend environment configuration: ${issues}`);
}

export const env = parsedEnv.data;

function isBase64EncodedKey(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}
