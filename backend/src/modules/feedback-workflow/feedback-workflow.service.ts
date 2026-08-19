import type {
  Prisma,
  FeedbackStatus,
  FeedbackPriority,
  BusinessMembership
} from "@prisma/client";
import {
  BusinessMembershipStatus,
  BusinessMemberRole
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { CHANNEL_LABELS } from "../feedback-inbox/feedback-inbox.types.js";
import type {
  StatusUpdateRequest,
  ActivityItem,
  ActivityListResponse,
  StatusUpdateResponse,
  ActorInfo,
  AssignmentRequest,
  AssignmentResponse,
  CategoryUpdateRequest,
  CategoryUpdateResponse,
  PriorityUpdateRequest,
  PriorityUpdateResponse,
  EligibleAssignee
} from "./feedback-workflow.types.js";
import {
  isValidTransition,
  isSameStatus,
  getAvailableTransitions
} from "./feedback-workflow.types.js";
import { FEEDBACK_WORKFLOW_ERRORS } from "./feedback-workflow.errors.js";

type Actor = {
  userId: string;
};

type MembershipContext = {
  businessId: string;
  membership: BusinessMembership & {
    branchAccess: { branchId: string }[];
    business: { status: string };
    user: { firstName: string; lastName: string };
  };
};

async function resolveMembershipContext(
  actor: Actor,
  businessId: string
): Promise<MembershipContext> {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: { businessId, userId: actor.userId }
    },
    include: {
      branchAccess: { select: { branchId: true } },
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

  if (membership.business.status !== "ACTIVE") {
    throw new AppError("This business is not active.", "BUSINESS_NOT_ACTIVE", 403);
  }

  return { businessId, membership: membership as MembershipContext["membership"] };
}

function getAccessibleBranchIds(
  membership: MembershipContext["membership"]
): string[] | null {
  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  ) {
    return null; // null means all branches
  }

  return membership.branchAccess.map((access) => access.branchId);
}

async function resolveFeedbackAccess(
  context: MembershipContext,
  feedbackId: string
): Promise<{
  id: string;
  businessId: string;
  branchId: string;
  status: FeedbackStatus;
  channel: string;
  sourceMetadata: Prisma.JsonValue | null;
  createdAt: Date;
  assignedToMembershipId: string | null;
  categoryId: string | null;
  priority: FeedbackPriority;
}> {
  const accessibleBranchIds = getAccessibleBranchIds(context.membership);
  const feedback = await prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      businessId: context.businessId,
      ...(accessibleBranchIds ? { branchId: { in: accessibleBranchIds } } : {})
    },
    select: {
      id: true,
      businessId: true,
      branchId: true,
      status: true,
      channel: true,
      sourceMetadata: true,
      createdAt: true,
      assignedToMembershipId: true,
      categoryId: true,
      priority: true
    }
  });

  if (!feedback) {
    throw new AppError("Feedback not found.", "FEEDBACK_NOT_FOUND", 404);
  }

  return feedback;
}

function getActorInfo(membership: MembershipContext["membership"]): ActorInfo {
  return {
    membershipId: membership.id,
    name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
    role: membership.role
  };
}

function hasAllBranchAccess(membership: {
  role: BusinessMemberRole;
  allBranchesAccess: boolean;
}): boolean {
  return (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  );
}

function memberCanAccessBranch(
  membership: { role: BusinessMemberRole; allBranchesAccess: boolean },
  branchAccess: { branchId: string }[],
  branchId: string
): boolean {
  return (
    hasAllBranchAccess(membership) ||
    branchAccess.some((access) => access.branchId === branchId)
  );
}

// ─── Status Update (existing) ───────────────────────────

