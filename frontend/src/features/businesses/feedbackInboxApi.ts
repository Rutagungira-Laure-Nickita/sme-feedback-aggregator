import { apiClient } from "../../api/axios.js";

export type FeedbackChannel =
  | "MANUAL"
  | "PUBLIC_FORM"
  | "QR_CODE"
  | "WHATSAPP"
  | "INSTAGRAM"
  | "X"
  | "GOOGLE_REVIEW"
  | "EMAIL"
  | "FACEBOOK"
  | "OTHER";

export type FeedbackStatus = "NEW" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

export type FeedbackPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type CustomerStatus = "ACTIVE" | "ARCHIVED";
export type FeedbackAISentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
export type FeedbackAIStatus =
  "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "SKIPPED";
export type AIConfidenceLevel = "HIGH" | "REVIEW" | "LOW";
export type FeedbackAICategorySuggestionState =
  "NONE" | "AVAILABLE" | "AUTO_APPLIED" | "MANUALLY_APPLIED" | "DISMISSED" | "CONFLICTED";
export type FeedbackAISuggestionStateFilter =
  "AVAILABLE" | "APPLIED" | "DISMISSED" | "NONE";

export type AssigneeInfo = {
  membershipId: string;
  name: string;
  role: string;
  isAvailable: boolean;
};

export type CategoryInfo = {
  id: string;
  name: string;
  colorKey: string;
  isActive: boolean;
};

export type AIAnalysisSummary = {
  id: string;
  status: FeedbackAIStatus;
  sentiment: FeedbackAISentiment | null;
  sentimentConfidence: number | null;
  sentimentConfidenceLevel: AIConfidenceLevel | null;
  summary: string | null;
  detectedLanguage: string | null;
  suggestedCategory: CategoryInfo | null;
  categoryConfidence: number | null;
  categoryConfidenceLevel: AIConfidenceLevel | null;
  suggestionDismissedAt: string | null;
  inputTruncated: boolean;
  analyzedCharCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  categoryAutoAppliedAt: string | null;
  categoryApplicationResult: string | null;
  categorySuggestionState: FeedbackAICategorySuggestionState;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  permissions: {
    canRetry: boolean;
    canApplySuggestion: boolean;
    canDismissSuggestion: boolean;
  };
};

export type FeedbackListItem = {
  id: string;
  title: string | null;
  messagePreview: string;
  channel: FeedbackChannel;
  status: FeedbackStatus;
  rating: number | null;
  branch: {
    id: string;
    name: string;
  };
  customer: {
    name: string | null;
  };
  assignedTo: AssigneeInfo | null;
  category: CategoryInfo | null;
  aiAnalysis: AIAnalysisSummary | null;
  priority: string;
  occurredAt: string | null;
  receivedAt: string;
  createdAt: string;
};

export type FeedbackAttachmentResponse = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  externalUrl: string | null;
  checksum: string | null;
};

export type FeedbackDetail = {
  id: string;
  title: string | null;
  message: string;
  channel: FeedbackChannel;
  status: FeedbackStatus;
  availableTransitions: FeedbackStatus[];
  rating: number | null;
  branch: {
    id: string;
    name: string;
    location: string | null;
  };
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  linkedCustomer: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    status: CustomerStatus;
    createdAt: string;
    updatedAt: string;
  } | null;
  customerPermissions: {
    canLinkFeedback: boolean;
    canCreateFromFeedback: boolean;
  };
  assignedTo: AssigneeInfo | null;
  category: CategoryInfo | null;
  aiAnalysis: AIAnalysisSummary | null;
  priority: string;
  occurredAt: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  source: {
    label: string;
    detail: string | null;
    reference: string | null;
    note: string | null;
    url: string | null;
  };
  attachments: FeedbackAttachmentResponse[];
};

export type FeedbackInboxPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type FeedbackSummary = {
  total: number;
  attentionCount: number;
  manual: number;
  publicForm: number;
  qrCode: number;
  external: number;
};

export type FeedbackListResponse = {
  items: FeedbackListItem[];
  pagination: FeedbackInboxPagination;
  summary: FeedbackSummary;
};

