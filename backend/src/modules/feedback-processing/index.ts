export { feedbackProcessingService } from "./feedback-processing.service.js";
export {
  FEEDBACK_ERROR_CODES,
  FeedbackProcessingError,
  type FeedbackErrorCode
} from "./feedback-processing.errors.js";
export {
  feedbackAttachmentInputSchema,
  feedbackCustomerInputSchema,
  normalizedFeedbackInputSchema
} from "./feedback-processing.schemas.js";
export {
  createFeedbackSourceAdapterRegistry,
  type FeedbackSourceAdapter,
  type FeedbackSourceAdapterRegistry
} from "./feedback-source-adapter.js";
export type {
  FeedbackAttachmentInput,
  FeedbackCustomerInput,
  FeedbackProcessingResult,
  FeedbackProcessingValidationResult,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  NormalizedFeedbackInput,
  PreparedFeedbackAttachment,
  PreparedFeedbackInput,
  ResolvedFeedbackInput
} from "./feedback-processing.types.js";