export async function updateStatus(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  request: StatusUpdateRequest
): Promise<StatusUpdateResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  const newStatus = request.status;

  return await prisma.$transaction(async (tx) => {
    const branchIds = getAccessibleBranchIds(context.membership);
    const feedback = await tx.feedback.findFirst({
      where: {
        id: feedbackId,
        businessId: context.businessId,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      select: { id: true, status: true }
    });

    if (!feedback) {
      throw new AppError("Feedback not found.", "FEEDBACK_NOT_FOUND", 404);
    }

    const currentStatus = feedback.status;

    if (isSameStatus(currentStatus, newStatus)) {
      throw new AppError(
        `Feedback is already ${currentStatus}.`,
        FEEDBACK_WORKFLOW_ERRORS.TRANSITION_INVALID,
        400
      );
    }

    if (!isValidTransition(currentStatus, newStatus)) {
      throw new AppError(
        `Cannot change status from ${currentStatus} to ${newStatus}.`,
        FEEDBACK_WORKFLOW_ERRORS.TRANSITION_INVALID,
        400
      );
    }

    const { count } = await tx.feedback.updateMany({
      where: {
        id: feedback.id,
        businessId: context.businessId,
        status: currentStatus,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      data: { status: newStatus }
    });

    if (count === 0) {
      throw new AppError(
        "This feedback was already updated by another member. Please refresh and try again.",
        "FEEDBACK_STATUS_CONFLICT",
        409
      );
    }

    const updatedFeedback = await tx.feedback.findUniqueOrThrow({
      where: { id: feedback.id },
      select: { id: true, status: true, updatedAt: true }
    });

    const activity = await tx.feedbackActivity.create({
      data: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        actorMembershipId: context.membership.id,
        type: "STATUS_CHANGED",
        fromStatus: currentStatus,
        toStatus: newStatus
      },
      select: {
        id: true,
        type: true,
        fromStatus: true,
        toStatus: true,
        fromValue: true,
        toValue: true,
        createdAt: true
      }
    });

    await tx.feedbackFieldState.upsert({
      where: { feedbackId_field: { feedbackId: feedback.id, field: "STATUS" } },
      create: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        field: "STATUS",
        source: "HUMAN",
        updatedByMembershipId: context.membership.id
      },
      update: {
        source: "HUMAN",
        sourceRuleId: null,
        updatedByMembershipId: context.membership.id
      }
    });

    return {
      feedback: {
        id: updatedFeedback.id,
        status: updatedFeedback.status as FeedbackStatus,
        updatedAt: updatedFeedback.updatedAt.toISOString()
      },
      activity: {
        id: activity.id,
        type: activity.type,
        fromStatus: activity.fromStatus,
        toStatus: activity.toStatus,
        fromValue: activity.fromValue,
        toValue: activity.toValue,
        note: null,
        actor: getActorInfo(context.membership),
        createdAt: activity.createdAt.toISOString(),
        isSynthetic: false
      }
    };
  });
}

// ─── Note (existing) ────────────────────────────────────

export async function addNote(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  noteText: string
): Promise<{ activity: ActivityItem }> {
  const context = await resolveMembershipContext(actor, businessId);
  const feedback = await resolveFeedbackAccess(context, feedbackId);

  const activity = await prisma.feedbackActivity.create({
    data: {
      businessId: context.businessId,
      feedbackId: feedback.id,
      actorMembershipId: context.membership.id,
      type: "NOTE_ADDED",
      note: noteText
    },
    select: {
      id: true,
      type: true,
      fromStatus: true,
      toStatus: true,
      fromValue: true,
      toValue: true,
      note: true,
      createdAt: true
    }
  });

  return {
    activity: {
      id: activity.id,
      type: activity.type,
      fromStatus: activity.fromStatus,
      toStatus: activity.toStatus,
      fromValue: activity.fromValue,
      toValue: activity.toValue,
      note: activity.note,
      actor: getActorInfo(context.membership),
      createdAt: activity.createdAt.toISOString(),
      isSynthetic: false
    }
  };
}

// ─── Activity (existing, extended for Phase 10) ─────────

