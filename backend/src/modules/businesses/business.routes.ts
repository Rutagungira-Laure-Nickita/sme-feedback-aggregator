import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requirePlatformAdmin } from "../../middleware/business-access.middleware.js";
import {
  aiAnalysisRateLimiter,
  manualFeedbackRateLimiter
} from "../../middleware/rate-limit.middleware.js";
import {
  acceptInvitationGoogleController,
  acceptInvitationPasswordController,
  acceptInvitationSessionController,
  activateBranchController,
  cancelStaffInvitationController,
  createAdminBusinessController,
  createBranchController,
  createBusinessController,
  createStaffInvitationController,
  deactivateBranchController,
  getAdminBusinessController,
  getBranchController,
  getBusinessController,
  getMembershipController,
  listAdminBusinessesController,
  listBranchesController,
  listInvitationsController,
  listMembershipsController,
  listMyBusinessesController,
  previewStaffInvitationController,
  reactivateMembershipController,
  removeMembershipController,
  resendStaffInvitationController,
  setPrimaryBranchController,
  suspendMembershipController,
  setAdminBusinessStatusController,
  updateAdminBusinessController,
  updateBranchController,
  updateBusinessController,
  updateMembershipBranchAccessController,
  updateMembershipRoleController
} from "./business.controller.js";
import { manualFeedbackRouter } from "../manual-feedback/index.js";
import { businessReportsRouter } from "../business-reports/index.js";
import { publicFeedbackSettingsRouter } from "../public-feedback/index.js";
import { feedbackInboxRouter } from "../feedback-inbox/index.js";
import { feedbackWorkflowRouter } from "../feedback-workflow/index.js";
import { feedbackCategoriesRouter } from "../feedback-categories/index.js";
import { customersRouter, feedbackCustomerRouter } from "../customers/index.js";
import {
  businessAIAnalysisRouter,
  feedbackAIAnalysisRouter
} from "../ai-analysis/index.js";
import {
  automationExecutionsRouter,
  automationRulesRouter
} from "../automation/index.js";
import {
  integrationConnectionsRouter,
  integrationProvidersRouter,
  integrationRunsRouter
} from "../integrations/index.js";

export const businessRouter = Router();
export const businessInvitationRouter = Router();

businessRouter.use(authMiddleware);

businessRouter.get("/mine", listMyBusinessesController);
businessRouter.post("/", createBusinessController);
businessRouter.use("/:businessId/public-feedback", publicFeedbackSettingsRouter);
businessRouter.use(
  "/:businessId/feedback/manual",
  manualFeedbackRateLimiter,
  manualFeedbackRouter
);
businessRouter.use("/:businessId/customers", customersRouter);
businessRouter.use("/:businessId/feedback", feedbackCustomerRouter);
businessRouter.use(
  "/:businessId/feedback",
  aiAnalysisRateLimiter,
  feedbackAIAnalysisRouter
);
businessRouter.use("/:businessId/feedback", feedbackInboxRouter);
businessRouter.use("/:businessId/ai", aiAnalysisRateLimiter, businessAIAnalysisRouter);
businessRouter.use("/:businessId/automation-rules", automationRulesRouter);
businessRouter.use("/:businessId/automation-executions", automationExecutionsRouter);
businessRouter.use("/:businessId/integration-providers", integrationProvidersRouter);
businessRouter.use("/:businessId/integrations", integrationConnectionsRouter);
businessRouter.use("/:businessId/integration-runs", integrationRunsRouter);
businessRouter.use("/:businessId/reports", businessReportsRouter);

// Phase 9 workflow routes — must come AFTER the inbox router to avoid /:feedbackId conflicts
businessRouter.use("/:businessId/feedback", feedbackWorkflowRouter);

// Phase 10: Category management routes at business level
businessRouter.use("/:businessId/feedback-categories", feedbackCategoriesRouter);

businessRouter.get("/:businessId", getBusinessController);
businessRouter.patch("/:businessId", updateBusinessController);

businessRouter.get("/:businessId/branches", listBranchesController);
businessRouter.post("/:businessId/branches", createBranchController);
businessRouter.get("/:businessId/branches/:branchId", getBranchController);
businessRouter.patch("/:businessId/branches/:branchId", updateBranchController);
businessRouter.post(
  "/:businessId/branches/:branchId/set-primary",
  setPrimaryBranchController
);
businessRouter.post("/:businessId/branches/:branchId/activate", activateBranchController);
businessRouter.post(
  "/:businessId/branches/:branchId/deactivate",
  deactivateBranchController
);

businessRouter.get("/:businessId/memberships", listMembershipsController);
businessRouter.get("/:businessId/memberships/:membershipId", getMembershipController);
businessRouter.patch(
  "/:businessId/memberships/:membershipId/role",
  updateMembershipRoleController
);
businessRouter.put(
  "/:businessId/memberships/:membershipId/branch-access",
  updateMembershipBranchAccessController
);
businessRouter.post(
  "/:businessId/memberships/:membershipId/suspend",
  suspendMembershipController
);
businessRouter.post(
  "/:businessId/memberships/:membershipId/reactivate",
  reactivateMembershipController
);
businessRouter.delete(
  "/:businessId/memberships/:membershipId",
  removeMembershipController
);

businessRouter.get("/:businessId/invitations", listInvitationsController);
businessRouter.post("/:businessId/invitations", createStaffInvitationController);
businessRouter.post(
  "/:businessId/invitations/:invitationId/resend",
  resendStaffInvitationController
);
businessRouter.delete(
  "/:businessId/invitations/:invitationId",
  cancelStaffInvitationController
);

businessInvitationRouter.get("/preview", previewStaffInvitationController);
businessInvitationRouter.post(
  "/accept/session",
  authMiddleware,
  acceptInvitationSessionController
);
businessInvitationRouter.post("/accept/password", acceptInvitationPasswordController);
businessInvitationRouter.post("/accept/google", acceptInvitationGoogleController);

export const adminBusinessRouter = Router();

adminBusinessRouter.use(authMiddleware, requirePlatformAdmin);
adminBusinessRouter.get("/", listAdminBusinessesController);
adminBusinessRouter.post("/", createAdminBusinessController);
adminBusinessRouter.get("/:businessId", getAdminBusinessController);
adminBusinessRouter.patch("/:businessId", updateAdminBusinessController);
adminBusinessRouter.post("/:businessId/status", setAdminBusinessStatusController);
