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

// ---- Contact for the confirmation screen ----

/** Set to an object with `label` and `href` when a contact link should appear
 *  on the confirmation screen. Null means "don't show a contact line". */
export const registrationContact: { label: string; href: string } | null = null;
