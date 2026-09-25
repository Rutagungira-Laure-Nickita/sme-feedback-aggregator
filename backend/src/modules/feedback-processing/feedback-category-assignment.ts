import type { Prisma } from "@prisma/client";
import {
  FeedbackFieldStateField,
  FeedbackFieldStateSource
} from "../../lib/prisma-runtime.js";
import { DEFAULT_FEEDBACK_CATEGORIES } from "../feedback-categories/default-feedback-categories.js";
import {
  FEEDBACK_ERROR_CODES,
  FeedbackProcessingError
} from "./feedback-processing.errors.js";

const FALLBACK_CATEGORY = DEFAULT_FEEDBACK_CATEGORIES.find(
  (category) => category.key === "other"
)!;

export type InitialFeedbackCategory = {
  categoryId: string;
  source: "DEFAULT" | "HUMAN";
};

export async function resolveInitialFeedbackCategory(
  tx: Prisma.TransactionClient,
  businessId: string,
  requestedCategoryId: string | null
): Promise<InitialFeedbackCategory> {
  if (requestedCategoryId) {
    const category = await tx.feedbackCategory.findFirst({
      where: { id: requestedCategoryId, businessId, isActive: true },
      select: { id: true }
    });

    if (!category) {
      throw new FeedbackProcessingError(
        "An active category from this business is required.",
        FEEDBACK_ERROR_CODES.INPUT_INVALID,
        400
      );
    }

    return { categoryId: category.id, source: "HUMAN" };
  }

  const fallback = await tx.feedbackCategory.upsert({
    where: {
      businessId_name: { businessId, name: FALLBACK_CATEGORY.name }
    },
    update: {},
    create: {
      businessId,
      name: FALLBACK_CATEGORY.name,
      description: FALLBACK_CATEGORY.description,
      colorKey: FALLBACK_CATEGORY.colorKey,
      isActive: true
    },
    select: { id: true }
  });

  return { categoryId: fallback.id, source: "DEFAULT" };
}

export function initialFeedbackFieldStates(input: {
  businessId: string;
  feedbackId: string;
  categorySource: InitialFeedbackCategory["source"];
}) {
  return [
    {
      businessId: input.businessId,
      feedbackId: input.feedbackId,
      field: FeedbackFieldStateField.STATUS,
      source: FeedbackFieldStateSource.SYSTEM
    },
    {
      businessId: input.businessId,
      feedbackId: input.feedbackId,
      field: FeedbackFieldStateField.PRIORITY,
      source: FeedbackFieldStateSource.DEFAULT
    },
    {
      businessId: input.businessId,
      feedbackId: input.feedbackId,
      field: FeedbackFieldStateField.CATEGORY,
      source:
        input.categorySource === "HUMAN"
          ? FeedbackFieldStateSource.HUMAN
          : FeedbackFieldStateSource.DEFAULT
    },
    {
      businessId: input.businessId,
      feedbackId: input.feedbackId,
      field: FeedbackFieldStateField.ASSIGNMENT,
      source: FeedbackFieldStateSource.DEFAULT
    }
  ];
}

export const feedbackCategoryAssignmentTestUtils = {
  fallbackCategoryName: FALLBACK_CATEGORY.name
};
