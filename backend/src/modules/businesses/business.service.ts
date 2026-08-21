import type {
  Branch,
  Business,
  BusinessMembership,
  StaffInvitation,
  User
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  AccountStatus,
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  ExternalAuthProvider,
  Prisma as PrismaRuntime,
  StaffInvitationStatus,
  UserRole
} from "../../lib/prisma-runtime.js";
import { createDefaultFeedbackCategories } from "../feedback-categories/default-feedback-categories.js";
import { AppError } from "../../lib/app-error.js";
import { assertEmailDeliveryConfigured, sendEmail } from "../../lib/email.service.js";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../utils/password.js";
import {
  assertUserCanAuthenticate,
  createApplicationSession,
  toSafeUser,
  type AuthResult
} from "../auth/auth.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { verifyGoogleCredential } from "../auth/google-auth.service.js";
import type {
  AcceptInvitationGoogleInput,
  AcceptInvitationPasswordInput,
  AdminBusinessStatusInput,
  AdminCreateBusinessInput,
  CreateBranchInput,
  CreateBusinessInput,
  CreateStaffInvitationInput,
  UpdateBranchInput,
  UpdateBusinessInput,
  UpdateMembershipBranchAccessInput
} from "./business.schema.js";
import { recordPlatformAdminActivity } from "../platform-admin/platform-admin-audit.service.js";
import { buildStaffInvitationEmail } from "./staff-invitation-email.templates.js";
import {
  createStaffInvitationToken,
  hashStaffInvitationToken
} from "./staff-invitation-token.service.js";

type Actor = {
  userId: string;
  platformRole: UserRole;
};

type Pagination = {
  page: number;
  pageSize: number;
  search?: string;
};

const BUSINESS_INCLUDE = {
  branches: true,
  memberships: {
    include: {
      user: true,
      branchAccess: { include: { branch: true } }
    }
  },
  invitations: true,
  createdBy: true
} satisfies Prisma.BusinessInclude;

export async function listMyBusinesses(
  actor: Actor,
  query: Pagination & { status?: BusinessStatus }
) {
  await cleanupExpiredStaffInvitations();

  const memberships = await prisma.businessMembership.findMany({
    where: {
      userId: actor.userId,
      status: BusinessMembershipStatus.ACTIVE,
      business: {
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { industry: { contains: query.search } },
                { city: { contains: query.search } }
              ]
            }
          : {})
      }
    },
    include: {
      branchAccess: { include: { branch: true } },
      business: {
        include: {
          branches: true,
          memberships: true,
          invitations: true
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    skip: offset(query),
    take: query.pageSize
  });

  const total = await prisma.businessMembership.count({
    where: {
      userId: actor.userId,
      status: BusinessMembershipStatus.ACTIVE,
      business: {
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { industry: { contains: query.search } },
                { city: { contains: query.search } }
              ]
            }
          : {})
      }
    }
  });

  return {
    businesses: memberships.map((membership) => ({
      ...toBusinessSummary(
        membership.role === BusinessMemberRole.OWNER ||
          membership.role === BusinessMemberRole.ADMIN ||
          membership.allBranchesAccess
          ? membership.business
          : {
              ...membership.business,
              branches: membership.business.branches.filter((branch) =>
                membership.branchAccess.some((access) => access.branchId === branch.id)
              ),
              memberships: [membership],
              invitations: []
            }
      ),
      membership: toMembershipSummary(membership)
    })),
    pagination: paginationResult(total, query)
  };
}

export async function createBusiness(actor: Actor, input: CreateBusinessInput) {
  if (actor.platformRole !== UserRole.BUSINESS_OWNER) {
    throw new AppError(
      "Business owner accounts can create businesses.",
      "BUSINESS_OWNER_REQUIRED",
      403
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: input.name,
        industry: input.industry,
        description: input.description,
        email: input.email,
        phone: input.phone,
        website: input.website,
        logoUrl: input.logoUrl,
        country: input.country,
        city: input.city,
        district: input.district,
        addressLine: input.addressLine,
        timezone: input.timezone,
        createdByUserId: actor.userId
      }
    });

    const branch = await tx.branch.create({
      data: {
        ...branchCreateData(input.primaryBranch),
        businessId: business.id,
        isPrimary: true
      }
    });

    await createDefaultFeedbackCategories(tx, business.id);

    const membership = await tx.businessMembership.create({
      data: {
        businessId: business.id,
        userId: actor.userId,
        role: BusinessMemberRole.OWNER,
        status: BusinessMembershipStatus.ACTIVE,
        allBranchesAccess: true,
        joinedAt: new Date()
      },
      include: { user: true, branchAccess: { include: { branch: true } } }
    });

    return { business, branch, membership };
  });

  return {
    business: toBusinessSummary({
      ...result.business,
      branches: [result.branch],
      memberships: [result.membership],
      invitations: []
    }),
    primaryBranch: toBranchSummary(result.branch, 1),
    membership: toMembershipSummary(result.membership)
  };
}

export async function createAdminBusiness(
  actorUserId: string,
  input: AdminCreateBusinessInput
) {
  const owner = await prisma.user.findUnique({ where: { id: input.ownerUserId } });
  if (
    !owner ||
    owner.role !== UserRole.BUSINESS_OWNER ||
    owner.status !== AccountStatus.ACTIVE
  ) {
    throw new AppError(
      "Choose an active business-owner account.",
      "BUSINESS_OWNER_INVALID",
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: input.name,
        industry: input.industry,
        description: input.description,
        email: input.email,
        phone: input.phone,
        website: input.website,
        logoUrl: input.logoUrl,
        country: input.country,
        city: input.city,
        district: input.district,
        addressLine: input.addressLine,
        timezone: input.timezone,
        status: BusinessStatus.PENDING,
        createdByUserId: owner.id
      }
    });
    const branch = await tx.branch.create({
      data: {
        ...branchCreateData(input.primaryBranch),
        businessId: business.id,
        isPrimary: true
      }
    });
    await createDefaultFeedbackCategories(tx, business.id);
    const membership = await tx.businessMembership.create({
      data: {
        businessId: business.id,
        userId: owner.id,
        role: BusinessMemberRole.OWNER,
        status: BusinessMembershipStatus.ACTIVE,
        allBranchesAccess: true,
        joinedAt: new Date()
      },
      include: { user: true, branchAccess: { include: { branch: true } } }
    });
    return { business, branch, membership };
  });

  await recordPlatformAdminActivity({
    actorUserId,
    action: "BUSINESS_CREATED",
    targetType: "BUSINESS",
    targetId: result.business.id,
    summary: `Created ${result.business.name} for approval.`,
    metadata: { status: BusinessStatus.PENDING, ownerUserId: owner.id }
  });

  return {
    business: toBusinessSummary({
      ...result.business,
      branches: [result.branch],
      memberships: [result.membership],
      invitations: []
    })
  };
}

