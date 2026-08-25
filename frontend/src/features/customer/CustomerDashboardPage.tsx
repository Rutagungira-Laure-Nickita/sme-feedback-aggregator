import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePlus2,
  Inbox,
  Search,
  UserRound
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { CollectionViewToggle } from "../../components/collection-view/CollectionViewToggle.js";
import { useCollectionView } from "../../components/collection-view/useCollectionView.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { useAuthStore } from "../../store/authStore.js";
import { CustomerShell } from "./CustomerShell.js";
import {
  fetchCustomerDashboard,
  fetchCustomerFeedback,
  fetchCustomerFeedbackDetail,
  type CustomerFeedback
} from "./api.js";
import { OPERATIONAL_FEEDBACK_CHANNEL_OPTIONS } from "../businesses/supportedSources.js";

const statusLabels = {
  NEW: "New",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed"
} as const;
const channelLabels: Record<string, string> = Object.fromEntries(
  OPERATIONAL_FEEDBACK_CHANNEL_OPTIONS.map((option) => [option.value, option.label])
);

export function CustomerDashboardPage({
  section = "dashboard"
}: {
  section?: "dashboard" | "feedback" | "submit" | "profile";
}) {
  const dashboard = useQuery({
    queryKey: ["customer", "dashboard"],
    queryFn: fetchCustomerDashboard
  });
  const user = useAuthStore((state) => state.user);
  if (section === "feedback") return <CustomerFeedbackPage />;
  if (section === "submit") return <CustomerSubmitPage />;
  if (section === "profile") return <CustomerProfilePage />;
  const data = dashboard.data;
  return (
    <CustomerShell
      title={`Welcome${user?.firstName ? `, ${user.firstName}` : ""}`}
      subtitle="Your feedback history and submission progress in one place."
      actions={
        data?.submissionDestinations[0] ? (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-3 text-sm font-black text-app-primary-foreground"
            to={data.submissionDestinations[0].path}
          >
            <FilePlus2 className="h-4 w-4" />
            Submit feedback
          </Link>
        ) : undefined
      }
    >
      <section className="rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-5 text-white shadow-xl sm:p-7">
        <p className="text-xs font-black uppercase tracking-[.16em] text-indigo-100">
          Customer dashboard
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-black sm:text-3xl">
          See how your feedback is moving forward.
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-100">
          Statuses come directly from the businesses that received your submissions.
        </p>
      </section>
      <div className="mt-5 grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total submitted", data?.totals.total],
          ["New", data?.totals.new],
          ["In review", data?.totals.inReview],
          ["Resolved", data?.totals.resolved],
          ["Closed", data?.totals.closed]
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wide text-app-text-muted">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black">
              {dashboard.isLoading ? "—" : String(value ?? 0)}
            </p>
          </div>
        ))}
      </div>
      <section className="mt-5 rounded-xl border border-app-border bg-app-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Recent feedback</h2>
            <p className="mt-1 text-sm font-medium text-app-text-muted">
              Your latest customer-visible submissions.
            </p>
          </div>
          <Link
            to="/customer/feedback"
            className="inline-flex items-center gap-1 text-sm font-black text-app-primary"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {dashboard.error ? (
            <ErrorCopy error={dashboard.error} onRetry={() => void dashboard.refetch()} />
          ) : data?.recent.length ? (
            data.recent.map((item) => <FeedbackSummary key={item.id} item={item} />)
          ) : (
            <EmptyCopy
              text={
                dashboard.isLoading
                  ? "Loading your feedback…"
                  : "No feedback is linked to this customer email yet."
              }
            />
          )}
        </div>
      </section>
    </CustomerShell>
  );
}

function CustomerFeedbackPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["customer", "feedback", search, status, channel, page],
    queryFn: () =>
      fetchCustomerFeedback({
        search: search || undefined,
        status: (status || undefined) as never,
        channel: (channel || undefined) as never,
        page,
        pageSize: 20
      })
  });
  const items = query.data?.items ?? [];
  const collection = useCollectionView("customer-feedback", items.length);
  return (
    <CustomerShell
      title="My Feedback"
      subtitle="Only feedback associated with your signed-in customer email is shown."
    >
      <div className="flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-4 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1 text-xs font-black uppercase tracking-wide text-app-text-muted">
          Search
          <div className="mt-2 flex items-center rounded-lg border border-app-border px-3">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              placeholder="Search feedback or business"
            />
          </div>
        </label>
        <AppSelectField
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All statuses" },
            ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
          ]}
          ariaLabel="Status filter"
          className="lg:w-44"
        />
        <AppSelectField
          value={channel}
          onValueChange={(value) => {
            setChannel(value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All channels" },
            ...Object.entries(channelLabels).map(([value, label]) => ({ value, label }))
          ]}
          ariaLabel="Channel filter"
          className="lg:w-44"
        />
        <CollectionViewToggle
          view={collection.view}
          onChange={collection.setView}
          label="Customer feedback view"
        />
      </div>
      <div
        className={`mt-5 ${collection.view === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}`}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item.id)}
            className="w-full rounded-xl border border-app-border bg-app-surface p-4 text-left shadow-sm transition hover:border-app-primary/50"
          >
            <FeedbackSummary item={item} />
          </button>
        ))}
      </div>
      {query.error ? (
        <ErrorCopy error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <EmptyCopy text="Loading your feedback..." />
      ) : !items.length ? (
        <EmptyCopy text="No feedback matches these filters." />
      ) : null}
      {(query.data?.pagination.totalPages ?? 1) > 1 ? (
        <nav
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3"
          aria-label="Customer feedback pagination"
        >
          <p className="text-sm font-bold text-app-text-muted">
            Page {query.data?.pagination.page} of {query.data?.pagination.totalPages} /{" "}
            {query.data?.pagination.totalItems} submissions
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || query.isFetching}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-app-border px-3 text-sm font-black disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(query.data?.pagination.totalPages ?? current, current + 1)
                )
              }
              disabled={
                page >= (query.data?.pagination.totalPages ?? 1) || query.isFetching
              }
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-app-border px-3 text-sm font-black disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      ) : null}
      <CustomerFeedbackDialog feedbackId={selected} onClose={() => setSelected(null)} />
    </CustomerShell>
  );
}

