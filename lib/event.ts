export type EventWindow = { startsAt: string; endsAt: string; timeZone: string };
export type EventState = { phase: "unannounced" } | { phase: "live" } | { phase: "ended" } | { phase: "upcoming"; days: number; hours: number; minutes: number; seconds: number };

export const conferenceWindow: EventWindow | null = {
  startsAt: "2026-11-25T09:00:00+02:00",
  endsAt: "2026-11-25T17:00:00+02:00",
  timeZone: "Africa/Cairo",
};

export function formatEventWindow(event: EventWindow | null): string | null {
  if (!event) return null;
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  try {
    const date = new Intl.DateTimeFormat("en-GB", { timeZone: event.timeZone, dateStyle: "long" }).format(new Date(start));
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: event.timeZone, hour: "2-digit", minute: "2-digit" });
    return `${date}, ${time.format(new Date(start))}–${time.format(new Date(end))} ${event.timeZone}`;
  } catch {
    return null;
  }
}

export function getEventState(event: EventWindow | null, now: number): EventState {
  if (!event || !Number.isFinite(now)) return { phase: "unannounced" };
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/;
  if (!zoned.test(event.startsAt) || !zoned.test(event.endsAt)) return { phase: "unannounced" };
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { phase: "unannounced" };
  try { new Intl.DateTimeFormat("en", { timeZone: event.timeZone }); } catch { return { phase: "unannounced" }; }
  if (now >= end) return { phase: "ended" };
  if (now >= start) return { phase: "live" };
  const remaining = Math.ceil((start - now) / 1000);
  return { phase: "upcoming", days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24, minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60 };
}
