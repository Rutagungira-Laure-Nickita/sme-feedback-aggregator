import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { FeedbackStatus } from "../../lib/prisma-runtime.js";
import {
  ADMIN_REPORT_CATALOG,
  buildExecutiveManagementSummary,
  buildFeedbackManagementSummary,
  createExecutiveScopePlan,
  createFeedbackScope,
  createFeedbackScopePlan,
  selectImportantFeedbackText,
  summarizeFeedbackAssignment,
  summarizeFeedbackWorkflow,
  createReportComparison
} from "./platform-admin.reports.js";
import {
  formatReportDisplayValue,
  formatReportDocument
} from "./platform-admin.report-format.js";
import {
  formatReportPdfTimestamp,
  prepareReportPdfTable,
  renderReportCsv,
  renderReportPdf,
  renderReportPdfWithDiagnostics
} from "./platform-admin.report-renderer.js";
import {
  adminReportPreviewSchema,
  adminReportRequestSchema,
  adminReportTypeSchema
} from "./platform-admin.schemas.js";
import type { AdminReportDocument } from "./platform-admin.types.js";

const reportSource = readFileSync(
  new URL("./platform-admin.reports.ts", import.meta.url),
  "utf8"
);
const uiSource = readFileSync(
  new URL(
    "../../../../frontend/src/features/admin/AdminReportsPage.tsx",
    import.meta.url
  ),
  "utf8"
);

test("Phase 25.4 catalog exposes exactly three supervisor reports with Executive first", () => {
  assert.deepEqual(adminReportTypeSchema.options, [
    "EXECUTIVE_PLATFORM",
    "FEEDBACK_CUSTOMER_EXPERIENCE",
    "OPERATIONS_SYSTEM_HEALTH"
  ]);
  assert.equal(ADMIN_REPORT_CATALOG.length, 3);
  assert.equal(ADMIN_REPORT_CATALOG[0]?.type, "EXECUTIVE_PLATFORM");
  for (const legacy of [
    "BUSINESS_ADOPTION",
    "FEEDBACK_INTELLIGENCE",
    "CHANNEL_PERFORMANCE",
    "INTEGRATION_HEALTH",
    "AI_SENTIMENT",
    "WORKFLOW",
    "USER_ACCESS",
    "AUTOMATION"
  ]) {
    assert.equal(adminReportTypeSchema.safeParse(legacy).success, false);
    assert.equal(uiSource.includes(`value: "${legacy}"`), false);
  }
  assert.match(uiSource, /reportType: "EXECUTIVE_PLATFORM"/);
});

test("report-aware validation accepts only relevant filters", () => {
  const base = { dateFrom: "2026-08-01", dateTo: "2026-08-31" };
  assert.equal(
    adminReportPreviewSchema.safeParse({
      ...base,
      reportType: "EXECUTIVE_PLATFORM",
      businessId: "business-1",
      branchId: "branch-1"
    }).success,
    true
  );
  assert.equal(
    adminReportPreviewSchema.safeParse({
      ...base,
      reportType: "EXECUTIVE_PLATFORM",
      sentiment: "NEGATIVE"
    }).success,
    false
  );
  assert.equal(
    adminReportPreviewSchema.safeParse({
      ...base,
      reportType: "FEEDBACK_CUSTOMER_EXPERIENCE",
      businessId: "business-1",
      branchId: "branch-1",
      channel: "EMAIL",
      status: "NEW",
      sentiment: "NEGATIVE"
    }).success,
    true
  );
  assert.equal(
    adminReportPreviewSchema.safeParse({
      ...base,
      reportType: "OPERATIONS_SYSTEM_HEALTH",
      provider: "EMAIL"
    }).success,
    true
  );
  assert.equal(
    adminReportPreviewSchema.safeParse({
      ...base,
      reportType: "OPERATIONS_SYSTEM_HEALTH",
      status: "NEW"
    }).success,
    false
  );
});

test("feedback report scope preserves business, branch, channel, status, and sentiment", () => {
  const from = new Date("2026-08-01T00:00:00.000Z");
  const to = new Date("2026-08-31T23:59:59.999Z");
  const scope = createFeedbackScope(
    {
      reportType: "FEEDBACK_CUSTOMER_EXPERIENCE",
      businessId: "business-1",
      branchId: "branch-1",
      channel: "EMAIL",
      status: "IN_REVIEW",
      sentiment: "NEGATIVE"
    },
    from,
    to
  );
  assert.equal(scope.businessId, "business-1");
  assert.equal(scope.branchId, "branch-1");
  assert.equal(scope.channel, "EMAIL");
  assert.equal(scope.status, "IN_REVIEW");
  assert.deepEqual(scope.receivedAt, { gte: from, lte: to });
  assert.deepEqual(scope.aiAnalysis, { is: { sentiment: "NEGATIVE" } });
});