function CustomerSubmitPage() {
  const dashboard = useQuery({
    queryKey: ["customer", "dashboard"],
    queryFn: fetchCustomerDashboard
  });
  return (
    <CustomerShell
      title="Submit Feedback"
      subtitle="Use the existing secure public feedback portal for the business you want to contact."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {dashboard.data?.submissionDestinations.map((item) => (
          <Link
            key={item.businessId}
            to={item.path}
            className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm transition hover:border-app-primary/50"
          >
            <FilePlus2 className="h-6 w-6 text-app-primary" />
            <h2 className="mt-4 text-lg font-black">{item.businessName}</h2>
            <p className="mt-2 text-sm font-medium text-app-text-muted">
              Open this business’s feedback form.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-app-primary">
              Continue <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
      {dashboard.error ? (
        <ErrorCopy error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : !dashboard.isLoading && !dashboard.data?.submissionDestinations.length ? (
        <EmptyCopy text="No previously contacted business currently has its public feedback portal enabled." />
      ) : null}
    </CustomerShell>
  );
}

function CustomerProfilePage() {
  const user = useAuthStore((state) => state.user);
  return (
    <CustomerShell
      title="Profile"
      subtitle="Review the account details and security capabilities already supported by the platform."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <UserRound className="h-6 w-6 text-app-primary" />
          <h2 className="mt-4 text-lg font-black">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="mt-2 break-all text-sm font-semibold text-app-text-muted">
            {user?.email}
          </p>
          <p className="mt-4 text-sm font-medium text-app-text-muted">
            Customer account · {user?.status?.toLowerCase()}
          </p>
        </section>
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <Clock3 className="h-6 w-6 text-app-primary" />
          <h2 className="mt-4 text-lg font-black">Account security</h2>
          <p className="mt-2 text-sm font-medium text-app-text-muted">
            Manage signed-in devices with the existing secure sessions page.
          </p>
          <Link
            to="/account/sessions"
            className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-app-primary px-4 text-sm font-black text-app-primary-foreground"
          >
            Manage sessions
          </Link>
        </section>
      </div>
    </CustomerShell>
  );
}

function FeedbackSummary({ item }: { item: CustomerFeedback }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="truncate font-black">{item.title || item.business.name}</p>
        <span className="rounded-md bg-app-primary-soft px-2 py-1 text-xs font-black text-app-primary">
          {statusLabels[item.status]}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-app-text-muted">
        {item.message}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-app-text-muted">
        <span>{item.business.name}</span>
        <span>{item.branch.name}</span>
        <span>{channelLabels[item.channel]}</span>
        <span>{new Date(item.receivedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function CustomerFeedbackDialog({
  feedbackId,
  onClose
}: {
  feedbackId: string | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ["customer", "feedback", feedbackId],
    queryFn: () => fetchCustomerFeedbackDetail(feedbackId!),
    enabled: Boolean(feedbackId)
  });
  return (
    <Dialog open={Boolean(feedbackId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-.5rem)] w-[calc(100vw-.5rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail.data?.title || "Feedback details"}</DialogTitle>
          <DialogDescription>
            Customer-visible submission information only.
          </DialogDescription>
        </DialogHeader>
        {detail.error ? (
          <ErrorCopy error={detail.error} onRetry={() => void detail.refetch()} />
        ) : detail.data ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-app-primary-soft px-2 py-1 font-black text-app-primary">
                {statusLabels[detail.data.status]}
              </span>
              <span className="rounded-md border border-app-border px-2 py-1 font-bold">
                {channelLabels[detail.data.channel]}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words leading-7">
              {detail.data.message}
            </p>
            <dl className="grid gap-3 rounded-xl bg-app-surface-muted p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-black uppercase text-app-text-muted">
                  Business
                </dt>
                <dd className="mt-1 font-bold">{detail.data.business.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase text-app-text-muted">
                  Branch
                </dt>
                <dd className="mt-1 font-bold">{detail.data.branch.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase text-app-text-muted">
                  Submitted
                </dt>
                <dd className="mt-1 font-bold">
                  {new Date(detail.data.receivedAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase text-app-text-muted">
                  Rating
                </dt>
                <dd className="mt-1 font-bold">
                  {detail.data.rating ? `${detail.data.rating}/5` : "Not rated"}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyCopy text="Loading feedback details…" />
        )}
      </DialogContent>
    </Dialog>
  );
}
function EmptyCopy({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-app-border bg-app-surface-muted p-6 text-center text-sm font-semibold text-app-text-muted">
      <Inbox className="mx-auto mb-2 h-5 w-5" />
      {text}
    </div>
  );
}

function ErrorCopy({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-black">We could not load this information.</p>
          <p className="mt-1 font-medium">{normalizeApiError(error).message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-10 rounded-lg border border-red-300 px-3 font-black dark:border-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
