import assert from "node:assert/strict";
import test from "node:test";

import {
  FeedbackChannel,
  IntegrationDemoScenario,
  IntegrationMode,
  IntegrationProvider
} from "@prisma/client";

import { createDemoConnectors } from "./demo-connectors.js";
import { createIntegrationConnectorRegistry } from "./integration-registry.js";
import type { IntegrationConnectionContext } from "./integration.types.js";

const context: IntegrationConnectionContext = {
  connectionId: "connection-1",
  businessId: "business-1",
  defaultBranchId: "branch-1",
  displayName: "Google Reviews Demo",
  provider: IntegrationProvider.GOOGLE_REVIEWS,
  mode: IntegrationMode.DEMO,
  demoScenario: IntegrationDemoScenario.STANDARD_MIXED
};

test("connector registry exposes Demo providers and disabled-by-default Live providers", () => {
  const registry = createIntegrationConnectorRegistry();
  const providers = registry.listProviders();
  const demoProviders = providers.filter(
    (provider) => provider.mode === IntegrationMode.DEMO
  );
  const liveProviders = providers.filter(
    (provider) => provider.mode === IntegrationMode.LIVE
  );

  assert.equal(providers.length, 10);
  assert.equal(demoProviders.length, 6);
  assert.equal(liveProviders.length, 4);
  assert.deepEqual(
    demoProviders.map((provider) => provider.provider).sort(),
    [
      IntegrationProvider.EMAIL,
      IntegrationProvider.FACEBOOK,
      IntegrationProvider.GOOGLE_REVIEWS,
      IntegrationProvider.INSTAGRAM,
      IntegrationProvider.WHATSAPP,
      IntegrationProvider.X
    ].sort()
  );
  assert.equal(
    demoProviders.every((provider) => provider.demoSupported),
    true
  );
  assert.equal(
    liveProviders.some((provider) => provider.provider === IntegrationProvider.EMAIL),
    true
  );
  assert.equal(
    liveProviders.some((provider) => provider.provider === IntegrationProvider.WHATSAPP),
    true
  );
  assert.equal(
    liveProviders.some((provider) => provider.provider === IntegrationProvider.FACEBOOK),
    true
  );
  assert.equal(
    liveProviders.some((provider) => provider.provider === IntegrationProvider.INSTAGRAM),
    true
  );
  assert.throws(() =>
    registry.getConnector(IntegrationProvider.GOOGLE_REVIEWS, IntegrationMode.LIVE)
  );
});

test("demo connectors normalize through NormalizedFeedbackInput shape", async () => {
  const connector = createDemoConnectors().find(
    (item) => item.provider === IntegrationProvider.GOOGLE_REVIEWS
  );

  assert.ok(connector);
  const items = await connector.fetchDemoItems(context);
  const normalized = connector.normalizeItem(items[0]!, context);

  assert.equal(normalized.businessId, context.businessId);
  assert.equal(normalized.branchId, context.defaultBranchId);
  assert.equal(normalized.channel, FeedbackChannel.GOOGLE_REVIEW);
  assert.match(normalized.idempotencyKey, /^demo:connection-1:/);
  assert.ok(normalized.metadata);
  assert.equal(normalized.metadata.provider, IntegrationProvider.GOOGLE_REVIEWS);
  assert.equal(normalized.metadata.demoMode, true);
  assert.equal(normalized.metadata.liveProviderConnected, false);
  assert.equal(normalized.metadata.simulatedExternalData, true);
});

test("demo connector previews are safe summaries and payload hashes are stable", async () => {
  const connector = createDemoConnectors().find(
    (item) => item.provider === IntegrationProvider.EMAIL
  );

  assert.ok(connector);
  const items = await connector.fetchDemoItems({
    ...context,
    provider: IntegrationProvider.EMAIL,
    displayName: "Email Demo"
  });
  const first = items[0]!;
  const preview = connector.getSafePreview(first);

  assert.equal(typeof preview.textPreview, "string");
  assert.equal("email" in preview, false);
  assert.equal("phone" in preview, false);
  assert.match(connector.getPayloadHash(first), /^[a-f0-9]{64}$/);
  assert.equal(connector.getPayloadHash(first), connector.getPayloadHash({ ...first }));
});

test("partial-failure scenario includes a retryable invalid demo item", async () => {
  const connector = createDemoConnectors().find(
    (item) => item.provider === IntegrationProvider.WHATSAPP
  );

  assert.ok(connector);
  const items = await connector.fetchDemoItems({
    ...context,
    provider: IntegrationProvider.WHATSAPP,
    displayName: "WhatsApp Demo",
    demoScenario: IntegrationDemoScenario.PARTIAL_FAILURE
  });
  const invalid = items.find((item) => item.invalidReason);

  assert.ok(invalid);
  assert.throws(() => connector.normalizeItem(invalid, context), /partial-failure/i);
});
