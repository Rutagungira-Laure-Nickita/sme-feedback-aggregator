import type {
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus
} from "@prisma/client";
import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationConditionType,
  AutomationRuleTrigger
} from "../../lib/prisma-runtime.js";
import { createHash } from "node:crypto";
import { deriveCategorySuggestionState } from "../ai-analysis/ai-analysis.policy.js";
import { AUTOMATION_ERRORS } from "./automation.errors.js";
import type { RuleDefinitionInput } from "./automation.schemas.js";

export const MAX_ACTIVE_RULES_PER_BUSINESS = 50;
export const MAX_NON_ARCHIVED_RULES_PER_BUSINESS = 200;
export const MAX_EVENT_CHAIN_DEPTH = 3;

const FEEDBACK_ONLY_CONDITIONS = new Set<AutomationConditionType>([
  AutomationConditionType.BRANCH,
  AutomationConditionType.CHANNEL,
  AutomationConditionType.RATING,
  AutomationConditionType.STATUS,
  AutomationConditionType.PRIORITY,
  AutomationConditionType.CATEGORY,
  AutomationConditionType.ASSIGNMENT_STATE,
  AutomationConditionType.CUSTOMER_LINK_STATE
]);

const AI_CONDITIONS = new Set<AutomationConditionType>([
  AutomationConditionType.AI_STATUS,
  AutomationConditionType.SENTIMENT,
  AutomationConditionType.SENTIMENT_CONFIDENCE,
  AutomationConditionType.AI_SUGGESTED_CATEGORY,
  AutomationConditionType.AI_CATEGORY_CONFIDENCE,
  AutomationConditionType.AI_SUGGESTION_STATE
]);

const OPERATOR_ALLOWLIST: Record<AutomationConditionType, AutomationConditionOperator[]> =
  {
    BRANCH: ["EQUALS", "IN"],
    CHANNEL: ["EQUALS", "IN"],
    RATING: [
      "EQUALS",
      "GREATER_THAN_OR_EQUAL",
      "LESS_THAN_OR_EQUAL",
      "IS_EMPTY",
      "IS_NOT_EMPTY"
    ],
    STATUS: ["EQUALS", "IN"],
    PRIORITY: ["EQUALS", "IN"],
    CATEGORY: ["EQUALS", "IN", "IS_EMPTY", "IS_NOT_EMPTY"],
    ASSIGNMENT_STATE: ["EQUALS"],
    CUSTOMER_LINK_STATE: ["EQUALS"],
    AI_STATUS: ["EQUALS", "IN"],
    SENTIMENT: ["EQUALS", "IN"],
    SENTIMENT_CONFIDENCE: ["GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"],
    AI_SUGGESTED_CATEGORY: ["EQUALS", "IN", "IS_EMPTY", "IS_NOT_EMPTY"],
    AI_CATEGORY_CONFIDENCE: ["GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"],
    AI_SUGGESTION_STATE: ["EQUALS", "IN"]
  };

type ValidationIssue = {
  path: string;
  message: string;
  code: string;
};

export type DefinitionValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type AutomationFeedbackSnapshot = {
  id: string;
  businessId: string;
  branchId: string;
  channel: FeedbackChannel;
  rating: number | null;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  categoryId: string | null;
  assignedToMembershipId: string | null;
  customerId: string | null;
  updatedAt: Date;
  aiAnalysis: {
    status: FeedbackAIAnalysisStatus;
    sentiment: FeedbackAISentiment | null;
    sentimentConfidence: number | null;
    suggestedCategoryId: string | null;
    categoryConfidence: number | null;
    suggestionDismissedAt: Date | null;
    categoryAutoAppliedAt: Date | null;
    categoryApplicationResult: string | null;
  } | null;
};

export type StoredConditionLike = {
  id?: string;
  type: AutomationConditionType;
  operator: AutomationConditionOperator;
  position: number;
  valueString: string | null;
  valueNumber: number | null;
  valueJson: unknown;
  branchId: string | null;
  categoryId: string | null;
};

export type ConditionEvaluation = {
  conditionId?: string;
  position: number;
  type: AutomationConditionType;
  operator: AutomationConditionOperator;
  matched: boolean;
  actualValue: string | number | null;
  expectedValue: string | number | string[] | null;
};

