import type { ReportDocument } from "./types.js";

export const REPORT_PREVIEW_ROW_LIMIT = 12;

type ReportSection = ReportDocument["sections"][number];

export const REPORT_COMPARISON_HEADERS = [
  "Metric",
  "Current",
  "Previous",
  "Change",
  "Comparison"
] as const;

export function getReportComparisonPreview(
  report: ReportDocument,
  comparisonEnabled: boolean
) {
  if (!comparisonEnabled || !report.comparison?.length) return null;
  return {
    headers: REPORT_COMPARISON_HEADERS,
    rows: report.comparison.map((item) => [
      item.label,
      item.current,
      item.previous,
      `${item.absoluteChange > 0 ? "+" : ""}${item.absoluteChange}`,
      item.percentageLabel
    ])
  };
}

export function getReportSectionPreview(
  section: ReportSection,
  limit = REPORT_PREVIEW_ROW_LIMIT
) {
  const truncated = section.rows.length > limit;
  const recentFirst = isChronologicalTrendSection(section);
  return {
    rows: truncated
      ? recentFirst
        ? section.rows.slice(-limit)
        : section.rows.slice(0, limit)
      : section.rows,
    truncated,
    message: truncated
      ? recentFirst
        ? `Showing the most recent ${limit} of ${section.rows.length} rows. Exports contain the full dataset.`
        : `Previewing ${limit} of ${section.rows.length} rows. Exports contain the full dataset.`
      : null
  };
}

function isChronologicalTrendSection(section: ReportSection) {
  return (
    /trend/i.test(section.title) &&
    section.headers[0] === "Period" &&
    section.rows.every((row) => typeof row[0] === "string")
  );
}
