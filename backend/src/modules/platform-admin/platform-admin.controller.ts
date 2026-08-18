import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  adminDashboardQuerySchema,
  adminFeedbackQuerySchema,
  adminEntityParamsSchema,
  adminIntegrationActionSchema,
  adminIntegrationsQuerySchema,
  adminReportPreviewSchema,
  adminReportRequestSchema,
  adminUsersQuerySchema,
  adminUserActionSchema,
  adminUserUpdateSchema,
  platformSettingsUpdateSchema
} from "./platform-admin.schemas.js";
import { renderReportCsv, renderReportPdf } from "./platform-admin.report-renderer.js";
import {
  applyAdminIntegrationAction,
  applyAdminUserAction,
  getAdminFeedback,
  getAdminIntegration,
  getAdminUser,
  getAdminFilterOptions,
  getAdminDashboard,
  getAdminSystemHealth,
  listAdminFeedback,
  listAdminIntegrations,
  listAdminUsers,
  updateAdminUser
} from "./platform-admin.service.js";
import { buildAdminReport } from "./platform-admin.reports.js";
import {
  getPlatformSettings,
  updatePlatformSettings
} from "./platform-settings.service.js";

export async function publicPlatformSettingsController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    sendSuccess(response, "Platform settings loaded", await getPlatformSettings());
  } catch (error) {
    next(error);
  }
}

export async function adminPlatformSettingsController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    sendSuccess(response, "Platform settings loaded", await getPlatformSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateAdminPlatformSettingsController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const input = parse(platformSettingsUpdateSchema.safeParse(request.body));
    const userId = request.auth?.id;

    if (!userId) {
      throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
    }

    sendSuccess(
      response,
      "Platform settings updated",
      await updatePlatformSettings(input, userId)
    );
  } catch (error) {
    next(error);
  }
}

export async function adminFilterOptionsController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    sendSuccess(response, "Admin filter options loaded", await getAdminFilterOptions());
  } catch (error) {
    next(error);
  }
}

export async function adminDashboardController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const query = parse(adminDashboardQuerySchema.safeParse(request.query));
    sendSuccess(
      response,
      "Platform dashboard loaded",
      await getAdminDashboard(query.period)
    );
  } catch (error) {
    next(error);
  }
}

export async function adminUsersController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const query = parse(adminUsersQuerySchema.safeParse(request.query));
    sendSuccess(response, "Platform users loaded", await listAdminUsers(query));
  } catch (error) {
    next(error);
  }
}

export async function adminUserDetailController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { entityId } = parse(adminEntityParamsSchema.safeParse(request.params));
    sendSuccess(response, "Platform user loaded", await getAdminUser(entityId));
  } catch (error) {
    next(error);
  }
}

export async function updateAdminUserController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { entityId } = parse(adminEntityParamsSchema.safeParse(request.params));
    const input = parse(adminUserUpdateSchema.safeParse(request.body));
    sendSuccess(
      response,
      "Platform user updated",
      await updateAdminUser(requireActorId(request), entityId, input)
    );
  } catch (error) {
    next(error);
  }
}

export async function adminUserActionController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { entityId } = parse(adminEntityParamsSchema.safeParse(request.params));
    const { action } = parse(adminUserActionSchema.safeParse(request.body));
    sendSuccess(
      response,
      "Platform user action completed",
      await applyAdminUserAction(requireActorId(request), entityId, action)
    );
  } catch (error) {
    next(error);
  }
}

export async function adminFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const query = parse(adminFeedbackQuerySchema.safeParse(request.query));
    sendSuccess(response, "Platform feedback loaded", await listAdminFeedback(query));
  } catch (error) {
    next(error);
  }
}

export async function adminFeedbackDetailController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { entityId } = parse(adminEntityParamsSchema.safeParse(request.params));
    sendSuccess(response, "Platform feedback loaded", await getAdminFeedback(entityId));
  } catch (error) {
    next(error);
  }
}

export async function adminIntegrationsController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const query = parse(adminIntegrationsQuerySchema.safeParse(request.query));
    sendSuccess(
      response,
      "Platform integrations loaded",
      await listAdminIntegrations(query)
    );
  } catch (error) {
    next(error);
  }
}

export async function adminIntegrationDetailController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { entityId } = parse(adminEntityParamsSchema.safeParse(request.params));
    sendSuccess(
      response,
      "Platform integration loaded",
      await getAdminIntegration(entityId)
    );
  } catch (error) {
    next(error);
  }
}

export async function adminIntegrationActionController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { entityId } = parse(adminEntityParamsSchema.safeParse(request.params));
    const { action } = parse(adminIntegrationActionSchema.safeParse(request.body));
    sendSuccess(
      response,
      "Platform integration action completed",
      await applyAdminIntegrationAction(requireActorId(request), entityId, action)
    );
  } catch (error) {
    next(error);
  }
}

export async function adminSystemHealthController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    sendSuccess(response, "System health loaded", await getAdminSystemHealth());
  } catch (error) {
    next(error);
  }
}

export async function adminReportPreviewController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const input = parse(adminReportPreviewSchema.safeParse(request.body));
    sendSuccess(response, "Report preview generated", await buildAdminReport(input));
  } catch (error) {
    next(error);
  }
}

export async function adminReportExportController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const input = parse(adminReportRequestSchema.safeParse(request.body));
    const report = await buildAdminReport(input);
    const extension = input.outputFormat.toLowerCase();
    const filename = `sme-feedback-${input.reportType.toLowerCase().replaceAll("_", "-")}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    const body =
      input.outputFormat === "PDF"
        ? await renderReportPdf(report)
        : renderReportCsv(report);
    response.set({
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        input.outputFormat === "PDF" ? "application/pdf" : "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    });
    response.status(200).send(body);
  } catch (error) {
    next(error);
  }
}

function parse<T>(
  result:
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ message: string }> } }
): T {
  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Request validation failed.",
      "VALIDATION_ERROR",
      400
    );
  }
  return result.data;
}

function requireActorId(request: Request): string {
  if (!request.auth?.id) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }
  return request.auth.id;
}
