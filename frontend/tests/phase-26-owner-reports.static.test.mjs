import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const pageSource = readFileSync(
  new URL("../src/features/businesses/BusinessReportsPage.tsx", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("../src/features/businesses/reportsApi.ts", import.meta.url),
  "utf8"
);
const routerSource = readFileSync(
  new URL("../src/app/router/router.tsx", import.meta.url),
  "utf8"
);
const componentsSource = readFileSync(
  new URL("../src/features/businesses/components.tsx", import.meta.url),
  "utf8"
);
const adminReportsSource = readFileSync(
  new URL("../src/features/admin/AdminReportsPage.tsx", import.meta.url),
  "utf8"
);

test("Business Owner has exactly one report and no report-type selector", () => {
  assert.match(pageSource, /Business Performance &(amp;)? Customer Experience Report/);
  assert.match(pageSource, /REPORT_DESCRIPTION/);
  assert.equal(pageSource.includes("reportType"), false);
  assert.equal(pageSource.includes("Report type"), false);
});

test("Business Owner report page has no Business selector", () => {
  assert.equal(pageSource.includes("All Businesses"), false);
  assert.equal(pageSource.includes("Business selector"), false);
  assert.equal(pageSource.includes("businessId?:"), false);
  assert.equal(apiSource.includes("businessId?: string"), false);
});

test("owner filters use natural All labels and compare-previous-period control", () => {
  for (const label of ["All Branches", "All Channels", "All Statuses", "All Sentiments"])
    assert.ok(pageSource.includes(label), label);
  assert.match(pageSource, /Compare previous period/);
  assert.match(pageSource, /comparePreviousPeriod/);
  assert.match(pageSource, /dateFrom/);
  assert.match(pageSource, /dateTo/);
});

test("Preview, PDF, and CSV controls exist and stay usable on small screens", () => {
  assert.match(pageSource, /Preview Report/);
  assert.match(pageSource, /Download \$\{format\}/);
  assert.match(pageSource, /\["PDF", "CSV"\]/);
  assert.match(pageSource, /min-h-11/);
  assert.match(pageSource, /grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4/);
  assert.match(pageSource, /overflow-x-auto/);
  assert.match(pageSource, /sm:grid-cols-2 xl:grid-cols-4/);
});

test("report page enforces owner role and uses the workspace shell", () => {
  assert.match(pageSource, /user\?\.role !== "BUSINESS_OWNER"/);
  assert.match(pageSource, /WorkspaceShell/);
  assert.match(pageSource, /useAuthStore/);
});

test("owner reports route is registered and lazy-loaded", () => {
  assert.match(routerSource, /path: "business\/:businessId\/reports"/);
  assert.match(routerSource, /BusinessReportsPage/);
  assert.match(routerSource, /module\.BusinessReportsPage/);
});

test("Reports navigation item is owner-only and uses the Reports label", () => {
  assert.match(
    componentsSource,
    /\{ label: "Reports", path: "reports", icon: FileText, ownerOnly: true \}/
  );
  assert.match(componentsSource, /ownerOnly && user\?\.role !== "BUSINESS_OWNER"/);
});

test("owner report API targets the tenant route and never accepts a businessId", () => {
  assert.match(apiSource, /\/businesses\/\$\{businessId\}\/reports\/preview/);
  assert.match(apiSource, /\/businesses\/\$\{businessId\}\/reports\/export/);
  assert.equal(apiSource.includes("businessId?: string"), false);
  assert.equal(apiSource.includes("reportType"), false);
});

test("Platform Admin Reporting Center remains unchanged with exactly three report types", () => {
  const values = [
    ...adminReportsSource
      .slice(
        adminReportsSource.indexOf("const ADMIN_REPORTS"),
        adminReportsSource.indexOf("export function AdminReportsPage")
      )
      .matchAll(/value: "([A-Z_]+)"/g)
  ].map((match) => match[1]);
  assert.deepEqual(values, [
    "EXECUTIVE_PLATFORM",
    "FEEDBACK_CUSTOMER_EXPERIENCE",
    "OPERATIONS_SYSTEM_HEALTH"
  ]);
  assert.match(adminReportsSource, /reportType: "EXECUTIVE_PLATFORM"/);
});

test("owner report page reuses shared report preview helpers", () => {
  assert.match(pageSource, /getReportSectionPreview/);
  assert.match(pageSource, /getReportComparisonPreview/);
  assert.match(pageSource, /report\.managementSummary/);
  assert.match(pageSource, /report\.scope\.notes\.map/);
});

test("owner report renders responsive Detailed Feedback Records without page-level mobile overflow", () => {
  assert.match(pageSource, /Detailed Feedback Records/);
  assert.match(
    pageSource,
    /Customer \/ Sender\|Feedback\|Channel\|Date\|Category\|Status/
  );
  assert.match(pageSource, /DetailedFeedbackRecordsSection/);
  assert.match(pageSource, /hidden max-w-full overflow-x-auto md:block/);
  assert.match(pageSource, /space-y-3 md:hidden/);
  assert.match(pageSource, /whitespace-pre-wrap break-words/);
  assert.match(pageSource, /formatDateTime\(value\)/);
});
