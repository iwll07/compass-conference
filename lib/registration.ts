// Registration: shared option lists, validators and helpers.
//
// This file is the single source of truth for option lists and validation rules.
// The migration (supabase/migrations/*_create_registrations.sql) mirrors these
// lists as CHECK constraints, and a unit test asserts they stay in sync.
//
// Keep this file free of React/browser dependencies: it is imported by the form
// component, the admin export, and the unit tests.

// ---- Option lists (order matters: dropdowns and CHECK constraints use it) ----

export const NATIONALITIES = [
  "Egypt",
  "Sudan",
  "Saudi Arabia",
  "UAE",
  "Kuwait",
  "Qatar",
  "Syria",
  "Other",
] as const;

export const UNIVERSITIES = [
  "Beni Suef National University",
  "Beni Suef University",
  "Benha National University",
  "Alexandria National University",
  "Mansoura National University",
  "American University",
  "New Giza University",
  "New Valley University",
  "Other",
] as const;

export const ACADEMIC_YEARS = [
  "First Year",
  "Second Year",
  "Third Year",
  "Fourth Year",
  "Fifth Year",
  "Intern",
  "Graduate",
] as const;

export type Nationality = (typeof NATIONALITIES)[number];
export type University = (typeof UNIVERSITIES)[number];
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

// ---- Phone normalisation ----

/**
 * Normalise an Egyptian mobile number to +20 plus 10 digits.
 *
 * Accepts common formats: 01012345678, 1012345678, +201012345678,
 * 00201012345678. Strips spaces, dashes, dots, parentheses and converts
 * Arabic-Indic digits (٠-٩) to ASCII 0-9.
 *
 * Returns the canonical form (+201012345678) or null if the input is invalid.
 * Valid only when the 10 local digits start with 10, 11, 12 or 15.
 */
export function normalizeEgyptianPhone(input: string): string | null {
  // Replace Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩ with ASCII 0-9
  let cleaned = input.replace(/[\u0660-\u0669]/g, (ch) =>
    String(ch.charCodeAt(0) - 0x0660)
  );
  // Strip visual separators: spaces, dashes, dots, parentheses
  cleaned = cleaned.replace(/[\s\-.()\u200B\u200C\u200D]+/g, "");

  // Strip international prefix
  if (cleaned.startsWith("+20")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("0020")) {
    cleaned = cleaned.slice(4);
  }
  // Strip national trunk prefix
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Must be exactly 10 digits starting with a valid operator prefix
  if (!/^(10|11|12|15)\d{8}$/.test(cleaned)) {
    return null;
  }
  return `+20${cleaned}`;
}

// ---- Name validation ----

// Letters of any script (including Arabic), plus spaces, hyphens, apostrophes
// and dots. No digits. At least two words, 3-100 characters after trimming.
const NAME_CHAR = /^[\p{L}\s\-'.]+$/u;
const MIN_WORDS = 2;

export function validateName(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 100) return null;
  if (!NAME_CHAR.test(trimmed)) return null;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return null;
  return trimmed;
}

// ---- Email validation ----

export function validateEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 254) return null;
  // Deliberately minimal: the database has a unique index on lower(email),
  // so Supabase rejects true duplicates and the form only needs a plausibility
  // check (something@something.something).
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

// ---- Masked contact line helpers ----

/**
 * Mask an email address for privacy: keeps first character, three bullets, and the full domain.
 * e.g. "ibrahim@gmail.com" -> "i•••@gmail.com"
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return trimmed;
  const firstChar = trimmed[0];
  const domain = trimmed.slice(atIndex);
  return `${firstChar}•••${domain}`;
}

/**
 * Mask an Egyptian phone number for privacy: keeps +20 prefix, bullets, and only the last 3 digits.
 * e.g. "+201012345321" -> "+20 ••• ••• 321"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last3 = digits.length >= 3 ? digits.slice(-3) : digits;
  return `+20 ••• ••• ${last3}`;
}

/**
 * Format the combined masked contact string for the confirmation screen.
 * e.g. "Contact details on file: i•••@gmail.com · +20 ••• ••• 321"
 */
export function formatMaskedContact(email: string, phone: string): string {
  return `Contact details on file: ${maskEmail(email)} · ${maskPhone(phone)}`;
}

// ---- "Other" specification limits and validators ----------------------------

export const OTHER_NATIONALITY_MIN = 2;
export const OTHER_NATIONALITY_MAX = 60;
export const OTHER_UNIVERSITY_MIN = 2;
export const OTHER_UNIVERSITY_MAX = 100;

