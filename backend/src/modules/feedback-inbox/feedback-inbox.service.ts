import type {
  Prisma,
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus,
  Branch,
  BusinessMembership
} from "@prisma/client";
import {
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { normalizeSearchInput } from "../../utils/search-normalization.js";
import type { FeedbackInboxQuery } from "./feedback-inbox.types.js";
import { CHANNEL_LABELS } from "./feedback-inbox.types.js";
import { serializeAIAnalysisForMembership } from "../ai-analysis/ai-analysis.service.js";
import { CATEGORY_APPLICATION_RESULT } from "../ai-analysis/ai-analysis.policy.js";
import { getAvailableTransitions } from "../feedback-workflow/feedback-workflow.types.js";
import type {
  FeedbackListItem,
  FeedbackDetailResponse,
  FeedbackInboxPagination,
  FeedbackSummary,
  FeedbackListResponse,
  FeedbackAttachmentResponse
} from "./feedback-inbox.types.js";
import { supportedOperationalFeedbackWhere } from "../integrations/supported-integration-policy.js";

export type FeedbackActor = {
  userId: string;
};

export type FeedbackMembershipContext = {
  businessId: string;
  membership: BusinessMembership & {
    branchAccess: { branchId: string; branch: Branch }[];
  };
};

const MESSAGE_PREVIEW_LENGTH = 180;
const EXTERNAL_FEEDBACK_CHANNELS: FeedbackChannel[] = ["WHATSAPP", "EMAIL"];

const FEEDBACK_SELECT_LIST = {
  id: true,
  title: true,
  message: true,
  channel: true,
  status: true,
  priority: true,
  rating: true,
  branchId: true,
  branch: { select: { id: true, name: true } },
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  assignedToMembershipId: true,
  categoryId: true,
  aiAnalysis: { include: { suggestedCategory: true } },
  occurredAt: true,
  receivedAt: true,
  createdAt: true
} satisfies Prisma.FeedbackSelect;

export async function resolveFeedbackMembershipContext(
  actor: FeedbackActor,
  businessId: string
): Promise<FeedbackMembershipContext> {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: { businessId, userId: actor.userId }
    },
    include: {
      branchAccess: { include: { branch: true } },
      business: true
    }
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

  return { businessId, membership };
}

export function getFeedbackAccessibleBranchIds(
  membership: FeedbackMembershipContext["membership"]
): string[] | null {
  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  ) {
    return null; // null means all branches
  }

  return membership.branchAccess
    .filter((access) => access.branch.status === "ACTIVE")
    .map((access) => access.branchId);
}

