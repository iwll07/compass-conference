import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });
const page = await (await browser.newContext({ viewport: { width: 800, height: 400 } })).newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const links = await page.evaluate(() => [...document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].map((l) => `${l.rel}=${l.href.split("/").pop()}`));
console.log("link tags:", JSON.stringify(links));
for (const src of ["/tab-compass.png"]) {
  const r = await page.request.get(BASE + src);
  console.log(src, r.status(), (await r.body()).length + " bytes");
}
// Render the mark at real tab sizes to judge legibility
await page.evaluate(() => {
  document.body.innerHTML = `<div style="display:flex;gap:24px;align-items:center;padding:40px;background:#fff">
    <img src="/tab-compass.png" width="16" height="16" style="image-rendering:auto">
    <img src="/tab-compass.png" width="32" height="32"></div>`;
});
await page.waitForTimeout(300);
await page.screenshot({ path: ".playwright-cli/qa/favicon-sizes.png" });
await browser.close();