export function validateOtherNationality(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < OTHER_NATIONALITY_MIN || trimmed.length > OTHER_NATIONALITY_MAX) return null;
  return trimmed;
}

export function validateOtherUniversity(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < OTHER_UNIVERSITY_MIN || trimmed.length > OTHER_UNIVERSITY_MAX) return null;
  return trimmed;
}

// ---- Database Unique Index Names & Conflict Resolution ----------------------

export const REGISTRATION_EMAIL_INDEX = "registrations_email_unique_idx";
export const REGISTRATION_PHONE_INDEX = "registrations_phone_unique";

export type DuplicateField = "phone" | "email" | null;

/**
 * Determine which unique field caused a 23505 unique constraint violation.
 *
 * NOTE: If both phone and email clash on the same insert, Postgres evaluates
 * unique constraints sequentially and aborts at the first failure. Postgres
 * returns only one constraint violation per insert attempt, so only the first
 * evaluated clash is reported.
 */
export function duplicateField(error: unknown): DuplicateField {
  if (!error) return null;

  let text = "";
  if (typeof error === "string") {
    text = error;
  } else if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    text = [err.message, err.details, err.hint, err.constraint]
      .filter((v): v is string => typeof v === "string")
      .join(" ");
  }

  if (text.includes(REGISTRATION_PHONE_INDEX)) return "phone";
  if (text.includes(REGISTRATION_EMAIL_INDEX)) return "email";

  // Fallback pattern checks: Key (phone)=... or Key (lower(email::text))=...
  if (/key\s*\([^)]*phone[^)]*\)/i.test(text) || (/\bphone\b/i.test(text) && text.includes("already exists"))) {
    return "phone";
  }
  if (/key\s*\([^)]*email[^)]*\)/i.test(text) || (/\bemail\b/i.test(text) && text.includes("already exists"))) {
    return "email";
  }

  return null;
}

// ---- Admin permissions & helpers ----

/** Accounts allowed to permanently delete conference registrations.
 *  Mirrors the DELETE policy in supabase/migrations/20261019010000_registrations_admin_access.sql — keep in sync.
 *  This array only controls UI visibility; the database RLS policy is the real gate. */
export const REGISTRATION_DELETE_EMAILS: readonly string[] = ["fares9005@gmail.com"];

export function canDeleteRegistrations(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return REGISTRATION_DELETE_EMAILS.some((admin) => admin.toLowerCase() === clean);
}

/**
 * Normalise a user-typed phone search term to match the stored +201... numbers.
 * Strips non-digits, and removes any leading '0' so "010..." matches "10...".
 */
export function cleanPhoneForSearch(query: string): string {
  const digits = query.replace(/[^0-9]/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

export type RegistrationFilterParams = {
  q?: string;
  university?: string;
  academicYear?: string;
  nationality?: string;
};

/**
 * Checks whether any filter (text or dropdown) is actively set.
 */
export function hasActiveFilters(filters: RegistrationFilterParams): boolean {
  return Boolean(
    (filters.q && filters.q.trim().length > 0) ||
      (filters.university && filters.university !== "All") ||
      (filters.academicYear && filters.academicYear !== "All") ||
      (filters.nationality && filters.nationality !== "All")
  );
}

/**
 * Generate the Excel export filename based on the Cairo date stamp and active filter state.
 */
export function getExportFilename(cairoDate: string, isFiltered: boolean): string {
  return `compass-registrations-${cairoDate}${isFiltered ? "-filtered" : ""}.xlsx`;
}

/**
 * Sorts academic year count entries in canonical order (First Year ... Graduate).
 */
export function sortAcademicYearCounts<T extends { academic_year: string }>(items: T[]): T[] {
  const orderMap = new Map<string, number>(ACADEMIC_YEARS.map((y, idx) => [y, idx]));
  return [...items].sort((a, b) => {
    const orderA = orderMap.has(a.academic_year) ? (orderMap.get(a.academic_year) as number) : 999;
    const orderB = orderMap.has(b.academic_year) ? (orderMap.get(b.academic_year) as number) : 999;
    return orderA - orderB;
  });
}

// ---- Contact for the confirmation screen ----

/** Set to an object with `label` and `href` when a contact link should appear
 *  on the confirmation screen. Null means "don't show a contact line". */
export const registrationContact: { label: string; href: string } | null = null;

