import { AppError } from "../../lib/app-error.js";

export type NormalizedCustomerIdentity = {
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  normalizedPhone: string | null;
};

export type CustomerIdentityInput = {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function normalizeCustomerIdentity(
  input: CustomerIdentityInput
): NormalizedCustomerIdentity {
  const firstName = normalizeNamePart(input.firstName);
  const lastName = normalizeNamePart(input.lastName);
  const explicitDisplayName = normalizeDisplayName(input.displayName);
  const derivedDisplayName = normalizeDisplayName(
    [firstName, lastName].filter(Boolean).join(" ")
  );
  const email = normalizeEmailForDisplay(input.email);
  const phone = normalizePhoneForDisplay(input.phone);
  const normalizedPhone = phone ? normalizePhoneStrict(phone) : null;
  const displayName =
    explicitDisplayName ?? derivedDisplayName ?? email ?? phone ?? "Unnamed customer";

  if (!explicitDisplayName && !derivedDisplayName && !email && !phone) {
    throw new AppError(
      "Add a name, email, or phone number for this customer.",
      "CUSTOMER_CONTACT_INVALID",
      400
    );
  }

  return {
    displayName,
    firstName,
    lastName,
    email,
    normalizedEmail: email ? normalizeEmailForLookup(email) : null,
    phone,
    normalizedPhone
  };
}

export function normalizeEmailForLookup(value?: string | null): string | null {
  const normalized = normalizeSingleLine(value)?.toLowerCase() ?? null;
  return normalized;
}

export function normalizePhoneForMatching(value?: string | null): string | null {
  const display = normalizePhoneForDisplay(value);
  if (!display) {
    return null;
  }

  try {
    return normalizePhoneStrict(display);
  } catch {
    return null;
  }
}

export function normalizeNameForSuggestion(value?: string | null): string | null {
  return normalizeDisplayName(value)?.toLowerCase() ?? null;
}

function normalizeNamePart(value?: string | null): string | null {
  const normalized = normalizeSingleLine(value);
  return normalized ? normalized.slice(0, 100) : null;
}

function normalizeDisplayName(value?: string | null): string | null {
  const normalized = normalizeSingleLine(value);
  return normalized ? normalized.slice(0, 160) : null;
}

function normalizeEmailForDisplay(value?: string | null): string | null {
  const normalized = normalizeSingleLine(value);
  if (!normalized) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError("Enter a valid customer email.", "CUSTOMER_INVALID_EMAIL", 400);
  }

  return normalized.slice(0, 255);
}

function normalizePhoneForDisplay(value?: string | null): string | null {
  const normalized = normalizeSingleLine(value);
  return normalized ? normalized.slice(0, 40) : null;
}

function normalizePhoneStrict(value: string): string {
  const compact = value.replace(/[\s().-]/g, "");

  if (/^07\d{8}$/.test(compact)) {
    return `+250${compact.slice(1)}`;
  }

  if (/^2507\d{8}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^\+2507\d{8}$/.test(compact)) {
    return compact;
  }

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  throw new AppError(
    "Enter a valid customer phone number.",
    "CUSTOMER_INVALID_PHONE",
    400
  );
}

function normalizeSingleLine(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}
