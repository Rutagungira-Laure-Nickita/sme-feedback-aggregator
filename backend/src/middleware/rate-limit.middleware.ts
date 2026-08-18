import type { Request } from "express";
import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    error: {
      code: "RATE_LIMIT_EXCEEDED"
    }
  }
});

export const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED"
    }
  }
});

export const authRegisterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED"
    }
  }
});

export const authRefreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many session refresh attempts. Please sign in again.",
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED"
    }
  }
});

export const emailVerificationResendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const emailVerificationConfirmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const manualFeedbackRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (request: Request) => {
    const businessId =
      typeof request.params.businessId === "string"
        ? request.params.businessId
        : "unknown-business";
    const userId = request.auth?.id ?? "anonymous";

    return `manual-feedback:${businessId}:${userId}`;
  },
  message: {
    success: false,
    message: "Too many manual feedback submissions. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const aiAnalysisRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (request: Request) => {
    const businessId =
      typeof request.params.businessId === "string"
        ? request.params.businessId
        : "unknown-business";
    const userId = request.auth?.id ?? "anonymous";

    return `ai-analysis:${businessId}:${userId}`;
  },
  message: {
    success: false,
    message: "Too many AI analysis requests. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const automationManagementRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 90,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (request: Request) => {
    const businessId =
      typeof request.params.businessId === "string"
        ? request.params.businessId
        : "unknown-business";
    const userId = request.auth?.id ?? "anonymous";

    return `automation:${businessId}:${userId}`;
  },
  message: {
    success: false,
    message: "Too many automation requests. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const publicFeedbackRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (request: Request) => {
    const portalToken =
      typeof request.params.portalToken === "string"
        ? request.params.portalToken.slice(0, 16)
        : "unknown-portal";

    return `public-feedback:${portalToken}:${request.ip ?? "unknown-ip"}`;
  },
  message: {
    success: false,
    message:
      "Too many feedback submissions were made recently. Please wait and try again.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const publicQrFeedbackRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (request: Request) => {
    const qrToken =
      typeof request.params.qrToken === "string"
        ? request.params.qrToken.slice(0, 16)
        : "unknown-qr";

    return `qr-feedback:${qrToken}:${request.ip ?? "unknown-ip"}`;
  },
  message: {
    success: false,
    message:
      "Too many feedback submissions were made recently. Please wait and try again.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});

export const whatsappWebhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (request: Request) => `whatsapp-webhook:${request.ip ?? "unknown-ip"}`,
  message: {
    success: false,
    message: "Too many WhatsApp webhook requests. Please try again later.",
    error: {
      code: "RATE_LIMITED"
    }
  }
});
