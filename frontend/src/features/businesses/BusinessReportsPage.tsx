import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2
} from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { useAuthStore } from "../../store/authStore.js";
import { usePlatformSettings } from "../platform-settings/PlatformSettingsContext.js";
import { getReportSectionPreview } from "../admin/report-preview.js";
import type { ReportDocument } from "../admin/types.js";
import { fetchBranches, fetchBusiness, fetchMyBusinesses } from "./api/businessApi.js";
import { EmptyState, WorkspacePanel, WorkspaceShell } from "./components.js";
import { getChannelLabel, getStatusLabel } from "./feedbackInboxLabels.js";
import {
  exportBusinessReport,
  previewBusinessReport,
  type BusinessReportRequest
} from "./reportsApi.js";
import { OPERATIONAL_FEEDBACK_CHANNEL_OPTIONS } from "./supportedSources.js";

const CHANNELS = OPERATIONAL_FEEDBACK_CHANNEL_OPTIONS.map((option) => option.value);

const STATUSES = ["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;

const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"] as const;

const REPORT_DESCRIPTION =
  "Review the original customer feedback that matches your selected filters.";

export function BusinessReportsPage(): JSX.Element {
  const { businessId = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const { settings } = usePlatformSettings();
  const initialDates = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (settings.defaultReportRangeDays - 1));
    return { from: toInputDate(from), to: toInputDate(to) };
  }, [settings.defaultReportRangeDays]);
  const [request, setRequest] = useState<BusinessReportRequest>({
    dateFrom: initialDates.from,
    dateTo: initialDates.to,
    comparePreviousPeriod: false
  });
  const [format, setFormat] = useState<"PDF" | "CSV">("PDF");

  const mineQuery = useQuery({
    queryKey: ["businesses", "mine"],
    queryFn: () => fetchMyBusinesses({ pageSize: 100 })
  });
  const activeBusiness = mineQuery.data?.businesses.find(
    (business) => business.id === businessId
  );
  const businessQuery = useQuery({
    queryKey: ["businesses", businessId],
    queryFn: () => fetchBusiness(businessId),
    enabled: Boolean(businessId && activeBusiness)
  });
  const branchesQuery = useQuery({
    queryKey: ["businesses", businessId, "branches", "report-options"],
    queryFn: () => fetchBranches(businessId, { status: "ACTIVE" }),
    enabled: Boolean(businessId && activeBusiness)
  });

  const preview = useMutation({
    mutationFn: () => previewBusinessReport(businessId, request)
  });
  const download = useMutation({
    mutationFn: () =>
      exportBusinessReport(businessId, { ...request, outputFormat: format })
  });

  const branches = branchesQuery.data?.branches ?? [];
  const validationMessage = reportValidationMessage(request);
  const update = <K extends keyof BusinessReportRequest>(
    key: K,
    value: BusinessReportRequest[K]
  ) => {
    preview.reset();
    setRequest((current) => ({ ...current, [key]: value }));
  };

  if (user?.role !== "BUSINESS_OWNER") {
    return (
      <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
        <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[1380px] rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-3rem)]">
          <div className="p-10">
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden="true" />}
              title="Owner access required"
              description="Business reporting is limited to Business Owner accounts for the authorized business."
            />
          </div>
        </section>
      </main>
    );
  }

  if (!businessId || (mineQuery.data && !activeBusiness)) {
    return <Navigate to="/business" replace />;
  }

  if (mineQuery.isLoading || businessQuery.isLoading || branchesQuery.isLoading) {
    return (
      <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
        <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[1380px] rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-3rem)]">
          <div className="p-10">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-64 rounded bg-app-surface-muted" />
              <div className="h-4 w-96 rounded bg-app-surface-muted" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-app-surface-muted" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!activeBusiness || !businessQuery.data) {
    return (
      <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
        <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[1380px] rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-3rem)]">
          <div className="p-10">
            <EmptyState
              title="Reports unavailable"
              description={
                businessQuery.error || mineQuery.error
                  ? normalizeApiError(businessQuery.error ?? mineQuery.error).message
                  : "This workspace could not be loaded."
              }
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <WorkspaceShell
      title="Reports"
      subtitle="Detailed customer feedback"
      businesses={mineQuery.data?.businesses ?? []}
      activeBusiness={activeBusiness}
    >
      <div className="space-y-6">
        <WorkspacePanel className="h-fit">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-primary">
                Customer Feedback Report
              </p>
              <h2 className="mt-2 text-xl font-bold">
                Detailed Customer Feedback Report
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-app-text-muted">
                {REPORT_DESCRIPTION}
              </p>
            </div>
            <FileText className="h-7 w-7 shrink-0 text-app-primary" aria-hidden="true" />
          </div>
          <p className="mt-4 text-xs font-semibold text-app-text-muted">
            Reports are generated on demand for {activeBusiness.name}. Files and report
            history are not persisted.
          </p>
        </WorkspacePanel>

        <WorkspacePanel className="h-fit">
          <h3 className="text-sm font-bold">Report filters</h3>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              label="Branch"
              value={request.branchId ?? ""}
              onChange={(value) => update("branchId", value || undefined)}
              options={branches.map((item) => ({ value: item.id, label: item.name }))}
              allLabel="All Branches"
            />
            <ReportSelect
              label="Channel"
              value={request.channel ?? ""}
              onChange={(value) => update("channel", value || undefined)}
              options={CHANNELS.map((value) => ({
                value,
                label: getChannelLabel(value)
              }))}
              allLabel="All Channels"
            />
            <ReportSelect
              label="Workflow status"
              value={request.status ?? ""}
              onChange={(value) => update("status", value || undefined)}
              options={STATUSES.map((value) => ({
                value,
                label: getStatusLabel(value)
              }))}
              allLabel="All Statuses"
            />
            <ReportSelect
              label="Sentiment"
              value={request.sentiment ?? ""}
              onChange={(value) => update("sentiment", value || undefined)}
              options={SENTIMENTS.map((value) => ({
                value,
                label: sentimentLabel(value)
              }))}
              allLabel="All Sentiments"
            />
            <div>
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
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                    )}
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-2 xl:self-end">
              <button
                type="button"
                onClick={() => preview.mutate()}
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
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4" aria-hidden="true" />
                )}
                {download.isPending ? "Generating…" : `Download ${format}`}
              </button>
            </div>
            {preview.error || download.error ? (
              <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 sm:col-span-2 xl:col-span-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {normalizeApiError(preview.error ?? download.error).message}
              </div>
            ) : null}
            {validationMessage ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2 xl:col-span-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {validationMessage}
              </div>
            ) : null}
          </div>
        </WorkspacePanel>

        <ReportPreview
          report={preview.data}
          request={request}
          onPreview={() => preview.mutate()}
          isPreparing={preview.isPending}
          businessName={activeBusiness.name}
          branchName={branches.find((item) => item.id === request.branchId)?.name}
        />
      </div>
    </WorkspaceShell>
  );
}

