import { OAuth2Client } from "google-auth-library";
import {
  ExternalAuthProvider,
  Prisma as PrismaRuntime
} from "../../lib/prisma-runtime.js";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  GoogleLinkInput,
  GoogleLoginInput,
  GoogleRegisterInput
} from "./auth.schema.js";
import type { RequestMetadata, SafeUser } from "./auth.types.js";
import {
  assertUserCanAuthenticate,
  createApplicationSession,
  type AuthResult,
  toSafeUser
} from "./auth.service.js";
import type { VerifiedGoogleIdentity } from "./google-auth.types.js";

let googleClient: OAuth2Client | null = null;

export async function registerWithGoogle(
  input: GoogleRegisterInput,
  metadata: RequestMetadata
): Promise<AuthResult> {
  const identity = await verifyGoogleCredential(input.credential);
  const names = resolveGoogleNames(identity, input.firstName, input.lastName);

  return prisma.$transaction(async (tx) => {
    const existingExternalAccount = await tx.externalAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: ExternalAuthProvider.GOOGLE,
          providerAccountId: identity.sub
        }
      }
    });

    if (existingExternalAccount) {
      throw new AppError(
        "This Google account is already registered. Sign in with Google instead.",
        "GOOGLE_ACCOUNT_ALREADY_EXISTS",
        409
      );
    }

    const existingUser = await tx.user.findUnique({
      where: { email: identity.email }
    });

    if (existingUser) {
      throw new AppError(
        "An account already uses this email. Sign in with your password, then link Google from your account page.",
        "ACCOUNT_EMAIL_ALREADY_EXISTS",
        409
      );
    }

    const now = new Date();
    const user = await tx.user.create({
      data: {
        email: identity.email,
        passwordHash: null,
        firstName: names.firstName,
        lastName: names.lastName,
        role: input.role,
        emailVerifiedAt: now,
        lastLoginAt: now,
        externalAccounts: {
          create: {
            provider: ExternalAuthProvider.GOOGLE,
            providerAccountId: identity.sub,
            providerEmail: identity.email,
            displayName: identity.name ?? `${names.firstName} ${names.lastName}`,
            avatarUrl: identity.picture,
            lastUsedAt: now
          }
        }
      },
      include: { externalAccounts: true }
    });
    const tokens = await createApplicationSession(tx, user, metadata);

    return {
      user: toSafeUser(user),
      ...tokens
    };
  });
}

export async function loginWithGoogle(
  input: GoogleLoginInput,
  metadata: RequestMetadata
): Promise<AuthResult> {
  const identity = await verifyGoogleCredential(input.credential);

  const externalAccount = await prisma.externalAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: ExternalAuthProvider.GOOGLE,
        providerAccountId: identity.sub
      }
    },
    include: { user: { include: { externalAccounts: true } } }
  });

  if (!externalAccount) {
    throw new AppError(
      "Google sign-in is not linked to an account yet. Register with Google, or sign in with your password and link Google from your account page.",
      "GOOGLE_LOGIN_NOT_LINKED",
      401
    );
  }

  assertUserCanAuthenticate(externalAccount.user);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.externalAccount.update({
      where: { id: externalAccount.id },
      data: {
        lastUsedAt: now,
        providerEmail: identity.email,
        displayName: identity.name ?? externalAccount.displayName,
        avatarUrl: identity.picture ?? externalAccount.avatarUrl
      }
    });

    const user = await tx.user.update({
      where: { id: externalAccount.userId },
      data: { lastLoginAt: now },
      include: { externalAccounts: true }
    });
    const tokens = await createApplicationSession(tx, user, metadata);

    return {
      user: toSafeUser(user),
      ...tokens
    };
  });
}

