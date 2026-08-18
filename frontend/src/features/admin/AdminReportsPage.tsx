import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2
} from "lucide-react";
import { useMemo, useState } from "react";
import { normalizeApiError } from "../../api/axios.js";
import { AdminShell, WorkspacePanel } from "../businesses/components.js";
import { formatRole } from "../businesses/format.js";
import { exportAdminReport, fetchAdminFilterOptions, previewAdminReport } from "./api.js";
import { getReportComparisonPreview, getReportSectionPreview } from "./report-preview.js";
import type { AdminReportType, ReportDocument, ReportRequest } from "./types.js";
import { usePlatformSettings } from "../platform-settings/PlatformSettingsContext.js";

const ADMIN_REPORTS: Array<{
  value: AdminReportType;
  label: string;
  description: string;
}> = [
  {
    value: "EXECUTIVE_PLATFORM",
    label: "Executive Platform Report",
    description:
      "Platform-wide businesses, users, customers, feedback, sentiment, integrations, workload, and key management indicators."
  },
  {
    value: "FEEDBACK_CUSTOMER_EXPERIENCE",
    label: "Feedback & Customer Experience Report",
    description:
      "Detailed customer feedback, channels, sentiment, priorities, categories, workflow, and response workload."
  },
  {
    value: "OPERATIONS_SYSTEM_HEALTH",
    label: "Operations & System Health Report",
    description:
      "Core services, integrations, webhooks, AI processing, automation, and administrative operational health."
  }
];

