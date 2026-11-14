import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/fares/.gemini/antigravity/brain/8a930f24-decb-48f1-ae9c-8d53d5d2a297";

async function run() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    args: ["--window-position=3000,3000"],
  });

  console.log("=== Testing Home Patrons Row ===");

  // 1. Desktop 1440px
  console.log("\n--- Viewport 1440px ---");
  const p1440 = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p1440.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const section1440 = p1440.locator(".home-patrons-section");
  await section1440.scrollIntoViewIfNeeded();

  const box1440 = await section1440.boundingBox();
  assert.ok(box1440, "Section bounding box must exist");
  console.log(`Band height at 1440px: ${Math.round(box1440.height)}px (target: <= 280px)`);
  assert.ok(box1440.height <= 285, `Band height at 1440px must be <= 280px (got ${Math.round(box1440.height)}px)`);

  // Verify single row layout at 1440px: all 7 people are aligned horizontally (same Y center within ~2px)
  const items1440 = await p1440.$$(".home-patrons-item");
  assert.equal(items1440.length, 7, "Expected 7 items");
  const yTops = [];
  for (const item of items1440) {
    const b = await item.boundingBox();
    assert.ok(b);
    yTops.push(Math.round(b.y));
  }
  const maxYDiff = Math.max(...yTops) - Math.min(...yTops);
  console.log(`Item vertical alignment difference across groups: ${maxYDiff}px`);
  assert.ok(maxYDiff <= 3, `All 7 items must be on a single horizontal row at 1440px (diff: ${maxYDiff}px)`);

  // Verify names font size and 2 lines reserved
  const textProps1440 = await p1440.evaluate(() => {
    const nameEl = document.querySelector(".home-patrons-name");
    const roleEl = document.querySelector(".home-patrons-role");
    const ringEl = document.querySelector(".home-patrons-portrait-ring");
    return {
      nameFontSize: window.getComputedStyle(nameEl).fontSize,
      roleFontSize: window.getComputedStyle(roleEl).fontSize,
      ringSize: window.getComputedStyle(ringEl).width,
    };
  });
  console.log("Text & ring specs at 1440px:", textProps1440);
  assert.equal(textProps1440.nameFontSize, "14.5px", "Name font size must be 14.5px");
  assert.equal(textProps1440.roleFontSize, "12.5px", "Role font size must be 12.5px");
  assert.equal(textProps1440.ringSize, "72px", "Portrait ring must be 72px");

  // Screenshot light desktop
  await p1440.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-1440-light.png") });
  console.log("[PASS] Saved home-patrons-1440-light.png");

  // Screenshot dark desktop
  await p1440.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await p1440.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-1440-dark.png") });
  console.log("[PASS] Saved home-patrons-1440-dark.png");
  await p1440.close();

  // 2. Medium 900px
  console.log("\n--- Viewport 900px ---");
  const p900 = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await p900.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const section900 = p900.locator(".home-patrons-section");
  await section900.scrollIntoViewIfNeeded();

  const box900 = await section900.boundingBox();
  assert.ok(box900);
  console.log(`Band height at 900px: ${Math.round(box900.height)}px (target: <= 400px)`);
  assert.ok(box900.height <= 400, `Band height at 900px must be <= 400px (got ${Math.round(box900.height)}px)`);

  const ringSize900 = await p900.evaluate(() => {
    const ringEl = document.querySelector(".home-patrons-portrait-ring");
    return window.getComputedStyle(ringEl).width;
  });
  console.log(`Portrait ring size at 900px: ${ringSize900} (target: 64px)`);
  assert.equal(ringSize900, "64px", "Portrait ring must be 64px at 900px");

  await p900.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-900-light.png") });
  console.log("[PASS] Saved home-patrons-900-light.png");
  await p900.close();

  // 3. Mobile 390px
  console.log("\n--- Viewport 390px ---");
  const p390 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p390.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const section390 = p390.locator(".home-patrons-section");
  await section390.scrollIntoViewIfNeeded();

  // Verify page itself never scrolls sideways
  const pageOverflow = await p390.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log(`Page has horizontal overflow: ${pageOverflow}`);
  assert.equal(pageOverflow, false, "Page itself must NEVER scroll sideways");

  // Verify scroll container attributes
  const scrollAttrs = await p390.evaluate(() => {
    const el = document.querySelector(".home-patrons-scroll");
    return {
      tabIndex: el.getAttribute("tabindex"),
      ariaLabel: el.getAttribute("aria-label"),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      isScrollable: el.scrollWidth > el.clientWidth,
    };
  });
  console.log("Scroll container at 390px:", scrollAttrs);
  assert.equal(scrollAttrs.tabIndex, "0", "Scroll container must have tabindex=0");
  assert.ok(scrollAttrs.ariaLabel?.length > 0, "Scroll container must have aria-label");
  assert.equal(scrollAttrs.isScrollable, true, "Scroll container must be horizontally scrollable");

  await p390.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-390-light.png") });
  console.log("[PASS] Saved home-patrons-390-light.png");

  await p390.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await p390.screenshot({ path: path.join(ARTIFACT_DIR, "home-patrons-390-dark.png") });
  console.log("[PASS] Saved home-patrons-390-dark.png");
  await p390.close();

  await browser.close();
  console.log("\n=== Home patrons QA complete! ===");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
