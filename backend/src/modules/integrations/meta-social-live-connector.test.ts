import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { FeedbackChannel, IntegrationMode, IntegrationProvider } from "@prisma/client";

import { env } from "../../config/env.js";
import { INTEGRATION_ERRORS, IntegrationError } from "./integration.errors.js";
import {
  MetaSocialLiveConnector,
  metaSocialLiveConnectorTestUtils
} from "./meta-social-live-connector.js";
import type {
  ExternalFeedbackItem,
  IntegrationConnectionContext
} from "./integration.types.js";

env.META_WHATSAPP_APP_SECRET = "phase-24-test-secret";
env.META_WHATSAPP_VERIFY_TOKEN = "phase-24-verify-token";

const facebookContext: IntegrationConnectionContext = {
  connectionId: "facebook-connection-1",
  businessId: "business-1",
  defaultBranchId: "branch-1",
  displayName: "Facebook Live",
  provider: IntegrationProvider.FACEBOOK,
  mode: IntegrationMode.LIVE,
  demoScenario: null,
  providerAccountId: "page-123",
  providerAccountLabel: "Kigali Cafe"
};

const instagramContext: IntegrationConnectionContext = {
  connectionId: "instagram-connection-1",
  businessId: "business-1",
  defaultBranchId: "branch-1",
  displayName: "Instagram Live",
  provider: IntegrationProvider.INSTAGRAM,
  mode: IntegrationMode.LIVE,
  demoScenario: null,
  providerAccountId: "ig-123",
  providerAccountLabel: "@kigalicafe"
};

test("meta social signature verification accepts exact raw body and rejects mutation", () => {
  const rawBody = Buffer.from('{"object":"page","entry":[]}');
  const signature = sign(rawBody);

  assert.doesNotThrow(() =>
    metaSocialLiveConnectorTestUtils.verifyMetaWebhookSignature({
      rawBody,
      signatureHeader: signature
    })
  );
  assert.throws(
    () =>
      metaSocialLiveConnectorTestUtils.verifyMetaWebhookSignature({
        rawBody: Buffer.from('{"entry":[],"object":"page"}'),
        signatureHeader: signature
      }),
    (error) =>
      error instanceof IntegrationError &&
      error.code === INTEGRATION_ERRORS.META_WEBHOOK_SIGNATURE_INVALID
  );
});

test("meta social extraction keeps only Facebook Page comment add events importable", () => {
  const events = metaSocialLiveConnectorTestUtils.extractSocialEvents({
    object: "page",
    entry: [
      {
        id: "page-123",
        changes: [
          {
            field: "feed",
            value: {
              item: "comment",
              verb: "add",
              comment_id: "comment-1",
              message: "Great food, slow queue.",
              from: { id: "user-1", name: "Ada Customer" },
              post_id: "post-1",
              created_time: 1786377600
            }
          },
          {
            field: "feed",
            value: { item: "reaction", verb: "add", id: "reaction-1" }
          }
        ]
      }
    ]
  });

  assert.equal(events.length, 2);
  const comment = events[0]!;
  const unsupported = events[1]!;
  assert.equal(comment.provider, IntegrationProvider.FACEBOOK);
  assert.equal(comment.providerObjectId, "page-123");
  assert.equal(comment.eventId, "comment-1");
  assert.equal(comment.eventType, "comment");
  assert.equal(comment.message, "Great food, slow queue.");
  assert.equal(comment.authorName, "Ada Customer");
  assert.equal(unsupported.eventType, "unsupported");
});

