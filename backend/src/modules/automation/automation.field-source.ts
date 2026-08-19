import type { FeedbackFieldStateSource as FeedbackFieldStateSourceValue } from "@prisma/client";
import {
  FeedbackFieldStateField,
  FeedbackFieldStateSource
} from "../../lib/prisma-runtime.js";

export type HistoricalFieldSourceSnapshot = {
  categoryId: string | null;
  assignedToMembershipId: string | null;
  hasHumanStatusActivity?: boolean;
  hasHumanPriorityActivity?: boolean;
  hasHumanCategoryActivity?: boolean;
  hasHumanAssignmentActivity?: boolean;
  hasAIAutoAppliedCategory?: boolean;
};

export const INITIAL_FEEDBACK_FIELD_SOURCES: Record<
  FeedbackFieldStateField,
  FeedbackFieldStateSourceValue
> = {
  [FeedbackFieldStateField.STATUS]: FeedbackFieldStateSource.SYSTEM,
  [FeedbackFieldStateField.PRIORITY]: FeedbackFieldStateSource.DEFAULT,
  [FeedbackFieldStateField.CATEGORY]: FeedbackFieldStateSource.DEFAULT,
  [FeedbackFieldStateField.ASSIGNMENT]: FeedbackFieldStateSource.DEFAULT
};

export function initialFeedbackFieldSource(
  field: FeedbackFieldStateField
): FeedbackFieldStateSourceValue {
  return INITIAL_FEEDBACK_FIELD_SOURCES[field];
}

export function isHumanOwnedFieldSource(
  source: FeedbackFieldStateSourceValue | null | undefined
): boolean {
  return source === FeedbackFieldStateSource.HUMAN;
}

export function deriveHistoricalFeedbackFieldSource(
  field: FeedbackFieldStateField,
  snapshot: HistoricalFieldSourceSnapshot
): FeedbackFieldStateSourceValue {
  switch (field) {
    case FeedbackFieldStateField.STATUS:
      return snapshot.hasHumanStatusActivity
        ? FeedbackFieldStateSource.HUMAN
        : FeedbackFieldStateSource.SYSTEM;
    case FeedbackFieldStateField.PRIORITY:
      return snapshot.hasHumanPriorityActivity
        ? FeedbackFieldStateSource.HUMAN
        : FeedbackFieldStateSource.DEFAULT;
    case FeedbackFieldStateField.CATEGORY:
      if (snapshot.hasAIAutoAppliedCategory) return FeedbackFieldStateSource.AI;
      if (snapshot.hasHumanCategoryActivity || snapshot.categoryId) {
        return FeedbackFieldStateSource.HUMAN;
      }
      return FeedbackFieldStateSource.DEFAULT;
    case FeedbackFieldStateField.ASSIGNMENT:
      if (snapshot.assignedToMembershipId || snapshot.hasHumanAssignmentActivity) {
        return FeedbackFieldStateSource.HUMAN;
      }
      return FeedbackFieldStateSource.DEFAULT;
  }
}
