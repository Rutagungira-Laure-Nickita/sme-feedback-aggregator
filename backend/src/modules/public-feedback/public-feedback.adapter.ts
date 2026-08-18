import { FeedbackChannel } from "@prisma/client";
import type {
  FeedbackSourceAdapter,
  NormalizedFeedbackInput
} from "../feedback-processing/index.js";
import type {
  PublicFeedbackAdapterPayload,
  PublicFeedbackSourceMetadata
} from "./public-feedback.types.js";

export class PublicFeedbackSourceAdapter implements FeedbackSourceAdapter<PublicFeedbackAdapterPayload> {
  public readonly channel = FeedbackChannel.PUBLIC_FORM;

  public validatePayload(
    payload: PublicFeedbackAdapterPayload
  ): PublicFeedbackAdapterPayload {
    return payload;
  }

  public toNormalizedInput(
    payload: PublicFeedbackAdapterPayload
  ): NormalizedFeedbackInput {
    const { input, context } = payload;

    return {
      businessId: context.businessId,
      branchId: input.branchId,
      channel: this.channel,
      idempotencyKey: context.idempotencyKey,
      message: input.message,
      rating: input.rating,
      occurredAt: input.occurredAt,
      customer: input.customer,
      metadata: this.getSafeMetadata(payload) ?? undefined
    };
  }

  public getIdempotencyKey(payload: PublicFeedbackAdapterPayload): string {
    return payload.context.idempotencyKey;
  }

  public getSafeMetadata(
    payload: PublicFeedbackAdapterPayload
  ): PublicFeedbackSourceMetadata {
    return {
      sourceType: "public-feedback-portal",
      allowFollowUp: payload.input.allowFollowUp,
      portalTokenFingerprint: payload.context.portalTokenFingerprint
    };
  }
}

export const publicFeedbackSourceAdapter = new PublicFeedbackSourceAdapter();
