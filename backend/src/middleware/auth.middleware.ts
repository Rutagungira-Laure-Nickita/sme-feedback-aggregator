import type { NextFunction, Request, Response } from "express";
import { AccountStatus } from "../lib/prisma-runtime.js";
import { AUTH_COOKIE_NAMES } from "../modules/auth/auth.constants.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";
import { AppError } from "../lib/app-error.js";
import { prisma } from "../lib/prisma.js";

export async function authMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessToken = getCookie(request, AUTH_COOKIE_NAMES.accessToken);

    if (!accessToken) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const payload = verifyAccessToken(accessToken);
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true }
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    if (session.user.status !== AccountStatus.ACTIVE) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    request.auth = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      sessionId: session.id
    };

    next();
  } catch (error) {
    next(error);
  }
}

function getCookie(request: Request, name: string): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];

  return typeof value === "string" ? value : undefined;
}
