import type { Prisma } from "@prisma/client";
import {
  AccountStatus,
  AutomationRuleStatus,
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackPriority,
  FeedbackStatus,
  IntegrationConnectionStatus,
  IntegrationMode,
  Prisma as PrismaRuntime
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  calculateChange,
  classifyIntegrationHealth
} from "./platform-admin.analytics.js";
import {
  formatReportDisplayValue,
  formatReportDocument
} from "./platform-admin.report-format.js";
import type { AdminReportRequest, AdminReportType } from "./platform-admin.schemas.js";
import { completeTimeSeries, reportBucket } from "./platform-admin.service.js";
import type {
  AdminReportDocument,
  ReportComparison,
  ReportSection
} from "./platform-admin.types.js";
import { getPlatformSettings } from "./platform-settings.service.js";
import {
  supportedLiveIntegrationWhere,
  supportedOperationalFeedbackWhere
} from "../integrations/supported-integration-policy.js";

type ReportInput = Omit<AdminReportRequest, "outputFormat">;
type CountGroup<T extends Record<string, unknown>> = T & { _count: { _all: number } };
type SqlCountRow = { bucket: Date | string; count: bigint | number };

type FeedbackScopeInput = Pick<
  ReportInput,
  "reportType" | "businessId" | "branchId" | "channel" | "status" | "sentiment"
>;

export type FeedbackScopePlan = {
  where: Prisma.FeedbackWhereInput;
  filters: {
    businessId?: string;
    branchId?: string;
    channel?: string;
    status?: string;
    sentiment?: string;
    from?: Date;
    to?: Date;
  };
};

type ReportContext = {
  input: ReportInput;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  business: { id: string; name: string } | null;
  branch: { id: string; name: string; businessId: string } | null;
  scopeBusinessId?: string;
};

type ExecutiveScopePlan = {
  businessWhere: Prisma.BusinessWhereInput;
  branchWhere: Prisma.BranchWhereInput;
  userWhere: Prisma.UserWhereInput;
  customerWhere: Prisma.CustomerWhereInput;
  integrationWhere: Prisma.IntegrationConnectionWhereInput;
  membershipCountWhere?: Prisma.BusinessMembershipWhereInput;
  feedbackRelationWhere?: Prisma.FeedbackWhereInput;
  integrationRelationWhere: Prisma.IntegrationConnectionWhereInput;
  labels: {
    businesses: string;
    branches: string;
    users: string;
    activeUsers: string;
    inactiveUsers: string;
    customers: string;
    integrations: string;
    liveIntegrations: string;
    attentionIntegrations: string;
    newUsers: string;
  };
};

export const integrationHealthSelect = {
  id: true,
  provider: true,
  mode: true,
  status: true,
  liveProviderType: true,
  requiresReauthorization: true,
  webhookStatus: true,
  lastConnectionTestStatus: true,
  lastErrorCode: true,
  lastInboundMessageAt: true,
  lastAttemptedSyncAt: true,
  lastSuccessfulSyncAt: true,
  totalImported: true,
  updatedAt: true,
  business: { select: { id: true, name: true } }
} satisfies Prisma.IntegrationConnectionSelect;

export type IntegrationHealthRecord = Prisma.IntegrationConnectionGetPayload<{
  select: typeof integrationHealthSelect;
}>;

export const ADMIN_REPORT_CATALOG = [
  {
    type: "EXECUTIVE_PLATFORM",
    title: "Executive Platform Report"
  },
  {
    type: "FEEDBACK_CUSTOMER_EXPERIENCE",
    title: "Feedback & Customer Experience Report"
  },
  {
    type: "OPERATIONS_SYSTEM_HEALTH",
    title: "Operations & System Health Report"
  }
] as const satisfies ReadonlyArray<{ type: AdminReportType; title: string }>;

export async function buildAdminReport(input: ReportInput): Promise<AdminReportDocument> {
  const context = await createReportContext(input);
  const platformSettings = await getPlatformSettings();
  const report: AdminReportDocument = {
    branding: {
      platformName: platformSettings.platformName,
      primaryColor: "#4F46E5",
      reportFooterText: platformSettings.reportFooterText
    },
    title: reportTitle(input.reportType),
    reportType: input.reportType,
    scope: createReportScopeMetadata(context),
    period: { from: context.from.toISOString(), to: context.to.toISOString() },
    generatedAt: new Date().toISOString(),
    filters: reportFilters(context),
    managementSummary: "",
    highlights: [],
    sections: []
  };

  if (input.reportType === "EXECUTIVE_PLATFORM") {
    await buildExecutiveReport(report, context);
  } else if (input.reportType === "FEEDBACK_CUSTOMER_EXPERIENCE") {
    await buildFeedbackExperienceReport(report, context);
  } else {
    await buildOperationsHealthReport(report, context);
  }

  return formatReportDocument(report);
}

async function createReportContext(input: ReportInput): Promise<ReportContext> {
  const from = startOfUtcDay(input.dateFrom);
  const to = endOfUtcDay(input.dateTo);
  const duration = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration + 1);
  const [business, branch] = await Promise.all([
    input.businessId
      ? prisma.business.findUnique({
          where: { id: input.businessId },
          select: { id: true, name: true }
        })
      : null,
    input.branchId
      ? prisma.branch.findUnique({
          where: { id: input.branchId },
          select: { id: true, name: true, businessId: true }
        })
      : null
  ]);

  if (input.businessId && !business) {
    throw new AppError(
      "The selected business was not found.",
      "REPORT_BUSINESS_NOT_FOUND",
      404
    );
  }
  if (input.branchId && !branch) {
    throw new AppError(
      "The selected branch was not found.",
      "REPORT_BRANCH_NOT_FOUND",
      404
    );
  }
  if (business && branch && branch.businessId !== business.id) {
    throw new AppError(
      "The selected branch does not belong to the selected business.",
      "REPORT_BRANCH_BUSINESS_MISMATCH",
      400
    );
  }

  return {
    input,
    from,
    to,
    previousFrom,
    previousTo,
    business,
    branch,
    scopeBusinessId: business?.id ?? branch?.businessId
  };
}

export function createFeedbackScope(
  input: FeedbackScopeInput,
  from?: Date,
  to?: Date
): Prisma.FeedbackWhereInput {
  return createFeedbackScopePlan(input, from, to).where;
}

export function createFeedbackScopePlan(
  input: FeedbackScopeInput,
  from?: Date,
  to?: Date
): FeedbackScopePlan {
  const feedbackFilters = input.reportType === "FEEDBACK_CUSTOMER_EXPERIENCE";
  const filters = {
    businessId: input.businessId,
    branchId: input.branchId,
    channel: feedbackFilters ? input.channel : undefined,
    status: feedbackFilters ? input.status : undefined,
    sentiment: feedbackFilters ? input.sentiment : undefined,
    from,
    to
  };
  return {
    filters,
    where: {
      deletedAt: null,
      businessId: filters.businessId,
      branchId: filters.branchId,
      channel: filters.channel,
      status: filters.status,
      receivedAt:
        filters.from && filters.to ? { gte: filters.from, lte: filters.to } : undefined,
      ...(filters.sentiment
        ? { aiAnalysis: { is: { sentiment: filters.sentiment } } }
        : {}),
      AND: [supportedOperationalFeedbackWhere()]
    }
  };
}

