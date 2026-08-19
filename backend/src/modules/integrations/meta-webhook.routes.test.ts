import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import type { IntegrationWebhookDeliveryStatus } from "@prisma/client";
import {
  FeedbackChannel,
  IntegrationConnectionStatus,
  IntegrationMode,
  IntegrationProvider
} from "../../lib/prisma-runtime.js";

const VERIFY_TOKEN = "phase-24-route-verify-token";
const APP_SECRET = "phase-24-route-app-secret";
const WABA_ID = "28502852352642538";
const PHONE_NUMBER_ID = "1245333441997659";

process.env.LIVE_META_SOCIAL_ENABLED = "true";
process.env.LIVE_WHATSAPP_ENABLED = "true";
process.env.META_WHATSAPP_APP_SECRET = APP_SECRET;
process.env.META_WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
  "base64"
);

const { createApp } = await import("../../app.js");
const { prisma } = await import("../../lib/prisma.js");
const { feedbackProcessingService } = await import("../feedback-processing/index.js");

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
    server.closeAllConnections();
  });
  await prisma.$disconnect();
});

test("Meta GET verification returns the exact challenge for the configured token", async () => {
  const response = await fetch(verificationUrl({ challenge: "12345" }));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/plain\b/i);
  assert.equal(body, "12345");
});

test("Meta GET verification rejects an incorrect token with 4xx, never 500", async () => {
  const response = await fetch(
    verificationUrl({ verifyToken: "incorrect-token", challenge: "wrong-token" })
  );
  const body = (await response.json()) as ErrorResponse;

  assert.ok(response.status >= 400 && response.status < 500);
  assert.notEqual(response.status, 500);
  assert.notEqual(body.error.code, "INTERNAL_SERVER_ERROR");
});

test("Meta GET verification rejects missing parameters with a controlled 4xx", async () => {
  const response = await fetch(`${baseUrl}/api/integrations/meta/webhook`);
  const body = (await response.json()) as ErrorResponse;

  assert.ok(response.status >= 400 && response.status < 500);
  assert.notEqual(body.error.code, "INTERNAL_SERVER_ERROR");
});

test("Meta GET verification does not require X-Hub-Signature-256", async () => {
  const response = await fetch(verificationUrl({ challenge: "unsigned-get" }), {
    headers: {}
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "unsigned-get");
});

test("Meta POST webhook continues to enforce X-Hub-Signature-256", async () => {
  const response = await fetch(`${baseUrl}/api/integrations/meta/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: "page", entry: [] })
  });
  const body = (await response.json()) as ErrorResponse;

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "META_WEBHOOK_SIGNATURE_INVALID");
});

test("signed Facebook and Instagram payloads still use the social webhook processor", async () => {
  for (const object of ["page", "instagram"]) {
    const rawBody = JSON.stringify({ object, entry: [] });
    const response = await postSignedMetaWebhook(rawBody);
    const body = (await response.json()) as WebhookSuccessResponse;

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, {
      received: 0,
      imported: 0,
      duplicates: 0,
      skipped: 0,
      failed: 0
    });
  }
});

test("signed WhatsApp messages dispatch through Live WhatsApp, match WABA and phone, deduplicate, and skip media", async () => {
  const connection = {
    id: "whatsapp-connection-1",
    businessId: "business-1",
    defaultBranchId: "branch-1",
    displayName: "WhatsApp Live",
    provider: IntegrationProvider.WHATSAPP,
    mode: IntegrationMode.LIVE,
    demoScenario: null,
    liveProviderType: null,
    providerAccountId: PHONE_NUMBER_ID,
    providerAccountLabel: "+155***5388",
    synchronizationFolder: "WEBHOOK",
    lastProviderCursor: null,
    whatsappPhoneNumberId: PHONE_NUMBER_ID,
    whatsappBusinessAccountId: WABA_ID,
    whatsappDisplayPhoneNumber: "+15552045388",
    status: IntegrationConnectionStatus.CONNECTED,
    business: { status: "ACTIVE" },
    defaultBranch: { id: "branch-1", name: "Main", status: "ACTIVE" }
  };
  const deliveryStatuses = new Map<string, IntegrationWebhookDeliveryStatus>();
  const normalizedFeedback: Array<Record<string, unknown>> = [];
  let matchedLookupCount = 0;

  await withWhatsAppPersistenceMocks({
    findConnection: (input) => {
      const where = input.where as Record<string, unknown>;
      assert.equal(where.provider, IntegrationProvider.WHATSAPP);
      assert.equal(where.mode, IntegrationMode.LIVE);
      assert.equal(where.whatsappPhoneNumberId, PHONE_NUMBER_ID);
      assert.equal(where.whatsappBusinessAccountId, WABA_ID);
      matchedLookupCount += 1;
      return connection;
    },
    findDelivery: (input) => {
      const key = readDeliveryKey(input);
      const status = deliveryStatuses.get(key);
      return status ? { status } : null;
    },
    upsertDelivery: (input) => {
      const key = readDeliveryKey(input);
      const create = input.create as { status: IntegrationWebhookDeliveryStatus };
      deliveryStatuses.set(key, create.status);
    },
    processFeedback: (input) => {
      normalizedFeedback.push(input);
      return {
        feedbackId: "feedback-1",
        ingestionId: "ingestion-1",
        duplicate: false
      };
    },
    connection,
    run: async () => {
      const textBody = whatsappPayload({
        id: "wamid.DIAGNOSTIC_UNIQUE_ID",
        type: "text",
        text: "Exact signed webhook diagnostic"
      });

      const firstResponse = await postSignedMetaWebhook(textBody);
      const first = (await firstResponse.json()) as WebhookSuccessResponse;
      assert.equal(firstResponse.status, 200);
      assert.equal(first.data.received, 1);
      assert.equal(first.data.imported, 1);
      assert.equal(first.data.duplicates, 0);

      const replayResponse = await postSignedMetaWebhook(textBody);
      const replay = (await replayResponse.json()) as WebhookSuccessResponse;
      assert.equal(replayResponse.status, 200);
      assert.equal(replay.data.received, 1);
      assert.equal(replay.data.imported, 0);
      assert.equal(replay.data.duplicates, 1);

      const mediaResponse = await postSignedMetaWebhook(
        whatsappPayload({ id: "wamid.MEDIA_UNIQUE_ID", type: "image" })
      );
      const media = (await mediaResponse.json()) as WebhookSuccessResponse;
      assert.equal(mediaResponse.status, 200);
      assert.equal(media.data.received, 1);
      assert.equal(media.data.imported, 0);
      assert.equal(media.data.skipped, 1);

      assert.equal(matchedLookupCount, 3);
      assert.equal(normalizedFeedback.length, 1);
      assert.equal(normalizedFeedback[0]?.businessId, "business-1");
      assert.equal(normalizedFeedback[0]?.branchId, "branch-1");
      assert.equal(normalizedFeedback[0]?.channel, FeedbackChannel.WHATSAPP);
    }
  });
});

function verificationUrl(input: { verifyToken?: string; challenge: string }): string {
  const query = new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.verify_token": input.verifyToken ?? VERIFY_TOKEN,
    "hub.challenge": input.challenge
  });

  return `${baseUrl}/api/integrations/meta/webhook?${query.toString()}`;
}

type ErrorResponse = {
  error: {
    code: string;
  };
};

type WebhookSuccessResponse = {
  success: boolean;
  data: {
    received: number;
    imported: number;
    duplicates: number;
    skipped: number;
    failed: number;
  };
};

type UnknownRecord = Record<string, unknown>;

async function postSignedMetaWebhook(rawBody: string): Promise<Response> {
  return fetch(`${baseUrl}/api/integrations/meta/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(rawBody)
    },
    body: rawBody
  });
}

