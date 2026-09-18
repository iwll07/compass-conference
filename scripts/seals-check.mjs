import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
// Scroll to footer so it renders in the screenshot
await page.locator(".site-footer").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const seals = await page.evaluate(() => [...document.querySelectorAll(".seal-logo")].map((img) => ({
  src: img.currentSrc.split("/").pop(),
  naturalWidth: img.naturalWidth,
  w: Math.round(img.getBoundingClientRect().width),
  h: Math.round(img.getBoundingClientRect().height),
  alt: img.alt,
})));
console.log(JSON.stringify(seals, null, 2));
for (const src of ["/bsnu-logo.png", "/fms-logo.png"]) {
  const r = await page.request.get(BASE + src);
  console.log(src, r.status());
}
await page.screenshot({ path: ".playwright-cli/qa/footer-seals.png" });
await browser.close();
