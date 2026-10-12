// Shared conference/call data.
//
// The Tally call forms closed on 11 October 2026, so the active-call exports
// (`CallForm`, `organizationCall`, `speakerPostersCall`, `openCalls`) are
// RETIRED — nothing in the site links out to a call form any more. What
// remains here is still live:
//   * `callDeadlines` / `formatCallDate` — the timeline shown by
//     components/call-deadlines.tsx on the speakers and posters pages, which
//     stays up so visitors can still see the review/presentation dates.
//   * `lastConference` — the IMPACT links in the homepage callout.
//
// If a call reopens, reintroduce its link data here rather than hardcoding a
// URL in a page: this file is the single place a form link is meant to live.

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

// Links to the previous conference (IMPACT), shown in the homepage "last
// conference" callout. Kept here for the same reason as the call data: one
// place to update a URL, rather than hardcoding it in the page.
export const lastConference = {
  site: "https://impactbsnu.vercel.app/",
  highlights: "https://www.facebook.com/share/v/1DLdXMJnb9/",
} as const;
