import type { AccountStatus, UserRole } from "@prisma/client";

export type SafeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
  emailVerifiedAt: string | null;
  hasPassword: boolean;
  hasGoogleAccount: boolean;
  googleEmail: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthenticatedRequestUser = {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  sessionId: string;
};

export type AuthSessionSummary = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
};

export type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};
