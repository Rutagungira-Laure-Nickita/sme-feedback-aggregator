import { createHash, randomBytes } from "node:crypto";
import {
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  FeedbackChannel,
  Prisma
} from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  FEEDBACK_ERROR_CODES,
  feedbackProcessingService
} from "../feedback-processing/index.js";
import {
  QR_FEEDBACK_ERROR_CODES,
  PUBLIC_FEEDBACK_ERROR_CODES
} from "./public-feedback.errors.js";
import { qrFeedbackSourceAdapter } from "./public-feedback-qr.adapter.js";
import type {
  PublicFeedbackQrCreateInput,
  PublicFeedbackQrSubmissionInput,
  PublicFeedbackQrUpdateInput
} from "./public-feedback-qr.schemas.js";
import type {
  PublicFeedbackQrConfig,
  PublicFeedbackQrManagementItem,
  PublicFeedbackQrManagementList,
  PublicFeedbackQrScope,
  PublicFeedbackQrSubmissionResult
} from "./public-feedback-qr.types.js";

type Actor = {
  userId: string;
};

type QrMembership = Prisma.BusinessMembershipGetPayload<{
  include: {
    business: { select: typeof qrBusinessSelect };
    branchAccess: { select: { branchId: true } };
  };
}>;

type QrCodeRecord = Prisma.PublicFeedbackQrCodeGetPayload<{
  include: {
    branch: {
      select: {
        id: true;
        businessId: true;
        name: true;
        city: true;
        district: true;
        country: true;
        status: true;
      };
    };
  };
}>;

export async function listPublicFeedbackQrCodes(
  actor: Actor,
  businessId: string
): Promise<PublicFeedbackQrManagementList> {
  const membership = await authorizeQrMembership(actor.userId, businessId);
  assertCanViewQrCodes(membership);

  const qrCodes = await prisma.publicFeedbackQrCode.findMany({
    where: qrCodeVisibilityWhere(membership),
    include: qrCodeInclude,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }]
  });

  return {
    portal: toPortalSummary(membership),
    qrCodes: qrCodes.map((qrCode) => toManagementItem(qrCode, membership.business))
  };
}

export async function createPublicFeedbackQrCode(
  actor: Actor,
  businessId: string,
  input: PublicFeedbackQrCreateInput
): Promise<PublicFeedbackQrManagementItem> {
  const membership = await authorizeQrMembership(actor.userId, businessId);
  assertCanManageQrCodes(membership);
  const portalToken = requireEnabledPortal(membership.business);

  if (input.branchId) {
    await assertActiveBusinessBranch(businessId, input.branchId);
  }

  const qrCode = await prisma.publicFeedbackQrCode.create({
    data: {
      businessId,
      branchId: input.branchId ?? null,
      name: input.name,
      publicToken: await createUniqueQrToken(),
      portalTokenFingerprint: fingerprintPortalToken(portalToken),
      createdByMembershipId: membership.id
    },
    include: qrCodeInclude
  });

  return toManagementItem(qrCode, membership.business);
}

export async function regeneratePublicFeedbackQrCode(
  actor: Actor,
  businessId: string,
  qrCodeId: string
): Promise<PublicFeedbackQrManagementItem> {
  const membership = await authorizeQrMembership(actor.userId, businessId);
  assertCanManageQrCodes(membership);
  const portalToken = requireEnabledPortal(membership.business);
  const existing = await getManagementQrCodeOrThrow(businessId, qrCodeId);

  if (existing.branchId) {
    await assertActiveBusinessBranch(businessId, existing.branchId);
  }

  const qrCode = await prisma.publicFeedbackQrCode.update({
    where: { id: qrCodeId },
    data: {
      publicToken: await createUniqueQrToken(),
      portalTokenFingerprint: fingerprintPortalToken(portalToken)
    },
    include: qrCodeInclude
  });

  return toManagementItem(qrCode, membership.business);
}