export function buildFeedbackWhereClause(
  context: FeedbackMembershipContext,
  query: FeedbackInboxQuery
): Prisma.FeedbackWhereInput {
  const accessibleBranchIds = getFeedbackAccessibleBranchIds(context.membership);
  const where: Prisma.FeedbackWhereInput = {
    businessId: context.businessId,
    deletedAt: null,
    ...(accessibleBranchIds ? { branchId: { in: accessibleBranchIds } } : {})
  };
  const andFilters: Prisma.FeedbackWhereInput[] = [];
  andFilters.push(supportedOperationalFeedbackWhere());

  if (query.branchId) {
    where.branchId = query.branchId;
  }

  if (query.channel) {
    where.channel = query.channel;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.sentiment || query.aiStatus) {
    andFilters.push({
      aiAnalysis: {
        is: {
          ...(query.sentiment ? { sentiment: query.sentiment } : {}),
          ...(query.aiStatus ? { status: query.aiStatus } : {})
        }
      }
    });
  }

  if (query.aiSuggestionState) {
    andFilters.push(buildAISuggestionStateWhere(query.aiSuggestionState));
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.assignedTo) {
    if (query.assignedTo === "me") {
      where.assignedToMembershipId = context.membership.id;
    } else if (query.assignedTo === "unassigned") {
      where.assignedToMembershipId = null;
    } else {
      where.assignedToMembershipId = query.assignedTo;
    }
  } else if (query.assignmentState === "assigned") {
    where.assignedToMembershipId = { not: null };
  } else if (query.assignmentState === "unassigned") {
    where.assignedToMembershipId = null;
  }

  if (!query.categoryId && query.categoryState === "categorized") {
    where.categoryId = { not: null };
  } else if (!query.categoryId && query.categoryState === "uncategorized") {
    where.categoryId = null;
  }

  const ratingMin = query.ratingMin ?? query.rating;
  const ratingMax = query.ratingMax ?? query.rating;
  if (ratingMin || ratingMax || query.includeUnrated) {
    const range: Prisma.IntNullableFilter = {};
    if (ratingMin) range.gte = ratingMin;
    if (ratingMax) range.lte = ratingMax;

    if (ratingMin || ratingMax) {
      andFilters.push({
        OR: [{ rating: range }, ...(query.includeUnrated ? [{ rating: null }] : [])]
      });
    } else if (query.includeUnrated) {
      where.rating = null;
    }
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  } else if (query.customerLinkState === "linked") {
    where.customerId = { not: null };
  } else if (query.customerLinkState === "unlinked") {
    where.customerId = null;
  }

  if (query.search) {
    const normalizedSearch = normalizeSearchInput(query.search, 200);
    if (!normalizedSearch) {
      where.AND = andFilters;
      return where;
    }
    const text = normalizedSearch.text;
    const email = normalizedSearch.email ?? text.toLowerCase();
    const phone = normalizedSearch.phone ?? text;

    where.OR = [
      { title: { contains: text } },
      { message: { contains: text } },
      { customerName: { contains: text } },
      { customerEmail: { contains: email } },
      { customerPhone: { contains: phone } },
      {
        customer: {
          is: {
            OR: [
              { displayName: { contains: text } },
              { firstName: { contains: text } },
              { lastName: { contains: text } },
              { email: { contains: email } },
              { normalizedEmail: { contains: email } },
              { phone: { contains: phone } },
              ...(normalizedSearch.phone
                ? [{ normalizedPhone: normalizedSearch.phone }]
                : [])
            ]
          }
        }
      }
    ];
  }

  if (query.dateFrom || query.dateTo) {
    where.receivedAt = {};
    if (query.dateFrom) {
      where.receivedAt.gte = parseDateBoundary(query.dateFrom, "start");
    }
    if (query.dateTo) {
      where.receivedAt.lte = parseDateBoundary(query.dateTo, "end");
    }
  }

  if (andFilters.length > 0) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...andFilters];
  }

  return where;
}

function buildAISuggestionStateWhere(
  state: NonNullable<FeedbackInboxQuery["aiSuggestionState"]>
): Prisma.FeedbackWhereInput {
  switch (state) {
    case "AVAILABLE":
      return {
        aiAnalysis: {
          is: {
            status: "COMPLETED",
            suggestedCategoryId: { not: null },
            suggestionDismissedAt: null,
            OR: [
              { categoryApplicationResult: null },
              {
                categoryApplicationResult: {
                  notIn: [
                    CATEGORY_APPLICATION_RESULT.AUTO_APPLIED,
                    CATEGORY_APPLICATION_RESULT.MANUALLY_APPLIED,
                    CATEGORY_APPLICATION_RESULT.DISMISSED,
                    CATEGORY_APPLICATION_RESULT.CONFLICTED,
                    "DISMISSED_BY_HUMAN",
                    "HUMAN_CATEGORY_WON"
                  ]
                }
              }
            ]
          }
        }
      };
    case "APPLIED":
      return {
        aiAnalysis: {
          is: {
            categoryApplicationResult: {
              in: [
                CATEGORY_APPLICATION_RESULT.AUTO_APPLIED,
                CATEGORY_APPLICATION_RESULT.MANUALLY_APPLIED
              ]
            }
          }
        }
      };
    case "DISMISSED":
      return {
        aiAnalysis: {
          is: {
            OR: [
              { suggestionDismissedAt: { not: null } },
              {
                categoryApplicationResult: {
                  in: [CATEGORY_APPLICATION_RESULT.DISMISSED, "DISMISSED_BY_HUMAN"]
                }
              }
            ]
          }
        }
      };
    case "NONE":
      return {
        OR: [
          { aiAnalysis: { is: null } },
          { aiAnalysis: { is: { suggestedCategoryId: null } } }
        ]
      };
  }
}

