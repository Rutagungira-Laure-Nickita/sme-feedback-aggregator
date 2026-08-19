import type {
  Prisma,
  FeedbackChannel,
  Branch,
  BusinessMembership,
  Customer,
  Feedback
} from "@prisma/client";
import {
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  CustomerActivityType,
  CustomerStatus
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  normalizeCustomerIdentity,
  type CustomerIdentityInput
} from "./customer-normalization.js";
import { normalizeSearchInput } from "../../utils/search-normalization.js";
import { customerMatchingService, toMatchSummary } from "./customer-matching.service.js";
import type {
  CreateCustomerFromFeedbackInput,
  CustomerCreateInput,
  CustomerFeedbackQueryInput,
  CustomerListQueryInput,
  CustomerUpdateInput,
  ExpectedUpdatedAtInput,
  FeedbackCustomerLinkInput
} from "./customer.schemas.js";
import type {
  CustomerActivityItem,
  CustomerActivityResponse,
  CustomerAggregates,
  CustomerDetailResponse,
  CustomerFeedbackItem,
  CustomerFeedbackResponse,
  CustomerListResponse,
  CustomerMatchGroups,
  CustomerPermissions,
  CustomerSummary,
  FeedbackCustomerState
} from "./customer.types.js";

type Actor = { userId: string };
type MembershipContext = {
  businessId: string;
  membership: BusinessMembership & {
    branchAccess: { branchId: string; branch: Branch }[];
    business: { status: BusinessStatus };
    user: { firstName: string; lastName: string };
  };
};

const MESSAGE_PREVIEW_LENGTH = 140;

