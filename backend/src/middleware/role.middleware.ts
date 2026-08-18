import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { AppError } from "../lib/app-error.js";

export function requireRoles(...allowedRoles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth) {
      next(new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401));
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(new AppError("You do not have access to this resource.", "FORBIDDEN", 403));
      return;
    }

    next();
  };
}
