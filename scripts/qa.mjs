import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = ".playwright-cli/qa";
mkdirSync(OUT, { recursive: true });

const routes = ["/", "/about", "/agenda", "/speakers", "/posters", "/sponsors", "/registration", "/missing-page"];
const results = [];

const browser = await chromium.launch({ channel: "msedge" });

async function audit(route, viewport, tag) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("requestfailed", (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));
  const response = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(400);
  const file = `${route === "/" ? "home" : route.replace(/\//g, "").replace("missing", "404")}-${tag}.png`;
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  const h1 = await page.locator("h1").first().textContent().catch(() => null);
  results.push({ route, tag, status: response?.status(), h1: h1?.trim().slice(0, 60), consoleErrors, pageErrors, failedRequests, file });
  await context.close();
}

for (const route of routes) await audit(route, { width: 1440, height: 1000 }, "desktop");
for (const route of routes) await audit(route, { width: 390, height: 844 }, "mobile");

// Theme persistence + hydration check on home
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror:" + e));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.click('button[aria-label="Switch to dark theme"]');
  const themeAfterClick = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.reload({ waitUntil: "networkidle" });
  const themeAfterReload = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.screenshot({ path: `${OUT}/home-dark-persisted.png`, fullPage: false });
  const toggleAriaAfterReload = await page.getAttribute('button[aria-label^="Switch to"]', "aria-label");
  results.push({ route: "theme-test", themeAfterClick, themeAfterReload, toggleAriaAfterReload, consoleErrors });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
