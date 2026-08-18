import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleOff,
  Database,
  History,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  PlugZap,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Table2,
  Unplug,
  XCircle,
  Zap
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog.js";
import {
  AppSelectField,
  type AppSelectOption
} from "../../components/ui/select-field.js";
import { fetchBranches, fetchBusiness, fetchMyBusinesses } from "./api/businessApi.js";
import {
  createIntegrationConnection,
  disconnectIntegrationConnection,
  fetchConnectionRuns,
  fetchConnectionWebhookActivity,
  fetchIntegrationConnections,
  fetchIntegrationProviders,
  fetchRunItems,
  pauseIntegrationConnection,
  reauthorizeIntegrationConnection,
  reconnectIntegrationConnection,
  resumeIntegrationConnection,
  retrySynchronizationItem,
  syncIntegrationConnection,
  testIntegrationConnection,
  updateIntegrationConnection,
  type EmailProviderType,
  type IntegrationAuthorizationResponse,
  type IntegrationConnection,
  type IntegrationConnectionStatus,
  type IntegrationWebhookDelivery,
  type IntegrationProvider,
  type IntegrationProviderCapability,
  type SynchronizationItem,
  type SynchronizationRun,
  type SynchronizationRunStatus
} from "./integrationApi.js";
import {
  EmptyState,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import type { BranchSummary } from "./types.js";
import {
  BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS,
  isBusinessOwnerVisibleCapability,
  isBusinessOwnerVisibleConnection
} from "./businessOwnerIntegrations.js";

const PROVIDERS: IntegrationProvider[] = [
  "GOOGLE_REVIEWS",
  "WHATSAPP",
  "EMAIL",
  "X",
  "FACEBOOK",
  "INSTAGRAM"
];

const CONNECTION_STATUSES: IntegrationConnectionStatus[] = [
  "CONNECTED",
  "PAUSED",
  "DISCONNECTED",
  "ERROR"
];

const INPUT_CLASS =
  "h-11 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold text-app-text outline-none transition placeholder:text-app-text-muted focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[rgb(10,25,51)]";

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  GOOGLE_REVIEWS: "Google Reviews",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  X: "X",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram"
};

const CONNECTION_STATUS_LABELS: Record<IntegrationConnectionStatus, string> = {
  CONNECTED: "Connected",
  PAUSED: "Paused",
  DISCONNECTED: "Disconnected",
  ERROR: "Needs review"
};

const RUN_STATUS_LABELS: Record<SynchronizationRunStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  COMPLETED_WITH_ERRORS: "Completed with errors",
  FAILED: "Failed",
  CANCELLED: "Cancelled"
};

const ITEM_STATUS_LABELS: Record<SynchronizationItem["status"], string> = {
  IMPORTED: "Imported",
  DUPLICATE: "Duplicate",
  SKIPPED: "Skipped",
  FAILED: "Failed"
};

const WEBHOOK_STATUS_LABELS: Record<IntegrationWebhookDelivery["status"], string> = {
  RECEIVED: "Received",
  IMPORTED: "Imported",
  DUPLICATE: "Duplicate",
  SKIPPED: "Skipped",
  FAILED: "Failed"
};

type ConnectionFormState = {
  mode: "create" | "edit";
  step: 1 | 2 | 3 | 4;
  connection: IntegrationConnection | null;
  provider: IntegrationProvider;
  integrationMode: "DEMO" | "LIVE";
  liveProviderType: EmailProviderType | null;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  providerAccountId: string;
  providerAccountLabel: string;
  providerAccountType: string;
  temporaryAccessToken: string;
  displayName: string;
  defaultBranchId: string;
  liveDisclosureAccepted: boolean;
};

type ConnectionAction =
  "pause" | "resume" | "disconnect" | "reconnect" | "reauthorize" | "test" | "sync";
type LiveEmailProviderType = Extract<EmailProviderType, "GMAIL" | "MICROSOFT">;

