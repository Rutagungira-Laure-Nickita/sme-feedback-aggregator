import { z } from "zod";
import { apiClient } from "../../api/axios.js";
import type {
  AdminDashboard,
  AdminFeedbackRecord,
  AdminFeedbackDetail,
  AdminFilterOptions,
  AdminIntegrationRecord,
  AdminIntegrationDetail,
  AdminPeriod,
  AdminSystemHealth,
  AdminUserRecord,
  AdminUserDetail,
  Pagination,
  ReportDocument,
  ReportRequest
} from "./types.js";

const envelopeSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.unknown()
});

function unwrap<T>(value: unknown): T {
  return envelopeSchema.parse(value).data as T;
}

export async function fetchAdminDashboard(period: AdminPeriod): Promise<AdminDashboard> {
  const response = await apiClient.get<unknown>("/admin/dashboard", {
    params: { period }
  });
  return unwrap<AdminDashboard>(response.data);
}

export async function fetchAdminFilterOptions(): Promise<AdminFilterOptions> {
  const response = await apiClient.get<unknown>("/admin/filter-options");
  return unwrap<AdminFilterOptions>(response.data);
}

export async function fetchAdminUsers(params: Record<string, string | undefined>) {
  const response = await apiClient.get<unknown>("/admin/users", { params });
  return unwrap<{ users: AdminUserRecord[]; pagination: Pagination }>(response.data);
}

export async function fetchAdminUser(userId: string) {
  const response = await apiClient.get<unknown>(`/admin/users/${userId}`);
  return unwrap<{ user: AdminUserDetail }>(response.data).user;
}

export async function applyAdminUserAction(
  userId: string,
  action:
    | "VERIFY_EMAIL"
    | "UNVERIFY_EMAIL"
    | "SUSPEND"
    | "REACTIVATE"
    | "DISABLE"
    | "REVOKE_SESSIONS"
) {
  const response = await apiClient.post<unknown>(`/admin/users/${userId}/action`, {
    action
  });
  return unwrap<{ user: AdminUserRecord }>(response.data).user;
}

export async function fetchAdminFeedback(params: Record<string, string | undefined>) {
  const response = await apiClient.get<unknown>("/admin/feedback", { params });
  return unwrap<{ feedback: AdminFeedbackRecord[]; pagination: Pagination }>(
    response.data
  );
}

export async function fetchAdminFeedbackDetail(feedbackId: string) {
  const response = await apiClient.get<unknown>(`/admin/feedback/${feedbackId}`);
  return unwrap<{ feedback: AdminFeedbackDetail }>(response.data).feedback;
}

export async function fetchAdminIntegrations(params: Record<string, string | undefined>) {
  const response = await apiClient.get<unknown>("/admin/integrations", { params });
  return unwrap<{
    integrations: AdminIntegrationRecord[];
    pagination: Pagination;
  }>(response.data);
}

export async function fetchAdminIntegration(connectionId: string) {
  const response = await apiClient.get<unknown>(`/admin/integrations/${connectionId}`);
  return unwrap<{ integration: AdminIntegrationDetail }>(response.data).integration;
}

export async function applyAdminIntegrationAction(
  connectionId: string,
  action: "PAUSE" | "RESUME" | "DISCONNECT"
) {
  const response = await apiClient.post<unknown>(
    `/admin/integrations/${connectionId}/action`,
    { action }
  );
  return unwrap<{ integration: AdminIntegrationRecord }>(response.data).integration;
}

export async function fetchAdminSystemHealth(): Promise<AdminSystemHealth> {
  const response = await apiClient.get<unknown>("/admin/system-health");
  return unwrap<AdminSystemHealth>(response.data);
}

export async function previewAdminReport(input: ReportRequest): Promise<ReportDocument> {
  const response = await apiClient.post<unknown>("/admin/reports/preview", input);
  return unwrap<ReportDocument>(response.data);
}

export async function exportAdminReport(
  input: ReportRequest & { outputFormat: "PDF" | "CSV" }
): Promise<void> {
  const response = await apiClient.post<Blob>("/admin/reports/export", input, {
    responseType: "blob"
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename =
    disposition?.match(/filename="([^"]+)"/)?.[1] ??
    `sme-feedback-report.${input.outputFormat.toLowerCase()}`;
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
