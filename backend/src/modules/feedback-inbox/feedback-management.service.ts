import type { FeedbackStatus, Prisma } from "@prisma/client";
import {
  BusinessMemberRole,
  FeedbackActivityType,
  FeedbackFieldStateField,
  FeedbackFieldStateSource
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { isValidTransition } from "../feedback-workflow/feedback-workflow.types.js";
import { tryAutoLinkCustomerForFeedback } from "../customers/customer.service.js";
import type {
  BulkCategoryInput,
  BulkDeleteInput,
  BulkStatusInput,
  FeedbackEditInput,
  FeedbackSelectionInput
} from "./feedback-management.schemas.js";
import {
  buildFeedbackWhereClause,
  normalizeFeedbackScopedFilters,
  resolveFeedbackMembershipContext,
  type FeedbackActor,
  type FeedbackMembershipContext
} from "./feedback-inbox.service.js";

function requireFeedbackManager(context: FeedbackMembershipContext) {
  if (
    context.membership.role !== BusinessMemberRole.OWNER &&
    context.membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Only Business Owners and administrators can manage feedback content.",
      "FEEDBACK_MANAGEMENT_FORBIDDEN",
      403
    );
  }
}

async function selectionWhere(
  context: FeedbackMembershipContext,
  selection: FeedbackSelectionInput
): Promise<Prisma.FeedbackWhereInput> {
  if (selection.allMatching) {
    const filters = await normalizeFeedbackScopedFilters(context, {
      page: 1,
      pageSize: 50,
      sort: "newest",
      ...selection.filters
    });
    const where = buildFeedbackWhereClause(context, filters);
    const excludedIds = [...new Set(selection.excludedFeedbackIds ?? [])];
    return excludedIds.length ? { AND: [where, { id: { notIn: excludedIds } }] } : where;
  }

  return {
    businessId: context.businessId,
    deletedAt: null,
    id: { in: [...new Set(selection.feedbackIds ?? [])] }
  };
}

async function validateCategory(
  tx: Prisma.TransactionClient,
  businessId: string,
  categoryId: string | null
) {
  if (!categoryId) return null;
  const category = await tx.feedbackCategory.findFirst({
    where: { id: categoryId, businessId, isActive: true },
    select: { id: true, name: true }
  });
  if (!category) {
    throw new AppError(
      "An active category from this business is required.",
      "FEEDBACK_CATEGORY_INVALID",
      400
    );
  }
  return category;
}

async function writeHumanFieldState(
  tx: Prisma.TransactionClient,
  feedbackId: string,
  businessId: string,
  membershipId: string,
  field: FeedbackFieldStateField
) {
  await tx.feedbackFieldState.upsert({
    where: { feedbackId_field: { feedbackId, field } },
    create: {
      feedbackId,
      businessId,
      field,
      source: FeedbackFieldStateSource.HUMAN,
      updatedByMembershipId: membershipId
    },
    update: {
      source: FeedbackFieldStateSource.HUMAN,
      sourceRuleId: null,
      updatedByMembershipId: membershipId
    }
  });
}

