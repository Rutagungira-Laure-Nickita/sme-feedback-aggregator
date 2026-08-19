import assert from "node:assert/strict";
import test from "node:test";

import {
  AutomationConditionOperator,
  AutomationConditionType,
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus
} from "../../lib/prisma-runtime.js";

import {
  evaluateCondition,
  matchConditionResults,
  type AutomationFeedbackSnapshot,
  type StoredConditionLike
} from "./automation.policy.js";

const feedback: AutomationFeedbackSnapshot = {
  id: "feedback-1",
  businessId: "business-1",
  branchId: "branch-1",
  channel: FeedbackChannel.MANUAL,
  rating: 4,
  status: FeedbackStatus.IN_REVIEW,
  priority: FeedbackPriority.HIGH,
  categoryId: "category-1",
  assignedToMembershipId: "membership-1",
  customerId: "customer-1",
  updatedAt: new Date("2026-07-27T10:00:00.000Z"),
  aiAnalysis: {
    status: FeedbackAIAnalysisStatus.COMPLETED,
    sentiment: FeedbackAISentiment.POSITIVE,
    sentimentConfidence: 0.88,
    suggestedCategoryId: "category-2",
    categoryConfidence: 0.76,
    suggestionDismissedAt: null,
    categoryAutoAppliedAt: null,
    categoryApplicationResult: "AVAILABLE"
  }
};

test("evaluateCondition matches branch equality", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.BRANCH,
        valueString: "branch-1"
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches channel membership", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.CHANNEL,
        operator: AutomationConditionOperator.IN,
        valueJson: [FeedbackChannel.MANUAL, FeedbackChannel.EMAIL]
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches rating lower bound", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.RATING,
        operator: AutomationConditionOperator.GREATER_THAN_OR_EQUAL,
        valueNumber: 4
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches rating upper bound", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.RATING,
        operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
        valueNumber: 4
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition rejects rating outside threshold", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.RATING,
        operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
        valueNumber: 3
      }),
      feedback
    ).matched,
    false
  );
});

test("evaluateCondition matches status", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.STATUS,
        valueString: FeedbackStatus.IN_REVIEW
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches priority", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.PRIORITY,
        valueString: FeedbackPriority.HIGH
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches category id", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.CATEGORY,
        categoryId: "category-1"
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition supports empty category", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.CATEGORY,
        operator: AutomationConditionOperator.IS_EMPTY
      }),
      { ...feedback, categoryId: null }
    ).matched,
    true
  );
});

test("evaluateCondition supports non-empty category", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.CATEGORY,
        operator: AutomationConditionOperator.IS_NOT_EMPTY
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition detects assignment state", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.ASSIGNMENT_STATE,
        valueString: "ASSIGNED"
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition detects unassignment state", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.ASSIGNMENT_STATE,
        valueString: "UNASSIGNED"
      }),
      { ...feedback, assignedToMembershipId: null }
    ).matched,
    true
  );
});

test("evaluateCondition detects linked customer state", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.CUSTOMER_LINK_STATE,
        valueString: "LINKED"
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition detects unlinked customer state", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.CUSTOMER_LINK_STATE,
        valueString: "UNLINKED"
      }),
      { ...feedback, customerId: null }
    ).matched,
    true
  );
});

test("evaluateCondition matches AI analysis status", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.AI_STATUS,
        valueString: FeedbackAIAnalysisStatus.COMPLETED
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches sentiment", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.SENTIMENT,
        valueString: FeedbackAISentiment.POSITIVE
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches sentiment confidence", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.SENTIMENT_CONFIDENCE,
        operator: AutomationConditionOperator.GREATER_THAN_OR_EQUAL,
        valueNumber: 0.8
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition matches AI suggested category", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.AI_SUGGESTED_CATEGORY,
        categoryId: "category-2"
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition supports missing AI suggestion", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.AI_SUGGESTED_CATEGORY,
        operator: AutomationConditionOperator.IS_EMPTY
      }),
      { ...feedback, aiAnalysis: { ...feedback.aiAnalysis!, suggestedCategoryId: null } }
    ).matched,
    true
  );
});

test("evaluateCondition matches AI category confidence", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.AI_CATEGORY_CONFIDENCE,
        operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
        valueNumber: 0.8
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition derives available AI suggestion state", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.AI_SUGGESTION_STATE,
        valueString: "AVAILABLE"
      }),
      feedback
    ).matched,
    true
  );
});

test("evaluateCondition derives none AI suggestion state without analysis", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.AI_SUGGESTION_STATE,
        valueString: "NONE"
      }),
      { ...feedback, aiAnalysis: null }
    ).matched,
    true
  );
});

test("evaluateCondition treats non-string IN values as ignored", () => {
  assert.equal(
    evaluateCondition(
      condition({
        type: AutomationConditionType.STATUS,
        operator: AutomationConditionOperator.IN,
        valueJson: [FeedbackStatus.CLOSED, 7, null]
      }),
      feedback
    ).matched,
    false
  );
});

test("matchConditionResults requires at least one condition", () => {
  assert.equal(matchConditionResults("ALL", []), false);
  assert.equal(matchConditionResults("ANY", []), false);
});

test("matchConditionResults honors all matched conditions", () => {
  assert.equal(
    matchConditionResults("ALL", [result(true, 0), result(true, 1), result(true, 2)]),
    true
  );
});

test("matchConditionResults stops ALL success when any condition fails", () => {
  assert.equal(matchConditionResults("ALL", [result(true, 0), result(false, 1)]), false);
});

test("matchConditionResults honors any matched condition", () => {
  assert.equal(matchConditionResults("ANY", [result(false, 0), result(true, 1)]), true);
});

test("matchConditionResults rejects ANY when no condition matches", () => {
  assert.equal(matchConditionResults("ANY", [result(false, 0), result(false, 1)]), false);
});

function condition(overrides: Partial<StoredConditionLike>): StoredConditionLike {
  return {
    type: AutomationConditionType.STATUS,
    operator: AutomationConditionOperator.EQUALS,
    position: 0,
    valueString: null,
    valueNumber: null,
    valueJson: null,
    branchId: null,
    categoryId: null,
    ...overrides
  };
}

function result(matched: boolean, position: number) {
  return {
    position,
    type: AutomationConditionType.STATUS,
    operator: AutomationConditionOperator.EQUALS,
    matched,
    actualValue: FeedbackStatus.NEW,
    expectedValue: FeedbackStatus.NEW
  };
}
