import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(
  new URL("../src/features/admin/AdminReportsPage.tsx", import.meta.url),
  "utf8"
);
const previewSource = readFileSync(
  new URL("../src/features/admin/report-preview.ts", import.meta.url),
  "utf8"
);
const catalogSource = source.slice(
  source.indexOf("const ADMIN_REPORTS"),
  source.indexOf("export function AdminReportsPage")
);

test("Reporting Center presents exactly three supervisor-focused reports", () => {
  const values = [...catalogSource.matchAll(/value: "([A-Z_]+)"/g)].map(
    (match) => match[1]
  );
  assert.deepEqual(values, [
    "EXECUTIVE_PLATFORM",
    "FEEDBACK_CUSTOMER_EXPERIENCE",
    "OPERATIONS_SYSTEM_HEALTH"
  ]);
});

test("Executive is the default and old report choices are absent", () => {
  assert.match(source, /reportType: "EXECUTIVE_PLATFORM"/);
  for (const legacy of [
    "BUSINESS_ADOPTION",
    "FEEDBACK_INTELLIGENCE",
    "CHANNEL_PERFORMANCE",
    "INTEGRATION_HEALTH",
    "AI_SENTIMENT",
    "WORKFLOW",
    "USER_ACCESS",
    "AUTOMATION"
  ])
    assert.equal(catalogSource.includes(legacy), false);
});

test("report-aware filters and natural All labels are wired", () => {
  assert.match(source, /isFeedbackReport/);
  assert.match(source, /isOperationsReport/);
  for (const label of [
    "All Businesses",
    "All Branches",
    "All Channels",
    "All Statuses",
    "All Sentiments",
    "All Providers"
  ])
    assert.ok(source.includes(label), label);
  assert.equal(source.includes("All / not restricted"), false);
});

test("preview refresh, management summary, comparison, and empty states remain visible", () => {
  assert.match(source, /preview\.reset\(\)/);
  assert.match(source, /report\.managementSummary/);
  assert.match(previewSource, /item\.absoluteChange/);
  assert.match(previewSource, /item\.percentageLabel/);
  for (const header of ["Metric", "Current", "Previous", "Change", "Comparison"])
    assert.ok(previewSource.includes(`"${header}"`), header);
  assert.match(source, /getReportComparisonPreview/);
  assert.match(source, /section\.emptyMessage/);
  assert.match(source, /semanticTextClass/);
  assert.match(source, /Scope: \{report\.scope\.label\}/);
  assert.match(source, /report\.scope\.notes\.map/);
});

test("Platform Administrator Preview renders responsive Detailed Feedback Records", () => {
  assert.match(source, /Detailed Feedback Records/);
  assert.match(source, /Customer \/ Sender\|Feedback\|Channel\|Date\|Category\|Status/);
  assert.match(source, /DetailedFeedbackRecordsSection/);
  assert.match(source, /hidden max-w-full overflow-x-auto md:block/);
  assert.match(source, /space-y-3 md:hidden/);
  assert.match(source, /label="Business"/);
  assert.match(source, /label="Branch"/);
  assert.doesNotMatch(source, /automation|Automation/);
});