async function resolveMembershipContext(
  actor: Actor,
  businessId: string
): Promise<MembershipContext> {
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId: actor.userId } },
    include: {
      branchAccess: { include: { branch: true } },
      business: { select: { status: true } },
      user: { select: { firstName: true, lastName: true } }
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

function hasFullBusinessAccess(membership: Pick<BusinessMembership, "role">): boolean {
  return (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN
  );
}

function canAccessAllBranches(
  membership: Pick<BusinessMembership, "role" | "allBranchesAccess">
): boolean {
  return hasFullBusinessAccess(membership) || membership.allBranchesAccess;
}

function getAccessibleBranchIds(context: MembershipContext): string[] | null {
  if (canAccessAllBranches(context.membership)) {
    return null;
  }

  return context.membership.branchAccess
    .filter((access) => access.branch.status === "ACTIVE")
    .map((access) => access.branchId);
}

function feedbackBranchWhere(context: MembershipContext): Prisma.FeedbackWhereInput {
  const branchIds = getAccessibleBranchIds(context);
  return branchIds ? { branchId: { in: branchIds } } : {};
}

function customerVisibilityWhere(context: MembershipContext): Prisma.CustomerWhereInput {
  if (hasFullBusinessAccess(context.membership)) {
    return {};
  }

  const branchIds = getAccessibleBranchIds(context);
  if (branchIds && branchIds.length === 0) {
    return { id: "__no_accessible_customer__" };
  }

  return {
    feedback: {
      some: {
        businessId: context.businessId,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      }
    }
  };
}

function permissionsFor(context: MembershipContext): CustomerPermissions {
  const ownerOrAdmin = hasFullBusinessAccess(context.membership);
  const manager = context.membership.role === BusinessMemberRole.MANAGER;

  return {
    canCreate: ownerOrAdmin,
    canEdit: ownerOrAdmin,
    canArchive: ownerOrAdmin,
    canReactivate: ownerOrAdmin,
    canLinkFeedback: ownerOrAdmin || manager,
    canCreateFromFeedback: ownerOrAdmin || manager,
    canViewActivity: ownerOrAdmin
  };
}

function requireOwnerOrAdmin(context: MembershipContext): void {
  if (!hasFullBusinessAccess(context.membership)) {
    throw new AppError(
      "Only owners and admins can manage customer profiles.",
      "BUSINESS_ROLE_REQUIRED",
      403
    );
  }
}

function requireCanLink(context: MembershipContext): void {
  if (!permissionsFor(context).canLinkFeedback) {
    throw new AppError("Customer link access denied.", "CUSTOMER_ACCESS_DENIED", 403);
  }
}

function paginationResult(total: number, page: number, pageSize: number) {
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

function buildCustomerWhere(
  context: MembershipContext,
  query: CustomerListQueryInput
): Prisma.CustomerWhereInput {
  const search = normalizeSearchInput(query.search, 120);
  const linkedFeedbackWhere = buildLinkedFeedbackWhere(context, query);
  return {
    businessId: context.businessId,
    ...(query.status ? { status: query.status } : {}),
    ...customerVisibilityWhere(context),
    ...(hasLinkedFeedbackFilters(query)
      ? { feedback: { some: linkedFeedbackWhere } }
      : {}),
    ...(query.contactState === "has_email" ? { email: { not: null } } : {}),
    ...(query.contactState === "has_phone" ? { phone: { not: null } } : {}),
    ...(query.contactState === "missing_email" ? { email: null } : {}),
    ...(query.contactState === "missing_phone" ? { phone: null } : {}),
    ...(search
      ? {
          OR: [
            { displayName: { contains: search.text } },
            { firstName: { contains: search.text } },
            { lastName: { contains: search.text } },
            { email: { contains: search.email ?? search.text.toLowerCase() } },
            { normalizedEmail: { contains: search.email ?? search.text.toLowerCase() } },
            { phone: { contains: search.phone ?? search.text } },
            ...(search.phone ? [{ normalizedPhone: search.phone }] : [])
          ]
        }
      : {})
  };
}

function hasLinkedFeedbackFilters(
  query: Pick<
    CustomerListQueryInput,
    | "branchId"
    | "channel"
    | "ratingMin"
    | "ratingMax"
    | "latestFeedbackFrom"
    | "latestFeedbackTo"
  >
): boolean {
  return Boolean(
    query.branchId ||
    query.channel ||
    query.ratingMin ||
    query.ratingMax ||
    query.latestFeedbackFrom ||
    query.latestFeedbackTo
  );
}

function buildLinkedFeedbackWhere(
  context: MembershipContext,
  query: Pick<
    CustomerListQueryInput,
    | "branchId"
    | "channel"
    | "ratingMin"
    | "ratingMax"
    | "latestFeedbackFrom"
    | "latestFeedbackTo"
  >
): Prisma.FeedbackWhereInput {
  const branchScope = feedbackBranchWhere(context);
  const where: Prisma.FeedbackWhereInput = {
    businessId: context.businessId,
    ...branchScope
  };

  if (query.branchId && isBranchIdAllowed(context, query.branchId)) {
    where.branchId = query.branchId;
  }
  if (query.channel) {
    where.channel = query.channel as FeedbackChannel;
  }
  if (query.ratingMin || query.ratingMax) {
    where.rating = {};
    if (query.ratingMin) where.rating.gte = query.ratingMin;
    if (query.ratingMax) where.rating.lte = query.ratingMax;
  }
  if (query.latestFeedbackFrom || query.latestFeedbackTo) {
    where.receivedAt = {};
    if (query.latestFeedbackFrom) {
      where.receivedAt.gte = parseDateBoundary(query.latestFeedbackFrom, "start");
    }
    if (query.latestFeedbackTo) {
      where.receivedAt.lte = parseDateBoundary(query.latestFeedbackTo, "end");
    }
  }

  return where;
}

function isBranchIdAllowed(context: MembershipContext, branchId: string): boolean {
  const accessibleBranchIds = getAccessibleBranchIds(context);
  return !accessibleBranchIds || accessibleBranchIds.includes(branchId);
}

function orderByForCustomerList(
  sort: CustomerListQueryInput["sort"]
): Prisma.CustomerOrderByWithRelationInput[] {
  if (sort === "name") {
    return [{ displayName: "asc" }, { id: "asc" }];
  }

  return [{ updatedAt: "desc" }, { id: "desc" }];
}

export async function listCustomers(
  actor: Actor,
  businessId: string,
  query: CustomerListQueryInput
): Promise<CustomerListResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  const scopedQuery = await normalizeCustomerListQuery(context, query);
  const where = buildCustomerWhere(context, scopedQuery);
  const total = await prisma.customer.count({ where });
  const customers =
    scopedQuery.sort === "latestFeedback"
      ? await listCustomersByLatestFeedback(context, where, scopedQuery)
      : await prisma.customer.findMany({
          where,
          orderBy: orderByForCustomerList(scopedQuery.sort),
          skip: (scopedQuery.page - 1) * scopedQuery.pageSize,
          take: scopedQuery.pageSize
        });
  const aggregateMap = await loadCustomerAggregates(
    context,
    customers.map((item) => item.id)
  );

  return {
    items: customers.map((customer) =>
      toCustomerSummary(customer, aggregateMap.get(customer.id) ?? emptyAggregates())
    ),
    pagination: paginationResult(total, scopedQuery.page, scopedQuery.pageSize),
    permissions: permissionsFor(context)
  };
}

async function normalizeCustomerListQuery(
  context: MembershipContext,
  query: CustomerListQueryInput
): Promise<CustomerListQueryInput> {
  const normalized: CustomerListQueryInput = { ...query };

  if (normalized.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: normalized.branchId, businessId: context.businessId },
      select: { id: true }
    });

    if (!branch || !isBranchIdAllowed(context, normalized.branchId)) {
      delete normalized.branchId;
    }
  }

  return normalized;
}

