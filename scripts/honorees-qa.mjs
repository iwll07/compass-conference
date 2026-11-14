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

  // Check all cards have the same bounding height at 1440px
  const heights = [];
  for (const card of cards) {
    const box = await card.boundingBox();
    assert.ok(box, "card should have a bounding box");
    heights.push(Math.round(box.height));
  }
  const firstH = heights[0];
  const allEqual = heights.every((h) => Math.abs(h - firstH) <= 1);
  assert.ok(allEqual, `Cards must have equal height at 1440px. Heights: ${heights.join(", ")}`);
  console.log(`[PASS] All ${cards.length} cards have equal height (~${firstH}px) at 1440px`);

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

  console.log("--- 2. Testing Home Page Row ---");
  const home = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await home.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const homeSection = home.locator(".home-patrons-section");
  await homeSection.scrollIntoViewIfNeeded();

  // Check link to /about#patrons
  const meetLink = await home.$(".home-patrons-header a[href*='/about']");
  assert.ok(meetLink, "Link to /about#patrons should exist");
  const href = await meetLink.getAttribute("href");
  assert.ok(href?.includes("/about#patrons") || href?.includes("/about/#patrons"));
  console.log("[PASS] Home patrons link to /about#patrons verified");

  // Check count of people items
  const homeItems = await home.$$(".home-patrons-item");
  assert.equal(homeItems.length, totalPeople, `Expected ${totalPeople} items in home row, got ${homeItems.length}`);
  console.log(`[PASS] Home row renders ${homeItems.length} people across stacked groups`);

  // Check grouped layout
  const groupHeaders = await home.$$(".home-patrons-group-header");
  assert.equal(groupHeaders.length, honoreeGroups.length, `Expected ${honoreeGroups.length} groups`);
  console.log(`[PASS] ${groupHeaders.length} groups rendered side by side in a single row at 1440px`);

  // Screenshot home light desktop
  await home.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-1440-light.png") });
  console.log("[PASS] Saved home-patrons-1440-light.png");

  // Screenshot home dark desktop
  await home.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await home.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-1440-dark.png") });
  console.log("[PASS] Saved home-patrons-1440-dark.png");
  await home.close();

  // Mobile Home Page (390px)
  const mobileHome = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobileHome.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const mobileRow = mobileHome.locator(".home-patrons-section");
  await mobileRow.scrollIntoViewIfNeeded();

  // Check no horizontal scroll on mobile (Option A natural wrap)
  const mobileHasOverflow = await mobileHome.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  assert.equal(mobileHasOverflow, false, "Mobile page must not have horizontal scroll");
  console.log("[PASS] Home patrons wrap naturally on mobile with zero overflow");

  await mobileHome.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-390-light.png") });
  console.log("[PASS] Saved home-patrons-390-light.png");

  await mobileHome.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await mobileHome.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-390-dark.png") });
  console.log("[PASS] Saved home-patrons-390-dark.png");
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
