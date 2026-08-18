import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("business lifecycle defaults to pending and exposes explicit governed states", () => {
  const schema = read("../../backend/prisma/schema.prisma");
  assert.match(
    schema,
    /enum BusinessStatus\s*{[\s\S]*PENDING[\s\S]*REJECTED[\s\S]*ARCHIVED/
  );
  assert.match(schema, /status\s+BusinessStatus\s+@default\(PENDING\)/);
  assert.match(schema, /model PlatformAdminActivity/);
});

test("tenant operations require an active business while basic context remains readable", () => {
  const service = read("../../backend/src/modules/businesses/business.service.ts");
  assert.match(service, /allowInactive: true/);
  assert.match(service, /membership\.business\.status !== BusinessStatus\.ACTIVE/);
  assert.match(service, /ALLOWED_ADMIN_BUSINESS_TRANSITIONS/);
});

test("admin governance routes include detail and controlled mutations", () => {
  const adminRoutes = read(
    "../../backend/src/modules/platform-admin/platform-admin.routes.ts"
  );
  const businessRoutes = read("../../backend/src/modules/businesses/business.routes.ts");
  for (const route of [
    "/users/:entityId",
    "/users/:entityId/action",
    "/feedback/:entityId",
    "/integrations/:entityId",
    "/integrations/:entityId/action"
  ])
    assert.ok(adminRoutes.includes(route), `missing ${route}`);
  assert.ok(businessRoutes.includes('post("/", createAdminBusinessController)'));
  assert.ok(businessRoutes.includes('post("/:businessId/status"'));
});

test("session-aware public routing and Indigo token defaults are wired globally", () => {
  const router = read("../src/app/router/router.tsx");
  const root = read("../src/app/router/RootRedirect.tsx");
  const publicLayout = read("../src/features/public/components/PublicLayout.tsx");
  const styles = read("../src/styles.css");
  assert.match(router, /index: true,[\s\S]*<RootRedirect/);
  assert.match(root, /return <HomePage \/>/);
  assert.match(publicLayout, /Open dashboard/);
  assert.match(styles, /--color-primary: 79 70 229/);
});
