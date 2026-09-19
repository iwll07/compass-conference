import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const link = page.locator("a.event-place");
console.log(JSON.stringify({
  count: await link.count(),
  href: await link.getAttribute("href"),
  target: await link.getAttribute("target"),
  rel: await link.getAttribute("rel"),
  label: await link.getAttribute("aria-label"),
  text: (await link.textContent())?.trim().slice(0, 80),
}));
await browser.close();
