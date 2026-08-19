import { randomUUID } from "node:crypto";
import type {
  BusinessMembership,
  FeedbackAIAnalysis,
  FeedbackCategory,
  Prisma
} from "@prisma/client";
import {
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  FeedbackAIAnalysisStatus
} from "../../lib/prisma-runtime.js";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { markFeedbackFieldAI, scheduleAutomationEvent } from "../automation/index.js";
import { GeminiAIProvider } from "./gemini.provider.js";
import type {
  AIAnalysisSummary,
  AIProvider,
  BackfillResponse,
  BusinessAIStatusResponse
} from "./ai-analysis.types.js";
import {
  CATEGORY_APPLICATION_RESULT,
  canProcessAfterDailyClaim,
  classifyAIProviderError,
  deriveCategorySuggestionState,
  getRetryDelayMs,
  getStaleProcessingCutoff,
  getUTCStartOfDay,
  isRetryableAIErrorCode,
  resolveAIOperationalState
} from "./ai-analysis.policy.js";
import {
  confidenceLevel,
  prepareAIInput,
  safeErrorMessage
} from "./ai-analysis.validation.js";

const BACKFILL_LIMIT = 20;
const PROMPT_VERSION = "phase13-v1";
const SCHEMA_VERSION = "phase13-v1";

type Actor = {
  userId: string;
};

type MembershipContext = {
  businessId: string;
  membership: BusinessMembership & {
    branchAccess: { branchId: string }[];
    business: { status: BusinessStatus };
  };
};

type AnalysisWithCategory = FeedbackAIAnalysis & {
  suggestedCategory: FeedbackCategory | null;
};

let providerOverride: AIProvider | null = null;

export function setAIProviderForTests(provider: AIProvider | null): void {
  providerOverride = provider;
}

export function getAIOperationalState(): "DISABLED" | "NOT_CONFIGURED" | "READY" {
  return resolveAIOperationalState({
    enabled: env.AI_ANALYSIS_ENABLED,
    provider: env.AI_PROVIDER,
    geminiApiKey: env.GEMINI_API_KEY
  });
}

export async function scheduleAnalysisForFeedback(feedbackId: string): Promise<void> {
  if (!env.AI_ANALYSIS_ENABLED) {
    return;
  }

  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: {
        id: true,
        businessId: true,
        title: true,
        message: true,
        rating: true,
        channel: true,
        languageCode: true
      }
    });

    if (!feedback) return;

    const categories = await prisma.feedbackCategory.findMany({
      where: { businessId: feedback.businessId, isActive: true },
      select: { id: true, name: true }
    });
    const prepared = prepareAIInput({ ...feedback, categories });
    const baseData = {
      businessId: feedback.businessId,
      feedbackId: feedback.id,
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      maxRetries: env.AI_MAX_RETRIES
    };

    if (!prepared) {
      await prisma.feedbackAIAnalysis.upsert({
        where: { feedbackId: feedback.id },
        create: {
          ...baseData,
          status: FeedbackAIAnalysisStatus.SKIPPED,
          errorCode: "AI_NO_ANALYZABLE_TEXT",
          errorMessage: safeErrorMessage("AI_NO_ANALYZABLE_TEXT"),
          completedAt: new Date()
        },
        update: {}
      });
      return;
    }

    await prisma.feedbackAIAnalysis.upsert({
      where: { feedbackId: feedback.id },
      create: {
        ...baseData,
        status:
          getAIOperationalState() === "READY"
            ? FeedbackAIAnalysisStatus.PENDING
            : FeedbackAIAnalysisStatus.FAILED,
        inputFingerprint: prepared.inputFingerprint,
        inputTruncated: prepared.inputTruncated,
        analyzedCharCount: prepared.analyzedCharCount,
        errorCode:
          getAIOperationalState() === "READY" ? null : "AI_PROVIDER_NOT_CONFIGURED",
        errorMessage:
          getAIOperationalState() === "READY"
            ? null
            : safeErrorMessage("AI_PROVIDER_NOT_CONFIGURED"),
        nextRetryAt: getAIOperationalState() === "READY" ? new Date() : null
      },
      update: {}
    });
  } catch (_error) {
    logger.warn({ feedbackId, code: "AI_SCHEDULE_FAILED" }, "AI scheduling failed");
  }
}

