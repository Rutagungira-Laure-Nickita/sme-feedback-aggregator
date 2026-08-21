import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ExternalLink,
  Filter,
  History,
  Inbox,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Tags,
  Trash2,
  UserCheck,
  UserX,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { AppDatePickerField } from "../../components/ui/date-picker.js";
import { CollectionViewToggle } from "../../components/collection-view/CollectionViewToggle.js";
import type { CollectionView } from "../../components/collection-view/collection-view.js";
import { useCollectionView } from "../../components/collection-view/useCollectionView.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import {
  Dialog,
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
import {
  EmptyState,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import type {
  FeedbackInboxQuery,
  FeedbackListItem,
  FeedbackAttachmentResponse,
  FeedbackDetail,
  FeedbackStatus,
  FeedbackPriority,
  ActivityItem,
  AssigneeInfo,
  CategoryInfo,
  AIAnalysisSummary
} from "./feedbackInboxApi.js";
import {
  fetchFeedbackList,
  fetchFeedbackDetail,
  updateFeedbackStatus,
  addFeedbackNote,
  fetchFeedbackActivity,
  updateAssignment,
  fetchEligibleAssignees,
  updateFeedbackCategory,
  fetchCategories,
  updateFeedbackPriority,
  retryFeedbackAIAnalysis,
  applyAICategorySuggestion,
  dismissAICategorySuggestion,
  editFeedback,
  deleteFeedback,
  bulkUpdateFeedbackStatus,
  bulkCategorizeFeedback,
  bulkDeleteFeedback,
  type FeedbackSelection
} from "./feedbackInboxApi.js";
import {
  createCustomerFromFeedback,
  fetchFeedbackCustomerMatches,
  linkFeedbackCustomer,
  type CustomerMatchGroups,
  type CustomerMatchSummary
} from "./customerApi.js";
import { CustomerFormModal } from "./CustomerFormModal.js";
import { fetchMemberships } from "./api/businessApi.js";
import type { BranchSummary, MembershipSummary, MyBusiness } from "./types.js";

type BusinessContext = {
  businessId: string;
  businesses: MyBusiness[];
  activeBusiness: MyBusiness;
  business: {
    id: string;
    status: string;
  };
  permissions: {
    canManageBusiness: boolean;
  };
  membership: { role: string; allBranchesAccess: boolean };
};

type FeedbackManagementAction = "view" | "edit" | "status" | "category" | "delete";

const PAGE_SIZES = [10, 20, 50];

const CHANNEL_OPTIONS = [
  { value: "", label: "All channels" },
  { value: "MANUAL", label: "Manual Entry" },
  { value: "PUBLIC_FORM", label: "Public Form" },
  { value: "QR_CODE", label: "QR Code" },
  { value: "GOOGLE_REVIEW", label: "Google Review" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "X", label: "X" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "OTHER", label: "Other" }
] as const;

const ASSIGNEE_OPTIONS = [
  { value: "", label: "All assignees" },
  { value: "me", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" }
] as const;

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" }
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" }
] as const;

const SENTIMENT_OPTIONS = [
  { value: "", label: "All sentiments" },
  { value: "POSITIVE", label: "Positive" },
  { value: "NEUTRAL", label: "Neutral" },
  { value: "NEGATIVE", label: "Negative" },
  { value: "MIXED", label: "Mixed" }
] as const;

const AI_STATUS_OPTIONS = [
  { value: "", label: "All AI states" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "SKIPPED", label: "Skipped" }
] as const;

const AI_SUGGESTION_STATE_OPTIONS = [
  { value: "", label: "All suggestions" },
  { value: "AVAILABLE", label: "Available" },
  { value: "APPLIED", label: "Applied" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "NONE", label: "No suggestion" }
] as const;

const RATING_OPTIONS = [
  { value: "", label: "All ratings" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" }
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" }
] as const;

type AssigneeFilterOption = {
  membershipId: string;
  name: string;
  role: string;
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDatePresetRange(value: string): { from: string; to: string } | null {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (value === "today") {
    return { from: toDateInputValue(start), to: toDateInputValue(end) };
  }
  if (value === "last_7_days") {
    start.setDate(today.getDate() - 6);
    return { from: toDateInputValue(start), to: toDateInputValue(end) };
  }
  if (value === "last_30_days") {
    start.setDate(today.getDate() - 29);
    return { from: toDateInputValue(start), to: toDateInputValue(end) };
  }
  if (value === "this_month") {
    return {
      from: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: toDateInputValue(end)
    };
  }
  if (value === "previous_month") {
    return {
      from: toDateInputValue(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 0))
    };
  }

  return null;
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getChannelBadgeClass(channel: string): string {
  switch (channel) {
    case "MANUAL":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/60";
    case "PUBLIC_FORM":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
    case "QR_CODE":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
    case "GOOGLE_REVIEW":
      return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60";
    case "WHATSAPP":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
    case "EMAIL":
      return "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-900/60";
    case "X":
      return "bg-neutral-100 text-neutral-800 ring-neutral-200 dark:bg-neutral-900/70 dark:text-neutral-100 dark:ring-neutral-700";
    case "FACEBOOK":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60";
    case "INSTAGRAM":
      return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-200 dark:ring-slate-800/60";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60";
    case "IN_REVIEW":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
    case "CLOSED":
      return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800/60";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-200 dark:ring-slate-800/60";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "NEW":
      return "New";
    case "IN_REVIEW":
      return "In Review";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

function getSentimentLabel(sentiment: string | null | undefined): string {
  switch (sentiment) {
    case "POSITIVE":
      return "Positive";
    case "NEUTRAL":
      return "Neutral";
    case "NEGATIVE":
      return "Negative";
    case "MIXED":
      return "Mixed";
    default:
      return "Not analyzed";
  }
}

function getAIStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "SKIPPED":
      return "Skipped";
    default:
      return "Not queued";
  }
}

function getAISuggestionStateLabel(state: string | null | undefined): string {
  switch (state) {
    case "AVAILABLE":
      return "Available";
    case "APPLIED":
      return "Applied";
    case "AUTO_APPLIED":
      return "Auto-applied";
    case "MANUALLY_APPLIED":
      return "Manually applied";
    case "DISMISSED":
      return "Dismissed";
    case "CONFLICTED":
      return "Human category won";
    case "NONE":
      return "No suggestion";
    default:
      return "No suggestion";
  }
}

function getConfidenceLabel(level: string | null | undefined): string {
  switch (level) {
    case "HIGH":
      return "High confidence";
    case "REVIEW":
      return "Review recommended";
    case "LOW":
      return "Low confidence";
    default:
      return "Confidence unavailable";
  }
}

function getSentimentBadgeClass(sentiment: string | null | undefined): string {
  switch (sentiment) {
    case "POSITIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
    case "NEGATIVE":
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60";
    case "MIXED":
      return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60";
    case "NEUTRAL":
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700";
    default:
      return "bg-app-surface-muted text-app-text-muted ring-app-border";
  }
}

function getAIStatusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
    case "PROCESSING":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60";
    case "PENDING":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
    case "FAILED":
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60";
    case "SKIPPED":
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700";
    default:
      return "bg-app-surface-muted text-app-text-muted ring-app-border";
  }
}

function getChannelLabel(channel: string): string {
  switch (channel) {
    case "MANUAL":
      return "Manual Entry";
    case "PUBLIC_FORM":
      return "Public Form";
    case "QR_CODE":
      return "QR Code";
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "X":
      return "X";
    case "GOOGLE_REVIEW":
      return "Google Review";
    case "EMAIL":
      return "Email";
    case "FACEBOOK":
      return "Facebook";
    case "OTHER":
      return "Other";
    default:
      return channel;
  }
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "LOW":
      return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700";
    case "NORMAL":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60";
    case "HIGH":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
    case "URGENT":
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-200 dark:ring-slate-800/60";
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "LOW":
      return "Low";
    case "NORMAL":
      return "Normal";
    case "HIGH":
      return "High";
    case "URGENT":
      return "Urgent";
    default:
      return priority;
  }
}

function getCategoryBadgeClass(colorKey: string): string {
  switch (colorKey) {
    case "slate":
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700";
    case "blue":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60";
    case "indigo":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/60";
    case "violet":
      return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60";
    case "emerald":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
    case "amber":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60";
    case "orange":
      return "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60";
    case "rose":
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60";
    default:
      return "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/60";
  }
}

function AssigneeBadge({ assignee }: { assignee: AssigneeInfo | null }): JSX.Element {
  if (!assignee) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-app-text-muted">
        <UserX className="h-3 w-3" aria-hidden="true" />
        Unassigned
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        assignee.isAvailable
          ? "bg-app-surface-muted text-app-text ring-1 ring-app-border"
          : "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {assignee.isAvailable ? (
        <UserCheck className="h-3 w-3" aria-hidden="true" />
      ) : (
        <UserX className="h-3 w-3" aria-hidden="true" />
      )}
      <span className="truncate max-w-[100px]">{assignee.name}</span>
    </span>
  );
}

function StarRating({ rating }: { rating: number | null }): JSX.Element {
  if (rating === null || rating === undefined) {
    return <span className="text-sm font-medium text-app-text-muted">No rating</span>;
  }

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-app-border"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function CustomerAvatar({ name }: { name: string | null }): JSX.Element {
  if (!name) {
    return (
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-xs font-black text-app-text-muted">
        <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-primary-soft text-xs font-black text-app-primary">
      {initials}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4 dark:bg-app-surface-muted/50">
      <p className="text-xs font-bold text-app-text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-black leading-none ${color}`}>{value}</p>
    </div>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-app-border bg-app-surface p-4"
        >
          <div className="h-8 w-8 rounded-full bg-app-surface-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-app-surface-muted" />
            <div className="h-3 w-1/2 rounded bg-app-surface-muted" />
          </div>
          <div className="h-3 w-16 rounded bg-app-surface-muted" />
          <div className="h-3 w-20 rounded bg-app-surface-muted" />
        </div>
      ))}
    </div>
  );
}

function SummarySkeleton(): JSX.Element {
  return (
    <div className="animate-pulse grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-24 rounded-lg border border-app-border bg-app-surface p-4 dark:bg-app-surface-muted/50"
        >
          <div className="h-3 w-20 rounded bg-app-surface-muted" />
          <div className="mt-3 h-8 w-12 rounded bg-app-surface-muted" />
        </div>
      ))}
    </div>
  );
}

// ─── Filters ────────────────────────────────────────────

type FiltersProps = {
  search: string;
  onSearch: (value: string) => void;
  branchId: string;
  onBranchId: (value: string) => void;
  channel: string;
  onChannel: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  sentiment: string;
  onSentiment: (value: string) => void;
  aiStatus: string;
  onAIStatus: (value: string) => void;
  aiSuggestionState: string;
  onAISuggestionState: (value: string) => void;
  assignedTo: string;
  onAssignedTo: (value: string) => void;
  categoryId: string;
  onCategorySelection: (value: string) => void;
  priority: string;
  onPriority: (value: string) => void;
  rating: string;
  onRating: (value: string) => void;
  ratingMin: string;
  onRatingMin: (value: string) => void;
  ratingMax: string;
  onRatingMax: (value: string) => void;
  includeUnrated: boolean;
  onIncludeUnrated: (value: boolean) => void;
  datePreset: string;
  onDatePreset: (value: string) => void;
  dateFrom: string;
  onDateFrom: (value: string) => void;
  dateTo: string;
  onDateTo: (value: string) => void;
  assignmentState: string;
  onAssignmentState: (value: string) => void;
  categoryState: string;
  customerLinkState: string;
  onCustomerLinkState: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  branches: BranchSummary[];
  categories: CategoryInfo[];
  assignees: AssigneeFilterOption[];
  onClear: () => void;
  branchScopeLimited?: boolean;
};

