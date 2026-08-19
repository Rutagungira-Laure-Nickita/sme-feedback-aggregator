import { FeedbackChannel } from "../../lib/prisma-runtime.js";
import type {
  FeedbackSourceAdapter,
  NormalizedFeedbackInput
} from "../feedback-processing/index.js";
import type {
  PublicFeedbackQrAdapterPayload,
  PublicFeedbackQrSourceMetadata
} from "./public-feedback-qr.types.js";

export class QrFeedbackSourceAdapter implements FeedbackSourceAdapter<PublicFeedbackQrAdapterPayload> {
  public readonly channel = FeedbackChannel.QR_CODE;

  public validatePayload(
    payload: PublicFeedbackQrAdapterPayload
  ): PublicFeedbackQrAdapterPayload {
    return payload;
  }

  public toNormalizedInput(
    payload: PublicFeedbackQrAdapterPayload
  ): NormalizedFeedbackInput {
    const { input, context } = payload;

    return {
      businessId: context.businessId,
      branchId: context.branchId,
      channel: this.channel,
      idempotencyKey: context.idempotencyKey,
      message: input.message,
      rating: input.rating,
      occurredAt: input.occurredAt,
      customer: input.customer,
      metadata: this.getSafeMetadata(payload) ?? undefined
    };
  }

  public getIdempotencyKey(payload: PublicFeedbackQrAdapterPayload): string {
    return payload.context.idempotencyKey;
  }

  public getSafeMetadata(
    payload: PublicFeedbackQrAdapterPayload
  ): PublicFeedbackQrSourceMetadata {
    return {
      sourceType: "qr-code",
      qrCodeId: payload.context.qrCodeId,
      qrScope: payload.context.qrScope,
      allowFollowUp: payload.input.allowFollowUp
    };
  }
}

export const qrFeedbackSourceAdapter = new QrFeedbackSourceAdapter();
