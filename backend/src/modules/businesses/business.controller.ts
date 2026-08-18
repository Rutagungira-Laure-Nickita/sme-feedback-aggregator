import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { setAuthCookies } from "../auth/auth.cookies.js";
import {
  acceptInvitationWithGoogle,
  acceptInvitationWithPassword,
  acceptInvitationWithSession,
  activateBranch,
  cancelStaffInvitation,
  createAdminBusiness,
  createBranch,
  createBusiness,
  createStaffInvitation,
  deactivateBranch,
  getAdminBusiness,
  getBranch,
  getBusiness,
  getMembership,
  listAdminBusinesses,
  listBranches,
  listInvitations,
  listMemberships,
  listMyBusinesses,
  previewStaffInvitation,
  reactivateMembership,
  removeMembership,
  resendStaffInvitation,
  setPrimaryBranch,
  suspendMembership,
  updateBranch,
  updateBusiness,
  updateAdminBusiness,
  setAdminBusinessStatus,
  updateMembershipBranchAccess,
  updateMembershipRole
} from "./business.service.js";
import {
  acceptInvitationGoogleSchema,
  acceptInvitationPasswordSchema,
  acceptInvitationSessionSchema,
  adminBusinessStatusSchema,
  adminCreateBusinessSchema,
  adminBusinessListQuerySchema,
  branchIdParamsSchema,
  branchListQuerySchema,
  businessIdParamsSchema,
  businessMineQuerySchema,
  createBranchSchema,
  createBusinessSchema,
  createStaffInvitationSchema,
  invitationIdParamsSchema,
  invitationListQuerySchema,
  invitationTokenQuerySchema,
  membershipIdParamsSchema,
  membershipListQuerySchema,
  updateBranchSchema,
  updateBusinessSchema,
  adminUpdateBusinessSchema,
  updateMembershipBranchAccessSchema,
  updateMembershipRoleSchema
} from "./business.schema.js";

export async function listMyBusinessesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const query = parseInput(businessMineQuerySchema.safeParse(request.query));
    const result = await listMyBusinesses(actor, query);
    sendSuccess(response, "Businesses loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function createBusinessController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const input = parseInput(createBusinessSchema.safeParse(request.body));
    const result = await createBusiness(actor, input);
    sendSuccess(response, "Business created", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getBusinessController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const result = await getBusiness(actor, params.businessId);
    sendSuccess(response, "Business loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function updateBusinessController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const input = parseInput(updateBusinessSchema.safeParse(request.body));
    const result = await updateBusiness(actor, params.businessId, input);
    sendSuccess(response, "Business updated", result);
  } catch (error) {
    next(error);
  }
}

export async function listBranchesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const query = parseInput(branchListQuerySchema.safeParse(request.query));
    const result = await listBranches(actor, params.businessId, query);
    sendSuccess(response, "Branches loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function createBranchController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const input = parseInput(createBranchSchema.safeParse(request.body));
    const result = await createBranch(actor, params.businessId, input);
    sendSuccess(response, "Branch created", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getBranchController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(branchIdParamsSchema.safeParse(request.params));
    const result = await getBranch(actor, params.businessId, params.branchId);
    sendSuccess(response, "Branch loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function updateBranchController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(branchIdParamsSchema.safeParse(request.params));
    const input = parseInput(updateBranchSchema.safeParse(request.body));
    const result = await updateBranch(actor, params.businessId, params.branchId, input);
    sendSuccess(response, "Branch updated", result);
  } catch (error) {
    next(error);
  }
}

export async function setPrimaryBranchController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(branchIdParamsSchema.safeParse(request.params));
    const result = await setPrimaryBranch(actor, params.businessId, params.branchId);
    sendSuccess(response, "Primary branch updated", result);
  } catch (error) {
    next(error);
  }
}

export async function activateBranchController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(branchIdParamsSchema.safeParse(request.params));
    const result = await activateBranch(actor, params.businessId, params.branchId);
    sendSuccess(response, "Branch activated", result);
  } catch (error) {
    next(error);
  }
}

export async function deactivateBranchController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(branchIdParamsSchema.safeParse(request.params));
    const result = await deactivateBranch(actor, params.businessId, params.branchId);
    sendSuccess(response, "Branch deactivated", result);
  } catch (error) {
    next(error);
  }
}

export async function listMembershipsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const query = parseInput(membershipListQuerySchema.safeParse(request.query));
    const result = await listMemberships(actor, params.businessId, query);
    sendSuccess(response, "Memberships loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function getMembershipController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(membershipIdParamsSchema.safeParse(request.params));
    const result = await getMembership(actor, params.businessId, params.membershipId);
    sendSuccess(response, "Membership loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function updateMembershipRoleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(membershipIdParamsSchema.safeParse(request.params));
    const input = parseInput(updateMembershipRoleSchema.safeParse(request.body));
    const result = await updateMembershipRole(
      actor,
      params.businessId,
      params.membershipId,
      input.role
    );
    sendSuccess(response, "Membership role updated", result);
  } catch (error) {
    next(error);
  }
}

