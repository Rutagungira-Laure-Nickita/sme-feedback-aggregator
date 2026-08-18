import { Router } from "express";
import {
  businessReportExportController,
  businessReportPreviewController
} from "./business-reports.controller.js";

export const businessReportsRouter = Router({ mergeParams: true });

// POST /api/businesses/:businessId/reports/preview
businessReportsRouter.post("/preview", businessReportPreviewController);

// POST /api/businesses/:businessId/reports/export
businessReportsRouter.post("/export", businessReportExportController);
