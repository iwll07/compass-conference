"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  NATIONALITIES,
  UNIVERSITIES,
  ACADEMIC_YEARS,
  normalizeEgyptianPhone,
  validateName,
  validateEmail,
  formatMaskedContact,
  registrationContact,
  duplicateField,
  OTHER_NATIONALITY_MIN,
  OTHER_NATIONALITY_MAX,
  OTHER_UNIVERSITY_MIN,
  OTHER_UNIVERSITY_MAX,
} from "@/lib/registration";
import { conferenceWindow } from "@/lib/event";
import { RegistrationCard } from "@/components/registration-card";

// ---- Types ------------------------------------------------------------------

type RegistrationSuccess = {
  fullName: string;
  email: string;
  phone: string;
  academicYear: string;
  university: string;
  universityOther?: string | null;
  nationality: string;
  nationalityOther?: string | null;
};

type FormData = {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  otherNationality: string;
  university: string;
  otherUniversity: string;
  academicYear: string;
  honeypot: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: FormData = {
  fullName: "",
  email: "",
  phone: "",
  nationality: "",
  otherNationality: "",
  university: "",
  otherUniversity: "",
  academicYear: "",
  honeypot: "",
};

// ---- Helpers ----------------------------------------------------------------

function validate(data: FormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!validateName(data.fullName)) {
    if (!data.fullName.trim()) errors.fullName = "Full name is required.";
    else if (data.fullName.trim().length < 3) errors.fullName = "Name must be at least 3 characters.";
    else if (data.fullName.trim().length > 100) errors.fullName = "Name must be at most 100 characters.";
    else if (/\d/.test(data.fullName)) errors.fullName = "Name must not contain digits.";
    else if (data.fullName.trim().split(/\s+/).filter(Boolean).length < 2) errors.fullName = "Please enter your full name (first and last).";
    else errors.fullName = "Name contains unsupported characters.";
  }

  if (!validateEmail(data.email)) {
    if (!data.email.trim()) errors.email = "Email is required.";
    else if (data.email.trim().length > 254) errors.email = "Email is too long.";
    else errors.email = "Please enter a valid email address.";
  }

  if (!normalizeEgyptianPhone(data.phone)) {
    if (!data.phone.trim()) errors.phone = "Phone number is required.";
    else errors.phone = "Please enter a valid Egyptian mobile number.";
  }

  if (!data.nationality) {
    errors.nationality = "Nationality is required.";
  } else if (data.nationality === "Other") {
    const trimmed = data.otherNationality.trim();
    if (!trimmed) errors.otherNationality = "Please specify your nationality.";
    else if (trimmed.length < OTHER_NATIONALITY_MIN) errors.otherNationality = `Must be at least ${OTHER_NATIONALITY_MIN} characters.`;
    else if (trimmed.length > OTHER_NATIONALITY_MAX) errors.otherNationality = `Must be at most ${OTHER_NATIONALITY_MAX} characters.`;
  }

  if (!data.university) {
    errors.university = "University is required.";
  } else if (data.university === "Other") {
    const trimmed = data.otherUniversity.trim();
    if (!trimmed) errors.otherUniversity = "Please specify your university.";
    else if (trimmed.length < OTHER_UNIVERSITY_MIN) errors.otherUniversity = `Must be at least ${OTHER_UNIVERSITY_MIN} characters.`;
    else if (trimmed.length > OTHER_UNIVERSITY_MAX) errors.otherUniversity = `Must be at most ${OTHER_UNIVERSITY_MAX} characters.`;
  }

  if (!data.academicYear) errors.academicYear = "Academic year is required.";

  return errors;
}

// ---- .ics generation --------------------------------------------------------

