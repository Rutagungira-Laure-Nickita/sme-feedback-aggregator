import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  Edit,
  FileText,
  Inbox,
  MessageSquarePlus,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  UserRoundPlus
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { ThemeToggle } from "../../app/theme/ThemeToggle.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import { CollectionViewToggle } from "../../components/collection-view/CollectionViewToggle.js";
import type { CollectionView } from "../../components/collection-view/collection-view.js";
import { useCollectionView } from "../../components/collection-view/useCollectionView.js";
import { useAuthStore } from "../../store/authStore.js";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AdminDetailModal, ConfirmActionModal } from "../admin/AdminDetailModal.js";
import { BrandMark } from "../auth/components/BrandMark.js";
import { GoogleCredentialButton } from "../auth/components/GoogleCredentialButton.js";
import { TextField } from "../auth/components/TextField.js";
import {
  acceptInvitationWithGoogle,
  acceptInvitationWithPassword,
  acceptInvitationWithSession,
  cancelInvitation,
  createBranchForBusiness,
  createBusinessFromSetup,
  createStaffInvitationForBusiness,
  fetchAdminBusiness,
  fetchAdminBusinesses,
  fetchBranch,
  fetchBranches,
  fetchBusiness,
  fetchInvitations,
  fetchMembership,
  fetchMemberships,
  fetchMyBusinesses,
  previewInvitation,
  resendInvitation,
  setAdminBusinessStatus,
  setBranchStatus,
  setMembershipStatus,
  setPrimaryBranchForBusiness,
  updateBranchForBusiness,
  updateAdminBusiness,
  updateBusinessProfile,
  updateMembershipBranchAccessForBusiness,
  updateMembershipRoleForBusiness
} from "./api/businessApi.js";
import {
  AdminShell,
  EmptyState,
  InitialsBadge,
  RowLink,
  StatCard,
  StatusBadge,
  SuspendedBanner,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import { formatRole } from "./format.js";
import { PublicFeedbackSettingsPanel } from "./PublicFeedbackSettingsPanel.js";
import { previewBusinessReport } from "./reportsApi.js";
import {
  createCategory,
  fetchBusinessAIStatus,
  fetchCategories,
  requestBusinessAIBackfill,
  updateCategory,
  updateCategoryActivation,
  type FeedbackCategoryResponse
} from "./feedbackInboxApi.js";
import {
  branchFormSchema,
  businessSettingsSchema,
  businessSetupSchema,
  invitationPasswordSchema,
  inviteStaffSchema,
  membershipBranchAccessSchema,
  type BranchFormValues,
  type BusinessSettingsValues,
  type BusinessSetupValues,
  type InvitationPasswordValues,
  type InviteStaffValues,
  type MembershipBranchAccessValues
} from "./schemas.js";
import type {
  BranchStatus,
  BranchSummary,
  BusinessDetail,
  BusinessMemberRole,
  BusinessStatus,
  MyBusiness
} from "./types.js";

type LoadedBusinessContext = Extract<
  ReturnType<typeof useBusinessContext>,
  { state: null }
>;

type CategoryFormState = {
  name: string;
  description: string;
  colorKey: string;
};

const CATEGORY_COLOR_OPTIONS = [
  { key: "slate", label: "Slate" },
  { key: "blue", label: "Blue" },
  { key: "indigo", label: "Indigo" },
  { key: "violet", label: "Violet" },
  { key: "emerald", label: "Emerald" },
  { key: "amber", label: "Amber" },
  { key: "orange", label: "Orange" },
  { key: "rose", label: "Red" }
] as const;

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  slate:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700",
  blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60",
  indigo:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/60",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60",
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
  orange:
    "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60",
  rose: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60"
};

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: "",
  description: "",
  colorKey: "indigo"
};

export function BusinessIndexPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, error } = useQuery({
    queryKey: ["businesses", "mine"],
    queryFn: () => fetchMyBusinesses({ pageSize: 100 })
  });

  if (isLoading) {
    return (
      <StandaloneState
        title="Loading workspace"
        description="Checking your business memberships."
      />
    );
  }

  if (error) {
    return (
      <StandaloneState
        title="Workspace unavailable"
        description={normalizeApiError(error).message}
      />
    );
  }

  const businesses = data?.businesses ?? [];

  if (businesses.length > 0) {
    const storedBusinessId = localStorage.getItem("sme-active-business-id");
    const target =
      businesses.find((business) => business.id === storedBusinessId) ?? businesses[0];

    return <Navigate to={`/business/${target?.id ?? businesses[0]?.id}`} replace />;
  }

  if (user?.role === "BUSINESS_OWNER") {
    return <Navigate to="/business/setup" replace />;
  }

  return (
    <StandaloneState
      title="No business access"
      description="Your account does not currently belong to a business workspace. Ask a business owner or administrator for an invitation."
    />
  );
}

export function BusinessSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<BusinessSetupValues>({
    resolver: zodResolver(businessSetupSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Kigali",
      country: "Rwanda",
      primaryBranchCountry: "Rwanda"
    }
  });
  const mutation = useMutation({
    mutationFn: createBusinessFromSetup,
    onSuccess(result) {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
      localStorage.setItem("sme-active-business-id", result.business.id);
      navigate(`/business/${result.business.id}`, { replace: true });
    }
  });
  const apiError = mutation.error ? normalizeApiError(mutation.error).message : null;

  return (
    <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
      <section className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1180px] rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)]">
        <header className="flex flex-col gap-5 border-b border-app-border px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <BrandMark compact />
            <h1 className="mt-8 text-2xl font-black sm:text-3xl">Create your business</h1>
            <p className="mt-2 text-sm font-medium text-app-text-muted">
              Set up a workspace, primary branch, and owner membership in one transaction.
            </p>
          </div>
          <ThemeToggle compact />
        </header>
        <form
          className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <WorkspacePanel>
            <SectionTitle
              title="Business information"
              description="Core profile details used across the workspace."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextField
                label="Business name *"
                id="name"
                placeholder="Fresh Dairy Ltd"
                {...form.register("name")}
                error={form.formState.errors.name?.message}
                size="comfortable"
              />
              <TextField
                label="Industry *"
                id="industry"
                placeholder="Food and beverage"
                {...form.register("industry")}
                error={form.formState.errors.industry?.message}
                size="comfortable"
              />
              <FieldArea
                className="sm:col-span-2"
                label="Description"
                id="description"
                placeholder="A short summary of what your business does."
                {...form.register("description")}
                error={form.formState.errors.description?.message}
              />
              <TextField
                label="Contact email *"
                id="email"
                type="email"
                placeholder="owner@example.com"
                {...form.register("email")}
                error={form.formState.errors.email?.message}
                size="comfortable"
              />
              <TextField
                label="Phone *"
                id="phone"
                placeholder="+250 788 123 456"
                {...form.register("phone")}
                error={form.formState.errors.phone?.message}
                size="comfortable"
              />
              <TextField
                label="Website"
                id="website"
                placeholder="https://freshdairy.example"
                {...form.register("website")}
                error={form.formState.errors.website?.message}
                size="comfortable"
              />
              <TextField
                label="Logo URL"
                id="logoUrl"
                placeholder="https://freshdairy.example/logo.png"
                {...form.register("logoUrl")}
                error={form.formState.errors.logoUrl?.message}
                size="comfortable"
              />
            </div>

            <SectionTitle
              className="mt-8"
              title="Address"
              description="Business address and operating timezone."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextField
                label="Country *"
                id="country"
                placeholder="Rwanda"
                {...form.register("country")}
                error={form.formState.errors.country?.message}
                size="comfortable"
              />
              <TextField
                label="City *"
                id="city"
                placeholder="Kigali"
                {...form.register("city")}
                error={form.formState.errors.city?.message}
                size="comfortable"
              />
              <TextField
                label="District"
                id="district"
                placeholder="Gasabo"
                {...form.register("district")}
                error={form.formState.errors.district?.message}
                size="comfortable"
              />
              <TextField
                label="Timezone *"
                id="timezone"
                placeholder="Africa/Kigali"
                {...form.register("timezone")}
                error={form.formState.errors.timezone?.message}
                size="comfortable"
              />
              <TextField
                className="sm:col-span-2"
                label="Address *"
                id="addressLine"
                placeholder="KG 12 Ave, Kigali"
                {...form.register("addressLine")}
                error={form.formState.errors.addressLine?.message}
                size="comfortable"
              />
            </div>

            <SectionTitle
              className="mt-8"
              title="Primary branch"
              description="Every business starts with one active primary branch."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextField
                label="Branch name *"
                id="primaryBranchName"
                placeholder="Remera counter"
                {...form.register("primaryBranchName")}
                error={form.formState.errors.primaryBranchName?.message}
                size="comfortable"
              />
              <TextField
                label="Branch code *"
                id="primaryBranchCode"
                placeholder="REMERA-1"
                {...form.register("primaryBranchCode")}
                error={form.formState.errors.primaryBranchCode?.message}
                size="comfortable"
              />
              <TextField
                label="Branch country *"
                id="primaryBranchCountry"
                placeholder="Rwanda"
                {...form.register("primaryBranchCountry")}
                error={form.formState.errors.primaryBranchCountry?.message}
                size="comfortable"
              />
              <TextField
                label="Branch city *"
                id="primaryBranchCity"
                placeholder="Kigali"
                {...form.register("primaryBranchCity")}
                error={form.formState.errors.primaryBranchCity?.message}
                size="comfortable"
              />
              <TextField
                label="Branch district"
                id="primaryBranchDistrict"
                placeholder="Gasabo"
                {...form.register("primaryBranchDistrict")}
                error={form.formState.errors.primaryBranchDistrict?.message}
                size="comfortable"
              />
              <TextField
                label="Branch phone"
                id="primaryBranchPhone"
                placeholder="+250 788 123 456"
                {...form.register("primaryBranchPhone")}
                error={form.formState.errors.primaryBranchPhone?.message}
                size="comfortable"
              />
              <TextField
                label="Branch email"
                id="primaryBranchEmail"
                type="email"
                placeholder="remera@example.com"
                {...form.register("primaryBranchEmail")}
                error={form.formState.errors.primaryBranchEmail?.message}
                size="comfortable"
              />
              <TextField
                label="Branch address *"
                id="primaryBranchAddressLine"
                placeholder="KG 18 St, Remera"
                {...form.register("primaryBranchAddressLine")}
                error={form.formState.errors.primaryBranchAddressLine?.message}
                size="comfortable"
              />
            </div>
          </WorkspacePanel>

          <aside className="space-y-5">
            <WorkspacePanel>
              <SectionTitle
                title="What happens next?"
                description="The backend creates all required records safely."
              />
              <ol className="mt-5 space-y-4 text-sm font-semibold text-app-text-muted">
                <li>1. Business profile is created.</li>
                <li>2. Primary branch is created active.</li>
                <li>3. You become business owner.</li>
                <li>4. Branch access is set to all branches.</li>
                <li>
                  5. Platform review is required before workspace operations unlock.
                </li>
              </ol>
            </WorkspacePanel>
            {apiError ? <InlineError message={apiError} /> : null}
            <WorkspaceButton type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Submit business for review"}
            </WorkspaceButton>
          </aside>
        </form>
      </section>
    </main>
  );
}