export async function getBusiness(actor: Actor, businessId: string) {
  const context = await getBusinessContext(actor, businessId, { allowInactive: true });
  const isActive = context.business.status === BusinessStatus.ACTIVE;
  const accessibleBranchIds = await getAccessibleBranchIds(context.membership);
  const visibleBusiness = accessibleBranchIds
    ? {
        ...context.business,
        branches: context.business.branches.filter((branch) =>
          accessibleBranchIds.includes(branch.id)
        ),
        memberships: context.business.memberships.filter(
          (membership) =>
            membership.id === context.membership.id ||
            membership.role === BusinessMemberRole.OWNER ||
            membership.role === BusinessMemberRole.ADMIN ||
            membership.allBranchesAccess ||
            membership.branchAccess.some((access) =>
              accessibleBranchIds.includes(access.branchId)
            )
        ),
        invitations: []
      }
    : context.business;

  return {
    business: toBusinessDetail(visibleBusiness),
    membership: toMembershipSummary(context.membership),
    permissions: isActive
      ? permissionsFor(context.membership.role)
      : {
          canManageBusiness: false,
          canManageBranches: false,
          canManageStaff: false,
          canAssignAdmin: false
        }
  };
}

export async function updateBusiness(
  actor: Actor,
  businessId: string,
  input: UpdateBusinessInput
) {
  const context = await getBusinessContext(actor, businessId);
  assertCanManageBusiness(context.membership);

  const business = await prisma.business.update({
    where: { id: businessId },
    data: input,
    include: BUSINESS_INCLUDE
  });

  return { business: toBusinessDetail(business) };
}

export async function listBranches(
  actor: Actor,
  businessId: string,
  query: Pagination & { status?: BranchStatus }
) {
  const context = await getBusinessContext(actor, businessId);
  const accessibleBranchIds = await getAccessibleBranchIds(context.membership);
  const where: Prisma.BranchWhereInput = {
    businessId,
    status: query.status,
    ...(accessibleBranchIds
      ? {
          id: { in: accessibleBranchIds }
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { code: { contains: query.search.toUpperCase() } },
            { city: { contains: query.search } },
            { district: { contains: query.search } }
          ]
        }
      : {})
  };

  const [branches, total] = await Promise.all([
    prisma.branch.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      skip: offset(query),
      take: query.pageSize
    }),
    prisma.branch.count({ where })
  ]);

  const staffCounts = await countBranchStaff(branches);

  return {
    branches: branches.map((branch) =>
      toBranchSummary(branch, staffCounts.get(branch.id) ?? 0)
    ),
    pagination: paginationResult(total, query)
  };
}

export async function createBranch(
  actor: Actor,
  businessId: string,
  input: CreateBranchInput
) {
  const context = await getBusinessContext(actor, businessId);
  assertCanManageBranches(context.membership);

  try {
    const branch = await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.branch.updateMany({
          where: { businessId },
          data: { isPrimary: false }
        });
      }

      return tx.branch.create({
        data: {
          ...branchCreateData(input),
          businessId,
          isPrimary: input.isPrimary ?? false
        }
      });
    });

    return { branch: toBranchSummary(branch, 0) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError("Branch code already exists.", "BRANCH_CODE_EXISTS", 409);
    }

    throw error;
  }
}

export async function getBranch(actor: Actor, businessId: string, branchId: string) {
  const context = await getBusinessContext(actor, businessId);
  await assertBranchAccess(context.membership, branchId);

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId }
  });

  if (!branch) {
    throw new AppError("Branch was not found.", "BRANCH_NOT_FOUND", 404);
  }

  const staffCounts = await countBranchStaff([branch]);

  return { branch: toBranchSummary(branch, staffCounts.get(branch.id) ?? 0) };
}

export async function updateBranch(
  actor: Actor,
  businessId: string,
  branchId: string,
  input: UpdateBranchInput
) {
  const context = await getBusinessContext(actor, businessId);
  assertCanManageBranches(context.membership);
  await assertBranchBelongsToBusiness(businessId, branchId);

  try {
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: input
    });
    const staffCounts = await countBranchStaff([branch]);

    return { branch: toBranchSummary(branch, staffCounts.get(branch.id) ?? 0) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError("Branch code already exists.", "BRANCH_CODE_EXISTS", 409);
    }

    throw error;
  }
}

export async function setPrimaryBranch(
  actor: Actor,
  businessId: string,
  branchId: string
) {
  const context = await getBusinessContext(actor, businessId);
  assertCanManageBranches(context.membership);
  const branch = await assertBranchBelongsToBusiness(businessId, branchId);

  if (branch.status !== BranchStatus.ACTIVE) {
    throw new AppError(
      "Choose an active branch as the primary branch.",
      "PRIMARY_BRANCH_REQUIRED",
      400
    );
  }

  await prisma.$transaction([
    prisma.branch.updateMany({ where: { businessId }, data: { isPrimary: false } }),
    prisma.branch.update({ where: { id: branchId }, data: { isPrimary: true } })
  ]);

  return { primaryBranchId: branchId };
}

export async function activateBranch(actor: Actor, businessId: string, branchId: string) {
  const context = await getBusinessContext(actor, businessId);
  assertCanManageBranches(context.membership);
  await assertBranchBelongsToBusiness(businessId, branchId);

  const branch = await prisma.branch.update({
    where: { id: branchId },
    data: { status: BranchStatus.ACTIVE }
  });

  return { branch: toBranchSummary(branch, 0) };
}

export async function deactivateBranch(
  actor: Actor,
  businessId: string,
  branchId: string
) {
  const context = await getBusinessContext(actor, businessId);
  assertCanManageBranches(context.membership);
  const branch = await assertBranchBelongsToBusiness(businessId, branchId);

  if (branch.isPrimary) {
    throw new AppError(
      "Set another active primary branch before deactivating this branch.",
      "PRIMARY_BRANCH_REQUIRED",
      400
    );
  }

  const updatedBranch = await prisma.branch.update({
    where: { id: branchId },
    data: { status: BranchStatus.INACTIVE }
  });

  return { branch: toBranchSummary(updatedBranch, 0) };
}

