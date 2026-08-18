import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const [router, redirects, components, adminApi, platformSettingsApi] = await Promise.all([
  readFile(new URL("./router.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../features/auth/authRedirects.ts", import.meta.url), "utf8"),
  readFile(new URL("../../features/businesses/components.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../features/admin/api.ts", import.meta.url), "utf8"),
  readFile(new URL("../../features/platform-settings/api.ts", import.meta.url), "utf8")
]);

test("all functional platform-admin routes are guarded", () => {
  for (const path of [
    "admin",
    "admin/businesses",
    "admin/users",
    "admin/feedback",
    "admin/integrations",
    "admin/reports",
    "admin/platform-health",
    "admin/system-health",
    "admin/settings"
  ]) {
    const start = router.indexOf(`path: "${path}"`);
    assert.ok(start >= 0, `${path} route should exist`);
    const routeBlock = router.slice(start, start + 500);
    assert.match(routeBlock, /RoleGuard allowedRoles=\{\["PLATFORM_ADMIN"\]\}/);
  }
});

test("platform administrators land on the dashboard and existing businesses routes remain", () => {
  assert.match(redirects, /case "PLATFORM_ADMIN":\s*return "\/admin"/);
  assert.match(router, /path: "admin\/businesses\/:businessId"/);
  assert.match(router, /AdminBusinessDetailsPage/);
});

test("admin navigation contains no dead requested destinations", () => {
  for (const path of [
    "/admin",
    "/admin/businesses",
    "/admin/users",
    "/admin/feedback",
    "/admin/integrations",
    "/admin/reports",
    "/admin/platform-health",
    "/admin/settings"
  ]) {
    assert.ok(
      components.includes(`to: "${path}"`),
      `${path} should be in admin navigation`
    );
  }
  assert.doesNotMatch(components, /\/admin\/activity/);
});

test("admin frontend calls only protected admin API paths", () => {
  for (const endpoint of [
    "/admin/dashboard",
    "/admin/filter-options",
    "/admin/users",
    "/admin/feedback",
    "/admin/integrations",
    "/admin/system-health",
    "/admin/reports/preview",
    "/admin/reports/export"
  ]) {
    assert.ok(adminApi.includes(endpoint), `${endpoint} should be used`);
  }
  assert.ok(platformSettingsApi.includes("/admin/settings"));
  assert.ok(platformSettingsApi.includes("/platform-settings"));
});