export async function getFeedbackAIAnalysis(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary | null> {
  const context = await resolveMembershipContext(actor, businessId);
  await resolveFeedbackAccess(context, feedbackId);
  const analysis = await prisma.feedbackAIAnalysis.findUnique({
    where: { feedbackId },
    include: { suggestedCategory: true }
  });

  return analysis ? serializeAIAnalysisForMembership(analysis, context.membership) : null;
}

export async function retryFeedbackAIAnalysis(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary> {
  const context = await resolveMembershipContext(actor, businessId);
  ensureCanActOnSuggestion(context.membership);
  const feedback = await resolveFeedbackAccess(context, feedbackId);
  const operationalState = getAIOperationalState();
  if (operationalState === "DISABLED") {
    throw new AppError("AI analysis is disabled.", "AI_ANALYSIS_DISABLED", 503);
  }
  if (operationalState === "NOT_CONFIGURED") {
    throw new AppError(
      "AI provider is not configured.",
      "AI_PROVIDER_NOT_CONFIGURED",
      503
    );
  }
  const used = await getDailyUsage(businessId);
  if (used >= env.AI_DAILY_BUSINESS_LIMIT) {
    throw new AppError(
      safeErrorMessage("AI_DAILY_LIMIT_REACHED"),
      "AI_DAILY_LIMIT_REACHED",
      429
    );
  }
  const prepared = await prepareInputForFeedback(feedback.id);

  if (!prepared) {
    const analysis = await prisma.feedbackAIAnalysis.upsert({
      where: { feedbackId: feedback.id },
      create: {
        businessId,
        feedbackId: feedback.id,
        status: FeedbackAIAnalysisStatus.SKIPPED,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        errorCode: "AI_NO_ANALYZABLE_TEXT",
        errorMessage: safeErrorMessage("AI_NO_ANALYZABLE_TEXT"),
        maxRetries: env.AI_MAX_RETRIES,
        completedAt: new Date()
      },
      update: {
        status: FeedbackAIAnalysisStatus.SKIPPED,
        errorCode: "AI_NO_ANALYZABLE_TEXT",
        errorMessage: safeErrorMessage("AI_NO_ANALYZABLE_TEXT"),
        completedAt: new Date()
      },
      include: { suggestedCategory: true }
    });
    return serializeAIAnalysisForMembership(analysis, context.membership);
  }

  const analysis = await prisma.$transaction(async (tx) => {
    const existing = await tx.feedbackAIAnalysis.findUnique({
      where: { feedbackId: feedback.id },
      include: { suggestedCategory: true }
    });

    if (existing?.status === FeedbackAIAnalysisStatus.PROCESSING) {
      return existing;
    }

    if (existing?.status === FeedbackAIAnalysisStatus.PENDING) {
      return tx.feedbackAIAnalysis.update({
        where: { id: existing.id },
        data: {
          retryCount: 0,
          maxRetries: env.AI_MAX_RETRIES,
          nextRetryAt: new Date(),
          errorCode: null,
          errorMessage: null,
          lockToken: null,
          lockedAt: null
        },
        include: { suggestedCategory: true }
      });
    }

    const saved = await tx.feedbackAIAnalysis.upsert({
      where: { feedbackId: feedback.id },
      create: {
        businessId,
        feedbackId: feedback.id,
        status: FeedbackAIAnalysisStatus.PENDING,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        inputFingerprint: prepared.inputFingerprint,
        inputTruncated: prepared.inputTruncated,
        analyzedCharCount: prepared.analyzedCharCount,
        retryCount: 0,
        maxRetries: env.AI_MAX_RETRIES,
        nextRetryAt: new Date()
      },
      update: {
        status: FeedbackAIAnalysisStatus.PENDING,
        suggestedCategoryId: null,
        categoryConfidence: null,
        suggestionDismissedAt: null,
        categoryApplicationResult: null,
        categoryAutoAppliedAt: null,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        inputFingerprint: prepared.inputFingerprint,
        inputTruncated: prepared.inputTruncated,
        analyzedCharCount: prepared.analyzedCharCount,
        errorCode: null,
        errorMessage: null,
        retryCount: 0,
        maxRetries: env.AI_MAX_RETRIES,
        nextRetryAt: new Date(),
        startedAt: null,
        completedAt: null,
        processingDurationMs: null,
        lockToken: null,
        lockedAt: null,
        lastAttemptAt: null
      },
      include: { suggestedCategory: true }
    });

    await tx.feedbackActivity.create({
      data: {
        businessId,
        feedbackId: feedback.id,
        actorMembershipId: context.membership.id,
        type: "AI_RETRY_REQUESTED",
        fromValue: existing ? "Existing analysis" : "No analysis",
        toValue: "Retry requested"
      }
    });

    return saved;
  });

  return serializeAIAnalysisForMembership(analysis, context.membership);
}

export async function applyAIcategorySuggestion(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary> {
  const context = await resolveMembershipContext(actor, businessId);
  ensureCanActOnSuggestion(context.membership);
  const feedback = await resolveFeedbackAccess(context, feedbackId);

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.feedbackAIAnalysis.findUnique({
      where: { feedbackId: feedback.id },
      include: { suggestedCategory: true }
    });

    if (!current || current.status !== FeedbackAIAnalysisStatus.COMPLETED) {
      throw new AppError(
        "AI category suggestion is not ready.",
        "AI_SUGGESTION_NOT_READY",
        400
      );
    }

    if (!current.suggestedCategoryId || !current.suggestedCategory) {
      throw new AppError(
        "No AI category suggestion is available.",
        "AI_SUGGESTION_NOT_READY",
        400
      );
    }

    if (
      current.suggestedCategory.businessId !== businessId ||
      !current.suggestedCategory.isActive
    ) {
      throw new AppError(
        "AI category suggestion is no longer valid.",
        "AI_CATEGORY_INVALID",
        409
      );
    }

    const { count } = await tx.feedback.updateMany({
      where: {
        id: feedback.id,
        businessId,
        categoryId: null
      },
      data: { categoryId: current.suggestedCategoryId }
    });

    if (count !== 1) {
      const conflicted = await tx.feedbackAIAnalysis.update({
        where: { id: current.id },
        data: { categoryApplicationResult: CATEGORY_APPLICATION_RESULT.CONFLICTED },
        include: { suggestedCategory: true }
      });
      return { analysis: conflicted, conflicted: true };
    }

    const updated = await tx.feedbackAIAnalysis.update({
      where: { id: current.id },
      data: { categoryApplicationResult: CATEGORY_APPLICATION_RESULT.MANUALLY_APPLIED },
      include: { suggestedCategory: true }
    });

    await tx.feedbackActivity.create({
      data: {
        businessId,
        feedbackId: feedback.id,
        actorMembershipId: context.membership.id,
        type: "AI_CATEGORY_APPLIED",
        fromValue: "No category",
        toValue: current.suggestedCategory.name
      }
    });

    await tx.feedbackFieldState.upsert({
      where: { feedbackId_field: { feedbackId: feedback.id, field: "CATEGORY" } },
      create: {
        businessId,
        feedbackId: feedback.id,
        field: "CATEGORY",
        source: "HUMAN",
        updatedByMembershipId: context.membership.id
      },
      update: {
        source: "HUMAN",
        sourceRuleId: null,
        updatedByMembershipId: context.membership.id
      }
    });

    return { analysis: updated, conflicted: false };
  });

  if (result.conflicted) {
    throw new AppError(
      "This feedback category was already changed. Refresh and review the current category.",
      "AI_CATEGORY_CONFLICT",
      409
    );
  }

  return serializeAIAnalysisForMembership(result.analysis, context.membership);
}

export async function dismissAIcategorySuggestion(
  actor: Actor,
  businessId: string,
  feedbackId: string
): Promise<AIAnalysisSummary> {
  const context = await resolveMembershipContext(actor, businessId);
  ensureCanActOnSuggestion(context.membership);
  const feedback = await resolveFeedbackAccess(context, feedbackId);

  const analysis = await prisma.$transaction(async (tx) => {
    const current = await tx.feedbackAIAnalysis.findUnique({
      where: { feedbackId: feedback.id },
      include: { suggestedCategory: true }
    });

    if (!current || current.status !== FeedbackAIAnalysisStatus.COMPLETED) {
      throw new AppError(
        "AI category suggestion is not ready.",
        "AI_SUGGESTION_NOT_READY",
        400
      );
    }

    const updated = await tx.feedbackAIAnalysis.update({
      where: { id: current.id },
      data: {
        suggestionDismissedAt: new Date(),
        categoryApplicationResult: CATEGORY_APPLICATION_RESULT.DISMISSED
      },
      include: { suggestedCategory: true }
    });

    await tx.feedbackActivity.create({
      data: {
        businessId,
        feedbackId: feedback.id,
        actorMembershipId: context.membership.id,
        type: "AI_CATEGORY_DISMISSED",
        fromValue: current.suggestedCategory?.name ?? "No suggestion",
        toValue: "Dismissed"
      }
    });

    return updated;
  });

  return serializeAIAnalysisForMembership(analysis, context.membership);
}

export async function getBusinessAIStatus(
  actor: Actor,
  businessId: string
): Promise<BusinessAIStatusResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  ensureCanManageAIControls(context.membership);
  const feedbackWhere: Prisma.FeedbackWhereInput = {
    businessId
  };
  const analysisWhere: Prisma.FeedbackAIAnalysisWhereInput = {
    businessId,
    feedback: feedbackWhere
  };
  const [counts, used] = await Promise.all([
    Promise.all(
      Object.values(FeedbackAIAnalysisStatus).map(async (status) => [
        status,
        await prisma.feedbackAIAnalysis.count({
          where: { ...analysisWhere, status }
        })
      ])
    ),
    getDailyUsage(businessId)
  ]);
  const countMap = Object.fromEntries(counts) as Record<FeedbackAIAnalysisStatus, number>;
  const operationalState = getAIOperationalState();

  return {
    operationalState,
    provider: env.AI_PROVIDER,
    model: env.AI_MODEL,
    enabled: env.AI_ANALYSIS_ENABLED,
    configured: operationalState === "READY",
    autoApplyCategory: env.AI_AUTO_APPLY_CATEGORY,
    categoryConfidenceThreshold: env.AI_CATEGORY_CONFIDENCE_THRESHOLD,
    dailyBusinessLimit: env.AI_DAILY_BUSINESS_LIMIT,
    maxRetries: env.AI_MAX_RETRIES,
    worker: {
      enabled: operationalState === "READY",
      pollIntervalMs: env.AI_WORKER_POLL_INTERVAL_MS,
      batchSize: env.AI_WORKER_BATCH_SIZE
    },
    counts: countMap,
    dailyUsage: {
      used,
      remaining: Math.max(0, env.AI_DAILY_BUSINESS_LIMIT - used),
      limit: env.AI_DAILY_BUSINESS_LIMIT
    },
    backfill: { maxPerRequest: BACKFILL_LIMIT }
  };
}

