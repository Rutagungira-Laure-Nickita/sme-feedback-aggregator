import assert from "node:assert/strict";
import test from "node:test";

import {
  AccountStatus,
  FeedbackChannel,
  IntegrationMode,
  Prisma,
  PrismaClient,
  UserRole
} from "./prisma-runtime.js";

test("Prisma runtime values are available through the ESM adapter", () => {
  assert.equal(AccountStatus.ACTIVE, "ACTIVE");
  assert.equal(UserRole.BUSINESS_OWNER, "BUSINESS_OWNER");
  assert.equal(FeedbackChannel.WHATSAPP, "WHATSAPP");
  assert.equal(IntegrationMode.LIVE, "LIVE");
  assert.equal(typeof PrismaClient, "function");
  assert.equal(typeof Prisma.sql, "function");
  assert.ok(Prisma.DbNull);
});
