import { EventWindow } from "@/lib/event";
import { SITE_HOST, SITE_ORIGIN, SITE_TAGLINE } from "@/lib/site";

export function formatUtcDateTime(input: string | Date | number): string {
  const d = input instanceof Date ? input : new Date(input);
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Escapes characters with special meaning in RFC 5545 TEXT values:
 * backslashes, semicolons, commas, and newlines.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Builds a Google Calendar template link from an EventWindow.
 * Start and end dates are formatted in UTC (YYYYMMDDTHHMMSSZ).
 */
export function buildGoogleCalendarUrl(event: EventWindow | null): string | null {
  if (!event) return null;
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const dates = `${formatUtcDateTime(event.startsAt)}/${formatUtcDateTime(event.endsAt)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "COMPASS",
    dates,
    ctz: event.timeZone,
    location: "Faculty of Medicine, Beni Suef National University",
    details: `${SITE_TAGLINE}\n${SITE_ORIGIN}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString().replace(/%2F/gi, "/")}`;
}

/**
 * Generates RFC 5545 iCalendar content string for COMPASS.
 *
 * @param event - The event window defining start, end, and timezone.
 * @param now - Optional reference date/timestamp for DTSTAMP (defaults to current time).
 */
export function generateIcsString(
  event: EventWindow | null,
  now: Date | number | string = new Date()
): string | null {
  if (!event) return null;
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const dtstamp = formatUtcDateTime(now);
  const dtstart = formatUtcDateTime(event.startsAt);
  const dtend = formatUtcDateTime(event.endsAt);
  const uid = `compass-2026@${SITE_HOST}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//COMPASS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText("COMPASS")}`,
    `DESCRIPTION:${escapeIcsText(`${SITE_TAGLINE}\n${SITE_ORIGIN}`)}`,
    `LOCATION:${escapeIcsText("Faculty of Medicine, Beni Suef National University")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
