import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("operational feedback policy keeps native intake plus real Gmail and WhatsApp", () => {
  const serialized = JSON.stringify(supportedOperationalFeedbackWhere());
  for (const channel of ["MANUAL", "PUBLIC_FORM", "QR_CODE", "WHATSAPP", "EMAIL"])
    assert.match(serialized, new RegExp(channel));
  for (const retired of ["GOOGLE_REVIEW", "FACEBOOK", "INSTAGRAM", '"X"', "OTHER"])
    assert.doesNotMatch(serialized, new RegExp(retired));
  assert.match(serialized, /liveMode/);
  assert.match(serialized, /GMAIL/);
});
