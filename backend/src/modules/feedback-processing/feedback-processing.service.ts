import type { Feedback, FeedbackIngestion } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  BranchStatus,
  BusinessStatus,
  FeedbackIngestionStatus,
  Prisma as PrismaRuntime
} from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { scheduleAnalysisForFeedback } from "../ai-analysis/ai-analysis.service.js";
import { scheduleAutomationEvent } from "../automation/index.js";
import { tryAutoLinkCustomerForFeedback } from "../customers/index.js";
import { createFeedbackPayloadHash } from "./feedback-hash.service.js";
import {
  initialFeedbackFieldStates,
  resolveInitialFeedbackCategory
} from "./feedback-category-assignment.js";
import { normalizeFeedbackInput, withResolvedBranch } from "./feedback-normalizer.js";
import {
  FEEDBACK_ERROR_CODES,
  FeedbackProcessingError,
  toSafeFeedbackError
} from "./feedback-processing.errors.js";
import { normalizedFeedbackInputSchema } from "./feedback-processing.schemas.js";
import type {
  FeedbackProcessingResult,
  FeedbackProcessingValidationResult,
  JsonObject,
  NormalizedFeedbackInput,
  PreparedFeedbackInput,
  ResolvedFeedbackInput
} from "./feedback-processing.types.js";

const PROCESSING_VERSION = "phase4-v1";
const DUPLICATE_WAIT_ATTEMPTS = 25;
const DUPLICATE_WAIT_DELAY_MS = 100;

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;
type FeedbackProcessingOptions = {
  simulateFailureAfterIngestion?: boolean;
};

type ExistingIngestion = FeedbackIngestion & {
  feedback: Pick<Feedback, "id" | "createdAt"> | null;
};

class FeedbackProcessingService {
  public async validate(
    input: NormalizedFeedbackInput
  ): Promise<FeedbackProcessingValidationResult> {
    const prepared = parseAndNormalize(input);
    const resolved = withResolvedBranch(
      prepared,
      await validateBusinessAndResolveBranch(prepared)
    );
    const payloadHash = createFeedbackPayloadHash(resolved);
    const duplicate = await findExistingProcessingResult(resolved, payloadHash, {
      waitForCompletion: false
    });

    return {
      accepted: true,
      businessId: resolved.businessId,
      branchId: resolved.branchId,
      channel: resolved.channel,
      duplicate: Boolean(duplicate),
      created: false,
      payloadHash
    };
  }

  public async process(
    input: NormalizedFeedbackInput
  ): Promise<FeedbackProcessingResult> {
    return processFeedbackInput(input);
  }
}

export const feedbackProcessingService = new FeedbackProcessingService();

export async function processFeedbackForLocalSimulation(
  input: NormalizedFeedbackInput,
  options: { simulateFailureAfterIngestion: true }
): Promise<FeedbackProcessingResult> {
  if (process.env.NODE_ENV === "production") {
    throw new FeedbackProcessingError(
      "Local feedback failure simulation is not available in production.",
      FEEDBACK_ERROR_CODES.INPUT_INVALID,
      400
    );
  }

  return processFeedbackInput(input, options);
}

