import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inflateSync } from "node:zlib";
import {
  FeedbackChannel,
  FeedbackStatus,
  IntegrationProvider,
  UserRole
} from "../../lib/prisma-runtime.js";
import {
  businessReportPreviewSchema,
  businessReportRequestSchema
} from "./business-reports.schemas.js";
import {
  BUSINESS_PERFORMANCE_REPORT_TITLE,
  BUSINESS_PERFORMANCE_REPORT_TYPE,
  OWNER_REPORT_EXACTLY_ONE_CATALOG,
  buildDetailedFeedbackSection,
  buildIntegrationAdoptionRows,
  buildBusinessOwnerManagementSummary,
  createOwnerFeedbackScopePlan,
  resolveDetailedFeedbackIdentity,
  resolveOwnerReportAccess,
  summarizeBranchWorkload
} from "./business-reports.service.js";
import { formatReportDocument } from "../platform-admin/platform-admin.report-format.js";
import {
  prepareReportPdfTable,
  renderReportCsv,
  renderReportPdf
} from "../platform-admin/platform-admin.report-renderer.js";
import type { AdminReportDocument } from "../platform-admin/platform-admin.types.js";

const serviceSource = readFileSync(
  new URL("./business-reports.service.ts", import.meta.url),
  "utf8"
);
const routesSource = readFileSync(
  new URL("./business-reports.routes.ts", import.meta.url),
  "utf8"
);
const schemasSource = readFileSync(
  new URL("./business-reports.schemas.ts", import.meta.url),
  "utf8"
);
const controllerSource = readFileSync(
  new URL("./business-reports.controller.ts", import.meta.url),
  "utf8"
);

const validBase = {
  dateFrom: new Date("2026-08-01T00:00:00.000Z"),
  dateTo: new Date("2026-08-31T23:59:59.999Z"),
  comparePreviousPeriod: true
};

test("exactly one Business Owner report exists and has the required title", () => {
  assert.equal(OWNER_REPORT_EXACTLY_ONE_CATALOG.length, 1);
  assert.equal(
    OWNER_REPORT_EXACTLY_ONE_CATALOG[0]?.type,
    BUSINESS_PERFORMANCE_REPORT_TYPE
  );
  assert.equal(
    OWNER_REPORT_EXACTLY_ONE_CATALOG[0]?.title,
    BUSINESS_PERFORMANCE_REPORT_TITLE
  );
  assert.equal(
    OWNER_REPORT_EXACTLY_ONE_CATALOG[0]?.title,
    "Business Performance & Customer Experience Report"
  );
});

test("owner report request cannot inject a businessId, reportType, or output format in preview", () => {
  assert.equal(
    businessReportPreviewSchema.safeParse({
      ...validBase,
      businessId: "foreign-business"
    }).success,
    false
  );
  assert.equal(
    businessReportPreviewSchema.safeParse({
      ...validBase,
      reportType: "EXECUTIVE_PLATFORM"
    }).success,
    false
  );
  assert.equal(
    businessReportPreviewSchema.safeParse({
      ...validBase,
      outputFormat: "PDF"
    }).success,
    false
  );
  assert.equal(
    businessReportPreviewSchema.safeParse({
      ...validBase,
      unknownField: true
    }).success,
    false
  );
});

test("owner report request accepts the exact owner filter set", () => {
  assert.equal(
    businessReportPreviewSchema.safeParse({
      ...validBase,
      branchId: "branch-1",
      channel: "EMAIL",
      status: "NEW",
      sentiment: "NEGATIVE",
      comparePreviousPeriod: true
    }).success,
    true
  );
  assert.equal(
    businessReportRequestSchema.safeParse({
      ...validBase,
      outputFormat: "CSV"
    }).success,
    true
  );
  assert.equal(
    businessReportPreviewSchema.safeParse({
      ...validBase,
      provider: "EMAIL"
    }).success,
    false
  );
});

