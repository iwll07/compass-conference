import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeEgyptianPhone,
  validateName,
  validateEmail,
  maskEmail,
  maskPhone,
  formatMaskedContact,
  NATIONALITIES,
  UNIVERSITIES,
  ACADEMIC_YEARS,
  REGISTRATION_EMAIL_INDEX,
  REGISTRATION_PHONE_INDEX,
  duplicateField,
  OTHER_NATIONALITY_MIN,
  OTHER_NATIONALITY_MAX,
  OTHER_UNIVERSITY_MIN,
  OTHER_UNIVERSITY_MAX,
  validateOtherNationality,
  validateOtherUniversity,
} from "../lib/registration.ts";

// ---- Phone normalisation ----

test("normalizeEgyptianPhone: standard local format (01012345678)", () => {
  assert.equal(normalizeEgyptianPhone("01012345678"), "+201012345678");
});

test("normalizeEgyptianPhone: without trunk prefix (1012345678)", () => {
  assert.equal(normalizeEgyptianPhone("1012345678"), "+201012345678");
});

test("normalizeEgyptianPhone: international +20", () => {
  assert.equal(normalizeEgyptianPhone("+201012345678"), "+201012345678");
});

test("normalizeEgyptianPhone: international 0020", () => {
  assert.equal(normalizeEgyptianPhone("00201012345678"), "+201012345678");
});

test("normalizeEgyptianPhone: strips spaces, dashes, dots, parens", () => {
  assert.equal(normalizeEgyptianPhone("010 1234 5678"), "+201012345678");
  assert.equal(normalizeEgyptianPhone("010-1234-5678"), "+201012345678");
  assert.equal(normalizeEgyptianPhone("(010) 1234.5678"), "+201012345678");
});

test("normalizeEgyptianPhone: converts Arabic-Indic digits", () => {
  assert.equal(normalizeEgyptianPhone("٠١٠١٢٣٤٥٦٧٨"), "+201012345678");
});

test("normalizeEgyptianPhone: all valid prefixes (10, 11, 12, 15)", () => {
  assert.equal(normalizeEgyptianPhone("01012345678"), "+201012345678");
  assert.equal(normalizeEgyptianPhone("01112345678"), "+201112345678");
  assert.equal(normalizeEgyptianPhone("01212345678"), "+201212345678");
  assert.equal(normalizeEgyptianPhone("01512345678"), "+201512345678");
});

test("normalizeEgyptianPhone: rejects invalid prefixes", () => {
  assert.equal(normalizeEgyptianPhone("01312345678"), null); // 13 not valid
  assert.equal(normalizeEgyptianPhone("01412345678"), null); // 14 not valid
  assert.equal(normalizeEgyptianPhone("01612345678"), null); // 16 not valid
});

test("normalizeEgyptianPhone: rejects wrong length", () => {
  assert.equal(normalizeEgyptianPhone("0101234567"), null);   // 10 digits
  assert.equal(normalizeEgyptianPhone("010123456789"), null); // 12 digits
  assert.equal(normalizeEgyptianPhone(""), null);
});

test("normalizeEgyptianPhone: rejects non-numeric input", () => {
  assert.equal(normalizeEgyptianPhone("abcdefghijk"), null);
  assert.equal(normalizeEgyptianPhone("010abc45678"), null);
});

// ---- Name validation ----

test("validateName: accepts a two-word name", () => {
  assert.equal(validateName("Fares Ahmed"), "Fares Ahmed");
});

test("validateName: trims whitespace", () => {
  assert.equal(validateName("  Fares Ahmed  "), "Fares Ahmed");
});

test("validateName: rejects single word", () => {
  assert.equal(validateName("Fares"), null);
});

test("validateName: rejects too short (< 3 chars)", () => {
  assert.equal(validateName("AB"), null);
  assert.equal(validateName("A"), null);
});

test("validateName: rejects too long (> 100 chars)", () => {
  assert.equal(validateName("A".repeat(51) + " " + "B".repeat(50)), null);
});

test("validateName: accepts Arabic names", () => {
  assert.equal(validateName("فارس أحمد"), "فارس أحمد");
});

test("validateName: accepts hyphens, apostrophes, dots", () => {
  assert.equal(validateName("Mary-Jane O'Brien"), "Mary-Jane O'Brien");
  assert.equal(validateName("Dr. John Smith"), "Dr. John Smith");
});

