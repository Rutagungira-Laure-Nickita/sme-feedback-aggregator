import type { FeedbackChannel } from "@prisma/client";
import type {
  FeedbackAttachmentInput,
  FeedbackCustomerInput,
  FeedbackProcessingResult,
  JsonObject
} from "../feedback-processing/index.js";
import type { ManualFeedbackInput } from "./manual-feedback.schemas.js";

export type ManualSourceType =
  | "PHONE_CALL"
  | "IN_PERSON"
  | "SUGGESTION_BOX"
  | "SMS"
  | "EMAIL_COPY"
  | "SOCIAL_MEDIA_COPY"
  | "OTHER";

export type ManualFeedbackTrustedContext = {
  businessId: string;
  idempotencyKey: string;
  submittedByUserId: string;
  submittedByMembershipId: string;
};

export type ManualFeedbackAdapterPayload = {
  input: ManualFeedbackInput;
  context: ManualFeedbackTrustedContext;
};

export type ManualFeedbackSourceMetadata = JsonObject & {
  sourceType: "manual-entry";
  manualSourceType: ManualSourceType;
  sourceNote?: string;
  sourceReference?: string;
  submittedByUserId: string;
  submittedByMembershipId: string;
};

export type ManualFeedbackSubmissionResult = FeedbackProcessingResult & {
  channel: FeedbackChannel;
};

export type ManualFeedbackCustomerInput = FeedbackCustomerInput;
export type ManualFeedbackAttachmentInput = FeedbackAttachmentInput;