export function validateRuleDefinitionShape(
  definition: Pick<
    RuleDefinitionInput,
    "trigger" | "branchScope" | "branchIds" | "conditions" | "actions"
  >,
  options: { requireExecutable: boolean }
): DefinitionValidationResult {
  const issues: ValidationIssue[] = [];

  if (definition.branchScope === "SELECTED_BRANCHES" && definition.branchIds.length < 1) {
    issues.push(issue("branchIds", "Select at least one active branch."));
  }

  if (options.requireExecutable && definition.conditions.length < 1) {
    issues.push(issue("conditions", "At least one condition is required."));
  }

  if (options.requireExecutable && definition.actions.length < 1) {
    issues.push(issue("actions", "At least one action is required."));
  }

  definition.conditions.forEach((condition, index) => {
    const allowed = OPERATOR_ALLOWLIST[condition.type];
    if (!allowed.includes(condition.operator)) {
      issues.push(
        issue(
          `conditions.${index}.operator`,
          `${condition.operator} is not allowed for ${condition.type}.`
        )
      );
    }

    if (
      definition.trigger === AutomationRuleTrigger.FEEDBACK_CREATED &&
      AI_CONDITIONS.has(condition.type)
    ) {
      issues.push(
        issue(
          `conditions.${index}.type`,
          `${condition.type} is only available after AI analysis completes.`
        )
      );
    }

    validateConditionValue(condition, index, issues);
  });

  validateActionConflicts(definition.actions, issues);
  definition.actions.forEach((action, index) =>
    validateActionValue(action, index, issues)
  );

  return { valid: issues.length === 0, issues };
}

export function normalizeRuleDefinitionInput(
  definition: RuleDefinitionInput
): RuleDefinitionInput {
  return {
    ...definition,
    description: normalizeOptionalString(definition.description),
    branchIds:
      definition.branchScope === "SELECTED_BRANCHES"
        ? [...new Set(definition.branchIds.map((id) => id.trim()).filter(Boolean))]
        : [],
    conditions: definition.conditions.map(normalizeConditionInput),
    actions: definition.actions.map(normalizeActionInput)
  };
}

export function evaluateCondition(
  condition: StoredConditionLike,
  feedback: AutomationFeedbackSnapshot
): ConditionEvaluation {
  const actual = getConditionActualValue(condition.type, feedback);
  const expected = getConditionExpectedValue(condition);
  const matched = applyOperator(condition.operator, actual, expected);

  return {
    conditionId: condition.id,
    position: condition.position,
    type: condition.type,
    operator: condition.operator,
    matched,
    actualValue: actual,
    expectedValue: expected
  };
}

export function matchConditionResults(
  mode: "ALL" | "ANY",
  results: ConditionEvaluation[]
): boolean {
  if (results.length === 0) return false;
  return mode === "ALL"
    ? results.every((result) => result.matched)
    : results.some((result) => result.matched);
}

