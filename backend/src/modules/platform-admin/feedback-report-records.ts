import { FeedbackChannel, FeedbackStatus } from "../../lib/prisma-runtime.js";
import { formatReportDisplayValue } from "./platform-admin.report-format.js";
import type { ReportSection } from "./platform-admin.types.js";
import type { AdminReportDocument } from "./platform-admin.types.js";

export type DetailedFeedbackRecord = {
  channel: FeedbackChannel;
  message: string;
  receivedAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  category: { name: string } | null;
  status: FeedbackStatus;
  business?: { name: string };
  branch?: { name: string };
};

export function buildDetailedFeedbackSection(
  records: ReadonlyArray<DetailedFeedbackRecord>,
  options: { includeBusinessContext?: boolean } = {}
): ReportSection {
  const includeBusinessContext = options.includeBusinessContext === true;
  return {
    title: "Detailed Feedback Records",
    description: includeBusinessContext
      ? "Individual feedback matching the same platform, Business, branch, date, channel, workflow status, and sentiment scope as the report totals. Full messages are retained in CSV; PDF uses readable wrapped excerpts where necessary."
      : "Individual feedback matching the same Business, branch, date, channel, workflow status, and sentiment filters as the report totals. Full messages are retained in CSV; PDF uses readable wrapped excerpts where necessary.",
    headers: [
      ...(includeBusinessContext ? ["Business", "Branch"] : []),
      "Customer / Sender",
      "Feedback",
      "Channel",
      "Date",
      "Category",
      "Status"
    ],
    rows: records.map((record) => [
      ...(includeBusinessContext
        ? [
            record.business?.name ?? "Unknown business",
            record.branch?.name ?? "Unknown branch"
          ]
        : []),
      resolveDetailedFeedbackIdentity(record),
      record.message,
      formatReportDisplayValue(record.channel),
      record.receivedAt.toISOString(),
      record.category?.name ?? "Uncategorized",
      formatReportDisplayValue(record.status)
    ]),
    emptyMessage: "No feedback matched the selected period and filters."
  };
}

export function simplifyBusinessOwnerReportForExport(
  report: AdminReportDocument
): AdminReportDocument {
  const detailedFeedback = report.sections.find(
    (section) => section.title === "Detailed Feedback Records"
  );

  return {
    ...report,
    title: "Detailed Customer Feedback Report",
    scope: { ...report.scope, notes: [] },
    managementSummary: "",
    highlights: [],
    sections: detailedFeedback ? [detailedFeedback] : [],
    comparison: undefined
  };
}

export function resolveDetailedFeedbackIdentity(
  record: Pick<
    DetailedFeedbackRecord,
    "channel" | "customerName" | "customerEmail" | "customerPhone"
  >
): string {
  const name = usableIdentity(record.customerName);
  const email = usableIdentity(record.customerEmail);
  const phone = usableIdentity(record.customerPhone);

  if (record.channel === FeedbackChannel.EMAIL) {
    const generatedLocalPart = email?.split("@")[0]?.toLocaleLowerCase();
    const displayName =
      name && name.toLocaleLowerCase() !== generatedLocalPart ? name : null;
    return displayName ?? email ?? name ?? phone ?? "Unknown customer";
  }

  if (record.channel === FeedbackChannel.WHATSAPP) {
    return name ?? phone ?? email ?? "Unknown customer";
  }

  return name ?? email ?? phone ?? "Unknown customer";
}

function usableIdentity(value: string | null): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}
