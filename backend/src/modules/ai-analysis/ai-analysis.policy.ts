import { FeedbackAIAnalysisStatus } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";

export const CATEGORY_APPLICATION_RESULT = {
  AUTO_APPLIED: "AUTO_APPLIED",
  MANUALLY_APPLIED: "MANUALLY_APPLIED",
  DISMISSED: "DISMISSED",
  CONFLICTED: "CONFLICTED"
} as const;

export type CategorySuggestionState =
  "NONE" | "AVAILABLE" | "AUTO_APPLIED" | "MANUALLY_APPLIED" | "DISMISSED" | "CONFLICTED";

export type SuggestionStateFilter = "AVAILABLE" | "APPLIED" | "DISMISSED" | "NONE";

export function resolveAIOperationalState(input: {
  enabled: boolean;
  provider: string;
  geminiApiKey?: string | null;
}): "DISABLED" | "NOT_CONFIGURED" | "READY" {
  if (!input.enabled) return "DISABLED";
  if (input.provider === "gemini" && !input.geminiApiKey) return "NOT_CONFIGURED";
  return "READY";
}

export function deriveCategorySuggestionState(input: {
  status: FeedbackAIAnalysisStatus;
  suggestedCategoryId: string | null;
  suggestionDismissedAt: Date | string | null;
  categoryAutoAppliedAt: Date | string | null;
  categoryApplicationResult: string | null;
}): CategorySuggestionState {
  const result = input.categoryApplicationResult;

  if (
    result === CATEGORY_APPLICATION_RESULT.AUTO_APPLIED ||
    input.categoryAutoAppliedAt
  ) {
    return "AUTO_APPLIED";
  }
  if (result === CATEGORY_APPLICATION_RESULT.MANUALLY_APPLIED) return "MANUALLY_APPLIED";
  if (
    result === CATEGORY_APPLICATION_RESULT.CONFLICTED ||
    result === "HUMAN_CATEGORY_WON"
  ) {
    return "CONFLICTED";
  }
  if (
    result === CATEGORY_APPLICATION_RESULT.DISMISSED ||
    result === "DISMISSED_BY_HUMAN" ||
    input.suggestionDismissedAt
  ) {
    return "DISMISSED";
  }
  if (
    input.status === FeedbackAIAnalysisStatus.COMPLETED &&
    Boolean(input.suggestedCategoryId)
  ) {
    return "AVAILABLE";
  }

  return "NONE";
}

export function getUTCStartOfDay(now = new Date()): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function getStaleProcessingCutoff(now: Date, pollIntervalMs: number): Date {
  return new Date(now.getTime() - Math.max(300_000, pollIntervalMs * 3));
}

export function getRetryDelayMs(retryCount: number): number {
  return Math.min(60_000, 2_000 * retryCount);
}

export function canProcessAfterDailyClaim(
  usedAfterClaim: number,
  dailyBusinessLimit: number
): boolean {
  return usedAfterClaim <= dailyBusinessLimit;
}

export function classifyAIProviderError(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (error instanceof SyntaxError) return "AI_INVALID_RESPONSE";
  if (error && typeof error === "object") {
    const candidate = error as { status?: unknown; code?: unknown; message?: unknown };
    if (candidate.status === 429) return "AI_PROVIDER_RATE_LIMITED";
    if (
      candidate.status === 500 ||
      candidate.status === 502 ||
      candidate.status === 503 ||
      candidate.status === 504
    ) {
      return "AI_PROVIDER_UNAVAILABLE";
    }
    if (
      typeof candidate.code === "string" &&
      ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED"].includes(candidate.code)
    ) {
      return "AI_PROVIDER_UNAVAILABLE";
    }
    if (
      typeof candidate.message === "string" &&
      /fetch failed|network|timeout|temporarily unavailable/i.test(candidate.message)
    ) {
      return "AI_PROVIDER_UNAVAILABLE";
    }
  }
  return "AI_INVALID_RESPONSE";
}

export function isRetryableAIErrorCode(code: string): boolean {
  return [
    "AI_PROVIDER_TIMEOUT",
    "AI_PROVIDER_RATE_LIMITED",
    "AI_PROVIDER_UNAVAILABLE",
    "AI_DAILY_LIMIT_REACHED"
  ].includes(code);
}
