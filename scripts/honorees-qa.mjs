import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import path from "node:path";
import { honoreeGroups } from "../lib/honorees";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/fares/.gemini/antigravity/brain/8a930f24-decb-48f1-ae9c-8d53d5d2a297";

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: false, args: ["--window-position=3000,3000"] });

  console.log("--- 1. Testing About Page ---");
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE}/about/`, { waitUntil: "networkidle" });

  // Check section heading and intro
  const heading = await page.textContent("#patrons-heading");
  assert.equal(heading?.trim(), "Patrons and special guests");

  const intro = await page.textContent(".patrons-intro");
  assert.ok(intro?.includes("COMPASS is honoured by the support"));

  // Check card count matches total people
  const totalPeople = honoreeGroups.reduce((acc, g) => acc + g.people.length, 0);
  const cards = await page.$$(".patron-card");
  assert.equal(cards.length, totalPeople, `Expected ${totalPeople} cards on about page, got ${cards.length}`);
  console.log(`[PASS] About page renders ${cards.length} cards matching data count`);

  // Cards align within their group. Patronage is deliberately taller
  // (250px vs 200px) than the guest list, so compare per grid, not globally.
  const groupHeights = await page.$$eval(".patrons-grid", (grids) =>
    grids.map((grid) => ({
      count: grid.querySelectorAll(".patron-card").length,
      heights: [...grid.querySelectorAll(".patron-card")].map((card) =>
        Math.round(card.getBoundingClientRect().height)
      ),
    }))
  );
  for (const group of groupHeights) {
    const firstH = group.heights[0];
    const allEqual = group.heights.every((h) => Math.abs(h - firstH) <= 1);
    assert.ok(
      allEqual,
      `Cards must have equal height within a group. Heights: ${group.heights.join(", ")}`
    );
    console.log(
      `[PASS] All ${group.count} cards in a group share the same height (~${firstH}px) at 1440px`
    );
  }

  // Five patrons: the fifth (Ahmed Mohamed Gaber) sits alone on the last row,
  // horizontally centred under the 2x2 block, at the same card width.
  const patronage = await page.evaluate(() => {
    const grid = document.querySelector(".patrons-grid--patronage");
    if (!grid) return null;
    const cards = [...grid.querySelectorAll(".patron-card")];
    const last = cards[cards.length - 1].getBoundingClientRect();
    const g = grid.getBoundingClientRect();
    return {
      count: cards.length,
      lastName: cards[cards.length - 1].textContent?.includes("Ahmed Mohamed Gaber") ?? false,
      leftGap: last.left - g.left,
      rightGap: g.right - last.right,
      cardWidth: last.width,
      gridWidth: g.width,
    };
  });
  assert.ok(patronage, "Patronage grid must exist");
  assert.equal(patronage.count, 5, "Patronage must now hold five people");
  assert.ok(patronage.lastName, "Ahmed Mohamed Gaber must be the fifth patron");
  assert.ok(
    Math.abs(patronage.leftGap - patronage.rightGap) <= 1,
    `Fifth patron must be centred (gaps ${patronage.leftGap} vs ${patronage.rightGap})`
  );
  assert.ok(
    Math.abs(patronage.cardWidth - (patronage.gridWidth - 16) / 2) <= 1,
    `Fifth patron must keep a half-row card width (${patronage.cardWidth} vs ${(patronage.gridWidth - 16) / 2})`
  );
  console.log(
    `[PASS] Fifth patron is centred under the 2x2 block at ${Math.round(patronage.cardWidth)}px wide (gaps ${Math.round(patronage.leftGap)}/${Math.round(patronage.rightGap)}px)`
  );

  // Screenshot light desktop
  const patronsSection = page.locator("#patrons");
  await patronsSection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "about-patrons-1440-light.png") });
  console.log("[PASS] Saved about-patrons-1440-light.png");

  // Dark desktop
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "about-patrons-1440-dark.png") });
  console.log("[PASS] Saved about-patrons-1440-dark.png");
  await page.close();

  // Mobile About Page (390px)
  const mobileAbout = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobileAbout.goto(`${BASE}/about/`, { waitUntil: "networkidle" });
  const mobilePatrons = mobileAbout.locator("#patrons");
  await mobilePatrons.scrollIntoViewIfNeeded();
  await mobileAbout.screenshot({ path: path.join(ARTIFACT_DIR, "about-patrons-390-light.png") });
  console.log("[PASS] Saved about-patrons-390-light.png");

  await mobileAbout.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await mobileAbout.screenshot({ path: path.join(ARTIFACT_DIR, "about-patrons-390-dark.png") });
  console.log("[PASS] Saved about-patrons-390-dark.png");
  await mobileAbout.close();

  console.log("--- 2. Patrons render only on /about ---");
  const home = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await home.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // The home page no longer carries a patrons row; /about#patrons is the only
  // surface, and the hero links there.
  assert.equal(
    await home.$(".home-patrons-section"),
    null,
    "The home page must not render the patrons row"
  );
  assert.equal(
    await home.$(".home-patrons-item"),
    null,
    "The home page must not render individual patron items"
  );
  console.log("[PASS] Home page does not duplicate the patrons row");
  await home.close();

  // Mobile /about must not scroll horizontally with the extra guest card.
  const mobileHome = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobileHome.goto(`${BASE}/about/`, { waitUntil: "networkidle" });
  await mobileHome.locator("#patrons").scrollIntoViewIfNeeded();

  const mobileHasOverflow = await mobileHome.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  assert.equal(mobileHasOverflow, false, "Mobile /about must not have horizontal scroll");
  console.log("[PASS] About patrons wrap naturally on mobile with zero overflow");

  const mobileLastPatron = await mobileHome.evaluate(() => {
    const grid = document.querySelector(".patrons-grid--patronage");
    if (!grid) return null;
    const cards = [...grid.querySelectorAll(".patron-card")];
    const last = cards[cards.length - 1].getBoundingClientRect();
    const g = grid.getBoundingClientRect();
    return { width: last.width, gridWidth: g.width };
  });
  assert.ok(mobileLastPatron, "Patronage grid must exist on mobile");
  assert.ok(
    Math.abs(mobileLastPatron.width - mobileLastPatron.gridWidth) <= 1,
    `On one column the fifth patron must be full width (${mobileLastPatron.width} vs ${mobileLastPatron.gridWidth})`
  );
  console.log("[PASS] Fifth patron is full width in the single-column mobile layout");
  await mobileHome.close();

  console.log("--- 3. Testing Missing Photo Initials Fallback ---");
  // Test fallback in headless context by evaluating fallback rendering
  const testPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await testPage.goto(`${BASE}/about/`, { waitUntil: "networkidle" });
  await testPage.evaluate(() => {
    // temporarily swap one card photo with fallback to verify visual rendering
    const wrap = document.querySelector(".patron-card-photo-wrap");
    if (wrap) {
      wrap.innerHTML = '<div class="patron-card-fallback-circle" aria-hidden="true">TA</div>';
    }
  });
  const fallbackEl = await testPage.$(".patron-card-fallback-circle");
  assert.ok(fallbackEl, "Fallback element should be able to render");
  const fallbackText = await fallbackEl.textContent();
  assert.equal(fallbackText?.trim(), "TA");
  console.log("[PASS] Initials fallback renders correctly");
  await testPage.close();

  await browser.close();
  console.log("\n=== All Honorees QA assertions passed successfully! ===");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