export async function editFeedback(
  actor: FeedbackActor,
  businessId: string,
  feedbackId: string,
  input: FeedbackEditInput
) {
  const context = await resolveFeedbackMembershipContext(actor, businessId);
  requireFeedbackManager(context);

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.feedback.findFirst({
      where: { id: feedbackId, businessId, deletedAt: null }
    });
    if (!current) throw new AppError("Feedback not found.", "FEEDBACK_NOT_FOUND", 404);

    if (input.branchId) {
      const branch = await tx.branch.findFirst({
        where: { id: input.branchId, businessId },
        select: { id: true }
      });
      if (!branch) {
        throw new AppError("Branch not found.", "BRANCH_NOT_FOUND", 404);
      }
    }
    const category = await validateCategory(tx, businessId, input.categoryId ?? null);
    if (
      input.status &&
      input.status !== current.status &&
      !isValidTransition(current.status, input.status)
    ) {
      throw new AppError(
        `Cannot change status from ${current.status} to ${input.status}.`,
        "FEEDBACK_STATUS_TRANSITION_INVALID",
        400
      );
    }

    const changedFields: string[] = [];
    const editable = [
      "title",
      "message",
      "customerName",
      "customerEmail",
      "customerPhone",
      "branchId",
      "categoryId",
      "status",
      "priority"
    ] as const;
    for (const field of editable) {
      if (input[field] !== undefined && input[field] !== current[field]) {
        changedFields.push(field);
      }
    }
    if (!changedFields.length) return { feedbackId, changedFields: [] };

    const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
    const data: Prisma.FeedbackUncheckedUpdateManyInput = {};
    for (const field of editable) {
      if (input[field] !== undefined) Object.assign(data, { [field]: input[field] });
    }
    if (input.branchId && input.branchId !== current.branchId) {
      data.assignedToMembershipId = null;
    }
    if (
      changedFields.some((field) =>
        ["customerName", "customerEmail", "customerPhone"].includes(field)
      )
    ) {
      // A stale explicit customer link could expose the edited feedback to the wrong
      // customer account. Clear it and let the established exact-match linker reconcile it.
      data.customerId = null;
    }
    const updated = await tx.feedback.updateMany({
      where: {
        id: feedbackId,
        businessId,
        deletedAt: null,
        updatedAt: expectedUpdatedAt
      },
      data
    });
    if (!updated.count) {
      throw new AppError(
        "This feedback changed since it was opened. Refresh and try again.",
        "FEEDBACK_EDIT_CONFLICT",
        409
      );
    }

    const activities: Prisma.FeedbackActivityCreateManyInput[] = [
      {
        businessId,
        feedbackId,
        actorMembershipId: context.membership.id,
        type: FeedbackActivityType.FEEDBACK_EDITED,
        note: `Edited fields: ${changedFields.join(", ")}.`
      }
    ];
    if (input.status && input.status !== current.status) {
      activities.push({
        businessId,
        feedbackId,
        actorMembershipId: context.membership.id,
        type: FeedbackActivityType.STATUS_CHANGED,
        fromStatus: current.status,
        toStatus: input.status
      });
      await writeHumanFieldState(
        tx,
        feedbackId,
        businessId,
        context.membership.id,
        FeedbackFieldStateField.STATUS
      );
    }
    if (input.categoryId !== undefined && input.categoryId !== current.categoryId) {
      const previous = current.categoryId
        ? await tx.feedbackCategory.findUnique({
            where: { id: current.categoryId },
            select: { name: true }
          })
        : null;
      activities.push({
        businessId,
        feedbackId,
        actorMembershipId: context.membership.id,
        type: FeedbackActivityType.CATEGORY_CHANGED,
        fromValue: previous?.name ?? "Uncategorized",
        toValue: category?.name ?? "Uncategorized"
      });
      await writeHumanFieldState(
        tx,
        feedbackId,
        businessId,
        context.membership.id,
        FeedbackFieldStateField.CATEGORY
      );
    }
    if (input.priority && input.priority !== current.priority) {
      activities.push({
        businessId,
        feedbackId,
        actorMembershipId: context.membership.id,
        type: FeedbackActivityType.PRIORITY_CHANGED,
        fromValue: current.priority,
        toValue: input.priority
      });
      await writeHumanFieldState(
        tx,
        feedbackId,
        businessId,
        context.membership.id,
        FeedbackFieldStateField.PRIORITY
      );
    }
    await tx.feedbackActivity.createMany({ data: activities });
    return { feedbackId, changedFields };
  });
  if (
    result.changedFields.some((field) =>
      ["customerName", "customerEmail", "customerPhone"].includes(field)
    )
  ) {
    await tryAutoLinkCustomerForFeedback(feedbackId);
  }
  return result;
}

export async function bulkUpdateFeedbackStatus(
  actor: FeedbackActor,
  businessId: string,
  input: BulkStatusInput
) {
  const context = await resolveFeedbackMembershipContext(actor, businessId);
  requireFeedbackManager(context);
  const where = await selectionWhere(context, input.selection);
  return prisma.$transaction(async (tx) => {
    const records = await tx.feedback.findMany({
      where,
      select: { id: true, status: true }
    });
    const changed = records.filter((item) => item.status !== input.status);
    const invalid = changed.filter(
      (item) => !isValidTransition(item.status, input.status)
    );
    if (invalid.length) {
      throw new AppError(
        `${invalid.length} selected feedback record(s) cannot transition to ${input.status}.`,
        "FEEDBACK_STATUS_TRANSITION_INVALID",
        400
      );
    }
    if (!changed.length) return { affectedCount: 0 };
    const ids = changed.map((item) => item.id);
    await tx.feedback.updateMany({
      where: { id: { in: ids }, businessId, deletedAt: null },
      data: { status: input.status }
    });
    await tx.feedbackActivity.createMany({
      data: changed.map((item) => ({
        businessId,
        feedbackId: item.id,
        actorMembershipId: context.membership.id,
        type: FeedbackActivityType.STATUS_CHANGED,
        fromStatus: item.status,
        toStatus: input.status,
        note: "Bulk status update."
      }))
    });
    await tx.feedbackFieldState.updateMany({
      where: { feedbackId: { in: ids }, field: FeedbackFieldStateField.STATUS },
      data: {
        source: FeedbackFieldStateSource.HUMAN,
        sourceRuleId: null,
        updatedByMembershipId: context.membership.id
      }
    });
    return { affectedCount: changed.length };
  });
}