export function createReportComparison(
  label: string,
  current: number,
  previous: number
): ReportComparison {
  const change = calculateChange(current, previous);
  return {
    label,
    current,
    previous,
    absoluteChange: change.delta,
    percentageChange: change.percentage,
    percentageLabel:
      change.percentage === null ? "No prior baseline" : `${change.percentage}%`
  };
}

export function createExecutiveScopePlan(
  input: Pick<ReportInput, "businessId" | "branchId">,
  scopeBusinessId?: string
): ExecutiveScopePlan {
  const branchId = input.branchId;
  const businessWhere: Prisma.BusinessWhereInput = scopeBusinessId
    ? { id: scopeBusinessId }
    : {};
  const branchWhere: Prisma.BranchWhereInput = {
    businessId: scopeBusinessId,
    id: branchId
  };
  const membershipBranchScope: Prisma.BusinessMembershipWhereInput | undefined = branchId
    ? {
        OR: [{ allBranchesAccess: true }, { branchAccess: { some: { branchId } } }]
      }
    : undefined;
  const userWhere: Prisma.UserWhereInput = scopeBusinessId
    ? {
        businessMemberships: {
          some: {
            businessId: scopeBusinessId,
            ...membershipBranchScope
          }
        }
      }
    : {};
  const filtered = Boolean(scopeBusinessId);
  return {
    businessWhere,
    branchWhere,
    userWhere,
    customerWhere: { businessId: scopeBusinessId },
    integrationWhere: {
      businessId: scopeBusinessId,
      defaultBranchId: branchId,
      AND: [supportedLiveIntegrationWhere()]
    },
    membershipCountWhere: membershipBranchScope,
    feedbackRelationWhere: branchId ? { branchId } : undefined,
    integrationRelationWhere: {
      status: { not: IntegrationConnectionStatus.DISCONNECTED },
      defaultBranchId: branchId
    },
    labels: {
      businesses: filtered
        ? branchId
          ? "Business represented by selected branch"
          : "Businesses in scope (lifetime)"
        : "Total businesses (lifetime)",
      branches: filtered ? "Branches in scope (lifetime)" : "Total branches (lifetime)",
      users: filtered ? "Users in scope (lifetime)" : "Total platform users (lifetime)",
      activeUsers: filtered ? "Active users in scope" : "Active platform users",
      inactiveUsers: filtered
        ? "Disabled or suspended users in scope"
        : "Disabled or suspended platform users",
      customers: branchId
        ? "Business customer profiles (business-wide, lifetime)"
        : filtered
          ? "Customer profiles in scope (lifetime)"
          : "Total customer profiles (lifetime)",
      integrations: branchId
        ? "Integration connections routed to branch"
        : filtered
          ? "Integration connections in scope"
          : "Total integration connections",
      liveIntegrations: branchId
        ? "Live integrations routed to branch"
        : "Live integrations",
      attentionIntegrations: branchId
        ? "Routed integrations needing attention"
        : "Integrations needing attention",
      newUsers: filtered ? "New users in scope" : "New platform users"
    }
  };
}

