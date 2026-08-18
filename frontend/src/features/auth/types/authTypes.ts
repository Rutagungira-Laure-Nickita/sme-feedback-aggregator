export type UserRole = "PLATFORM_ADMIN" | "BUSINESS_OWNER" | "STAFF" | "CUSTOMER";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

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

export type AuthSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
};
