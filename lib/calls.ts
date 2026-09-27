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