async function buildExecutiveReport(report: AdminReportDocument, context: ReportContext) {
  const { input, from, to, previousFrom, previousTo, scopeBusinessId } = context;
  const scope = createExecutiveScopePlan(input, scopeBusinessId);
  const { businessWhere, branchWhere, userWhere, customerWhere, integrationWhere } =
    scope;
  const lifetimeFeedbackScope = createFeedbackScopePlan(
    { ...input, businessId: scopeBusinessId },
    undefined,
    undefined
  );
  const periodFeedbackScope = createFeedbackScopePlan(
    { ...input, businessId: scopeBusinessId },
    from,
    to
  );
  const previousFeedbackScope = createFeedbackScopePlan(
    { ...input, businessId: scopeBusinessId },
    previousFrom,
    previousTo
  );
  const lifetimeFeedbackWhere = lifetimeFeedbackScope.where;
  const periodFeedbackWhere = periodFeedbackScope.where;
  const previousFeedbackWhere = previousFeedbackScope.where;
  const now = new Date();
  const today = startOfUtcDay(now);
  const week = new Date(today);
  week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    businessStatuses,
    newBusinesses,
    previousBusinesses,
    branches,
    totalUsers,
    userRoles,
    userStatuses,
    newUsers,
    previousUsers,
    customers,
    totalFeedback,
    periodFeedback,
    previousFeedback,
    feedbackToday,
    feedbackWeek,
    feedbackMonth,
    openFeedback,
    completedFeedback,
    channels,
    feedbackBusinesses,
    statuses,
    priorities,
    sentiments,
    aiCompleted,
    connections,
    integrationAdoption,
    businessAdoption,
    trend
  ] = await Promise.all([
    prisma.business.groupBy({
      by: ["status"],
      where: businessWhere,
      _count: { _all: true }
    }),
    prisma.business.count({
      where: { ...businessWhere, createdAt: { gte: from, lte: to } }
    }),
    prisma.business.count({
      where: { ...businessWhere, createdAt: { gte: previousFrom, lte: previousTo } }
    }),
    prisma.branch.count({ where: branchWhere }),
    prisma.user.count({ where: userWhere }),
    prisma.user.groupBy({ by: ["role"], where: userWhere, _count: { _all: true } }),
    prisma.user.groupBy({ by: ["status"], where: userWhere, _count: { _all: true } }),
    prisma.user.count({ where: { ...userWhere, createdAt: { gte: from, lte: to } } }),
    prisma.user.count({
      where: { ...userWhere, createdAt: { gte: previousFrom, lte: previousTo } }
    }),
    prisma.customer.count({ where: customerWhere }),
    prisma.feedback.count({ where: lifetimeFeedbackWhere }),
    prisma.feedback.count({ where: periodFeedbackWhere }),
    prisma.feedback.count({ where: previousFeedbackWhere }),
    prisma.feedback.count({
      where: { ...lifetimeFeedbackWhere, receivedAt: { gte: today, lte: now } }
    }),
    prisma.feedback.count({
      where: { ...lifetimeFeedbackWhere, receivedAt: { gte: week, lte: now } }
    }),
    prisma.feedback.count({
      where: { ...lifetimeFeedbackWhere, receivedAt: { gte: month, lte: now } }
    }),
    prisma.feedback.count({
      where: {
        ...lifetimeFeedbackWhere,
        status: { in: [FeedbackStatus.NEW, FeedbackStatus.IN_REVIEW] }
      }
    }),
    prisma.feedback.count({
      where: {
        ...lifetimeFeedbackWhere,
        status: { in: [FeedbackStatus.RESOLVED, FeedbackStatus.CLOSED] }
      }
    }),
    prisma.feedback.groupBy({
      by: ["channel"],
      where: periodFeedbackWhere,
      _count: { _all: true }
    }),
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: periodFeedbackWhere,
      _count: { _all: true }
    }),
    prisma.feedback.groupBy({
      by: ["status"],
      where: periodFeedbackWhere,
      _count: { _all: true }
    }),
    prisma.feedback.groupBy({
      by: ["priority"],
      where: periodFeedbackWhere,
      _count: { _all: true }
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["sentiment"],
      where: {
        status: FeedbackAIAnalysisStatus.COMPLETED,
        feedback: periodFeedbackWhere
      },
      _count: { _all: true }
    }),
    prisma.feedbackAIAnalysis.count({
      where: { status: FeedbackAIAnalysisStatus.COMPLETED, feedback: periodFeedbackWhere }
    }),
    prisma.integrationConnection.findMany({
      where: integrationWhere,
      select: integrationHealthSelect,
      orderBy: { updatedAt: "desc" }
    }),
    prisma.integrationConnection.groupBy({
      by: ["provider", "mode"],
      where: integrationWhere,
      _count: { _all: true }
    }),
    prisma.business.findMany({
      where: businessWhere,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            branches: input.branchId ? { where: { id: input.branchId } } : true,
            memberships: scope.membershipCountWhere
              ? { where: scope.membershipCountWhere }
              : true,
            customers: true,
            feedbacks: scope.feedbackRelationWhere
              ? { where: scope.feedbackRelationWhere }
              : true
          }
        },
        integrationConnections: {
          where: scope.integrationRelationWhere,
          select: { provider: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    queryFeedbackTimeSeries(periodFeedbackScope)
  ]);

  const businessCounts = countMap(businessStatuses, "status");
  const userCounts = countMap(userStatuses, "status");
  const healthCounts = countValues(connections.map(classifyIntegrationHealth));
  const attention = connections.filter(
    (connection) => classifyIntegrationHealth(connection) !== "HEALTHY"
  ).length;
  const sentimentRows = sentimentDistributionRows(periodFeedback, sentiments);
  const leadingChannel = [...channels].sort((a, b) => b._count._all - a._count._all)[0];

  report.highlights = [
    { label: scope.labels.businesses, value: sumCounts(businessStatuses) },
    {
      label: scopeBusinessId
        ? "Active businesses in business scope"
        : "Active businesses",
      value: businessCounts.ACTIVE ?? 0
    },
    {
      label: scopeBusinessId
        ? "Pending businesses in business scope"
        : "Pending businesses",
      value: businessCounts.PENDING ?? 0
    },
    {
      label: scopeBusinessId
        ? "Suspended businesses in business scope"
        : "Suspended businesses",
      value: businessCounts.SUSPENDED ?? 0
    },
    {
      label: scopeBusinessId
        ? "Rejected businesses in business scope"
        : "Rejected businesses",
      value: businessCounts.REJECTED ?? 0
    },
    {
      label: scopeBusinessId
        ? "Archived businesses in business scope"
        : "Archived businesses",
      value: businessCounts.ARCHIVED ?? 0
    },
    {
      label: scopeBusinessId
        ? "New businesses in business scope (period)"
        : "New businesses (period)",
      value: newBusinesses
    },
    { label: scope.labels.branches, value: branches },
    { label: scope.labels.users, value: totalUsers },
    { label: scope.labels.activeUsers, value: userCounts[AccountStatus.ACTIVE] ?? 0 },
    {
      label: scope.labels.inactiveUsers,
      value:
        (userCounts[AccountStatus.DISABLED] ?? 0) +
        (userCounts[AccountStatus.SUSPENDED] ?? 0)
    },
    { label: scope.labels.customers, value: customers },
    {
      label: scopeBusinessId
        ? "Feedback in scope (lifetime)"
        : "Total feedback (lifetime)",
      value: totalFeedback
    },
    { label: "Feedback in selected period", value: periodFeedback },
    {
      label: scopeBusinessId ? "Feedback in scope today" : "Feedback today",
      value: feedbackToday
    },
    {
      label: scopeBusinessId ? "Feedback in scope this week" : "Feedback this week",
      value: feedbackWeek
    },
    {
      label: scopeBusinessId ? "Feedback in scope this month" : "Feedback this month",
      value: feedbackMonth
    },
    {
      label: scopeBusinessId
        ? "Open workload in scope (lifetime)"
        : "Open workload (lifetime)",
      value: openFeedback
    },
    {
      label: scopeBusinessId
        ? "Completed feedback in scope (lifetime)"
        : "Completed feedback (lifetime)",
      value: completedFeedback
    },
    { label: scope.labels.integrations, value: connections.length },
    {
      label: scope.labels.liveIntegrations,
      value: connections.filter((item) => item.mode === IntegrationMode.LIVE).length
    },
    { label: scope.labels.attentionIntegrations, value: attention }
  ];
  report.managementSummary = buildExecutiveManagementSummary({
    periodFeedback,
    leadingChannel: leadingChannel?.channel ?? null,
    activeBusinesses: businessCounts.ACTIVE ?? 0,
    pendingBusinesses: businessCounts.PENDING ?? 0,
    liveIntegrations: connections.filter((item) => item.mode === IntegrationMode.LIVE)
      .length,
    attentionIntegrations: attention
  });
  report.sections = [
    trendSection("Feedback trend", trend, from, to),
    groupSection("Feedback by channel", "Channel", channels, "channel"),
    await namedGroupSection(
      "Feedback by business",
      "Business",
      feedbackBusinesses,
      "businessId",
      "business"
    ),
    groupSection("Workflow status distribution", "Status", statuses, "status"),
    groupSection("Priority distribution", "Priority", priorities, "priority"),
    {
      title: "Sentiment distribution",
      description:
        "Completed AI sentiment plus feedback not yet analyzed in the selected period.",
      headers: ["Sentiment", "Count", "Percentage"],
      rows: sentimentRows,
      semantic: "SENTIMENT",
      emptyMessage: "No feedback matched the selected period and filters."
    },
    {
      title: "AI analysis completion",
      headers: ["State", "Count", "Percentage"],
      rows: [
        ["Analyzed", aiCompleted, percentage(aiCompleted, periodFeedback)],
        [
          "Not analyzed",
          Math.max(0, periodFeedback - aiCompleted),
          percentage(Math.max(0, periodFeedback - aiCompleted), periodFeedback)
        ]
      ],
      emptyMessage: "No feedback was available for AI completion analysis."
    },
    {
      title: input.branchId
        ? "User roles with selected-branch access"
        : "User roles in scope",
      description: input.branchId
        ? "Users are included when their business membership grants all-branch access or explicit access to the selected branch."
        : undefined,
      headers: ["Role", "Users"],
      rows: userRoles.map((item) => [item.role, item._count._all]),
      emptyMessage: "No users matched the selected business scope."
    },
    {
      title: input.branchId
        ? "Business adoption overview (selected branch)"
        : "Business adoption overview",
      description: input.branchId
        ? "Branches, users, feedback, and connected providers respect the selected branch. Customer profiles remain business-wide because Customer has no branch ownership relationship."
        : undefined,
      headers: [
        "Business",
        "Status",
        input.branchId ? "Branches in scope" : "Branches",
        input.branchId ? "Users with branch access" : "Users",
        input.branchId ? "Customer profiles (business-wide)" : "Customers",
        input.branchId ? "Feedback in scope" : "Feedback",
        input.branchId ? "Providers routed to branch" : "Connected providers"
      ],
      rows: businessAdoption.map((item) => [
        item.name,
        item.status,
        item._count.branches,
        item._count.memberships,
        item._count.customers,
        item._count.feedbacks,
        new Set(item.integrationConnections.map((connection) => connection.provider)).size
      ]),
      emptyMessage: "No businesses matched the selected scope."
    },
    {
      title: input.branchId
        ? "Integration adoption (routed to branch)"
        : "Integration adoption",
      description: input.branchId
        ? "Connections are scoped by their required default Branch, which is where imported feedback is routed."
        : undefined,
      headers: ["Provider", "Mode", "Connections"],
      rows: integrationAdoption.map((item) => [
        item.provider,
        item.mode,
        item._count._all
      ]),
      emptyMessage: "No integration connections matched the selected scope."
    },
    {
      title: input.branchId
        ? "Integration health (routed to branch)"
        : "Integration health",
      description: input.branchId
        ? "Health covers only integration connections whose required default Branch is the selected branch."
        : undefined,
      headers: ["Health", "Connections"],
      rows: Object.entries(healthCounts).map(([health, count]) => [health, count]),
      semantic: "HEALTH",
      emptyMessage: "No integration connections matched the selected scope."
    },
    {
      title: input.branchId
        ? "Business-wide approval workload"
        : "Business approval workload",
      description: input.branchId
        ? "Business lifecycle and approval state have no branch relationship and therefore remain business-wide."
        : undefined,
      headers: ["Business state", "Count"],
      rows: businessStatuses.map((item) => [item.status, item._count._all]),
      semantic: "HEALTH",
      emptyMessage: "No businesses matched the selected scope."
    }
  ];
  if (input.comparePreviousPeriod) {
    report.comparison = [
      createReportComparison("Feedback received", periodFeedback, previousFeedback),
      createReportComparison(
        scopeBusinessId ? "New businesses in business scope" : "New businesses",
        newBusinesses,
        previousBusinesses
      ),
      createReportComparison(scope.labels.newUsers, newUsers, previousUsers)
    ];
  }
}

