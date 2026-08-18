import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ChevronDown,
  HeartPulse,
  RefreshCw,
  RotateCcw,
  Server,
  SlidersHorizontal
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { CollectionViewToggle } from "../../components/collection-view/CollectionViewToggle.js";
import type { CollectionView } from "../../components/collection-view/collection-view.js";
import { useCollectionView } from "../../components/collection-view/useCollectionView.js";
import { AppDatePickerField } from "../../components/ui/date-picker.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { AdminShell, EmptyState, WorkspacePanel } from "../businesses/components.js";
import { formatRole } from "../businesses/format.js";
import {
  applyAdminIntegrationAction,
  applyAdminUserAction,
  fetchAdminFeedback,
  fetchAdminFeedbackDetail,
  fetchAdminFilterOptions,
  fetchAdminIntegrations,
  fetchAdminIntegration,
  fetchAdminSystemHealth,
  fetchAdminUsers,
  fetchAdminUser
} from "./api.js";
import type {
  AdminFeedbackDetail,
  AdminFeedbackRecord,
  AdminIntegrationDetail,
  AdminIntegrationRecord,
  AdminUserRecord,
  Pagination
} from "./types.js";
import {
  AdminDetailModal,
  ConfirmActionModal,
  DangerZone,
  DetailField,
  DetailSection,
  DetailStat,
  DetailTechnicalSection
} from "./AdminDetailModal.js";

const USER_ROLES = ["PLATFORM_ADMIN", "BUSINESS_OWNER", "STAFF", "CUSTOMER"];
const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "DISABLED"];
const CHANNELS = [
  "MANUAL",
  "PUBLIC_FORM",
  "QR_CODE",
  "WHATSAPP",
  "EMAIL",
  "GOOGLE_REVIEW",
  "FACEBOOK",
  "INSTAGRAM",
  "X",
  "OTHER"
];
const FEEDBACK_STATUSES = ["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"];
const PROVIDERS = ["GOOGLE_REVIEWS", "WHATSAPP", "EMAIL", "X", "FACEBOOK", "INSTAGRAM"];

