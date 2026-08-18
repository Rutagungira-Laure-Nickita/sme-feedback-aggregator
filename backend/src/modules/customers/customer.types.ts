import type {
  CustomerActivityType,
  CustomerStatus,
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus
} from "@prisma/client";

export type CustomerPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canReactivate: boolean;
  canLinkFeedback: boolean;
  canCreateFromFeedback: boolean;
  canViewActivity: boolean;
};

export type CustomerSummary = {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  aggregates: CustomerAggregates;
};

export type CustomerAggregates = {
  feedbackCount: number;
  averageRating: number | null;
  latestFeedbackAt: string | null;
  branches: Array<{ id: string; name: string; count: number }>;
  channels: Array<{ channel: FeedbackChannel; count: number }>;
};

export type CustomerListResponse = {
  items: CustomerSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  permissions: CustomerPermissions;
};

export type CustomerDetailResponse = {
  customer: CustomerSummary;
  permissions: CustomerPermissions;
};

export type CustomerFeedbackItem = {
  id: string;
  title: string | null;
  messagePreview: string;
  channel: FeedbackChannel;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  rating: number | null;
  branch: { id: string; name: string };
  customerSnapshot: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  assignedTo: { membershipId: string; name: string; role: string } | null;
  category: { id: string; name: string; colorKey: string; isActive: boolean } | null;
  receivedAt: string;
};

export type CustomerFeedbackResponse = {
  items: CustomerFeedbackItem[];
  pagination: CustomerListResponse["pagination"];
};

export type CustomerActivityItem = {
  id: string;
  type: CustomerActivityType;
  actor: { membershipId: string; name: string; role: string } | null;
  feedbackId: string | null;
  fieldName: string | null;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
};

export type CustomerActivityResponse = {
  items: CustomerActivityItem[];
};

export type CustomerMatchSummary = Pick<
  CustomerSummary,
  "id" | "displayName" | "email" | "phone" | "status" | "createdAt" | "updatedAt"
>;

export type CustomerMatchGroups = {
  exactEmailMatches: CustomerMatchSummary[];
  exactPhoneMatches: CustomerMatchSummary[];
  conflictingMatches: CustomerMatchSummary[];
  exactNameSuggestions: CustomerMatchSummary[];
  archivedMatches: CustomerMatchSummary[];
};

export type FeedbackCustomerState = {
  customer: CustomerMatchSummary | null;
  permissions: Pick<CustomerPermissions, "canLinkFeedback" | "canCreateFromFeedback">;
};