export function IntegrationsPage(): JSX.Element {
  const { businessId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<ConnectionFormState | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [expandedActionsId, setExpandedActionsId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const search = searchParams.get("search") ?? "";
  const status = validParam(searchParams.get("status"), CONNECTION_STATUSES) as
    IntegrationConnectionStatus | "";
  const provider = validParam(searchParams.get("provider"), PROVIDERS) as
    IntegrationProvider | "";
  const branchId = searchParams.get("branchId") ?? "";
  const liveEmailStatus = searchParams.get("liveEmailStatus");
  const liveEmailErrorCode = searchParams.get("errorCode");
  const liveEmailProviderParam = searchParams.get("liveEmailProvider");
  const liveEmailProviderName =
    liveEmailProviderParam === "outlook" ? "Outlook" : "Gmail";
  const oauthNotice =
    liveEmailStatus === "connected"
      ? `${liveEmailProviderName} Live Email connected. You can test the connection or run a manual Inbox sync.`
      : liveEmailStatus === "error"
        ? `${liveEmailProviderName} authorization needs attention${
            liveEmailErrorCode ? `: ${friendlyCode(liveEmailErrorCode)}` : "."
          }`
        : null;

  const mineQuery = useQuery({
    queryKey: ["businesses", "mine"],
    queryFn: () => fetchMyBusinesses({ pageSize: 100 })
  });
  const activeBusiness = mineQuery.data?.businesses.find(
    (business) => business.id === businessId
  );
  const businessQuery = useQuery({
    queryKey: ["businesses", businessId],
    queryFn: () => fetchBusiness(businessId ?? ""),
    enabled: Boolean(businessId && activeBusiness)
  });
  const branchesQuery = useQuery({
    queryKey: ["businesses", businessId, "branches", "integration-options"],
    queryFn: () => fetchBranches(businessId ?? "", { status: "ACTIVE" }),
    enabled: Boolean(businessId && activeBusiness)
  });
  const providersQuery = useQuery({
    queryKey: ["integration-providers", businessId],
    queryFn: () => fetchIntegrationProviders(businessId ?? ""),
    enabled: Boolean(businessId && activeBusiness)
  });
  const connectionsQuery = useQuery({
    queryKey: ["integrations", businessId, search, status, provider, branchId],
    queryFn: () =>
      fetchIntegrationConnections(businessId ?? "", {
        search: search || undefined,
        status: status || undefined,
        provider: provider || undefined,
        branchId: branchId || undefined,
        pageSize: 50
      }),
    enabled: Boolean(businessId && activeBusiness),
    refetchInterval: (query) =>
      query.state.data?.recentRuns.some(isRunInProgress) ? 3000 : false
  });

  const allConnections = useMemo(() => {
    const byProviderMode = new Map<string, IntegrationConnection>();
    for (const capability of providersQuery.data ?? []) {
      if (capability.connection) {
        byProviderMode.set(
          connectionListKey(capability.connection),
          capability.connection
        );
      }
    }
    for (const connection of connectionsQuery.data?.items ?? []) {
      byProviderMode.set(connectionListKey(connection), connection);
    }
    return [...byProviderMode.values()].filter(isBusinessOwnerVisibleConnection);
  }, [connectionsQuery.data?.items, providersQuery.data]);

  const selectedConnection =
    allConnections.find((connection) => connection.id === selectedConnectionId) ??
    allConnections[0] ??
    null;

  const runsQuery = useQuery({
    queryKey: ["integration-runs", businessId, selectedConnection?.id],
    queryFn: () => fetchConnectionRuns(businessId ?? "", selectedConnection?.id ?? ""),
    enabled: Boolean(businessId && selectedConnection),
    refetchInterval: (query) =>
      query.state.data?.items.some(isRunInProgress) ? 3000 : false
  });
  const webhookActivityQuery = useQuery({
    queryKey: ["integration-webhook-activity", businessId, selectedConnection?.id],
    queryFn: () =>
      fetchConnectionWebhookActivity(businessId ?? "", selectedConnection?.id ?? "", {
        pageSize: 20
      }),
    enabled: Boolean(
      businessId &&
      selectedConnectionId &&
      selectedConnection &&
      isWebhookDrivenLiveProvider(selectedConnection.provider) &&
      selectedConnection.liveMode
    )
  });
  const showingWebhookActivity = Boolean(
    selectedConnectionId &&
    selectedConnection &&
    isWebhookDrivenLiveProvider(selectedConnection.provider) &&
    selectedConnection.liveMode
  );

  const visibleConnectionIds = new Set(allConnections.map((connection) => connection.id));
  const runRows = (
    selectedConnectionId
      ? (runsQuery.data?.items ?? [])
      : (connectionsQuery.data?.recentRuns ?? [])
  ).filter((run) => run.mode === "LIVE" && visibleConnectionIds.has(run.connectionId));
  const selectedRun =
    runRows.find((run) => run.id === selectedRunId) ??
    connectionsQuery.data?.recentRuns.find((run) => run.id === selectedRunId) ??
    runsQuery.data?.items.find((run) => run.id === selectedRunId) ??
    null;
  const itemsQuery = useQuery({
    queryKey: ["integration-run-items", businessId, selectedRunId],
    queryFn: () => fetchRunItems(businessId ?? "", selectedRunId ?? "", { pageSize: 50 }),
    enabled: Boolean(businessId && selectedRunId)
  });

  const business = businessQuery.data;
  const canManage =
    business?.membership.role === "OWNER" || business?.membership.role === "ADMIN";
  const branches = useMemo(
    () => branchesQuery.data?.branches ?? [],
    [branchesQuery.data?.branches]
  );
  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: `${branch.name} (${branch.code})`
      })),
    [branches]
  );
  const providerCapabilities = useMemo(
    () => (providersQuery.data ?? []).filter(isBusinessOwnerVisibleCapability),
    [providersQuery.data]
  );
  const providerCards = useMemo(
    () =>
      filterProviderCapabilities({
        providers: providerCapabilities,
        connections: allConnections,
        search,
        provider,
        status,
        branchId
      }),
    [allConnections, branchId, provider, providerCapabilities, search, status]
  );

  const invalidateIntegrations = () => {
    void queryClient.invalidateQueries({
      queryKey: ["integration-providers", businessId]
    });
    void queryClient.invalidateQueries({ queryKey: ["integrations", businessId] });
    void queryClient.invalidateQueries({ queryKey: ["integration-runs", businessId] });
    void queryClient.invalidateQueries({
      queryKey: ["integration-run-items", businessId]
    });
    void queryClient.invalidateQueries({
      queryKey: ["integration-webhook-activity", businessId]
    });
    void queryClient.invalidateQueries({ queryKey: ["feedback", businessId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formState) throw new Error("Connection form is not open.");
      if (formState.mode === "edit" && formState.connection) {
        return updateIntegrationConnection(businessId ?? "", formState.connection.id, {
          displayName: formState.displayName.trim(),
          defaultBranchId: formState.defaultBranchId,
          phoneNumberId: formState.phoneNumberId.trim() || undefined,
          wabaId: formState.wabaId.trim() || undefined,
          displayPhoneNumber: formState.displayPhoneNumber.trim() || undefined,
          providerAccountId: formState.providerAccountId.trim() || undefined,
          providerAccountLabel: formState.providerAccountLabel.trim() || undefined,
          providerAccountType: formState.providerAccountType.trim() || undefined,
          temporaryAccessToken: formState.temporaryAccessToken.trim() || undefined
        });
      }
      return createIntegrationConnection(businessId ?? "", {
        provider: formState.provider,
        displayName: formState.displayName.trim(),
        defaultBranchId: formState.defaultBranchId,
        demoScenario: "STANDARD_MIXED",
        mode: formState.integrationMode,
        liveProviderType: formState.liveProviderType ?? undefined,
        phoneNumberId: formState.phoneNumberId.trim() || undefined,
        wabaId: formState.wabaId.trim() || undefined,
        displayPhoneNumber: formState.displayPhoneNumber.trim() || undefined,
        providerAccountId: formState.providerAccountId.trim() || undefined,
        providerAccountLabel: formState.providerAccountLabel.trim() || undefined,
        providerAccountType: formState.providerAccountType.trim() || undefined,
        temporaryAccessToken: formState.temporaryAccessToken.trim() || undefined
      });
    },
    onSuccess(result) {
      const connection = isAuthorizationResponse(result) ? result.connection : result;
      setSelectedConnectionId(connection.id);
      setFormState(null);
      if (isAuthorizationResponse(result)) {
        setNotice(
          `Continue to ${emailProviderAuthName(connection.liveProviderType)} to authorize Inbox access.`
        );
        window.location.assign(result.authorizationUrl);
        return;
      }
      setNotice("Integration connection saved.");
      invalidateIntegrations();
    }
  });
  const lifecycleMutation = useMutation({
    mutationFn: async ({
      connection,
      action
    }: {
      connection: IntegrationConnection;
      action: ConnectionAction;
    }) => {
      if (action === "pause") {
        return pauseIntegrationConnection(businessId ?? "", connection.id);
      }
      if (action === "resume") {
        return resumeIntegrationConnection(businessId ?? "", connection.id);
      }
      if (action === "disconnect") {
        return disconnectIntegrationConnection(businessId ?? "", connection.id);
      }
      if (action === "reconnect") {
        const result = await reconnectIntegrationConnection(
          businessId ?? "",
          connection.id
        );
        if (isAuthorizationResponse(result)) return result;
        return result;
      }
      if (action === "reauthorize") {
        return reauthorizeIntegrationConnection(businessId ?? "", connection.id);
      }
      if (action === "test") {
        const health = await testIntegrationConnection(businessId ?? "", connection.id);
        return { ...connection, lastErrorCode: health.ok ? null : health.code };
      }
      const run = await syncIntegrationConnection(businessId ?? "", connection.id);
      setSelectedRunId(run.id);
      return connection;
    },
    onSuccess(result, variables) {
      setSelectedConnectionId(variables.connection.id);
      setExpandedActionsId(null);
      if (isAuthorizationResponse(result)) {
        setNotice(
          `Continue to ${emailProviderAuthName(variables.connection.liveProviderType)} to reauthorize Inbox access.`
        );
        window.location.assign(result.authorizationUrl);
        return;
      }
      setNotice(actionNotice(variables.action));
      invalidateIntegrations();
    }
  });
  const retryMutation = useMutation({
    mutationFn: (item: SynchronizationItem) =>
      retrySynchronizationItem(businessId ?? "", item.runId, item.id),
    onSuccess(run) {
      setSelectedRunId(run.id);
      setNotice("Synchronization item retry completed.");
      invalidateIntegrations();
    }
  });

  const setFilter = (
    key: "search" | "status" | "provider" | "branchId",
    value: string
  ) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) next.set(key, trimmed);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  if (!businessId || (mineQuery.data && !activeBusiness)) {
    return <Navigate to="/business" replace />;
  }

  if (mineQuery.isLoading || businessQuery.isLoading) {
    return <StandaloneState title="Loading integrations" />;
  }

  if (!activeBusiness || !business) {
    return (
      <StandaloneState
        title="Integrations unavailable"
        description={
          mineQuery.error || businessQuery.error
            ? normalizeApiError(mineQuery.error ?? businessQuery.error).message
            : "This workspace could not be loaded."
        }
      />
    );
  }

  return (
    <WorkspaceShell
      title="Integrations"
      subtitle="Connect external channels and import feedback into your unified inbox."
      businesses={mineQuery.data?.businesses ?? []}
      activeBusiness={activeBusiness}
      actions={
        canManage ? (
          <>
            <WorkspaceButton
              onClick={() =>
                setFormState(createBlankForm(providerCapabilities, branches))
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Connect Integration
            </WorkspaceButton>
          </>
        ) : null
      }
    >
      {!canManage ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
          title="Owner or admin access required"
          description="Integration management is limited to owner and admin memberships."
        />
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-950/15 sm:p-8">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">
                  Live customer channels
                </p>
                <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                  Bring WhatsApp conversations and Gmail messages into one feedback
                  workflow.
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-100">
                  Every approved connection routes inbound feedback to a selected branch
                  and keeps provider credentials securely on the server.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                <div>
                  <p className="text-xs font-black">Production connections</p>
                  <p className="text-xs font-semibold text-indigo-200">
                    Live providers only
                  </p>
                </div>
              </div>
            </div>
          </section>
          {oauthNotice ? <SuccessAlert message={oauthNotice} /> : null}
          {notice ? <SuccessAlert message={notice} /> : null}
          {connectionsQuery.error ||
          providersQuery.error ||
          lifecycleMutation.error ||
          saveMutation.error ||
          retryMutation.error ? (
            <ErrorState
              message={
                normalizeApiError(
                  connectionsQuery.error ??
                    providersQuery.error ??
                    lifecycleMutation.error ??
                    saveMutation.error ??
                    retryMutation.error
                ).message
              }
            />
          ) : null}

          <IntegrationFilters
            search={search}
            provider={provider}
            status={status}
            branchId={branchId}
            branchOptions={branchOptions}
            onFilterChange={setFilter}
            onClear={clearFilters}
            hasActiveFilters={Boolean(search || provider || status || branchId)}
          />

          <div className="min-w-0 space-y-5">
            <ProviderConnectionGrid
              providers={providerCards}
              connections={allConnections}
              branches={branches}
              isLoading={providersQuery.isLoading || connectionsQuery.isLoading}
              expandedActionsId={expandedActionsId}
              onToggleActions={(id) =>
                setExpandedActionsId((current) => (current === id ? null : id))
              }
              onConnect={setFormState}
              onEdit={(connection) => setFormState(editForm(connection))}
              onAction={(connection, action) =>
                lifecycleMutation.mutate({ connection, action })
              }
              onHistory={(connection) => {
                setSelectedConnectionId(connection.id);
                setNotice(`Showing ${providerLabel(connection.provider)} history.`);
              }}
              isMutating={lifecycleMutation.isPending}
            />
            {showingWebhookActivity ? (
              <WebhookActivityPanel
                items={webhookActivityQuery.data?.items ?? []}
                isLoading={webhookActivityQuery.isLoading}
                selectedConnection={selectedConnection}
                onShowAll={() => setSelectedConnectionId(null)}
              />
            ) : (
              <RecentSyncRuns
                runs={runRows}
                isLoading={
                  selectedConnectionId ? runsQuery.isLoading : connectionsQuery.isLoading
                }
                selectedConnection={selectedConnectionId ? selectedConnection : null}
                onShowAll={() => setSelectedConnectionId(null)}
                onView={(run) => setSelectedRunId(run.id)}
              />
            )}
          </div>
        </div>
      )}
      <ConnectIntegrationDialog
        state={formState}
        branches={branches}
        providers={providerCapabilities}
        isSaving={saveMutation.isPending}
        onClose={() => setFormState(null)}
        onChange={setFormState}
        onSave={() => saveMutation.mutate()}
      />
      <RunDetailsDialog
        run={selectedRun}
        items={itemsQuery.data?.items ?? []}
        isLoadingItems={itemsQuery.isLoading}
        isMutating={retryMutation.isPending}
        onClose={() => setSelectedRunId(null)}
        onRetry={(item) => retryMutation.mutate(item)}
      />
    </WorkspaceShell>
  );
}

function IntegrationFilters({
  search,
  provider,
  status,
  branchId,
  branchOptions,
  onFilterChange,
  onClear,
  hasActiveFilters
}: {
  search: string;
  provider: string;
  status: string;
  branchId: string;
  branchOptions: AppSelectOption[];
  onFilterChange: (
    key: "search" | "status" | "provider" | "branchId",
    value: string
  ) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}): JSX.Element {
  return (
    <WorkspacePanel className="p-4 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search integrations</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
          <input
            value={search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            className="h-11 w-full rounded-md border border-app-border bg-app-surface pl-9 pr-3 text-sm font-semibold text-app-text outline-none transition placeholder:text-app-text-muted focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 dark:bg-[rgb(10,25,51)]"
            placeholder="Search integrations"
          />
        </label>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:w-[43rem]">
          <FilterSelect
            value={provider}
            onChange={(value) => onFilterChange("provider", value)}
            label="Provider"
            options={[
              { value: "", label: "All providers" },
              ...BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS.map((item) => ({
                value: item.provider,
                label: item.label
              }))
            ]}
          />
          <FilterSelect
            value={status}
            onChange={(value) => onFilterChange("status", value)}
            label="Status"
            options={[
              { value: "", label: "All statuses" },
              ...CONNECTION_STATUSES.map((item) => ({
                value: item,
                label: connectionStatusLabel(item)
              }))
            ]}
          />
          <FilterSelect
            value={branchId}
            onChange={(value) => onFilterChange("branchId", value)}
            label="Branch"
            options={[{ value: "", label: "All branches" }, ...branchOptions]}
          />
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-focus/30 dark:bg-[rgb(10,25,51)]"
          >
            Clear
          </button>
        ) : null}
      </div>
    </WorkspacePanel>
  );
}