async function listCustomersByLatestFeedback(
  context: MembershipContext,
  where: Prisma.CustomerWhereInput,
  query: CustomerListQueryInput
): Promise<Customer[]> {
  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }]
  });
  const aggregateMap = await loadCustomerAggregates(
    context,
    customers.map((item) => item.id)
  );

  return customers
    .sort((left, right) => {
      const leftDate = aggregateMap.get(left.id)?.latestFeedbackAt ?? "";
      const rightDate = aggregateMap.get(right.id)?.latestFeedbackAt ?? "";
      if (leftDate !== rightDate) {
        return rightDate.localeCompare(leftDate);
      }
      return left.displayName.localeCompare(right.displayName);
    })
    .slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
}

export async function createCustomer(
  actor: Actor,
  businessId: string,
  input: CustomerCreateInput
): Promise<CustomerDetailResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  requireOwnerOrAdmin(context);
  const identity = normalizeCustomerIdentity(input);
  await assertNoExactActiveDuplicate(context, identity);

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        businessId,
        ...identity,
        createdByMembershipId: context.membership.id,
        updatedByMembershipId: context.membership.id
      }
    });

    await tx.customerActivity.create({
      data: {
        businessId,
        customerId: created.id,
        actorMembershipId: context.membership.id,
        type: CustomerActivityType.CREATED,
        toValue: created.displayName
      }
    });

    return created;
  });

  const aggregates = await loadSingleCustomerAggregates(context, customer.id);
  return {
    customer: toCustomerSummary(customer, aggregates),
    permissions: permissionsFor(context)
  };
}

export async function getCustomer(
  actor: Actor,
  businessId: string,
  customerId: string
): Promise<CustomerDetailResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  const customer = await findVisibleCustomer(context, customerId);
  return {
    customer: toCustomerSummary(
      customer,
      await loadSingleCustomerAggregates(context, customer.id)
    ),
    permissions: permissionsFor(context)
  };
}

export async function updateCustomer(
  actor: Actor,
  businessId: string,
  customerId: string,
  input: CustomerUpdateInput
): Promise<CustomerDetailResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  requireOwnerOrAdmin(context);
  const current = await findVisibleCustomer(context, customerId);

  if (current.status === CustomerStatus.ARCHIVED) {
    throw new AppError(
      "Reactivate this customer before editing their profile.",
      "CUSTOMER_ARCHIVED",
      409
    );
  }

  const identity = normalizeCustomerIdentity(input);
  await assertNoExactActiveDuplicate(context, identity, customerId);
  const expectedUpdatedAt = new Date(input.expectedUpdatedAt);

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.customer.updateMany({
      where: {
        id: customerId,
        businessId,
        updatedAt: expectedUpdatedAt
      },
      data: {
        ...identity,
        updatedByMembershipId: context.membership.id
      }
    });

    if (count === 0) {
      throw new AppError(
        "This customer was already updated. Refresh and try again.",
        "CUSTOMER_STALE_UPDATE",
        409
      );
    }

    await createUpdateActivities(tx, context, current, identity);
    return tx.customer.findUniqueOrThrow({ where: { id: customerId } });
  });

  return {
    customer: toCustomerSummary(
      updated,
      await loadSingleCustomerAggregates(context, updated.id)
    ),
    permissions: permissionsFor(context)
  };
}

export async function archiveCustomer(
  actor: Actor,
  businessId: string,
  customerId: string,
  input: ExpectedUpdatedAtInput
): Promise<CustomerDetailResponse> {
  return updateCustomerStatus(
    actor,
    businessId,
    customerId,
    input,
    CustomerStatus.ARCHIVED
  );
}

