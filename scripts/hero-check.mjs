import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
mkdirSync(".playwright-cli/qa", { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const results = [];

async function heroShot(tag) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (tag === "dark") await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);
  const bg = await page.evaluate(() => {
    const el = document.querySelector(".hero-bg");
    const scrim = getComputedStyle(el, "::after").backgroundColor;
    const cs = getComputedStyle(document.querySelector(".hero-photo"));
    const img = new Image();
    img.src = "/college.jpeg";
    return { loaded: el.offsetWidth > 0, scrim, minHeight: cs.minHeight, centered: getComputedStyle(document.querySelector(".hero-photo")).textAlign, h1Color: getComputedStyle(document.querySelector(".hero h1")).color };
  });
  const img = await page.request.get(BASE + "/college.jpeg");
  await page.screenshot({ path: `.playwright-cli/qa/hero-${tag}.png` });
  results.push({ tag, ...bg, imageStatus: img.status() });
  await context.close();
}

await heroShot("light");
await heroShot("dark");

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
await mpage.goto(BASE + "/", { waitUntil: "networkidle" });
await mpage.screenshot({ path: ".playwright-cli/qa/hero-mobile.png" });
results.push({ tag: "mobile", heroVisible: await mpage.locator(".hero-photo").isVisible() });
await mobile.close();

await browser.close();
console.log(JSON.stringify(results, null, 2));