export function createAutomationFingerprint(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function isFeedbackCondition(type: AutomationConditionType): boolean {
  return FEEDBACK_ONLY_CONDITIONS.has(type);
}

function validateConditionValue(
  condition: RuleDefinitionInput["conditions"][number],
  index: number,
  issues: ValidationIssue[]
): void {
  if (condition.operator === "IS_EMPTY" || condition.operator === "IS_NOT_EMPTY") {
    return;
  }

  const values = condition.values ?? [];
  const scalar = condition.value ?? null;
  const numeric = condition.valueNumber ?? null;

  if (condition.operator === "IN" && values.length < 1) {
    issues.push(issue(`conditions.${index}.values`, "Provide at least one value."));
  }

  if (
    condition.operator !== "IN" &&
    condition.operator !== "GREATER_THAN_OR_EQUAL" &&
    condition.operator !== "LESS_THAN_OR_EQUAL" &&
    !scalar &&
    !condition.branchId &&
    !condition.categoryId
  ) {
    issues.push(issue(`conditions.${index}.value`, "Provide a condition value."));
  }

  if (
    condition.operator === "GREATER_THAN_OR_EQUAL" ||
    condition.operator === "LESS_THAN_OR_EQUAL"
  ) {
    if (typeof numeric !== "number") {
      issues.push(issue(`conditions.${index}.valueNumber`, "Provide a numeric value."));
      return;
    }

    if (condition.type === "RATING" && (numeric < 1 || numeric > 5)) {
      issues.push(
        issue(`conditions.${index}.valueNumber`, "Rating must be from 1 to 5.")
      );
    }

    if (
      (condition.type === "SENTIMENT_CONFIDENCE" ||
        condition.type === "AI_CATEGORY_CONFIDENCE") &&
      (numeric < 0 || numeric > 1)
    ) {
      issues.push(
        issue(`conditions.${index}.valueNumber`, "Confidence must be from 0 to 1.")
      );
    }
  }

  if (condition.type === "ASSIGNMENT_STATE") {
    const allowed = ["ASSIGNED", "UNASSIGNED"];
    if (scalar && !allowed.includes(scalar)) {
      issues.push(issue(`conditions.${index}.value`, "Use ASSIGNED or UNASSIGNED."));
    }
  }

  if (condition.type === "CUSTOMER_LINK_STATE") {
    const allowed = ["LINKED", "UNLINKED"];
    if (scalar && !allowed.includes(scalar)) {
      issues.push(issue(`conditions.${index}.value`, "Use LINKED or UNLINKED."));
    }
  }
}

function validateActionConflicts(
  actions: RuleDefinitionInput["actions"],
  issues: ValidationIssue[]
): void {
  const singletonTypes = new Set([
    "SET_PRIORITY",
    "SET_CATEGORY",
    "SET_STATUS"
  ] as AutomationActionType[]);
  const seen = new Set<AutomationActionType>();
  let assignmentActionCount = 0;
  const actionFingerprints = new Set<string>();

  actions.forEach((action, index) => {
    if (singletonTypes.has(action.type)) {
      if (seen.has(action.type)) {
        issues.push(
          issue(`actions.${index}.type`, `Only one ${action.type} action is allowed.`)
        );
      }
      seen.add(action.type);
    }

    if (action.type === "ASSIGN_TO_MEMBERSHIP" || action.type === "UNASSIGN") {
      assignmentActionCount += 1;
    }

    const fingerprint = stableStringify(action);
    if (actionFingerprints.has(fingerprint)) {
      issues.push(
        issue(`actions.${index}`, "Duplicate identical actions are not allowed.")
      );
    }
    actionFingerprints.add(fingerprint);
  });

  if (assignmentActionCount > 1) {
    issues.push(issue("actions", "Use only one assignment-changing action in a rule."));
  }
}

function validateActionValue(
  action: RuleDefinitionInput["actions"][number],
  index: number,
  issues: ValidationIssue[]
): void {
  if (action.type === "SET_PRIORITY" && !action.priority) {
    issues.push(issue(`actions.${index}.priority`, "Choose a priority."));
  }
  if (action.type === "SET_CATEGORY" && !action.categoryId) {
    issues.push(issue(`actions.${index}.categoryId`, "Choose a category."));
  }
  if (action.type === "ASSIGN_TO_MEMBERSHIP" && !action.membershipId) {
    issues.push(issue(`actions.${index}.membershipId`, "Choose a member."));
  }
  if (action.type === "SET_STATUS" && !action.status) {
    issues.push(issue(`actions.${index}.status`, "Choose a status."));
  }
}

function getConditionActualValue(
  type: AutomationConditionType,
  feedback: AutomationFeedbackSnapshot
): string | number | null {
  switch (type) {
    case "BRANCH":
      return feedback.branchId;
    case "CHANNEL":
      return feedback.channel;
    case "RATING":
      return feedback.rating;
    case "STATUS":
      return feedback.status;
    case "PRIORITY":
      return feedback.priority;
    case "CATEGORY":
      return feedback.categoryId;
    case "ASSIGNMENT_STATE":
      return feedback.assignedToMembershipId ? "ASSIGNED" : "UNASSIGNED";
    case "CUSTOMER_LINK_STATE":
      return feedback.customerId ? "LINKED" : "UNLINKED";
    case "AI_STATUS":
      return feedback.aiAnalysis?.status ?? null;
    case "SENTIMENT":
      return feedback.aiAnalysis?.sentiment ?? null;
    case "SENTIMENT_CONFIDENCE":
      return feedback.aiAnalysis?.sentimentConfidence ?? null;
    case "AI_SUGGESTED_CATEGORY":
      return feedback.aiAnalysis?.suggestedCategoryId ?? null;
    case "AI_CATEGORY_CONFIDENCE":
      return feedback.aiAnalysis?.categoryConfidence ?? null;
    case "AI_SUGGESTION_STATE":
      return feedback.aiAnalysis
        ? deriveCategorySuggestionState(feedback.aiAnalysis)
        : "NONE";
    default:
      return null;
  }
}

function getConditionExpectedValue(
  condition: StoredConditionLike
): string | number | string[] | null {
  if (condition.operator === "IN") {
    return Array.isArray(condition.valueJson)
      ? condition.valueJson.filter((item): item is string => typeof item === "string")
      : [];
  }

  if (
    condition.operator === "GREATER_THAN_OR_EQUAL" ||
    condition.operator === "LESS_THAN_OR_EQUAL"
  ) {
    return condition.valueNumber;
  }

  return condition.branchId ?? condition.categoryId ?? condition.valueString;
}

function applyOperator(
  operator: AutomationConditionOperator,
  actual: string | number | null,
  expected: string | number | string[] | null
): boolean {
  switch (operator) {
    case "EQUALS":
      return String(actual ?? "") === String(expected ?? "");
    case "NOT_EQUALS":
      return String(actual ?? "") !== String(expected ?? "");
    case "IN":
      return Array.isArray(expected) && actual !== null
        ? expected.includes(String(actual))
        : false;
    case "GREATER_THAN_OR_EQUAL":
      return typeof actual === "number" && typeof expected === "number"
        ? actual >= expected
        : false;
    case "LESS_THAN_OR_EQUAL":
      return typeof actual === "number" && typeof expected === "number"
        ? actual <= expected
        : false;
    case "IS_EMPTY":
      return actual === null || actual === "";
    case "IS_NOT_EMPTY":
      return actual !== null && actual !== "";
    default:
      return false;
  }
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message, code: AUTOMATION_ERRORS.RULE_INVALID };
}

