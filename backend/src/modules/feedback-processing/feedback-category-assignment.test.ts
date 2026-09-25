import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FeedbackFieldStateField,
  FeedbackFieldStateSource
} from "../../lib/prisma-runtime.js";
import {
  feedbackCategoryAssignmentTestUtils,
  initialFeedbackFieldStates
} from "./feedback-category-assignment.js";

test("new feedback uses the existing Other taxonomy fallback", () => {
  assert.equal(feedbackCategoryAssignmentTestUtils.fallbackCategoryName, "Other");
});

test("automatic fallback and explicit manual category ownership are distinct", () => {
  const automatic = initialFeedbackFieldStates({
    businessId: "business-1",
    feedbackId: "feedback-1",
    categorySource: "DEFAULT"
  });
  const manual = initialFeedbackFieldStates({
    businessId: "business-1",
    feedbackId: "feedback-2",
    categorySource: "HUMAN"
  });

  assert.equal(automatic.length, 4);
  assert.equal(
    automatic.find((item) => item.field === FeedbackFieldStateField.CATEGORY)?.source,
    FeedbackFieldStateSource.DEFAULT
  );
  assert.equal(
    manual.find((item) => item.field === FeedbackFieldStateField.CATEGORY)?.source,
    FeedbackFieldStateSource.HUMAN
  );
});

test("AI automatic assignment replaces only a default Other category", () => {
  const source = readFileSync(
    new URL("../ai-analysis/ai-analysis.service.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /categorySource === FeedbackFieldStateSource\.DEFAULT/);
  assert.match(source, /feedback\?\.category\?\.name === "Other"/);
  assert.match(source, /categorySource !== FeedbackFieldStateSource\.HUMAN/);
  assert.match(source, /categorySource !== FeedbackFieldStateSource\.AUTOMATION/);
  assert.doesNotMatch(source, /if \(!env\.AI_AUTO_APPLY_CATEGORY\) return/);
  assert.match(source, /source: FeedbackFieldStateSource\.AI/);
});

test("manual, public, connector sync, and WhatsApp intake converge on feedback processing", () => {
  const root = new URL("../", import.meta.url);
  for (const relative of [
    "manual-feedback/manual-feedback.service.ts",
    "public-feedback/public-feedback.service.ts",
    "integrations/integration.service.ts",
    "integrations/whatsapp-live-connector.ts"
  ]) {
    const source = readFileSync(new URL(relative, root), "utf8");
    assert.match(source, /feedbackProcessingService\.process/);
  }

  const gmailSource = readFileSync(
    new URL("integrations/gmail-live-connector.ts", root),
    "utf8"
  );
  assert.match(gmailSource, /class GmailLiveConnector/);
  assert.match(gmailSource, /NormalizedFeedbackInput/);
});
