import type {
  FeedbackProcessingResult,
  JsonObject
} from "../feedback-processing/index.js";
import type { PublicFeedbackQrSubmissionInput } from "./public-feedback-qr.schemas.js";

export type PublicFeedbackQrScope = "BUSINESS_WIDE" | "BRANCH";

export type PublicFeedbackQrManagementItem = {
  id: string;
  name: string;
  scope: PublicFeedbackQrScope;
  branch: {
    id: string;
    name: string;
  } | null;
  publicUrl: string;
  isActive: boolean;
  isValidForCurrentPortal: boolean;
  availabilityStatus:
    | "AVAILABLE"
    | "QR_DISABLED"
    | "PORTAL_DISABLED"
    | "PORTAL_LINK_CHANGED"
    | "BRANCH_INACTIVE";
  createdAt: string;
  updatedAt: string;
};

export type PublicFeedbackQrPortalSettings = {
  enabled: boolean;
  publicUrl: string | null;
  hasToken: boolean;
};

export type PublicFeedbackQrManagementList = {
  portal: PublicFeedbackQrPortalSettings;
  qrCodes: PublicFeedbackQrManagementItem[];
};

export type PublicFeedbackQrConfig = {
  business: {
    name: string;
    logoUrl: string | null;
  };
  portal: {
    welcomeMessage: string | null;
  };
  qrCode: {
    scope: PublicFeedbackQrScope;
    name: string;
  };
  branches: {
    id: string;
    name: string;
    location: string;
  }[];
  fixedBranchId: string | null;
};

export type PublicFeedbackQrAdapterPayload = {
  input: PublicFeedbackQrSubmissionInput;
  context: {
    businessId: string;
    branchId: string;
    idempotencyKey: string;
    qrCodeId: string;
    qrScope: PublicFeedbackQrScope;
  };
};

export type PublicFeedbackQrSourceMetadata = JsonObject & {
  sourceType: "qr-code";
  qrCodeId: string;
  qrScope: PublicFeedbackQrScope;
  allowFollowUp: boolean;
};

export type PublicFeedbackQrSubmissionResult = FeedbackProcessingResult & {
  channel: "QR_CODE";
};
