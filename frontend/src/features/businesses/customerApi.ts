import { apiClient } from "../../api/axios.js";
import type {
  FeedbackChannel,
  FeedbackPriority,
  FeedbackStatus
} from "./feedbackInboxApi.js";

export type CustomerStatus = "ACTIVE" | "ARCHIVED";

export type CustomerAggregates = {
  feedbackCount: number;
  averageRating: number | null;
  latestFeedbackAt: string | null;
  branches: Array<{ id: string; name: string; count: number }>;
  channels: Array<{ channel: FeedbackChannel; count: number }>;
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

export type CustomerPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canReactivate: boolean;
  canLinkFeedback: boolean;
  canCreateFromFeedback: boolean;
  canViewActivity: boolean;
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
  type:
    | "CREATED"
    | "UPDATED"
    | "ARCHIVED"
    | "REACTIVATED"
    | "FEEDBACK_LINKED"
    | "FEEDBACK_UNLINKED";
  actor: { membershipId: string; name: string; role: string } | null;
  feedbackId: string | null;
  fieldName: string | null;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
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

export type CustomerFormValues = {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

export async function fetchCustomers(
  businessId: string,
  query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: CustomerStatus;
    branchId?: string;
    channel?: FeedbackChannel;
    ratingMin?: number;
    ratingMax?: number;
    latestFeedbackFrom?: string;
    latestFeedbackTo?: string;
    contactState?: "has_email" | "has_phone" | "missing_email" | "missing_phone";
    sort?: "latestFeedback" | "updated" | "name";
  }
): Promise<CustomerListResponse> {
  const response = await apiClient.get<{ success: boolean; data: CustomerListResponse }>(
    `/businesses/${businessId}/customers`,
    { params: query }
  );
  return response.data.data;
}

export async function createCustomer(
  businessId: string,
  values: CustomerFormValues
): Promise<CustomerDetailResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: CustomerDetailResponse;
  }>(`/businesses/${businessId}/customers`, values);
  return response.data.data;
}

export async function fetchCustomer(
  businessId: string,
  customerId: string
): Promise<CustomerDetailResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: CustomerDetailResponse;
  }>(`/businesses/${businessId}/customers/${customerId}`);
  return response.data.data;
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  values: CustomerFormValues & { expectedUpdatedAt: string }
): Promise<CustomerDetailResponse> {
  const response = await apiClient.patch<{
    success: boolean;
    data: CustomerDetailResponse;
  }>(`/businesses/${businessId}/customers/${customerId}`, values);
  return response.data.data;
}

export async function archiveCustomer(
  businessId: string,
  customerId: string,
  expectedUpdatedAt: string
): Promise<CustomerDetailResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: CustomerDetailResponse;
  }>(`/businesses/${businessId}/customers/${customerId}/archive`, {
    expectedUpdatedAt
  });
  return response.data.data;
}

export async function reactivateCustomer(
  businessId: string,
  customerId: string,
  expectedUpdatedAt: string
): Promise<CustomerDetailResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: CustomerDetailResponse;
  }>(`/businesses/${businessId}/customers/${customerId}/reactivate`, {
    expectedUpdatedAt
  });
  return response.data.data;
}

export async function fetchCustomerFeedback(
  businessId: string,
  customerId: string,
  query: {
    page?: number;
    pageSize?: number;
    search?: string;
    branchId?: string;
    channel?: FeedbackChannel;
    status?: FeedbackStatus;
    assignedTo?: string;
    categoryId?: string;
    priority?: FeedbackPriority;
    rating?: number;
    ratingMin?: number;
    ratingMax?: number;
    includeUnrated?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sort?: "newest" | "oldest";
  } = {}
): Promise<CustomerFeedbackResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: CustomerFeedbackResponse;
  }>(`/businesses/${businessId}/customers/${customerId}/feedback`, {
    params: query
  });
  return response.data.data;
}

export async function fetchCustomerActivity(
  businessId: string,
  customerId: string
): Promise<{ items: CustomerActivityItem[] }> {
  const response = await apiClient.get<{
    success: boolean;
    data: { items: CustomerActivityItem[] };
  }>(`/businesses/${businessId}/customers/${customerId}/activity`);
  return response.data.data;
}

export async function fetchFeedbackCustomerMatches(
  businessId: string,
  feedbackId: string,
  search?: string
): Promise<CustomerMatchGroups> {
  const response = await apiClient.get<{ success: boolean; data: CustomerMatchGroups }>(
    `/businesses/${businessId}/feedback/${feedbackId}/customer-matches`,
    { params: search ? { search } : {} }
  );
  return response.data.data;
}

export async function linkFeedbackCustomer(
  businessId: string,
  feedbackId: string,
  customerId: string | null,
  expectedCustomerId: string | null
): Promise<{ customer: CustomerMatchSummary | null }> {
  const response = await apiClient.patch<{
    success: boolean;
    data: { customer: CustomerMatchSummary | null };
  }>(`/businesses/${businessId}/feedback/${feedbackId}/customer`, {
    customerId,
    expectedCustomerId
  });
  return response.data.data;
}

export async function createCustomerFromFeedback(
  businessId: string,
  feedbackId: string,
  values: CustomerFormValues & { expectedCustomerId: string | null }
): Promise<{ customer: CustomerMatchSummary | null }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { customer: CustomerMatchSummary | null };
  }>(`/businesses/${businessId}/feedback/${feedbackId}/customer`, values);
  return response.data.data;
}
