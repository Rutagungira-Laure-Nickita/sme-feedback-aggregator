import assert from "node:assert/strict";
import test from "node:test";

import { FeedbackAIAnalysisStatus } from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import {
  canProcessAfterDailyClaim,
  classifyAIProviderError,
  deriveCategorySuggestionState,
  getRetryDelayMs,
  getStaleProcessingCutoff,
  getUTCStartOfDay,
  isRetryableAIErrorCode,
  resolveAIOperationalState
} from "./ai-analysis.policy.js";

test("resolveAIOperationalState distinguishes disabled, unconfigured, and ready", () => {
  assert.equal(
    resolveAIOperationalState({
      enabled: false,
      provider: "gemini",
      geminiApiKey: null
    }),
    "DISABLED"
  );
  assert.equal(
    resolveAIOperationalState({
      enabled: true,
      provider: "gemini",
      geminiApiKey: null
    }),
    "NOT_CONFIGURED"
  );
  assert.equal(
    resolveAIOperationalState({
      enabled: true,
      provider: "gemini",
      geminiApiKey: "key"
    }),
    "READY"
  );
});

test("deriveCategorySuggestionState maps all review lifecycle states", () => {
  const base = {
    status: FeedbackAIAnalysisStatus.COMPLETED,
    suggestedCategoryId: "category-1",
    suggestionDismissedAt: null,
    categoryAutoAppliedAt: null,
    categoryApplicationResult: null
  };

  assert.equal(deriveCategorySuggestionState(base), "AVAILABLE");
  assert.equal(
    deriveCategorySuggestionState({
      ...base,
      categoryApplicationResult: "MANUALLY_APPLIED"
    }),
    "MANUALLY_APPLIED"
  );
  assert.equal(
    deriveCategorySuggestionState({
      ...base,
      categoryApplicationResult: "AUTO_APPLIED"
    }),
    "AUTO_APPLIED"
  );
  assert.equal(
    deriveCategorySuggestionState({
      ...base,
      categoryApplicationResult: "DISMISSED"
    }),
    "DISMISSED"
  );
  assert.equal(
    deriveCategorySuggestionState({
      ...base,
      categoryApplicationResult: "CONFLICTED"
    }),
    "CONFLICTED"
  );
  assert.equal(
    deriveCategorySuggestionState({
      ...base,
      suggestedCategoryId: null
    }),
    "NONE"
  );
});

test("deriveCategorySuggestionState preserves legacy stored lifecycle strings", () => {
  const base = {
    status: FeedbackAIAnalysisStatus.COMPLETED,
    suggestedCategoryId: "category-1",
    suggestionDismissedAt: null,
    categoryAutoAppliedAt: null,
    categoryApplicationResult: null
  };

  assert.equal(
    deriveCategorySuggestionState({
      ...base,
      categoryApplicationResult: "DISMISSED_BY_HUMAN"
    }),
    "DISMISSED"
  );
  assert.equal(
    deriveCategorySuggestionState({
      ...base,
      categoryApplicationResult: "HUMAN_CATEGORY_WON"
    }),
    "CONFLICTED"
  );
});

test("daily-limit and stale-processing helpers use deterministic boundaries", () => {
  const now = new Date("2026-07-27T13:14:15.000Z");

  assert.equal(getUTCStartOfDay(now).toISOString(), "2026-07-27T00:00:00.000Z");
  assert.equal(
    getStaleProcessingCutoff(now, 5_000).toISOString(),
    "2026-07-27T13:09:15.000Z"
  );
  assert.equal(canProcessAfterDailyClaim(100, 100), true);
  assert.equal(canProcessAfterDailyClaim(101, 100), false);
});

test("retry helpers classify transient and invalid provider failures", () => {
  assert.equal(getRetryDelayMs(1), 2_000);
  assert.equal(getRetryDelayMs(100), 60_000);
  assert.equal(isRetryableAIErrorCode("AI_PROVIDER_UNAVAILABLE"), true);
  assert.equal(isRetryableAIErrorCode("AI_INVALID_RESPONSE"), false);
  assert.equal(
    classifyAIProviderError(new AppError("Timeout", "AI_PROVIDER_TIMEOUT", 504)),
    "AI_PROVIDER_TIMEOUT"
  );
  assert.equal(
    classifyAIProviderError(new SyntaxError("bad json")),
    "AI_INVALID_RESPONSE"
  );
  assert.equal(classifyAIProviderError({ status: 429 }), "AI_PROVIDER_RATE_LIMITED");
  assert.equal(classifyAIProviderError({ status: 502 }), "AI_PROVIDER_UNAVAILABLE");
  assert.equal(
    classifyAIProviderError({ code: "ECONNRESET" }),
    "AI_PROVIDER_UNAVAILABLE"
  );
});
