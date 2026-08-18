import {
  BusinessMembershipStatus,
  BusinessStatus,
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackPriority,
  FeedbackStatus,
  IntegrationMode,
  Prisma,
  UserRole
} from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { classifyIntegrationHealth } from "../platform-admin/platform-admin.analytics.js";
import {
  formatReportDisplayValue,
  formatReportDocument
} from "../platform-admin/platform-admin.report-format.js";
import {
  completeTimeSeries,
  reportBucket
} from "../platform-admin/platform-admin.service.js";
import {
  countMap,
  countValues,
  createFeedbackScopePlan,
  createReportComparison,
  endOfUtcDay,
  humanReadableIntegrationIssue,
  humanReadableRunSummary,
  humanReadableWebhookSummary,
  integrationHealthSelect,
  percentage,
  providerLabel,
  queryFeedbackTimeSeries,
  selectImportantFeedbackText,
  sentimentDistributionRows,
  startOfUtcDay,
  summarizeFeedbackAssignment,
  summarizeFeedbackWorkflow,
  type IntegrationHealthRecord
} from "../platform-admin/platform-admin.reports.js";
import { getPlatformSettings } from "../platform-admin/platform-settings.service.js";
import type {
  AdminReportDocument,
  ReportSection
} from "../platform-admin/platform-admin.types.js";
import type { BusinessReportPreview } from "./business-reports.schemas.js";

export const BUSINESS_PERFORMANCE_REPORT_TYPE =
  "BUSINESS_PERFORMANCE_CUSTOMER_EXPERIENCE";
export const BUSINESS_PERFORMANCE_REPORT_TITLE =
  "Business Performance & Customer Experience Report";
export const BUSINESS_PERFORMANCE_REPORT_DESCRIPTION =
  "A complete view of your business performance, customer feedback, sentiment, workflow, branches, channels, integrations, and operational health.";

type OwnerReportActor = { userId: string; role: UserRole };
type OwnerReportInput = BusinessReportPreview;

type CountGroup<T extends Record<string, unknown>> = T & { _count: { _all: number } };

type OwnerReportContext = {
  input: OwnerReportInput;
  business: { id: string; name: string; status: BusinessStatus };
  branch: { id: string; name: string } | null;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
};

export const OWNER_REPORT_EXACTLY_ONE_CATALOG = [
  {
    type: BUSINESS_PERFORMANCE_REPORT_TYPE,
    title: BUSINESS_PERFORMANCE_REPORT_TITLE,
    description: BUSINESS_PERFORMANCE_REPORT_DESCRIPTION
  }
] as const;

export async function resolveOwnerReportAccess(
  actor: OwnerReportActor,
  businessId: string
) {
  if (actor.role !== UserRole.BUSINESS_OWNER) {
    throw new AppError(
      "Business Owner access is required for reports.",
      "FORBIDDEN",
      403
    );
  }

  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId: actor.userId } },
    include: { business: true }
  });

  if (!membership) {
    throw new AppError("Business access denied.", "BUSINESS_ACCESS_DENIED", 403);
  }

  if (membership.status === BusinessMembershipStatus.SUSPENDED) {
    throw new AppError("This membership is suspended.", "MEMBERSHIP_SUSPENDED", 403);
  }

  if (membership.status === BusinessMembershipStatus.REMOVED) {
    throw new AppError("This membership was removed.", "MEMBERSHIP_REMOVED", 403);
  }

  if (membership.status !== BusinessMembershipStatus.ACTIVE) {
    throw new AppError("Business access denied.", "BUSINESS_ACCESS_DENIED", 403);
  }

  if (membership.business.status !== BusinessStatus.ACTIVE) {
    throw new AppError("This business is not active.", "BUSINESS_NOT_ACTIVE", 403);
  }

  return { business: membership.business, membership };
}

export async function resolveOwnerReportBranch(
  businessId: string,
  branchId: string | undefined
) {
  if (!branchId) return null;
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId },
    select: { id: true, name: true }
  });
  if (!branch) {
    throw new AppError(
      "The selected branch was not found for this business.",
      "REPORT_BRANCH_NOT_FOUND",
      404
    );
  }
  return branch;
}

