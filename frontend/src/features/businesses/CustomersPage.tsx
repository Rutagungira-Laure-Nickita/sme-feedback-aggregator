import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { AppDatePickerField } from "../../components/ui/date-picker.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { CollectionViewToggle } from "../../components/collection-view/CollectionViewToggle.js";
import { useCollectionView } from "../../components/collection-view/useCollectionView.js";
import { fetchBranches, fetchBusiness, fetchMyBusinesses } from "./api/businessApi.js";
import { CustomerFormModal } from "./CustomerFormModal.js";
import {
  EmptyState,
  InitialsBadge,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import {
  createCustomer,
  fetchCustomers,
  type CustomerStatus,
  type CustomerSummary
} from "./customerApi.js";
import type { MyBusiness } from "./types.js";

function formatDate(value: string | null): string {
  if (!value) return "No feedback yet";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function statusClass(status: CustomerStatus): string {
  return status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
    : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700";
}

function ratingText(value: number | null): string {
  return value === null ? "No rating" : value.toFixed(1);
}

export function CustomersPage(): JSX.Element {
  const { businessId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const branchId = searchParams.get("branchId") ?? "";
  const channel = searchParams.get("channel") ?? "";
  const ratingMin = searchParams.get("ratingMin") ?? "";
  const ratingMax = searchParams.get("ratingMax") ?? "";
  const latestFeedbackFrom = searchParams.get("latestFeedbackFrom") ?? "";
  const latestFeedbackTo = searchParams.get("latestFeedbackTo") ?? "";
  const contactState = searchParams.get("contactState") ?? "";
  const sort = searchParams.get("sort") ?? "latestFeedback";

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
    queryKey: ["businesses", businessId, "branches"],
    queryFn: () => fetchBranches(businessId),
    enabled: Boolean(businessId)
  });
  const customersQuery = useQuery({
    queryKey: [
      "businesses",
      businessId,
      "customers",
      {
        page,
        pageSize,
        search,
        status,
        branchId,
        channel,
        ratingMin,
        ratingMax,
        latestFeedbackFrom,
        latestFeedbackTo,
        contactState,
        sort
      }
    ],
    queryFn: () =>
      fetchCustomers(businessId, {
        page,
        pageSize,
        search: search || undefined,
        status: (status as CustomerStatus) || undefined,
        branchId: branchId || undefined,
        channel: channel ? (channel as never) : undefined,
        ratingMin: ratingMin ? Number(ratingMin) : undefined,
        ratingMax: ratingMax ? Number(ratingMax) : undefined,
        latestFeedbackFrom: latestFeedbackFrom || undefined,
        latestFeedbackTo: latestFeedbackTo || undefined,
        contactState: contactState ? (contactState as never) : undefined,
        sort: sort as "latestFeedback" | "updated" | "name"
      }),
    enabled: Boolean(businessId)
  });

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || (key === "page" && value === "1")) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  useEffect(() => {
    const totalPages = customersQuery.data?.pagination.totalPages;
    if (totalPages && page > totalPages) {
      updateParams({ page: String(totalPages) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customersQuery.data?.pagination.totalPages, page]);

  const businesses = businessesQuery.data?.businesses ?? [];
  const activeBusiness =
    businesses.find((item: MyBusiness) => item.id === businessId) ?? businesses[0];
  const businessData = businessQuery.data;
  const customers = customersQuery.data?.items ?? [];
  const collectionView = useCollectionView(
    `business-${businessId}-customers`,
    customers.length
  );

  if (businessesQuery.isLoading || businessQuery.isLoading || branchesQuery.isLoading) {
    return <WorkspaceLoading />;
  }

  if (!activeBusiness || !businessData) {
    return <WorkspaceError message="This business could not be loaded." />;
  }

  const pagination = customersQuery.data?.pagination;
  const permissions = customersQuery.data?.permissions;
  const branchOptions = [
    { value: "", label: "All branches" },
    ...(branchesQuery.data?.branches.map((branch) => ({
      value: branch.id,
      label: branch.name
    })) ?? [])
  ];
  const advancedFilterCount = [
    channel,
    contactState,
    ratingMin || ratingMax ? "ratingRange" : "",
    latestFeedbackFrom || latestFeedbackTo ? "latestFeedbackRange" : ""
  ].filter(Boolean).length;
  const hasFilters = Boolean(
    search ||
    status ||
    branchId ||
    channel ||
    ratingMin ||
    ratingMax ||
    latestFeedbackFrom ||
    latestFeedbackTo ||
    contactState ||
    sort !== "latestFeedback"
  );
  const clearFilters = () => setSearchParams(new URLSearchParams());

  return (
    <WorkspaceShell
      title="Customers"
      subtitle="Manage customer profiles and branch-safe feedback history."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        <div className="flex flex-row flex-wrap gap-2 sm:flex-nowrap">
          <WorkspaceButton
            onClick={() => {
              void customersQuery.refetch();
            }}
            tone="secondary"
          >
            <RefreshCw
              className={`h-4 w-4 ${customersQuery.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </WorkspaceButton>
          {permissions?.canCreate ? (
            <WorkspaceButton onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Customer
            </WorkspaceButton>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Visible customers" value={pagination?.totalItems ?? 0} />
        <Stat label="Active view" value={status || "ALL"} />
        <Stat label="Branches loaded" value={branchesQuery.data?.branches.length ?? 0} />
      </div>

      <WorkspacePanel className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-app-text-muted">
            {pagination?.totalItems ?? customers.length} customers
          </p>
          <CollectionViewToggle
            view={collectionView.view}
            onChange={collectionView.setView}
            label="Customer view"
          />
        </div>
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="customer-search"
                className="mb-1.5 block text-xs font-bold text-app-text-muted"
              >
                Search
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
                  aria-hidden="true"
                />
                <input
                  id="customer-search"
                  value={search}
                  onChange={(event) =>
                    updateParams({ search: event.target.value, page: "1" })
                  }
                  placeholder="Search customers by name, email, or phone"
                  className="h-10 w-full rounded-md border border-app-border bg-app-surface-muted pl-9 pr-3 text-sm font-medium outline-none transition placeholder:text-app-text-muted/70 focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
                />
              </div>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:w-[620px]">
              <AppSelectField
                label="Status"
                value={status}
                onValueChange={(value) => updateParams({ status: value, page: "1" })}
                options={[
                  { value: "", label: "All statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "ARCHIVED", label: "Archived" }
                ]}
                ariaLabel="Filter customers by status"
                triggerClassName="h-10"
              />
              <AppSelectField
                label="Branch"
                value={branchId}
                onValueChange={(value) => updateParams({ branchId: value, page: "1" })}
                options={branchOptions}
                ariaLabel="Filter customers by branch feedback"
                triggerClassName="h-10"
              />
              <AppSelectField
                label="Sort"
                value={sort}
                onValueChange={(value) => updateParams({ sort: value, page: "1" })}
                options={[
                  { value: "latestFeedback", label: "Latest feedback" },
                  { value: "updated", label: "Recently updated" },
                  { value: "name", label: "Name" }
                ]}
                ariaLabel="Sort customers"
                triggerClassName="h-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-focus/30 sm:flex-none"
                    aria-label="Open advanced customer filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    <span>Filters</span>
                    {advancedFilterCount > 0 ? (
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-app-primary px-1.5 text-[11px] font-black text-white">
                        {advancedFilterCount}
                      </span>
                    ) : null}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-h-[min(72vh,640px)] w-[min(calc(100vw-2rem),760px)] overflow-y-auto">
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-black text-app-text">
                          Advanced filters
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-app-text-muted">
                          Refine customer history without crowding this workspace.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-black text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Clear
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AppSelectField
                        label="Channel"
                        value={channel}
                        onValueChange={(value) =>
                          updateParams({ channel: value, page: "1" })
                        }
                        options={[
                          { value: "", label: "All channels" },
                          { value: "MANUAL", label: "Manual Entry" },
                          { value: "PUBLIC_FORM", label: "Public Form" },
                          { value: "QR_CODE", label: "QR Code" }
                        ]}
                        ariaLabel="Filter customers by feedback channel"
                      />
                      <AppSelectField
                        label="Contact"
                        value={contactState}
                        onValueChange={(value) =>
                          updateParams({ contactState: value, page: "1" })
                        }
                        options={[
                          { value: "", label: "Any contact" },
                          { value: "has_email", label: "Has email" },
                          { value: "has_phone", label: "Has phone" },
                          { value: "missing_email", label: "No email" },
                          { value: "missing_phone", label: "No phone" }
                        ]}
                        ariaLabel="Filter customers by contact state"
                      />
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs font-bold text-app-text-muted">
                          Rating min
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={ratingMin}
                          onChange={(event) =>
                            updateParams({ ratingMin: event.target.value, page: "1" })
                          }
                          placeholder="Minimum rating"
                          className="h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
                          aria-label="Minimum customer feedback rating"
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs font-bold text-app-text-muted">
                          Rating max
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={ratingMax}
                          onChange={(event) =>
                            updateParams({ ratingMax: event.target.value, page: "1" })
                          }
                          placeholder="Maximum rating"
                          className="h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
                          aria-label="Maximum customer feedback rating"
                        />
                      </label>
                      <AppDatePickerField
                        label="Latest from"
                        value={latestFeedbackFrom}
                        onValueChange={(value) =>
                          updateParams({ latestFeedbackFrom: value, page: "1" })
                        }
                        placeholder="Start date"
                        ariaLabel="Latest feedback from"
                        triggerClassName="h-10"
                      />
                      <AppDatePickerField
                        label="Latest to"
                        value={latestFeedbackTo}
                        onValueChange={(value) =>
                          updateParams({ latestFeedbackTo: value, page: "1" })
                        }
                        placeholder="End date"
                        ariaLabel="Latest feedback to"
                        triggerClassName="h-10"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-bold text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/30"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          {customersQuery.isLoading ? (
            <ListSkeleton />
          ) : customersQuery.error ? (
            <EmptyState
              icon={<Archive className="h-6 w-6" aria-hidden="true" />}
              title="Customers could not be loaded."
              description={normalizeApiError(customersQuery.error).message}
              action={
                <WorkspaceButton
                  tone="secondary"
                  onClick={() => {
                    void customersQuery.refetch();
                  }}
                >
                  Retry
                </WorkspaceButton>
              }
            />
          ) : customers.length === 0 && hasFilters ? (
            <EmptyState
              icon={<Search className="h-6 w-6" aria-hidden="true" />}
              title="No customers found"
              description="Try adjusting your search or filters."
              action={
                <WorkspaceButton
                  tone="secondary"
                  onClick={() => setSearchParams(new URLSearchParams())}
                >
                  Clear filters
                </WorkspaceButton>
              }
            />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={<UserRound className="h-6 w-6" aria-hidden="true" />}
              title="No customers yet"
              description="Customer profiles appear here when created or linked from feedback."
              action={
                permissions?.canCreate ? (
                  <WorkspaceButton onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Customer
                  </WorkspaceButton>
                ) : null
              }
            />
          ) : (
            <>
              <div
                className={`${collectionView.view === "list" ? "hidden xl:block" : "hidden"} overflow-x-auto`}
              >
                <table className="min-w-[720px] w-full divide-y divide-app-border text-sm">
                  <thead>
                    <tr className="text-left text-xs font-black uppercase tracking-wide text-app-text-muted">
                      <th className="py-3 pr-4">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Feedback</th>
                      <th className="px-4 py-3">Avg rating</th>
                      <th className="px-4 py-3">Latest</th>
                      <th className="py-3 pl-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {customers.map((customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        businessId={businessId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                className={
                  collectionView.view === "grid"
                    ? "grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-3"
                    : "grid min-w-0 gap-3 xl:hidden"
                }
              >
                {customers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    businessId={businessId}
                  />
                ))}
              </div>
              {pagination ? (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  onPage={(nextPage) => updateParams({ page: String(nextPage) })}
                />
              ) : null}
            </>
          )}
        </div>
      </WorkspacePanel>

      {createOpen ? (
        <CustomerFormModal
          title="Create customer"
          onClose={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            await createCustomer(businessId, values);
            await queryClient.invalidateQueries({
              queryKey: ["businesses", businessId, "customers"]
            });
            setCreateOpen(false);
          }}
        />
      ) : null}
    </WorkspaceShell>
  );
}

function CustomerRow({
  customer,
  businessId
}: {
  customer: CustomerSummary;
  businessId: string;
}): JSX.Element {
  return (
    <tr className="align-top">
      <td className="py-4 pr-4">
        <div className="flex min-w-0 items-center gap-3">
          <InitialsBadge name={customer.displayName} />
          <div className="min-w-0">
            <p className="break-words font-black text-app-text">{customer.displayName}</p>
            <p className="text-xs font-semibold text-app-text-muted">
              Since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusPill status={customer.status} />
      </td>
      <td className="px-4 py-4 font-black">{customer.aggregates.feedbackCount}</td>
      <td className="px-4 py-4">
        <Rating value={customer.aggregates.averageRating} />
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-app-text-muted">
        {formatDate(customer.aggregates.latestFeedbackAt)}
      </td>
      <td className="py-4 pl-4 text-right">
        <Link
          to={`/business/${businessId}/customers/${customer.id}`}
          className="inline-flex rounded-md px-3 py-2 text-sm font-black text-app-primary hover:bg-app-primary-soft"
        >
          View
        </Link>
      </td>
    </tr>
  );
}

function CustomerCard({
  customer,
  businessId
}: {
  customer: CustomerSummary;
  businessId: string;
}): JSX.Element {
  return (
    <Link
      to={`/business/${businessId}/customers/${customer.id}`}
      className="group block overflow-hidden rounded-2xl border border-app-border/80 bg-app-surface shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-app-primary/45 hover:shadow-panel dark:bg-app-surface-muted/40"
    >
      <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-400" />
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <InitialsBadge name={customer.displayName} />
          <div className="min-w-0">
            <p className="break-words text-sm font-black text-app-text">
              {customer.displayName}
            </p>
            <p className="mt-1 text-xs font-semibold text-app-text-muted">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
        <StatusPill status={customer.status} />
      </div>
      <div className="grid grid-cols-3 border-t border-app-border/70 px-5 py-4 text-center">
        <MiniMetric label="Feedback" value={customer.aggregates.feedbackCount} />
        <MiniMetric
          label="Avg rating"
          value={ratingText(customer.aggregates.averageRating)}
        />
        <MiniMetric
          label="Latest"
          value={formatDate(customer.aggregates.latestFeedbackAt)}
        />
      </div>
      <div className="flex items-center justify-between px-5 pb-5 text-xs font-bold text-app-text-muted">
        <span>{customer.aggregates.branches[0]?.name ?? "No branch history"}</span>
        <span className="text-app-primary transition group-hover:translate-x-0.5">
          View profile →
        </span>
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: CustomerStatus }): JSX.Element {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${statusClass(status)}`}
    >
      {status === "ACTIVE" ? "Active" : "Archived"}
    </span>
  );
}

function Rating({ value }: { value: number | null }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-black text-app-text">
      {ratingText(value)}
      {value !== null ? (
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ) : null}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4 dark:bg-app-surface-muted/50">
      <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-app-text">{value}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value
}: {
  label: string;
  value: string | number;
}): JSX.Element {
  return (
    <div className="min-w-0 px-2">
      <p className="text-xs font-bold text-app-text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-app-text">{value}</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onPage
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}): JSX.Element {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-app-border pt-4 text-sm font-semibold text-app-text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>Showing {totalItems} customer records</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-md border border-app-border px-3 py-2 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-md border border-app-border px-3 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="h-16 rounded-lg bg-app-surface-muted" />
      ))}
    </div>
  );
}

function WorkspaceLoading(): JSX.Element {
  return (
    <main className="min-h-screen bg-app-background p-6">
      <div className="mx-auto h-[calc(100vh-3rem)] max-w-[1380px] animate-pulse rounded-[1.25rem] border border-app-border bg-app-surface p-10">
        <div className="h-8 w-48 rounded bg-app-surface-muted" />
        <div className="mt-4 h-4 w-80 rounded bg-app-surface-muted" />
      </div>
    </main>
  );
}

function WorkspaceError({ message }: { message: string }): JSX.Element {
  return (
    <main className="min-h-screen bg-app-background p-6 text-app-text">
      <div className="mx-auto max-w-[900px] rounded-lg border border-app-border bg-app-surface p-8">
        <EmptyState title="Business not found" description={message} />
      </div>
    </main>
  );
}
