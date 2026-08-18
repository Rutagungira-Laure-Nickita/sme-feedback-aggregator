import {
  normalizeEmailForLookup,
  normalizePhoneForMatching
} from "../modules/customers/customer-normalization.js";

export type NormalizedSearch = {
  text: string;
  email: string | null;
  phone: string | null;
};

export function normalizeSearchInput(
  value: unknown,
  maxLength = 160
): NormalizedSearch | null {
  if (typeof value !== "string") {
    return null;
  }

  const withoutNullBytes = value.replace(/\0/g, "");
  const text = withoutNullBytes.trim().replace(/\s+/g, " ").slice(0, maxLength);

  if (!text) {
    return null;
  }

  return {
    text,
    email: normalizeEmailForLookup(text),
    phone: normalizePhoneForMatching(text)
  };
}

export function normalizeOptionalSearch(
  value: unknown,
  maxLength = 160
): string | undefined {
  return normalizeSearchInput(value, maxLength)?.text;
}
