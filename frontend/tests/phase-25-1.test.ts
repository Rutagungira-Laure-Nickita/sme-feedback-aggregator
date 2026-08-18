import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultCollectionView,
  isCollectionView
} from "../src/components/collection-view/collection-view.js";
import {
  buildBrandColorTokens,
  parseHexColor
} from "../src/features/platform-settings/color-tokens.js";

test("collection default policy follows item count and large-screen rules exactly", () => {
  assert.equal(getDefaultCollectionView(false, 0), "grid");
  assert.equal(getDefaultCollectionView(false, 1), "grid");
  assert.equal(getDefaultCollectionView(false, 20), "grid");
  assert.equal(getDefaultCollectionView(true, 0), "grid");
  assert.equal(getDefaultCollectionView(true, 1), "list");
  assert.equal(getDefaultCollectionView(true, 2), "grid");
  assert.equal(isCollectionView("list"), true);
  assert.equal(isCollectionView("grid"), true);
  assert.equal(isCollectionView("table"), false);
});

test("legacy color parsing remains safe while shared tokens stay fixed to Indigo", () => {
  assert.deepEqual(parseHexColor("#2563EB"), { r: 37, g: 99, b: 235 });
  assert.equal(parseHexColor("blue"), null);
  const first = buildBrandColorTokens("#111827", "#0F766E", false);
  const second = buildBrandColorTokens("#FDE047", "#22C55E", false);
  assert.equal(first.primary, "79 70 229");
  assert.equal(first.primaryForeground, "255 255 255");
  assert.equal(first.accent, "129 140 248");
  assert.equal(second.primary, first.primary);
  assert.equal(second.accent, first.accent);
});
