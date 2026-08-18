import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd, stdout } from "node:process";

const rootDir = cwd();

function readProjectFile(path) {
  return readFileSync(join(rootDir, path), "utf8").replace(/\r\n/g, "\n");
}

function test(name, run) {
  run();
  stdout.write(`ok - ${name}\n`);
}

test("Phase 20 integration workspace URLs are registered before the wildcard route", () => {
  const routerSource = readProjectFile("frontend/src/app/router/router.tsx");
  const redirectSource = readProjectFile(
    "frontend/src/app/router/IntegrationsCanonicalRedirect.tsx"
  );
  const expectedPaths = [
    "business/:businessId/integrations",
    "business/:businessId/integrations/:connectionId",
    "business/:businessId/integrations/:connectionId/history",
    "business/:businessId/integration-runs/:runId"
  ];

  for (const routePath of expectedPaths) {
    assert.ok(
      routerSource.includes(`path: "${routePath}"`),
      `Expected ${routePath} to be registered in the frontend router.`
    );
  }

  const canonicalRouteIndex = routerSource.indexOf(
    'path: "business/:businessId/integrations"'
  );
  const wildcardRouteIndex = routerSource.indexOf('path: "*"');

  assert.ok(canonicalRouteIndex >= 0, "Expected canonical integrations route.");
  assert.ok(wildcardRouteIndex >= 0, "Expected wildcard fallback route.");
  assert.ok(
    canonicalRouteIndex < wildcardRouteIndex,
    "Expected integrations route to be declared before the wildcard fallback."
  );
  assert.ok(
    routerSource.includes("IntegrationsCanonicalRedirect"),
    "Expected integration subroutes to redirect to the canonical page."
  );
  assert.ok(
    redirectSource.includes('to={`/business/${businessId ?? ""}/integrations`}'),
    "Expected integration subroutes to redirect to /business/:businessId/integrations."
  );
});

test("Phase 20 integrations page is exported, lazy-loaded, and linked from owner/admin navigation", () => {
  const routerSource = readProjectFile("frontend/src/app/router/router.tsx");
  const businessIndexSource = readProjectFile(
    "frontend/src/features/businesses/index.ts"
  );
  const shellSource = readProjectFile("frontend/src/features/businesses/components.tsx");

  assert.ok(
    routerSource.includes("default: module.IntegrationsPage"),
    "Expected the integrations route to lazy-load IntegrationsPage."
  );
  assert.ok(
    businessIndexSource.includes(
      'export { IntegrationsPage } from "./IntegrationsPage.js";'
    ),
    "Expected IntegrationsPage to be exported from the businesses barrel."
  );
  assert.ok(
    shellSource.includes(
      '{ label: "Integrations", path: "integrations", icon: PlugZap, ownerAdminOnly: true }'
    ),
    "Expected the sidebar to link owner/admin users to the canonical integrations route."
  );
});
