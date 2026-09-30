import { test } from "node:test";
import assert from "node:assert/strict";
import { announcementHref, formatAnnouncementDate, isAnnouncementRtl } from "../lib/announcements.ts";

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

test("announcement date formats as an uppercase stamp", () => {
  assert.equal(formatAnnouncementDate("2026-10-01T09:00:00Z"), "1 OCT 2026");
  assert.equal(formatAnnouncementDate("not-a-date"), null);
});