export async function updateMembershipBranchAccessController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(membershipIdParamsSchema.safeParse(request.params));
    const input = parseInput(updateMembershipBranchAccessSchema.safeParse(request.body));
    const result = await updateMembershipBranchAccess(
      actor,
      params.businessId,
      params.membershipId,
      input
    );
    sendSuccess(response, "Membership branch access updated", result);
  } catch (error) {
    next(error);
  }
}

export async function suspendMembershipController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(membershipIdParamsSchema.safeParse(request.params));
    const result = await suspendMembership(actor, params.businessId, params.membershipId);
    sendSuccess(response, "Membership suspended", result);
  } catch (error) {
    next(error);
  }
}

export async function reactivateMembershipController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(membershipIdParamsSchema.safeParse(request.params));
    const result = await reactivateMembership(
      actor,
      params.businessId,
      params.membershipId
    );
    sendSuccess(response, "Membership reactivated", result);
  } catch (error) {
    next(error);
  }
}

export async function removeMembershipController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(membershipIdParamsSchema.safeParse(request.params));
    const result = await removeMembership(actor, params.businessId, params.membershipId);
    sendSuccess(response, "Membership removed", result);
  } catch (error) {
    next(error);
  }
}

export async function listInvitationsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const query = parseInput(invitationListQuerySchema.safeParse(request.query));
    const result = await listInvitations(actor, params.businessId, query);
    sendSuccess(response, "Invitations loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function createStaffInvitationController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const input = parseInput(createStaffInvitationSchema.safeParse(request.body));
    const result = await createStaffInvitation(actor, params.businessId, input);
    sendSuccess(response, "Invitation created", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function resendStaffInvitationController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(invitationIdParamsSchema.safeParse(request.params));
    const result = await resendStaffInvitation(
      actor,
      params.businessId,
      params.invitationId
    );
    sendSuccess(response, "Invitation resent", result);
  } catch (error) {
    next(error);
  }
}

export async function cancelStaffInvitationController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(invitationIdParamsSchema.safeParse(request.params));
    const result = await cancelStaffInvitation(
      actor,
      params.businessId,
      params.invitationId
    );
    sendSuccess(response, "Invitation cancelled", result);
  } catch (error) {
    next(error);
  }
}

export async function previewStaffInvitationController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = parseInput(invitationTokenQuerySchema.safeParse(request.query));
    const result = await previewStaffInvitation(query.token);
    sendSuccess(response, "Invitation loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitationSessionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const input = parseInput(acceptInvitationSessionSchema.safeParse(request.body));
    const result = await acceptInvitationWithSession(actor, input.token);
    sendSuccess(response, "Invitation accepted", result);
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitationPasswordController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseInput(acceptInvitationPasswordSchema.safeParse(request.body));
    const result = await acceptInvitationWithPassword(input, getRequestMetadata(request));
    setAuthCookies(response, result);
    sendSuccess(
      response,
      "Invitation accepted and account created",
      { user: result.user, businessId: result.businessId },
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitationGoogleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseInput(acceptInvitationGoogleSchema.safeParse(request.body));
    const result = await acceptInvitationWithGoogle(input, getRequestMetadata(request));
    setAuthCookies(response, result);
    sendSuccess(response, "Invitation accepted with Google", {
      user: result.user,
      businessId: result.businessId
    });
  } catch (error) {
    next(error);
  }
}

export async function listAdminBusinessesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = parseInput(adminBusinessListQuerySchema.safeParse(request.query));
    const result = await listAdminBusinesses(query);
    sendSuccess(response, "Businesses loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminBusinessController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const result = await getAdminBusiness(params.businessId);
    sendSuccess(response, "Business loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function createAdminBusinessController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseInput(adminCreateBusinessSchema.safeParse(request.body));
    const result = await createAdminBusiness(getActor(request).userId, input);
    sendSuccess(response, "Business created for approval", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminBusinessController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const input = parseInput(adminUpdateBusinessSchema.safeParse(request.body));
    const result = await updateAdminBusiness(
      getActor(request).userId,
      params.businessId,
      input
    );
    sendSuccess(response, "Business updated", result);
  } catch (error) {
    next(error);
  }
}

export async function setAdminBusinessStatusController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(businessIdParamsSchema.safeParse(request.params));
    const input = parseInput(adminBusinessStatusSchema.safeParse(request.body));
    const result = await setAdminBusinessStatus(
      getActor(request).userId,
      params.businessId,
      input
    );
    sendSuccess(response, "Business status updated", result);
  } catch (error) {
    next(error);
  }
}

function getActor(request: Request) {
  if (!request.auth) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }

  return {
    userId: request.auth.id,
    platformRole: request.auth.role
  };
}

function getRequestMetadata(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent")
  };
}

function parseInput<T>(
  result:
    | { success: true; data: T }
    | {
        success: false;
      }
): T {
  if (!result.success) {
    throw new AppError("Request validation failed.", "VALIDATION_ERROR", 400);
  }

  return result.data;
}