test("date validation rejects reversed and overlong owner report windows", () => {
  assert.equal(
    businessReportPreviewSchema.safeParse({
      dateFrom: "2026-08-31",
      dateTo: "2026-08-01"
    }).success,
    false
  );
  assert.equal(
    businessReportPreviewSchema.safeParse({
      ...validBase,
      dateFrom: new Date("2025-01-01T00:00:00.000Z")
    }).success,
    false
  );
});

test("tenant role gate rejects staff, customers, and platform administrators before any data query", async () => {
  for (const role of [UserRole.STAFF, UserRole.CUSTOMER, UserRole.PLATFORM_ADMIN]) {
    await assert.rejects(
      resolveOwnerReportAccess({ userId: "user-1", role }, "business-1"),
      (error: { code?: string; statusCode?: number }) =>
        error.code === "FORBIDDEN" && error.statusCode === 403
    );
  }
});

test("owner feedback scope fixes the authorized Business and applies every owner filter", () => {
  const from = new Date("2026-08-01T00:00:00.000Z");
  const to = new Date("2026-08-31T23:59:59.999Z");
  const plan = createOwnerFeedbackScopePlan(
    "authorized-business",
    {
      ...validBase,
      branchId: "branch-1",
      channel: "EMAIL",
      status: "IN_REVIEW",
      sentiment: "NEGATIVE"
    },
    from,
    to
  );
  assert.equal(plan.where.businessId, "authorized-business");
  assert.equal(plan.where.branchId, "branch-1");
  assert.equal(plan.where.channel, "EMAIL");
  assert.equal(plan.where.status, "IN_REVIEW");
  assert.deepEqual(plan.where.receivedAt, { gte: from, lte: to });
  assert.deepEqual(plan.where.aiAnalysis, { is: { sentiment: "NEGATIVE" } });
  const serializedScope = JSON.stringify(plan.where);
  assert.match(serializedScope, /"deletedAt":null/);
  assert.match(serializedScope, /liveMode/);
  assert.match(serializedScope, /"GMAIL"/);
});

test("detailed feedback sender resolution follows the supported channel rules", () => {
  const identity = (
    channel: FeedbackChannel,
    customerName: string | null,
    customerEmail: string | null,
    customerPhone: string | null
  ) =>
    resolveDetailedFeedbackIdentity({
      channel,
      customerName,
      customerEmail,
      customerPhone
    });

  assert.equal(
    identity(FeedbackChannel.EMAIL, "Alice Sender", "alice@example.com", null),
    "Alice Sender"
  );
  assert.equal(
    identity(FeedbackChannel.EMAIL, "alice", "alice@example.com", null),
    "alice@example.com"
  );
  assert.equal(
    identity(FeedbackChannel.WHATSAPP, "WhatsApp Customer", null, "+250788000001"),
    "WhatsApp Customer"
  );
  assert.equal(
    identity(FeedbackChannel.WHATSAPP, null, null, "+250788000001"),
    "+250788000001"
  );
  assert.equal(
    identity(FeedbackChannel.MANUAL, "Manual Customer", "manual@example.com", null),
    "Manual Customer"
  );
  assert.equal(
    identity(FeedbackChannel.PUBLIC_FORM, null, "public@example.com", null),
    "public@example.com"
  );
  assert.equal(
    identity(FeedbackChannel.PUBLIC_FORM, "  ", null, null),
    "Unknown customer"
  );
});

