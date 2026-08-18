import axios from "axios";
import { z } from "zod";
import { normalizeApiError } from "../../api/axios.js";
import type { PublicFeedbackValues } from "./schemas.js";
import type { PublicFeedbackPortal, PublicFeedbackResult } from "./types.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const publicApiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: false,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json"
  }
});

const apiResponseSchema = <TData extends z.ZodTypeAny>(dataSchema: TData) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema
  });

const logoUrlSchema = z
  .string()
  .trim()
  .nullable()
  .transform((value) => value || null);

const portalResponseSchema = apiResponseSchema(
  z.object({
    business: z.object({
      name: z.string(),
      logoUrl: logoUrlSchema
    }),
    portal: z.object({
      welcomeMessage: z.string().nullable()
    }),
    branches: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        location: z.string()
      })
    )
  })
);

const qrPortalDataSchema = z
  .object({
    business: z.object({
      name: z.string(),
      logoUrl: logoUrlSchema
    }),
    portal: z.object({
      welcomeMessage: z.string().nullable()
    }),
    qrCode: z.object({
      scope: z.enum(["BUSINESS_WIDE", "BRANCH"]),
      name: z.string()
    }),
    branches: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        location: z.string()
      })
    ),
    fixedBranchId: z.string().nullable()
  })
  .superRefine((value, context) => {
    if (value.qrCode.scope !== "BRANCH") {
      return;
    }

    if (!value.fixedBranchId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedBranchId"],
        message: "Branch-specific QR configuration is missing its fixed branch."
      });
      return;
    }

    if (!value.branches.some((branch) => branch.id === value.fixedBranchId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedBranchId"],
        message: "Branch-specific QR configuration does not include its fixed branch."
      });
    }
  });

const qrPortalResponseSchema = apiResponseSchema(qrPortalDataSchema);

const submissionResponseSchema = apiResponseSchema(
  z.object({
    feedbackId: z.string(),
    ingestionId: z.string(),
    businessId: z.string(),
    branchId: z.string(),
    channel: z.union([z.literal("PUBLIC_FORM"), z.literal("QR_CODE")]),
    created: z.boolean(),
    duplicate: z.boolean(),
    processedAt: z.string()
  })
);

export async function fetchPublicFeedbackPortal(
  portalToken: string,
  source: "portal" | "qr" = "portal"
): Promise<PublicFeedbackPortal> {
  const response = await publicApiClient.get<unknown>(
    source === "qr"
      ? `/public/feedback/qr/${portalToken}`
      : `/public/feedback/${portalToken}`
  );

  return (source === "qr" ? qrPortalResponseSchema : portalResponseSchema).parse(
    response.data
  ).data;
}

export async function submitPublicFeedback(
  portalToken: string,
  values: PublicFeedbackValues,
  idempotencyKey: string,
  source: "portal" | "qr" = "portal"
): Promise<PublicFeedbackResult> {
  const payload = {
    branchId: values.branchId,
    rating: values.rating,
    message: values.message,
    occurredAt: values.occurredAt ? new Date(values.occurredAt).toISOString() : undefined,
    customer:
      values.customerName || values.customerEmail || values.customerPhone
        ? {
            name: values.customerName,
            email: values.customerEmail,
            phone: values.customerPhone
          }
        : undefined,
    allowFollowUp: values.allowFollowUp,
    website: values.website
  };
  const response = await publicApiClient.post<unknown>(
    source === "qr"
      ? `/public/feedback/qr/${portalToken}`
      : `/public/feedback/${portalToken}`,
    payload,
    {
      headers: {
        "Idempotency-Key": idempotencyKey
      }
    }
  );

  return submissionResponseSchema.parse(response.data).data;
}

export function normalizePublicFeedbackError(error: unknown): {
  title: string;
  message: string;
  code: string;
  status?: number;
} {
  const normalized = normalizeApiError(error);

  if (normalized.status === 429 || normalized.code === "RATE_LIMITED") {
    return {
      ...normalized,
      title: "Too many submissions",
      message:
        "Too many feedback submissions were made recently. Please wait and try again."
    };
  }

  if (normalized.code === "FEEDBACK_IDEMPOTENCY_CONFLICT") {
    return {
      ...normalized,
      title: "Submission conflict",
      message: "This submission key was already used for different feedback."
    };
  }

  if (normalized.code === "QR_FEEDBACK_BRANCH_LOCKED") {
    return {
      ...normalized,
      title: "Branch unavailable",
      message: "This QR feedback link is locked to its assigned branch."
    };
  }

  if (normalized.code === "PUBLIC_FEEDBACK_NO_ACTIVE_BRANCHES") {
    return {
      ...normalized,
      title: "No locations available",
      message: "This business is not accepting feedback at a location right now."
    };
  }

  if (
    normalized.status === 404 ||
    normalized.code === "PUBLIC_FEEDBACK_PORTAL_UNAVAILABLE" ||
    normalized.code === "QR_FEEDBACK_LINK_UNAVAILABLE"
  ) {
    return {
      ...normalized,
      title:
        normalized.code === "QR_FEEDBACK_LINK_UNAVAILABLE"
          ? "QR feedback link unavailable"
          : "Feedback link unavailable",
      message:
        normalized.code === "QR_FEEDBACK_LINK_UNAVAILABLE"
          ? "This QR feedback link is unavailable."
          : "This feedback link is unavailable."
    };
  }

  if (
    normalized.code === "FEEDBACK_BRANCH_NOT_FOUND" ||
    normalized.code === "FEEDBACK_BRANCH_INACTIVE" ||
    normalized.code === "FEEDBACK_BRANCH_BUSINESS_MISMATCH"
  ) {
    return {
      ...normalized,
      title: "Branch unavailable",
      message: "Choose an active branch for this feedback link."
    };
  }

  if (normalized.code === "API_UNREACHABLE") {
    return {
      ...normalized,
      title: "Network error",
      message: "Check your connection and try again."
    };
  }

  return {
    ...normalized,
    title: "Submission failed",
    message: "We could not submit your feedback. Please try again."
  };
}