export async function updatePublicFeedbackQrCode(
  actor: Actor,
  businessId: string,
  qrCodeId: string,
  input: PublicFeedbackQrUpdateInput
): Promise<PublicFeedbackQrManagementItem> {
  const membership = await authorizeQrMembership(actor.userId, businessId);
  assertCanManageQrCodes(membership);
  await getManagementQrCodeOrThrow(businessId, qrCodeId);

  const qrCode = await prisma.publicFeedbackQrCode.update({
    where: { id: qrCodeId },
    data: {
      ...(typeof input.name === "string" ? { name: input.name } : {}),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {})
    },
    include: qrCodeInclude
  });

  return toManagementItem(qrCode, membership.business);
}

export async function getPublicFeedbackQrPortal(
  qrToken: string
): Promise<PublicFeedbackQrConfig> {
  const context = await getAvailableQrContext(qrToken);

  return {
    business: {
      name: context.qrCode.business.name,
      logoUrl: context.qrCode.business.logoUrl
    },
    portal: {
      welcomeMessage: context.qrCode.business.publicFeedbackWelcomeMessage
    },
    qrCode: {
      scope: context.scope,
      name: context.qrCode.name
    },
    branches: context.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      location: formatBranchLocation(branch)
    })),
    fixedBranchId: context.fixedBranchId
  };
}

export async function submitPublicFeedbackQr(
  qrToken: string,
  input: PublicFeedbackQrSubmissionInput,
  idempotencyKey: string
): Promise<PublicFeedbackQrSubmissionResult> {
  if (input.website.trim() !== "") {
    throw new AppError(
      "We could not submit your feedback. Please try again.",
      QR_FEEDBACK_ERROR_CODES.QR_HONEYPOT_REJECTED,
      400
    );
  }

  const context = await getAvailableQrContext(qrToken);
  const branchId = resolveSubmissionBranch(context, input.branchId);
  const adapterPayload = qrFeedbackSourceAdapter.validatePayload({
    input,
    context: {
      businessId: context.qrCode.businessId,
      branchId,
      idempotencyKey,
      qrCodeId: context.qrCode.id,
      qrScope: context.scope
    }
  });
  const normalizedInput = await qrFeedbackSourceAdapter.toNormalizedInput(adapterPayload);
  const result = await feedbackProcessingService.process(normalizedInput);

  return {
    ...result,
    channel: FeedbackChannel.QR_CODE
  };
}

async function authorizeQrMembership(
  userId: string,
  businessId: string
): Promise<QrMembership> {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: { businessId, userId }
    },
    include: {
      business: { select: qrBusinessSelect },
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

  if (membership.business.status !== BusinessStatus.ACTIVE) {
    throw new AppError("This business is suspended.", "BUSINESS_SUSPENDED", 403);
  }

  return membership;
}

function assertCanViewQrCodes(membership: QrMembership): void {
  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.role === BusinessMemberRole.MANAGER
  ) {
    return;
  }

  throw new AppError(
    "QR code access denied.",
    QR_FEEDBACK_ERROR_CODES.QR_ACCESS_DENIED,
    403
  );
}

function assertCanManageQrCodes(membership: QrMembership): void {
  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN
  ) {
    return;
  }

  throw new AppError(
    "QR code management requires owner or admin access.",
    QR_FEEDBACK_ERROR_CODES.QR_ACCESS_DENIED,
    403
  );
}

function qrCodeVisibilityWhere(
  membership: QrMembership
): Prisma.PublicFeedbackQrCodeWhereInput {
  const base = { businessId: membership.businessId };

  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  ) {
    return base;
  }

  return {
    ...base,
    branchId: { in: membership.branchAccess.map((access) => access.branchId) }
  };
}

function requireEnabledPortal(business: QrMembership["business"]): string {
  if (!business.publicFeedbackEnabled || !business.publicFeedbackToken) {
    throw new AppError(
      "Enable the public feedback portal before creating or regenerating QR codes.",
      QR_FEEDBACK_ERROR_CODES.QR_CREATION_UNAVAILABLE,
      409
    );
  }

  return business.publicFeedbackToken;
}

