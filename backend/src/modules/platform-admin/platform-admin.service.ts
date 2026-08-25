import type { FeedbackChannel } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  AccountStatus,
  AutomationEventStatus,
  AutomationExecutionStatus,
  AutomationRuleStatus,
  BusinessStatus,
  FeedbackAIAnalysisStatus,
  IntegrationConnectionStatus,
  IntegrationMode,
  Prisma as PrismaRuntime,
  SynchronizationRunStatus
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  calculateChange,
  classifyIntegrationHealth,
  resolveDateWindow,
  summarizeDistribution,
  summarizeSentiment
} from "./platform-admin.analytics.js";
import type {
  AdminFeedbackQuery,
  AdminIntegrationsQuery,
  AdminPeriod,
  AdminReportRequest,
  AdminUsersQuery
} from "./platform-admin.schemas.js";
import type {
  AdminIntegrationAction,
  AdminUserAction,
  AdminUserUpdate
} from "./platform-admin.schemas.js";
import type { AdminReportDocument, ReportSection } from "./platform-admin.types.js";
import { recordPlatformAdminActivity } from "./platform-admin-audit.service.js";
import { getPlatformSettings } from "./platform-settings.service.js";
import {
  supportedLiveIntegrationWhere,
  supportedOperationalFeedbackWhere
} from "../integrations/supported-integration-policy.js";

type CountGroup<T extends Record<string, unknown>> = T & { _count: { _all: number } };
type SqlCountRow = { bucket: Date | string; count: bigint | number };

const ATTENTION_RUN_STATUSES: SynchronizationRunStatus[] = [
  SynchronizationRunStatus.FAILED,
  SynchronizationRunStatus.COMPLETED_WITH_ERRORS
];

export async function getAdminDashboard(period: AdminPeriod) {
  const now = new Date();
  const window = resolveDateWindow(period, now);
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const operationalFeedback = (where: Prisma.FeedbackWhereInput = {}) => ({
    AND: [supportedOperationalFeedbackWhere(), where]
  });

  const [
    totalBusinesses,
    activeBusinesses,
    pendingBusinesses,
    businessesCurrent,
    businessesPrevious,
    totalUsers,
    usersCurrent,
    usersPrevious,
    totalFeedback,
    feedbackCurrent,
    feedbackPrevious,
    feedbackToday,
    feedbackWeek,
    feedbackMonth,
    totalBranches,
    totalCustomers,
    openFeedback,
    aiCompleted,
    aiFailed,
    activeAutomationRules,
    automationFailures,
    integrations,
    channelGroups,
    sentimentGroups,
    aiStatusGroups,
    integrationAdoption,
    feedbackTrend,
    previousFeedbackTrend,
    businessGrowth,
    recentActivity,
    businessOverview
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { status: BusinessStatus.ACTIVE } }),
    prisma.business.count({ where: { status: BusinessStatus.PENDING } }),
    prisma.business.count({
      where: { createdAt: { gte: window.start, lte: window.end } }
    }),
    prisma.business.count({
      where: { createdAt: { gte: window.previousStart, lte: window.previousEnd } }
    }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: window.start, lte: window.end } } }),
    prisma.user.count({
      where: { createdAt: { gte: window.previousStart, lte: window.previousEnd } }
    }),
    prisma.feedback.count({ where: operationalFeedback({ deletedAt: null }) }),
    prisma.feedback.count({
      where: operationalFeedback({
        deletedAt: null,
        receivedAt: { gte: window.start, lte: window.end }
      })
    }),
    prisma.feedback.count({
      where: operationalFeedback({
        deletedAt: null,
        receivedAt: { gte: window.previousStart, lte: window.previousEnd }
      })
    }),
    prisma.feedback.count({
      where: operationalFeedback({
        deletedAt: null,
        receivedAt: { gte: todayStart, lte: now }
      })
    }),
    prisma.feedback.count({
      where: operationalFeedback({
        deletedAt: null,
        receivedAt: { gte: weekStart, lte: now }
      })
    }),
    prisma.feedback.count({
      where: operationalFeedback({
        deletedAt: null,
        receivedAt: { gte: monthStart, lte: now }
      })
    }),
    prisma.branch.count(),
    prisma.customer.count(),
    prisma.feedback.count({
      where: operationalFeedback({
        deletedAt: null,
        status: { in: ["NEW", "IN_REVIEW"] }
      })
    }),
    prisma.feedbackAIAnalysis.count({
      where: {
        status: FeedbackAIAnalysisStatus.COMPLETED,
        feedback: operationalFeedback({ deletedAt: null })
      }
    }),
    prisma.feedbackAIAnalysis.count({
      where: {
        status: FeedbackAIAnalysisStatus.FAILED,
        feedback: operationalFeedback({ deletedAt: null })
      }
    }),
    prisma.automationRule.count({ where: { status: AutomationRuleStatus.ACTIVE } }),
    prisma.automationExecution.count({
      where: {
        feedback: supportedOperationalFeedbackWhere(),
        status: {
          in: [AutomationExecutionStatus.FAILED, AutomationExecutionStatus.PARTIAL]
        }
      }
    }),
    prisma.integrationConnection.findMany({
      where: supportedLiveIntegrationWhere(),
      select: {
        id: true,
        businessId: true,
        provider: true,
        mode: true,
        status: true,
        requiresReauthorization: true,
        webhookStatus: true,
        lastConnectionTestStatus: true,
        lastErrorCode: true
      }
    }),
    prisma.feedback.groupBy({
      by: ["channel"],
      where: operationalFeedback({
        deletedAt: null,
        receivedAt: { gte: window.start, lte: window.end }
      }),
      _count: { _all: true },
      orderBy: { channel: "asc" }
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["sentiment"],
      where: {
        status: FeedbackAIAnalysisStatus.COMPLETED,
        feedback: operationalFeedback({
          deletedAt: null,
          receivedAt: { gte: window.start, lte: window.end }
        })
      },
      _count: { _all: true }
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["status"],
      where: {
        feedback: operationalFeedback({
          deletedAt: null,
          receivedAt: { gte: window.start, lte: window.end }
        })
      },
      _count: { _all: true }
    }),
    prisma.integrationConnection.groupBy({
      by: ["provider", "mode"],
      where: supportedLiveIntegrationWhere(),
      _count: { _all: true },
      orderBy: [{ provider: "asc" }, { mode: "asc" }]
    }),
    queryTimeSeries("feedback", "received_at", window.start, window.end, window.bucket),
    queryTimeSeries(
      "feedback",
      "received_at",
      window.previousStart,
      window.previousEnd,
      window.bucket
    ),
    queryTimeSeries("businesses", "created_at", window.start, window.end, window.bucket),
    getRecentPlatformActivity(),
    getBusinessOverview()
  ]);

  const health = integrations.map((connection) => ({
    ...connection,
    health: classifyIntegrationHealth(connection)
  }));
  const healthCounts = countValues(health.map((item) => item.health));
  const attentionConnections = health.filter((item) => item.health !== "HEALTHY");
  const channelTotal = channelGroups.reduce((sum, group) => sum + group._count._all, 0);
  const channelDistribution = summarizeDistribution(
    channelGroups.map((group) => ({ key: group.channel, count: group._count._all })),
    channelTotal
  );
  const sentimentSummary = summarizeSentiment(
    feedbackCurrent,
    sentimentGroups.map((group) => ({
      sentiment: group.sentiment,
      count: group._count._all
    }))
  );
  const liveIntegrations = integrations.filter(
    (connection) =>
      connection.mode === IntegrationMode.LIVE &&
      connection.status !== IntegrationConnectionStatus.DISCONNECTED
  ).length;
  const completedFeedbackTrend = completeTimeSeries(
    feedbackTrend,
    window.start,
    window.end,
    window.bucket
  );
  const completedPreviousTrend = completeTimeSeries(
    previousFeedbackTrend,
    window.previousStart,
    window.previousEnd,
    window.bucket
  );

  return {
    period: {
      preset: period,
      from: window.start.toISOString(),
      to: window.end.toISOString(),
      bucket: window.bucket
    },
    primaryKpis: {
      totalBusinesses: {
        value: totalBusinesses,
        context: calculateChange(businessesCurrent, businessesPrevious)
      },
      activeBusinesses: { value: activeBusinesses },
      pendingBusinesses: { value: pendingBusinesses },
      totalUsers: {
        value: totalUsers,
        context: calculateChange(usersCurrent, usersPrevious)
      },
      totalFeedback: {
        value: totalFeedback,
        context: calculateChange(feedbackCurrent, feedbackPrevious)
      },
      liveIntegrations: { value: liveIntegrations },
      integrationsRequiringAttention: {
        value: attentionConnections.length,
        affectedBusinesses: new Set(attentionConnections.map((item) => item.businessId))
          .size
      }
    },
    secondaryMetrics: {
      feedbackToday,
      feedbackThisWeek: feedbackWeek,
      feedbackThisMonth: feedbackMonth,
      totalBranches,
      totalCustomers,
      openFeedback,
      aiCompleted,
      aiFailed,
      activeAutomationRules,
      automationFailures
    },
    feedbackTrend: mergeTrendSeries(completedFeedbackTrend, completedPreviousTrend),
    channelDistribution: channelDistribution.map((group) => ({
      channel: group.key,
      count: group.count,
      percentage: group.percentage
    })),
    channelTotal,
    businessGrowth: {
      series: completeTimeSeries(businessGrowth, window.start, window.end, window.bucket),
      newThisMonth: await prisma.business.count({
        where: { createdAt: { gte: monthStart, lte: now } }
      }),
      active: activeBusinesses,
      inactive: totalBusinesses - activeBusinesses,
      comparison: calculateChange(businessesCurrent, businessesPrevious)
    },
    sentiment: {
      distribution: sentimentSummary.distribution,
      notAnalyzed: sentimentSummary.notAnalyzed,
      analyzed: sentimentSummary.analyzed,
      completionRate: sentimentSummary.completionRate,
      statuses: aiStatusGroups.map((group) => ({
        status: group.status,
        count: group._count._all
      }))
    },
    integrationAdoption: integrationAdoption.map((group) => ({
      provider: group.provider,
      mode: group.mode,
      count: group._count._all
    })),
    integrationHealth: {
      distribution: Object.entries(healthCounts).map(([status, count]) => ({
        status,
        count
      })),
      total: integrations.length,
      affectedBusinesses: new Set(attentionConnections.map((item) => item.businessId))
        .size,
      affectedProviders: new Set(attentionConnections.map((item) => item.provider)).size
    },
    actions: await getActionRequired(),
    recentActivity,
    businessOverview
  };
}