test("validateName: rejects digits", () => {
  assert.equal(validateName("Fares 123"), null);
  assert.equal(validateName("Test2 User"), null);
});

// ---- Email validation ----

test("validateEmail: normalises to lowercase", () => {
  assert.equal(validateEmail("Fares@Example.COM"), "fares@example.com");
});

test("validateEmail: trims whitespace", () => {
  assert.equal(validateEmail("  a@b.com  "), "a@b.com");
});

test("validateEmail: rejects empty", () => {
  assert.equal(validateEmail(""), null);
  assert.equal(validateEmail("   "), null);
});

test("validateEmail: rejects too long (> 254)", () => {
  assert.equal(validateEmail("a".repeat(243) + "@example.com"), null);
});

test("validateEmail: rejects missing @", () => {
  assert.equal(validateEmail("not-an-email"), null);
});

test("validateEmail: rejects missing domain", () => {
  assert.equal(validateEmail("user@"), null);
});

// ---- Option lists ----

test("nationality list has the expected entries in order", () => {
  assert.deepEqual(
    [...NATIONALITIES],
    ["Egypt", "Sudan", "Saudi Arabia", "UAE", "Kuwait", "Qatar", "Syria", "Other"]
  );
});

test("university list has the expected entries in order", () => {
  assert.deepEqual(
    [...UNIVERSITIES],
    [
      "Beni Suef National University",
      "Beni Suef University",
      "Benha National University",
      "Alexandria National University",
      "Mansoura National University",
      "American University",
      "New Giza University",
      "New Valley University",
      "Other",
    ]
  );
});

test("academic year list has the expected entries in order", () => {
  assert.deepEqual(
    [...ACADEMIC_YEARS],
    ["First Year", "Second Year", "Third Year", "Fourth Year", "Fifth Year", "Intern", "Graduate"]
  );
});

// ---- Migration sync check ----
// Every dropdown value in lib/registration.ts must appear in the corresponding
// CHECK constraint in the migration SQL. This test catches drift.

test("migration CHECK constraints contain every dropdown value", () => {
  const sql = readFileSync("supabase/migrations/20261018000000_create_registrations.sql", "utf8");

  for (const nat of NATIONALITIES) {
    assert.ok(
      sql.includes(`'${nat}'`),
      `Nationality "${nat}" missing from migration CHECK`
    );
  }
  for (const uni of UNIVERSITIES) {
    assert.ok(
      sql.includes(`'${uni}'`),
      `University "${uni}" missing from migration CHECK`
    );
  }
  for (const yr of ACADEMIC_YEARS) {
    assert.ok(
      sql.includes(`'${yr}'`),
      `Academic year "${yr}" missing from migration CHECK`
    );
  }
});

// ---- Masked contact line tests ----

test("maskEmail: masks local part keeping first char, bullets, and domain", () => {
  assert.equal(maskEmail("ibrahim@gmail.com"), "i•••@gmail.com");
  assert.equal(maskEmail("fares9005@gmail.com"), "f•••@gmail.com");
  assert.equal(maskEmail("a@example.org"), "a•••@example.org");
  assert.equal(maskEmail("  JOHN.DOE@DOMAIN.CO.UK  "), "j•••@domain.co.uk");
});

test("maskPhone: keeps +20 prefix, bullets, and last 3 digits", () => {
  assert.equal(maskPhone("+201012345321"), "+20 ••• ••• 321");
  assert.equal(maskPhone("+201012345678"), "+20 ••• ••• 678");
  assert.equal(maskPhone("01012345321"), "+20 ••• ••• 321");
  assert.equal(maskPhone("123"), "+20 ••• ••• 123");
});

test("formatMaskedContact: formats full masked line matching spec", () => {
  assert.equal(
    formatMaskedContact("ibrahim@gmail.com", "+201012345321"),
    "Contact details on file: i•••@gmail.com · +20 ••• ••• 321"
  );
});

// ---- Attendee Card contents and privacy test ----

