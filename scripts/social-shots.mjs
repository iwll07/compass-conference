import { chromium } from "@playwright/test";

// Footer social-links visual check: light/dark desktop + light mobile.
const shots = [
  ["social-footer-light", { width: 1440, height: 1000 }, null, false],
  ["social-footer-dark", { width: 1440, height: 1000 }, "dark", false],
  ["social-footer-mobile", { width: 390, height: 844 }, null, true],
];
const browser = await chromium.launch({ channel: "msedge" });
for (const [name, viewport, theme, mobile] of shots) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  if (theme) await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  // NB: do NOT park the mouse over the link — headless Chromium renders its
  // cursor into screenshots, which reads as an artifact square behind the icon.
  await page.locator(".site-footer").screenshot({ path: `.playwright-cli/qa/${name}.png` });
  console.log("saved", name);
  await context.close();
}
await browser.close();