test("meta social extraction supports Instagram comments and defers mentions", () => {
  const events = metaSocialLiveConnectorTestUtils.extractSocialEvents({
    object: "instagram",
    entry: [
      {
        id: "ig-123",
        time: 1786377600,
        changes: [
          {
            field: "comments",
            value: {
              id: "ig-comment-1",
              text: "Loved the ambience.",
              from: { username: "ada_customer" },
              media: { id: "media-1" }
            }
          },
          {
            field: "mentions",
            value: {
              id: "ig-mention-1",
              text: "@kigalicafe thanks",
              from: { username: "ada_customer" }
            }
          }
        ]
      }
    ]
  });

  assert.equal(events.length, 2);
  const comment = events[0]!;
  const mention = events[1]!;
  assert.equal(comment.provider, IntegrationProvider.INSTAGRAM);
  assert.equal(comment.eventType, "comment");
  assert.equal(comment.eventId, "ig-comment-1");
  assert.equal(comment.authorName, "@ada_customer");
  assert.equal(comment.mediaReference, "media-1");
  assert.equal(mention.eventType, "mention");
  assert.equal(mention.resultCode, INTEGRATION_ERRORS.INSTAGRAM_WEBHOOK_EVENT_INVALID);
});

test("facebook live connector normalizes comment input for the feedback pipeline", () => {
  const item: ExternalFeedbackItem = {
    externalId: "facebook:facebook-connection-1:comment-1",
    sourceLabel: "Facebook Page comment",
    authorName: "Ada Customer",
    title: "Facebook comment",
    message: "The food was good but service was slow.",
    occurredAt: "2026-08-10T12:00:00.000Z",
    customer: { name: "Ada Customer" },
    metadata: {
      accountId: "page-123",
      accountName: "Kigali Cafe",
      parentReference: "post-1"
    }
  };
  const connector = new MetaSocialLiveConnector(IntegrationProvider.FACEBOOK);
  const normalized = connector.normalizeItem(item, facebookContext);

  assert.equal(normalized.businessId, facebookContext.businessId);
  assert.equal(normalized.branchId, facebookContext.defaultBranchId);
  assert.equal(normalized.channel, FeedbackChannel.FACEBOOK);
  assert.equal(normalized.idempotencyKey, item.externalId);
  assert.equal(normalized.customer?.name, "Ada Customer");
  assert.equal(normalized.customer?.email, undefined);
  assert.equal(normalized.metadata?.sourceType, "live-facebook");
  assert.equal(normalized.metadata?.liveMode, true);
});

test("instagram live connector normalizes comment input without username matching by email or phone", () => {
  const item: ExternalFeedbackItem = {
    externalId: "instagram:instagram-connection-1:comment-1",
    sourceLabel: "Instagram professional comment",
    authorName: "@ada_customer",
    title: "Instagram comment",
    message: "Loved the ambience.",
    occurredAt: "2026-08-10T12:00:00.000Z",
    customer: { name: "@ada_customer" },
    metadata: { accountId: "ig-123", mediaReference: "media-1" }
  };
  const connector = new MetaSocialLiveConnector(IntegrationProvider.INSTAGRAM);
  const normalized = connector.normalizeItem(item, instagramContext);

  assert.equal(normalized.channel, FeedbackChannel.INSTAGRAM);
  assert.equal(normalized.customer?.name, "@ada_customer");
  assert.equal(normalized.customer?.email, undefined);
  assert.equal(normalized.customer?.phone, undefined);
  assert.equal(normalized.metadata?.sourceType, "live-instagram");
});

test("meta social live connector rejects manual synchronization entry points", async () => {
  const connector = new MetaSocialLiveConnector(IntegrationProvider.FACEBOOK);

  await assert.rejects(
    () => connector.fetchItems(),
    (error) =>
      error instanceof IntegrationError &&
      error.code === INTEGRATION_ERRORS.MODE_UNSUPPORTED
  );
  await assert.rejects(
    () => connector.fetchDemoItems(),
    (error) =>
      error instanceof IntegrationError &&
      error.code === INTEGRATION_ERRORS.MODE_UNSUPPORTED
  );
});

function sign(rawBody: Buffer): string {
  return `sha256=${createHmac("sha256", env.META_WHATSAPP_APP_SECRET ?? "")
    .update(rawBody)
    .digest("hex")}`;
}
