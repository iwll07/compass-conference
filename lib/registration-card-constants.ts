// Shared layout constants between HTML attendee card and native canvas image exporter.
// Single source of truth to ensure image export cannot drift from the HTML card.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export const CARD_COLORS = {
  bg: "#ffffff",
  ink: "#082a4b",
  muted: "#526570",
  accent: "#06797f",
  accentSoft: "#d9edee",
  line: "#ccd7d4",
} as const;

export const CARD_LABELS = {
  badge: "REGISTERED",
  venue: "Faculty of Medicine, Beni Suef National University",
  exportFilename: "compass-attendee-card.png",
} as const;
