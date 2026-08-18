import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const [oversight, settingsPage, settingsProvider, collectionHook, styles] =
  await Promise.all([
    readFile(
      new URL("../src/features/admin/AdminOversightPages.tsx", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../src/features/admin/AdminSettingsPage.tsx", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL(
        "../src/features/platform-settings/PlatformSettingsProvider.tsx",
        import.meta.url
      ),
      "utf8"
    ),
    readFile(
      new URL("../src/components/collection-view/useCollectionView.ts", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8")
  ]);

test("priority admin collections expose collapsible filters and list/grid controls", () => {
  assert.match(oversight, /function FilterPanel/);
  assert.match(oversight, /admin-feedback/);
  assert.match(oversight, /admin-integrations/);
  assert.match(oversight, /CollectionViewToggle/);
  assert.match(oversight, /Pager pagination/);
});

test("collection preferences use per-page local storage without network calls", () => {
  assert.match(collectionHook, /localStorage\.getItem/);
  assert.match(collectionHook, /localStorage\.setItem/);
  assert.doesNotMatch(collectionHook, /fetch\(|apiClient|axios/);
});

test("settings update global branding while fixed tokens retain a narrow viewport floor", () => {
  assert.match(settingsPage, /updatePlatformSettings/);
  assert.doesNotMatch(settingsProvider, /--color-primary/);
  assert.match(settingsProvider, /document\.title/);
  assert.match(styles, /--color-primary:\s*79 70 229/);
  assert.match(styles, /body\s*\{[\s\S]*min-width:\s*0/);
  assert.doesNotMatch(styles, /min-width:\s*320px/);
});
