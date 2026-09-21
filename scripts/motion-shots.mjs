import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });
const shots = [
  ["motion-home-light", { width: 1440, height: 1000 }, "light", "/", false],
  ["motion-home-dark", { width: 1440, height: 1000 }, "dark", "/", false],
  ["motion-home-mobile", { width: 390, height: 844 }, "light", "/", false],
  ["motion-mobile-nav-open", { width: 390, height: 844 }, "light", "/", true],
];
for (const [name, viewport, theme, route, openNav] of shots) {
  const context = await browser.newContext({ viewport, colorScheme: theme === "dark" ? "dark" : "light" });
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  if (theme === "dark") await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(900); // let mid-page reveals play
  await page.evaluate(() => window.scrollTo(0, 0));
  if (openNav) { await page.locator(".menu-toggle").click(); await page.waitForTimeout(400); }
  await page.screenshot({ path: `.playwright-cli/qa/${name}.png`, fullPage: !openNav });
  await context.close();
  console.log("saved", name);
}
await browser.close();