function sign(rawBody: string): string {
  return `sha256=${createHmac("sha256", APP_SECRET).update(rawBody).digest("hex")}`;
}

function whatsappPayload(input: { id: string; type: string; text?: string }): string {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: WABA_ID,
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+15552045388",
                phone_number_id: PHONE_NUMBER_ID
              },
              contacts: [
                {
                  profile: { name: "Webhook Diagnostic" },
                  wa_id: "250788000001"
                }
              ],
              messages: [
                {
                  from: "250788000001",
                  id: input.id,
                  timestamp: "1786838400",
                  ...(input.text ? { text: { body: input.text } } : {}),
                  type: input.type
                }
              ]
            }
          }
        ]
      }
    ]
  });
}

function readDeliveryKey(input: UnknownRecord): string {
  const where = input.where as {
    connectionId_externalEventId: { externalEventId: string };
  };
  return where.connectionId_externalEventId.externalEventId;
}

async function withWhatsAppPersistenceMocks(input: {
  findConnection: (input: UnknownRecord) => unknown;
  findDelivery: (input: UnknownRecord) => unknown;
  upsertDelivery: (input: UnknownRecord) => void;
  processFeedback: (input: UnknownRecord) => unknown;
  connection: unknown;
  run: () => Promise<void>;
}): Promise<void> {
  type AsyncMethod = (input: UnknownRecord) => Promise<unknown>;
  const connectionDelegate = prisma.integrationConnection as unknown as {
    findFirst: AsyncMethod;
    update: AsyncMethod;
  };
  const deliveryDelegate = prisma.integrationWebhookDelivery as unknown as {
    findUnique: AsyncMethod;
    upsert: AsyncMethod;
  };
  const processingService = feedbackProcessingService as unknown as {
    process: AsyncMethod;
  };
  const originals = {
    findFirst: connectionDelegate.findFirst,
    update: connectionDelegate.update,
    findUnique: deliveryDelegate.findUnique,
    upsert: deliveryDelegate.upsert,
    process: processingService.process
  };

  connectionDelegate.findFirst = async (args) => input.findConnection(args);
  connectionDelegate.update = async () => input.connection;
  deliveryDelegate.findUnique = async (args) => input.findDelivery(args);
  deliveryDelegate.upsert = async (args) => {
    input.upsertDelivery(args);
    return null;
  };
  processingService.process = async (args) => input.processFeedback(args);

  try {
    await input.run();
  } finally {
    connectionDelegate.findFirst = originals.findFirst;
    connectionDelegate.update = originals.update;
    deliveryDelegate.findUnique = originals.findUnique;
    deliveryDelegate.upsert = originals.upsert;
    processingService.process = originals.process;
  }
}