export async function reactivateCustomer(
  actor: Actor,
  businessId: string,
  customerId: string,
  input: ExpectedUpdatedAtInput
): Promise<CustomerDetailResponse> {
  return updateCustomerStatus(
    actor,
    businessId,
    customerId,
    input,
    CustomerStatus.ACTIVE
  );
}

async function updateCustomerStatus(
  actor: Actor,
  businessId: string,
  customerId: string,
  input: ExpectedUpdatedAtInput,
  status: CustomerStatus
): Promise<CustomerDetailResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  requireOwnerOrAdmin(context);
  const current = await findVisibleCustomer(context, customerId);
  const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
  const archivedAt = status === CustomerStatus.ARCHIVED ? new Date() : null;

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.customer.updateMany({
      where: {
        id: customerId,
        businessId,
        status: current.status,
        updatedAt: expectedUpdatedAt
      },
      data: {
        status,
        archivedAt,
        updatedByMembershipId: context.membership.id
      }
    });

    if (count === 0) {
      throw new AppError(
        "This customer was already updated. Refresh and try again.",
        "CUSTOMER_STALE_UPDATE",
        409
      );
    }

    await tx.customerActivity.create({
      data: {
        businessId,
        customerId,
        actorMembershipId: context.membership.id,
        type:
          status === CustomerStatus.ARCHIVED
            ? CustomerActivityType.ARCHIVED
            : CustomerActivityType.REACTIVATED,
        fromValue: current.status,
        toValue: status
      }
    });

    return tx.customer.findUniqueOrThrow({ where: { id: customerId } });
  });

  return {
    customer: toCustomerSummary(
      updated,
      await loadSingleCustomerAggregates(context, updated.id)
    ),
    permissions: permissionsFor(context)
  };
}

export async function listCustomerFeedback(
  actor: Actor,
  businessId: string,
  customerId: string,
  query: CustomerFeedbackQueryInput
): Promise<CustomerFeedbackResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  await findVisibleCustomer(context, customerId);
  const scopedQuery = await normalizeCustomerFeedbackQuery(context, query);
  const where = buildCustomerFeedbackWhere(context, businessId, customerId, scopedQuery);

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        assignedTo: {
          include: { user: { select: { firstName: true, lastName: true } } }
        },
        category: true
      },
      orderBy:
        scopedQuery.sort === "oldest"
          ? [{ receivedAt: "asc" }, { id: "asc" }]
          : [{ receivedAt: "desc" }, { id: "desc" }],
      skip: (scopedQuery.page - 1) * scopedQuery.pageSize,
      take: scopedQuery.pageSize
    }),
    prisma.feedback.count({ where })
  ]);

  return {
    items: items.map(toCustomerFeedbackItem),
    pagination: paginationResult(total, scopedQuery.page, scopedQuery.pageSize)
  };
}

async function normalizeCustomerFeedbackQuery(
  context: MembershipContext,
  query: CustomerFeedbackQueryInput
): Promise<CustomerFeedbackQueryInput> {
  const normalized: CustomerFeedbackQueryInput = { ...query };

  if (normalized.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: normalized.branchId, businessId: context.businessId },
      select: { id: true }
    });

    if (!branch || !isBranchIdAllowed(context, normalized.branchId)) {
      delete normalized.branchId;
    }
  }

  if (normalized.categoryId) {
    const category = await prisma.feedbackCategory.findFirst({
      where: { id: normalized.categoryId, businessId: context.businessId },
      select: { id: true }
    });

    if (!category) {
      delete normalized.categoryId;
    }
  }

  if (normalized.assignedTo && normalized.assignedTo !== "unassigned") {
    const membership = await prisma.businessMembership.findFirst({
      where: {
        id: normalized.assignedTo,
        businessId: context.businessId,
        status: BusinessMembershipStatus.ACTIVE
      },
      include: { branchAccess: { select: { branchId: true } } }
    });

    if (!membership || !isMembershipEligibleForActorBranches(context, membership)) {
      delete normalized.assignedTo;
    }
  }

  return normalized;
}

