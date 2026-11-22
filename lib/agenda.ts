// Pure rendering and validation rules for the agenda. No filesystem or DOM
// access here, so this module can be imported by both the page and the tests.
import type { Session, Speaker } from "./content";

const CARD_KINDS = new Set<Session["kind"]>([
  "keynote",
  "panel",
  "workshop",
  "session",
]);
const SPANNING_KINDS = new Set<Session["kind"]>([
  "opening",
  "closing",
  "break",
  "posters",
]);

/** "Prof. Dr. Wael El-Shaer" -> "WE". Honoree prefixes are not initials. */
export function getSpeakerInitials(name: string): string {
  let rest = name.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of ["Prof.", "Dr.", "Eng.", "Prof", "Dr"]) {
      const re = new RegExp(`^${prefix.replace(".", "\\.")}\\s+`, "i");
      if (re.test(rest)) {
        rest = rest.replace(re, "");
        changed = true;
      }
    }
  }
  return rest
    .split(/\s+/)
    .filter((word) => word && !/^[A-Za-z]\.$/.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function isBreak(session: Session): boolean {
  return session.kind === "break";
}

export function isSpeakerCard(session: Session): boolean {
  if (isBreak(session)) return false;
  return session.speakers.length > 0 || CARD_KINDS.has(session.kind);
}

export function isEventBar(session: Session): boolean {
  return !isBreak(session) && !isSpeakerCard(session);
}

export function spansAllHalls(session: Session): boolean {
  return session.hall === null || SPANNING_KINDS.has(session.kind);
}

export type AgendaRow = {
  key: string;
  day: string;
  start: string;
  end: string;
  sessions: Session[];
};

/** Sessions sharing (day, start, end) form one aligned row, in time order. */
export function groupRows(sessions: readonly Session[]): AgendaRow[] {
  const byKey = new Map<string, AgendaRow>();
  for (const session of sessions) {
    const key = `${session.day}|${session.start}|${session.end}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        key,
        day: session.day,
        start: session.start,
        end: session.end,
        sessions: [],
      };
      byKey.set(key, row);
    }
    row.sessions.push(session);
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      a.start.localeCompare(b.start) ||
      a.end.localeCompare(b.end)
  );
}

/** Distinct halls used by parallel sessions on a day, in first-seen order. */
export function hallColumns(
  sessions: readonly Session[],
  day: string
): string[] {
  const halls: string[] = [];
  for (const session of sessions) {
    if (session.day !== day || !session.hall) continue;
    if (!halls.includes(session.hall)) halls.push(session.hall);
  }
  return halls;
}

/** "09:15" -> "9:15 AM", for display. The <time> element keeps the raw value. */
export function formatTime(hhmm: string): string {
  const [rawHour, rawMinute] = hhmm.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return hhmm;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** "2026-11-24" -> "Tuesday, 24 November 2026" (Cairo, no time zone drift). */
export function formatDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns a list of human-readable problems; empty means the schedule is safe
 * to render. Overlap checks only apply to sessions that name a hall: a
 * single-track day (hall = null, as in the current PDF) may deliberately nest
 * a block bar and the talks inside it.
 */
export function validateSchedule(
  sessions: readonly Session[],
  speakers: readonly Speaker[]
): string[] {
  const errors: string[] = [];
  const sessionIds = new Set<string>();
  const speakerIds = new Set<string>();

  for (const speaker of speakers) {
    if (speakerIds.has(speaker.id)) {
      errors.push(`Duplicate speaker id: ${speaker.id}`);
    }
    speakerIds.add(speaker.id);
  }

  for (const session of sessions) {
    if (sessionIds.has(session.id)) {
      errors.push(`Duplicate session id: ${session.id}`);
    }
    sessionIds.add(session.id);

    if (!DAY_RE.test(session.day)) {
      errors.push(`${session.id}: day "${session.day}" must be YYYY-MM-DD`);
    }
    if (!TIME_RE.test(session.start)) {
      errors.push(`${session.id}: start "${session.start}" must be HH:MM (24h)`);
    }
    if (!TIME_RE.test(session.end)) {
      errors.push(`${session.id}: end "${session.end}" must be HH:MM (24h)`);
    }
    if (TIME_RE.test(session.start) && TIME_RE.test(session.end)) {
      if (session.end <= session.start) {
        errors.push(
          `${session.id}: end ${session.end} is not after start ${session.start}`
        );
      }
    }
    for (const id of session.speakers) {
      if (!speakerIds.has(id)) {
        errors.push(`${session.id}: unknown speaker id "${id}"`);
      }
    }
  }

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (a.day !== b.day) continue;
      const overlaps = a.start < b.end && b.start < a.end;
      if (!overlaps || !a.hall || !b.hall) continue;
      if (a.hall === b.hall) {
        errors.push(
          `${a.id} and ${b.id} overlap in hall "${a.hall}" (${a.start}-${a.end} / ${b.start}-${b.end})`
        );
      } else if (a.start !== b.start || a.end !== b.end) {
        errors.push(
          `${a.id} (${a.hall}) and ${b.id} (${b.hall}) overlap with different times, so the matrix would not align`
        );
      }
    }
  }

  return errors;
}
