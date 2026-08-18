import type {
  FeedbackProcessingResult,
  JsonObject
} from "../feedback-processing/index.js";
import type { PublicFeedbackSubmissionInput } from "./public-feedback.schemas.js";

export type PublicFeedbackPortalSettings = {
  enabled: boolean;
  welcomeMessage: string | null;
  publicUrl: string | null;
  hasToken: boolean;
  updatedAt: string;
};

export type PublicFeedbackAdapterPayload = {
  input: PublicFeedbackSubmissionInput;
  context: {
    businessId: string;
    portalTokenFingerprint: string;
    idempotencyKey: string;
  };
};

export type PublicFeedbackSourceMetadata = JsonObject & {
  sourceType: "public-feedback-portal";
  allowFollowUp: boolean;
  portalTokenFingerprint: string;
};

export type PublicFeedbackSubmissionResult = FeedbackProcessingResult & {
  channel: "PUBLIC_FORM";
};