function buildCustomerFeedbackWhere(
  context: MembershipContext,
  businessId: string,
  customerId: string,
  query: CustomerFeedbackQueryInput
): Prisma.FeedbackWhereInput {
  const where: Prisma.FeedbackWhereInput = {
    businessId,
    customerId,
    ...feedbackBranchWhere(context)
  };
  const search = normalizeSearchInput(query.search, 160);

  if (query.branchId && isBranchIdAllowed(context, query.branchId)) {
    where.branchId = query.branchId;
  }
  if (query.channel) where.channel = query.channel;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.assignedTo) {
    where.assignedToMembershipId =
      query.assignedTo === "unassigned" ? null : query.assignedTo;
  }

  const ratingMin = query.ratingMin ?? query.rating;
  const ratingMax = query.ratingMax ?? query.rating;
  if (ratingMin || ratingMax || query.includeUnrated) {
    const range: Prisma.IntNullableFilter = {};
    if (ratingMin) range.gte = ratingMin;
    if (ratingMax) range.lte = ratingMax;
    if (ratingMin || ratingMax) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [{ rating: range }, ...(query.includeUnrated ? [{ rating: null }] : [])]
        }
      ];
    } else {
      where.rating = null;
    }
  }

  if (query.dateFrom || query.dateTo) {
    where.receivedAt = {};
    if (query.dateFrom) where.receivedAt.gte = parseDateBoundary(query.dateFrom, "start");
    if (query.dateTo) where.receivedAt.lte = parseDateBoundary(query.dateTo, "end");
  }

  if (search) {
    where.OR = [
      { title: { contains: search.text } },
      { message: { contains: search.text } },
      { customerName: { contains: search.text } },
      { customerEmail: { contains: search.email ?? search.text.toLowerCase() } },
      { customerPhone: { contains: search.phone ?? search.text } }
    ];
  }

  return where;
}

export async function listCustomerActivity(
  actor: Actor,
  businessId: string,
  customerId: string
): Promise<CustomerActivityResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  requireOwnerOrAdmin(context);
  await findVisibleCustomer(context, customerId);

  const items = await prisma.customerActivity.findMany({
    where: { businessId, customerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    include: {
      actor: {
        include: { user: { select: { firstName: true, lastName: true } } }
      }
    }
  });

  return { items: items.map(toCustomerActivityItem) };
}

export async function getFeedbackCustomerMatches(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  search?: string
): Promise<CustomerMatchGroups> {
  const context = await resolveMembershipContext(actor, businessId);
  const feedback = await findAccessibleFeedback(context, feedbackId);
  const source = search?.trim()
    ? { name: search, email: search, phone: search }
    : {
        name: feedback.customerName,
        email: feedback.customerEmail,
        phone: feedback.customerPhone
      };

  return customerMatchingService.findPossibleMatches({
    businessId,
    ...source,
    customerWhere: customerVisibilityWhere(context)
  });
}

