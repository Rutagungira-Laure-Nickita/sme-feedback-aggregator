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
import { publicFeedbackSourceAdapter } from "./public-feedback.adapter.js";
import { PUBLIC_FEEDBACK_ERROR_CODES } from "./public-feedback.errors.js";
import type {
  PublicFeedbackSettingsPatchInput,
  PublicFeedbackSubmissionInput
} from "./public-feedback.schemas.js";
import type {
  PublicFeedbackPortalSettings,
  PublicFeedbackSubmissionResult
} from "./public-feedback.types.js";

type Actor = {
  userId: string;
};

type PortalBusiness = {
  id: string;
  name: string;
  logoUrl: string | null;
  status: BusinessStatus;
  publicFeedbackEnabled: boolean;
  publicFeedbackToken: string | null;
  publicFeedbackWelcomeMessage: string | null;
  updatedAt: Date;
};

export async function getPublicFeedbackSettings(
  actor: Actor,
  businessId: string
): Promise<PublicFeedbackPortalSettings> {
  const business = await authorizePortalManagement(actor.userId, businessId);

  return toPortalSettings(business);
}

export async function updatePublicFeedbackSettings(
  actor: Actor,
  businessId: string,
  input: PublicFeedbackSettingsPatchInput
): Promise<PublicFeedbackPortalSettings> {
  await authorizePortalManagement(actor.userId, businessId);

  const data: Prisma.BusinessUpdateInput = {
    ...(typeof input.enabled === "boolean"
      ? { publicFeedbackEnabled: input.enabled }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "welcomeMessage")
      ? { publicFeedbackWelcomeMessage: input.welcomeMessage ?? null }
      : {})
  };

  if (input.enabled === true) {
    const current = await prisma.business.findUnique({
      where: { id: businessId },
      select: { publicFeedbackToken: true }
    });

    if (!current?.publicFeedbackToken) {
      data.publicFeedbackToken = await createUniquePortalToken();
    }
  }

  const business = await prisma.business.update({
    where: { id: businessId },
    data,
    select: portalBusinessSelect
  });

  return toPortalSettings(business);
}

export async function regeneratePublicFeedbackLink(
  actor: Actor,
  businessId: string
): Promise<PublicFeedbackPortalSettings> {
  await authorizePortalManagement(actor.userId, businessId);

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { publicFeedbackToken: await createUniquePortalToken() },
    select: portalBusinessSelect
  });

  return toPortalSettings(business);
}

export async function getPublicFeedbackPortal(portalToken: string) {
  const { business, branches } = await getAvailablePortal(portalToken);

  if (branches.length === 0) {
    throw new AppError(
      "This business is not accepting feedback at a location right now.",
      PUBLIC_FEEDBACK_ERROR_CODES.NO_ACTIVE_BRANCHES,
      409
    );
  }

  return {
    business: {
      name: business.name,
      logoUrl: business.logoUrl
    },
    portal: {
      welcomeMessage: business.publicFeedbackWelcomeMessage
    },
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      location: formatBranchLocation(branch)
    }))
  };
}

export async function submitPublicFeedback(
  portalToken: string,
  input: PublicFeedbackSubmissionInput,
  idempotencyKey: string
): Promise<PublicFeedbackSubmissionResult> {
  if (input.website.trim() !== "") {
    throw new AppError(
      "We could not submit your feedback. Please try again.",
      PUBLIC_FEEDBACK_ERROR_CODES.HONEYPOT_REJECTED,
      400
    );
  }

  const { business, branches } = await getAvailablePortal(portalToken);
  if (branches.length === 0) {
    throw new AppError(
      "This business is not accepting feedback at a location right now.",
      PUBLIC_FEEDBACK_ERROR_CODES.NO_ACTIVE_BRANCHES,
      409
    );
  }

  const branch = branches.find((candidate) => candidate.id === input.branchId);

  if (!branch) {
    throw new AppError(
      "Choose an active branch for this feedback link.",
      FEEDBACK_ERROR_CODES.BRANCH_NOT_FOUND,
      404
    );
  }

  const adapterPayload = publicFeedbackSourceAdapter.validatePayload({
    input,
    context: {
      businessId: business.id,
      idempotencyKey,
      portalTokenFingerprint: fingerprintPortalToken(portalToken)
    }
  });
  const normalizedInput =
    await publicFeedbackSourceAdapter.toNormalizedInput(adapterPayload);
  const result = await feedbackProcessingService.process(normalizedInput);

  return {
    ...result,
    channel: FeedbackChannel.PUBLIC_FORM
  };
}

async function authorizePortalManagement(
  userId: string,
  businessId: string
): Promise<PortalBusiness> {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: { businessId, userId }
    },
    include: {
      business: { select: portalBusinessSelect }
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

  if (
    membership.role !== BusinessMemberRole.OWNER &&
    membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Business role access is required.",
      PUBLIC_FEEDBACK_ERROR_CODES.ACCESS_DENIED,
      403
    );
  }

  if (membership.business.status !== BusinessStatus.ACTIVE) {
    throw new AppError("This business is suspended.", "BUSINESS_SUSPENDED", 403);
  }

  return membership.business;
}

async function getAvailablePortal(portalToken: string) {
  const business = await prisma.business.findFirst({
    where: {
      publicFeedbackToken: portalToken,
      publicFeedbackEnabled: true,
      status: BusinessStatus.ACTIVE
    },
    select: portalBusinessSelect
  });

  if (!business) {
    throw new AppError(
      "This feedback link is unavailable.",
      PUBLIC_FEEDBACK_ERROR_CODES.PORTAL_UNAVAILABLE,
      404
    );
  }

  const branches = await prisma.branch.findMany({
    where: {
      businessId: business.id,
      status: BranchStatus.ACTIVE
    },
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
      country: true,
      isPrimary: true
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }]
  });

  return { business, branches };
}

async function createUniquePortalToken(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    const existing = await prisma.business.findUnique({
      where: { publicFeedbackToken: token },
      select: { id: true }
    });

    if (!existing) {
      return token;
    }
  }

  throw new AppError(
    "Could not create a public feedback link.",
    "PUBLIC_FEEDBACK_TOKEN_GENERATION_FAILED",
    500
  );
}

function toPortalSettings(business: PortalBusiness): PublicFeedbackPortalSettings {
  return {
    enabled: business.publicFeedbackEnabled,
    welcomeMessage: business.publicFeedbackWelcomeMessage,
    publicUrl: business.publicFeedbackToken
      ? `${env.APP_FRONTEND_URL.replace(/\/$/, "")}/feedback/${business.publicFeedbackToken}`
      : null,
    hasToken: Boolean(business.publicFeedbackToken),
    updatedAt: business.updatedAt.toISOString()
  };
}

function fingerprintPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
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

const portalBusinessSelect = {
  id: true,
  name: true,
  logoUrl: true,
  status: true,
  publicFeedbackEnabled: true,
  publicFeedbackToken: true,
  publicFeedbackWelcomeMessage: true,
  updatedAt: true
} satisfies Prisma.BusinessSelect;
