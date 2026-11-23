// Homepage voting band QA. Every Supabase request is mocked: this script never
// reads or writes the live database.
//
// Usage: BASE_URL=http://localhost:3002 node scripts/home-vote-qa.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3002";
const OUT = ".playwright-cli/qa/home-vote";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? "ok" : "FAIL"} - ${name}${pass ? "" : " :: " + detail}`);
}

const browser = await chromium.launch({ channel: "msedge" });

async function createPage({ status, cached = null, theme = "light", viewport = { width: 1440, height: 1000 } }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(
    ({ cached, theme }) => {
      localStorage.setItem("compass-theme", theme);
      if (cached) {
        localStorage.setItem(
          "compass-voting-settings",
          JSON.stringify({ status: cached, liveResults: false })
        );
      } else {
        localStorage.removeItem("compass-voting-settings");
      }
    },
    { status, cached, theme }
  );

  await context.route("**/rest/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/voting_settings")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "current", status, live_results: false }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  return { context, page };
}

// ---- Open -------------------------------------------------------------------

{
  const { context, page } = await createPage({ status: "open" });
  const band = page.locator(".home-vote");
  await band.waitFor({ state: "visible", timeout: 5000 });

  const link = band.locator("a.home-vote-link");
  check(
    "open: band link says to vote",
    (await link.textContent())?.replace(/\s+/g, " ").trim() ===
      "Vote for the best student presentation"
  );
  check(
    "open: band links to the vote page",
    (await link.getAttribute("href")) === "/vote/"
  );
  check(
    "open: band eyebrow names the contest",
    (await band.locator(".home-vote-eyebrow").textContent())?.trim() ===
      "Best student presentation"
  );

  // ---- Hero call, open ----
  const heroCta = page.locator(".hero-vote-cta");
  check("open: hero vote call is present", (await heroCta.count()) === 1);
  const heroLink = heroCta.locator("a.button");
  check(
    "open: hero button says what it votes for",
    (await heroLink.textContent())?.replace(/\s+/g, " ").trim() ===
      "Vote for the best presentation"
  );
  check(
    "open: hero button links to the vote page",
    (await heroLink.getAttribute("href")) === "/vote/"
  );
  check(
    "open: hero button has an arrow icon",
    (await heroLink.locator("svg[aria-hidden='true']").count()) === 1
  );
  check(
    "open: hero button has hover-lift",
    ((await heroLink.getAttribute("class")) ?? "").split(" ").includes("hover-lift")
  );

  await context.close();
}

// ---- Closed -----------------------------------------------------------------

{
  const { context, page } = await createPage({ status: "closed" });
  const link = page.locator(".home-vote a.home-vote-link");
  await link.waitFor({ state: "visible", timeout: 5000 });

  check(
    "closed: band link says results",
    (await link.textContent())?.trim() === "See the results"
  );
  check(
    "closed: band still links to the vote page",
    (await link.getAttribute("href")) === "/vote/"
  );

  // ---- Hero call, closed: a live link to the published results ----
  const heroCta = page.locator(".hero-vote-cta");
  check("closed: hero vote call is present", (await heroCta.count()) === 1);
  check(
    "closed: hero call is a real link to the ballot",
    (await heroCta.locator("a").count()) === 1 &&
      (await heroCta.locator("a").getAttribute("href")) === "/vote/"
  );
  check(
    "closed: hero call invites viewing the results",
    (await heroCta.textContent())?.replace(/\s+/g, " ").trim() ===
      "Voting closed — view results"
  );
  check(
    "closed: hero call is not dimmed or inert",
    Number(await heroCta.locator("a").evaluate((el) => getComputedStyle(el).opacity)) === 1 &&
      (await heroCta.locator("a").getAttribute("aria-disabled")) === null
  );

  await context.close();
}

// ---- Soon / hidden ----------------------------------------------------------

{
  const { context, page } = await createPage({ status: "soon" });
  // Give the settings fetch and the hydration pass time to settle.
  await page.waitForTimeout(800);
  check(
    "soon: no band",
    (await page.locator(".home-vote").count()) === 0
  );
  check(
    "soon: no hero vote call",
    (await page.locator(".hero-vote-cta").count()) === 0
  );

  await context.close();
}

// ---- Cache does not flash a stale band --------------------------------------

{
  const { context, page } = await createPage({ status: "soon", cached: "open" });
  await page.waitForTimeout(800);
  check(
    "stale cache: final state hides the band",
    (await page.locator(".home-vote").count()) === 0
  );
  check(
    "stale cache: final state hides the hero vote call",
    (await page.locator(".hero-vote-cta").count()) === 0
  );
  check(
    "stale cache: cache is corrected",
    await page.evaluate(() => {
      const raw = localStorage.getItem("compass-voting-settings");
      if (!raw) return false;
      return JSON.parse(raw).status === "soon";
    })
  );

  await context.close();
}

async function shot(status, theme, width) {
  const { context, page } = await createPage({
    status,
    theme,
    viewport: { width, height: 900 },
  });
  const band = page.locator(".home-vote");
  await band.waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(150);
  await band.screenshot({ path: `${OUT}/${status}-${width}-${theme}.png` });
  await context.close();
}

for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    await shot("open", theme, width);
  }
}
await shot("closed", "light", 1440);
await shot("closed", "light", 390);

// The hero call, in both states and both themes, to check it sits comfortably
// under the registration call without crowding the headline.
async function heroShot(status, theme, width) {
  const { context, page } = await createPage({
    status,
    theme,
    viewport: { width, height: 1000 },
  });
  await page.locator(".hero-vote-cta").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(200);
  await page.locator(".hero").screenshot({
    path: `${OUT}/hero-${status}-${width}-${theme}.png`,
  });
  await context.close();
}

for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    await heroShot("open", theme, width);
    await heroShot("closed", theme, width);
  }
}

await browser.close();

const failed = results.filter((result) => !result.pass);
console.log(`\nPASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
