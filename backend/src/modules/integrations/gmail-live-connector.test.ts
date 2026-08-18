import assert from "node:assert/strict";
import test from "node:test";

import {
  EmailProviderType,
  FeedbackChannel,
  IntegrationMode,
  IntegrationProvider
} from "@prisma/client";
import {
  GmailLiveConnector,
  gmailLiveConnectorTestUtils
} from "./gmail-live-connector.js";
import type { IntegrationConnectionContext } from "./integration.types.js";

const context: IntegrationConnectionContext = {
  connectionId: "connection-1",
  businessId: "business-1",
  defaultBranchId: "branch-1",
  displayName: "Support Inbox",
  provider: IntegrationProvider.EMAIL,
  mode: IntegrationMode.LIVE,
  demoScenario: null,
  liveProviderType: EmailProviderType.GMAIL,
  providerAccountId: "support@example.com",
  providerAccountLabel: "su***@example.com",
  synchronizationFolder: "INBOX",
  lastProviderCursor: null
};

test("gmail parser prefers plain text and records attachment metadata only", () => {
  const item = gmailLiveConnectorTestUtils.toExternalFeedbackItem(context, {
    id: "gmail-message-1",
    threadId: "thread-1",
    internalDate: String(Date.UTC(2026, 7, 5, 9, 30)),
    payload: {
      headers: [
        { name: "From", value: '"Ada Customer" <ada@example.com>' },
        { name: "Subject", value: "Service follow-up" },
        { name: "Message-ID", value: "<message-1@example.com>" }
      ],
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "text/html",
          body: { data: encodeBody("<script>bad()</script><p>HTML body</p>") }
        },
        {
          mimeType: "text/plain",
          body: { data: encodeBody("Plain body wins") }
        },
        {
          filename: "receipt.pdf",
          mimeType: "application/pdf",
          body: { size: 512, attachmentId: "provider-attachment-id" }
        }
      ]
    }
  });

  assert.equal(item.externalId, "gmail:connection-1:gmail-message-1");
  assert.equal(item.title, "Service follow-up");
  assert.equal(item.message, "Plain body wins");
  assert.equal(item.customer?.name, "Ada Customer");
  assert.equal(item.customer?.email, "ada@example.com");
  assert.equal(item.attachments?.length, 1);
  assert.equal(item.attachments?.[0]?.filename, "receipt.pdf");
  assert.equal(item.attachments?.[0]?.externalUrl, undefined);
  assert.equal(item.metadata.liveProviderType, EmailProviderType.GMAIL);
  assert.equal(item.metadata.hasRfcMessageId, true);
  assert.equal(typeof item.metadata.rfcMessageIdHash, "string");
});

test("gmail parser converts html-only email to text without embedded script or images", () => {
  const item = gmailLiveConnectorTestUtils.toExternalFeedbackItem(context, {
    id: "gmail-message-2",
    threadId: "thread-2",
    internalDate: String(Date.UTC(2026, 7, 5, 10, 0)),
    payload: {
      headers: [
        { name: "From", value: "feedback@example.com" },
        { name: "Subject", value: "Broken order" }
      ],
      mimeType: "text/html",
      body: {
        data: encodeBody(
          '<style>.hidden{display:none}</style><h1>Order issue</h1><img src="https://example.com/pixel.gif"><p>The delivery was late.</p>'
        )
      }
    }
  });

  assert.match(item.message, /Order issue/i);
  assert.match(item.message, /delivery was late/);
  assert.doesNotMatch(item.message, /pixel\.gif|display:none/);
});

test("gmail live connector normalizes parsed messages for the feedback pipeline", () => {
  const connector = new GmailLiveConnector();
  const item = gmailLiveConnectorTestUtils.toExternalFeedbackItem(context, {
    id: "gmail-message-3",
    threadId: "thread-3",
    internalDate: String(Date.UTC(2026, 7, 5, 10, 30)),
    payload: {
      headers: [
        { name: "From", value: '"Grace Sender" <grace@example.com>' },
        { name: "Subject", value: "Queue complaint" }
      ],
      mimeType: "text/plain",
      body: { data: encodeBody("I waited too long in the pickup queue.") }
    }
  });
  const normalized = connector.normalizeItem(item, context);
  const preview = connector.getSafePreview(item);

  assert.equal(normalized.businessId, context.businessId);
  assert.equal(normalized.branchId, context.defaultBranchId);
  assert.equal(normalized.channel, FeedbackChannel.EMAIL);
  assert.equal(normalized.externalId, "gmail:connection-1:gmail-message-3");
  assert.equal(
    normalized.idempotencyKey,
    "email:gmail:connection-1:gmail:connection-1:gmail-message-3"
  );
  assert.equal(normalized.metadata?.sourceType, "live-email");
  assert.equal(normalized.metadata?.demoMode, false);
  assert.equal(normalized.metadata?.liveMode, true);
  assert.equal(preview.demoMode, false);
  assert.equal(preview.liveMode, true);
});

function encodeBody(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
