import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { businessAIParamsSchema, feedbackAIParamsSchema } from "./ai-analysis.schemas.js";
import {
  applyAIcategorySuggestion,
  dismissAIcategorySuggestion,
  getBusinessAIStatus,
  getFeedbackAIAnalysis,
  requestBusinessAIBackfill,
  retryFeedbackAIAnalysis
} from "./ai-analysis.service.js";

function getActor(request: Request): { userId: string } {
  if (!request.auth) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }
  return { userId: request.auth.id };
}

function parseInput<T>(result: { success: boolean; data?: T; error?: unknown }): T {
  if (!result.success) {
    throw new AppError("Invalid AI analysis request.", "AI_REQUEST_INVALID", 400);
  }
  return result.data as T;
}

export async function getFeedbackAIAnalysisController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackAIParamsSchema.safeParse(request.params));
    const result = await getFeedbackAIAnalysis(
      actor,
      params.businessId,
      params.feedbackId
    );
    sendSuccess(response, "AI analysis loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function retryFeedbackAIAnalysisController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackAIParamsSchema.safeParse(request.params));
    const result = await retryFeedbackAIAnalysis(
      actor,
      params.businessId,
      params.feedbackId
    );
    sendSuccess(response, "AI retry queued", result);
  } catch (error) {
    next(error);
  }
}

export async function applyAICategoryController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackAIParamsSchema.safeParse(request.params));
    const result = await applyAIcategorySuggestion(
      actor,
      params.businessId,
      params.feedbackId
    );
    sendSuccess(response, "AI category suggestion applied", result);
  } catch (error) {
    next(error);
  }
}

export async function dismissAICategoryController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackAIParamsSchema.safeParse(request.params));
    const result = await dismissAIcategorySuggestion(
      actor,
      params.businessId,
      params.feedbackId
    );
    sendSuccess(response, "AI category suggestion dismissed", result);
  } catch (error) {
    next(error);
  }
}

export async function getBusinessAIStatusController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessAIParamsSchema.safeParse(request.params));
    const result = await getBusinessAIStatus(actor, params.businessId);
    sendSuccess(response, "Business AI status loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function requestBusinessAIBackfillController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessAIParamsSchema.safeParse(request.params));
    const result = await requestBusinessAIBackfill(actor, params.businessId);
    sendSuccess(response, "Existing feedback analysis queued", result);
  } catch (error) {
    next(error);
  }
}
