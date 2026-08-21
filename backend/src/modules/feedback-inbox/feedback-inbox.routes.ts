import { Router } from "express";
import {
  listFeedbackController,
  getFeedbackDetailController,
  getFeedbackDashboardController
} from "./feedback-inbox.controller.js";
import {
  bulkCategoryController,
  bulkDeleteController,
  bulkStatusController,
  deleteFeedbackController,
  editFeedbackController
} from "./feedback-management.controller.js";

export const feedbackInboxRouter = Router({ mergeParams: true });

// GET /api/businesses/:businessId/feedback - List paginated feedback
feedbackInboxRouter.get("/", listFeedbackController);
feedbackInboxRouter.get("/dashboard", getFeedbackDashboardController);

feedbackInboxRouter.post("/bulk/status", bulkStatusController);
feedbackInboxRouter.post("/bulk/category", bulkCategoryController);
feedbackInboxRouter.post("/bulk/delete", bulkDeleteController);

// GET /api/businesses/:businessId/feedback/:feedbackId - Feedback detail
feedbackInboxRouter.get("/:feedbackId", getFeedbackDetailController);
feedbackInboxRouter.patch("/:feedbackId", editFeedbackController);
feedbackInboxRouter.delete("/:feedbackId", deleteFeedbackController);
