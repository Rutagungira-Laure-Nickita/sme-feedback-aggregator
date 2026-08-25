import { apiClient } from "../../api/axios.js";
import type { BranchStatus } from "./types.js";

export type IntegrationProvider =
  "GOOGLE_REVIEWS" | "WHATSAPP" | "EMAIL" | "X" | "FACEBOOK" | "INSTAGRAM";
export type IntegrationMode = "DEMO" | "LIVE";
export type IntegrationConnectionStatus =
  "CONNECTED" | "PAUSED" | "DISCONNECTED" | "ERROR";
export type IntegrationDemoScenario = "STANDARD_MIXED" | "PARTIAL_FAILURE";
export type EmailProviderType = "GMAIL" | "MICROSOFT" | "IMAP";
export type SynchronizationRunStatus =
  "PENDING" | "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED" | "CANCELLED";
export type SynchronizationItemStatus = "IMPORTED" | "DUPLICATE" | "SKIPPED" | "FAILED";
export type IntegrationWebhookDeliveryStatus =
  "RECEIVED" | "IMPORTED" | "DUPLICATE" | "SKIPPED" | "FAILED";

export type IntegrationProviderCapability = {
  provider: IntegrationProvider;
  label: string;
  channel: string;
  demoSupported: boolean;
  liveSupported: boolean;
  supportsRatings: boolean;
  supportsAttachments: boolean;
  description: string;
  mode: IntegrationMode;
  demoMode: boolean;
  liveAvailable: boolean;
  disclosure: string;
  connection: IntegrationConnection | null;
};

export type IntegrationConnection = {
  id: string;
  businessId: string;
  provider: IntegrationProvider;
  providerLabel: string;
  mode: IntegrationMode;
  demoMode: boolean;
  liveMode: boolean;
  status: IntegrationConnectionStatus;
  displayName: string;
  defaultBranch: { id: string; name: string; status: BranchStatus } | null;
  demoScenario: IntegrationDemoScenario | null;
  liveProviderType: EmailProviderType | null;
  providerAccountId: string | null;
  providerAccountLabel: string | null;
  synchronizationFolder: string;
  gmailFeedbackLabel: string | null;
  lastProviderCursorAt: string | null;
  requiresReauthorization: boolean;
  lastConnectionTestAt: string | null;
  lastConnectionTestStatus: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappDisplayPhoneNumber: string | null;
  webhookStatus: string | null;
  lastWebhookReceivedAt: string | null;
  lastWebhookVerifiedAt: string | null;
  lastInboundMessageAt: string | null;
  graphApiVersion: string | null;
  connectedAt: string | null;
  pausedAt: string | null;
  disconnectedAt: string | null;
  lastAttemptedSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastErrorCode: string | null;
  totalImported: number;
  latestRun: SynchronizationRun | null;
  disclosure: string;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationWebhookDelivery = {
  id: string;
  connectionId: string;
  businessId: string;
  provider: IntegrationProvider;
  providerLabel: string;
  externalEventId: string | null;
  payloadHash: string;
  status: IntegrationWebhookDeliveryStatus;
  resultCode: string | null;
  safeMessage: string | null;
  messageType: string | null;
  senderHash: string | null;
  safePreview: {
    provider?: IntegrationProvider;
    providerLabel?: string;
    liveMode?: boolean;
    demoMode?: boolean;
    messageType?: string | null;
    sender?: string | null;
    textPreview?: string | null;
  } | null;
  receivedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SynchronizationRun = {
  id: string;
  connectionId: string;
  connection: {
    id: string;
    displayName: string;
    liveProviderType: EmailProviderType | null;
  } | null;
  businessId: string;
  provider: IntegrationProvider;
  providerLabel: string;
  mode: IntegrationMode;
  demoMode: boolean;
  liveMode: boolean;
  liveProviderType: EmailProviderType | null;
  status: SynchronizationRunStatus;
  triggerType: "MANUAL";
  demoScenario: IntegrationDemoScenario | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  itemsFetched: number;
  itemsProcessed: number;
  itemsImported: number;
  itemsDuplicated: number;
  itemsSkipped: number;
  itemsFailed: number;
  errorCode: string | null;
  safeSummary: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type SynchronizationItem = {
  id: string;
  runId: string;
  connectionId: string;
  provider: IntegrationProvider;
  providerLabel: string;
  externalId: string;
  payloadHash: string;
  status: SynchronizationItemStatus;
  feedbackIngestionId: string | null;
  feedbackId: string | null;
  resultCode: string | null;
  safeMessage: string | null;
  externalReceivedAt: string | null;
  sourceLabel: string | null;
  safePreview: {
    title?: string;
    excerpt?: string;
    rating?: number;
    customerLabel?: string;
    receivedAt?: string;
  } | null;
  processedAt: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationConnectionsResponse = {
  items: IntegrationConnection[];
  summary: {
    total: number;
    connected: number;
    paused: number;
    disconnected: number;
    error: number;
    imported: number;
    duplicates: number;
    failed: number;
  };
  recentRuns: SynchronizationRun[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type SynchronizationRunsResponse = {
  items: SynchronizationRun[];
  pagination: IntegrationConnectionsResponse["pagination"];
};

export type SynchronizationItemsResponse = {
  items: SynchronizationItem[];
  pagination: IntegrationConnectionsResponse["pagination"];
};

export type WebhookActivityResponse = {
  items: IntegrationWebhookDelivery[];
  pagination: IntegrationConnectionsResponse["pagination"];
};

export type IntegrationHealth = {
  ok: boolean;
  code: string;
  message: string;
  checkedAt: string;
  providerAccountLabel?: string | null;
};

export type IntegrationAuthorizationResponse = {
  connection: IntegrationConnection;
  authorizationUrl: string;
  expiresAt: string;
  message?: string;
};

export async function fetchIntegrationProviders(
  businessId: string
): Promise<IntegrationProviderCapability[]> {
  const response = await apiClient.get<{
    success: boolean;
    data: { providers: IntegrationProviderCapability[] };
  }>(`/businesses/${businessId}/integration-providers`);
  return response.data.data.providers;
}

export async function fetchIntegrationConnections(
  businessId: string,
  params: {
    search?: string;
    provider?: IntegrationProvider;
    status?: IntegrationConnectionStatus;
    mode?: IntegrationMode;
    branchId?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<IntegrationConnectionsResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: IntegrationConnectionsResponse;
  }>(`/businesses/${businessId}/integrations`, { params });
  return response.data.data;
}

export async function createIntegrationConnection(
  businessId: string,
  input: {
    provider: IntegrationProvider;
    displayName: string;
    defaultBranchId: string;
    demoScenario: IntegrationDemoScenario;
    mode?: IntegrationMode;
    liveProviderType?: EmailProviderType;
    phoneNumberId?: string;
    wabaId?: string;
    displayPhoneNumber?: string;
    providerAccountId?: string;
    providerAccountLabel?: string;
    providerAccountType?: string;
    temporaryAccessToken?: string;
    gmailFeedbackLabel?: string;
  }
): Promise<IntegrationConnection | IntegrationAuthorizationResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationConnection | IntegrationAuthorizationResponse;
  }>(`/businesses/${businessId}/integrations`, {
    ...input,
    mode: input.mode ?? "LIVE"
  });
  return response.data.data;
}

export async function authorizeIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<IntegrationAuthorizationResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationAuthorizationResponse;
  }>(`/businesses/${businessId}/integrations/${connectionId}/authorize`);
  return response.data.data;
}

export async function reauthorizeIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<IntegrationAuthorizationResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationAuthorizationResponse;
  }>(`/businesses/${businessId}/integrations/${connectionId}/reauthorize`);
  return response.data.data;
}