test("canonical feedback scope plans keep every filter identical across current and previous periods", () => {
  const input = {
    reportType: "FEEDBACK_CUSTOMER_EXPERIENCE" as const,
    businessId: "business-1",
    branchId: "branch-1",
    channel: "INSTAGRAM" as const,
    status: "NEW" as const,
    sentiment: "POSITIVE" as const
  };
  const current = createFeedbackScopePlan(
    input,
    new Date("2026-08-08T00:00:00.000Z"),
    new Date("2026-08-11T23:59:59.999Z")
  );
  const previous = createFeedbackScopePlan(
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
  assert.equal(current.where.status, "NEW");
  assert.equal(previous.where.status, "NEW");
  assert.deepEqual(current.where.aiAnalysis, {
    is: { sentiment: "POSITIVE" }
  });
  assert.deepEqual(previous.where.aiAnalysis, {
    is: { sentiment: "POSITIVE" }
  });
  assert.doesNotMatch(reportSource, /\.\.\.where,\s*status:/);
  assert.match(reportSource, /queryFeedbackTimeSeries\(periodScope\)/);
});

test("canonical feedback scope supports all required filter combinations and safe empty semantics", () => {
  const combinations = [
    { businessId: "b", branchId: "br", channel: "EMAIL" as const },
    { businessId: "b", branchId: "br", status: "NEW" as const },
    { businessId: "b", branchId: "br", sentiment: "NEGATIVE" as const },
    {
      businessId: "b",
      branchId: "br",
      channel: "EMAIL" as const,
      status: "NEW" as const,
      sentiment: "NEGATIVE" as const
    }
  ];
  for (const combination of combinations) {
    const scope = createFeedbackScope({
      reportType: "FEEDBACK_CUSTOMER_EXPERIENCE",
      ...combination
    });
    assert.equal(scope.businessId, "b");
    assert.equal(scope.branchId, "br");
    if (combination.channel) assert.equal(scope.channel, combination.channel);
    if (combination.status) assert.equal(scope.status, combination.status);
    if (combination.sentiment)
      assert.deepEqual(scope.aiAnalysis, {
        is: { sentiment: combination.sentiment }
      });
  }
  assert.deepEqual(summarizeFeedbackWorkflow([]), { open: 0, completed: 0 });
  assert.deepEqual(summarizeFeedbackAssignment([]), { assigned: 0, unassigned: 0 });
});

test("New-only workflow scope cannot leak completed feedback", () => {
  const workflow = summarizeFeedbackWorkflow([
    { status: FeedbackStatus.NEW, _count: { _all: 2 } }
  ]);
  assert.deepEqual(workflow, { open: 2, completed: 0 });
  assert.equal(workflow.open + workflow.completed, 2);

  const mixed = summarizeFeedbackWorkflow([
    { status: FeedbackStatus.NEW, _count: { _all: 8 } },
    { status: FeedbackStatus.IN_REVIEW, _count: { _all: 3 } },
    { status: FeedbackStatus.RESOLVED, _count: { _all: 3 } },
    { status: FeedbackStatus.CLOSED, _count: { _all: 2 } }
  ]);
  assert.deepEqual(mixed, { open: 11, completed: 5 });
  assert.equal(mixed.open + mixed.completed, 16);
});

test("assignment workload partitions the canonical filtered feedback count", () => {
  const assignment = summarizeFeedbackAssignment([
    { assignedToMembershipId: "membership-1", _count: { _all: 5 } },
    { assignedToMembershipId: "membership-2", _count: { _all: 3 } },
    { assignedToMembershipId: null, _count: { _all: 8 } }
  ]);
  assert.deepEqual(assignment, { assigned: 8, unassigned: 8 });
  assert.equal(assignment.assigned + assignment.unassigned, 16);
});

test("Executive scope plan follows actual business, branch, membership, customer, feedback, and integration relationships", () => {
  const business = createExecutiveScopePlan({ businessId: "business-1" }, "business-1");
  assert.deepEqual(business.businessWhere, { id: "business-1" });
  assert.deepEqual(business.customerWhere, { businessId: "business-1" });
  assert.deepEqual(business.userWhere, {
    businessMemberships: { some: { businessId: "business-1" } }
  });
  assert.equal(business.labels.users, "Users in scope (lifetime)");
  assert.equal(business.labels.newUsers, "New users in scope");

  const branch = createExecutiveScopePlan(
    { businessId: "business-1", branchId: "branch-1" },
    "business-1"
  );
  assert.deepEqual(branch.branchWhere, {
    businessId: "business-1",
    id: "branch-1"
  });
  assert.deepEqual(branch.feedbackRelationWhere, { branchId: "branch-1" });
  assert.deepEqual(branch.integrationWhere, {
    businessId: "business-1",
    defaultBranchId: "branch-1"
  });
  assert.deepEqual(branch.userWhere, {
    businessMemberships: {
      some: {
        businessId: "business-1",
        OR: [
          { allBranchesAccess: true },
          { branchAccess: { some: { branchId: "branch-1" } } }
        ]
      }
    }
  });
  assert.deepEqual(branch.customerWhere, { businessId: "business-1" });
  assert.match(branch.labels.customers, /business-wide/i);
  assert.match(branch.labels.integrations, /routed to branch/i);
});

test("previous-period comparison includes absolute and safe percentage changes", () => {
  assert.deepEqual(createReportComparison("Feedback", 15, 10), {
    label: "Feedback",
    current: 15,
    previous: 10,
    absoluteChange: 5,
    percentageChange: 50,
    percentageLabel: "50%"
  });
  assert.deepEqual(createReportComparison("Feedback", 4, 0), {
    label: "Feedback",
    current: 4,
    previous: 0,
    absoluteChange: 4,
    percentageChange: null,
    percentageLabel: "No prior baseline"
  });
});

test("Executive management summary is deterministic and metric-derived", () => {
  const summary = buildExecutiveManagementSummary({
    periodFeedback: 16,
    leadingChannel: "WHATSAPP",
    activeBusinesses: 2,
    pendingBusinesses: 1,
    liveIntegrations: 1,
    attentionIntegrations: 3
  });
  assert.match(summary, /16 feedback records were received/);
  assert.match(summary, /WhatsApp was the leading source/);
  assert.match(summary, /2 businesses are active/);
  assert.match(summary, /1 awaits approval/);
  assert.match(summary, /3 integration records require administrator attention/);
});

test("Feedback Management Summary handles clear leaders, deterministic ties, and zero feedback", () => {
  const clearLeader = buildFeedbackManagementSummary({
    periodTotal: 8,
    channels: [
      { channel: "EMAIL", _count: { _all: 2 } },
      { channel: "WHATSAPP", _count: { _all: 6 } }
    ],
    open: 5,
    unassigned: 3,
    highPriority: 1
  });
  assert.match(clearLeader, /WhatsApp was the leading channel with 6 feedback records/);

  const twoWayTie = buildFeedbackManagementSummary({
    periodTotal: 8,
    channels: [
      { channel: "WHATSAPP", _count: { _all: 4 } },
      { channel: "EMAIL", _count: { _all: 4 } }
    ],
    open: 4,
    unassigned: 4,
    highPriority: 0
  });
  assert.match(
    twoWayTie,
    /Email and WhatsApp were tied as the leading channels with 4 feedback records each/
  );

  const fourWayTie = buildFeedbackManagementSummary({
    periodTotal: 4,
    channels: [
      { channel: "X", _count: { _all: 1 } },
      { channel: "FACEBOOK", _count: { _all: 1 } },
      { channel: "QR_CODE", _count: { _all: 1 } },
      { channel: "INSTAGRAM", _count: { _all: 1 } }
    ],
    open: 2,
    unassigned: 2,
    highPriority: 0
  });
  assert.match(
    fourWayTie,
    /Facebook, Instagram, QR Code, and X were tied as the leading channels with 1 feedback record each/
  );
  assert.equal(
    buildFeedbackManagementSummary({
      periodTotal: 0,
      channels: [],
      open: 0,
      unassigned: 0,
      highPriority: 0
    }),
    "No feedback matched the selected period and filters."
  );
});

test("Important feedback prefers normalized message content and uses safe fallbacks", () => {
  assert.equal(
    selectImportantFeedbackText(
      "  The delivered order was incomplete and the invoice was incorrect.  ",
      "WhatsApp message"
    ),
    "The delivered order was incomplete and the invoice was incorrect."
  );
  assert.equal(selectImportantFeedbackText("", "WhatsApp message"), "WhatsApp message");
  assert.equal(selectImportantFeedbackText("   ", null), "Feedback text unavailable");
  assert.match(
    reportSource,
    /orderBy: \[\{ priority: "desc" \}, \{ receivedAt: "desc" \}, \{ id: "asc" \}\]/
  );
  assert.doesNotMatch(reportSource, /truncate\(item\.title \|\| item\.message/);

  const report = fixtureReport(
    "FEEDBACK_CUSTOMER_EXPERIENCE",
    "Feedback & Customer Experience Report"
  );
  report.sections = [
    {
      title: "Important customer experience feedback",
      headers: ["Feedback"],
      rows: [["PRODUCT_REQUEST"]]
    }
  ];
  assert.equal(formatReportDocument(report).sections[0]?.rows[0]?.[0], "PRODUCT_REQUEST");
});

test("shared report humanization preserves known initialisms and established labels", () => {
  assert.equal(formatReportDisplayValue("QR_CODE"), "QR Code");
  assert.equal(formatReportDisplayValue("AI_ANALYSIS"), "AI Analysis");
  assert.equal(formatReportDisplayValue("API_ERROR"), "API Error");
  assert.equal(formatReportDisplayValue("CSV_EXPORT"), "CSV Export");
  assert.equal(formatReportDisplayValue("PDF_EXPORT"), "PDF Export");
  assert.equal(formatReportDisplayValue("SMS"), "SMS");
  assert.equal(formatReportDisplayValue("URL"), "URL");
  assert.equal(formatReportDisplayValue("IP"), "IP");
  assert.equal(formatReportDisplayValue("OAUTH"), "OAuth");
  assert.equal(formatReportDisplayValue("BUSINESS_OWNER"), "Business Owner");
  assert.equal(formatReportDisplayValue("GOOGLE_REVIEWS"), "Google Reviews");
  assert.equal(formatReportDisplayValue("NOT_ANALYZED"), "Not analyzed");
  assert.equal(formatReportDisplayValue("OTHER"), "Other");
  assert.equal(formatReportDisplayValue("CUSTOMER"), "Customer");
  assert.equal(formatReportDisplayValue("DRAFT"), "Draft");
  assert.equal(formatReportDisplayValue("PARTIAL"), "Partial");
  assert.equal(formatReportDisplayValue("RECEIVED"), "Received");
  assert.equal(formatReportDisplayValue("RUNNING"), "Running");
  assert.equal(formatReportDisplayValue("NOT_MATCHED"), "Not Matched");
  assert.equal(
    formatReportDisplayValue("COMPLETED_WITH_ERRORS"),
    "Completed with errors"
  );
  assert.equal(formatReportDisplayValue("PRODUCT_REQUEST"), "Product Request");
  assert.equal(formatReportDisplayValue("SERVICE_QUALITY"), "Service Quality");
  assert.equal(formatReportDisplayValue("opaque_record_id"), "opaque_record_id");
});

test("Executive Management Summary uses QR Code consistently in Preview, PDF, and CSV", async () => {
  const report = fixtureReport("EXECUTIVE_PLATFORM", "Executive Platform Report");
  report.managementSummary = buildExecutiveManagementSummary({
    periodFeedback: 4,
    leadingChannel: "QR_CODE",
    activeBusinesses: 1,
    pendingBusinesses: 0,
    liveIntegrations: 0,
    attentionIntegrations: 2
  });
  const preview = formatReportDocument(report);
  assert.match(preview.managementSummary, /QR Code was the leading source/);
  assert.doesNotMatch(preview.managementSummary, /Qr Code/);
  const csv = renderReportCsv(report).toString("utf8");
  assert.match(csv, /QR Code was the leading source/);
  assert.doesNotMatch(csv, /Qr Code/);
  const pdfText = inspectPdfPages(await renderReportPdf(report)).join(" ");
  assert.match(pdfText, /QR Code was the leading source/);
  assert.doesNotMatch(pdfText, /Qr Code/);
});

test("consolidated builders retain required Executive, feedback, and operations data", () => {
  for (const required of [
    "Total businesses (lifetime)",
    "Active businesses",
    "Pending businesses",
    "Total platform users (lifetime)",
    "Total customer profiles (lifetime)",
    "Total feedback (lifetime)",
    "Feedback in selected period",
    "Integration adoption",
    "Workflow status distribution",
    "Priority distribution",
    "Sentiment distribution"
  ])
    assert.ok(reportSource.includes(required), required);

  for (const required of [
    "Channel distribution",
    "Category distribution",
    "Assignment workload",
    "Completion workload",
    "Sentiment analysis",
    "Important customer experience feedback"
  ])
    assert.ok(reportSource.includes(required), required);

  for (const required of [
    "Core services",
    "Integration health summary",
    "Webhook activity",
    "AI processing",
    "Automation execution outcomes",
    "Business approval and platform workload"
  ])
    assert.ok(reportSource.includes(required), required);
});

test("operations report does not claim unsupported infrastructure monitoring", () => {
  for (const unsupported of [
    "process.cpuUsage",
    "os.totalmem",
    "os.uptime",
    "worker heartbeat"
  ]) {
    assert.equal(reportSource.includes(unsupported), false);
  }
  assert.match(
    reportSource,
    /No CPU, RAM, server-uptime, or worker-heartbeat telemetry is collected/
  );
});

test("all three reports render PDF and structured UTF-8 BOM CSV", async () => {
  for (const catalogItem of ADMIN_REPORT_CATALOG) {
    const report = fixtureReport(catalogItem.type, catalogItem.title);
    const csv = renderReportCsv(report);
    assert.equal(csv.subarray(0, 3).toString("hex"), "efbbbf");
    assert.match(csv.toString("utf8"), /Management summary/);
    assert.match(csv.toString("utf8"), /Absolute change/);
    const pdf = await renderReportPdf(report);
    assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
    assert.ok(pdf.length > 1_000);
  }
});

test("all three PDFs preserve intended physical pages and place exactly one true-count footer on every content page", async () => {
  for (const catalogItem of ADMIN_REPORT_CATALOG) {
    const report = paginationFixture(catalogItem.type, catalogItem.title);
    const { buffer, intendedPageCount } = await renderReportPdfWithDiagnostics(report);
    const pages = inspectPdfPages(buffer);
    assert.equal(pages.length, intendedPageCount, catalogItem.title);
    assert.ok(pages.length >= 2, `${catalogItem.title} should exercise pagination`);
    pages.forEach((pageText, index) => {
      const footerPattern = new RegExp(
        `Confidential platform report\\s+${escapeRegExp(catalogItem.title)}\\s+Page ${index + 1} of ${pages.length}`,
        "g"
      );
      assert.equal(pageText.match(footerPattern)?.length ?? 0, 1, pageText);
      const withoutFooter = pageText.replace(footerPattern, "").trim();
      assert.ok(withoutFooter.length > 20, "A footer-only trailing page was rendered.");
    });
  }
});

test("Feedback PDF uses growing multi-line safe excerpts while CSV keeps the full normalized body", async () => {
  const report = fixtureReport(
    "FEEDBACK_CUSTOMER_EXPERIENCE",
    "Feedback & Customer Experience Report"
  );
  const fullMessage =
    "The customer reported that the takeaway order was incomplete, the invoice remained incorrect after two calls, and the promised replacement still had not arrived by closing time. The supervisor needs this complete context to understand the complaint and arrange a useful follow-up without seeing contact details.";
  report.sections = [
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
          fullMessage
        ]
      ],
      semantic: "SENTIMENT"
    }
  ];
  const csv = renderReportCsv(report).toString("utf8");
  assert.match(csv, new RegExp(escapeRegExp(fullMessage)));
  const rendered = await renderReportPdfWithDiagnostics(report);
  const importantRow = rendered.layout.tableRows.find(
    (row) => row.sectionTitle === "Important customer experience feedback"
  );
  assert.ok(importantRow);
  assert.ok(importantRow.height > 30);
  const pdfText = inspectPdfPages(rendered.buffer).join(" ");
  assert.match(pdfText, /invoice remained incorrect after two calls/);
  assert.doesNotMatch(pdfText, /customer@example\.com|\+2507\d+/i);
  assert.equal(inspectPdfPages(rendered.buffer).length, rendered.intendedPageCount);
});