test("detailed feedback section preserves original messages, received timestamps, and visible channel labels", () => {
  const originalMessage = "NEW — keep this original customer wording, not an AI summary.";
  const receivedAt = new Date("2026-08-25T14:54:00.000Z");
  const section = buildDetailedFeedbackSection([
    {
      channel: FeedbackChannel.EMAIL,
      message: originalMessage,
      receivedAt,
      customerName: "Gmail Sender",
      customerEmail: "gmail@example.com",
      customerPhone: null,
      category: { name: "Service Quality" },
      status: FeedbackStatus.NEW
    },
    {
      channel: FeedbackChannel.WHATSAPP,
      message: "WhatsApp original message",
      receivedAt,
      customerName: null,
      customerEmail: null,
      customerPhone: "+250788000002",
      category: null,
      status: FeedbackStatus.IN_REVIEW
    },
    {
      channel: FeedbackChannel.MANUAL,
      message: "Manual original message",
      receivedAt,
      customerName: "STAFF",
      customerEmail: null,
      customerPhone: null,
      category: null,
      status: FeedbackStatus.RESOLVED
    },
    {
      channel: FeedbackChannel.PUBLIC_FORM,
      message: "Public Form original message",
      receivedAt,
      customerName: "Public Customer",
      customerEmail: null,
      customerPhone: null,
      category: null,
      status: FeedbackStatus.CLOSED
    }
  ]);

  assert.equal(section.title, "Detailed Feedback Records");
  assert.deepEqual(section.headers, [
    "Customer / Sender",
    "Feedback",
    "Channel",
    "Date",
    "Category",
    "Status"
  ]);
  assert.equal(section.rows[0]?.[1], originalMessage);
  assert.equal(section.rows[0]?.[3], receivedAt.toISOString());
  assert.deepEqual(
    section.rows.map((row) => row[2]),
    ["Gmail", "WhatsApp", "Manual", "Public Form"]
  );
  assert.equal(section.rows[1]?.[4], "Uncategorized");
  const formatted = formatReportDocument({
    ...ownerReportFixture(),
    sections: [section]
  }).sections[0]!;
  assert.equal(formatted.rows[0]?.[1], originalMessage);
  assert.equal(formatted.rows[2]?.[0], "STAFF");
});

test("previous-period owner scope is identical to current except for the date window", () => {
  const input = {
    dateFrom: new Date("2026-08-08T00:00:00.000Z"),
    dateTo: new Date("2026-08-11T23:59:59.999Z"),
    branchId: "branch-1",
    channel: "EMAIL" as const,
    status: "NEW" as const,
    sentiment: "POSITIVE" as const,
    comparePreviousPeriod: true
  };
  const current = createOwnerFeedbackScopePlan(
    "business-1",
    input,
    new Date("2026-08-08T00:00:00.000Z"),
    new Date("2026-08-11T23:59:59.999Z")
  );
  const previous = createOwnerFeedbackScopePlan(
    "business-1",
    input,
    new Date("2026-08-04T00:00:00.000Z"),
    new Date("2026-08-07T23:59:59.999Z")
  );
  for (const key of [
    "businessId",
    "branchId",
    "channel",
    "status",
    "sentiment"
  ] as const) {
    assert.equal(previous.filters[key], current.filters[key], key);
  }
  assert.equal(previous.where.status, "NEW");
  assert.deepEqual(previous.where.aiAnalysis, { is: { sentiment: "POSITIVE" } });
});

test("lifetime scope omits the date window while the period scope includes it", () => {
  const lifetime = createOwnerFeedbackScopePlan("business-1", validBase);
  assert.equal(lifetime.where.receivedAt, undefined);
  const period = createOwnerFeedbackScopePlan(
    "business-1",
    validBase,
    new Date("2026-08-01T00:00:00.000Z"),
    new Date("2026-08-31T23:59:59.999Z")
  );
  assert.ok(period.where.receivedAt);
});

test("branch workload uses open/completed workflow semantics per branch", () => {
  const workload = summarizeBranchWorkload([
    { branchId: "b1", status: FeedbackStatus.NEW, _count: { _all: 2 } },
    { branchId: "b1", status: FeedbackStatus.IN_REVIEW, _count: { _all: 1 } },
    { branchId: "b1", status: FeedbackStatus.RESOLVED, _count: { _all: 1 } },
    { branchId: "b1", status: FeedbackStatus.CLOSED, _count: { _all: 1 } }
  ]);
  assert.deepEqual(workload.get("b1"), { open: 3, completed: 2 });
});