export async function linkFeedbackCustomer(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  input: FeedbackCustomerLinkInput
): Promise<FeedbackCustomerState> {
  const context = await resolveMembershipContext(actor, businessId);
  requireCanLink(context);

  return prisma.$transaction(async (tx) => {
    const feedback = await findAccessibleFeedback(context, feedbackId, tx);

    if (feedback.customerId !== input.expectedCustomerId) {
      throw new AppError(
        "This feedback customer link changed. Refresh and try again.",
        "FEEDBACK_CUSTOMER_LINK_CONFLICT",
        409
      );
    }

    const previousCustomerId = feedback.customerId;
    let nextCustomer: Pick<
      Customer,
      "id" | "displayName" | "email" | "phone" | "status" | "createdAt" | "updatedAt"
    > | null = null;

    if (input.customerId) {
      nextCustomer = await tx.customer.findFirst({
        where: {
          id: input.customerId,
          businessId,
          status: CustomerStatus.ACTIVE,
          ...customerVisibilityWhere(context)
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!nextCustomer) {
        throw new AppError("Customer was not found.", "CUSTOMER_NOT_FOUND", 404);
      }
    }

    const { count } = await tx.feedback.updateMany({
      where: {
        id: feedback.id,
        businessId,
        customerId: previousCustomerId,
        ...feedbackBranchWhere(context)
      },
      data: { customerId: input.customerId }
    });

    if (count === 0) {
      throw new AppError(
        "This feedback customer link changed. Refresh and try again.",
        "FEEDBACK_CUSTOMER_LINK_CONFLICT",
        409
      );
    }

    if (previousCustomerId) {
      await tx.customerActivity.create({
        data: {
          businessId,
          customerId: previousCustomerId,
          actorMembershipId: context.membership.id,
          feedbackId: feedback.id,
          type: CustomerActivityType.FEEDBACK_UNLINKED,
          fromValue: feedback.id
        }
      });
    }

    if (input.customerId) {
      await tx.customerActivity.create({
        data: {
          businessId,
          customerId: input.customerId,
          actorMembershipId: context.membership.id,
          feedbackId: feedback.id,
          type: CustomerActivityType.FEEDBACK_LINKED,
          toValue: feedback.id
        }
      });
    }

    return {
      customer: nextCustomer ? toMatchSummary(nextCustomer) : null,
      permissions: {
        canLinkFeedback: permissionsFor(context).canLinkFeedback,
        canCreateFromFeedback: permissionsFor(context).canCreateFromFeedback
      }
    };
  });
}

export async function createCustomerFromFeedback(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  input: CreateCustomerFromFeedbackInput
): Promise<FeedbackCustomerState> {
  const context = await resolveMembershipContext(actor, businessId);
  if (!permissionsFor(context).canCreateFromFeedback) {
    throw new AppError("Customer creation access denied.", "CUSTOMER_ACCESS_DENIED", 403);
  }

  return prisma.$transaction(async (tx) => {
    const feedback = await findAccessibleFeedback(context, feedbackId, tx);
    if (feedback.customerId !== input.expectedCustomerId) {
      throw new AppError(
        "This feedback customer link changed. Refresh and try again.",
        "FEEDBACK_CUSTOMER_LINK_CONFLICT",
        409
      );
    }

    const identity = normalizeCustomerIdentity({
      displayName: input.displayName ?? feedback.customerName,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? feedback.customerEmail,
      phone: input.phone ?? feedback.customerPhone
    });
    await assertNoExactActiveDuplicate(context, identity, undefined, tx);

    const customer = await tx.customer.create({
      data: {
        businessId,
        ...identity,
        createdByMembershipId: context.membership.id,
        updatedByMembershipId: context.membership.id
      }
    });

    const { count } = await tx.feedback.updateMany({
      where: {
        id: feedback.id,
        businessId,
        customerId: feedback.customerId,
        ...feedbackBranchWhere(context)
      },
      data: { customerId: customer.id }
    });

    if (count === 0) {
      throw new AppError(
        "This feedback customer link changed. Refresh and try again.",
        "FEEDBACK_CUSTOMER_LINK_CONFLICT",
        409
      );
    }

    await tx.customerActivity.createMany({
      data: [
        {
          businessId,
          customerId: customer.id,
          actorMembershipId: context.membership.id,
          type: CustomerActivityType.CREATED,
          toValue: customer.displayName
        },
        {
          businessId,
          customerId: customer.id,
          actorMembershipId: context.membership.id,
          feedbackId: feedback.id,
          type: CustomerActivityType.FEEDBACK_LINKED,
          toValue: feedback.id
        }
      ]
    });

    return {
      customer: toMatchSummary(customer),
      permissions: {
        canLinkFeedback: permissionsFor(context).canLinkFeedback,
        canCreateFromFeedback: permissionsFor(context).canCreateFromFeedback
      }
    };
  });
}

export async function getFeedbackCustomerState(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<FeedbackCustomerState> {
  const context = await resolveMembershipContext(actor, businessId);
  const feedback = await findAccessibleFeedback(context, feedbackId);
  const customer = feedback.customerId
    ? await prisma.customer.findFirst({
        where: { id: feedback.customerId, businessId },
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      })
    : null;

  return {
    customer: customer ? toMatchSummary(customer) : null,
    permissions: {
      canLinkFeedback: permissionsFor(context).canLinkFeedback,
      canCreateFromFeedback: permissionsFor(context).canCreateFromFeedback
    }
  };
}

export async function tryAutoLinkCustomerForFeedback(feedbackId: string): Promise<void> {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: {
        id: true,
        businessId: true,
        customerId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true
      }
    });

    if (!feedback || feedback.customerId) {
      return;
    }

    const match = await customerMatchingService.findAutomaticLink({
      businessId: feedback.businessId,
      name: feedback.customerName,
      email: feedback.customerEmail,
      phone: feedback.customerPhone
    });

    if (!match) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.feedback.updateMany({
        where: { id: feedback.id, customerId: null },
        data: { customerId: match.customerId }
      });

      if (count === 0) {
        return;
      }

      await tx.customerActivity.create({
        data: {
          businessId: feedback.businessId,
          customerId: match.customerId,
          feedbackId: feedback.id,
          actorMembershipId: null,
          type: CustomerActivityType.FEEDBACK_LINKED,
          toValue: feedback.id
        }
      });
    });
  } catch {
    // Customer matching is intentionally non-blocking for feedback ingestion.
  }
}