export async function listMemberships(
  actor: Actor,
  businessId: string,
  query: Pagination & {
    role?: BusinessMemberRole;
    status?: BusinessMembershipStatus;
    branchId?: string;
  }
) {
  const context = await getBusinessContext(actor, businessId);
  const actorAccessibleBranchIds = await getAccessibleBranchIds(context.membership);
  const branchId =
    query.branchId &&
    (!actorAccessibleBranchIds || actorAccessibleBranchIds.includes(query.branchId))
      ? query.branchId
      : undefined;
  const where: Prisma.BusinessMembershipWhereInput = {
    businessId,
    role: query.role,
    status: query.status,
    ...(query.search
      ? {
          user: {
            OR: [
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
              { email: { contains: query.search.toLowerCase() } }
            ]
          }
        }
      : {}),
    ...(branchId
      ? {
          OR: [{ allBranchesAccess: true }, { branchAccess: { some: { branchId } } }]
        }
      : actorAccessibleBranchIds
        ? {
            OR: [
              { allBranchesAccess: true },
              { branchAccess: { some: { branchId: { in: actorAccessibleBranchIds } } } }
            ]
          }
        : {})
  };

  const [memberships, total] = await Promise.all([
    prisma.businessMembership.findMany({
      where,
      include: { user: true, branchAccess: { include: { branch: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      skip: offset(query),
      take: query.pageSize
    }),
    prisma.businessMembership.count({ where })
  ]);

  return {
    memberships: memberships.map(toMembershipSummary),
    pagination: paginationResult(total, query)
  };
}

export async function getMembership(
  actor: Actor,
  businessId: string,
  membershipId: string
) {
  await getBusinessContext(actor, businessId);
  const membership = await findMembershipInBusiness(businessId, membershipId);

  return { membership: toMembershipSummary(membership) };
}

export async function updateMembershipRole(
  actor: Actor,
  businessId: string,
  membershipId: string,
  role: BusinessMemberRole
) {
  const context = await getBusinessContext(actor, businessId);
  const target = await findMembershipInBusiness(businessId, membershipId);

  assertCanManageMembershipRole(context.membership, target, role, actor.userId);

  const updated = await prisma.businessMembership.update({
    where: { id: target.id },
    data: {
      role,
      allBranchesAccess:
        role === BusinessMemberRole.ADMIN || role === BusinessMemberRole.OWNER
          ? true
          : target.allBranchesAccess
    },
    include: { user: true, branchAccess: { include: { branch: true } } }
  });

  if (role === BusinessMemberRole.ADMIN || role === BusinessMemberRole.OWNER) {
    await prisma.membershipBranchAccess.deleteMany({
      where: { membershipId: target.id }
    });
  }

  return { membership: toMembershipSummary(updated) };
}

export async function updateMembershipBranchAccess(
  actor: Actor,
  businessId: string,
  membershipId: string,
  input: UpdateMembershipBranchAccessInput
) {
  const context = await getBusinessContext(actor, businessId);
  const target = await findMembershipInBusiness(businessId, membershipId);
  assertCanManageMembership(context.membership, target, actor.userId);

  if (
    target.role === BusinessMemberRole.OWNER ||
    target.role === BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Owner and admin memberships always have all branch access.",
      "ROLE_CHANGE_FORBIDDEN",
      409
    );
  }

  await assertBranchesBelongToBusiness(businessId, input.branchIds);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.membershipBranchAccess.deleteMany({ where: { membershipId: target.id } });

    if (!input.allBranchesAccess) {
      await tx.membershipBranchAccess.createMany({
        data: input.branchIds.map((branchId) => ({
          membershipId: target.id,
          branchId
        })),
        skipDuplicates: true
      });
    }

    return tx.businessMembership.update({
      where: { id: target.id },
      data: { allBranchesAccess: input.allBranchesAccess },
      include: { user: true, branchAccess: { include: { branch: true } } }
    });
  });

  return { membership: toMembershipSummary(updated) };
}

export async function suspendMembership(
  actor: Actor,
  businessId: string,
  membershipId: string
) {
  return changeMembershipStatus(
    actor,
    businessId,
    membershipId,
    BusinessMembershipStatus.SUSPENDED
  );
}

export async function reactivateMembership(
  actor: Actor,
  businessId: string,
  membershipId: string
) {
  return changeMembershipStatus(
    actor,
    businessId,
    membershipId,
    BusinessMembershipStatus.ACTIVE
  );
}

export async function removeMembership(
  actor: Actor,
  businessId: string,
  membershipId: string
) {
  return changeMembershipStatus(
    actor,
    businessId,
    membershipId,
    BusinessMembershipStatus.REMOVED
  );
}

export async function listInvitations(
  actor: Actor,
  businessId: string,
  query: Pagination & { status?: StaffInvitationStatus }
) {
  await cleanupExpiredStaffInvitations();
  const context = await getBusinessContext(actor, businessId);
  assertCanManageInvitations(context.membership);

  const where: Prisma.StaffInvitationWhereInput = {
    businessId,
    status: query.status,
    ...(query.search ? { invitedEmail: { contains: query.search.toLowerCase() } } : {})
  };

  const [invitations, total] = await Promise.all([
    prisma.staffInvitation.findMany({
      where,
      include: {
        branchAccess: { include: { branch: true } },
        invitedBy: true,
        acceptedBy: true
      },
      orderBy: { createdAt: "desc" },
      skip: offset(query),
      take: query.pageSize
    }),
    prisma.staffInvitation.count({ where })
  ]);

  return {
    invitations: invitations.map(toInvitationSummary),
    pagination: paginationResult(total, query)
  };
}

export async function createStaffInvitation(
  actor: Actor,
  businessId: string,
  input: CreateStaffInvitationInput
) {
  assertEmailDeliveryConfigured();
  const context = await getBusinessContext(actor, businessId);
  assertCanInviteRole(context.membership, input.role);
  await assertBranchesBelongToBusiness(businessId, input.branchIds);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.invitedEmail }
  });
  if (existingUser) {
    const membership = await prisma.businessMembership.findUnique({
      where: {
        businessId_userId: { businessId, userId: existingUser.id }
      }
    });

    if (membership && membership.status !== BusinessMembershipStatus.REMOVED) {
      throw new AppError(
        "This person is already a member of the business.",
        "INVITATION_ALREADY_EXISTS",
        409
      );
    }
  }

  const pendingInvitation = await prisma.staffInvitation.findFirst({
    where: {
      businessId,
      invitedEmail: input.invitedEmail,
      status: StaffInvitationStatus.PENDING,
      expiresAt: { gt: new Date() }
    }
  });

  if (pendingInvitation) {
    throw new AppError(
      "A pending invitation already exists for this email.",
      "INVITATION_ALREADY_EXISTS",
      409
    );
  }

  const token = createStaffInvitationToken();
  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.staffInvitation.create({
      data: {
        businessId,
        invitedEmail: input.invitedEmail,
        role: input.role,
        allBranchesAccess: input.allBranchesAccess,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        invitedByUserId: actor.userId,
        branchAccess: input.allBranchesAccess
          ? undefined
          : {
              create: input.branchIds.map((branchId) => ({ branchId }))
            }
      },
      include: {
        business: true,
        invitedBy: true,
        branchAccess: { include: { branch: true } }
      }
    });

    return created;
  });

  await sendInvitationEmail(invitation, token.rawToken);
  await prisma.staffInvitation.update({
    where: { id: invitation.id },
    data: { lastSentAt: new Date() }
  });

  return { invitation: toInvitationSummary(invitation) };
}