test("RegistrationCard: contains name, year, university, and date; never contains email, phone, or reference code", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { RegistrationCard } = await import("../components/registration-card.tsx");

  const attendee = {
    fullName: "Ahmed Mahmoud",
    academicYear: "Third Year",
    university: "Beni Suef National University",
  };

  const html = renderToStaticMarkup(RegistrationCard({ attendee }));

  // Must contain essential attendee and conference information
  assert.ok(html.includes("Ahmed Mahmoud"), "Card must include registrant name");
  assert.ok(html.includes("Third Year"), "Card must include academic year");
  assert.ok(html.includes("Beni Suef National University"), "Card must include university");
  assert.ok(html.includes("REGISTERED"), "Card must include REGISTERED label");
  assert.ok(html.includes("24 November 2026"), "Card must include conference date");

  // Privacy assertions: MUST NOT contain email, phone, or reference code
  assert.ok(!html.includes("@"), "Card must NOT contain email address");
  assert.ok(!html.includes("+20"), "Card must NOT contain phone number");
  assert.ok(!html.toLowerCase().includes("reference"), "Card must NOT contain reference code");
  assert.ok(!html.toLowerCase().includes("code:"), "Card must NOT contain code prefix");
});

test("RegistrationCard: shows typed university instead of 'Other' when university is Other", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { RegistrationCard } = await import("../components/registration-card.tsx");

  const attendee = {
    fullName: "Youssef Ibrahim",
    academicYear: "Fourth Year",
    university: "Other",
    universityOther: "Oxford University",
  };

  const html = renderToStaticMarkup(RegistrationCard({ attendee }));
  assert.ok(html.includes("Oxford University"), "Card must display specified university");
  assert.ok(
    !html.includes("Fourth Year · Other"),
    "Card must NOT show 'Other' when universityOther is provided"
  );
  assert.ok(
    html.includes("Fourth Year · Oxford University"),
    "Card must show '{Year} · {Specified University}'"
  );
});

// ---- Unique index names and migration drift tests ----

test("unique index names in lib/registration match migration SQL", () => {
  const emailMigration = readFileSync("supabase/migrations/20261018000000_create_registrations.sql", "utf8");
  assert.ok(
    emailMigration.includes(REGISTRATION_EMAIL_INDEX),
    `Migration 20261018000000 must define index "${REGISTRATION_EMAIL_INDEX}"`
  );

  const phoneMigration = readFileSync("supabase/migrations/20261018020000_registrations_unique_phone.sql", "utf8");
  assert.ok(
    phoneMigration.includes(REGISTRATION_PHONE_INDEX),
    `Migration 20261018020000 must define index "${REGISTRATION_PHONE_INDEX}"`
  );
});

test("migration Other length limits match TypeScript constants", () => {
  const otherMigration = readFileSync("supabase/migrations/20261018030000_registrations_other_specified.sql", "utf8");
  assert.ok(
    otherMigration.includes(`>= ${OTHER_NATIONALITY_MIN}`),
    `Migration must enforce nationality_other min length ${OTHER_NATIONALITY_MIN}`
  );
  assert.ok(
    otherMigration.includes(`<= ${OTHER_NATIONALITY_MAX}`),
    `Migration must enforce nationality_other max length ${OTHER_NATIONALITY_MAX}`
  );
  assert.ok(
    otherMigration.includes(`>= ${OTHER_UNIVERSITY_MIN}`),
    `Migration must enforce university_other min length ${OTHER_UNIVERSITY_MIN}`
  );
  assert.ok(
    otherMigration.includes(`<= ${OTHER_UNIVERSITY_MAX}`),
    `Migration must enforce university_other max length ${OTHER_UNIVERSITY_MAX}`
  );
});

// ---- duplicateField helper tests ----

test("duplicateField: identifies phone clash by index name", () => {
  assert.equal(
    duplicateField({
      code: "23505",
      message: `duplicate key value violates unique constraint "${REGISTRATION_PHONE_INDEX}"`,
    }),
    "phone"
  );
});

test("duplicateField: identifies phone clash by Key (phone) pattern", () => {
  assert.equal(
    duplicateField({
      code: "23505",
      details: "Key (phone)=(+201012345678) already exists.",
    }),
    "phone"
  );
});

test("duplicateField: identifies email clash by index name", () => {
  assert.equal(
    duplicateField({
      code: "23505",
      message: `duplicate key value violates unique constraint "${REGISTRATION_EMAIL_INDEX}"`,
    }),
    "email"
  );
});

test("duplicateField: identifies email clash by Key (lower(email::text)) pattern", () => {
  assert.equal(
    duplicateField({
      code: "23505",
      details: "Key (lower(email::text))=(user@example.com) already exists.",
    }),
    "email"
  );
});

test("duplicateField: returns null for unknown clash or non-conflict error", () => {
  assert.equal(duplicateField(null), null);
  assert.equal(duplicateField(undefined), null);
  assert.equal(duplicateField("some generic network error"), null);
  assert.equal(
    duplicateField({
      code: "23514",
      message: 'new row for relation "registrations" violates check constraint "registrations_name_length"',
    }),
    null
  );
});

