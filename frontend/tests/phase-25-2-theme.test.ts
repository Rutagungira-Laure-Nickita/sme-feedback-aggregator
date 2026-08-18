import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveTheme } from "../src/app/theme/theme-resolver.js";

test("personal explicit appearance wins over platform and operating system", () => {
  assert.equal(resolveEffectiveTheme("light", "DARK", "dark"), "light");
  assert.equal(resolveEffectiveTheme("dark", "LIGHT", "light"), "dark");
});

test("platform appearance wins when the user has no explicit preference", () => {
  assert.equal(resolveEffectiveTheme(null, "LIGHT", "dark"), "light");
  assert.equal(resolveEffectiveTheme(null, "DARK", "light"), "dark");
});

test("system preference is used only when both higher-precedence choices defer", () => {
  assert.equal(resolveEffectiveTheme(null, "SYSTEM", "dark"), "dark");
  assert.equal(resolveEffectiveTheme(null, "SYSTEM", "light"), "light");
});
