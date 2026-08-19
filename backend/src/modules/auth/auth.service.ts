import { randomUUID } from "node:crypto";
import type { ExternalAccount, Session, User } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  AccountStatus,
  AccountTokenType,
  ExternalAuthProvider,
  Prisma as PrismaRuntime
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { assertEmailDeliveryConfigured, sendEmail } from "../../lib/email.service.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import type { AuthSessionSummary, RequestMetadata, SafeUser } from "./auth.types.js";
import type {
  ConfirmEmailVerificationInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendEmailVerificationInput,
  ResetPasswordInput
} from "./auth.schema.js";
import { cleanupExpiredAuthData } from "./auth-cleanup.service.js";
import {
  assertAccountTokenInput,
  createAccountToken,
  hashAccountToken,
  invalidateActiveAccountTokens
} from "./account-token.service.js";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail
} from "./auth-email.templates.js";
import {
  createAuthTokens,
  hashRefreshToken,
  refreshTokenMatches,
  verifyAccessToken,
  verifyRefreshToken
} from "./auth.tokens.js";

export type AuthResult = {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
};

export type RegistrationResult = {
  email: string;
  verificationRequired: true;
  emailDeliveryStatus: "SENT" | "FAILED";
};

type UserWithExternalAccounts = User & {
  externalAccounts?: Pick<ExternalAccount, "provider" | "providerEmail" | "avatarUrl">[];
};

export async function registerUser(
  input: RegisterInput,
  metadata: RequestMetadata
): Promise<RegistrationResult> {
  assertEmailDeliveryConfigured();

  let verificationEmail: {
    to: string;
    subject: string;
    text: string;
    html: string;
  } | null = null;

  try {
    const registration = await prisma.$transaction(async (tx) => {
      await cleanupExpiredAuthData(tx);

      const existingUser = await tx.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new AppError(
          "An account could not be created with those details.",
          "ACCOUNT_REGISTRATION_FAILED",
          409
        );
      }

      const passwordHash = await hashPassword(input.password);

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          emailVerifiedAt: null
        }
      });

      const token = await createAccountToken(tx, {
        userId: user.id,
        type: AccountTokenType.EMAIL_VERIFICATION,
        requestedIp: metadata.ipAddress
      });

      verificationEmail = {
        to: user.email,
        ...buildEmailVerificationEmail(user, token.rawToken, token.expiresAt)
      };

      return {
        email: user.email,
        verificationRequired: true as const
      };
    });

    try {
      if (!verificationEmail) {
        throw new AppError(
          "Email verification could not be prepared.",
          "EMAIL_DELIVERY_FAILED",
          503
        );
      }

      await sendEmail(verificationEmail);

      return {
        ...registration,
        emailDeliveryStatus: "SENT"
      };
    } catch (error) {
      if (error instanceof AppError && error.code === "EMAIL_DELIVERY_FAILED") {
        return {
          ...registration,
          emailDeliveryStatus: "FAILED"
        };
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "An account could not be created with those details.",
        "ACCOUNT_REGISTRATION_FAILED",
        409
      );
    }

    throw error;
  }
}

export async function loginUser(
  input: LoginInput,
  metadata: RequestMetadata
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user?.passwordHash) {
    logger.info("Login rejected with invalid credentials");
    throw invalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password);

  if (!passwordMatches) {
    logger.info({ userId: user.id }, "Login rejected with invalid credentials");
    throw invalidCredentialsError();
  }

  assertUserCanAuthenticate(user);

  if (!user.emailVerifiedAt) {
    logger.info({ userId: user.id }, "Login rejected because email is not verified");
    throw new AppError(
      "Verify your email address before signing in.",
      "EMAIL_NOT_VERIFIED",
      403
    );
  }

  return prisma.$transaction(async (tx) => {
    const session = await createSession(tx, user.id, metadata);
    const tokens = createAuthTokens(user, session.id);
    const lastLoginAt = new Date();

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt },
      include: { externalAccounts: true }
    });

    await tx.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: hashRefreshToken(tokens.refreshToken),
        expiresAt: tokens.refreshExpiresAt
      }
    });

    return {
      user: toSafeUser(updatedUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  });
}

export async function resendEmailVerification(
  input: ResendEmailVerificationInput,
  metadata: RequestMetadata
): Promise<{ accepted: true }> {
  assertEmailDeliveryConfigured();

  const emailPayload = await prisma.$transaction(async (tx) => {
    await cleanupExpiredAuthData(tx);

    const user = await tx.user.findUnique({
      where: { email: input.email }
    });

    if (
      !user ||
      user.status !== AccountStatus.ACTIVE ||
      !user.passwordHash ||
      user.emailVerifiedAt
    ) {
      return null;
    }

    const token = await createAccountToken(tx, {
      userId: user.id,
      type: AccountTokenType.EMAIL_VERIFICATION,
      requestedIp: metadata.ipAddress
    });

    return {
      to: user.email,
      ...buildEmailVerificationEmail(user, token.rawToken, token.expiresAt)
    };
  });

  if (emailPayload) {
    await sendEmail(emailPayload);
  }

  return { accepted: true };
}

