import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOptions } from "./config/cors.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import {
  apiRateLimiter,
  whatsappWebhookRateLimiter
} from "./middleware/rate-limit.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import {
  adminBusinessRouter,
  businessInvitationRouter,
  businessRouter
} from "./modules/businesses/business.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import {
  integrationOAuthRouter,
  metaWebhookRouter,
  whatsappWebhookRouter
} from "./modules/integrations/index.js";
import { legalRouter } from "./modules/legal/legal.routes.js";
import { publicFeedbackRouter } from "./modules/public-feedback/index.js";
import { customerDashboardRouter } from "./modules/customer-dashboard/index.js";
import {
  platformAdminRouter,
  platformSettingsPublicRouter
} from "./modules/platform-admin/index.js";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(
    "/api/integrations/whatsapp/webhook",
    whatsappWebhookRateLimiter,
    express.raw({ type: "application/json", limit: "3mb" }),
    whatsappWebhookRouter
  );
  app.use(
    "/api/integrations/meta/webhook",
    whatsappWebhookRateLimiter,
    express.raw({ type: "application/json", limit: "3mb" }),
    metaWebhookRouter
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use("/api", apiRateLimiter);

  app.use(legalRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/businesses", businessRouter);
  app.use("/api/business-invitations", businessInvitationRouter);
  app.use("/api/admin/businesses", adminBusinessRouter);
  app.use("/api/admin", platformAdminRouter);
  app.use("/api/platform-settings", platformSettingsPublicRouter);
  app.use("/api/integrations/email/oauth", authMiddleware, integrationOAuthRouter);
  app.use("/api/public/feedback", publicFeedbackRouter);
  app.use("/api/customer", customerDashboardRouter);
  app.use("/api/health", healthRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