async function buildFeedbackExperienceReport(
  report: AdminReportDocument,
  context: ReportContext
) {
  const { input, from, to, previousFrom, previousTo, scopeBusinessId } = context;
  const scopedInput = { ...input, businessId: scopeBusinessId };
  const periodScope = createFeedbackScopePlan(scopedInput, from, to);
  const lifetimeScope = createFeedbackScopePlan(scopedInput);
  const previousScope = createFeedbackScopePlan(scopedInput, previousFrom, previousTo);
  const where = periodScope.where;
  const lifetimeWhere = lifetimeScope.where;
  const previousWhere = previousScope.where;
  const [
    lifetimeTotal,
    periodTotal,
    previousTotal,
    previousStatuses,
    assignmentGroups,
    highPriority,
    aiCompleted,
    customers,
    businesses,
    branches,
    channels,
    statuses,
    priorities,
    categories,
    ratings,
    sentiments,
    attentionFeedback,
    trend
  ] = await Promise.all([
    prisma.feedback.count({ where: lifetimeWhere }),
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: previousWhere }),
    prisma.feedback.groupBy({
      by: ["status"],
      where: previousWhere,
      _count: { _all: true }
    }),
    prisma.feedback.groupBy({
      by: ["assignedToMembershipId"],
      where,
      _count: { _all: true }
    }),
    prisma.feedback.count({
      where: {
        AND: [
          where,
          { priority: { in: [FeedbackPriority.HIGH, FeedbackPriority.URGENT] } }
        ]
      }
    }),
    prisma.feedbackAIAnalysis.count({
      where: { status: FeedbackAIAnalysisStatus.COMPLETED, feedback: where }
    }),
    prisma.feedback.findMany({
      where: { AND: [where, { customerId: { not: null } }] },
      distinct: ["customerId"],
      select: { customerId: true }
    }),
    prisma.feedback.groupBy({ by: ["businessId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["branchId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["channel"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["sentiment"],
      where: { status: FeedbackAIAnalysisStatus.COMPLETED, feedback: where },
      _count: { _all: true }
    }),
    prisma.feedback.findMany({
      where: {
        AND: [
          where,
          {
            OR: [
              { priority: { in: [FeedbackPriority.HIGH, FeedbackPriority.URGENT] } },
              { aiAnalysis: { is: { sentiment: FeedbackAISentiment.NEGATIVE } } }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        message: true,
        receivedAt: true,
        rating: true,
        status: true,
        priority: true,
        business: { select: { name: true } },
        branch: { select: { name: true } },
        category: { select: { name: true } },
        aiAnalysis: { select: { sentiment: true } }
      },
      orderBy: [{ priority: "desc" }, { receivedAt: "desc" }, { id: "asc" }],
      take: 25
    }),
    queryFeedbackTimeSeries(periodScope)
  ]);

  const { open, completed } = summarizeFeedbackWorkflow(statuses);
  const { open: previousOpen, completed: previousCompleted } =
    summarizeFeedbackWorkflow(previousStatuses);
  const { assigned, unassigned } = summarizeFeedbackAssignment(assignmentGroups);

  report.highlights = [
    { label: "Total feedback (lifetime, matching filters)", value: lifetimeTotal },
    { label: "Feedback in selected period", value: periodTotal },
    { label: "Open feedback (period)", value: open },
    { label: "Completed feedback (period)", value: completed },
    { label: "Assigned feedback (period)", value: assigned },
    { label: "Unassigned feedback (period)", value: unassigned },
    { label: "High or urgent priority (period)", value: highPriority },
    { label: "AI analyzed (period)", value: aiCompleted },
    { label: "AI not analyzed (period)", value: Math.max(0, periodTotal - aiCompleted) },
    { label: "Customer profiles represented (period)", value: customers.length }
  ];
  report.managementSummary = buildFeedbackManagementSummary({
    periodTotal,
    channels,
    open,
    unassigned,
    highPriority
  });
  report.sections = [
    trendSection("Feedback trend", trend, from, to),
    await namedGroupSection(
      "Feedback by business",
      "Business",
      businesses,
      "businessId",
      "business"
    ),
    await namedGroupSection(
      "Feedback by branch",
      "Branch",
      branches,
      "branchId",
      "branch"
    ),
    groupSection("Channel distribution", "Channel", channels, "channel", periodTotal),
    groupSection(
      "Workflow status distribution",
      "Status",
      statuses,
      "status",
      periodTotal
    ),
    await namedGroupSection(
      "Category distribution",
      "Category",
      categories,
      "categoryId",
      "feedbackCategory",
      periodTotal
    ),
    groupSection(
      "Priority distribution",
      "Priority",
      priorities,
      "priority",
      periodTotal
    ),
    {
      title: "Assignment workload",
      headers: ["Assignment state", "Count", "Percentage"],
      rows: [
        ["Assigned", assigned, percentage(assigned, periodTotal)],
        ["Unassigned", unassigned, percentage(unassigned, periodTotal)]
      ],
      emptyMessage: "No feedback matched the selected period and filters."
    },
    {
      title: "Completion workload",
      headers: ["Workflow state", "Count", "Percentage"],
      rows: [
        ["Completed", completed, percentage(completed, periodTotal)],
        ["Open", open, percentage(open, periodTotal)]
      ],
      emptyMessage: "No feedback matched the selected period and filters."
    },
    {
      title: "Sentiment analysis",
      description: "Semantic sentiment colors are independent of platform branding.",
      headers: ["Sentiment", "Count", "Percentage"],
      rows: sentimentDistributionRows(periodTotal, sentiments),
      semantic: "SENTIMENT",
      emptyMessage: "No feedback matched the selected period and filters."
    },
    groupSection("Ratings distribution", "Rating", ratings, "rating", periodTotal),
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
      rows: attentionFeedback.map((item) => [
        item.receivedAt.toISOString(),
        item.business.name,
        item.branch.name,
        item.priority,
        item.status,
        item.aiAnalysis?.sentiment ?? "NOT_ANALYZED",
        item.rating ?? "Not rated",
        item.category?.name ?? "Uncategorized",
        selectImportantFeedbackText(item.message, item.title)
      ]),
      semantic: "SENTIMENT",
      emptyMessage: periodTotal
        ? "No high-priority or negative feedback requires attention in this scope."
        : "No feedback matched the selected period and filters."
    }
  ];
  if (input.comparePreviousPeriod) {
    report.comparison = [
      createReportComparison("Feedback received", periodTotal, previousTotal),
      createReportComparison("Open feedback", open, previousOpen),
      createReportComparison("Completed feedback", completed, previousCompleted)
    ];
  }
}

async function buildOperationsHealthReport(
  report: AdminReportDocument,
  context: ReportContext
) {
  const { input, from, to, previousFrom, previousTo, scopeBusinessId } = context;
  const integrationWhere: Prisma.IntegrationConnectionWhereInput = {
    businessId: scopeBusinessId,
    provider: input.provider,
    AND: [supportedLiveIntegrationWhere()]
  };
  const runWhere: Prisma.SynchronizationRunWhereInput = {
    businessId: scopeBusinessId,
    provider: input.provider,
    requestedAt: { gte: from, lte: to },
    connection: { is: supportedLiveIntegrationWhere() }
  };
  const previousRunWhere: Prisma.SynchronizationRunWhereInput = {
    businessId: scopeBusinessId,
    provider: input.provider,
    requestedAt: { gte: previousFrom, lte: previousTo },
    connection: { is: supportedLiveIntegrationWhere() }
  };
  const webhookWhere: Prisma.IntegrationWebhookDeliveryWhereInput = {
    businessId: scopeBusinessId,
    receivedAt: { gte: from, lte: to },
    AND: [
      { provider: "WHATSAPP" },
      ...(input.provider ? [{ provider: input.provider }] : [])
    ]
  };
  const previousWebhookWhere: Prisma.IntegrationWebhookDeliveryWhereInput = {
    businessId: scopeBusinessId,
    receivedAt: { gte: previousFrom, lte: previousTo },
    AND: [
      { provider: "WHATSAPP" },
      ...(input.provider ? [{ provider: input.provider }] : [])
    ]
  };
  const aiWhere: Prisma.FeedbackAIAnalysisWhereInput = {
    businessId: scopeBusinessId,
    requestedAt: { gte: from, lte: to },
    feedback: supportedOperationalFeedbackWhere()
  };
  const previousAiWhere: Prisma.FeedbackAIAnalysisWhereInput = {
    businessId: scopeBusinessId,
    requestedAt: { gte: previousFrom, lte: previousTo },
    feedback: supportedOperationalFeedbackWhere()
  };
  const automationWhere: Prisma.AutomationExecutionWhereInput = {
    businessId: scopeBusinessId,
    createdAt: { gte: from, lte: to }
  };
  const previousAutomationWhere: Prisma.AutomationExecutionWhereInput = {
    businessId: scopeBusinessId,
    createdAt: { gte: previousFrom, lte: previousTo }
  };
  const staleThreshold = new Date(Date.now() - 15 * 60_000);

  const [
    databaseProbe,
    connections,
    runStatuses,
    runTotals,
    runCount,
    previousRunCount,
    recentRuns,
    webhookStatuses,
    webhookCount,
    previousWebhookCount,
    recentWebhooks,
    aiStatuses,
    aiCount,
    previousAiCount,
    staleAi,
    automationStatuses,
    automationCount,
    previousAutomationCount,
    automationRules,
    recentAutomation,
    businessStatuses
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ healthy: number }>>(PrismaRuntime.sql`SELECT 1 AS healthy`),
    prisma.integrationConnection.findMany({
      where: integrationWhere,
      select: integrationHealthSelect,
      orderBy: { updatedAt: "desc" }
    }),
    prisma.synchronizationRun.groupBy({
      by: ["status"],
      where: runWhere,
      _count: { _all: true }
    }),
    prisma.synchronizationRun.aggregate({
      where: runWhere,
      _sum: {
        itemsImported: true,
        itemsDuplicated: true,
        itemsSkipped: true,
        itemsFailed: true
      }
    }),
    prisma.synchronizationRun.count({ where: runWhere }),
    prisma.synchronizationRun.count({ where: previousRunWhere }),
    prisma.synchronizationRun.findMany({
      where: runWhere,
      select: {
        requestedAt: true,
        completedAt: true,
        provider: true,
        mode: true,
        status: true,
        itemsImported: true,
        itemsDuplicated: true,
        itemsSkipped: true,
        itemsFailed: true,
        safeSummary: true,
        business: { select: { name: true } }
      },
      orderBy: { requestedAt: "desc" },
      take: 25
    }),
    prisma.integrationWebhookDelivery.groupBy({
      by: ["status"],
      where: webhookWhere,
      _count: { _all: true }
    }),
    prisma.integrationWebhookDelivery.count({ where: webhookWhere }),
    prisma.integrationWebhookDelivery.count({ where: previousWebhookWhere }),
    prisma.integrationWebhookDelivery.findMany({
      where: webhookWhere,
      select: {
        receivedAt: true,
        processedAt: true,
        provider: true,
        status: true,
        messageType: true,
        safeMessage: true,
        business: { select: { name: true } }
      },
      orderBy: { receivedAt: "desc" },
      take: 25
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["status"],
      where: aiWhere,
      _count: { _all: true }
    }),
    prisma.feedbackAIAnalysis.count({ where: aiWhere }),
    prisma.feedbackAIAnalysis.count({ where: previousAiWhere }),
    prisma.feedbackAIAnalysis.count({
      where: {
        businessId: scopeBusinessId,
        status: FeedbackAIAnalysisStatus.PROCESSING,
        lockedAt: { lt: staleThreshold }
      }
    }),
    prisma.automationExecution.groupBy({
      by: ["status"],
      where: automationWhere,
      _count: { _all: true }
    }),
    prisma.automationExecution.count({ where: automationWhere }),
    prisma.automationExecution.count({ where: previousAutomationWhere }),
    prisma.automationRule.groupBy({
      by: ["status"],
      where: { businessId: scopeBusinessId },
      _count: { _all: true }
    }),
    prisma.automationExecution.findMany({
      where: automationWhere,
      select: {
        createdAt: true,
        completedAt: true,
        status: true,
        matched: true,
        actionsSucceeded: true,
        actionsSkipped: true,
        actionsFailed: true,
        business: { select: { name: true } },
        rule: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.business.groupBy({
      by: ["status"],
      where: scopeBusinessId ? { id: scopeBusinessId } : {},
      _count: { _all: true }
    })
  ]);

  const health = connections.map((connection) => ({
    connection,
    health: classifyIntegrationHealth(connection)
  }));
  const healthCounts = countValues(health.map((item) => item.health));
  const statusCounts = countValues(connections.map((item) => item.status));
  const live = connections.filter((item) => item.mode === IntegrationMode.LIVE).length;
  const attention = health.filter((item) => item.health !== "HEALTHY").length;
  const aiCounts = countMap(aiStatuses, "status");
  const automationCounts = countMap(automationStatuses, "status");
  const ruleCounts = countMap(automationRules, "status");
  const businessCounts = countMap(businessStatuses, "status");

  report.highlights = [
    { label: "API health", value: "Operational" },
    {
      label: "Database health",
      value: Number(databaseProbe[0]?.healthy) === 1 ? "Operational" : "Degraded"
    },
    { label: "Total integration connections", value: connections.length },
    { label: "Live connections", value: live },
    { label: "Connected", value: statusCounts.CONNECTED ?? 0 },
    { label: "Paused", value: statusCounts.PAUSED ?? 0 },
    { label: "Disconnected", value: statusCounts.DISCONNECTED ?? 0 },
    { label: "Connection errors", value: statusCounts.ERROR ?? 0 },
    { label: "Integrations needing attention", value: attention },
    { label: "Imported items (period)", value: runTotals._sum.itemsImported ?? 0 },
    { label: "Webhook deliveries (period)", value: webhookCount },
    { label: "AI completed (period)", value: aiCounts.COMPLETED ?? 0 },
    { label: "AI failed (period)", value: aiCounts.FAILED ?? 0 },
    { label: "Stale AI processing", value: staleAi },
    {
      label: "Successful automation executions (period)",
      value: automationCounts.SUCCESS ?? 0
    },
    {
      label: "Automation failed/partial (period)",
      value: (automationCounts.FAILED ?? 0) + (automationCounts.PARTIAL ?? 0)
    },
    {
      label: "Active automation rules",
      value: ruleCounts[AutomationRuleStatus.ACTIVE] ?? 0
    },
    {
      label: "Draft automation rules",
      value: ruleCounts[AutomationRuleStatus.DRAFT] ?? 0
    },
    { label: "Pending businesses", value: businessCounts.PENDING ?? 0 }
  ];
  report.managementSummary = `${connections.length} supported Live integration connection${connections.length === 1 ? " is" : "s are"} in scope. ${attention} require${attention === 1 ? "s" : ""} administrator attention. During the selected period, ${webhookCount} webhook deliveries, ${aiCount} AI processing records, and ${automationCount} automation executions were recorded. API and database health are based on this successful request and a live database connectivity probe.`;
  report.sections = [
    {
      title: "Core services",
      description:
        "No CPU, RAM, server-uptime, or worker-heartbeat telemetry is collected.",
      headers: ["Service", "Health", "Evidence"],
      rows: [
        ["API", "OPERATIONAL", "The authenticated report request completed."],
        [
          "Database",
          Number(databaseProbe[0]?.healthy) === 1 ? "OPERATIONAL" : "DEGRADED",
          "A bounded connectivity probe completed without exposing database metadata."
        ]
      ],
      semantic: "HEALTH"
    },
    {
      title: "Integration health summary",
      headers: ["Health", "Connections"],
      rows: Object.entries(healthCounts).map(([state, count]) => [state, count]),
      semantic: "HEALTH",
      emptyMessage: "No integration connections matched the selected scope."
    },
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
      rows: health.map(({ connection, health: connectionHealth }) => [
        connection.business.name,
        providerLabel(connection),
        connection.mode,
        connection.status,
        connectionHealth,
        connection.totalImported,
        (
          connection.lastInboundMessageAt ??
          connection.lastSuccessfulSyncAt ??
          connection.lastAttemptedSyncAt
        )?.toISOString() ?? "No activity recorded",
        humanReadableIntegrationIssue(connection, connectionHealth)
      ]),
      semantic: "HEALTH",
      emptyMessage: "No integration connections matched the selected scope."
    },
    groupSection("Synchronization outcomes", "Run status", runStatuses, "status"),
    {
      title: "Synchronization item outcomes",
      headers: ["Outcome", "Count"],
      rows: [
        ["Imported", runTotals._sum.itemsImported ?? 0],
        ["Duplicates", runTotals._sum.itemsDuplicated ?? 0],
        ["Skipped", runTotals._sum.itemsSkipped ?? 0],
        ["Failed", runTotals._sum.itemsFailed ?? 0]
      ],
      semantic: "HEALTH",
      emptyMessage: "No synchronization activity matched the selected period and filters."
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
      rows: recentRuns.map((item) => [
        item.requestedAt.toISOString(),
        item.business.name,
        item.provider,
        item.mode,
        item.status,
        item.itemsImported,
        item.itemsDuplicated,
        item.itemsSkipped,
        item.itemsFailed,
        humanReadableRunSummary(item.status, item.safeSummary)
      ]),
      semantic: "HEALTH",
      emptyMessage: "No synchronization activity matched the selected period and filters."
    },
    groupSection(
      "Webhook activity",
      "Delivery state",
      webhookStatuses,
      "status",
      webhookCount,
      "HEALTH"
    ),
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
      rows: recentWebhooks.map((item) => [
        item.receivedAt.toISOString(),
        item.business.name,
        item.provider,
        item.status,
        item.messageType ?? "Not recorded",
        humanReadableWebhookSummary(item.status, item.safeMessage)
      ]),
      semantic: "HEALTH",
      emptyMessage: "No webhook activity matched the selected period and filters."
    },
    groupSection(
      "AI processing",
      "Processing state",
      aiStatuses,
      "status",
      aiCount,
      "HEALTH"
    ),
    {
      title: "AI processing attention",
      headers: ["Operational condition", "Count"],
      rows: [["Processing records older than 15 minutes", staleAi]],
      semantic: "HEALTH"
    },
    groupSection(
      "Automation execution outcomes",
      "Execution state",
      automationStatuses,
      "status",
      automationCount,
      "HEALTH"
    ),
    groupSection(
      "Automation rule state",
      "Rule state",
      automationRules,
      "status",
      undefined,
      "HEALTH"
    ),
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
      rows: recentAutomation.map((item) => [
        item.createdAt.toISOString(),
        item.business.name,
        item.rule?.name ?? "Deleted or unavailable rule",
        item.status,
        item.matched ? "Yes" : "No",
        item.actionsSucceeded,
        item.actionsSkipped,
        item.actionsFailed
      ]),
      semantic: "HEALTH",
      emptyMessage: "No automation executions matched the selected period and filters."
    },
    {
      title: "Business approval and platform workload",
      headers: ["Business state", "Count"],
      rows: businessStatuses.map((item) => [item.status, item._count._all]),
      semantic: "HEALTH",
      emptyMessage: "No businesses matched the selected scope."
    }
  ];
  if (input.comparePreviousPeriod) {
    report.comparison = [
      createReportComparison("Synchronization runs", runCount, previousRunCount),
      createReportComparison("Webhook deliveries", webhookCount, previousWebhookCount),
      createReportComparison("AI processing records", aiCount, previousAiCount),
      createReportComparison(
        "Automation executions",
        automationCount,
        previousAutomationCount
      )
    ];
  }
}

