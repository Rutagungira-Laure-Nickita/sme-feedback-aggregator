import { createHash, randomBytes } from "node:crypto";
import { AccountTokenType, type Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";

const ACCOUNT_TOKEN_BYTE_LENGTH = 32;
const ACCOUNT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,256}$/;

export type CreatedAccountToken = {
  rawToken: string;
  expiresAt: Date;
};

export function assertAccountTokenInput(
  token: string | undefined,
  errorCode: "VERIFICATION_TOKEN_REQUIRED" | "PASSWORD_RESET_TOKEN_REQUIRED"
): string {
  const normalizedToken = token?.trim();

  if (!normalizedToken) {
    throw new AppError("A valid token is required.", errorCode, 400);
  }

  if (!ACCOUNT_TOKEN_PATTERN.test(normalizedToken)) {
    throw new AppError("This token is invalid.", tokenInvalidCode(errorCode), 400);
  }

  return normalizedToken;
}

export async function createAccountToken(
  tx: Prisma.TransactionClient,
  options: {
    userId: string;
    type: AccountTokenType;
    requestedIp?: string;
  }
): Promise<CreatedAccountToken> {
  await invalidateActiveAccountTokens(tx, options.userId, options.type);

  const rawToken = randomBytes(ACCOUNT_TOKEN_BYTE_LENGTH).toString("base64url");
  const expiresAt = new Date(Date.now() + getAccountTokenExpiryMs(options.type));

  await tx.accountToken.create({
    data: {
      userId: options.userId,
      type: options.type,
      tokenHash: hashAccountToken(rawToken),
      expiresAt,
      requestedIp: sanitizeIpAddress(options.requestedIp)
    }
  });

  return { rawToken, expiresAt };
}

export async function invalidateActiveAccountTokens(
  tx: Prisma.TransactionClient,
  userId: string,
  type: AccountTokenType
): Promise<void> {
  await tx.accountToken.updateMany({
    where: {
      userId,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: { usedAt: new Date() }
  });
}

export function hashAccountToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function getAccountTokenExpiryMs(type: AccountTokenType): number {
  const minutes =
    type === AccountTokenType.EMAIL_VERIFICATION
      ? env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES
      : env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES;

  return minutes * 60_000;
}

function tokenInvalidCode(
  requiredCode: "VERIFICATION_TOKEN_REQUIRED" | "PASSWORD_RESET_TOKEN_REQUIRED"
): "VERIFICATION_TOKEN_INVALID" | "PASSWORD_RESET_TOKEN_INVALID" {
  return requiredCode === "VERIFICATION_TOKEN_REQUIRED"
    ? "VERIFICATION_TOKEN_INVALID"
    : "PASSWORD_RESET_TOKEN_INVALID";
}

function sanitizeIpAddress(ipAddress: string | undefined): string | undefined {
  return ipAddress ? ipAddress.slice(0, 45) : undefined;
}