function Filters({
  search,
  onSearch,
  branchId,
  onBranchId,
  channel,
  onChannel,
  status,
  onStatus,
  sentiment,
  onSentiment,
  aiStatus,
  onAIStatus,
  aiSuggestionState,
  onAISuggestionState,
  assignedTo,
  onAssignedTo,
  categoryId,
  onCategorySelection,
  priority,
  onPriority,
  rating,
  onRating,
  ratingMin,
  onRatingMin,
  ratingMax,
  onRatingMax,
  includeUnrated,
  onIncludeUnrated,
  datePreset,
  onDatePreset,
  dateFrom,
  onDateFrom,
  dateTo,
  onDateTo,
  assignmentState,
  onAssignmentState,
  categoryState,
  customerLinkState,
  onCustomerLinkState,
  sort,
  onSort,
  branches,
  categories,
  assignees,
  onClear,
  branchScopeLimited = false
}: FiltersProps): JSX.Element {
  const [searchDraft, setSearchDraft] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = (value: string) => {
    setSearchDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 400);
  };

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const branchOptions = [
    { value: "", label: branchScopeLimited ? "All assigned branches" : "All branches" },
    ...branches.map((branch) => ({ value: branch.id, label: branch.name }))
  ];
  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "__uncategorized__", label: "Uncategorized" },
    ...categories.map((category) => ({ value: category.id, label: category.name }))
  ];
  const assigneeOptions = [
    ...ASSIGNEE_OPTIONS,
    ...assignees.map((assignee) => ({
      value: assignee.membershipId,
      label: `${assignee.name} (${assignee.role})`
    }))
  ];
  const ratingMinOptions = RATING_OPTIONS.map((option) => ({
    value: option.value,
    label: option.value ? `${option.value}+ stars` : "No minimum"
  }));
  const ratingMaxOptions = RATING_OPTIONS.map((option) => ({
    value: option.value,
    label: option.value ? `${option.value} stars max` : "No maximum"
  }));
  const datePresetOptions = [
    { value: "", label: "Any received date" },
    { value: "today", label: "Today" },
    { value: "last_7_days", label: "Last 7 days" },
    { value: "last_30_days", label: "Last 30 days" },
    { value: "this_month", label: "This month" },
    { value: "previous_month", label: "Previous month" },
    { value: "custom", label: "Custom range" }
  ];
  const assignmentStateOptions = [
    { value: "", label: "Any assignment" },
    { value: "assigned", label: "Assigned" },
    { value: "unassigned", label: "Unassigned" }
  ];
  const customerLinkOptions = [
    { value: "", label: "Any customer" },
    { value: "linked", label: "Linked" },
    { value: "unlinked", label: "Unlinked" }
  ];
  const advancedFilterCount = [
    assignedTo,
    sentiment,
    aiStatus,
    aiSuggestionState,
    categoryId,
    priority,
    rating,
    ratingMin || ratingMax || includeUnrated ? "ratingRange" : "",
    datePreset || dateFrom || dateTo ? "dateRange" : "",
    assignmentState,
    categoryState,
    customerLinkState
  ].filter(Boolean).length;

  const advancedFilters = (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-app-text">Advanced filters</h2>
          <p className="mt-1 text-xs font-semibold text-app-text-muted">
            Refine the inbox without crowding the main toolbar.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-black text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FilterSelect
          label="Assignee"
          value={assignedTo}
          onValueChange={onAssignedTo}
          options={assigneeOptions}
          ariaLabel="Filter by assignee"
        />
        <FilterSelect
          label="Assignment"
          value={assignmentState}
          onValueChange={onAssignmentState}
          options={assignmentStateOptions}
          ariaLabel="Filter by assignment state"
        />
        <FilterSelect
          label="Customer link"
          value={customerLinkState}
          onValueChange={onCustomerLinkState}
          options={customerLinkOptions}
          ariaLabel="Filter by customer link"
        />
        <FilterSelect
          label="Category"
          value={categoryState === "uncategorized" ? "__uncategorized__" : categoryId}
          onValueChange={onCategorySelection}
          options={categoryOptions}
          ariaLabel="Filter by category"
        />
        <FilterSelect
          label="Priority"
          value={priority}
          onValueChange={onPriority}
          options={PRIORITY_OPTIONS}
          ariaLabel="Filter by priority"
        />
        <FilterSelect
          label="Sentiment"
          value={sentiment}
          onValueChange={onSentiment}
          options={SENTIMENT_OPTIONS}
          ariaLabel="Filter by sentiment"
        />
        <FilterSelect
          label="AI state"
          value={aiStatus}
          onValueChange={onAIStatus}
          options={AI_STATUS_OPTIONS}
          ariaLabel="Filter by AI state"
        />
        <FilterSelect
          label="AI suggestion"
          value={aiSuggestionState}
          onValueChange={onAISuggestionState}
          options={AI_SUGGESTION_STATE_OPTIONS}
          ariaLabel="Filter by AI suggestion state"
        />
        <FilterSelect
          label="Exact rating"
          value={rating}
          onValueChange={onRating}
          options={RATING_OPTIONS}
          ariaLabel="Filter by exact rating"
        />
        <FilterSelect
          label="Rating min"
          value={ratingMin}
          onValueChange={onRatingMin}
          options={ratingMinOptions}
          ariaLabel="Filter by minimum rating"
        />
        <FilterSelect
          label="Rating max"
          value={ratingMax}
          onValueChange={onRatingMax}
          options={ratingMaxOptions}
          ariaLabel="Filter by maximum rating"
        />
        <FilterSelect
          label="Received preset"
          value={datePreset}
          onValueChange={onDatePreset}
          options={datePresetOptions}
          ariaLabel="Filter by received date preset"
        />
        <DateFilterField
          label="Received from"
          value={dateFrom}
          onValueChange={onDateFrom}
          ariaLabel="Filter by date from"
        />
        <DateFilterField
          label="Received to"
          value={dateTo}
          onValueChange={onDateTo}
          ariaLabel="Filter by date to"
        />
        <label className="flex h-10 items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold text-app-text">
          <input
            type="checkbox"
            checked={includeUnrated}
            onChange={(e) => onIncludeUnrated(e.target.checked)}
            className="h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-focus"
          />
          Include unrated
        </label>
      </div>
    </div>
  );

  return (
    <WorkspacePanel>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[min(100%,24rem)] flex-[3_1_24rem]">
            <label className="mb-1.5 block text-xs font-bold text-app-text-muted">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchDraft}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search title, message, customer, email, or phone"
                className="h-10 w-full rounded-md border border-app-border bg-app-surface-muted pl-9 pr-3 text-sm font-medium outline-none transition placeholder:text-app-text-muted/70 focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
                aria-label="Search feedback"
              />
            </div>
          </div>
          {branchScopeLimited && branches.length === 1 ? (
            <div className="min-w-[min(100%,11rem)] flex-[1_1_11rem]">
              <p className="mb-1.5 text-xs font-bold text-app-text-muted">
                Assigned branch
              </p>
              <div className="flex h-10 items-center rounded-md border border-app-border bg-app-surface-muted px-3 text-sm font-black text-app-text">
                {branches[0]?.name}
              </div>
            </div>
          ) : (
            <FilterSelect
              label="Branch"
              value={branchId}
              onValueChange={onBranchId}
              options={branchOptions}
              ariaLabel="Filter by branch"
              className="min-w-[min(100%,11rem)] flex-[1_1_11rem]"
            />
          )}
          <FilterSelect
            label="Status"
            value={status}
            onValueChange={onStatus}
            options={STATUS_OPTIONS}
            ariaLabel="Filter by status"
            className="min-w-[min(100%,11rem)] flex-[1_1_11rem]"
          />
          <FilterSelect
            label="Channel"
            value={channel}
            onValueChange={onChannel}
            options={CHANNEL_OPTIONS}
            ariaLabel="Filter by channel"
            className="min-w-[min(100%,11rem)] flex-[1_1_11rem]"
          />
          <FilterSelect
            label="Sort"
            value={sort}
            onValueChange={onSort}
            options={SORT_OPTIONS}
            ariaLabel="Sort order"
            className="min-w-[min(100%,11rem)] flex-[1_1_11rem]"
          />
          <div className="flex min-w-[min(100%,13rem)] flex-[0_1_auto] gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-focus/30"
                  aria-label="Open advanced feedback filters"
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
              <PopoverContent className="max-h-[min(72vh,640px)] w-[min(calc(100vw-2rem),860px)] overflow-y-auto">
                {advancedFilters}
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-bold text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/30"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      </div>
    </WorkspacePanel>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  ariaLabel,
  className = ""
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly AppSelectOption[];
  ariaLabel: string;
  className?: string;
}): JSX.Element {
  return (
    <AppSelectField
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      ariaLabel={ariaLabel}
      className={className}
      labelClassName="mb-1.5 text-xs font-bold text-app-text-muted"
      triggerClassName="mt-0"
    />
  );
}

function DateFilterField({
  label,
  value,
  onValueChange,
  ariaLabel
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
}): JSX.Element {
  return (
    <AppDatePickerField
      label={label}
      value={value}
      onValueChange={onValueChange}
      ariaLabel={ariaLabel}
      labelClassName="mb-1.5 text-xs font-bold text-app-text-muted"
      triggerClassName="mt-0"
    />
  );
}

type ActiveFilterChip = {
  key: string;
  label: string;
  clears: string[];
};

function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll
}: {
  chips: ActiveFilterChip[];
  onRemove: (chip: ActiveFilterChip) => void;
  onClearAll: () => void;
}): JSX.Element | null {
  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-app-primary-soft px-2.5 py-1.5 text-xs font-black text-app-primary ring-1 ring-app-focus/20 transition hover:bg-app-primary-soft/80 focus:outline-none focus:ring-2 focus:ring-app-focus/40"
        >
          <span className="truncate">{chip.label}</span>
          <X className="h-3 w-3 shrink-0" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-black text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/40"
      >
        Clear all
      </button>
    </div>
  );
}

// ─── Desktop Table ──────────────────────────────────────

function DesktopTable({
  items,
  onSelect,
  canManage,
  selectedIds,
  onToggleSelected,
  onAction
}: {
  items: FeedbackListItem[];
  onSelect: (id: string) => void;
  canManage: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onAction: (action: FeedbackManagementAction, item: FeedbackListItem) => void;
}): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-app-border text-xs font-bold uppercase tracking-wider text-app-text-muted">
            {canManage ? (
              <th scope="col" className="w-10 py-3 pr-3">
                <span className="sr-only">Select</span>
              </th>
            ) : null}
            <th scope="col" className="py-3 pr-4">
              Customer
            </th>
            <th scope="col" className="py-3 pr-4">
              Feedback
            </th>
            <th scope="col" className="py-3 pr-4">
              Category
            </th>
            <th scope="col" className="py-3 pr-4">
              Channel
            </th>
            <th scope="col" className="py-3 pr-4">
              Status
            </th>
            <th scope="col" className="py-3 text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {items.map((item) => (
            <tr
              key={item.id}
              className="group cursor-pointer transition hover:bg-app-primary-soft/35"
              onClick={() => onSelect(item.id)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item.id);
                }
              }}
            >
              {canManage ? (
                <td className="py-3 pr-3" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelected(item.id)}
                    className="h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-focus"
                    aria-label={`Select feedback from ${item.customer.name ?? "anonymous"}`}
                  />
                </td>
              ) : null}
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <CustomerAvatar name={item.customer.name} />
                  <span className="max-w-[180px] truncate font-bold">
                    {item.customer.name ?? "Anonymous"}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-4">
                <div className="max-w-[360px]">
                  {item.title ? (
                    <p className="truncate font-bold text-app-text">{item.title}</p>
                  ) : null}
                  <p className="truncate text-app-text-muted">{item.messagePreview}</p>
                  <p className="mt-1 text-xs font-semibold text-app-text-muted">
                    {formatDate(item.receivedAt)}
                  </p>
                </div>
              </td>
              <td className="py-3 pr-4">
                <CategoryBadge category={item.category} />
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getChannelBadgeClass(item.channel)}`}
                >
                  {getChannelLabel(item.channel)}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getStatusBadgeClass(item.status)}`}
                >
                  {getStatusLabel(item.status)}
                </span>
              </td>
              <td className="py-3 text-right">
                <div onClick={(event) => event.stopPropagation()}>
                  <FeedbackActionsMenu
                    item={item}
                    canManage={canManage}
                    onAction={onAction}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mobile Cards ───────────────────────────────────────