export async function normalizeFeedbackScopedFilters(
  context: FeedbackMembershipContext,
  query: FeedbackInboxQuery
): Promise<FeedbackInboxQuery> {
  const normalized: FeedbackInboxQuery = { ...query };

  if (normalized.branchId) {
    const accessibleBranchIds = getFeedbackAccessibleBranchIds(context.membership);
    const branch = await prisma.branch.findFirst({
      where: { id: normalized.branchId, businessId: context.businessId },
      select: { id: true }
    });

    if (!branch) {
      throw new AppError(
        "Branch was not found for this business.",
        "BRANCH_NOT_FOUND",
        404
      );
    }
    if (accessibleBranchIds && !accessibleBranchIds.includes(branch.id)) {
      throw new AppError("Branch access denied.", "BRANCH_ACCESS_DENIED", 403);
    }
  }

  if (normalized.categoryId) {
    const category = await prisma.feedbackCategory.findFirst({
      where: { id: normalized.categoryId, businessId: context.businessId },
      select: { id: true }
    });

    if (!category) {
      throw new AppError(
        "Category was not found for this business.",
        "CATEGORY_NOT_FOUND",
        404
      );
    }
  }

  if (
    normalized.assignedTo &&
    normalized.assignedTo !== "me" &&
    normalized.assignedTo !== "unassigned"
  ) {
    const membership = await prisma.businessMembership.findFirst({
      where: {
        id: normalized.assignedTo,
        businessId: context.businessId,
        status: BusinessMembershipStatus.ACTIVE
      },
      include: { branchAccess: { select: { branchId: true } } }
    });

    if (!membership || !isMembershipEligibleForActorBranches(context, membership)) {
      throw new AppError("Assignee access denied.", "ASSIGNEE_ACCESS_DENIED", 403);
    }
  }

  if (normalized.customerId) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: normalized.customerId,
        businessId: context.businessId,
        ...customerVisibilityWhere(context)
      },
      select: { id: true }
    });

    if (!customer) {
      throw new AppError("Customer access denied.", "CUSTOMER_ACCESS_DENIED", 403);
    }
  }

  return normalized;
}

function buildOrderBy(
  sort: "newest" | "oldest"
): Prisma.FeedbackOrderByWithRelationInput[] {
  if (sort === "newest") {
    return [{ receivedAt: "desc" }, { id: "desc" }];
  }

  return [{ receivedAt: "asc" }, { id: "asc" }];
}

function parseDateBoundary(value: string, boundary: "start" | "end"): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
    return boundary === "start"
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  return new Date(value);
}

function isMembershipEligibleForActorBranches(
  context: FeedbackMembershipContext,
  membership: Pick<BusinessMembership, "role" | "allBranchesAccess" | "status"> & {
    branchAccess: Array<{ branchId: string }>;
  }
): boolean {
  if (membership.status !== BusinessMembershipStatus.ACTIVE) return false;
  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  ) {
    return true;
  }

  const accessibleBranchIds = getFeedbackAccessibleBranchIds(context.membership);
  if (!accessibleBranchIds) return true;
  return membership.branchAccess.some((access) =>
    accessibleBranchIds.includes(access.branchId)
  );
}

function customerVisibilityWhere(
  context: FeedbackMembershipContext
): Prisma.CustomerWhereInput {
  const accessibleBranchIds = getFeedbackAccessibleBranchIds(context.membership);
  if (!accessibleBranchIds) return {};

  return {
    feedback: {
      some: {
        businessId: context.businessId,
        branchId: { in: accessibleBranchIds }
      }
    }
  };
}

function createMessagePreview(message: string): string {
  if (message.length <= MESSAGE_PREVIEW_LENGTH) {
    return message;
  }

  return message.slice(0, MESSAGE_PREVIEW_LENGTH).trimEnd() + "\u2026";
}

