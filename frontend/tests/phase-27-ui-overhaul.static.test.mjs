import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const router = read("src/app/router/router.tsx");
const rootRedirect = read("src/app/router/RootRedirect.tsx");
const publicLayout = read("src/features/public/components/PublicLayout.tsx");
const ownerAllowlist = read("src/features/businesses/businessOwnerIntegrations.ts");
const integrations = read("src/features/businesses/IntegrationsPage.tsx");
const ownerPages = read("src/features/businesses/pages.tsx");
const feedback = read("src/features/businesses/FeedbackInboxPage.tsx");
const customers = read("src/features/businesses/CustomersPage.tsx");
const customerDetail = read("src/features/businesses/CustomerDetailPage.tsx");
const qr = read("src/features/businesses/QrCodesPage.tsx");
const automations = read("src/features/businesses/AutomationsPage.tsx");
const admin = read("src/features/admin/AdminOversightPages.tsx");
const home = read("src/features/public/pages/HomePage.tsx");
const features = read("src/features/public/pages/FeaturesPage.tsx");
const howItWorks = read("src/features/public/pages/HowItWorksPage.tsx");
const about = read("src/features/public/pages/AboutPage.tsx");
const integrationRegistry = read(
  "../backend/src/modules/integrations/integration-registry.ts"
);

test("Business Owner integration exposure is centralized and Live-only", () => {
  assert.match(ownerAllowlist, /WHATSAPP/);
  assert.match(ownerAllowlist, /provider: "EMAIL", liveProviderType: "GMAIL"/);
  assert.match(ownerAllowlist, /connection\.mode !== "LIVE"/);
  assert.match(integrations, /isBusinessOwnerVisibleConnection/);
  assert.match(integrations, /isBusinessOwnerVisibleCapability/);
  assert.doesNotMatch(integrations, /<IntegrationModeBanner/);
  assert.doesNotMatch(integrations, /<IntegrationSummaryPanel/);
  assert.doesNotMatch(
    integrations,
    /Demo Mode|Connect Demo|Demo connection|Demo scenario/
  );
  assert.match(integrations, /Live customer channels/);
  assert.match(integrationRegistry, /DemoConnector/);
  assert.match(integrationRegistry, /EmailLiveConnector/);
  assert.match(integrationRegistry, /MetaSocialLiveConnector/);
});

test("owner overview uses real report data and the workspace has clearer configuration", () => {
  assert.match(ownerPages, /previewBusinessReport/);
  assert.match(ownerPages, /Feedback trend/);
  assert.match(ownerPages, /Sentiment/);
  assert.match(ownerPages, /Channel distribution/);
  for (const tab of [
    "Business profile",
    "Public Feedback",
    "AI analysis",
    "Feedback Categories"
  ]) {
    assert.match(ownerPages, new RegExp(tab));
  }
  assert.match(ownerPages, /Back to Branches/);
  assert.match(ownerPages, /Back to Staff/);
});

test("feedback, customer, QR and automation surfaces use the Phase 27 hierarchy", () => {
  for (const heading of [
    "Customer",
    "Feedback",
    "Category",
    "Channel",
    "Status",
    "Action"
  ]) {
    assert.match(feedback, new RegExp(`>\\s*${heading}\\s*<`));
  }
  assert.match(feedback, /max-w-5xl/);
  assert.match(feedback, /<Eye/);
  assert.match(customers, />Feedback</);
  assert.match(customers, />Avg rating</);
  assert.doesNotMatch(customers, />Contact</);
  assert.match(customerDetail, /Back to Customers/);
  assert.match(qr, /title="QR Codes"/);
  assert.match(qr, /MoreHorizontal/);
  assert.match(qr, /Enable|Disable/);
  for (const step of ["When", "If", "Then"]) {
    assert.match(automations, new RegExp(`· ${step}`));
  }
  assert.match(automations, /Execution history/);
});

test("public and auth routing has one shared shell and no Pricing route", () => {
  assert.doesNotMatch(router, /PricingPage|path: "pricing"/);
  assert.doesNotMatch(publicLayout, /\/pricing|Pricing/);
  assert.match(router, /<PublicLayout>[\s\S]*?<LoginPage/);
  assert.match(router, /<PublicLayout>[\s\S]*?<RegisterPage/);
  assert.match(rootRedirect, /return <HomePage \/>/);
});

test("public pages tell the current product story without fabricated proof", () => {
  for (const source of [home, features, howItWorks, about]) {
    assert.doesNotMatch(
      source,
      /DemoDashboard|Future phase|Phase 3|Illustrative product team/
    );
  }
  assert.match(home, /ProductWorkspacePreview/);
  assert.match(features, /Unified feedback inbox/);
  assert.match(howItWorks, /Measure and improve/);
  assert.match(about, /Customer intelligence works best/);
});

test("Platform Administrator oversight cards use premium responsive hierarchy", () => {
  assert.match(admin, /rounded-2xl/);
  assert.match(admin, /before:bg-gradient-to-r before:from-indigo-600/);
  assert.match(admin, /Manage/);
  assert.match(admin, /fetchAdminIntegrations/);
  assert.match(admin, /applyAdminIntegrationAction/);
});