export function buildExecutiveManagementSummary(metrics: {
  periodFeedback: number;
  leadingChannel: string | null;
  activeBusinesses: number;
  pendingBusinesses: number;
  liveIntegrations: number;
  attentionIntegrations: number;
}) {
  const feedback = `${metrics.periodFeedback} feedback record${metrics.periodFeedback === 1 ? " was" : "s were"} received during the selected period.`;
  const channel = metrics.leadingChannel
    ? ` ${formatReportDisplayValue(metrics.leadingChannel)} was the leading source.`
    : " No channel led the period because no feedback matched the scope.";
  const businesses = ` ${metrics.activeBusinesses} business${metrics.activeBusinesses === 1 ? " is" : "es are"} active, while ${metrics.pendingBusinesses} await${metrics.pendingBusinesses === 1 ? "s" : ""} approval.`;
  const integrations = ` ${metrics.liveIntegrations} Live integration${metrics.liveIntegrations === 1 ? " is" : "s are"} recorded, and ${metrics.attentionIntegrations} integration record${metrics.attentionIntegrations === 1 ? " requires" : "s require"} administrator attention.`;
  return `${feedback}${channel}${businesses}${integrations}`;
}

export function buildFeedbackManagementSummary(metrics: {
  periodTotal: number;
  channels: Array<{ channel: string; _count: { _all: number } }>;
  open: number;
  unassigned: number;
  highPriority: number;
}) {
  if (metrics.periodTotal === 0) {
    return "No feedback matched the selected period and filters.";
  }

  const maximumChannelCount = Math.max(
    0,
    ...metrics.channels.map((channel) => channel._count._all)
  );
  const leaders = metrics.channels
    .filter((channel) => channel._count._all === maximumChannelCount)
    .map((channel) => formatReportDisplayValue(channel.channel))
    .sort((left, right) => left.localeCompare(right, "en"));
  const channelSummary =
    leaders.length === 1
      ? `${leaders[0]} was the leading channel with ${feedbackRecordCount(maximumChannelCount)}.`
      : leaders.length > 1
        ? `${formatNaturalList(leaders)} were tied as the leading channels with ${feedbackRecordCount(maximumChannelCount)} each.`
        : "No channel distribution was available for the matching feedback.";
  return `${feedbackRecordCount(metrics.periodTotal)} ${metrics.periodTotal === 1 ? "was" : "were"} received in the selected period. ${channelSummary} ${metrics.open} remain open, ${metrics.unassigned} are unassigned, and ${metrics.highPriority} are high or urgent priority.`;
}

