// PLACEHOLDER — replace with the real form URLs when they arrive.
// Both hero CTAs and the registration page point at these, so the swap is a
// single edit here; nothing else hardcodes a form URL.
export type CallForm = { label: string; href: string; blurb: string };

export const organizationCall: CallForm = {
  label: "Organization Call",
  href: "https://forms.example.com/organization-call",
  blurb: "For teams and societies looking to join the organizing side of COMPASS.",
};

export const speakerPostersCall: CallForm = {
  label: "Speaker / Posters Call",
  href: "https://forms.example.com/speaker-posters-call",
  blurb: "For proposed speakers and for student research posters.",
};

export const openCalls: CallForm[] = [organizationCall, speakerPostersCall];