export async function getActivity(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<ActivityListResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  const feedback = await resolveFeedbackAccess(context, feedbackId);

  const storedActivities = await prisma.feedbackActivity.findMany({
    where: { feedbackId: feedback.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: {
        select: {
          id: true,
          role: true,
          user: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  const channel = feedback.channel;
  const channelLabel = CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS] ?? channel;
  const syntheticReceived: ActivityItem = {
    id: `received-${feedback.id}`,
    type: "FEEDBACK_RECEIVED",
    fromStatus: null,
    toStatus: null,
    fromValue: null,
    toValue: null,
    note: null,
    channel,
    sourceLabel: channelLabel,
    actor: null,
    actorType: "SYSTEM",
    automationRuleName: null,
    createdAt: feedback.createdAt.toISOString(),
    isSynthetic: true
  };

  const items: ActivityItem[] = [
    syntheticReceived,
    ...storedActivities.map((act) => ({
      id: act.id,
      type: act.type as ActivityItem["type"],
      fromStatus: act.fromStatus,
      toStatus: act.toStatus,
      fromValue: act.fromValue,
      toValue: act.toValue,
      note: act.note,
      actor: act.actor
        ? {
            membershipId: act.actor.id,
            name: `${act.actor.user.firstName} ${act.actor.user.lastName}`.trim(),
            role: act.actor.role
          }
        : null,
      actorType: act.actorType,
      automationRuleName: act.automationRuleName,
      createdAt: act.createdAt.toISOString(),
      isSynthetic: false
    }))
  ];

  return { items };
}

// ─── Workflow Status (existing) ─────────────────────────

export async function getFeedbackWithAvailableTransitions(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<{
  status: FeedbackStatus;
  availableTransitions: FeedbackStatus[];
}> {
  const context = await resolveMembershipContext(actor, businessId);
  const feedback = await resolveFeedbackAccess(context, feedbackId);

  return {
    status: feedback.status,
    availableTransitions: getAvailableTransitions(feedback.status)
  };
}

// ─── Assignment (Phase 10) ──────────────────────────────

export async function updateAssignment(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  request: AssignmentRequest
): Promise<AssignmentResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  const actorRole = context.membership.role;
  const actorMembershipId = context.membership.id;

  return await prisma.$transaction(async (tx) => {
    const branchIds = getAccessibleBranchIds(context.membership);
    const feedback = await tx.feedback.findFirst({
      where: {
        id: feedbackId,
        businessId: context.businessId,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      select: { id: true, branchId: true, assignedToMembershipId: true }
    });

    if (!feedback) {
      throw new AppError("Feedback not found.", "FEEDBACK_NOT_FOUND", 404);
    }

    const currentAssignment = feedback.assignedToMembershipId;
    const newAssignment = request.membershipId;

    // Same assignment → reject
    if (currentAssignment === newAssignment) {
      throw new AppError(
        "This feedback is already assigned to this member.",
        FEEDBACK_WORKFLOW_ERRORS.ASSIGNMENT_INVALID,
        400
      );
    }

    // Staff: self-assign only when unassigned, cannot reassign/unassign others
    if (actorRole === BusinessMemberRole.STAFF) {
      if (currentAssignment !== null && currentAssignment !== actorMembershipId) {
        throw new AppError(
          "Staff can only self-assign unassigned feedback.",
          FEEDBACK_WORKFLOW_ERRORS.ASSIGNMENT_FORBIDDEN,
          403
        );
      }
      if (newAssignment !== null && newAssignment !== actorMembershipId) {
        throw new AppError(
          "Staff can only assign feedback to themselves.",
          FEEDBACK_WORKFLOW_ERRORS.ASSIGNMENT_FORBIDDEN,
          403
        );
      }
      // Staff unassign: only if assigned to self
      if (newAssignment === null && currentAssignment !== actorMembershipId) {
        throw new AppError(
          "Staff can only unassign themselves.",
          FEEDBACK_WORKFLOW_ERRORS.ASSIGNMENT_FORBIDDEN,
          403
        );
      }
    }

    // Validate target membership if assigning
    let targetName = "Unassigned";
    let targetRole = "";
    let isAvailable = true;

    if (newAssignment !== null) {
      const targetMembership = await tx.businessMembership.findUnique({
        where: { id: newAssignment },
        include: {
          user: { select: { firstName: true, lastName: true } },
          branchAccess: { select: { branchId: true } }
        }
      });

      if (!targetMembership) {
        throw new AppError(
          "Assigned member was not found.",
          FEEDBACK_WORKFLOW_ERRORS.ASSIGNEE_NOT_FOUND,
          404
        );
      }

      if (targetMembership.businessId !== context.businessId) {
        throw new AppError(
          "Cannot assign feedback across businesses.",
          FEEDBACK_WORKFLOW_ERRORS.ASSIGNMENT_INVALID,
          400
        );
      }

      if (targetMembership.status !== BusinessMembershipStatus.ACTIVE) {
        throw new AppError(
          "Cannot assign feedback to an inactive member.",
          FEEDBACK_WORKFLOW_ERRORS.ASSIGNEE_INACTIVE,
          400
        );
      }

      // Check branch access
      if (
        !memberCanAccessBranch(
          targetMembership,
          targetMembership.branchAccess,
          feedback.branchId
        )
      ) {
        throw new AppError(
          "Assigned member does not have access to this feedback branch.",
          FEEDBACK_WORKFLOW_ERRORS.ASSIGNEE_BRANCH_FORBIDDEN,
          400
        );
      }

      targetName =
        `${targetMembership.user.firstName} ${targetMembership.user.lastName}`.trim();
      targetRole = targetMembership.role;
      isAvailable = true;
    }

    // Atomic conditional update
    const { count } = await tx.feedback.updateMany({
      where: {
        id: feedback.id,
        businessId: context.businessId,
        assignedToMembershipId: currentAssignment,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      data: { assignedToMembershipId: newAssignment }
    });

    if (count === 0) {
      throw new AppError(
        "This feedback assignment was already changed by another member. Please refresh and try again.",
        FEEDBACK_WORKFLOW_ERRORS.ASSIGNMENT_CONFLICT,
        409
      );
    }

    const previousName = currentAssignment
      ? await tx.businessMembership.findUnique({
          where: { id: currentAssignment },
          include: { user: { select: { firstName: true, lastName: true } } }
        })
      : null;

    const previousNameStr = previousName
      ? `${previousName.user.firstName} ${previousName.user.lastName}`.trim()
      : "Unassigned";

    const activity = await tx.feedbackActivity.create({
      data: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        actorMembershipId: context.membership.id,
        type: "ASSIGNMENT_CHANGED",
        fromValue: previousNameStr,
        toValue: targetName
      },
      select: {
        id: true,
        type: true,
        fromStatus: true,
        toStatus: true,
        fromValue: true,
        toValue: true,
        createdAt: true
      }
    });

    await tx.feedbackFieldState.upsert({
      where: { feedbackId_field: { feedbackId: feedback.id, field: "ASSIGNMENT" } },
      create: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        field: "ASSIGNMENT",
        source: "HUMAN",
        updatedByMembershipId: context.membership.id
      },
      update: {
        source: "HUMAN",
        sourceRuleId: null,
        updatedByMembershipId: context.membership.id
      }
    });

    const updatedFeedback = await tx.feedback.findUniqueOrThrow({
      where: { id: feedback.id },
      select: {
        id: true,
        assignedToMembershipId: true,
        updatedAt: true
      }
    });

    return {
      feedback: {
        id: updatedFeedback.id,
        assignedTo: newAssignment
          ? {
              membershipId: newAssignment,
              name: targetName,
              role: targetRole,
              isAvailable
            }
          : null,
        updatedAt: updatedFeedback.updatedAt.toISOString()
      },
      activity: {
        id: activity.id,
        type: activity.type,
        fromStatus: activity.fromStatus,
        toStatus: activity.toStatus,
        fromValue: activity.fromValue,
        toValue: activity.toValue,
        note: null,
        actor: getActorInfo(context.membership),
        createdAt: activity.createdAt.toISOString(),
        isSynthetic: false
      }
    };
  });
}

// ─── Feedback Category (Phase 10) ───────────────────────

export async function updateFeedbackCategory(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  request: CategoryUpdateRequest
): Promise<CategoryUpdateResponse> {
  const context = await resolveMembershipContext(actor, businessId);

  return await prisma.$transaction(async (tx) => {
    const branchIds = getAccessibleBranchIds(context.membership);
    const feedback = await tx.feedback.findFirst({
      where: {
        id: feedbackId,
        businessId: context.businessId,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      select: { id: true, categoryId: true }
    });

    if (!feedback) {
      throw new AppError("Feedback not found.", "FEEDBACK_NOT_FOUND", 404);
    }

    const currentCategoryId = feedback.categoryId;
    const newCategoryId = request.categoryId;

    // Same category → reject
    if (currentCategoryId === newCategoryId) {
      throw new AppError(
        "This feedback already has this category.",
        FEEDBACK_WORKFLOW_ERRORS.CATEGORY_INVALID,
        400
      );
    }

    // Validate category if setting one
    let categoryName = "No category";
    let categoryColorKey = "slate";
    let categoryIsActive = false;

    if (newCategoryId !== null) {
      const category = await tx.feedbackCategory.findFirst({
        where: { id: newCategoryId, businessId }
      });

      if (!category) {
        throw new AppError(
          "Category not found.",
          FEEDBACK_WORKFLOW_ERRORS.CATEGORY_NOT_FOUND,
          404
        );
      }

      if (!category.isActive) {
        throw new AppError(
          "Cannot assign an inactive category.",
          FEEDBACK_WORKFLOW_ERRORS.CATEGORY_INACTIVE,
          400
        );
      }

      categoryName = category.name;
      categoryColorKey = category.colorKey;
      categoryIsActive = category.isActive;
    }

    // Get previous category name
    const previousName = currentCategoryId
      ? ((
          await tx.feedbackCategory.findUnique({
            where: { id: currentCategoryId },
            select: { name: true }
          })
        )?.name ?? "No category")
      : "No category";

    // Atomic conditional update
    const { count } = await tx.feedback.updateMany({
      where: {
        id: feedback.id,
        businessId: context.businessId,
        categoryId: currentCategoryId,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      data: { categoryId: newCategoryId }
    });

    if (count === 0) {
      throw new AppError(
        "This feedback category was already changed by another member. Please refresh and try again.",
        FEEDBACK_WORKFLOW_ERRORS.CATEGORY_CONFLICT,
        409
      );
    }

    const activity = await tx.feedbackActivity.create({
      data: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        actorMembershipId: context.membership.id,
        type: "CATEGORY_CHANGED",
        fromValue: previousName,
        toValue: categoryName
      },
      select: {
        id: true,
        type: true,
        fromStatus: true,
        toStatus: true,
        fromValue: true,
        toValue: true,
        createdAt: true
      }
    });

    await tx.feedbackFieldState.upsert({
      where: { feedbackId_field: { feedbackId: feedback.id, field: "CATEGORY" } },
      create: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        field: "CATEGORY",
        source: "HUMAN",
        updatedByMembershipId: context.membership.id
      },
      update: {
        source: "HUMAN",
        sourceRuleId: null,
        updatedByMembershipId: context.membership.id
      }
    });

    const updatedFeedback = await tx.feedback.findUniqueOrThrow({
      where: { id: feedback.id },
      select: { id: true, categoryId: true, updatedAt: true }
    });

    return {
      feedback: {
        id: updatedFeedback.id,
        categoryId: updatedFeedback.categoryId,
        category: newCategoryId
          ? {
              id: newCategoryId,
              name: categoryName,
              colorKey: categoryColorKey,
              isActive: categoryIsActive
            }
          : null,
        updatedAt: updatedFeedback.updatedAt.toISOString()
      },
      activity: {
        id: activity.id,
        type: activity.type,
        fromStatus: activity.fromStatus,
        toStatus: activity.toStatus,
        fromValue: activity.fromValue,
        toValue: activity.toValue,
        note: null,
        actor: getActorInfo(context.membership),
        createdAt: activity.createdAt.toISOString(),
        isSynthetic: false
      }
    };
  });
}

// ─── Priority (Phase 10) ────────────────────────────────

export async function updateFeedbackPriority(
  actor: Actor,
  businessId: string,
  feedbackId: string,
  request: PriorityUpdateRequest
): Promise<PriorityUpdateResponse> {
  const context = await resolveMembershipContext(actor, businessId);

  return await prisma.$transaction(async (tx) => {
    const branchIds = getAccessibleBranchIds(context.membership);
    const feedback = await tx.feedback.findFirst({
      where: {
        id: feedbackId,
        businessId: context.businessId,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      select: { id: true, priority: true }
    });

    if (!feedback) {
      throw new AppError("Feedback not found.", "FEEDBACK_NOT_FOUND", 404);
    }

    const currentPriority = feedback.priority;
    const newPriority = request.priority;

    if (currentPriority === newPriority) {
      throw new AppError(
        `Priority is already ${newPriority}.`,
        FEEDBACK_WORKFLOW_ERRORS.PRIORITY_INVALID,
        400
      );
    }

    const { count } = await tx.feedback.updateMany({
      where: {
        id: feedback.id,
        businessId: context.businessId,
        priority: currentPriority,
        ...(branchIds ? { branchId: { in: branchIds } } : {})
      },
      data: { priority: newPriority }
    });

    if (count === 0) {
      throw new AppError(
        "This feedback priority was already changed by another member. Please refresh and try again.",
        FEEDBACK_WORKFLOW_ERRORS.PRIORITY_CONFLICT,
        409
      );
    }

    const activity = await tx.feedbackActivity.create({
      data: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        actorMembershipId: context.membership.id,
        type: "PRIORITY_CHANGED",
        fromValue: currentPriority,
        toValue: newPriority
      },
      select: {
        id: true,
        type: true,
        fromStatus: true,
        toStatus: true,
        fromValue: true,
        toValue: true,
        createdAt: true
      }
    });

    await tx.feedbackFieldState.upsert({
      where: { feedbackId_field: { feedbackId: feedback.id, field: "PRIORITY" } },
      create: {
        businessId: context.businessId,
        feedbackId: feedback.id,
        field: "PRIORITY",
        source: "HUMAN",
        updatedByMembershipId: context.membership.id
      },
      update: {
        source: "HUMAN",
        sourceRuleId: null,
        updatedByMembershipId: context.membership.id
      }
    });

    const updatedFeedback = await tx.feedback.findUniqueOrThrow({
      where: { id: feedback.id },
      select: { id: true, priority: true, updatedAt: true }
    });

    return {
      feedback: {
        id: updatedFeedback.id,
        priority: updatedFeedback.priority,
        updatedAt: updatedFeedback.updatedAt.toISOString()
      },
      activity: {
        id: activity.id,
        type: activity.type,
        fromStatus: activity.fromStatus,
        toStatus: activity.toStatus,
        fromValue: activity.fromValue,
        toValue: activity.toValue,
        note: null,
        actor: getActorInfo(context.membership),
        createdAt: activity.createdAt.toISOString(),
        isSynthetic: false
      }
    };
  });
}

// ─── Eligible Assignees (Phase 10) ──────────────────────

export async function getEligibleAssignees(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<EligibleAssignee[]> {
  const context = await resolveMembershipContext(actor, businessId);
  const feedback = await resolveFeedbackAccess(context, feedbackId);

  const memberships = await prisma.businessMembership.findMany({
    where: {
      businessId,
      status: BusinessMembershipStatus.ACTIVE
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      branchAccess: { select: { branchId: true } }
    }
  });

  const result: EligibleAssignee[] = [];

  for (const membership of memberships) {
    const hasBranchAccess = memberCanAccessBranch(
      membership,
      membership.branchAccess,
      feedback.branchId
    );

    if (!hasBranchAccess) {
      continue;
    }

    const name = `${membership.user.firstName} ${membership.user.lastName}`.trim();

    result.push({
      membershipId: membership.id,
      name,
      role: membership.role,
      isAvailable: true
    });
  }

  if (context.membership.role === BusinessMemberRole.STAFF) {
    if (feedback.assignedToMembershipId !== null) {
      return [];
    }

    return result.filter((item) => item.membershipId === context.membership.id);
  }

  return result.sort((a, b) => {
    const roleOrder = [
      BusinessMemberRole.OWNER,
      BusinessMemberRole.ADMIN,
      BusinessMemberRole.MANAGER,
      BusinessMemberRole.STAFF
    ];
    return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
  });
}
