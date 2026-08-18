import type { Request, Response } from "express";
import { sendError } from "../utils/api-response.js";

export function notFoundMiddleware(request: Request, response: Response): void {
  sendError(
    response,
    `Route ${request.method} ${request.originalUrl} was not found.`,
    "NOT_FOUND",
    404
  );
}