export async function requestBusinessAIBackfill(
  actor: Actor,
  businessId: string
): Promise<BackfillResponse> {
  const context = await resolveMembershipContext(actor, businessId);
  ensureCanManageAIControls(context.membership);

  const used = await getDailyUsage(businessId);
  let remaining = Math.max(0, env.AI_DAILY_BUSINESS_LIMIT - used);
  const result: BackfillResponse = {
    examined: 0,
    queued: 0,
    alreadyAnalyzed: 0,
    alreadyPending: 0,
    skippedNoText: 0,
    blockedByDailyLimit: 0,
    failedToQueue: 0,
    limitRemaining: remaining,
    skipped: 0,
    alreadyHadAnalysis: 0
  };
  if (remaining <= 0) {
    return { ...result, blockedByDailyLimit: BACKFILL_LIMIT, limitRemaining: 0 };
  }

  const feedbackRows = await prisma.feedback.findMany({
    where: {
      businessId
    },
    select: { id: true },
    orderBy: { receivedAt: "desc" },
    take: BACKFILL_LIMIT
  });

  for (const feedback of feedbackRows) {
    result.examined += 1;
    if (remaining <= 0) {
      result.blockedByDailyLimit += 1;
      continue;
    }
    const before = await prisma.feedbackAIAnalysis.findUnique({
      where: { feedbackId: feedback.id },
      select: { id: true, status: true }
    });
    if (before?.status === FeedbackAIAnalysisStatus.PENDING) {
      result.alreadyPending += 1;
      continue;
    }
    if (before) {
      result.alreadyAnalyzed += 1;
      continue;
    }

    try {
      await scheduleAnalysisForFeedback(feedback.id);
    } catch (_error) {
      result.failedToQueue += 1;
      continue;
    }

    const after = await prisma.feedbackAIAnalysis.findUnique({
      where: { feedbackId: feedback.id },
      select: { status: true }
    });
    if (after?.status === FeedbackAIAnalysisStatus.PENDING) {
      result.queued += 1;
      remaining -= 1;
    } else if (after?.status === FeedbackAIAnalysisStatus.SKIPPED) {
      result.skippedNoText += 1;
    } else if (after) {
      result.alreadyAnalyzed += 1;
    } else {
      result.failedToQueue += 1;
    }
  }

  result.limitRemaining = remaining;
  result.skipped = result.skippedNoText;
  result.alreadyHadAnalysis = result.alreadyAnalyzed + result.alreadyPending;
  return result;
}

