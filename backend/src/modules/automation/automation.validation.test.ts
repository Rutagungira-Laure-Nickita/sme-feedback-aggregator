import assert from "node:assert/strict";
import test from "node:test";

import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationConditionType,
  AutomationRuleBranchScope,
  AutomationRuleTrigger,
  FeedbackPriority,
  FeedbackStatus
} from "../../lib/prisma-runtime.js";

import type { RuleDefinitionInput } from "./automation.schemas.js";
import {
  executionListQuerySchema,
  previewRunSchema,
  reorderRulesSchema,
  ruleDefinitionSchema,
  ruleListQuerySchema
} from "./automation.schemas.js";
import { validateRuleDefinitionShape } from "./automation.policy.js";

const executableDefinition: RuleDefinitionInput = {
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

test("ruleDefinitionSchema trims names and descriptions", () => {
  const parsed = ruleDefinitionSchema.parse({
    ...executableDefinition,
    name: "  Escalate  ",
    description: "  Priority handling  "
  });

  assert.equal(parsed.name, "Escalate");
  assert.equal(parsed.description, "Priority handling");
});

test("ruleDefinitionSchema rejects empty names", () => {
  assert.equal(
    ruleDefinitionSchema.safeParse({ ...executableDefinition, name: " " }).success,
    false
  );
});

test("ruleDefinitionSchema rejects long names", () => {
  assert.equal(
    ruleDefinitionSchema.safeParse({
      ...executableDefinition,
      name: "a".repeat(121)
    }).success,
    false
  );
});

test("ruleDefinitionSchema rejects null bytes", () => {
  assert.equal(
    ruleDefinitionSchema.safeParse({ ...executableDefinition, name: "bad\0name" })
      .success,
    false
  );
});

test("ruleDefinitionSchema limits conditions and actions", () => {
  assert.equal(
    ruleDefinitionSchema.safeParse({
      ...executableDefinition,
      conditions: Array.from({ length: 11 }, () => executableDefinition.conditions[0]),
      actions: Array.from({ length: 6 }, () => executableDefinition.actions[0])
    }).success,
    false
  );
});

test("ruleListQuerySchema coerces pagination and includeArchived", () => {
  const parsed = ruleListQuerySchema.parse({
    page: "2",
    pageSize: "50",
    includeArchived: "true"
  });

  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 50);
  assert.equal(parsed.includeArchived, true);
});

test("ruleListQuerySchema rejects excessive page size", () => {
  assert.equal(ruleListQuerySchema.safeParse({ pageSize: "101" }).success, false);
});

test("executionListQuerySchema accepts ISO date filters", () => {
  const parsed = executionListQuerySchema.parse({
    dateFrom: "2026-07-27T00:00:00.000Z",
    dateTo: "2026-07-28T00:00:00.000Z",
    ruleId: "rule-1"
  });

  assert.equal(parsed.ruleId, "rule-1");
});

test("executionListQuerySchema rejects invalid dates", () => {
  assert.equal(executionListQuerySchema.safeParse({ dateFrom: "today" }).success, false);
});

test("previewRunSchema requires feedback id", () => {
  assert.equal(previewRunSchema.safeParse({ feedbackId: "" }).success, false);
  assert.equal(previewRunSchema.safeParse({ feedbackId: "feedback-1" }).success, true);
});

test("previewRunSchema limits request keys", () => {
  assert.equal(
    previewRunSchema.safeParse({
      feedbackId: "feedback-1",
      requestKey: "x".repeat(121)
    }).success,
    false
  );
});

test("reorderRulesSchema requires at least one rule", () => {
  assert.equal(reorderRulesSchema.safeParse({ ruleIds: [] }).success, false);
});

test("reorderRulesSchema caps bulk reorder size", () => {
  assert.equal(
    reorderRulesSchema.safeParse({
      ruleIds: Array.from({ length: 201 }, (_, index) => `rule-${index}`)
    }).success,
    false
  );
});

