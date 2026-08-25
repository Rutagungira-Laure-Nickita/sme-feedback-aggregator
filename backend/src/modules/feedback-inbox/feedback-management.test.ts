import assert from "node:assert/strict";
import test from "node:test";
import { BusinessMemberRole } from "../../lib/prisma-runtime.js";
import {
  feedbackEditSchema,
  feedbackSelectionSchema
} from "./feedback-management.schemas.js";
import { canManageFeedback, transitionsAreValid } from "./feedback-management.service.js";

test("only owner and admin roles can manage feedback", () => {
  assert.equal(canManageFeedback(BusinessMemberRole.OWNER), true);
  assert.equal(canManageFeedback(BusinessMemberRole.ADMIN), true);
  assert.equal(canManageFeedback(BusinessMemberRole.MANAGER), false);
  assert.equal(canManageFeedback(BusinessMemberRole.STAFF), false);
});

test("the edit schema strips immutable provider and ingestion fields", () => {
  const parsed = feedbackEditSchema.parse({
    title: "Updated title",
    expectedUpdatedAt: "2026-08-21T12:00:00.000Z",
    channel: "EMAIL",
    externalId: "provider-message-id",
    sourceMetadata: { mailbox: "secret" },
    ingestionId: "ingestion-id",
    receivedAt: "2026-08-20T12:00:00.000Z"
  });

  assert.deepEqual(parsed, {
    title: "Updated title",
    expectedUpdatedAt: "2026-08-21T12:00:00.000Z"
  });
});

test("selection rejects an empty request and accepts explicit or all-matching scope", () => {
  assert.equal(feedbackSelectionSchema.safeParse({}).success, false);
  assert.equal(
    feedbackSelectionSchema.safeParse({ feedbackIds: ["feedback-1"] }).success,
    true
  );
  assert.equal(
    feedbackSelectionSchema.safeParse({ allMatching: true, filters: { status: "NEW" } })
      .success,
    true
  );
  assert.equal(
    feedbackSelectionSchema.safeParse({
      allMatching: true,
      excludedFeedbackIds: ["feedback-2"],
      filters: { status: "NEW" }
    }).success,
    true
  );
  assert.equal(
    feedbackSelectionSchema.safeParse({
      feedbackIds: ["feedback-1"],
      excludedFeedbackIds: ["feedback-2"]
    }).success,
    false
  );
});

test("bulk status validation follows the established workflow transition graph", () => {
  assert.equal(transitionsAreValid(["NEW", "IN_REVIEW"], "IN_REVIEW"), true);
  assert.equal(transitionsAreValid(["NEW", "RESOLVED"], "CLOSED"), false);
  assert.equal(transitionsAreValid(["RESOLVED"], "NEW"), false);
});