test("Operations PDF uses readable projections while CSV preserves full columns and ISO timestamps", async () => {
  const report = fixtureReport(
    "OPERATIONS_SYSTEM_HEALTH",
    "Operations & System Health Report"
  );
  report.sections = [
    {
      title: "Integration connections",
      headers: [
        "Business",
        "Provider",
        "Mode",
        "Status",
        "Health",
        "Imported",
        "Last relevant activity",
        "Operational note"
      ],
      rows: [
        [
          "Kigali Harvest Cafe",
          "Gmail",
          "LIVE",
          "CONNECTED",
          "HEALTHY",
          6,
          "2026-08-16T18:32:45.000Z",
          "The most recent synchronization completed and imported customer feedback."
        ]
      ],
      semantic: "HEALTH"
    },
    {
      title: "Recent integration activity",
      headers: [
        "Requested",
        "Business",
        "Provider",
        "Mode",
        "Status",
        "Imported",
        "Duplicates",
        "Skipped",
        "Failed",
        "Summary"
      ],
      rows: [
        [
          "2026-08-16T18:32:45.000Z",
          "Kigali Harvest Cafe",
          "EMAIL",
          "LIVE",
          "COMPLETED_WITH_ERRORS",
          6,
          2,
          1,
          1,
          "Synchronization completed with one failed provider item that needs review."
        ]
      ],
      semantic: "HEALTH"
    },
    {
      title: "Recent webhook activity",
      headers: [
        "Received",
        "Business",
        "Provider",
        "Status",
        "Message type",
        "Operational note"
      ],
      rows: [
        [
          "2026-08-16T18:32:45.000Z",
          "Kigali Harvest Cafe",
          "WHATSAPP",
          "COMPLETED",
          "TEXT_MESSAGE",
          "The signed inbound text message was accepted and processed."
        ]
      ],
      semantic: "HEALTH"
    },
    {
      title: "Recent automation execution state",
      headers: [
        "Created",
        "Business",
        "Rule",
        "Status",
        "Matched",
        "Actions completed",
        "Actions skipped",
        "Actions failed"
      ],
      rows: [
        [
          "2026-08-16T18:32:45.000Z",
          "Kigali Harvest Cafe",
          "Escalate urgent negative feedback to the customer care supervisor",
          "SUCCESS",
          "Yes",
          1,
          0,
          0
        ]
      ],
      semantic: "HEALTH"
    }
  ];

  const formatted = formatReportDocument(report);
  const connections = prepareReportPdfTable(formatted.sections[0]!);
  assert.deepEqual(connections.headers, [
    "Business",
    "Provider",
    "Mode",
    "State / health",
    "Imported",
    "Last activity",
    "Operational note"
  ]);
  assert.equal(connections.rows[0]?.[3], "Connected / Healthy");
  assert.equal(connections.rows[0]?.[5], "16 Aug 2026, 18:32");
  assert.match(String(connections.rows[0]?.[6]), /imported customer feedback/);

  const recentRuns = prepareReportPdfTable(formatted.sections[1]!);
  assert.deepEqual(recentRuns.headers, [
    "Requested",
    "Business",
    "Provider",
    "Mode",
    "Status",
    "Imported / failed",
    "Summary"
  ]);
  assert.equal(recentRuns.rows[0]?.[5], "6 / 1");
  assert.match(String(recentRuns.rows[0]?.[6]), /needs review/);

  const webhook = prepareReportPdfTable(formatted.sections[2]!);
  assert.equal(webhook.rows[0]?.[0], "16 Aug 2026, 18:32");
  assert.match(String(webhook.rows[0]?.[5]), /accepted and processed/);

  const automation = prepareReportPdfTable(formatted.sections[3]!);
  assert.deepEqual(automation.headers, [
    "Created",
    "Business",
    "Rule",
    "Status",
    "Matched",
    "Actions completed / skipped / failed"
  ]);
  assert.equal(automation.rows[0]?.[5], "1 / 0 / 0");

  const csv = renderReportCsv(report).toString("utf8");
  assert.match(
    csv,
    /Requested,Business,Provider,Mode,Status,Imported,Duplicates,Skipped,Failed,Summary/
  );
  assert.match(csv, /2026-08-16T18:32:45\.000Z/);
  assert.match(csv, /Actions completed,Actions skipped,Actions failed/);

  const rendered = await renderReportPdfWithDiagnostics(report);
  for (const section of report.sections) {
    const row = rendered.layout.tableRows.find(
      (item) => item.sectionTitle === section.title
    );
    assert.ok(row, section.title);
    assert.ok(row.height >= 30, section.title);
  }
  assert.equal(inspectPdfPages(rendered.buffer).length, rendered.intendedPageCount);
});

