import { EventWindow } from "@/lib/event";
import { SITE_ORIGIN, SITE_TAGLINE } from "@/lib/site";

export function formatUtcDateTime(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
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
 */
export function generateIcsString(event: EventWindow | null): string | null {
  if (!event) return null;
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const dtstart = formatUtcDateTime(event.startsAt);
  const dtend = formatUtcDateTime(event.endsAt);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//COMPASS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    "SUMMARY:COMPASS",
    `DESCRIPTION:${SITE_TAGLINE}\\n${SITE_ORIGIN}`,
    "LOCATION:Faculty of Medicine\\, Beni Suef National University",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
