import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });

for (const [label, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: label === "desktop" ? 2 : 2, colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(BASE + "/about/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const section = document.querySelector("#patrons");
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - 80);
  });
  await page.waitForTimeout(500);
  // Walk the section so every staggered card has crossed the observer.
  const height = await page.evaluate(() => document.querySelector("#patrons").getBoundingClientRect().height);
  for (let y = 0; y < height; y += viewport.height * 0.5) {
    await page.evaluate((step) => window.scrollBy(0, step), viewport.height * 0.5);
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => {
    const section = document.querySelector("#patrons");
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - 80);
  });
  await page.waitForTimeout(900);
  await page.locator("#patrons").screenshot({ path: `.playwright-cli/qa/patrons-${label}.png` });

  if (label === "desktop") {
    await page.locator(".patrons-grid--patronage").screenshot({ path: ".playwright-cli/qa/patrons-patronage.png" });
    await page.locator(".patrons-grid:not(.patrons-grid--patronage)").screenshot({ path: ".playwright-cli/qa/patrons-guests.png" });
  }
  await context.close();
}

await browser.close();
