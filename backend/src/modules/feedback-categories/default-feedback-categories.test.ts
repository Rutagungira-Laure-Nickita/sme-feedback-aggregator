import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_FEEDBACK_CATEGORIES,
  defaultFeedbackCategoryData
} from "./default-feedback-categories.js";
import {
  DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY,
  DEVELOPMENT_SEED_CATEGORY_IDS
} from "../../scripts/development-seed.js";

const expectedNames = [
  "Service Quality",
  "Product / Food Quality",
  "Staff Conduct",
  "Waiting Time",
  "Order Accuracy",
  "Billing & Payments",
  "Facilities & Cleanliness",
  "Digital Experience",
  "Complaint",
  "Praise / Compliment",
  "Suggestion / Improvement",
  "Product / Feature Request",
  "Other"
];

test("Phase 28 defines the exact active default category taxonomy", () => {
  assert.deepEqual(
    DEFAULT_FEEDBACK_CATEGORIES.map((category) => category.name),
    expectedNames
  );
  assert.equal(DEFAULT_FEEDBACK_CATEGORIES.length, 13);
  assert.equal(new Set(expectedNames).size, expectedNames.length);
  assert.equal(expectedNames.includes("Excellent"), false);
  assert.ok(
    DEFAULT_FEEDBACK_CATEGORIES.every((category) => category.description.length > 20)
  );
});

test("default category creation data is business-owned and active", () => {
  const first = defaultFeedbackCategoryData("business-a");
  const second = defaultFeedbackCategoryData("business-b");

  assert.ok(first.every((category) => category.businessId === "business-a"));
  assert.ok(second.every((category) => category.businessId === "business-b"));
  assert.ok(first.every((category) => category.isActive));
  assert.deepEqual(
    first.map((category) => category.name),
    second.map((category) => category.name)
  );
});

test("legacy deterministic category IDs are reconciled in place", () => {
  assert.equal(
    DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY["billing-payments"],
    DEVELOPMENT_SEED_CATEGORY_IDS.billing
  );
  assert.equal(
    DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY["praise-compliment"],
    DEVELOPMENT_SEED_CATEGORY_IDS.praise
  );
  assert.equal(
    DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY["product-feature-request"],
    DEVELOPMENT_SEED_CATEGORY_IDS.product
  );
  assert.equal(
    DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY.other,
    DEVELOPMENT_SEED_CATEGORY_IDS.legacy
  );
});