export type FeedbackInboxQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  branchId?: string;
  channel?: FeedbackChannel;
  status?: FeedbackStatus;
  assignedTo?: string;
  assignmentState?: "assigned" | "unassigned";
  categoryId?: string;
  categoryState?: "categorized" | "uncategorized";
  priority?: FeedbackPriority;
  rating?: number;
  ratingMin?: number;
  ratingMax?: number;
  includeUnrated?: boolean;
  datePreset?:
    "today" | "last_7_days" | "last_30_days" | "this_month" | "previous_month" | "custom";
  dateFrom?: string;
  dateTo?: string;
  customerLinkState?: "linked" | "unlinked";
  sentiment?: FeedbackAISentiment;
  aiStatus?: FeedbackAIStatus;
  aiSuggestionState?: FeedbackAISuggestionStateFilter;
  customerId?: string;
  sort?: "newest" | "oldest";
};

// ─── Inbox API ──────────────────────────────────────────

export async function fetchFeedbackList(
  businessId: string,
  query: FeedbackInboxQuery
): Promise<FeedbackListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.branchId) params.set("branchId", query.branchId);
  if (query.channel) params.set("channel", query.channel);
  if (query.status) params.set("status", query.status);
  if (query.sentiment) params.set("sentiment", query.sentiment);
  if (query.aiStatus) params.set("aiStatus", query.aiStatus);
  if (query.aiSuggestionState) {
    params.set("aiSuggestionState", query.aiSuggestionState);
  }
  if (query.assignedTo) params.set("assignedTo", query.assignedTo);
  if (query.assignmentState) params.set("assignmentState", query.assignmentState);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.categoryState) params.set("categoryState", query.categoryState);
  if (query.priority) params.set("priority", query.priority);
  if (query.rating) params.set("rating", String(query.rating));
  if (query.ratingMin) params.set("ratingMin", String(query.ratingMin));
  if (query.ratingMax) params.set("ratingMax", String(query.ratingMax));
  if (query.includeUnrated) params.set("includeUnrated", "true");
  if (query.datePreset) params.set("datePreset", query.datePreset);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.customerLinkState) {
    params.set("customerLinkState", query.customerLinkState);
  }
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.sort) params.set("sort", query.sort);
  const response = await apiClient.get<{
    success: boolean;
    data: FeedbackListResponse;
  }>(`/businesses/${businessId}/feedback`, { params });
  return response.data.data;
}

export async function fetchFeedbackDetail(
  businessId: string,
  feedbackId: string
): Promise<FeedbackDetail> {
  const response = await apiClient.get<{
    success: boolean;
    data: FeedbackDetail;
  }>(`/businesses/${businessId}/feedback/${feedbackId}`);
  return response.data.data;
}

export type FeedbackSelection = {
  feedbackIds?: string[];
  allMatching?: boolean;
  filters?: Omit<FeedbackInboxQuery, "page" | "pageSize" | "sort">;
};

export type FeedbackEditInput = {
  title?: string | null;
  message?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  branchId?: string;
  categoryId?: string | null;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  expectedUpdatedAt: string;
};

export async function editFeedback(
  businessId: string,
  feedbackId: string,
  input: FeedbackEditInput
) {
  const response = await apiClient.patch(
    `/businesses/${businessId}/feedback/${feedbackId}`,
    input
  );
  return response.data.data as { feedbackId: string; changedFields: string[] };
}

export async function deleteFeedback(businessId: string, feedbackId: string) {
  const response = await apiClient.delete(
    `/businesses/${businessId}/feedback/${feedbackId}`
  );
  return response.data.data as { affectedCount: number };
}

export async function bulkUpdateFeedbackStatus(
  businessId: string,
  selection: FeedbackSelection,
  status: FeedbackStatus
) {
  const response = await apiClient.post(
    `/businesses/${businessId}/feedback/bulk/status`,
    { selection, status }
  );
  return response.data.data as { affectedCount: number };
}

export async function bulkCategorizeFeedback(
  businessId: string,
  selection: FeedbackSelection,
  categoryId: string | null
) {
  const response = await apiClient.post(
    `/businesses/${businessId}/feedback/bulk/category`,
    { selection, categoryId }
  );
  return response.data.data as { affectedCount: number };
}

export async function bulkDeleteFeedback(
  businessId: string,
  selection: FeedbackSelection,
  confirmation?: "DELETE"
) {
  const response = await apiClient.post(
    `/businesses/${businessId}/feedback/bulk/delete`,
    { selection, confirmation }
  );
  return response.data.data as { affectedCount: number; deletedAt?: string };
}