export async function bulkCategorizeFeedback(
  actor: FeedbackActor,
  businessId: string,
  input: BulkCategoryInput
) {
  const context = await resolveFeedbackMembershipContext(actor, businessId);
  requireFeedbackManager(context);
  const where = await selectionWhere(context, input.selection);
  return prisma.$transaction(async (tx) => {
    const category = await validateCategory(tx, businessId, input.categoryId);
    const records = await tx.feedback.findMany({
      where: { AND: [where, { NOT: { categoryId: input.categoryId } }] },
      select: { id: true, category: { select: { name: true } } }
    });
    if (!records.length) return { affectedCount: 0 };
    const ids = records.map((item) => item.id);
    await tx.feedback.updateMany({
      where: { id: { in: ids }, businessId, deletedAt: null },
      data: { categoryId: input.categoryId }
    });
    await tx.feedbackActivity.createMany({
      data: records.map((item) => ({
        businessId,
        feedbackId: item.id,
        actorMembershipId: context.membership.id,
        type: FeedbackActivityType.CATEGORY_CHANGED,
        fromValue: item.category?.name ?? "Uncategorized",
        toValue: category?.name ?? "Uncategorized",
        note: "Bulk categorization."
      }))
    });
    await tx.feedbackFieldState.updateMany({
      where: { feedbackId: { in: ids }, field: FeedbackFieldStateField.CATEGORY },
      data: {
        source: FeedbackFieldStateSource.HUMAN,
        sourceRuleId: null,
        updatedByMembershipId: context.membership.id
      }
    });
    return { affectedCount: records.length };
  });
}

export async function deleteFeedbackSelection(
  actor: FeedbackActor,
  businessId: string,
  input: BulkDeleteInput
) {
  const context = await resolveFeedbackMembershipContext(actor, businessId);
  requireFeedbackManager(context);
  if (
    input.selection.allMatching &&
    !Object.keys(input.selection.filters ?? {}).length &&
    input.confirmation !== "DELETE"
  ) {
    throw new AppError(
      "Type DELETE to remove all business feedback.",
      "DELETE_CONFIRMATION_REQUIRED",
      400
    );
  }
  const where = await selectionWhere(context, input.selection);
  return prisma.$transaction(async (tx) => {
    const records = await tx.feedback.findMany({
      where,
      select: { id: true, branchId: true }
    });
    if (!records.length) return { affectedCount: 0 };
    const ids = records.map((item) => item.id);
    const deletedAt = new Date();
    await tx.feedback.updateMany({
      where: { id: { in: ids }, businessId, deletedAt: null },
      data: { deletedAt, deletedByMembershipId: context.membership.id }
    });
    await tx.feedbackActivity.createMany({
      data: records.map((item) => ({
        businessId,
        feedbackId: item.id,
        actorMembershipId: context.membership.id,
        type: FeedbackActivityType.FEEDBACK_DELETED,
        note: "Removed from normal business and customer feedback views."
      }))
    });
    return { affectedCount: records.length, deletedAt: deletedAt.toISOString() };
  });
}

export async function deleteSingleFeedback(
  actor: FeedbackActor,
  businessId: string,
  feedbackId: string
) {
  return deleteFeedbackSelection(actor, businessId, {
    selection: { feedbackIds: [feedbackId] }
  });
}

export function canManageFeedback(role: BusinessMemberRole) {
  return role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN;
}

export function transitionsAreValid(statuses: FeedbackStatus[], target: FeedbackStatus) {
  return statuses.every(
    (status) => status === target || isValidTransition(status, target)
  );
}
