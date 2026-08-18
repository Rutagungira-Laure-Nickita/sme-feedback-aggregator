import { apiClient } from "../../api/axios.js";
import type { ReportDocument } from "../admin/types.js";

export type BusinessReportRequest = {
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  channel?: string;
  status?: string;
  sentiment?: string;
  comparePreviousPeriod: boolean;
};

function unwrapReport(value: unknown): ReportDocument {
  return (value as { data?: unknown }).data as ReportDocument;
}

export async function previewBusinessReport(
  businessId: string,
  input: BusinessReportRequest
): Promise<ReportDocument> {
  const response = await apiClient.post<unknown>(
    `/businesses/${businessId}/reports/preview`,
    input
  );
  return unwrapReport(response.data);
}

export async function exportBusinessReport(
  businessId: string,
  input: BusinessReportRequest & { outputFormat: "PDF" | "CSV" }
): Promise<void> {
  const response = await apiClient.post<Blob>(
    `/businesses/${businessId}/reports/export`,
    input,
    { responseType: "blob" }
  );
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename =
    disposition?.match(/filename="([^"]+)"/)?.[1] ??
    `business-performance-report.${input.outputFormat.toLowerCase()}`;
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
