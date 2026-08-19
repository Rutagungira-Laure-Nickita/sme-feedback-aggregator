import assert from "node:assert/strict";
import test from "node:test";
import { FeedbackChannel, IntegrationMode, UserRole } from "../lib/prisma-runtime.js";
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
});

test("development feedback fixtures cover every supported channel", () => {
  const channels = new Set(
    DEVELOPMENT_SEED_FEEDBACK_FIXTURES.map((fixture) => fixture.channel)
  );
  assert.deepEqual([...channels].sort(), Object.values(FeedbackChannel).sort());
  assert.ok(
    DEVELOPMENT_SEED_FEEDBACK_FIXTURES.every(
      (fixture) =>
        fixture.id.startsWith("dev_seed_") &&
        fixture.ingestionId.startsWith("dev_seed_") &&
        (fixture.externalId.startsWith("dev-seed-") ||
          fixture.externalId.startsWith("demo-"))
    )
  );
});

test("seeded integration fixtures are Demo Mode records without live credentials", () => {
  assert.equal(DEVELOPMENT_SEED_INTEGRATION_FIXTURES.length, 6);
  assert.ok(
    DEVELOPMENT_SEED_INTEGRATION_FIXTURES.every(
      (fixture) =>
        fixture.id.startsWith("dev_seed_connection_") &&
        fixture.mode === IntegrationMode.DEMO
    )
  );

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
