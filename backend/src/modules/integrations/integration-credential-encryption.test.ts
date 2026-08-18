import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  getIntegrationEncryptionKeyVersion
} = await import("./integration-credential-encryption.js");

test("integration credential encryption round-trips without plaintext leakage", () => {
  const secret = "gmail-refresh-token-test-value";
  const envelope = encryptIntegrationSecret(secret, "connection-1:refresh");

  assert.equal(getIntegrationEncryptionKeyVersion(), 1);
  assert.notEqual(envelope, secret);
  assert.equal(envelope.includes(secret), false);
  assert.equal(decryptIntegrationSecret(envelope, "connection-1:refresh"), secret);
});

test("integration credential decryption rejects wrong associated data", () => {
  const envelope = encryptIntegrationSecret("access-token", "connection-1:access");

  assert.throws(
    () => decryptIntegrationSecret(envelope, "connection-2:access"),
    /could not be decrypted/i
  );
});

test("integration credential decryption rejects tampered envelopes", () => {
  const envelope = JSON.parse(
    encryptIntegrationSecret("access-token", "connection-1:access")
  ) as { ciphertext: string };
  envelope.ciphertext = Buffer.from("tampered").toString("base64");

  assert.throws(
    () => decryptIntegrationSecret(JSON.stringify(envelope), "connection-1:access"),
    /could not be decrypted/i
  );
});