export function BusinessOverviewPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <BusinessOverviewContent context={context} />;
}

function BusinessOverviewContent({
  context
}: {
  context: LoadedBusinessContext;
}): JSX.Element {
  const user = useAuthStore((state) => state.user);

  const { activeBusiness, businesses, business, permissions } = context;
  const reportRange = ownerDashboardDateRange();
  const dashboardQuery = useQuery({
    queryKey: ["businesses", business.id, "owner-dashboard", reportRange],
    queryFn: () =>
      previewBusinessReport(business.id, {
        ...reportRange,
        comparePreviousPeriod: true
      }),
    enabled: user?.role === "BUSINESS_OWNER" && business.status === "ACTIVE",
    staleTime: 60_000
  });
  const report = dashboardQuery.data;
  const highlights = new Map(report?.highlights.map((item) => [item.label, item.value]));
  const feedbackTrend = reportSectionRows(report, "Feedback trend").map((row) => ({
    period: String(row[0] ?? ""),
    feedback: Number(row[1] ?? 0)
  }));
  const sentiment = reportSectionRows(report, "Sentiment analysis").map((row) => ({
    name: String(row[0] ?? "Not analyzed"),
    value: Number(row[1] ?? 0)
  }));
  const channels = reportSectionRows(report, "Channel distribution").map((row) => ({
    name: formatRole(String(row[0] ?? "Other")),
    value: Number(row[1] ?? 0)
  }));
  const importantFeedback = reportSectionRows(
    report,
    "Important customer experience feedback"
  ).slice(0, 4);
  const periodFeedback = dashboardHighlight(highlights, "Feedback in selected period");
  const openFeedback = dashboardHighlight(highlights, "Open feedback (period)");
  const unresolvedPriority = dashboardHighlight(
    highlights,
    "Unresolved high or urgent (period)"
  );
  const averageRating = dashboardHighlight(highlights, "Average rating (period)");
  const healthyIntegrations = dashboardHighlight(highlights, "Healthy connections");
  const firstName = user?.firstName?.trim() || "there";

  return (
    <WorkspaceShell
      title={`Welcome back, ${firstName}`}
      subtitle={`${business.name} · Customer experience overview for the last 30 days.`}
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        permissions.canManageBranches ? (
          <WorkspaceButton to={`/business/${business.id}/feedback`}>
            <Inbox className="h-4 w-4" />
            View feedback
          </WorkspaceButton>
        ) : null
      }
    >
      {business.status === "SUSPENDED" ? <SuspendedBanner type="business" /> : null}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-5 py-6 text-white shadow-xl shadow-indigo-900/15 sm:px-7 sm:py-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-100">
              Business pulse
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-black leading-tight sm:text-3xl">
              Understand what customers feel and what your team should address next.
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-100">
              This dashboard is built from your business-scoped feedback, workflow,
              customer, and Live integration records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/business/${business.id}/feedback/manual`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              Add feedback
            </Link>
            <Link
              to={`/business/${business.id}/reports`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Open report
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Feedback · 30 days"
          value={dashboardQuery.isLoading ? "—" : periodFeedback}
          detail="Customer voice received in this period"
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Open feedback"
          value={dashboardQuery.isLoading ? "—" : openFeedback}
          detail="New or currently in review"
          icon={<Inbox className="h-4 w-4" aria-hidden="true" />}
          tone="sky"
        />
        <StatCard
          label="Needs attention"
          value={dashboardQuery.isLoading ? "—" : unresolvedPriority}
          detail="High or urgent unresolved feedback"
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          tone="amber"
        />
        <StatCard
          label="Average rating"
          value={dashboardQuery.isLoading ? "—" : averageRating}
          detail="Across rated feedback in this period"
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          tone="emerald"
        />
      </div>

      {dashboardQuery.error ? (
        <div className="mt-5">
          <InlineError message={normalizeApiError(dashboardQuery.error).message} />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <WorkspacePanel>
          <SectionTitle
            title="Feedback volume"
            description="The customer voice reaching this workspace across the selected period."
          />
          <div className="mt-5 h-72 min-w-0" aria-label="Feedback volume chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={feedbackTrend}
                margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="owner-feedback-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="rgb(var(--color-border))"
                />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={dashboardTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="feedback"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="url(#owner-feedback-area)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>
        <WorkspacePanel>
          <SectionTitle
            title="Sentiment mix"
            description="Completed AI analyses in the same period."
          />
          <div className="mt-3 h-52" aria-label="Sentiment mix chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentiment}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={76}
                  paddingAngle={3}
                >
                  {sentiment.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={dashboardChartColors[index % dashboardChartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={dashboardTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sentiment.slice(0, 4).map((item, index) => (
              <div
                key={item.name}
                className="flex min-w-0 items-center gap-2 text-xs font-bold text-app-text-muted"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      dashboardChartColors[index % dashboardChartColors.length]
                  }}
                />
                <span className="truncate">{formatRole(item.name)}</span>
                <span className="ml-auto text-app-text">{item.value}</span>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <WorkspacePanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              title="Feedback needing attention"
              description="Recent high-priority or negative customer experience signals."
            />
            <Link
              to={`/business/${business.id}/feedback?priority=HIGH`}
              className="inline-flex items-center gap-1 text-sm font-black text-app-primary hover:underline"
            >
              Open inbox <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {importantFeedback.length ? (
              importantFeedback.map((row, index) => (
                <div
                  key={`${String(row[0])}-${index}`}
                  className="grid gap-3 rounded-xl bg-app-surface-muted/75 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black text-app-text-muted">
                      <span>{String(row[2] ?? "Branch")}</span>
                      <span>·</span>
                      <span>{formatRole(String(row[3] ?? "Normal"))}</span>
                      <span>·</span>
                      <span>{formatRole(String(row[5] ?? "Not analyzed"))}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-app-text">
                      {String(row[8] ?? "Feedback details unavailable")}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-app-text-muted">
                    {formatDate(String(row[0]))}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                title="Nothing urgent in this period"
                description="High-priority and negative feedback will be surfaced here when it arrives."
              />
            )}
          </div>
        </WorkspacePanel>
        <div className="space-y-5">
          <WorkspacePanel>
            <SectionTitle
              title="Workspace health"
              description="Live operational context at a glance."
            />
            <dl className="mt-5 space-y-4">
              {[
                {
                  label: "Active branches",
                  value: business.counts.activeBranches,
                  icon: Building2
                },
                { label: "Active staff", value: business.counts.staff, icon: Users },
                {
                  label: "Pending invitations",
                  value: business.counts.pendingInvitations,
                  icon: UserRoundPlus
                },
                {
                  label: "Healthy Live integrations",
                  value: healthyIntegrations,
                  icon: CheckCircle2
                }
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary-soft text-app-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <dt className="min-w-0 flex-1 text-sm font-semibold text-app-text-muted">
                    {label}
                  </dt>
                  <dd className="text-base font-black text-app-text">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </WorkspacePanel>
          <WorkspacePanel>
            <SectionTitle
              title="Quick actions"
              description="Keep customer experience work moving."
            />
            <div className="mt-5 grid gap-2">
              <WorkspaceButton
                to={`/business/${business.id}/feedback/qr-codes`}
                tone="secondary"
              >
                <QrCode className="h-4 w-4" />
                Manage QR codes
              </WorkspaceButton>
              <WorkspaceButton
                to={`/business/${business.id}/automations`}
                tone="secondary"
              >
                <Sparkles className="h-4 w-4" />
                Review automations
              </WorkspaceButton>
              {permissions.canManageStaff ? (
                <WorkspaceButton
                  to={`/business/${business.id}/staff/invite`}
                  tone="secondary"
                >
                  <UserRoundPlus className="h-4 w-4" />
                  Invite staff
                </WorkspaceButton>
              ) : null}
            </div>
          </WorkspacePanel>
        </div>
      </div>

      {channels.length ? (
        <WorkspacePanel className="mt-5">
          <SectionTitle
            title="Where feedback comes from"
            description="Real channel distribution for the selected period."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {channels.slice(0, 8).map((item, index) => (
              <div key={item.name} className="rounded-xl bg-app-surface-muted/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-app-text">{item.name}</span>
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        dashboardChartColors[index % dashboardChartColors.length]
                    }}
                  />
                </div>
                <p className="mt-3 text-2xl font-black text-app-text">{item.value}</p>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      ) : null}
    </WorkspaceShell>
  );
}

const dashboardChartColors = [
  "#4f46e5",
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#8b5cf6",
  "#ef4444"
];
const dashboardTooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgb(var(--color-border))",
  background: "rgb(var(--color-surface))",
  color: "rgb(var(--color-text-primary))",
  boxShadow: "0 12px 35px rgba(15,23,42,.12)"
};

function ownerDashboardDateRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { dateFrom: toDateInput(from), dateTo: toDateInput(to) };
}

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function reportSectionRows(
  report: Awaited<ReturnType<typeof previewBusinessReport>> | undefined,
  title: string
) {
  return report?.sections.find((section) => section.title === title)?.rows ?? [];
}

function dashboardHighlight(
  highlights: Map<string, string | number>,
  label: string
): string | number {
  return highlights.get(label) ?? 0;
}

export function BusinessSettingsPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <BusinessSettingsContent context={context} />;
}

function BusinessSettingsContent({
  context
}: {
  context: LoadedBusinessContext;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<
    "profile" | "public" | "ai" | "categories"
  >("profile");
  const { activeBusiness, businesses, business, permissions } = context;
  const form = useForm<BusinessSettingsValues>({
    resolver: zodResolver(businessSettingsSchema),
    values: businessToSettingsValues(business)
  });
  const mutation = useMutation({
    mutationFn: (values: BusinessSettingsValues) =>
      updateBusinessProfile(business.id, values),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
    }
  });

  return (
    <WorkspaceShell
      title="Business settings"
      subtitle="Manage business profile and supported operating details."
      businesses={businesses}
      activeBusiness={activeBusiness}
    >
      {business.status === "SUSPENDED" ? <SuspendedBanner type="business" /> : null}
      <section className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-900/10 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-100">
          Business configuration center
        </p>
        <h2 className="mt-2 text-2xl font-black">Shape how your workspace operates</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-indigo-100">
          Keep your business identity, customer feedback channels, AI processing, and
          categorization organized in one place.
        </p>
      </section>
      <div
        className="mb-5 grid gap-2 rounded-2xl border border-app-border bg-app-surface p-2 sm:grid-cols-2 xl:grid-cols-4"
        role="tablist"
        aria-label="Business settings sections"
      >
        {(
          [
            { value: "profile", label: "Business Profile", icon: Building2 },
            { value: "public", label: "Public Feedback", icon: MessageSquarePlus },
            { value: "ai", label: "AI & Processing", icon: Sparkles },
            { value: "categories", label: "Feedback Categories", icon: BarChart3 }
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={String(value)}
            type="button"
            role="tab"
            aria-selected={activeSection === value}
            onClick={() => setActiveSection(value as typeof activeSection)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
              activeSection === value
                ? "bg-app-primary text-white shadow-md shadow-indigo-500/20"
                : "text-app-text-muted hover:bg-app-surface-muted hover:text-app-text"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {activeSection === "profile" ? (
        <form
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <WorkspacePanel>
            <SectionTitle
              title="Business profile"
              description="Logo storage is not configured, so a validated logo URL is used."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Business name"
                id="settings-name"
                {...form.register("name")}
                error={form.formState.errors.name?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Industry"
                id="settings-industry"
                {...form.register("industry")}
                error={form.formState.errors.industry?.message}
                size="comfortable"
              />
              <FieldArea
                disabled={!permissions.canManageBusiness}
                className="sm:col-span-2"
                label="Description"
                id="settings-description"
                {...form.register("description")}
                error={form.formState.errors.description?.message}
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Contact email"
                id="settings-email"
                type="email"
                {...form.register("email")}
                error={form.formState.errors.email?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Phone"
                id="settings-phone"
                {...form.register("phone")}
                error={form.formState.errors.phone?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Website"
                id="settings-website"
                {...form.register("website")}
                error={form.formState.errors.website?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Logo URL"
                id="settings-logo"
                {...form.register("logoUrl")}
                error={form.formState.errors.logoUrl?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Country"
                id="settings-country"
                {...form.register("country")}
                error={form.formState.errors.country?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="City"
                id="settings-city"
                {...form.register("city")}
                error={form.formState.errors.city?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="District"
                id="settings-district"
                {...form.register("district")}
                error={form.formState.errors.district?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                label="Timezone"
                id="settings-timezone"
                {...form.register("timezone")}
                error={form.formState.errors.timezone?.message}
                size="comfortable"
              />
              <TextField
                disabled={!permissions.canManageBusiness}
                className="sm:col-span-2"
                label="Address"
                id="settings-address"
                {...form.register("addressLine")}
                error={form.formState.errors.addressLine?.message}
                size="comfortable"
              />
            </div>
          </WorkspacePanel>
          <aside className="space-y-5">
            <WorkspacePanel>
              <SectionTitle
                title="Workspace status"
                description="Normal workspace controls do not suspend businesses."
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-app-text-muted">Status</span>
                <StatusBadge status={business.status} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-app-text-muted">
                  Primary branch
                </span>
                <span className="text-right text-sm font-black">
                  {business.primaryBranch?.name ?? "Not set"}
                </span>
              </div>
            </WorkspacePanel>
            {mutation.error ? (
              <InlineError message={normalizeApiError(mutation.error).message} />
            ) : null}
            {permissions.canManageBusiness ? (
              <WorkspaceButton type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save settings"}
              </WorkspaceButton>
            ) : null}
          </aside>
        </form>
      ) : null}
      {activeSection === "public" ? (
        <PublicFeedbackSettingsPanel business={business} permissions={permissions} />
      ) : null}
      {activeSection === "ai" && permissions.canManageBusiness ? (
        <BusinessAISettingsPanel
          businessId={business.id}
          canManage={permissions.canManageBusiness}
        />
      ) : null}
      {activeSection === "categories" ? (
        <FeedbackCategoriesSettingsPanel
          businessId={business.id}
          canManage={permissions.canManageBusiness}
        />
      ) : null}
    </WorkspaceShell>
  );
}

function BusinessAISettingsPanel({
  businessId,
  canManage
}: {
  businessId: string;
  canManage: boolean;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const statusQuery = useQuery({
    queryKey: ["businesses", businessId, "feedback-ai-status"],
    queryFn: () => fetchBusinessAIStatus(businessId)
  });
  const backfillMutation = useMutation({
    mutationFn: () => requestBusinessAIBackfill(businessId),
    onSuccess: async (result) => {
      setResultMessage(
        `${result.queued} queued from ${result.examined} checked. ${result.alreadyAnalyzed} already analyzed, ${result.alreadyPending} already pending, ${result.skippedNoText} skipped, ${result.failedToQueue} failed to queue, ${result.limitRemaining} daily analyses remaining.`
      );
      await queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback-ai-status"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback-inbox"]
      });
    }
  });
  const status = statusQuery.data;
  const canRunBackfill = canManage && status?.operationalState === "READY";

  const handleBackfill = () => {
    if (!canRunBackfill || backfillMutation.isPending) return;
    const confirmed = window.confirm(
      "Analyze up to 20 existing feedback records now? This queues work and does not call the AI provider from the browser."
    );
    if (!confirmed) return;
    setResultMessage(null);
    backfillMutation.mutate();
  };

  return (
    <WorkspacePanel className="mt-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionTitle
          title="AI analysis"
          description="Monitor sentiment, summaries, and category suggestions for customer feedback."
        />
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ring-1 ${
            status?.operationalState === "READY"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
              : status?.operationalState === "NOT_CONFIGURED"
                ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60"
                : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700"
          }`}
        >
          {status?.operationalState ?? "Loading"}
        </span>
      </div>

      {statusQuery.isLoading ? (
        <ListSkeleton />
      ) : statusQuery.error || !status ? (
        <InlineError
          message={
            statusQuery.error
              ? normalizeApiError(statusQuery.error).message
              : "AI status could not be loaded."
          }
        />
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="Provider" value={status.provider} />
            <InfoItem label="Model" value={status.model} />
            <InfoItem
              label="Auto-apply"
              value={
                status.autoApplyCategory
                  ? `Enabled at ${Math.round(status.categoryConfidenceThreshold * 100)}%`
                  : "Disabled"
              }
            />
            <InfoItem
              label="Daily limit"
              value={`${status.dailyUsage.used}/${status.dailyUsage.limit}`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "SKIPPED"] as const).map(
              (key) => (
                <div key={key} className="rounded-md bg-app-surface-muted p-3">
                  <p className="text-xs font-black text-app-text-muted">
                    {formatRole(key)}
                  </p>
                  <p className="mt-1 text-2xl font-black text-app-text">
                    {status.counts[key] ?? 0}
                  </p>
                </div>
              )
            )}
          </div>
          <div className="rounded-xl bg-app-primary-soft/70 p-4 text-sm font-semibold leading-6 text-app-text-muted">
            AI processing runs securely on the server. Sensitive provider credentials are
            never exposed in this workspace.
          </div>
          {canManage ? (
            <div className="flex flex-wrap items-center gap-3">
              <WorkspaceButton
                onClick={handleBackfill}
                disabled={!canRunBackfill || backfillMutation.isPending}
              >
                <RefreshCw
                  className={`h-4 w-4 ${backfillMutation.isPending ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Analyze existing feedback
              </WorkspaceButton>
              <p className="text-xs font-semibold text-app-text-muted">
                Maximum 20 per request.
              </p>
            </div>
          ) : null}
          {resultMessage ? (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
              {resultMessage}
            </p>
          ) : null}
          {backfillMutation.error ? (
            <InlineError message={normalizeApiError(backfillMutation.error).message} />
          ) : null}
        </div>
      )}
    </WorkspacePanel>
  );
}

function FeedbackCategoriesSettingsPanel({
  businessId,
  canManage
}: {
  businessId: string;
  canManage: boolean;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CategoryFormState>(EMPTY_CATEGORY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["businesses", businessId, "feedback-categories", "settings", canManage],
    queryFn: () => fetchCategories(businessId, canManage)
  });

  const resetForm = () => {
    setDraft(EMPTY_CATEGORY_FORM);
    setEditingId(null);
    setClientError(null);
  };

  const invalidateCategories = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["businesses", businessId, "feedback-categories"]
    });
  };

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormState) =>
      createCategory(businessId, normalizeCategoryForm(values)),
    onSuccess: async () => {
      resetForm();
      await invalidateCategories();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({
      categoryId,
      values
    }: {
      categoryId: string;
      values: CategoryFormState;
    }) => updateCategory(businessId, categoryId, normalizeCategoryForm(values)),
    onSuccess: async () => {
      resetForm();
      await invalidateCategories();
    }
  });

  const activationMutation = useMutation({
    mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) =>
      updateCategoryActivation(businessId, categoryId, isActive),
    onSuccess: invalidateCategories
  });

  const categories = categoriesQuery.data ?? [];
  const activeCount = categories.filter((category) => category.isActive).length;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const submitError =
    clientError ??
    (createMutation.error ? normalizeApiError(createMutation.error).message : null) ??
    (updateMutation.error ? normalizeApiError(updateMutation.error).message : null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateCategoryForm(draft);
    if (validationError) {
      setClientError(validationError);
      return;
    }

    setClientError(null);
    if (editingId) {
      updateMutation.mutate({ categoryId: editingId, values: draft });
      return;
    }

    createMutation.mutate(draft);
  };

  const handleEdit = (category: FeedbackCategoryResponse) => {
    setEditingId(category.id);
    setDraft({
      name: category.name,
      description: category.description ?? "",
      colorKey: category.colorKey
    });
    setClientError(null);
  };

  const handleActivation = (category: FeedbackCategoryResponse) => {
    if (activationMutation.isPending) return;

    if (category.isActive) {
      const confirmed = window.confirm(
        `Deactivate "${category.name}"? Existing feedback keeps the category, but it will no longer be available for new selections.`
      );
      if (!confirmed) return;
    }

    activationMutation.mutate({
      categoryId: category.id,
      isActive: !category.isActive
    });
  };

  return (
    <WorkspacePanel className="mt-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionTitle
          title="Feedback categories"
          description={
            canManage
              ? "Create and maintain the labels used in the unified inbox workflow."
              : "Active labels used in the unified inbox workflow."
          }
        />
        <div className="flex gap-2 text-xs font-black text-app-text-muted">
          <span className="rounded-md bg-app-surface-muted px-2.5 py-1">
            {activeCount} active
          </span>
          {canManage ? (
            <span className="rounded-md bg-app-surface-muted px-2.5 py-1">
              {categories.length - activeCount} inactive
            </span>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <form
          className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto]"
          onSubmit={handleSubmit}
        >
          <TextField
            label="Name"
            id="category-name"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            maxLength={100}
            size="comfortable"
          />
          <FieldArea
            label="Description"
            id="category-description"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value
              }))
            }
            maxLength={500}
            className="lg:col-span-1"
          />
          <AppSelectField
            label="Color"
            value={draft.colorKey}
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, colorKey: value }))
            }
            options={CATEGORY_COLOR_OPTIONS.map((color) => ({
              value: color.key,
              label: color.label
            }))}
            triggerClassName="h-11"
          />
          <div className="flex flex-col justify-end gap-2">
            <WorkspaceButton type="submit" disabled={isSaving}>
              {editingId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {isSaving ? "Saving..." : "Save"}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {isSaving ? "Creating..." : "Create"}
                </>
              )}
            </WorkspaceButton>
            {editingId ? (
              <WorkspaceButton tone="secondary" onClick={resetForm} disabled={isSaving}>
                Cancel
              </WorkspaceButton>
            ) : null}
          </div>
        </form>
      ) : null}

      {submitError ? (
        <div className="mt-4">
          <InlineError message={submitError} />
        </div>
      ) : null}

      <div className="mt-5">
        {categoriesQuery.isLoading ? (
          <ListSkeleton />
        ) : categoriesQuery.error ? (
          <div className="space-y-3">
            <InlineError message={normalizeApiError(categoriesQuery.error).message} />
            <WorkspaceButton
              tone="secondary"
              onClick={() => void categoriesQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </WorkspaceButton>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description={
              canManage
                ? "Create the first category before assigning labels in the inbox."
                : "No active feedback categories are currently available."
            }
          />
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface-muted p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getCategoryBadgeClass(category.colorKey)}`}
                    >
                      {category.name}
                    </span>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${
                        category.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
                          : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700"
                      }`}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs font-bold text-app-text-muted">
                      {category.feedbackCount ?? 0} feedback
                    </span>
                  </div>
                  {category.description ? (
                    <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
                      {category.description}
                    </p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleEdit(category)}
                      disabled={isSaving}
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleActivation(category)}
                      disabled={activationMutation.isPending}
                      aria-label={
                        category.isActive
                          ? `Deactivate ${category.name}`
                          : `Activate ${category.name}`
                      }
                    >
                      <Power className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
      {activationMutation.error ? (
        <div className="mt-4">
          <InlineError message={normalizeApiError(activationMutation.error).message} />
        </div>
      ) : null}
    </WorkspacePanel>
  );
}

export function BranchesPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <BranchesContent context={context} />;
}

function BranchesContent({ context }: { context: LoadedBusinessContext }): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BranchStatus | "">("");
  const { activeBusiness, businesses, business, permissions } = context;
  const branchesQuery = useQuery({
    queryKey: ["businesses", business.id, "branches", search, status],
    queryFn: () =>
      fetchBranches(business.id, {
        search: search || undefined,
        status: status || undefined
      })
  });
  const branches = branchesQuery.data?.branches ?? [];
  const collectionView = useCollectionView(
    `business-${business.id}-branches`,
    branches.length
  );

  return (
    <WorkspaceShell
      title="Branches"
      subtitle="Manage business locations, operating status, and staff access."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        permissions.canManageBranches ? (
          <WorkspaceButton to={`/business/${business.id}/branches/new`}>
            <Plus className="h-4 w-4" />
            Add branch
          </WorkspaceButton>
        ) : null
      }
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statuses={["ACTIVE", "INACTIVE"]}
        searchLabel="Search branches"
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total branches"
          value={business.counts.branches}
          detail={business.primaryBranch ? "1 primary" : "Primary missing"}
        />
        <StatCard
          label="Active"
          value={business.counts.activeBranches}
          detail="Serving customers"
        />
        <StatCard
          label="Inactive"
          value={Math.max(0, business.counts.branches - business.counts.activeBranches)}
          detail="Not used operationally"
        />
      </div>
      <BusinessCollectionToolbar
        count={branches.length}
        label="branches"
        view={collectionView.view}
        onView={collectionView.setView}
      />
      <WorkspacePanel className="mt-5">
        {branchesQuery.isLoading ? (
          <ListSkeleton />
        ) : branches.length === 0 ? (
          <EmptyState
            title={search ? "No branches found" : "No branches yet"}
            description={
              search
                ? "Try a different branch name, code, city, or district."
                : "Create an active branch to expand this workspace."
            }
            action={
              permissions.canManageBranches ? (
                <WorkspaceButton to={`/business/${business.id}/branches/new`}>
                  Add branch
                </WorkspaceButton>
              ) : undefined
            }
          />
        ) : (
          <BranchList
            businessId={business.id}
            branches={branches}
            view={collectionView.view}
          />
        )}
      </WorkspacePanel>
    </WorkspaceShell>
  );
}

export function BranchFormPage({ mode }: { mode: "create" | "edit" }): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <BranchFormContent context={context} mode={mode} />;
}

function BranchFormContent({
  context,
  mode
}: {
  context: LoadedBusinessContext;
  mode: "create" | "edit";
}): JSX.Element {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { activeBusiness, businesses, business, permissions } = context;
  const branchQuery = useQuery({
    queryKey: ["businesses", business.id, "branches", branchId],
    queryFn: () => fetchBranch(business.id, branchId ?? ""),
    enabled: mode === "edit" && Boolean(branchId)
  });
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    values:
      mode === "edit" && branchQuery.data
        ? branchToFormValues(branchQuery.data)
        : {
            name: "",
            code: "",
            addressLine: "",
            country: business.country,
            city: business.city,
            district: business.district ?? undefined,
            phone: undefined,
            email: undefined,
            isPrimary: false
          }
  });
  const mutation = useMutation({
    mutationFn: (values: BranchFormValues) =>
      mode === "create"
        ? createBranchForBusiness(business.id, values)
        : updateBranchForBusiness(business.id, branchId ?? "", values),
    onSuccess(branch) {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
      navigate(`/business/${business.id}/branches/${branch.id}`, { replace: true });
    }
  });

  if (!permissions.canManageBranches) {
    return (
      <WorkspaceShell
        title="Branch access"
        subtitle="Branch management requires owner or admin access."
        businesses={businesses}
        activeBusiness={activeBusiness}
      >
        <EmptyState
          title="Permission denied"
          description="Managers and staff can view assigned branches but cannot create or edit branches."
        />
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title={mode === "create" ? "Create branch" : "Edit branch"}
      subtitle="Keep branch details substantial, consistent, and easy to scan."
      businesses={businesses}
      activeBusiness={activeBusiness}
    >
      <form
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <WorkspacePanel className="min-w-0">
          <SectionTitle
            title="Branch information"
            description="Branch code is unique within the business."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              label="Branch name *"
              id="branch-name"
              placeholder="Remera counter"
              {...form.register("name")}
              error={form.formState.errors.name?.message}
              size="comfortable"
              required
            />
            <TextField
              label="Code *"
              id="branch-code"
              placeholder="REMERA-01"
              {...form.register("code")}
              error={form.formState.errors.code?.message}
              size="comfortable"
              required
            />
            <TextField
              label="Country *"
              id="branch-country"
              placeholder="Rwanda"
              {...form.register("country")}
              error={form.formState.errors.country?.message}
              size="comfortable"
              required
            />
            <TextField
              label="City *"
              id="branch-city"
              placeholder="Kigali"
              {...form.register("city")}
              error={form.formState.errors.city?.message}
              size="comfortable"
              required
            />
            <TextField
              label="District"
              id="branch-district"
              placeholder="Gasabo"
              {...form.register("district")}
              error={form.formState.errors.district?.message}
              size="comfortable"
            />
            <TextField
              label="Phone"
              id="branch-phone"
              placeholder="+250 788 000 000"
              {...form.register("phone")}
              error={form.formState.errors.phone?.message}
              size="comfortable"
            />
            <TextField
              label="Email"
              id="branch-email"
              type="email"
              placeholder="branch@example.com"
              {...form.register("email")}
              error={form.formState.errors.email?.message}
              size="comfortable"
            />
            <TextField
              label="Address *"
              id="branch-address"
              placeholder="KG 7 Ave, Remera"
              {...form.register("addressLine")}
              error={form.formState.errors.addressLine?.message}
              size="comfortable"
              required
              className="md:col-span-2"
            />
          </div>
          {mode === "create" ? (
            <label className="mt-5 flex items-start gap-3 rounded-md border border-app-border bg-app-surface-muted p-4 text-sm font-bold">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                {...form.register("isPrimary")}
              />
              <span className="leading-6">Make this the primary branch</span>
            </label>
          ) : null}
        </WorkspacePanel>
        <aside className="flex min-w-0 flex-col gap-3 xl:items-stretch">
          {mutation.error ? (
            <InlineError message={normalizeApiError(mutation.error).message} />
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:flex-col xl:[&>*]:w-full">
            <WorkspaceButton type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save branch"}
            </WorkspaceButton>
            <WorkspaceButton tone="secondary" to={`/business/${business.id}/branches`}>
              Back to branches
            </WorkspaceButton>
          </div>
        </aside>
      </form>
    </WorkspaceShell>
  );
}

export function BranchDetailsPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <BranchDetailsContent context={context} />;
}

function BranchDetailsContent({
  context
}: {
  context: LoadedBusinessContext;
}): JSX.Element {
  const { branchId = "" } = useParams();
  const queryClient = useQueryClient();

  const { activeBusiness, businesses, business, permissions } = context;
  const branchQuery = useQuery({
    queryKey: ["businesses", business.id, "branches", branchId],
    queryFn: () => fetchBranch(business.id, branchId)
  });
  const primaryMutation = useMutation({
    mutationFn: () => setPrimaryBranchForBusiness(business.id, branchId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["businesses"] })
  });
  const statusMutation = useMutation({
    mutationFn: (status: BranchSummary["status"]) =>
      setBranchStatus(business.id, branchId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["businesses"] })
  });

  const branch = branchQuery.data;

  return (
    <WorkspaceShell
      title="Branch details"
      subtitle="Review location details and supported branch controls."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        <WorkspaceButton to={`/business/${business.id}/branches`} tone="secondary">
          <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          Back to Branches
        </WorkspaceButton>
      }
    >
      {branchQuery.isLoading ? (
        <ListSkeleton />
      ) : !branch ? (
        <EmptyState
          title="Branch unavailable"
          description={
            branchQuery.error
              ? normalizeApiError(branchQuery.error).message
              : "This branch could not be loaded."
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <WorkspacePanel>
            <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-600 p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex items-center gap-3">
                <InitialsBadge name={branch.name} />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-100">
                    Branch profile
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{branch.name}</h2>
                  <p className="text-sm font-semibold text-indigo-100">
                    {branch.code} · {branch.city}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={branch.status} />
                {branch.isPrimary ? <StatusBadge status="OWNER" /> : null}
              </div>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoItem
                label="Address"
                value={`${branch.addressLine}, ${branch.city}${branch.district ? `, ${branch.district}` : ""}, ${branch.country}`}
              />
              <InfoItem label="Phone" value={branch.phone ?? "Not provided"} />
              <InfoItem label="Email" value={branch.email ?? "Not provided"} />
              <InfoItem label="Assigned staff rows" value={String(branch.staffCount)} />
            </dl>
          </WorkspacePanel>
          <aside className="space-y-3 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/55">
            <div className="mb-4">
              <h2 className="text-base font-black">Branch management</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-app-text-muted">
                Update this location while preserving its feedback history.
              </p>
            </div>
            {permissions.canManageBranches ? (
              <WorkspaceButton to={`/business/${business.id}/branches/${branch.id}/edit`}>
                <Edit className="h-4 w-4" />
                Edit branch
              </WorkspaceButton>
            ) : null}
            {permissions.canManageBranches && !branch.isPrimary ? (
              <WorkspaceButton
                tone="secondary"
                onClick={() => primaryMutation.mutate()}
                disabled={primaryMutation.isPending}
              >
                Set primary
              </WorkspaceButton>
            ) : null}
            {permissions.canManageBranches && !branch.isPrimary ? (
              <WorkspaceButton
                tone={branch.status === "ACTIVE" ? "danger" : "secondary"}
                onClick={() =>
                  statusMutation.mutate(
                    branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                  )
                }
                disabled={statusMutation.isPending}
              >
                <Power className="h-4 w-4" />
                {branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </WorkspaceButton>
            ) : null}
            {primaryMutation.error || statusMutation.error ? (
              <InlineError
                message={
                  normalizeApiError(primaryMutation.error ?? statusMutation.error).message
                }
              />
            ) : null}
          </aside>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function StaffListPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <StaffListContent context={context} />;
}

function StaffListContent({ context }: { context: LoadedBusinessContext }): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED" | "REMOVED" | "">("");
  const { activeBusiness, businesses, business, permissions } = context;
  const membershipsQuery = useQuery({
    queryKey: ["businesses", business.id, "memberships", search, status],
    queryFn: () =>
      fetchMemberships(business.id, {
        search: search || undefined,
        status: status || undefined
      })
  });
  const memberships = membershipsQuery.data?.memberships ?? [];
  const collectionView = useCollectionView(
    `business-${business.id}-staff`,
    memberships.length
  );

  return (
    <WorkspaceShell
      title="Staff"
      subtitle="Invite, organize, and manage business roles and branch access."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        permissions.canManageStaff ? (
          <WorkspaceButton to={`/business/${business.id}/staff/invite`}>
            <UserRoundPlus className="h-4 w-4" />
            Invite staff
          </WorkspaceButton>
        ) : null
      }
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statuses={["ACTIVE", "SUSPENDED", "REMOVED"]}
        searchLabel="Search staff"
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total staff"
          value={memberships.filter((m) => m.status === "ACTIVE").length}
          detail="Active members"
        />
        <StatCard
          label="Admins and managers"
          value={
            memberships.filter((m) => m.role === "ADMIN" || m.role === "MANAGER").length
          }
          detail="Elevated business access"
        />
        <StatCard
          label="Suspended"
          value={memberships.filter((m) => m.status === "SUSPENDED").length}
          detail="Access blocked"
        />
      </div>
      <BusinessCollectionToolbar
        count={memberships.length}
        label="staff members"
        view={collectionView.view}
        onView={collectionView.setView}
      />
      <WorkspacePanel className="mt-5">
        {membershipsQuery.isLoading ? (
          <ListSkeleton />
        ) : memberships.length === 0 ? (
          <EmptyState
            title={search ? "No staff found" : "No staff members yet"}
            description={
              search
                ? "Try a different name or email."
                : "Invite staff after branches are ready."
            }
            action={
              permissions.canManageStaff ? (
                <WorkspaceButton to={`/business/${business.id}/staff/invite`}>
                  Invite staff
                </WorkspaceButton>
              ) : undefined
            }
          />
        ) : (
          <StaffList
            businessId={business.id}
            memberships={memberships}
            view={collectionView.view}
          />
        )}
      </WorkspacePanel>
    </WorkspaceShell>
  );
}

export function StaffDetailsPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <StaffDetailsContent context={context} />;
}

function StaffDetailsContent({
  context
}: {
  context: LoadedBusinessContext;
}): JSX.Element {
  const { membershipId = "" } = useParams();
  const queryClient = useQueryClient();

  const { activeBusiness, businesses, business, permissions } = context;
  const membershipQuery = useQuery({
    queryKey: ["businesses", business.id, "memberships", membershipId],
    queryFn: () => fetchMembership(business.id, membershipId)
  });
  const roleMutation = useMutation({
    mutationFn: (role: BusinessMemberRole) =>
      updateMembershipRoleForBusiness(business.id, membershipId, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["businesses"] })
  });
  const statusMutation = useMutation({
    mutationFn: (action: "suspend" | "reactivate" | "remove") =>
      setMembershipStatus(business.id, membershipId, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["businesses"] })
  });
  const membership = membershipQuery.data;
  const isProtected = membership?.role === "OWNER";

  return (
    <WorkspaceShell
      title="Staff details"
      subtitle="Review role, status, and branch access."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        <WorkspaceButton to={`/business/${business.id}/staff`} tone="secondary">
          <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          Back to Staff
        </WorkspaceButton>
      }
    >
      {membershipQuery.isLoading ? (
        <ListSkeleton />
      ) : !membership ? (
        <EmptyState
          title="Membership unavailable"
          description={
            membershipQuery.error
              ? normalizeApiError(membershipQuery.error).message
              : "This membership could not be loaded."
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <WorkspacePanel>
            <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-800 p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex items-center gap-3">
                <InitialsBadge
                  name={`${membership.user?.firstName ?? "Staff"} ${membership.user?.lastName ?? ""}`}
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-200">
                    Team member
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {membership.user?.firstName} {membership.user?.lastName}
                  </h2>
                  <p className="text-sm font-semibold text-indigo-100">
                    {membership.user?.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={membership.role} />
                <StatusBadge status={membership.status} />
              </div>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoItem
                label="Platform role"
                value={membership.user?.platformRole ?? "Unknown"}
              />
              <InfoItem label="Joined" value={formatDate(membership.joinedAt)} />
              <InfoItem
                label="Branch access"
                value={
                  membership.allBranchesAccess
                    ? "All branches"
                    : membership.branches.map((branch) => branch.name).join(", ") ||
                      "None"
                }
              />
              <InfoItem label="Owner protected" value={isProtected ? "Yes" : "No"} />
            </dl>
          </WorkspacePanel>
          <aside className="space-y-3 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/55">
            <div className="mb-4">
              <h2 className="text-base font-black">Access controls</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-app-text-muted">
                Manage role, branch scope, and membership status.
              </p>
            </div>
            {permissions.canManageStaff && !isProtected ? (
              <>
                <AppSelectField
                  value={membership.role}
                  onValueChange={(value) =>
                    roleMutation.mutate(value as BusinessMemberRole)
                  }
                  options={[
                    ...(permissions.canAssignAdmin
                      ? [{ value: "ADMIN", label: "Business Admin" }]
                      : []),
                    { value: "MANAGER", label: "Manager" },
                    { value: "STAFF", label: "Staff" }
                  ]}
                  ariaLabel="Change staff role"
                  triggerClassName="h-11"
                />
                <WorkspaceButton
                  to={`/business/${business.id}/staff/${membership.id}/branches`}
                  tone="secondary"
                >
                  Manage branch access
                </WorkspaceButton>
                {membership.status === "ACTIVE" ? (
                  <WorkspaceButton
                    tone="danger"
                    onClick={() => statusMutation.mutate("suspend")}
                  >
                    Suspend membership
                  </WorkspaceButton>
                ) : (
                  <WorkspaceButton
                    tone="secondary"
                    onClick={() => statusMutation.mutate("reactivate")}
                  >
                    Reactivate membership
                  </WorkspaceButton>
                )}
                <WorkspaceButton
                  tone="danger"
                  onClick={() => statusMutation.mutate("remove")}
                >
                  Remove membership
                </WorkspaceButton>
              </>
            ) : (
              <EmptyState
                title="Protected membership"
                description="The original owner cannot be demoted, suspended, or removed during this phase."
              />
            )}
            {roleMutation.error || statusMutation.error ? (
              <InlineError
                message={
                  normalizeApiError(roleMutation.error ?? statusMutation.error).message
                }
              />
            ) : null}
          </aside>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function BranchAssignmentPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <BranchAssignmentContent context={context} />;
}

function BranchAssignmentContent({
  context
}: {
  context: LoadedBusinessContext;
}): JSX.Element {
  const { membershipId = "" } = useParams();
  const queryClient = useQueryClient();

  const { activeBusiness, businesses, business } = context;
  const membershipQuery = useQuery({
    queryKey: ["businesses", business.id, "memberships", membershipId],
    queryFn: () => fetchMembership(business.id, membershipId)
  });
  const branchesQuery = useQuery({
    queryKey: ["businesses", business.id, "branches", "active"],
    queryFn: () => fetchBranches(business.id, { status: "ACTIVE" })
  });
  const membership = membershipQuery.data;
  const branches = branchesQuery.data?.branches ?? [];
  const form = useForm<MembershipBranchAccessValues>({
    resolver: zodResolver(membershipBranchAccessSchema),
    values: {
      allBranchesAccess: membership?.allBranchesAccess ?? false,
      branchIds: membership?.branches.map((branch) => branch.id) ?? []
    }
  });
  const mutation = useMutation({
    mutationFn: (values: MembershipBranchAccessValues) =>
      updateMembershipBranchAccessForBusiness(business.id, membershipId, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["businesses"] })
  });
  const allBranches = form.watch("allBranchesAccess");

  return (
    <WorkspaceShell
      title="Branch assignment"
      subtitle="Set explicit branch access for manager and staff memberships."
      businesses={businesses}
      activeBusiness={activeBusiness}
    >
      {!membership ? (
        <ListSkeleton />
      ) : membership.role === "OWNER" || membership.role === "ADMIN" ? (
        <EmptyState
          title="All branches enforced"
          description="Owner and admin memberships always have all-branch access."
        />
      ) : (
        <form
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <WorkspacePanel>
            <SectionTitle
              title={`${membership.user?.firstName} ${membership.user?.lastName}`}
              description="Choose all active branches or explicit branches."
            />
            <label className="mt-5 flex items-center gap-3 rounded-lg border border-app-border p-4 text-sm font-black">
              <input
                type="checkbox"
                className="h-4 w-4"
                {...form.register("allBranchesAccess")}
              />
              All branches access
            </label>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className={`flex items-center gap-3 rounded-lg border border-app-border p-4 text-sm font-bold ${allBranches ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    value={branch.id}
                    disabled={allBranches}
                    {...form.register("branchIds")}
                  />
                  <span>{branch.name}</span>
                  {branch.isPrimary ? (
                    <span className="ml-auto text-xs text-app-primary">Primary</span>
                  ) : null}
                </label>
              ))}
            </div>
          </WorkspacePanel>
          <aside className="space-y-3">
            {mutation.error ? (
              <InlineError message={normalizeApiError(mutation.error).message} />
            ) : null}
            <WorkspaceButton type="submit" disabled={mutation.isPending}>
              Save branch access
            </WorkspaceButton>
            <WorkspaceButton
              tone="secondary"
              to={`/business/${business.id}/staff/${membership.id}`}
            >
              Back to staff details
            </WorkspaceButton>
          </aside>
        </form>
      )}
    </WorkspaceShell>
  );
}

