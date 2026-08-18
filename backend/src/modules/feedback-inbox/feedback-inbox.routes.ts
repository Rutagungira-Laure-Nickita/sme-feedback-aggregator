import { Router } from "express";
import {
  listFeedbackController,
  getFeedbackDetailController
} from "./feedback-inbox.controller.js";

export const feedbackInboxRouter = Router({ mergeParams: true });

// GET /api/businesses/:businessId/feedback - List paginated feedback
feedbackInboxRouter.get("/", listFeedbackController);

// GET /api/businesses/:businessId/feedback/:feedbackId - Feedback detail
feedbackInboxRouter.get("/:feedbackId", getFeedbackDetailController);
