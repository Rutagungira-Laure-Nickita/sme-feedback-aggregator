import assert from "node:assert/strict";
import test from "node:test";

import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationConditionType,
  AutomationRuleBranchScope,
  AutomationRuleTrigger,
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus
} from "../../lib/prisma-runtime.js";

import type { RuleDefinitionInput } from "./automation.schemas.js";
import {
  createAutomationFingerprint,
  evaluateCondition,
  isFeedbackCondition,
  matchConditionResults,
  normalizeRuleDefinitionInput,
  validateRuleDefinitionShape,
  type AutomationFeedbackSnapshot,
  type StoredConditionLike
} from "./automation.policy.js";

const baseDefinition: RuleDefinitionInput = {
  name: "Escalate low ratings",
  description: null,
  trigger: AutomationRuleTrigger.FEEDBACK_CREATED,
  branchScope: AutomationRuleBranchScope.ALL_BRANCHES,
  branchIds: [],
  matchMode: "ALL",
  stopProcessingAfterMatch: false,
  conditions: [
    {
      type: AutomationConditionType.RATING,
      operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
      valueNumber: 2
    }
  ],
  actions: [
    {
      type: AutomationActionType.SET_PRIORITY,
      priority: FeedbackPriority.URGENT
    }
  ]
};

const baseFeedback: AutomationFeedbackSnapshot = {
  id: "feedback-1",
  businessId: "business-1",
  branchId: "branch-1",
  channel: FeedbackChannel.MANUAL,
  rating: 2,
  status: FeedbackStatus.NEW,
  priority: FeedbackPriority.NORMAL,
  categoryId: null,
  assignedToMembershipId: null,
  customerId: null,
  updatedAt: new Date("2026-07-27T09:00:00.000Z"),
  aiAnalysis: null
};