/**
 * Canonical Business Owner feedback scope. The authorized Business is always
 * fixed from the authenticated membership; Branch, Channel, Workflow Status,
 * and Sentiment filters flow into one shared scope plan consumed by every
 * feedback KPI, distribution, trend, and detail query.
 */
export function createOwnerFeedbackScopePlan(
  businessId: string,
  input: OwnerReportInput,
  from?: Date,
  to?: Date
) {
  return createFeedbackScopePlan(
    {
      reportType: "FEEDBACK_CUSTOMER_EXPERIENCE",
      businessId,
      branchId: input.branchId,
      channel: input.channel,
      status: input.status,
      sentiment: input.sentiment
    },
    from,
    to
  );
}

export async function buildBusinessOwnerReport(
  actor: OwnerReportActor,
  businessId: string,
  input: OwnerReportInput
): Promise<AdminReportDocument> {
  const { business } = await resolveOwnerReportAccess(actor, businessId);
  const branch = await resolveOwnerReportBranch(businessId, input.branchId);
  const context: OwnerReportContext = createOwnerReportContext(input, business, branch);
  const platformSettings = await getPlatformSettings();

  const report: AdminReportDocument = {
    branding: {
      platformName: platformSettings.platformName,
      primaryColor: "#4F46E5",
      reportFooterText: platformSettings.reportFooterText,
      reportSubtitle: "BUSINESS REPORTING"
    },
    title: BUSINESS_PERFORMANCE_REPORT_TITLE,
    reportType: BUSINESS_PERFORMANCE_REPORT_TYPE,
    scope: createOwnerReportScopeMetadata(context),
    period: { from: context.from.toISOString(), to: context.to.toISOString() },
    generatedAt: new Date().toISOString(),
    filters: ownerReportFilters(context),
    managementSummary: "",
    highlights: [],
    sections: []
  };

  await buildOwnerReportSections(report, context);
  return formatReportDocument(report);
}

function createOwnerReportContext(
  input: OwnerReportInput,
  business: OwnerReportContext["business"],
  branch: OwnerReportContext["branch"]
): OwnerReportContext {
  const from = startOfUtcDay(input.dateFrom);
  const to = endOfUtcDay(input.dateTo);
  const duration = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration + 1);
  return { input, business, branch, from, to, previousFrom, previousTo };
}

