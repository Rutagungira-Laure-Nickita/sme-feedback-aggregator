import { Router } from "express";
import { submitManualFeedbackController } from "./manual-feedback.controller.js";

export const manualFeedbackRouter = Router({ mergeParams: true });

manualFeedbackRouter.post("/", submitManualFeedbackController);