export function selectImportantFeedbackText(
  message: string | null | undefined,
  title: string | null | undefined
) {
  const normalizedMessage = message?.trim();
  if (normalizedMessage) return normalizedMessage;
  const normalizedTitle = title?.trim();
  return normalizedTitle || "Feedback text unavailable";
}

function reportFilters(context: ReportContext) {
  const { input, business, branch } = context;
  const filters = [business ? `Business: ${business.name}` : "All Businesses"];
  if (input.reportType !== "OPERATIONS_SYSTEM_HEALTH") {
    filters.push(branch ? `Branch: ${branch.name}` : "All Branches");
  }
  if (input.reportType === "FEEDBACK_CUSTOMER_EXPERIENCE") {
    filters.push(
      input.channel
        ? `Channel: ${formatReportDisplayValue(input.channel)}`
        : "All Channels",
      input.status
        ? `Workflow status: ${formatReportDisplayValue(input.status)}`
        : "All Statuses",
      input.sentiment
        ? `Sentiment: ${formatReportDisplayValue(input.sentiment)}`
        : "All Sentiments"
    );
  }
  if (input.reportType === "OPERATIONS_SYSTEM_HEALTH") {
    filters.push(
      input.provider
        ? `Provider: ${formatReportDisplayValue(input.provider)}`
        : "All Providers"
    );
  }
  filters.push(
    input.comparePreviousPeriod
      ? "Previous period comparison enabled"
      : "Previous period comparison disabled"
  );
  return filters;
}