async function buildOwnerReportSections(
  report: AdminReportDocument,
  context: OwnerReportContext
) {
  const { input, business, branch, from, to, previousFrom, previousTo } = context;
  const businessId = business.id;
  const branchId = branch?.id ?? undefined;
  const periodScope = createOwnerFeedbackScopePlan(businessId, input, from, to);
  const lifetimeScope = createOwnerFeedbackScopePlan(businessId, input);
  const previousScope = createOwnerFeedbackScopePlan(
    businessId,
    input,
    previousFrom,
    previousTo
  );
  const where = periodScope.where;
  const lifetimeWhere = lifetimeScope.where;
  const previousWhere = previousScope.where;

  const integrationWhere: Prisma.IntegrationConnectionWhereInput = {
    businessId,
    defaultBranchId: branchId,
    mode: IntegrationMode.LIVE
  };
  const routedIntegrationRelation = {
    connection: {
      is: {
        mode: IntegrationMode.LIVE,
        ...(branchId ? { defaultBranchId: branchId } : {})
      }
    }
  };
  const runWhere: Prisma.SynchronizationRunWhereInput = {
    businessId,
    mode: IntegrationMode.LIVE,
    requestedAt: { gte: from, lte: to },
    ...routedIntegrationRelation
  };
  const previousRunWhere: Prisma.SynchronizationRunWhereInput = {
    businessId,
    mode: IntegrationMode.LIVE,
    requestedAt: { gte: previousFrom, lte: previousTo },
    ...routedIntegrationRelation
  };
  const webhookWhere: Prisma.IntegrationWebhookDeliveryWhereInput = {
    businessId,
    receivedAt: { gte: from, lte: to },
    ...routedIntegrationRelation
  };
  const previousWebhookWhere: Prisma.IntegrationWebhookDeliveryWhereInput = {
    businessId,
    receivedAt: { gte: previousFrom, lte: previousTo },
    ...routedIntegrationRelation
  };
  const branchFeedbackRelation = branchId ? { feedback: { is: { branchId } } } : {};
  const aiWhere: Prisma.FeedbackAIAnalysisWhereInput = {
    businessId,
    requestedAt: { gte: from, lte: to },
    ...branchFeedbackRelation
  };
  const previousAiWhere: Prisma.FeedbackAIAnalysisWhereInput = {
    businessId,
    requestedAt: { gte: previousFrom, lte: previousTo },
    ...branchFeedbackRelation
  };
  const automationWhere: Prisma.AutomationExecutionWhereInput = {
    businessId,
    createdAt: { gte: from, lte: to },
    ...branchFeedbackRelation
  };
  const previousAutomationWhere: Prisma.AutomationExecutionWhereInput = {
    businessId,
    createdAt: { gte: previousFrom, lte: previousTo },
    ...branchFeedbackRelation
  };
  const staleThreshold = new Date(Date.now() - 15 * 60_000);

  const now = new Date();
  const today = startOfUtcDay(now);
  const week = new Date(today);
  week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const membershipWhere: Prisma.BusinessMembershipWhereInput = {
    businessId,
    status: BusinessMembershipStatus.ACTIVE,
    ...(branchId
      ? {
          OR: [{ allBranchesAccess: true }, { branchAccess: { some: { branchId } } }]
        }
      : {})
  };

  const [
    branchStatuses,
    members,
    customers,
    representedCustomers,
    lifetimeTotal,
    periodTotal,
    previousTotal,
    feedbackToday,
    feedbackWeek,
    feedbackMonth,
    statuses,
    previousStatuses,
    assignmentGroups,
    previousAssignmentGroups,
    highPriority,
    unresolvedHighUrgent,
    ratingAggregate,
    aiCompleted,
    sentiments,
    channels,
    priorities,
    categories,
    ratings,
    branchDistribution,
    branchStatusDistribution,
    branchesList,
    importantFeedback,
    trend,
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
    recentAutomation
  ] = await Promise.all([
    prisma.branch.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { _all: true }
    }),
    prisma.businessMembership.count({ where: membershipWhere }),
    prisma.customer.count({ where: { businessId } }),
    prisma.feedback.findMany({
      where: { AND: [where, { customerId: { not: null } }] },
      distinct: ["customerId"],
      select: { customerId: true }
    }),
    prisma.feedback.count({ where: lifetimeWhere }),
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: previousWhere }),
    prisma.feedback.count({
      where: { ...lifetimeWhere, receivedAt: { gte: today, lte: now } }
    }),
    prisma.feedback.count({
      where: { ...lifetimeWhere, receivedAt: { gte: week, lte: now } }
    }),
    prisma.feedback.count({
      where: { ...lifetimeWhere, receivedAt: { gte: month, lte: now } }
    }),
    prisma.feedback.groupBy({
      by: ["status"],
      where,
      _count: { _all: true }
    }),
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
    prisma.feedback.groupBy({
      by: ["assignedToMembershipId"],
      where: previousWhere,
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
    prisma.feedback.count({
      where: {
        AND: [
          where,
          {
            priority: { in: [FeedbackPriority.HIGH, FeedbackPriority.URGENT] },
            status: { in: [FeedbackStatus.NEW, FeedbackStatus.IN_REVIEW] }
          }
        ]
      }
    }),
    prisma.feedback.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true }
    }),
    prisma.feedbackAIAnalysis.count({
      where: { status: FeedbackAIAnalysisStatus.COMPLETED, feedback: where }
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["sentiment"],
      where: { status: FeedbackAIAnalysisStatus.COMPLETED, feedback: where },
      _count: { _all: true }
    }),
    prisma.feedback.groupBy({ by: ["channel"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["branchId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({
      by: ["branchId", "status"],
      where,
      _count: { _all: true }
    }),
    prisma.branch.findMany({
      where: { businessId },
      select: { id: true, name: true, status: true },
      orderBy: { name: "asc" }
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
        branch: { select: { name: true } },
        category: { select: { name: true } },
        aiAnalysis: { select: { sentiment: true } }
      },
      orderBy: [{ priority: "desc" }, { receivedAt: "desc" }, { id: "asc" }],
      take: 25
    }),
    queryFeedbackTimeSeries(periodScope),
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
        provider: true,
        mode: true,
        status: true,
        itemsImported: true,
        itemsDuplicated: true,
        itemsSkipped: true,
        itemsFailed: true,
        safeSummary: true
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
        provider: true,
        status: true,
        messageType: true,
        safeMessage: true
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
        businessId,
        status: FeedbackAIAnalysisStatus.PROCESSING,
        lockedAt: { lt: staleThreshold },
        ...branchFeedbackRelation
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
      where: { businessId },
      _count: { _all: true }
    }),
    prisma.automationExecution.findMany({
      where: automationWhere,
      select: {
        createdAt: true,
        status: true,
        matched: true,
        actionsSucceeded: true,
        actionsSkipped: true,
        actionsFailed: true,
        rule: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 25
    })
  ]);

  const branchCounts = countMap(branchStatuses, "status");
  const totalBranches = branchStatuses.reduce((sum, item) => sum + item._count._all, 0);
  const activeBranches = branchCounts["ACTIVE"] ?? 0;
  const { open, completed } = summarizeFeedbackWorkflow(statuses);
  const { open: previousOpen, completed: previousCompleted } =
    summarizeFeedbackWorkflow(previousStatuses);
  const { assigned, unassigned } = summarizeFeedbackAssignment(assignmentGroups);
  const { assigned: previousAssigned, unassigned: previousUnassigned } =
    summarizeFeedbackAssignment(previousAssignmentGroups);
  const sentimentCounts = countMap(sentiments, "sentiment");
  const health = connections.map((connection) => ({
    connection,
    health: classifyIntegrationHealth(connection)
  }));
  const healthCounts = countValues(health.map((item) => item.health));
  const integrationAdoptionRows = buildIntegrationAdoptionRows(connections);
  const connectionStatusCounts = countValues(connections.map((item) => item.status));
  const live = connections.filter((item) => item.mode === IntegrationMode.LIVE).length;
  const attention = health.filter((item) => item.health !== "HEALTHY").length;
  const workflowTotal = open + completed;
  const completionRate = workflowTotal
    ? `${((completed / workflowTotal) * 100).toFixed(1)}%`
    : "No feedback in workflow";
  const ratedCount = ratingAggregate._count.rating ?? 0;
  const averageRating =
    ratedCount && ratingAggregate._avg.rating != null
      ? Number(ratingAggregate._avg.rating.toFixed(1))
      : "Not rated";

  report.highlights = [
    {
      label: branchId ? "Branches (business-wide, lifetime)" : "Branches (lifetime)",
      value: totalBranches
    },
    {
      label: branchId ? "Active branches (business-wide)" : "Active branches",
      value: activeBranches
    },
    {
      label: branchId
        ? "Members with selected-branch access (lifetime)"
        : "Active members (lifetime)",
      value: members
    },
    {
      label: branchId
        ? "Business customer profiles (business-wide, lifetime)"
        : "Customer profiles (lifetime)",
      value: customers
    },
    {
      label: "Customers represented by feedback (period)",
      value: representedCustomers.length
    },
    { label: "Total feedback (lifetime, matching filters)", value: lifetimeTotal },
    { label: "Feedback in selected period", value: periodTotal },
    { label: "Feedback today", value: feedbackToday },
    { label: "Feedback this week", value: feedbackWeek },
    { label: "Feedback this month", value: feedbackMonth },
    { label: "Open feedback (period)", value: open },
    { label: "Completed feedback (period)", value: completed },
    { label: "Assigned feedback (period)", value: assigned },
    { label: "Unassigned feedback (period)", value: unassigned },
    { label: "High or urgent priority (period)", value: highPriority },
    { label: "Unresolved high or urgent (period)", value: unresolvedHighUrgent },
    { label: "Average rating (period)", value: averageRating },
    {
      label: "Positive sentiment (period)",
      value: sentimentCounts[FeedbackAISentiment.POSITIVE] ?? 0
    },
    {
      label: "Negative sentiment (period)",
      value: sentimentCounts[FeedbackAISentiment.NEGATIVE] ?? 0
    },
    {
      label: "Neutral sentiment (period)",
      value: sentimentCounts[FeedbackAISentiment.NEUTRAL] ?? 0
    },
    {
      label: "Mixed sentiment (period)",
      value: sentimentCounts[FeedbackAISentiment.MIXED] ?? 0
    },
    { label: "AI analyzed (period)", value: aiCompleted },
    { label: "AI not analyzed (period)", value: Math.max(0, periodTotal - aiCompleted) },
    {
      label: branchId
        ? "Integration connections routed to branch"
        : "Integration connections (lifetime)",
      value: connections.length
    },
    {
      label: branchId ? "Live integrations routed to branch" : "Live connections",
      value: live
    },
    { label: "Healthy connections", value: healthCounts["HEALTHY"] ?? 0 },
    { label: "Connections with errors", value: connectionStatusCounts["ERROR"] ?? 0 },
    { label: "Paused connections", value: connectionStatusCounts["PAUSED"] ?? 0 },
    {
      label: "Disconnected connections",
      value: connectionStatusCounts["DISCONNECTED"] ?? 0
    },
    {
      label: branchId
        ? "Routed integrations needing attention"
        : "Integrations needing attention",
      value: attention
    }
  ];
  report.managementSummary = buildBusinessOwnerManagementSummary({
    periodTotal,
    channels,
    open,
    highPriority,
    liveIntegrations: live,
    attentionIntegrations: attention
  });

  const branchNameById = new Map(branchesList.map((item) => [item.id, item.name]));
  const workloadBranches = branchId
    ? branchesList.filter((item) => item.id === branchId)
    : branchesList;
  const branchWorkload = summarizeBranchWorkload(branchStatusDistribution);

  report.sections = [
    {
      title: "Business at a glance",
      description: branchId
        ? "Business-wide lifetime values are not branch-scopable and are labeled as business-wide."
        : "Business inventory, membership, and customer profile totals are lifetime values.",
      headers: [
        "Business",
        "Status",
        "Branches",
        "Active members",
        "Customer profiles",
        "Integration connections"
      ],
      rows: [
        [
          business.name,
          business.status,
          totalBranches,
          members,
          customers,
          connections.length
        ]
      ],
      emptyMessage: "Business context is unavailable."
    },
    {
      title: "Feedback trend",
      headers: ["Period", "Feedback"],
      rows: completeTimeSeries(trend, from, to, reportBucket(from, to)).map((item) => [
        item.date,
        item.count
      ]),
      emptyMessage: "No feedback matched the selected period and filters."
    },
    await namedGroupSection(
      "Feedback by branch",
      "Branch",
      branchDistribution,
      "branchId",
      branchNameById,
      periodTotal
    ),
    groupSection("Channel distribution", "Channel", channels, "channel", periodTotal),
    await namedGroupSection(
      "Category distribution",
      "Category",
      categories,
      "categoryId",
      new Map(),
      periodTotal
    ),
    groupSection(
      "Workflow status distribution",
      "Status",
      statuses,
      "status",
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
      title: "AI analysis completion",
      headers: ["State", "Count", "Percentage"],
      rows: [
        ["Analyzed", aiCompleted, percentage(aiCompleted, periodTotal)],
        [
          "Not analyzed",
          Math.max(0, periodTotal - aiCompleted),
          percentage(Math.max(0, periodTotal - aiCompleted), periodTotal)
        ]
      ],
      emptyMessage: "No feedback was available for AI completion analysis."
    },
    {
      title: "Workflow performance",
      description:
        "Open means NEW or IN_REVIEW; Completed means RESOLVED or CLOSED. First-response and resolution-time metrics are not collected, so no response-time claims are made.",
      headers: ["Workflow state", "Count"],
      rows: [
        ["Open", open],
        ["Completed", completed],
        ["Assigned", assigned],
        ["Unassigned", unassigned],
        ["High or urgent unresolved", unresolvedHighUrgent],
        ["Completion rate", completionRate]
      ],
      emptyMessage: "No feedback matched the selected period and filters."
    },
    {
      title: "Workload by branch",
      description:
        "Open and Completed use NEW/IN_REVIEW versus RESOLVED/CLOSED semantics for feedback in the selected scope.",
      headers: ["Branch", "Open", "Completed", "Total"],
      rows: workloadBranches.map((item) => {
        const summary = branchWorkload.get(item.id) ?? { open: 0, completed: 0 };
        return [
          item.name,
          summary.open,
          summary.completed,
          summary.open + summary.completed
        ];
      }),
      emptyMessage: "No branch workload matched the selected scope."
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
      rows: importantFeedback.map((item) => [
        item.receivedAt.toISOString(),
        business.name,
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
        "Status",
        "Health",
        "Imported",
        "Last relevant activity",
        "Operational note"
      ],
      rows: health.map(({ connection, health: connectionHealth }) => [
        business.name,
        providerLabel(connection),
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
    {
      title: "Integration adoption",
      description:
        "Only Live integration connections available to the Business Owner workspace are included.",
      headers: ["Provider", "Count"],
      rows: integrationAdoptionRows,
      emptyMessage: "No integration connections matched the selected scope."
    },
    groupSection(
      "Synchronization outcomes",
      "Run status",
      runStatuses,
      "status",
      undefined,
      "HEALTH"
    ),
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
        business.name,
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
        business.name,
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
      "Automation rule state",
      "Rule state",
      automationRules,
      "status",
      undefined,
      "HEALTH"
    ),
    groupSection(
      "Automation execution outcomes",
      "Execution state",
      automationStatuses,
      "status",
      automationCount,
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
        business.name,
        item.rule?.name ?? "Deleted or unavailable rule",
        item.status,
        item.matched ? "Yes" : "No",
        item.actionsSucceeded,
        item.actionsSkipped,
        item.actionsFailed
      ]),
      semantic: "HEALTH",
      emptyMessage: "No automation executions matched the selected period and filters."
    }
  ];

  if (input.comparePreviousPeriod) {
    report.comparison = [
      createReportComparison("Feedback received", periodTotal, previousTotal),
      createReportComparison("Open feedback", open, previousOpen),
      createReportComparison("Completed feedback", completed, previousCompleted),
      createReportComparison("Assigned feedback", assigned, previousAssigned),
      createReportComparison("Unassigned feedback", unassigned, previousUnassigned),
      createReportComparison("High or urgent feedback", highPriority, 0),
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

export function buildIntegrationAdoptionRows(
  connections: ReadonlyArray<Pick<IntegrationHealthRecord, "provider">>
): Array<[string, number]> {
  const providerCounts = new Map<IntegrationHealthRecord["provider"], number>();
  for (const connection of connections) {
    providerCounts.set(
      connection.provider,
      (providerCounts.get(connection.provider) ?? 0) + 1
    );
  }
  return [...providerCounts.entries()]
    .map(
      ([provider, count]) =>
        [providerLabel({ provider, liveProviderType: null }), count] as [string, number]
    )
    .sort(([left], [right]) => left.localeCompare(right, "en"));
}

export function summarizeBranchWorkload(
  groups: Array<{ branchId: string; status: FeedbackStatus; _count: { _all: number } }>
) {
  const result = new Map<string, { open: number; completed: number }>();
  for (const group of groups) {
    const entry = result.get(group.branchId) ?? { open: 0, completed: 0 };
    if (
      group.status === FeedbackStatus.NEW ||
      group.status === FeedbackStatus.IN_REVIEW
    ) {
      entry.open += group._count._all;
    } else if (
      group.status === FeedbackStatus.RESOLVED ||
      group.status === FeedbackStatus.CLOSED
    ) {
      entry.completed += group._count._all;
    }
    result.set(group.branchId, entry);
  }
  return result;
}

export function buildBusinessOwnerManagementSummary(metrics: {
  periodTotal: number;
  channels: Array<{ channel: string; _count: { _all: number } }>;
  open: number;
  highPriority: number;
  liveIntegrations: number;
  attentionIntegrations: number;
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
      ? `${leaders[0]} was the leading channel with ${plainRecordCount(maximumChannelCount)}.`
      : leaders.length > 1
        ? `${formatNaturalList(leaders)} were tied as the leading channels with ${feedbackRecordCount(maximumChannelCount)} each.`
        : "No channel distribution was available for the matching feedback.";
  const openSummary = `${metrics.open} feedback item${metrics.open === 1 ? "" : "s"} remain${metrics.open === 1 ? "s" : ""} open${
    metrics.highPriority > 0
      ? `, including ${metrics.highPriority} high-priority issue${
          metrics.highPriority === 1 ? "" : "s"
        }`
      : ""
  }.`;
  const integrationSummary = `${metrics.liveIntegrations} Live integration${
    metrics.liveIntegrations === 1 ? " is" : "s are"
  } connected and ${metrics.attentionIntegrations} connection${
    metrics.attentionIntegrations === 1 ? " requires" : "s require"
  } attention.`;
  return `${feedbackRecordCount(metrics.periodTotal)} ${
    metrics.periodTotal === 1 ? "was" : "were"
  } received during the selected period. ${channelSummary} ${openSummary} ${integrationSummary}`;
}

export function feedbackRecordCount(count: number) {
  return `${count} feedback record${count === 1 ? "" : "s"}`;
}

function plainRecordCount(count: number) {
  return `${count} record${count === 1 ? "" : "s"}`;
}

function formatNaturalList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function ownerReportFilters(context: OwnerReportContext) {
  const { input, business, branch } = context;
  const filters = [`Business: ${business.name}`];
  filters.push(branch ? `Branch: ${branch.name}` : "All Branches");
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
  filters.push(
    input.comparePreviousPeriod
      ? "Previous period comparison enabled"
      : "Previous period comparison disabled"
  );
  return filters;
}

function createOwnerReportScopeMetadata(
  context: OwnerReportContext
): AdminReportDocument["scope"] {
  const { business, branch } = context;
  const scopeBusiness: AdminReportDocument["scope"]["metrics"] = {
    businesses: "BUSINESS_SCOPED",
    branches: "BUSINESS_SCOPED",
    users: "BUSINESS_SCOPED",
    customers: "BUSINESS_SCOPED",
    feedback: "BUSINESS_SCOPED",
    integrations: "BUSINESS_SCOPED",
    approvalWorkload: "BUSINESS_SCOPED"
  };
  const scopeBranch: AdminReportDocument["scope"]["metrics"] = {
    businesses: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE",
    branches: "BRANCH_SCOPED",
    users: "BRANCH_SCOPED",
    customers: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE",
    feedback: "BRANCH_SCOPED",
    integrations: "BRANCH_SCOPED",
    approvalWorkload: "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE"
  };
  if (branch) {
    return {
      level: "BRANCH",
      label: `${business.name} / ${branch.name}`,
      notes: [
        "All feedback metrics use one canonical Business, Branch, Channel, Workflow Status, and Sentiment scope.",
        "Integration, synchronization, webhook, AI, and automation activity respects the selected branch where a real relationship exists.",
        "Customer profiles and business branch inventory remain business-wide because those records have no branch ownership relationship.",
        "No platform-level or other-tenant data is included."
      ],
      metrics: scopeBranch
    };
  }
  return {
    level: "BUSINESS",
    label: business.name,
    notes: [
      "Every metric is limited to the authenticated Business.",
      "All feedback metrics use one canonical Channel, Workflow Status, and Sentiment scope.",
      "No platform-level or other-tenant data is included."
    ],
    metrics: scopeBusiness
  };
}

async function namedGroupSection(
  title: string,
  label: string,
  groups: Array<CountGroup<Record<string, unknown>>>,
  key: string,
  names: Map<string, string>,
  total?: number
): Promise<ReportSection> {
  const ids = groups.flatMap((group) => {
    const value = group[key] as unknown;
    return typeof value === "string" ? [value] : [];
  });
  let nameMap = names;
  if (nameMap.size === 0 && ids.length) {
    const records = await prisma.feedbackCategory.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true }
    });
    nameMap = new Map(records.map((record) => [record.id, record.name]));
  }
  return {
    title,
    headers: total === undefined ? [label, "Count"] : [label, "Count", "Percentage"],
    rows: groups.map((group) => {
      const value = group[key] as unknown;
      const count = group._count._all;
      return [
        typeof value === "string"
          ? (nameMap.get(value) ?? "Unknown")
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
