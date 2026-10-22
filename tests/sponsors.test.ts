import { test } from "node:test";
import assert from "node:assert/strict";
import { sponsors, sortSponsors, Sponsor } from "../lib/sponsors.ts";

test("sponsors data: Mood Digital is present as Diamond partner", () => {
  const mood = sponsors.find((s) => s.id === "mood-digital");
  assert.ok(mood, "Mood Digital must exist in sponsors list");
  assert.equal(mood.name, "Mood Digital");
  assert.equal(mood.tier, "diamond");
  assert.equal(mood.tagline, "Official Technology Partner of COMPASS 2026");
  assert.equal(mood.logo.src, "/mood-digital-logo.png");
  assert.equal(mood.logo.width, 487);
  assert.equal(mood.logo.height, 513);
  assert.ok(mood.details, "Mood Digital must have details");
  assert.equal(
    mood.summary,
    "Mood Digital is a custom software and digital systems agency specializing in high-performance web applications, automated event & QR check-in ecosystems, clinic management dashboards, and e-learning platforms. Proudly powering the digital experience of COMPASS 2026."
  );
});

test("sponsors sorting: diamond -> gold -> silver, then by name", () => {
  const unsorted: Sponsor[] = [
    {
      id: "silver-z",
      name: "Zeta Silver",
      tier: "silver",
      logo: { src: "/test.png", width: 100, height: 100, alt: "Zeta" },
      href: null,
      tagline: "Silver sponsor",
    },
    {
      id: "gold-b",
      name: "Beta Gold",
      tier: "gold",
      logo: { src: "/test.png", width: 100, height: 100, alt: "Beta" },
      href: null,
      tagline: "Gold sponsor",
    },
    {
      id: "diamond-b",
      name: "Bravo Diamond",
      tier: "diamond",
      logo: { src: "/test.png", width: 100, height: 100, alt: "Bravo" },
      href: null,
      tagline: "Diamond sponsor",
    },
    {
      id: "gold-a",
      name: "Alpha Gold",
      tier: "gold",
      logo: { src: "/test.png", width: 100, height: 100, alt: "Alpha" },
      href: null,
      tagline: "Gold sponsor",
    },
    {
      id: "silver-a",
      name: "Alpha Silver",
      tier: "silver",
      logo: { src: "/test.png", width: 100, height: 100, alt: "Alpha Silver" },
      href: null,
      tagline: "Silver sponsor",
    },
    {
      id: "diamond-a",
      name: "Alpha Diamond",
      tier: "diamond",
      logo: { src: "/test.png", width: 100, height: 100, alt: "Alpha Diamond" },
      href: null,
      tagline: "Diamond sponsor",
    },
  ];

  const sorted = sortSponsors(unsorted);
  const ids = sorted.map((s) => s.id);
  assert.deepEqual(ids, [
    "diamond-a",
    "diamond-b",
    "gold-a",
    "gold-b",
    "silver-a",
    "silver-z",
  ]);
});

test("sponsors details: every sponsor with details has both en and ar locales", () => {
  for (const sponsor of sponsors) {
    if (!sponsor.details) continue;

    assert.ok(sponsor.details.en, `${sponsor.name} must have 'en' details`);
    assert.ok(sponsor.details.ar, `${sponsor.name} must have 'ar' details`);

    // en details check
    assert.ok(sponsor.details.en.title.trim().length > 0, `${sponsor.name} en title must not be empty`);
    assert.ok(sponsor.details.en.intro.trim().length > 0, `${sponsor.name} en intro must not be empty`);
    assert.ok(sponsor.details.en.items.length > 0, `${sponsor.name} en items must not be empty`);
    for (const item of sponsor.details.en.items) {
      assert.ok(item.lead.trim().length > 0, `${sponsor.name} en item lead must not be empty`);
      assert.ok(item.text.trim().length > 0, `${sponsor.name} en item text must not be empty`);
    }

    // ar details check
    assert.ok(sponsor.details.ar.title.trim().length > 0, `${sponsor.name} ar title must not be empty`);
    assert.ok(sponsor.details.ar.intro.trim().length > 0, `${sponsor.name} ar intro must not be empty`);
    assert.ok(sponsor.details.ar.items.length > 0, `${sponsor.name} ar items must not be empty`);
    for (const item of sponsor.details.ar.items) {
      assert.ok(item.lead.trim().length > 0, `${sponsor.name} ar item lead must not be empty`);
      assert.ok(item.text.trim().length > 0, `${sponsor.name} ar item text must not be empty`);
    }
  }
});

test("sponsors links: all links are valid https: or mailto: URLs", () => {
  for (const sponsor of sponsors) {
    if (!sponsor.links) continue;

    for (const link of sponsor.links) {
      const isHttps = link.href.startsWith("https://");
      const isMailto = link.href.startsWith("mailto:");
      assert.ok(
        isHttps || isMailto,
        `${sponsor.name} link ${link.kind} must start with https:// or mailto: (was: ${link.href})`
      );

      if (isHttps) {
        assert.doesNotThrow(() => new URL(link.href), `${link.href} must be a valid URL`);
      }
    }
  }
});

test("sponsors text: zero-width characters do not exist in any sponsor text", () => {
  const zeroWidthRegex = /[\u200B-\u200D\uFEFF]/;

  for (const sponsor of sponsors) {
    assert.ok(!zeroWidthRegex.test(sponsor.name), `${sponsor.name} name has zero-width char`);
    assert.ok(!zeroWidthRegex.test(sponsor.tagline), `${sponsor.name} tagline has zero-width char`);

    if (sponsor.details) {
      assert.ok(!zeroWidthRegex.test(sponsor.details.en.title), "en title has zero-width char");
      assert.ok(!zeroWidthRegex.test(sponsor.details.en.intro), "en intro has zero-width char");
      for (const item of sponsor.details.en.items) {
        assert.ok(!zeroWidthRegex.test(item.lead), `en item lead '${item.lead}' has zero-width char`);
        assert.ok(!zeroWidthRegex.test(item.text), `en item text has zero-width char`);
      }

      assert.ok(!zeroWidthRegex.test(sponsor.details.ar.title), "ar title has zero-width char");
      assert.ok(!zeroWidthRegex.test(sponsor.details.ar.intro), "ar intro has zero-width char");
      for (const item of sponsor.details.ar.items) {
        assert.ok(!zeroWidthRegex.test(item.lead), `ar item lead '${item.lead}' has zero-width char`);
        assert.ok(!zeroWidthRegex.test(item.text), `ar item text has zero-width char`);
      }
    }
  }
});
