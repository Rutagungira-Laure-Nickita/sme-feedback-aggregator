import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";

export type ApiHealth = {
  service: "sme-feedback-aggregator-api";
  status: "ok";
  environment: string;
  timestamp: string;
};

export type DatabaseHealth = {
  database: "mysql";
  status: "connected";
  timestamp: string;
};

export async function getApiHealth(): Promise<ApiHealth> {
  return {
    service: "sme-feedback-aggregator-api",
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
}

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      database: "mysql",
      status: "connected",
      timestamp: new Date().toISOString()
    };
  } catch {
    throw new AppError(
      "Database connection is unavailable.",
      "DATABASE_CONNECTION_FAILED",
      503
    );
  }
}