test("validateRuleDefinitionShape allows draft definitions without executable parts", () => {
  const result = validateRuleDefinitionShape(
    { ...executableDefinition, conditions: [], actions: [] },
    { requireExecutable: false }
  );

  assert.equal(result.valid, true);
});

test("validateRuleDefinitionShape requires executable conditions", () => {
  const result = validateRuleDefinitionShape(
    { ...executableDefinition, conditions: [] },
    { requireExecutable: true }
  );

  assert.equal(
    result.issues.some((issue) => issue.path === "conditions"),
    true
  );
});

test("validateRuleDefinitionShape requires executable actions", () => {
  const result = validateRuleDefinitionShape(
    { ...executableDefinition, actions: [] },
    { requireExecutable: true }
  );

  assert.equal(
    result.issues.some((issue) => issue.path === "actions"),
    true
  );
});

test("validateRuleDefinitionShape validates numeric rating range", () => {
  const result = validateRuleDefinitionShape(
    {
      ...executableDefinition,
      conditions: [
        {
          type: AutomationConditionType.RATING,
          operator: AutomationConditionOperator.GREATER_THAN_OR_EQUAL,
          valueNumber: 6
        }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(
    result.issues.some((issue) => issue.path === "conditions.0.valueNumber"),
    true
  );
});

test("validateRuleDefinitionShape validates confidence range", () => {
  const result = validateRuleDefinitionShape(
    {
      ...executableDefinition,
      trigger: AutomationRuleTrigger.AI_ANALYSIS_COMPLETED,
      conditions: [
        {
          type: AutomationConditionType.SENTIMENT_CONFIDENCE,
          operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
          valueNumber: 1.1
        }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(
    result.issues.some((issue) => issue.path === "conditions.0.valueNumber"),
    true
  );
});

test("validateRuleDefinitionShape validates assignment state values", () => {
  const result = validateRuleDefinitionShape(
    {
      ...executableDefinition,
      conditions: [
        {
          type: AutomationConditionType.ASSIGNMENT_STATE,
          operator: AutomationConditionOperator.EQUALS,
          value: "MAYBE"
        }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(
    result.issues.some((issue) => issue.path === "conditions.0.value"),
    true
  );
});

test("validateRuleDefinitionShape validates customer link state values", () => {
  const result = validateRuleDefinitionShape(
    {
      ...executableDefinition,
      conditions: [
        {
          type: AutomationConditionType.CUSTOMER_LINK_STATE,
          operator: AutomationConditionOperator.EQUALS,
          value: "UNKNOWN"
        }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(
    result.issues.some((issue) => issue.path === "conditions.0.value"),
    true
  );
});

test("validateRuleDefinitionShape requires action target values", () => {
  const result = validateRuleDefinitionShape(
    {
      ...executableDefinition,
      actions: [
        { type: AutomationActionType.SET_PRIORITY },
        { type: AutomationActionType.SET_CATEGORY },
        { type: AutomationActionType.ASSIGN_TO_MEMBERSHIP },
        { type: AutomationActionType.SET_STATUS }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(
    result.issues.some((issue) => issue.path === "actions.0.priority"),
    true
  );
  assert.equal(
    result.issues.some((issue) => issue.path === "actions.1.categoryId"),
    true
  );
  assert.equal(
    result.issues.some((issue) => issue.path === "actions.2.membershipId"),
    true
  );
  assert.equal(
    result.issues.some((issue) => issue.path === "actions.3.status"),
    true
  );
});

test("validateRuleDefinitionShape accepts a status action target", () => {
  const result = validateRuleDefinitionShape(
    {
      ...executableDefinition,
      actions: [
        { type: AutomationActionType.SET_STATUS, status: FeedbackStatus.IN_REVIEW }
      ]
    },
    { requireExecutable: true }
  );

  assert.equal(result.valid, true);
});