async function processFeedbackInput(
  input: NormalizedFeedbackInput,
  options: FeedbackProcessingOptions = {}
): Promise<FeedbackProcessingResult> {
  const prepared = parseAndNormalize(input);
  const resolved = withResolvedBranch(
    prepared,
    await validateBusinessAndResolveBranch(prepared)
  );
  const payloadHash = createFeedbackPayloadHash(resolved);
  const duplicate = await findExistingProcessingResult(resolved, payloadHash, {
    waitForCompletion: true
  });

  if (duplicate) {
    return duplicate;
  }

  let ingestionId: string | null = null;

  try {
    const ingestion = await prisma.feedbackIngestion.create({
      data: {
        businessId: resolved.businessId,
        branchId: resolved.branchId,
        channel: resolved.channel,
        externalId: resolved.externalId,
        idempotencyKey: resolved.idempotencyKey,
        payloadHash,
        status: FeedbackIngestionStatus.PROCESSING,
        processingVersion: PROCESSING_VERSION,
        startedAt: new Date()
      }
    });
    ingestionId = ingestion.id;

    const persisted = await prisma.$transaction(async (tx) => {
      await validateBusinessAndBranchInsideTransaction(tx, resolved);

      if (options.simulateFailureAfterIngestion) {
        throw new FeedbackProcessingError(
          "Simulated local processing failure.",
          FEEDBACK_ERROR_CODES.PROCESSING_FAILED,
          500
        );
      }

      const initialCategory = await resolveInitialFeedbackCategory(
        tx,
        resolved.businessId,
        resolved.categoryId
      );

      const feedback = await tx.feedback.create({
        data: {
          businessId: resolved.businessId,
          branchId: resolved.branchId,
          ingestionId: ingestion.id,
          channel: resolved.channel,
          externalId: resolved.externalId,
          title: resolved.title,
          message: resolved.message,
          rating: resolved.rating,
          customerName: resolved.customerName,
          customerEmail: resolved.customerEmail,
          customerPhone: resolved.customerPhone,
          categoryId: initialCategory.categoryId,
          sourceUrl: resolved.sourceUrl,
          languageCode: resolved.languageCode,
          occurredAt: resolved.occurredAt,
          receivedAt: new Date(),
          sourceMetadata: toPrismaJson(resolved.metadata)
        }
      });

      await tx.feedbackFieldState.createMany({
        data: initialFeedbackFieldStates({
          businessId: resolved.businessId,
          feedbackId: feedback.id,
          categorySource: initialCategory.source
        })
      });

      if (resolved.attachments.length > 0) {
        await tx.feedbackAttachment.createMany({
          data: resolved.attachments.map((attachment) => ({
            feedbackId: feedback.id,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            externalUrl: attachment.externalUrl,
            checksum: attachment.checksum,
            metadata: toPrismaJson(attachment.metadata)
          }))
        });
      }

      const completedAt = new Date();
      await tx.feedbackIngestion.update({
        where: { id: ingestion.id },
        data: {
          status: FeedbackIngestionStatus.COMPLETED,
          completedAt
        }
      });

      return { feedback, completedAt };
    });

    await tryAutoLinkCustomerForFeedback(persisted.feedback.id);
    await scheduleAnalysisForFeedback(persisted.feedback.id);
    await scheduleAutomationEvent(persisted.feedback.id, "FEEDBACK_CREATED");

    return {
      feedbackId: persisted.feedback.id,
      ingestionId: ingestion.id,
      businessId: resolved.businessId,
      branchId: resolved.branchId,
      channel: resolved.channel,
      created: true,
      duplicate: false,
      processedAt: persisted.completedAt.toISOString()
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existing = await findExistingProcessingResult(resolved, payloadHash, {
        waitForCompletion: true
      });

      if (existing) {
        return existing;
      }
    }

    if (ingestionId) {
      await markIngestionFailed(ingestionId, error);
    }

    throw normalizeProcessingError(error);
  }
}

function parseAndNormalize(input: NormalizedFeedbackInput): PreparedFeedbackInput {
  const parsed = normalizedFeedbackInputSchema.safeParse(input);

  if (!parsed.success) {
    const hasAttachmentLimitIssue = parsed.error.issues.some((issue) =>
      issue.path.includes("attachments")
    );
    const hasMetadataIssue = parsed.error.issues.some((issue) =>
      issue.path.includes("metadata")
    );

    if (hasAttachmentLimitIssue) {
      throw new FeedbackProcessingError(
        "Feedback attachment metadata is invalid or exceeds the allowed limit.",
        FEEDBACK_ERROR_CODES.ATTACHMENT_LIMIT_EXCEEDED,
        400
      );
    }

    if (hasMetadataIssue) {
      throw new FeedbackProcessingError(
        "Feedback source metadata is invalid or too large.",
        FEEDBACK_ERROR_CODES.METADATA_TOO_LARGE,
        400
      );
    }

    throw new FeedbackProcessingError(
      "Feedback input validation failed.",
      FEEDBACK_ERROR_CODES.INPUT_INVALID,
      400
    );
  }

  const normalized = normalizeFeedbackInput(parsed.data);

  if (!normalized.message) {
    throw new FeedbackProcessingError(
      "Feedback message is required.",
      FEEDBACK_ERROR_CODES.INPUT_INVALID,
      400
    );
  }

  return normalized;
}

