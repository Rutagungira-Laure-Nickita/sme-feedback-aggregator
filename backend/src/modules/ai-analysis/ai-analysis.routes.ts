import { Router } from "express";
import {
  applyAICategoryController,
  dismissAICategoryController,
  getBusinessAIStatusController,
  getFeedbackAIAnalysisController,
  requestBusinessAIBackfillController,
  retryFeedbackAIAnalysisController
} from "./ai-analysis.controller.js";

export const feedbackAIAnalysisRouter = Router({ mergeParams: true });
export const businessAIAnalysisRouter = Router({ mergeParams: true });

feedbackAIAnalysisRouter.get("/:feedbackId/ai-analysis", getFeedbackAIAnalysisController);
feedbackAIAnalysisRouter.post(
  "/:feedbackId/ai-analysis/retry",
  retryFeedbackAIAnalysisController
);
feedbackAIAnalysisRouter.post(
  "/:feedbackId/ai-category/apply",
  applyAICategoryController
);
feedbackAIAnalysisRouter.post(
  "/:feedbackId/ai-category/dismiss",
  dismissAICategoryController
);

businessAIAnalysisRouter.get("/status", getBusinessAIStatusController);
businessAIAnalysisRouter.post("/backfill", requestBusinessAIBackfillController);