function generateIcs(): string | null {
  if (!conferenceWindow) return null;
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dtstart = fmt(conferenceWindow.startsAt);
  const dtend = fmt(conferenceWindow.endsAt);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//COMPASS//EN",
    "BEGIN:VEVENT",
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    "SUMMARY:COMPASS",
    "LOCATION:Faculty of Medicine\\, Beni Suef National University",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ---- Component --------------------------------------------------------------

export function RegistrationForm() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<keyof FormData>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RegistrationSuccess | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const successRef = useRef<HTMLHeadingElement>(null);

  function onChange<K extends keyof FormData>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the error for this field as the user types
    if (errors[field]) {
      const next = validate({ ...form, [field]: value });
      if (!next[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  }

  function onBlur(field: keyof FormData) {
    setTouched((prev) => new Set(prev).add(field));
    const next = validate(form);
    if (next[field]) setErrors((prev) => ({ ...prev, [field]: next[field] }));
    else setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    // Honeypot: if filled, pretend success but send nothing.
    if (form.honeypot) {
      setSuccess({
        fullName: form.fullName || "Attendee",
        email: form.email,
        phone: normalizeEgyptianPhone(form.phone) ?? form.phone,
        academicYear: form.academicYear || "First Year",
        university: form.university || "Beni Suef National University",
        universityOther: form.university === "Other" ? form.otherUniversity.trim() : null,
        nationality: form.nationality || "Egypt",
        nationalityOther: form.nationality === "Other" ? form.otherNationality.trim() : null,
      });
      setTimeout(() => successRef.current?.focus(), 100);
      return;
    }

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouched(new Set(Object.keys(validationErrors) as (keyof FormData)[]));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const normalizedPhone = normalizeEgyptianPhone(form.phone)!;
    const normalizedEmail = validateEmail(form.email)!;
    const normalizedName = validateName(form.fullName)!;

    const insertPayload: Record<string, string> = {
      full_name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      nationality: form.nationality,
      university: form.university,
      academic_year: form.academicYear,
    };

    if (form.nationality === "Other") {
      insertPayload.nationality_other = form.otherNationality.trim();
    }
    if (form.university === "Other") {
      insertPayload.university_other = form.otherUniversity.trim();
    }

    try {
      if (!isSupabaseConfigured) throw new Error("Registration is not available right now.");

      const { error } = await getSupabase()
        .from("registrations")
        .insert(insertPayload);
      // Do NOT chain .select(): anon has no SELECT grant, so it would fail even
      // though the insert itself is allowed.

      if (error) {
        if (error.code === "23505") {
          const clash = duplicateField(error);
          if (clash === "phone") {
            setErrors((prev) => ({
              ...prev,
              phone: "This phone number is already registered.",
            }));
            const el = document.getElementById("reg-phone");
            el?.focus();
          } else if (clash === "email") {
            setErrors((prev) => ({
              ...prev,
              email: "This email is already registered.",
            }));
            const el = document.getElementById("reg-email");
            el?.focus();
          } else {
            setSubmitError("These details are already registered.");
          }
        } else {
          setSubmitError("We couldn't submit your registration right now. Please try again.");
          console.warn("Registration insert error:", error.message);
        }
        setSubmitting(false);
        return;
      }

      setSuccess({
        fullName: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        academicYear: form.academicYear,
        university: form.university,
        universityOther: form.university === "Other" ? form.otherUniversity.trim() : null,
        nationality: form.nationality,
        nationalityOther: form.nationality === "Other" ? form.otherNationality.trim() : null,
      });
      setTimeout(() => successRef.current?.focus(), 100);
    } catch (err) {
      setSubmitError("We couldn't submit your registration right now. Please try again.");
      console.warn("Registration error:", err instanceof Error ? err.message : err);
      setSubmitting(false);
    }
  }

  // ---- Confirmation screen --------------------------------------------------

  if (success) {
    const firstName = success.fullName.split(/\s+/)[0];
    const ics = generateIcs();

    function downloadIcs() {
      if (!ics) return;
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compass.ics";
      a.click();
      URL.revokeObjectURL(url);
    }

    async function onSaveImage() {
      if (savingImage || !success) return;
      setSavingImage(true);
      try {
        const { exportCardAsImage } = await import("@/lib/registration-card-canvas");
        await exportCardAsImage({
          fullName: success.fullName,
          academicYear: success.academicYear,
          university: success.university,
          universityOther: success.universityOther,
        });
      } catch (err) {
        console.warn("Failed to export card image:", err);
      } finally {
        setSavingImage(false);
      }
    }

    return (
      <section className="reg-confirmation" aria-labelledby="reg-success-heading">
        <div className="reg-confirmed-header">
          <h2 id="reg-success-heading" ref={successRef} tabIndex={-1}>
            Registration received
          </h2>
          <p className="reg-thankyou">Thank you, {firstName}.</p>
        </div>

        <div className="reg-confirmed-card">
          <RegistrationCard
            attendee={{
              fullName: success.fullName,
              academicYear: success.academicYear,
              university: success.university,
              universityOther: success.universityOther,
            }}
          />
        </div>

        <div className="reg-confirmed-body">
          <p className="reg-next">
            We&apos;ll contact you using the details you gave us with the next steps before the conference.
          </p>
          <p className="reg-note">
            <strong>Please note:</strong> Your attendance is not confirmed until you receive an email with your attendance details.
          </p>
          <p className="reg-masked-contact">
            {formatMaskedContact(success.email, success.phone)}
          </p>
          <div className="reg-actions">
            {ics ? (
              <button type="button" className="button button-secondary" onClick={downloadIcs}>
                Add to calendar
              </button>
            ) : null}
            <button
              type="button"
              className="button button-secondary"
              onClick={onSaveImage}
              disabled={savingImage}
            >
              {savingImage ? "Saving card…" : "Save card as image"}
            </button>
            <Link href="/" className="text-link reg-home-link">
              Back to home
            </Link>
          </div>
          {registrationContact ? (
            <p className="reg-contact">
              Something wrong? Contact{" "}
              <a href={registrationContact.href}>{registrationContact.label}</a>.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  // ---- Registration form ----------------------------------------------------

  const fieldError = (field: keyof FormData) =>
    touched.has(field) && errors[field] ? errors[field] : undefined;

  return (
    <form className="reg-form" onSubmit={onSubmit} noValidate>
      {/* Honeypot: hidden from sighted users and screen readers. If filled
          (only bots tab through hidden fields), the form silently succeeds
          without sending anything. */}
      <div
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
        aria-hidden="true"
      >
        <label htmlFor="reg-website">Website</label>
        <input
          id="reg-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.honeypot}
          onChange={(e) => onChange("honeypot", e.target.value)}
        />
      </div>

      {/* ---- Personal information ---- */}
      <fieldset className="reg-fieldset">
        <legend className="reg-legend">Personal information</legend>

        <label htmlFor="reg-name">Full name</label>
        <input
          id="reg-name"
          type="text"
          required
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => onChange("fullName", e.target.value)}
          onBlur={() => onBlur("fullName")}
          aria-describedby={fieldError("fullName") ? "reg-name-error" : undefined}
          aria-invalid={fieldError("fullName") ? "true" : undefined}
        />
        {fieldError("fullName") ? <p id="reg-name-error" className="reg-field-error" role="alert">{fieldError("fullName")}</p> : null}

        <label htmlFor="reg-email">Email</label>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          onBlur={() => onBlur("email")}
          aria-describedby={fieldError("email") ? "reg-email-error" : undefined}
          aria-invalid={fieldError("email") ? "true" : undefined}
        />
        {fieldError("email") ? <p id="reg-email-error" className="reg-field-error" role="alert">{fieldError("email")}</p> : null}

        <label htmlFor="reg-phone">Phone</label>
        <div className="reg-phone-row">
          <span className="reg-phone-prefix" aria-hidden="true">+20</span>
          <input
            id="reg-phone"
            type="tel"
            required
            autoComplete="tel-national"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            onBlur={() => onBlur("phone")}
            aria-describedby={fieldError("phone") ? "reg-phone-error" : undefined}
            aria-invalid={fieldError("phone") ? "true" : undefined}
          />
        </div>
        {fieldError("phone") ? <p id="reg-phone-error" className="reg-field-error" role="alert">{fieldError("phone")}</p> : null}

        <label htmlFor="reg-nationality">Nationality</label>
        <select
          id="reg-nationality"
          required
          value={form.nationality}
          onChange={(e) => onChange("nationality", e.target.value)}
          onBlur={() => onBlur("nationality")}
          aria-describedby={fieldError("nationality") ? "reg-nationality-error" : undefined}
          aria-invalid={fieldError("nationality") ? "true" : undefined}
        >
          <option value="" disabled>Select…</option>
          {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {fieldError("nationality") ? <p id="reg-nationality-error" className="reg-field-error" role="alert">{fieldError("nationality")}</p> : null}

        {form.nationality === "Other" ? (
          <>
            <label htmlFor="reg-other-nationality">Specify nationality</label>
            <input
              id="reg-other-nationality"
              type="text"
              required
              placeholder="Your country of nationality"
              value={form.otherNationality}
              onChange={(e) => onChange("otherNationality", e.target.value)}
              onBlur={() => onBlur("otherNationality")}
              aria-describedby={fieldError("otherNationality") ? "reg-other-nationality-error" : undefined}
              aria-invalid={fieldError("otherNationality") ? "true" : undefined}
            />
            {fieldError("otherNationality") ? (
              <p id="reg-other-nationality-error" className="reg-field-error" role="alert">
                {fieldError("otherNationality")}
              </p>
            ) : null}
          </>
        ) : null}
      </fieldset>

      {/* ---- Academic information ---- */}
      <fieldset className="reg-fieldset">
        <legend className="reg-legend">Academic information</legend>

        <label htmlFor="reg-university">University</label>
        <select
          id="reg-university"
          required
          value={form.university}
          onChange={(e) => onChange("university", e.target.value)}
          onBlur={() => onBlur("university")}
          aria-describedby={fieldError("university") ? "reg-university-error" : undefined}
          aria-invalid={fieldError("university") ? "true" : undefined}
        >
          <option value="" disabled>Select…</option>
          {UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {fieldError("university") ? <p id="reg-university-error" className="reg-field-error" role="alert">{fieldError("university")}</p> : null}

        {form.university === "Other" ? (
          <>
            <label htmlFor="reg-other-university">Specify university</label>
            <input
              id="reg-other-university"
              type="text"
              required
              placeholder="Your university or institution"
              value={form.otherUniversity}
              onChange={(e) => onChange("otherUniversity", e.target.value)}
              onBlur={() => onBlur("otherUniversity")}
              aria-describedby={fieldError("otherUniversity") ? "reg-other-university-error" : undefined}
              aria-invalid={fieldError("otherUniversity") ? "true" : undefined}
            />
            {fieldError("otherUniversity") ? (
              <p id="reg-other-university-error" className="reg-field-error" role="alert">
                {fieldError("otherUniversity")}
              </p>
            ) : null}
          </>
        ) : null}

        <label htmlFor="reg-year">Academic year</label>
        <select
          id="reg-year"
          required
          value={form.academicYear}
          onChange={(e) => onChange("academicYear", e.target.value)}
          onBlur={() => onBlur("academicYear")}
          aria-describedby={fieldError("academicYear") ? "reg-year-error" : undefined}
          aria-invalid={fieldError("academicYear") ? "true" : undefined}
        >
          <option value="" disabled>Select…</option>
          {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {fieldError("academicYear") ? <p id="reg-year-error" className="reg-field-error" role="alert">{fieldError("academicYear")}</p> : null}
      </fieldset>

      {submitError ? <p className="reg-submit-error" role="alert">{submitError}</p> : null}

      <button type="submit" className="button" disabled={submitting}>
        <span className="button-label">{submitting ? "Submitting…" : "Register"}</span>
      </button>

      <p className="reg-privacy">We use these details only to organise COMPASS and to contact you about it.</p>
    </form>
  );
}
