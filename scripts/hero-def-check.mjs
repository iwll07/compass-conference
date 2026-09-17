import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const results = [];
function check(name, pass, detail = "") { results.push({ name, pass: !!pass, detail }); }

const browser = await chromium.launch({ channel: "msedge" });

async function assertHeroDefinition(width, height, tag, toggle) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (toggle) await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);
  const { defColor, heroMuted, muted } = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const def = getComputedStyle(document.querySelector(".hero-photo .hero-definition"));
    return { defColor: def.color, heroMuted: root.getPropertyValue("--hero-muted").trim(), muted: root.getPropertyValue("--muted").trim() };
  });
  const toRgb = (hex) => {
    const m = hex.match(/^#(..)(..)(..)$/).slice(1).map((h) => parseInt(h, 16));
    return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
  };
  check(`${tag} ${width}px: definition uses --hero-muted token`, defColor === toRgb(heroMuted), `got ${defColor}, token ${heroMuted}`);
  check(`${tag} ${width}px: definition not the old muted color`, defColor !== toRgb(muted), `${defColor} vs muted ${muted}`);
  check(`${tag} ${width}px: definition readable (light channel > 0.6)`, (() => {
    const m = defColor.match(/\d+/g).map(Number);
    return m[0] > 153 && m[1] > 153 && m[2] > 153;
  })(), defColor);
  await page.screenshot({ path: `.playwright-cli/qa/hero-def-${tag}-${width}.png` });
  await context.close();
}

await assertHeroDefinition(1440, 900, "light", false);
await assertHeroDefinition(1440, 900, "dark", true);
await assertHeroDefinition(390, 844, "light", false);
await assertHeroDefinition(390, 844, "dark", true);

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