export async function listAdminUsers(query: AdminUsersQuery) {
  const where: Prisma.UserWhereInput = {
    role: query.role,
    status: query.status,
    ...(query.businessId
      ? { businessMemberships: { some: { businessId: query.businessId } } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
            { email: { contains: query.search.toLowerCase() } }
          ]
        }
      : {})
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        businessMemberships: {
          select: {
            id: true,
            role: true,
            status: true,
            business: { select: { id: true, name: true, status: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: offset(query.page, query.pageSize),
      take: query.pageSize
    }),
    prisma.user.count({ where })
  ]);

  return {
    users: serialize(users),
    pagination: pagination(total, query.page, query.pageSize)
  };
}

export async function getAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      businessMemberships: {
        select: {
          id: true,
          role: true,
          status: true,
          allBranchesAccess: true,
          business: { select: { id: true, name: true, status: true } },
          branchAccess: { select: { branch: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: "desc" }
      },
      sessions: {
        select: {
          id: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          ipAddress: true,
          userAgent: true
        },
        orderBy: { lastUsedAt: "desc" },
        take: 12
      }
    }
  });
  if (!user) throw new AppError("User was not found.", "USER_NOT_FOUND", 404);
  return { user: serialize(user) };
}

export async function updateAdminUser(
  actorUserId: string,
  userId: string,
  input: AdminUserUpdate
) {
  const user = await prisma.user
    .update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true
      }
    })
    .catch(() => {
      throw new AppError("User was not found.", "USER_NOT_FOUND", 404);
    });
  await recordPlatformAdminActivity({
    actorUserId,
    action: "USER_UPDATED",
    targetType: "USER",
    targetId: userId,
    summary: `Updated ${user.email}.`,
    metadata: { fields: Object.keys(input).sort() }
  });
  return { user };
}

export async function applyAdminUserAction(
  actorUserId: string,
  userId: string,
  action: AdminUserAction
) {
  if (actorUserId === userId && ["SUSPEND", "DISABLE"].includes(action)) {
    throw new AppError(
      "You cannot suspend or disable your own administrator account.",
      "ADMIN_SELF_LOCKOUT_PREVENTED",
      409
    );
  }
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError("User was not found.", "USER_NOT_FOUND", 404);

  const now = new Date();
  const data =
    action === "VERIFY_EMAIL"
      ? { emailVerifiedAt: now }
      : action === "UNVERIFY_EMAIL"
        ? { emailVerifiedAt: null }
        : action === "SUSPEND"
          ? { status: AccountStatus.SUSPENDED }
          : action === "REACTIVATE"
            ? { status: AccountStatus.ACTIVE }
            : action === "DISABLE"
              ? { status: AccountStatus.DISABLED }
              : {};

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerifiedAt: true
      }
    });
    if (["SUSPEND", "DISABLE", "REVOKE_SESSIONS"].includes(action)) {
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now }
      });
    }
    return updated;
  });

  await recordPlatformAdminActivity({
    actorUserId,
    action: `USER_${action}`,
    targetType: "USER",
    targetId: userId,
    summary: `${action.replaceAll("_", " ")} for ${current.email}.`,
    metadata: { previousStatus: current.status, status: user.status }
  });
  return { user };
}

