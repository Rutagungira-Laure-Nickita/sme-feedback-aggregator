import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const management = read(
  "backend/src/modules/feedback-inbox/feedback-management.service.ts"
);
const managementSchema = read(
  "backend/src/modules/feedback-inbox/feedback-management.schemas.ts"
);
const inbox = read("backend/src/modules/feedback-inbox/feedback-inbox.service.ts");
const customers = read("backend/src/modules/customers/customer.service.ts");
const customerDashboard = read(
  "backend/src/modules/customer-dashboard/customer-dashboard.service.ts"
);
const routes = read("backend/src/modules/feedback-inbox/feedback-inbox.routes.ts");
const migration = read(
  "backend/prisma/migrations/20260821120000_final_product_hardening/migration.sql"
);

test("feedback management exposes one edit and three transactional bulk operations", () => {
  assert.match(routes, /patch\("\/:feedbackId", editFeedbackController\)/);
  assert.match(routes, /post\("\/bulk\/status", bulkStatusController\)/);
  assert.match(routes, /post\("\/bulk\/category", bulkCategoryController\)/);
  assert.match(routes, /post\("\/bulk\/delete", bulkDeleteController\)/);
});

test("destructive and edit operations require owner or admin membership", () => {
  assert.match(management, /BusinessMemberRole\.OWNER/);
  assert.match(management, /BusinessMemberRole\.ADMIN/);
  assert.match(management, /FEEDBACK_MANAGEMENT_FORBIDDEN/);
});

test("all feedback mutations are business scoped and exclude already deleted rows", () => {
  assert.match(management, /businessId: context\.businessId/);
  assert.match(management, /businessId, deletedAt: null/);
  assert.match(management, /id: \{ in: ids \},\s*businessId,\s*deletedAt: null/s);
});

test("soft deletion preserves feedback and records actor plus activity", () => {
  assert.match(management, /deletedAt, deletedByMembershipId: context\.membership\.id/);
  assert.match(management, /FeedbackActivityType\.FEEDBACK_DELETED/);
  assert.doesNotMatch(management, /feedback\.deleteMany/);
  assert.match(migration, /ADD COLUMN `deleted_at`/);
});

test("delete-all requires the exact destructive confirmation", () => {
  assert.match(management, /input\.confirmation !== "DELETE"/);
  assert.match(managementSchema, /confirmation: z\.literal\("DELETE"\)/);
});

test("editable contract cannot overwrite immutable integration and deduplication metadata", () => {
  const editContract = managementSchema.slice(
    managementSchema.indexOf("export const feedbackEditSchema"),
    managementSchema.indexOf("const bulkFilterSchema")
  );
  for (const forbidden of [
    "channel",
    "externalId",
    "sourceMetadata",
    "ingestionId",
    "occurredAt",
    "receivedAt"
  ]) {
    assert.doesNotMatch(editContract, new RegExp(`${forbidden}:`));
  }
  assert.match(management, /const editable = \[/);
  assert.match(management, /data\.customerId = null/);
  assert.match(management, /tryAutoLinkCustomerForFeedback\(feedbackId\)/);
});

test("bulk status keeps the established transition policy", () => {
  assert.match(management, /isValidTransition\(item\.status, input\.status\)/);
  assert.match(management, /FEEDBACK_STATUS_TRANSITION_INVALID/);
});

test("bulk categorization accepts only active categories from the authorized business", () => {
  assert.match(management, /id: categoryId, businessId, isActive: true/);
  assert.match(management, /FEEDBACK_CATEGORY_INVALID/);
});

test("forged staff branch filters are rejected instead of broadened", () => {
  assert.match(inbox, /BRANCH_ACCESS_DENIED/);
  assert.doesNotMatch(inbox, /delete normalized\.branchId/);
  assert.match(customers, /BRANCH_ACCESS_DENIED/);
  assert.doesNotMatch(customers, /delete normalized\.branchId/);
});

test("staff dashboard queries use authenticated membership branch scope", () => {
  assert.match(inbox, /getFeedbackAccessibleBranchIds\(context\.membership\)/);
  assert.match(inbox, /branchId: \{ in: branchIds \}/);
  assert.match(inbox, /deletedAt: null/);
});

test("customer data is email-owned, customer-role-only, and hides deleted feedback", () => {
  assert.match(customerDashboard, /actor\.role !== UserRole\.CUSTOMER/);
  assert.match(customerDashboard, /customerEmail: email/);
  assert.match(customerDashboard, /normalizedEmail/);
  assert.match(customerDashboard, /deletedAt: null/);
  assert.doesNotMatch(
    customerDashboard,
    /aiAnalysis|assignedTo|sourceMetadata|FeedbackActivity/
  );
});
