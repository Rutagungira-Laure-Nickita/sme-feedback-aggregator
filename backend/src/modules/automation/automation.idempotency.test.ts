import assert from "node:assert/strict";
import test from "node:test";

import { FeedbackFieldStateSource } from "@prisma/client";

import { AUTOMATION_ERRORS, safeAutomationErrorMessage } from "./automation.errors.js";
import {
  createAutomationFingerprint,
  MAX_ACTIVE_RULES_PER_BUSINESS,
  MAX_EVENT_CHAIN_DEPTH,
  MAX_NON_ARCHIVED_RULES_PER_BUSINESS
} from "./automation.policy.js";
import { isHumanOwnedFieldSource } from "./automation.field-source.js";

test("createAutomationFingerprint returns stable sha256 fingerprints", () => {
  const fingerprint = createAutomationFingerprint({
    businessId: "business-1",
    feedbackId: "feedback-1",
    trigger: "FEEDBACK_CREATED"
  });

  assert.equal(fingerprint.length, 64);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
});

test("createAutomationFingerprint is insensitive to object key order", () => {
  assert.equal(
    createAutomationFingerprint({ b: 2, a: 1, nested: { d: 4, c: 3 } }),
    createAutomationFingerprint({ nested: { c: 3, d: 4 }, a: 1, b: 2 })
  );
});

test("createAutomationFingerprint remains array-order sensitive", () => {
  assert.notEqual(
    createAutomationFingerprint({ actions: ["a", "b"] }),
    createAutomationFingerprint({ actions: ["b", "a"] })
  );
});

test("createAutomationFingerprint changes when trigger changes", () => {
  assert.notEqual(
    createAutomationFingerprint({
      feedbackId: "feedback-1",
      trigger: "FEEDBACK_CREATED"
    }),
    createAutomationFingerprint({
      feedbackId: "feedback-1",
      trigger: "AI_ANALYSIS_COMPLETED"
    })
  );
});

test("createAutomationFingerprint supports manual preview salt", () => {
  assert.notEqual(
    createAutomationFingerprint({ feedbackId: "feedback-1", executionSalt: "manual-a" }),
    createAutomationFingerprint({ feedbackId: "feedback-1", executionSalt: "manual-b" })
  );
});

test("loop-prevention limit is conservative", () => {
  assert.equal(MAX_EVENT_CHAIN_DEPTH, 3);
});

test("rule limits keep active and non-archived rule counts bounded", () => {
  assert.equal(MAX_ACTIVE_RULES_PER_BUSINESS, 50);
  assert.equal(MAX_NON_ARCHIVED_RULES_PER_BUSINESS, 200);
});

test("safeAutomationErrorMessage hides internal execution detail", () => {
  assert.equal(
    safeAutomationErrorMessage("DATABASE_HOST_REFUSED"),
    "Automation could not complete safely."
  );
});

test("safeAutomationErrorMessage reports human override safely", () => {
  assert.equal(
    safeAutomationErrorMessage(AUTOMATION_ERRORS.HUMAN_OVERRIDE),
    "A human-owned value was protected."
  );
});

test("safeAutomationErrorMessage reports idempotency safely", () => {
  assert.equal(
    safeAutomationErrorMessage(AUTOMATION_ERRORS.ALREADY_EXECUTED),
    "This automation already ran for the current feedback state."
  );
});

test("preview/action protection recognizes HUMAN as the only skip source", () => {
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.HUMAN), true);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.AI), false);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.AUTOMATION), false);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.DEFAULT), false);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.SYSTEM), false);
});
