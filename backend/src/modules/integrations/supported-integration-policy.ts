import type { Prisma } from "@prisma/client";
import {
  EmailProviderType,
  FeedbackChannel,
  IntegrationMode,
  IntegrationProvider
} from "../../lib/prisma-runtime.js";

export const PRODUCT_FEEDBACK_CHANNELS = [
  FeedbackChannel.MANUAL,
  FeedbackChannel.PUBLIC_FORM,
  FeedbackChannel.QR_CODE,
  FeedbackChannel.WHATSAPP,
  FeedbackChannel.EMAIL
] as const;

export const PRODUCT_LIVE_INTEGRATION_PROVIDERS = [
  IntegrationProvider.WHATSAPP,
  IntegrationProvider.EMAIL
] as const;

export function supportedLiveIntegrationWhere(): Prisma.IntegrationConnectionWhereInput {
  return {
    mode: IntegrationMode.LIVE,
    OR: [
      { provider: IntegrationProvider.WHATSAPP },
      {
        provider: IntegrationProvider.EMAIL,
        liveProviderType: EmailProviderType.GMAIL
      }
    ]
  };
}

export function supportedOperationalFeedbackWhere(): Prisma.FeedbackWhereInput {
  return {
    OR: [
      {
        channel: {
          in: [
            FeedbackChannel.MANUAL,
            FeedbackChannel.PUBLIC_FORM,
            FeedbackChannel.QR_CODE
          ]
        }
      },
      {
        channel: FeedbackChannel.WHATSAPP,
        sourceMetadata: { path: "$.liveMode", equals: true }
      },
      {
        channel: FeedbackChannel.EMAIL,
        AND: [
          { sourceMetadata: { path: "$.liveMode", equals: true } },
          {
            sourceMetadata: {
              path: "$.liveProviderType",
              equals: EmailProviderType.GMAIL
            }
          }
        ]
      }
    ]
  };
}

export function isSupportedProductConnection(input: {
  provider: string;
  mode: string;
  liveProviderType?: string | null;
}): boolean {
  return (
    input.mode === IntegrationMode.LIVE &&
    (input.provider === IntegrationProvider.WHATSAPP ||
      (input.provider === IntegrationProvider.EMAIL &&
        input.liveProviderType === EmailProviderType.GMAIL))
  );
}
