// Single source of truth for the announcements feature, shared by the homepage
// renderer (components/announcements.tsx) and the admin form (app/admin/page.tsx).
// Both the category dropdown and the homepage renderer label items from
// CATEGORY_LABELS, so a category can never render under two different names.

export const CATEGORY_LABELS = {
  registration: "Registration",
  speakers: "Speakers",
  agenda: "Agenda",
  sponsors: "Sponsors",
  posters: "Posters",
  general: "General",
} as const;

// Order drives the <select> option order; keep it aligned with the enum.
export const CATEGORIES = [
  "registration",
  "speakers",
  "agenda",
  "sponsors",
  "posters",
  "general",
] as const;

export type AnnouncementCategory = (typeof CATEGORIES)[number];

// Internal page an announcement can point at. NOTE: 'general' is deliberately
// NOT a valid link target — it is a catch-all bucket, not a page.
export const PAGE_ROUTES = {
  registration: "/registration",
  speakers: "/speakers",
  agenda: "/agenda",
  sponsors: "/sponsors",
  posters: "/posters",
} as const;

export type PageRouteKey = keyof typeof PAGE_ROUTES;

export type LinkTarget = PageRouteKey | "none" | "custom";

export const LINK_TARGETS: LinkTarget[] = [...Object.keys(PAGE_ROUTES) as PageRouteKey[], "none", "custom"];

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  link_target: LinkTarget;
  custom_url: string | null;
  published: boolean;
  created_at: string;
}

// Columns the homepage needs. Selecting explicitly (rather than `select("*")`)
// keeps the static-export payload small and makes the RLS interaction obvious.
export const ANNOUNCEMENT_COLUMNS = "id,title,body,category,link_target,custom_url,published,created_at";

/**
 * Resolve an announcement's outbound href, or null when it has no link.
 *
 * custom_url is admin-supplied free text, so it is validated rather than
 * trusted: only absolute http(s) URLs are allowed. Without this check a stored
 * `javascript:` (or `data:`) URL would be handed to href and would execute on
 * click — a stored-XSS vector that RLS does not protect against, because the
 * row itself is perfectly legal to write. Internal page links come from the
 * frozen PAGE_ROUTES map and are always safe.
 */
export function announcementHref(announcement: Pick<Announcement, "link_target" | "custom_url">): string | null {
  if (announcement.link_target === "none") return null;
  if (announcement.link_target === "custom") {
    const raw = (announcement.custom_url ?? "").trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  }
  return PAGE_ROUTES[announcement.link_target] ?? null;
}

/**
 * "1 OCT 2026" — the small all-caps stamp next to the category label.
 *
 * Pinned to Africa/Cairo (the conference's own time zone, same constant the
 * rest of the site uses) so the rendered day is stable regardless of the
 * visitor's locale: an admin posting at 01:00 Cairo time and a reader in
 * Europe would otherwise disagree about which day an announcement belongs to.
 */
export function formatAnnouncementDate(iso: string, timeZone = "Africa/Cairo"): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric" }).format(new Date(ms)).toUpperCase();
  } catch {
    return null;
  }
}