async function validateBusinessAndResolveBranch(
  input: PreparedFeedbackInput,
  client: PrismaClientOrTransaction = prisma
): Promise<string> {
  const business = await client.business.findUnique({
    where: { id: input.businessId },
    select: { id: true, status: true }
  });

  if (!business) {
    throw new FeedbackProcessingError(
      "Business was not found.",
      FEEDBACK_ERROR_CODES.BUSINESS_NOT_FOUND,
      404
    );
  }

  if (business.status !== BusinessStatus.ACTIVE) {
    throw new FeedbackProcessingError(
      "This business is suspended.",
      FEEDBACK_ERROR_CODES.BUSINESS_SUSPENDED,
      403
    );
  }

  if (input.branchId) {
    const branch = await client.branch.findUnique({
      where: { id: input.branchId },
      select: { id: true, businessId: true, status: true }
    });

    if (!branch) {
      throw new FeedbackProcessingError(
        "Branch was not found.",
        FEEDBACK_ERROR_CODES.BRANCH_NOT_FOUND,
        404
      );
    }

    if (branch.businessId !== input.businessId) {
      throw new FeedbackProcessingError(
        "Branch does not belong to this business.",
        FEEDBACK_ERROR_CODES.BRANCH_BUSINESS_MISMATCH,
        403
      );
    }

    if (branch.status !== BranchStatus.ACTIVE) {
      throw new FeedbackProcessingError(
        "This branch is inactive.",
        FEEDBACK_ERROR_CODES.BRANCH_INACTIVE,
        409
      );
    }

    return branch.id;
  }

  const primaryBranch = await client.branch.findFirst({
    where: {
      businessId: input.businessId,
      isPrimary: true,
      status: BranchStatus.ACTIVE
    },
    select: { id: true }
  });

  if (!primaryBranch) {
    throw new FeedbackProcessingError(
      "An active primary branch is required before feedback can be processed.",
      FEEDBACK_ERROR_CODES.PRIMARY_BRANCH_REQUIRED,
      409
    );
  }

  return primaryBranch.id;
}

async function validateBusinessAndBranchInsideTransaction(
  tx: Prisma.TransactionClient,
  input: ResolvedFeedbackInput
): Promise<void> {
  await validateBusinessAndResolveBranch(input, tx);
}

async function findExistingProcessingResult(
  input: ResolvedFeedbackInput,
  payloadHash: string,
  options: { waitForCompletion: boolean }
): Promise<FeedbackProcessingResult | null> {
  const idempotentIngestion = await prisma.feedbackIngestion.findFirst({
    where: {
      businessId: input.businessId,
      channel: input.channel,
      idempotencyKey: input.idempotencyKey
    },
    include: { feedback: { select: { id: true, createdAt: true } } }
  });

  if (idempotentIngestion) {
    if (idempotentIngestion.payloadHash !== payloadHash) {
      throw new FeedbackProcessingError(
        "This idempotency key was already used for different feedback.",
        FEEDBACK_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        409
      );
    }

    return resultFromIngestion(idempotentIngestion, input, options);
  }

  if (!input.externalId) {
    return null;
  }

  const feedback = await prisma.feedback.findFirst({
    where: {
      businessId: input.businessId,
      channel: input.channel,
      externalId: input.externalId
    },
    include: { ingestion: true }
  });

  if (feedback) {
    if (feedback.ingestion.payloadHash !== payloadHash) {
      throw new FeedbackProcessingError(
        "This external feedback source ID was already used for different data.",
        FEEDBACK_ERROR_CODES.EXTERNAL_ID_CONFLICT,
        409
      );
    }

    return {
      feedbackId: feedback.id,
      ingestionId: feedback.ingestionId,
      businessId: input.businessId,
      branchId: feedback.branchId,
      channel: feedback.channel,
      created: false,
      duplicate: true,
      processedAt: (
        feedback.ingestion.completedAt ??
        feedback.ingestion.updatedAt ??
        feedback.createdAt
      ).toISOString()
    };
  }

  const externalIngestion = await prisma.feedbackIngestion.findFirst({
    where: {
      businessId: input.businessId,
      channel: input.channel,
      externalId: input.externalId
    },
    include: { feedback: { select: { id: true, createdAt: true } } }
  });

  if (!externalIngestion) {
    return null;
  }

  if (externalIngestion.payloadHash !== payloadHash) {
    throw new FeedbackProcessingError(
      "This external feedback source ID was already used for different data.",
      FEEDBACK_ERROR_CODES.EXTERNAL_ID_CONFLICT,
      409
    );
  }

  return resultFromIngestion(externalIngestion, input, options);
}