test("owner Management Summary is deterministic, tie-aware, and safe for empty scopes", () => {
  const clearLeader = buildBusinessOwnerManagementSummary({
    periodTotal: 42,
    channels: [
      { channel: "WHATSAPP", _count: { _all: 18 } },
      { channel: "EMAIL", _count: { _all: 12 } }
    ],
    open: 9,
    highPriority: 3,
    liveIntegrations: 4,
    attentionIntegrations: 1
  });
  assert.match(
    clearLeader,
    /42 feedback records were received during the selected period\./
  );
  assert.match(clearLeader, /WhatsApp was the leading channel with 18 records\./);
  assert.match(
    clearLeader,
    /9 feedback items remain open, including 3 high-priority issues\./
  );
  assert.match(
    clearLeader,
    /4 Live integrations are connected and 1 connection requires attention\./
  );

  const tie = buildBusinessOwnerManagementSummary({
    periodTotal: 12,
    channels: [
      { channel: "INSTAGRAM", _count: { _all: 6 } },
      { channel: "WHATSAPP", _count: { _all: 6 } }
    ],
    open: 2,
    highPriority: 0,
    liveIntegrations: 0,
    attentionIntegrations: 0
  });
  assert.match(
    tie,
    /Instagram and WhatsApp were tied as the leading channels with 6 feedback records each\./
  );

  const singular = buildBusinessOwnerManagementSummary({
    periodTotal: 1,
    channels: [{ channel: "QR_CODE", _count: { _all: 1 } }],
    open: 1,
    highPriority: 1,
    liveIntegrations: 1,
    attentionIntegrations: 0
  });
  assert.match(singular, /1 feedback record was received/);
  assert.match(singular, /QR Code was the leading channel with 1 record\./);
  assert.match(
    singular,
    /1 feedback item remains open, including 1 high-priority issue\./
  );
  assert.match(
    singular,
    /1 Live integration is connected and 0 connections require attention\./
  );

  assert.equal(
    buildBusinessOwnerManagementSummary({
      periodTotal: 0,
      channels: [],
      open: 0,
      highPriority: 0,
      liveIntegrations: 0,
      attentionIntegrations: 0
    }),
    "No feedback matched the selected period and filters."
  );
});

test("Integration Adoption aggregates already Live-scoped connections by provider", () => {
  const rows = buildIntegrationAdoptionRows([
    { provider: IntegrationProvider.GOOGLE_REVIEWS },
    { provider: IntegrationProvider.WHATSAPP },
    { provider: IntegrationProvider.WHATSAPP },
    { provider: IntegrationProvider.EMAIL },
    { provider: IntegrationProvider.X },
    { provider: IntegrationProvider.FACEBOOK },
    { provider: IntegrationProvider.INSTAGRAM }
  ]);
  assert.equal(rows.filter(([provider]) => provider === "WhatsApp").length, 1);
  assert.deepEqual(
    rows.find(([provider]) => provider === "WhatsApp"),
    ["WhatsApp", 2]
  );
  assert.equal(
    rows.reduce((total, [, count]) => total + count, 0),
    7
  );
  assert.deepEqual(
    rows.map(([provider]) => provider),
    ["Facebook", "Gmail", "Google Reviews", "Instagram", "WhatsApp", "X"]
  );
  assert.doesNotMatch(serviceSource, /by:\s*\["provider",\s*"mode"\]/);
});

