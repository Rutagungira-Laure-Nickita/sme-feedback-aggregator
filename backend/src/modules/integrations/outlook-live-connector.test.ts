import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test, { afterEach } from "node:test";

import {
  EmailProviderType,
  FeedbackChannel,
  IntegrationMode,
  IntegrationProvider
} from "@prisma/client";

process.env.DATABASE_URL ??= "mysql://root:password@localhost:3306/sme_feedback_test";
process.env.JWT_ACCESS_SECRET ??= "a".repeat(32);
process.env.JWT_REFRESH_SECRET ??= "b".repeat(32);
process.env.LIVE_OUTLOOK_ENABLED = "true";
process.env.MICROSOFT_OAUTH_CLIENT_ID = "microsoft-client-id";
process.env.MICROSOFT_OAUTH_CLIENT_SECRET = "microsoft-client-secret";
process.env.MICROSOFT_OAUTH_REDIRECT_URI =
  "http://localhost:5000/api/integrations/email/oauth/outlook/callback";
process.env.MICROSOFT_OAUTH_TENANT = "common";
process.env.MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const {
  MicrosoftGraphOutlookClient,
  OUTLOOK_SCOPES,
  OutlookLiveConnector,
  outlookLiveConnectorTestUtils,
  resetOutlookGraphClientForTests,
  setOutlookGraphClientForTests
} = await import("./outlook-live-connector.js");

const context = {
  connectionId: "connection-1",
  businessId: "business-1",
  defaultBranchId: "branch-1",
  displayName: "Support Outlook",
  provider: IntegrationProvider.EMAIL,
  mode: IntegrationMode.LIVE,
  demoScenario: null,
  liveProviderType: EmailProviderType.MICROSOFT,
  providerAccountId: "account-1",
  providerAccountLabel: "su***@example.com",
  synchronizationFolder: "INBOX",
  lastProviderCursor: null
};

afterEach(() => {
  resetOutlookGraphClientForTests();
});

test("outlook authorization uses delegated read-only Microsoft scopes and common tenant", () => {
  assert.deepEqual(OUTLOOK_SCOPES, [
    "openid",
    "profile",
    "offline_access",
    "User.Read",
    "Mail.Read"
  ]);
  assert.equal(OUTLOOK_SCOPES.includes("Mail.Send"), false);

  const client = new MicrosoftGraphOutlookClient();
  const url = new URL(
    client.getAuthorizationUrl({
      state: "state-value",
      codeChallenge: "challenge-value"
    })
  );

  assert.equal(url.origin, "https://login.microsoftonline.com");
  assert.equal(url.pathname, "/common/oauth2/v2.0/authorize");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), OUTLOOK_SCOPES.join(" "));
});

test("outlook connector normalizes Inbox messages and stores attachment metadata only", async () => {
  const attachmentPaths: string[] = [];
  setOutlookGraphClientForTests({
    getAuthorizationUrl: () =>
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    exchangeCode: async () => ({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiryDate: new Date(Date.now() + 3600_000),
      scopes: OUTLOOK_SCOPES
    }),
    getAccountIdentity: async () => ({
      id: "account-1",
      emailAddress: "support@example.com",
      tenantId: null
    }),
    listInitialInboxMessages: async () => ({
      value: []
    }),
    getDeltaMessages: async () => ({
      value: []
    }),
    initializeDeltaCursor: async () =>
      "https://graph.microsoft.com/v1.0/me/messages/delta?$deltatoken=cursor",
    listAttachmentMetadata: async (_tokens, messageId) => {
      attachmentPaths.push(`/me/messages/${messageId}/attachments`);
      return [
        {
          id: "attachment-provider-id",
          name: "invoice.pdf",
          contentType: "application/pdf",
          size: 2048,
          isInline: false
        }
      ];
    }
  } as Parameters<typeof setOutlookGraphClientForTests>[0]);

  const item = await outlookLiveConnectorTestUtils.toExternalFeedbackItemForTests(
    context,
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiryDate: null,
      scopeSummary: null
    },
    {
      id: "immutable-message-id",
      internetMessageId: "<message@example.com>",
      subject: "Queue complaint",
      from: { emailAddress: { name: "Ada Customer", address: "ada@example.com" } },
      receivedDateTime: "2026-08-10T10:30:00.000Z",
      body: { contentType: "text", content: "I waited too long in the queue." },
      hasAttachments: true,
      conversationId: "conversation-1"
    }
  );
  const connector = new OutlookLiveConnector();
  const normalized = connector.normalizeItem(item, context);
  const preview = connector.getSafePreview(item);

  assert.equal(item.externalId, "outlook:connection-1:immutable-message-id");
  assert.equal(item.title, "Queue complaint");
  assert.equal(item.customer?.email, "ada@example.com");
  assert.equal(item.attachments?.length, 1);
  assert.equal(item.attachments?.[0]?.filename, "invoice.pdf");
  assert.equal(item.attachments?.[0]?.externalUrl, undefined);
  assert.equal(item.attachments?.[0]?.metadata?.metadataOnly, true);
  assert.deepEqual(attachmentPaths, ["/me/messages/immutable-message-id/attachments"]);
  assert.equal(normalized.channel, FeedbackChannel.EMAIL);
  assert.equal(normalized.metadata?.sourceType, "live-email");
  assert.equal(normalized.metadata?.liveProviderType, EmailProviderType.MICROSOFT);
  assert.equal(preview.liveMode, true);
});

test("outlook graph requests require immutable IDs and text bodies", () => {
  assert.match(outlookLiveConnectorTestUtils.GRAPH_PREFER, /IdType="ImmutableId"/);
  assert.match(
    outlookLiveConnectorTestUtils.GRAPH_PREFER,
    /outlook\.body-content-type="text"/
  );
});