export async function resendStaffInvitation(
  actor: Actor,
  businessId: string,
  invitationId: string
) {
  assertEmailDeliveryConfigured();
  const context = await getBusinessContext(actor, businessId);
  assertCanManageInvitations(context.membership);
  const invitation = await findInvitationInBusiness(businessId, invitationId);

  if (invitation.status !== StaffInvitationStatus.PENDING) {
    throw new AppError(
      "Only pending invitations can be resent.",
      "INVITATION_ALREADY_ACCEPTED",
      409
    );
  }

  if (invitation.expiresAt <= new Date()) {
    await markInvitationExpired(invitation.id);
    throw new AppError("This invitation has expired.", "INVITATION_EXPIRED", 400);
  }

  const token = createStaffInvitationToken();
  const updated = await prisma.staffInvitation.update({
    where: { id: invitation.id },
    data: {
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      lastSentAt: new Date()
    },
    include: {
      business: true,
      invitedBy: true,
      branchAccess: { include: { branch: true } }
    }
  });

  await sendInvitationEmail(updated, token.rawToken);

  return { invitation: toInvitationSummary(updated) };
}

export async function cancelStaffInvitation(
  actor: Actor,
  businessId: string,
  invitationId: string
) {
  const context = await getBusinessContext(actor, businessId);
  assertCanManageInvitations(context.membership);
  const invitation = await findInvitationInBusiness(businessId, invitationId);

  if (invitation.status !== StaffInvitationStatus.PENDING) {
    throw new AppError("Invitation was not found.", "INVITATION_NOT_FOUND", 404);
  }

  const updated = await prisma.staffInvitation.update({
    where: { id: invitation.id },
    data: {
      status: StaffInvitationStatus.CANCELLED,
      cancelledAt: new Date()
    },
    include: {
      branchAccess: { include: { branch: true } },
      invitedBy: true,
      acceptedBy: true
    }
  });

  return { invitation: toInvitationSummary(updated) };
}

export async function previewStaffInvitation(rawToken: string) {
  await cleanupExpiredStaffInvitations();
  const invitation = await findInvitationByToken(rawToken);
  assertInvitationCanBeAccepted(invitation);

  return {
    invitation: toInvitationPreview(invitation)
  };
}

export async function acceptInvitationWithSession(actor: Actor, rawToken: string) {
  const result = await prisma.$transaction(async (tx) => {
    const invitation = await findInvitationByToken(rawToken, tx);
    assertInvitationCanBeAccepted(invitation);

    const user = await tx.user.findUnique({ where: { id: actor.userId } });
    if (!user) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    assertUserCanAuthenticate(user);
    assertInvitationEmailMatches(invitation, user.email);

    const membership = await applyInvitation(tx, invitation, user.id);

    return {
      businessId: invitation.businessId,
      membership
    };
  });

  return {
    businessId: result.businessId,
    membership: toMembershipSummary(result.membership)
  };
}

export async function acceptInvitationWithPassword(
  input: AcceptInvitationPasswordInput,
  metadata: RequestMetadata
): Promise<AuthResult & { businessId: string }> {
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const invitation = await findInvitationByToken(input.token, tx);
    assertInvitationCanBeAccepted(invitation);

    const existingUser = await tx.user.findUnique({
      where: { email: invitation.invitedEmail }
    });

    if (existingUser) {
      throw new AppError(
        "Sign in to accept this invitation with your existing account.",
        "ACCOUNT_EMAIL_ALREADY_EXISTS",
        409
      );
    }

    const now = new Date();
    const user = await tx.user.create({
      data: {
        email: invitation.invitedEmail,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: UserRole.STAFF,
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: now,
        lastLoginAt: now
      },
      include: { externalAccounts: true }
    });

    await applyInvitation(tx, invitation, user.id);
    const tokens = await createApplicationSession(tx, user, metadata);

    return {
      user: toSafeUser(user),
      ...tokens,
      businessId: invitation.businessId
    };
  });
}

export async function acceptInvitationWithGoogle(
  input: AcceptInvitationGoogleInput,
  metadata: RequestMetadata
): Promise<AuthResult & { businessId: string }> {
  const identity = await verifyGoogleCredential(input.credential);

  return prisma.$transaction(async (tx) => {
    const invitation = await findInvitationByToken(input.token, tx);
    assertInvitationCanBeAccepted(invitation);
    assertInvitationEmailMatches(invitation, identity.email);

    const existingExternal = await tx.externalAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: ExternalAuthProvider.GOOGLE,
          providerAccountId: identity.sub
        }
      },
      include: { user: { include: { externalAccounts: true } } }
    });

    let user: User & {
      externalAccounts: {
        provider: ExternalAuthProvider;
        providerEmail: string | null;
        avatarUrl: string | null;
      }[];
    };
    const now = new Date();

    if (existingExternal) {
      assertInvitationEmailMatches(invitation, existingExternal.user.email);
      assertUserCanAuthenticate(existingExternal.user);
      user = existingExternal.user;
      await tx.externalAccount.update({
        where: { id: existingExternal.id },
        data: {
          providerEmail: identity.email,
          displayName: identity.name ?? existingExternal.displayName,
          avatarUrl: identity.picture ?? existingExternal.avatarUrl,
          lastUsedAt: now
        }
      });
    } else {
      const existingUser = await tx.user.findUnique({
        where: { email: identity.email },
        include: { externalAccounts: true }
      });

      if (existingUser) {
        assertUserCanAuthenticate(existingUser);
        const currentGoogle = existingUser.externalAccounts.find(
          (account) => account.provider === ExternalAuthProvider.GOOGLE
        );

        if (currentGoogle) {
          throw new AppError(
            "This account already has a different Google sign-in linked.",
            "GOOGLE_ACCOUNT_ALREADY_LINKED",
            409
          );
        }

        await tx.externalAccount.create({
          data: {
            userId: existingUser.id,
            provider: ExternalAuthProvider.GOOGLE,
            providerAccountId: identity.sub,
            providerEmail: identity.email,
            displayName:
              identity.name ?? `${existingUser.firstName} ${existingUser.lastName}`,
            avatarUrl: identity.picture,
            lastUsedAt: now
          }
        });

        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerifiedAt: existingUser.emailVerifiedAt ?? now,
            lastLoginAt: now
          },
          include: { externalAccounts: true }
        });
      } else {
        const names = resolveGoogleNames(
          identity.name,
          identity.givenName,
          identity.familyName
        );
        user = await tx.user.create({
          data: {
            email: identity.email,
            passwordHash: null,
            firstName: names.firstName,
            lastName: names.lastName,
            role: UserRole.STAFF,
            status: AccountStatus.ACTIVE,
            emailVerifiedAt: now,
            lastLoginAt: now,
            externalAccounts: {
              create: {
                provider: ExternalAuthProvider.GOOGLE,
                providerAccountId: identity.sub,
                providerEmail: identity.email,
                displayName: identity.name ?? `${names.firstName} ${names.lastName}`,
                avatarUrl: identity.picture,
                lastUsedAt: now
              }
            }
          },
          include: { externalAccounts: true }
        });
      }
    }

    await applyInvitation(tx, invitation, user.id);
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
      include: { externalAccounts: true }
    });
    const tokens = await createApplicationSession(tx, updatedUser, metadata);

    return {
      user: toSafeUser(updatedUser),
      ...tokens,
      businessId: invitation.businessId
    };
  });
}