export type FeedbackDashboard = {
  periodDays: number;
  scope: { allBranches: boolean; branchIds: string[]; label: string };
  total: number;
  attentionCount: number;
  statuses: Partial<Record<FeedbackStatus, number>>;
  channels: Array<{ channel: FeedbackChannel; count: number }>;
  sentiments: Array<{ sentiment: FeedbackAISentiment | null; count: number }>;
  averageRating: number | null;
  recent: Array<{
    id: string;
    title: string | null;
    messagePreview: string;
    status: FeedbackStatus;
    priority: FeedbackPriority;
    receivedAt: string;
    branch: { id: string; name: string };
    customerName: string | null;
  }>;
};

export async function fetchFeedbackDashboard(
  businessId: string
): Promise<FeedbackDashboard> {
  const response = await apiClient.get<{ success: boolean; data: FeedbackDashboard }>(
    `/businesses/${businessId}/feedback/dashboard`
  );
  return response.data.data;
}

export type BusinessAIStatus = {
  operationalState: "DISABLED" | "NOT_CONFIGURED" | "READY";
  provider: string;
  model: string;
  enabled: boolean;
  configured: boolean;
  autoApplyCategory: boolean;
  categoryConfidenceThreshold: number;
  dailyBusinessLimit: number;
  maxRetries: number;
  worker: {
    enabled: boolean;
    pollIntervalMs: number;
    batchSize: number;
  };
  counts: Record<FeedbackAIStatus, number>;
  dailyUsage: {
    used: number;
    remaining: number;
    limit: number;
  };
  backfill: {
    maxPerRequest: number;
  };
};

export type BusinessAIBackfillResult = {
  examined: number;
  queued: number;
  alreadyAnalyzed: number;
  alreadyPending: number;
  skippedNoText: number;
  blockedByDailyLimit: number;
  failedToQueue: number;
  limitRemaining: number;
  skipped: number;
  alreadyHadAnalysis: number;
};