export async function listAdminFeedback(query: AdminFeedbackQuery) {
  const where: Prisma.FeedbackWhereInput = {
    AND: [
      supportedOperationalFeedbackWhere(),
      {
        deletedAt: null,
        businessId: query.businessId,
        branchId: query.branchId,
        channel: query.channel,
        status: query.status,
        priority: query.priority,
        categoryId: query.categoryId,
        receivedAt:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom,
                lte: query.dateTo ? endOfUtcDay(query.dateTo) : undefined
              }
            : undefined,
        ...(query.sentiment
          ? { aiAnalysis: { is: { sentiment: query.sentiment } } }
          : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search } },
                { message: { contains: query.search } },
                { customerName: { contains: query.search } }
              ]
            }
          : {})
      }
    ]
  };
  const [feedback, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      select: {
        id: true,
        title: true,
        message: true,
        channel: true,
        status: true,
        priority: true,
        rating: true,
        receivedAt: true,
        business: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        aiAnalysis: { select: { status: true, sentiment: true } }
      },
      orderBy: { receivedAt: "desc" },
      skip: offset(query.page, query.pageSize),
      take: query.pageSize
    }),
    prisma.feedback.count({ where })
  ]);
  return {
    feedback: serialize(feedback),
    pagination: pagination(total, query.page, query.pageSize)
  };
}

export async function getAdminFeedback(feedbackId: string) {
  const feedback = await prisma.feedback.findFirst({
    where: { id: feedbackId, deletedAt: null },
    include: {
      business: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      assignedTo: {
        select: {
          id: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      },
      customer: { select: { id: true, displayName: true, email: true, phone: true } },
      attachments: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true
        }
      },
      ingestion: {
        select: {
          id: true,
          status: true,
          externalId: true,
          errorCode: true,
          createdAt: true
        }
      },
      aiAnalysis: {
        select: {
          status: true,
          sentiment: true,
          sentimentConfidence: true,
          sentimentExplanation: true,
          summary: true,
          detectedLanguage: true,
          suggestedCategoryId: true,
          categoryConfidence: true,
          provider: true,
          model: true,
          completedAt: true
        }
      },
      activities: {
        include: {
          actor: {
            select: { user: { select: { firstName: true, lastName: true, email: true } } }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
  if (!feedback) throw new AppError("Feedback was not found.", "FEEDBACK_NOT_FOUND", 404);
  return { feedback: serialize(feedback) };
}

export async function listAdminIntegrations(query: AdminIntegrationsQuery) {
  const where: Prisma.IntegrationConnectionWhereInput = {
    AND: [
      supportedLiveIntegrationWhere(),
      {
        businessId: query.businessId,
        provider: query.provider,
        mode: query.mode,
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { displayName: { contains: query.search } },
                { business: { name: { contains: query.search } } }
              ]
            }
          : {})
      }
    ]
  };
  const connections = await prisma.integrationConnection.findMany({
    where,
    select: {
      id: true,
      provider: true,
      mode: true,
      status: true,
      displayName: true,
      liveProviderType: true,
      requiresReauthorization: true,
      webhookStatus: true,
      lastConnectionTestStatus: true,
      lastInboundMessageAt: true,
      lastSuccessfulSyncAt: true,
      lastAttemptedSyncAt: true,
      lastErrorCode: true,
      totalImported: true,
      connectedAt: true,
      createdAt: true,
      business: { select: { id: true, name: true, status: true } },
      defaultBranch: { select: { id: true, name: true, status: true } },
      synchronizationRuns: {
        select: {
          status: true,
          completedAt: true,
          itemsImported: true,
          itemsDuplicated: true,
          itemsSkipped: true,
          itemsFailed: true,
          errorCode: true
        },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  const classified = connections.map((connection) => ({
    ...connection,
    health: classifyIntegrationHealth(connection)
  }));
  const filtered = query.health
    ? classified.filter((connection) =>
        query.health === "HEALTHY"
          ? connection.health === "HEALTHY"
          : connection.health !== "HEALTHY"
      )
    : classified;
  const start = offset(query.page, query.pageSize);

  return {
    integrations: serialize(filtered.slice(start, start + query.pageSize)),
    pagination: pagination(filtered.length, query.page, query.pageSize)
  };
}

export async function getAdminIntegration(connectionId: string) {
  const integration = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
    include: {
      business: { select: { id: true, name: true, status: true } },
      defaultBranch: { select: { id: true, name: true, status: true } },
      synchronizationRuns: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          itemsImported: true,
          itemsDuplicated: true,
          itemsSkipped: true,
          itemsFailed: true,
          errorCode: true,
          safeSummary: true
        },
        orderBy: { createdAt: "desc" },
        take: 20
      },
      webhookDeliveries: {
        select: {
          id: true,
          status: true,
          receivedAt: true,
          processedAt: true,
          resultCode: true,
          safeMessage: true
        },
        orderBy: { receivedAt: "desc" },
        take: 20
      }
    }
  });
  if (!integration) {
    throw new AppError("Integration was not found.", "INTEGRATION_NOT_FOUND", 404);
  }
  const {
    lastProviderCursor: _cursor,
    webhookVerifyTokenHash: _verifyHash,
    ...safe
  } = integration;
  return {
    integration: serialize({ ...safe, health: classifyIntegrationHealth(integration) })
  };
}

export async function applyAdminIntegrationAction(
  actorUserId: string,
  connectionId: string,
  action: AdminIntegrationAction
) {
  const current = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, displayName: true, status: true, mode: true }
  });
  if (!current)
    throw new AppError("Integration was not found.", "INTEGRATION_NOT_FOUND", 404);
  if (action === "DISCONNECT" && current.mode === IntegrationMode.LIVE) {
    throw new AppError(
      "Live disconnection must be completed by a tenant administrator so provider authorization can be revoked safely.",
      "LIVE_INTEGRATION_TENANT_ACTION_REQUIRED",
      409
    );
  }
  const allowed =
    (action === "PAUSE" && current.status !== IntegrationConnectionStatus.DISCONNECTED) ||
    (action === "RESUME" && current.status === IntegrationConnectionStatus.PAUSED) ||
    (action === "DISCONNECT" &&
      current.status !== IntegrationConnectionStatus.DISCONNECTED);
  if (!allowed) {
    throw new AppError(
      `The integration cannot ${action.toLowerCase()} from ${current.status.toLowerCase()}.`,
      "INTEGRATION_ACTION_INVALID",
      409
    );
  }
  const now = new Date();
  const status =
    action === "PAUSE"
      ? IntegrationConnectionStatus.PAUSED
      : action === "RESUME"
        ? IntegrationConnectionStatus.CONNECTED
        : IntegrationConnectionStatus.DISCONNECTED;
  const integration = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status,
      pausedAt: action === "PAUSE" ? now : action === "RESUME" ? null : undefined,
      disconnectedAt:
        action === "DISCONNECT" ? now : action === "RESUME" ? null : undefined
    },
    select: {
      id: true,
      displayName: true,
      provider: true,
      mode: true,
      status: true,
      updatedAt: true
    }
  });
  await recordPlatformAdminActivity({
    actorUserId,
    action: `INTEGRATION_${action}`,
    targetType: "INTEGRATION",
    targetId: connectionId,
    summary: `${action} ${current.displayName}.`,
    metadata: { previousStatus: current.status, status }
  });
  return { integration: serialize(integration) };
}