// ---- Other validation helpers tests ----

test("validateOtherNationality: accepts valid length and trims", () => {
  assert.equal(validateOtherNationality("  Jordan  "), "Jordan");
  assert.equal(validateOtherNationality("A"), null);
  assert.equal(validateOtherNationality(""), null);
  assert.equal(validateOtherNationality("x".repeat(61)), null);
  assert.equal(validateOtherNationality("x".repeat(60)), "x".repeat(60));
});

test("validateOtherUniversity: accepts valid length and trims", () => {
  assert.equal(validateOtherUniversity("  Oxford University  "), "Oxford University");
  assert.equal(validateOtherUniversity("A"), null);
  assert.equal(validateOtherUniversity(""), null);
  assert.equal(validateOtherUniversity("x".repeat(101)), null);
  assert.equal(validateOtherUniversity("x".repeat(100)), "x".repeat(100));
});

// ---- Admin upgrade helpers & migration tests ----

import {
  canDeleteAllRegistrations,
  cleanPhoneForSearch,
  hasActiveFilters,
  getExportFilename,
  sortAcademicYearCounts,
  REGISTRATION_DELETE_ALL_EMAILS,
} from "../lib/registration.ts";

test("canDeleteAllRegistrations: permits only fares9005@gmail.com", () => {
  assert.ok(REGISTRATION_DELETE_ALL_EMAILS.includes("fares9005@gmail.com"));
  assert.equal(canDeleteAllRegistrations("fares9005@gmail.com"), true);
  assert.equal(canDeleteAllRegistrations("  FARES9005@GMAIL.COM  "), true);
  assert.equal(canDeleteAllRegistrations("other@example.com"), false);
  assert.equal(canDeleteAllRegistrations(""), false);
  assert.equal(canDeleteAllRegistrations(null), false);
  assert.equal(canDeleteAllRegistrations(undefined), false);
});

test("cleanPhoneForSearch: strips non-digits and leading zero", () => {
  assert.equal(cleanPhoneForSearch("01012345678"), "1012345678");
  assert.equal(cleanPhoneForSearch("1012345678"), "1012345678");
  assert.equal(cleanPhoneForSearch("+20 10 1234 5678"), "201012345678");
  assert.equal(cleanPhoneForSearch("011-9876-5432"), "1198765432");
  assert.equal(cleanPhoneForSearch("Ahmed"), "");
});

test("hasActiveFilters: correctly identifies filter state", () => {
  assert.equal(hasActiveFilters({}), false);
  assert.equal(
    hasActiveFilters({ q: "", university: "All", academicYear: "All", nationality: "All" }),
    false
  );
  assert.equal(hasActiveFilters({ q: "Ahmed" }), true);
  assert.equal(hasActiveFilters({ university: "Beni Suef National University" }), true);
  assert.equal(hasActiveFilters({ academicYear: "Second Year" }), true);
  assert.equal(hasActiveFilters({ nationality: "Egypt" }), true);
});

test("getExportFilename: adds -filtered tag when filters are active", () => {
  assert.equal(getExportFilename("2026-10-19", false), "compass-registrations-2026-10-19.xlsx");
  assert.equal(getExportFilename("2026-10-19", true), "compass-registrations-2026-10-19-filtered.xlsx");
});

test("sortAcademicYearCounts: sorts academic years in canonical sequence", () => {
  const input = [
    { academic_year: "Graduate", count: 5 },
    { academic_year: "First Year", count: 20 },
    { academic_year: "Intern", count: 8 },
    { academic_year: "Second Year", count: 15 },
  ];
  const sorted = sortAcademicYearCounts(input);
  assert.deepEqual(
    sorted.map((s) => s.academic_year),
    ["First Year", "Second Year", "Intern", "Graduate"]
  );
});