async function assertNoExactActiveDuplicate(
  context: MembershipContext,
  identity: CustomerIdentityInput,
  ignoredCustomerId?: string,
  client: typeof prisma | Prisma.TransactionClient = prisma
): Promise<void> {
  const matches = await customerMatchingService.findPossibleMatches(
    {
      businessId: context.businessId,
      name: identity.displayName,
      email: identity.email,
      phone: identity.phone,
      customerWhere: customerVisibilityWhere(context)
    },
    client
  );
  const exactMatches = [
    ...matches.exactEmailMatches,
    ...matches.exactPhoneMatches
  ].filter((match) => match.id !== ignoredCustomerId && match.status === "ACTIVE");

  if (exactMatches.length > 0) {
    throw new AppError(
      "A customer with matching contact information already exists.",
      "CUSTOMER_DUPLICATE_MATCH",
      409
    );
  }
}

async function findVisibleCustomer(
  context: MembershipContext,
  customerId: string
): Promise<Customer> {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId: context.businessId,
      ...customerVisibilityWhere(context)
    }
  });

  if (!customer) {
    throw new AppError("Customer was not found.", "CUSTOMER_NOT_FOUND", 404);
  }

  return customer;
}

async function findAccessibleFeedback(
  context: MembershipContext,
  feedbackId: string,
  client: typeof prisma | Prisma.TransactionClient = prisma
): Promise<
  Pick<
    Feedback,
    | "id"
    | "businessId"
    | "branchId"
    | "customerId"
    | "customerName"
    | "customerEmail"
    | "customerPhone"
  >
> {
  const feedback = await client.feedback.findFirst({
    where: {
      id: feedbackId,
      businessId: context.businessId,
      ...feedbackBranchWhere(context)
    },
    select: {
      id: true,
      businessId: true,
      branchId: true,
      customerId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true
    }
  });

  if (!feedback) {
    throw new AppError("Feedback was not found.", "FEEDBACK_NOT_FOUND", 404);
  }

  return feedback;
}

async function loadSingleCustomerAggregates(
  context: MembershipContext,
  customerId: string
): Promise<CustomerAggregates> {
  const map = await loadCustomerAggregates(context, [customerId]);
  return map.get(customerId) ?? emptyAggregates();
}

async function loadCustomerAggregates(
  context: MembershipContext,
  customerIds: string[]
): Promise<Map<string, CustomerAggregates>> {
  const result = new Map<string, CustomerAggregates>();
  customerIds.forEach((id) => result.set(id, emptyAggregates()));
  if (customerIds.length === 0) {
    return result;
  }

  const where = {
    businessId: context.businessId,
    customerId: { in: customerIds },
    ...feedbackBranchWhere(context)
  } satisfies Prisma.FeedbackWhereInput;

  const [overall, branchGroups, channelGroups] = await Promise.all([
    prisma.feedback.groupBy({
      by: ["customerId"],
      where,
      _count: { id: true },
      _avg: { rating: true },
      _max: { receivedAt: true }
    }),
    prisma.feedback.groupBy({
      by: ["customerId", "branchId"],
      where,
      _count: { id: true }
    }),
    prisma.feedback.groupBy({
      by: ["customerId", "channel"],
      where,
      _count: { id: true }
    })
  ]);

  const branchIds = [...new Set(branchGroups.map((group) => group.branchId))];
  const branches = await prisma.branch.findMany({
    where: { id: { in: branchIds }, businessId: context.businessId },
    select: { id: true, name: true }
  });
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

  overall.forEach((item) => {
    if (!item.customerId) return;
    result.set(item.customerId, {
      ...result.get(item.customerId)!,
      feedbackCount: item._count.id,
      averageRating:
        item._avg.rating === null ? null : Math.round(item._avg.rating * 10) / 10,
      latestFeedbackAt: item._max.receivedAt?.toISOString() ?? null
    });
  });

  branchGroups.forEach((item) => {
    if (!item.customerId) return;
    result.get(item.customerId)?.branches.push({
      id: item.branchId,
      name: branchNames.get(item.branchId) ?? "Branch",
      count: item._count.id
    });
  });

  channelGroups.forEach((item) => {
    if (!item.customerId) return;
    result.get(item.customerId)?.channels.push({
      channel: item.channel,
      count: item._count.id
    });
  });

  return result;
}