export async function getAdminSystemHealth() {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - 15 * 60_000);
  const recent = new Date(now.getTime() - 24 * 60 * 60_000);
  const [databaseProbe, ai, automation, sync, webhooks] = await Promise.all([
    prisma.$queryRaw<Array<{ healthy: number }>>(PrismaRuntime.sql`SELECT 1 AS healthy`),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["status"],
      where: {
        feedback: {
          AND: [{ deletedAt: null }, supportedOperationalFeedbackWhere()]
        }
      },
      _count: { _all: true }
    }),
    prisma.automationEvent.groupBy({
      by: ["status"],
      where: { feedback: supportedOperationalFeedbackWhere() },
      _count: { _all: true }
    }),
    prisma.synchronizationRun.groupBy({
      by: ["status"],
      where: { connection: { is: supportedLiveIntegrationWhere() } },
      _count: { _all: true }
    }),
    prisma.integrationWebhookDelivery.groupBy({
      by: ["status"],
      where: { provider: "WHATSAPP", receivedAt: { gte: recent } },
      _count: { _all: true }
    })
  ]);
  const [staleAi, staleAutomation, staleSync] = await Promise.all([
    prisma.feedbackAIAnalysis.count({
      where: {
        status: FeedbackAIAnalysisStatus.PROCESSING,
        feedback: {
          AND: [{ deletedAt: null }, supportedOperationalFeedbackWhere()]
        },
        lockedAt: { lt: staleThreshold }
      }
    }),
    prisma.automationEvent.count({
      where: {
        status: AutomationEventStatus.PROCESSING,
        lockedAt: { lt: staleThreshold },
        feedback: supportedOperationalFeedbackWhere()
      }
    }),
    prisma.synchronizationRun.count({
      where: {
        status: SynchronizationRunStatus.RUNNING,
        startedAt: { lt: staleThreshold },
        connection: { is: supportedLiveIntegrationWhere() }
      }
    })
  ]);

  return {
    checkedAt: now.toISOString(),
    api: { status: "OPERATIONAL", detail: "The authenticated health request completed." },
    database: {
      status: Number(databaseProbe[0]?.healthy) === 1 ? "OPERATIONAL" : "DEGRADED",
      detail: "Connectivity probe completed without exposing database metadata."
    },
    workers: {
      ai: { states: groupsToRecords(ai), staleProcessing: staleAi },
      automation: {
        states: groupsToRecords(automation),
        staleProcessing: staleAutomation
      },
      integrations: { states: groupsToRecords(sync), staleProcessing: staleSync }
    },
    recentWebhookActivity: groupsToRecords(webhooks),
    note: "Worker health is derived from persisted queue/activity states; infrastructure CPU, memory, and uptime are not collected."
  };
}

export async function getAdminFilterOptions() {
  const [businesses, branches, categories] = await Promise.all([
    prisma.business.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { name: "asc" }
    }),
    prisma.branch.findMany({
      select: { id: true, businessId: true, name: true, status: true },
      orderBy: [{ businessId: "asc" }, { name: "asc" }]
    }),
    prisma.feedbackCategory.findMany({
      select: { id: true, businessId: true, name: true, isActive: true },
      orderBy: [{ businessId: "asc" }, { name: "asc" }]
    })
  ]);
  return { businesses, branches, categories };
}

export async function buildLegacyAdminReport(
  input: Omit<LegacyAdminReportRequest, "outputFormat">
): Promise<AdminReportDocument> {
  const from = startOfUtcDay(input.dateFrom);
  const to = endOfUtcDay(input.dateTo);
  const feedbackWhere: Prisma.FeedbackWhereInput = {
    deletedAt: null,
    businessId: input.businessId,
    branchId: input.branchId,
    channel: input.channel,
    status: input.status,
    receivedAt: { gte: from, lte: to },
    ...(input.sentiment ? { aiAnalysis: { is: { sentiment: input.sentiment } } } : {}),
    AND: [supportedOperationalFeedbackWhere()]
  };

  const [business, feedbackTotal, platformSettings] = await Promise.all([
    input.businessId
      ? prisma.business.findUnique({
          where: { id: input.businessId },
          select: { name: true }
        })
      : null,
    prisma.feedback.count({ where: feedbackWhere }),
    getPlatformSettings()
  ]);
  const filters = [
    business ? `Business: ${business.name}` : "All businesses",
    input.branchId ? "Specific branch" : "All branches",
    input.channel ? `Channel: ${input.channel}` : "All channels",
    input.status ? `Status: ${input.status}` : "All workflow statuses",
    input.sentiment ? `Sentiment: ${input.sentiment}` : "All sentiments"
  ];

  const base: AdminReportDocument = {
    branding: {
      platformName: platformSettings.platformName,
      primaryColor: platformSettings.primaryColor,
      reportFooterText: platformSettings.reportFooterText
    },
    title: reportTitle(input.reportType),
    reportType: input.reportType,
    scope: {
      level: input.branchId ? "BRANCH" : input.businessId ? "BUSINESS" : "PLATFORM",
      label: input.branchId ? "Selected branch" : (business?.name ?? "Platform-wide"),
      notes: ["Legacy internal report scope."],
      metrics: {
        businesses: input.businessId ? "BUSINESS_SCOPED" : "PLATFORM_WIDE",
        branches: input.branchId
          ? "BRANCH_SCOPED"
          : input.businessId
            ? "BUSINESS_SCOPED"
            : "PLATFORM_WIDE",
        users: input.businessId ? "BUSINESS_SCOPED" : "PLATFORM_WIDE",
        customers: input.businessId ? "BUSINESS_SCOPED" : "PLATFORM_WIDE",
        feedback: input.branchId
          ? "BRANCH_SCOPED"
          : input.businessId
            ? "BUSINESS_SCOPED"
            : "PLATFORM_WIDE",
        integrations: input.businessId ? "BUSINESS_SCOPED" : "PLATFORM_WIDE",
        approvalWorkload: input.businessId ? "BUSINESS_SCOPED" : "PLATFORM_WIDE"
      }
    },
    period: { from: from.toISOString(), to: to.toISOString() },
    generatedAt: new Date().toISOString(),
    filters,
    managementSummary: "Legacy report calculations retained for internal reuse.",
    highlights: [{ label: "Feedback in scope", value: feedbackTotal }],
    sections: []
  };

  if (input.comparePreviousPeriod) {
    const duration = to.getTime() - from.getTime() + 1;
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration + 1);
    const previous = await prisma.feedback.count({
      where: {
        ...feedbackWhere,
        receivedAt: { gte: previousFrom, lte: previousTo }
      }
    });
    base.comparison = [legacyComparison("Feedback", feedbackTotal, previous)];
  }

  switch (input.reportType) {
    case "EXECUTIVE_PLATFORM":
      await addExecutiveSections(base, feedbackWhere, from, to);
      break;
    case "BUSINESS_ADOPTION":
      await addBusinessAdoptionSections(base, from, to);
      break;
    case "FEEDBACK_INTELLIGENCE":
      await addFeedbackSections(base, feedbackWhere);
      break;
    case "CHANNEL_PERFORMANCE":
      await addChannelSections(base, feedbackWhere);
      break;
    case "INTEGRATION_HEALTH":
      await addIntegrationHealthSections(base, input.businessId);
      break;
    case "AI_SENTIMENT":
      await addAiSections(base, feedbackWhere);
      break;
    case "WORKFLOW":
      await addWorkflowSections(base, feedbackWhere);
      break;
    case "USER_ACCESS":
      await addUserAccessSections(base, input.businessId, from, to);
      break;
    case "AUTOMATION":
      await addAutomationSections(base, input.businessId, from, to);
      break;
  }

  return base;
}

