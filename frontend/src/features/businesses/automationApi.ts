import { apiClient } from "../../api/axios.js";
import type { FeedbackStatus, FeedbackPriority } from "./feedbackInboxApi.js";

export type AutomationRuleStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type AutomationRuleTrigger = "FEEDBACK_CREATED" | "AI_ANALYSIS_COMPLETED";
export type AutomationBranchScope = "ALL_BRANCHES" | "SELECTED_BRANCHES";
export type AutomationMatchMode = "ALL" | "ANY";
export type AutomationConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "IN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN_OR_EQUAL"
  | "IS_EMPTY"
  | "IS_NOT_EMPTY";
export type AutomationConditionType =
  | "BRANCH"
  | "CHANNEL"
  | "RATING"
  | "STATUS"
  | "PRIORITY"
  | "CATEGORY"
  | "ASSIGNMENT_STATE"
  | "CUSTOMER_LINK_STATE"
  | "AI_STATUS"
  | "SENTIMENT"
  | "SENTIMENT_CONFIDENCE"
  | "AI_SUGGESTED_CATEGORY"
  | "AI_CATEGORY_CONFIDENCE"
  | "AI_SUGGESTION_STATE";
export type AutomationActionType =
  "SET_PRIORITY" | "SET_CATEGORY" | "ASSIGN_TO_MEMBERSHIP" | "UNASSIGN" | "SET_STATUS";
export type AutomationExecutionStatus =
  "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED" | "NOT_MATCHED";

export type AutomationCondition = {
  id?: string;
  type: AutomationConditionType;
  operator: AutomationConditionOperator;
  position?: number;
  value?: string | null;
  values?: string[];
  valueNumber?: number | null;
  branchId?: string | null;
  categoryId?: string | null;
};

export type AutomationAction = {
  id?: string;
  type: AutomationActionType;
  position?: number;
  priority?: FeedbackPriority | null;
  categoryId?: string | null;
  membershipId?: string | null;
  status?: FeedbackStatus | null;
};

export type AutomationRuleDefinition = {
  name: string;
  description?: string | null;
  trigger: AutomationRuleTrigger;
  branchScope: AutomationBranchScope;
  branchIds: string[];
  matchMode: AutomationMatchMode;
  stopProcessingAfterMatch: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  expectedUpdatedAt?: string;
};

