import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  feedbackInboxQuerySchema,
  feedbackIdParamsSchema
} from "./feedback-inbox.schemas.js";
import type { FeedbackInboxQuery } from "./feedback-inbox.types.js";
import {
  listFeedback,
  getFeedbackDetail,
  getFeedbackDashboard
} from "./feedback-inbox.service.js";

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

    throw new AppError(message, "FEEDBACK_INBOX_QUERY_INVALID", 400);
  }

  return result.data as T;
}

export async function listFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const businessId = request.params.businessId ?? "";
    const query = parseInput(
      feedbackInboxQuerySchema.safeParse(request.query)
    ) as FeedbackInboxQuery;
    const result = await listFeedback(actor, businessId, query);
    sendSuccess(response, "Feedback loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function getFeedbackDetailController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(feedbackIdParamsSchema.safeParse(request.params));
    const result = await getFeedbackDetail(actor, params.businessId, params.feedbackId);
    sendSuccess(response, "Feedback details loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function getFeedbackDashboardController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getFeedbackDashboard(
      getActor(request),
      request.params.businessId ?? ""
    );
    sendSuccess(response, "Feedback dashboard loaded", result);
  } catch (error) {
    next(error);
  }
}