export async function confirmEmailVerification(
  input: ConfirmEmailVerificationInput
): Promise<{ verified: true; alreadyVerified: boolean }> {
  const rawToken = assertAccountTokenInput(input.token, "VERIFICATION_TOKEN_REQUIRED");
  const accountToken = await prisma.accountToken.findUnique({
    where: { tokenHash: hashAccountToken(rawToken) },
    include: { user: true }
  });
  const now = new Date();

  if (!accountToken || accountToken.type !== AccountTokenType.EMAIL_VERIFICATION) {
    throw new AppError(
      "This verification link is invalid.",
      "VERIFICATION_TOKEN_INVALID",
      400
    );
  }

  if (accountToken.expiresAt <= now) {
    throw new AppError(
      "This verification link has expired.",
      "VERIFICATION_TOKEN_EXPIRED",
      400
    );
  }

  if (accountToken.usedAt) {
    if (accountToken.user.emailVerifiedAt) {
      return { verified: true, alreadyVerified: true };
    }

    throw new AppError(
      "This verification link is invalid.",
      "VERIFICATION_TOKEN_INVALID",
      400
    );
  }

  assertUserCanAuthenticate(accountToken.user);

  return prisma.$transaction(async (tx) => {
    const tokenUpdate = await tx.accountToken.updateMany({
      where: {
        id: accountToken.id,
        usedAt: null,
        expiresAt: { gt: now }
      },
      data: { usedAt: now }
    });

    if (tokenUpdate.count !== 1) {
      throw new AppError(
        "This verification link is invalid.",
        "VERIFICATION_TOKEN_INVALID",
        400
      );
    }

    await tx.user.update({
      where: { id: accountToken.userId },
      data: {
        emailVerifiedAt: accountToken.user.emailVerifiedAt ?? now
      }
    });

    await invalidateActiveAccountTokens(
      tx,
      accountToken.userId,
      AccountTokenType.EMAIL_VERIFICATION
    );

    return {
      verified: true,
      alreadyVerified: Boolean(accountToken.user.emailVerifiedAt)
    };
  });
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  metadata: RequestMetadata
): Promise<{ accepted: true }> {
  assertEmailDeliveryConfigured();

  const emailPayload = await prisma.$transaction(async (tx) => {
    await cleanupExpiredAuthData(tx);

    const user = await tx.user.findUnique({
      where: { email: input.email }
    });

    if (!user || user.status !== AccountStatus.ACTIVE || !user.passwordHash) {
      return null;
    }

    const token = await createAccountToken(tx, {
      userId: user.id,
      type: AccountTokenType.PASSWORD_RESET,
      requestedIp: metadata.ipAddress
    });

    return {
      to: user.email,
      ...buildPasswordResetEmail(user, token.rawToken, token.expiresAt)
    };
  });

  if (emailPayload) {
    await sendEmail(emailPayload);
  }

  return { accepted: true };
}

export async function resetPassword(
  input: ResetPasswordInput
): Promise<{ reset: true; sessionsRevoked: true }> {
  const rawToken = assertAccountTokenInput(input.token, "PASSWORD_RESET_TOKEN_REQUIRED");
  const accountToken = await prisma.accountToken.findUnique({
    where: { tokenHash: hashAccountToken(rawToken) },
    include: { user: true }
  });
  const now = new Date();

  if (!accountToken || accountToken.type !== AccountTokenType.PASSWORD_RESET) {
    throw new AppError(
      "This password reset link is invalid.",
      "PASSWORD_RESET_TOKEN_INVALID",
      400
    );
  }

  if (accountToken.expiresAt <= now) {
    throw new AppError(
      "This password reset link has expired.",
      "PASSWORD_RESET_TOKEN_EXPIRED",
      400
    );
  }

  if (accountToken.usedAt) {
    throw new AppError(
      "This password reset link is invalid.",
      "PASSWORD_RESET_TOKEN_INVALID",
      400
    );
  }

  assertUserCanAuthenticate(accountToken.user);

  if (!accountToken.user.passwordHash) {
    throw new AppError(
      "Password reset is not available for this account.",
      "PASSWORD_RESET_NOT_AVAILABLE",
      400
    );
  }

  const passwordHash = await hashPassword(input.newPassword);

  return prisma.$transaction(async (tx) => {
    const tokenUpdate = await tx.accountToken.updateMany({
      where: {
        id: accountToken.id,
        usedAt: null,
        expiresAt: { gt: now }
      },
      data: { usedAt: now }
    });

    if (tokenUpdate.count !== 1) {
      throw new AppError(
        "This password reset link is invalid.",
        "PASSWORD_RESET_TOKEN_INVALID",
        400
      );
    }

    await tx.user.update({
      where: { id: accountToken.userId },
      data: { passwordHash }
    });

    await invalidateActiveAccountTokens(
      tx,
      accountToken.userId,
      AccountTokenType.PASSWORD_RESET
    );

    await tx.session.updateMany({
      where: {
        userId: accountToken.userId,
        revokedAt: null
      },
      data: { revokedAt: now }
    });

    return { reset: true, sessionsRevoked: true };
  });
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const payload = verifyRefreshToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: { include: { externalAccounts: true } } }
  });

  if (!session || session.userId !== payload.sub) {
    throw new AppError("Please sign in again.", "SESSION_REFRESH_REJECTED", 401);
  }

  if (session.revokedAt || session.expiresAt <= new Date()) {
    throw new AppError("Please sign in again.", "SESSION_REFRESH_REJECTED", 401);
  }

  assertUserCanAuthenticate(session.user);

  if (!refreshTokenMatches(refreshToken, session.refreshTokenHash)) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    logger.warn(
      { sessionId: session.id, userId: session.userId },
      "Refresh token reuse rejected"
    );
    throw new AppError("Please sign in again.", "SESSION_REFRESH_REJECTED", 401);
  }

  const tokens = createAuthTokens(session.user, session.id);
  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt,
      lastUsedAt: new Date()
    }
  });

  return {
    user: toSafeUser(session.user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  };
}

