// Live external call forms (Tally). Both open in a new tab and are referenced by
// the hero CTAs, the registration page, and the speakers/posters pages, so a URL
// change is a single edit here — nothing else hardcodes a form link.
export type CallForm = { label: string; href: string; blurb: string };

export const organizationCall: CallForm = {
  label: "Organization Call",
  href: "https://tally.so/r/Zjx190",
  blurb: "For teams and societies looking to join the organizing side of COMPASS.",
};

export const speakerPostersCall: CallForm = {
  label: "Speaker / Posters Call",
  href: "https://tally.so/r/RGpJ7P",
  blurb: "For proposed speakers and for student research posters.",
};

export const openCalls: CallForm[] = [organizationCall, speakerPostersCall];

// Key dates for the Speaker / Posters call, exactly as stated on the form.
// The presentation date is deliberately NOT stored here — it is derived from
// `conferenceWindow` in lib/event.ts, so the call notes can never drift out of
// sync with the conference date shown everywhere else on the site.
export const callDeadlines = {
  submissionDeadline: "2026-10-11",
  notificationOfAcceptance: "2026-10-20",
} as const;

export function formatCallDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(parsed);
}
