import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import {
  ACCESS_TOKEN_TYPE,
  AUTH_TOKEN_AUDIENCE,
  AUTH_TOKEN_ISSUER,
  REFRESH_TOKEN_TYPE
} from "./auth.constants.js";

type AccessPayload = JwtPayload & {
  sub: string;
  role: UserRole;
  sid: string;
  type: typeof ACCESS_TOKEN_TYPE;
};

type RefreshPayload = JwtPayload & {
  sub: string;
  sid: string;
  jti: string;
  type: typeof REFRESH_TOKEN_TYPE;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

export function createAuthTokens(
  user: { id: string; role: UserRole },
  sessionId: string
): AuthTokens {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      sid: sessionId,
      type: ACCESS_TOKEN_TYPE
    },
    env.JWT_ACCESS_SECRET,
    getSignOptions(env.JWT_ACCESS_EXPIRES_IN)
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      sid: sessionId,
      jti: randomUUID(),
      type: REFRESH_TOKEN_TYPE
    },
    env.JWT_REFRESH_SECRET,
    getSignOptions(env.JWT_REFRESH_EXPIRES_IN)
  );

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN))
  };
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = verifyToken(token, env.JWT_ACCESS_SECRET);

  if (
    payload.type !== ACCESS_TOKEN_TYPE ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new AppError("Authentication is required.", "INVALID_ACCESS_TOKEN", 401);
  }

  return payload as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = verifyToken(token, env.JWT_REFRESH_SECRET);

  if (
    payload.type !== REFRESH_TOKEN_TYPE ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.jti !== "string"
  ) {
    throw new AppError("Authentication is required.", "INVALID_REFRESH_TOKEN", 401);
  }

  return payload as RefreshPayload;
}

export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function refreshTokenMatches(refreshToken: string, storedHash: string): boolean {
  const submittedHash = hashRefreshToken(refreshToken);
  const submitted = Buffer.from(submittedHash, "hex");
  const stored = Buffer.from(storedHash, "hex");

  return submitted.length === stored.length && timingSafeEqual(submitted, stored);
}

export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());

  if (!match) {
    throw new AppError(
      "Authentication token duration is misconfigured.",
      "AUTH_DURATION_MISCONFIGURED",
      500
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1_000,
    m: 60_000,
    h: 60 * 60_000,
    d: 24 * 60 * 60_000
  } as const;

  return amount * multipliers[unit as keyof typeof multipliers];
}

function getSignOptions(expiresIn: string): SignOptions {
  return {
    expiresIn: expiresIn as SignOptions["expiresIn"],
    issuer: AUTH_TOKEN_ISSUER,
    audience: AUTH_TOKEN_AUDIENCE
  };
}

function verifyToken(token: string, secret: string): JwtPayload {
  try {
    const payload = jwt.verify(token, secret, {
      issuer: AUTH_TOKEN_ISSUER,
      audience: AUTH_TOKEN_AUDIENCE
    });

    if (!payload || typeof payload === "string") {
      throw new AppError("Authentication is required.", "INVALID_TOKEN", 401);
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Authentication is required.", "INVALID_TOKEN", 401);
  }
}
