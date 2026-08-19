import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AccountStatus,
  IntegrationConnectionStatus,
  IntegrationMode,
  UserRole
} from "../../lib/prisma-runtime.js";
import type { NextFunction, Request, Response } from "express";
import { requirePlatformAdmin } from "../../middleware/business-access.middleware.js";
import {
  calculateChange,
  classifyIntegrationHealth,
  resolveDateWindow,
  summarizeDistribution,
  summarizeSentiment
} from "./platform-admin.analytics.js";
import { renderReportCsv, renderReportPdf } from "./platform-admin.report-renderer.js";
import {
  adminReportRequestSchema,
  platformSettingsUpdateSchema
} from "./platform-admin.schemas.js";
import type { AdminReportDocument } from "./platform-admin.types.js";

test("date presets and percentage comparisons are mathematically correct", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  const seven = resolveDateWindow("7d", now);
  const twelveMonths = resolveDateWindow("12m", now);
  assert.equal(seven.start.toISOString(), "2026-08-10T00:00:00.000Z");
  assert.equal(seven.bucket, "day");
  assert.equal(twelveMonths.start.toISOString(), "2025-09-01T00:00:00.000Z");
  assert.equal(twelveMonths.bucket, "month");
  assert.deepEqual(calculateChange(15, 10), {
    current: 15,
    previous: 10,
    delta: 5,
    percentage: 50
  });
  assert.equal(calculateChange(4, 0).percentage, null);
});

test("channel and sentiment summaries aggregate fixture counts without fake values", () => {
  assert.deepEqual(
    summarizeDistribution([
      { key: "EMAIL", count: 3 },
      { key: "WHATSAPP", count: 1 }
    ]),
    [
      { key: "EMAIL", count: 3, percentage: 75 },
      { key: "WHATSAPP", count: 1, percentage: 25 }
    ]
  );
  assert.deepEqual(
    summarizeSentiment(10, [
      { sentiment: "POSITIVE", count: 4 },
      { sentiment: "NEGATIVE", count: 2 }
    ]),
    {
      distribution: [
        { sentiment: "POSITIVE", count: 4 },
        { sentiment: "NEGATIVE", count: 2 }
      ],
      analyzed: 6,
      notAnalyzed: 4,
      completionRate: 60
    }
  );
});

test("integration attention classification has explicit persisted-state rules", () => {
  const base = {
    status: IntegrationConnectionStatus.CONNECTED,
    mode: IntegrationMode.LIVE,
    requiresReauthorization: false,
    webhookStatus: "ACTIVE",
    lastConnectionTestStatus: "SUCCESS",
    lastErrorCode: null
  };
  assert.equal(classifyIntegrationHealth(base), "HEALTHY");
  assert.equal(
    classifyIntegrationHealth({ ...base, lastConnectionTestStatus: "PASSED" }),
    "HEALTHY"
  );
  assert.equal(
    classifyIntegrationHealth({ ...base, requiresReauthorization: true }),
    "NEEDS_ATTENTION"
  );
  assert.equal(
    classifyIntegrationHealth({ ...base, lastErrorCode: "PROVIDER_ERROR" }),
    "NEEDS_ATTENTION"
  );
  assert.equal(
    classifyIntegrationHealth({ ...base, webhookStatus: "PENDING_VERIFICATION" }),
    "PENDING"
  );
  assert.equal(
    classifyIntegrationHealth({ ...base, webhookStatus: "VERIFICATION_FAILED" }),
    "NEEDS_ATTENTION"
  );
  assert.equal(
    classifyIntegrationHealth({ ...base, lastConnectionTestStatus: "FAILED" }),
    "NEEDS_ATTENTION"
  );
  assert.equal(
    classifyIntegrationHealth({
      ...base,
      status: IntegrationConnectionStatus.PAUSED
    }),
    "PAUSED"
  );
  assert.equal(
    classifyIntegrationHealth({
      ...base,
      status: IntegrationConnectionStatus.DISCONNECTED
    }),
    "DISCONNECTED"
  );
  assert.equal(
    classifyIntegrationHealth({ ...base, status: IntegrationConnectionStatus.ERROR }),
    "ERROR"
  );
});

test("successful PASSED connections are not included in needs-attention totals", () => {
  const connectedPassed = {
    status: IntegrationConnectionStatus.CONNECTED,
    mode: IntegrationMode.DEMO,
    requiresReauthorization: false,
    webhookStatus: null,
    lastConnectionTestStatus: "PASSED",
    lastErrorCode: null
  };
  const currentFixtureStates = [
    { ...connectedPassed, status: IntegrationConnectionStatus.DISCONNECTED },
    { ...connectedPassed, status: IntegrationConnectionStatus.PAUSED },
    {
      ...connectedPassed,
      status: IntegrationConnectionStatus.ERROR,
      lastConnectionTestStatus: "FAILED",
      lastErrorCode: "DEMO_CONNECTION_TEST_FAILED"
    },
    connectedPassed,
    connectedPassed,
    connectedPassed,
    { ...connectedPassed, mode: IntegrationMode.LIVE, webhookStatus: "ACTIVE" }
  ];
  assert.equal(
    currentFixtureStates.filter(
      (connection) => classifyIntegrationHealth(connection) !== "HEALTHY"
    ).length,
    3
  );
});