export async function fetchFeedbackAIAnalysis(
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary | null> {
  const response = await apiClient.get<{
    success: boolean;
    data: AIAnalysisSummary | null;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/ai-analysis`);
  return response.data.data;
}

export async function retryFeedbackAIAnalysis(
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary> {
  const response = await apiClient.post<{
    success: boolean;
    data: AIAnalysisSummary;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/ai-analysis/retry`);
  return response.data.data;
}

export async function applyAICategorySuggestion(
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary> {
  const response = await apiClient.post<{
    success: boolean;
    data: AIAnalysisSummary;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/ai-category/apply`);
  return response.data.data;
}

export async function dismissAICategorySuggestion(
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary> {
  const response = await apiClient.post<{
    success: boolean;
    data: AIAnalysisSummary;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/ai-category/dismiss`);
  return response.data.data;
}

export async function fetchBusinessAIStatus(
  businessId: string
): Promise<BusinessAIStatus> {
  const response = await apiClient.get<{
    success: boolean;
    data: BusinessAIStatus;
  }>(`/businesses/${businessId}/ai/status`);
  return response.data.data;
}

export async function requestBusinessAIBackfill(
  businessId: string
): Promise<BusinessAIBackfillResult> {
  const response = await apiClient.post<{
    success: boolean;
    data: BusinessAIBackfillResult;
  }>(`/businesses/${businessId}/ai/backfill`);
  return response.data.data;
}

// ─── Activity API (Phase 9) ─────────────────────────────

export type ActivityItem = {
  id: string;
  type:
    | "STATUS_CHANGED"
    | "NOTE_ADDED"
    | "ASSIGNMENT_CHANGED"
    | "CATEGORY_CHANGED"
    | "PRIORITY_CHANGED"
    | "AI_ANALYSIS_REQUESTED"
    | "AI_ANALYSIS_COMPLETED"
    | "AI_ANALYSIS_FAILED"
    | "AI_ANALYSIS_RETRIED"
    | "AI_CATEGORY_APPLIED"
    | "AI_CATEGORY_DISMISSED"
    | "FEEDBACK_RECEIVED";
  fromStatus: FeedbackStatus | null;
  toStatus: FeedbackStatus | null;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  channel?: string;
  sourceLabel?: string;
  actor: {
    membershipId: string;
    name: string;
    role: string;
  } | null;
  actorType?: "HUMAN" | "SYSTEM";
  automationRuleName?: string | null;
  createdAt: string;
  isSynthetic: boolean;
};

export type ActivityListResponse = {
  items: ActivityItem[];
};

export type StatusUpdateResponse = {
  feedback: {
    id: string;
    status: FeedbackStatus;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export type AddNoteResponse = {
  activity: ActivityItem;
};

export async function updateFeedbackStatus(
  businessId: string,
  feedbackId: string,
  status: FeedbackStatus
): Promise<StatusUpdateResponse> {
  const response = await apiClient.patch<{
    success: boolean;
    data: StatusUpdateResponse;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/status`, { status });
  return response.data.data;
}

export async function addFeedbackNote(
  businessId: string,
  feedbackId: string,
  note: string
): Promise<AddNoteResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: AddNoteResponse;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/notes`, { note });
  return response.data.data;
}

export async function fetchFeedbackActivity(
  businessId: string,
  feedbackId: string
): Promise<ActivityListResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: ActivityListResponse;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/activity`);
  return response.data.data;
}

// ─── Phase 10: Assignment API ───────────────────────────

export type AssignmentResponse = {
  feedback: {
    id: string;
    assignedTo: AssigneeInfo | null;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export async function updateAssignment(
  businessId: string,
  feedbackId: string,
  membershipId: string | null
): Promise<AssignmentResponse> {
  const response = await apiClient.patch<{
    success: boolean;
    data: AssignmentResponse;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/assignment`, {
    membershipId
  });
  return response.data.data;
}

export async function fetchEligibleAssignees(
  businessId: string,
  feedbackId: string
): Promise<AssigneeInfo[]> {
  const response = await apiClient.get<{
    success: boolean;
    data: AssigneeInfo[];
  }>(`/businesses/${businessId}/feedback/${feedbackId}/eligible-assignees`);
  return response.data.data;
}

// ─── Phase 10: Category API ─────────────────────────────

export type FeedbackCategoryResponse = {
  id: string;
  name: string;
  description: string | null;
  colorKey: string;
  isActive: boolean;
  feedbackCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryUpdateResponse = {
  feedback: {
    id: string;
    categoryId: string | null;
    category: CategoryInfo | null;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export async function updateFeedbackCategory(
  businessId: string,
  feedbackId: string,
  categoryId: string | null
): Promise<CategoryUpdateResponse> {
  const response = await apiClient.patch<{
    success: boolean;
    data: CategoryUpdateResponse;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/category`, {
    categoryId
  });
  return response.data.data;
}

export async function fetchCategories(
  businessId: string,
  includeInactive?: boolean
): Promise<FeedbackCategoryResponse[]> {
  const params = includeInactive ? { includeInactive: "true" } : {};
  const response = await apiClient.get<{
    success: boolean;
    data: FeedbackCategoryResponse[];
  }>(`/businesses/${businessId}/feedback-categories`, { params });
  return response.data.data;
}

export async function createCategory(
  businessId: string,
  data: { name: string; description?: string | null; colorKey?: string }
): Promise<FeedbackCategoryResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: FeedbackCategoryResponse;
  }>(`/businesses/${businessId}/feedback-categories`, data);
  return response.data.data;
}

export async function updateCategory(
  businessId: string,
  categoryId: string,
  data: { name?: string; description?: string | null; colorKey?: string }
): Promise<FeedbackCategoryResponse> {
  const response = await apiClient.patch<{
    success: boolean;
    data: FeedbackCategoryResponse;
  }>(`/businesses/${businessId}/feedback-categories/${categoryId}`, data);
  return response.data.data;
}

export async function updateCategoryActivation(
  businessId: string,
  categoryId: string,
  isActive: boolean
): Promise<FeedbackCategoryResponse> {
  const response = await apiClient.patch<{
    success: boolean;
    data: FeedbackCategoryResponse;
  }>(`/businesses/${businessId}/feedback-categories/${categoryId}/activation`, {
    isActive
  });
  return response.data.data;
}

// ─── Phase 10: Priority API ─────────────────────────────

export type PriorityUpdateResponse = {
  feedback: {
    id: string;
    priority: string;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export async function updateFeedbackPriority(
  businessId: string,
  feedbackId: string,
  priority: FeedbackPriority
): Promise<PriorityUpdateResponse> {
  const response = await apiClient.patch<{
    success: boolean;
    data: PriorityUpdateResponse;
  }>(`/businesses/${businessId}/feedback/${feedbackId}/priority`, { priority });
  return response.data.data;
}