async function addExecutiveSections(
  report: AdminReportDocument,
  feedbackWhere: Prisma.FeedbackWhereInput,
  from: Date,
  to: Date
) {
  const [
    businesses,
    active,
    users,
    branches,
    channels,
    sentiments,
    integrations,
    adoption,
    trend,
    actions
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { status: BusinessStatus.ACTIVE } }),
    prisma.user.count(),
    prisma.branch.count(),
    prisma.feedback.groupBy({
      by: ["channel"],
      where: feedbackWhere,
      _count: { _all: true }
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["sentiment"],
      where: { status: FeedbackAIAnalysisStatus.COMPLETED, feedback: feedbackWhere },
      _count: { _all: true }
    }),
    prisma.integrationConnection.findMany({
      where: supportedLiveIntegrationWhere(),
      select: integrationHealthSelect,
      orderBy: { updatedAt: "desc" }
    }),
    prisma.integrationConnection.groupBy({
      by: ["provider", "mode"],
      where: supportedLiveIntegrationWhere(),
      _count: { _all: true }
    }),
    queryTimeSeries("feedback", "received_at", from, to, reportBucket(from, to)),
    getActionRequired()
  ]);
  report.highlights.unshift(
    { label: "Total businesses", value: businesses },
    { label: "Active businesses", value: active },
    { label: "Platform users", value: users },
    { label: "Branches", value: branches }
  );
  report.sections.push(
    {
      title: "Feedback trend",
      headers: ["Period", "Feedback"],
      rows: trend.map((item) => [item.date, item.count])
    },
    groupSection("Channel distribution", "Channel", channels, "channel"),
    groupSection("Sentiment distribution", "Sentiment", sentiments, "sentiment"),
    {
      title: "Integration adoption",
      headers: ["Provider", "Mode", "Connections"],
      rows: adoption.map((item) => [item.provider, item.mode, item._count._all])
    },
    integrationSummarySection(integrations)
  );
  report.sections.push({
    title: "Key operational issues",
    headers: ["Severity", "Issue", "Count"],
    rows: actions.length
      ? actions.map((item) => [item.severity, item.title, item.count])
      : [["INFO", "No persisted conditions require administrator action", 0]]
  });
  const newBusinesses = await prisma.business.count({
    where: { createdAt: { gte: from, lte: to } }
  });
  report.highlights.push({ label: "New businesses", value: newBusinesses });
}

async function addBusinessAdoptionSections(
  report: AdminReportDocument,
  from: Date,
  to: Date
) {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          branches: true,
          memberships: true,
          feedbacks: { where: { deletedAt: null } }
        }
      },
      integrationConnections: {
        where: { status: { not: IntegrationConnectionStatus.DISCONNECTED } },
        select: { provider: true, mode: true }
      },
      feedbacks: {
        where: { deletedAt: null },
        select: { receivedAt: true },
        orderBy: { receivedAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });
  report.highlights.unshift(
    { label: "Businesses", value: businesses.length },
    {
      label: "Active",
      value: businesses.filter((item) => item.status === "ACTIVE").length
    },
    {
      label: "Onboarded in period",
      value: businesses.filter((item) => item.createdAt >= from && item.createdAt <= to)
        .length
    }
  );
  report.sections.push({
    title: "Business adoption",
    headers: [
      "Business",
      "Status",
      "Branches",
      "Users",
      "Feedback",
      "Connected channels",
      "Last feedback"
    ],
    rows: businesses.map((item) => [
      item.name,
      item.status,
      item._count.branches,
      item._count.memberships,
      item._count.feedbacks,
      new Set(item.integrationConnections.map((connection) => connection.provider)).size,
      item.feedbacks[0]?.receivedAt.toISOString() ?? "No activity"
    ])
  });
  const byFeedback = [...businesses].sort(
    (a, b) => b._count.feedbacks - a._count.feedbacks
  );
  report.sections.push(
    {
      title: "High-adoption businesses",
      headers: ["Business", "Feedback", "Connected providers"],
      rows: byFeedback
        .slice(0, 10)
        .map((item) => [
          item.name,
          item._count.feedbacks,
          new Set(item.integrationConnections.map((connection) => connection.provider))
            .size
        ])
    },
    {
      title: "Low-activity businesses",
      headers: ["Business", "Feedback", "Last feedback"],
      rows: byFeedback
        .filter((item) => item._count.feedbacks === 0 || !item.feedbacks[0])
        .slice(0, 10)
        .map((item) => [item.name, item._count.feedbacks, "No feedback activity"])
    }
  );
}