function createReportScopeMetadata(context: ReportContext): AdminReportDocument["scope"] {
  const { input, business, branch } = context;
  if (branch) {
    const executive = input.reportType === "EXECUTIVE_PLATFORM";
    return {
      level: "BRANCH",
      label: `${business ? `${business.name} / ` : ""}${branch.name}`,
      notes: executive
        ? [
            "Feedback, branch, user-access, and integration-routing metrics respect the selected branch.",
            "Customer profiles and business lifecycle metrics remain business-wide because those records have no branch ownership relationship.",
            "Integration connections are branch-scoped by their required default Branch routing relationship."
          ]
        : [
            "Feedback metrics and customers represented by linked feedback respect the selected branch."
          ],
      metrics: {
        businesses: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE",
        branches: "BRANCH_SCOPED",
        users: executive ? "BRANCH_SCOPED" : "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE",
        customers: executive ? "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE" : "BRANCH_SCOPED",
        feedback: "BRANCH_SCOPED",
        integrations: executive ? "BRANCH_SCOPED" : "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE",
        approvalWorkload: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE"
      }
    };
  }
  if (context.scopeBusinessId) {
    return {
      level: "BUSINESS",
      label: business?.name ?? "Selected business",
      notes: ["All business-scopable metrics are limited to the selected business."],
      metrics: {
        businesses: "BUSINESS_SCOPED",
        branches: "BUSINESS_SCOPED",
        users: "BUSINESS_SCOPED",
        customers: "BUSINESS_SCOPED",
        feedback: "BUSINESS_SCOPED",
        integrations: "BUSINESS_SCOPED",
        approvalWorkload: "BUSINESS_SCOPED"
      }
    };
  }
  return {
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
  };
}

function reportTitle(type: AdminReportType) {
  return (
    ADMIN_REPORT_CATALOG.find((item) => item.type === type)?.title ?? "Platform Report"
  );
}

export async function queryFeedbackTimeSeries(scope: FeedbackScopePlan) {
  const { filters } = scope;
  const { from, to } = filters;
  if (!from || !to) {
    throw new Error("Feedback trend scope requires a complete date range.");
  }
  const bucket = reportBucket(from, to);
  const bucketSql =
    bucket === "month"
      ? PrismaRuntime.sql`DATE_FORMAT(f.received_at, '%Y-%m-01')`
      : bucket === "week"
        ? PrismaRuntime.sql`DATE_SUB(DATE(f.received_at), INTERVAL WEEKDAY(f.received_at) DAY)`
        : PrismaRuntime.sql`DATE(f.received_at)`;
  const conditions = [
    PrismaRuntime.sql`f.deleted_at IS NULL`,
    PrismaRuntime.sql`(f.channel IN ('MANUAL', 'PUBLIC_FORM', 'QR_CODE') OR (f.channel = 'WHATSAPP' AND JSON_EXTRACT(f.source_metadata, '$.liveMode') = true) OR (f.channel = 'EMAIL' AND JSON_EXTRACT(f.source_metadata, '$.liveMode') = true AND JSON_UNQUOTE(JSON_EXTRACT(f.source_metadata, '$.liveProviderType')) = 'GMAIL'))`,
    PrismaRuntime.sql`f.received_at >= ${from}`,
    PrismaRuntime.sql`f.received_at <= ${to}`
  ];
  if (filters.businessId)
    conditions.push(PrismaRuntime.sql`f.business_id = ${filters.businessId}`);
  if (filters.branchId)
    conditions.push(PrismaRuntime.sql`f.branch_id = ${filters.branchId}`);
  if (filters.channel) conditions.push(PrismaRuntime.sql`f.channel = ${filters.channel}`);
  if (filters.status) conditions.push(PrismaRuntime.sql`f.status = ${filters.status}`);
  if (filters.sentiment)
    conditions.push(PrismaRuntime.sql`ai.sentiment = ${filters.sentiment}`);
  const analysisJoin = filters.sentiment
    ? PrismaRuntime.sql`INNER JOIN feedback_ai_analyses ai ON ai.feedback_id = f.id`
    : PrismaRuntime.empty;
  const rows = await prisma.$queryRaw<SqlCountRow[]>(
    PrismaRuntime.sql`SELECT ${bucketSql} AS bucket, COUNT(*) AS count FROM feedback f ${analysisJoin} WHERE ${PrismaRuntime.join(conditions, " AND ")} GROUP BY bucket ORDER BY bucket ASC`
  );
  return rows.map((row) => ({
    date:
      row.bucket instanceof Date
        ? row.bucket.toISOString().slice(0, 10)
        : String(row.bucket).slice(0, 10),
    count: Number(row.count)
  }));
}