async function resultFromIngestion(
  ingestion: ExistingIngestion,
  input: ResolvedFeedbackInput,
  options: { waitForCompletion: boolean }
): Promise<FeedbackProcessingResult> {
  const completed = ingestion.feedback
    ? ingestion
    : options.waitForCompletion
      ? await waitForCompletedIngestion(ingestion.id)
      : ingestion;

  if (!completed.feedback) {
    throw new FeedbackProcessingError(
      "An identical feedback request is already processing.",
      FEEDBACK_ERROR_CODES.PROCESSING_FAILED,
      409
    );
  }

  if (completed.status === FeedbackIngestionStatus.FAILED) {
    throw new FeedbackProcessingError(
      "The previous feedback processing attempt failed.",
      FEEDBACK_ERROR_CODES.PROCESSING_FAILED,
      409
    );
  }

  return {
    feedbackId: completed.feedback.id,
    ingestionId: completed.id,
    businessId: completed.businessId,
    branchId: completed.branchId || input.branchId,
    channel: completed.channel,
    created: false,
    duplicate: true,
    processedAt: (
      completed.completedAt ??
      completed.updatedAt ??
      completed.feedback.createdAt
    ).toISOString()
  };
}

async function waitForCompletedIngestion(
  ingestionId: string
): Promise<ExistingIngestion> {
  for (let attempt = 0; attempt < DUPLICATE_WAIT_ATTEMPTS; attempt += 1) {
    const ingestion = await prisma.feedbackIngestion.findUnique({
      where: { id: ingestionId },
      include: { feedback: { select: { id: true, createdAt: true } } }
    });

    if (!ingestion) {
      break;
    }

    if (ingestion.feedback || ingestion.status === FeedbackIngestionStatus.FAILED) {
      return ingestion;
    }

    await delay(DUPLICATE_WAIT_DELAY_MS);
  }

  const latest = await prisma.feedbackIngestion.findUnique({
    where: { id: ingestionId },
    include: { feedback: { select: { id: true, createdAt: true } } }
  });

  if (latest) {
    return latest;
  }

  throw new FeedbackProcessingError(
    "Feedback processing record was not found.",
    FEEDBACK_ERROR_CODES.PROCESSING_FAILED,
    500
  );
}

async function markIngestionFailed(ingestionId: string, error: unknown): Promise<void> {
  const safeError = toSafeFeedbackError(error);

  await prisma.feedbackIngestion.updateMany({
    where: {
      id: ingestionId,
      status: FeedbackIngestionStatus.PROCESSING
    },
    data: {
      status: FeedbackIngestionStatus.FAILED,
      errorCode: safeError.code,
      errorMessage: safeError.message,
      completedAt: new Date()
    }
  });
}

function normalizeProcessingError(error: unknown): Error {
  if (error instanceof AppError) {
    return error;
  }

  return new FeedbackProcessingError(
    "Feedback processing failed safely.",
    FEEDBACK_ERROR_CODES.PROCESSING_FAILED,
    500
  );
}

function toPrismaJson(
  value: JsonObject | null
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? PrismaRuntime.DbNull : value;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof PrismaRuntime.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
