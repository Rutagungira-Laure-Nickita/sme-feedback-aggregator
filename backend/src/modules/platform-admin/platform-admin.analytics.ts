import type { IntegrationConnectionStatus, IntegrationMode } from "@prisma/client";
import type { AdminPeriod } from "./platform-admin.schemas.js";

export type DateWindow = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  bucket: "day" | "week" | "month";
};

export function resolveDateWindow(period: AdminPeriod, now = new Date()): DateWindow {
  const end = new Date(now);
  let start: Date;
  let bucket: DateWindow["bucket"];

  if (period === "12m") {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
    bucket = "month";
  } else {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - (days - 1));
    bucket = period === "90d" ? "week" : "day";
  }

  const duration = end.getTime() - start.getTime();
  return {
    start,
    end,
    previousStart: new Date(start.getTime() - duration - 1),
    previousEnd: new Date(start.getTime() - 1),
    bucket
  };
}

export function calculateChange(current: number, previous: number) {
  return {
    current,
    previous,
    delta: current - previous,
    percentage:
      previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(1))
  };
}

export type IntegrationHealthInput = {
  status: IntegrationConnectionStatus;
  mode: IntegrationMode;
  requiresReauthorization: boolean;
  webhookStatus: string | null;
  lastConnectionTestStatus: string | null;
  lastErrorCode: string | null;
};

export function classifyIntegrationHealth(
  connection: IntegrationHealthInput
): "HEALTHY" | "DISCONNECTED" | "PAUSED" | "ERROR" | "PENDING" | "NEEDS_ATTENTION" {
  if (connection.status === "DISCONNECTED") return "DISCONNECTED";
  if (connection.status === "PAUSED") return "PAUSED";
  if (connection.status === "ERROR") return "ERROR";
  if (connection.requiresReauthorization || connection.lastErrorCode) {
    return "NEEDS_ATTENTION";
  }

  const webhook = connection.webhookStatus?.toUpperCase() ?? null;
  if (connection.mode === "LIVE" && webhook?.includes("PENDING")) return "PENDING";
  if (webhook?.includes("FAIL") || webhook?.includes("ERROR")) {
    return "NEEDS_ATTENTION";
  }

  const testStatus = connection.lastConnectionTestStatus?.toUpperCase() ?? null;
  if (testStatus && !["PASSED", "SUCCESS", "HEALTHY", "CONNECTED"].includes(testStatus)) {
    return "NEEDS_ATTENTION";
  }

  return "HEALTHY";
}

export function csvEscape(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const text = typeof value === "string" && /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export function summarizeDistribution<T extends string>(
  groups: Array<{ key: T; count: number }>,
  total = groups.reduce((sum, group) => sum + group.count, 0)
) {
  return groups.map((group) => ({
    key: group.key,
    count: group.count,
    percentage: total ? Number(((group.count / total) * 100).toFixed(1)) : 0
  }));
}

export function summarizeSentiment(
  feedbackTotal: number,
  groups: Array<{ sentiment: string | null; count: number }>
) {
  const analyzed = groups.reduce((sum, group) => sum + group.count, 0);
  return {
    distribution: groups.map((group) => ({
      sentiment: group.sentiment ?? "NOT_ANALYZED",
      count: group.count
    })),
    analyzed,
    notAnalyzed: Math.max(0, feedbackTotal - analyzed),
    completionRate: feedbackTotal
      ? Number(((analyzed / feedbackTotal) * 100).toFixed(1))
      : null
  };
}