function trendSection(
  title: string,
  trend: Array<{ date: string; count: number }>,
  from: Date,
  to: Date
): ReportSection {
  return {
    title,
    headers: ["Period", "Feedback"],
    rows: completeTimeSeries(trend, from, to, reportBucket(from, to)).map((item) => [
      item.date,
      item.count
    ]),
    emptyMessage: "No feedback matched the selected period and filters."
  };
}

function groupSection<T extends Record<string, unknown>>(
  title: string,
  label: string,
  groups: Array<CountGroup<T>>,
  key: keyof T,
  total?: number,
  semantic?: ReportSection["semantic"]
): ReportSection {
  return {
    title,
    headers: total === undefined ? [label, "Count"] : [label, "Count", "Percentage"],
    rows: groups.map((group) => [
      String(group[key] ?? "Not set"),
      group._count._all,
      ...(total === undefined ? [] : [percentage(group._count._all, total)])
    ]),
    semantic,
    emptyMessage: "No persisted activity matched the selected period and filters."
  };
}

async function namedGroupSection<T extends Record<string, unknown>>(
  title: string,
  label: string,
  groups: Array<CountGroup<T>>,
  key: keyof T,
  model: "business" | "branch" | "feedbackCategory",
  total?: number
): Promise<ReportSection> {
  const ids = groups.flatMap((group) => {
    const value = group[key];
    return typeof value === "string" ? [value] : [];
  });
  const records =
    model === "business"
      ? await prisma.business.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true }
        })
      : model === "branch"
        ? await prisma.branch.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true }
          })
        : await prisma.feedbackCategory.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true }
          });
  const names = new Map(records.map((record) => [record.id, record.name]));
  return {
    title,
    headers: total === undefined ? [label, "Count"] : [label, "Count", "Percentage"],
    rows: groups.map((group) => {
      const value = group[key];
      const count = group._count._all;
      return [
        typeof value === "string"
          ? (names.get(value) ?? "Unknown")
          : label === "Category"
            ? "Uncategorized"
            : "Not set",
        count,
        ...(total === undefined ? [] : [percentage(count, total)])
      ];
    }),
    emptyMessage: "No feedback matched the selected period and filters."
  };
}

export function sentimentDistributionRows(
  total: number,
  groups: Array<{ sentiment: FeedbackAISentiment | null; _count: { _all: number } }>
) {
  const counts = new Map(groups.map((group) => [group.sentiment, group._count._all]));
  const analyzed = groups.reduce((sum, group) => sum + group._count._all, 0);
  const sentimentOrder: Array<FeedbackAISentiment | "NOT_ANALYZED"> = [
    FeedbackAISentiment.POSITIVE,
    FeedbackAISentiment.NEGATIVE,
    FeedbackAISentiment.NEUTRAL,
    FeedbackAISentiment.MIXED,
    "NOT_ANALYZED"
  ];
  return sentimentOrder.map((sentiment) => {
    const count =
      sentiment === "NOT_ANALYZED"
        ? Math.max(0, total - analyzed)
        : (counts.get(sentiment) ?? 0);
    return [sentiment, count, percentage(count, total)];
  });
}

export function summarizeFeedbackWorkflow(
  groups: Array<{ status: FeedbackStatus; _count: { _all: number } }>
) {
  const counts = new Map(groups.map((group) => [group.status, group._count._all]));
  return {
    open:
      (counts.get(FeedbackStatus.NEW) ?? 0) + (counts.get(FeedbackStatus.IN_REVIEW) ?? 0),
    completed:
      (counts.get(FeedbackStatus.RESOLVED) ?? 0) +
      (counts.get(FeedbackStatus.CLOSED) ?? 0)
  };
}

export function summarizeFeedbackAssignment(
  groups: Array<{
    assignedToMembershipId: string | null;
    _count: { _all: number };
  }>
) {
  return groups.reduce(
    (summary, group) => {
      if (group.assignedToMembershipId) summary.assigned += group._count._all;
      else summary.unassigned += group._count._all;
      return summary;
    },
    { assigned: 0, unassigned: 0 }
  );
}

export function countMap<T extends Record<string, unknown>>(
  groups: Array<CountGroup<T>>,
  key: keyof T
) {
  return Object.fromEntries(
    groups.map((group) => [String(group[key]), group._count._all])
  ) as Record<string, number>;
}

export function countValues(values: string[]) {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function sumCounts(groups: Array<{ _count: { _all: number } }>) {
  return groups.reduce((sum, group) => sum + group._count._all, 0);
}

export function percentage(count: number, total: number) {
  return total ? `${((count / total) * 100).toFixed(1)}%` : "0.0%";
}

function feedbackRecordCount(count: number) {
  return `${count} feedback record${count === 1 ? "" : "s"}`;
}

function formatNaturalList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

export function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

export function endOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

function truncate(value: string, maximum: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maximum
    ? `${normalized.slice(0, maximum - 1)}…`
    : normalized;
}

export function providerLabel(
  connection: Pick<IntegrationHealthRecord, "provider" | "liveProviderType">
) {
  return connection.provider === "EMAIL" && connection.liveProviderType === "GMAIL"
    ? "Gmail"
    : connection.provider === "EMAIL" && connection.liveProviderType
      ? `Email (${formatReportDisplayValue(connection.liveProviderType)})`
      : formatReportDisplayValue(connection.provider);
}

export function humanReadableIntegrationIssue(
  connection: IntegrationHealthRecord,
  health: string
) {
  if (connection.requiresReauthorization)
    return "Provider authorization must be renewed.";
  if (connection.status === IntegrationConnectionStatus.DISCONNECTED)
    return "Connection is disconnected.";
  if (connection.status === IntegrationConnectionStatus.PAUSED)
    return "Connection is paused by an administrator.";
  if (connection.status === IntegrationConnectionStatus.ERROR)
    return "Connection failed and requires administrator review.";
  if (health === "PENDING") return "Webhook setup is awaiting verification.";
  if (health === "NEEDS_ATTENTION")
    return "Connection settings or recent provider activity require review.";
  return "No persisted issue requires attention.";
}

export function humanReadableRunSummary(status: string, safeSummary: string | null) {
  if (safeSummary && !/^[A-Z0-9_]+$/.test(safeSummary)) return truncate(safeSummary, 180);
  if (status === "FAILED")
    return "Synchronization failed; review the tenant integration history.";
  if (status === "COMPLETED_WITH_ERRORS")
    return "Synchronization completed with some item failures.";
  if (status === "CANCELLED") return "Synchronization was cancelled.";
  if (status === "RUNNING" || status === "PENDING")
    return "Synchronization is awaiting completion.";
  return "Synchronization completed.";
}

export function humanReadableWebhookSummary(status: string, safeMessage: string | null) {
  if (safeMessage && !/^[A-Z0-9_]+$/.test(safeMessage)) return truncate(safeMessage, 180);
  if (status === "FAILED")
    return "Webhook processing failed; review the integration activity.";
  if (status === "DUPLICATE") return "Duplicate delivery was safely ignored.";
  if (status === "SKIPPED") return "Unsupported or non-importable delivery was skipped.";
  if (status === "IMPORTED") return "Delivery was imported as feedback.";
  return "Delivery was received for processing.";
}