async function addFeedbackSections(
  report: AdminReportDocument,
  where: Prisma.FeedbackWhereInput
) {
  const receivedAt = where.receivedAt as Prisma.DateTimeFilter | undefined;
  const trend =
    receivedAt?.gte instanceof Date && receivedAt.lte instanceof Date
      ? await queryTimeSeries(
          "feedback",
          "received_at",
          receivedAt.gte,
          receivedAt.lte,
          reportBucket(receivedAt.gte, receivedAt.lte)
        )
      : [];
  const [
    businesses,
    branches,
    channels,
    statuses,
    priorities,
    categories,
    ratings,
    sentiments
  ] = await Promise.all([
    prisma.feedback.groupBy({ by: ["businessId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["branchId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["channel"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["sentiment"],
      where: { feedback: where, status: FeedbackAIAnalysisStatus.COMPLETED },
      _count: { _all: true }
    })
  ]);
  report.sections.push(
    {
      title: "Feedback over time",
      headers: ["Period", "Feedback"],
      rows: trend.map((item) => [item.date, item.count])
    },
    await namedGroupSection(
      "Business breakdown",
      "Business",
      businesses,
      "businessId",
      "business"
    ),
    await namedGroupSection("Branch breakdown", "Branch", branches, "branchId", "branch"),
    groupSection("Channel breakdown", "Channel", channels, "channel"),
    groupSection("Workflow status", "Status", statuses, "status"),
    groupSection("Priority", "Priority", priorities, "priority"),
    await namedGroupSection(
      "Category",
      "Category",
      categories,
      "categoryId",
      "feedbackCategory"
    ),
    groupSection("Ratings", "Rating", ratings, "rating"),
    groupSection("Sentiment", "Sentiment", sentiments, "sentiment")
  );
}

async function addChannelSections(
  report: AdminReportDocument,
  where: Prisma.FeedbackWhereInput
) {
  const [feedback, connections, items, businessChannels] = await Promise.all([
    prisma.feedback.groupBy({ by: ["channel"], where, _count: { _all: true } }),
    prisma.integrationConnection.groupBy({
      by: ["provider", "mode"],
      _count: { _all: true }
    }),
    prisma.synchronizationItem.groupBy({
      by: ["provider", "status"],
      _count: { _all: true }
    }),
    prisma.feedback.groupBy({
      by: ["channel", "businessId"],
      where,
      _count: { _all: true }
    })
  ]);
  const total = feedback.reduce((sum, item) => sum + item._count._all, 0);
  report.sections.push({
    title: "Channel performance",
    headers: [
      "Channel",
      "Businesses",
      "Feedback",
      "Share",
      "Live connections",
      "Imported",
      "Duplicates",
      "Skipped",
      "Failed"
    ],
    rows: feedback.map((channel) => {
      const provider = channelToProvider(channel.channel);
      const providerConnections = connections.filter(
        (item) => item.provider === provider
      );
      const providerItems = items.filter((item) => item.provider === provider);
      return [
        channel.channel,
        businessChannels.filter((item) => item.channel === channel.channel).length,
        channel._count._all,
        total ? `${((channel._count._all / total) * 100).toFixed(1)}%` : "0%",
        providerConnections.find((item) => item.mode === IntegrationMode.LIVE)?._count
          ._all ?? 0,
        providerItems.find((item) => item.status === "IMPORTED")?._count._all ?? 0,
        providerItems.find((item) => item.status === "DUPLICATE")?._count._all ?? 0,
        providerItems.find((item) => item.status === "SKIPPED")?._count._all ?? 0,
        providerItems.find((item) => item.status === "FAILED")?._count._all ?? 0
      ];
    })
  });
}

async function addIntegrationHealthSections(
  report: AdminReportDocument,
  businessId?: string
) {
  const connections = await prisma.integrationConnection.findMany({
    where: { AND: [{ businessId }, supportedLiveIntegrationWhere()] },
    select: integrationHealthSelect,
    orderBy: { updatedAt: "desc" }
  });
  report.sections.push(integrationSummarySection(connections), {
    title: "Connection details",
    headers: [
      "Business",
      "Provider",
      "Mode",
      "Status",
      "Health",
      "Webhook",
      "Last inbound",
      "Last sync",
      "Imported",
      "Failure code"
    ],
    rows: connections.map((item) => [
      item.business.name,
      providerLabel(item),
      item.mode,
      item.status,
      classifyIntegrationHealth(item),
      item.webhookStatus ?? "Not applicable",
      item.lastInboundMessageAt?.toISOString() ?? "Never",
      item.lastSuccessfulSyncAt?.toISOString() ?? "Never",
      item.totalImported,
      item.lastErrorCode ?? "None"
    ])
  });
}

async function addAiSections(
  report: AdminReportDocument,
  where: Prisma.FeedbackWhereInput
) {
  const [statuses, sentiments, businesses, channels] = await Promise.all([
    prisma.feedbackAIAnalysis.groupBy({
      by: ["status"],
      where: { feedback: where },
      _count: { _all: true }
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["sentiment"],
      where: { feedback: where },
      _count: { _all: true }
    }),
    prisma.feedbackAIAnalysis.groupBy({
      by: ["businessId"],
      where: { feedback: where },
      _count: { _all: true }
    }),
    prisma.feedback.groupBy({
      by: ["channel"],
      where: { ...where, aiAnalysis: { isNot: null } },
      _count: { _all: true }
    })
  ]);
  report.sections.push(
    groupSection("AI processing status", "Status", statuses, "status"),
    groupSection("Sentiment", "Sentiment", sentiments, "sentiment"),
    await namedGroupSection(
      "Business breakdown",
      "Business",
      businesses,
      "businessId",
      "business"
    ),
    groupSection("Analyzed feedback by channel", "Channel", channels, "channel")
  );
}

async function addWorkflowSections(
  report: AdminReportDocument,
  where: Prisma.FeedbackWhereInput
) {
  const [statuses, priorities, categories, assigned, unassigned] = await Promise.all([
    prisma.feedback.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.feedback.count({ where: { ...where, assignedToMembershipId: { not: null } } }),
    prisma.feedback.count({ where: { ...where, assignedToMembershipId: null } })
  ]);
  report.sections.push(
    groupSection("Workflow status", "Status", statuses, "status"),
    groupSection("Priority", "Priority", priorities, "priority"),
    await namedGroupSection(
      "Category",
      "Category",
      categories,
      "categoryId",
      "feedbackCategory"
    ),
    {
      title: "Assignment",
      headers: ["State", "Count"],
      rows: [
        ["Assigned", assigned],
        ["Unassigned", unassigned]
      ]
    }
  );
}

async function addUserAccessSections(
  report: AdminReportDocument,
  businessId: string | undefined,
  from: Date,
  to: Date
) {
  const userWhere: Prisma.UserWhereInput = businessId
    ? { businessMemberships: { some: { businessId } } }
    : {};
  const [roles, statuses, verified, unverified, registrations, memberships] =
    await Promise.all([
      prisma.user.groupBy({ by: ["role"], where: userWhere, _count: { _all: true } }),
      prisma.user.groupBy({ by: ["status"], where: userWhere, _count: { _all: true } }),
      prisma.user.count({ where: { ...userWhere, emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { ...userWhere, emailVerifiedAt: null } }),
      prisma.user.count({ where: { ...userWhere, createdAt: { gte: from, lte: to } } }),
      prisma.businessMembership.groupBy({
        by: ["businessId", "role", "status"],
        where: { businessId },
        _count: { _all: true }
      })
    ]);
  report.highlights.unshift({ label: "Registered in period", value: registrations });
  report.sections.push(
    groupSection("Platform roles", "Role", roles, "role"),
    groupSection("Account status", "Status", statuses, "status"),
    {
      title: "Email verification",
      headers: ["State", "Count"],
      rows: [
        ["Verified", verified],
        ["Not verified", unverified]
      ]
    },
    await namedMembershipSection(memberships)
  );
}

async function addAutomationSections(
  report: AdminReportDocument,
  businessId: string | undefined,
  from: Date,
  to: Date
) {
  const [rules, executions, actionExecutions, adoptedBusinesses] = await Promise.all([
    prisma.automationRule.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { _all: true }
    }),
    prisma.automationExecution.groupBy({
      by: ["status"],
      where: { businessId, createdAt: { gte: from, lte: to } },
      _count: { _all: true }
    }),
    prisma.automationActionExecution.groupBy({
      by: ["status"],
      where: { execution: { businessId, createdAt: { gte: from, lte: to } } },
      _count: { _all: true }
    }),
    prisma.automationRule.groupBy({
      by: ["businessId"],
      where: { businessId },
      _count: { _all: true }
    })
  ]);
  report.highlights.unshift({
    label: "Businesses using automation",
    value: adoptedBusinesses.length
  });
  report.sections.push(
    groupSection("Rule status", "Status", rules, "status"),
    groupSection("Execution outcomes", "Status", executions, "status"),
    groupSection("Action outcomes", "Status", actionExecutions, "status")
  );
}

async function getActionRequired() {
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const [
    pendingBusinesses,
    connections,
    failedSyncs,
    failedWebhooks,
    failedAi,
    failedAutomation
  ] = await Promise.all([
    prisma.business.count({ where: { status: BusinessStatus.PENDING } }),
    prisma.integrationConnection.findMany({
      where: supportedLiveIntegrationWhere(),
      select: integrationHealthSelect
    }),
    prisma.synchronizationRun.count({
      where: {
        status: { in: ATTENTION_RUN_STATUSES },
        createdAt: { gte: since },
        connection: { is: supportedLiveIntegrationWhere() }
      }
    }),
    prisma.integrationWebhookDelivery.count({
      where: { status: "FAILED", provider: "WHATSAPP", receivedAt: { gte: since } }
    }),
    prisma.feedbackAIAnalysis.count({
      where: {
        status: "FAILED",
        feedback: supportedOperationalFeedbackWhere()
      }
    }),
    prisma.automationExecution.count({
      where: { status: { in: ["FAILED", "PARTIAL"] } }
    })
  ]);
  const attention = connections.filter(
    (connection) => classifyIntegrationHealth(connection) !== "HEALTHY"
  ).length;
  return [
    pendingBusinesses
      ? {
          id: "pending-businesses",
          severity: "HIGH",
          count: pendingBusinesses,
          title: "Businesses are waiting for approval",
          href: "/admin/businesses?status=PENDING"
        }
      : null,
    attention
      ? {
          id: "integration-health",
          severity: "HIGH",
          count: attention,
          title: "Integrations need attention",
          href: "/admin/integrations?health=NEEDS_ATTENTION"
        }
      : null,
    failedSyncs
      ? {
          id: "sync-failures",
          severity: "HIGH",
          count: failedSyncs,
          title: "Synchronization runs failed or partially failed in 24 hours",
          href: "/admin/integrations?health=NEEDS_ATTENTION"
        }
      : null,
    failedWebhooks
      ? {
          id: "webhook-failures",
          severity: "HIGH",
          count: failedWebhooks,
          title: "Webhook deliveries failed in 24 hours",
          href: "/admin/system-health"
        }
      : null,
    failedAi
      ? {
          id: "ai-failures",
          severity: "MEDIUM",
          count: failedAi,
          title: "AI analyses are in a failed state",
          href: "/admin/system-health"
        }
      : null,
    failedAutomation
      ? {
          id: "automation-failures",
          severity: "MEDIUM",
          count: failedAutomation,
          title: "Automation executions failed or partially failed",
          href: "/admin/system-health"
        }
      : null
  ].filter((item) => item !== null);
}

async function getRecentPlatformActivity() {
  const [adminActivities, businesses, integrations, webhooks] = await Promise.all([
    prisma.platformAdminActivity.findMany({
      where: { targetType: { not: "INTEGRATION" } },
      select: {
        id: true,
        summary: true,
        targetType: true,
        targetId: true,
        action: true,
        createdAt: true,
        actor: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.business.findMany({
      select: { id: true, name: true, createdAt: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.integrationConnection.findMany({
      where: supportedLiveIntegrationWhere(),
      select: {
        id: true,
        provider: true,
        mode: true,
        status: true,
        updatedAt: true,
        business: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.integrationWebhookDelivery.findMany({
      select: {
        id: true,
        provider: true,
        status: true,
        receivedAt: true,
        business: { select: { id: true, name: true } }
      },
      where: { status: "FAILED", provider: "WHATSAPP" },
      orderBy: { receivedAt: "desc" },
      take: 6
    })
  ]);
  const auditedBusinessIds = new Set(
    adminActivities
      .filter((item) => item.targetType === "BUSINESS" && item.targetId)
      .map((item) => item.targetId)
  );
  const auditedIntegrationIds = new Set(
    adminActivities
      .filter((item) => item.targetType === "INTEGRATION" && item.targetId)
      .map((item) => item.targetId)
  );
  return [
    ...adminActivities.map((item) => ({
      id: `admin-${item.id}`,
      event: item.summary,
      business: {
        id: item.targetType === "BUSINESS" && item.targetId ? item.targetId : "platform",
        name: `${item.actor.firstName} ${item.actor.lastName}`
      },
      category: item.targetType,
      status: "INFO",
      timestamp: item.createdAt.toISOString()
    })),
    ...businesses
      .filter((item) => !auditedBusinessIds.has(item.id))
      .map((item) => ({
        id: `business-${item.id}`,
        event: `Business created for ${item.status.toLowerCase()} review`,
        business: { id: item.id, name: item.name },
        category: "BUSINESS",
        status: item.status === BusinessStatus.PENDING ? "INFO" : "SUCCESS",
        timestamp: item.createdAt.toISOString()
      })),
    ...integrations
      .filter((item) => !auditedIntegrationIds.has(item.id))
      .map((item) => ({
        id: `integration-${item.id}`,
        event: `${item.provider} ${item.mode.toLowerCase()} connection ${item.status.toLowerCase()}`,
        business: item.business,
        category: "INTEGRATION",
        status: item.status === "ERROR" ? "ERROR" : "INFO",
        timestamp: item.updatedAt.toISOString()
      })),
    ...webhooks.map((item) => ({
      id: `webhook-${item.id}`,
      event: `${item.provider} webhook ${item.status.toLowerCase()}`,
      business: item.business,
      category: "WEBHOOK",
      status: item.status === "FAILED" ? "ERROR" : "SUCCESS",
      timestamp: item.receivedAt.toISOString()
    }))
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 12);
}

async function getBusinessOverview() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      _count: {
        select: {
          branches: true,
          memberships: true,
          feedbacks: {
            where: { AND: [{ deletedAt: null }, supportedOperationalFeedbackWhere()] }
          }
        }
      },
      feedbacks: {
        where: { AND: [{ deletedAt: null }, supportedOperationalFeedbackWhere()] },
        select: { receivedAt: true },
        orderBy: { receivedAt: "desc" },
        take: 1
      },
      integrationConnections: {
        where: {
          AND: [
            supportedLiveIntegrationWhere(),
            { status: { not: IntegrationConnectionStatus.DISCONNECTED } }
          ]
        },
        select: {
          provider: true,
          status: true,
          requiresReauthorization: true,
          webhookStatus: true,
          lastConnectionTestStatus: true,
          lastErrorCode: true,
          mode: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  return businesses
    .sort((a, b) => b._count.feedbacks - a._count.feedbacks)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      branches: item._count.branches,
      users: item._count.memberships,
      feedback: item._count.feedbacks,
      liveChannels: new Set(
        item.integrationConnections.map((connection) => connection.provider)
      ).size,
      needsAttention: item.integrationConnections.some(
        (connection) => classifyIntegrationHealth(connection) !== "HEALTHY"
      ),
      lastActivity: item.feedbacks[0]?.receivedAt.toISOString() ?? null
    }));
}

export async function queryTimeSeries(
  table: "feedback" | "businesses",
  column: "received_at" | "created_at",
  start: Date,
  end: Date,
  bucket: "day" | "week" | "month"
) {
  const bucketSql =
    bucket === "month"
      ? PrismaRuntime.sql`DATE_FORMAT(${PrismaRuntime.raw(column)}, '%Y-%m-01')`
      : bucket === "week"
        ? PrismaRuntime.sql`DATE_SUB(DATE(${PrismaRuntime.raw(column)}), INTERVAL WEEKDAY(${PrismaRuntime.raw(column)}) DAY)`
        : PrismaRuntime.sql`DATE(${PrismaRuntime.raw(column)})`;
  const rows = await prisma.$queryRaw<SqlCountRow[]>(
    table === "feedback"
      ? PrismaRuntime.sql`SELECT ${bucketSql} AS bucket, COUNT(*) AS count FROM ${PrismaRuntime.raw(table)} WHERE deleted_at IS NULL AND (channel IN ('MANUAL', 'PUBLIC_FORM', 'QR_CODE') OR (channel = 'WHATSAPP' AND JSON_EXTRACT(source_metadata, '$.liveMode') = true) OR (channel = 'EMAIL' AND JSON_EXTRACT(source_metadata, '$.liveMode') = true AND JSON_UNQUOTE(JSON_EXTRACT(source_metadata, '$.liveProviderType')) = 'GMAIL')) AND ${PrismaRuntime.raw(column)} >= ${start} AND ${PrismaRuntime.raw(column)} <= ${end} GROUP BY bucket ORDER BY bucket ASC`
      : PrismaRuntime.sql`SELECT ${bucketSql} AS bucket, COUNT(*) AS count FROM ${PrismaRuntime.raw(table)} WHERE ${PrismaRuntime.raw(column)} >= ${start} AND ${PrismaRuntime.raw(column)} <= ${end} GROUP BY bucket ORDER BY bucket ASC`
  );
  return rows.map((row) => ({
    date: normalizeBucket(row.bucket),
    count: Number(row.count)
  }));
}

function mergeTrendSeries(
  current: Array<{ date: string; count: number }>,
  previous: Array<{ date: string; count: number }>
) {
  return current.map((point, index) => ({
    ...point,
    previous: previous[index]?.count ?? 0
  }));
}

export function completeTimeSeries(
  series: Array<{ date: string; count: number }>,
  start: Date,
  end: Date,
  bucket: "day" | "week" | "month"
) {
  const counts = new Map(series.map((item) => [item.date, item.count]));
  const cursor = bucketStart(start, bucket);
  const last = bucketStart(end, bucket);
  const result: Array<{ date: string; count: number }> = [];

  while (cursor <= last) {
    const date = cursor.toISOString().slice(0, 10);
    result.push({ date, count: counts.get(date) ?? 0 });
    if (bucket === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (bucket === "week" ? 7 : 1));
  }
  return result;
}

function bucketStart(value: Date, bucket: "day" | "week" | "month") {
  const result = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
  if (bucket === "month") result.setUTCDate(1);
  if (bucket === "week") {
    result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7));
  }
  return result;
}

function normalizeBucket(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function countValues(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function groupsToRecords<T extends { status: string; _count: { _all: number } }>(
  groups: T[]
) {
  return groups.map((group) => ({ status: group.status, count: group._count._all }));
}

function offset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

function pagination(total: number, page: number, pageSize: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

function endOfUtcDay(value: Date) {
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

export function reportBucket(from: Date, to: Date): "day" | "week" | "month" {
  const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
  return days > 180 ? "month" : days > 45 ? "week" : "day";
}

function groupSection<T extends Record<string, unknown>>(
  title: string,
  label: string,
  groups: Array<CountGroup<T>>,
  key: keyof T
): ReportSection {
  return {
    title,
    headers: [label, "Count"],
    rows: groups.map((group) => [String(group[key] ?? "Not set"), group._count._all])
  };
}

async function namedGroupSection<T extends Record<string, unknown>>(
  title: string,
  label: string,
  groups: Array<CountGroup<T>>,
  key: keyof T,
  model: "business" | "branch" | "feedbackCategory"
): Promise<ReportSection> {
  const ids = groups.flatMap((group) => {
    const id: unknown = group[key];
    return typeof id === "string" ? [id] : [];
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
    headers: [label, "Count"],
    rows: groups.map((group) => {
      const id = group[key];
      return [
        typeof id === "string"
          ? (names.get(id) ?? "Unknown")
          : label === "Category"
            ? "Uncategorized"
            : "Not set",
        group._count._all
      ];
    })
  };
}

async function namedMembershipSection(
  groups: Array<{
    businessId: string;
    role: string;
    status: string;
    _count: { _all: number };
  }>
) {
  const businesses = await prisma.business.findMany({
    where: { id: { in: groups.map((group) => group.businessId) } },
    select: { id: true, name: true }
  });
  const names = new Map(businesses.map((business) => [business.id, business.name]));
  return {
    title: "Business memberships",
    headers: ["Business", "Role", "Status", "Count"],
    rows: groups.map((group) => [
      names.get(group.businessId) ?? "Unknown",
      group.role,
      group.status,
      group._count._all
    ])
  } satisfies ReportSection;
}

const integrationHealthSelect = {
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
  lastSuccessfulSyncAt: true,
  totalImported: true,
  business: { select: { id: true, name: true } }
} satisfies Prisma.IntegrationConnectionSelect;

type IntegrationHealthRecord = Prisma.IntegrationConnectionGetPayload<{
  select: typeof integrationHealthSelect;
}>;

function integrationSummarySection(
  connections: IntegrationHealthRecord[]
): ReportSection {
  const counts = countValues(
    connections.map((connection) => classifyIntegrationHealth(connection))
  );
  return {
    title: "Integration health summary",
    headers: ["Health", "Count"],
    rows: Object.entries(counts).map(([health, count]) => [health, count])
  };
}

function providerLabel(
  connection: Pick<IntegrationHealthRecord, "provider" | "liveProviderType">
) {
  return connection.provider === "EMAIL" && connection.liveProviderType === "GMAIL"
    ? "Gmail"
    : connection.provider === "EMAIL" && connection.liveProviderType
      ? `${connection.provider} (${connection.liveProviderType})`
      : connection.provider;
}

function channelToProvider(channel: FeedbackChannel) {
  const map: Partial<Record<FeedbackChannel, string>> = {
    GOOGLE_REVIEW: "GOOGLE_REVIEWS",
    WHATSAPP: "WHATSAPP",
    EMAIL: "EMAIL",
    X: "X",
    FACEBOOK: "FACEBOOK",
    INSTAGRAM: "INSTAGRAM"
  };
  return map[channel];
}

type LegacyReportType =
  | "EXECUTIVE_PLATFORM"
  | "BUSINESS_ADOPTION"
  | "FEEDBACK_INTELLIGENCE"
  | "CHANNEL_PERFORMANCE"
  | "INTEGRATION_HEALTH"
  | "AI_SENTIMENT"
  | "WORKFLOW"
  | "USER_ACCESS"
  | "AUTOMATION";

type LegacyAdminReportRequest = Omit<AdminReportRequest, "reportType"> & {
  reportType: LegacyReportType;
};

function legacyComparison(label: string, current: number, previous: number) {
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

function reportTitle(type: LegacyReportType) {
  const titles: Record<LegacyReportType, string> = {
    EXECUTIVE_PLATFORM: "Executive Platform Report",
    BUSINESS_ADOPTION: "Business Adoption Report",
    FEEDBACK_INTELLIGENCE: "Feedback Intelligence Report",
    CHANNEL_PERFORMANCE: "Channel Performance Report",
    INTEGRATION_HEALTH: "Integration Health Report",
    AI_SENTIMENT: "AI & Sentiment Report",
    WORKFLOW: "Workflow Report",
    USER_ACCESS: "User & Access Report",
    AUTOMATION: "Automation Report"
  };
  return titles[type];
}