function ProviderConnectionGrid({
  providers,
  connections,
  branches,
  isLoading,
  expandedActionsId,
  onToggleActions,
  onConnect,
  onEdit,
  onAction,
  onHistory,
  isMutating
}: {
  providers: IntegrationProviderCapability[];
  connections: IntegrationConnection[];
  branches: BranchSummary[];
  isLoading: boolean;
  expandedActionsId: string | null;
  onToggleActions: (id: string) => void;
  onConnect: (state: ConnectionFormState) => void;
  onEdit: (connection: IntegrationConnection) => void;
  onAction: (connection: IntegrationConnection, action: ConnectionAction) => void;
  onHistory: (connection: IntegrationConnection) => void;
  isMutating: boolean;
}): JSX.Element {
  return (
    <section aria-labelledby="integrations-grid-heading">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="integrations-grid-heading" className="text-lg font-black">
            Your Integrations
          </h2>
          <p className="mt-1 text-sm font-medium text-app-text-muted">
            Approved Live providers, branch routing, and current connection health.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-app-border bg-app-surface p-1 text-xs font-black text-app-text-muted dark:bg-[rgb(10,25,51)]">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-app-primary-soft px-3 text-app-primary">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Grid View
          </span>
          <span className="hidden min-h-9 items-center gap-2 px-3 sm:inline-flex">
            <Table2 className="h-4 w-4" aria-hidden="true" />
            Table View
          </span>
        </div>
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS.map((item) => (
            <SkeletonCard key={item.label} />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={<CircleOff className="h-6 w-6" aria-hidden="true" />}
          title="No integrations match your filters"
          description="Adjust search, provider, status, or branch filters to see available Live connections."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => {
            const isLiveEmail = provider.provider === "EMAIL" && provider.mode === "LIVE";
            if (isLiveEmail) {
              return (
                <EmailLiveConnectionCard
                  key={providerModeKey(provider.provider, provider.mode)}
                  provider={provider}
                  connections={connections.filter(
                    (item) => item.provider === "EMAIL" && item.mode === "LIVE"
                  )}
                  branches={branches}
                  expandedActionsId={expandedActionsId}
                  onToggleActions={onToggleActions}
                  onConnect={onConnect}
                  onEdit={onEdit}
                  onAction={onAction}
                  onHistory={onHistory}
                  isMutating={isMutating}
                />
              );
            }
            const connection =
              connections.find(
                (item) =>
                  item.provider === provider.provider && item.mode === provider.mode
              ) ?? provider.connection;
            return (
              <ProviderConnectionCard
                key={providerModeKey(provider.provider, provider.mode)}
                provider={provider}
                connection={connection}
                branches={branches}
                actionsOpen={
                  expandedActionsId ===
                  (connection?.id ?? providerModeKey(provider.provider, provider.mode))
                }
                onToggleActions={() =>
                  onToggleActions(
                    connection?.id ?? providerModeKey(provider.provider, provider.mode)
                  )
                }
                onConnect={onConnect}
                onEdit={onEdit}
                onAction={onAction}
                onHistory={onHistory}
                isMutating={isMutating}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmailLiveConnectionCard({
  provider,
  connections,
  branches,
  expandedActionsId,
  onToggleActions,
  onConnect,
  onEdit,
  onAction,
  onHistory,
  isMutating
}: {
  provider: IntegrationProviderCapability;
  connections: IntegrationConnection[];
  branches: BranchSummary[];
  expandedActionsId: string | null;
  onToggleActions: (id: string) => void;
  onConnect: (state: ConnectionFormState) => void;
  onEdit: (connection: IntegrationConnection) => void;
  onAction: (connection: IntegrationConnection, action: ConnectionAction) => void;
  onHistory: (connection: IntegrationConnection) => void;
  isMutating: boolean;
}): JSX.Element {
  const providerTypes: LiveEmailProviderType[] = ["GMAIL"];
  const totalImported = connections.reduce(
    (sum, connection) => sum + connection.totalImported,
    0
  );

  return (
    <article className="flex min-h-[16.5rem] flex-col rounded-lg border border-app-border bg-app-surface p-4 shadow-sm transition hover:border-app-primary/40 hover:shadow-panel dark:bg-[rgb(10,25,51)]">
      <div className="flex min-w-0 items-start gap-3">
        <ProviderIcon provider="EMAIL" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-black">Gmail</h3>
            <ModeBadge mode="LIVE" />
            <StatusPill
              status={
                connections.some((connection) => connection.status === "CONNECTED")
                  ? "CONNECTED"
                  : connections.some((connection) => connection.status === "ERROR")
                    ? "ERROR"
                    : "DISCONNECTED"
              }
            />
          </div>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-app-text-muted">
            {provider.description}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {providerTypes.map((emailProviderType) => {
          const connection =
            connections.find((item) => item.liveProviderType === emailProviderType) ??
            null;
          const latestRun = connection?.latestRun ?? null;
          const running = latestRun ? isRunInProgress(latestRun) : false;
          const status = connection?.status ?? "DISCONNECTED";
          const primary = getPrimaryAction(status, Boolean(connection), running);
          const rowId =
            connection?.id ?? providerModeKey("EMAIL", "LIVE", emailProviderType);

          return (
            <div
              key={emailProviderType}
              className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3 dark:bg-white/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black">
                      {emailProviderTypeLabel(emailProviderType)}
                    </span>
                    <StatusPill status={running ? "RUNNING" : status} />
                  </div>
                  <dl className="mt-2 grid gap-1 text-xs font-semibold text-app-text-muted">
                    <MetaRow
                      label="Connection"
                      value={connection?.displayName ?? "Not connected"}
                      muted={!connection}
                    />
                    <MetaRow
                      label="Mailbox"
                      value={connection?.providerAccountLabel ?? "Authorization required"}
                      muted={!connection?.providerAccountLabel}
                    />
                    <MetaRow
                      label="Last sync"
                      value={
                        connection?.lastSuccessfulSyncAt
                          ? formatDate(connection.lastSuccessfulSyncAt)
                          : "-"
                      }
                      muted={!connection?.lastSuccessfulSyncAt}
                    />
                  </dl>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleActions(rowId)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/30 dark:bg-white/5"
                  aria-label={`${emailProviderTypeLabel(emailProviderType)} secondary actions`}
                  aria-expanded={expandedActionsId === rowId}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {running && latestRun ? (
                <SyncProgressPanel run={latestRun} compact />
              ) : null}
              {status === "ERROR" && connection?.lastErrorCode ? (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
                  {friendlyCode(connection.lastErrorCode)}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SmallButton
                  tone={primary.tone}
                  onClick={() => {
                    if (!connection) {
                      onConnect(createForm(provider, branches, emailProviderType));
                      return;
                    }
                    onAction(connection, primary.action);
                  }}
                  disabled={
                    isMutating ||
                    Boolean(primary.disabled) ||
                    !provider.liveAvailable ||
                    (!connection && branches.length === 0) ||
                    (connection?.status === "CONNECTED" &&
                      primary.action === "sync" &&
                      running)
                  }
                >
                  {primary.icon}
                  {!connection
                    ? `Connect ${emailProviderTypeLabel(emailProviderType)}`
                    : primary.label}
                </SmallButton>
                {connection ? (
                  <SmallButton tone="secondary" onClick={() => onHistory(connection)}>
                    <History className="h-4 w-4" aria-hidden="true" />
                    View History
                  </SmallButton>
                ) : null}
              </div>

              {expandedActionsId === rowId ? (
                <div className="mt-3 grid gap-2 rounded-lg border border-app-border bg-app-surface p-3 text-sm dark:bg-[rgb(10,25,51)]">
                  {connection ? (
                    <>
                      <SmallButton tone="secondary" onClick={() => onEdit(connection)}>
                        <Settings2 className="h-4 w-4" aria-hidden="true" />
                        Edit connection
                      </SmallButton>
                      <SmallButton
                        tone="secondary"
                        onClick={() => onAction(connection, "test")}
                        disabled={isMutating}
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        Test connection
                      </SmallButton>
                      <SmallButton
                        tone="secondary"
                        onClick={() => onAction(connection, "reauthorize")}
                        disabled={isMutating}
                      >
                        <PlugZap className="h-4 w-4" aria-hidden="true" />
                        Reauthorize {emailProviderTypeLabel(emailProviderType)}
                      </SmallButton>
                      <SmallButton
                        tone="secondary"
                        onClick={() =>
                          onAction(
                            connection,
                            connection.status === "PAUSED" ? "resume" : "pause"
                          )
                        }
                        disabled={isMutating || connection.status === "DISCONNECTED"}
                      >
                        {connection.status === "PAUSED" ? (
                          <Play className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Pause className="h-4 w-4" aria-hidden="true" />
                        )}
                        {connection.status === "PAUSED" ? "Resume" : "Pause"}
                      </SmallButton>
                      <SmallButton
                        tone="secondary"
                        onClick={() => onAction(connection, "disconnect")}
                        disabled={isMutating || connection.status === "DISCONNECTED"}
                      >
                        <Unplug className="h-4 w-4" aria-hidden="true" />
                        Disconnect
                      </SmallButton>
                    </>
                  ) : (
                    <p className="text-xs font-semibold leading-5 text-app-text-muted">
                      Connect {emailProviderTypeLabel(emailProviderType)} with OAuth to
                      import Inbox messages manually.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-app-border pt-4">
        <MetricTile label="Imported" value={totalImported} />
      </div>
    </article>
  );
}

function ProviderConnectionCard({
  provider,
  connection,
  branches,
  actionsOpen,
  onToggleActions,
  onConnect,
  onEdit,
  onAction,
  onHistory,
  isMutating
}: {
  provider: IntegrationProviderCapability;
  connection: IntegrationConnection | null;
  branches: BranchSummary[];
  actionsOpen: boolean;
  onToggleActions: () => void;
  onConnect: (state: ConnectionFormState) => void;
  onEdit: (connection: IntegrationConnection) => void;
  onAction: (connection: IntegrationConnection, action: ConnectionAction) => void;
  onHistory: (connection: IntegrationConnection) => void;
  isMutating: boolean;
}): JSX.Element {
  const status = connection?.status ?? "DISCONNECTED";
  const latestRun = connection?.latestRun ?? null;
  const running = latestRun ? isRunInProgress(latestRun) : false;
  const branchName = connection?.defaultBranch?.name ?? null;
  const isLiveWebhook =
    isWebhookDrivenLiveProvider(provider.provider) && provider.mode === "LIVE";
  const isLiveWhatsApp = provider.provider === "WHATSAPP" && provider.mode === "LIVE";
  const isLiveSocial =
    (provider.provider === "FACEBOOK" || provider.provider === "INSTAGRAM") &&
    provider.mode === "LIVE";
  const primary = getPrimaryAction(status, Boolean(connection), running, {
    liveWebhookDriven: isLiveWebhook
  });
  const connectLabel = `Connect ${liveProviderLabel(provider.provider)}`;
  const lastResult = latestRun
    ? (latestRun.safeSummary ??
      `${latestRun.itemsImported} imported, ${latestRun.itemsDuplicated} duplicates`)
    : connection?.lastInboundMessageAt
      ? formatDate(connection.lastInboundMessageAt)
      : connection?.lastErrorCode
        ? friendlyCode(connection.lastErrorCode)
        : null;

  return (
    <article className="flex min-h-[16.5rem] flex-col rounded-lg border border-app-border bg-app-surface p-4 shadow-sm transition hover:border-app-primary/40 hover:shadow-panel dark:bg-[rgb(10,25,51)]">
      <div className="flex min-w-0 items-start gap-3">
        <ProviderIcon provider={provider.provider} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-black">
              {providerLabel(provider.provider)}
            </h3>
            <ModeBadge mode={provider.mode} />
            <StatusPill status={running ? "RUNNING" : status} />
          </div>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-app-text-muted">
            {provider.description}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <MetaRow
          label="Connection"
          value={connection?.displayName ?? "Not connected"}
          muted={!connection}
        />
        <MetaRow label="Branch" value={branchName ?? "-"} muted={!branchName} />
        {provider.mode === "LIVE" && provider.provider === "EMAIL" ? (
          <MetaRow
            label="Gmail"
            value={connection?.providerAccountLabel ?? "Authorization required"}
            muted={!connection?.providerAccountLabel}
          />
        ) : null}
        {isLiveWhatsApp ? (
          <>
            <MetaRow
              label="Number"
              value={
                connection?.whatsappDisplayPhoneNumber ??
                connection?.providerAccountLabel ??
                "Webhook setup required"
              }
              muted={!connection}
            />
            <MetaRow
              label="Webhook"
              value={connection?.webhookStatus ?? "Pending"}
              muted={!connection?.webhookStatus}
            />
          </>
        ) : null}
        {isLiveSocial ? (
          <>
            <MetaRow
              label={provider.provider === "FACEBOOK" ? "Page" : "Account"}
              value={connection?.providerAccountLabel ?? "Webhook setup required"}
              muted={!connection?.providerAccountLabel}
            />
            <MetaRow
              label="Webhook"
              value={connection?.webhookStatus ?? "Pending"}
              muted={!connection?.webhookStatus}
            />
          </>
        ) : null}
        <MetaRow
          label={isLiveWebhook ? "Last inbound" : "Last sync"}
          value={
            isLiveWebhook
              ? connection?.lastInboundMessageAt
                ? formatDate(connection.lastInboundMessageAt)
                : "-"
              : connection?.lastSuccessfulSyncAt
                ? formatDate(connection.lastSuccessfulSyncAt)
                : "-"
          }
          muted={
            isLiveWebhook
              ? !connection?.lastInboundMessageAt
              : !connection?.lastSuccessfulSyncAt
          }
        />
      </dl>

      {running && latestRun ? <SyncProgressPanel run={latestRun} compact /> : null}

      {status === "ERROR" && connection?.lastErrorCode ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
          {friendlyCode(connection.lastErrorCode)}
        </p>
      ) : null}

      <div className="mt-auto border-t border-app-border pt-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricTile label="Imported" value={connection?.totalImported ?? 0} />
          <MetricTile label="Last result" value={lastResult ?? "-"} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SmallButton
            tone={primary.tone}
            onClick={() => {
              if (!connection) {
                onConnect(createForm(provider, branches));
                return;
              }
              onAction(connection, primary.action);
            }}
            disabled={
              isMutating ||
              Boolean(primary.disabled) ||
              (provider.mode === "LIVE" && !provider.liveAvailable) ||
              (!connection && branches.length === 0) ||
              (connection?.status === "CONNECTED" && primary.action === "sync" && running)
            }
          >
            {primary.icon}
            {!connection ? connectLabel : primary.label}
          </SmallButton>
          {connection ? (
            <SmallButton tone="secondary" onClick={() => onHistory(connection)}>
              <History className="h-4 w-4" aria-hidden="true" />
              {isLiveWebhook ? "View Activity" : "View History"}
            </SmallButton>
          ) : null}
          <button
            type="button"
            onClick={onToggleActions}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/30 dark:bg-white/5"
            aria-label={`${providerLabel(provider.provider)} secondary actions`}
            aria-expanded={actionsOpen}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {actionsOpen ? (
          <div className="mt-3 grid gap-2 rounded-lg border border-app-border bg-app-surface-muted/60 p-3 text-sm dark:bg-white/5">
            {connection ? (
              <>
                <SmallButton tone="secondary" onClick={() => onEdit(connection)}>
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  Edit connection
                </SmallButton>
                <SmallButton
                  tone="secondary"
                  onClick={() => onAction(connection, "test")}
                  disabled={isMutating}
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Test connection
                </SmallButton>
                {connection.status === "PAUSED" ? (
                  <SmallButton
                    tone="secondary"
                    onClick={() => onAction(connection, "resume")}
                    disabled={isMutating}
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Resume
                  </SmallButton>
                ) : connection.status === "DISCONNECTED" ? (
                  <SmallButton
                    tone="secondary"
                    onClick={() => onAction(connection, "reconnect")}
                    disabled={isMutating}
                  >
                    <PlugZap className="h-4 w-4" aria-hidden="true" />
                    Reconnect
                  </SmallButton>
                ) : (
                  <SmallButton
                    tone="secondary"
                    onClick={() => onAction(connection, "pause")}
                    disabled={isMutating}
                  >
                    <Pause className="h-4 w-4" aria-hidden="true" />
                    Pause
                  </SmallButton>
                )}
                {connection.liveMode && connection.requiresReauthorization ? (
                  <SmallButton
                    tone="secondary"
                    onClick={() => onAction(connection, "reauthorize")}
                    disabled={isMutating}
                  >
                    <PlugZap className="h-4 w-4" aria-hidden="true" />
                    Reauthorize Gmail
                  </SmallButton>
                ) : null}
                {isLiveWebhook ? (
                  <p className="rounded-md bg-app-surface px-3 py-2 text-xs font-semibold leading-5 text-app-text-muted ring-1 ring-app-border dark:bg-white/5">
                    Live {providerLabel(provider.provider)} receives inbound events from
                    signed Meta webhooks. Sync Now is unavailable for this connection.
                  </p>
                ) : null}
                <SmallButton
                  tone="secondary"
                  onClick={() => onAction(connection, "disconnect")}
                  disabled={isMutating || connection.status === "DISCONNECTED"}
                >
                  <Unplug className="h-4 w-4" aria-hidden="true" />
                  Disconnect
                </SmallButton>
              </>
            ) : (
              <p className="text-xs font-semibold leading-5 text-app-text-muted">
                {provider.provider === "WHATSAPP"
                  ? "Connect Meta WhatsApp Cloud API to import signed inbound text webhooks."
                  : isLiveSocial
                    ? `Connect Live ${providerLabel(provider.provider)} to import signed Meta comment webhooks.`
                    : "Connect Gmail with OAuth to import Inbox messages manually."}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RecentSyncRuns({
  runs,
  isLoading,
  selectedConnection,
  onShowAll,
  onView
}: {
  runs: SynchronizationRun[];
  isLoading: boolean;
  selectedConnection: IntegrationConnection | null;
  onShowAll: () => void;
  onView: (run: SynchronizationRun) => void;
}): JSX.Element {
  return (
    <WorkspacePanel>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black">Recent Synchronization Runs</h2>
          <p className="mt-1 text-sm font-semibold text-app-text-muted">
            {selectedConnection
              ? `Showing ${selectedConnection.displayName}`
              : "Latest Live synchronization history"}
          </p>
        </div>
        {selectedConnection ? (
          <button
            type="button"
            onClick={onShowAll}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-app-border bg-app-surface px-3 text-xs font-black text-app-text transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-focus/30 dark:bg-white/5"
          >
            Show all runs
          </button>
        ) : null}
      </div>
      {isLoading ? <SkeletonTable /> : null}
      {!isLoading && runs.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" aria-hidden="true" />}
          title="No synchronization runs yet"
          description="Runs appear here after a connected Live provider is synchronized."
        />
      ) : null}
      {!isLoading && runs.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-app-border lg:block">
            <table className="min-w-full divide-y divide-app-border text-left text-sm">
              <thead className="bg-app-surface-muted/70 text-xs font-black text-app-text-muted">
                <tr>
                  <th className="px-3 py-3">Provider</th>
                  <th className="px-3 py-3">Connection</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Started</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3 text-right">Fetched</th>
                  <th className="px-3 py-3 text-right">Imported</th>
                  <th className="px-3 py-3 text-right">Duplicates</th>
                  <th className="px-3 py-3 text-right">Failed</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border bg-app-surface dark:bg-[rgb(10,25,51)]">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <ProviderIcon provider={run.provider} size="sm" />
                        <span className="min-w-0 truncate font-semibold">
                          {providerLabel(run.provider)}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[13rem] px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate font-semibold">
                          {run.connection?.displayName ?? "Live connection"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-app-text-muted">
                      {formatDate(run.startedAt ?? run.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-app-text-muted">
                      {formatDuration(run.durationMs)}
                    </td>
                    <NumberCell value={run.itemsFetched} />
                    <NumberCell value={run.itemsImported} tone="success" />
                    <NumberCell value={run.itemsDuplicated} tone="info" />
                    <NumberCell value={run.itemsFailed} tone="danger" />
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onView(run)}
                        className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-xs font-black text-app-primary transition hover:bg-app-primary-soft focus:outline-none focus:ring-2 focus:ring-app-focus/30"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onView(run)}
                className="w-full rounded-lg border border-app-border bg-app-surface p-4 text-left shadow-sm transition hover:border-app-primary/40 focus:outline-none focus:ring-2 focus:ring-app-focus/30 dark:bg-[rgb(10,25,51)]"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProviderIcon provider={run.provider} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {providerLabel(run.provider)}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-app-text-muted">
                        {run.connection?.displayName ?? "Live connection"}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={run.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-app-text-muted">
                  <span>Started: {formatDate(run.startedAt ?? run.createdAt)}</span>
                  <span>Duration: {formatDuration(run.durationMs)}</span>
                  <span>Fetched: {run.itemsFetched}</span>
                  <span>Imported: {run.itemsImported}</span>
                  <span>Duplicates: {run.itemsDuplicated}</span>
                  <span>Failed: {run.itemsFailed}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </WorkspacePanel>
  );
}

function WebhookActivityPanel({
  items,
  isLoading,
  selectedConnection,
  onShowAll
}: {
  items: IntegrationWebhookDelivery[];
  isLoading: boolean;
  selectedConnection: IntegrationConnection | null;
  onShowAll: () => void;
}): JSX.Element {
  return (
    <WorkspacePanel>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black">Webhook Activity</h2>
          <p className="mt-1 text-sm font-semibold text-app-text-muted">
            {selectedConnection
              ? `Showing ${selectedConnection.displayName}`
              : "Latest Live webhook deliveries"}
          </p>
        </div>
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-app-border bg-app-surface px-3 text-xs font-black text-app-text transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-focus/30 dark:bg-white/5"
        >
          Show sync runs
        </button>
      </div>
      {isLoading ? <SkeletonTable /> : null}
      {!isLoading && items.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" aria-hidden="true" />}
          title="No webhook deliveries yet"
          description="Deliveries appear here after Meta sends signed webhook events."
        />
      ) : null}
      {!isLoading && items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-app-border">
          <table className="min-w-full divide-y divide-app-border text-left text-sm">
            <thead className="bg-app-surface-muted/70 text-xs font-black text-app-text-muted">
              <tr>
                <th className="px-3 py-3">Received</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Preview</th>
                <th className="px-3 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-app-surface dark:bg-[rgb(10,25,51)]">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-app-text-muted">
                    {formatDate(item.receivedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="px-3 py-3 font-semibold">{item.messageType ?? "-"}</td>
                  <td className="max-w-[18rem] px-3 py-3">
                    <p className="line-clamp-2 text-xs font-semibold text-app-text-muted">
                      {item.safePreview?.textPreview ??
                        item.safeMessage ??
                        "No preview available."}
                    </p>
                  </td>
                  <td className="px-3 py-3 font-semibold text-app-text-muted">
                    {item.resultCode ? friendlyCode(item.resultCode) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </WorkspacePanel>
  );
}

function ConnectIntegrationDialog({
  state,
  branches,
  providers,
  isSaving,
  onClose,
  onChange,
  onSave
}: {
  state: ConnectionFormState | null;
  branches: BranchSummary[];
  providers: IntegrationProviderCapability[];
  isSaving: boolean;
  onClose: () => void;
  onChange: (state: ConnectionFormState | null) => void;
  onSave: () => void;
}): JSX.Element {
  if (!state) {
    return <Dialog open={false} onOpenChange={() => undefined} />;
  }

  const providerOptions = providers.map((provider) => ({
    value: providerModeKey(provider.provider, provider.mode),
    label: `${provider.label} - Live ${liveProviderLabel(provider.provider)}`,
    disabled:
      (provider.mode === "LIVE" && !provider.liveAvailable) ||
      (provider.provider !== "EMAIL" &&
        Boolean(provider.connection) &&
        providerModeKey(provider.provider, provider.mode) !==
          providerModeKey(state.provider, state.integrationMode))
  }));
  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: `${branch.name} (${branch.code})`
  }));
  const isLiveWhatsApp =
    state.provider === "WHATSAPP" && state.integrationMode === "LIVE";
  const isLiveSocial =
    (state.provider === "FACEBOOK" || state.provider === "INSTAGRAM") &&
    state.integrationMode === "LIVE";
  const isLiveWebhook = isLiveWhatsApp || isLiveSocial;
  const isLiveEmail = state.provider === "EMAIL" && state.integrationMode === "LIVE";
  const selectedEmailProvider =
    state.liveProviderType === "MICROSOFT" ? "MICROSOFT" : "GMAIL";
  const canSave = Boolean(
    state.displayName.trim() &&
    state.defaultBranchId &&
    (state.integrationMode === "DEMO" ||
      (state.liveDisclosureAccepted &&
        (!isLiveWhatsApp ||
          state.mode === "edit" ||
          (state.phoneNumberId.trim() &&
            state.wabaId.trim() &&
            state.temporaryAccessToken.trim())) &&
        (!isLiveSocial ||
          state.mode === "edit" ||
          (state.providerAccountId.trim() &&
            (state.provider === "FACEBOOK" || state.providerAccountType.trim()) &&
            state.temporaryAccessToken.trim()))))
  );
  const providerName = providerLabel(state.provider);
  const liveEmailLabel = emailProviderTypeLabel(selectedEmailProvider);

  const goToStep = (step: ConnectionFormState["step"]) => {
    onChange({ ...state, step });
  };
  const nextStep = () => {
    if (state.step < 4) {
      onChange({ ...state, step: (state.step + 1) as ConnectionFormState["step"] });
    }
  };
  const previousStep = () => {
    if (state.step > 1) {
      onChange({ ...state, step: (state.step - 1) as ConnectionFormState["step"] });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {state.mode === "edit" ? "Edit Connection" : `Connect ${providerName}`}
          </DialogTitle>
          <DialogDescription>
            Connect an approved provider and choose the branch that receives its inbound
            feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <ol className="grid gap-2 rounded-lg border border-app-border bg-app-surface-muted/60 p-3 dark:bg-white/5">
            {[
              ["Provider", 1],
              ["Connection", 2],
              ["Configure", 3],
              ["Review", 4]
            ].map(([labelText, step]) => (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => goToStep(step as ConnectionFormState["step"])}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
                    state.step === step
                      ? "bg-app-primary text-white"
                      : "text-app-text-muted hover:bg-app-surface hover:text-app-text dark:hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      state.step === step
                        ? "bg-white/20 text-white"
                        : "bg-app-primary-soft text-app-primary"
                    }`}
                  >
                    {step}
                  </span>
                  {labelText}
                </button>
              </li>
            ))}
          </ol>

          <div className="min-w-0 rounded-lg border border-app-border bg-app-surface p-4 dark:bg-[rgb(10,25,51)]">
            {state.step === 1 ? (
              <div className="space-y-4">
                <ProviderIdentity
                  provider={state.provider}
                  mode={state.integrationMode}
                />
                <AppSelectField
                  value={providerModeKey(state.provider, state.integrationMode)}
                  onValueChange={(value) => {
                    const capability = providers.find(
                      (provider) =>
                        providerModeKey(provider.provider, provider.mode) === value
                    );
                    if (!capability) return;
                    onChange({
                      ...state,
                      provider: capability.provider,
                      integrationMode: capability.mode,
                      liveProviderType:
                        capability.mode === "LIVE" && capability.provider === "EMAIL"
                          ? selectedEmailProvider
                          : null,
                      displayName:
                        state.mode === "create"
                          ? defaultConnectionName(
                              capability,
                              branches,
                              capability.provider === "EMAIL" &&
                                capability.mode === "LIVE"
                                ? selectedEmailProvider
                                : undefined
                            )
                          : state.displayName,
                      phoneNumberId:
                        capability.provider === "WHATSAPP" ? state.phoneNumberId : "",
                      wabaId: capability.provider === "WHATSAPP" ? state.wabaId : "",
                      displayPhoneNumber:
                        capability.provider === "WHATSAPP"
                          ? state.displayPhoneNumber
                          : "",
                      providerAccountId:
                        capability.provider === "FACEBOOK" ||
                        capability.provider === "INSTAGRAM"
                          ? state.providerAccountId
                          : "",
                      providerAccountLabel:
                        capability.provider === "FACEBOOK" ||
                        capability.provider === "INSTAGRAM"
                          ? state.providerAccountLabel
                          : "",
                      providerAccountType:
                        capability.provider === "INSTAGRAM"
                          ? state.providerAccountType
                          : "",
                      temporaryAccessToken:
                        capability.provider === "WHATSAPP" ||
                        capability.provider === "FACEBOOK" ||
                        capability.provider === "INSTAGRAM"
                          ? state.temporaryAccessToken
                          : ""
                    });
                  }}
                  options={providerOptions}
                  label="Provider"
                  disabled={state.mode === "edit"}
                />
                {isLiveEmail ? (
                  <AppSelectField
                    value={selectedEmailProvider}
                    onValueChange={(value) => {
                      const liveProviderType = value as LiveEmailProviderType;
                      onChange({
                        ...state,
                        liveProviderType,
                        displayName:
                          state.mode === "create"
                            ? defaultConnectionName(
                                {
                                  provider: state.provider,
                                  mode: state.integrationMode,
                                  label: providerName
                                },
                                branches,
                                liveProviderType
                              )
                            : state.displayName
                      });
                    }}
                    options={[{ value: "GMAIL", label: "Gmail" }]}
                    label="Email provider"
                    disabled={state.mode === "edit"}
                  />
                ) : null}
              </div>
            ) : null}

            {state.step === 2 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-950 dark:border-indigo-900/70 dark:bg-indigo-950/40 dark:text-indigo-100">
                  <div className="mb-3 flex items-center gap-2">
                    <ModeBadge mode={state.integrationMode} />
                    <span className="font-black">
                      {state.provider === "EMAIL"
                        ? `${liveEmailLabel} live connection`
                        : `${liveProviderLabel(state.provider)} live connection`}
                    </span>
                  </div>
                  {state.provider === "WHATSAPP"
                    ? "This connects Meta WhatsApp Cloud API webhook delivery for inbound text messages only. Meta signs POST payloads and non-text media is skipped without download."
                    : isLiveSocial
                      ? state.provider === "FACEBOOK"
                        ? "This connects real Facebook Page comment webhooks. Replies, Messenger, publishing, reactions-as-feedback, and media downloads are not supported."
                        : "This connects real Instagram professional account comment webhooks. Personal accounts, mentions, DMs, replies, publishing, and media downloads are not supported in this MVP."
                      : `This will start ${emailProviderAuthName(selectedEmailProvider)} authorization for ${liveEmailLabel} read-only Inbox access. The app imports messages manually and never changes provider read state.`}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DisclosureTile
                    icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    title="Safe and secure"
                    detail="Encrypted credentials"
                  />
                  <DisclosureTile
                    icon={<Database className="h-4 w-4" aria-hidden="true" />}
                    title="No duplicates"
                    detail="Provider duplicate protection"
                  />
                  <DisclosureTile
                    icon={<Zap className="h-4 w-4" aria-hidden="true" />}
                    title="Inbox ready"
                    detail="Uses real ingestion"
                  />
                </div>
                {state.integrationMode === "LIVE" ? (
                  <label className="flex items-start gap-3 rounded-lg border border-app-border bg-app-surface p-3 text-sm font-semibold leading-6 text-app-text-muted dark:bg-white/5">
                    <input
                      type="checkbox"
                      checked={state.liveDisclosureAccepted}
                      onChange={(event) =>
                        onChange({
                          ...state,
                          liveDisclosureAccepted: event.target.checked
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-focus"
                    />
                    <span>
                      {state.provider === "WHATSAPP"
                        ? "I understand this connects real Meta WhatsApp webhook delivery for inbound text messages only."
                        : isLiveSocial
                          ? `I understand this connects real ${providerName} comment webhook delivery and does not send replies, DMs, publish content, or download media.`
                          : `I understand this connects a real ${liveEmailLabel} Inbox through OAuth and imports inbound messages as feedback.`}
                    </span>
                  </label>
                ) : null}
              </div>
            ) : null}

            {state.step === 3 ? (
              <div className="grid gap-4">
                <label className="block text-sm font-bold text-app-text">
                  <span>Connection name</span>
                  <input
                    value={state.displayName}
                    onChange={(event) =>
                      onChange({ ...state, displayName: event.target.value })
                    }
                    className={`mt-2 ${INPUT_CLASS}`}
                    maxLength={120}
                    placeholder={`${providerName} - Remera`}
                  />
                </label>
                <AppSelectField
                  value={state.defaultBranchId}
                  onValueChange={(value) =>
                    onChange({ ...state, defaultBranchId: value })
                  }
                  options={branchOptions}
                  label="Default branch"
                  placeholder="Choose branch"
                />
                {isLiveWhatsApp ? (
                  <>
                    <label className="block text-sm font-bold text-app-text">
                      <span>Meta phone number ID</span>
                      <input
                        value={state.phoneNumberId}
                        onChange={(event) =>
                          onChange({ ...state, phoneNumberId: event.target.value })
                        }
                        className={`mt-2 ${INPUT_CLASS}`}
                        maxLength={80}
                        placeholder={
                          state.mode === "edit"
                            ? "Leave blank to keep current phone number ID"
                            : "123456789012345"
                        }
                      />
                    </label>
                    <label className="block text-sm font-bold text-app-text">
                      <span>WhatsApp Business Account ID</span>
                      <input
                        value={state.wabaId}
                        onChange={(event) =>
                          onChange({ ...state, wabaId: event.target.value })
                        }
                        className={`mt-2 ${INPUT_CLASS}`}
                        maxLength={80}
                        placeholder={
                          state.mode === "edit"
                            ? "Leave blank to keep current WABA ID"
                            : "123456789012345"
                        }
                      />
                    </label>
                    <label className="block text-sm font-bold text-app-text">
                      <span>Display phone number</span>
                      <input
                        value={state.displayPhoneNumber}
                        onChange={(event) =>
                          onChange({ ...state, displayPhoneNumber: event.target.value })
                        }
                        className={`mt-2 ${INPUT_CLASS}`}
                        maxLength={40}
                        placeholder={
                          state.mode === "edit"
                            ? "Leave blank to keep current display number"
                            : "+250 788 000 000"
                        }
                      />
                    </label>
                    <label className="block text-sm font-bold text-app-text">
                      <span>Temporary access token</span>
                      <input
                        value={state.temporaryAccessToken}
                        onChange={(event) =>
                          onChange({
                            ...state,
                            temporaryAccessToken: event.target.value
                          })
                        }
                        className={`mt-2 ${INPUT_CLASS}`}
                        maxLength={4096}
                        placeholder={
                          state.mode === "edit"
                            ? "Leave blank to keep current token"
                            : "Meta test-number token"
                        }
                        type="password"
                        autoComplete="off"
                      />
                    </label>
                    <p className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3 text-xs font-semibold leading-5 text-app-text-muted dark:bg-white/5">
                      Webhook verification uses the backend verify token and
                      X-Hub-Signature-256 validation with the configured Meta App Secret.
                      Sync Now is not available for Live WhatsApp.
                    </p>
                  </>
                ) : isLiveSocial ? (
                  <>
                    <label className="block text-sm font-bold text-app-text">
                      <span>
                        {state.provider === "FACEBOOK"
                          ? "Facebook Page ID"
                          : "Instagram professional account ID"}
                      </span>
                      <input
                        value={state.providerAccountId}
                        onChange={(event) =>
                          onChange({
                            ...state,
                            providerAccountId: event.target.value
                          })
                        }
                        className={`mt-2 ${INPUT_CLASS}`}
                        maxLength={255}
                        placeholder={
                          state.mode === "edit"
                            ? "Leave blank to keep current account ID"
                            : "123456789012345"
                        }
                      />
                    </label>
                    <label className="block text-sm font-bold text-app-text">
                      <span>
                        {state.provider === "FACEBOOK"
                          ? "Page display name"
                          : "Account username"}
                      </span>
                      <input
                        value={state.providerAccountLabel}
                        onChange={(event) =>
                          onChange({
                            ...state,
                            providerAccountLabel: event.target.value
                          })
                        }
                        className={`mt-2 ${INPUT_CLASS}`}
                        maxLength={255}
                        placeholder={
                          state.provider === "FACEBOOK" ? "Kigali Cafe" : "@kigalicafe"
                        }
                      />
                    </label>
                    {state.provider === "INSTAGRAM" ? (
                      <AppSelectField
                        value={state.providerAccountType}
                        onValueChange={(value) =>
                          onChange({ ...state, providerAccountType: value })
                        }
                        options={[
                          { value: "BUSINESS", label: "Business" },
                          { value: "CREATOR", label: "Creator" }
                        ]}
                        label="Professional account type"
                        placeholder="Choose account type"
                      />
                    ) : null}
                    <label className="block text-sm font-bold text-app-text">
                      <span>Developer/test access token</span>
                      <input
                        value={state.temporaryAccessToken}
                        onChange={(event) =>
                          onChange({
                            ...state,
                            temporaryAccessToken: event.target.value
                          })
                        }
                        className={`mt-2 ${INPUT_CLASS}`}
                        maxLength={4096}
                        placeholder={
                          state.mode === "edit"
                            ? "Leave blank to keep current token"
                            : "Meta developer token"
                        }
                        type="password"
                        autoComplete="off"
                      />
                    </label>
                    <p className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3 text-xs font-semibold leading-5 text-app-text-muted dark:bg-white/5">
                      Webhook verification uses the shared Meta verify token and
                      X-Hub-Signature-256 validation with the configured Meta App Secret.
                      Sync Now is not available for Live {providerName}.
                    </p>
                  </>
                ) : (
                  <p className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3 text-xs font-semibold leading-5 text-app-text-muted dark:bg-white/5">
                    {liveEmailLabel} Live Email uses the Inbox folder only, imports up to
                    20 messages per manual run, and stores attachment metadata only.
                  </p>
                )}
              </div>
            ) : null}

            {state.step === 4 ? (
              <div className="space-y-4">
                <ProviderIdentity
                  provider={state.provider}
                  mode={state.integrationMode}
                />
                <div className="grid gap-3 text-sm">
                  <ReviewRow
                    label="Mode"
                    value={
                      state.provider === "EMAIL"
                        ? `Live ${liveEmailLabel}`
                        : `Live ${liveProviderLabel(state.provider)}`
                    }
                  />
                  <ReviewRow label="Connection" value={state.displayName || "-"} />
                  <ReviewRow
                    label="Branch"
                    value={
                      branches.find((branch) => branch.id === state.defaultBranchId)
                        ?.name ?? "-"
                    }
                  />
                  {isLiveWhatsApp ? (
                    <>
                      <ReviewRow label="Provider" value="Meta WhatsApp Cloud API" />
                      <ReviewRow
                        label="Phone number ID"
                        value={maskIdentifier(state.phoneNumberId)}
                      />
                      <ReviewRow label="WABA ID" value={maskIdentifier(state.wabaId)} />
                    </>
                  ) : isLiveSocial ? (
                    <>
                      <ReviewRow
                        label="Provider"
                        value={
                          state.provider === "FACEBOOK"
                            ? "Facebook Page comments"
                            : "Instagram professional comments"
                        }
                      />
                      <ReviewRow
                        label={state.provider === "FACEBOOK" ? "Page ID" : "Account ID"}
                        value={maskIdentifier(state.providerAccountId)}
                      />
                      <ReviewRow
                        label={state.provider === "FACEBOOK" ? "Page" : "Account"}
                        value={state.providerAccountLabel || "-"}
                      />
                      {state.provider === "INSTAGRAM" ? (
                        <ReviewRow
                          label="Account type"
                          value={state.providerAccountType || "-"}
                        />
                      ) : null}
                    </>
                  ) : (
                    <ReviewRow label="Provider" value={liveEmailLabel} />
                  )}
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100">
                  Imported feedback will appear in your Unified Inbox after
                  {isLiveWebhook ? " webhook processing." : " synchronization."}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <WorkspaceButton tone="secondary" onClick={onClose}>
              Cancel
            </WorkspaceButton>
          </DialogClose>
          {state.step > 1 ? (
            <WorkspaceButton tone="secondary" onClick={previousStep}>
              Back
            </WorkspaceButton>
          ) : null}
          {state.step < 4 ? (
            <WorkspaceButton onClick={nextStep}>Continue</WorkspaceButton>
          ) : (
            <WorkspaceButton onClick={onSave} disabled={isSaving || !canSave}>
              {isSaving
                ? "Connecting..."
                : state.provider === "WHATSAPP"
                  ? "Connect Live WhatsApp"
                  : isLiveSocial
                    ? `Connect Live ${providerName}`
                    : `Authorize ${liveEmailLabel}`}
            </WorkspaceButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunDetailsDialog({
  run,
  items,
  isLoadingItems,
  isMutating,
  onClose,
  onRetry
}: {
  run: SynchronizationRun | null;
  items: SynchronizationItem[];
  isLoadingItems: boolean;
  isMutating: boolean;
  onClose: () => void;
  onRetry: (item: SynchronizationItem) => void;
}): JSX.Element {
  if (!run) {
    return <Dialog open={false} onOpenChange={() => undefined} />;
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{providerLabel(run.provider)} synchronization</DialogTitle>
          <DialogDescription>{runDetailsDescription(run)}</DialogDescription>
        </DialogHeader>
        {isRunInProgress(run) ? (
          <SyncProgressPanel run={run} />
        ) : (
          <SyncResultPanel run={run} />
        )}
        <div>
          <h3 className="mb-3 text-sm font-black">Item Results</h3>
          {isLoadingItems ? <SkeletonCard /> : null}
          {!isLoadingItems && items.length === 0 ? (
            <EmptyState
              title="No item results"
              description="This run has no item-level results."
            />
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <ItemResult
                key={item.id}
                item={item}
                onRetry={onRetry}
                disabled={isMutating}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <WorkspaceButton tone="secondary" onClick={onClose}>
            Close
          </WorkspaceButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyncProgressPanel({
  run,
  compact = false
}: {
  run: SynchronizationRun;
  compact?: boolean;
}): JSX.Element {
  const processed = Math.max(
    run.itemsProcessed,
    run.itemsImported + run.itemsDuplicated + run.itemsFailed
  );
  const denominator = Math.max(run.itemsFetched, processed, 1);
  const percent = Math.min(100, Math.round((processed / denominator) * 100));
  return (
    <section
      className={`rounded-lg border border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100 ${
        compact ? "mt-3 p-3" : "p-5"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">
            {providerLabel(run.provider)} - {run.connection?.displayName ?? "Live"}
          </p>
          <p className="mt-1 text-xs font-semibold">Synchronization in progress...</p>
        </div>
        <ModeBadge mode={run.mode} compact />
      </div>
      <div className="mt-4 h-2 rounded-full bg-sky-100 dark:bg-sky-950">
        <div
          className="h-2 rounded-full bg-sky-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs font-black">
        <span>Fetched {run.itemsFetched}</span>
        <span>Processed {processed}</span>
        <span className="text-emerald-600 dark:text-emerald-300">
          Imported {run.itemsImported}
        </span>
        <span className="text-sky-600 dark:text-sky-300">
          Duplicates {run.itemsDuplicated}
        </span>
        <span className="text-red-600 dark:text-red-300">Failed {run.itemsFailed}</span>
      </div>
    </section>
  );
}

function SyncResultPanel({ run }: { run: SynchronizationRun }): JSX.Element {
  const tone =
    run.status === "COMPLETED"
      ? "success"
      : run.status === "COMPLETED_WITH_ERRORS" || run.status === "CANCELLED"
        ? "warning"
        : "danger";
  return (
    <section
      className={`rounded-lg border p-5 ${resultToneClass(tone)}`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-white/10">
            {tone === "success" ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            ) : tone === "warning" ? (
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            ) : (
              <XCircle className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-black">{runStatusLabel(run.status)}</h3>
            <p className="mt-1 text-sm font-semibold">
              {run.safeSummary ?? "Synchronization run completed."}
            </p>
          </div>
        </div>
        <StatusPill status={run.status} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        <MetricTile label="Fetched" value={run.itemsFetched} />
        <MetricTile label="Imported" value={run.itemsImported} />
        <MetricTile label="Duplicates" value={run.itemsDuplicated} />
        <MetricTile label="Failed" value={run.itemsFailed} />
        <MetricTile label="Duration" value={formatDuration(run.durationMs)} />
      </div>
    </section>
  );
}

function ItemResult({
  item,
  onRetry,
  disabled
}: {
  item: SynchronizationItem;
  onRetry: (item: SynchronizationItem) => void;
  disabled: boolean;
}): JSX.Element {
  const preview = item.safePreview;
  return (
    <article className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm dark:bg-[rgb(10,25,51)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="truncate text-sm font-black"
            title={preview?.title ?? item.sourceLabel ?? item.externalId}
          >
            {preview?.title ?? item.sourceLabel ?? "Source item"}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-app-text-muted">
            {preview?.excerpt ?? item.safeMessage ?? "No preview available."}
          </p>
        </div>
        <StatusPill status={item.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-app-text-muted">
        <span className="max-w-full truncate rounded-md bg-app-surface-muted px-2 py-1">
          {providerLabel(item.provider)}
        </span>
        {preview?.rating ? (
          <span className="rounded-md bg-app-surface-muted px-2 py-1">
            {preview.rating}/5 rating
          </span>
        ) : null}
        {item.feedbackId ? (
          <span className="rounded-md bg-app-surface-muted px-2 py-1">
            Feedback imported
          </span>
        ) : null}
        {item.resultCode ? (
          <span className="rounded-md bg-app-surface-muted px-2 py-1">
            {friendlyCode(item.resultCode)}
          </span>
        ) : null}
      </div>
      {item.status === "FAILED" ? (
        <div className="mt-3">
          <SmallButton onClick={() => onRetry(item)} disabled={disabled}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </SmallButton>
        </div>
      ) : null}
    </article>
  );
}

function FilterSelect({
  value,
  onChange,
  label: ariaLabel,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: readonly AppSelectOption[];
}): JSX.Element {
  return (
    <AppSelectField
      value={value}
      onValueChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      triggerClassName="h-11 bg-app-surface dark:bg-[rgb(10,25,51)]"
    />
  );
}

function StatusPill({
  status
}: {
  status:
    | IntegrationConnectionStatus
    | SynchronizationRunStatus
    | SynchronizationItem["status"]
    | IntegrationWebhookDelivery["status"]
    | "RUNNING";
}): JSX.Element {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex max-w-full shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-black ring-1 ${badgeClass(tone)}`}
    >
      {friendlyStatusLabel(status)}
    </span>
  );
}

function ModeBadge({
  mode,
  compact = false
}: {
  mode: "DEMO" | "LIVE";
  compact?: boolean;
}): JSX.Element | null {
  if (mode !== "LIVE") return null;

  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-md bg-emerald-50 font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-800/70 ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      Live Mode
    </span>
  );
}

function ProviderIcon({
  provider,
  size = "md"
}: {
  provider: IntegrationProvider;
  size?: "sm" | "md";
}): JSX.Element {
  const boxSize = size === "sm" ? "h-8 w-8 rounded-md" : "h-12 w-12 rounded-lg";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  if (provider === "GOOGLE_REVIEWS") {
    return (
      <span
        className={`${boxSize} flex shrink-0 items-center justify-center bg-white text-xl font-black shadow-sm ring-1 ring-slate-200 dark:bg-white`}
        aria-hidden="true"
      >
        <span className="text-blue-600">G</span>
      </span>
    );
  }
  if (provider === "WHATSAPP") {
    return (
      <span
        className={`${boxSize} flex shrink-0 items-center justify-center bg-emerald-500 text-white shadow-sm`}
        aria-hidden="true"
      >
        <MessageCircle className={iconSize} />
      </span>
    );
  }
  if (provider === "EMAIL") {
    return (
      <span
        className={`${boxSize} flex shrink-0 items-center justify-center bg-blue-600 text-white shadow-sm`}
        aria-hidden="true"
      >
        <Mail className={iconSize} />
      </span>
    );
  }
  if (provider === "X") {
    return (
      <span
        className={`${boxSize} flex shrink-0 items-center justify-center bg-black text-lg font-black text-white shadow-sm ring-1 ring-slate-700`}
        aria-hidden="true"
      >
        X
      </span>
    );
  }
  if (provider === "FACEBOOK") {
    return (
      <span
        className={`${boxSize} flex shrink-0 items-center justify-center bg-blue-600 text-xl font-black text-white shadow-sm`}
        aria-hidden="true"
      >
        f
      </span>
    );
  }
  return (
    <span
      className={`${boxSize} flex shrink-0 items-center justify-center bg-gradient-to-br from-violet-500 via-red-500 to-amber-400 text-lg font-black text-white shadow-sm`}
      aria-hidden="true"
    >
      IG
    </span>
  );
}

function ProviderIdentity({
  provider,
  mode = "DEMO"
}: {
  provider: IntegrationProvider;
  mode?: "DEMO" | "LIVE";
}): JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-app-border bg-app-surface-muted/60 p-3 dark:bg-white/5">
      <ProviderIcon provider={provider} />
      <div className="min-w-0">
        <p className="truncate text-base font-black">{providerLabel(provider)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ModeBadge mode={mode} />
          <span className="rounded-md bg-app-surface px-2.5 py-1 text-[11px] font-black text-app-text-muted ring-1 ring-app-border dark:bg-white/5">
            {mode === "LIVE" ? liveProviderLabel(provider) : "Simulated provider source"}
          </span>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  muted = false
}: {
  label: string;
  value: string;
  muted?: boolean;
}): JSX.Element {
  return (
    <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
      <dt className="font-semibold text-app-text-muted">{label}:</dt>
      <dd
        className={`min-w-0 truncate font-semibold ${muted ? "text-app-text-muted" : "text-app-text"}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function MetricTile({
  label,
  value
}: {
  label: string;
  value: string | number;
}): JSX.Element {
  return (
    <div className="min-w-0 border-l border-app-border pl-3 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-semibold text-app-text-muted">{label}</p>
      <p className="mt-1 truncate text-base font-black" title={String(value)}>
        {value}
      </p>
    </div>
  );
}

function DisclosureTile({
  icon,
  title,
  detail
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3 dark:bg-white/5">
      <div className="text-app-primary">{icon}</div>
      <p className="mt-2 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-semibold text-app-text-muted">{detail}</p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-app-border bg-app-surface-muted/60 px-3 py-2 dark:bg-white/5">
      <span className="text-app-text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-black" title={value}>
        {value}
      </span>
    </div>
  );
}

function NumberCell({
  value,
  tone = "neutral"
}: {
  value: number;
  tone?: "neutral" | "success" | "info" | "danger";
}): JSX.Element {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "info"
        ? "text-sky-600 dark:text-sky-300"
        : tone === "danger"
          ? "text-red-600 dark:text-red-300"
          : "text-app-text";
  return <td className={`px-3 py-3 text-right font-black ${toneClass}`}>{value}</td>;
}

function SmallButton({
  children,
  onClick,
  disabled,
  tone = "primary"
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary";
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "primary"
          ? "bg-app-primary text-white shadow-sm shadow-indigo-600/20 hover:bg-app-primary-hover"
          : "border border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted dark:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function SuccessAlert({ message }: { message: string }): JSX.Element {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
      role="alert"
    >
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function SkeletonCard(): JSX.Element {
  return (
    <div
      className="h-64 animate-pulse rounded-lg border border-app-border bg-app-surface-muted/70"
      aria-label="Loading integration card"
    />
  );
}

function SkeletonTable(): JSX.Element {
  return (
    <div
      className="h-72 animate-pulse rounded-lg border border-app-border bg-app-surface-muted/70"
      aria-label="Loading synchronization runs"
    />
  );
}

function StandaloneState({
  title,
  description = "Loading workspace context."
}: {
  title: string;
  description?: string;
}): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-4 text-app-text">
      <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 text-center shadow-panel">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm font-semibold text-app-text-muted">{description}</p>
      </section>
    </main>
  );
}

function createBlankForm(
  providers: IntegrationProviderCapability[],
  branches: BranchSummary[]
): ConnectionFormState {
  const firstAvailable =
    providers.find((provider) => !provider.connection) ?? providers[0];
  return createForm(
    firstAvailable ?? {
      provider: "WHATSAPP",
      mode: "LIVE",
      label: "WhatsApp"
    },
    branches
  );
}

function createForm(
  capability: Pick<IntegrationProviderCapability, "provider" | "mode" | "label">,
  branches: BranchSummary[],
  liveEmailProviderType: LiveEmailProviderType = "GMAIL"
): ConnectionFormState {
  return {
    mode: "create",
    step: 1,
    connection: null,
    provider: capability.provider,
    integrationMode: capability.mode,
    liveProviderType:
      capability.mode === "LIVE" && capability.provider === "EMAIL"
        ? liveEmailProviderType
        : null,
    phoneNumberId: "",
    wabaId: "",
    displayPhoneNumber: "",
    providerAccountId: "",
    providerAccountLabel: "",
    providerAccountType:
      capability.mode === "LIVE" && capability.provider === "INSTAGRAM" ? "BUSINESS" : "",
    temporaryAccessToken: "",
    displayName: defaultConnectionName(capability, branches, liveEmailProviderType),
    defaultBranchId: branches[0]?.id ?? "",
    liveDisclosureAccepted: false
  };
}

function editForm(connection: IntegrationConnection): ConnectionFormState {
  return {
    mode: "edit",
    step: 3,
    connection,
    provider: connection.provider,
    integrationMode: connection.mode,
    liveProviderType: connection.liveProviderType,
    phoneNumberId: "",
    wabaId: "",
    displayPhoneNumber: "",
    providerAccountId: "",
    providerAccountLabel: connection.providerAccountLabel ?? "",
    providerAccountType: "",
    temporaryAccessToken: "",
    displayName: connection.displayName,
    defaultBranchId: connection.defaultBranch?.id ?? "",
    liveDisclosureAccepted: connection.mode === "LIVE"
  };
}

function providerModeKey(
  provider: IntegrationProvider,
  mode: "DEMO" | "LIVE",
  liveProviderType?: EmailProviderType | null
): string {
  if (provider === "EMAIL" && mode === "LIVE" && liveProviderType) {
    return `${provider}:${mode}:${liveProviderType}`;
  }
  return `${provider}:${mode}`;
}

function connectionListKey(connection: IntegrationConnection): string {
  return providerModeKey(
    connection.provider,
    connection.mode,
    connection.liveProviderType
  );
}

function defaultConnectionName(
  capability: Pick<IntegrationProviderCapability, "provider" | "mode" | "label">,
  branches: BranchSummary[],
  liveEmailProviderType: LiveEmailProviderType = "GMAIL"
): string {
  const branchName = branches[0]?.name;
  if (capability.mode === "LIVE") {
    if (capability.provider === "WHATSAPP") {
      return branchName ? `WhatsApp Webhook - ${branchName}` : "WhatsApp Webhook";
    }
    if (capability.provider === "FACEBOOK") {
      return branchName
        ? `Facebook Page Comments - ${branchName}`
        : "Facebook Page Comments";
    }
    if (capability.provider === "INSTAGRAM") {
      return branchName ? `Instagram Comments - ${branchName}` : "Instagram Comments";
    }
    const label = emailProviderTypeLabel(liveEmailProviderType);
    return branchName ? `${label} Inbox - ${branchName}` : `${label} Inbox`;
  }

  return providerLabel(capability.provider);
}

function isAuthorizationResponse(
  value: IntegrationConnection | IntegrationAuthorizationResponse
): value is IntegrationAuthorizationResponse {
  return "authorizationUrl" in value;
}

function filterProviderCapabilities({
  providers,
  connections,
  search,
  provider,
  status,
  branchId
}: {
  providers: IntegrationProviderCapability[];
  connections: IntegrationConnection[];
  search: string;
  provider: IntegrationProvider | "";
  status: IntegrationConnectionStatus | "";
  branchId: string;
}): IntegrationProviderCapability[] {
  const normalizedSearch = search.trim().toLowerCase();
  return providers.filter((capability) => {
    const relatedConnections =
      capability.provider === "EMAIL" && capability.mode === "LIVE"
        ? connections.filter((item) => item.provider === "EMAIL" && item.mode === "LIVE")
        : [];
    const firstRelatedConnection = relatedConnections[0] ?? null;
    const connection =
      firstRelatedConnection ??
      connections.find(
        (item) => item.provider === capability.provider && item.mode === capability.mode
      ) ??
      capability.connection;
    const effectiveStatus = firstRelatedConnection
      ? relatedConnections.some((item) => item.status === status)
        ? status
        : firstRelatedConnection.status
      : (connection?.status ?? "DISCONNECTED");
    if (provider && capability.provider !== provider) return false;
    if (status && effectiveStatus !== status) return false;
    if (
      branchId &&
      !(
        connection?.defaultBranch?.id === branchId ||
        relatedConnections.some((item) => item.defaultBranch?.id === branchId)
      )
    ) {
      return false;
    }
    if (!normalizedSearch) return true;
    const haystack = [
      providerLabel(capability.provider),
      `Live ${liveProviderLabel(capability.provider)}`,
      capability.description,
      connection?.displayName,
      connection?.defaultBranch?.name,
      ...relatedConnections.flatMap((item) => [
        item.displayName,
        item.defaultBranch?.name,
        emailProviderTypeLabel(item.liveProviderType)
      ])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}

function getPrimaryAction(
  status: IntegrationConnectionStatus,
  hasConnection: boolean,
  running: boolean,
  options: { liveWebhookDriven?: boolean } = {}
): {
  label: string;
  action: ConnectionAction;
  disabled?: boolean;
  tone: "primary" | "secondary";
  icon: ReactNode;
} {
  if (!hasConnection) {
    return {
      label: "Connect",
      action: "reconnect",
      tone: "secondary",
      icon: <PlugZap className="h-4 w-4" aria-hidden="true" />
    };
  }
  if (running) {
    return {
      label: "Syncing",
      action: "sync",
      disabled: true,
      tone: "primary",
      icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    };
  }
  if (options.liveWebhookDriven && status === "CONNECTED") {
    return {
      label: "Test Connection",
      action: "test",
      tone: "primary",
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />
    };
  }
  if (status === "CONNECTED") {
    return {
      label: "Sync Now",
      action: "sync",
      tone: "primary",
      icon: <RefreshCw className="h-4 w-4" aria-hidden="true" />
    };
  }
  if (status === "PAUSED") {
    return {
      label: "Resume",
      action: "resume",
      tone: "primary",
      icon: <Play className="h-4 w-4" aria-hidden="true" />
    };
  }
  if (status === "ERROR") {
    return {
      label: "Review",
      action: "test",
      tone: "primary",
      icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />
    };
  }
  return {
    label: "Reconnect",
    action: "reconnect",
    tone: "secondary",
    icon: <PlugZap className="h-4 w-4" aria-hidden="true" />
  };
}

function validParam<T extends readonly string[]>(
  value: string | null,
  allowed: T
): T[number] | "" {
  return value && allowed.includes(value) ? value : "";
}

function actionNotice(action: ConnectionAction): string {
  if (action === "sync") return "Synchronization completed.";
  if (action === "test") return "Connection test completed.";
  if (action === "pause") return "Connection paused.";
  if (action === "resume") return "Connection resumed.";
  if (action === "disconnect") return "Connection disconnected.";
  if (action === "reauthorize") return "Email reauthorization started.";
  return "Connection reconnected.";
}

function providerLabel(provider: IntegrationProvider): string {
  return PROVIDER_LABELS[provider];
}

function liveProviderLabel(provider: IntegrationProvider): string {
  if (provider === "EMAIL") return "Email";
  if (provider === "WHATSAPP") return "WhatsApp";
  return providerLabel(provider);
}

function isWebhookDrivenLiveProvider(provider: IntegrationProvider): boolean {
  return provider === "WHATSAPP" || provider === "FACEBOOK" || provider === "INSTAGRAM";
}

function emailProviderTypeLabel(value: EmailProviderType | null | undefined): string {
  if (value === "MICROSOFT") return "Outlook";
  if (value === "GMAIL") return "Gmail";
  return "Email";
}

function emailProviderAuthName(value: EmailProviderType | null | undefined): string {
  if (value === "MICROSOFT") return "Microsoft";
  return "Google";
}

function runDetailsDescription(run: SynchronizationRun): string {
  if (run.provider === "EMAIL" && run.liveProviderType === "MICROSOFT") {
    return "Live Outlook synchronization details, counters, and safe item results.";
  }
  if (run.provider === "EMAIL" && run.liveProviderType === "GMAIL") {
    return "Live Gmail synchronization details, counters, and safe item results.";
  }
  return "Live synchronization details, counters, and safe item results.";
}

function maskIdentifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  if (trimmed.length <= 8) return "Configured";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function connectionStatusLabel(status: IntegrationConnectionStatus): string {
  return CONNECTION_STATUS_LABELS[status];
}

function runStatusLabel(status: SynchronizationRunStatus): string {
  return RUN_STATUS_LABELS[status];
}

function friendlyStatusLabel(
  status:
    | IntegrationConnectionStatus
    | SynchronizationRunStatus
    | SynchronizationItem["status"]
    | IntegrationWebhookDelivery["status"]
    | "RUNNING"
): string {
  if (status === "RUNNING") return "Running";
  if (isConnectionStatus(status)) return connectionStatusLabel(status);
  if (isRunStatus(status)) return runStatusLabel(status);
  if (isWebhookStatus(status)) return WEBHOOK_STATUS_LABELS[status];
  return ITEM_STATUS_LABELS[status];
}

function isConnectionStatus(value: string): value is IntegrationConnectionStatus {
  return CONNECTION_STATUSES.includes(value as IntegrationConnectionStatus);
}

function isRunStatus(value: string): value is SynchronizationRunStatus {
  return [
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "COMPLETED_WITH_ERRORS",
    "FAILED",
    "CANCELLED"
  ].includes(value);
}

function isWebhookStatus(value: string): value is IntegrationWebhookDelivery["status"] {
  return ["RECEIVED", "IMPORTED", "DUPLICATE", "SKIPPED", "FAILED"].includes(value);
}

function isRunInProgress(run: SynchronizationRun): boolean {
  return run.status === "PENDING" || run.status === "RUNNING";
}

function friendlyCode(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDuration(durationMs: number | null): string {
  if (!durationMs) return "-";
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusTone(
  status:
    | IntegrationConnectionStatus
    | SynchronizationRunStatus
    | SynchronizationItem["status"]
    | IntegrationWebhookDelivery["status"]
    | "RUNNING"
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (
    status === "CONNECTED" ||
    status === "COMPLETED" ||
    status === "IMPORTED" ||
    status === "DUPLICATE"
  ) {
    return "success";
  }
  if (
    status === "PAUSED" ||
    status === "PENDING" ||
    status === "COMPLETED_WITH_ERRORS" ||
    status === "CANCELLED"
  ) {
    return "warning";
  }
  if (status === "RUNNING") return "info";
  if (status === "DISCONNECTED" || status === "SKIPPED") return "neutral";
  return "danger";
}

function badgeClass(tone: "success" | "warning" | "danger" | "neutral" | "info"): string {
  if (tone === "success") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/70";
  }
  if (tone === "warning") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900/70";
  }
  if (tone === "info") {
    return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-900/70";
  }
  if (tone === "neutral") {
    return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-700";
  }
  return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900/70";
}

function resultToneClass(tone: "success" | "warning" | "danger"): string {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100";
  }
  return "border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100";
}