function normalizeConditionInput(
  condition: RuleDefinitionInput["conditions"][number]
): RuleDefinitionInput["conditions"][number] {
  const usesNumber =
    condition.operator === AutomationConditionOperator.GREATER_THAN_OR_EQUAL ||
    condition.operator === AutomationConditionOperator.LESS_THAN_OR_EQUAL;
  const usesValues = condition.operator === AutomationConditionOperator.IN;
  const usesNoValue =
    condition.operator === AutomationConditionOperator.IS_EMPTY ||
    condition.operator === AutomationConditionOperator.IS_NOT_EMPTY;
  const usesBranch =
    condition.type === AutomationConditionType.BRANCH && !usesValues && !usesNoValue;
  const usesCategory =
    (condition.type === AutomationConditionType.CATEGORY ||
      condition.type === AutomationConditionType.AI_SUGGESTED_CATEGORY) &&
    !usesValues &&
    !usesNoValue;
  const scalarValue =
    !usesNumber && !usesValues && !usesNoValue && !usesBranch && !usesCategory
      ? normalizeOptionalString(condition.value)
      : null;

  return {
    type: condition.type,
    operator: condition.operator,
    value: scalarValue,
    values: usesValues
      ? [
          ...new Set(
            (condition.values ?? []).map((value) => value.trim()).filter(Boolean)
          )
        ]
      : [],
    valueNumber: usesNumber ? (condition.valueNumber ?? null) : null,
    branchId: usesBranch
      ? normalizeOptionalString(condition.branchId ?? condition.value)
      : null,
    categoryId: usesCategory
      ? normalizeOptionalString(condition.categoryId ?? condition.value)
      : null
  };
}

function normalizeActionInput(
  action: RuleDefinitionInput["actions"][number]
): RuleDefinitionInput["actions"][number] {
  return {
    type: action.type,
    priority:
      action.type === AutomationActionType.SET_PRIORITY
        ? (action.priority ?? null)
        : null,
    categoryId:
      action.type === AutomationActionType.SET_CATEGORY
        ? normalizeOptionalString(action.categoryId)
        : null,
    membershipId:
      action.type === AutomationActionType.ASSIGN_TO_MEMBERSHIP
        ? normalizeOptionalString(action.membershipId)
        : null,
    status:
      action.type === AutomationActionType.SET_STATUS ? (action.status ?? null) : null
  };
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}