function paginationResult(
  total: number,
  page: number,
  pageSize: number
): FeedbackInboxPagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    totalItems: total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages
  };
}

async function resolveAssigneeInfo(
  membershipId: string | null,
  branchId: string
): Promise<{
  membershipId: string;
  name: string;
  role: string;
  isAvailable: boolean;
} | null> {
  if (!membershipId) return null;

  const membership = await prisma.businessMembership.findUnique({
    where: { id: membershipId },
    include: {
      user: { select: { firstName: true, lastName: true } },
      branchAccess: { select: { branchId: true } }
    }
  });

  if (!membership) return null;

  const isAllBranches =
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess;

  const hasBranchAccess =
    isAllBranches || membership.branchAccess.some((ba) => ba.branchId === branchId);

  return {
    membershipId: membership.id,
    name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
    role: membership.role,
    isAvailable: membership.status === BusinessMembershipStatus.ACTIVE && hasBranchAccess
  };
}

async function resolveCategoryInfo(categoryId: string | null): Promise<{
  id: string;
  name: string;
  colorKey: string;
  isActive: boolean;
} | null> {
  if (!categoryId) return null;

  const category = await prisma.feedbackCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, colorKey: true, isActive: true }
  });

  if (!category) return null;

  return category;
}

async function toFeedbackListItem(
  item: {
    id: string;
    title: string | null;
    message: string;
    channel: FeedbackChannel;
    status: FeedbackStatus;
    priority: FeedbackPriority;
    rating: number | null;
    branchId: string;
    branch: { id: string; name: string };
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    assignedToMembershipId: string | null;
    categoryId: string | null;
    aiAnalysis: Parameters<typeof serializeAIAnalysisForMembership>[0] | null;
    occurredAt: Date | null;
    receivedAt: Date;
    createdAt: Date;
  },
  membership: FeedbackMembershipContext["membership"]
): Promise<FeedbackListItem> {
  const [assigneeInfo, categoryInfo] = await Promise.all([
    resolveAssigneeInfo(item.assignedToMembershipId, item.branchId),
    resolveCategoryInfo(item.categoryId)
  ]);

  return {
    id: item.id,
    title: item.title,
    messagePreview: createMessagePreview(item.message),
    channel: item.channel,
    status: item.status,
    rating: item.rating,
    priority: item.priority,
    branch: {
      id: item.branch.id,
      name: item.branch.name
    },
    customer: {
      name: item.customerName ?? null
    },
    assignedTo: assigneeInfo,
    category: categoryInfo,
    aiAnalysis: item.aiAnalysis
      ? serializeAIAnalysisForMembership(item.aiAnalysis, membership)
      : null,
    occurredAt: item.occurredAt?.toISOString() ?? null,
    receivedAt: item.receivedAt.toISOString(),
    createdAt: item.createdAt.toISOString()
  };
}

async function getSummaryCounts(
  context: FeedbackMembershipContext
): Promise<FeedbackSummary> {
  const accessibleBranchIds = getFeedbackAccessibleBranchIds(context.membership);
  const baseWhere: Prisma.FeedbackWhereInput = {
    businessId: context.businessId,
    deletedAt: null,
    ...(accessibleBranchIds ? { branchId: { in: accessibleBranchIds } } : {})
  };

  const [total, manual, publicForm, qrCode, external] = await Promise.all([
    prisma.feedback.count({ where: baseWhere }),
    prisma.feedback.count({
      where: { ...baseWhere, channel: "MANUAL" }
    }),
    prisma.feedback.count({
      where: { ...baseWhere, channel: "PUBLIC_FORM" }
    }),
    prisma.feedback.count({
      where: { ...baseWhere, channel: "QR_CODE" }
    }),
    prisma.feedback.count({
      where: { ...baseWhere, channel: { in: EXTERNAL_FEEDBACK_CHANNELS } }
    })
  ]);

  return { total, manual, publicForm, qrCode, external };
}

function resolveSourceLabel(channel: FeedbackChannel): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