export async function linkGoogleAccount(
  userId: string,
  input: GoogleLinkInput
): Promise<SafeUser> {
  const identity = await verifyGoogleCredential(input.credential);

  try {
    return await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        include: { externalAccounts: true }
      });

      if (!currentUser) {
        throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
      }

      assertUserCanAuthenticate(currentUser);

      if (currentUser.email !== identity.email) {
        throw new AppError(
          "The Google email must match your account email to link it.",
          "GOOGLE_EMAIL_MISMATCH",
          409
        );
      }

      const existingExternalAccount = await tx.externalAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: ExternalAuthProvider.GOOGLE,
            providerAccountId: identity.sub
          }
        }
      });

      if (existingExternalAccount) {
        if (existingExternalAccount.userId !== currentUser.id) {
          throw new AppError(
            "This Google account is already linked to another user.",
            "GOOGLE_ACCOUNT_LINKED_TO_ANOTHER_USER",
            409
          );
        }

        return toSafeUser(currentUser);
      }

      const currentGoogleAccount = currentUser.externalAccounts.find(
        (account) => account.provider === ExternalAuthProvider.GOOGLE
      );

      if (currentGoogleAccount) {
        throw new AppError(
          "This account already has a Google sign-in linked.",
          "GOOGLE_ACCOUNT_ALREADY_LINKED",
          409
        );
      }

      const now = new Date();
      await tx.externalAccount.create({
        data: {
          userId: currentUser.id,
          provider: ExternalAuthProvider.GOOGLE,
          providerAccountId: identity.sub,
          providerEmail: identity.email,
          displayName:
            identity.name ?? `${currentUser.firstName} ${currentUser.lastName}`,
          avatarUrl: identity.picture,
          lastUsedAt: now
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: currentUser.id },
        data: {
          emailVerifiedAt: currentUser.emailVerifiedAt ?? now
        },
        include: { externalAccounts: true }
      });

      return toSafeUser(updatedUser);
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "This Google account cannot be linked to this user.",
        "GOOGLE_ACCOUNT_ALREADY_LINKED",
        409
      );
    }

    throw error;
  }
}

export async function verifyGoogleCredential(
  credential: string
): Promise<VerifiedGoogleIdentity> {
  if (!env.GOOGLE_AUTH_ENABLED || !env.GOOGLE_CLIENT_ID) {
    throw new AppError(
      "Google sign-in is not configured yet.",
      "GOOGLE_AUTH_NOT_CONFIGURED",
      503
    );
  }

  try {
    googleClient ??= new OAuth2Client(env.GOOGLE_CLIENT_ID);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.sub) {
      throw new AppError(
        "Google did not provide the required account identifier.",
        "GOOGLE_CREDENTIAL_INVALID",
        401
      );
    }

    if (!payload.email) {
      throw new AppError(
        "Google did not provide the required verified email.",
        "GOOGLE_CREDENTIAL_INVALID",
        401
      );
    }

    if (payload.email_verified !== true) {
      throw new AppError(
        "Google email verification is required.",
        "GOOGLE_EMAIL_NOT_VERIFIED",
        401
      );
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: true,
      givenName: safeOptionalString(payload.given_name),
      familyName: safeOptionalString(payload.family_name),
      name: safeOptionalString(payload.name),
      picture: safeOptionalString(payload.picture)
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isExpiredGoogleError(error)) {
      throw new AppError(
        "Google credential has expired. Please try again.",
        "GOOGLE_CREDENTIAL_EXPIRED",
        401
      );
    }

    throw new AppError(
      "Google credential could not be verified.",
      "GOOGLE_CREDENTIAL_INVALID",
      401
    );
  }
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isExpiredGoogleError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes("expired");
}

function resolveGoogleNames(
  identity: VerifiedGoogleIdentity,
  submittedFirstName: string | undefined,
  submittedLastName: string | undefined
): { firstName: string; lastName: string } {
  const googleFirstName = identity.givenName;
  const googleLastName = identity.familyName;

  if (googleFirstName && googleLastName) {
    return { firstName: googleFirstName, lastName: googleLastName };
  }

  const splitName = splitDisplayName(identity.name);
  const firstName = googleFirstName ?? splitName?.firstName ?? submittedFirstName;
  const lastName = googleLastName ?? splitName?.lastName ?? submittedLastName;

  if (!firstName || !lastName) {
    throw new AppError(
      "Enter your first and last name to finish Google registration.",
      "GOOGLE_PROFILE_INCOMPLETE",
      422
    );
  }

  return { firstName, lastName };
}

function splitDisplayName(
  value: string | undefined
): { firstName: string; lastName: string } | null {
  if (!value) {
    return null;
  }

  const parts = value.trim().split(/\s+/);

  if (parts.length < 2) {
    return null;
  }

  const [firstName, ...lastNameParts] = parts;
  const lastName = lastNameParts.join(" ");

  return firstName && lastName ? { firstName, lastName } : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof PrismaRuntime.PrismaClientKnownRequestError && error.code === "P2002"
  );
}
