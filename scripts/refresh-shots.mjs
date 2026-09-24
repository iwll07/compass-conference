import { chromium } from "@playwright/test";

// Logo/seal refresh visual check: header + footer logos, both seals, legibility.
// Run against the local static build; use headed mode for real-tab favicon shot.
const shots = [
  ["refresh-header", { width: 1440, height: 1000 }, null, "header"],
  ["refresh-header-mobile", { width: 390, height: 844 }, null, "header"],
  ["refresh-footer", { width: 1440, height: 1000 }, null, "footer"],
  ["refresh-footer-dark", { width: 1440, height: 1000 }, "dark", "footer"],
  ["refresh-favicon", { width: 240, height: 200 }, null, "tab"],
];
const browser = await chromium.launch({ channel: "msedge", headless: false, args: ["--window-position=3000,3000"] });
for (const [name, viewport, theme, target] of shots) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  if (theme) await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  if (target === "footer") {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    await page.locator(".site-footer").screenshot({ path: `.playwright-cli/qa/${name}.png` });
  } else if (target === "tab") {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `.playwright-cli/qa/${name}.png` });
  } else {
    await page.waitForTimeout(600);
    await page.locator(".site-header").screenshot({ path: `.playwright-cli/qa/${name}.png` });
  }
  console.log("saved", name);
  await context.close();
}
await browser.close();
