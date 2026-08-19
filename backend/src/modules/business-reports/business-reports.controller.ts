import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  businessReportPreviewSchema,
  businessReportRequestSchema
} from "./business-reports.schemas.js";
import { buildBusinessOwnerReport } from "./business-reports.service.js";
import {
  renderReportCsv,
  renderReportPdf
} from "../platform-admin/platform-admin.report-renderer.js";

function getOwnerActor(request: Request): { userId: string; role: UserRole } {
  if (!request.auth?.id) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }
  return { userId: request.auth.id, role: request.auth.role };
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

export async function businessReportPreviewController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const actor = getOwnerActor(request);
    const businessId = request.params.businessId ?? "";
    const input = parse(businessReportPreviewSchema.safeParse(request.body));
    sendSuccess(
      response,
      "Business report preview generated",
      await buildBusinessOwnerReport(actor, businessId, input)
    );
  } catch (error) {
    next(error);
  }
}

export async function businessReportExportController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const actor = getOwnerActor(request);
    const businessId = request.params.businessId ?? "";
    const input = parse(businessReportRequestSchema.safeParse(request.body));
    const report = await buildBusinessOwnerReport(actor, businessId, input);
    const extension = input.outputFormat.toLowerCase();
    const filename = `business-performance-${new Date().toISOString().slice(0, 10)}.${extension}`;
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
