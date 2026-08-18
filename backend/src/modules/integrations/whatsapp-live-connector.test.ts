import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { FeedbackChannel, IntegrationMode, IntegrationProvider } from "@prisma/client";

import { env } from "../../config/env.js";
import { INTEGRATION_ERRORS, IntegrationError } from "./integration.errors.js";
import type {
  ExternalFeedbackItem,
  IntegrationConnectionContext
} from "./integration.types.js";
import {
  WhatsAppLiveConnector,
  maskPhone,
  whatsAppLiveConnectorTestUtils
} from "./whatsapp-live-connector.js";

env.META_WHATSAPP_APP_SECRET = "phase-22-test-secret";
env.META_WHATSAPP_VERIFY_TOKEN = "phase-22-verify-token";

const context: IntegrationConnectionContext = {
  connectionId: "connection-1",
  businessId: "business-1",
  defaultBranchId: "branch-1",
  displayName: "WhatsApp Live",
  provider: IntegrationProvider.WHATSAPP,
  mode: IntegrationMode.LIVE,
  demoScenario: null,
  whatsappPhoneNumberId: "123456789012345",
  whatsappBusinessAccountId: "987654321098765",
  whatsappDisplayPhoneNumber: "+250 788 000 000"
};

const item: ExternalFeedbackItem = {
  externalId: "whatsapp:connection-1:wamid-test",
  sourceLabel: "WhatsApp inbound text message",
  authorName: "Customer",
  title: "WhatsApp message",
  message: "The branch team helped me quickly.",
  occurredAt: "2026-08-10T12:00:00.000Z",
  customer: { name: "Customer", phone: "+250788000111" },
  metadata: {
    messageType: "text",
    sender: "+250***0111",
    providerMessageIdHash: "abc123"
  }
};

test("whatsapp signature verification accepts the exact raw signed body", () => {
  const rawBody = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
  const signature = sign(rawBody);

  assert.doesNotThrow(() =>
    whatsAppLiveConnectorTestUtils.verifyWhatsAppSignature(rawBody, signature)
  );
});

test("whatsapp signature verification rejects missing, malformed, and mutated payloads", () => {
  const rawBody = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
  const signature = sign(rawBody);

  assert.throws(
    () => whatsAppLiveConnectorTestUtils.verifyWhatsAppSignature(rawBody, undefined),
    (error) =>
      isIntegrationCode(error, INTEGRATION_ERRORS.WHATSAPP_WEBHOOK_SIGNATURE_INVALID)
  );
  assert.throws(
    () => whatsAppLiveConnectorTestUtils.verifyWhatsAppSignature(rawBody, "sha256=bad"),
    (error) =>
      isIntegrationCode(error, INTEGRATION_ERRORS.WHATSAPP_WEBHOOK_SIGNATURE_INVALID)
  );
  assert.throws(
    () =>
      whatsAppLiveConnectorTestUtils.verifyWhatsAppSignature(
        Buffer.from('{"entry":[],"object":"whatsapp_business_account"}'),
        signature
      ),
    (error) =>
      isIntegrationCode(error, INTEGRATION_ERRORS.WHATSAPP_WEBHOOK_SIGNATURE_INVALID)
  );
});

test("whatsapp phone helpers normalize Rwanda and international senders without exposing full masks", () => {
  assert.equal(
    whatsAppLiveConnectorTestUtils.normalizeWhatsAppSender("0788000111"),
    "+250788000111"
  );
  assert.equal(
    whatsAppLiveConnectorTestUtils.normalizeWhatsAppSender("250788000111"),
    "+250788000111"
  );
  assert.equal(
    whatsAppLiveConnectorTestUtils.normalizeWhatsAppSender("+14155550100"),
    "+14155550100"
  );
  assert.equal(maskPhone("+250788000111"), "+250***0111");
});

test("whatsapp live connector normalizes inbound text for the feedback pipeline", () => {
  const connector = new WhatsAppLiveConnector();
  const normalized = connector.normalizeItem(item, context);

  assert.equal(normalized.businessId, context.businessId);
  assert.equal(normalized.branchId, context.defaultBranchId);
  assert.equal(normalized.channel, FeedbackChannel.WHATSAPP);
  assert.equal(normalized.idempotencyKey, item.externalId);
  assert.equal(normalized.customer?.phone, "+250788000111");
  assert.ok(normalized.metadata);
  assert.equal(normalized.metadata.sourceType, "live-whatsapp");
  assert.equal(normalized.metadata.liveMode, true);
  assert.equal(normalized.metadata.demoMode, false);
  assert.equal(normalized.metadata.provider, IntegrationProvider.WHATSAPP);
});

test("whatsapp live connector rejects manual synchronization entry points", async () => {
  const connector = new WhatsAppLiveConnector();

  await assert.rejects(
    () => connector.fetchItems(),
    (error) => isIntegrationCode(error, INTEGRATION_ERRORS.MODE_UNSUPPORTED)
  );
  await assert.rejects(
    () => connector.fetchDemoItems(),
    (error) => isIntegrationCode(error, INTEGRATION_ERRORS.MODE_UNSUPPORTED)
  );
});

function sign(rawBody: Buffer): string {
  return `sha256=${createHmac("sha256", env.META_WHATSAPP_APP_SECRET ?? "")
    .update(rawBody)
    .digest("hex")}`;
}

function isIntegrationCode(error: unknown, code: string): boolean {
  return error instanceof IntegrationError && error.code === code;
}