export async function listAdminBusinesses(
  query: Pagination & {
    status?: BusinessStatus;
    sort?: "NEWEST" | "NAME" | "MOST_FEEDBACK";
  }
) {
  const where: Prisma.BusinessWhereInput = {
    status: query.status,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { industry: { contains: query.search } },
            { email: { contains: query.search.toLowerCase() } },
            {
              createdBy: {
                OR: [
                  { firstName: { contains: query.search } },
                  { lastName: { contains: query.search } },
                  { email: { contains: query.search.toLowerCase() } }
                ]
              }
            }
          ]
        }
      : {})
  };

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: BUSINESS_INCLUDE,
      orderBy:
        query.sort === "NAME"
          ? { name: "asc" }
          : query.sort === "MOST_FEEDBACK"
            ? { feedbacks: { _count: "desc" } }
            : { createdAt: "desc" },
      skip: offset(query),
      take: query.pageSize
    }),
    prisma.business.count({ where })
  ]);

  return {
    businesses: businesses.map(toBusinessDetail),
    pagination: paginationResult(total, query)
  };
}

export async function getAdminBusiness(businessId: string) {
  const [business, feedbackByStatus, integrations, recentFeedback] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, include: BUSINESS_INCLUDE }),
    prisma.feedback.groupBy({
      by: ["status"],
      where: { businessId, deletedAt: null },
      _count: { _all: true }
    }),
    prisma.integrationConnection.findMany({
      where: { businessId },
      select: {
        provider: true,
        mode: true,
        status: true,
        totalImported: true,
        lastSuccessfulSyncAt: true,
        lastInboundMessageAt: true
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.feedback.findMany({
      where: { businessId, deletedAt: null },
      select: {
        id: true,
        channel: true,
        status: true,
        receivedAt: true,
        branch: { select: { id: true, name: true } }
      },
      orderBy: { receivedAt: "desc" },
      take: 8
    })
  ]);

  if (!business) {
    throw new AppError("Business was not found.", "BUSINESS_NOT_FOUND", 404);
  }

  return {
    business: {
      ...toBusinessDetail(business),
      adminOverview: {
        branches: business.branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          status: branch.status,
          isPrimary: branch.isPrimary
        })),
        memberships: business.memberships.map((membership) => ({
          id: membership.id,
          role: membership.role,
          status: membership.status,
          user: membership.user
            ? {
                id: membership.user.id,
                firstName: membership.user.firstName,
                lastName: membership.user.lastName,
                email: membership.user.email
              }
            : null
        })),
        feedbackByStatus: feedbackByStatus.map((item) => ({
          status: item.status,
          count: item._count._all
        })),
        totalFeedback: feedbackByStatus.reduce((sum, item) => sum + item._count._all, 0),
        integrations,
        recentFeedback
      }
    }
  };
}

const ALLOWED_ADMIN_BUSINESS_TRANSITIONS: Record<BusinessStatus, BusinessStatus[]> = {
  PENDING: [BusinessStatus.ACTIVE, BusinessStatus.REJECTED, BusinessStatus.ARCHIVED],
  ACTIVE: [BusinessStatus.SUSPENDED, BusinessStatus.ARCHIVED],
  SUSPENDED: [BusinessStatus.ACTIVE, BusinessStatus.ARCHIVED],
  REJECTED: [BusinessStatus.PENDING, BusinessStatus.ARCHIVED],
  ARCHIVED: [BusinessStatus.PENDING]
};

export async function setAdminBusinessStatus(
  actorUserId: string,
  businessId: string,
  input: AdminBusinessStatusInput
) {
  const current = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, status: true }
  });
  if (!current) throw new AppError("Business was not found.", "BUSINESS_NOT_FOUND", 404);
  const nextStatus = input.status as BusinessStatus;
  if (!ALLOWED_ADMIN_BUSINESS_TRANSITIONS[current.status].includes(nextStatus)) {
    throw new AppError(
      `A ${current.status.toLowerCase()} business cannot move directly to ${nextStatus.toLowerCase()}.`,
      "BUSINESS_STATUS_TRANSITION_INVALID",
      409
    );
  }

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { status: nextStatus },
    include: BUSINESS_INCLUDE
  });
  await recordPlatformAdminActivity({
    actorUserId,
    action: `BUSINESS_${nextStatus}`,
    targetType: "BUSINESS",
    targetId: businessId,
    summary: `Changed ${business.name} from ${current.status} to ${nextStatus}.`,
    metadata: { previousStatus: current.status, status: nextStatus, reason: input.reason }
  });
  return { business: toBusinessDetail(business) };
}

export async function updateAdminBusiness(
  actorUserId: string,
  businessId: string,
  input: UpdateBusinessInput
) {
  await assertBusinessExists(businessId);
  const business = await prisma.business.update({
    where: { id: businessId },
    data: input,
    include: BUSINESS_INCLUDE
  });
  await recordPlatformAdminActivity({
    actorUserId,
    action: "BUSINESS_UPDATED",
    targetType: "BUSINESS",
    targetId: businessId,
    summary: `Updated ${business.name}.`,
    metadata: { fields: Object.keys(input).sort() }
  });
  return { business: toBusinessDetail(business) };
}

export async function cleanupExpiredStaffInvitations(): Promise<{ expired: number }> {
  const result = await prisma.staffInvitation.updateMany({
    where: {
      status: StaffInvitationStatus.PENDING,
      expiresAt: { lte: new Date() }
    },
    data: { status: StaffInvitationStatus.EXPIRED }
  });

  return { expired: result.count };
}

