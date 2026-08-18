import { randomBytes, createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";

const TOKEN_BYTES = 32;

export function createStaffInvitationToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");

  return {
    rawToken,
    tokenHash: hashStaffInvitationToken(rawToken),
    expiresAt: new Date(
      Date.now() + env.STAFF_INVITATION_EXPIRES_IN_HOURS * 60 * 60 * 1000
    )
  };
}

export function hashStaffInvitationToken(rawToken: string): string {
  const token = rawToken.trim();

  if (!token) {
    throw new AppError("Invitation token is required.", "INVITATION_TOKEN_INVALID", 400);
  }

  return createHash("sha256").update(token).digest("hex");
}