test("PDF timestamp formatting is concise, UTC-stable, and leaves non-ISO values intact", () => {
  assert.equal(
    formatReportPdfTimestamp("2026-08-16T18:32:45.000Z"),
    "16 Aug 2026, 18:32"
  );
  assert.equal(formatReportPdfTimestamp("No activity recorded"), "No activity recorded");
});

test("PDF and CSV retain the full supported trend dataset", async () => {
  const report = fixtureReport(
    "FEEDBACK_CUSTOMER_EXPERIENCE",
    "Feedback & Customer Experience Report"
  );
  const trendRows = Array.from({ length: 45 }, (_, index) => [
    `Trend day ${String(index + 1).padStart(2, "0")}`,
    index
  ]);
  report.sections = [
    {
      title: "Feedback trend",
      headers: ["Period", "Feedback"],
      rows: trendRows
    }
  ];
  const csv = renderReportCsv(report).toString("utf8");
  assert.match(csv, /Trend day 01/);
  assert.match(csv, /Trend day 45/);
  const pdfText = inspectPdfPages(await renderReportPdf(report)).join(" ");
  assert.match(pdfText, /Trend day 01/);
  assert.match(pdfText, /Trend day 45/);
});

test("PDF sections and helper exits use canonical content geometry without cursor leakage", async () => {
  const { layout } = await renderReportPdfWithDiagnostics(
    paginationFixture("EXECUTIVE_PLATFORM", "Executive Platform Report")
  );
  assert.equal(layout.geometry.contentLeft, 48);
  assert.ok(layout.geometry.contentRight > layout.geometry.contentLeft);
  assert.equal(
    layout.geometry.contentWidth,
    layout.geometry.contentRight - layout.geometry.contentLeft
  );
  const requiredHeadings = [
    "Feedback by business",
    "Priority distribution",
    "Sentiment distribution",
    "User roles with selected-branch access",
    "Business adoption overview (selected branch)",
    "Integration adoption (routed to branch)",
    "Integration health (routed to branch)",
    "Business-wide approval workload"
  ];
  for (const title of requiredHeadings) {
    const placement = layout.sections.find((item) => item.title === title);
    assert.ok(placement, title);
    assert.equal(placement.titleX, layout.geometry.contentLeft, title);
    assert.equal(placement.descriptionX, layout.geometry.contentLeft, title);
  }
  assert.ok(layout.helperExits.some((item) => item.helper === "table"));
  assert.ok(layout.helperExits.some((item) => item.helper === "visual-summary"));
  for (const exit of layout.helperExits) {
    assert.equal(exit.x, layout.geometry.contentLeft, exit.helper);
  }
});

