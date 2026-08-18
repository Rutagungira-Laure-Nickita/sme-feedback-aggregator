import { AppError } from "../../lib/app-error.js";

export const FEEDBACK_ERROR_CODES = {
  INPUT_INVALID: "FEEDBACK_INPUT_INVALID",
  BUSINESS_NOT_FOUND: "FEEDBACK_BUSINESS_NOT_FOUND",
  BUSINESS_SUSPENDED: "FEEDBACK_BUSINESS_SUSPENDED",
  BRANCH_NOT_FOUND: "FEEDBACK_BRANCH_NOT_FOUND",
  BRANCH_INACTIVE: "FEEDBACK_BRANCH_INACTIVE",
  BRANCH_BUSINESS_MISMATCH: "FEEDBACK_BRANCH_BUSINESS_MISMATCH",
  PRIMARY_BRANCH_REQUIRED: "FEEDBACK_PRIMARY_BRANCH_REQUIRED",
  EXTERNAL_ID_CONFLICT: "FEEDBACK_EXTERNAL_ID_CONFLICT",
  IDEMPOTENCY_CONFLICT: "FEEDBACK_IDEMPOTENCY_CONFLICT",
  PROCESSING_FAILED: "FEEDBACK_PROCESSING_FAILED",
  METADATA_TOO_LARGE: "FEEDBACK_METADATA_TOO_LARGE",
  ATTACHMENT_LIMIT_EXCEEDED: "FEEDBACK_ATTACHMENT_LIMIT_EXCEEDED"
} as const;

export type FeedbackErrorCode =
  (typeof FEEDBACK_ERROR_CODES)[keyof typeof FEEDBACK_ERROR_CODES];

export class FeedbackProcessingError extends AppError {
  public constructor(message: string, code: FeedbackErrorCode, statusCode = 400) {
    super(message, code, statusCode);
    this.name = "FeedbackProcessingError";
  }
}

export function toSafeFeedbackError(error: unknown): {
  code: FeedbackErrorCode;
  message: string;
} {
  if (error instanceof AppError && isFeedbackErrorCode(error.code)) {
    return {
      code: error.code,
      message: truncateErrorMessage(error.message)
    };
  }

  return {
    code: FEEDBACK_ERROR_CODES.PROCESSING_FAILED,
    message: "Feedback processing failed safely."
  };
}

function isFeedbackErrorCode(code: string): code is FeedbackErrorCode {
  return Object.values(FEEDBACK_ERROR_CODES).includes(code as FeedbackErrorCode);
}

function truncateErrorMessage(message: string): string {
  const sanitized = message.replace(/\s+/g, " ").trim();

  return sanitized.length > 500 ? `${sanitized.slice(0, 497)}...` : sanitized;
}
