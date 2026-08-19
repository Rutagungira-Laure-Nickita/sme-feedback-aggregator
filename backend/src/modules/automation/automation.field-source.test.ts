import assert from "node:assert/strict";
import test from "node:test";

import {
  FeedbackFieldStateField,
  FeedbackFieldStateSource
} from "../../lib/prisma-runtime.js";

import {
  deriveHistoricalFeedbackFieldSource,
  initialFeedbackFieldSource,
  isHumanOwnedFieldSource
} from "./automation.field-source.js";

test("initialFeedbackFieldSource uses SYSTEM only for status", () => {
  assert.equal(
    initialFeedbackFieldSource(FeedbackFieldStateField.STATUS),
    FeedbackFieldStateSource.SYSTEM
  );
});

test("initialFeedbackFieldSource uses DEFAULT for priority", () => {
  assert.equal(
    initialFeedbackFieldSource(FeedbackFieldStateField.PRIORITY),
    FeedbackFieldStateSource.DEFAULT
  );
});

test("initialFeedbackFieldSource uses DEFAULT for category", () => {
  assert.equal(
    initialFeedbackFieldSource(FeedbackFieldStateField.CATEGORY),
    FeedbackFieldStateSource.DEFAULT
  );
});

test("initialFeedbackFieldSource uses DEFAULT for assignment", () => {
  assert.equal(
    initialFeedbackFieldSource(FeedbackFieldStateField.ASSIGNMENT),
    FeedbackFieldStateSource.DEFAULT
  );
});

test("isHumanOwnedFieldSource protects only HUMAN ownership", () => {
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.HUMAN), true);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.DEFAULT), false);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.SYSTEM), false);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.AI), false);
  assert.equal(isHumanOwnedFieldSource(FeedbackFieldStateSource.AUTOMATION), false);
  assert.equal(isHumanOwnedFieldSource(null), false);
});

test("deriveHistoricalFeedbackFieldSource preserves human status activity", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.STATUS, {
      categoryId: null,
      assignedToMembershipId: null,
      hasHumanStatusActivity: true
    }),
    FeedbackFieldStateSource.HUMAN
  );
});

test("deriveHistoricalFeedbackFieldSource defaults status to SYSTEM", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.STATUS, {
      categoryId: null,
      assignedToMembershipId: null
    }),
    FeedbackFieldStateSource.SYSTEM
  );
});

test("deriveHistoricalFeedbackFieldSource preserves human priority activity", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.PRIORITY, {
      categoryId: null,
      assignedToMembershipId: null,
      hasHumanPriorityActivity: true
    }),
    FeedbackFieldStateSource.HUMAN
  );
});

test("deriveHistoricalFeedbackFieldSource defaults priority to DEFAULT", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.PRIORITY, {
      categoryId: null,
      assignedToMembershipId: null
    }),
    FeedbackFieldStateSource.DEFAULT
  );
});

test("deriveHistoricalFeedbackFieldSource prefers AI category proof over current value", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.CATEGORY, {
      categoryId: "category-1",
      assignedToMembershipId: null,
      hasHumanCategoryActivity: true,
      hasAIAutoAppliedCategory: true
    }),
    FeedbackFieldStateSource.AI
  );
});

test("deriveHistoricalFeedbackFieldSource treats current category as conservative HUMAN", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.CATEGORY, {
      categoryId: "category-1",
      assignedToMembershipId: null
    }),
    FeedbackFieldStateSource.HUMAN
  );
});

test("deriveHistoricalFeedbackFieldSource preserves category removal as HUMAN", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.CATEGORY, {
      categoryId: null,
      assignedToMembershipId: null,
      hasHumanCategoryActivity: true
    }),
    FeedbackFieldStateSource.HUMAN
  );
});

test("deriveHistoricalFeedbackFieldSource defaults empty category to DEFAULT", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.CATEGORY, {
      categoryId: null,
      assignedToMembershipId: null
    }),
    FeedbackFieldStateSource.DEFAULT
  );
});

test("deriveHistoricalFeedbackFieldSource treats current assignment as HUMAN", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.ASSIGNMENT, {
      categoryId: null,
      assignedToMembershipId: "member-1"
    }),
    FeedbackFieldStateSource.HUMAN
  );
});

test("deriveHistoricalFeedbackFieldSource preserves deliberate unassignment as HUMAN", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.ASSIGNMENT, {
      categoryId: null,
      assignedToMembershipId: null,
      hasHumanAssignmentActivity: true
    }),
    FeedbackFieldStateSource.HUMAN
  );
});

test("deriveHistoricalFeedbackFieldSource defaults empty assignment to DEFAULT", () => {
  assert.equal(
    deriveHistoricalFeedbackFieldSource(FeedbackFieldStateField.ASSIGNMENT, {
      categoryId: null,
      assignedToMembershipId: null
    }),
    FeedbackFieldStateSource.DEFAULT
  );
});
