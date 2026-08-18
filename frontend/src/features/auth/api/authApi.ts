import { z } from "zod";
import { apiClient } from "../../../api/axios.js";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
  ResetPasswordFormValues
} from "../schemas/authSchemas.js";
import type { AuthSession, SafeUser, UserRole } from "../types/authTypes.js";

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["PLATFORM_ADMIN", "BUSINESS_OWNER", "STAFF", "CUSTOMER"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]),
  emailVerifiedAt: z.string().nullable(),
  hasPassword: z.boolean(),
  hasGoogleAccount: z.boolean(),
  googleEmail: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const sessionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  expiresAt: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  isCurrent: z.boolean()
});

const apiResponseSchema = <TData extends z.ZodTypeAny>(dataSchema: TData) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema
  });

const authUserResponseSchema = apiResponseSchema(
  z.object({
    user: userSchema
  })
);

const registrationResponseSchema = apiResponseSchema(
  z.object({
    email: z.string().email(),
    verificationRequired: z.literal(true),
    emailDeliveryStatus: z.enum(["SENT", "FAILED"])
  })
);

const acceptedResponseSchema = apiResponseSchema(
  z.object({
    accepted: z.literal(true)
  })
);

const verificationResponseSchema = apiResponseSchema(
  z.object({
    verified: z.literal(true),
    alreadyVerified: z.boolean()
  })
);

const resetPasswordResponseSchema = apiResponseSchema(
  z.object({
    reset: z.literal(true),
    sessionsRevoked: z.literal(true)
  })
);

const sessionsResponseSchema = apiResponseSchema(
  z.object({
    sessions: z.array(sessionSchema)
  })
);

const logoutResponseSchema = apiResponseSchema(
  z.object({
    loggedOut: z.boolean()
  })
);

const revokeSessionResponseSchema = apiResponseSchema(
  z.object({
    revokedCurrentSession: z.boolean()
  })
);

export type RegistrationResult = z.infer<typeof registrationResponseSchema>["data"];

export async function register(values: RegisterFormValues): Promise<RegistrationResult> {
  const { confirmPassword: _confirmPassword, ...payload } = values;
  const response = await apiClient.post<unknown>("/auth/register", payload);

  return registrationResponseSchema.parse(response.data).data;
}

export async function login(values: LoginFormValues): Promise<SafeUser> {
  const response = await apiClient.post<unknown>("/auth/login", values);

  return authUserResponseSchema.parse(response.data).data.user;
}

export async function registerWithGoogle(values: {
  credential: string;
  role: Extract<UserRole, "BUSINESS_OWNER" | "CUSTOMER">;
  firstName?: string;
  lastName?: string;
}): Promise<SafeUser> {
  const response = await apiClient.post<unknown>("/auth/google/register", values);

  return authUserResponseSchema.parse(response.data).data.user;
}

export async function loginWithGoogle(credential: string): Promise<SafeUser> {
  const response = await apiClient.post<unknown>("/auth/google/login", {
    credential
  });

  return authUserResponseSchema.parse(response.data).data.user;
}

export async function linkGoogleAccount(credential: string): Promise<SafeUser> {
  const response = await apiClient.post<unknown>("/auth/google/link", {
    credential
  });

  return authUserResponseSchema.parse(response.data).data.user;
}

export async function fetchCurrentUser(): Promise<SafeUser> {
  const response = await apiClient.get<unknown>("/auth/me");

  return authUserResponseSchema.parse(response.data).data.user;
}

export async function refreshCurrentUser(): Promise<SafeUser> {
  const response = await apiClient.post<unknown>("/auth/refresh");

  return authUserResponseSchema.parse(response.data).data.user;
}

export async function logout(): Promise<void> {
  const response = await apiClient.post<unknown>("/auth/logout");
  logoutResponseSchema.parse(response.data);
}

export async function logoutAll(): Promise<void> {
  const response = await apiClient.post<unknown>("/auth/logout-all");
  logoutResponseSchema.parse(response.data);
}

export async function fetchSessions(): Promise<AuthSession[]> {
  const response = await apiClient.get<unknown>("/auth/sessions");

  return sessionsResponseSchema.parse(response.data).data.sessions;
}

export async function revokeSession(
  sessionId: string
): Promise<{ revokedCurrentSession: boolean }> {
  const response = await apiClient.delete<unknown>(`/auth/sessions/${sessionId}`);

  return revokeSessionResponseSchema.parse(response.data).data;
}

export async function resendEmailVerification(email: string): Promise<void> {
  const response = await apiClient.post<unknown>("/auth/email-verification/resend", {
    email
  });

  acceptedResponseSchema.parse(response.data);
}

export async function confirmEmailVerification(token: string): Promise<{
  verified: true;
  alreadyVerified: boolean;
}> {
  const response = await apiClient.post<unknown>("/auth/email-verification/confirm", {
    token
  });

  return verificationResponseSchema.parse(response.data).data;
}

export async function requestPasswordReset(
  values: ForgotPasswordFormValues
): Promise<void> {
  const response = await apiClient.post<unknown>("/auth/forgot-password", values);

  acceptedResponseSchema.parse(response.data);
}

export async function resetPassword(values: ResetPasswordFormValues): Promise<void> {
  const { confirmPassword: _confirmPassword, ...payload } = values;
  const response = await apiClient.post<unknown>("/auth/reset-password", payload);

  resetPasswordResponseSchema.parse(response.data);
}