export async function processAIAnalysisBatch(): Promise<void> {
  if (getAIOperationalState() !== "READY") {
    return;
  }

  await recoverStaleProcessing();
  const claimToken = randomUUID();
  const now = new Date();
  const candidates = await prisma.feedbackAIAnalysis.findMany({
    where: {
      status: { in: [FeedbackAIAnalysisStatus.PENDING, FeedbackAIAnalysisStatus.FAILED] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      retryCount: { lte: env.AI_MAX_RETRIES }
    },
    orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
    take: env.AI_WORKER_BATCH_SIZE,
    select: { id: true, businessId: true, feedbackId: true, status: true }
  });

  for (const candidate of candidates) {
    const used = await getDailyUsage(candidate.businessId);
    if (used >= env.AI_DAILY_BUSINESS_LIMIT) {
      await markAnalysisFailed(candidate.id, "AI_DAILY_LIMIT_REACHED", true);
      continue;
    }

    const claimed = await prisma.feedbackAIAnalysis.updateMany({
      where: {
        id: candidate.id,
        status: candidate.status
      },
      data: {
        status: FeedbackAIAnalysisStatus.PROCESSING,
        lockToken: claimToken,
        lockedAt: now,
        startedAt: now,
        lastAttemptAt: now,
        errorCode: null,
        errorMessage: null
      }
    });

    if (claimed.count !== 1) {
      continue;
    }

    const usedAfterClaim = await getDailyUsage(candidate.businessId);
    if (!canProcessAfterDailyClaim(usedAfterClaim, env.AI_DAILY_BUSINESS_LIMIT)) {
      await markAnalysisFailed(candidate.id, "AI_DAILY_LIMIT_REACHED", true);
      continue;
    }

    await processClaimedAnalysis(candidate.id, claimToken);
  }
}

export function serializeAIAnalysisForMembership(
  analysis: AnalysisWithCategory,
  membership: Pick<BusinessMembership, "role">
): AIAnalysisSummary {
  const canAct = membership.role !== BusinessMemberRole.STAFF;
  const categorySuggestionState = deriveCategorySuggestionState(analysis);
  const canUseSuggestion = categorySuggestionState === "AVAILABLE";
  return {
    id: analysis.id,
    status: analysis.status,
    sentiment: analysis.sentiment,
    sentimentConfidence: analysis.sentimentConfidence,
    sentimentConfidenceLevel: confidenceLevel(analysis.sentimentConfidence),
    summary: analysis.summary,
    detectedLanguage: analysis.detectedLanguage,
    suggestedCategory: analysis.suggestedCategory
      ? {
          id: analysis.suggestedCategory.id,
          name: analysis.suggestedCategory.name,
          colorKey: analysis.suggestedCategory.colorKey,
          isActive: analysis.suggestedCategory.isActive
        }
      : null,
    categoryConfidence: analysis.categoryConfidence,
    categoryConfidenceLevel: confidenceLevel(analysis.categoryConfidence),
    suggestionDismissedAt: analysis.suggestionDismissedAt?.toISOString() ?? null,
    inputTruncated: analysis.inputTruncated,
    analyzedCharCount: analysis.analyzedCharCount,
    errorCode: analysis.errorCode,
    errorMessage: analysis.errorMessage,
    retryCount: analysis.retryCount,
    maxRetries: analysis.maxRetries,
    nextRetryAt: analysis.nextRetryAt?.toISOString() ?? null,
    provider: analysis.provider,
    model: analysis.model,
    promptVersion: analysis.promptVersion,
    schemaVersion: analysis.schemaVersion,
    categoryAutoAppliedAt: analysis.categoryAutoAppliedAt?.toISOString() ?? null,
    categoryApplicationResult: analysis.categoryApplicationResult,
    categorySuggestionState,
    requestedAt: analysis.requestedAt.toISOString(),
    startedAt: analysis.startedAt?.toISOString() ?? null,
    completedAt: analysis.completedAt?.toISOString() ?? null,
    updatedAt: analysis.updatedAt.toISOString(),
    permissions: {
      canRetry: canAct,
      canApplySuggestion: canAct && canUseSuggestion,
      canDismissSuggestion: canAct && canUseSuggestion
    }
  };
}

async function processClaimedAnalysis(
  analysisId: string,
  claimToken: string
): Promise<void> {
  const analysis = await prisma.feedbackAIAnalysis.findFirst({
    where: { id: analysisId, lockToken: claimToken },
    select: {
      id: true,
      businessId: true,
      feedbackId: true,
      retryCount: true,
      startedAt: true
    }
  });
  if (!analysis) return;

  const prepared = await prepareInputForFeedback(analysis.feedbackId);
  if (!prepared) {
    await prisma.feedbackAIAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: FeedbackAIAnalysisStatus.SKIPPED,
        errorCode: "AI_NO_ANALYZABLE_TEXT",
        errorMessage: safeErrorMessage("AI_NO_ANALYZABLE_TEXT"),
        completedAt: new Date(),
        lockToken: null,
        lockedAt: null
      }
    });
    return;
  }

  try {
    const provider = getProvider();
    const result = await provider.analyzeFeedback(prepared.providerInput);
    const validSuggestedCategoryId = await validateSuggestedCategory(
      analysis.businessId,
      result.suggestedCategoryId
    );
    const completedAt = new Date();
    const processingDurationMs = analysis.startedAt
      ? completedAt.getTime() - analysis.startedAt.getTime()
      : null;

    await prisma.feedbackAIAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: FeedbackAIAnalysisStatus.COMPLETED,
        sentiment: result.sentiment,
        sentimentConfidence: result.sentimentConfidence,
        sentimentExplanation: result.sentimentExplanation,
        summary: result.summary,
        detectedLanguage: result.detectedLanguage,
        suggestedCategoryId: validSuggestedCategoryId,
        categoryConfidence: validSuggestedCategoryId ? result.categoryConfidence : null,
        suggestionDismissedAt: null,
        categoryApplicationResult: null,
        categoryAutoAppliedAt: null,
        inputFingerprint: prepared.inputFingerprint,
        inputTruncated: prepared.inputTruncated,
        analyzedCharCount: prepared.analyzedCharCount,
        errorCode: null,
        errorMessage: null,
        nextRetryAt: null,
        completedAt,
        processingDurationMs,
        lockToken: null,
        lockedAt: null
      }
    });

    await maybeAutoApplyCategory(analysis.feedbackId, analysis.businessId, analysis.id);
    await scheduleAutomationEvent(analysis.feedbackId, "AI_ANALYSIS_COMPLETED");
    logger.info({ analysisId, businessId: analysis.businessId }, "AI analysis completed");
  } catch (error) {
    const code = classifyAIProviderError(error);
    const retryable = isRetryableAIErrorCode(code);
    await markAnalysisFailed(analysis.id, code, retryable);
  }
}

