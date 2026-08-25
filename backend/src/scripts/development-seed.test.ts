import assert from "node:assert/strict";
import test from "node:test";
import { FeedbackChannel, UserRole } from "../lib/prisma-runtime.js";
import {
  DEFAULT_DEVELOPMENT_SEED_PASSWORD,
  DEVELOPMENT_SEED_FEEDBACK_FIXTURES,
  DEVELOPMENT_SEED_INTEGRATION_FIXTURES,
  DEVELOPMENT_SEED_LOGIN_ACCOUNTS
} from "./development-seed.js";

test("development seed login accounts are stable, unique, and cover required roles", () => {
  assert.ok(DEFAULT_DEVELOPMENT_SEED_PASSWORD.length >= 10);
  assert.equal(
    new Set(DEVELOPMENT_SEED_LOGIN_ACCOUNTS.map((account) => account.id)).size,
    DEVELOPMENT_SEED_LOGIN_ACCOUNTS.length
  );
  assert.equal(
    new Set(DEVELOPMENT_SEED_LOGIN_ACCOUNTS.map((account) => account.email)).size,
    DEVELOPMENT_SEED_LOGIN_ACCOUNTS.length
  );
  assert.ok(
    DEVELOPMENT_SEED_LOGIN_ACCOUNTS.every(
      (account) => account.id.startsWith("dev_seed_") && account.email.endsWith(".test")
    )
  );
  assert.ok(
    DEVELOPMENT_SEED_LOGIN_ACCOUNTS.some(
      (account) => account.role === UserRole.BUSINESS_OWNER
    )
  );
  assert.ok(
    DEVELOPMENT_SEED_LOGIN_ACCOUNTS.some((account) => account.role === UserRole.STAFF)
  );
  assert.ok(
    DEVELOPMENT_SEED_LOGIN_ACCOUNTS.some((account) => account.role === UserRole.CUSTOMER)
  );
  assert.equal(
    DEVELOPMENT_SEED_LOGIN_ACCOUNTS.some(
      (account) =>
        account.id === "dev_seed_user_admin" || account.email === "admin@demo.sme.test"
    ),
    false
  );
});

test("development feedback fixtures retain deterministic historical native intake", () => {
  const channels = new Set(
    DEVELOPMENT_SEED_FEEDBACK_FIXTURES.map((fixture) => fixture.channel)
  );
  assert.deepEqual(
    [...channels].sort(),
    [FeedbackChannel.MANUAL, FeedbackChannel.PUBLIC_FORM, FeedbackChannel.QR_CODE].sort()
  );
  assert.ok(
    DEVELOPMENT_SEED_FEEDBACK_FIXTURES.every(
      (fixture) =>
        fixture.id.startsWith("dev_seed_") &&
        fixture.ingestionId.startsWith("dev_seed_") &&
        (fixture.externalId.startsWith("dev-seed-") ||
          fixture.externalId.startsWith("development-seed:"))
    )
  );
});

test("development seed creates no integration fixtures", () => {
  assert.equal(DEVELOPMENT_SEED_INTEGRATION_FIXTURES.length, 0);
  const serialized = JSON.stringify(DEVELOPMENT_SEED_INTEGRATION_FIXTURES).toLowerCase();
  for (const forbidden of [
    "accesstoken",
    "refreshtoken",
    "clientsecret",
    "appsecret",
    "encryptionkey",
    "oauthstate"
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