test("migration (a) access: policy names, grant statements, and bulk delete check", () => {
  const sql = readFileSync("supabase/migrations/20261019010000_registrations_admin_access.sql", "utf8");
  assert.ok(
    sql.includes('"authenticated users can read registrations"'),
    "Must create policy 'authenticated users can read registrations'"
  );
  assert.ok(
    sql.includes('"authenticated users can delete registrations"'),
    "Must create policy 'authenticated users can delete registrations'"
  );
  assert.ok(
    sql.includes("clear_all_registrations()"),
    "Must define clear_all_registrations RPC"
  );
  assert.ok(
    sql.includes("fares9005@gmail.com"),
    "Must explicitly scope clear_all_registrations to fares9005@gmail.com"
  );
  assert.ok(
    sql.includes("grant select, delete on public.registrations to authenticated"),
    "Must grant select and delete to authenticated"
  );
  assert.ok(
    sql.includes("drop function if exists public.is_registration_admin()"),
    "Must clean up obsolete is_registration_admin"
  );
});

test("migration (b) deletion log: table, trigger, security definer function, and delete policy for fares", () => {
  const sql = readFileSync("supabase/migrations/20261019020000_registrations_deletion_log.sql", "utf8");
  assert.ok(sql.includes("create table if not exists public.registration_log"), "Must create registration_log table");
  assert.ok(sql.includes("registrations_deletion_audit"), "Must create audit trigger");
  assert.ok(sql.includes("security definer"), "Trigger function must be security definer");
  assert.ok(sql.includes("fares9005@gmail.com"), "Log read and delete policies must be restricted to fares9005@gmail.com");
  assert.ok(
    sql.includes("grant select, delete on public.registration_log to authenticated"),
    "Must grant select and delete on registration_log to authenticated"
  );
  assert.ok(
    sql.includes('"fares can delete registration deletion log"'),
    "Must create delete policy for fares on registration_log"
  );
  // Privacy assertion: audit log must NOT store email or phone
  assert.ok(!sql.toLowerCase().includes("old.email"), "Trigger must NOT store email");
  assert.ok(!sql.toLowerCase().includes("old.phone"), "Trigger must NOT store phone");
});

test("migration (c) functions: summary and search functions with security invoker", () => {
  const sql = readFileSync("supabase/migrations/20261019030000_registrations_functions.sql", "utf8");
  assert.ok(sql.includes("public.registration_summary()"), "Must create registration_summary function");
  assert.ok(sql.includes("public.search_registrations("), "Must create search_registrations function");
  assert.ok(sql.includes("security invoker"), "Functions must use security invoker");
  assert.ok(
    sql.includes("revoke execute on function public.registration_summary() from public, anon"),
    "Must revoke execute from anon on summary"
  );
  assert.ok(
    sql.includes("grant execute on function public.registration_summary() to authenticated"),
    "Must grant execute to authenticated on summary"
  );
});

test("migration (d) clear_all_registrations_where_true: adds where true for safety and checks fares9005", () => {
  const sql = readFileSync("supabase/migrations/20261019040000_clear_all_registrations_where_true.sql", "utf8");
  assert.ok(sql.includes("clear_all_registrations()"), "Must define clear_all_registrations function");
  assert.ok(sql.includes("delete from public.registrations"), "Must delete from registrations");
  assert.ok(sql.includes("where true"), "Must contain 'where true' clause for safety");
  assert.ok(sql.includes("fares9005@gmail.com"), "Must restrict to fares9005@gmail.com");
  assert.ok(
    sql.includes("revoke execute on function public.clear_all_registrations() from public, anon"),
    "Must revoke execute from anon"
  );
  assert.ok(
    sql.includes("grant execute on function public.clear_all_registrations() to authenticated"),
    "Must grant execute to authenticated"
  );
});

import {
  DEFAULT_REGISTRATION_STATUS,
  REGISTRATION_STATUS_LABELS,
} from "../lib/registration-status.ts";

test("registration status module defaults and labels", () => {
  assert.equal(DEFAULT_REGISTRATION_STATUS, "soon");
  assert.equal(REGISTRATION_STATUS_LABELS.soon, "Registration soon");
  assert.equal(REGISTRATION_STATUS_LABELS.open, "Register now");
  assert.equal(REGISTRATION_STATUS_LABELS.closed, "Registration closed");
});