async function prepareInputForFeedback(feedbackId: string) {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: {
      id: true,
      businessId: true,
      title: true,
      message: true,
      rating: true,
      channel: true,
      languageCode: true
    }
  });
  if (!feedback) return null;

  const categories = await prisma.feedbackCategory.findMany({
    where: { businessId: feedback.businessId, isActive: true },
    select: { id: true, name: true }
  });

  return prepareAIInput({ ...feedback, categories });
}

async function validateSuggestedCategory(
  businessId: string,
  categoryId: string | null
): Promise<string | null> {
  if (!categoryId) return null;
  const category = await prisma.feedbackCategory.findFirst({
    where: { id: categoryId, businessId, isActive: true },
    select: { id: true }
  });
  return category?.id ?? null;
}

async function maybeAutoApplyCategory(
  feedbackId: string,
  businessId: string,
  analysisId: string
): Promise<void> {
  if (!env.AI_AUTO_APPLY_CATEGORY) return;

  const analysis = await prisma.feedbackAIAnalysis.findUnique({
    where: { id: analysisId },
    include: { suggestedCategory: true }
  });

  if (
    !analysis ||
    !analysis.suggestedCategoryId ||
    !analysis.suggestedCategory ||
    analysis.categoryConfidence === null ||
    analysis.categoryConfidence < env.AI_CATEGORY_CONFIDENCE_THRESHOLD ||
    analysis.suggestedCategory.businessId !== businessId ||
    !analysis.suggestedCategory.isActive
  ) {
    return;
  }

  if (
    analysis.suggestionDismissedAt ||
    analysis.categoryApplicationResult === CATEGORY_APPLICATION_RESULT.DISMISSED
  ) {
    return;
  }

  const updatedFeedback = await prisma.feedback.updateMany({
    where: {
      id: feedbackId,
      businessId,
      categoryId: null
    },
    data: { categoryId: analysis.suggestedCategoryId }
  });

  await prisma.feedbackAIAnalysis.update({
    where: { id: analysisId },
    data:
      updatedFeedback.count === 1
        ? {
            categoryAutoAppliedAt: new Date(),
            categoryApplicationResult: CATEGORY_APPLICATION_RESULT.AUTO_APPLIED
          }
        : {
            categoryApplicationResult: CATEGORY_APPLICATION_RESULT.CONFLICTED
          }
  });

  if (updatedFeedback.count === 1) {
    await markFeedbackFieldAI(businessId, feedbackId, "CATEGORY");
  }
}

