import type { AdminReportDocument } from "./platform-admin.types.js";

const REPORT_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  AI: "AI",
  API: "API",
  BUSINESS_ADMIN: "Business Administrator",
  BUSINESS_OWNER: "Business Owner",
  COMPLETED_WITH_ERRORS: "Completed with errors",
  GMAIL: "Gmail",
  GOOGLE_REVIEW: "Google Review",
  GOOGLE_REVIEWS: "Google Reviews",
  IN_REVIEW: "In review",
  NOT_ANALYZED: "Not analyzed",
  PLATFORM_ADMIN: "Platform Administrator",
  PUBLIC_FORM: "Public Form",
  QR_CODE: "QR Code",
  WHATSAPP: "WhatsApp",
  X: "X"
};

const REPORT_INITIALISMS: Readonly<Record<string, string>> = {
  AI: "AI",
  API: "API",
  CSV: "CSV",
  IP: "IP",
  OAUTH: "OAuth",
  PDF: "PDF",
  QR: "QR",
  SMS: "SMS",
  URL: "URL"
};

const REPORT_ENUM_VALUES = new Set([
  "ACTIVE",
  "AI_ANALYSIS",
  "API_ERROR",
  "ARCHIVED",
  "ASSIGNED",
  "CANCELLED",
  "CLOSED",
  "COMPLETED",
  "CONNECTED",
  "CSV_EXPORT",
  "CUSTOMER",
  "DEGRADED",
  "DEMO",
  "DISABLED",
  "DISCONNECTED",
  "DRAFT",
  "DUPLICATE",
  "EMAIL",
  "ERROR",
  "FACEBOOK",
  "FAILED",
  "HEALTHY",
  "HIGH",
  "IMPORTED",
  "INSTAGRAM",
  "LIVE",
  "LOW",
  "MANAGER",
  "MANUAL",
  "MICROSOFT",
  "MIXED",
  "NEEDS_ATTENTION",
  "NEGATIVE",
  "NEUTRAL",
  "NEW",
  "NORMAL",
  "OAUTH",
  "OPERATIONAL",
  "OTHER",
  "PAUSED",
  "PARTIAL",
  "PASSED",
  "PENDING",
  "PDF_EXPORT",
  "POSITIVE",
  "PROCESSING",
  "RECEIVED",
  "REJECTED",
  "RESOLVED",
  "RUNNING",
  "SKIPPED",
  "SMS",
  "STAFF",
  "SUCCESS",
  "SUSPENDED",
  "UNASSIGNED",
  "URGENT",
  "URL",
  "IP"
]);

export function formatReportDisplayValue(value: string): string {
  const known = REPORT_DISPLAY_LABELS[value];
  if (known) return known;
  const looksLikeCompoundEnum = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(value);
  if (!REPORT_ENUM_VALUES.has(value) && !looksLikeCompoundEnum) return value;
  return value
    .split("_")
    .map((part) => {
      const initialism = REPORT_INITIALISMS[part];
      if (initialism) return initialism;
      const normalized = part.toLowerCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

export function formatReportDocument(report: AdminReportDocument): AdminReportDocument {
  return {
    ...report,
    comparison: report.comparison?.map((item) => ({
      ...item,
      label: formatReportDisplayValue(item.label)
    })),
    sections: report.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) =>
        row.map((cell, index) =>
          typeof cell === "string" &&
          !(
            section.title === "Important customer experience feedback" &&
            section.headers[index] === "Feedback"
          )
            ? formatReportDisplayValue(cell)
            : cell
        )
      )
    }))
  };
}