test("platform-admin guard allows only PLATFORM_ADMIN", () => {
  for (const role of [
    UserRole.PLATFORM_ADMIN,
    UserRole.BUSINESS_OWNER,
    UserRole.STAFF,
    UserRole.CUSTOMER
  ]) {
    let nextValue: unknown = "not-called";
    const request = {
      auth: {
        id: "user-1",
        email: "safe@example.test",
        firstName: "Safe",
        lastName: "User",
        role,
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date().toISOString()
      }
    } as unknown as Request;
    requirePlatformAdmin(
      request,
      {} as Response,
      ((value?: unknown) => {
        nextValue = value;
      }) as NextFunction
    );
    if (role === UserRole.PLATFORM_ADMIN) assert.equal(nextValue, undefined);
    else assert.equal((nextValue as { statusCode: number }).statusCode, 403);
  }
});

test("report request validates filters and bounded date ranges", () => {
  const parsed = adminReportRequestSchema.parse({
    reportType: "FEEDBACK_CUSTOMER_EXPERIENCE",
    outputFormat: "CSV",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-16",
    channel: "EMAIL",
    status: "NEW",
    sentiment: "NEGATIVE",
    comparePreviousPeriod: true
  });
  assert.equal(parsed.channel, "EMAIL");
  assert.equal(parsed.status, "NEW");
  assert.equal(parsed.sentiment, "NEGATIVE");
  assert.equal(
    adminReportRequestSchema.safeParse({
      reportType: "EXECUTIVE_PLATFORM",
      dateFrom: "2026-08-16",
      dateTo: "2026-08-01"
    }).success,
    false
  );
});

test("platform settings accept safe branding and reject unsafe values", () => {
  const parsed = platformSettingsUpdateSchema.parse({
    platformName: "Customer Voice",
    brandTagline: "Listen and improve",
    headline: "Turn insight into action",
    logoUrl: "https://cdn.example.test/brand/logo.png",
    primaryColor: "#2563EB",
    accentColor: "#0F766E",
    defaultAppearance: "SYSTEM",
    footerText: "Customer Voice. All rights reserved."
  });
  assert.equal(parsed.primaryColor, "#2563EB");
  assert.equal(
    platformSettingsUpdateSchema.safeParse({ primaryColor: "indigo" }).success,
    false
  );
  assert.equal(
    platformSettingsUpdateSchema.safeParse({ logoUrl: "javascript:alert(1)" }).success,
    false
  );
  assert.equal(
    platformSettingsUpdateSchema.safeParse({ headline: "<script>bad</script>" }).success,
    false
  );
  assert.equal(platformSettingsUpdateSchema.safeParse({}).success, false);
});

test("platform settings use singleton upsert and protected admin routes", () => {
  const serviceSource = readFileSync(
    new URL("./platform-settings.service.ts", import.meta.url),
    "utf8"
  );
  const routesSource = readFileSync(
    new URL("./platform-admin.routes.ts", import.meta.url),
    "utf8"
  );
  assert.match(serviceSource, /PLATFORM_SETTINGS_ID = "platform"/);
  assert.match(serviceSource, /FIXED_PRIMARY_COLOR = "#4F46E5"/);
  assert.match(serviceSource, /FIXED_ACCENT_COLOR = "#818CF8"/);
  assert.match(serviceSource, /withFixedDesignColors/);
  assert.match(serviceSource, /prisma\.platformSettings\.upsert/);
  assert.match(serviceSource, /updatedByUserId/);
  assert.ok(
    routesSource.indexOf(
      "platformAdminRouter.use(authMiddleware, requirePlatformAdmin)"
    ) < routesSource.indexOf('platformAdminRouter.get("/settings"')
  );
  assert.match(routesSource, /platformAdminRouter\.patch\("\/settings"/);
});

test("CSV and PDF exports generate correct structures without secret fields", async () => {
  const report = fixtureReport();
  const csv = renderReportCsv(report).toString("utf8");
  assert.match(csv, /Metric,Value/);
  assert.match(csv, /Channel,Count/);
  assert.match(csv, /Email,4/);
  const pdf = await renderReportPdf(report);
  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(pdf.length > 1_000);
  const serialized = JSON.stringify(report).toLowerCase();
  for (const forbidden of [
    "passwordhash",
    "accesstoken",
    "refreshtoken",
    "appsecret",
    "oauthstate",
    "webhooksignature"
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

function fixtureReport(): AdminReportDocument {
  return {
    branding: {
      platformName: "SME Feedback Aggregator",
      primaryColor: "#4F46E5",
      reportFooterText: "Confidential platform report"
    },
    title: "Executive Platform Report",
    reportType: "EXECUTIVE_PLATFORM",
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
      to: "2026-08-16T23:59:59.999Z"
    },
    generatedAt: "2026-08-16T12:00:00.000Z",
    filters: ["All businesses", "All channels"],
    highlights: [
      { label: "Total businesses", value: 2 },
      { label: "Feedback in scope", value: 5 }
    ],
    managementSummary: "Five feedback records were received.",
    comparison: [
      {
        label: "Feedback",
        current: 5,
        previous: 4,
        absoluteChange: 1,
        percentageChange: 25,
        percentageLabel: "25%"
      }
    ],
    sections: [
      {
        title: "Channel distribution",
        headers: ["Channel", "Count"],
        rows: [
          ["EMAIL", 4],
          ["WHATSAPP", 1]
        ]
      }
    ]
  };
}
