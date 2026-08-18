import type {
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackChannel
} from "@prisma/client";

export type AIOperationalState = "DISABLED" | "NOT_CONFIGURED" | "READY";

export type AIConfidenceLevel = "HIGH" | "REVIEW" | "LOW";
export type CategorySuggestionState =
  "NONE" | "AVAILABLE" | "AUTO_APPLIED" | "MANUALLY_APPLIED" | "DISMISSED" | "CONFLICTED";

export type AIAnalysisSummary = {
  id: string;
  status: FeedbackAIAnalysisStatus;
  sentiment: FeedbackAISentiment | null;
  sentimentConfidence: number | null;
  sentimentConfidenceLevel: AIConfidenceLevel | null;
  summary: string | null;
  detectedLanguage: string | null;
  suggestedCategory: {
    id: string;
    name: string;
    colorKey: string;
    isActive: boolean;
  } | null;
  categoryConfidence: number | null;
  categoryConfidenceLevel: AIConfidenceLevel | null;
  suggestionDismissedAt: string | null;
  inputTruncated: boolean;
  analyzedCharCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  categoryAutoAppliedAt: string | null;
  categoryApplicationResult: string | null;
  categorySuggestionState: CategorySuggestionState;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  permissions: {
    canRetry: boolean;
    canApplySuggestion: boolean;
    canDismissSuggestion: boolean;
  };
};

export type AIProviderCategory = {
  id: string;
  name: string;
};

export type AIProviderInput = {
  title: string | null;
  message: string;
  rating: number | null;
  channel: FeedbackChannel;
  languageCode: string | null;
  categories: AIProviderCategory[];
};

export type AIProviderResult = {
  sentiment: FeedbackAISentiment;
  sentimentConfidence: number;
  sentimentExplanation: string | null;
  summary: string;
  detectedLanguage: string;
  suggestedCategoryId: string | null;
  categoryConfidence: number | null;
};

export type AIProvider = {
  analyzeFeedback(input: AIProviderInput): Promise<AIProviderResult>;
};

export type BusinessAIStatusResponse = {
  operationalState: AIOperationalState;
  provider: string;
  model: string;
  enabled: boolean;
  configured: boolean;
  autoApplyCategory: boolean;
  categoryConfidenceThreshold: number;
  dailyBusinessLimit: number;
  maxRetries: number;
  worker: {
    enabled: boolean;
    pollIntervalMs: number;
    batchSize: number;
  };
  counts: Record<FeedbackAIAnalysisStatus, number>;
  dailyUsage: {
    used: number;
    remaining: number;
    limit: number;
  };
  backfill: {
    maxPerRequest: number;
  };
};

export type BackfillResponse = {
  examined: number;
  queued: number;
  alreadyAnalyzed: number;
  alreadyPending: number;
  skippedNoText: number;
  blockedByDailyLimit: number;
  failedToQueue: number;
  limitRemaining: number;
  skipped: number;
  alreadyHadAnalysis: number;
};