test("migration (e) registration_settings: table, 3-state check, grants, trigger, and linter-safe policies", () => {
  const sql = readFileSync("supabase/migrations/20261019050000_create_registration_settings.sql", "utf8");
  assert.ok(sql.includes("public.registration_settings"), "Must create registration_settings table");
  assert.ok(
    sql.includes("check (status in ('soon', 'open', 'closed'))"),
    "Must enforce 3 states: soon, open, closed"
  );
  assert.ok(sql.includes("values ('current', 'soon')"), "Must seed initial row as 'soon'");
  assert.ok(sql.includes("enable row level security"), "Must enable RLS");
  assert.ok(
    sql.includes("grant select (id, status, updated_at, updated_by) on public.registration_settings to anon, authenticated"),
    "Must grant SELECT on settings to anon and authenticated"
  );
  assert.ok(
    sql.includes("grant update (status) on public.registration_settings to authenticated"),
    "Must grant UPDATE (status) to authenticated"
  );
  assert.ok(
    sql.includes("auth.role() = 'authenticated'"),
    "Must check auth.role() = 'authenticated' to avoid permissive rls_policy_always_true warning"
  );
  assert.ok(
    sql.includes("revoke execute on function public.touch_registration_settings() from public, anon, authenticated"),
    "Must revoke trigger function execution to avoid anon_security_definer_function_executable"
  );
});

import {
  isRegistrationRlsError,
  getRegistrationRlsErrorMessage,
} from "../lib/registration.ts";

test("isRegistrationRlsError: identifies 42501 code and message variants", () => {
  assert.equal(isRegistrationRlsError({ code: "42501", message: "insufficient_privilege" }), true);
  assert.equal(
    isRegistrationRlsError({
      code: "P0001",
      message: 'new row violates row-level security policy for table "registrations"',
    }),
    true
  );
  assert.equal(isRegistrationRlsError({ message: "permission denied for table registrations" }), true);
  assert.equal(isRegistrationRlsError({ code: "23505", message: "duplicate key value" }), false);
  assert.equal(isRegistrationRlsError(null), false);
  assert.equal(isRegistrationRlsError("random string"), false);
});

test("getRegistrationRlsErrorMessage: returns distinct messages for soon vs closed", () => {
  assert.equal(getRegistrationRlsErrorMessage("soon"), "Registration hasn't opened yet.");
  assert.equal(getRegistrationRlsErrorMessage("closed"), "Registration is currently closed.");
  assert.equal(getRegistrationRlsErrorMessage("open"), "Registration is currently closed.");
  assert.equal(getRegistrationRlsErrorMessage(null), "Registration is currently closed.");
  assert.equal(getRegistrationRlsErrorMessage(undefined), "Registration is currently closed.");
});

test("migration (f) enforce_registration_status_rls: registration_is_open function and role-based policies", () => {
  const sql = readFileSync("supabase/migrations/20261020000000_enforce_registration_status_rls.sql", "utf8");
  assert.ok(sql.includes("create or replace function public.registration_is_open()"), "Must create registration_is_open function");
  assert.ok(sql.includes("security definer"), "Must be security definer");
  assert.ok(sql.includes("set search_path = public"), "Must set search_path = public");
  assert.ok(sql.includes("status = 'open'"), "Must check status = 'open'");
  assert.ok(sql.includes("revoke execute on function public.registration_is_open() from public"), "Must revoke execute from public");
  assert.ok(sql.includes("grant execute on function public.registration_is_open() to anon, authenticated"), "Must grant execute to anon, authenticated");
  assert.ok(sql.includes('drop policy if exists "anyone can register" on public.registrations'), "Must drop old permissive policy");
  assert.ok(sql.includes('create policy "anon can register when open"'), "Must create anon policy");
  assert.ok(sql.includes("with check (public.registration_is_open())"), "Anon policy must check registration_is_open()");
  assert.ok(sql.includes('create policy "authenticated can register in preview"'), "Must create authenticated policy");
  assert.ok(sql.includes("with check (true)"), "Authenticated policy must have with check (true)");
});

test("RegistrationFormSkeleton has aria-busy, status role, and visually hidden checking copy", () => {
  const content = readFileSync("components/registration-skeleton.tsx", "utf8");
  assert.ok(content.includes('aria-busy="true"'), "Must have aria-busy='true'");
  assert.ok(content.includes('role="status"'), "Must have role='status'");
  assert.ok(
    content.includes("Checking registration status…"),
    "Must include 'Checking registration status…' visually hidden text"
  );
  assert.ok(
    !content.includes(">soon<") && !content.includes(">open<") && !content.includes(">closed<"),
    "No visible text may suggest soon, open or closed"
  );

  const css = readFileSync("app/globals.css", "utf8");
  assert.ok(css.includes(".reg-form-skeleton"), "globals.css must define .reg-form-skeleton");
  assert.ok(css.includes(".reg-skeleton-pulse"), "globals.css must define .reg-skeleton-pulse");
  assert.ok(css.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion");
});