export type AutomationRule = AutomationRuleDefinition & {
  id: string;
  businessId: string;
  status: AutomationRuleStatus;
  position: number;
  version: number;
  executionCount: number;
  lastTriggeredAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRulesResponse = {
  items: AutomationRule[];
  summary: {
    total: number;
    active: number;
    paused: number;
    draft: number;
    archived: number;
    executionsToday: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type AutomationExecution = {
  id: string;
  rule: { id: string; name: string } | null;
  feedback: { id: string; title: string | null; receivedAt: string };
  trigger: AutomationRuleTrigger;
  status: AutomationExecutionStatus;
  matched: boolean;
  ruleVersion: number | null;
  safeErrorCode: string | null;
  safeErrorMessage: string | null;
  actionsSucceeded: number;
  actionsSkipped: number;
  actionsFailed: number;
  durationMs: number | null;
  createdAt: string;
  conditionResults: unknown;
  actionResults: Array<{
    id: string;
    actionType: AutomationActionType;
    actionPosition: number;
    status: "SUCCESS" | "SKIPPED" | "FAILED" | "CONFLICTED";
    fieldName: string | null;
    previousValue: string | null;
    newValue: string | null;
    safeErrorCode: string | null;
    safeErrorMessage: string | null;
  }>;
};

export type AutomationExecutionsResponse = {
  items: AutomationExecution[];
  pagination: AutomationRulesResponse["pagination"];
};

export type AutomationPreviewResult = {
  matched: boolean;
  conditionResults: Array<{
    type: AutomationConditionType;
    operator: AutomationConditionOperator;
    matched: boolean;
    actualValue: string | number | null;
    expectedValue: string | number | string[] | null;
  }>;
  actionPredictions: Array<{
    actionType: AutomationActionType;
    fieldName: string | null;
    currentValue: string | null;
    desiredValue: string | null;
    wouldApply: boolean;
    skipReason: string | null;
  }>;
  wouldStopProcessing: boolean;
};

export type AutomationDeleteResult = {
  deleted: boolean;
  ruleId: string;
};

export async function fetchAutomationRules(
  businessId: string,
  params: {
    search?: string;
    status?: AutomationRuleStatus;
    trigger?: AutomationRuleTrigger;
    includeArchived?: boolean;
  } = {}
): Promise<AutomationRulesResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: AutomationRulesResponse;
  }>(`/businesses/${businessId}/automation-rules`, { params });
  return response.data.data;
}

export async function createAutomationRule(
  businessId: string,
  definition: AutomationRuleDefinition
): Promise<AutomationRule> {
  const response = await apiClient.post<{ success: boolean; data: AutomationRule }>(
    `/businesses/${businessId}/automation-rules`,
    definition
  );
  return response.data.data;
}

export async function updateAutomationRule(
  businessId: string,
  ruleId: string,
  definition: AutomationRuleDefinition
): Promise<AutomationRule> {
  const response = await apiClient.patch<{ success: boolean; data: AutomationRule }>(
    `/businesses/${businessId}/automation-rules/${ruleId}`,
    definition
  );
  return response.data.data;
}

export async function activateAutomationRule(
  businessId: string,
  ruleId: string
): Promise<AutomationRule> {
  const response = await apiClient.post<{ success: boolean; data: AutomationRule }>(
    `/businesses/${businessId}/automation-rules/${ruleId}/activate`
  );
  return response.data.data;
}

export async function pauseAutomationRule(
  businessId: string,
  ruleId: string
): Promise<AutomationRule> {
  const response = await apiClient.post<{ success: boolean; data: AutomationRule }>(
    `/businesses/${businessId}/automation-rules/${ruleId}/pause`
  );
  return response.data.data;
}

export async function archiveAutomationRule(
  businessId: string,
  ruleId: string
): Promise<AutomationRule> {
  const response = await apiClient.post<{ success: boolean; data: AutomationRule }>(
    `/businesses/${businessId}/automation-rules/${ruleId}/archive`
  );
  return response.data.data;
}

export async function unarchiveAutomationRule(
  businessId: string,
  ruleId: string
): Promise<AutomationRule> {
  const response = await apiClient.post<{ success: boolean; data: AutomationRule }>(
    `/businesses/${businessId}/automation-rules/${ruleId}/unarchive`
  );
  return response.data.data;
}

export async function deleteAutomationRule(
  businessId: string,
  ruleId: string
): Promise<AutomationDeleteResult> {
  const response = await apiClient.delete<{
    success: boolean;
    data: AutomationDeleteResult;
  }>(`/businesses/${businessId}/automation-rules/${ruleId}`);
  return response.data.data;
}

export async function duplicateAutomationRule(
  businessId: string,
  ruleId: string
): Promise<AutomationRule> {
  const response = await apiClient.post<{ success: boolean; data: AutomationRule }>(
    `/businesses/${businessId}/automation-rules/${ruleId}/duplicate`
  );
  return response.data.data;
}

export async function previewAutomationRule(
  businessId: string,
  ruleId: string,
  feedbackId: string
): Promise<AutomationPreviewResult> {
  const response = await apiClient.post<{
    success: boolean;
    data: AutomationPreviewResult;
  }>(`/businesses/${businessId}/automation-rules/${ruleId}/test`, { feedbackId });
  return response.data.data;
}

export async function runAutomationRule(
  businessId: string,
  ruleId: string,
  feedbackId: string
): Promise<AutomationExecution> {
  const response = await apiClient.post<{ success: boolean; data: AutomationExecution }>(
    `/businesses/${businessId}/automation-rules/${ruleId}/run`,
    { feedbackId, requestKey: `${ruleId}:${feedbackId}` }
  );
  return response.data.data;
}

export async function fetchAutomationExecutions(
  businessId: string,
  params: {
    search?: string;
    status?: AutomationExecutionStatus;
    trigger?: AutomationRuleTrigger;
    ruleId?: string;
  } = {}
): Promise<AutomationExecutionsResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: AutomationExecutionsResponse;
  }>(`/businesses/${businessId}/automation-executions`, { params });
  return response.data.data;
}
