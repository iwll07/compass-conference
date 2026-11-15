import { test } from "node:test";
import assert from "node:assert/strict";
import { sponsors } from "../lib/sponsors.ts";

test("sponsors data: Mood Digital is listed", () => {
  const mood = sponsors.find((s) => s.id === "mood-digital");
  assert.ok(mood, "Mood Digital must exist in sponsors list");
  assert.equal(mood.name, "Mood Digital");
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

test("sponsors data: Sim Era is listed", () => {
  const sim = sponsors.find((s) => s.id === "sim-era");
  assert.ok(sim, "Sim Era must exist in sponsors list");
  assert.equal(sim.name, "Sim Era");
  assert.equal(sim.tagline, "Medical Simulation & Education Partner of COMPASS 2026");
  assert.equal(sim.logo.src, "/sim-era-logo.png");
  assert.equal(sim.logo.width, 549);
  assert.equal(sim.logo.height, 402);
  assert.equal(sim.logo.alt, "Sim Era logo");
  assert.ok(sim.details, "Sim Era must have details");
  assert.equal(
    sim.summary,
    "Sim Era is an Egyptian medical education specialist established in 2009, providing turnkey medical skill labs, surgical and clinical simulators, anatomical models, plastinated specimens, and interactive anatomy software. Proudly advancing hands-on clinical training at COMPASS 2026."
  );
  assert.deepEqual(
    sim.links?.map((link) => link.kind),
    ["website", "email"]
  );
  assert.equal(sim.links?.[0].href, "https://www.sim-era.com/");
  assert.equal(sim.links?.[1].href, "mailto:info@sim-era.com");
});

test("sponsors data: Beni-Swef Medical Syndicate has links but no description", () => {
  const syndicate = sponsors.find((s) => s.id === "beni-swef-medical-syndicate");
  assert.ok(syndicate, "the syndicate must exist in sponsors list");
  assert.equal(syndicate.name, "Beni-Swef Medical Syndicate");
  assert.equal(syndicate.logo.src, "/beni-swef-medical-syndicate.png");
  assert.equal(syndicate.logo.alt, "Beni-Swef Medical Syndicate logo");
  assert.equal(syndicate.href, null);
  assert.equal(syndicate.tagline, undefined);
  assert.equal(syndicate.summary, undefined);
  assert.equal(syndicate.details, undefined);
  assert.deepEqual(
    syndicate.links?.map((link) => link.kind),
    ["facebook", "location"]
  );
  assert.equal(
    syndicate.links?.[0].href,
    "https://www.facebook.com/share/1RBzviQhJf/"
  );
  assert.equal(
    syndicate.links?.[1].href,
    "https://maps.app.goo.gl/DY6VGfV7ufUTTQEu7"
  );
});

test("sponsors order: declaration order is the display order", () => {
  assert.deepEqual(
    sponsors.map((sponsor) => sponsor.id),
    ["mood-digital", "sim-era", "beni-swef-medical-syndicate"]
  );
});

test("sponsors have no tiers any more", () => {
  for (const sponsor of sponsors) {
    assert.ok(!("tier" in sponsor), `${sponsor.name} must not carry a tier`);
  }
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
    assert.ok(!zeroWidthRegex.test(sponsor.tagline ?? ""), `${sponsor.name} tagline has zero-width char`);

    if (sponsor.details) {
      assert.ok(!zeroWidthRegex.test(sponsor.details.en.title), "en title has zero-width char");
      assert.ok(!zeroWidthRegex.test(sponsor.details.en.intro), "en intro has zero-width char");
      for (const item of sponsor.details.en.items) {
        assert.ok(!zeroWidthRegex.test(item.lead), `en item lead '${item.lead}' has zero-width char`);
        assert.ok(!zeroWidthRegex.test(item.text), "en item text has zero-width char");
      }

      assert.ok(!zeroWidthRegex.test(sponsor.details.ar.title), "ar title has zero-width char");
      assert.ok(!zeroWidthRegex.test(sponsor.details.ar.intro), "ar intro has zero-width char");
      for (const item of sponsor.details.ar.items) {
        assert.ok(!zeroWidthRegex.test(item.lead), `ar item lead '${item.lead}' has zero-width char`);
        assert.ok(!zeroWidthRegex.test(item.text), "ar item text has zero-width char");
      }
    }
  }
});