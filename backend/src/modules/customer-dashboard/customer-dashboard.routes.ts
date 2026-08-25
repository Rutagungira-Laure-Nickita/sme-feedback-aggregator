import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/role.middleware.js";
import { UserRole } from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  getCustomerDashboard,
  getCustomerFeedbackDetail,
  listCustomerFeedback
} from "./customer-dashboard.service.js";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(160).optional(),
  status: z.enum(["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"]).optional(),
  channel: z.enum(["MANUAL", "PUBLIC_FORM", "QR_CODE", "WHATSAPP", "EMAIL"]).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest")
});

export const customerDashboardRouter = Router();
customerDashboardRouter.use(authMiddleware, requireRoles(UserRole.CUSTOMER));

customerDashboardRouter.get("/dashboard", async (request, response, next) => {
  try {
    sendSuccess(
      response,
      "Customer dashboard loaded",
      await getCustomerDashboard({ userId: request.auth!.id, role: request.auth!.role })
    );
  } catch (error) {
    next(error);
  }
});

customerDashboardRouter.get("/feedback", async (request, response, next) => {
  try {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success)
      throw new AppError(
        "Invalid customer feedback query.",
        "CUSTOMER_QUERY_INVALID",
        400
      );
    sendSuccess(
      response,
      "Customer feedback loaded",
      await listCustomerFeedback(
        { userId: request.auth!.id, role: request.auth!.role },
        parsed.data
      )
    );
  } catch (error) {
    next(error);
  }
});

customerDashboardRouter.get("/feedback/:feedbackId", async (request, response, next) => {
  try {
    sendSuccess(
      response,
      "Customer feedback detail loaded",
      await getCustomerFeedbackDetail(
        { userId: request.auth!.id, role: request.auth!.role },
        request.params.feedbackId ?? ""
      )
    );
  } catch (error) {
    next(error);
  }
});