export function InviteStaffPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <InviteStaffContent context={context} />;
}

function InviteStaffContent({
  context
}: {
  context: LoadedBusinessContext;
}): JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { activeBusiness, businesses, business, permissions } = context;
  const branchesQuery = useQuery({
    queryKey: ["businesses", business.id, "branches", "active"],
    queryFn: () => fetchBranches(business.id, { status: "ACTIVE" })
  });
  const branches = branchesQuery.data?.branches ?? [];
  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { role: "STAFF", allBranchesAccess: true, branchIds: [] }
  });
  const mutation = useMutation({
    mutationFn: (values: InviteStaffValues) =>
      createStaffInvitationForBusiness(business.id, values),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
      navigate(`/business/${business.id}/invitations`);
    }
  });
  const allBranches = form.watch("allBranchesAccess");

  if (!permissions.canManageStaff) {
    return (
      <WorkspaceShell
        title="Invite staff"
        subtitle="Staff invitations require owner or admin access."
        businesses={businesses}
        activeBusiness={activeBusiness}
      >
        <EmptyState
          title="Permission denied"
          description="Only owners and admins can invite staff."
        />
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Invite staff"
      subtitle="Send a secure single-use invitation link by email."
      businesses={businesses}
      activeBusiness={activeBusiness}
    >
      <form
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <WorkspacePanel>
          <SectionTitle
            title="Invitation details"
            description="Owner invitations and ownership transfer are not available in this workspace."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Email address"
              id="invite-email"
              type="email"
              {...form.register("invitedEmail")}
              error={form.formState.errors.invitedEmail?.message}
              size="comfortable"
            />
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <AppSelectField
                  label="Role"
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  options={[
                    ...(permissions.canAssignAdmin
                      ? [{ value: "ADMIN", label: "Business Admin" }]
                      : []),
                    { value: "MANAGER", label: "Manager" },
                    { value: "STAFF", label: "Staff" }
                  ]}
                  triggerClassName="h-12"
                />
              )}
            />
          </div>
          <label className="mt-5 flex items-center gap-3 rounded-lg border border-app-border p-4 text-sm font-black">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...form.register("allBranchesAccess")}
            />
            All branches access
          </label>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {branches.map((branch) => (
              <label
                key={branch.id}
                className={`flex items-center gap-3 rounded-lg border border-app-border p-4 text-sm font-bold ${allBranches ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  value={branch.id}
                  disabled={allBranches}
                  {...form.register("branchIds")}
                />
                {branch.name}
              </label>
            ))}
          </div>
        </WorkspacePanel>
        <aside className="space-y-3">
          <WorkspacePanel>
            <SectionTitle
              title="Email delivery"
              description="Uses existing SMTP configuration and APP_FRONTEND_URL for invitation links."
            />
          </WorkspacePanel>
          {mutation.error ? (
            <InlineError message={normalizeApiError(mutation.error).message} />
          ) : null}
          <WorkspaceButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending..." : "Send invitation"}
          </WorkspaceButton>
        </aside>
      </form>
    </WorkspaceShell>
  );
}

export function InvitationsPage(): JSX.Element {
  const context = useBusinessContext();

  if (context.state) return context.state;

  return <InvitationsContent context={context} />;
}

function InvitationsContent({
  context
}: {
  context: LoadedBusinessContext;
}): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED" | ""
  >("");
  const queryClient = useQueryClient();

  const { activeBusiness, businesses, business, permissions } = context;
  const invitationsQuery = useQuery({
    queryKey: ["businesses", business.id, "invitations", search, status],
    queryFn: () =>
      fetchInvitations(business.id, {
        search: search || undefined,
        status: status || undefined
      })
  });
  const resendMutation = useMutation({
    mutationFn: (id: string) => resendInvitation(business.id, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["businesses"] })
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelInvitation(business.id, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["businesses"] })
  });
  const invitations = invitationsQuery.data?.invitations ?? [];
  const collectionView = useCollectionView(
    `business-${business.id}-invitations`,
    invitations.length
  );

  return (
    <WorkspaceShell
      title="Pending invitations"
      subtitle="Review, resend, and cancel staff invitations."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        permissions.canManageStaff ? (
          <WorkspaceButton to={`/business/${business.id}/staff/invite`}>
            <UserRoundPlus className="h-4 w-4" />
            Invite staff
          </WorkspaceButton>
        ) : null
      }
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statuses={["PENDING", "ACCEPTED", "CANCELLED", "EXPIRED"]}
        searchLabel="Search invitations"
      />
      <BusinessCollectionToolbar
        count={invitations.length}
        label="invitations"
        view={collectionView.view}
        onView={collectionView.setView}
      />
      <WorkspacePanel className="mt-5">
        {invitationsQuery.isLoading ? (
          <ListSkeleton />
        ) : invitations.length === 0 ? (
          <EmptyState
            title={search ? "No invitations found" : "No invitations yet"}
            description={
              search
                ? "Try a different email or status."
                : "Send invitations when you are ready to add staff."
            }
            action={
              permissions.canManageStaff ? (
                <WorkspaceButton to={`/business/${business.id}/staff/invite`}>
                  Invite staff
                </WorkspaceButton>
              ) : undefined
            }
          />
        ) : (
          <div className={businessCollectionClasses(collectionView.view)}>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-lg border border-app-border p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black">{invitation.invitedEmail}</p>
                    <p className="text-sm font-semibold text-app-text-muted">
                      {formatRole(invitation.role)} ·{" "}
                      {invitation.allBranchesAccess
                        ? "All branches"
                        : invitation.branches.map((branch) => branch.name).join(", ")}
                    </p>
                  </div>
                  <StatusBadge status={invitation.status} />
                </div>
                {permissions.canManageStaff && invitation.status === "PENDING" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <WorkspaceButton
                      tone="secondary"
                      onClick={() => resendMutation.mutate(invitation.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resend
                    </WorkspaceButton>
                    <WorkspaceButton
                      tone="danger"
                      onClick={() => cancelMutation.mutate(invitation.id)}
                    >
                      Cancel
                    </WorkspaceButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </WorkspaceShell>
  );
}

export function InvitationAcceptPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const [clientError, setClientError] = useState<string | null>(null);
  const form = useForm<InvitationPasswordValues>({
    resolver: zodResolver(invitationPasswordSchema)
  });
  const previewQuery = useQuery({
    queryKey: ["business-invitation", token],
    queryFn: () => previewInvitation(token),
    enabled: token.length > 0
  });
  const sessionMutation = useMutation({
    mutationFn: () => acceptInvitationWithSession(token),
    onSuccess: (result) => navigate(`/business/${result.businessId}`, { replace: true })
  });
  const passwordMutation = useMutation({
    mutationFn: (values: InvitationPasswordValues) =>
      acceptInvitationWithPassword({ token, ...values }),
    onSuccess(result) {
      setUser(result.user);
      navigate(`/business/${result.businessId}`, { replace: true });
    }
  });
  const googleMutation = useMutation({
    mutationFn: (credential: string) => acceptInvitationWithGoogle({ token, credential }),
    onSuccess(result) {
      setUser(result.user);
      navigate(`/business/${result.businessId}`, { replace: true });
    }
  });
  const preview = previewQuery.data;
  const error =
    previewQuery.error ??
    sessionMutation.error ??
    passwordMutation.error ??
    googleMutation.error;

  return (
    <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1040px] overflow-hidden rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="bg-app-primary-soft p-6 dark:bg-[rgb(25,39,82)] sm:p-8">
          <BrandMark compact />
          <div className="mt-16 flex flex-col items-center text-center">
            <InitialsBadge name={preview?.business.name ?? "Invite"} />
            <h1 className="mt-6 text-2xl font-black">You're invited</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-app-text-muted">
              {preview
                ? `${preview.invitedBy.firstName} invited you to join ${preview.business.name}.`
                : "Load a valid invitation to continue."}
            </p>
          </div>
          {preview ? (
            <div className="mt-10 rounded-lg border border-app-border bg-app-surface p-5 text-sm dark:bg-app-surface-muted">
              <InfoItem label="Role" value={formatRole(preview.role)} />
              <InfoItem
                label="Branches"
                value={
                  preview.allBranchesAccess
                    ? "All branches"
                    : preview.branches.map((branch) => branch.name).join(", ")
                }
              />
              <InfoItem label="Expires" value={formatDate(preview.expiresAt)} />
            </div>
          ) : null}
        </aside>
        <div className="p-6 sm:p-10">
          <div className="flex justify-end">
            <ThemeToggle compact />
          </div>
          <h2 className="mt-12 text-2xl font-black">Accept invitation</h2>
          <p className="mt-2 text-sm font-semibold text-app-text-muted">
            Sign in, use your current session, or create a staff account for the invited
            email.
          </p>
          {previewQuery.isLoading ? (
            <ListSkeleton />
          ) : !token || !preview ? (
            <InlineError
              message={
                error ? normalizeApiError(error).message : "Invitation token is missing."
              }
            />
          ) : (
            <div className="mt-8 space-y-6">
              {user ? (
                <WorkspacePanel>
                  <SectionTitle
                    title={`Signed in as ${user.email}`}
                    description="Your account email must match the invitation email."
                  />
                  <WorkspaceButton
                    onClick={() => sessionMutation.mutate()}
                    disabled={sessionMutation.isPending}
                  >
                    Accept with current account
                  </WorkspaceButton>
                </WorkspacePanel>
              ) : null}
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => passwordMutation.mutate(values))}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="First name"
                    id="invite-first-name"
                    {...form.register("firstName")}
                    error={form.formState.errors.firstName?.message}
                    size="comfortable"
                  />
                  <TextField
                    label="Last name"
                    id="invite-last-name"
                    {...form.register("lastName")}
                    error={form.formState.errors.lastName?.message}
                    size="comfortable"
                  />
                </div>
                <TextField
                  label="Email address"
                  id="invite-readonly-email"
                  value={preview.invitedEmail}
                  readOnly
                  size="comfortable"
                />
                <TextField
                  label="Password"
                  id="invite-password"
                  type="password"
                  {...form.register("password")}
                  error={form.formState.errors.password?.message}
                  size="comfortable"
                />
                <WorkspaceButton type="submit" disabled={passwordMutation.isPending}>
                  Create account and accept
                </WorkspaceButton>
              </form>
              <div className="border-t border-app-border pt-6">
                <GoogleCredentialButton
                  text="continue_with"
                  preferredWidth={360}
                  onCredential={(credential) => googleMutation.mutate(credential)}
                  onClientError={setClientError}
                  disabled={googleMutation.isPending}
                />
              </div>
              <p className="text-center text-sm font-semibold text-app-text-muted">
                Already have an account?{" "}
                <Link
                  className="text-app-primary"
                  to="/login"
                  state={{
                    from: {
                      pathname: "/invitations/accept",
                      search: `?token=${token}`,
                      hash: ""
                    }
                  }}
                >
                  Sign in
                </Link>
              </p>
              {error || clientError ? (
                <InlineError message={clientError ?? normalizeApiError(error).message} />
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export function AdminBusinessesPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BusinessStatus | "">("");
  const [sort, setSort] = useState<"NEWEST" | "NAME" | "MOST_FEEDBACK">("NEWEST");
  const query = useQuery({
    queryKey: ["admin", "businesses", search, status, sort],
    queryFn: () =>
      fetchAdminBusinesses({
        search: search || undefined,
        status: status || undefined,
        sort
      })
  });
  const businesses = query.data?.businesses ?? [];
  const collectionView = useCollectionView("admin-businesses", businesses.length);

  return (
    <AdminShell
      title="Businesses"
      subtitle="Platform-wide business oversight and approval."
      actions={
        <WorkspaceButton to="/admin/businesses/new">
          <Plus className="h-4 w-4" /> Create business
        </WorkspaceButton>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <FilterBar
          search={search}
          onSearch={setSearch}
          status={status}
          onStatus={setStatus}
          statuses={["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "ARCHIVED"]}
          searchLabel="Search businesses"
        />
        <AppSelectField
          value={sort}
          onValueChange={(value) => setSort(value as "NEWEST" | "NAME" | "MOST_FEEDBACK")}
          options={[
            { value: "NEWEST", label: "Newest first" },
            { value: "NAME", label: "Name A–Z" },
            { value: "MOST_FEEDBACK", label: "Most feedback" }
          ]}
          ariaLabel="Sort businesses"
          triggerClassName="h-11"
        />
      </div>
      <BusinessCollectionToolbar
        count={businesses.length}
        label="businesses"
        view={collectionView.view}
        onView={collectionView.setView}
      />
      <WorkspacePanel className="mt-5">
        {query.isLoading ? (
          <ListSkeleton />
        ) : businesses.length === 0 ? (
          <EmptyState
            title="No businesses found"
            description={
              search
                ? "Try another business, owner, or status."
                : "No business has been created yet."
            }
          />
        ) : (
          <div className={businessCollectionClasses(collectionView.view)}>
            {businesses.map((business) => (
              <RowLink key={business.id} to={`/admin/businesses/${business.id}`}>
                <div className="flex items-center gap-3">
                  <InitialsBadge name={business.name} />
                  <div>
                    <p className="font-black">{business.name}</p>
                    <p className="text-sm font-semibold text-app-text-muted">
                      {business.owner
                        ? `${business.owner.firstName} ${business.owner.lastName}`
                        : "Owner pending"}{" "}
                      · {business.counts.branches} branches · {business.counts.staff}{" "}
                      staff
                    </p>
                  </div>
                  <StatusBadge status={business.status} />
                </div>
              </RowLink>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </AdminShell>
  );
}

export function AdminBusinessDetailsPage(): JSX.Element {
  const { businessId = "" } = useParams();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "businesses", businessId],
    queryFn: () => fetchAdminBusiness(businessId)
  });
  const [isEditing, setEditing] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BusinessStatus | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    industry: "",
    email: "",
    phone: "",
    city: ""
  });
  useEffect(() => {
    if (!query.data) return;
    setEditForm({
      name: query.data.name,
      industry: query.data.industry,
      email: query.data.email,
      phone: query.data.phone,
      city: query.data.city
    });
  }, [query.data]);
  const mutation = useMutation({
    mutationFn: (status: BusinessDetail["status"]) =>
      setAdminBusinessStatus(businessId, status),
    onSuccess: () => {
      setPendingStatus(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
    }
  });
  const editMutation = useMutation({
    mutationFn: () => updateAdminBusiness(businessId, editForm),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
    }
  });
  const business = query.data;

  return (
    <AdminShell
      title="Business details"
      subtitle="Review tenant identity, approval, access, activity, and connected channels."
    >
      {query.isLoading ? (
        <ListSkeleton />
      ) : !business ? (
        <EmptyState
          title="Business unavailable"
          description={
            query.error
              ? normalizeApiError(query.error).message
              : "This business could not be loaded."
          }
        />
      ) : (
        <div className="space-y-5">
          <WorkspacePanel>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <InitialsBadge name={business.name} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-xl font-bold sm:text-2xl">
                      {business.name}
                    </h2>
                    <StatusBadge status={business.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-app-text-muted">
                    {business.industry} · {business.city}
                  </p>
                  <div className="mt-4 min-w-0 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">
                      Owner
                    </p>
                    <p className="mt-1 break-words font-semibold">
                      {business.owner
                        ? `${business.owner.firstName} ${business.owner.lastName}`
                        : "Owner not found"}
                    </p>
                    <p className="break-all text-app-text-muted">
                      {business.owner?.email ?? business.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <WorkspaceButton tone="secondary" onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4" /> Edit business
                </WorkspaceButton>
                <Popover open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-4 text-sm font-bold hover:border-app-primary/50"
                    >
                      More actions <ChevronDown className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 !p-2">
                    <div className="space-y-1">
                      {businessStatusActions(business.status).map((actionItem) => (
                        <button
                          key={actionItem.status}
                          type="button"
                          onClick={() => {
                            setMoreActionsOpen(false);
                            setPendingStatus(actionItem.status);
                          }}
                          className={`flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-semibold hover:bg-app-surface-muted ${
                            actionItem.danger ? "text-app-error" : "text-app-text"
                          }`}
                        >
                          {actionItem.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-app-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Contact" value={`${business.email} · ${business.phone}`} />
              <InfoItem
                label="Address"
                value={`${business.addressLine}, ${business.city}, ${business.country}`}
              />
              <InfoItem label="Created" value={formatDate(business.createdAt)} />
            </dl>
          </WorkspacePanel>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactBusinessMetric label="Branches" value={business.counts.branches} />
            <CompactBusinessMetric label="Staff" value={business.counts.staff} />
            <CompactBusinessMetric
              label="Feedback"
              value={business.adminOverview?.totalFeedback ?? 0}
            />
            <CompactBusinessMetric
              label="Integrations"
              value={business.adminOverview?.integrations.length ?? 0}
            />
          </div>
          {mutation.error ? (
            <InlineError message={normalizeApiError(mutation.error).message} />
          ) : null}
          {isEditing ? (
            <AdminDetailModal
              open={isEditing}
              onOpenChange={setEditing}
              title="Edit business"
              description="Update safe tenant identity and contact fields. Lifecycle status is managed separately."
              badges={<StatusBadge status={business.status} />}
            >
              <SectionTitle
                title="Edit business identity"
                description="Safe profile fields only; lifecycle status is managed separately."
              />
              <form
                className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  editMutation.mutate();
                }}
              >
                {(["name", "industry", "email", "phone", "city"] as const).map(
                  (field) => (
                    <label key={field} className="text-sm font-semibold">
                      {formatRole(field)}
                      <input
                        type={field === "email" ? "email" : "text"}
                        required
                        value={editForm[field]}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            [field]: event.target.value
                          }))
                        }
                        className="mt-2 min-h-11 w-full rounded-md border border-app-border bg-app-surface px-3 outline-none focus:border-app-primary"
                      />
                    </label>
                  )
                )}
                <div className="flex items-end">
                  <WorkspaceButton type="submit" disabled={editMutation.isPending}>
                    {editMutation.isPending ? "Saving…" : "Save changes"}
                  </WorkspaceButton>
                </div>
              </form>
              {editMutation.error ? (
                <InlineError message={normalizeApiError(editMutation.error).message} />
              ) : null}
            </AdminDetailModal>
          ) : null}
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <WorkspacePanel>
                <SectionTitle
                  title="Branches"
                  description="Current tenant locations and operating status."
                />
                <div className="mt-4 space-y-2">
                  {(business.adminOverview?.branches.length ?? 0) > 0 ? (
                    business.adminOverview?.branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="flex items-center justify-between rounded-md bg-app-surface-muted p-3"
                      >
                        <div>
                          <p className="text-sm font-black">{branch.name}</p>
                          <p className="text-xs font-semibold text-app-text-muted">
                            {branch.code}
                            {branch.isPrimary ? " · Primary" : ""}
                          </p>
                        </div>
                        <StatusBadge status={branch.status} />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-app-border p-4 text-sm text-app-text-muted">
                      No branches have been created.
                    </p>
                  )}
                </div>
              </WorkspacePanel>
              <WorkspacePanel>
                <SectionTitle
                  title="Staff and memberships"
                  description="Role and access-state overview; no credentials are exposed."
                />
                <div className="mt-4 space-y-2">
                  {(business.adminOverview?.memberships.length ?? 0) > 0 ? (
                    business.adminOverview?.memberships.slice(0, 8).map((membership) => (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between rounded-md bg-app-surface-muted p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {membership.user
                              ? `${membership.user.firstName} ${membership.user.lastName}`
                              : "Unavailable user"}
                          </p>
                          <p className="truncate text-xs font-semibold text-app-text-muted">
                            {membership.user?.email ?? "No email"} ·{" "}
                            {formatRole(membership.role)}
                          </p>
                        </div>
                        <StatusBadge status={membership.status} />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-app-border p-4 text-sm text-app-text-muted">
                      No tenant memberships are available.
                    </p>
                  )}
                </div>
              </WorkspacePanel>
            </div>
            <WorkspacePanel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle
                  title="Feedback and integration activity"
                  description="Recent tenant activity and current connection summary."
                />
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/admin/feedback?businessId=${business.id}`}
                    className="rounded-md border border-app-border px-3 py-2 text-xs font-bold hover:border-app-primary/50"
                  >
                    View all feedback
                  </Link>
                  <Link
                    to={`/admin/integrations?businessId=${business.id}`}
                    className="rounded-md border border-app-border px-3 py-2 text-xs font-bold hover:border-app-primary/50"
                  >
                    View integrations
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  {(business.adminOverview?.recentFeedback.length ?? 0) > 0 ? (
                    business.adminOverview?.recentFeedback.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="rounded-md bg-app-surface-muted p-3"
                      >
                        <p className="text-sm font-black">
                          {formatRole(feedback.channel)} · {formatRole(feedback.status)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-app-text-muted">
                          {feedback.branch.name} · {formatDate(feedback.receivedAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-app-text-muted">
                      No feedback activity yet.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {(business.adminOverview?.integrations.length ?? 0) > 0 ? (
                    business.adminOverview?.integrations.map((integration, index) => (
                      <div
                        key={`${integration.provider}-${integration.mode}-${index}`}
                        className="rounded-md bg-app-surface-muted p-3"
                      >
                        <p className="text-sm font-black">
                          {formatRole(integration.provider)} ·{" "}
                          {formatRole(integration.mode)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-app-text-muted">
                          {formatRole(integration.status)} · {integration.totalImported}{" "}
                          imported
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-app-text-muted">
                      No integration connections yet.
                    </p>
                  )}
                </div>
              </div>
            </WorkspacePanel>
          </div>
          <ConfirmActionModal
            open={pendingStatus !== null}
            onOpenChange={(nextOpen) => !nextOpen && setPendingStatus(null)}
            title={businessStatusActionCopy(pendingStatus, business.name).title}
            description={
              businessStatusActionCopy(pendingStatus, business.name).description
            }
            confirmLabel={businessStatusActionCopy(pendingStatus, business.name).label}
            danger={
              pendingStatus === "SUSPENDED" ||
              pendingStatus === "REJECTED" ||
              pendingStatus === "ARCHIVED"
            }
            onConfirm={() => pendingStatus && mutation.mutate(pendingStatus)}
            isPending={mutation.isPending}
          />
        </div>
      )}
    </AdminShell>
  );
}

function CompactBusinessMetric({
  label,
  value
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-app-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{new Intl.NumberFormat().format(value)}</p>
    </div>
  );
}

function businessStatusActions(status: BusinessStatus): Array<{
  status: BusinessStatus;
  label: string;
  danger: boolean;
}> {
  const archive = { status: "ARCHIVED" as const, label: "Archive", danger: true };
  if (status === "PENDING")
    return [
      { status: "ACTIVE", label: "Approve and activate", danger: false },
      { status: "REJECTED", label: "Reject application", danger: true },
      archive
    ];
  if (status === "ACTIVE")
    return [{ status: "SUSPENDED", label: "Suspend", danger: true }, archive];
  if (status === "SUSPENDED")
    return [{ status: "ACTIVE", label: "Reactivate", danger: false }, archive];
  if (status === "REJECTED")
    return [{ status: "PENDING", label: "Return to review", danger: false }, archive];
  return [{ status: "PENDING", label: "Return to review", danger: false }];
}

function businessStatusActionCopy(status: BusinessStatus | null, name: string) {
  if (status === "ACTIVE")
    return {
      title: "Activate this business?",
      description: `${name} will be able to use tenant workspace operations.`,
      label: "Activate business"
    };
  if (status === "PENDING")
    return {
      title: "Return this business to review?",
      description: `${name} will remain blocked from tenant operations until approved.`,
      label: "Return to review"
    };
  if (status === "REJECTED")
    return {
      title: "Reject this application?",
      description: `${name} will remain blocked from tenant operations.`,
      label: "Reject application"
    };
  if (status === "SUSPENDED")
    return {
      title: "Suspend this business?",
      description: `${name} will immediately lose access to tenant workspace operations.`,
      label: "Suspend business"
    };
  return {
    title: "Archive this business?",
    description: `${name} will no longer be operational. Existing records are preserved.`,
    label: "Archive business"
  };
}

export function BusinessRoutesFallback(): JSX.Element {
  return (
    <Suspense
      fallback={
        <StandaloneState
          title="Loading workspace"
          description="Preparing business routes."
        />
      }
    >
      <BusinessIndexPage />
    </Suspense>
  );
}

function useBusinessContext():
  | {
      state: JSX.Element;
      businesses?: never;
      activeBusiness?: never;
      business?: never;
      membership?: never;
      permissions?: never;
    }
  | {
      state: null;
      businesses: MyBusiness[];
      activeBusiness: MyBusiness;
      business: BusinessDetail;
      membership: MyBusiness["membership"];
      permissions: {
        canManageBusiness: boolean;
        canManageBranches: boolean;
        canManageStaff: boolean;
        canAssignAdmin: boolean;
      };
    } {
  const { businessId } = useParams();
  const mineQuery = useQuery({
    queryKey: ["businesses", "mine"],
    queryFn: () => fetchMyBusinesses({ pageSize: 100 })
  });
  const businesses = mineQuery.data?.businesses ?? [];
  const activeBusiness = businesses.find((business) => business.id === businessId);
  const businessQuery = useQuery({
    queryKey: ["businesses", businessId],
    queryFn: () => fetchBusiness(businessId ?? ""),
    enabled: Boolean(businessId && activeBusiness)
  });

  if (mineQuery.isLoading || businessQuery.isLoading) {
    return {
      state: (
        <StandaloneState
          title="Loading workspace"
          description="Loading business context and permissions."
        />
      )
    };
  }

  if (mineQuery.error) {
    return {
      state: (
        <StandaloneState
          title="Workspace unavailable"
          description={normalizeApiError(mineQuery.error).message}
        />
      )
    };
  }

  if (!businessId || !activeBusiness) {
    return { state: <Navigate to="/business" replace /> };
  }

  if (businessQuery.error || !businessQuery.data) {
    return {
      state: (
        <StandaloneState
          title="Business unavailable"
          description={
            businessQuery.error
              ? normalizeApiError(businessQuery.error).message
              : "This business could not be loaded."
          }
        />
      )
    };
  }

  if (businessQuery.data.business.status !== "ACTIVE") {
    const restricted = businessQuery.data.business;
    const copy = {
      PENDING: {
        title: "Your business is pending review",
        description:
          "Your setup was received successfully. A platform administrator must approve the business before workspace tools become available."
      },
      SUSPENDED: {
        title: "This business is suspended",
        description:
          "Workspace operations are paused. Contact platform support if you need help restoring access."
      },
      REJECTED: {
        title: "This business was not approved",
        description:
          "The business application is not active. Contact platform support for clarification or next steps."
      },
      ARCHIVED: {
        title: "This business is archived",
        description: "Archived businesses cannot access workspace operations."
      }
    }[restricted.status as Exclude<BusinessStatus, "ACTIVE">];
    return {
      state: (
        <StandaloneState
          title={copy.title}
          description={`${copy.description} Business: ${restricted.name}.`}
        />
      )
    };
  }

  return {
    state: null,
    businesses,
    activeBusiness,
    business: businessQuery.data.business,
    membership: businessQuery.data.membership,
    permissions: businessQuery.data.permissions
  };
}

function BusinessCollectionToolbar({
  count,
  label,
  view,
  onView
}: {
  count: number;
  label: string;
  view: CollectionView;
  onView: (view: CollectionView) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-bold text-app-text-muted">
        {count} {label}
      </p>
      <CollectionViewToggle view={view} onChange={onView} label={`${label} view`} />
    </div>
  );
}

function businessCollectionClasses(view: CollectionView) {
  return view === "grid" ? "grid min-w-0 gap-3 md:grid-cols-2" : "grid min-w-0 gap-3";
}

function BranchList({
  businessId,
  branches,
  view
}: {
  businessId: string;
  branches: BranchSummary[];
  view: CollectionView;
}): JSX.Element {
  return (
    <div className={businessCollectionClasses(view)}>
      {branches.map((branch) => (
        <RowLink key={branch.id} to={`/business/${businessId}/branches/${branch.id}`}>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <InitialsBadge name={branch.name} />
            <div className="min-w-0">
              <p className="font-black">{branch.name}</p>
              <p className="text-sm font-semibold text-app-text-muted">
                {branch.code} · {branch.city}
                {branch.isPrimary ? " · Primary" : ""}
              </p>
            </div>
            <StatusBadge status={branch.status} />
          </div>
        </RowLink>
      ))}
    </div>
  );
}

function StaffList({
  businessId,
  memberships,
  view
}: {
  businessId: string;
  memberships: MyBusiness["membership"][];
  view: CollectionView;
}): JSX.Element {
  return (
    <div className={businessCollectionClasses(view)}>
      {memberships.map((membership) => (
        <RowLink
          key={membership.id}
          to={`/business/${businessId}/staff/${membership.id}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <InitialsBadge
              name={`${membership.user?.firstName ?? "Staff"} ${membership.user?.lastName ?? ""}`}
            />
            <div className="min-w-0">
              <p className="font-black">
                {membership.user?.firstName} {membership.user?.lastName}
              </p>
              <p className="text-sm font-semibold text-app-text-muted">
                {formatRole(membership.role)} ·{" "}
                {membership.allBranchesAccess
                  ? "All branches"
                  : membership.branches.map((branch) => branch.name).join(", ")}
              </p>
            </div>
            <StatusBadge status={membership.status} />
          </div>
        </RowLink>
      ))}
    </div>
  );
}

function FilterBar<TStatus extends string>({
  search,
  onSearch,
  status,
  onStatus,
  statuses,
  searchLabel
}: {
  search: string;
  onSearch: (value: string) => void;
  status: TStatus | "";
  onStatus: (value: TStatus | "") => void;
  statuses: TStatus[];
  searchLabel: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{searchLabel}</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="h-11 w-full rounded-md border border-app-border bg-app-surface pl-9 pr-3 text-sm font-semibold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
          placeholder={searchLabel}
        />
      </label>
      <AppSelectField
        value={status}
        onValueChange={(value) => onStatus(value as TStatus | "")}
        options={[
          { value: "", label: "All statuses" },
          ...statuses.map((item) => ({ value: item, label: formatRole(item) }))
        ]}
        ariaLabel="Filter by status"
        triggerClassName="h-11 sm:w-48"
      />
    </div>
  );
}

function SectionTitle({
  title,
  description,
  className = ""
}: {
  title: string;
  description: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={className}>
      <h2 className="text-base font-black text-app-text">{title}</h2>
      <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
        {description}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-md bg-app-surface-muted p-3">
      <dt className="text-xs font-black uppercase text-app-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-app-text">{value}</dd>
    </div>
  );
}

function InlineError({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <div
      className="h-36 animate-pulse rounded-lg bg-app-surface-muted"
      aria-label="Loading"
    />
  );
}

function StandaloneState({
  title,
  description
}: {
  title: string;
  description: string;
}): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-4 text-app-text">
      <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 text-center shadow-panel">
        <BrandMark compact />
        <h1 className="mt-8 text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-app-text-muted">
          {description}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <WorkspaceButton to="/account" tone="secondary">
            Account
          </WorkspaceButton>
          <WorkspaceButton to="/" tone="secondary">
            Home
          </WorkspaceButton>
        </div>
      </section>
    </main>
  );
}

function businessToSettingsValues(business: BusinessDetail): BusinessSettingsValues {
  return {
    name: business.name,
    industry: business.industry,
    description: business.description ?? undefined,
    email: business.email,
    phone: business.phone,
    website: business.website ?? undefined,
    logoUrl: business.logoUrl ?? undefined,
    country: business.country,
    city: business.city,
    district: business.district ?? undefined,
    addressLine: business.addressLine,
    timezone: business.timezone
  };
}

function getCategoryBadgeClass(colorKey: string): string {
  return CATEGORY_BADGE_CLASSES[colorKey] ?? CATEGORY_BADGE_CLASSES.indigo!;
}

function normalizeCategoryForm(values: CategoryFormState): {
  name: string;
  description: string | null;
  colorKey: string;
} {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    colorKey: values.colorKey
  };
}

function validateCategoryForm(values: CategoryFormState): string | null {
  const normalized = normalizeCategoryForm(values);

  if (!normalized.name) {
    return "Category name is required.";
  }
  if (normalized.name.length > 100) {
    return "Category name must be 100 characters or fewer.";
  }
  if ((normalized.description?.length ?? 0) > 500) {
    return "Category description must be 500 characters or fewer.";
  }
  if (!CATEGORY_COLOR_OPTIONS.some((color) => color.key === normalized.colorKey)) {
    return "Choose a supported category color.";
  }

  return null;
}

function branchToFormValues(branch: BranchSummary): BranchFormValues {
  return {
    name: branch.name,
    code: branch.code,
    addressLine: branch.addressLine,
    city: branch.city,
    district: branch.district ?? undefined,
    country: branch.country,
    phone: branch.phone ?? undefined,
    email: branch.email ?? undefined,
    isPrimary: branch.isPrimary
  };
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value)
  );
}

type FieldAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

function FieldArea({
  label,
  error,
  id,
  className = "",
  ...props
}: FieldAreaProps): JSX.Element {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-app-text">
        {label}
      </label>
      <textarea
        id={id}
        className={`mt-2 min-h-28 w-full rounded-md border bg-app-surface px-4 py-3 text-sm font-medium outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 ${error ? "border-app-error" : "border-app-border"}`}
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
      {error ? (
        <p className="mt-2 text-sm font-semibold text-app-error">{error}</p>
      ) : null}
    </div>
  );
}
