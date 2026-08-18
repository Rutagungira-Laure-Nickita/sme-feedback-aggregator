import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveTheme } from "../src/app/theme/theme-resolver.js";
import {
  buildBrandColorTokens,
  FIXED_ACCENT_COLOR,
  FIXED_PRIMARY_COLOR
} from "../src/features/platform-settings/color-tokens.js";

test("Light and Dark platform settings immediately resolve the application appearance", () => {
  assert.equal(resolveEffectiveTheme(null, "LIGHT", "dark"), "light");
  assert.equal(resolveEffectiveTheme(null, "DARK", "light"), "dark");
});

test("System appearance follows the operating-system preference", () => {
  assert.equal(resolveEffectiveTheme(null, "SYSTEM", "light"), "light");
  assert.equal(resolveEffectiveTheme(null, "SYSTEM", "dark"), "dark");
});

test("a visible session override is scoped to the platform appearance that created it", () => {
  assert.equal(resolveEffectiveTheme("dark", "LIGHT", "light"), "dark");
  assert.equal(resolveEffectiveTheme(null, "DARK", "light"), "dark");
});

test("brand token generation is fixed to Indigo regardless of deprecated stored colors", () => {
  assert.equal(FIXED_PRIMARY_COLOR, "#4F46E5");
  assert.equal(FIXED_ACCENT_COLOR, "#818CF8");
  const tokens = buildBrandColorTokens("#00FF00", "#FF0000", false);
  assert.equal(tokens.primary, "79 70 229");
  assert.equal(tokens.accent, "129 140 248");
});