test("validateRuleDefinitionShape accepts executable feedback-created rules", () => {
  const result = validateRuleDefinitionShape(baseDefinition, {
    requireExecutable: true
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("validateRuleDefinitionShape rejects AI conditions on feedback-created trigger", () => {
  const result = validateRuleDefinitionShape(
    {
      ...baseDefinition,
      conditions: [
        {
          type: AutomationConditionType.SENTIMENT,
          operator: AutomationConditionOperator.EQUALS,
          value: FeedbackAISentiment.NEGATIVE
        }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(result.valid, false);
  assert.equal(result.issues[0]?.path, "conditions.0.type");
});

test("validateRuleDefinitionShape rejects selected-branch rules without branches", () => {
  const result = validateRuleDefinitionShape(
    {
      ...baseDefinition,
      branchScope: AutomationRuleBranchScope.SELECTED_BRANCHES
    },
    { requireExecutable: true }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.issues.some((issue) => issue.path === "branchIds"),
    true
  );
});

test("validateRuleDefinitionShape rejects duplicate and conflicting actions", () => {
  const result = validateRuleDefinitionShape(
    {
      ...baseDefinition,
      actions: [
        { type: AutomationActionType.SET_PRIORITY, priority: FeedbackPriority.HIGH },
        { type: AutomationActionType.SET_PRIORITY, priority: FeedbackPriority.URGENT },
        { type: AutomationActionType.UNASSIGN },
        { type: AutomationActionType.ASSIGN_TO_MEMBERSHIP, membershipId: "member-1" }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.issues.some((issue) => issue.message.includes("Only one SET_PRIORITY")),
    true
  );
  assert.equal(
    result.issues.some((issue) => issue.message.includes("assignment-changing")),
    true
  );
});

test("validateRuleDefinitionShape validates operator and value requirements", () => {
  const result = validateRuleDefinitionShape(
    {
      ...baseDefinition,
      conditions: [
        {
          type: AutomationConditionType.RATING,
          operator: AutomationConditionOperator.IN,
          values: []
        },
        {
          type: AutomationConditionType.STATUS,
          operator: AutomationConditionOperator.GREATER_THAN_OR_EQUAL,
          valueNumber: 2
        }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.issues.some((issue) => issue.path === "conditions.0.values"),
    true
  );
  assert.equal(
    result.issues.some((issue) => issue.path === "conditions.1.operator"),
    true
  );
});

test("evaluateCondition supports feedback and AI values", () => {
  const feedbackWithAI: AutomationFeedbackSnapshot = {
    ...baseFeedback,
    aiAnalysis: {
      status: FeedbackAIAnalysisStatus.COMPLETED,
      sentiment: FeedbackAISentiment.NEGATIVE,
      sentimentConfidence: 0.91,
      suggestedCategoryId: "category-1",
      categoryConfidence: 0.82,
      suggestionDismissedAt: null,
      categoryAutoAppliedAt: null,
      categoryApplicationResult: null
    }
  };

  const rating = evaluateCondition(
    condition({
      type: AutomationConditionType.RATING,
      operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
      valueNumber: 2
    }),
    feedbackWithAI
  );
  const sentiment = evaluateCondition(
    condition({
      type: AutomationConditionType.SENTIMENT,
      operator: AutomationConditionOperator.EQUALS,
      valueString: FeedbackAISentiment.NEGATIVE
    }),
    feedbackWithAI
  );
  const confidence = evaluateCondition(
    condition({
      type: AutomationConditionType.SENTIMENT_CONFIDENCE,
      operator: AutomationConditionOperator.GREATER_THAN_OR_EQUAL,
      valueNumber: 0.9
    }),
    feedbackWithAI
  );

  assert.equal(rating.matched, true);
  assert.equal(sentiment.matched, true);
  assert.equal(confidence.matched, true);
});

test("matchConditionResults honors ALL, ANY, and empty conditions", () => {
  const results = [
    {
      position: 0,
      type: AutomationConditionType.RATING,
      operator: AutomationConditionOperator.EQUALS,
      matched: true,
      actualValue: 2,
      expectedValue: 2
    },
    {
      position: 1,
      type: AutomationConditionType.STATUS,
      operator: AutomationConditionOperator.EQUALS,
      matched: false,
      actualValue: FeedbackStatus.NEW,
      expectedValue: FeedbackStatus.CLOSED
    }
  ];

  assert.equal(matchConditionResults("ALL", results), false);
  assert.equal(matchConditionResults("ANY", results), true);
  assert.equal(matchConditionResults("ALL", []), false);
});

test("createAutomationFingerprint is deterministic for reordered object keys", () => {
  const first = createAutomationFingerprint({
    trigger: "FEEDBACK_CREATED",
    feedbackId: "feedback-1",
    payload: { b: 2, a: 1 }
  });
  const second = createAutomationFingerprint({
    payload: { a: 1, b: 2 },
    feedbackId: "feedback-1",
    trigger: "FEEDBACK_CREATED"
  });

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("isFeedbackCondition separates feedback-only and AI conditions", () => {
  assert.equal(isFeedbackCondition(AutomationConditionType.STATUS), true);
  assert.equal(isFeedbackCondition(AutomationConditionType.AI_STATUS), false);
});

test("normalizeRuleDefinitionInput clears stale action target fields before persistence", () => {
  const normalized = normalizeRuleDefinitionInput({
    ...baseDefinition,
    actions: [
      {
        type: AutomationActionType.SET_PRIORITY,
        priority: FeedbackPriority.HIGH,
        categoryId: "",
        membershipId: "member-1",
        status: FeedbackStatus.CLOSED
      },
      {
        type: AutomationActionType.SET_STATUS,
        status: FeedbackStatus.IN_REVIEW,
        categoryId: "category-1",
        membershipId: "member-1",
        priority: FeedbackPriority.URGENT
      }
    ]
  });

  assert.deepEqual(normalized.actions, [
    {
      type: AutomationActionType.SET_PRIORITY,
      priority: FeedbackPriority.HIGH,
      categoryId: null,
      membershipId: null,
      status: null
    },
    {
      type: AutomationActionType.SET_STATUS,
      priority: null,
      categoryId: null,
      membershipId: null,
      status: FeedbackStatus.IN_REVIEW
    }
  ]);
});

test("normalizeRuleDefinitionInput converts blank selected ids to null", () => {
  const normalized = normalizeRuleDefinitionInput({
    ...baseDefinition,
    branchScope: AutomationRuleBranchScope.SELECTED_BRANCHES,
    branchIds: [" branch-1 ", "", "branch-1"],
    conditions: [
      {
        type: AutomationConditionType.CATEGORY,
        operator: AutomationConditionOperator.EQUALS,
        value: "",
        categoryId: ""
      }
    ],
    actions: [{ type: AutomationActionType.SET_CATEGORY, categoryId: "" }]
  });

  assert.deepEqual(normalized.branchIds, ["branch-1"]);
  assert.equal(normalized.conditions[0]?.categoryId, null);
  assert.equal(normalized.actions[0]?.categoryId, null);
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