export function AdminUsersPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [page, setPage] = useState(1);
  const options = useAdminOptions();
  const query = useQuery({
    queryKey: ["admin", "users", search, role, status, businessId, page],
    queryFn: () =>
      fetchAdminUsers({
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
        businessId: businessId || undefined,
        page: String(page)
      })
  });
  const users = query.data?.users ?? [];
  const collectionView = useCollectionView("admin-users", users.length);
  const clearFilters = () => {
    setSearch("");
    setRole("");
    setStatus("");
    setBusinessId("");
    setPage(1);
  };
  return (
    <AdminShell title="Users" subtitle="Platform-wide account and membership oversight.">
      <FilterPanel
        activeCount={[search, role, status, businessId].filter(Boolean).length}
        onClear={clearFilters}
      >
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name or email"
        />
        <SelectFilter
          label="Role"
          value={role}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
          options={USER_ROLES}
        />
        <SelectFilter
          label="Account status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={ACCOUNT_STATUSES}
        />
        <SelectFilter
          label="Business"
          value={businessId}
          onChange={(value) => {
            setBusinessId(value);
            setPage(1);
          }}
          options={(options.data?.businesses ?? []).map((item) => ({
            value: item.id,
            label: item.name
          }))}
        />
      </FilterPanel>
      <DataState query={query} emptyTitle="No users found">
        {query.data ? (
          <>
            <CollectionToolbar
              count={query.data.pagination.total}
              label="users"
              view={collectionView.view}
              onView={collectionView.setView}
            />
            {users.length ? (
              <div className={collectionClasses(collectionView.view)}>
                {users.map((user) => (
                  <AdminUserCard key={user.id} user={user} view={collectionView.view} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No users found"
                description="No platform users match the current filters."
              />
            )}
            <Pager pagination={query.data.pagination} onPage={setPage} />
          </>
        ) : null}
      </DataState>
    </AdminShell>
  );
}

export function AdminFeedbackPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>({
    businessId: searchParams.get("businessId") ?? ""
  });
  const [page, setPage] = useState(1);
  const options = useAdminOptions();
  const branches = (options.data?.branches ?? []).filter(
    (item) => !filters.businessId || item.businessId === filters.businessId
  );
  const categories = (options.data?.categories ?? []).filter(
    (item) => !filters.businessId || item.businessId === filters.businessId
  );
  const update = (key: string, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "businessId" ? { branchId: "", categoryId: "" } : {})
    }));
    setPage(1);
  };
  const query = useQuery({
    queryKey: ["admin", "feedback", filters, page],
    queryFn: () => fetchAdminFeedback({ ...withoutEmpty(filters), page: String(page) })
  });
  const feedback = query.data?.feedback ?? [];
  const collectionView = useCollectionView("admin-feedback", feedback.length);
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };
  return (
    <AdminShell
      title="Feedback oversight"
      subtitle="Platform-level visibility without changing business inbox workflows."
    >
      <FilterPanel
        activeCount={Object.values(filters).filter(Boolean).length}
        onClear={clearFilters}
      >
        <SearchField
          value={filters.search ?? ""}
          onChange={(value) => update("search", value)}
          placeholder="Search feedback"
        />
        <SelectFilter
          label="Business"
          value={filters.businessId ?? ""}
          onChange={(value) => update("businessId", value)}
          options={(options.data?.businesses ?? []).map((item) => ({
            value: item.id,
            label: item.name
          }))}
        />
        <SelectFilter
          label="Branch"
          value={filters.branchId ?? ""}
          onChange={(value) => update("branchId", value)}
          options={branches.map((item) => ({ value: item.id, label: item.name }))}
        />
        <SelectFilter
          label="Channel"
          value={filters.channel ?? ""}
          onChange={(value) => update("channel", value)}
          options={CHANNELS}
        />
        <SelectFilter
          label="Status"
          value={filters.status ?? ""}
          onChange={(value) => update("status", value)}
          options={FEEDBACK_STATUSES}
        />
        <SelectFilter
          label="Priority"
          value={filters.priority ?? ""}
          onChange={(value) => update("priority", value)}
          options={PRIORITIES}
        />
        <SelectFilter
          label="Category"
          value={filters.categoryId ?? ""}
          onChange={(value) => update("categoryId", value)}
          options={categories.map((item) => ({ value: item.id, label: item.name }))}
        />
        <SelectFilter
          label="Sentiment"
          value={filters.sentiment ?? ""}
          onChange={(value) => update("sentiment", value)}
          options={SENTIMENTS}
        />
        <DateField
          label="From"
          value={filters.dateFrom ?? ""}
          onChange={(value) => update("dateFrom", value)}
        />
        <DateField
          label="To"
          value={filters.dateTo ?? ""}
          onChange={(value) => update("dateTo", value)}
        />
      </FilterPanel>
      <DataState query={query} emptyTitle="No feedback found">
        {query.data ? (
          <>
            <CollectionToolbar
              count={query.data.pagination.total}
              label="feedback records"
              view={collectionView.view}
              onView={collectionView.setView}
            />
            {feedback.length ? (
              <div className={collectionClasses(collectionView.view)}>
                {feedback.map((item) => (
                  <AdminFeedbackCard
                    key={item.id}
                    item={item}
                    view={collectionView.view}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No feedback found"
                description="No feedback records match the current platform filters."
              />
            )}
            <Pager pagination={query.data.pagination} onPage={setPage} />
          </>
        ) : null}
      </DataState>
    </AdminShell>
  );
}

export function AdminIntegrationsPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>({
    health: searchParams.get("health") ?? "",
    businessId: searchParams.get("businessId") ?? ""
  });
  const [page, setPage] = useState(1);
  const options = useAdminOptions();
  const update = (key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const query = useQuery({
    queryKey: ["admin", "integrations", filters, page],
    queryFn: () =>
      fetchAdminIntegrations({ ...withoutEmpty(filters), page: String(page) })
  });
  const integrations = query.data?.integrations ?? [];
  const collectionView = useCollectionView("admin-integrations", integrations.length);
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };
  return (
    <AdminShell
      title="Integration oversight"
      subtitle="Connection, webhook, synchronization, and import health across businesses."
    >
      <FilterPanel
        activeCount={Object.values(filters).filter(Boolean).length}
        onClear={clearFilters}
      >
        <SearchField
          value={filters.search ?? ""}
          onChange={(value) => update("search", value)}
          placeholder="Search connection or business"
        />
        <SelectFilter
          label="Business"
          value={filters.businessId ?? ""}
          onChange={(value) => update("businessId", value)}
          options={(options.data?.businesses ?? []).map((item) => ({
            value: item.id,
            label: item.name
          }))}
        />
        <SelectFilter
          label="Provider"
          value={filters.provider ?? ""}
          onChange={(value) => update("provider", value)}
          options={PROVIDERS}
        />
        <SelectFilter
          label="Mode"
          value={filters.mode ?? ""}
          onChange={(value) => update("mode", value)}
          options={["LIVE", "DEMO"]}
        />
        <SelectFilter
          label="Status"
          value={filters.status ?? ""}
          onChange={(value) => update("status", value)}
          options={["CONNECTED", "PAUSED", "DISCONNECTED", "ERROR"]}
        />
        <SelectFilter
          label="Health"
          value={filters.health ?? ""}
          onChange={(value) => update("health", value)}
          options={[
            { value: "HEALTHY", label: "Healthy" },
            { value: "NEEDS_ATTENTION", label: "Needs attention" }
          ]}
        />
      </FilterPanel>
      <DataState query={query} emptyTitle="No integrations found">
        {query.data ? (
          <>
            <CollectionToolbar
              count={query.data.pagination.total}
              label="connections"
              view={collectionView.view}
              onView={collectionView.setView}
            />
            {integrations.length ? (
              <div className={collectionClasses(collectionView.view)}>
                {integrations.map((item) => (
                  <AdminIntegrationCard
                    key={item.id}
                    item={item}
                    view={collectionView.view}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No integrations found"
                description="No integration connections match the current platform filters."
              />
            )}
            <Pager pagination={query.data.pagination} onPage={setPage} />
          </>
        ) : null}
      </DataState>
    </AdminShell>
  );
}

export function AdminSystemHealthPage(): JSX.Element {
  const query = useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: fetchAdminSystemHealth,
    refetchInterval: 60_000
  });
  return (
    <AdminShell
      title="Platform health"
      subtitle="Understandable service and processing health derived from real persisted states."
      actions={
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-app-border px-3 text-sm font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <DataState query={query} emptyTitle="Health data unavailable">
        {query.data ? (
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-lg font-bold">Core Services</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <HealthCard
                  icon={<Server className="h-5 w-5" />}
                  title="Application service"
                  status={query.data.api.status}
                  detail={query.data.api.detail}
                />
                <HealthCard
                  icon={<Database className="h-5 w-5" />}
                  title="Database service"
                  status={query.data.database.status}
                  detail={query.data.database.detail}
                />
              </div>
            </section>
            <div className="grid gap-4 lg:grid-cols-3">
              {Object.entries(query.data.workers).map(([name, worker]) => (
                <WorkspacePanel key={name}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">{processingSectionLabel(name)}</h2>
                    <HeartPulse className="h-5 w-5 text-app-primary" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {worker.states.length ? (
                      worker.states.map((state) => (
                        <div
                          key={state.status}
                          className="flex justify-between rounded-md bg-app-surface-muted p-3 text-sm"
                        >
                          <span className="font-bold">{formatRole(state.status)}</span>
                          <span className="font-bold">{state.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-app-text-muted">
                        No persisted activity.
                      </p>
                    )}
                  </div>
                  <p
                    className={`mt-4 text-xs font-bold ${worker.staleProcessing ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {worker.staleProcessing
                      ? `${worker.staleProcessing} stale processing records`
                      : "No stale processing records"}
                  </p>
                </WorkspacePanel>
              ))}
            </div>
            <WorkspacePanel>
              <h2 className="font-bold">Webhook Activity · last 24 hours</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {query.data.recentWebhookActivity.length ? (
                  query.data.recentWebhookActivity.map((item) => (
                    <div
                      key={item.status}
                      className="min-w-36 rounded-md bg-app-surface-muted p-3"
                    >
                      <p className="text-xs font-bold text-app-text-muted">
                        {formatRole(item.status)}
                      </p>
                      <p className="mt-1 text-xl font-bold">{item.count}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-app-text-muted">
                    No webhook activity in the last 24 hours.
                  </p>
                )}
              </div>
            </WorkspacePanel>
            <p className="rounded-md border border-app-border bg-app-surface-muted/50 p-4 text-xs font-semibold text-app-text-muted">
              {query.data.note} Checked {formatDateTime(query.data.checkedAt)}.
            </p>
          </div>
        ) : null}
      </DataState>
    </AdminShell>
  );
}

function useAdminOptions() {
  return useQuery({
    queryKey: ["admin", "filter-options"],
    queryFn: fetchAdminFilterOptions,
    staleTime: 60_000
  });
}
function FilterPanel({
  children,
  activeCount,
  onClear
}: {
  children: React.ReactNode;
  activeCount: number;
  onClear: () => void;
}) {
  const [isOpen, setOpen] = useState(activeCount > 0);
  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-app-border bg-app-surface-muted/40">
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-app-focus/30"
          aria-expanded={isOpen}
        >
          <SlidersHorizontal className="h-4 w-4 text-app-primary" />
          Filters
          {activeCount ? (
            <span className="rounded-full bg-app-primary px-2 py-0.5 text-[10px] text-app-primary-foreground">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {activeCount ? (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-bold text-app-text-muted hover:bg-app-surface"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear filters
          </button>
        ) : (
          <p className="ml-auto text-xs font-semibold text-app-text-muted">
            No filters applied
          </p>
        )}
      </div>
      {isOpen ? (
        <div className="grid gap-3 border-t border-app-border p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function CollectionToolbar({
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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-bold text-app-text-muted">
        {count} {label}
      </p>
      <CollectionViewToggle view={view} onChange={onView} label={`${label} view`} />
    </div>
  );
}

function collectionClasses(view: CollectionView) {
  return view === "grid"
    ? "grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3"
    : "grid min-w-0 gap-3";
}

function AdminUserCard({ user, view }: { user: AdminUserRecord; view: CollectionView }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<
    "REVOKE_SESSIONS" | "SUSPEND" | "DISABLE" | null
  >(null);
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "users", user.id, "detail"],
    queryFn: () => fetchAdminUser(user.id),
    enabled: open
  });
  const action = useMutation({
    mutationFn: (value: Parameters<typeof applyAdminUserAction>[1]) =>
      applyAdminUserAction(user.id, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "users", user.id, "detail"]
      });
      setConfirmation(null);
    }
  });
  const memberships = user.businessMemberships.length
    ? user.businessMemberships
        .map((item) => `${item.business.name} (${formatRole(item.role)})`)
        .join(", ")
    : user.role === "PLATFORM_ADMIN"
      ? "Platform-wide access"
      : "No tenant membership required";
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-2xl border border-app-border/80 bg-app-surface p-5 pt-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-indigo-600 before:via-violet-500 before:to-sky-400 ${
        view === "list"
          ? "sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
          : ""
      }`}
    >
      <div className="min-w-0">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-black text-white shadow-md shadow-indigo-500/20">
          {user.firstName.charAt(0)}
          {user.lastName.charAt(0)}
        </div>
        <p className="break-words text-base font-black">
          {user.firstName} {user.lastName}
        </p>
        <p className="mt-1 break-all text-xs font-semibold text-app-text-muted">
          {user.email}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge value={user.role} />
          <Badge value={user.status} />
        </div>
      </div>
      <div className="mt-4 min-w-0 sm:mt-0">
        <CardLabel>Memberships</CardLabel>
        <p className="break-words text-sm font-semibold">{memberships}</p>
      </div>
      <div className="mt-4 text-xs font-semibold text-app-text-muted sm:mt-0 sm:text-right">
        <p>{user.emailVerifiedAt ? "Verified" : "Not verified"}</p>
        <p className="mt-1">Created {formatDate(user.createdAt)}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-app-primary-soft px-3 py-2 font-black text-app-primary transition hover:bg-app-primary hover:text-white"
        >
          Manage user
        </button>
      </div>
      {open ? (
        <AdminDetailModal
          open={open}
          onOpenChange={setOpen}
          title={`${user.firstName} ${user.lastName}`}
          description={user.email}
          badges={
            <>
              <Badge value={user.role} />
              <Badge value={user.status} />
            </>
          }
        >
          {detail.isLoading ? (
            <p className="text-sm text-app-text-muted">Loading account details…</p>
          ) : null}
          {detail.data ? (
            <div className="space-y-5">
              <DetailSection title="Account">
                <DetailField label="Account role" value={formatRole(detail.data.role)} />
                <DetailField
                  label="Account status"
                  value={formatRole(detail.data.status)}
                />
                <DetailField
                  label="Verification"
                  value={
                    detail.data.emailVerifiedAt ? "Email verified" : "Email not verified"
                  }
                />
                <DetailField
                  label="Created"
                  value={formatDateTime(detail.data.createdAt)}
                />
                <DetailField
                  label="Last login"
                  value={formatDateTime(detail.data.lastLoginAt)}
                />
                <DetailField
                  label="Updated"
                  value={formatDateTime(detail.data.updatedAt)}
                />
              </DetailSection>
              <DetailSection
                title="Memberships"
                description={
                  detail.data.role === "PLATFORM_ADMIN"
                    ? "Platform-wide access; no tenant membership is required."
                    : "Current business access for this account."
                }
              >
                {detail.data.businessMemberships.length ? (
                  detail.data.businessMemberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="min-w-0 rounded-lg border border-app-border p-3"
                    >
                      <p className="break-words text-sm font-bold">
                        {membership.business.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge value={membership.role} />
                        <Badge value={membership.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-app-text-muted sm:col-span-2">
                    {detail.data.role === "PLATFORM_ADMIN"
                      ? "Platform-wide access"
                      : "No tenant membership required"}
                  </p>
                )}
              </DetailSection>
              <DetailSection title="Sessions" description="Safe session metadata only.">
                <DetailStat
                  label="Active sessions"
                  value={
                    detail.data.sessions.filter(
                      (session) =>
                        !session.revokedAt && new Date(session.expiresAt) > new Date()
                    ).length
                  }
                  detail={`${detail.data.sessions.length} recent sessions returned`}
                />
                <DetailStat
                  label="Last login"
                  value={formatDateTime(detail.data.lastLoginAt)}
                />
                <div className="space-y-2 sm:col-span-2">
                  {detail.data.sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="grid min-w-0 gap-2 rounded-lg border border-app-border p-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold">
                          {session.userAgent ?? "Unknown browser or device"}
                        </p>
                        <p className="mt-1 text-app-text-muted">
                          {session.ipAddress ?? "IP unavailable"} · last used{" "}
                          {formatDateTime(session.lastUsedAt)}
                        </p>
                      </div>
                      <Badge value={session.revokedAt ? "REVOKED" : "ACTIVE"} />
                    </div>
                  ))}
                </div>
              </DetailSection>
              <DetailSection
                title="Administrative actions"
                description="Only supported account-state controls are available."
              >
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <ActionButton
                    onClick={() =>
                      action.mutate(
                        user.emailVerifiedAt ? "UNVERIFY_EMAIL" : "VERIFY_EMAIL"
                      )
                    }
                  >
                    {user.emailVerifiedAt ? "Mark unverified" : "Mark verified"}
                  </ActionButton>
                  {user.status !== "ACTIVE" ? (
                    <ActionButton onClick={() => action.mutate("REACTIVATE")}>
                      Reactivate account
                    </ActionButton>
                  ) : null}
                </div>
              </DetailSection>
              <DangerZone>
                <ActionButton danger onClick={() => setConfirmation("REVOKE_SESSIONS")}>
                  Revoke all sessions
                </ActionButton>
                {user.status === "ACTIVE" ? (
                  <ActionButton danger onClick={() => setConfirmation("SUSPEND")}>
                    Suspend account
                  </ActionButton>
                ) : null}
                {user.status !== "DISABLED" ? (
                  <ActionButton danger onClick={() => setConfirmation("DISABLE")}>
                    Disable account
                  </ActionButton>
                ) : null}
              </DangerZone>
            </div>
          ) : null}
          {detail.error || action.error ? (
            <p className="mt-3 text-sm font-bold text-app-error">
              {normalizeApiError(detail.error ?? action.error).message}
            </p>
          ) : null}
        </AdminDetailModal>
      ) : null}
      <ConfirmActionModal
        open={confirmation !== null}
        onOpenChange={(nextOpen) => !nextOpen && setConfirmation(null)}
        title={userConfirmationCopy(confirmation).title}
        description={userConfirmationCopy(confirmation, user.email).description}
        confirmLabel={userConfirmationCopy(confirmation).label}
        onConfirm={() => confirmation && action.mutate(confirmation)}
        isPending={action.isPending}
      />
    </article>
  );
}

function AdminFeedbackCard({
  item,
  view
}: {
  item: AdminFeedbackRecord;
  view: CollectionView;
}) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({
    queryKey: ["admin", "feedback", item.id, "detail"],
    queryFn: () => fetchAdminFeedbackDetail(item.id),
    enabled: open
  });
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-2xl border border-app-border/80 bg-app-surface p-5 pt-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-sky-500 before:via-indigo-500 before:to-violet-500 ${
        view === "list"
          ? "sm:grid sm:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.8fr)_auto] sm:items-center sm:gap-5"
          : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Badge value={item.channel} />
          <Badge value={item.status} />
        </div>
        <h2 className="mt-3 break-words text-base font-black">
          {item.title ?? "Untitled feedback"}
        </h2>
        <p className="mt-1 line-clamp-3 break-words text-sm font-medium leading-6 text-app-text-muted">
          {item.message}
        </p>
      </div>
      <div className="mt-4 min-w-0 sm:mt-0">
        <CardLabel>Business / branch</CardLabel>
        <p className="break-words text-sm font-bold">{item.business.name}</p>
        <p className="break-words text-xs font-semibold text-app-text-muted">
          {item.branch.name}
        </p>
        <p className="mt-3 text-xs font-bold text-app-text-muted">
          {formatRole(item.priority)} priority · {item.category?.name ?? "Uncategorized"}
        </p>
      </div>
      <div className="mt-4 sm:mt-0 sm:text-right">
        {item.aiAnalysis?.sentiment ? (
          <Badge value={item.aiAnalysis.sentiment} />
        ) : (
          <span className="text-xs font-semibold text-app-text-muted">Not analyzed</span>
        )}
        <p className="mt-2 text-xs font-semibold text-app-text-muted">
          {formatDateTime(item.receivedAt)}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-app-primary-soft px-3 py-2 text-xs font-black text-app-primary transition hover:bg-app-primary hover:text-white"
        >
          View details
        </button>
      </div>
      {open ? (
        <AdminDetailModal
          open={open}
          onOpenChange={setOpen}
          title={item.title ?? "Feedback details"}
          description={`${formatRole(item.channel)} feedback received ${formatDateTime(item.receivedAt)}`}
          badges={
            <>
              <Badge value={item.status} />
              <Badge value={item.priority} />
            </>
          }
        >
          {detail.isLoading ? (
            <p className="text-sm text-app-text-muted">Loading feedback details…</p>
          ) : null}
          {detail.data ? <FeedbackModalContent detail={detail.data} /> : null}
          {detail.error ? (
            <p className="text-sm font-bold text-app-error">
              {normalizeApiError(detail.error).message}
            </p>
          ) : null}
        </AdminDetailModal>
      ) : null}
    </article>
  );
}

function AdminIntegrationCard({
  item,
  view
}: {
  item: AdminIntegrationRecord;
  view: CollectionView;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "integrations", item.id, "detail"],
    queryFn: () => fetchAdminIntegration(item.id),
    enabled: open
  });
  const action = useMutation({
    mutationFn: (value: Parameters<typeof applyAdminIntegrationAction>[1]) =>
      applyAdminIntegrationAction(item.id, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "integrations"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "integrations", item.id, "detail"]
      });
      setConfirmDisconnect(false);
    }
  });
  const lastActivity =
    item.lastInboundMessageAt ?? item.lastSuccessfulSyncAt ?? item.lastAttemptedSyncAt;
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-2xl border border-app-border/80 bg-app-surface p-5 pt-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-emerald-500 before:via-sky-500 before:to-indigo-500 ${
        view === "list"
          ? "sm:grid sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(180px,0.7fr)] sm:items-center sm:gap-5"
          : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Badge value={item.mode} />
          <Badge value={item.health} />
        </div>
        <h2 className="mt-3 break-words text-base font-black">
          {formatRole(item.provider)}
          {item.liveProviderType ? ` · ${formatRole(item.liveProviderType)}` : ""}
        </h2>
        <p className="mt-1 break-words text-xs font-semibold text-app-text-muted">
          {item.displayName}
        </p>
        {item.lastErrorCode ? (
          <p className="mt-2 break-words text-xs font-bold text-app-error">
            {humanizeErrorCode(item.lastErrorCode)}
          </p>
        ) : null}
      </div>
      <div className="mt-4 min-w-0 sm:mt-0">
        <CardLabel>Business / branch</CardLabel>
        <p className="break-words text-sm font-bold">{item.business.name}</p>
        <p className="break-words text-xs font-semibold text-app-text-muted">
          {item.defaultBranch.name}
        </p>
        <p className="mt-3 text-xs font-semibold text-app-text-muted">
          Webhook:{" "}
          {item.webhookStatus ? formatRole(item.webhookStatus) : "Not applicable"}
        </p>
      </div>
      <div className="mt-4 text-xs font-semibold text-app-text-muted sm:mt-0 sm:text-right">
        <p>
          <span className="font-bold text-app-text">{item.totalImported}</span> imported
        </p>
        <p className="mt-1">{formatDateTime(lastActivity)}</p>
        <div className="mt-2">
          {item.synchronizationRuns[0] ? (
            <Badge value={item.synchronizationRuns[0].status} />
          ) : (
            "No runs"
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-app-primary-soft px-3 py-2 font-black text-app-primary transition hover:bg-app-primary hover:text-white"
        >
          Manage connection
        </button>
      </div>
      {open ? (
        <AdminDetailModal
          open={open}
          onOpenChange={setOpen}
          title={formatRole(item.provider)}
          description={item.displayName}
          badges={
            <>
              <Badge value={item.mode} />
              <Badge value={item.health} />
              <Badge value={item.status} />
            </>
          }
        >
          {detail.isLoading ? (
            <p className="text-sm text-app-text-muted">Loading connection history…</p>
          ) : null}
          {detail.data ? (
            <IntegrationModalContent
              detail={detail.data}
              onPause={() => action.mutate("PAUSE")}
              onResume={() => action.mutate("RESUME")}
              onDisconnect={() => setConfirmDisconnect(true)}
              isPending={action.isPending}
            />
          ) : null}
          {detail.error || action.error ? (
            <p className="mt-3 text-sm font-bold text-app-error">
              {normalizeApiError(detail.error ?? action.error).message}
            </p>
          ) : null}
        </AdminDetailModal>
      ) : null}
      <ConfirmActionModal
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Disconnect this Demo connection?"
        description={`Disconnecting ${item.displayName} stops future Demo synchronization. Existing imported feedback is preserved.`}
        confirmLabel="Disconnect connection"
        onConfirm={() => action.mutate("DISCONNECT")}
        isPending={action.isPending}
      />
    </article>
  );
}

function FeedbackModalContent({ detail }: { detail: AdminFeedbackDetail }): JSX.Element {
  return (
    <div className="space-y-5">
      <DetailSection title="Feedback">
        <DetailField label="Title" value={detail.title ?? "Untitled feedback"} />
        <DetailField label="Received" value={formatDateTime(detail.receivedAt)} />
        <div className="min-w-0 sm:col-span-2">
          <CardLabel>Full message</CardLabel>
          <p className="whitespace-pre-wrap break-words text-sm font-medium leading-7">
            {detail.message}
          </p>
        </div>
      </DetailSection>
      <DetailSection title="Customer">
        <DetailField label="Name" value={detail.customerName ?? "Anonymous"} />
        <DetailField label="Email" value={detail.customerEmail ?? "Not supplied"} />
        <DetailField label="Phone" value={detail.customerPhone ?? "Not supplied"} />
      </DetailSection>
      <DetailSection title="Business and workflow">
        <DetailField label="Business" value={detail.business.name} />
        <DetailField label="Branch" value={detail.branch.name} />
        <DetailField label="Channel" value={formatRole(detail.channel)} />
        <DetailField label="Status" value={formatRole(detail.status)} />
        <DetailField label="Priority" value={formatRole(detail.priority)} />
        <DetailField label="Category" value={detail.category?.name ?? "Uncategorized"} />
        <DetailField
          label="Assignment"
          value={
            detail.assignedTo?.user
              ? `${detail.assignedTo.user.firstName} ${detail.assignedTo.user.lastName}`
              : "Unassigned"
          }
        />
      </DetailSection>
      <DetailSection title="AI and sentiment">
        <DetailField
          label="Sentiment"
          value={
            detail.aiAnalysis?.sentiment
              ? formatRole(detail.aiAnalysis.sentiment)
              : "Not analyzed"
          }
        />
        <DetailField
          label="AI status"
          value={
            detail.aiAnalysis?.status
              ? formatRole(detail.aiAnalysis.status)
              : "Not requested"
          }
        />
        <DetailField
          label="Summary"
          value={detail.aiAnalysis?.summary ?? "No AI summary available"}
        />
        <DetailField
          label="Explanation"
          value={
            detail.aiAnalysis?.sentimentExplanation ??
            "No sentiment explanation available"
          }
        />
      </DetailSection>
      <DetailSection title="Ingestion">
        <DetailField label="Source" value={formatRole(detail.channel)} />
        <DetailField
          label="Ingestion state"
          value={formatRole(detail.ingestion.status)}
        />
        <DetailStat
          label="Attachments"
          value={detail.attachments.length}
          detail="Metadata only"
        />
        <div className="space-y-2 sm:col-span-2">
          {detail.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-app-border p-3 text-xs"
            >
              <span className="min-w-0 break-words font-semibold">
                {attachment.filename}
              </span>
              <span className="text-app-text-muted">
                {attachment.mimeType} · {formatBytes(attachment.sizeBytes)}
              </span>
            </div>
          ))}
        </div>
      </DetailSection>
      <DetailSection title="Workflow activity">
        <div className="space-y-2 sm:col-span-2">
          {detail.activities.length ? (
            detail.activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="rounded-lg border border-app-border p-3">
                <p className="text-sm font-bold">{formatRole(activity.type)}</p>
                <p className="mt-1 text-xs text-app-text-muted">
                  {formatDateTime(activity.createdAt)}
                </p>
                {activity.note ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {activity.note}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-app-text-muted">No recorded workflow activity.</p>
          )}
        </div>
      </DetailSection>
      <DetailTechnicalSection>
        <DetailField
          label="Internal record ID"
          value={detail.id}
          mono
          copyValue={detail.id}
        />
        <DetailField
          label="External source ID"
          value={detail.externalId ?? "Not supplied"}
          mono
          copyValue={detail.externalId}
        />
        <DetailField
          label="Ingestion external ID"
          value={detail.ingestion.externalId ?? "Not supplied"}
          mono
          copyValue={detail.ingestion.externalId}
        />
        <DetailField
          label="Ingestion detail"
          value={humanizeErrorCode(detail.ingestion.errorCode)}
        />
        <div className="min-w-0 sm:col-span-2">
          <CardLabel>Source metadata</CardLabel>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-app-surface p-3 font-mono text-xs [overflow-wrap:anywhere]">
            {detail.sourceMetadata
              ? JSON.stringify(detail.sourceMetadata, null, 2)
              : "No source metadata"}
          </pre>
        </div>
      </DetailTechnicalSection>
    </div>
  );
}

function IntegrationModalContent({
  detail,
  onPause,
  onResume,
  onDisconnect,
  isPending
}: {
  detail: AdminIntegrationDetail;
  onPause: () => void;
  onResume: () => void;
  onDisconnect: () => void;
  isPending: boolean;
}): JSX.Element {
  const lastActivity =
    detail.lastInboundMessageAt ??
    detail.lastSuccessfulSyncAt ??
    detail.lastAttemptedSyncAt;
  return (
    <div className="space-y-5">
      <DetailSection title="Ownership">
        <DetailField label="Business" value={detail.business.name} />
        <DetailField label="Default branch" value={detail.defaultBranch.name} />
      </DetailSection>
      <DetailSection title="Connection">
        <DetailField label="Provider" value={formatRole(detail.provider)} />
        <DetailField label="Mode" value={formatRole(detail.mode)} />
        <DetailField label="Status" value={formatRole(detail.status)} />
        <DetailField label="Health" value={formatRole(detail.health)} />
        <DetailField
          label="Webhook state"
          value={
            detail.webhookStatus ? formatRole(detail.webhookStatus) : "Not applicable"
          }
        />
        <DetailField
          label="Authorization"
          value={detail.requiresReauthorization ? "Reauthorization required" : "Current"}
        />
      </DetailSection>
      <DetailSection title="Activity">
        <DetailStat label="Imported" value={detail.totalImported} />
        <DetailStat label="Recent runs" value={detail.synchronizationRuns.length} />
        <DetailField
          label="Last inbound"
          value={formatDateTime(detail.lastInboundMessageAt)}
        />
        <DetailField label="Last activity" value={formatDateTime(lastActivity)} />
        <div className="space-y-2 sm:col-span-2">
          {detail.synchronizationRuns.slice(0, 6).map((run) => (
            <div
              key={run.id}
              className="grid min-w-0 gap-2 rounded-lg border border-app-border p-3 text-xs sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
            >
              <Badge value={run.status} />
              <p className="min-w-0 break-words text-app-text-muted">
                {run.safeSummary ?? humanizeErrorCode(run.errorCode)}
              </p>
              <p className="font-semibold">{formatDateTime(run.completedAt)}</p>
            </div>
          ))}
        </div>
      </DetailSection>
      {detail.lastErrorCode ? (
        <DetailSection title="Issues">
          <p className="text-sm font-medium text-app-error sm:col-span-2">
            {humanizeErrorCode(detail.lastErrorCode)}
          </p>
        </DetailSection>
      ) : null}
      <DetailSection
        title="Administrative actions"
        description="Provider test, synchronization, retry, and Live authorization remain tenant-admin workflows."
      >
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {detail.status === "PAUSED" ? (
            <ActionButton onClick={onResume}>Resume</ActionButton>
          ) : detail.status !== "DISCONNECTED" ? (
            <ActionButton onClick={onPause}>Pause</ActionButton>
          ) : null}
        </div>
      </DetailSection>
      {detail.mode === "DEMO" && detail.status !== "DISCONNECTED" ? (
        <DangerZone>
          <ActionButton danger onClick={onDisconnect}>
            {isPending ? "Working…" : "Disconnect Demo connection"}
          </ActionButton>
        </DangerZone>
      ) : null}
      <DetailTechnicalSection>
        <DetailField label="Connection ID" value={detail.id} mono copyValue={detail.id} />
        <DetailField
          label="Error code"
          value={detail.lastErrorCode ?? "No error code"}
          mono
          copyValue={detail.lastErrorCode}
        />
        <DetailField
          label="Recent webhook deliveries"
          value={String(detail.webhookDeliveries.length)}
        />
        <DetailField
          label="Credential exposure"
          value="Credentials, tokens, secret hashes, and provider cursors are excluded."
        />
      </DetailTechnicalSection>
    </div>
  );
}

function userConfirmationCopy(
  action: "REVOKE_SESSIONS" | "SUSPEND" | "DISABLE" | null,
  email = "this user"
) {
  if (action === "REVOKE_SESSIONS")
    return {
      title: "Revoke all active sessions?",
      description: `${email} will need to sign in again on every device.`,
      label: "Revoke sessions"
    };
  if (action === "SUSPEND")
    return {
      title: "Suspend this account?",
      description: `${email} will lose access and all active sessions will be revoked.`,
      label: "Suspend account"
    };
  return {
    title: "Disable this account?",
    description: `${email} will be disabled and all active sessions will be revoked.`,
    label: "Disable account"
  };
}

function humanizeErrorCode(value: string | null | undefined): string {
  if (!value) return "No operational issue reported";
  const known: Record<string, string> = {
    DEMO_CONNECTION_TEST_FAILED: "Connection test failed"
  };
  return known[value] ?? formatRole(value.replace(/^(DEMO|LIVE)_/, ""));
}

function processingSectionLabel(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("ai")) return "AI Processing";
  if (normalized.includes("automation")) return "Automation Processing";
  if (normalized.includes("integration")) return "Integration Processing";
  return `${formatRole(value)} Processing`;
}

function formatBytes(value: number | null): string {
  if (value === null) return "Size unavailable";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-app-text-muted">
      {children}
    </p>
  );
}

function ActionButton({
  children,
  onClick,
  danger = false
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-md border px-3 py-2 text-xs font-bold transition ${
        danger
          ? "border-red-300 text-app-error hover:bg-red-50 dark:hover:bg-red-950/30"
          : "border-app-border text-app-text hover:border-app-primary/50 hover:bg-app-primary-soft"
      }`}
    >
      {children}
    </button>
  );
}
function SearchField({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold text-app-text-muted">Search</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold outline-none focus:border-app-primary"
      />
    </label>
  );
}
function SelectFilter({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: formatRole(option) } : option
  );
  return (
    <AppSelectField
      label={label}
      value={value}
      onValueChange={onChange}
      options={[{ value: "", label: "All" }, ...normalizedOptions]}
      ariaLabel={`${label} filter`}
      labelClassName="mb-1 text-xs font-bold text-app-text-muted"
      triggerClassName="mt-0 h-10"
    />
  );
}
function DateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <AppDatePickerField
      label={label}
      value={value}
      onValueChange={onChange}
      ariaLabel={`${label} date filter`}
      labelClassName="mb-1 text-xs font-bold text-app-text-muted"
      triggerClassName="mt-0 h-10"
    />
  );
}
function Badge({ value }: { value: string }) {
  const role = [
    "PLATFORM_ADMIN",
    "BUSINESS_OWNER",
    "OWNER",
    "ADMIN",
    "MANAGER",
    "STAFF",
    "CUSTOMER"
  ].includes(value);
  const danger = [
    "FAILED",
    "ERROR",
    "SUSPENDED",
    "DISABLED",
    "NEEDS_ATTENTION",
    "DISCONNECTED"
  ].includes(value);
  const warning = [
    "PAUSED",
    "PENDING",
    "IN_REVIEW",
    "MIXED",
    "COMPLETED_WITH_ERRORS"
  ].includes(value);
  const success = [
    "ACTIVE",
    "HEALTHY",
    "CONNECTED",
    "COMPLETED",
    "OPERATIONAL",
    "POSITIVE",
    "PROCESSED"
  ].includes(value);
  const tone = role
    ? "bg-app-primary-soft text-app-primary ring-app-primary/25"
    : danger
      ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900"
      : warning
        ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
        : success
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900"
          : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ring-1 ${tone}`}
    >
      {formatRole(value)}
    </span>
  );
}
function Pager({
  pagination,
  onPage
}: {
  pagination: Pagination;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
      <p className="text-app-text-muted">
        {pagination.total} records · page {pagination.page} of {pagination.totalPages}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
          className="min-h-10 rounded-md border border-app-border px-3 py-2 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPage(pagination.page + 1)}
          className="min-h-10 rounded-md border border-app-border px-3 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
function DataState<T>({
  query,
  emptyTitle,
  children
}: {
  query: { isLoading: boolean; error: unknown; data?: T };
  emptyTitle: string;
  children: React.ReactNode;
}) {
  if (query.isLoading)
    return (
      <div
        className="h-64 animate-pulse rounded-lg bg-app-surface-muted"
        aria-label="Loading"
      />
    );
  if (query.error)
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title={emptyTitle}
        description={normalizeApiError(query.error).message}
      />
    );
  return <>{children}</>;
}
function HealthCard({
  icon,
  title,
  status,
  detail
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  detail: string;
}) {
  const healthy = status === "OPERATIONAL";
  return (
    <WorkspacePanel>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${healthy ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
        >
          {icon}
        </span>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p
            className={`text-xs font-bold ${healthy ? "text-emerald-600" : "text-red-600"}`}
          >
            {status}
          </p>
        </div>
        {healthy ? (
          <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />
        ) : (
          <AlertTriangle className="ml-auto h-5 w-5 text-red-600" />
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-app-text-muted">{detail}</p>
    </WorkspacePanel>
  );
}
function withoutEmpty(filters: Record<string, string>) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
    : "Never";
}
function formatDateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value))
    : "Never";
}