async function markAnalysisFailed(
  analysisId: string,
  code: string,
  retryable: boolean
): Promise<void> {
  const current = await prisma.feedbackAIAnalysis.findUnique({
    where: { id: analysisId },
    select: { retryCount: true, maxRetries: true }
  });
  if (!current) return;
  const retryCount = current.retryCount + 1;
  const shouldRetry = retryable && retryCount <= current.maxRetries;
  const nextRetryAt = shouldRetry
    ? new Date(Date.now() + getRetryDelayMs(retryCount))
    : null;

  await prisma.feedbackAIAnalysis.update({
    where: { id: analysisId },
    data: {
      status: FeedbackAIAnalysisStatus.FAILED,
      errorCode: code,
      errorMessage: safeErrorMessage(code),
      retryCount,
      nextRetryAt,
      completedAt: shouldRetry ? null : new Date(),
      lockToken: null,
      lockedAt: null
    }
  });
  logger.warn({ analysisId, code, retryable: shouldRetry }, "AI analysis failed");
}

async function recoverStaleProcessing(): Promise<void> {
  const staleBefore = getStaleProcessingCutoff(
    new Date(),
    env.AI_WORKER_POLL_INTERVAL_MS
  );
  const result = await prisma.feedbackAIAnalysis.updateMany({
    where: {
      status: FeedbackAIAnalysisStatus.PROCESSING,
      lockedAt: { lt: staleBefore },
      retryCount: { lte: env.AI_MAX_RETRIES }
    },
    data: {
      status: FeedbackAIAnalysisStatus.PENDING,
      lockToken: null,
      lockedAt: null,
      nextRetryAt: new Date()
    }
  });

  if (result.count > 0) {
    logger.warn({ count: result.count }, "Recovered stale AI analysis jobs");
  }
}

