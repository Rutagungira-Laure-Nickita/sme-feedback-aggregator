import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  bulkCategorySchema,
  bulkDeleteSchema,
  bulkStatusSchema,
  feedbackEditSchema
} from "./feedback-management.schemas.js";
import {
  bulkCategorizeFeedback,
  bulkUpdateFeedbackStatus,
  deleteFeedbackSelection,
  deleteSingleFeedback,
  editFeedback
} from "./feedback-management.service.js";

function actor(request: Request) {
  if (!request.auth) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }
  return { userId: request.auth.id };
}

function parse<T>(
  schema: {
    safeParse: (input: unknown) => {
      success: boolean;
      data?: T;
      error?: { issues?: Array<{ path: PropertyKey[]; message: string }> };
    };
  },
  input: unknown
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      result.error?.issues
        ?.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ") ?? "Invalid feedback management input.",
      "FEEDBACK_MANAGEMENT_INPUT_INVALID",
      400
    );
  }
  return result.data as T;
}

export async function editFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const result = await editFeedback(
      actor(request),
      request.params.businessId ?? "",
      request.params.feedbackId ?? "",
      parse(feedbackEditSchema, request.body)
    );
    sendSuccess(response, "Feedback updated", result);
  } catch (error) {
    next(error);
  }
}

export async function deleteFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const result = await deleteSingleFeedback(
      actor(request),
      request.params.businessId ?? "",
      request.params.feedbackId ?? ""
    );
    sendSuccess(response, "Feedback removed", result);
  } catch (error) {
    next(error);
  }
}

export async function bulkStatusController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const result = await bulkUpdateFeedbackStatus(
      actor(request),
      request.params.businessId ?? "",
      parse(bulkStatusSchema, request.body)
    );
    sendSuccess(response, "Feedback statuses updated", result);
  } catch (error) {
    next(error);
  }
}

export async function bulkCategoryController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const result = await bulkCategorizeFeedback(
      actor(request),
      request.params.businessId ?? "",
      parse(bulkCategorySchema, request.body)
    );
    sendSuccess(response, "Feedback categories updated", result);
  } catch (error) {
    next(error);
  }
}

export async function bulkDeleteController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const result = await deleteFeedbackSelection(
      actor(request),
      request.params.businessId ?? "",
      parse(bulkDeleteSchema, request.body)
    );
    sendSuccess(response, "Feedback removed", result);
  } catch (error) {
    next(error);
  }
}