function MobileCards({
  items,
  onSelect,
  view = "list",
  canManage,
  selectedIds,
  onToggleSelected,
  onAction
}: {
  items: FeedbackListItem[];
  onSelect: (id: string) => void;
  view?: CollectionView;
  canManage: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onAction: (action: FeedbackManagementAction, item: FeedbackListItem) => void;
}): JSX.Element {
  return (
    <div
      className={
        view === "grid"
          ? "grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-3"
          : "grid min-w-0 gap-3"
      }
    >
      {items.map((item) => (
        <article
          key={item.id}
          onClick={() => onSelect(item.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSelect(item.id);
          }}
          tabIndex={0}
          className="group w-full cursor-pointer rounded-2xl border border-app-border/80 bg-app-surface p-5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:border-app-primary/50 hover:shadow-panel dark:bg-app-surface-muted/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CustomerAvatar name={item.customer.name} />
              <div className="min-w-0">
                <p className="truncate font-bold text-app-text">
                  {item.customer.name ?? "Anonymous"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-black ring-1 ${getChannelBadgeClass(item.channel)}`}
                  >
                    {getChannelLabel(item.channel)}
                  </span>
                  <span
                    className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-black ring-1 ${getStatusBadgeClass(item.status)}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="flex shrink-0 items-center gap-1"
              onClick={(event) => event.stopPropagation()}
            >
              {canManage ? (
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelected(item.id)}
                  className="h-4 w-4 rounded border-app-border text-app-primary"
                  aria-label={`Select feedback from ${item.customer.name ?? "anonymous"}`}
                />
              ) : null}
              <FeedbackActionsMenu
                item={item}
                canManage={canManage}
                onAction={onAction}
              />
            </div>
          </div>
          <div className="mt-2">
            {item.title ? (
              <p className="text-sm font-bold text-app-text">{item.title}</p>
            ) : null}
            <p className="text-sm text-app-text-muted line-clamp-2">
              {item.messagePreview}
            </p>
            <p className="mt-2 text-xs font-semibold text-app-text-muted">
              {formatDate(item.receivedAt)}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-app-border/70 pt-3">
            <CategoryBadge category={item.category} compact />
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-black text-app-primary">
              View <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function FeedbackActionsMenu({
  item,
  canManage,
  onAction
}: {
  item: FeedbackListItem;
  canManage: boolean;
  onAction: (action: FeedbackManagementAction, item: FeedbackListItem) => void;
}) {
  const actions: Array<{
    action: FeedbackManagementAction;
    label: string;
    icon: JSX.Element;
    destructive?: boolean;
  }> = [
    { action: "view", label: "View", icon: <Eye className="h-4 w-4" /> },
    ...(canManage
      ? [
          {
            action: "edit" as const,
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />
          },
          {
            action: "status" as const,
            label: "Change status",
            icon: <ArrowRight className="h-4 w-4" />
          },
          {
            action: "category" as const,
            label: "Categorize",
            icon: <Tags className="h-4 w-4" />
          },
          {
            action: "delete" as const,
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            destructive: true
          }
        ]
      : [])
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-app-primary transition hover:bg-app-primary-soft focus:outline-none focus:ring-2 focus:ring-app-focus/30"
          aria-label={`Actions for feedback from ${item.customer.name ?? "anonymous"}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 max-w-[calc(100vw-1rem)] p-1">
        {actions.map(({ action, label, icon, destructive }) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action, item)}
            className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-bold transition hover:bg-app-surface-muted ${destructive ? "text-red-600 dark:text-red-300" : "text-app-text"}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CategoryBadge({
  category,
  compact = false
}: {
  category: CategoryInfo | null;
  compact?: boolean;
}): JSX.Element {
  if (!category) {
    return (
      <span
        className={`inline-flex rounded-md font-black text-app-text-muted ring-1 ring-app-border ${
          compact ? "px-2 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
        }`}
      >
        Uncategorized
      </span>
    );
  }

  return (
    <span
      className={`inline-flex max-w-[180px] truncate rounded-md font-black ring-1 ${getCategoryBadgeClass(category.colorKey)} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
      title={category.name}
    >
      {category.name}
    </span>
  );
}

// ─── Pagination ─────────────────────────────────────────

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

function PaginationBar({
  page,
  pageSize,
  totalItems,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  onPageSizeChange
}: PaginationProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-app-text-muted">
        <span>Rows per page:</span>
        <AppSelectField
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          options={PAGE_SIZES.map((size) => ({
            value: String(size),
            label: String(size)
          }))}
          ariaLabel="Page size"
          triggerClassName="h-9 w-20 px-2"
        />
        <span>{totalItems} total</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 transition hover:bg-app-surface-muted"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="px-2 text-sm font-bold text-app-text">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 transition hover:bg-app-surface-muted"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Detail Drawer ──────────────────────────────────────

type DetailDrawerProps = {
  businessId: string;
  feedbackId: string | null;
  onClose: () => void;
};

function DetailDrawer({
  businessId,
  feedbackId,
  onClose
}: DetailDrawerProps): JSX.Element | null {
  const titleId = "feedback-detail-drawer-title";
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["businesses", businessId, "feedback", feedbackId],
    queryFn: () => fetchFeedbackDetail(businessId, feedbackId!),
    enabled: Boolean(feedbackId)
  });

  useEffect(() => {
    if (!feedbackId) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [feedbackId, onClose]);

  useEffect(() => {
    if (!feedbackId) return undefined;

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      const previous = previouslyFocusedElementRef.current;
      if (previous && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
      previouslyFocusedElementRef.current = null;
    };
  }, [feedbackId]);

  useEffect(() => {
    if (!feedbackId) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [feedbackId]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        [
          "a[href]",
          "button:not([disabled])",
          "textarea:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          '[tabindex]:not([tabindex="-1"])'
        ].join(",")
      )
    ).filter((element) => !element.hasAttribute("disabled"));

    if (focusableElements.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const firstElement = focusableElements[0]!;
    const lastElement = focusableElements[focusableElements.length - 1]!;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  if (!feedbackId || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/30 dark:bg-slate-950/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        ref={panelRef}
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl outline-none dark:bg-[rgb(10,25,51)] sm:max-h-[92dvh] sm:w-[calc(100vw-3rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-app-border bg-app-surface px-5 py-4 dark:bg-[rgb(10,25,51)] sm:px-6">
          <h2 id={titleId} className="min-w-0 text-lg font-black text-app-text">
            Feedback Details
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-md bg-app-primary-soft/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-app-primary">
              Customer feedback
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-focus/30"
              aria-label="Close details"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 sm:px-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-3/4 rounded bg-app-surface-muted" />
              <div className="h-4 w-1/2 rounded bg-app-surface-muted" />
              <div className="h-20 w-full rounded bg-app-surface-muted" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {normalizeApiError(error).message}
            </div>
          ) : data ? (
            <DetailContent detail={data} businessId={businessId} />
          ) : null}
        </div>
      </section>
    </>,
    document.body
  );
}

// ─── Workflow Panel ─────────────────────────────────────

function getStatusIcon(status: string): JSX.Element {
  switch (status) {
    case "NEW":
      return <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
    case "IN_REVIEW":
      return <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />;
    case "RESOLVED":
      return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
    case "CLOSED":
      return <X className="h-3.5 w-3.5" aria-hidden="true" />;
    default:
      return <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

function getActivityBgClass(type: string, isSynthetic: boolean): string {
  if (isSynthetic) return "bg-app-primary-soft/30 dark:bg-app-primary-soft/10";
  switch (type) {
    case "STATUS_CHANGED":
      return "bg-amber-50 dark:bg-amber-950/30";
    case "NOTE_ADDED":
      return "bg-indigo-50 dark:bg-indigo-950/30";
    case "ASSIGNMENT_CHANGED":
      return "bg-sky-50 dark:bg-sky-950/30";
    case "CATEGORY_CHANGED":
      return "bg-emerald-50 dark:bg-emerald-950/30";
    case "PRIORITY_CHANGED":
      return "bg-violet-50 dark:bg-violet-950/30";
    default:
      return "bg-app-surface-muted/50 dark:bg-app-surface-muted/20";
  }
}

function getActivityIcon(type: string, isSynthetic: boolean): JSX.Element {
  if (isSynthetic) {
    return <Inbox className="h-4 w-4" aria-hidden="true" />;
  }
  switch (type) {
    case "STATUS_CHANGED":
      return <ArrowRight className="h-4 w-4" aria-hidden="true" />;
    case "NOTE_ADDED":
      return <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />;
    case "ASSIGNMENT_CHANGED":
      return <UserCheck className="h-4 w-4" aria-hidden="true" />;
    case "CATEGORY_CHANGED":
      return <Filter className="h-4 w-4" aria-hidden="true" />;
    case "PRIORITY_CHANGED":
      return <Clock className="h-4 w-4" aria-hidden="true" />;
    default:
      return <History className="h-4 w-4" aria-hidden="true" />;
  }
}

function getActivityTextClass(type: string): string {
  switch (type) {
    case "STATUS_CHANGED":
      return "text-amber-600 dark:text-amber-400";
    case "NOTE_ADDED":
      return "text-indigo-600 dark:text-indigo-400";
    case "ASSIGNMENT_CHANGED":
      return "text-sky-600 dark:text-sky-400";
    case "CATEGORY_CHANGED":
      return "text-emerald-600 dark:text-emerald-400";
    case "PRIORITY_CHANGED":
      return "text-violet-600 dark:text-violet-400";
    default:
      return "text-app-text-muted";
  }
}

type WorkflowPanelProps = {
  businessId: string;
  feedbackId: string;
  currentStatus: FeedbackStatus;
  availableTransitions: FeedbackStatus[];
  currentAssignee: AssigneeInfo | null;
  currentCategory: CategoryInfo | null;
  currentPriority: string;
};

function WorkflowPanel({
  businessId,
  feedbackId,
  currentStatus,
  availableTransitions,
  currentAssignee,
  currentCategory,
  currentPriority
}: WorkflowPanelProps): JSX.Element {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const noteMaxLength = 2000;
  const refreshCurrentFeedback = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback-inbox"]
      }),
      queryClient.refetchQueries({
        queryKey: ["businesses", businessId, "feedback", feedbackId],
        type: "active"
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback", feedbackId, "activity"]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback", feedbackId, "eligible-assignees"]
      })
    ]);
  };

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: FeedbackStatus) =>
      updateFeedbackStatus(businessId, feedbackId, newStatus),
    onSuccess: refreshCurrentFeedback,
    onError: () => {
      void refreshCurrentFeedback();
    }
  });

  // Note mutation
  const noteMutation = useMutation({
    mutationFn: (note: string) => addFeedbackNote(businessId, feedbackId, note),
    onSuccess: async () => {
      setNoteText("");
      await refreshCurrentFeedback();
    }
  });

  // Assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: (membershipId: string | null) =>
      updateAssignment(businessId, feedbackId, membershipId),
    onSuccess: refreshCurrentFeedback,
    onError: () => {
      void refreshCurrentFeedback();
    }
  });

  // Category mutation
  const categoryMutation = useMutation({
    mutationFn: (catId: string | null) =>
      updateFeedbackCategory(businessId, feedbackId, catId),
    onSuccess: refreshCurrentFeedback,
    onError: () => {
      void refreshCurrentFeedback();
    }
  });

  // Priority mutation
  const priorityMutation = useMutation({
    mutationFn: (newPriority: FeedbackPriority) =>
      updateFeedbackPriority(businessId, feedbackId, newPriority),
    onSuccess: refreshCurrentFeedback,
    onError: () => {
      void refreshCurrentFeedback();
    }
  });

  // Eligible assignees
  const { data: assigneeOptions } = useQuery({
    queryKey: ["businesses", businessId, "feedback", feedbackId, "eligible-assignees"],
    queryFn: () => fetchEligibleAssignees(businessId, feedbackId),
    enabled: Boolean(feedbackId)
  });

  // Categories
  const { data: categoryOptions } = useQuery({
    queryKey: ["businesses", businessId, "feedback-categories", "active"],
    queryFn: () => fetchCategories(businessId)
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["businesses", businessId, "feedback", feedbackId, "activity"],
    queryFn: () => fetchFeedbackActivity(businessId, feedbackId),
    enabled: Boolean(feedbackId)
  });

  const activities = activityData?.items ?? [];
  const trimmedNote = noteText.trim();
  const noteCharCount = noteText.length;
  const isNoteValid = trimmedNote.length > 0 && noteCharCount <= noteMaxLength;
  const isUpdating = statusMutation.isPending;

  const handleStatusChange = (newStatus: FeedbackStatus) => {
    if (newStatus === currentStatus || isUpdating) return;
    statusMutation.mutate(newStatus);
  };

  const handleAddNote = () => {
    if (!isNoteValid || noteMutation.isPending) return;
    noteMutation.mutate(trimmedNote);
  };

  const eligibleAssignees = assigneeOptions ?? [];
  const assignmentOptions = currentAssignee
    ? [
        currentAssignee,
        ...eligibleAssignees.filter(
          (assignee) => assignee.membershipId !== currentAssignee.membershipId
        )
      ]
    : eligibleAssignees;
  const selectedAssigneeId = currentAssignee?.membershipId ?? "";

  const handleAssignmentChange = (membershipId: string) => {
    if (assignmentMutation.isPending) return;
    const nextValue = membershipId || null;
    if ((nextValue ?? "") === selectedAssigneeId) return;
    assignmentMutation.mutate(nextValue);
  };

  return (
    <div className="space-y-5">
      {/* Assignment */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
          Assignment
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <AssigneeBadge assignee={currentAssignee} />
        </div>
        <AppSelectField
          value={selectedAssigneeId}
          disabled={assignmentMutation.isPending}
          onValueChange={handleAssignmentChange}
          options={[
            { value: "", label: "Unassigned" },
            ...assignmentOptions.map((assignee) => ({
              value: assignee.membershipId,
              label: `${assignee.name}${assignee.isAvailable ? "" : " (Unavailable)"}`,
              disabled: !assignee.isAvailable
            }))
          ]}
          ariaLabel="Change feedback assignment"
        />
        {eligibleAssignees.length === 0 && !currentAssignee ? (
          <p className="mt-1 text-xs font-semibold text-app-text-muted">
            No eligible assignees are available for this feedback.
          </p>
        ) : null}
        {assignmentMutation.isError ? (
          <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
            {normalizeApiError(assignmentMutation.error).message}
          </p>
        ) : null}
      </div>

      <hr className="border-app-border" />

      {/* Category */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
          Category
        </h3>
        <div className="flex items-center gap-2 mb-2">
          {currentCategory ? (
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getCategoryBadgeClass(currentCategory.colorKey)}`}
            >
              {currentCategory.name}
            </span>
          ) : (
            <span className="text-xs text-app-text-muted">Uncategorized</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={categoryMutation.isPending || currentCategory === null}
            onClick={() => categoryMutation.mutate(null)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black text-app-text-muted ring-1 ring-app-border hover:bg-app-surface-muted transition disabled:opacity-50"
          >
            Uncategorized
          </button>
          {categoryOptions
            ?.filter((c) => c.isActive || c.id === currentCategory?.id)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                disabled={categoryMutation.isPending || currentCategory?.id === cat.id}
                onClick={() => categoryMutation.mutate(cat.id)}
                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black ring-1 transition disabled:opacity-50 ${
                  currentCategory?.id === cat.id ? "ring-2 ring-offset-1" : ""
                } ${getCategoryBadgeClass(cat.colorKey)}`}
              >
                {cat.name}
              </button>
            ))}
        </div>
        {categoryMutation.isError ? (
          <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
            {normalizeApiError(categoryMutation.error).message}
          </p>
        ) : null}
      </div>

      <hr className="border-app-border" />

      {/* Priority */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
          Priority
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getPriorityBadgeClass(currentPriority)}`}
          >
            {getPriorityLabel(currentPriority)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_OPTIONS.slice(1).map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={priorityMutation.isPending || currentPriority === opt.value}
              onClick={() => priorityMutation.mutate(opt.value as FeedbackPriority)}
              className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black ring-1 transition disabled:opacity-50 ${
                currentPriority === opt.value ? "ring-2 ring-offset-1" : ""
              } ${getPriorityBadgeClass(opt.value)}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {priorityMutation.isError ? (
          <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
            {normalizeApiError(priorityMutation.error).message}
          </p>
        ) : null}
      </div>

      <hr className="border-app-border" />

      {/* Status */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
          Status
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-black ring-1 ${getStatusBadgeClass(currentStatus)}`}
          >
            {getStatusIcon(currentStatus)}
            {getStatusLabel(currentStatus)}
          </span>
        </div>
        {availableTransitions.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-app-text-muted mb-2">Move to:</p>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((transition) => (
                <button
                  key={transition}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(transition)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black ring-1 transition-all ${
                    isUpdating
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:shadow-sm active:scale-[0.97]"
                  } ${getStatusBadgeClass(transition)}`}
                  aria-label={`Change status to ${getStatusLabel(transition)}`}
                >
                  {getStatusIcon(transition)}
                  {getStatusLabel(transition)}
                  {isUpdating && statusMutation.variables === transition ? (
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {statusMutation.isError ? (
          <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
            {normalizeApiError(statusMutation.error).message}
          </p>
        ) : null}
      </div>

      <hr className="border-app-border" />

      {/* Activity timeline */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-3">
          Activity
        </h3>
        {activityLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-md bg-app-surface-muted" />
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        ) : null}
      </div>

      <hr className="border-app-border" />

      {/* Add internal note */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
          Internal Note
        </h3>
        <p className="text-xs font-medium text-app-text-muted mb-2">
          Notes are private to business members and cannot be edited or deleted after
          posting.
        </p>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a private note\u2026"
          rows={3}
          maxLength={noteMaxLength}
          className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm font-medium outline-none resize-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 transition"
          aria-label="Internal note"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <p
            className={`text-xs font-semibold ${
              noteCharCount > noteMaxLength
                ? "text-red-600 dark:text-red-400"
                : "text-app-text-muted"
            }`}
          >
            {noteCharCount}/{noteMaxLength}
          </p>
          <button
            type="button"
            disabled={!isNoteValid || noteMutation.isPending}
            onClick={handleAddNote}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black transition-all ${
              isNoteValid && !noteMutation.isPending
                ? "bg-app-primary text-white hover:bg-app-primary-hover active:scale-[0.97]"
                : "cursor-not-allowed bg-app-surface-muted text-app-text-muted"
            }`}
          >
            {noteMutation.isPending ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                Adding\u2026
              </>
            ) : (
              <>
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Note
              </>
            )}
          </button>
        </div>
        {noteMutation.isError ? (
          <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
            {normalizeApiError(noteMutation.error).message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }): JSX.Element {
  const timeLabel = formatDate(activity.createdAt);
  const actorLabel = getActivityActorLabel(activity);

  const renderActivityText = () => {
    if (activity.isSynthetic) {
      return (
        <>
          <p className="text-sm font-bold text-app-text">Feedback received</p>
          {activity.sourceLabel ? (
            <p className="text-xs font-semibold text-app-text-muted">
              via {activity.sourceLabel}
            </p>
          ) : null}
        </>
      );
    }

    switch (activity.type) {
      case "STATUS_CHANGED":
        return (
          <p className="text-sm font-bold text-app-text">
            {actorLabel} changed status from{" "}
            <span
              className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-black ring-1 ${getStatusBadgeClass(activity.fromStatus ?? "NEW")}`}
            >
              {getStatusLabel(activity.fromStatus ?? "")}
            </span>{" "}
            to{" "}
            <span
              className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-black ring-1 ${getStatusBadgeClass(activity.toStatus ?? "NEW")}`}
            >
              {getStatusLabel(activity.toStatus ?? "")}
            </span>
          </p>
        );

      case "NOTE_ADDED":
        return (
          <>
            <p className="text-sm font-bold text-app-text">{actorLabel} added a note</p>
            {activity.note ? (
              <p className="mt-0.5 text-sm text-app-text-muted whitespace-pre-wrap">
                {activity.note}
              </p>
            ) : null}
          </>
        );

      case "ASSIGNMENT_CHANGED":
        return (
          <p className="text-sm font-bold text-app-text">
            {actorLabel} changed assignment from{" "}
            <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold bg-app-surface-muted text-app-text ring-1 ring-app-border">
              {activity.fromValue ?? "Unassigned"}
            </span>{" "}
            to{" "}
            <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold bg-app-surface-muted text-app-text ring-1 ring-app-border">
              {activity.toValue ?? "Unassigned"}
            </span>
          </p>
        );

      case "CATEGORY_CHANGED":
        return (
          <p className="text-sm font-bold text-app-text">
            {actorLabel} changed category from{" "}
            <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold bg-app-surface-muted text-app-text ring-1 ring-app-border">
              {activity.fromValue ?? "Uncategorized"}
            </span>{" "}
            to{" "}
            <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold bg-app-surface-muted text-app-text ring-1 ring-app-border">
              {activity.toValue ?? "Uncategorized"}
            </span>
          </p>
        );

      case "PRIORITY_CHANGED":
        return (
          <p className="text-sm font-bold text-app-text">
            {actorLabel} changed priority from{" "}
            <span
              className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-black ring-1 ${getPriorityBadgeClass(activity.fromValue ?? "NORMAL")}`}
            >
              {getPriorityLabel(activity.fromValue ?? "NORMAL")}
            </span>{" "}
            to{" "}
            <span
              className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-black ring-1 ${getPriorityBadgeClass(activity.toValue ?? "NORMAL")}`}
            >
              {getPriorityLabel(activity.toValue ?? "NORMAL")}
            </span>
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`flex gap-3 rounded-md border border-app-border p-3 ${getActivityBgClass(activity.type, activity.isSynthetic)}`}
    >
      <span
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${getActivityTextClass(activity.type)}`}
      >
        {getActivityIcon(activity.type, activity.isSynthetic)}
      </span>
      <div className="min-w-0 flex-1 break-words">
        {renderActivityText()}
        <p className="mt-0.5 text-[10px] font-semibold text-app-text-muted">
          {timeLabel}
        </p>
      </div>
    </div>
  );
}

function getActivityActorLabel(activity: ActivityItem): string {
  if (activity.actorType === "SYSTEM" && activity.automationRuleName) {
    return `Automation rule "${activity.automationRuleName}"`;
  }

  if (activity.actorType === "SYSTEM") {
    return "System";
  }

  return activity.actor?.name ?? "A member";
}

function CustomerProfileSection({
  detail,
  businessId
}: {
  detail: FeedbackDetail;
  businessId: string;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [matchOpen, setMatchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matchesQuery = useQuery({
    queryKey: [
      "businesses",
      businessId,
      "feedback",
      detail.id,
      "customer-matches",
      matchSearch
    ],
    queryFn: () => fetchFeedbackCustomerMatches(businessId, detail.id, matchSearch),
    enabled: matchOpen
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback", detail.id]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback-inbox"]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "customers"]
      })
    ]);
  };

  const linkMutation = useMutation({
    mutationFn: (customerId: string | null) =>
      linkFeedbackCustomer(
        businessId,
        detail.id,
        customerId,
        detail.linkedCustomer?.id ?? null
      ),
    onSuccess: async () => {
      setError(null);
      setMatchOpen(false);
      await invalidate();
    },
    onError: (mutationError) => setError(normalizeApiError(mutationError).message)
  });

  const snapshotName = detail.customer.name ?? "Anonymous";
  const canMutate = detail.customerPermissions.canLinkFeedback;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-app-text-muted">
          Submitted customer information
        </h3>
        <div className="rounded-md border border-app-border bg-app-surface-muted/60 p-3 dark:bg-app-surface-muted/20">
          <div className="flex items-start gap-3">
            <CustomerAvatar name={detail.customer.name} />
            <div className="min-w-0">
              <p className="break-words text-sm font-black text-app-text">
                {snapshotName}
              </p>
              <p className="mt-1 break-all text-xs font-semibold text-app-text-muted">
                {detail.customer.email ?? "No submitted email"}
              </p>
              <p className="mt-1 break-all text-xs font-semibold text-app-text-muted">
                {detail.customer.phone ?? "No submitted phone"}
              </p>
              <p className="mt-2 text-xs font-semibold text-app-text-muted">
                Historical snapshot from the original submission. Customer profile edits
                do not change it.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-app-text-muted">
          Linked customer
        </h3>
        {detail.linkedCustomer ? (
          <div className="rounded-md border border-app-border bg-app-surface-muted/60 p-3 dark:bg-app-surface-muted/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-app-text">
                  {detail.linkedCustomer.displayName}
                </p>
                <p className="mt-1 break-all text-xs font-semibold text-app-text-muted">
                  {detail.linkedCustomer.email ??
                    detail.linkedCustomer.phone ??
                    "No contact"}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${
                    detail.linkedCustomer.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
                      : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700"
                  }`}
                >
                  {detail.linkedCustomer.status === "ACTIVE" ? "Active" : "Archived"}
                </span>
              </div>
              <Link
                to={`/business/${businessId}/customers/${detail.linkedCustomer.id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-app-border px-3 text-sm font-black text-app-primary hover:bg-app-primary-soft"
              >
                View Customer
              </Link>
            </div>
            {canMutate ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMatchOpen(true)}
                  className="rounded-md border border-app-border px-3 py-2 text-sm font-black text-app-text hover:bg-app-surface"
                >
                  Change Customer
                </button>
                <button
                  type="button"
                  onClick={() => linkMutation.mutate(null)}
                  disabled={linkMutation.isPending}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:hover:bg-red-950/30"
                >
                  Unlink Customer
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-app-border bg-app-surface-muted/40 p-3">
            <p className="text-sm font-semibold text-app-text-muted">
              No customer profile is linked to this feedback.
            </p>
            {canMutate ? (
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => setMatchOpen(true)}
                  className="rounded-md border border-app-border px-3 py-2 text-sm font-black text-app-primary hover:bg-app-primary-soft"
                >
                  Find / Link Customer
                </button>
                {detail.customerPermissions.canCreateFromFeedback ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="rounded-md border border-app-border px-3 py-2 text-sm font-black text-app-text hover:bg-app-surface"
                  >
                    Create Customer from Feedback
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-app-text-muted">
                Your role has read-only access to customer links.
              </p>
            )}
          </div>
        )}
      </div>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      {matchOpen ? (
        <MatchModal
          search={matchSearch}
          onSearch={setMatchSearch}
          onClose={() => setMatchOpen(false)}
          matches={matchesQuery.data}
          isLoading={matchesQuery.isLoading}
          onSelect={(customerId) => linkMutation.mutate(customerId)}
        />
      ) : null}

      {createOpen ? (
        <CustomerFormModal
          title="Create customer from feedback"
          initialValues={{
            displayName: detail.customer.name ?? "",
            email: detail.customer.email ?? "",
            phone: detail.customer.phone ?? ""
          }}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            await createCustomerFromFeedback(businessId, detail.id, {
              ...values,
              expectedCustomerId: detail.linkedCustomer?.id ?? null
            });
            setCreateOpen(false);
            await invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

function MatchModal({
  search,
  onSearch,
  onClose,
  matches,
  isLoading,
  onSelect
}: {
  search: string;
  onSearch: (value: string) => void;
  onClose: () => void;
  matches?: CustomerMatchGroups;
  isLoading: boolean;
  onSelect: (customerId: string) => void;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-app-border bg-app-surface p-5 shadow-2xl dark:bg-[rgb(10,25,51)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-app-text">Find or link customer</h2>
          <button type="button" onClick={onClose} aria-label="Close customer matches">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <label className="relative mt-4 block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search by name, email, or phone..."
            className="h-11 w-full rounded-md border border-app-border bg-app-surface-muted pl-9 pr-3 text-sm font-semibold text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
          />
        </label>
        <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 rounded-md bg-app-surface-muted" />
              ))}
            </div>
          ) : (
            <>
              <MatchGroup
                title="Exact email matches"
                items={matches?.exactEmailMatches ?? []}
                onSelect={onSelect}
              />
              <MatchGroup
                title="Exact phone matches"
                items={matches?.exactPhoneMatches ?? []}
                onSelect={onSelect}
              />
              <MatchGroup
                title="Conflicts"
                items={matches?.conflictingMatches ?? []}
                onSelect={onSelect}
              />
              <MatchGroup
                title="Name suggestions"
                items={matches?.exactNameSuggestions ?? []}
                onSelect={onSelect}
              />
              <MatchGroup
                title="Archived matches"
                items={matches?.archivedMatches ?? []}
                onSelect={onSelect}
                disabled
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchGroup({
  title,
  items,
  onSelect,
  disabled = false
}: {
  title: string;
  items: CustomerMatchSummary[];
  onSelect: (customerId: string) => void;
  disabled?: boolean;
}): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xs font-black uppercase tracking-wide text-app-text-muted">
        {title}
      </h3>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border border-app-border bg-app-surface-muted/40 p-3"
          >
            <div className="min-w-0">
              <p className="break-words text-sm font-black text-app-text">
                {item.displayName}
              </p>
              <p className="break-all text-xs font-semibold text-app-text-muted">
                {item.email ?? item.phone ?? "No contact"}
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.id)}
              className="rounded-md border border-app-border px-3 py-2 text-xs font-black text-app-primary disabled:cursor-not-allowed disabled:text-app-text-muted"
            >
              {disabled ? "Archived" : "Select"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailContent({
  detail,
  businessId
}: {
  detail: FeedbackDetail;
  businessId: string;
}): JSX.Element {
  return (
    <div className="min-w-0 space-y-5 break-words">
      <CustomerProfileSection detail={detail} businessId={businessId} />

      {/* Channel, Branch, Priority, Category */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Channel
          </h3>
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getChannelBadgeClass(detail.channel)}`}
          >
            {getChannelLabel(detail.channel)}
          </span>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Branch
          </h3>
          <p className="break-words text-sm font-bold text-app-text">
            {detail.branch.name}
          </p>
          {detail.branch.location ? (
            <p className="break-words text-xs text-app-text-muted">
              {detail.branch.location}
            </p>
          ) : null}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Priority
          </h3>
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getPriorityBadgeClass(detail.priority)}`}
          >
            {getPriorityLabel(detail.priority)}
          </span>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Category
          </h3>
          {detail.category ? (
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getCategoryBadgeClass(detail.category.colorKey)}`}
            >
              {detail.category.name}
            </span>
          ) : (
            <p className="text-sm text-app-text-muted">Uncategorized</p>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
          Assigned to
        </h3>
        <AssigneeBadge assignee={detail.assignedTo} />
      </div>

      {/* Rating */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
          Rating
        </h3>
        <StarRating rating={detail.rating} />
      </div>

      {/* Title and message */}
      {detail.title ? (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Title
          </h3>
          <p className="break-words font-bold text-app-text">{detail.title}</p>
        </div>
      ) : null}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
          Message
        </h3>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-app-text">
          {detail.message}
        </p>
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Received
          </h3>
          <p className="text-sm font-semibold text-app-text">
            {formatDate(detail.receivedAt)}
          </p>
        </div>
        {detail.occurredAt ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
              Occurred
            </h3>
            <p className="text-sm font-semibold text-app-text">
              {formatDate(detail.occurredAt)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Source */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
          Source
        </h3>
        <div className="rounded-md border border-app-border bg-app-surface-muted/60 p-3 dark:bg-app-surface-muted/20">
          <p className="text-sm font-bold text-app-text">{detail.source.label}</p>
          {detail.source.detail ? (
            <p className="mt-0.5 break-words text-xs text-app-text-muted">
              {detail.source.detail}
            </p>
          ) : null}
          {detail.source.reference ? (
            <p className="mt-0.5 break-words text-xs text-app-text-muted">
              Reference: {detail.source.reference}
            </p>
          ) : null}
          {detail.source.note ? (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-app-text-muted">
              {detail.source.note}
            </p>
          ) : null}
          {detail.source.url ? (
            <a
              href={detail.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-app-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Open external reference
            </a>
          ) : null}
        </div>
      </div>

      {/* Attachments */}
      {detail.attachments.length > 0 ? (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
            Attachments ({detail.attachments.length})
          </h3>
          <div className="space-y-2">
            {detail.attachments.map((att) => (
              <AttachmentRow key={att.id} attachment={att} />
            ))}
          </div>
        </div>
      ) : null}

      <AIAnalysisPanel
        businessId={businessId}
        feedbackId={detail.id}
        analysis={detail.aiAnalysis}
        currentCategory={detail.category}
      />

      {/* Workflow panel: assignment, category, priority, status, notes, activity */}
      <hr className="border-app-border" />
      <WorkflowPanel
        businessId={businessId}
        feedbackId={detail.id}
        currentStatus={detail.status}
        availableTransitions={detail.availableTransitions}
        currentAssignee={detail.assignedTo}
        currentCategory={detail.category}
        currentPriority={detail.priority}
      />

      {/* Footer note */}
      <div className="rounded-md border border-dashed border-app-border bg-app-surface-muted/40 p-3 text-center">
        <p className="text-xs font-semibold text-app-text-muted">
          This feedback is read-only. You cannot edit or delete feedback.
        </p>
      </div>
    </div>
  );
}

function AttachmentRow({
  attachment
}: {
  attachment: FeedbackAttachmentResponse;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-app-border bg-app-surface-muted/60 px-3 py-2.5 dark:bg-app-surface-muted/20">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-app-text">{attachment.filename}</p>
        <p className="text-xs text-app-text-muted">
          {attachment.mimeType}
          {attachment.sizeBytes !== null
            ? ` \u00b7 ${formatSize(attachment.sizeBytes)}`
            : null}
          {attachment.checksum
            ? ` \u00b7 ${attachment.checksum.slice(0, 12)}\u2026`
            : null}
        </p>
      </div>
      {attachment.externalUrl ? (
        <a
          href={attachment.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold text-app-primary transition hover:bg-app-primary-soft"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Open external reference
        </a>
      ) : null}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

function AIAnalysisPanel({
  businessId,
  feedbackId,
  analysis,
  currentCategory
}: {
  businessId: string;
  feedbackId: string;
  analysis: AIAnalysisSummary | null;
  currentCategory: CategoryInfo | null;
}): JSX.Element {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback-inbox"]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback", feedbackId]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "feedback-ai-status"]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "customers"]
      })
    ]);
  };
  const retryMutation = useMutation({
    mutationFn: () => retryFeedbackAIAnalysis(businessId, feedbackId),
    onSuccess: invalidate
  });
  const applyMutation = useMutation({
    mutationFn: () => applyAICategorySuggestion(businessId, feedbackId),
    onSuccess: invalidate
  });
  const dismissMutation = useMutation({
    mutationFn: () => dismissAICategorySuggestion(businessId, feedbackId),
    onSuccess: invalidate
  });
  const mutationError =
    retryMutation.error ?? applyMutation.error ?? dismissMutation.error ?? null;
  const isBusy =
    retryMutation.isPending || applyMutation.isPending || dismissMutation.isPending;
  const isAnalysisInFlight =
    analysis?.status === "PENDING" || analysis?.status === "PROCESSING";
  const hasGeneratedResult = Boolean(
    analysis?.summary || analysis?.sentiment || analysis?.detectedLanguage
  );
  const retryDisabled = isBusy || isAnalysisInFlight;

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-app-text">AI Analysis</h3>
          <p className="mt-1 text-xs font-semibold text-app-text-muted">
            AI-generated metadata. Original feedback remains the source of truth.
          </p>
        </div>
        <span className="inline-flex rounded-md bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-800">
          AI-generated
        </span>
      </div>

      {!analysis ? (
        <div className="mt-4 rounded-md border border-app-border bg-app-surface p-3 text-sm font-semibold text-app-text-muted">
          No analysis has been queued for this feedback yet.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {analysis.status === "PENDING" ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              Retry queued.{" "}
              {hasGeneratedResult
                ? "Showing the previous AI review until the new one finishes."
                : "The AI review will appear here after the worker finishes."}
            </p>
          ) : null}

          {analysis.status === "PROCESSING" ? (
            <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
              AI review is being generated.{" "}
              {hasGeneratedResult ? "The previous result remains visible for now." : ""}
            </p>
          ) : null}

          {analysis.status === "FAILED" && hasGeneratedResult ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              The latest retry failed. The last completed AI review is still shown below.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getSentimentBadgeClass(analysis.sentiment)}`}
            >
              {getSentimentLabel(analysis.sentiment)}
            </span>
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getAIStatusBadgeClass(analysis.status)}`}
            >
              {getAIStatusLabel(analysis.status)}
            </span>
            {analysis.sentimentConfidenceLevel ? (
              <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60">
                {getConfidenceLabel(analysis.sentimentConfidenceLevel)}
              </span>
            ) : null}
            {analysis.categorySuggestionState !== "NONE" ? (
              <span className="inline-flex rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-black text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-900/60">
                {getAISuggestionStateLabel(analysis.categorySuggestionState)}
              </span>
            ) : null}
          </div>

          {analysis.summary ? (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
                Summary
              </h4>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-app-text">
                {analysis.summary}
              </p>
            </div>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-app-surface p-3">
              <dt className="text-xs font-black text-app-text-muted">Language</dt>
              <dd className="mt-1 break-words text-sm font-bold text-app-text">
                {analysis.detectedLanguage ?? "Not detected"}
              </dd>
            </div>
            <div className="rounded-md bg-app-surface p-3">
              <dt className="text-xs font-black text-app-text-muted">
                Suggested category
              </dt>
              <dd className="mt-1">
                {analysis.suggestedCategory ? (
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black ring-1 ${getCategoryBadgeClass(analysis.suggestedCategory.colorKey)}`}
                  >
                    {analysis.suggestedCategory.name}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-app-text-muted">
                    Uncategorized
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {analysis.inputTruncated ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              Analysis used a shortened version of this Feedback.
            </p>
          ) : null}

          {analysis.errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              {analysis.errorMessage}
            </p>
          ) : null}

          {analysis.suggestionDismissedAt ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              Suggestion dismissed by a human reviewer.
            </p>
          ) : null}

          {analysis.categorySuggestionState === "CONFLICTED" ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              Human category choices won. The AI suggestion was not applied.
            </p>
          ) : null}

          {analysis.categorySuggestionState === "AUTO_APPLIED" ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              AI applied this category automatically.
            </p>
          ) : null}

          {currentCategory ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              Human category choices always win. AI will not replace the current category.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {analysis.permissions.canApplySuggestion ? (
              <WorkspaceButton
                onClick={() => applyMutation.mutate()}
                disabled={isBusy || Boolean(currentCategory)}
              >
                Apply suggestion
              </WorkspaceButton>
            ) : null}
            {analysis.permissions.canDismissSuggestion ? (
              <WorkspaceButton
                tone="secondary"
                onClick={() => dismissMutation.mutate()}
                disabled={isBusy}
              >
                Dismiss
              </WorkspaceButton>
            ) : null}
            {analysis.permissions.canRetry ? (
              <WorkspaceButton
                tone="secondary"
                onClick={() => retryMutation.mutate()}
                disabled={retryDisabled}
              >
                <RefreshCw
                  className={`h-4 w-4 ${retryMutation.isPending ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {isAnalysisInFlight ? "Queued" : "Retry"}
              </WorkspaceButton>
            ) : null}
          </div>

          {mutationError ? (
            <p className="text-sm font-semibold text-app-error" role="alert">
              {normalizeApiError(mutationError).message}
            </p>
          ) : null}

          <p className="text-xs font-semibold text-app-text-muted">
            Generated with {analysis.provider} · {analysis.model} ·{" "}
            {analysis.promptVersion}
          </p>
        </div>
      )}
    </section>
  );
}

export function FeedbackInboxPage({
  branches,
  businessContext
}: {
  branches: BranchSummary[];
  businessContext: BusinessContext;
}): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);
  const [managementDialog, setManagementDialog] = useState<{
    kind: "edit" | "status" | "category" | "delete" | "deleteAll";
    item?: FeedbackListItem;
  } | null>(null);

  // Read filter state from URL
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const search = searchParams.get("search") ?? "";
  const branchId = searchParams.get("branchId") ?? "";
  const channel = searchParams.get("channel") ?? "";
  const status = searchParams.get("status") ?? "";
  const sentiment = searchParams.get("sentiment") ?? "";
  const aiStatus = searchParams.get("aiStatus") ?? "";
  const aiSuggestionState = searchParams.get("aiSuggestionState") ?? "";
  const assignedTo = searchParams.get("assignedTo") ?? "";
  const assignmentState = searchParams.get("assignmentState") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const categoryState = searchParams.get("categoryState") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const ratingMin = searchParams.get("ratingMin") ?? "";
  const ratingMax = searchParams.get("ratingMax") ?? "";
  const includeUnrated = searchParams.get("includeUnrated") === "true";
  const datePreset = searchParams.get("datePreset") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const customerLinkState = searchParams.get("customerLinkState") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const feedbackId = searchParams.get("feedbackId") ?? null;

  const query: FeedbackInboxQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      branchId: branchId || undefined,
      channel: (channel as FeedbackInboxQuery["channel"]) || undefined,
      status: (status as FeedbackInboxQuery["status"]) || undefined,
      sentiment: (sentiment as FeedbackInboxQuery["sentiment"]) || undefined,
      aiStatus: (aiStatus as FeedbackInboxQuery["aiStatus"]) || undefined,
      aiSuggestionState:
        (aiSuggestionState as FeedbackInboxQuery["aiSuggestionState"]) || undefined,
      assignedTo: assignedTo || undefined,
      assignmentState:
        (assignmentState as FeedbackInboxQuery["assignmentState"]) || undefined,
      categoryId: categoryId || undefined,
      categoryState: (categoryState as FeedbackInboxQuery["categoryState"]) || undefined,
      priority: (priority as FeedbackInboxQuery["priority"]) || undefined,
      rating: rating ? parseInt(rating, 10) : undefined,
      ratingMin: ratingMin ? parseInt(ratingMin, 10) : undefined,
      ratingMax: ratingMax ? parseInt(ratingMax, 10) : undefined,
      includeUnrated,
      datePreset: (datePreset as FeedbackInboxQuery["datePreset"]) || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      customerLinkState:
        (customerLinkState as FeedbackInboxQuery["customerLinkState"]) || undefined,
      sort: sort as "newest" | "oldest"
    }),
    [
      page,
      pageSize,
      search,
      branchId,
      channel,
      status,
      sentiment,
      aiStatus,
      aiSuggestionState,
      assignedTo,
      assignmentState,
      categoryId,
      categoryState,
      priority,
      rating,
      ratingMin,
      ratingMax,
      includeUnrated,
      datePreset,
      dateFrom,
      dateTo,
      customerLinkState,
      sort
    ]
  );

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["businesses", businessContext.businessId, "feedback-inbox", query],
    queryFn: () => fetchFeedbackList(businessContext.businessId, query)
  });

  const categoriesQuery = useQuery({
    queryKey: [
      "businesses",
      businessContext.businessId,
      "feedback-categories",
      "filters"
    ],
    queryFn: () => fetchCategories(businessContext.businessId, true)
  });

  const membershipsQuery = useQuery({
    queryKey: [
      "businesses",
      businessContext.businessId,
      "memberships",
      "active-assignee-filter"
    ],
    queryFn: () =>
      fetchMemberships(businessContext.businessId, {
        status: "ACTIVE"
      })
  });

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      const isDefaultPage = key === "page" && value === "1";
      const isDefaultPageSize = key === "pageSize" && value === "20";
      if (value === undefined || value === "" || isDefaultPage || isDefaultPageSize) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  const handleSearch = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("page");
    if (value) newParams.set("search", value);
    else newParams.delete("search");
    setSearchParams(newParams);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("page");
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams);
  };

  const handleCategorySelection = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("page");
    newParams.delete("categoryId");
    newParams.delete("categoryState");
    if (value === "__uncategorized__") {
      newParams.set("categoryState", "uncategorized");
    } else if (value) {
      newParams.set("categoryId", value);
    }
    setSearchParams(newParams);
  };

  const handleDatePresetChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("page");
    if (!value) {
      newParams.delete("datePreset");
      newParams.delete("dateFrom");
      newParams.delete("dateTo");
    } else {
      newParams.set("datePreset", value);
      const range = getDatePresetRange(value);
      if (range) {
        newParams.set("dateFrom", range.from);
        newParams.set("dateTo", range.to);
      } else {
        newParams.delete("dateFrom");
        newParams.delete("dateTo");
      }
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    const newParams = new URLSearchParams();
    if (feedbackId) {
      newParams.set("feedbackId", feedbackId);
    }
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handlePageSizeChange = (newSize: number) => {
    updateParams({ pageSize: String(newSize), page: "1" });
  };

  const handleSelectFeedback = (id: string) => {
    updateParams({ feedbackId: id });
  };

  const handleCloseDetail = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("feedbackId");
    setSearchParams(newParams);
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ["businesses", businessContext.businessId, "feedback-inbox"]
    });
  };

  const items = data?.items ?? [];
  const canManage =
    businessContext.membership.role === "OWNER" ||
    businessContext.membership.role === "ADMIN";
  const collectionView = useCollectionView(
    `business-${businessContext.businessId}-feedback`,
    items.length
  );
  const categories = categoriesQuery.data ?? [];
  const assignees =
    membershipsQuery.data?.memberships
      .filter((membership: MembershipSummary) => membership.status === "ACTIVE")
      .map((membership: MembershipSummary) => ({
        membershipId: membership.id,
        name: `${membership.user?.firstName ?? "Member"} ${membership.user?.lastName ?? ""}`.trim(),
        role: membership.role
      })) ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  };
  const summary = data?.summary ?? {
    total: 0,
    manual: 0,
    publicForm: 0,
    qrCode: 0,
    external: 0
  };
  const {
    page: _selectionPage,
    pageSize: _selectionPageSize,
    sort: _selectionSort,
    ...selectionFilters
  } = query;
  const selection: FeedbackSelection = allMatchingSelected
    ? { allMatching: true, filters: selectionFilters }
    : { feedbackIds: [...selectedIds] };
  const selectedCount = allMatchingSelected ? pagination.totalItems : selectedIds.size;
  const toggleSelected = (id: string) => {
    setAllMatchingSelected(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => {
    setSelectedIds(new Set());
    setAllMatchingSelected(false);
  };
  const handleManagementAction = (
    action: FeedbackManagementAction,
    item: FeedbackListItem
  ) => {
    if (action === "view") return handleSelectFeedback(item.id);
    setManagementDialog({ kind: action, item });
  };
  const handleManagementComplete = async () => {
    clearSelection();
    setManagementDialog(null);
    handleCloseDetail();
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessContext.businessId, "feedback-inbox"]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessContext.businessId, "owner-dashboard"]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessContext.businessId, "feedback-dashboard"]
      }),
      queryClient.invalidateQueries({
        queryKey: ["businesses", businessContext.businessId, "customers"]
      })
    ]);
  };

  const hasFilters = Boolean(
    search ||
    branchId ||
    channel ||
    status ||
    sentiment ||
    aiStatus ||
    aiSuggestionState ||
    assignedTo ||
    categoryId ||
    priority ||
    rating ||
    ratingMin ||
    ratingMax ||
    includeUnrated ||
    datePreset ||
    dateFrom ||
    dateTo ||
    assignmentState ||
    categoryState ||
    customerLinkState
  );
  const hasFeedback = summary.total > 0;
  const activeChips: ActiveFilterChip[] = [
    ...(search
      ? [{ key: "search", label: `Search: ${search}`, clears: ["search"] }]
      : []),
    ...(branchId
      ? [
          {
            key: "branchId",
            label: `Branch: ${branches.find((branch) => branch.id === branchId)?.name ?? "Selected"}`,
            clears: ["branchId"]
          }
        ]
      : []),
    ...(status
      ? [
          {
            key: "status",
            label: `Status: ${getStatusLabel(status)}`,
            clears: ["status"]
          }
        ]
      : []),
    ...(sentiment
      ? [
          {
            key: "sentiment",
            label: `Sentiment: ${getSentimentLabel(sentiment)}`,
            clears: ["sentiment"]
          }
        ]
      : []),
    ...(aiStatus
      ? [
          {
            key: "aiStatus",
            label: `AI state: ${getAIStatusLabel(aiStatus)}`,
            clears: ["aiStatus"]
          }
        ]
      : []),
    ...(aiSuggestionState
      ? [
          {
            key: "aiSuggestionState",
            label: `AI suggestion: ${getAISuggestionStateLabel(aiSuggestionState)}`,
            clears: ["aiSuggestionState"]
          }
        ]
      : []),
    ...(channel
      ? [
          {
            key: "channel",
            label: `Channel: ${getChannelLabel(channel)}`,
            clears: ["channel"]
          }
        ]
      : []),
    ...(assignedTo
      ? [
          {
            key: "assignedTo",
            label:
              assignedTo === "me"
                ? "Assignee: Me"
                : assignedTo === "unassigned"
                  ? "Assignee: Unassigned"
                  : `Assignee: ${assignees.find((item) => item.membershipId === assignedTo)?.name ?? "Selected"}`,
            clears: ["assignedTo"]
          }
        ]
      : []),
    ...(assignmentState
      ? [
          {
            key: "assignmentState",
            label:
              assignmentState === "assigned"
                ? "Assignment: Assigned"
                : "Assignment: Unassigned",
            clears: ["assignmentState"]
          }
        ]
      : []),
    ...(categoryId
      ? [
          {
            key: "categoryId",
            label: `Category: ${categories.find((item) => item.id === categoryId)?.name ?? "Selected"}`,
            clears: ["categoryId"]
          }
        ]
      : []),
    ...(categoryState
      ? [
          {
            key: "categoryState",
            label:
              categoryState === "categorized"
                ? "Category: Categorized"
                : "Category: Uncategorized",
            clears: ["categoryState"]
          }
        ]
      : []),
    ...(priority
      ? [
          {
            key: "priority",
            label: `Priority: ${getPriorityLabel(priority)}`,
            clears: ["priority"]
          }
        ]
      : []),
    ...(rating
      ? [{ key: "rating", label: `Rating: ${rating} only`, clears: ["rating"] }]
      : []),
    ...(ratingMin || ratingMax || includeUnrated
      ? [
          {
            key: "ratingRange",
            label: `Rating: ${ratingMin || "1"}-${ratingMax || "5"}${includeUnrated ? " + unrated" : ""}`,
            clears: ["ratingMin", "ratingMax", "includeUnrated"]
          }
        ]
      : []),
    ...(datePreset
      ? [
          {
            key: "datePreset",
            label: `Received: ${datePreset.replace(/_/g, " ")}`,
            clears: ["datePreset", "dateFrom", "dateTo"]
          }
        ]
      : dateFrom || dateTo
        ? [
            {
              key: "dateRange",
              label: `Received: ${dateFrom || "Any"} to ${dateTo || "Any"}`,
              clears: ["dateFrom", "dateTo"]
            }
          ]
        : []),
    ...(customerLinkState
      ? [
          {
            key: "customerLinkState",
            label:
              customerLinkState === "linked" ? "Customer: Linked" : "Customer: Unlinked",
            clears: ["customerLinkState"]
          }
        ]
      : [])
  ];

  const handleRemoveChip = (chip: ActiveFilterChip) => {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    chip.clears.forEach((key) => next.delete(key));
    setSearchParams(next);
  };

  // Normalize page when it exceeds totalPages
  // updateParams is intentionally excluded from deps - it's recreated every render
  // and adding it would cause infinite re-renders
  useEffect(() => {
    if (pagination.totalPages > 0 && page > pagination.totalPages) {
      updateParams({ page: String(pagination.totalPages) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.totalPages, page]);

  return (
    <>
      <WorkspaceShell
        title="All Feedback"
        subtitle="Review customer feedback from every active collection channel."
        businesses={businessContext.businesses}
        activeBusiness={businessContext.activeBusiness}
        actions={
          <WorkspaceButton onClick={handleRefresh} tone="secondary">
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </WorkspaceButton>
        }
      >
        {businessContext.business.status === "SUSPENDED" ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            This business is suspended. Feedback data may not be accessible.
          </div>
        ) : null}

        {/* Summary cards */}
        {isLoading ? (
          <SummarySkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Total Feedback"
              value={summary.total}
              color="text-app-text"
            />
            <SummaryCard
              label="Manual Entry"
              value={summary.manual}
              color="text-indigo-500 dark:text-indigo-400"
            />
            <SummaryCard
              label="Public Portal"
              value={summary.publicForm}
              color="text-emerald-500 dark:text-emerald-400"
            />
            <SummaryCard
              label="QR Codes"
              value={summary.qrCode}
              color="text-amber-500 dark:text-amber-400"
            />
            <SummaryCard
              label="External Channels"
              value={summary.external}
              color="text-sky-500 dark:text-sky-400"
            />
          </div>
        )}

        {/* Filters */}
        <div className="mt-5">
          <Filters
            search={search}
            onSearch={handleSearch}
            branchId={branchId}
            onBranchId={(v) => handleFilterChange("branchId", v)}
            channel={channel}
            onChannel={(v) => handleFilterChange("channel", v)}
            status={status}
            onStatus={(v) => handleFilterChange("status", v)}
            sentiment={sentiment}
            onSentiment={(v) => handleFilterChange("sentiment", v)}
            aiStatus={aiStatus}
            onAIStatus={(v) => handleFilterChange("aiStatus", v)}
            aiSuggestionState={aiSuggestionState}
            onAISuggestionState={(v) => handleFilterChange("aiSuggestionState", v)}
            rating={rating}
            onRating={(v) => handleFilterChange("rating", v)}
            ratingMin={ratingMin}
            onRatingMin={(v) => handleFilterChange("ratingMin", v)}
            ratingMax={ratingMax}
            onRatingMax={(v) => handleFilterChange("ratingMax", v)}
            includeUnrated={includeUnrated}
            onIncludeUnrated={(v) =>
              handleFilterChange("includeUnrated", v ? "true" : "")
            }
            datePreset={datePreset}
            onDatePreset={handleDatePresetChange}
            dateFrom={dateFrom}
            onDateFrom={(v) => handleFilterChange("dateFrom", v)}
            dateTo={dateTo}
            onDateTo={(v) => handleFilterChange("dateTo", v)}
            sort={sort}
            onSort={(v) => handleFilterChange("sort", v)}
            branches={branches}
            categories={categories}
            assignees={assignees}
            assignedTo={assignedTo}
            onAssignedTo={(v) => handleFilterChange("assignedTo", v)}
            assignmentState={assignmentState}
            onAssignmentState={(v) => handleFilterChange("assignmentState", v)}
            categoryId={categoryId}
            onCategorySelection={handleCategorySelection}
            categoryState={categoryState}
            priority={priority}
            onPriority={(v) => handleFilterChange("priority", v)}
            customerLinkState={customerLinkState}
            onCustomerLinkState={(v) => handleFilterChange("customerLinkState", v)}
            onClear={handleClearFilters}
            branchScopeLimited={
              !canManage && !businessContext.membership.allBranchesAccess
            }
          />
          <ActiveFilterChips
            chips={activeChips}
            onRemove={handleRemoveChip}
            onClearAll={handleClearFilters}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-app-text-muted">
              {pagination.totalItems} feedback records
            </p>
            {canManage && pagination.totalItems > 0 ? (
              <button
                type="button"
                onClick={() => setManagementDialog({ kind: "deleteAll" })}
                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-200 px-2.5 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove all
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && items.length ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAllMatchingSelected(false);
                    setSelectedIds(new Set(items.map((item) => item.id)));
                  }}
                  className="min-h-9 rounded-md border border-app-border px-3 text-xs font-black hover:bg-app-surface-muted"
                >
                  Select visible
                </button>
                {pagination.totalItems > items.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAllMatchingSelected(true);
                      setSelectedIds(new Set());
                    }}
                    className="min-h-9 rounded-md border border-app-border px-3 text-xs font-black hover:bg-app-surface-muted"
                  >
                    Select all {pagination.totalItems} feedback
                  </button>
                ) : null}
              </>
            ) : null}
            <CollectionViewToggle
              view={collectionView.view}
              onChange={collectionView.setView}
              label="Feedback view"
            />
          </div>
        </div>

        {canManage && selectedCount > 0 ? (
          <div className="sticky top-2 z-20 mt-4 flex flex-col gap-3 rounded-xl border border-app-primary/30 bg-app-surface/95 p-3 shadow-panel backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
            <p className="text-sm font-black text-app-text">
              {allMatchingSelected
                ? `All ${selectedCount} matching feedback selected`
                : `${selectedCount} feedback selected`}
            </p>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => setManagementDialog({ kind: "status" })}
                className="min-h-10 rounded-lg bg-app-primary px-3 text-xs font-black text-app-primary-foreground"
              >
                Change status
              </button>
              <button
                type="button"
                onClick={() => setManagementDialog({ kind: "category" })}
                className="min-h-10 rounded-lg border border-app-border px-3 text-xs font-black"
              >
                Categorize
              </button>
              <button
                type="button"
                onClick={() => setManagementDialog({ kind: "delete" })}
                className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-black text-red-600 dark:border-red-900/60 dark:text-red-300"
              >
                Delete selected
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="min-h-10 rounded-lg px-3 text-xs font-black text-app-text-muted"
              >
                Clear selection
              </button>
            </div>
          </div>
        ) : null}

        {/* Loading state */}
        {isLoading ? (
          <div className="mt-5">
            <ListSkeleton />
          </div>
        ) : error ? (
          /* Error state */
          <div className="mt-5">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
              <AlertCircle className="mx-auto h-8 w-8 text-red-400" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-black text-red-700 dark:text-red-200">
                Failed to load feedback
              </h2>
              <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-300">
                {normalizeApiError(error).message}
              </p>
              <div className="mt-4 flex justify-center">
                <WorkspaceButton onClick={handleRefresh} tone="secondary">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Retry
                </WorkspaceButton>
              </div>
            </div>
          </div>
        ) : !hasFeedback ? (
          /* Empty inbox */
          <div className="mt-5">
            <EmptyState
              icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
              title="No feedback has been received yet."
              description="Manual, public, QR, and connected-channel feedback will appear here when available."
              action={
                <WorkspaceButton
                  to={`/business/${businessContext.businessId}/feedback/manual`}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Add Feedback
                </WorkspaceButton>
              }
            />
          </div>
        ) : items.length === 0 && hasFilters ? (
          /* No results */
          <div className="mt-5">
            <EmptyState
              icon={<Search className="h-6 w-6" aria-hidden="true" />}
              title="No feedback matches these filters."
              description="Try adjusting your search, branch, channel, rating, or date range."
              action={
                <WorkspaceButton onClick={handleClearFilters} tone="secondary">
                  <X className="h-4 w-4" />
                  Clear filters
                </WorkspaceButton>
              }
            />
          </div>
        ) : (
          /* Feedback list */
          <div className="mt-5">
            <WorkspacePanel>
              {/* Desktop table */}
              <div
                className={collectionView.view === "list" ? "hidden lg:block" : "hidden"}
              >
                <DesktopTable
                  items={items}
                  onSelect={handleSelectFeedback}
                  canManage={canManage}
                  selectedIds={selectedIds}
                  onToggleSelected={toggleSelected}
                  onAction={handleManagementAction}
                />
              </div>

              {/* Responsive list fallback and grid cards */}
              <div className={collectionView.view === "list" ? "lg:hidden" : "block"}>
                <MobileCards
                  items={items}
                  onSelect={handleSelectFeedback}
                  view={collectionView.view}
                  canManage={canManage}
                  selectedIds={selectedIds}
                  onToggleSelected={toggleSelected}
                  onAction={handleManagementAction}
                />
              </div>

              <PaginationBar
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                hasPreviousPage={pagination.hasPreviousPage}
                hasNextPage={pagination.hasNextPage}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </WorkspacePanel>
          </div>
        )}
      </WorkspaceShell>

      <DetailDrawer
        businessId={businessContext.businessId}
        feedbackId={feedbackId}
        onClose={handleCloseDetail}
      />
      <FeedbackManagementDialog
        state={managementDialog}
        businessId={businessContext.businessId}
        businessName={businessContext.activeBusiness.name}
        branches={branches}
        categories={categories}
        selection={
          managementDialog?.kind === "deleteAll"
            ? { allMatching: true, filters: {} }
            : managementDialog?.item
              ? { feedbackIds: [managementDialog.item.id] }
              : selection
        }
        affectedCount={
          managementDialog?.kind === "deleteAll"
            ? summary.total
            : managementDialog?.item
              ? 1
              : selectedCount
        }
        onClose={() => setManagementDialog(null)}
        onComplete={handleManagementComplete}
      />
    </>
  );
}

function FeedbackManagementDialog({
  state,
  businessId,
  businessName,
  branches,
  categories,
  selection,
  affectedCount,
  onClose,
  onComplete
}: {
  state: {
    kind: "edit" | "status" | "category" | "delete" | "deleteAll";
    item?: FeedbackListItem;
  } | null;
  businessId: string;
  businessName: string;
  branches: BranchSummary[];
  categories: CategoryInfo[];
  selection: FeedbackSelection;
  affectedCount: number;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const detail = useQuery({
    queryKey: ["businesses", businessId, "feedback", state?.item?.id],
    queryFn: () => fetchFeedbackDetail(businessId, state!.item!.id),
    enabled: state?.kind === "edit" && Boolean(state.item)
  });
  const [form, setForm] = useState({
    title: "",
    message: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    branchId: "",
    categoryId: "",
    status: "NEW",
    priority: "NORMAL"
  });
  const [choice, setChoice] = useState("");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    if (!detail.data) return;
    setForm({
      title: detail.data.title ?? "",
      message: detail.data.message,
      customerName: detail.data.customer.name ?? "",
      customerEmail: detail.data.customer.email ?? "",
      customerPhone: detail.data.customer.phone ?? "",
      branchId: detail.data.branch.id,
      categoryId: detail.data.category?.id ?? "",
      status: detail.data.status,
      priority: detail.data.priority
    });
  }, [detail.data]);
  useEffect(() => {
    setChoice("");
    setConfirmation("");
  }, [state?.kind, state?.item?.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!state) return;
      if (state.kind === "edit" && state.item && detail.data) {
        return editFeedback(businessId, state.item.id, {
          title: form.title.trim() || null,
          message: form.message,
          customerName: form.customerName.trim() || null,
          customerEmail: form.customerEmail.trim() || null,
          customerPhone: form.customerPhone.trim() || null,
          branchId: form.branchId,
          categoryId: form.categoryId || null,
          status: form.status as FeedbackStatus,
          priority: form.priority as FeedbackPriority,
          expectedUpdatedAt: detail.data.updatedAt
        });
      }
      if (state.kind === "status")
        return bulkUpdateFeedbackStatus(businessId, selection, choice as FeedbackStatus);
      if (state.kind === "category")
        return bulkCategorizeFeedback(
          businessId,
          selection,
          choice === "__uncategorized__" ? null : choice
        );
      if (state.kind === "delete" && state.item)
        return deleteFeedback(businessId, state.item.id);
      return bulkDeleteFeedback(
        businessId,
        selection,
        selection.allMatching ? "DELETE" : undefined
      );
    },
    onSuccess: onComplete
  });

  const title =
    state?.kind === "edit"
      ? "Edit feedback"
      : state?.kind === "status"
        ? "Change feedback status"
        : state?.kind === "category"
          ? "Categorize feedback"
          : state?.kind === "deleteAll"
            ? `Remove all feedback from ${businessName}?`
            : affectedCount === 1
              ? "Delete this feedback?"
              : "Delete selected feedback?";
  const destructive = state?.kind === "delete" || state?.kind === "deleteAll";
  const requiresTyping = destructive && Boolean(selection.allMatching);
  const submitDisabled =
    mutation.isPending ||
    (state?.kind === "edit" && (!detail.data || !form.message.trim())) ||
    ((state?.kind === "status" || state?.kind === "category") && choice === "") ||
    (requiresTyping && confirmation !== "DELETE");

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
    >
      <DialogContent className="max-h-[calc(100dvh-.5rem)] w-[calc(100vw-.5rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {destructive
              ? `${affectedCount} feedback record${affectedCount === 1 ? "" : "s"} will be removed from normal business, dashboard, report, and customer views. Customer, branch, integration, and ingestion records remain intact.`
              : state?.kind === "edit"
                ? "Editable application fields only. Channel, provider, external IDs, original timestamps, source metadata, connection IDs, and deduplication identifiers remain unchanged."
                : `This action is limited to ${affectedCount} selected feedback record${affectedCount === 1 ? "" : "s"} in ${businessName}.`}
          </DialogDescription>
        </DialogHeader>
        {state?.kind === "edit" ? (
          detail.isLoading ? (
            <p className="text-sm font-semibold text-app-text-muted">Loading feedback…</p>
          ) : (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <Field label="Title / subject">
                <input
                  value={form.title}
                  maxLength={250}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className="app-input"
                />
              </Field>
              <Field label="Branch">
                <AppSelectField
                  value={form.branchId}
                  onValueChange={(value) => setForm({ ...form, branchId: value })}
                  options={branches.map((branch) => ({
                    value: branch.id,
                    label: branch.name
                  }))}
                  ariaLabel="Feedback branch"
                />
              </Field>
              <Field label="Customer name">
                <input
                  value={form.customerName}
                  maxLength={160}
                  onChange={(event) =>
                    setForm({ ...form, customerName: event.target.value })
                  }
                  className="app-input"
                />
              </Field>
              <Field label="Customer email">
                <input
                  type="email"
                  value={form.customerEmail}
                  maxLength={255}
                  onChange={(event) =>
                    setForm({ ...form, customerEmail: event.target.value })
                  }
                  className="app-input"
                />
              </Field>
              <Field label="Customer phone">
                <input
                  value={form.customerPhone}
                  maxLength={40}
                  onChange={(event) =>
                    setForm({ ...form, customerPhone: event.target.value })
                  }
                  className="app-input"
                />
              </Field>
              <Field label="Category">
                <AppSelectField
                  value={form.categoryId}
                  onValueChange={(value) => setForm({ ...form, categoryId: value })}
                  options={[
                    { value: "", label: "Uncategorized" },
                    ...categories.map((category) => ({
                      value: category.id,
                      label: category.name
                    }))
                  ]}
                  ariaLabel="Feedback category"
                />
              </Field>
              <Field label="Status">
                <AppSelectField
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value })}
                  options={STATUS_OPTIONS.filter((item) => item.value)}
                  ariaLabel="Feedback status"
                />
              </Field>
              <Field label="Priority">
                <AppSelectField
                  value={form.priority}
                  onValueChange={(value) => setForm({ ...form, priority: value })}
                  options={PRIORITY_OPTIONS.filter((item) => item.value)}
                  ariaLabel="Feedback priority"
                />
              </Field>
              <Field label="Feedback message" wide>
                <textarea
                  value={form.message}
                  maxLength={20000}
                  rows={7}
                  required
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  className="app-input min-h-36 resize-y py-3"
                />
              </Field>
              <DialogFooter className="sm:col-span-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-lg border border-app-border px-4 text-sm font-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="min-h-11 rounded-lg bg-app-primary px-4 text-sm font-black text-app-primary-foreground disabled:opacity-50"
                >
                  {mutation.isPending ? "Saving…" : "Save changes"}
                </button>
              </DialogFooter>
            </form>
          )
        ) : null}
        {state?.kind === "status" ? (
          <AppSelectField
            value={choice}
            onValueChange={setChoice}
            options={STATUS_OPTIONS.filter((item) => item.value)}
            ariaLabel="New status"
            placeholder="Choose status"
          />
        ) : null}
        {state?.kind === "category" ? (
          <AppSelectField
            value={choice}
            onValueChange={setChoice}
            options={[
              { value: "__uncategorized__", label: "Uncategorized" },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name
              }))
            ]}
            ariaLabel="New category"
            placeholder="Choose category"
          />
        ) : null}
        {destructive && requiresTyping ? (
          <Field label="Type DELETE to confirm">
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className="app-input"
            />
          </Field>
        ) : null}
        {mutation.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {normalizeApiError(mutation.error).message}
          </p>
        ) : null}
        {state?.kind !== "edit" ? (
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="min-h-11 rounded-lg border border-app-border px-4 text-sm font-black"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={submitDisabled}
              className={`min-h-11 rounded-lg px-4 text-sm font-black text-white disabled:opacity-50 ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-app-primary"}`}
            >
              {mutation.isPending
                ? "Working…"
                : destructive
                  ? `Delete ${affectedCount} feedback`
                  : "Apply"}
            </button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  wide = false
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label
      className={`min-w-0 text-xs font-black uppercase tracking-wide text-app-text-muted ${wide ? "sm:col-span-2" : ""}`}
    >
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
