import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";
import { sendError } from "../utils/api-response.js";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  if (error instanceof AppError) {
    sendError(response, error.message, error.code, error.statusCode);
    return;
  }

  if (isBodyParserError(error)) {
    if (error.type === "entity.too.large") {
      sendError(response, "Request body is too large.", "REQUEST_BODY_TOO_LARGE", 413);
      return;
    }

    sendError(response, "Request body must be valid JSON.", "VALIDATION_ERROR", 400);
    return;
  }

  logger.error({ error }, "Unhandled application error");

  const message =
    env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : "An unexpected error occurred. Check the server logs for details.";

  sendError(response, message, "INTERNAL_SERVER_ERROR", 500);
};

function isBodyParserError(error: unknown): error is { type: string } {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { type?: unknown };

  return (
    candidate.type === "entity.parse.failed" || candidate.type === "entity.too.large"
  );
}
