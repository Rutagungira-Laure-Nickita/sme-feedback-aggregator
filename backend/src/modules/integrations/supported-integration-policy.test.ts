import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_FEEDBACK_CHANNELS,
  activeOperationalFeedbackWhere,
  isSupportedProductConnection,
  supportedLiveIntegrationWhere,
  supportedOperationalFeedbackWhere
} from "./supported-integration-policy.js";

test("product integration policy allows only Live Gmail and Live WhatsApp", () => {
  assert.equal(
    isSupportedProductConnection({
      provider: "EMAIL",
      mode: "LIVE",
      liveProviderType: "GMAIL"
    }),
    true
  );
  assert.equal(
    isSupportedProductConnection({ provider: "WHATSAPP", mode: "LIVE" }),
    true
  );
  for (const connection of [
    { provider: "EMAIL", mode: "LIVE", liveProviderType: "MICROSOFT" },
    { provider: "WHATSAPP", mode: "DEMO" },
    { provider: "FACEBOOK", mode: "LIVE" },
    { provider: "INSTAGRAM", mode: "LIVE" },
    { provider: "X", mode: "DEMO" },
    { provider: "GOOGLE_REVIEWS", mode: "DEMO" }
  ]) {
    assert.equal(isSupportedProductConnection(connection), false);
  }
  assert.deepEqual(supportedLiveIntegrationWhere(), {
    mode: "LIVE",
    OR: [{ provider: "WHATSAPP" }, { provider: "EMAIL", liveProviderType: "GMAIL" }]
  });
});

test("operational feedback policy exposes exactly Gmail, WhatsApp, Manual Entry and Public Form", () => {
  assert.deepEqual(PRODUCT_FEEDBACK_CHANNELS, [
    "EMAIL",
    "WHATSAPP",
    "MANUAL",
    "PUBLIC_FORM"
  ]);
  const serialized = JSON.stringify(supportedOperationalFeedbackWhere());
  for (const channel of ["MANUAL", "PUBLIC_FORM", "WHATSAPP", "EMAIL"])
    assert.match(serialized, new RegExp(channel));
  for (const retired of [
    "QR_CODE",
    "GOOGLE_REVIEW",
    "FACEBOOK",
    "INSTAGRAM",
    '"X"',
    "OTHER"
  ])
    assert.doesNotMatch(serialized, new RegExp(retired));
  assert.match(serialized, /liveMode/);
  assert.match(serialized, /GMAIL/);
});

test("active operational feedback policy excludes soft-deleted rows at the shared root", () => {
  const serialized = JSON.stringify(
    activeOperationalFeedbackWhere({ businessId: "business-1" })
  );
  assert.match(serialized, /"deletedAt":null/);
  assert.match(serialized, /"businessId":"business-1"/);
  assert.match(serialized, /"GMAIL"/);
  assert.doesNotMatch(serialized, /QR_CODE/);
});
