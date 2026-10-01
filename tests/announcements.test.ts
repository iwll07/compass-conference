import { test } from "node:test";
import assert from "node:assert/strict";
import { announcementHref, formatAnnouncementDate, isAnnouncementRtl, isHeroLink, heroLinkLabel, HERO_LINK_LABEL, HERO_LINK_LABEL_MAX } from "../lib/announcements.ts";

const rtl = (title: string, body = "") => isAnnouncementRtl({ title, body });

test("Arabic title makes the item RTL", () => {
  assert.equal(rtl("جديد"), true);
  assert.equal(rtl("Registration opens 1 October"), false);
});

test("an Arabic body decides direction only when the title is script-neutral", () => {
  // Title is Arabic even though the body is English: the title wins.
  assert.equal(rtl("جديد", "Poster guidelines"), true);
  // Title has no strong script, so the body decides.
  assert.equal(rtl("2026", "الدليل الجديد"), true);
  // Title is clearly English, so an Arabic body must NOT flip the item.
  assert.equal(rtl("Posters", "اقرأ الدليل هنا"), false);
});

test("URLs and bare numbers stay LTR rather than flipping on punctuation", () => {
  assert.equal(rtl("https://example.com/x"), false);
  assert.equal(rtl("2026"), false);
  assert.equal(rtl(""), false);
});

test("custom_url only ever yields absolute http(s) hrefs", () => {
  const base = { link_target: "custom", custom_url: null } as const;
  // javascript: is the stored-XSS case RLS cannot catch, so it must be dropped.
  assert.equal(announcementHref({ ...base, custom_url: "javascript:alert(1)" }), null);
  assert.equal(announcementHref({ ...base, custom_url: "data:text/html,<script>" }), null);
  assert.equal(announcementHref({ ...base, custom_url: "  " }), null);
  assert.equal(announcementHref({ ...base, custom_url: "not a url" }), null);
  assert.equal(announcementHref({ ...base, custom_url: "https://example.com/a" }), "https://example.com/a");
  // Internal page links resolve from the frozen route map and ignore custom_url.
  assert.equal(announcementHref({ link_target: "speakers", custom_url: "javascript:alert(1)" }), "/speakers");
  assert.equal(announcementHref({ link_target: "none", custom_url: "https://example.com" }), null);
});

test("the hero target resolves to the homepage hero anchor", () => {
  // An announcement opted into the "Calls open now" jump. It must land on the hero
  // SECTION (so the whole hero is visible), not on the CTA row mid-page.
  assert.equal(announcementHref({ link_target: "hero", custom_url: null }), "/#hero");
  assert.equal(isHeroLink({ link_target: "hero" }), true);
  // The jump is a same-page fragment, so a stray custom_url must not leak into it.
  assert.equal(announcementHref({ link_target: "hero", custom_url: "https://evil.example" }), "/#hero");
  // Every other target is not a hero jump, so those items keep "Learn more".
  assert.equal(isHeroLink({ link_target: "registration" }), false);
  assert.equal(isHeroLink({ link_target: "none" }), false);
  assert.equal(isHeroLink({ link_target: "custom" }), false);
});

test("the editor's own wording wins over the default label", () => {
  // An editor can name the destination per announcement ("Submit your abstract")
  // because one fixed phrase cannot describe both open calls.
  assert.equal(heroLinkLabel({ link_label: "Submit your abstract" }), "Submit your abstract");

  // Surrounding whitespace must never reach the page — it would render as a
  // leading gap before the text.
  assert.equal(heroLinkLabel({ link_label: "  Post your poster  " }), "Post your poster");

  // Falling back rather than rendering nothing: an arrow with no text is an
  // accessibility failure, so a blank, null, or undefined label all yield the
  // default. This also covers rows written before link_label existed.
  assert.equal(heroLinkLabel({ link_label: null }), HERO_LINK_LABEL);
  assert.equal(heroLinkLabel({ link_label: "" }), HERO_LINK_LABEL);
  assert.equal(heroLinkLabel({ link_label: "   " }), HERO_LINK_LABEL);
  assert.equal(heroLinkLabel({}), HERO_LINK_LABEL);

  // The default itself stays readable as a label, and the cap on editor text
  // is long enough for a real phrase but short enough to prevent the card
  // overflowing horizontally (see the .announcement-up rule).
  assert.ok(HERO_LINK_LABEL.length > 0);
  assert.ok(HERO_LINK_LABEL.length <= HERO_LINK_LABEL_MAX);
  assert.equal(HERO_LINK_LABEL_MAX, 40);
});

test("announcement date formats as an uppercase stamp", () => {
  assert.equal(formatAnnouncementDate("2026-10-01T09:00:00Z"), "1 OCT 2026");
  assert.equal(formatAnnouncementDate("not-a-date"), null);
});
