import type { NextFunction, Request, Response } from "express";
import { UserRole } from "../lib/prisma-runtime.js";
import { AppError } from "../lib/app-error.js";

export function requirePlatformAdmin(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  if (!request.auth) {
    next(new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401));
    return;
  }

  if (request.auth.role !== UserRole.PLATFORM_ADMIN) {
    next(new AppError("Platform administrator access is required.", "FORBIDDEN", 403));
    return;
  }

  next();
}
