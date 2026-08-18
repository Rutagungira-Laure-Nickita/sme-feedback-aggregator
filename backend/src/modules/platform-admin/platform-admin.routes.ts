import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requirePlatformAdmin } from "../../middleware/business-access.middleware.js";
import {
  adminDashboardController,
  adminFeedbackController,
  adminFeedbackDetailController,
  adminFilterOptionsController,
  adminIntegrationsController,
  adminIntegrationActionController,
  adminIntegrationDetailController,
  adminPlatformSettingsController,
  adminReportExportController,
  adminReportPreviewController,
  adminSystemHealthController,
  adminUsersController,
  adminUserActionController,
  adminUserDetailController,
  updateAdminUserController,
  updateAdminPlatformSettingsController
} from "./platform-admin.controller.js";

export const platformAdminRouter = Router();

platformAdminRouter.use(authMiddleware, requirePlatformAdmin);
platformAdminRouter.get("/dashboard", adminDashboardController);
platformAdminRouter.get("/filter-options", adminFilterOptionsController);
platformAdminRouter.get("/users", adminUsersController);
platformAdminRouter.get("/users/:entityId", adminUserDetailController);
platformAdminRouter.patch("/users/:entityId", updateAdminUserController);
platformAdminRouter.post("/users/:entityId/action", adminUserActionController);
platformAdminRouter.get("/feedback", adminFeedbackController);
platformAdminRouter.get("/feedback/:entityId", adminFeedbackDetailController);
platformAdminRouter.get("/integrations", adminIntegrationsController);
platformAdminRouter.get("/integrations/:entityId", adminIntegrationDetailController);
platformAdminRouter.post(
  "/integrations/:entityId/action",
  adminIntegrationActionController
);
platformAdminRouter.get("/system-health", adminSystemHealthController);
platformAdminRouter.get("/settings", adminPlatformSettingsController);
platformAdminRouter.patch("/settings", updateAdminPlatformSettingsController);
platformAdminRouter.post("/reports/preview", adminReportPreviewController);
platformAdminRouter.post("/reports/export", adminReportExportController);