test("section preflight keeps heading, description, and initial content on one page", async () => {
  const { layout } = await renderReportPdfWithDiagnostics(pageBreakFixture());
  for (const section of layout.sections) {
    assert.equal(section.descriptionPage, section.headingPage, section.title);
    assert.equal(section.initialContentPage, section.headingPage, section.title);
  }
  const integration = layout.sections.find(
    (section) => section.title === "Integration adoption (routed to branch)"
  );
  assert.ok(integration);
  assert.equal(integration.movedToNewPage, true);
  assert.equal(integration.descriptionPage, integration.headingPage);
  assert.equal(integration.initialContentPage, integration.headingPage);
});

test("previous-period comparison uses stable columns and readable growing rows", async () => {
  const report = fixtureReport("EXECUTIVE_PLATFORM", "Executive Platform Report");
  report.comparison = [
    createReportComparison(
      "New users with selected-branch access across the complete business scope",
      4,
      0
    )
  ];
  const { buffer, layout } = await renderReportPdfWithDiagnostics(report);
  assert.deepEqual(
    layout.comparisonColumns.map((column) => column.label),
    ["Metric", "Current", "Previous", "Change", "Comparison"]
  );
  layout.comparisonColumns.forEach((column, index) => {
    assert.ok(column.width > 40, column.label);
    if (index > 0) {
      const previous = layout.comparisonColumns[index - 1]!;
      assert.equal(column.x, previous.x + previous.width);
    }
  });
  const last = layout.comparisonColumns.at(-1)!;
  assert.ok(Math.abs(last.x + last.width - layout.geometry.contentRight) < 0.001);
  assert.ok(layout.comparisonRows[0]!.height > 30);
  assert.match(inspectPdfPages(buffer).join(" "), /No prior baseline/);
});

