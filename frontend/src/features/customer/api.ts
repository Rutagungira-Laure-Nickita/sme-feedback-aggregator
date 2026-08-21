import { apiClient } from "../../api/axios.js";
import type { FeedbackChannel, FeedbackStatus } from "../businesses/feedbackInboxApi.js";

export type CustomerFeedback = {
  id: string;
  title: string | null;
  message: string;
  channel: FeedbackChannel;
  status: FeedbackStatus;
  rating: number | null;
  occurredAt: string | null;
  receivedAt: string;
  createdAt: string;
  business: { id: string; name: string };
  branch: { id: string; name: string };
};

export type CustomerDashboardData = {
  customer: { firstName: string; lastName: string; email: string };
  totals: {
    total: number;
    new: number;
    inReview: number;
    resolved: number;
    closed: number;
  };
  recent: CustomerFeedback[];
  submissionDestinations: Array<{
    businessId: string;
    businessName: string;
    path: string;
  }>;
};

export async function fetchCustomerDashboard(): Promise<CustomerDashboardData> {
  const response = await apiClient.get<{ success: boolean; data: CustomerDashboardData }>(
    "/customer/dashboard"
  );
  return response.data.data;
}

export async function fetchCustomerFeedback(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: FeedbackStatus;
  channel?: FeedbackChannel;
  sort?: "newest" | "oldest";
}) {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      items: CustomerFeedback[];
      pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
      };
    };
  }>("/customer/feedback", { params: query });
  return response.data.data;
}

export async function fetchCustomerFeedbackDetail(
  feedbackId: string
): Promise<CustomerFeedback> {
  const response = await apiClient.get<{ success: boolean; data: CustomerFeedback }>(
    `/customer/feedback/${feedbackId}`
  );
  return response.data.data;
}
