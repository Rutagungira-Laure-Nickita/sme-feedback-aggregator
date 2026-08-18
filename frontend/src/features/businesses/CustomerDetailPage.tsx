import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit,
  History,
  Inbox,
  Mail,
  Phone,
  RefreshCw,
  Star
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { AppDatePickerField } from "../../components/ui/date-picker.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { fetchBranches, fetchBusiness, fetchMyBusinesses } from "./api/businessApi.js";
import {
  EmptyState,
  InitialsBadge,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import {
  archiveCustomer,
  fetchCustomer,
  fetchCustomerActivity,
  fetchCustomerFeedback,
  reactivateCustomer,
  updateCustomer,
  type CustomerStatus,
  type CustomerActivityItem,
  type CustomerFeedbackItem
} from "./customerApi.js";
import type { MyBusiness } from "./types.js";
import { CustomerFormModal } from "./CustomerFormModal.js";
import {
  getChannelLabel,
  getPriorityLabel,
  getStatusLabel
} from "./feedbackInboxLabels.js";

function formatDate(value: string | null): string {
  if (!value) return "No feedback yet";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function ratingText(value: number | null): string {
  return value === null ? "No rating" : value.toFixed(1);
}

function StatusPill({ status }: { status: CustomerStatus }): JSX.Element {
  const className =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
      : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700";

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${className}`}
    >
      {status === "ACTIVE" ? "Active" : "Archived"}
    </span>
  );
}

export function CustomerDetailPage(): JSX.Element {
  const { businessId = "", customerId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const feedbackPage = Number(searchParams.get("feedbackPage") ?? "1");
  const feedbackSearch = searchParams.get("feedbackSearch") ?? "";
  const feedbackBranchId = searchParams.get("feedbackBranchId") ?? "";
  const feedbackChannel = searchParams.get("feedbackChannel") ?? "";
  const feedbackStatus = searchParams.get("feedbackStatus") ?? "";
  const feedbackRatingMin = searchParams.get("feedbackRatingMin") ?? "";
  const feedbackRatingMax = searchParams.get("feedbackRatingMax") ?? "";
  const feedbackDateFrom = searchParams.get("feedbackDateFrom") ?? "";
  const feedbackDateTo = searchParams.get("feedbackDateTo") ?? "";
  const feedbackSort = searchParams.get("feedbackSort") ?? "newest";

  const businessesQuery = useQuery({
    queryKey: ["businesses", "mine"],
    queryFn: () => fetchMyBusinesses({ pageSize: 100 })
  });
  const businessQuery = useQuery({
    queryKey: ["businesses", businessId],
    queryFn: () => fetchBusiness(businessId),
    enabled: Boolean(businessId)
  });
  const branchesQuery = useQuery({
    queryKey: ["businesses", businessId, "branches", "customer-history-filters"],
    queryFn: () => fetchBranches(businessId),
    enabled: Boolean(businessId)
  });
  const customerQuery = useQuery({
    queryKey: ["businesses", businessId, "customers", customerId],
    queryFn: () => fetchCustomer(businessId, customerId),
    enabled: Boolean(businessId && customerId)
  });
  const feedbackQuery = useQuery({
    queryKey: [
      "businesses",
      businessId,
      "customers",
      customerId,
      "feedback",
      {
        feedbackPage,
        feedbackSearch,
        feedbackBranchId,
        feedbackChannel,
        feedbackStatus,
        feedbackRatingMin,
        feedbackRatingMax,
        feedbackDateFrom,
        feedbackDateTo,
        feedbackSort
      }
    ],
    queryFn: () =>
      fetchCustomerFeedback(businessId, customerId, {
        page: feedbackPage,
        pageSize: 10,
        search: feedbackSearch || undefined,
        branchId: feedbackBranchId || undefined,
        channel: feedbackChannel ? (feedbackChannel as never) : undefined,
        status: feedbackStatus ? (feedbackStatus as never) : undefined,
        ratingMin: feedbackRatingMin ? Number(feedbackRatingMin) : undefined,
        ratingMax: feedbackRatingMax ? Number(feedbackRatingMax) : undefined,
        dateFrom: feedbackDateFrom || undefined,
        dateTo: feedbackDateTo || undefined,
        sort: feedbackSort as "newest" | "oldest"
      }),
    enabled: Boolean(businessId && customerId)
  });
  const activityQuery = useQuery({
    queryKey: ["businesses", businessId, "customers", customerId, "activity"],
    queryFn: () => fetchCustomerActivity(businessId, customerId),
    enabled: Boolean(customerQuery.data?.permissions.canViewActivity)
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      archiveCustomer(
        businessId,
        customerId,
        customerQuery.data?.customer.updatedAt ?? ""
      ),
    onSuccess: () => invalidateCustomer(queryClient, businessId, customerId)
  });
  const reactivateMutation = useMutation({
    mutationFn: () =>
      reactivateCustomer(
        businessId,
        customerId,
        customerQuery.data?.customer.updatedAt ?? ""
      ),
    onSuccess: () => invalidateCustomer(queryClient, businessId, customerId)
  });

  if (businessesQuery.isLoading || businessQuery.isLoading || customerQuery.isLoading) {
    return <WorkspaceLoading />;
  }

  const businesses = businessesQuery.data?.businesses ?? [];
  const activeBusiness =
    businesses.find((item: MyBusiness) => item.id === businessId) ?? businesses[0];
  const customerData = customerQuery.data;

  if (!activeBusiness || !businessQuery.data || !customerData) {
    return (
      <main className="min-h-screen bg-app-background p-6 text-app-text">
        <div className="mx-auto max-w-[900px] rounded-lg border border-app-border bg-app-surface p-8">
          <EmptyState
            title="Customer not found"
            description={
              customerQuery.error
                ? normalizeApiError(customerQuery.error).message
                : "This customer could not be loaded."
            }
            action={
              <WorkspaceButton
                onClick={() => navigate(`/business/${businessId}/customers`)}
              >
                Back to customers
              </WorkspaceButton>
            }
          />
        </div>
      </main>
    );
  }

  const { customer, permissions } = customerData;
  const feedbackItems = feedbackQuery.data?.items ?? [];
  const feedbackPagination = feedbackQuery.data?.pagination;
  const activityItems = activityQuery.data?.items ?? [];
  const isArchived = customer.status === "ARCHIVED";

  return (
    <WorkspaceShell
      title={customer.displayName}
      subtitle="Customer profile, branch-safe summary, feedback history, and audit activity."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        <div className="flex flex-wrap gap-2">
          <WorkspaceButton to={`/business/${businessId}/customers`} tone="secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Customers
          </WorkspaceButton>
          <WorkspaceButton
            tone="secondary"
            onClick={() => {
              void customerQuery.refetch();
              void feedbackQuery.refetch();
              void activityQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </WorkspaceButton>
        </div>
      }
    >
      {isArchived ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          This customer is archived. Linked feedback remains visible, but new links are
          blocked until reactivation.
        </div>
      ) : null}

      <WorkspacePanel className="overflow-hidden p-0 sm:p-0">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-5 text-white lg:flex-row lg:items-start lg:justify-between sm:p-7">
          <div className="flex min-w-0 items-start gap-4">
            <InitialsBadge name={customer.displayName} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-2xl font-black text-white">
                  {customer.displayName}
                </h2>
                <StatusPill status={customer.status} />
              </div>
              <p className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-indigo-100">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                {customer.email ?? "No email"}
              </p>
              <p className="mt-1 flex items-center gap-2 break-all text-sm font-semibold text-indigo-100">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                {customer.phone ?? "No phone"}
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-indigo-200">
                Created {formatDate(customer.createdAt)} - Updated{" "}
                {formatDate(customer.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {permissions.canEdit && !isArchived ? (
              <WorkspaceButton tone="secondary" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit
              </WorkspaceButton>
            ) : null}
            {permissions.canArchive && !isArchived ? (
              <WorkspaceButton
                tone="danger"
                onClick={() => {
                  if (
                    globalThis.confirm(
                      "Archive this customer? Linked feedback and history remain visible, but new links are blocked until reactivation."
                    )
                  ) {
                    archiveMutation.mutate();
                  }
                }}
                disabled={archiveMutation.isPending}
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                Archive
              </WorkspaceButton>
            ) : null}
            {permissions.canReactivate && isArchived ? (
              <WorkspaceButton
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Reactivate
              </WorkspaceButton>
            ) : null}
          </div>
        </div>
      </WorkspacePanel>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric label="Feedback" value={customer.aggregates.feedbackCount} />
        <Metric
          label="Average rating"
          value={ratingText(customer.aggregates.averageRating)}
        />
        <Metric
          label="Latest feedback"
          value={formatDate(customer.aggregates.latestFeedbackAt)}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <WorkspacePanel>
          <h2 className="text-lg font-black text-app-text">Feedback history</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <input
              value={feedbackSearch}
              onChange={(event) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackSearch: event.target.value,
                  feedbackPage: "1"
                })
              }
              placeholder="Search feedback..."
              className="h-10 rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
            />
            <AppSelectField
              value={feedbackBranchId}
              onValueChange={(value) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackBranchId: value,
                  feedbackPage: "1"
                })
              }
              options={[
                { value: "", label: "All branches" },
                ...(branchesQuery.data?.branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name
                })) ?? [])
              ]}
              ariaLabel="Filter feedback history by branch"
            />
            <AppSelectField
              value={feedbackStatus}
              onValueChange={(value) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackStatus: value,
                  feedbackPage: "1"
                })
              }
              options={[
                { value: "", label: "All statuses" },
                { value: "NEW", label: "New" },
                { value: "IN_REVIEW", label: "In Review" },
                { value: "RESOLVED", label: "Resolved" },
                { value: "CLOSED", label: "Closed" }
              ]}
              ariaLabel="Filter feedback history by status"
            />
            <AppSelectField
              value={feedbackChannel}
              onValueChange={(value) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackChannel: value,
                  feedbackPage: "1"
                })
              }
              options={[
                { value: "", label: "All channels" },
                { value: "MANUAL", label: "Manual Entry" },
                { value: "PUBLIC_FORM", label: "Public Form" },
                { value: "QR_CODE", label: "QR Code" }
              ]}
              ariaLabel="Filter feedback history by channel"
            />
            <input
              type="number"
              min="1"
              max="5"
              value={feedbackRatingMin}
              onChange={(event) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackRatingMin: event.target.value,
                  feedbackPage: "1"
                })
              }
              placeholder="Rating min"
              className="h-10 rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
            />
            <input
              type="number"
              min="1"
              max="5"
              value={feedbackRatingMax}
              onChange={(event) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackRatingMax: event.target.value,
                  feedbackPage: "1"
                })
              }
              placeholder="Rating max"
              className="h-10 rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
            />
            <AppDatePickerField
              value={feedbackDateFrom}
              onValueChange={(value) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackDateFrom: value,
                  feedbackPage: "1"
                })
              }
              placeholder="Feedback from"
              ariaLabel="Feedback history date from"
            />
            <AppDatePickerField
              value={feedbackDateTo}
              onValueChange={(value) =>
                updateCustomerHistoryParams(searchParams, setSearchParams, {
                  feedbackDateTo: value,
                  feedbackPage: "1"
                })
              }
              placeholder="Feedback to"
              ariaLabel="Feedback history date to"
            />
          </div>
          {feedbackQuery.isLoading ? (
            <ListSkeleton />
          ) : feedbackItems.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
              title="No accessible feedback"
              description="This customer has no feedback visible to your branch access."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {feedbackItems.map((item) => (
                <FeedbackHistoryRow key={item.id} item={item} businessId={businessId} />
              ))}
              {feedbackPagination ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4 text-sm font-bold text-app-text-muted">
                  <span>Showing {feedbackPagination.totalItems} feedback records</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!feedbackPagination.hasPreviousPage}
                      onClick={() =>
                        updateCustomerHistoryParams(searchParams, setSearchParams, {
                          feedbackPage: String(feedbackPage - 1)
                        })
                      }
                      className="rounded-md border border-app-border px-3 py-2 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>
                      Page {feedbackPagination.page} of {feedbackPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={!feedbackPagination.hasNextPage}
                      onClick={() =>
                        updateCustomerHistoryParams(searchParams, setSearchParams, {
                          feedbackPage: String(feedbackPage + 1)
                        })
                      }
                      className="rounded-md border border-app-border px-3 py-2 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </WorkspacePanel>

        <div className="space-y-5">
          <WorkspacePanel>
            <h2 className="text-lg font-black text-app-text">Branch summary</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {customer.aggregates.branches.length > 0 ? (
                customer.aggregates.branches.map((branch) => (
                  <span
                    key={branch.id}
                    className="rounded-md bg-app-surface-muted px-2.5 py-1 text-xs font-black text-app-text-muted"
                  >
                    {branch.name} - {branch.count}
                  </span>
                ))
              ) : (
                <p className="text-sm font-semibold text-app-text-muted">
                  No accessible branch history.
                </p>
              )}
            </div>
          </WorkspacePanel>
          <WorkspacePanel>
            <h2 className="text-lg font-black text-app-text">Activity</h2>
            {!permissions.canViewActivity ? (
              <p className="mt-3 text-sm font-semibold text-app-text-muted">
                Activity is available to owners and admins.
              </p>
            ) : activityQuery.isLoading ? (
              <ListSkeleton />
            ) : activityItems.length === 0 ? (
              <p className="mt-3 text-sm font-semibold text-app-text-muted">
                No customer activity yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {activityItems.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </WorkspacePanel>
        </div>
      </div>

      {editOpen ? (
        <CustomerFormModal
          title="Edit customer"
          initialValues={{
            displayName: customer.displayName,
            firstName: customer.firstName ?? "",
            lastName: customer.lastName ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? ""
          }}
          onClose={() => setEditOpen(false)}
          onSubmit={async (values) => {
            await updateCustomer(businessId, customerId, {
              ...values,
              expectedUpdatedAt: customer.updatedAt
            });
            await invalidateCustomer(queryClient, businessId, customerId);
            setEditOpen(false);
          }}
        />
      ) : null}
    </WorkspaceShell>
  );
}

function Metric({
  label,
  value
}: {
  label: string;
  value: string | number;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4 dark:bg-app-surface-muted/50">
      <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-app-text">{value}</p>
    </div>
  );
}

function FeedbackHistoryRow({
  item,
  businessId
}: {
  item: CustomerFeedbackItem;
  businessId: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted/40 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-app-text">
            {item.title ?? item.messagePreview}
          </p>
          <p className="mt-1 break-words text-xs font-semibold text-app-text-muted">
            {item.title ? item.messagePreview : null}
          </p>
          <p className="mt-2 text-xs font-semibold text-app-text-muted">
            Snapshot: {item.customerSnapshot.name ?? "No name"} -{" "}
            {item.customerSnapshot.email ?? "No email"} -{" "}
            {item.customerSnapshot.phone ?? "No phone"}
          </p>
        </div>
        <Link
          to={`/business/${businessId}/feedback?feedbackId=${item.id}`}
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-app-border px-3 py-2 text-xs font-black text-app-primary hover:bg-app-primary-soft"
        >
          Open Feedback
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-app-text-muted">
        <span>{getChannelLabel(item.channel)}</span>
        <span>{item.branch.name}</span>
        <span>{getStatusLabel(item.status)}</span>
        <span>{getPriorityLabel(item.priority)}</span>
        <span className="inline-flex items-center gap-1">
          {item.rating ?? "No rating"}
          {item.rating ? (
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          ) : null}
        </span>
        <span>{formatDate(item.receivedAt)}</span>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: CustomerActivityItem }): JSX.Element {
  return (
    <div className="rounded-md border border-app-border bg-app-surface-muted/40 p-3">
      <div className="flex items-start gap-3">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-app-text">
            {item.type.replace(/_/g, " ")}
          </p>
          <p className="mt-1 break-words text-xs font-semibold text-app-text-muted">
            {item.actor?.name ?? "System"} - {formatDate(item.createdAt)}
          </p>
          {item.fieldName ? (
            <p className="mt-1 break-words text-xs text-app-text-muted">
              {item.fieldName}: {item.fromValue ?? "empty"} -&gt;{" "}
              {item.toValue ?? "empty"}
            </p>
          ) : null}
          {item.feedbackId ? (
            <p className="mt-1 text-xs text-app-text-muted">
              Feedback reference recorded
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function invalidateCustomer(
  queryClient: ReturnType<typeof useQueryClient>,
  businessId: string,
  customerId: string
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["businesses", businessId, "customers"]
    }),
    queryClient.invalidateQueries({
      queryKey: ["businesses", businessId, "customers", customerId]
    })
  ]);
}

function updateCustomerHistoryParams(
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void,
  updates: Record<string, string | undefined>
): void {
  const next = new URLSearchParams(searchParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (!value || (key === "feedbackPage" && value === "1")) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  });
  setSearchParams(next);
}

function ListSkeleton(): JSX.Element {
  return (
    <div className="mt-4 animate-pulse space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-20 rounded-lg bg-app-surface-muted" />
      ))}
    </div>
  );
}

function WorkspaceLoading(): JSX.Element {
  return (
    <main className="min-h-screen bg-app-background p-6">
      <div className="mx-auto h-[calc(100vh-3rem)] max-w-[1380px] animate-pulse rounded-[1.25rem] border border-app-border bg-app-surface p-10">
        <Clock className="h-8 w-8 text-app-text-muted" aria-hidden="true" />
        <div className="mt-4 h-8 w-48 rounded bg-app-surface-muted" />
        <div className="mt-4 h-4 w-80 rounded bg-app-surface-muted" />
      </div>
    </main>
  );
}
