import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import {
  authLoginRateLimiter,
  authRefreshRateLimiter,
  authRegisterRateLimiter,
  emailVerificationConfirmRateLimiter,
  emailVerificationResendRateLimiter,
  forgotPasswordRateLimiter,
  passwordResetRateLimiter
} from "../../middleware/rate-limit.middleware.js";
import {
  confirmEmailVerificationController,
  forgotPasswordController,
  googleLinkController,
  googleLoginController,
  googleRegisterController,
  loginController,
  logoutAllController,
  logoutController,
  meController,
  refreshController,
  registerController,
  resendEmailVerificationController,
  resetPasswordController,
  revokeSessionController,
  sessionsController
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", authRegisterRateLimiter, registerController);
authRouter.post("/login", authLoginRateLimiter, loginController);
authRouter.post("/google/register", authRegisterRateLimiter, googleRegisterController);
authRouter.post("/google/login", authLoginRateLimiter, googleLoginController);
authRouter.post(
  "/email-verification/resend",
  emailVerificationResendRateLimiter,
  resendEmailVerificationController
);
authRouter.post(
  "/email-verification/confirm",
  emailVerificationConfirmRateLimiter,
  confirmEmailVerificationController
);
authRouter.post("/forgot-password", forgotPasswordRateLimiter, forgotPasswordController);
authRouter.post("/reset-password", passwordResetRateLimiter, resetPasswordController);
authRouter.post(
  "/google/link",
  authMiddleware,
  authLoginRateLimiter,
  googleLinkController
);
authRouter.post("/refresh", authRefreshRateLimiter, refreshController);
authRouter.post("/logout", logoutController);
authRouter.post("/logout-all", authMiddleware, logoutAllController);
authRouter.get("/me", authMiddleware, meController);
authRouter.get("/sessions", authMiddleware, sessionsController);
authRouter.delete("/sessions/:sessionId", authMiddleware, revokeSessionController);
