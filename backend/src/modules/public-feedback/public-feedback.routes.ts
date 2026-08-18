import { Router } from "express";
import {
  publicFeedbackRateLimiter,
  publicQrFeedbackRateLimiter
} from "../../middleware/rate-limit.middleware.js";
import {
  getPublicFeedbackPortalController,
  getPublicFeedbackSettingsController,
  regeneratePublicFeedbackLinkController,
  submitPublicFeedbackController,
  updatePublicFeedbackSettingsController
} from "./public-feedback.controller.js";
import {
  createPublicFeedbackQrCodeController,
  getPublicFeedbackQrPortalController,
  listPublicFeedbackQrCodesController,
  regeneratePublicFeedbackQrCodeController,
  submitPublicFeedbackQrController,
  updatePublicFeedbackQrCodeController
} from "./public-feedback-qr.controller.js";

export const publicFeedbackSettingsRouter = Router({ mergeParams: true });
export const publicFeedbackRouter = Router();

publicFeedbackSettingsRouter.get("/", getPublicFeedbackSettingsController);
publicFeedbackSettingsRouter.patch("/", updatePublicFeedbackSettingsController);
publicFeedbackSettingsRouter.post("/regenerate", regeneratePublicFeedbackLinkController);
publicFeedbackSettingsRouter.get("/qr-codes", listPublicFeedbackQrCodesController);
publicFeedbackSettingsRouter.post("/qr-codes", createPublicFeedbackQrCodeController);
publicFeedbackSettingsRouter.post(
  "/qr-codes/:qrCodeId/regenerate",
  regeneratePublicFeedbackQrCodeController
);
publicFeedbackSettingsRouter.patch(
  "/qr-codes/:qrCodeId",
  updatePublicFeedbackQrCodeController
);

publicFeedbackRouter.get("/qr/:qrToken", getPublicFeedbackQrPortalController);
publicFeedbackRouter.post(
  "/qr/:qrToken",
  publicQrFeedbackRateLimiter,
  submitPublicFeedbackQrController
);
publicFeedbackRouter.get("/:portalToken", getPublicFeedbackPortalController);
publicFeedbackRouter.post(
  "/:portalToken",
  publicFeedbackRateLimiter,
  submitPublicFeedbackController
);
