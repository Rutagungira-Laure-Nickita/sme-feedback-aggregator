import {
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  FeedbackChannel
} from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  FEEDBACK_ERROR_CODES,
  feedbackProcessingService
} from "../feedback-processing/index.js";
import { manualFeedbackSourceAdapter } from "./manual-feedback.adapter.js";
import { MANUAL_FEEDBACK_ERROR_CODES } from "./manual-feedback.errors.js";
import type { ManualFeedbackInput } from "./manual-feedback.schemas.js";
import type { ManualFeedbackSubmissionResult } from "./manual-feedback.types.js";

type ManualFeedbackActor = {
  userId: string;
};

export async function submitManualFeedback(
  actor: ManualFeedbackActor,
  businessId: string,
  input: ManualFeedbackInput,
  idempotencyKey: string
): Promise<ManualFeedbackSubmissionResult> {
  const membership = await authorizeManualFeedbackSubmission(
    actor.userId,
    businessId,
    input.branchId
  );

  const adapterPayload = manualFeedbackSourceAdapter.validatePayload({
    input,
    context: {
      businessId,
      idempotencyKey,
      submittedByUserId: actor.userId,
      submittedByMembershipId: membership.id
    }
  });
  const normalizedInput =
    await manualFeedbackSourceAdapter.toNormalizedInput(adapterPayload);
  const result = await feedbackProcessingService.process(normalizedInput);

  return {
    ...result,
    channel: FeedbackChannel.MANUAL
  };
}

async function authorizeManualFeedbackSubmission(
  userId: string,
  businessId: string,
  branchId: string
): Promise<{ id: string }> {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: { businessId, userId }
    },
    include: {
      business: { select: { id: true, status: true } },
      branchAccess: { select: { branchId: true } }
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

  if (!isManualFeedbackRole(membership.role)) {
    throw new AppError(
      "Manual feedback access denied.",
      MANUAL_FEEDBACK_ERROR_CODES.ACCESS_DENIED,
      403
    );
  }

  if (membership.business.status !== BusinessStatus.ACTIVE) {
    throw new AppError(
      "This business is suspended.",
      FEEDBACK_ERROR_CODES.BUSINESS_SUSPENDED,
      403
    );
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, businessId: true, status: true }
  });

  if (!branch) {
    throw new AppError(
      "Branch was not found.",
      FEEDBACK_ERROR_CODES.BRANCH_NOT_FOUND,
      404
    );
  }

  if (branch.businessId !== businessId) {
    throw new AppError(
      "Branch does not belong to this business.",
      FEEDBACK_ERROR_CODES.BRANCH_BUSINESS_MISMATCH,
      403
    );
  }

  if (branch.status !== BranchStatus.ACTIVE) {
    throw new AppError(
      "This branch is inactive.",
      FEEDBACK_ERROR_CODES.BRANCH_INACTIVE,
      409
    );
  }

  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  ) {
    return { id: membership.id };
  }

  const hasExplicitBranchAccess = membership.branchAccess.some(
    (access) => access.branchId === branchId
  );

  if (!hasExplicitBranchAccess) {
    throw new AppError("Branch access denied.", "BRANCH_ACCESS_DENIED", 403);
  }

  return { id: membership.id };
}

function isManualFeedbackRole(role: BusinessMemberRole): boolean {
  return (
    role === BusinessMemberRole.OWNER ||
    role === BusinessMemberRole.ADMIN ||
    role === BusinessMemberRole.MANAGER ||
    role === BusinessMemberRole.STAFF
  );
}
