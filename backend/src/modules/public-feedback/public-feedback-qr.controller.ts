import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { FEEDBACK_ERROR_CODES } from "../feedback-processing/index.js";
import { publicFeedbackIdempotencyKeySchema } from "./public-feedback.schemas.js";
import { QR_FEEDBACK_ERROR_CODES } from "./public-feedback.errors.js";
import {
  publicFeedbackQrBusinessParamsSchema,
  publicFeedbackQrCodeParamsSchema,
  publicFeedbackQrCreateSchema,
  publicFeedbackQrPublicParamsSchema,
  publicFeedbackQrSubmissionSchema,
  publicFeedbackQrUpdateSchema
} from "./public-feedback-qr.schemas.js";
import {
  createPublicFeedbackQrCode,
  getPublicFeedbackQrPortal,
  listPublicFeedbackQrCodes,
  regeneratePublicFeedbackQrCode,
  submitPublicFeedbackQr,
  updatePublicFeedbackQrCode
} from "./public-feedback-qr.service.js";

export async function listPublicFeedbackQrCodesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(
      publicFeedbackQrBusinessParamsSchema.safeParse(request.params)
    );
    const result = await listPublicFeedbackQrCodes(actor, params.businessId);

    sendSuccess(response, "QR codes loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function createPublicFeedbackQrCodeController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(
      publicFeedbackQrBusinessParamsSchema.safeParse(request.params)
    );
    const input = parseInput(publicFeedbackQrCreateSchema.safeParse(request.body));
    const result = await createPublicFeedbackQrCode(actor, params.businessId, input);

    sendSuccess(response, "QR code created", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function regeneratePublicFeedbackQrCodeController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(publicFeedbackQrCodeParamsSchema.safeParse(request.params));
    const result = await regeneratePublicFeedbackQrCode(
      actor,
      params.businessId,
      params.qrCodeId
    );

    sendSuccess(response, "QR code regenerated", result);
  } catch (error) {
    next(error);
  }
}

export async function updatePublicFeedbackQrCodeController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(publicFeedbackQrCodeParamsSchema.safeParse(request.params));
    const input = parseInput(publicFeedbackQrUpdateSchema.safeParse(request.body));
    const result = await updatePublicFeedbackQrCode(
      actor,
      params.businessId,
      params.qrCodeId,
      input
    );

    sendSuccess(response, "QR code updated", result);
  } catch (error) {
    next(error);
  }
}

export async function getPublicFeedbackQrPortalController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(
      publicFeedbackQrPublicParamsSchema.safeParse(request.params)
    );
    const result = await getPublicFeedbackQrPortal(params.qrToken);

    sendSuccess(response, "QR feedback portal loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function submitPublicFeedbackQrController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(
      publicFeedbackQrPublicParamsSchema.safeParse(request.params)
    );
    const idempotencyKey = parseQrIdempotencyKey(request.get("Idempotency-Key"));
    const input = parseQrSubmission(
      publicFeedbackQrSubmissionSchema.safeParse(request.body)
    );
    const result = await submitPublicFeedbackQr(params.qrToken, input, idempotencyKey);

    sendSuccess(
      response,
      result.created ? "QR feedback created" : "QR feedback already received",
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

function parseQrIdempotencyKey(value: string | undefined): string {
  if (value === undefined) {
    throw new AppError(
      "Idempotency-Key header is required.",
      QR_FEEDBACK_ERROR_CODES.QR_IDEMPOTENCY_KEY_REQUIRED,
      400
    );
  }

  const parsed = publicFeedbackIdempotencyKeySchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(
      "Idempotency-Key header is invalid.",
      QR_FEEDBACK_ERROR_CODES.QR_IDEMPOTENCY_KEY_INVALID,
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

function parseQrSubmission<T>(
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
        QR_FEEDBACK_ERROR_CODES.QR_VALIDATION_FAILED,
        400
      );
    }

    const branchIssue = result.error.issues.find((issue) => issue.path[0] === "branchId");

    if (branchIssue) {
      throw new AppError(
        "Choose an active branch for this QR feedback link.",
        QR_FEEDBACK_ERROR_CODES.QR_BRANCH_REQUIRED,
        400
      );
    }

    throw new AppError(
      "QR feedback request validation failed.",
      FEEDBACK_ERROR_CODES.INPUT_INVALID,
      400
    );
  }

  return result.data;
}