test("service source always scopes tenant queries by the authorized Business", () => {
  assert.match(serviceSource, /const businessId = business\.id;/);
  assert.match(serviceSource, /createFeedbackScopePlan/);
  assert.match(serviceSource, /businessId,\s+defaultBranchId: branchId/);
  assert.match(serviceSource, /defaultBranchId: branchId,\s+mode: IntegrationMode\.LIVE/);
  assert.match(serviceSource, /const runWhere[\s\S]*?mode: IntegrationMode\.LIVE/);
  assert.match(serviceSource, /connection:[\s\S]*?mode: IntegrationMode\.LIVE/);
  assert.doesNotMatch(serviceSource, /Demo connections/);
  for (const pattern of [
    /prisma\.feedback\.findMany\(\{\s*where,\s*select: \{\s*channel: true,\s*message: true,\s*receivedAt: true,\s*customerName: true,\s*customerEmail: true,\s*customerPhone: true/,
    /prisma\.synchronizationRun\.groupBy\(\{\s*by: \["status"\],\s*where: runWhere/,
    /prisma\.integrationWebhookDelivery\.count\(\{ where: webhookWhere \}\)/,
    /prisma\.feedbackAIAnalysis\.count\(\{ where: aiWhere \}\)/,
    /prisma\.automationExecution\.count\(\{ where: automationWhere \}\)/,
    /prisma\.automationRule\.groupBy\(\{\s*by: \["status"\],\s*where: \{ businessId \}/,
    /prisma\.customer\.count\(\{ where: \{ businessId \} \}\)/,
    /prisma\.branch\.findMany\(\{\s*where: \{ businessId \}/
  ]) {
    assert.match(serviceSource, pattern);
  }
  assert.match(serviceSource, /buildDetailedFeedbackSection\(detailedFeedback\)/);
  assert.match(serviceSource, /const periodTotal = detailedFeedback\.length;/);
  assert.match(
    serviceSource,
    /customerPhone: true,[\s\S]*?orderBy: \[\{ receivedAt: "desc" \}, \{ id: "asc" \}\]\s*\}\),\s*queryFeedbackTimeSeries/
  );
});

test("branch validation never trusts a foreign branch id", () => {
  assert.match(
    serviceSource,
    /prisma\.branch\.findFirst\(\{\s*where: \{ id: branchId, businessId \}/
  );
  assert.match(serviceSource, /REPORT_BRANCH_NOT_FOUND/);
});

test("owner report excludes platform-only and other-tenant data", () => {
  for (const forbidden of [
    "Pending businesses",
    "Platform-wide",
    "Total platform users",
    "API health",
    "Database health",
    "Core services",
    "Business approval and platform workload",
    "os.totalmem",
    "process.cpuUsage"
  ]) {
    assert.equal(serviceSource.includes(forbidden), false, forbidden);
  }
  assert.match(serviceSource, /No platform-level or other-tenant data is included/);
});

test("owner report source selects only the required sender contact fallbacks and no secrets or raw payloads", () => {
  for (const forbidden of [
    "passwordHash",
    "encryptedAccessToken",
    "encryptedRefreshToken",
    "encryptedAppSecret",
    "webhookVerifyTokenHash",
    "lastProviderCursor",
    "payloadHash",
    "externalUrl",
    "checksum",
    "sourceMetadata"
  ]) {
    assert.equal(serviceSource.includes(`${forbidden}: true`), false, forbidden);
    assert.equal(schemasSource.includes(forbidden), false, forbidden);
  }
  assert.match(serviceSource, /customerName: true/);
  assert.match(serviceSource, /customerEmail: true/);
  assert.match(serviceSource, /customerPhone: true/);
  assert.doesNotMatch(serviceSource, /sourceMetadata: true/);
  assert.doesNotMatch(serviceSource, /externalId: true/);
  assert.match(controllerSource, /["']Cache-Control["']:\s*"no-store"/);
  assert.match(controllerSource, /["']X-Content-Type-Options["']:\s*"nosniff"/);
});

test("routes expose exactly preview and export and nothing else", () => {
  assert.match(routesSource, /post\("\/preview"/);
  assert.match(routesSource, /post\("\/export"/);
  assert.equal(routesSource.includes("get("), false);
});

test("owner report renders UTF-8 BOM CSV and PDF with the business name and no secrets", async () => {
  const report = ownerReportFixture();
  const csv = renderReportCsv(report);
  assert.equal(csv.subarray(0, 3).toString("hex"), "efbbbf");
  const csvText = csv.toString("utf8");
  assert.match(csvText, /Business Performance & Customer Experience Report/);
  assert.match(csvText, /Kigali Harvest Cafe/);
  assert.match(csvText, /Report context,BUSINESS REPORTING/);
  assert.doesNotMatch(csvText, /PLATFORM ADMINISTRATION/);
  assert.doesNotMatch(csvText, /customer@example\.com|\+2507\d+/i);

  const pdf = await renderReportPdf(report);
  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(pdf.length > 1_000);
  const pdfText = inspectPdfPages(pdf).join(" ");
  assert.match(pdfText, /BUSINESS REPORTING/);
  assert.doesNotMatch(pdfText, /PLATFORM ADMINISTRATION/);
});

test("Platform Admin PDF keeps Platform Administration branding without Business context leakage", async () => {
  const report = ownerReportFixture();
  delete report.branding.reportSubtitle;
  report.reportType = "EXECUTIVE_PLATFORM";
  report.title = "Executive Platform Report";
  const pdfText = inspectPdfPages(await renderReportPdf(report)).join(" ");
  assert.match(pdfText, /PLATFORM ADMINISTRATION/);
  assert.doesNotMatch(pdfText, /BUSINESS REPORTING/);
  assert.doesNotMatch(renderReportCsv(report).toString("utf8"), /BUSINESS REPORTING/);
});

test("Preview, PDF, and CSV expose only Live integration semantics", async () => {
  const report = ownerReportFixture();
  const adoptionRows = buildIntegrationAdoptionRows([
    { provider: IntegrationProvider.GOOGLE_REVIEWS },
    { provider: IntegrationProvider.WHATSAPP },
    { provider: IntegrationProvider.WHATSAPP },
    { provider: IntegrationProvider.EMAIL },
    { provider: IntegrationProvider.X },
    { provider: IntegrationProvider.FACEBOOK },
    { provider: IntegrationProvider.INSTAGRAM }
  ]);
  report.sections = [
    {
      title: "Integration adoption",
      headers: ["Provider", "Count"],
      rows: adoptionRows
    },
    {
      title: "Integration connections",
      headers: ["Provider", "Status"],
      rows: [["WHATSAPP", "CONNECTED"]]
    }
  ];

  const adoption = report.sections[0]!;
  assert.deepEqual(
    adoption.rows.find((row) => row[0] === "WhatsApp"),
    ["WhatsApp", 2]
  );
  assert.equal(
    adoption.rows.reduce((total, row) => total + Number(row[1]), 0),
    7
  );
  assert.deepEqual(report.sections[1]!.rows, [["WHATSAPP", "CONNECTED"]]);

  const csvLines = renderReportCsv(report).toString("utf8").split(/\r?\n/);
  assert.equal(csvLines.filter((line) => /^WhatsApp,2(?:,|$)/.test(line)).length, 1);
  assert.ok(csvLines.some((line) => /^WhatsApp,Connected(?:,|$)/.test(line)));
  assert.equal(
    csvLines.some((line) => /Demo/i.test(line)),
    false
  );

  const pdfText = inspectPdfPages(await renderReportPdf(report)).join(" ");
  assert.match(pdfText, /Integration adoption[\s\S]*WhatsApp\s*2/);
  assert.match(pdfText, /Integration connections[\s\S]*WhatsApp[\s\S]*Connected/);
  assert.doesNotMatch(pdfText, /Demo/);
});

test("owner report PDF preserves physical page count and exactly one true footer per page", async () => {
  const report = ownerReportFixture();
  report.highlights = Array.from({ length: 28 }, (_, index) => ({
    label: `Owner KPI ${index + 1}`,
    value: index
  }));
  report.sections = [
    {
      title: "Workflow performance",
      description:
        "Open means NEW or IN_REVIEW; Completed means RESOLVED or CLOSED. First-response and resolution-time metrics are not collected, so no response-time claims are made.",
      headers: ["Workflow state", "Count"],
      rows: Array.from({ length: 30 }, (_, index) => [
        index % 2 ? "Open" : "Completed",
        index
      ])
    },
    {
      title: "Important customer experience feedback",
      description:
        "Recent high/urgent-priority or negative feedback, without customer contact details or internal source payloads.",
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
      rows: [
        [
          "2026-08-17T10:00:00.000Z",
          "Kigali Harvest Cafe",
          "Kiyovu Downtown Branch",
          "URGENT",
          "NEW",
          "NEGATIVE",
          1,
          "Service Quality",
          "The customer reported that the takeaway order was incomplete and the promised replacement had still not arrived by closing time, and the supervisor needs this complete context without seeing contact details."
        ]
      ],
      semantic: "SENTIMENT"
    }
  ];
  const pages = inspectPdfPages(await renderReportPdf(report));
  pages.forEach((pageText, index) => {
    const footerPattern = new RegExp(
      `Confidential platform report\\s+${escapeRegExp(BUSINESS_PERFORMANCE_REPORT_TITLE)}\\s+Page ${index + 1} of ${pages.length}`,
      "g"
    );
    assert.equal(pageText.match(footerPattern)?.length ?? 0, 1, pageText);
    const withoutFooter = pageText.replace(footerPattern, "").trim();
    assert.ok(withoutFooter.length > 20, "A footer-only trailing page was rendered.");
  });
  const joined = pages.join(" ");
  assert.match(joined, /Kigali Harvest Cafe/);
  assert.match(joined, /invoice|incomplete/);
  assert.doesNotMatch(joined, /customer@example\.com|\+2507\d+/i);
});

test("owner important feedback PDF table uses the shared wrapping excerpt projection", () => {
  const report = ownerReportFixture();
  report.sections = [
    {
      title: "Important customer experience feedback",
      description: "Safe normalized feedback without contact details.",
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
      rows: [
        [
          "2026-08-17T10:00:00.000Z",
          "Kigali Harvest Cafe",
          "Kiyovu Downtown Branch",
          "URGENT",
          "NEW",
          "NEGATIVE",
          1,
          "Service Quality",
          "A very long safe normalized customer message that should wrap across several lines instead of being clipped by the shared PDF renderer for important owner feedback."
        ]
      ],
      semantic: "SENTIMENT"
    }
  ];
  const formatted = formatReportDocument(report);
  const table = prepareReportPdfTable(formatted.sections[0]!);
  assert.equal(table.wrapRows, true);
  assert.equal(table.headers.length, 9);
  assert.equal(table.columnProportions?.length, 9);
  assert.ok(table.fontSize < 7);
});

test("Detailed Feedback Records uses wrapped PDF columns and exports every matching row", async () => {
  const records = Array.from({ length: 45 }, (_, index) => ({
    channel: [
      FeedbackChannel.EMAIL,
      FeedbackChannel.WHATSAPP,
      FeedbackChannel.MANUAL,
      FeedbackChannel.PUBLIC_FORM
    ][index % 4]!,
    message:
      index === 44
        ? "Final detailed feedback record 45 with the original customer message."
        : `Detailed original customer message ${index + 1}.`,
    receivedAt: new Date(Date.UTC(2026, 7, 25, 14, index)),
    customerName: `Sender ${index + 1}`,
    customerEmail: `sender${index + 1}@example.com`,
    customerPhone: null,
    category: index % 2 ? { name: "Service Quality" } : null,
    status: FeedbackStatus.NEW
  }));
  const section = buildDetailedFeedbackSection(records);
  const report = ownerReportFixture();
  report.sections = [section];

  const table = prepareReportPdfTable(section);
  assert.equal(table.wrapRows, true);
  assert.equal(table.headers.length, 6);
  assert.equal(table.columnProportions?.length, 6);
  assert.match(String(table.rows[0]?.[3]), /25 Aug 2026, 14:00/);

  const csvText = renderReportCsv(report).toString("utf8");
  assert.match(csvText, /Detailed Feedback Records/);
  assert.match(csvText, /Customer \/ Sender,Feedback,Channel,Date,Category,Status/);
  assert.match(
    csvText,
    /Final detailed feedback record 45 with the original customer message\./
  );
  assert.match(csvText, /2026-08-25T14:44:00\.000Z/);

  const pdfPages = inspectPdfPages(await renderReportPdf(report));
  const pdfText = pdfPages.join(" ");
  assert.ok(pdfPages.length > 1);
  assert.match(pdfText, /Detailed Feedback Records/);
  assert.match(pdfText, /Final detailed feedback record 45/);
  assert.ok(
    pdfPages.filter((page) => /Customer \/ Sender/.test(page)).length > 1,
    "Detailed feedback table headers should repeat after PDF page breaks."
  );
});

function ownerReportFixture(): AdminReportDocument {
  return {
    branding: {
      platformName: "SME Feedback Aggregator",
      primaryColor: "#4F46E5",
      reportFooterText: "Confidential platform report",
      reportSubtitle: "BUSINESS REPORTING"
    },
    title: BUSINESS_PERFORMANCE_REPORT_TITLE,
    reportType: BUSINESS_PERFORMANCE_REPORT_TYPE,
    scope: {
      level: "BUSINESS",
      label: "Kigali Harvest Cafe",
      notes: [
        "Every metric is limited to the authenticated Business.",
        "All feedback metrics use one canonical Channel, Workflow Status, and Sentiment scope.",
        "No platform-level or other-tenant data is included."
      ],
      metrics: {
        businesses: "BUSINESS_SCOPED",
        branches: "BUSINESS_SCOPED",
        users: "BUSINESS_SCOPED",
        customers: "BUSINESS_SCOPED",
        feedback: "BUSINESS_SCOPED",
        integrations: "BUSINESS_SCOPED",
        approvalWorkload: "BUSINESS_SCOPED"
      }
    },
    period: {
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z"
    },
    generatedAt: "2026-08-31T12:00:00.000Z",
    filters: [
      "Business: Kigali Harvest Cafe",
      "All Branches",
      "All Channels",
      "All Statuses",
      "All Sentiments",
      "Previous period comparison enabled"
    ],
    managementSummary:
      "42 feedback records were received during the selected period. WhatsApp was the leading channel with 18 records. 9 feedback items remain open, including 3 high-priority issues. 4 Live integrations are connected and 1 connection requires attention.",
    highlights: [
      { label: "Branches (lifetime)", value: 3 },
      { label: "Active branches", value: 2 },
      { label: "Active members (lifetime)", value: 6 },
      { label: "Customer profiles (lifetime)", value: 6 },
      { label: "Feedback in selected period", value: 42 },
      { label: "Integrations needing attention", value: 1 }
    ],
    sections: [
      {
        title: "Business at a glance",
        headers: [
          "Business",
          "Status",
          "Branches",
          "Active members",
          "Customer profiles",
          "Integration connections"
        ],
        rows: [["Kigali Harvest Cafe", "ACTIVE", 3, 6, 6, 7]]
      },
      {
        title: "Channel distribution",
        headers: ["Channel", "Count", "Percentage"],
        rows: [
          ["WHATSAPP", 18, "42.9%"],
          ["EMAIL", 12, "28.6%"]
        ]
      }
    ]
  };
}

function inspectPdfPages(pdf: Buffer): string[] {
  const source = pdf.toString("latin1");
  const objects = new Map<number, string>();
  for (const match of source.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) {
    objects.set(Number(match[1]), match[2] ?? "");
  }
  const pageContents: number[] = [];
  for (const [, body] of objects) {
    if (!/\/Type\s*\/Page\b/.test(body)) continue;
    const content = body.match(/\/Contents\s+(\d+)\s+0\s+R/);
    assert.ok(content, "Physical PDF page has no content stream.");
    pageContents.push(Number(content[1]));
  }
  return pageContents.map((objectId) => {
    const objectStart = source.indexOf(`${objectId} 0 obj`);
    assert.ok(objectStart >= 0, `Missing PDF content object ${objectId}.`);
    const streamMarker = source.indexOf("stream", objectStart);
    assert.ok(streamMarker >= 0, `Missing PDF content stream ${objectId}.`);
    const header = source.slice(objectStart, streamMarker);
    const length = header.match(/\/Length\s+(\d+)/);
    assert.ok(length?.[1], `Missing PDF stream length ${objectId}.`);
    const streamStart = source.indexOf("\n", streamMarker) + 1;
    assert.ok(streamStart > streamMarker, `Invalid PDF stream ${objectId}.`);
    const raw = pdf.subarray(streamStart, streamStart + Number(length[1]));
    const decoded = /\/FlateDecode/.test(header) ? inflateSync(raw) : raw;
    const content = decoded.toString("latin1");
    return [...content.matchAll(/<([0-9a-fA-F]+)>/g)]
      .map((item) => Buffer.from(item[1] ?? "", "hex").toString("latin1"))
      .join("")
      .replaceAll("\x95", "")
      .replaceAll("•", "");
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
