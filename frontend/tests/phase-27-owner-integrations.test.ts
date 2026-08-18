import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS,
  isBusinessOwnerVisibleCapability,
  isBusinessOwnerVisibleConnection
} from "../src/features/businesses/businessOwnerIntegrations.js";
import type {
  IntegrationConnection,
  IntegrationProviderCapability
} from "../src/features/businesses/integrationApi.js";

test("the Business Owner provider allowlist is exactly Live WhatsApp and Gmail", () => {
  assert.deepEqual(BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS, [
    { provider: "WHATSAPP", label: "WhatsApp" },
    { provider: "EMAIL", liveProviderType: "GMAIL", label: "Gmail" }
  ]);
});

test("Demo and non-approved provider connections cannot enter owner operational UI", () => {
  const base = { mode: "LIVE", provider: "WHATSAPP" } as IntegrationConnection;
  assert.equal(isBusinessOwnerVisibleConnection(base), true);
  assert.equal(isBusinessOwnerVisibleConnection({ ...base, mode: "DEMO" }), false);
  assert.equal(
    isBusinessOwnerVisibleConnection({
      ...base,
      provider: "EMAIL",
      liveProviderType: "GMAIL"
    }),
    true
  );
  assert.equal(
    isBusinessOwnerVisibleConnection({
      ...base,
      provider: "EMAIL",
      liveProviderType: "MICROSOFT"
    }),
    false
  );
  assert.equal(
    isBusinessOwnerVisibleConnection({ ...base, provider: "FACEBOOK" }),
    false
  );
});

test("only Live WhatsApp and Email capabilities can produce owner connection cards", () => {
  const capability = {
    provider: "WHATSAPP",
    mode: "LIVE"
  } as IntegrationProviderCapability;
  assert.equal(isBusinessOwnerVisibleCapability(capability), true);
  assert.equal(isBusinessOwnerVisibleCapability({ ...capability, mode: "DEMO" }), false);
  assert.equal(
    isBusinessOwnerVisibleCapability({ ...capability, provider: "EMAIL" }),
    true
  );
  assert.equal(
    isBusinessOwnerVisibleCapability({ ...capability, provider: "INSTAGRAM" }),
    false
  );
});
