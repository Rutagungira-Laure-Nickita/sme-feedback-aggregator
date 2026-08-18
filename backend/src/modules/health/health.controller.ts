import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import { getApiHealth, getDatabaseHealth } from "./health.service.js";

export async function apiHealthController(
  _request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const health = await getApiHealth();
    sendSuccess(response, "API is healthy", health);
  } catch (error) {
    next(error);
  }
}

export async function databaseHealthController(
  _request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const health = await getDatabaseHealth();
    sendSuccess(response, "Database connection is healthy", health);
  } catch (error) {
    next(error);
  }
}