async function resolveSourceDetail(
  feedback: {
    id: string;
    channel: FeedbackChannel;
    sourceMetadata: Prisma.JsonValue | null;
    sourceUrl: string | null;
  },
  _businessId: string
): Promise<{
  label: string;
  detail: string | null;
  reference: string | null;
  note: string | null;
  url: string | null;
}> {
  const label = resolveSourceLabel(feedback.channel);

  if (!feedback.sourceMetadata || typeof feedback.sourceMetadata !== "object") {
    return { label, detail: null, reference: null, note: null, url: feedback.sourceUrl };
  }

  const meta = feedback.sourceMetadata as Record<string, unknown>;
  const sourceType = typeof meta.sourceType === "string" ? meta.sourceType : "";

  if (sourceType === "demo-external-feedback") {
    const providerLabel =
      typeof meta.providerLabel === "string" ? meta.providerLabel : label;
    const externalSourceItemId =
      typeof meta.externalSourceItemId === "string" ? meta.externalSourceItemId : null;
    const sourceLabel = typeof meta.sourceLabel === "string" ? meta.sourceLabel : null;

    return {
      label: providerLabel,
      detail: sourceLabel ?? `${providerLabel} Demo Mode`,
      reference: externalSourceItemId,
      note: "Simulated external data",
      url: null
    };
  }

  if (sourceType === "live-email") {
    const providerLabel =
      typeof meta.liveProviderType === "string"
        ? `Live ${meta.liveProviderType.toLowerCase()}`
        : "Live email";
    const sourceLabel = typeof meta.sourceLabel === "string" ? meta.sourceLabel : null;
    const externalSourceItemId =
      typeof meta.externalSourceItemId === "string" ? meta.externalSourceItemId : null;
    const connectionName =
      typeof meta.connectionName === "string" ? meta.connectionName : null;

    return {
      label: "Email",
      detail: sourceLabel ?? providerLabel,
      reference: externalSourceItemId,
      note: connectionName ? `Live Mode - ${connectionName}` : "Live Mode",
      url: null
    };
  }

  if (sourceType === "live-whatsapp") {
    const sourceLabel = typeof meta.sourceLabel === "string" ? meta.sourceLabel : null;
    const externalSourceItemId =
      typeof meta.externalSourceItemId === "string" ? meta.externalSourceItemId : null;
    const connectionName =
      typeof meta.connectionName === "string" ? meta.connectionName : null;
    const messageType = typeof meta.messageType === "string" ? meta.messageType : null;

    return {
      label: "WhatsApp",
      detail: sourceLabel ?? "Live WhatsApp message",
      reference: externalSourceItemId,
      note: [connectionName ? `Live Mode - ${connectionName}` : "Live Mode", messageType]
        .filter(Boolean)
        .join(" - "),
      url: null
    };
  }

  if (sourceType === "live-facebook" || sourceType === "live-instagram") {
    const providerLabel =
      typeof meta.providerLabel === "string"
        ? meta.providerLabel
        : sourceType === "live-facebook"
          ? "Facebook"
          : "Instagram";
    const sourceLabel = typeof meta.sourceLabel === "string" ? meta.sourceLabel : null;
    const externalSourceItemId =
      typeof meta.externalSourceItemId === "string" ? meta.externalSourceItemId : null;
    const connectionName =
      typeof meta.connectionName === "string" ? meta.connectionName : null;
    const parentReference =
      typeof meta.parentReference === "string" ? meta.parentReference : null;
    const mediaReference =
      typeof meta.mediaReference === "string" ? meta.mediaReference : null;

    return {
      label: providerLabel,
      detail: sourceLabel ?? `Live ${providerLabel} comment`,
      reference: externalSourceItemId ?? parentReference ?? mediaReference,
      note: connectionName ? `Live Mode - ${connectionName}` : "Live Mode",
      url: null
    };
  }

  if (feedback.channel === "MANUAL") {
    const reference = typeof meta.reference === "string" ? meta.reference : null;
    const note = typeof meta.note === "string" ? meta.note : null;

    return {
      label,
      detail: sourceType ? sourceType.replace(/_/g, " ") : null,
      reference,
      note,
      url: feedback.sourceUrl
    };
  }

  if (feedback.channel === "PUBLIC_FORM") {
    const followUp = meta.followUpConsent === true ? "Follow-up allowed" : null;

    return {
      label,
      detail: "Public feedback portal",
      reference: null,
      note: followUp,
      url: null
    };
  }

  if (feedback.channel === "QR_CODE") {
    const qrScope = typeof meta.qrScope === "string" ? meta.qrScope : null;
    const qrName = typeof meta.qrName === "string" ? meta.qrName : null;

    return {
      label,
      detail: qrName ?? "QR Code",
      reference: qrScope
        ? qrScope === "business-wide"
          ? "Business-wide"
          : "Branch-specific"
        : null,
      note: null,
      url: null
    };
  }

  return { label, detail: null, reference: null, note: null, url: feedback.sourceUrl };
}

