import assert from "node:assert/strict";
import test from "node:test";
import {
  getReportComparisonPreview,
  getReportSectionPreview
} from "../src/features/admin/report-preview.js";
import type { ReportDocument } from "../src/features/admin/types.js";

test("owner trend Preview keeps the most recent rows in ascending chronological order", () => {
  const rows = Array.from({ length: 20 }, (_, index) => [
    `2026-08-${String(index + 5).padStart(2, "0")}`,
    index
  ]);
  const preview = getReportSectionPreview({
    title: "Feedback trend",
    headers: ["Period", "Feedback"],
    rows
  });
  assert.equal(preview.rows.length, 12);
  assert.deepEqual(preview.rows, rows.slice(-12));
  assert.match(preview.message ?? "", /most recent 12 of 20 rows/i);
});

test("owner important feedback Preview keeps rows and the page bounds the excerpt", () => {
  const rows: Array<Array<string | number | null>> = [
    [
      "2026-08-17T10:00:00.000Z",
      "Kigali Harvest Cafe",
      "Kiyovu Downtown Branch",
      "URGENT",
      "NEW",
      "NEGATIVE",
      1,
      "Service Quality",
      "x".repeat(500)
    ]
  ];
  const section = {
    title: "Important customer experience feedback",
    headers: [
      "Received",
      "Business",
      "Branch",
      "Priority",
      "Status",
      "Sentiment",
      "Rating",
      "Category",
      "Feedback"
    ],
    rows,
    semantic: "SENTIMENT" as const
  };
  const preview = getReportSectionPreview(section);
  assert.equal(preview.rows.length, 1);
  assert.equal(String(preview.rows[0]?.[8]).length, 500);
  assert.equal(preview.message, null);
});

test("owner comparison Preview appears only when comparison is enabled", () => {
  const report = {
    comparison: [
      {
        label: "Open feedback",
        current: 9,
        previous: 0,
        absoluteChange: 9,
        percentageChange: null,
        percentageLabel: "No prior baseline"
      }
    ]
  } as ReportDocument;
  const enabled = getReportComparisonPreview(report, true);
  assert.deepEqual(enabled?.rows, [["Open feedback", 9, 0, "+9", "No prior baseline"]]);
  assert.equal(getReportComparisonPreview(report, false), null);
});
