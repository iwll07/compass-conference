import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
mkdirSync(".playwright-cli/qa", { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const results = [];

async function logoShot(tag, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const failed = [];
  page.on("requestfailed", (r) => failed.push(r.url()));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (tag === "dark") await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const header = await page.evaluate(() => {
    const img = document.querySelector(".wordmark img");
    const r = img?.getBoundingClientRect();
    return img ? { src: img.currentSrc, naturalWidth: img.naturalWidth, w: Math.round(r.width), h: Math.round(r.height) } : null;
  });
  const footer = await page.evaluate(() => {
    const img = document.querySelector(".footer-brand img");
    return img ? { naturalWidth: img.naturalWidth, visible: img.offsetWidth > 0 } : null;
  });
  const favicon = await page.evaluate(() => !!document.querySelector('link[rel="icon"]'));
  const logoReq = await page.request.get(BASE + "/compass-logo.png");
  await page.screenshot({ path: `.playwright-cli/qa/logo-${tag}-${width}.png` });
  results.push({ tag, width, header, footer, favicon, logoStatus: logoReq.status(), failed });
  await context.close();
}

await logoShot("light", 1440);
await logoShot("dark", 1440);
await logoShot("light", 390);

await browser.close();
console.log(JSON.stringify(results, null, 2));
