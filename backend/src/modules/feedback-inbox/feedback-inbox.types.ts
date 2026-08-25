import type {
  CustomerStatus,
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus
} from "@prisma/client";
import type { AIAnalysisSummary } from "../ai-analysis/ai-analysis.types.js";
import type { SuggestionStateFilter } from "../ai-analysis/ai-analysis.policy.js";

export type FeedbackListItem = {
  id: string;
  title: string | null;
  messagePreview: string;
  channel: FeedbackChannel;
  status: FeedbackStatus;
  rating: number | null;
  branch: {
    id: string;
    name: string;
  };
  customer: {
    name: string | null;
  };
  assignedTo: {
    membershipId: string;
    name: string;
    role: string;
    isAvailable: boolean;
  } | null;
  category: {
    id: string;
    name: string;
    colorKey: string;
    isActive: boolean;
  } | null;
  aiAnalysis: AIAnalysisSummary | null;
  priority: FeedbackPriority;
  occurredAt: string | null;
  receivedAt: string;
  createdAt: string;
};

export type FeedbackDetailResponse = {
  id: string;
  title: string | null;
  message: string;
  channel: FeedbackChannel;
  status: FeedbackStatus;
  availableTransitions: FeedbackStatus[];
  rating: number | null;
  branch: {
    id: string;
    name: string;
    location: string | null;
  };
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  linkedCustomer: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    status: CustomerStatus;
    createdAt: string;
    updatedAt: string;
  } | null;
  customerPermissions: {
    canLinkFeedback: boolean;
    canCreateFromFeedback: boolean;
  };
  assignedTo: {
    membershipId: string;
    name: string;
    role: string;
    isAvailable: boolean;
  } | null;
  category: {
    id: string;
    name: string;
    colorKey: string;
    isActive: boolean;
  } | null;
  aiAnalysis: AIAnalysisSummary | null;
  priority: FeedbackPriority;
  occurredAt: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  source: {
    label: string;
    detail: string | null;
    reference: string | null;
    note: string | null;
    url: string | null;
  };
  attachments: FeedbackAttachmentResponse[];
};

export type FeedbackAttachmentResponse = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  externalUrl: string | null;
  checksum: string | null;
};

export type FeedbackInboxPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type FeedbackSummary = {
  total: number;
  gmail: number;
  whatsapp: number;
  manual: number;
  publicForm: number;
};

export type FeedbackListResponse = {
  items: FeedbackListItem[];
  pagination: FeedbackInboxPagination;
  summary: FeedbackSummary;
};

export type FeedbackInboxQuery = {
  page: number;
  pageSize: number;
  search?: string;
  branchId?: string;
  channel?: FeedbackChannel;
  rating?: number;
  status?: FeedbackStatus;
  assignedTo?: string;
  assignmentState?: "assigned" | "unassigned";
  categoryId?: string;
  categoryState?: "categorized" | "uncategorized";
  priority?: FeedbackPriority;
  dateFrom?: string;
  dateTo?: string;
  datePreset?:
    "today" | "last_7_days" | "last_30_days" | "this_month" | "previous_month" | "custom";
  ratingMin?: number;
  ratingMax?: number;
  includeUnrated?: boolean;
  customerLinkState?: "linked" | "unlinked";
  sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
  aiStatus?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "SKIPPED";
  aiSuggestionState?: SuggestionStateFilter;
  customerId?: string;
  sort?: "newest" | "oldest";
};

export const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed"
};

export const CHANNEL_LABELS: Record<FeedbackChannel, string> = {
  MANUAL: "Manual Entry",
  PUBLIC_FORM: "Public Form",
  QR_CODE: "QR Code",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  X: "X",
  GOOGLE_REVIEW: "Google Review",
  EMAIL: "Email",
  FACEBOOK: "Facebook",
  OTHER: "Other"
};

export const QR_SCOPE_LABELS: Record<string, string> = {
  "business-wide": "Business-wide",
  "branch-specific": "Branch-specific"
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent"
};

export const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700",
  NORMAL:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60",
  HIGH: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
  URGENT:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60"
};