async function getDailyUsage(businessId: string): Promise<number> {
  return prisma.feedbackAIAnalysis.count({
    where: {
      businessId,
      lastAttemptAt: { gte: getUTCStartOfDay() }
    }
  });
}

function getProvider(): AIProvider {
  if (providerOverride) return providerOverride;
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      "AI provider is not configured.",
      "AI_PROVIDER_NOT_CONFIGURED",
      503
    );
  }
  return new GeminiAIProvider(env.GEMINI_API_KEY);
}

async function resolveMembershipContext(
  actor: Actor,
  businessId: string
): Promise<MembershipContext> {
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId: actor.userId } },
    include: {
      branchAccess: { select: { branchId: true } },
      business: { select: { status: true } }
    }
  });

  if (!membership) {
    throw new AppError("Business access denied.", "BUSINESS_ACCESS_DENIED", 403);
  }
  if (membership.status === BusinessMembershipStatus.SUSPENDED) {
    throw new AppError("This membership is suspended.", "MEMBERSHIP_SUSPENDED", 403);
  }
  if (membership.status === BusinessMembershipStatus.REMOVED) {
    throw new AppError("This membership was removed.", "MEMBERSHIP_REMOVED", 403);
  }
  if (membership.status !== BusinessMembershipStatus.ACTIVE) {
    throw new AppError("Business access denied.", "BUSINESS_ACCESS_DENIED", 403);
  }
  if (membership.business.status !== BusinessStatus.ACTIVE) {
    throw new AppError("This business is not active.", "BUSINESS_NOT_ACTIVE", 403);
  }

  return { businessId, membership };
}

