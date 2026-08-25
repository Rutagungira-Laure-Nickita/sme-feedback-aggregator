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
const ownerPages = read("frontend/src/features/businesses/pages.tsx");
const roleFormatting = read("frontend/src/features/businesses/format.ts");
const visibleSources = read("frontend/src/features/businesses/supportedSources.ts");
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

test("normal navigation hides QR and Automations while routes remain recoverable", () => {
  assert.doesNotMatch(layouts, /path: "feedback\/qr-codes"|path: "automations"/);
  assert.match(router, /path: "business\/:businessId\/feedback\/qr-codes"/);
  assert.match(router, /path: "business\/:businessId\/automations"/);
});

test("visible source controls expose exactly the four product channels", () => {
  const optionBlock = visibleSources.slice(
    visibleSources.indexOf("OPERATIONAL_FEEDBACK_CHANNEL_OPTIONS"),
    visibleSources.indexOf("] as const")
  );
  for (const source of ["EMAIL", "WHATSAPP", "MANUAL", "PUBLIC_FORM"]) {
    assert.match(optionBlock, new RegExp(source));
  }
  assert.doesNotMatch(optionBlock, /QR_CODE/);
});

test("owner overview renders channel distribution with the shared donut treatment", () => {
  assert.match(ownerPages, /function DashboardDonutCard/);
  assert.match(ownerPages, /title="Sentiment mix"/);
  assert.match(ownerPages, /title="Channel distribution"/);
  assert.match(ownerPages, /innerRadius=\{54\}/);
  assert.match(ownerPages, /outerRadius=\{76\}/);
  assert.match(ownerPages, /No feedback was received in this period\./);
});

test("legacy internal admin roles are displayed as Business Owner", () => {
  assert.match(roleFormatting, /ADMIN: "Business Owner"/);
  assert.doesNotMatch(roleFormatting, /Business Admin/);
  assert.doesNotMatch(ownerPages, /label: "Business Admin"/);
});
