import { Router } from "express";
import {
  updateStatusController,
  addNoteController,
  getActivityController,
  getWorkflowStatusController,
  updateAssignmentController,
  updateFeedbackCategoryController,
  updatePriorityController,
  getEligibleAssigneesController
} from "./feedback-workflow.controller.js";

export const feedbackWorkflowRouter = Router({ mergeParams: true });

// Phase 9: Status
feedbackWorkflowRouter.patch("/:feedbackId/status", updateStatusController);

// Phase 9: Notes
feedbackWorkflowRouter.post("/:feedbackId/notes", addNoteController);

// Phase 9: Activity
feedbackWorkflowRouter.get("/:feedbackId/activity", getActivityController);

// Phase 9: Workflow status
feedbackWorkflowRouter.get("/:feedbackId/workflow-status", getWorkflowStatusController);

// Phase 10: Assignment
feedbackWorkflowRouter.patch("/:feedbackId/assignment", updateAssignmentController);

// Phase 10: Feedback category
feedbackWorkflowRouter.patch("/:feedbackId/category", updateFeedbackCategoryController);

// Phase 10: Priority
feedbackWorkflowRouter.patch("/:feedbackId/priority", updatePriorityController);

// Phase 10: Eligible assignees
feedbackWorkflowRouter.get(
  "/:feedbackId/eligible-assignees",
  getEligibleAssigneesController
);
