import {
  BusinessMemberRole,
  BusinessMembershipStatus
} from "../../lib/prisma-runtime.js";
import type { BusinessMembership } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { FEEDBACK_CATEGORY_ERRORS } from "./feedback-categories.errors.js";
import type {
  FeedbackCategoryResponse,
  FeedbackCategoryCreateInput,
  FeedbackCategoryUpdateInput,
  FeedbackCategoryActivationInput
} from "./feedback-categories.types.js";

type Actor = { userId: string };

type MembershipContext = {
  businessId: string;
  membership: BusinessMembership & {
    business: { status: string };
  };
};

async function resolveMembershipContext(
  actor: Actor,
  businessId: string
): Promise<MembershipContext> {
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId: actor.userId } },
    include: { business: { select: { status: true } } }
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
  if (membership.business.status !== "ACTIVE") {
    throw new AppError("This business is not active.", "BUSINESS_NOT_ACTIVE", 403);
  }

  return { businessId, membership: membership as MembershipContext["membership"] };
}

function requireOwnerOrAdmin(membership: MembershipContext["membership"]): void {
  if (
    membership.role !== BusinessMemberRole.OWNER &&
    membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Only owners and admins can manage categories.",
      "BUSINESS_ROLE_REQUIRED",
      403
    );
  }
}

function canManageCategories(membership: MembershipContext["membership"]): boolean {
  return (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN
  );
}

function toCategoryResponse(item: {
  id: string;
  name: string;
  description: string | null;
  colorKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { feedback: number };
}): FeedbackCategoryResponse {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    colorKey: item.colorKey,
    isActive: item.isActive,
    feedbackCount: item._count?.feedback,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export async function listCategories(
  actor: Actor,
  businessId: string,
  includeInactive: boolean
): Promise<FeedbackCategoryResponse[]> {
  const context = await resolveMembershipContext(actor, businessId);
  const canSeeInactive = includeInactive && canManageCategories(context.membership);
  const categories = await prisma.feedbackCategory.findMany({
    where: { businessId, ...(canSeeInactive ? {} : { isActive: true }) },
    orderBy: { name: "asc" },
    include: { _count: { select: { feedback: true } } }
  });

  return categories.map(toCategoryResponse);
}

export async function getCategory(
  actor: Actor,
  businessId: string,
  categoryId: string
): Promise<FeedbackCategoryResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  const category = await prisma.feedbackCategory.findFirst({
    where: {
      id: categoryId,
      businessId,
      ...(canManageCategories(context.membership) ? {} : { isActive: true })
    },
    include: { _count: { select: { feedback: true } } }
  });

  if (!category) {
    throw new AppError("Category not found.", FEEDBACK_CATEGORY_ERRORS.NOT_FOUND, 404);
  }

  return toCategoryResponse(category);
}

export async function createCategory(
  actor: Actor,
  businessId: string,
  input: FeedbackCategoryCreateInput
): Promise<FeedbackCategoryResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  requireOwnerOrAdmin(context.membership);

  const existing = await prisma.feedbackCategory.findUnique({
    where: { businessId_name: { businessId, name: input.name } }
  });

  if (existing) {
    throw new AppError(
      "A category with this name already exists.",
      FEEDBACK_CATEGORY_ERRORS.NAME_CONFLICT,
      409
    );
  }

  const category = await prisma.feedbackCategory.create({
    data: {
      businessId,
      name: input.name,
      description: input.description ?? null,
      colorKey: input.colorKey ?? "indigo"
    },
    include: { _count: { select: { feedback: true } } }
  });

  return toCategoryResponse(category);
}

export async function updateCategory(
  actor: Actor,
  businessId: string,
  categoryId: string,
  input: FeedbackCategoryUpdateInput
): Promise<FeedbackCategoryResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  requireOwnerOrAdmin(context.membership);

  const category = await prisma.feedbackCategory.findFirst({
    where: { id: categoryId, businessId }
  });

  if (!category) {
    throw new AppError("Category not found.", FEEDBACK_CATEGORY_ERRORS.NOT_FOUND, 404);
  }

  // Check name uniqueness if name is being changed
  if (input.name && input.name !== category.name) {
    const existing = await prisma.feedbackCategory.findUnique({
      where: { businessId_name: { businessId, name: input.name } }
    });

    if (existing) {
      throw new AppError(
        "A category with this name already exists.",
        FEEDBACK_CATEGORY_ERRORS.NAME_CONFLICT,
        409
      );
    }
  }

  const updated = await prisma.feedbackCategory.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description ?? null }
        : {}),
      ...(input.colorKey !== undefined ? { colorKey: input.colorKey } : {})
    },
    include: { _count: { select: { feedback: true } } }
  });

  return toCategoryResponse(updated);
}

export async function updateCategoryActivation(
  actor: Actor,
  businessId: string,
  categoryId: string,
  input: FeedbackCategoryActivationInput
): Promise<FeedbackCategoryResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  requireOwnerOrAdmin(context.membership);

  const category = await prisma.feedbackCategory.findFirst({
    where: { id: categoryId, businessId }
  });

  if (!category) {
    throw new AppError("Category not found.", FEEDBACK_CATEGORY_ERRORS.NOT_FOUND, 404);
  }

  const updated = await prisma.feedbackCategory.update({
    where: { id: categoryId },
    data: { isActive: input.isActive },
    include: { _count: { select: { feedback: true } } }
  });

  return toCategoryResponse(updated);
}
