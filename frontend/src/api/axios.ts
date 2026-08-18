import axios, { AxiosError } from "axios";
import { useAuthStore } from "../store/authStore.js";
import type { SafeUser } from "../features/auth/types/authTypes.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";
const refreshPath = "/auth/refresh";
let refreshPromise: Promise<void> | null = null;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const config = error.config as
      (typeof error.config & { _retry?: boolean }) | undefined;
    const requestUrl = config?.url ?? "";

    if (!config || config._retry || shouldSkipRefresh(requestUrl)) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      refreshPromise ??= apiClient
        .post<unknown>(refreshPath)
        .then((response) => {
          const user = extractUser(response.data);

          if (user) {
            useAuthStore.getState().setUser(user);
          }
        })
        .finally(() => {
          refreshPromise = null;
        });

      await refreshPromise;
      return apiClient(config);
    } catch (refreshError) {
      useAuthStore.getState().clearUser();
      return Promise.reject(refreshError);
    }
  }
);

export type ApiError = {
  message: string;
  code: string;
  status?: number;
};

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return normalizeAxiosError(error);
  }

  return {
    message: "Something went wrong while contacting the API.",
    code: "UNKNOWN_CLIENT_ERROR"
  };
}

function normalizeAxiosError(error: AxiosError): ApiError {
  const responseData = error.response?.data;

  if (isApiErrorResponse(responseData)) {
    return {
      message: responseData.message,
      code: responseData.error.code,
      status: error.response?.status
    };
  }

  if (error.code === "ECONNABORTED") {
    return {
      message: "The API request timed out.",
      code: "REQUEST_TIMEOUT",
      status: error.response?.status
    };
  }

  return {
    message: "The API is not reachable from the frontend.",
    code: "API_UNREACHABLE",
    status: error.response?.status
  };
}

function isApiErrorResponse(value: unknown): value is {
  success: false;
  message: string;
  error: { code: string };
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    success?: unknown;
    message?: unknown;
    error?: { code?: unknown };
  };

  return (
    candidate.success === false &&
    typeof candidate.message === "string" &&
    typeof candidate.error?.code === "string"
  );
}

function shouldSkipRefresh(url: string): boolean {
  const path = url.split("?")[0] ?? url;

  return (
    path.endsWith("/auth/login") ||
    path.endsWith("/auth/register") ||
    path.endsWith("/auth/email-verification/resend") ||
    path.endsWith("/auth/email-verification/confirm") ||
    path.endsWith("/auth/forgot-password") ||
    path.endsWith("/auth/reset-password") ||
    path.endsWith("/auth/google/login") ||
    path.endsWith("/auth/google/register") ||
    path.endsWith("/auth/google/link") ||
    path.endsWith("/auth/logout") ||
    path.endsWith("/auth/me") ||
    path.endsWith(refreshPath)
  );
}

function extractUser(value: unknown): SafeUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const response = value as {
    success?: unknown;
    data?: {
      user?: unknown;
    };
  };

  if (response.success !== true || !response.data?.user) {
    return null;
  }

  const user = response.data.user as Partial<SafeUser>;

  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.firstName !== "string" ||
    typeof user.lastName !== "string" ||
    typeof user.role !== "string" ||
    typeof user.status !== "string"
  ) {
    return null;
  }

  return user as SafeUser;
}