function getAccessibleBranchIds(
  membership: Pick<BusinessMembership, "role" | "allBranchesAccess"> & {
    branchAccess: { branchId: string }[];
  }
): string[] | null {
  if (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess
  ) {
    return null;
  }
  return membership.branchAccess.map((access) => access.branchId);
}

async function resolveFeedbackAccess(
  context: MembershipContext,
  feedbackId: string
): Promise<{ id: string; businessId: string; branchId: string }> {
  const branchIds = getAccessibleBranchIds(context.membership);
  const feedback = await prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      businessId: context.businessId,
      ...(branchIds ? { branchId: { in: branchIds } } : {})
    },
    select: { id: true, businessId: true, branchId: true }
  });

  if (!feedback) {
    throw new AppError("Feedback not found.", "FEEDBACK_NOT_FOUND", 404);
  }

  return feedback;
}

function ensureCanActOnSuggestion(membership: Pick<BusinessMembership, "role">): void {
  if (membership.role === BusinessMemberRole.STAFF) {
    throw new AppError(
      "Staff cannot modify AI analysis suggestions.",
      "AI_ACTION_FORBIDDEN",
      403
    );
  }
}

function ensureCanManageAIControls(membership: Pick<BusinessMembership, "role">): void {
  if (
    membership.role !== BusinessMemberRole.OWNER &&
    membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Business AI controls require owner or admin access.",
      "AI_ADMIN_REQUIRED",
      403
    );
  }
}