export async function updateIntegrationConnection(
  businessId: string,
  connectionId: string,
  input: {
    displayName?: string;
    defaultBranchId?: string;
    demoScenario?: IntegrationDemoScenario;
    phoneNumberId?: string;
    wabaId?: string;
    displayPhoneNumber?: string;
    providerAccountId?: string;
    providerAccountLabel?: string;
    providerAccountType?: string;
    temporaryAccessToken?: string;
    gmailFeedbackLabel?: string;
  }
): Promise<IntegrationConnection> {
  const response = await apiClient.patch<{
    success: boolean;
    data: IntegrationConnection;
  }>(`/businesses/${businessId}/integrations/${connectionId}`, input);
  return response.data.data;
}

export async function testIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<IntegrationHealth> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationHealth;
  }>(`/businesses/${businessId}/integrations/${connectionId}/test`);
  return response.data.data;
}

export async function syncIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<SynchronizationRun> {
  const response = await apiClient.post<{
    success: boolean;
    data: SynchronizationRun;
  }>(`/businesses/${businessId}/integrations/${connectionId}/sync`);
  return response.data.data;
}

export async function pauseIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<IntegrationConnection> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationConnection;
  }>(`/businesses/${businessId}/integrations/${connectionId}/pause`);
  return response.data.data;
}

export async function resumeIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<IntegrationConnection> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationConnection;
  }>(`/businesses/${businessId}/integrations/${connectionId}/resume`);
  return response.data.data;
}

export async function disconnectIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<IntegrationConnection> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationConnection;
  }>(`/businesses/${businessId}/integrations/${connectionId}/disconnect`);
  return response.data.data;
}

export async function reconnectIntegrationConnection(
  businessId: string,
  connectionId: string
): Promise<IntegrationConnection | IntegrationAuthorizationResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: IntegrationConnection | IntegrationAuthorizationResponse;
  }>(`/businesses/${businessId}/integrations/${connectionId}/reconnect`);
  return response.data.data;
}

export async function fetchConnectionRuns(
  businessId: string,
  connectionId: string,
  params: { page?: number; pageSize?: number; status?: SynchronizationRunStatus } = {}
): Promise<SynchronizationRunsResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: SynchronizationRunsResponse;
  }>(`/businesses/${businessId}/integrations/${connectionId}/runs`, { params });
  return response.data.data;
}

export async function fetchConnectionWebhookActivity(
  businessId: string,
  connectionId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<WebhookActivityResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: WebhookActivityResponse;
  }>(`/businesses/${businessId}/integrations/${connectionId}/activity`, { params });
  return response.data.data;
}

export async function fetchRunItems(
  businessId: string,
  runId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<SynchronizationItemsResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: SynchronizationItemsResponse;
  }>(`/businesses/${businessId}/integration-runs/${runId}/items`, { params });
  return response.data.data;
}

export async function retrySynchronizationItem(
  businessId: string,
  runId: string,
  itemId: string
): Promise<SynchronizationRun> {
  const response = await apiClient.post<{
    success: boolean;
    data: SynchronizationRun;
  }>(`/businesses/${businessId}/integration-runs/${runId}/items/${itemId}/retry`);
  return response.data.data;
}
