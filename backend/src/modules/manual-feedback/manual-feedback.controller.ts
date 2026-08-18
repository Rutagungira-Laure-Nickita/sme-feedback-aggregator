import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { FEEDBACK_ERROR_CODES } from "../feedback-processing/index.js";
import { MANUAL_FEEDBACK_ERROR_CODES } from "./manual-feedback.errors.js";
import {
  manualFeedbackIdempotencyKeySchema,
  manualFeedbackParamsSchema,
  manualFeedbackRequestSchema
} from "./manual-feedback.schemas.js";
import { submitManualFeedback } from "./manual-feedback.service.js";

export async function submitManualFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const params = parseParams(manualFeedbackParamsSchema.safeParse(request.params));
    const idempotencyKey = parseIdempotencyKey(request.get("Idempotency-Key"));
    const input = parseBody(manualFeedbackRequestSchema.safeParse(request.body));
    const result = await submitManualFeedback(
      { userId: request.auth.id },
      params.businessId,
      input,
      idempotencyKey
    );

    sendSuccess(
      response,
      result.created ? "Manual feedback created" : "Manual feedback already processed",
      result,
      result.created ? 201 : 200
    );
  } catch (error) {
    next(error);
  }
}

function parseIdempotencyKey(value: string | undefined): string {
  if (value === undefined) {
    throw new AppError(
      "Idempotency-Key header is required.",
      MANUAL_FEEDBACK_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
      400
    );
  }

  const parsed = manualFeedbackIdempotencyKeySchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(
      "Idempotency-Key header is invalid.",
      MANUAL_FEEDBACK_ERROR_CODES.IDEMPOTENCY_KEY_INVALID,
      400
    );
  }

  return parsed.data;
}

function parseParams<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) {
    throw new AppError("Request validation failed.", "VALIDATION_ERROR", 400);
  }

  return result.data;
}

function parseBody<T>(
  result:
    | { success: true; data: T }
    | {
        success: false;
        error: {
          issues: { path: (string | number)[] }[];
        };
      }
): T {
  if (!result.success) {
    const sourceTypeIssue = result.error.issues.find(
      (issue) => issue.path[0] === "source" && issue.path[1] === "type"
    );

    if (sourceTypeIssue) {
      throw new AppError(
        "Manual feedback source type is invalid.",
        MANUAL_FEEDBACK_ERROR_CODES.SOURCE_INVALID,
        400
      );
    }

    const attachmentIssue = result.error.issues.find((issue) =>
      issue.path.includes("attachments")
    );

    if (attachmentIssue) {
      throw new AppError(
        "Feedback attachment metadata is invalid or exceeds the allowed limit.",
        FEEDBACK_ERROR_CODES.ATTACHMENT_LIMIT_EXCEEDED,
        400
      );
    }

    throw new AppError(
      "Manual feedback request validation failed.",
      FEEDBACK_ERROR_CODES.INPUT_INVALID,
      400
    );
  }

  return result.data;
}
