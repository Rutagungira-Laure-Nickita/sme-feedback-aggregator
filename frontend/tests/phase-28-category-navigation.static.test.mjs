import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const feedback = read("src/features/businesses/FeedbackInboxPage.tsx");
const shells = read("src/features/businesses/components.tsx");
const accountShell = read("src/features/auth/components/AccountShell.tsx");
const publicLayout = read("src/features/public/components/PublicLayout.tsx");

test("feedback list and grid expose category without restoring table clutter", () => {
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
  assert.doesNotMatch(feedback, />\s*Date\s*</);
  assert.match(feedback, /<CategoryBadge category=\{item\.category\}/);
  assert.match(feedback, /Uncategorized/);
  assert.match(feedback, /value: "__uncategorized__", label: "Uncategorized"/);
  assert.match(feedback, /newParams\.delete\("categoryId"\)/);
  assert.match(feedback, /newParams\.delete\("categoryState"\)/);
});

test("authenticated drawers use viewport-safe scrolling and dismissal behavior", () => {
  for (const source of [shells, accountShell]) {
    assert.match(source, /h-\[100dvh\]/);
    assert.match(source, /overflow-y-auto overscroll-contain/);
    assert.match(source, /event\.key === "Escape"/);
    assert.match(source, /document\.body\.style\.overflow = "hidden"/);
    assert.match(source, /event\.target === event\.currentTarget/);
  }
  assert.match(shells, /\[location\.pathname\]/);
  assert.match(accountShell, /\[location\.pathname\]/);
});

test("public navigation has the required shared order and robust mobile menu", () => {
  const order = ["Home", "About", "How It Works", "Features", "Contact"];
  let previous = -1;
  for (const label of order) {
    const index = publicLayout.indexOf(`label: "${label}"`);
    assert.ok(index > previous, `${label} must follow the required navigation order`);
    previous = index;
  }
  assert.doesNotMatch(publicLayout, /Pricing|\/pricing/);
  assert.match(publicLayout, /bottom-0 top-\[4\.75rem\]/);
  assert.match(publicLayout, /overflow-y-auto overscroll-contain/);
});
