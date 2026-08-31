import assert from "node:assert/strict";
import test from "node:test";
import {
  getReportComparisonPreview,
  getReportSectionPreview,
  REPORT_COMPARISON_HEADERS
} from "../src/features/admin/report-preview.js";
import type { ReportDocument } from "../src/features/admin/types.js";

function trendSection(rows: Array<Array<string | number | null>>) {
  return {
    title: "Feedback trend",
    headers: ["Period", "Feedback"],
    rows
  };
}

test("trend Preview shows every chronological row at or below the limit", () => {
  const rows = Array.from({ length: 12 }, (_, index) => [
    `2026-08-${String(index + 1).padStart(2, "0")}`,
    index
  ]);
  const preview = getReportSectionPreview(trendSection(rows));
  assert.deepEqual(preview.rows, rows);
  assert.equal(preview.truncated, false);
  assert.equal(preview.message, null);
});

test("trend Preview shows the most recent rows while preserving ascending chronology", () => {
  const rows = Array.from({ length: 30 }, (_, index) => [
    `2026-07-${String(index + 19).padStart(2, "0")}`,
    index
  ]);
  const preview = getReportSectionPreview(trendSection(rows));
  assert.equal(preview.rows.length, 12);
  assert.deepEqual(preview.rows, rows.slice(-12));
  assert.equal(preview.rows[0]?.[0], rows[18]?.[0]);
  assert.equal(preview.rows.at(-1)?.[0], rows.at(-1)?.[0]);
  assert.match(preview.message ?? "", /most recent 12 of 30 rows/i);
  assert.match(preview.message ?? "", /Exports contain the full dataset/);
});

test("non-trend Preview sections retain their established first-row sampling", () => {
  const rows = Array.from({ length: 20 }, (_, index) => [`Business ${index}`, index]);
  const preview = getReportSectionPreview({
    title: "Feedback by business",
    headers: ["Business", "Feedback"],
    rows
  });
  assert.deepEqual(preview.rows, rows.slice(0, 12));
});

test("admin Detailed Feedback Records Preview samples rows without changing export data", () => {
  const rows = Array.from({ length: 18 }, (_, index) => [
    `Customer ${index + 1}`,
    `Original feedback ${index + 1}`,
    "Gmail",
    `2026-08-${String(index + 1).padStart(2, "0")}T14:54:00.000Z`,
    "Service Quality",
    "New",
    "Kigali Waffle Cuisine",
    "Remera"
  ]);
  const preview = getReportSectionPreview({
    title: "Detailed Feedback Records",
    headers: [
      "Customer / Sender",
      "Feedback",
      "Channel",
      "Date",
      "Category",
      "Status",
      "Business",
      "Branch"
    ],
    rows
  });
  assert.deepEqual(preview.rows, rows.slice(0, 12));
  assert.match(preview.message ?? "", /Previewing 12 of 18 rows/i);
  assert.match(preview.message ?? "", /Exports contain the full dataset/i);
});

test("Operations Preview reuses the report document comparison in the required table", () => {
  const report = {
    comparison: [
      {
        label: "Synchronization runs",
        current: 6,
        previous: 0,
        absoluteChange: 6,
        percentageChange: null,
        percentageLabel: "No prior baseline"
      }
    ]
  } as ReportDocument;
  const comparison = getReportComparisonPreview(report, true);
  assert.deepEqual(comparison?.headers, REPORT_COMPARISON_HEADERS);
  assert.deepEqual(comparison?.rows, [
    ["Synchronization runs", 6, 0, "+6", "No prior baseline"]
  ]);
});

test("comparison Preview is hidden when comparison is disabled", () => {
  const report = {
    comparison: [
      {
        label: "Webhook deliveries",
        current: 5,
        previous: 4,
        absoluteChange: 1,
        percentageChange: 25,
        percentageLabel: "+25.0%"
      }
    ]
  } as ReportDocument;
  assert.equal(getReportComparisonPreview(report, false), null);
});