export async function listFeedback(
  actor: FeedbackActor,
  businessId: string,
  query: FeedbackInboxQuery
): Promise<FeedbackListResponse> {
  const context = await resolveFeedbackMembershipContext(actor, businessId);
  const scopedQuery = await normalizeFeedbackScopedFilters(context, query);

  // Validate date range
  if (scopedQuery.dateFrom && scopedQuery.dateTo) {
    const from = parseDateBoundary(scopedQuery.dateFrom, "start");
    const to = parseDateBoundary(scopedQuery.dateTo, "end");

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new AppError(
        "Invalid date format in filter.",
        "FEEDBACK_INBOX_QUERY_INVALID",
        400
      );
    }

    if (from > to) {
      throw new AppError(
        "dateFrom must be before or equal to dateTo.",
        "FEEDBACK_INBOX_QUERY_INVALID",
        400
      );
    }
  }

  const where = buildFeedbackWhereClause(context, scopedQuery);
  const orderBy = buildOrderBy(scopedQuery.sort ?? "newest");
  const skip = (scopedQuery.page - 1) * scopedQuery.pageSize;

  const [items, total, summary] = await Promise.all([
    prisma.feedback.findMany({
      where,
      select: FEEDBACK_SELECT_LIST,
      orderBy,
      skip,
      take: scopedQuery.pageSize
    }),
    prisma.feedback.count({ where }),
    getSummaryCounts(context)
  ]);

  const mappedItems = await Promise.all(
    items.map((item) => toFeedbackListItem(item, context.membership))
  );

  return {
    items: mappedItems,
    pagination: paginationResult(total, scopedQuery.page, scopedQuery.pageSize),
    summary
  };
}

export async function getFeedbackDashboard(actor: FeedbackActor, businessId: string) {
  const context = await resolveFeedbackMembershipContext(actor, businessId);
  const branchIds = getFeedbackAccessibleBranchIds(context.membership);
  const from = new Date();
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  const where: Prisma.FeedbackWhereInput = {
    businessId,
    deletedAt: null,
    receivedAt: { gte: from },
    ...(branchIds ? { branchId: { in: branchIds } } : {})
  };
  const [total, attentionCount, statuses, channels, sentiments, rating, recent] =
    await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.count({
        where: {
          ...where,
          priority: { in: ["HIGH", "URGENT"] },
          status: { in: ["NEW", "IN_REVIEW"] }
        }
      }),
      prisma.feedback.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.feedback.groupBy({ by: ["channel"], where, _count: { _all: true } }),
      prisma.feedbackAIAnalysis.groupBy({
        by: ["sentiment"],
        where: { businessId, feedback: { is: { ...where } }, sentiment: { not: null } },
        _count: { _all: true }
      }),
      prisma.feedback.aggregate({
        where: { ...where, rating: { not: null } },
        _avg: { rating: true }
      }),
      prisma.feedback.findMany({
        where,
        select: {
          id: true,
          title: true,
          message: true,
          status: true,
          priority: true,
          receivedAt: true,
          branch: { select: { id: true, name: true } },
          customerName: true
        },
        orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
        take: 5
      })
    ]);
  return {
    periodDays: 30,
    scope: {
      allBranches: branchIds === null,
      branchIds: branchIds ?? [],
      label:
        branchIds === null
          ? "All business branches"
          : branchIds.length === 1
            ? (context.membership.branchAccess.find(
                (item) => item.branchId === branchIds[0]
              )?.branch.name ?? "Assigned branch")
            : "All assigned branches"
    },
    total,
    attentionCount,
    statuses: Object.fromEntries(statuses.map((item) => [item.status, item._count._all])),
    channels: channels.map((item) => ({
      channel: item.channel,
      count: item._count._all
    })),
    sentiments: sentiments.map((item) => ({
      sentiment: item.sentiment,
      count: item._count._all
    })),
    averageRating: rating._avg.rating,
    recent: recent.map((item) => ({
      ...item,
      messagePreview: createMessagePreview(item.message),
      message: undefined,
      receivedAt: item.receivedAt.toISOString()
    }))
  };
}

