import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { AUTH_COOKIE_NAMES } from "./auth.constants.js";
import { clearAuthCookies, setAuthCookies } from "./auth.cookies.js";
import {
  confirmEmailVerification,
  getAuthenticatedUser,
  listActiveSessions,
  loginUser,
  logoutAllSessions,
  logoutCurrentSession,
  requestPasswordReset,
  refreshSession,
  registerUser,
  resendEmailVerification,
  resetPassword,
  revokeSession
} from "./auth.service.js";
import {
  confirmEmailVerificationSchema,
  forgotPasswordSchema,
  googleLinkSchema,
  googleLoginSchema,
  googleRegisterSchema,
  loginSchema,
  registerSchema,
  resendEmailVerificationSchema,
  resetPasswordSchema,
  sessionIdSchema
} from "./auth.schema.js";
import {
  linkGoogleAccount,
  loginWithGoogle,
  registerWithGoogle
} from "./google-auth.service.js";

export async function registerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseBody(registerSchema.safeParse(request.body));
    const result = await registerUser(input, getRequestMetadata(request));

    const message =
      result.emailDeliveryStatus === "SENT"
        ? "Registration received. Verify your email address to finish setup."
        : "Registration received, but the verification email could not be delivered. Please request a new verification email.";

    sendSuccess(response, message, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseBody(loginSchema.safeParse(request.body));
    const result = await loginUser(input, getRequestMetadata(request));

    setAuthCookies(response, result);
    sendSuccess(response, "Login successful", { user: result.user });
  } catch (error) {
    next(error);
  }
}

export async function resendEmailVerificationController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseBody(resendEmailVerificationSchema.safeParse(request.body));
    const result = await resendEmailVerification(input, getRequestMetadata(request));

    sendSuccess(
      response,
      "If verification is available, a new email will be sent.",
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function confirmEmailVerificationController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseBody(confirmEmailVerificationSchema.safeParse(request.body));
    const result = await confirmEmailVerification(input);

    sendSuccess(response, "Email address verified.", result);
  } catch (error) {
    next(error);
  }
}

export async function forgotPasswordController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseBody(forgotPasswordSchema.safeParse(request.body));
    const result = await requestPasswordReset(input, getRequestMetadata(request));

    sendSuccess(
      response,
      "If an account can reset its password, an email will be sent.",
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseBody(resetPasswordSchema.safeParse(request.body));
    const result = await resetPassword(input);

    clearAuthCookies(response);
    sendSuccess(response, "Password reset successful. Please sign in again.", result);
  } catch (error) {
    clearAuthCookies(response);
    next(error);
  }
}

export async function googleRegisterController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseGoogleBody(googleRegisterSchema.safeParse(request.body));
    const result = await registerWithGoogle(input, getRequestMetadata(request));

    setAuthCookies(response, result);
    sendSuccess(response, "Google registration successful", { user: result.user }, 201);
  } catch (error) {
    next(error);
  }
}

export async function googleLoginController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseGoogleBody(googleLoginSchema.safeParse(request.body));
    const result = await loginWithGoogle(input, getRequestMetadata(request));

    setAuthCookies(response, result);
    sendSuccess(response, "Google login successful", { user: result.user });
  } catch (error) {
    next(error);
  }
}

export async function googleLinkController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const input = parseGoogleBody(googleLinkSchema.safeParse(request.body));
    const user = await linkGoogleAccount(request.auth.id, input);

    sendSuccess(response, "Google account linked", { user });
  } catch (error) {
    next(error);
  }
}

export async function refreshController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const refreshToken = getCookie(request, AUTH_COOKIE_NAMES.refreshToken);

    if (!refreshToken) {
      throw new AppError("Please sign in again.", "SESSION_REFRESH_REJECTED", 401);
    }

    const result = await refreshSession(refreshToken);

    setAuthCookies(response, result);
    sendSuccess(response, "Session refreshed", { user: result.user });
  } catch (error) {
    clearAuthCookies(response);
    next(error);
  }
}

export async function logoutController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    await logoutCurrentSession(
      getCookie(request, AUTH_COOKIE_NAMES.accessToken),
      getCookie(request, AUTH_COOKIE_NAMES.refreshToken)
    );
    clearAuthCookies(response);
    sendSuccess(response, "Logged out successfully", { loggedOut: true });
  } catch (error) {
    next(error);
  }
}

export async function logoutAllController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    await logoutAllSessions(request.auth.id);
    clearAuthCookies(response);
    sendSuccess(response, "Logged out from all devices", { loggedOut: true });
  } catch (error) {
    next(error);
  }
}

export async function meController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const user = await getAuthenticatedUser(request.auth.id);
    sendSuccess(response, "Current user loaded", { user });
  } catch (error) {
    next(error);
  }
}

export async function sessionsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const sessions = await listActiveSessions(request.auth.id, request.auth.sessionId);
    sendSuccess(response, "Sessions loaded", { sessions });
  } catch (error) {
    next(error);
  }
}

export async function revokeSessionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const params = parseBody(sessionIdSchema.safeParse(request.params));
    const result = await revokeSession(
      request.auth.id,
      request.auth.sessionId,
      params.sessionId
    );

    if (result.revokedCurrentSession) {
      clearAuthCookies(response);
    }

    sendSuccess(response, "Session revoked", result);
  } catch (error) {
    next(error);
  }
}

function getRequestMetadata(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent")
  };
}

function getCookie(request: Request, name: string): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];

  return typeof value === "string" ? value : undefined;
}

function parseBody<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) {
    throw new AppError("Request validation failed.", "VALIDATION_ERROR", 400);
  }

  return result.data;
}

function parseGoogleBody<T>(
  result:
    | { success: true; data: T }
    | {
        success: false;
        error: {
          issues: { path: (string | number)[] }[];
        };
      }
): T {
  if (!result.success) {
    const credentialIssue = result.error.issues.find(
      (issue) => issue.path[0] === "credential"
    );

    if (credentialIssue) {
      throw new AppError(
        "Google credential is required.",
        "GOOGLE_CREDENTIAL_REQUIRED",
        400
      );
    }

    throw new AppError("Request validation failed.", "VALIDATION_ERROR", 400);
  }

  return result.data;
}