function emptyAggregates(): CustomerAggregates {
  return {
    feedbackCount: 0,
    averageRating: null,
    latestFeedbackAt: null,
    branches: [],
    channels: []
  };
}

function toCustomerSummary(
  customer: Customer,
  aggregates: CustomerAggregates
): CustomerSummary {
  return {
    id: customer.id,
    displayName: customer.displayName,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    archivedAt: customer.archivedAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    aggregates
  };
}

function createMessagePreview(message: string): string {
  return message.length <= MESSAGE_PREVIEW_LENGTH
    ? message
    : `${message.slice(0, MESSAGE_PREVIEW_LENGTH).trimEnd()}...`;
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
  context: MembershipContext,
  membership: Pick<BusinessMembership, "role" | "allBranchesAccess" | "status"> & {
    branchAccess: Array<{ branchId: string }>;
  }
): boolean {
  if (membership.status !== BusinessMembershipStatus.ACTIVE) return false;
  if (hasFullBusinessAccess(membership) || membership.allBranchesAccess) {
    return true;
  }

  const accessibleBranchIds = getAccessibleBranchIds(context);
  if (!accessibleBranchIds) return true;
  return membership.branchAccess.some((access) =>
    accessibleBranchIds.includes(access.branchId)
  );
}

function toCustomerFeedbackItem(
  feedback: Feedback & {
    branch: { id: string; name: string };
    assignedTo:
      (BusinessMembership & { user: { firstName: string; lastName: string } }) | null;
    category: { id: string; name: string; colorKey: string; isActive: boolean } | null;
  }
): CustomerFeedbackItem {
  return {
    id: feedback.id,
    title: feedback.title,
    messagePreview: createMessagePreview(feedback.message),
    channel: feedback.channel,
    status: feedback.status,
    priority: feedback.priority,
    rating: feedback.rating,
    branch: feedback.branch,
    customerSnapshot: {
      name: feedback.customerName,
      email: feedback.customerEmail,
      phone: feedback.customerPhone
    },
    assignedTo: feedback.assignedTo
      ? {
          membershipId: feedback.assignedTo.id,
          name: `${feedback.assignedTo.user.firstName} ${feedback.assignedTo.user.lastName}`.trim(),
          role: feedback.assignedTo.role
        }
      : null,
    category: feedback.category,
    receivedAt: feedback.receivedAt.toISOString()
  };
}

function toCustomerActivityItem(activity: {
  id: string;
  type: CustomerActivityType;
  feedbackId: string | null;
  fieldName: string | null;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  actor: (BusinessMembership & { user: { firstName: string; lastName: string } }) | null;
}): CustomerActivityItem {
  return {
    id: activity.id,
    type: activity.type,
    actor: activity.actor
      ? {
          membershipId: activity.actor.id,
          name: `${activity.actor.user.firstName} ${activity.actor.user.lastName}`.trim(),
          role: activity.actor.role
        }
      : null,
    feedbackId: activity.feedbackId,
    fieldName: activity.fieldName,
    fromValue: activity.fromValue,
    toValue: activity.toValue,
    createdAt: activity.createdAt.toISOString()
  };
}

async function createUpdateActivities(
  tx: Prisma.TransactionClient,
  context: MembershipContext,
  current: Customer,
  next: ReturnType<typeof normalizeCustomerIdentity>
): Promise<void> {
  const fields: Array<
    keyof Pick<Customer, "displayName" | "firstName" | "lastName" | "email" | "phone">
  > = ["displayName", "firstName", "lastName", "email", "phone"];
  const data = fields
    .filter((field) => current[field] !== next[field])
    .map((field) => ({
      businessId: context.businessId,
      customerId: current.id,
      actorMembershipId: context.membership.id,
      type: CustomerActivityType.UPDATED,
      fieldName: field,
      fromValue: current[field],
      toValue: next[field]
    }));

  if (data.length > 0) {
    await tx.customerActivity.createMany({ data });
  }
}