export function AdminReportsPage(): JSX.Element {
  const { settings } = usePlatformSettings();
  const initialDates = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (settings.defaultReportRangeDays - 1));
    return { from: toInputDate(from), to: toInputDate(to) };
  }, [settings.defaultReportRangeDays]);
  const [request, setRequest] = useState<ReportRequest>({
    reportType: "EXECUTIVE_PLATFORM",
    dateFrom: initialDates.from,
    dateTo: initialDates.to,
    comparePreviousPeriod: true
  });
  const [format, setFormat] = useState<"PDF" | "CSV">("PDF");
  const options = useQuery({
    queryKey: ["admin", "filter-options"],
    queryFn: fetchAdminFilterOptions,
    staleTime: 60_000
  });
  const preview = useMutation({ mutationFn: previewAdminReport });
  const download = useMutation({
    mutationFn: () => exportAdminReport({ ...request, outputFormat: format })
  });
  const branches = (options.data?.branches ?? []).filter(
    (item) => !request.businessId || item.businessId === request.businessId
  );
  const selected = ADMIN_REPORTS.find((item) => item.value === request.reportType)!;
  const isFeedbackReport = request.reportType === "FEEDBACK_CUSTOMER_EXPERIENCE";
  const isOperationsReport = request.reportType === "OPERATIONS_SYSTEM_HEALTH";
  const validationMessage = reportValidationMessage(request);
  const update = <K extends keyof ReportRequest>(key: K, value: ReportRequest[K]) => {
    preview.reset();
    setRequest((current) => ({
      ...current,
      [key]: value,
      ...(key === "businessId" ? { branchId: undefined } : {})
    }));
  };
  const changeReportType = (reportType: AdminReportType) => {
    preview.reset();
    setRequest((current) => ({
      reportType,
      dateFrom: current.dateFrom,
      dateTo: current.dateTo,
      businessId: current.businessId,
      branchId: reportType === "OPERATIONS_SYSTEM_HEALTH" ? undefined : current.branchId,
      channel:
        reportType === "FEEDBACK_CUSTOMER_EXPERIENCE" ? current.channel : undefined,
      status: reportType === "FEEDBACK_CUSTOMER_EXPERIENCE" ? current.status : undefined,
      sentiment:
        reportType === "FEEDBACK_CUSTOMER_EXPERIENCE" ? current.sentiment : undefined,
      provider: reportType === "OPERATIONS_SYSTEM_HEALTH" ? current.provider : undefined,
      comparePreviousPeriod: current.comparePreviousPeriod
    }));
  };

  return (
    <AdminShell
      title="Reporting center"
      subtitle="Generate database-backed stakeholder reports as professional PDF or tabular CSV exports."
    >
      <div className="space-y-6">
        <WorkspacePanel className="h-fit">
          <h2 className="text-lg font-bold">Report configuration</h2>
          <p className="mt-1 text-sm font-medium text-app-text-muted">
            Reports are generated on demand. Files and report history are not persisted.
          </p>
          <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportSelect
              label="Report type"
              value={request.reportType}
              onChange={(value) => changeReportType(value as AdminReportType)}
              options={ADMIN_REPORTS.map((item) => ({
                value: item.value,
                label: item.label
              }))}
              className="md:col-span-2 xl:col-span-4"
            />
            <p className="rounded-md bg-app-primary-soft p-3 text-xs font-semibold leading-5 text-app-primary md:col-span-2 xl:col-span-4">
              {selected.description}
            </p>
            <ReportDate
              label="Date from"
              value={request.dateFrom}
              onChange={(value) => update("dateFrom", value)}
            />
            <ReportDate
              label="Date to"
              value={request.dateTo}
              onChange={(value) => update("dateTo", value)}
            />
            <ReportSelect
              label="Business"
              value={request.businessId ?? ""}
              onChange={(value) => update("businessId", value || undefined)}
              options={(options.data?.businesses ?? []).map((item) => ({
                value: item.id,
                label: item.name
              }))}
              allLabel="All Businesses"
            />
            {!isOperationsReport ? (
              <ReportSelect
                label="Branch"
                value={request.branchId ?? ""}
                onChange={(value) => update("branchId", value || undefined)}
                options={branches.map((item) => ({ value: item.id, label: item.name }))}
                allLabel="All Branches"
              />
            ) : null}
            {isFeedbackReport ? (
              <ReportSelect
                label="Channel"
                value={request.channel ?? ""}
                onChange={(value) => update("channel", value || undefined)}
                options={[
                  "MANUAL",
                  "PUBLIC_FORM",
                  "QR_CODE",
                  "WHATSAPP",
                  "EMAIL",
                  "GOOGLE_REVIEW",
                  "FACEBOOK",
                  "INSTAGRAM",
                  "X",
                  "OTHER"
                ].map((value) => ({ value, label: formatRole(value) }))}
                allLabel="All Channels"
              />
            ) : null}
            {isFeedbackReport ? (
              <ReportSelect
                label="Workflow status"
                value={request.status ?? ""}
                onChange={(value) => update("status", value || undefined)}
                options={["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"].map((value) => ({
                  value,
                  label: formatRole(value)
                }))}
                allLabel="All Statuses"
              />
            ) : null}
            {isFeedbackReport ? (
              <ReportSelect
                label="Sentiment"
                value={request.sentiment ?? ""}
                onChange={(value) => update("sentiment", value || undefined)}
                options={["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"].map((value) => ({
                  value,
                  label: formatRole(value)
                }))}
                allLabel="All Sentiments"
              />
            ) : null}
            {isOperationsReport ? (
              <ReportSelect
                label="Provider"
                value={request.provider ?? ""}
                onChange={(value) => update("provider", value || undefined)}
                options={[
                  "GOOGLE_REVIEWS",
                  "WHATSAPP",
                  "EMAIL",
                  "X",
                  "FACEBOOK",
                  "INSTAGRAM"
                ].map((value) => ({ value, label: formatRole(value) }))}
                allLabel="All Providers"
              />
            ) : null}
            <label className="flex items-start gap-3 rounded-md border border-app-border p-3 xl:col-span-1">
              <input
                type="checkbox"
                checked={request.comparePreviousPeriod}
                onChange={(event) =>
                  update("comparePreviousPeriod", event.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-app-primary"
              />
              <span>
                <span className="block text-sm font-bold">Compare previous period</span>
                <span className="mt-1 block text-xs font-medium text-app-text-muted">
                  Included only when the same filter window can be compared correctly.
                </span>
              </span>
            </label>
            <div className="md:col-span-1">
              <p className="mb-2 text-xs font-bold text-app-text-muted">Output format</p>
              <div className="grid grid-cols-2 gap-2">
                {(["PDF", "CSV"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm font-bold ${format === value ? "border-app-primary bg-app-primary-soft text-app-primary" : "border-app-border"}`}
                  >
                    {value === "PDF" ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-2 xl:self-end">
              <button
                type="button"
                onClick={() => preview.mutate(request)}
                disabled={preview.isPending || Boolean(validationMessage)}
                className="min-h-11 rounded-md border border-app-border text-sm font-bold disabled:opacity-50"
              >
                {preview.isPending ? "Preparing…" : "Preview"}
              </button>
              <button
                type="button"
                onClick={() => download.mutate()}
                disabled={download.isPending || Boolean(validationMessage)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-app-primary px-3 text-sm font-bold text-app-primary-foreground disabled:opacity-50"
              >
                {download.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {download.isPending ? "Generating…" : `Download ${format}`}
              </button>
            </div>
            {preview.error || download.error ? (
              <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 md:col-span-2 xl:col-span-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {normalizeApiError(preview.error ?? download.error).message}
              </div>
            ) : null}
            {validationMessage ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 md:col-span-2 xl:col-span-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {validationMessage}
              </div>
            ) : null}
          </div>
        </WorkspacePanel>

        <ReportPreview
          report={preview.data}
          selected={selected}
          request={request}
          options={options.data}
          onPreview={() => preview.mutate(request)}
          isPreparing={preview.isPending}
        />
      </div>
    </AdminShell>
  );
}

function ReportPreview({
  report,
  selected,
  request,
  options,
  onPreview,
  isPreparing
}: {
  report?: ReportDocument;
  selected: (typeof ADMIN_REPORTS)[number];
  request: ReportRequest;
  options?: Awaited<ReturnType<typeof fetchAdminFilterOptions>>;
  onPreview: () => void;
  isPreparing: boolean;
}) {
  if (!report)
    return (
      <WorkspacePanel className="border-app-primary-border/70">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-soft text-app-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold">{selected.label}</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
                  {selected.description}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SummaryValue
                label="Period"
                value={`${formatDate(request.dateFrom)} – ${formatDate(request.dateTo)}`}
              />
              <SummaryValue
                label="Business"
                value={
                  options?.businesses.find((item) => item.id === request.businessId)
                    ?.name ?? "All Businesses"
                }
              />
              <SummaryValue
                label="Branch"
                value={
                  request.reportType === "OPERATIONS_SYSTEM_HEALTH"
                    ? "Not applicable"
                    : (options?.branches.find((item) => item.id === request.branchId)
                        ?.name ?? "All Branches")
                }
              />
              <SummaryValue label="Scope" value={reportScopeLabel(request)} />
            </dl>
          </div>
          <button
            type="button"
            onClick={onPreview}
            disabled={isPreparing || Boolean(reportValidationMessage(request))}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-app-primary px-5 text-sm font-bold text-app-primary-foreground hover:bg-app-primary-hover disabled:opacity-50 lg:w-auto"
          >
            {isPreparing ? "Preparing…" : "Preview Report"}
          </button>
        </div>
      </WorkspacePanel>
    );
  const comparisonPreview = getReportComparisonPreview(
    report,
    request.comparePreviousPeriod
  );
  return (
    <div className="space-y-5">
      <WorkspacePanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-primary">
              SME Feedback · Platform Administration
            </p>
            <h2 className="mt-2 text-2xl font-bold">{report.title}</h2>
            <p className="mt-2 text-sm font-medium text-app-text-muted">
              {formatDate(report.period.from)} – {formatDate(report.period.to)} ·
              generated {formatDateTime(report.generatedAt)}
            </p>
            <p className="mt-1 text-sm font-semibold text-app-text-muted">
              Scope: {report.scope.label}
            </p>
          </div>
          <FileText className="h-7 w-7 text-app-primary" />
        </div>
        <div className="mt-4 rounded-md border border-app-border bg-app-surface-muted p-3 text-sm text-app-text-muted">
          {report.scope.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {report.highlights.map((item) => (
            <div key={item.label} className="rounded-md bg-app-surface-muted p-4">
              <p className="text-xs font-bold text-app-text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">
                {typeof item.value === "number"
                  ? new Intl.NumberFormat().format(item.value)
                  : item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-md border border-app-primary-border bg-app-primary-soft/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-app-primary">
            Management Summary
          </p>
          <p className="mt-2 text-sm font-semibold leading-6">
            {report.managementSummary}
          </p>
        </div>
        {comparisonPreview ? (
          <div className="mt-5 rounded-md border border-app-border p-4">
            <p className="text-xs font-bold uppercase text-app-text-muted">
              Previous-period comparison
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-app-border">
                    {comparisonPreview.headers.map((header, index) => (
                      <th
                        key={header}
                        className={`pb-3 pr-4 text-xs font-bold uppercase text-app-text-muted ${index > 0 && index < 4 ? "text-right" : ""}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonPreview.rows.map((row) => (
                    <tr
                      key={String(row[0])}
                      className="border-b border-app-border last:border-0"
                    >
                      {row.map((cell, index) => (
                        <td
                          key={`${String(row[0])}-${index}`}
                          className={`py-3 pr-4 font-semibold ${index > 0 && index < 4 ? "text-right tabular-nums" : ""}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </WorkspacePanel>
      {report.sections.map((section) => {
        const sectionPreview = getReportSectionPreview(section);
        return (
          <WorkspacePanel key={section.title}>
            <h3 className="font-bold">{section.title}</h3>
            {section.description ? (
              <p className="mt-1 text-sm text-app-text-muted">{section.description}</p>
            ) : null}
            <div className="mt-4 overflow-x-auto">
              {section.rows.length ? (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-app-border">
                      {section.headers.map((header) => (
                        <th
                          key={header}
                          className="pb-3 pr-4 text-xs font-bold uppercase text-app-text-muted"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionPreview.rows.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-app-border last:border-0"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={`py-3 pr-4 font-semibold ${cellIndex === 0 ? semanticTextClass(String(cell ?? ""), section.semantic) : ""} ${section.title === "Important customer experience feedback" && section.headers[cellIndex] === "Feedback" ? "min-w-72 max-w-lg whitespace-pre-wrap break-words align-top" : ""}`}
                          >
                            {formatPreviewReportCell(section, cell, cellIndex)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="rounded-md bg-app-surface-muted p-4 text-sm font-semibold text-app-text-muted">
                  {section.emptyMessage ?? "No persisted data matched this section."}
                </p>
              )}
            </div>
            {sectionPreview.message ? (
              <p className="mt-3 text-xs font-semibold text-app-text-muted">
                {sectionPreview.message}
              </p>
            ) : null}
          </WorkspacePanel>
        );
      })}
    </div>
  );
}

function ReportSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-bold text-app-text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold"
      >
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-app-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}
function ReportDate({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-app-text-muted">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold"
      />
    </label>
  );
}
function reportValidationMessage(request: ReportRequest) {
  if (!request.dateFrom || !request.dateTo) return "Choose both report dates.";
  if (request.dateFrom > request.dateTo) return "Date From must be on or before Date To.";
  const from = new Date(`${request.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${request.dateTo}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return "Choose valid report dates.";
  if (to.getTime() - from.getTime() > 366 * 86_400_000)
    return "Reports can cover at most 366 days.";
  return null;
}

function reportScopeLabel(request: ReportRequest) {
  if (request.reportType === "OPERATIONS_SYSTEM_HEALTH")
    return request.provider ? formatRole(request.provider) : "All Providers";
  if (request.reportType === "FEEDBACK_CUSTOMER_EXPERIENCE")
    return `${request.channel ? formatRole(request.channel) : "All Channels"} · ${request.status ? formatRole(request.status) : "All Statuses"} · ${request.sentiment ? formatRole(request.sentiment) : "All Sentiments"}`;
  return request.comparePreviousPeriod
    ? "Management scope · comparison enabled"
    : "Management scope";
}

function formatPreviewReportCell(
  section: ReportDocument["sections"][number],
  value: string | number | null,
  cellIndex: number
) {
  if (
    section.title === "Important customer experience feedback" &&
    section.headers[cellIndex] === "Feedback" &&
    typeof value === "string"
  ) {
    const maximum = 320;
    return value.length > maximum ? `${value.slice(0, maximum - 1)}\u2026` : value;
  }
  return formatReportCell(value);
}

function formatReportCell(value: string | number | null) {
  if (value === null) return "Not set";
  return typeof value === "number"
    ? new Intl.NumberFormat().format(value)
    : /^[A-Z][A-Z0-9_]*$/.test(value)
      ? formatRole(value)
      : value;
}

function semanticTextClass(value: string, semantic?: "SENTIMENT" | "HEALTH") {
  const normalized = value.toUpperCase().replaceAll(" ", "_");
  if (semantic === "SENTIMENT") {
    if (normalized === "POSITIVE") return "text-emerald-700 dark:text-emerald-300";
    if (normalized === "NEGATIVE") return "text-red-700 dark:text-red-300";
    if (normalized === "MIXED") return "text-amber-700 dark:text-amber-300";
    return "text-app-text-muted";
  }
  if (semantic === "HEALTH") {
    if (
      [
        "HEALTHY",
        "OPERATIONAL",
        "COMPLETED",
        "SUCCESS",
        "IMPORTED",
        "ACTIVE",
        "CONNECTED"
      ].includes(normalized)
    )
      return "text-emerald-700 dark:text-emerald-300";
    if (
      [
        "FAILED",
        "ERROR",
        "DEGRADED",
        "NEEDS_ATTENTION",
        "SUSPENDED",
        "REJECTED"
      ].includes(normalized)
    )
      return "text-red-700 dark:text-red-300";
    if (["PENDING", "PAUSED", "PROCESSING", "COMPLETED_WITH_ERRORS"].includes(normalized))
      return "text-amber-700 dark:text-amber-300";
  }
  return "";
}
function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(value));
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
