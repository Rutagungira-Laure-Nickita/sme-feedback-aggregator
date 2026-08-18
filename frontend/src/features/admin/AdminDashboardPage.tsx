import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  MessageSquareText,
  PlugZap,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useState } from "react";
import { normalizeApiError } from "../../api/axios.js";
import { AdminShell, EmptyState, WorkspacePanel } from "../businesses/components.js";
import { formatRole } from "../businesses/format.js";
import { fetchAdminDashboard } from "./api.js";
import type { AdminDashboard, AdminPeriod } from "./types.js";

const PERIODS: Array<{ value: AdminPeriod; label: string }> = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "12m", label: "12 Months" }
];
const COLORS = [
  "#4f46e5",
  "#818cf8",
  "#e59a16",
  "#dc4c64",
  "#64748b",
  "#7c3aed",
  "#0891b2",
  "#c2410c",
  "#475569"
];
const AXIS_TICK = { fontSize: 11, fill: "rgb(var(--color-text-secondary))" };
const TOOLTIP_STYLE = {
  backgroundColor: "rgb(var(--color-surface))",
  border: "1px solid rgb(var(--color-border))",
  borderRadius: "0.5rem",
  color: "rgb(var(--color-text-primary))"
};

export function AdminDashboardPage(): JSX.Element {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const query = useQuery({
    queryKey: ["admin", "dashboard", period],
    queryFn: () => fetchAdminDashboard(period)
  });

  return (
    <AdminShell
      title="Platform overview"
      subtitle="Real-time operational intelligence across SME Feedback."
      actions={
        <Link
          to="/admin/reports"
          className="inline-flex min-h-10 items-center rounded-md bg-app-primary px-4 text-sm font-bold text-app-primary-foreground hover:bg-app-primary-hover"
        >
          Generate report
        </Link>
      }
    >
      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface-muted/45 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">Analytics period</p>
          <p className="text-xs font-medium text-app-text-muted">
            Trends use UTC-aligned persisted timestamps and compare the preceding period.
          </p>
        </div>
        <div className="flex flex-wrap gap-1" aria-label="Dashboard date range">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={`min-h-9 rounded-md px-3 text-xs font-bold transition ${
                period === item.value
                  ? "bg-app-primary text-app-primary-foreground"
                  : "text-app-text-muted hover:bg-app-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <DashboardSkeleton />
      ) : query.error || !query.data ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Dashboard data unavailable"
          description={normalizeApiError(query.error).message}
          action={
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="rounded-md bg-app-primary px-4 py-2 text-sm font-bold text-app-primary-foreground"
            >
              Try again
            </button>
          }
        />
      ) : (
        <DashboardContent dashboard={query.data} />
      )}
    </AdminShell>
  );
}

function DashboardContent({ dashboard }: { dashboard: AdminDashboard }): JSX.Element {
  const kpis = [
    ["Total Businesses", dashboard.primaryKpis.totalBusinesses, Building2],
    ["Active Businesses", dashboard.primaryKpis.activeBusinesses, CheckCircle2],
    ["Pending Approval", dashboard.primaryKpis.pendingBusinesses, AlertTriangle],
    ["Platform Users", dashboard.primaryKpis.totalUsers, Users],
    ["Total Feedback", dashboard.primaryKpis.totalFeedback, MessageSquareText],
    ["Live Integrations", dashboard.primaryKpis.liveIntegrations, PlugZap],
    [
      "Needs Attention",
      dashboard.primaryKpis.integrationsRequiringAttention,
      AlertTriangle
    ]
  ] as const;
  const sentimentData = [
    ...dashboard.sentiment.distribution,
    { sentiment: "NOT_ANALYZED", count: dashboard.sentiment.notAnalyzed }
  ].filter((item) => item.count > 0);
  const adoption = combineAdoption(dashboard.integrationAdoption);

  return (
    <div className="space-y-6">
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Platform key metrics"
      >
        {kpis.map(([label, metric, Icon]) => (
          <div
            key={label}
            className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm dark:bg-app-surface-muted/45"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">
                {label}
              </p>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">{formatNumber(metric?.value ?? 0)}</p>
            <p className="mt-2 min-h-5 text-xs font-semibold text-app-text-muted">
              {metric?.context
                ? formatComparison(metric.context)
                : metric?.affectedBusinesses
                  ? `${metric.affectedBusinesses} affected businesses`
                  : "Current platform total"}
            </p>
          </div>
        ))}
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Supporting platform metrics"
      >
        <CompactMetric
          label="Feedback today"
          value={dashboard.secondaryMetrics.feedbackToday ?? 0}
        />
        <CompactMetric
          label="This week"
          value={dashboard.secondaryMetrics.feedbackThisWeek ?? 0}
        />
        <CompactMetric
          label="This month"
          value={dashboard.secondaryMetrics.feedbackThisMonth ?? 0}
        />
        <CompactMetric
          label="Open workload"
          value={dashboard.secondaryMetrics.openFeedback ?? 0}
        />
        <CompactMetric
          label="Customers"
          value={dashboard.secondaryMetrics.totalCustomers ?? 0}
        />
      </section>

      <ChartPanel
        title="Platform feedback volume"
        description={`Current period versus the preceding ${dashboard.period.preset} period.`}
        empty={dashboard.feedbackTrend.every(
          (item) => item.count === 0 && item.previous === 0
        )}
        summary={dashboard.feedbackTrend
          .map((item) => `${item.date}: ${item.count}`)
          .join(", ")}
      >
        <ResponsiveContainer width="100%" height={330}>
          <LineChart
            data={dashboard.feedbackTrend}
            margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgb(var(--color-border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={AXIS_TICK}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={AXIS_TICK} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(value) => formatDate(String(value))}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name="Current period"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              name="Previous period"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel
          title="Channel distribution"
          description={`${formatNumber(dashboard.channelTotal)} feedback records in the selected period.`}
          empty={dashboard.channelDistribution.length === 0}
          summary={dashboard.channelDistribution
            .map((item) => `${formatRole(item.channel)} ${item.count}`)
            .join(", ")}
        >
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie
                data={dashboard.channelDistribution}
                dataKey="count"
                nameKey="channel"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={2}
              >
                {dashboard.channelDistribution.map((item, index) => (
                  <Cell key={item.channel} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => [
                  formatNumber(Number(value)),
                  formatRole(String(name))
                ]}
              />
              <Legend formatter={(value) => formatRole(String(value))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Business growth"
          description={`${dashboard.businessGrowth.newThisMonth} new this month · ${dashboard.businessGrowth.active} active · ${dashboard.businessGrowth.inactive} suspended.`}
          empty={dashboard.businessGrowth.series.every((item) => item.count === 0)}
          summary={dashboard.businessGrowth.series
            .map((item) => `${item.date}: ${item.count}`)
            .join(", ")}
        >
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={dashboard.businessGrowth.series}
              margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(var(--color-border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={AXIS_TICK}
                minTickGap={20}
              />
              <YAxis allowDecimals={false} tick={AXIS_TICK} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(value) => formatDate(String(value))}
              />
              <Bar
                dataKey="count"
                name="Businesses created"
                fill="#4f46e5"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Sentiment overview"
          description={`${formatNumber(dashboard.sentiment.analyzed)} completed analyses · ${dashboard.sentiment.completionRate === null ? "No completion rate yet" : `${dashboard.sentiment.completionRate}% completion`}.`}
          empty={sentimentData.length === 0}
          summary={sentimentData
            .map((item) => `${formatRole(item.sentiment)} ${item.count}`)
            .join(", ")}
        >
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie
                data={sentimentData}
                dataKey="count"
                nameKey="sentiment"
                innerRadius={62}
                outerRadius={103}
              >
                {sentimentData.map((item) => (
                  <Cell key={item.sentiment} fill={sentimentColor(item.sentiment)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => [
                  formatNumber(Number(value)),
                  formatRole(String(name))
                ]}
              />
              <Legend formatter={(value) => formatRole(String(value))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Integration adoption"
          description="Connected-provider records across businesses, separated by Live and Demo modes."
          empty={adoption.length === 0}
          summary={adoption
            .map(
              (item) =>
                `${formatRole(item.provider)} live ${item.LIVE}, demo ${item.DEMO}`
            )
            .join(", ")}
        >
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={adoption}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 30, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(var(--color-border))"
                horizontal={false}
              />
              <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
              <YAxis
                type="category"
                dataKey="provider"
                tickFormatter={(value) => formatRole(String(value))}
                width={95}
                tick={AXIS_TICK}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="LIVE" stackId="mode" fill="#0f9f7f" radius={[4, 0, 0, 4]} />
              <Bar dataKey="DEMO" stackId="mode" fill="#818cf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <WorkspacePanel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Integration health</h2>
              <p className="mt-1 text-sm font-medium text-app-text-muted">
                {dashboard.integrationHealth.affectedBusinesses} businesses and{" "}
                {dashboard.integrationHealth.affectedProviders} providers affected.
              </p>
            </div>
            <PlugZap className="h-5 w-5 text-app-primary" />
          </div>
          {dashboard.integrationHealth.distribution.length ? (
            <div className="mt-5 space-y-3">
              {dashboard.integrationHealth.distribution.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-md bg-app-surface-muted p-3"
                >
                  <span className="text-sm font-bold">{formatRole(item.status)}</span>
                  <span className="text-sm font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm font-semibold text-app-text-muted">
              No integration connections exist yet.
            </p>
          )}
        </WorkspacePanel>

        <WorkspacePanel
          className={
            dashboard.actions.length ? "border-amber-300 dark:border-amber-900/70" : ""
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Action required</h2>
              <p className="mt-1 text-sm font-medium text-app-text-muted">
                Only persisted operational problems appear here.
              </p>
            </div>
            <AlertTriangle
              className={`h-5 w-5 ${dashboard.actions.length ? "text-amber-600" : "text-emerald-600"}`}
            />
          </div>
          {dashboard.actions.length ? (
            <div className="mt-5 divide-y divide-app-border">
              {dashboard.actions.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-bold ${item.severity === "HIGH" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"}`}
                  >
                    {item.severity}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold">{item.title}</span>
                  <span className="text-sm font-bold">{item.count}</span>
                  <ArrowRight className="h-4 w-4 text-app-text-muted" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-3 rounded-md bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-bold">
                No persisted conditions currently require administrator action.
              </p>
            </div>
          )}
        </WorkspacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <WorkspacePanel>
          <h2 className="text-lg font-bold">Recent platform activity</h2>
          <p className="mt-1 text-sm font-medium text-app-text-muted">
            A safe cross-platform event stream with no raw payloads or secrets.
          </p>
          <div className="mt-5 space-y-1">
            {dashboard.recentActivity.length ? (
              dashboard.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 border-b border-app-border py-3 last:border-0"
                >
                  <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.event}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-app-text-muted">
                      {item.business.name} · {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-app-text-muted">
                No recent platform activity.
              </p>
            )}
          </div>
        </WorkspacePanel>

        <WorkspacePanel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Business overview</h2>
              <p className="mt-1 text-sm font-medium text-app-text-muted">
                Highest feedback-volume businesses.
              </p>
            </div>
            <Link to="/admin/businesses" className="text-sm font-bold text-app-primary">
              View all <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-border text-xs uppercase tracking-wide text-app-text-muted">
                  <th className="pb-3">Business</th>
                  <th className="pb-3">Branches</th>
                  <th className="pb-3">Users</th>
                  <th className="pb-3">Feedback</th>
                  <th className="pb-3">Live</th>
                  <th className="pb-3">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.businessOverview.map((item) => (
                  <tr key={item.id} className="border-b border-app-border last:border-0">
                    <td className="py-3">
                      <Link
                        className="font-bold hover:text-app-primary"
                        to={`/admin/businesses/${item.id}`}
                      >
                        {item.name}
                      </Link>
                      {item.needsAttention ? (
                        <span
                          className="ml-2 text-amber-600"
                          title="Integration attention required"
                        >
                          ●
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 font-semibold">{item.branches}</td>
                    <td className="py-3 font-semibold">{item.users}</td>
                    <td className="py-3 font-semibold">{item.feedback}</td>
                    <td className="py-3 font-semibold">{item.liveChannels}</td>
                    <td className="py-3 text-xs font-semibold text-app-text-muted">
                      {item.lastActivity
                        ? formatDateTime(item.lastActivity)
                        : "No activity"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  empty,
  summary,
  children
}: {
  title: string;
  description: string;
  empty: boolean;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspacePanel>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm font-medium text-app-text-muted">{description}</p>
      <div className="mt-5" role="img" aria-label={`${title}. ${summary || "No data."}`}>
        {empty ? (
          <div className="flex h-[290px] items-center justify-center rounded-lg border border-dashed border-app-border text-sm font-semibold text-app-text-muted">
            No data for this period
          </div>
        ) : (
          children
        )}
      </div>
    </WorkspacePanel>
  );
}

function CompactMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted/45 p-4">
      <p className="text-xs font-bold text-app-text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold">{formatNumber(value)}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading platform dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg bg-app-surface-muted"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-app-surface-muted" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg bg-app-surface-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-app-surface-muted" />
      </div>
    </div>
  );
}

function combineAdoption(items: AdminDashboard["integrationAdoption"]) {
  const result = new Map<string, { provider: string; LIVE: number; DEMO: number }>();
  items.forEach((item) => {
    const current = result.get(item.provider) ?? {
      provider: item.provider,
      LIVE: 0,
      DEMO: 0
    };
    current[item.mode === "LIVE" ? "LIVE" : "DEMO"] += item.count;
    result.set(item.provider, current);
  });
  return [...result.values()];
}

function formatComparison(context: {
  current: number;
  previous: number;
  delta: number;
  percentage: number | null;
}) {
  if (context.percentage === null)
    return `${context.current} in period · no prior baseline`;
  const sign = context.percentage > 0 ? "+" : "";
  return `${sign}${context.percentage}% vs previous period`;
}

function sentimentColor(sentiment: string) {
  return sentiment === "POSITIVE"
    ? "#0f9f7f"
    : sentiment === "NEGATIVE"
      ? "#dc4c64"
      : sentiment === "NEUTRAL"
        ? "#64748b"
        : sentiment === "MIXED"
          ? "#e59a16"
          : "#cbd5e1";
}
function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}
function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(value));
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