async function changeMembershipStatus(
  actor: Actor,
  businessId: string,
  membershipId: string,
  status: BusinessMembershipStatus
) {
  const context = await getBusinessContext(actor, businessId);
  const target = await findMembershipInBusiness(businessId, membershipId);
  assertCanManageMembership(context.membership, target, actor.userId);

  const updated = await prisma.businessMembership.update({
    where: { id: target.id },
    data: { status },
    include: { user: true, branchAccess: { include: { branch: true } } }
  });

  return { membership: toMembershipSummary(updated) };
}

async function getBusinessContext(
  actor: Actor,
  businessId: string,
  options: { allowInactive?: boolean } = {}
) {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: { businessId, userId: actor.userId }
    },
    include: {
      user: true,
      branchAccess: { include: { branch: true } },
      business: { include: BUSINESS_INCLUDE }
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

  if (!options.allowInactive && membership.business.status !== BusinessStatus.ACTIVE) {
    const status = membership.business.status;
    const messages: Record<BusinessStatus, string> = {
      PENDING: "This business is pending platform review.",
      ACTIVE: "Business access denied.",
      SUSPENDED: "This business is suspended.",
      REJECTED: "This business application was not approved.",
      ARCHIVED: "This business is archived."
    };
    throw new AppError(messages[status], `BUSINESS_${status}`, 403);
  }

  return { business: membership.business, membership };
}

async function getAccessibleBranchIds(
  membership: BusinessMembership & {
    branchAccess: { branchId: string; branch: Branch }[];
  }
): Promise<string[] | null> {
  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  ) {
    return null;
  }

  return membership.branchAccess
    .filter((access) => access.branch.status === BranchStatus.ACTIVE)
    .map((access) => access.branchId);
}

async function assertBranchAccess(
  membership: BusinessMembership & {
    branchAccess: { branchId: string; branch: Branch }[];
  },
  branchId: string
) {
  const branch = await assertBranchBelongsToBusiness(membership.businessId, branchId);
  const accessibleBranchIds = await getAccessibleBranchIds(membership);

  if (accessibleBranchIds && !accessibleBranchIds.includes(branchId)) {
    throw new AppError("Branch access denied.", "BRANCH_ACCESS_DENIED", 403);
  }

  if (
    branch.status !== BranchStatus.ACTIVE &&
    membership.role !== BusinessMemberRole.OWNER &&
    membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new AppError("Branch access denied.", "BRANCH_ACCESS_DENIED", 403);
  }
}

async function assertBranchBelongsToBusiness(
  businessId: string,
  branchId: string
): Promise<Branch> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId }
  });

  if (!branch) {
    throw new AppError("Branch was not found.", "BRANCH_NOT_FOUND", 404);
  }

  return branch;
}

async function assertBranchesBelongToBusiness(
  businessId: string,
  branchIds: string[]
): Promise<void> {
  if (branchIds.length === 0) {
    return;
  }

  const uniqueBranchIds = [...new Set(branchIds)];
  const branches = await prisma.branch.findMany({
    where: { businessId, id: { in: uniqueBranchIds } },
    select: { id: true }
  });

  if (branches.length !== uniqueBranchIds.length) {
    throw new AppError("Branch was not found.", "BRANCH_NOT_FOUND", 404);
  }
}

async function findMembershipInBusiness(
  businessId: string,
  membershipId: string
): Promise<
  BusinessMembership & {
    user: User;
    branchAccess: { branch: Branch }[];
  }
> {
  const membership = await prisma.businessMembership.findFirst({
    where: { id: membershipId, businessId },
    include: { user: true, branchAccess: { include: { branch: true } } }
  });

  if (!membership) {
    throw new AppError("Membership was not found.", "MEMBERSHIP_NOT_FOUND", 404);
  }

  return membership;
}

async function findInvitationInBusiness(
  businessId: string,
  invitationId: string
): Promise<
  StaffInvitation & {
    branchAccess: { branch: Branch }[];
    invitedBy: User;
    acceptedBy?: User | null;
  }
> {
  const invitation = await prisma.staffInvitation.findFirst({
    where: { id: invitationId, businessId },
    include: {
      branchAccess: { include: { branch: true } },
      invitedBy: true,
      acceptedBy: true
    }
  });

  if (!invitation) {
    throw new AppError("Invitation was not found.", "INVITATION_NOT_FOUND", 404);
  }

  return invitation;
}

async function findInvitationByToken(
  rawToken: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const invitation = await tx.staffInvitation.findUnique({
    where: { tokenHash: hashStaffInvitationToken(rawToken) },
    include: {
      business: true,
      invitedBy: true,
      acceptedBy: true,
      branchAccess: { include: { branch: true } }
    }
  });

  if (!invitation) {
    throw new AppError(
      "This invitation link is invalid.",
      "INVITATION_TOKEN_INVALID",
      400
    );
  }

  return invitation;
}

function assertInvitationCanBeAccepted(
  invitation: StaffInvitation & { business: Business }
): void {
  if (invitation.status === StaffInvitationStatus.ACCEPTED) {
    throw new AppError(
      "This invitation has already been accepted.",
      "INVITATION_ALREADY_ACCEPTED",
      409
    );
  }

  if (invitation.status === StaffInvitationStatus.CANCELLED) {
    throw new AppError("This invitation was cancelled.", "INVITATION_CANCELLED", 409);
  }

  if (
    invitation.status === StaffInvitationStatus.EXPIRED ||
    invitation.expiresAt <= new Date()
  ) {
    void markInvitationExpired(invitation.id);
    throw new AppError("This invitation has expired.", "INVITATION_EXPIRED", 400);
  }

  if (invitation.business.status !== BusinessStatus.ACTIVE) {
    throw new AppError("This business is not active.", "BUSINESS_NOT_ACTIVE", 403);
  }
}

function assertInvitationEmailMatches(
  invitation: Pick<StaffInvitation, "invitedEmail">,
  email: string
): void {
  if (invitation.invitedEmail !== email.toLowerCase()) {
    throw new AppError(
      "This invitation belongs to another email address.",
      "INVITATION_EMAIL_MISMATCH",
      403
    );
  }
}

