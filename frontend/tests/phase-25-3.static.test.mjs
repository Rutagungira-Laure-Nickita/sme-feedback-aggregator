import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const themeProvider = read("../src/app/theme/ThemeProvider.tsx");
const settingsProvider = read(
  "../src/features/platform-settings/PlatformSettingsProvider.tsx"
);
const settingsPage = read("../src/features/admin/AdminSettingsPage.tsx");
const oversight = read("../src/features/admin/AdminOversightPages.tsx");
const detailModal = read("../src/features/admin/AdminDetailModal.tsx");
const reports = read("../src/features/admin/AdminReportsPage.tsx");
const businessPages = read("../src/features/businesses/pages.tsx");
const businessComponents = read("../src/features/businesses/components.tsx");
const router = read("../src/app/router/router.tsx");
const styles = read("../src/styles.css");
const backendAdminRoutes = read(
  "../../backend/src/modules/platform-admin/platform-admin.routes.ts"
);
const backendAdminService = read(
  "../../backend/src/modules/platform-admin/platform-admin.service.ts"
);

function collectSource(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = `${directory}/${entry.name}`;
      return entry.isDirectory() ? collectSource(path) : [readFileSync(path, "utf8")];
    })
    .join("\n");
}

test("the authoritative appearance pipeline updates immediately and persists its platform cache", () => {
  assert.match(settingsPage, /applySettings\(saved\)/);
  assert.match(themeProvider, /settings\.defaultAppearance/);
  assert.match(themeProvider, /platformAppearanceStorageKey/);
  assert.match(themeProvider, /setSessionOverride\(null\)/);
  assert.match(themeProvider, /revision/);
  assert.match(settingsProvider, /setRevision\(\(current\) => current \+ 1\)/);
  assert.match(themeProvider, /removeItem\(legacyThemeStorageKey\)/);
  assert.match(themeProvider, /classList\.toggle\("dark"/);
  assert.doesNotMatch(themeProvider, /getItem\(legacyThemeStorageKey\)/);
  assert.doesNotMatch(settingsProvider, /MutationObserver|--color-primary/);
});

test("public, admin, business, and auth routes share the same root provider pipeline", () => {
  const providers = read("../src/app/providers/AppProviders.tsx");
  assert.match(providers, /<PlatformSettingsProvider>[\s\S]*<ThemeProvider>/);
  assert.match(router, /AdminDashboardPage/);
  assert.match(router, /BusinessIndexPage/);
  assert.match(router, /LoginPage/);
  assert.match(router, /RootRedirect/);
});

test("the fixed Indigo system replaces rejected pink branding without arbitrary color controls", () => {
  const sourceRoot = fileURLToPath(new URL("../src", import.meta.url)).replaceAll(
    "\\",
    "/"
  );
  const frontendSource = collectSource(sourceRoot);
  assert.match(styles, /--color-primary:\s*79 70 229/);
  assert.match(styles, /--color-primary-hover:\s*67 56 202/);
  assert.doesNotMatch(frontendSource, /pink-|rose-|fuchsia-|#DB2777|#F472B6/i);
  assert.doesNotMatch(settingsPage, /type="color"|Primary color|Accent color|ColorField/);
});

test("settings are organized into real consumed categories only", () => {
  for (const label of ["General", "Branding", "Public website", "Appearance", "Reports"])
    assert.ok(settingsPage.includes(label), `missing ${label}`);
  assert.match(settingsPage, /Default report range/);
  assert.match(settingsPage, /Hero headline/);
  assert.doesNotMatch(settingsPage, /Users & Authentication|Data & Privacy/);
});

test("user, feedback, and integration details use the reusable modal rather than card expansion", () => {
  assert.match(detailModal, /function AdminDetailModal/);
  assert.match(detailModal, /function ConfirmActionModal/);
  assert.match(detailModal, /DetailTechnicalSection/);
  assert.equal((oversight.match(/<AdminDetailModal/g) ?? []).length, 3);
  assert.doesNotMatch(oversight, /setExpanded|Close details/);
  assert.match(oversight, /Platform-wide access/);
  assert.match(oversight, /FeedbackModalContent/);
  assert.match(oversight, /IntegrationModalContent/);
});

test("modal architecture supports mobile sizing, internal scrolling, and accessible focus behavior", () => {
  const radixDialog = read("../src/components/ui/dialog.tsx");
  assert.match(detailModal, /100dvh-0\.5rem/);
  assert.match(detailModal, /overflow-y-auto/);
  assert.match(detailModal, /sm:max-h-\[88dvh\]/);
  assert.match(radixDialog, /@radix-ui\/react-dialog/);
  assert.match(radixDialog, /DialogPrimitive\.Title/);
  assert.match(radixDialog, /DialogPrimitive\.Description/);
});

test("integration errors are human readable and raw codes stay in technical details", () => {
  assert.match(oversight, /DEMO_CONNECTION_TEST_FAILED: "Connection test failed"/);
  assert.match(oversight, /<DetailTechnicalSection>[\s\S]*label="Error code"/);
  assert.doesNotMatch(
    oversight,
    /className="mt-2 break-all[^\n]*"[\s\S]{0,80}\{item\.lastErrorCode\}/
  );
});

test("Business Details uses a compact profile, KPI row, action menu, and confirmations", () => {
  assert.match(businessPages, /More actions/);
  assert.match(businessPages, /CompactBusinessMetric/);
  assert.match(businessPages, /businessStatusActions/);
  assert.match(businessPages, /ConfirmActionModal/);
  assert.match(businessPages, /View all feedback/);
  assert.match(businessPages, /businessId=\$\{business\.id\}/);
  assert.doesNotMatch(businessPages, /window\.confirm\("Reject this business/);
});

test("Reporting Center uses compact contextual filters and a compact pre-preview summary", () => {
  for (const label of [
    "All Businesses",
    "All Branches",
    "All Channels",
    "All Statuses",
    "All Sentiments"
  ])
    assert.ok(reports.includes(label), `missing ${label}`);
  assert.match(reports, /xl:grid-cols-4/);
  assert.match(reports, /Preview Report/);
  assert.match(reports, /previewAdminReport/);
  assert.match(reports, /exportAdminReport/);
  assert.doesNotMatch(reports, /All \/ not restricted|min-h-\[520px\]/);
});

test("Platform Health is the canonical label while the legacy route redirects safely", () => {
  assert.match(businessComponents, /Platform Health/);
  assert.match(router, /admin\/platform-health/);
  assert.match(
    router,
    /admin\/system-health[\s\S]*Navigate to="\/admin\/platform-health"/
  );
});

test("admin detail APIs remain protected and select safe response fields", () => {
  assert.match(backendAdminRoutes, /requirePlatformAdmin/);
  assert.doesNotMatch(backendAdminService, /passwordHash: true|refreshTokenHash: true/);
  assert.match(backendAdminService, /attachments:\s*{\s*select:/);
  assert.match(backendAdminService, /aiAnalysis:\s*{\s*select:/);
});

test("Phase 25.2 lifecycle and Phase 25.1 collection persistence remain wired", () => {
  const businessService = read(
    "../../backend/src/modules/businesses/business.service.ts"
  );
  const collection = read("../src/components/collection-view/useCollectionView.ts");
  const root = read("../src/app/router/RootRedirect.tsx");
  assert.match(businessService, /ALLOWED_ADMIN_BUSINESS_TRANSITIONS/);
  assert.match(businessService, /BusinessStatus\.PENDING/);
  assert.match(collection, /localStorage\.setItem/);
  assert.match(root, /<HomePage \/>/);
});
