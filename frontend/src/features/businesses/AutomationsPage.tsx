import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pause,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Wand2,
  XCircle,
  Zap
} from "lucide-react";
import {
  useDeferredValue,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode
} from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import { CollectionViewToggle } from "../../components/collection-view/CollectionViewToggle.js";
import { useCollectionView } from "../../components/collection-view/useCollectionView.js";
import {
  EmptyState,
  StatCard,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import {
  fetchBranches,
  fetchBusiness,
  fetchMemberships,
  fetchMyBusinesses
} from "./api/businessApi.js";
import {
  fetchCategories,
  fetchFeedbackList,
  type FeedbackInboxPagination,
  type FeedbackListItem
} from "./feedbackInboxApi.js";
import {
  activateAutomationRule,
  archiveAutomationRule,
  createAutomationRule,
  deleteAutomationRule,
  duplicateAutomationRule,
  fetchAutomationExecutions,
  fetchAutomationRules,
  pauseAutomationRule,
  previewAutomationRule,
  runAutomationRule,
  unarchiveAutomationRule,
  updateAutomationRule,
  type AutomationAction,
  type AutomationActionType,
  type AutomationBranchScope,
  type AutomationCondition,
  type AutomationConditionOperator,
  type AutomationConditionType,
  type AutomationExecutionsResponse,
  type AutomationExecution,
  type AutomationExecutionStatus,
  type AutomationMatchMode,
  type AutomationPreviewResult,
  type AutomationRule,
  type AutomationRuleDefinition,
  type AutomationRuleStatus,
  type AutomationRuleTrigger
} from "./automationApi.js";

const TRIGGER_OPTIONS: AutomationRuleTrigger[] = [
  "FEEDBACK_CREATED",
  "AI_ANALYSIS_COMPLETED"
];
const STATUS_OPTIONS: AutomationRuleStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"];
const CONDITION_TYPES: AutomationConditionType[] = [
  "BRANCH",
  "CHANNEL",
  "RATING",
  "STATUS",
  "PRIORITY",
  "CATEGORY",
  "ASSIGNMENT_STATE",
  "CUSTOMER_LINK_STATE",
  "AI_STATUS",
  "SENTIMENT",
  "SENTIMENT_CONFIDENCE",
  "AI_SUGGESTED_CATEGORY",
  "AI_CATEGORY_CONFIDENCE",
  "AI_SUGGESTION_STATE"
];
const ACTION_TYPES: AutomationActionType[] = [
  "SET_PRIORITY",
  "SET_CATEGORY",
  "ASSIGN_TO_MEMBERSHIP",
  "UNASSIGN",
  "SET_STATUS"
];
const EMPTY_CONDITION: AutomationCondition = {
  type: "RATING",
  operator: "LESS_THAN_OR_EQUAL",
  valueNumber: 2
};
const EMPTY_ACTION: AutomationAction = {
  type: "SET_PRIORITY",
  priority: "URGENT"
};
const FIELD_INPUT_CLASS =
  "h-11 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30";
const responsiveBuilderRowStyle: CSSProperties = {
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))"
};

type BuilderState = AutomationRuleDefinition;
type LifecycleAction = "activate" | "pause" | "archive" | "unarchive";
type ConfirmationIntent =
  | { action: "duplicate"; rule: AutomationRule }
  | { action: "delete"; rule: AutomationRule };
type SaveRuleResult =
  { mode: "create"; rule: AutomationRule } | { mode: "update"; rule: AutomationRule };
type FeedbackPickerState = {
  items: FeedbackListItem[];
  pagination: FeedbackInboxPagination | null;
  search: string;
  selectedFeedback: FeedbackListItem | null;
  isLoading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelect: (feedback: FeedbackListItem) => void;
  onClear: () => void;
};

const EMPTY_BUILDER: BuilderState = {
  name: "",
  description: "",
  trigger: "FEEDBACK_CREATED",
  branchScope: "ALL_BRANCHES",
  branchIds: [],
  matchMode: "ALL",
  stopProcessingAfterMatch: false,
  conditions: [{ ...EMPTY_CONDITION }],
  actions: [{ ...EMPTY_ACTION }]
};