async function applyInvitation(
  tx: Prisma.TransactionClient,
  invitation: StaffInvitation & {
    branchAccess: { branchId: string }[];
  },
  userId: string
) {
  const now = new Date();
  const existing = await tx.businessMembership.findUnique({
    where: {
      businessId_userId: {
        businessId: invitation.businessId,
        userId
      }
    }
  });

  if (existing && existing.role === BusinessMemberRole.OWNER) {
    throw new AppError("The owner role is protected.", "OWNER_ROLE_PROTECTED", 409);
  }

  const membership = existing
    ? await tx.businessMembership.update({
        where: { id: existing.id },
        data: {
          role: invitation.role,
          status: BusinessMembershipStatus.ACTIVE,
          allBranchesAccess: invitation.allBranchesAccess,
          invitedByUserId: invitation.invitedByUserId,
          joinedAt: existing.joinedAt ?? now
        },
        include: { user: true, branchAccess: { include: { branch: true } } }
      })
    : await tx.businessMembership.create({
        data: {
          businessId: invitation.businessId,
          userId,
          role: invitation.role,
          status: BusinessMembershipStatus.ACTIVE,
          allBranchesAccess: invitation.allBranchesAccess,
          invitedByUserId: invitation.invitedByUserId,
          joinedAt: now
        },
        include: { user: true, branchAccess: { include: { branch: true } } }
      });

  await tx.membershipBranchAccess.deleteMany({
    where: { membershipId: membership.id }
  });

  if (!invitation.allBranchesAccess) {
    await tx.membershipBranchAccess.createMany({
      data: invitation.branchAccess.map((branch) => ({
        membershipId: membership.id,
        branchId: branch.branchId
      })),
      skipDuplicates: true
    });
  }

  await tx.staffInvitation.update({
    where: { id: invitation.id },
    data: {
      status: StaffInvitationStatus.ACCEPTED,
      acceptedByUserId: userId,
      acceptedAt: now
    }
  });

  return tx.businessMembership.findUniqueOrThrow({
    where: { id: membership.id },
    include: { user: true, branchAccess: { include: { branch: true } } }
  });
}

function assertCanManageBusiness(membership: Pick<BusinessMembership, "role">): void {
  if (
    membership.role !== BusinessMemberRole.OWNER &&
    membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Business role access is required.",
      "BUSINESS_ROLE_REQUIRED",
      403
    );
  }
}

function assertCanManageBranches(membership: Pick<BusinessMembership, "role">): void {
  assertCanManageBusiness(membership);
}

function assertCanManageInvitations(membership: Pick<BusinessMembership, "role">): void {
  assertCanManageBusiness(membership);
}

function assertCanInviteRole(
  actorMembership: Pick<BusinessMembership, "role">,
  targetRole: BusinessMemberRole
): void {
  if (targetRole === BusinessMemberRole.OWNER) {
    throw new AppError("The owner role is protected.", "OWNER_ROLE_PROTECTED", 409);
  }

  if (
    targetRole === BusinessMemberRole.ADMIN &&
    actorMembership.role !== BusinessMemberRole.OWNER
  ) {
    throw new AppError(
      "Only the owner can assign business administrators.",
      "ROLE_CHANGE_FORBIDDEN",
      403
    );
  }

  assertCanManageInvitations(actorMembership);
}

function assertCanManageMembershipRole(
  actorMembership: Pick<BusinessMembership, "id" | "role">,
  targetMembership: Pick<BusinessMembership, "id" | "role" | "userId">,
  newRole: BusinessMemberRole,
  actorUserId: string
): void {
  assertCanManageMembership(actorMembership, targetMembership, actorUserId);
  assertCanInviteRole(actorMembership, newRole);

  if (targetMembership.id === actorMembership.id) {
    throw new AppError(
      "You cannot change your own protected role.",
      "ROLE_CHANGE_FORBIDDEN",
      403
    );
  }
}

function assertCanManageMembership(
  actorMembership: Pick<BusinessMembership, "id" | "role">,
  targetMembership: Pick<BusinessMembership, "id" | "role" | "userId">,
  actorUserId: string
): void {
  assertCanManageBusiness(actorMembership);

  if (targetMembership.role === BusinessMemberRole.OWNER) {
    throw new AppError("The owner role is protected.", "OWNER_ROLE_PROTECTED", 409);
  }

  if (
    targetMembership.userId === actorUserId ||
    targetMembership.id === actorMembership.id
  ) {
    throw new AppError(
      "You cannot modify your own membership.",
      "ROLE_CHANGE_FORBIDDEN",
      403
    );
  }

  if (
    actorMembership.role === BusinessMemberRole.ADMIN &&
    targetMembership.role === BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Only the owner can modify administrators.",
      "ROLE_CHANGE_FORBIDDEN",
      403
    );
  }
}

function permissionsFor(role: BusinessMemberRole) {
  return {
    canManageBusiness:
      role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN,
    canManageBranches:
      role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN,
    canManageStaff:
      role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN,
    canAssignAdmin: role === BusinessMemberRole.OWNER
  };
}

async function countBranchStaff(
  branches: Pick<Branch, "id" | "businessId">[]
): Promise<Map<string, number>> {
  if (branches.length === 0) {
    return new Map();
  }

  const branchIds = branches.map((branch) => branch.id);
  const businessIds = [...new Set(branches.map((branch) => branch.businessId))];
  const explicitCounts = await prisma.membershipBranchAccess.groupBy({
    by: ["branchId"],
    where: {
      branchId: { in: branchIds },
      membership: { status: BusinessMembershipStatus.ACTIVE }
    },
    _count: { membershipId: true }
  });
  const allBranchCounts = await prisma.businessMembership.groupBy({
    by: ["businessId"],
    where: {
      businessId: { in: businessIds },
      status: BusinessMembershipStatus.ACTIVE,
      allBranchesAccess: true
    },
    _count: { id: true }
  });

  const result = new Map<string, number>();
  const allBranchCountByBusiness = new Map(
    allBranchCounts.map((count) => [count.businessId, count._count.id])
  );

  branches.forEach((branch) => {
    result.set(branch.id, allBranchCountByBusiness.get(branch.businessId) ?? 0);
  });

  explicitCounts.forEach((count) => {
    result.set(
      count.branchId,
      (result.get(count.branchId) ?? 0) + count._count.membershipId
    );
  });

  return result;
}

function toBusinessSummary(
  business: Business & {
    branches?: Pick<Branch, "id" | "status" | "isPrimary">[];
    memberships?: Pick<BusinessMembership, "id" | "status">[];
    invitations?: Pick<StaffInvitation, "id" | "status">[];
  }
) {
  return {
    id: business.id,
    name: business.name,
    industry: business.industry,
    email: business.email,
    phone: business.phone,
    website: business.website,
    logoUrl: business.logoUrl,
    country: business.country,
    city: business.city,
    district: business.district,
    addressLine: business.addressLine,
    timezone: business.timezone,
    status: business.status,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
    counts: {
      branches: business.branches?.length ?? 0,
      activeBranches:
        business.branches?.filter((branch) => branch.status === BranchStatus.ACTIVE)
          .length ?? 0,
      staff:
        business.memberships?.filter(
          (membership) => membership.status === BusinessMembershipStatus.ACTIVE
        ).length ?? 0,
      pendingInvitations:
        business.invitations?.filter(
          (invitation) => invitation.status === StaffInvitationStatus.PENDING
        ).length ?? 0
    }
  };
}