async function assertActiveBusinessBranch(
  businessId: string,
  branchId: string
): Promise<void> {
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
}

async function getManagementQrCodeOrThrow(
  businessId: string,
  qrCodeId: string
): Promise<QrCodeRecord> {
  const qrCode = await prisma.publicFeedbackQrCode.findFirst({
    where: { id: qrCodeId, businessId },
    include: qrCodeInclude
  });

  if (!qrCode) {
    throw new AppError(
      "QR code was not found.",
      QR_FEEDBACK_ERROR_CODES.QR_NOT_FOUND,
      404
    );
  }

  return qrCode;
}

async function getAvailableQrContext(qrToken: string): Promise<{
  qrCode: PublicQrCodeRecord;
  scope: PublicFeedbackQrScope;
  branches: PublicQrBranch[];
  fixedBranchId: string | null;
}> {
  const qrCode = await prisma.publicFeedbackQrCode.findUnique({
    where: { publicToken: qrToken },
    include: {
      business: { select: publicQrBusinessSelect },
      branch: { select: publicQrBranchSelect }
    }
  });

  if (!qrCode || !qrCode.isActive) {
    throwQrUnavailable();
  }

  if (
    qrCode.business.status !== BusinessStatus.ACTIVE ||
    !qrCode.business.publicFeedbackEnabled ||
    !qrCode.business.publicFeedbackToken ||
    qrCode.portalTokenFingerprint !==
      fingerprintPortalToken(qrCode.business.publicFeedbackToken)
  ) {
    throwQrUnavailable();
  }

  if (qrCode.branchId) {
    if (
      !qrCode.branch ||
      qrCode.branch.businessId !== qrCode.businessId ||
      qrCode.branch.status !== BranchStatus.ACTIVE
    ) {
      throwQrUnavailable();
    }

    return {
      qrCode,
      scope: "BRANCH",
      branches: [qrCode.branch],
      fixedBranchId: qrCode.branch.id
    };
  }

  const branches = await prisma.branch.findMany({
    where: {
      businessId: qrCode.businessId,
      status: BranchStatus.ACTIVE
    },
    select: publicQrBranchSelect,
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }]
  });

  if (branches.length === 0) {
    throw new AppError(
      "This business is not accepting feedback at a location right now.",
      PUBLIC_FEEDBACK_ERROR_CODES.NO_ACTIVE_BRANCHES,
      409
    );
  }

  return {
    qrCode,
    scope: "BUSINESS_WIDE",
    branches,
    fixedBranchId: null
  };
}

function resolveSubmissionBranch(
  context: {
    scope: PublicFeedbackQrScope;
    branches: PublicQrBranch[];
    fixedBranchId: string | null;
  },
  submittedBranchId: string
): string {
  if (context.scope === "BRANCH") {
    if (submittedBranchId !== context.fixedBranchId) {
      throw new AppError(
        "This QR code is locked to its assigned branch.",
        QR_FEEDBACK_ERROR_CODES.QR_BRANCH_LOCKED,
        400
      );
    }

    return submittedBranchId;
  }

  const branch = context.branches.find((candidate) => candidate.id === submittedBranchId);

  if (!branch) {
    throw new AppError(
      "Choose an active branch for this QR feedback link.",
      FEEDBACK_ERROR_CODES.BRANCH_NOT_FOUND,
      404
    );
  }

  return branch.id;
}

async function createUniqueQrToken(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    const existing = await prisma.publicFeedbackQrCode.findUnique({
      where: { publicToken: token },
      select: { id: true }
    });

    if (!existing) {
      return token;
    }
  }

  throw new AppError(
    "Could not create a QR feedback link.",
    QR_FEEDBACK_ERROR_CODES.QR_TOKEN_GENERATION_FAILED,
    500
  );
}

