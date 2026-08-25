import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const inbox = read("frontend/src/features/businesses/FeedbackInboxPage.tsx");
const customer = read("frontend/src/features/customer/CustomerDashboardPage.tsx");
const customerShell = read("frontend/src/features/customer/CustomerShell.tsx");
const integrations = read("frontend/src/features/businesses/IntegrationsPage.tsx");
const layouts = read("frontend/src/features/businesses/components.tsx");
const router = read("frontend/src/app/router/router.tsx");
const accountCompatibility = read(
  "frontend/src/features/auth/components/AccountCompatibilityRoute.tsx"
);

test("feedback list and grid both expose selection and professional actions", () => {
  assert.match(inbox, /function DesktopTable/);
  assert.match(inbox, /function MobileCards/);
  assert.match(inbox, /FeedbackActionsMenu/);
  assert.match(inbox, /Select visible/);
  assert.match(inbox, /Select all \{pagination\.totalItems\} feedback/);
});

test("bulk management and typed delete-all use dialogs, not browser prompts", () => {
  assert.match(inbox, /FeedbackManagementDialog/);
  assert.match(inbox, /Type DELETE to confirm/);
  assert.doesNotMatch(
    inbox,
    /window\.(alert|confirm|prompt)|\balert\(|\bconfirm\(|\bprompt\(/
  );
});

test("customer dashboard has real navigation, list-grid persistence, and safe detail dialog", () => {
  assert.match(customerShell, /Dashboard/);
  assert.match(customerShell, /My Feedback/);
  assert.match(customerShell, /Submit Feedback/);
  assert.match(customerShell, /Profile/);
  assert.match(customer, /useCollectionView\("customer-feedback"/);
  assert.match(customer, /CustomerFeedbackDialog/);
  assert.match(customer, /Customer feedback pagination/);
  assert.match(customer, /We could not load this information/);
});

test("account compatibility redirects customers to the new dashboard", () => {
  assert.match(
    accountCompatibility,
    /role === "CUSTOMER" \? <Navigate to="\/customer" replace \/>/
  );
  assert.match(router, /path: "customer\/feedback"/);
});

test("WhatsApp refreshes activity without introducing a fake sync", () => {
  assert.match(integrations, /label: "Sync Now"/);
  assert.match(integrations, /action: "refresh"/);
  assert.match(integrations, /business-\$\{businessId \?\? "unknown"\}-integrations/);
  assert.match(integrations, /function ProviderConnectionTable/);
  assert.match(integrations, /aria-pressed=\{view === "list"\}/);
  assert.match(integrations, /gmailFeedbackLabel/);
  assert.match(integrations, /Customer Feedback/);
  assert.match(integrations, /action: "refresh"/);
  assert.match(integrations, /Connection and webhook activity refreshed/);
});

test("all-matching feedback selection tracks explicit exclusions", () => {
  assert.match(inbox, /excludedFeedbackIds: \[\.\.\.excludedIds\]/);
  assert.match(inbox, /allMatchingSelected \? !excludedIds\.has\(id\)/);
  assert.match(inbox, /pagination\.totalItems - excludedIds\.size/);
  assert.match(inbox, /formatBusinessRole\(assignee\.role\)/);
});

test("desktop and mobile navigation use independent bounded scrolling", () => {
  assert.match(layouts, /h-\[calc\(100dvh-3\.5rem\)\]/);
  assert.match(layouts, /overflow-y-auto overflow-x-hidden/);
  assert.match(customerShell, /h-\[100dvh\]/);
  assert.match(customerShell, /overflow-y-auto overflow-x-hidden/);
});
