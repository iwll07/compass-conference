import { chromium } from "@playwright/test";

// Horizontal-overflow audit: no element may exceed the viewport width on any
// route, at desktop and mobile sizes. Runs headed so classic (layout-taking)
// scrollbars apply — vw-based full-bleed tricks overflow by the scrollbar width.
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? "ok" : "FAIL"} - ${name}${pass ? "" : " :: " + detail}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: false, args: ["--window-position=3000,3000"] });
const routes = ["/", "/about/", "/agenda/", "/speakers/", "/posters/", "/sponsors/", "/registration/"];
const viewports = [
  ["desktop", { width: 1440, height: 1000 }],
  ["laptop", { width: 1280, height: 800 }],
  ["mobile", { width: 390, height: 844 }],
];

for (const [label, viewport] of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const info = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 || r.left < -1) {
          bad.push(`${el.tagName}.${String(el.className).split(" ")[0]} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
        }
      });
      return { vw, scrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 4) };
    });
    check(
      `${label} ${route} no horizontal overflow`,
      info.scrollW <= info.vw && info.bad.length === 0,
      `scrollW=${info.scrollW} vw=${info.vw} offenders: ${info.bad.join(", ")}`
    );
  }
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`PASS ${results.length - failed.length}/${results.length}`);
process.exit(failed.length ? 1 : 0);
