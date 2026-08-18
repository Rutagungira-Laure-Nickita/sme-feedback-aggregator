import assert from "node:assert/strict";
import test from "node:test";

import type { FeedbackChannel } from "@prisma/client";

import {
  parseProviderResult,
  prepareAIInput,
  providerResultSchema
} from "./ai-analysis.validation.js";

const baseProviderResult = {
  sentiment: "NEGATIVE",
  sentimentConfidence: 0.92,
  sentimentExplanation: "Customer reports a late delivery and unresolved follow-up.",
  summary: "Delivery was late and the customer still needs support.",
  detectedLanguage: "en",
  suggestedCategoryId: null,
  categoryConfidence: null
};

const manualChannel = "MANUAL" as FeedbackChannel;

test("providerResultSchema accepts strict structured AI output", () => {
  const parsed = providerResultSchema.parse(baseProviderResult);

  assert.equal(parsed.sentiment, "NEGATIVE");
  assert.equal(parsed.summary, baseProviderResult.summary);
});

test("providerResultSchema accepts approved sentiment and confidence boundaries", () => {
  for (const sentiment of ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"] as const) {
    const parsed = providerResultSchema.parse({
      ...baseProviderResult,
      sentiment,
      sentimentConfidence: sentiment === "POSITIVE" ? 0 : 1
    });
    assert.equal(parsed.sentiment, sentiment);
  }
});

test("providerResultSchema rejects malformed provider shapes", () => {
  assert.throws(() =>
    providerResultSchema.parse({ ...baseProviderResult, unexpected: true })
  );
  assert.throws(() =>
    providerResultSchema.parse({ ...baseProviderResult, sentiment: "ANGRY" })
  );
  assert.throws(() =>
    providerResultSchema.parse({ ...baseProviderResult, sentimentConfidence: 1.01 })
  );
  assert.throws(() => parseProviderResult("not json"));
});

test("providerResultSchema rejects unsafe or over-shared summaries", () => {
  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      summary: "<script>alert('x')</script>"
    })
  );

  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      summary: "Customer asks for follow-up at person@example.com."
    })
  );

  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      summary: "+1 555 123 4567"
    })
  );

  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      detectedLanguage: "<b>en</b>"
    })
  );
});

test("providerResultSchema requires category confidence with category suggestion", () => {
  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      suggestedCategoryId: "category-1",
      categoryConfidence: null
    })
  );

  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      suggestedCategoryId: null,
      categoryConfidence: 0.7
    })
  );
});

test("providerResultSchema enforces concise output fields", () => {
  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      summary: "x".repeat(241)
    })
  );

  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      sentimentExplanation: "x".repeat(241)
    })
  );

  assert.throws(() =>
    providerResultSchema.parse({
      ...baseProviderResult,
      detectedLanguage: "x".repeat(41)
    })
  );
});

test("prepareAIInput fingerprints and truncates normalized feedback text", () => {
  const longMessage = "Delayed package. ".repeat(600);
  const prepared = prepareAIInput({
    channel: manualChannel,
    title: "Delivery issue",
    message: longMessage,
    rating: 2,
    languageCode: "en",
    categories: [{ id: "category-1", name: "Delivery" }]
  });

  assert.ok(prepared);
  assert.equal(prepared.inputTruncated, true);
  assert.equal(prepared.providerInput.title, "Delivery issue");
  assert.equal(prepared.providerInput.categories[0]?.name, "Delivery");
  assert.equal(prepared.inputFingerprint.length, 64);
  assert.ok(prepared.analyzedCharCount <= 8000);
});

test("prepareAIInput skips empty feedback bodies", () => {
  const prepared = prepareAIInput({
    channel: manualChannel,
    title: "",
    message: "   ",
    rating: null,
    languageCode: null,
    categories: []
  });

  assert.equal(prepared, null);
});

test("prepareAIInput keeps exact-limit input untruncated", () => {
  const prepared = prepareAIInput({
    channel: manualChannel,
    title: "",
    message: "a".repeat(8000),
    rating: 5,
    languageCode: "en",
    categories: []
  });

  assert.ok(prepared);
  assert.equal(prepared.inputTruncated, false);
  assert.equal(prepared.analyzedCharCount, 8000);
  assert.equal(prepared.providerInput.message.length, 8000);
});

test("prepareAIInput truncates deterministically and changes fingerprints", () => {
  const first = prepareAIInput({
    channel: manualChannel,
    title: "Issue",
    message: "late ".repeat(2000),
    rating: 1,
    languageCode: "en",
    categories: []
  });
  const second = prepareAIInput({
    channel: manualChannel,
    title: "Issue",
    message: "late ".repeat(2000),
    rating: 1,
    languageCode: "en",
    categories: []
  });
  const different = prepareAIInput({
    channel: manualChannel,
    title: "Different issue",
    message: "late ".repeat(2000),
    rating: 1,
    languageCode: "en",
    categories: []
  });

  assert.ok(first);
  assert.ok(second);
  assert.ok(different);
  assert.equal(first.inputFingerprint, second.inputFingerprint);
  assert.notEqual(first.inputFingerprint, different.inputFingerprint);
});

test("prepareAIInput does not split surrogate-pair characters when truncating", () => {
  const prepared = prepareAIInput({
    channel: manualChannel,
    title: "",
    message: "🙂".repeat(8001),
    rating: null,
    languageCode: null,
    categories: []
  });

  assert.ok(prepared);
  assert.equal(prepared.inputTruncated, true);
  assert.equal(Array.from(prepared.providerInput.message).length, 8000);
  assert.equal(
    Array.from(prepared.providerInput.message).every((char) => char === "🙂"),
    true
  );
});
