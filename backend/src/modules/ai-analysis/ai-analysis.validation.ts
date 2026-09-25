import { createHash } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { AIProviderInput, AIProviderResult } from "./ai-analysis.types.js";

const APPROVED_SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"] as const;

export const providerResultSchema = z
  .object({
    sentiment: z.enum(APPROVED_SENTIMENTS),
    sentimentConfidence: z.number().min(0).max(1),
    sentimentExplanation: z.string().trim().max(240).nullable().optional(),
    summary: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .refine((value) => !containsHtmlLikeOutput(value), "Summary must be plain text.")
      .refine(
        (value) => !containsContactLikeOutput(value),
        "Summary must omit contact data."
      ),
    detectedLanguage: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .refine((value) => !containsHtmlLikeOutput(value), "Language must be plain text."),
    suggestedCategoryId: z.string().trim().min(1).nullable(),
    categoryConfidence: z.number().min(0).max(1).nullable()
  })
  .strict()
  .refine(
    (value) =>
      value.suggestedCategoryId === null
        ? value.categoryConfidence === null
        : value.categoryConfidence !== null,
    {
      message: "Category confidence must be present only when a category is suggested.",
      path: ["categoryConfidence"]
    }
  );

export type PreparedAIInput = {
  providerInput: AIProviderInput;
  inputFingerprint: string;
  inputTruncated: boolean;
  analyzedCharCount: number;
};

export function parseProviderResult(value: unknown): AIProviderResult {
  const parsed = providerResultSchema.parse(value);
  return {
    sentiment: parsed.sentiment,
    sentimentConfidence: parsed.sentimentConfidence,
    sentimentExplanation: parsed.sentimentExplanation ?? null,
    summary: parsed.summary,
    detectedLanguage: parsed.detectedLanguage,
    suggestedCategoryId: parsed.suggestedCategoryId,
    categoryConfidence: parsed.categoryConfidence
  };
}

export function prepareAIInput(input: AIProviderInput): PreparedAIInput | null {
  const title = normalizeText(input.title);
  const message = normalizeText(input.message);
  const combined = [title, message].filter(Boolean).join("\n\n");

  if (!combined || codePointLength(combined) < 3) {
    return null;
  }

  const maxChars = env.AI_MAX_INPUT_CHARS;
  const { preparedTitle, preparedMessage, truncated } = truncateTitleAndMessage(
    title,
    message,
    maxChars
  );
  const analyzedCharCount = codePointLength(
    [preparedTitle, preparedMessage].filter(Boolean).join("\n\n")
  );
  const providerInput: AIProviderInput = {
    ...input,
    title: preparedTitle || null,
    message: preparedMessage,
    categories: input.categories.map((category) => ({
      id: category.id,
      name: category.name
    }))
  };
  const inputFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        promptVersion: "phase13-v1",
        schemaVersion: "phase13-v1",
        title: providerInput.title,
        message: providerInput.message,
        rating: providerInput.rating,
        channel: providerInput.channel,
        languageCode: providerInput.languageCode,
        categories: providerInput.categories,
        truncated
      })
    )
    .digest("hex");

  return {
    providerInput,
    inputFingerprint,
    inputTruncated: truncated,
    analyzedCharCount
  };
}

export function confidenceLevel(
  confidence: number | null
): "HIGH" | "REVIEW" | "LOW" | null {
  if (confidence === null || confidence === undefined) return null;
  if (confidence >= 0.8) return "HIGH";
  if (confidence >= 0.5) return "REVIEW";
  return "LOW";
}

export function safeErrorMessage(code: string): string {
  switch (code) {
    case "AI_NO_ANALYZABLE_TEXT":
      return "No analyzable feedback text was available.";
    case "AI_PROVIDER_NOT_CONFIGURED":
      return "AI provider is not configured.";
    case "AI_PROVIDER_AUTH_FAILED":
      return "AI provider credentials or permissions were rejected.";
    case "AI_PROVIDER_MODEL_UNAVAILABLE":
      return "The configured AI model is unavailable.";
    case "AI_PROVIDER_REQUEST_REJECTED":
      return "AI provider rejected the request configuration.";
    case "AI_PERSISTENCE_FAILED":
      return "AI analysis could not be saved. Retry later.";
    case "AI_PROVIDER_RATE_LIMITED":
      return "AI provider rate limit reached. Retry later.";
    case "AI_PROVIDER_UNAVAILABLE":
      return "AI provider is temporarily unavailable.";
    case "AI_INVALID_RESPONSE":
      return "AI output was rejected safely.";
    case "AI_DAILY_LIMIT_REACHED":
      return "Daily business AI limit reached.";
    default:
      return "AI analysis could not be completed safely.";
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncateTitleAndMessage(
  title: string,
  message: string,
  maxChars: number
): {
  preparedTitle: string;
  preparedMessage: string;
  truncated: boolean;
} {
  const separatorLength = title && message ? 2 : 0;
  if (codePointLength(title) + codePointLength(message) + separatorLength <= maxChars) {
    return { preparedTitle: title, preparedMessage: message, truncated: false };
  }

  const titleAllowance = Math.min(codePointLength(title), maxChars);
  const preparedTitle = sliceByCodePoints(title, titleAllowance);
  const remaining = Math.max(
    0,
    maxChars - codePointLength(preparedTitle) - (preparedTitle ? 2 : 0)
  );
  const preparedMessage = sliceByCodePoints(message, remaining);

  return {
    preparedTitle,
    preparedMessage,
    truncated: true
  };
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function sliceByCodePoints(value: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  return Array.from(value).slice(0, maxChars).join("");
}

function containsHtmlLikeOutput(value: string): boolean {
  return /<\s*\/?\s*[a-z][^>]*>/i.test(value);
}

function containsContactLikeOutput(value: string): boolean {
  return (
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value) || /\+?\d[\d\s().-]{7,}\d/.test(value)
  );
}