function ReportPreview({
  report,
  request,
  onPreview,
  isPreparing,
  businessName,
  branchName
}: {
  report?: ReportDocument;
  request: BusinessReportRequest;
  onPreview: () => void;
  isPreparing: boolean;
  businessName: string;
  branchName?: string;
}) {
  if (!report)
    return (
      <WorkspacePanel>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-soft text-app-primary">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Detailed Customer Feedback Report</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
                  {REPORT_DESCRIPTION}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SummaryValue label="Business" value={businessName} />
              <SummaryValue
                label="Period"
                value={`${formatDate(request.dateFrom)} – ${formatDate(request.dateTo)}`}
              />
              <SummaryValue label="Branch" value={branchName ?? "All Branches"} />
              <SummaryValue
                label="Scope"
                value={`${request.channel ? getChannelLabel(request.channel) : "All Channels"} · ${request.status ? getStatusLabel(request.status) : "All Statuses"} · ${request.sentiment ? sentimentLabel(request.sentiment) : "All Sentiments"}`}
              />
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
  return (
    <div className="space-y-5">
      <WorkspacePanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-primary">
              {report.branding.platformName} · Business Reporting
            </p>
            <h2 className="mt-2 text-2xl font-bold">Detailed Customer Feedback Report</h2>
            <p className="mt-2 text-sm font-medium text-app-text-muted">
              {formatDate(report.period.from)} – {formatDate(report.period.to)} ·
              generated {formatDateTime(report.generatedAt)}
            </p>
            <p className="mt-1 text-sm font-semibold text-app-text-muted">
              Scope: {report.scope.label}
            </p>
          </div>
          <FileText className="h-7 w-7 shrink-0 text-app-primary" aria-hidden="true" />
        </div>
      </WorkspacePanel>
      {report.sections.filter(isDetailedFeedbackSection).map((section) => {
        const sectionPreview = getReportSectionPreview(section);
        return (
          <DetailedFeedbackRecordsSection
            key={section.title}
            section={section}
            rows={sectionPreview.rows}
            previewMessage={sectionPreview.message}
          />
        );
      })}
    </div>
  );
}

function isImportantFeedbackCell(
  section: ReportDocument["sections"][number],
  cellIndex: number
) {
  return (
    section.title === "Important customer experience feedback" &&
    section.headers[cellIndex] === "Feedback"
  );
}

function isDetailedFeedbackSection(section: ReportDocument["sections"][number]) {
  return (
    section.title === "Detailed Feedback Records" &&
    section.headers.join("|") ===
      "Customer / Sender|Feedback|Channel|Date|Category|Status"
  );
}

function DetailedFeedbackRecordsSection({
  section,
  rows,
  previewMessage
}: {
  section: ReportDocument["sections"][number];
  rows: Array<Array<string | number | null>>;
  previewMessage: string | null;
}) {
  return (
    <WorkspacePanel>
      <section className="mb-6 border-b border-app-border pb-5">
        <h3 className="font-bold">Feedback by Channel</h3>
        <dl className="mt-3 space-y-2 text-sm">
          {["Gmail", "WhatsApp", "Manual Entry", "Public Form"].map((channel) => (
            <div key={channel} className="flex gap-2">
              <dt className="font-semibold">{channel}:</dt>
              <dd>
                {new Intl.NumberFormat().format(
                  section.rows.filter((row) => row[2] === channel).length
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold">{section.title}</h3>
          {section.description ? (
            <p className="mt-1 max-w-4xl text-sm leading-6 text-app-text-muted">
              {section.description}
            </p>
          ) : null}
        </div>
        <span className="w-fit rounded-full bg-app-primary-soft px-3 py-1 text-xs font-bold text-app-primary">
          {new Intl.NumberFormat().format(section.rows.length)} records
        </span>
      </div>

      {rows.length ? (
        <>
          <div className="mt-4 hidden max-w-full overflow-x-auto md:block">
            <table className="w-full min-w-[860px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[35%]" />
                <col className="w-[10%]" />
                <col className="w-[15%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-app-border bg-app-surface-muted/70">
                  {section.headers.map((header) => (
                    <th
                      key={header}
                      className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-app-text-muted"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={`${String(row[3] ?? "feedback")}-${rowIndex}`}
                    className="border-b border-app-border align-top last:border-0"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`px-3 py-4 font-semibold ${cellIndex === 0 ? "break-all" : "break-words"} ${cellIndex === 1 ? "whitespace-pre-wrap leading-6" : ""}`}
                      >
                        {formatPreviewCell(section, cell, cellIndex)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((row, rowIndex) => (
              <article
                key={`${String(row[3] ?? "feedback")}-${rowIndex}`}
                className="min-w-0 rounded-lg border border-app-border bg-app-surface-muted/45 p-4"
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-app-text-muted">
                      Customer / Sender
                    </p>
                    <p className="mt-1 break-all font-bold">
                      {String(row[0] ?? "Unknown customer")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-app-primary-soft px-2.5 py-1 text-xs font-bold text-app-primary">
                      {String(row[2] ?? "Unknown channel")}
                    </span>
                    <span className="rounded-full border border-app-border px-2.5 py-1 text-xs font-bold">
                      {String(row[5] ?? "Not set")}
                    </span>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm font-semibold leading-6">
                  {formatPreviewCell(section, row[1] ?? null, 1)}
                </p>
                <dl className="mt-4 grid min-w-0 gap-3 border-t border-app-border pt-3 sm:grid-cols-2">
                  <SummaryValue
                    label="Date"
                    value={String(formatPreviewCell(section, row[3] ?? null, 3))}
                  />
                  <SummaryValue
                    label="Category"
                    value={String(row[4] ?? "Uncategorized")}
                  />
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-md bg-app-surface-muted p-4 text-sm font-semibold text-app-text-muted">
          {section.emptyMessage ?? "No feedback matched the selected period and filters."}
        </p>
      )}

      {previewMessage ? (
        <p className="mt-3 text-xs font-semibold text-app-text-muted">{previewMessage}</p>
      ) : null}
    </WorkspacePanel>
  );
}

function formatPreviewCell(
  section: ReportDocument["sections"][number],
  value: string | number | null,
  cellIndex: number
) {
  if (isDetailedFeedbackSection(section)) {
    if (section.headers[cellIndex] === "Feedback" && typeof value === "string") {
      const maximum = 480;
      return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
    }
    if (section.headers[cellIndex] === "Date" && typeof value === "string") {
      return formatDateTime(value);
    }
    if (value === null) return "Not set";
    return typeof value === "number" ? new Intl.NumberFormat().format(value) : value;
  }
  if (isImportantFeedbackCell(section, cellIndex) && typeof value === "string") {
    const maximum = 320;
    return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
  }
  if (value === null) return "Not set";
  if (typeof value === "number") return new Intl.NumberFormat().format(value);
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) return friendlyEnum(value);
  return value;
}

function friendlyEnum(value: string) {
  const mapped = channelOrStatusLabel(value);
  if (mapped !== value) return mapped;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function channelOrStatusLabel(value: string) {
  const channelLabel = getChannelLabel(value);
  return channelLabel === value ? getStatusLabel(value) : channelLabel;
}

function sentimentLabel(value: string) {
  const labels: Record<string, string> = {
    POSITIVE: "Positive",
    NEUTRAL: "Neutral",
    NEGATIVE: "Negative",
    MIXED: "Mixed"
  };
  return labels[value] ?? value;
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
        className="h-11 w-full min-w-0 rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold"
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
        className="h-11 w-full min-w-0 rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold"
      />
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

function reportValidationMessage(request: BusinessReportRequest) {
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