function toBusinessDetail(
  business: Business & {
    branches: Branch[];
    memberships: (BusinessMembership & { user?: User })[];
    invitations: StaffInvitation[];
    createdBy?: User;
  }
) {
  const summary = toBusinessSummary(business);
  const primaryBranch = business.branches.find((branch) => branch.isPrimary) ?? null;
  const ownerMembership = business.memberships.find(
    (membership) => membership.role === BusinessMemberRole.OWNER
  );

  return {
    ...summary,
    description: business.description,
    primaryBranch: primaryBranch ? toBranchSummary(primaryBranch, 0) : null,
    owner: ownerMembership?.user
      ? {
          id: ownerMembership.user.id,
          firstName: ownerMembership.user.firstName,
          lastName: ownerMembership.user.lastName,
          email: ownerMembership.user.email
        }
      : null,
    createdBy: business.createdBy
      ? {
          id: business.createdBy.id,
          firstName: business.createdBy.firstName,
          lastName: business.createdBy.lastName,
          email: business.createdBy.email
        }
      : null
  };
}

function toBranchSummary(branch: Branch, staffCount: number) {
  return {
    id: branch.id,
    businessId: branch.businessId,
    name: branch.name,
    code: branch.code,
    addressLine: branch.addressLine,
    city: branch.city,
    district: branch.district,
    country: branch.country,
    phone: branch.phone,
    email: branch.email,
    isPrimary: branch.isPrimary,
    status: branch.status,
    staffCount,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString()
  };
}

function toMembershipSummary(
  membership: BusinessMembership & {
    user?: User;
    branchAccess?: { branch: Branch }[];
  }
) {
  return {
    id: membership.id,
    businessId: membership.businessId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    allBranchesAccess: membership.allBranchesAccess,
    joinedAt: membership.joinedAt?.toISOString() ?? null,
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
    user: membership.user
      ? {
          id: membership.user.id,
          email: membership.user.email,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          platformRole: membership.user.role
        }
      : null,
    branches:
      membership.branchAccess?.map((access) => ({
        id: access.branch.id,
        name: access.branch.name,
        code: access.branch.code,
        status: access.branch.status
      })) ?? []
  };
}

function toInvitationSummary(
  invitation: StaffInvitation & {
    branchAccess?: { branch: Branch }[];
    invitedBy?: User;
    acceptedBy?: User | null;
  }
) {
  return {
    id: invitation.id,
    businessId: invitation.businessId,
    invitedEmail: invitation.invitedEmail,
    role: invitation.role,
    status: invitation.status,
    allBranchesAccess: invitation.allBranchesAccess,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    cancelledAt: invitation.cancelledAt?.toISOString() ?? null,
    lastSentAt: invitation.lastSentAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
    branches:
      invitation.branchAccess?.map((access) => ({
        id: access.branch.id,
        name: access.branch.name,
        code: access.branch.code,
        status: access.branch.status
      })) ?? [],
    invitedBy: invitation.invitedBy
      ? {
          id: invitation.invitedBy.id,
          firstName: invitation.invitedBy.firstName,
          lastName: invitation.invitedBy.lastName,
          email: invitation.invitedBy.email
        }
      : null,
    acceptedBy: invitation.acceptedBy
      ? {
          id: invitation.acceptedBy.id,
          firstName: invitation.acceptedBy.firstName,
          lastName: invitation.acceptedBy.lastName,
          email: invitation.acceptedBy.email
        }
      : null
  };
}

function toInvitationPreview(
  invitation: StaffInvitation & {
    business: Business;
    invitedBy: User;
    branchAccess: { branch: Branch }[];
  }
) {
  return {
    business: {
      id: invitation.business.id,
      name: invitation.business.name,
      logoUrl: invitation.business.logoUrl,
      city: invitation.business.city,
      country: invitation.business.country
    },
    invitedEmail: invitation.invitedEmail,
    role: invitation.role,
    allBranchesAccess: invitation.allBranchesAccess,
    branches: invitation.branchAccess.map((access) => ({
      id: access.branch.id,
      name: access.branch.name,
      code: access.branch.code
    })),
    invitedBy: {
      firstName: invitation.invitedBy.firstName,
      lastName: invitation.invitedBy.lastName
    },
    expiresAt: invitation.expiresAt.toISOString()
  };
}

function branchCreateData(
  input: CreateBranchInput | CreateBusinessInput["primaryBranch"]
) {
  return {
    name: input.name,
    code: input.code,
    addressLine: input.addressLine,
    city: input.city,
    district: input.district,
    country: input.country,
    phone: input.phone,
    email: input.email,
    status: BranchStatus.ACTIVE
  };
}

async function sendInvitationEmail(
  invitation: StaffInvitation & {
    business: Business;
    invitedBy: User;
    branchAccess: { branch: Branch }[];
  },
  rawToken: string
): Promise<void> {
  const email = buildStaffInvitationEmail({
    business: invitation.business,
    invitation,
    inviter: invitation.invitedBy,
    branches: invitation.branchAccess.map((access) => access.branch),
    rawToken
  });

  await sendEmail({
    to: invitation.invitedEmail,
    ...email
  });
}

async function markInvitationExpired(invitationId: string): Promise<void> {
  await prisma.staffInvitation.updateMany({
    where: { id: invitationId, status: StaffInvitationStatus.PENDING },
    data: { status: StaffInvitationStatus.EXPIRED }
  });
}

async function assertBusinessExists(businessId: string): Promise<void> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true }
  });

  if (!business) {
    throw new AppError("Business was not found.", "BUSINESS_NOT_FOUND", 404);
  }
}

function offset(query: Pick<Pagination, "page" | "pageSize">): number {
  return (query.page - 1) * query.pageSize;
}

function paginationResult(total: number, query: Pick<Pagination, "page" | "pageSize">) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize))
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof PrismaRuntime.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function resolveGoogleNames(
  displayName: string | undefined,
  givenName: string | undefined,
  familyName: string | undefined
): { firstName: string; lastName: string } {
  if (givenName && familyName) {
    return { firstName: givenName, lastName: familyName };
  }

  if (displayName) {
    const [firstName, ...rest] = displayName.trim().split(/\s+/);
    const lastName = rest.join(" ");

    if (firstName && lastName) {
      return { firstName, lastName };
    }
  }

  return {
    firstName: givenName ?? "Invited",
    lastName: familyName ?? "Staff"
  };
}