export function AutomationsPage(): JSX.Element {
  const { businessId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [builder, setBuilder] = useState<BuilderState>(EMPTY_BUILDER);
  const [feedbackId, setFeedbackId] = useState("");
  const [selectedTestFeedback, setSelectedTestFeedback] =
    useState<FeedbackListItem | null>(null);
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackPage, setFeedbackPage] = useState(1);
  const deferredFeedbackSearch = useDeferredValue(feedbackSearch);
  const [preview, setPreview] = useState<AutomationPreviewResult | null>(null);
  const [runResult, setRunResult] = useState<AutomationExecution | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [lifecycleNotice, setLifecycleNotice] = useState<string | null>(null);
  const [confirmationIntent, setConfirmationIntent] = useState<ConfirmationIntent | null>(
    null
  );
  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status");
  const status = STATUS_OPTIONS.includes(statusParam as AutomationRuleStatus)
    ? (statusParam as AutomationRuleStatus)
    : "";
  const triggerParam = searchParams.get("trigger");
  const trigger = TRIGGER_OPTIONS.includes(triggerParam as AutomationRuleTrigger)
    ? (triggerParam as AutomationRuleTrigger)
    : "";

  const setAutomationFilter = (key: "search" | "status" | "trigger", value: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      next.set(key, trimmed);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };
  const selectRuleForEditing = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setBuilder(ruleToBuilder(rule));
    setPreview(null);
    setRunResult(null);
    setSaveNotice(null);
  };
  const handleRuleSelectKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement | HTMLDivElement>,
    rule: AutomationRule
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectRuleForEditing(rule);
    }
  };

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
  const rulesQuery = useQuery({
    queryKey: ["automation-rules", businessId, search, status, trigger],
    queryFn: () =>
      fetchAutomationRules(businessId ?? "", {
        search: search || undefined,
        status: status || undefined,
        trigger: trigger || undefined,
        includeArchived: status === "ARCHIVED"
      }),
    enabled: Boolean(businessId && activeBusiness)
  });
  const executionsQuery = useQuery({
    queryKey: ["automation-executions", businessId],
    queryFn: () => fetchAutomationExecutions(businessId ?? ""),
    enabled: Boolean(businessId && activeBusiness)
  });
  const branchesQuery = useQuery({
    queryKey: ["branches", businessId, "automation-options"],
    queryFn: () => fetchBranches(businessId ?? "", { status: "ACTIVE" }),
    enabled: Boolean(businessId && activeBusiness)
  });
  const categoriesQuery = useQuery({
    queryKey: ["feedback-categories", businessId, "automation-options"],
    queryFn: () => fetchCategories(businessId ?? "", false),
    enabled: Boolean(businessId && activeBusiness)
  });
  const membershipsQuery = useQuery({
    queryKey: ["memberships", businessId, "automation-options"],
    queryFn: () => fetchMemberships(businessId ?? "", { status: "ACTIVE" }),
    enabled: Boolean(businessId && activeBusiness)
  });
  const feedbackOptionsQuery = useQuery({
    queryKey: [
      "feedback",
      businessId,
      "automation-test-options",
      deferredFeedbackSearch,
      feedbackPage
    ],
    queryFn: () =>
      fetchFeedbackList(businessId ?? "", {
        page: feedbackPage,
        pageSize: 8,
        search: deferredFeedbackSearch.trim() || undefined,
        sort: "newest"
      }),
    enabled: Boolean(businessId && activeBusiness)
  });

  const saveMutation = useMutation({
    mutationFn: async (): Promise<SaveRuleResult> => {
      const normalizedBuilder = normalizeBuilderForSubmit(builder);
      if (selectedRule) {
        const rule = await updateAutomationRule(businessId ?? "", selectedRule.id, {
          ...normalizedBuilder,
          expectedUpdatedAt: selectedRule.updatedAt
        });
        return { mode: "update", rule };
      }
      const rule = await createAutomationRule(businessId ?? "", normalizedBuilder);
      return { mode: "create", rule };
    },
    onSuccess(result) {
      if (result.mode === "create") {
        setSelectedRule(null);
        setBuilder(EMPTY_BUILDER);
        setPreview(null);
        setRunResult(null);
        setFeedbackId("");
        setSelectedTestFeedback(null);
        setSaveNotice("Automation rule created successfully.");
      } else {
        setSelectedRule(result.rule);
        setBuilder(ruleToBuilder(result.rule));
        setSaveNotice("Automation rule updated successfully.");
      }
      void queryClient.invalidateQueries({ queryKey: ["automation-rules", businessId] });
    }
  });
  const lifecycleMutation = useMutation({
    mutationFn: async ({
      rule,
      action
    }: {
      rule: AutomationRule;
      action: LifecycleAction | "duplicate";
    }) => {
      if (action === "activate") return activateAutomationRule(businessId ?? "", rule.id);
      if (action === "pause") return pauseAutomationRule(businessId ?? "", rule.id);
      if (action === "archive") return archiveAutomationRule(businessId ?? "", rule.id);
      if (action === "unarchive")
        return unarchiveAutomationRule(businessId ?? "", rule.id);
      return duplicateAutomationRule(businessId ?? "", rule.id);
    },
    onSuccess(rule, variables) {
      setConfirmationIntent(null);
      setLifecycleNotice(
        variables.action === "duplicate"
          ? "Automation rule duplicated successfully."
          : variables.action === "archive"
            ? "Automation rule archived successfully."
            : variables.action === "unarchive"
              ? "Automation rule restored as a draft."
              : variables.action === "activate"
                ? "Automation rule activated."
                : "Automation rule paused."
      );
      if (variables.action === "duplicate") {
        setSelectedRule(rule);
        setBuilder(ruleToBuilder(rule));
      }
      void queryClient.invalidateQueries({ queryKey: ["automation-rules", businessId] });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (rule: AutomationRule) => deleteAutomationRule(businessId ?? "", rule.id),
    onSuccess(result) {
      setConfirmationIntent(null);
      setLifecycleNotice("Automation rule deleted permanently.");
      if (selectedRule?.id === result.ruleId) {
        setSelectedRule(null);
        setBuilder(EMPTY_BUILDER);
        setPreview(null);
        setRunResult(null);
      }
      void queryClient.invalidateQueries({ queryKey: ["automation-rules", businessId] });
    }
  });
  const previewMutation = useMutation({
    mutationFn: () =>
      previewAutomationRule(businessId ?? "", selectedRule?.id ?? "", feedbackId),
    onSuccess: setPreview
  });
  const runMutation = useMutation({
    mutationFn: () =>
      runAutomationRule(businessId ?? "", selectedRule?.id ?? "", feedbackId),
    onSuccess(result) {
      setRunResult(result);
      void queryClient.invalidateQueries({
        queryKey: ["automation-executions", businessId]
      });
    }
  });

  const rules = rulesQuery.data?.items ?? [];
  const collectionView = useCollectionView(
    `business-${businessId}-automations`,
    rules.length
  );
  const summary = rulesQuery.data?.summary;
  const business = businessQuery.data;
  const canManage =
    business?.membership.role === "OWNER" || business?.membership.role === "ADMIN";
  const options = useMemo(
    () => ({
      branches: branchesQuery.data?.branches ?? [],
      categories: categoriesQuery.data ?? [],
      memberships: membershipsQuery.data?.memberships ?? [],
      feedback: feedbackOptionsQuery.data?.items ?? [],
      feedbackPagination: feedbackOptionsQuery.data?.pagination ?? null
    }),
    [
      branchesQuery.data,
      categoriesQuery.data,
      membershipsQuery.data,
      feedbackOptionsQuery.data
    ]
  );

  if (!businessId || (mineQuery.data && !activeBusiness)) {
    return <Navigate to="/business" replace />;
  }

  if (mineQuery.isLoading || businessQuery.isLoading) {
    return (
      <StandaloneState
        title="Loading automations"
        description="Loading workspace context."
      />
    );
  }

  if (!activeBusiness || !business) {
    return (
      <StandaloneState
        title="Automations unavailable"
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
      title="Automation rules"
      subtitle="Create clear rules that respond consistently to new feedback and completed AI analysis."
      businesses={mineQuery.data?.businesses ?? []}
      activeBusiness={activeBusiness}
      actions={
        canManage ? (
          <WorkspaceButton
            onClick={() => {
              setSelectedRule(null);
              setBuilder(EMPTY_BUILDER);
              setPreview(null);
              setRunResult(null);
              setFeedbackId("");
              setSelectedTestFeedback(null);
              setSaveNotice(null);
              setLifecycleNotice(null);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Rule
          </WorkspaceButton>
        ) : null
      }
    >
      {!canManage ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
          title="Automation management requires owner or admin access"
          description="Managers and staff can view automation activity only through feedback they can access."
        />
      ) : (
        <div className="space-y-6">
          <div className="min-w-0 space-y-5">
            {lifecycleNotice ? <SuccessAlert message={lifecycleNotice} /> : null}
            {lifecycleMutation.error || deleteMutation.error ? (
              <ErrorState
                message={
                  normalizeApiError(lifecycleMutation.error ?? deleteMutation.error)
                    .message
                }
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Rules"
                value={summary?.total ?? 0}
                detail="All automation rules"
              />
              <StatCard
                label="Active Rules"
                value={summary?.active ?? 0}
                detail="Evaluated automatically"
              />
              <StatCard
                label="Paused Rules"
                value={summary?.paused ?? 0}
                detail="Not evaluated"
              />
              <StatCard
                label="Executions Today"
                value={summary?.executionsToday ?? 0}
                detail="Recorded runs"
              />
            </div>

            <WorkspacePanel>
              <div className="flex flex-col gap-3 lg:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search automation rules</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
                  <input
                    value={search}
                    onChange={(event) =>
                      setAutomationFilter("search", event.target.value)
                    }
                    className="h-11 w-full rounded-md border border-app-border bg-app-surface pl-9 pr-3 text-sm font-semibold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
                    placeholder="Search rules by name or description"
                  />
                </label>
                <Select
                  value={status}
                  onChange={(value) => setAutomationFilter("status", value)}
                  label="Status"
                  options={[
                    { value: "", label: "Status: All" },
                    ...STATUS_OPTIONS.map((item) => ({
                      value: item,
                      label: label(item)
                    }))
                  ]}
                />
                <Select
                  value={trigger}
                  onChange={(value) => setAutomationFilter("trigger", value)}
                  label="Trigger"
                  options={[
                    { value: "", label: "Trigger: All" },
                    ...TRIGGER_OPTIONS.map((item) => ({
                      value: item,
                      label: label(item)
                    }))
                  ]}
                />
              </div>
            </WorkspacePanel>

            <WorkspacePanel>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-app-text-muted">
                  {rules.length} rules
                </p>
                <CollectionViewToggle
                  view={collectionView.view}
                  onChange={collectionView.setView}
                  label="Automation rule view"
                />
              </div>
              {rulesQuery.isLoading ? (
                <Skeleton label="Loading rules" />
              ) : rulesQuery.error ? (
                <ErrorState message={normalizeApiError(rulesQuery.error).message} />
              ) : rules.length === 0 ? (
                <EmptyState
                  icon={<Zap className="h-6 w-6" aria-hidden="true" />}
                  title={
                    search || status || trigger
                      ? "No matching automation rules"
                      : "No automation rules yet"
                  }
                  description={
                    search || status || trigger
                      ? "Existing rules do not match the selected filters."
                      : "Create your first rule to route, classify, assign, or prioritize new feedback safely."
                  }
                  action={
                    search || status || trigger ? (
                      <WorkspaceButton
                        tone="secondary"
                        onClick={() =>
                          setSearchParams(new URLSearchParams(), { replace: true })
                        }
                      >
                        Clear filters
                      </WorkspaceButton>
                    ) : (
                      <WorkspaceButton onClick={() => setBuilder(EMPTY_BUILDER)}>
                        Create Rule
                      </WorkspaceButton>
                    )
                  }
                />
              ) : (
                <div className="min-w-0 overflow-x-auto">
                  <table
                    className={`${collectionView.view === "list" ? "hidden lg:table" : "hidden"} min-w-[860px] w-full text-left text-sm`}
                  >
                    <thead className="text-xs font-black text-app-text-muted">
                      <tr className="border-b border-app-border">
                        <th className="py-3 pr-3">Rule Name</th>
                        <th className="px-3 py-3">Trigger</th>
                        <th className="px-3 py-3">Conditions</th>
                        <th className="px-3 py-3">Actions</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Last Run</th>
                        <th className="py-3 pl-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => (
                        <tr
                          key={rule.id}
                          className={`cursor-pointer border-b border-app-border align-top transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-app-focus/30 ${
                            selectedRule?.id === rule.id ? "bg-app-primary-soft/40" : ""
                          }`}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select ${rule.name} automation rule`}
                          onClick={() => selectRuleForEditing(rule)}
                          onKeyDown={(event) => handleRuleSelectKeyDown(event, rule)}
                        >
                          <td className="py-4 pr-3">
                            <p className="text-left font-black text-app-text">
                              {rule.name}
                            </p>
                            <p className="mt-1 max-w-xs text-xs font-semibold text-app-text-muted">
                              {rule.description || "No description"}
                            </p>
                          </td>
                          <td className="px-3 py-4 font-semibold">
                            {label(rule.trigger)}
                          </td>
                          <td className="px-3 py-4 text-xs font-semibold text-app-text-muted">
                            {rule.conditions.length} condition
                            {rule.conditions.length === 1 ? "" : "s"} ({rule.matchMode})
                          </td>
                          <td className="px-3 py-4 text-xs font-semibold text-app-text-muted">
                            {rule.actions.map((action) => label(action.type)).join(", ")}
                          </td>
                          <td className="px-3 py-4">
                            <RuleStatusBadge status={rule.status} />
                          </td>
                          <td className="px-3 py-4 text-xs font-semibold text-app-text-muted">
                            {rule.lastTriggeredAt
                              ? formatDate(rule.lastTriggeredAt)
                              : "Never"}
                          </td>
                          <td
                            className="py-4 pl-3"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <RuleActions
                              rule={rule}
                              onLifecycle={(action) =>
                                lifecycleMutation.mutate({ rule, action })
                              }
                              onConfirm={(action) =>
                                setConfirmationIntent({ action, rule })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div
                    className={`${collectionView.view === "grid" ? "grid md:grid-cols-2" : "grid lg:hidden"} min-w-0 gap-3`}
                  >
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`cursor-pointer rounded-lg border border-app-border bg-app-surface-muted p-4 transition hover:bg-app-surface focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
                          selectedRule?.id === rule.id ? "ring-2 ring-app-focus/40" : ""
                        }`}
                        tabIndex={0}
                        role="button"
                        aria-label={`Select ${rule.name} automation rule`}
                        onClick={() => selectRuleForEditing(rule)}
                        onKeyDown={(event) => handleRuleSelectKeyDown(event, rule)}
                      >
                        <div className="block w-full text-left">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black">{rule.name}</p>
                              <p className="mt-1 text-xs font-semibold text-app-text-muted">
                                {label(rule.trigger)} -{" "}
                                {rule.branchScope === "ALL_BRANCHES"
                                  ? "All branches"
                                  : "Selected branches"}
                              </p>
                            </div>
                            <RuleStatusBadge status={rule.status} />
                          </div>
                        </div>
                        <div
                          className="mt-4 flex flex-wrap gap-2"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <RuleActions
                            rule={rule}
                            onLifecycle={(action) =>
                              lifecycleMutation.mutate({ rule, action })
                            }
                            onConfirm={(action) =>
                              setConfirmationIntent({ action, rule })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </WorkspacePanel>

            <ExecutionHistory query={executionsQuery} />
          </div>

          <RuleBuilder
            builder={builder}
            setBuilder={setBuilder}
            selectedRule={selectedRule}
            options={options}
            feedbackId={feedbackId}
            feedbackPicker={{
              items: options.feedback,
              pagination: options.feedbackPagination,
              search: feedbackSearch,
              selectedFeedback: selectedTestFeedback,
              isLoading: feedbackOptionsQuery.isFetching,
              error: feedbackOptionsQuery.error
                ? normalizeApiError(feedbackOptionsQuery.error).message
                : null,
              onSearchChange: (value) => {
                setFeedbackSearch(value);
                setFeedbackPage(1);
              },
              onPageChange: setFeedbackPage,
              onSelect: (feedback) => {
                setFeedbackId(feedback.id);
                setSelectedTestFeedback(feedback);
                setPreview(null);
                setRunResult(null);
              },
              onClear: () => {
                setFeedbackId("");
                setSelectedTestFeedback(null);
                setPreview(null);
                setRunResult(null);
              }
            }}
            preview={preview}
            runResult={runResult}
            onSave={() => saveMutation.mutate()}
            onPreview={() => previewMutation.mutate()}
            onRun={() => runMutation.mutate()}
            isSaving={saveMutation.isPending}
            isPreviewing={previewMutation.isPending}
            isRunning={runMutation.isPending}
            saveNotice={saveNotice}
            error={
              saveMutation.error || previewMutation.error || runMutation.error
                ? normalizeApiError(
                    saveMutation.error ?? previewMutation.error ?? runMutation.error
                  ).message
                : null
            }
          />
        </div>
      )}
      <AutomationConfirmationDialog
        intent={confirmationIntent}
        isPending={
          confirmationIntent?.action === "delete"
            ? deleteMutation.isPending
            : lifecycleMutation.isPending
        }
        onCancel={() => setConfirmationIntent(null)}
        onConfirm={() => {
          if (!confirmationIntent) return;
          if (confirmationIntent.action === "delete") {
            deleteMutation.mutate(confirmationIntent.rule);
          } else {
            lifecycleMutation.mutate({
              rule: confirmationIntent.rule,
              action: "duplicate"
            });
          }
        }}
      />
    </WorkspaceShell>
  );
}

function RuleActions({
  rule,
  onLifecycle,
  onConfirm
}: {
  rule: AutomationRule;
  onLifecycle: (action: LifecycleAction) => void;
  onConfirm: (action: ConfirmationIntent["action"]) => void;
}): JSX.Element {
  if (rule.status === "ARCHIVED") {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton
          label="Restore archived rule"
          onClick={() => onLifecycle("unarchive")}
        >
          <ArchiveRestore className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Duplicate archived rule"
          onClick={() => onConfirm("duplicate")}
        >
          <Copy className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Delete archived rule permanently"
          onClick={() => onConfirm("delete")}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <IconButton
        label={rule.status === "ACTIVE" ? "Pause rule" : "Activate rule"}
        onClick={() => onLifecycle(rule.status === "ACTIVE" ? "pause" : "activate")}
      >
        {rule.status === "ACTIVE" ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </IconButton>
      <IconButton label="Duplicate rule" onClick={() => onConfirm("duplicate")}>
        <Copy className="h-4 w-4" />
      </IconButton>
      <IconButton label="Archive rule" onClick={() => onLifecycle("archive")}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

function AutomationConfirmationDialog({
  intent,
  isPending,
  onCancel,
  onConfirm
}: {
  intent: ConfirmationIntent | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const isDelete = intent?.action === "delete";
  return (
    <Dialog
      open={Boolean(intent)}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDelete ? "Delete automation rule?" : "Duplicate automation rule?"}
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? `This will permanently delete "${intent?.rule.name ?? "this rule"}". Execution history remains for audit, but the rule definition cannot be restored.`
              : `This will create a draft copy of "${intent?.rule.name ?? "this rule"}" that you can review before activating.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-app-border bg-app-surface px-4 text-sm font-black text-app-text transition hover:bg-app-surface-muted disabled:opacity-60"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-black text-white transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 disabled:opacity-60 ${
              isDelete
                ? "bg-red-600 hover:bg-red-700"
                : "bg-app-primary hover:bg-app-primary-hover"
            }`}
          >
            {isPending ? "Working..." : isDelete ? "Delete permanently" : "Duplicate"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackPicker({
  value,
  state
}: {
  value: string;
  state: FeedbackPickerState;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const selectedLabel = state.selectedFeedback
    ? feedbackOptionLabel(state.selectedFeedback)
    : "Choose feedback";
  const pagination = state.pagination;
  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between gap-3 rounded-md border border-app-border bg-app-surface px-3 text-left text-sm font-semibold text-app-text outline-none transition hover:bg-app-surface-muted focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
          aria-label="Choose feedback to test automation rule"
        >
          <span
            className={`min-w-0 flex-1 truncate ${value ? "text-app-text" : "text-app-text-muted"}`}
          >
            {selectedLabel}
          </span>
          <Search className="h-4 w-4 shrink-0 text-app-text-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))] p-3">
        <div className="space-y-3">
          <label className="relative block">
            <span className="sr-only">Search feedback</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
            <input
              value={state.search}
              onChange={(event) => state.onSearchChange(event.target.value)}
              className="h-10 w-full rounded-md border border-app-border bg-app-surface pl-9 pr-3 text-sm font-semibold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
              placeholder="Search message, title, customer, branch"
            />
          </label>

          {state.error ? <ErrorState message={state.error} /> : null}

          <div className="max-h-72 overflow-y-auto rounded-md border border-app-border">
            {state.isLoading ? (
              <p className="p-3 text-sm font-semibold text-app-text-muted">
                Loading feedback...
              </p>
            ) : state.items.length === 0 ? (
              <p className="p-3 text-sm font-semibold text-app-text-muted">
                No feedback found.
              </p>
            ) : (
              state.items.map((feedback) => {
                const isSelected = feedback.id === value;
                return (
                  <button
                    key={feedback.id}
                    type="button"
                    className={`flex w-full items-start gap-3 border-b border-app-border px-3 py-3 text-left last:border-b-0 hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-app-focus/30 ${
                      isSelected ? "bg-app-primary-soft/50" : ""
                    }`}
                    onClick={() => {
                      state.onSelect(feedback);
                      setOpen(false);
                    }}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-surface">
                      {isSelected ? (
                        <Check
                          className="h-3.5 w-3.5 text-app-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-app-text">
                        {feedback.title?.trim() ||
                          feedback.messagePreview ||
                          "Untitled feedback"}
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-app-text-muted">
                        {(feedback.customer.name?.trim() || "Anonymous") +
                          " - " +
                          feedback.branch.name +
                          " - " +
                          (feedback.rating === null
                            ? "No rating"
                            : `${feedback.rating}/5`)}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-app-text-muted">
                        {formatDate(feedback.receivedAt)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-app-text-muted">
              Page {currentPage} of {totalPages}
              {pagination ? ` - ${pagination.totalItems} total` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {value ? (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-app-border bg-app-surface px-3 text-xs font-black hover:bg-app-surface-muted"
                  onClick={state.onClear}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-app-border bg-app-surface px-3 text-xs font-black hover:bg-app-surface-muted disabled:opacity-50"
                disabled={!pagination?.hasPreviousPage || state.isLoading}
                onClick={() => state.onPageChange(Math.max(1, currentPage - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-app-border bg-app-surface px-3 text-xs font-black hover:bg-app-surface-muted disabled:opacity-50"
                disabled={!pagination?.hasNextPage || state.isLoading}
                onClick={() => state.onPageChange(currentPage + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RuleBuilder({
  builder,
  setBuilder,
  selectedRule,
  options,
  feedbackId,
  feedbackPicker,
  preview,
  runResult,
  onSave,
  onPreview,
  onRun,
  isSaving,
  isPreviewing,
  isRunning,
  saveNotice,
  error
}: {
  builder: BuilderState;
  setBuilder: (state: BuilderState) => void;
  selectedRule: AutomationRule | null;
  options: {
    branches: Array<{ id: string; name: string }>;
    categories: Array<{ id: string; name: string }>;
    memberships: Array<{
      id: string;
      user: { firstName: string; lastName: string } | null;
      role: string;
    }>;
    feedback: FeedbackListItem[];
    feedbackPagination: FeedbackInboxPagination | null;
  };
  feedbackId: string;
  feedbackPicker: FeedbackPickerState;
  preview: AutomationPreviewResult | null;
  runResult: AutomationExecution | null;
  onSave: () => void;
  onPreview: () => void;
  onRun: () => void;
  isSaving: boolean;
  isPreviewing: boolean;
  isRunning: boolean;
  saveNotice: string | null;
  error: string | null;
}): JSX.Element {
  const validation = validateBuilder(builder);
  return (
    <aside className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <WorkspacePanel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">
              {selectedRule ? "Edit Rule" : "Create Rule"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-app-text-muted">
              DRAFT rules are saved but never evaluated automatically.
            </p>
          </div>
          <Wand2 className="h-5 w-5 text-app-primary" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rule name">
              <input
                value={builder.name}
                onChange={(event) => setBuilder({ ...builder, name: event.target.value })}
                className={FIELD_INPUT_CLASS}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={builder.description ?? ""}
                onChange={(event) =>
                  setBuilder({ ...builder, description: event.target.value })
                }
                className={`${FIELD_INPUT_CLASS} min-h-20 py-3`}
              />
            </Field>
          </div>
          <fieldset className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30 sm:p-5">
            <legend className="px-2 text-sm font-black uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-200">
              1 · When
            </legend>
            <Select
              value={builder.trigger}
              onChange={(value) =>
                setBuilder({ ...builder, trigger: value as AutomationRuleTrigger })
              }
              label="Trigger"
              options={TRIGGER_OPTIONS.map((item) => ({
                value: item,
                label: label(item)
              }))}
            />
          </fieldset>
          <fieldset className="space-y-3 rounded-2xl bg-app-surface-muted/65 p-4 sm:p-5">
            <legend className="px-2 text-sm font-black">Where it applies</legend>
            <Select
              value={builder.branchScope}
              onChange={(value) =>
                setBuilder({
                  ...builder,
                  branchScope: value as AutomationBranchScope,
                  branchIds: value === "ALL_BRANCHES" ? [] : builder.branchIds
                })
              }
              label="Branch scope"
              options={[
                { value: "ALL_BRANCHES", label: "All branches" },
                { value: "SELECTED_BRANCHES", label: "Selected branches" }
              ]}
            />
            {builder.branchScope === "SELECTED_BRANCHES" ? (
              <div className="grid gap-2">
                {options.branches.map((branch) => (
                  <label
                    key={branch.id}
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <input
                      type="checkbox"
                      checked={builder.branchIds.includes(branch.id)}
                      onChange={(event) => {
                        const branchIds = event.target.checked
                          ? [...builder.branchIds, branch.id]
                          : builder.branchIds.filter((id) => id !== branch.id);
                        setBuilder({ ...builder, branchIds });
                      }}
                    />
                    {branch.name}
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>
          <fieldset className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900/70 dark:bg-sky-950/30 sm:p-5">
            <legend className="px-2 text-sm font-black uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
              2 · If
            </legend>
            <div
              className="flex rounded-md border border-app-border p-1"
              role="group"
              aria-label="Condition match mode"
            >
              {(["ALL", "ANY"] as AutomationMatchMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`h-9 flex-1 rounded px-3 text-sm font-black ${builder.matchMode === mode ? "bg-app-primary text-white" : "text-app-text-muted"}`}
                  onClick={() => setBuilder({ ...builder, matchMode: mode })}
                >
                  {mode}
                </button>
              ))}
            </div>
            {builder.conditions.map((condition, index) => (
              <ConditionRow
                key={index}
                condition={condition}
                index={index}
                builder={builder}
                setBuilder={setBuilder}
                options={options}
              />
            ))}
            <SmallButton
              onClick={() =>
                setBuilder({
                  ...builder,
                  conditions: [...builder.conditions, { ...EMPTY_CONDITION }]
                })
              }
              disabled={builder.conditions.length >= 10}
            >
              <Plus className="h-4 w-4" /> Add condition
            </SmallButton>
          </fieldset>
          <fieldset className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30 sm:p-5">
            <legend className="px-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-200">
              3 · Then
            </legend>
            {builder.actions.map((action, index) => (
              <ActionRow
                key={index}
                action={action}
                index={index}
                builder={builder}
                setBuilder={setBuilder}
                options={options}
              />
            ))}
            <SmallButton
              onClick={() =>
                setBuilder({
                  ...builder,
                  actions: [...builder.actions, { ...EMPTY_ACTION }]
                })
              }
              disabled={builder.actions.length >= 5}
            >
              <Plus className="h-4 w-4" /> Add action
            </SmallButton>
          </fieldset>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={builder.stopProcessingAfterMatch}
              onChange={(event) =>
                setBuilder({ ...builder, stopProcessingAfterMatch: event.target.checked })
              }
            />
            Stop processing later rules after this rule matches
          </label>
          {validation.length > 0 ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
              role="alert"
            >
              <p className="font-black">Please review the issues below</p>
              <ul className="mt-2 list-disc pl-5">
                {validation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {saveNotice ? <SuccessAlert message={saveNotice} /> : null}
          {error ? <ErrorState message={error} /> : null}
          <div className="flex flex-wrap gap-2">
            <WorkspaceButton onClick={onSave} disabled={isSaving || !builder.name.trim()}>
              {isSaving ? "Saving..." : "Save as Draft"}
            </WorkspaceButton>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="xl:sticky xl:top-5">
        <h2 className="text-base font-black">Review and test</h2>
        <p className="mt-1 text-sm font-semibold text-app-text-muted">
          Preview changes against one selected feedback before running.
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Feedback">
            <FeedbackPicker value={feedbackId} state={feedbackPicker} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <WorkspaceButton
              tone="secondary"
              onClick={onPreview}
              disabled={!selectedRule || !feedbackId || isPreviewing}
            >
              <SlidersHorizontal className="h-4 w-4" />{" "}
              {isPreviewing ? "Testing..." : "Test"}
            </WorkspaceButton>
            <WorkspaceButton
              onClick={onRun}
              disabled={!selectedRule || !feedbackId || isRunning}
            >
              <Play className="h-4 w-4" /> {isRunning ? "Running..." : "Manual Run"}
            </WorkspaceButton>
          </div>
          {preview ? (
            <ResultPanel
              title={preview.matched ? "Rule matched" : "Rule did not match"}
              tone={preview.matched ? "success" : "info"}
              lines={[
                `${preview.conditionResults.filter((item) => item.matched).length}/${preview.conditionResults.length} conditions matched`,
                `${preview.actionPredictions.filter((item) => item.wouldApply).length}/${preview.actionPredictions.length} actions would apply`
              ]}
            />
          ) : null}
          {runResult ? (
            <ResultPanel
              title={`Manual run ${label(runResult.status)}`}
              tone={
                runResult.status === "SUCCESS"
                  ? "success"
                  : runResult.status === "FAILED"
                    ? "danger"
                    : "info"
              }
              lines={[
                `${runResult.actionsSucceeded} succeeded`,
                `${runResult.actionsSkipped} skipped`,
                `${runResult.actionsFailed} failed`
              ]}
            />
          ) : null}
        </div>
      </WorkspacePanel>
    </aside>
  );
}

function ConditionRow({
  condition,
  index,
  builder,
  setBuilder,
  options
}: {
  condition: AutomationCondition;
  index: number;
  builder: BuilderState;
  setBuilder: (state: BuilderState) => void;
  options: {
    branches: Array<{ id: string; name: string }>;
    categories: Array<{ id: string; name: string }>;
  };
}): JSX.Element {
  const update = (patch: Partial<AutomationCondition>) => {
    const conditions = builder.conditions.map((item, currentIndex) =>
      currentIndex === index ? { ...item, ...patch } : item
    );
    setBuilder({ ...builder, conditions });
  };
  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted p-3">
      <div className="grid gap-3" style={responsiveBuilderRowStyle}>
        <Select
          value={condition.type}
          onChange={(value) =>
            update(defaultConditionFor(value as AutomationConditionType))
          }
          label={`Condition ${index + 1} type`}
          options={CONDITION_TYPES.map((item) => ({
            value: item,
            label: label(item)
          }))}
        />
        <Select
          value={condition.operator}
          onChange={(value) => update({ operator: value as AutomationConditionOperator })}
          label={`Condition ${index + 1} operator`}
          options={operatorsFor(condition.type).map((item) => ({
            value: item,
            label: label(item)
          }))}
        />
        <ConditionValue condition={condition} update={update} options={options} />
        <RowControls
          index={index}
          max={builder.conditions.length}
          onMove={(direction) =>
            setBuilder({
              ...builder,
              conditions: move(builder.conditions, index, direction)
            })
          }
          onRemove={() =>
            setBuilder({
              ...builder,
              conditions: builder.conditions.filter(
                (_, currentIndex) => currentIndex !== index
              )
            })
          }
          label="condition"
        />
      </div>
    </div>
  );
}

function ActionRow({
  action,
  index,
  builder,
  setBuilder,
  options
}: {
  action: AutomationAction;
  index: number;
  builder: BuilderState;
  setBuilder: (state: BuilderState) => void;
  options: {
    categories: Array<{ id: string; name: string }>;
    memberships: Array<{
      id: string;
      user: { firstName: string; lastName: string } | null;
      role: string;
    }>;
  };
}): JSX.Element {
  const update = (patch: Partial<AutomationAction>) => {
    const actions = builder.actions.map((item, currentIndex) =>
      currentIndex === index ? { ...item, ...patch } : item
    );
    setBuilder({ ...builder, actions });
  };
  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted p-3">
      <div className="grid gap-3" style={responsiveBuilderRowStyle}>
        <Select
          value={action.type}
          onChange={(value) => update(defaultActionFor(value as AutomationActionType))}
          label={`Action ${index + 1} type`}
          options={ACTION_TYPES.map((item) => ({
            value: item,
            label: label(item)
          }))}
        />
        <ActionValue action={action} update={update} options={options} />
        <RowControls
          index={index}
          max={builder.actions.length}
          onMove={(direction) =>
            setBuilder({ ...builder, actions: move(builder.actions, index, direction) })
          }
          onRemove={() =>
            setBuilder({
              ...builder,
              actions: builder.actions.filter((_, currentIndex) => currentIndex !== index)
            })
          }
          label="action"
        />
      </div>
    </div>
  );
}

function ConditionValue({
  condition,
  update,
  options
}: {
  condition: AutomationCondition;
  update: (patch: Partial<AutomationCondition>) => void;
  options: {
    branches: Array<{ id: string; name: string }>;
    categories: Array<{ id: string; name: string }>;
  };
}): JSX.Element {
  if (condition.operator === "IS_EMPTY" || condition.operator === "IS_NOT_EMPTY") {
    return (
      <span className="flex h-11 items-center rounded-md border border-app-border px-3 text-sm font-semibold text-app-text-muted">
        No value required
      </span>
    );
  }
  if (condition.type === "BRANCH") {
    return (
      <Select
        value={condition.branchId ?? ""}
        onChange={(value) => update({ branchId: value, value: value })}
        label="Branch value"
        options={[
          { value: "", label: "Choose branch" },
          ...options.branches.map((branch) => ({
            value: branch.id,
            label: branch.name
          }))
        ]}
      />
    );
  }
  if (condition.type === "CATEGORY" || condition.type === "AI_SUGGESTED_CATEGORY") {
    return (
      <Select
        value={condition.categoryId ?? ""}
        onChange={(value) => update({ categoryId: value, value: value })}
        label="Category value"
        options={[
          { value: "", label: "Choose category" },
          ...options.categories.map((category) => ({
            value: category.id,
            label: category.name
          }))
        ]}
      />
    );
  }
  if (
    condition.operator === "GREATER_THAN_OR_EQUAL" ||
    condition.operator === "LESS_THAN_OR_EQUAL"
  ) {
    return (
      <input
        type="number"
        step="0.01"
        value={condition.valueNumber ?? ""}
        onChange={(event) => update({ valueNumber: Number(event.target.value) })}
        className={FIELD_INPUT_CLASS}
        aria-label="Numeric condition value"
      />
    );
  }
  return (
    <input
      value={
        condition.operator === "IN"
          ? (condition.values ?? []).join(",")
          : (condition.value ?? "")
      }
      onChange={(event) =>
        condition.operator === "IN"
          ? update({
              values: event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            })
          : update({ value: event.target.value })
      }
      className={FIELD_INPUT_CLASS}
      aria-label="Condition value"
      placeholder={valuePlaceholder(condition.type, condition.operator)}
    />
  );
}

function ActionValue({
  action,
  update,
  options
}: {
  action: AutomationAction;
  update: (patch: Partial<AutomationAction>) => void;
  options: {
    categories: Array<{ id: string; name: string }>;
    memberships: Array<{
      id: string;
      user: { firstName: string; lastName: string } | null;
      role: string;
    }>;
  };
}): JSX.Element {
  if (action.type === "SET_PRIORITY") {
    return (
      <Select
        value={action.priority ?? "NORMAL"}
        onChange={(value) => update({ priority: value as AutomationAction["priority"] })}
        label="Priority"
        options={[
          { value: "LOW", label: "Low" },
          { value: "NORMAL", label: "Normal" },
          { value: "HIGH", label: "High" },
          { value: "URGENT", label: "Urgent" }
        ]}
      />
    );
  }
  if (action.type === "SET_STATUS") {
    return (
      <Select
        value={action.status ?? "IN_REVIEW"}
        onChange={(value) => update({ status: value as AutomationAction["status"] })}
        label="Status"
        options={[
          { value: "NEW", label: "New" },
          { value: "IN_REVIEW", label: "In Review" },
          { value: "RESOLVED", label: "Resolved" },
          { value: "CLOSED", label: "Closed" }
        ]}
      />
    );
  }
  if (action.type === "SET_CATEGORY") {
    return (
      <Select
        value={action.categoryId ?? ""}
        onChange={(value) => update({ categoryId: value })}
        label="Category"
        options={[
          { value: "", label: "Choose category" },
          ...options.categories.map((category) => ({
            value: category.id,
            label: category.name
          }))
        ]}
      />
    );
  }
  if (action.type === "ASSIGN_TO_MEMBERSHIP") {
    return (
      <Select
        value={action.membershipId ?? ""}
        onChange={(value) => update({ membershipId: value })}
        label="Assignee"
        options={[
          { value: "", label: "Choose member" },
          ...options.memberships.map((membership) => ({
            value: membership.id,
            label: `${membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : "Member"} (${label(membership.role)})`
          }))
        ]}
      />
    );
  }
  return (
    <span className="flex h-11 items-center rounded-md border border-app-border px-3 text-sm font-semibold text-app-text-muted">
      No target
    </span>
  );
}

function ExecutionHistory({
  query
}: {
  query: {
    data?: AutomationExecutionsResponse;
    isLoading: boolean;
    error: unknown;
  };
}): JSX.Element {
  const executions = query.data?.items ?? [];
  return (
    <WorkspacePanel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black">Execution history</h2>
          <p className="mt-1 text-sm font-semibold text-app-text-muted">
            Server-paginated audit trail for rule runs.
          </p>
        </div>
        <SlidersHorizontal className="h-5 w-5 text-app-text-muted" />
      </div>
      {query.isLoading ? <Skeleton label="Loading executions" /> : null}
      {query.error ? (
        <ErrorState message={normalizeApiError(query.error).message} />
      ) : null}
      {!query.isLoading && !query.error && executions.length === 0 ? (
        <EmptyState
          title="No executions yet"
          description="Automation execution history will appear after matching events or manual runs."
        />
      ) : null}
      {executions.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {executions.map((execution) => (
            <article
              key={execution.id}
              className="rounded-xl bg-app-surface-muted/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-app-text">
                    {execution.rule?.name ?? "Archived rule"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-app-text-muted">
                    {label(execution.trigger)} · {formatDate(execution.createdAt)}
                  </p>
                </div>
                <ExecutionStatusBadge status={execution.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-black text-emerald-600 dark:text-emerald-300">
                    {execution.actionsSucceeded}
                  </p>
                  <p className="font-semibold text-app-text-muted">Completed</p>
                </div>
                <div>
                  <p className="font-black text-amber-600 dark:text-amber-300">
                    {execution.actionsSkipped}
                  </p>
                  <p className="font-semibold text-app-text-muted">Skipped</p>
                </div>
                <div>
                  <p className="font-black text-red-600 dark:text-red-300">
                    {execution.actionsFailed}
                  </p>
                  <p className="font-semibold text-app-text-muted">Failed</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </WorkspacePanel>
  );
}

function Select({
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
      className="min-w-0"
      triggerClassName="h-11"
    />
  );
}

function Field({
  label: fieldLabel,
  children
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="block text-sm font-bold text-app-text">
      <span>{fieldLabel}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SmallButton({
  children,
  onClick,
  disabled
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function IconButton({
  label: ariaLabel,
  children,
  onClick
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border hover:bg-app-surface-muted"
    >
      {children}
    </button>
  );
}

function RowControls({
  index,
  max,
  onMove,
  onRemove,
  label: itemLabel
}: {
  index: number;
  max: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  label: string;
}): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1 self-end">
      <IconButton label={`Move ${itemLabel} up`} onClick={() => onMove(-1)}>
        <ArrowUp className={`h-4 w-4 ${index === 0 ? "opacity-30" : ""}`} />
      </IconButton>
      <IconButton label={`Move ${itemLabel} down`} onClick={() => onMove(1)}>
        <ArrowDown className={`h-4 w-4 ${index === max - 1 ? "opacity-30" : ""}`} />
      </IconButton>
      <IconButton label={`Remove ${itemLabel}`} onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

function RuleStatusBadge({ status }: { status: AutomationRuleStatus }): JSX.Element {
  const tone =
    status === "ACTIVE"
      ? "success"
      : status === "PAUSED"
        ? "warning"
        : status === "ARCHIVED"
          ? "danger"
          : "info";
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ring-1 ${badgeClass(tone)}`}
    >
      {label(status)}
    </span>
  );
}

function ExecutionStatusBadge({
  status
}: {
  status: AutomationExecutionStatus;
}): JSX.Element {
  const tone =
    status === "SUCCESS"
      ? "success"
      : status === "FAILED"
        ? "danger"
        : status === "PARTIAL"
          ? "warning"
          : "info";
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ring-1 ${badgeClass(tone)}`}
    >
      {label(status)}
    </span>
  );
}

function ResultPanel({
  title,
  tone,
  lines
}: {
  title: string;
  tone: "success" | "info" | "danger";
  lines: string[];
}): JSX.Element {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "danger" ? XCircle : SlidersHorizontal;
  return (
    <div
      className={`rounded-lg border p-3 text-sm font-semibold ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100" : tone === "danger" ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100" : "border-app-border bg-app-surface-muted text-app-text"}`}
    >
      <div className="flex items-center gap-2 font-black">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <ul className="mt-2 space-y-1">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
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
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
      role="alert"
    >
      {message}
    </div>
  );
}

function Skeleton({ label: ariaLabel }: { label: string }): JSX.Element {
  return (
    <div
      className="mt-4 h-36 animate-pulse rounded-lg bg-app-surface-muted"
      aria-label={ariaLabel}
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
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm font-semibold text-app-text-muted">{description}</p>
      </section>
    </main>
  );
}

function label(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function feedbackOptionLabel(feedback: FeedbackListItem): string {
  const title = feedback.title?.trim() || feedback.messagePreview || "Untitled feedback";
  const trimmedTitle = title.length > 52 ? `${title.slice(0, 49)}...` : title;
  const customer = feedback.customer.name?.trim() || "Anonymous";
  const rating = feedback.rating === null ? "No rating" : `${feedback.rating}/5`;
  return `${trimmedTitle} - ${customer} - ${rating} - ${feedback.branch.name}`;
}

function badgeClass(tone: "success" | "warning" | "danger" | "info"): string {
  if (tone === "success")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/70";
  if (tone === "warning")
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900/70";
  if (tone === "danger")
    return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900/70";
  return "bg-app-primary-soft text-app-primary ring-app-primary/25 dark:text-app-text";
}

function ruleToBuilder(rule: AutomationRule): BuilderState {
  return normalizeBuilderForSubmit({
    name: rule.name,
    description: rule.description ?? "",
    trigger: rule.trigger,
    branchScope: rule.branchScope,
    branchIds: rule.branchIds,
    matchMode: rule.matchMode,
    stopProcessingAfterMatch: rule.stopProcessingAfterMatch,
    conditions: rule.conditions,
    actions: rule.actions
  });
}

function operatorsFor(type: AutomationConditionType): AutomationConditionOperator[] {
  if (type === "BRANCH" || type === "CHANNEL") return ["EQUALS", "IN"];
  if (type === "RATING")
    return [
      "EQUALS",
      "GREATER_THAN_OR_EQUAL",
      "LESS_THAN_OR_EQUAL",
      "IS_EMPTY",
      "IS_NOT_EMPTY"
    ];
  if (type === "CATEGORY" || type === "AI_SUGGESTED_CATEGORY")
    return ["EQUALS", "IN", "IS_EMPTY", "IS_NOT_EMPTY"];
  if (type === "SENTIMENT_CONFIDENCE" || type === "AI_CATEGORY_CONFIDENCE")
    return ["GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"];
  if (type === "ASSIGNMENT_STATE" || type === "CUSTOMER_LINK_STATE") return ["EQUALS"];
  return ["EQUALS", "IN"];
}

function defaultActionFor(type: AutomationActionType): AutomationAction {
  if (type === "SET_PRIORITY")
    return {
      type,
      priority: "URGENT",
      categoryId: null,
      membershipId: null,
      status: null
    };
  if (type === "SET_STATUS")
    return {
      type,
      priority: null,
      categoryId: null,
      membershipId: null,
      status: "IN_REVIEW"
    };
  if (type === "SET_CATEGORY")
    return { type, priority: null, categoryId: "", membershipId: null, status: null };
  if (type === "ASSIGN_TO_MEMBERSHIP")
    return { type, priority: null, categoryId: null, membershipId: "", status: null };
  return { type, priority: null, categoryId: null, membershipId: null, status: null };
}

function defaultConditionFor(type: AutomationConditionType): AutomationCondition {
  const base = {
    type,
    value: null,
    values: [],
    valueNumber: null,
    branchId: null,
    categoryId: null
  };
  if (type === "RATING")
    return {
      ...base,
      operator: "LESS_THAN_OR_EQUAL",
      valueNumber: 2
    };
  if (type === "BRANCH")
    return {
      ...base,
      operator: "EQUALS",
      value: "",
      branchId: ""
    };
  if (type === "CATEGORY" || type === "AI_SUGGESTED_CATEGORY")
    return {
      ...base,
      operator: "EQUALS",
      value: "",
      categoryId: ""
    };
  if (type === "SENTIMENT_CONFIDENCE" || type === "AI_CATEGORY_CONFIDENCE")
    return {
      ...base,
      operator: "GREATER_THAN_OR_EQUAL",
      valueNumber: 0.75
    };
  return {
    ...base,
    operator: "EQUALS",
    value: ""
  };
}

function normalizeBuilderForSubmit(builder: BuilderState): BuilderState {
  return {
    ...builder,
    description: builder.description?.trim() ?? "",
    branchIds:
      builder.branchScope === "SELECTED_BRANCHES"
        ? [...new Set(builder.branchIds.map((id) => id.trim()).filter(Boolean))]
        : [],
    conditions: builder.conditions.map(normalizeConditionForSubmit),
    actions: builder.actions.map(normalizeActionForSubmit)
  };
}

function normalizeConditionForSubmit(
  condition: AutomationCondition
): AutomationCondition {
  const usesNumber =
    condition.operator === "GREATER_THAN_OR_EQUAL" ||
    condition.operator === "LESS_THAN_OR_EQUAL";
  const usesValues = condition.operator === "IN";
  const usesNoValue =
    condition.operator === "IS_EMPTY" || condition.operator === "IS_NOT_EMPTY";
  const usesBranch = condition.type === "BRANCH" && !usesValues && !usesNoValue;
  const usesCategory =
    (condition.type === "CATEGORY" || condition.type === "AI_SUGGESTED_CATEGORY") &&
    !usesValues &&
    !usesNoValue;

  return {
    type: condition.type,
    operator: condition.operator,
    value:
      !usesNumber && !usesValues && !usesNoValue && !usesBranch && !usesCategory
        ? normalizeOptionalText(condition.value)
        : null,
    values: usesValues
      ? [
          ...new Set(
            (condition.values ?? []).map((value) => value.trim()).filter(Boolean)
          )
        ]
      : [],
    valueNumber: usesNumber ? (condition.valueNumber ?? null) : null,
    branchId: usesBranch
      ? normalizeOptionalText(condition.branchId ?? condition.value)
      : null,
    categoryId: usesCategory
      ? normalizeOptionalText(condition.categoryId ?? condition.value)
      : null
  };
}

function normalizeActionForSubmit(action: AutomationAction): AutomationAction {
  return {
    type: action.type,
    priority: action.type === "SET_PRIORITY" ? (action.priority ?? null) : null,
    categoryId:
      action.type === "SET_CATEGORY" ? normalizeOptionalText(action.categoryId) : null,
    membershipId:
      action.type === "ASSIGN_TO_MEMBERSHIP"
        ? normalizeOptionalText(action.membershipId)
        : null,
    status: action.type === "SET_STATUS" ? (action.status ?? null) : null
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function valuePlaceholder(
  type: AutomationConditionType,
  operator: AutomationConditionOperator
): string {
  if (operator === "IN") return "Comma-separated values";
  if (type === "CHANNEL") return "MANUAL, PUBLIC_FORM, or QR_CODE";
  if (type === "STATUS") return "NEW";
  if (type === "PRIORITY") return "URGENT";
  if (type === "SENTIMENT") return "NEGATIVE";
  if (type === "ASSIGNMENT_STATE") return "ASSIGNED or UNASSIGNED";
  if (type === "CUSTOMER_LINK_STATE") return "LINKED or UNLINKED";
  return "Value";
}

function validateBuilder(builder: BuilderState): string[] {
  const errors: string[] = [];
  if (!builder.name.trim()) errors.push("Rule name is required.");
  if (builder.branchScope === "SELECTED_BRANCHES" && builder.branchIds.length === 0)
    errors.push("Select at least one branch.");
  if (builder.conditions.length === 0)
    errors.push("At least one condition is required before activation.");
  if (builder.actions.length === 0)
    errors.push("At least one action is required before activation.");
  const actionTypes = builder.actions.map((action) => action.type);
  if (actionTypes.filter((type) => type === "SET_PRIORITY").length > 1)
    errors.push("Only one set-priority action is allowed.");
  if (actionTypes.filter((type) => type === "SET_CATEGORY").length > 1)
    errors.push("Only one set-category action is allowed.");
  if (actionTypes.filter((type) => type === "SET_STATUS").length > 1)
    errors.push("Only one set-status action is allowed.");
  if (
    actionTypes.filter((type) => type === "ASSIGN_TO_MEMBERSHIP" || type === "UNASSIGN")
      .length > 1
  )
    errors.push("Only one assignment-changing action is allowed.");
  if (
    builder.trigger === "FEEDBACK_CREATED" &&
    builder.conditions.some(
      (condition) =>
        condition.type.startsWith("AI_") ||
        condition.type === "SENTIMENT" ||
        condition.type === "SENTIMENT_CONFIDENCE"
    )
  )
    errors.push("AI conditions require the AI analysis completed trigger.");
  return errors;
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}
