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

