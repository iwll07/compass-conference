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

/**
 * The "hero" link target: not a page of its own, but a jump back to the top of
 * the homepage so the reader lands on the hero with the call-to-action buttons
 * in view. It is a first-class link target rather than a link rendered on every
 * announcement, because whether an announcement should point at the open calls
 * is an editorial decision made per item in /admin.
 *
 * The anchor is the hero SECTION, not the CTA row: jumping to the buttons alone
 * clipped the headline and left the page looking broken mid-hero.
 */
export const HERO_LINK_TARGET = "hero" as const;

export const HERO_ANCHOR_ID = "hero";

/**
 * The visible label for this link, defined once because it appears in two
 * independent renderers (the homepage item and the admin live preview) and the
 * two must not be able to drift apart.
 *
 * "Calls open now" rather than "Call buttons": the latter names the mechanic
 * (two buttons) rather than the benefit, and it reads as a label for a UI
 * widget rather than a destination. This wording also matches the vocabulary
 * already used across the site -- `openCalls` in lib/calls.ts, and the
 * "Organization Call" / "Speaker / Posters Call" button labels -- so the
 * announcement points at something the reader has already seen named that way.
 *
 * Deliberately generic enough to cover BOTH open calls: this link appears on
 * whichever announcement opts in to the hero target, so a narrower label like
 * "Submit an abstract" would be actively wrong on an announcement that is not
 * about abstracts.
 */
export const HERO_LINK_LABEL = "Calls open now";

/**
 * Longest editor-supplied label accepted, enforced by the admin input's
 * maxLength and matched by a CSS cap. The label sits in a nowrap flex row, so
 * an unbounded string could push the announcement card into horizontal
 * overflow — which is a real breakage on mobile, not just untidy wrapping.
 */
export const HERO_LINK_LABEL_MAX = 40;

export type LinkTarget = PageRouteKey | "none" | "custom" | typeof HERO_LINK_TARGET;

export const LINK_TARGETS: LinkTarget[] = [...(Object.keys(PAGE_ROUTES) as PageRouteKey[]), HERO_LINK_TARGET, "none", "custom"];

/** True when this announcement's link is the jump back to the hero. */
export function isHeroLink(announcement: Pick<Announcement, "link_target">): boolean {
  return announcement.link_target === HERO_LINK_TARGET;
}

/**
 * The wording for the hero jump: whatever the editor typed, else the default.
 *
 * The admin form reveals a text field when "Open calls" is selected, so each
 * announcement can name its own destination — an abstract call and a poster
 * call are different actions and a single fixed label cannot describe both.
 *
 * Falls back to the default rather than rendering nothing, so clearing the
 * field (or an older row with no link_label yet) still produces a usable link
 * instead of an arrow with no text, which is an accessibility failure.
 *
 * Takes a Partial deliberately: a row published before the link_label migration
 * has no such field at all, so `undefined` is a real runtime input here, not
 * just a type-checking convenience.
 */
export function heroLinkLabel(announcement: Partial<Pick<Announcement, "link_label">>): string {
  return announcement.link_label?.trim() || HERO_LINK_LABEL;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  link_target: LinkTarget;
  custom_url: string | null;
  /**
   * Editor-written wording for the hero jump, e.g. "Submit your abstract".
   * Null means "use the default", so existing rows and non-hero targets need
   * no backfill.
   */
  link_label: string | null;
  published: boolean;
  created_at: string;
}

// Columns the homepage needs. Selecting explicitly (rather than `select("*")`)
// keeps the static-export payload small and makes the RLS interaction obvious.
export const ANNOUNCEMENT_COLUMNS = "id,title,body,category,link_target,custom_url,link_label,published,created_at";

/**
 * True when the text contains Arabic script.
 *
 * Drives the per-item `dir` attribute. This is per ITEM, not per page: an admin
 * will mix English and Arabic announcements in the same table, so the direction
 * has to be decided for each announcement independently.
 *
 * Matches the Arabic Unicode ranges only (not the whole U+0600-U+06FF block,
 * which includes Arabic-Indic digits and punctuation that can legitimately
 * appear inside an otherwise-English announcement).
 */
const ARABIC_SCRIPT = /[\u0621-\u063A\u0641-\u064A\u066E-\u06D3]/;

/**
 * The first strongly-scripted character's script, or null if there is none.
 *
 * Mirrors how a browser resolves `dir="auto"`: the first character with a strong
 * direction decides, and digits/punctuation are skipped. Testing "does this
 * string contain Arabic ANYWHERE" instead would flip an English headline that
 * merely quotes an Arabic phrase in its body.
 */
function firstStrongScript(text: string): "arabic" | "latin" | null {
  for (const char of text) {
    if (ARABIC_SCRIPT.test(char)) return "arabic";
    if (/\p{Script=Latin}/u.test(char)) return "latin";
  }
  return null;
}

/**
 * Whether an announcement should render right-to-left.
 *
 * The title is judged first and on its own, since it is the item's headline: its
 * first strong character decides. If the title carries no strong character at
 * all (a bare number, a URL), the body breaks the tie, and anything still
 * ambiguous stays LTR.
 */
export function isAnnouncementRtl(announcement: Pick<Announcement, "title" | "body">): boolean {
  const title = firstStrongScript(announcement.title ?? "");
  if (title) return title === "arabic";
  return firstStrongScript(announcement.body ?? "") === "arabic";
}

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
  if (announcement.link_target === HERO_LINK_TARGET) {
    // A same-page anchor. `scroll-margin-top` on the hero section (see
    // app/globals.css) keeps the top of the hero clear of the viewport edge.
    return `/#${HERO_ANCHOR_ID}`;
  }
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