test("preview document, PDF, and CSV share scope wording and supervisor-facing labels", async () => {
  const source = fixtureReport("EXECUTIVE_PLATFORM", "Executive Platform Report");
  source.scope = {
    level: "BRANCH",
    label: "Kigali Harvest Cafe / Kiyovu Downtown Branch",
    notes: [
      "Customer profiles remain business-wide because Customer has no branch ownership relationship."
    ],
    metrics: {
      businesses: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE",
      branches: "BRANCH_SCOPED",
      users: "BRANCH_SCOPED",
      customers: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE",
      feedback: "BRANCH_SCOPED",
      integrations: "BRANCH_SCOPED",
      approvalWorkload: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE"
    }
  };
  source.highlights = [
    { label: "Users in scope (lifetime)", value: 5 },
    { label: "Business customer profiles (business-wide, lifetime)", value: 6 }
  ];
  source.comparison = [createReportComparison("New users in scope", 2, 0)];
  source.sections = [
    {
      title: "Display labels",
      headers: ["Channel", "Sentiment", "Role", "Provider"],
      rows: [["QR_CODE", "NOT_ANALYZED", "BUSINESS_OWNER", "GOOGLE_REVIEWS"]]
    }
  ];
  const preview = formatReportDocument(source);
  assert.deepEqual(preview.sections[0]?.rows[0], [
    "QR Code",
    "Not analyzed",
    "Business Owner",
    "Google Reviews"
  ]);
  const csv = renderReportCsv(source).toString("utf8");
  assert.equal(csv.startsWith("\uFEFF"), true);
  assert.match(csv, /Scope,Kigali Harvest Cafe \/ Kiyovu Downtown Branch/);
  assert.match(csv, /Users in scope \(lifetime\),5/);
  assert.match(csv, /New users in scope,2,0,2,No prior baseline/);
  assert.match(csv, /QR Code,Not analyzed,Business Owner,Google Reviews/);
  const pdfPages = inspectPdfPages(await renderReportPdf(source)).join("");
  assert.match(pdfPages, /Scope: Kigali Harvest Cafe \/ Kiyovu Downtown Branch/);
  assert.match(pdfPages, /Users in scope \(lifetime\)/);
  assert.match(pdfPages, /Business customer profiles \(business-wide, lifetime\)/);
});

