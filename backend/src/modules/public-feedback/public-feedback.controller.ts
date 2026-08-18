import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { FEEDBACK_ERROR_CODES } from "../feedback-processing/index.js";
import { PUBLIC_FEEDBACK_ERROR_CODES } from "./public-feedback.errors.js";
import {
  publicFeedbackBusinessParamsSchema,
  publicFeedbackIdempotencyKeySchema,
  publicFeedbackPortalParamsSchema,
  publicFeedbackSettingsPatchSchema,
  publicFeedbackSubmissionSchema
} from "./public-feedback.schemas.js";
import {
  getPublicFeedbackPortal,
  getPublicFeedbackSettings,
  regeneratePublicFeedbackLink,
  submitPublicFeedback,
  updatePublicFeedbackSettings
} from "./public-feedback.service.js";

export async function getPublicFeedbackSettingsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(
      publicFeedbackBusinessParamsSchema.safeParse(request.params)
    );
    const result = await getPublicFeedbackSettings(actor, params.businessId);

    sendSuccess(response, "Public feedback settings loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function updatePublicFeedbackSettingsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(
      publicFeedbackBusinessParamsSchema.safeParse(request.params)
    );
    const input = parseInput(publicFeedbackSettingsPatchSchema.safeParse(request.body));
    const result = await updatePublicFeedbackSettings(actor, params.businessId, input);

    sendSuccess(response, "Public feedback settings updated", result);
  } catch (error) {
    next(error);
  }
}

export async function regeneratePublicFeedbackLinkController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(
      publicFeedbackBusinessParamsSchema.safeParse(request.params)
    );
    const result = await regeneratePublicFeedbackLink(actor, params.businessId);

    sendSuccess(response, "Public feedback link regenerated", result);
  } catch (error) {
    next(error);
  }
}

export async function getPublicFeedbackPortalController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(publicFeedbackPortalParamsSchema.safeParse(request.params));
    const result = await getPublicFeedbackPortal(params.portalToken);

    sendSuccess(response, "Public feedback portal loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function submitPublicFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(publicFeedbackPortalParamsSchema.safeParse(request.params));
    const idempotencyKey = parseIdempotencyKey(request.get("Idempotency-Key"));
    const input = parsePublicSubmission(
      publicFeedbackSubmissionSchema.safeParse(request.body)
    );
    const result = await submitPublicFeedback(params.portalToken, input, idempotencyKey);

    sendSuccess(
      response,
      result.created ? "Public feedback created" : "Public feedback already received",
      result,
      result.created ? 201 : 200
    );
  } catch (error) {
    next(error);
  }
}

function getActor(request: Request): { userId: string } {
  if (!request.auth) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }

  return { userId: request.auth.id };
}

function parseIdempotencyKey(value: string | undefined): string {
  if (value === undefined) {
    throw new AppError(
      "Idempotency-Key header is required.",
      PUBLIC_FEEDBACK_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
      400
    );
  }

  const parsed = publicFeedbackIdempotencyKeySchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(
      "Idempotency-Key header is invalid.",
      PUBLIC_FEEDBACK_ERROR_CODES.IDEMPOTENCY_KEY_INVALID,
      400
    );
  }

  return parsed.data;
}

function parseInput<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) {
    throw new AppError("Request validation failed.", "VALIDATION_ERROR", 400);
  }

  return result.data;
}

function parsePublicSubmission<T>(
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
    const followUpIssue = result.error.issues.find(
      (issue) => issue.path[0] === "allowFollowUp"
    );

    if (followUpIssue) {
      throw new AppError(
        "Provide an email or phone number if follow-up is allowed.",
        PUBLIC_FEEDBACK_ERROR_CODES.VALIDATION_FAILED,
        400
      );
    }

    throw new AppError(
      "Public feedback request validation failed.",
      FEEDBACK_ERROR_CODES.INPUT_INVALID,
      400
    );
  }

  return result.data;
}