export async function getFeedbackDetail(
  actor: FeedbackActor,
  businessId: string,
  feedbackId: string
): Promise<FeedbackDetailResponse> {
  const context = await resolveFeedbackMembershipContext(actor, businessId);
  const accessibleBranchIds = getFeedbackAccessibleBranchIds(context.membership);

  const feedback = await prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      businessId,
      deletedAt: null,
      ...(accessibleBranchIds ? { branchId: { in: accessibleBranchIds } } : {})
    },
    include: {
      branch: { select: { id: true, name: true, city: true, district: true } },
      customer: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      },
      attachments: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          externalUrl: true,
          checksum: true
        },
        orderBy: { createdAt: "asc" }
      },
      aiAnalysis: {
        include: { suggestedCategory: true }
      }
    }
  });

  if (!feedback) {
    throw new AppError("Feedback was not found.", "FEEDBACK_NOT_FOUND", 404);
  }

  const source = await resolveSourceDetail(feedback, businessId);

  const branchLocation =
    [feedback.branch.city, feedback.branch.district].filter(Boolean).join(", ") || null;

  const [assigneeInfo, categoryInfo] = await Promise.all([
    resolveAssigneeInfo(feedback.assignedToMembershipId, feedback.branchId),
    resolveCategoryInfo(feedback.categoryId)
  ]);

  return {
    id: feedback.id,
    title: feedback.title,
    message: feedback.message,
    channel: feedback.channel,
    status: feedback.status,
    availableTransitions: getAvailableTransitions(feedback.status),
    rating: feedback.rating,
    priority: feedback.priority,
    branch: {
      id: feedback.branch.id,
      name: feedback.branch.name,
      location: branchLocation
    },
    customer: {
      name: feedback.customerName,
      email: feedback.customerEmail,
      phone: feedback.customerPhone
    },
    linkedCustomer: feedback.customer
      ? {
          id: feedback.customer.id,
          displayName: feedback.customer.displayName,
          email: feedback.customer.email,
          phone: feedback.customer.phone,
          status: feedback.customer.status,
          createdAt: feedback.customer.createdAt.toISOString(),
          updatedAt: feedback.customer.updatedAt.toISOString()
        }
      : null,
    customerPermissions: {
      canLinkFeedback:
        context.membership.role === BusinessMemberRole.OWNER ||
        context.membership.role === BusinessMemberRole.ADMIN ||
        context.membership.role === BusinessMemberRole.MANAGER,
      canCreateFromFeedback:
        context.membership.role === BusinessMemberRole.OWNER ||
        context.membership.role === BusinessMemberRole.ADMIN ||
        context.membership.role === BusinessMemberRole.MANAGER
    },
    assignedTo: assigneeInfo,
    category: categoryInfo,
    aiAnalysis: feedback.aiAnalysis
      ? serializeAIAnalysisForMembership(feedback.aiAnalysis, context.membership)
      : null,
    occurredAt: feedback.occurredAt?.toISOString() ?? null,
    receivedAt: feedback.receivedAt.toISOString(),
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
    source,
    attachments: feedback.attachments.map((att): FeedbackAttachmentResponse => ({
      id: att.id,
      filename: att.filename,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      externalUrl: att.externalUrl,
      checksum: att.checksum
    }))
  };
}