export async function getAuthenticatedUser(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { externalAccounts: true }
  });

  if (!user) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }

  assertUserCanAuthenticate(user);

  return toSafeUser(user);
}

export async function logoutCurrentSession(
  accessToken?: string,
  refreshToken?: string
): Promise<void> {
  const sessionIdentity = getLogoutSessionIdentity(accessToken, refreshToken);

  if (!sessionIdentity) {
    return;
  }

  await prisma.session.updateMany({
    where: {
      id: sessionIdentity.sessionId,
      userId: sessionIdentity.userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function listActiveSessions(
  userId: string,
  currentSessionId: string
): Promise<AuthSessionSummary[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { lastUsedAt: "desc" }
  });

  return sessions.map((session) => toSessionSummary(session, currentSessionId));
}

export async function revokeSession(
  userId: string,
  currentSessionId: string,
  sessionId: string
): Promise<{ revokedCurrentSession: boolean }> {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null
    }
  });

  if (!session) {
    throw new AppError("Session was not found.", "SESSION_NOT_FOUND", 404);
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });

  return { revokedCurrentSession: session.id === currentSessionId };
}

export async function createApplicationSession(
  tx: Prisma.TransactionClient,
  user: Pick<User, "id" | "role">,
  metadata: RequestMetadata
): Promise<{ accessToken: string; refreshToken: string }> {
  const session = await createSession(tx, user.id, metadata);
  const tokens = createAuthTokens(user, session.id);

  await tx.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt
    }
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  };
}

export function assertUserCanAuthenticate(user: Pick<User, "status">): void {
  if (user.status === AccountStatus.SUSPENDED) {
    throw new AppError("This account is suspended.", "ACCOUNT_SUSPENDED", 403);
  }

  if (user.status === AccountStatus.DISABLED) {
    throw new AppError("This account is disabled.", "ACCOUNT_DISABLED", 403);
  }

  if (user.status !== AccountStatus.ACTIVE) {
    throw new AppError("This account cannot sign in.", "ACCOUNT_NOT_ACTIVE", 403);
  }
}

export function toSafeUser(user: UserWithExternalAccounts): SafeUser {
  const googleAccount =
    user.externalAccounts?.find(
      (account) => account.provider === ExternalAuthProvider.GOOGLE
    ) ?? null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    hasPassword: Boolean(user.passwordHash),
    hasGoogleAccount: Boolean(googleAccount),
    googleEmail: googleAccount?.providerEmail ?? null,
    avatarUrl: googleAccount?.avatarUrl ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

async function createSession(
  tx: Prisma.TransactionClient,
  userId: string,
  metadata: RequestMetadata
): Promise<Session> {
  return tx.session.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(randomUUID()),
      expiresAt: new Date(Date.now() + 60_000),
      ipAddress: sanitizeIpAddress(metadata.ipAddress),
      userAgent: sanitizeUserAgent(metadata.userAgent)
    }
  });
}

function toSessionSummary(
  session: Session,
  currentSessionId: string
): AuthSessionSummary {
  return {
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    isCurrent: session.id === currentSessionId
  };
}

function invalidCredentialsError(): AppError {
  return new AppError("Invalid email or password.", "INVALID_CREDENTIALS", 401);
}

function getLogoutSessionIdentity(
  accessToken: string | undefined,
  refreshToken: string | undefined
): { sessionId: string; userId: string } | null {
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);

      return {
        sessionId: payload.sid,
        userId: payload.sub
      };
    } catch {
      // Fall back to the refresh token so logout can revoke an expired access session.
    }
  }

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);

      return {
        sessionId: payload.sid,
        userId: payload.sub
      };
    } catch {
      return null;
    }
  }

  return null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof PrismaRuntime.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function sanitizeIpAddress(ipAddress: string | undefined): string | undefined {
  return ipAddress ? ipAddress.slice(0, 45) : undefined;
}

function sanitizeUserAgent(userAgent: string | undefined): string | undefined {
  return userAgent ? userAgent.slice(0, 512) : undefined;
}
