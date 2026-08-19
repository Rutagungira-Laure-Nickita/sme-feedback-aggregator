import { FeedbackChannel } from "../../lib/prisma-runtime.js";
import type {
  FeedbackSourceAdapter,
  NormalizedFeedbackInput
} from "../feedback-processing/index.js";
import type {
  ManualFeedbackAdapterPayload,
  ManualFeedbackSourceMetadata
} from "./manual-feedback.types.js";

export class ManualFeedbackSourceAdapter implements FeedbackSourceAdapter<ManualFeedbackAdapterPayload> {
  public readonly channel = FeedbackChannel.MANUAL;

  public validatePayload(
    payload: ManualFeedbackAdapterPayload
  ): ManualFeedbackAdapterPayload {
    return payload;
  }

  public toNormalizedInput(
    payload: ManualFeedbackAdapterPayload
  ): NormalizedFeedbackInput {
    const { input, context } = payload;

    return {
      businessId: context.businessId,
      branchId: input.branchId,
      channel: this.channel,
      idempotencyKey: context.idempotencyKey,
      title: input.title,
      message: input.message,
      rating: input.rating,
      occurredAt: input.occurredAt,
      sourceUrl: input.source.sourceUrl,
      languageCode: input.languageCode,
      customer: input.customer,
      attachments: input.attachments,
      metadata: this.getSafeMetadata(payload) ?? undefined
    };
  }

  public getIdempotencyKey(payload: ManualFeedbackAdapterPayload): string {
    return payload.context.idempotencyKey;
  }

  public getSafeMetadata(
    payload: ManualFeedbackAdapterPayload
  ): ManualFeedbackSourceMetadata | null {
    const { input, context } = payload;
    const sourceNote = input.source.note?.trim();
    const sourceReference = input.source.reference?.trim();

    return {
      sourceType: "manual-entry",
      manualSourceType: input.source.type,
      ...(sourceNote ? { sourceNote } : {}),
      ...(sourceReference ? { sourceReference } : {}),
      submittedByUserId: context.submittedByUserId,
      submittedByMembershipId: context.submittedByMembershipId
    };
  }
}

export const manualFeedbackSourceAdapter = new ManualFeedbackSourceAdapter();