function toPortalSummary(membership: QrMembership) {
  const canSeeBusinessWideLink =
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess;

  return {
    enabled: membership.business.publicFeedbackEnabled,
    publicUrl:
      canSeeBusinessWideLink && membership.business.publicFeedbackToken
        ? `${frontendOrigin()}/feedback/${membership.business.publicFeedbackToken}`
        : null,
    hasToken: Boolean(membership.business.publicFeedbackToken)
  };
}

function toManagementItem(
  qrCode: QrCodeRecord,
  business: QrMembership["business"]
): PublicFeedbackQrManagementItem {
  const availabilityStatus = getAvailabilityStatus(qrCode, business);

  return {
    id: qrCode.id,
    name: qrCode.name,
    scope: qrCode.branchId ? "BRANCH" : "BUSINESS_WIDE",
    branch: qrCode.branch
      ? {
          id: qrCode.branch.id,
          name: qrCode.branch.name
        }
      : null,
    publicUrl: `${frontendOrigin()}/feedback/qr/${qrCode.publicToken}`,
    isActive: qrCode.isActive,
    isValidForCurrentPortal: Boolean(
      business.publicFeedbackToken &&
      qrCode.portalTokenFingerprint ===
        fingerprintPortalToken(business.publicFeedbackToken)
    ),
    availabilityStatus,
    createdAt: qrCode.createdAt.toISOString(),
    updatedAt: qrCode.updatedAt.toISOString()
  };
}

function getAvailabilityStatus(
  qrCode: QrCodeRecord,
  business: QrMembership["business"]
): PublicFeedbackQrManagementItem["availabilityStatus"] {
  if (!qrCode.isActive) {
    return "QR_DISABLED";
  }

  if (!business.publicFeedbackEnabled || !business.publicFeedbackToken) {
    return "PORTAL_DISABLED";
  }

  if (
    qrCode.portalTokenFingerprint !== fingerprintPortalToken(business.publicFeedbackToken)
  ) {
    return "PORTAL_LINK_CHANGED";
  }

  if (qrCode.branchId && qrCode.branch?.status !== BranchStatus.ACTIVE) {
    return "BRANCH_INACTIVE";
  }

  return "AVAILABLE";
}

function throwQrUnavailable(): never {
  throw new AppError(
    "This QR feedback link is unavailable.",
    QR_FEEDBACK_ERROR_CODES.QR_UNAVAILABLE,
    404
  );
}

function fingerprintPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function frontendOrigin(): string {
  return env.APP_FRONTEND_URL.replace(/\/$/, "");
}

function formatBranchLocation(branch: {
  city: string;
  district: string | null;
  country: string;
}): string {
  return [branch.city, branch.district, branch.country]
    .filter((value): value is string => Boolean(value))
    .join(" - ");
}

const qrBusinessSelect = {
  id: true,
  status: true,
  publicFeedbackEnabled: true,
  publicFeedbackToken: true
} satisfies Prisma.BusinessSelect;

const publicQrBusinessSelect = {
  id: true,
  name: true,
  logoUrl: true,
  status: true,
  publicFeedbackEnabled: true,
  publicFeedbackToken: true,
  publicFeedbackWelcomeMessage: true
} satisfies Prisma.BusinessSelect;

const qrCodeInclude = {
  branch: {
    select: {
      id: true,
      businessId: true,
      name: true,
      city: true,
      district: true,
      country: true,
      status: true
    }
  }
} satisfies Prisma.PublicFeedbackQrCodeInclude;

const publicQrBranchSelect = {
  id: true,
  businessId: true,
  name: true,
  city: true,
  district: true,
  country: true,
  status: true,
  isPrimary: true
} satisfies Prisma.BranchSelect;

type PublicQrBranch = Prisma.BranchGetPayload<{
  select: typeof publicQrBranchSelect;
}>;

type PublicQrCodeRecord = Prisma.PublicFeedbackQrCodeGetPayload<{
  include: {
    business: { select: typeof publicQrBusinessSelect };
    branch: { select: typeof publicQrBranchSelect };
  };
}>;
