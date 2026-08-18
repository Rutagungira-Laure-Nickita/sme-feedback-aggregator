import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  statusUpdateSchema,
  addNoteSchema,
  feedbackParamsSchema,
  assignmentSchema,
  feedbackCategoryUpdateSchema,
  priorityUpdateSchema
} from "./feedback-workflow.schemas.js";
import {
  updateStatus,
  addNote,
  getActivity,
  getFeedbackWithAvailableTransitions,
  updateAssignment,
  updateFeedbackCategory,
  updateFeedbackPriority,
  getEligibleAssignees
} from "./feedback-workflow.service.js";

function getActor(request: Request): { userId: string } {
  if (!request.auth) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }
  return { userId: request.auth.id };
}

function parseInput<T>(result: { success: boolean; data?: T; error?: unknown }): T {
  if (!result.success) {
    const zodError = result.error as
      { issues?: Array<{ path: (string | number)[]; message: string }> } | undefined;
    const message =
      zodError?.issues
        ?.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ") ?? "Invalid input.";
    throw new AppError(message, "FEEDBACK_WORKFLOW_QUERY_INVALID", 400);
  }
  return result.data as T;
}

export async function updateStatusController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const body = parseInput(statusUpdateSchema.safeParse(request.body));
    const result = await updateStatus(actor, params.businessId, params.feedbackId, body);
    sendSuccess(response, "Status updated successfully", result);
  } catch (error) {
    next(error);
  }
}

export async function addNoteController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const body = parseInput(addNoteSchema.safeParse(request.body));
    const result = await addNote(actor, params.businessId, params.feedbackId, body.note);
    sendSuccess(response, "Note added successfully", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getActivityController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const result = await getActivity(actor, params.businessId, params.feedbackId);
    sendSuccess(response, "Activity loaded successfully", result);
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowStatusController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const result = await getFeedbackWithAvailableTransitions(
      actor,
      params.businessId,
      params.feedbackId
    );
    sendSuccess(response, "Workflow status loaded", result);
  } catch (error) {
    next(error);
  }
}

// ─── Assignment (Phase 10) ──────────────────────────────

export async function updateAssignmentController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const body = parseInput(assignmentSchema.safeParse(request.body));
    const result = await updateAssignment(
      actor,
      params.businessId,
      params.feedbackId,
      body
    );
    sendSuccess(response, "Assignment updated", result);
  } catch (error) {
    next(error);
  }
}

// ─── Feedback Category (Phase 10) ───────────────────────

export async function updateFeedbackCategoryController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const body = parseInput(feedbackCategoryUpdateSchema.safeParse(request.body));
    const result = await updateFeedbackCategory(
      actor,
      params.businessId,
      params.feedbackId,
      body
    );
    sendSuccess(response, "Category updated", result);
  } catch (error) {
    next(error);
  }
}

// ─── Priority (Phase 10) ────────────────────────────────

export async function updatePriorityController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const body = parseInput(priorityUpdateSchema.safeParse(request.body));
    const result = await updateFeedbackPriority(
      actor,
      params.businessId,
      params.feedbackId,
      body
    );
    sendSuccess(response, "Priority updated", result);
  } catch (error) {
    next(error);
  }
}

// ─── Eligible Assignees (Phase 10) ──────────────────────

export async function getEligibleAssigneesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackParamsSchema.safeParse(request.params));
    const result = await getEligibleAssignees(
      actor,
      params.businessId,
      params.feedbackId
    );
    sendSuccess(response, "Eligible assignees loaded", result);
  } catch (error) {
    next(error);
  }
}
