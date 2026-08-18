import type { FeedbackChannel } from "@prisma/client";
import type { JsonObject, NormalizedFeedbackInput } from "./feedback-processing.types.js";

export type FeedbackSourceAdapter<TPayload> = {
  readonly channel: FeedbackChannel;
  validatePayload(payload: unknown): TPayload | Promise<TPayload>;
  toNormalizedInput(
    payload: TPayload
  ): NormalizedFeedbackInput | Promise<NormalizedFeedbackInput>;
  getExternalId?(payload: TPayload): string | null;
  getIdempotencyKey(payload: TPayload): string;
  getSafeMetadata?(payload: TPayload): JsonObject | null;
};

export type FeedbackSourceAdapterRegistry = {
  register<TPayload>(adapter: FeedbackSourceAdapter<TPayload>): void;
  get(channel: FeedbackChannel): FeedbackSourceAdapter<unknown> | null;
};

export function createFeedbackSourceAdapterRegistry(): FeedbackSourceAdapterRegistry {
  const adapters = new Map<FeedbackChannel, FeedbackSourceAdapter<unknown>>();

  return {
    register<TPayload>(adapter: FeedbackSourceAdapter<TPayload>) {
      adapters.set(adapter.channel, adapter as FeedbackSourceAdapter<unknown>);
    },
    get(channel: FeedbackChannel) {
      return adapters.get(channel) ?? null;
    }
  };
}