test("CSV preserves escaping and prevents formula execution after display humanization", () => {
  const report = fixtureReport("EXECUTIVE_PLATFORM", "Executive Platform Report");
  report.sections = [
    {
      title: "CSV safety",
      headers: ["Business", "Value"],
      rows: [
        ['Cafe, "Downtown"', "QR_CODE"],
        ["=SUM(1,1)", "PLATFORM_ADMIN"],
        ["+cmd|' /C calc'!A0", "NOT_ANALYZED"]
      ]
    }
  ];
  const csv = renderReportCsv(report).toString("utf8");
  assert.match(csv, /"Cafe, ""Downtown""",QR Code/);
  assert.match(csv, /"'=SUM\(1,1\)",Platform Administrator/);
  assert.match(csv, /'\+cmd\|' \/C calc'!A0,Not analyzed/);
});

test("empty report sections render safely in both export formats", async () => {
  const report = fixtureReport(
    "FEEDBACK_CUSTOMER_EXPERIENCE",
    "Feedback & Customer Experience Report"
  );
  report.highlights = [{ label: "Feedback in selected period", value: 0 }];
  report.managementSummary = "No feedback matched the selected period and filters.";
  report.sections = [
    {
      title: "Channel distribution",
      headers: ["Channel", "Count"],
      rows: [],
      emptyMessage: "No feedback matched the selected period and filters."
    }
  ];
  assert.match(renderReportCsv(report).toString("utf8"), /Channel distribution/);
  const pdf = await renderReportPdf(report);
  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
});

test("Executive PDF safely paginates the complete KPI summary", async () => {
  const report = fixtureReport("EXECUTIVE_PLATFORM", "Executive Platform Report");
  report.highlights = Array.from({ length: 23 }, (_, index) => ({
    label: `Persisted KPI ${index + 1}`,
    value: index
  }));
  const pdf = await renderReportPdf(report);
  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(pdf.length > 2_000);
});

test("date validation rejects reversed, missing, and overlong reporting windows", () => {
  assert.equal(
    adminReportRequestSchema.safeParse({
      reportType: "EXECUTIVE_PLATFORM",
      dateFrom: "2026-08-31",
      dateTo: "2026-08-01"
    }).success,
    false
  );
  assert.equal(
    adminReportRequestSchema.safeParse({
      reportType: "EXECUTIVE_PLATFORM",
      dateFrom: "2026-08-01"
    }).success,
    false
  );
  assert.equal(
    adminReportRequestSchema.safeParse({
      reportType: "EXECUTIVE_PLATFORM",
      dateFrom: "2025-01-01",
      dateTo: "2026-08-01"
    }).success,
    false
  );
});

test("report source selects no credential, token, secret, raw payload, or attachment URL", () => {
  for (const forbidden of [
    "passwordHash",
    "encryptedAccessToken",
    "encryptedRefreshToken",
    "encryptedAppSecret",
    "webhookVerifyTokenHash",
    "lastProviderCursor",
    "payloadHash",
    "externalUrl",
    "checksum"
  ])
    assert.equal(reportSource.includes(`${forbidden}: true`), false, forbidden);
});

function fixtureReport(reportType: string, title: string): AdminReportDocument {
  return {
    branding: {
      platformName: "SME Feedback Aggregator",
      primaryColor: "#4F46E5",
      reportFooterText: "Confidential platform report"
    },
    title,
    reportType,
    scope: {
      level: "PLATFORM",
      label: "Platform-wide",
      notes: ["No Business or Branch filter is applied."],
      metrics: {
        businesses: "PLATFORM_WIDE",
        branches: "PLATFORM_WIDE",
        users: "PLATFORM_WIDE",
        customers: "PLATFORM_WIDE",
        feedback: "PLATFORM_WIDE",
        integrations: "PLATFORM_WIDE",
        approvalWorkload: "PLATFORM_WIDE"
      }
    },
    period: {
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z"
    },
    generatedAt: "2026-08-31T12:00:00.000Z",
    filters: ["All Businesses", "All Branches"],
    managementSummary: "Five feedback records were received from persisted data.",
    highlights: [
      { label: "Total feedback (lifetime)", value: 16 },
      { label: "Feedback in selected period", value: 5 }
    ],
    comparison: [createReportComparison("Feedback received", 5, 4)],
    sections: [
      {
        title: "Channel distribution",
        headers: ["Channel", "Count", "Percentage"],
        rows: [
          ["EMAIL", 4, "80.0%"],
          ["WHATSAPP", 1, "20.0%"]
        ]
      }
    ]
  };
}

function paginationFixture(reportType: string, title: string): AdminReportDocument {
  const report = fixtureReport(reportType, title);
  report.highlights = Array.from({ length: 24 }, (_, index) => ({
    label: `Persisted KPI ${index + 1}`,
    value: index
  }));
  const sectionTitles = [
    "Feedback by business",
    "Priority distribution",
    "Sentiment distribution",
    "User roles with selected-branch access",
    "Business adoption overview (selected branch)",
    "Integration adoption (routed to branch)",
    "Integration health (routed to branch)",
    "Business-wide approval workload"
  ];
  report.sections = sectionTitles.map((sectionTitle) => ({
    title: sectionTitle,
    description:
      "This section description must remain aligned with its heading and grouped with the table header and first persisted row.",
    headers: ["State", "Count", "Percentage"],
    rows: Array.from({ length: 8 }, (_, rowIndex) => [
      rowIndex % 2 ? "HEALTHY" : "NEEDS_ATTENTION",
      rowIndex + 1,
      `${(rowIndex + 1) * 10}%`
    ])
  }));
  return report;
}

function pageBreakFixture(): AdminReportDocument {
  const report = fixtureReport("EXECUTIVE_PLATFORM", "Executive Platform Report");
  report.comparison = undefined;
  report.sections = [
    {
      title: "Preceding persisted detail",
      description:
        "This table intentionally leaves too little room for the next section.",
      headers: ["Record", "State"],
      rows: Array.from({ length: 12 }, (_, index) => [
        `Persisted record ${index + 1}`,
        index % 2 ? "Available" : "Recorded"
      ])
    },
    {
      title: "Integration adoption (routed to branch)",
      description:
        "Connections are scoped by their required default Branch, which is where imported feedback is routed.",
      headers: ["Provider", "Mode", "Connections"],
      rows: [["GOOGLE_REVIEWS", "DEMO", 3]]
    }
  ];
  return report;
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
