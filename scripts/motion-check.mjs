import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });
const results = [];
function check(name, pass, detail = "") { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? "ok" : "FAIL"} - ${name}${pass ? "" : " :: " + detail}`); }

// 1. Scroll reveal: below-fold content starts hidden, reveals on scroll, stays revealed
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const explore = page.locator(".explore-heading");
  check("explore section has reveal class", await explore.count() === 1);
  check("below-fold content not yet revealed", await explore.evaluate((el) => !el.classList.contains("reveal-visible")));
  check("below-fold content starts hidden (opacity 0)", await explore.evaluate((el) => getComputedStyle(el).opacity === "0"), await explore.evaluate((el) => getComputedStyle(el).opacity));
  await page.waitForSelector(".hero h1.reveal-visible", { timeout: 3000 }).catch(() => {});
  check("hero h1 revealed on load (in viewport)", await page.locator(".hero h1.reveal").evaluate((el) => el.classList.contains("reveal-visible")));
  check("stagger delay set on intro prose", await page.locator(".intro-prose").evaluate((el) => el.style.getPropertyValue("--reveal-delay") === "80ms"));
  await explore.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".explore-heading")?.classList.contains("reveal-visible"), null, { timeout: 4000 }).catch(() => {});
  check("content reveals after scrolling into view", await explore.evaluate((el) => el.classList.contains("reveal-visible")));
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".explore-heading")).opacity === "1", null, { timeout: 3000 }).catch(() => {});
  check("revealed content transitions to opacity 1", await explore.evaluate((el) => getComputedStyle(el).opacity === "1"), await explore.evaluate((el) => getComputedStyle(el).opacity));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  check("content stays revealed after scrolling back up", await explore.evaluate((el) => el.classList.contains("reveal-visible")));
  await page.goto(BASE + "/agenda/", { waitUntil: "networkidle" });
  await page.waitForSelector(".page-heading h1.reveal-visible", { timeout: 3000 }).catch(() => {});
  check("agenda h1 reveals on its own page", await page.locator(".page-heading h1.reveal").evaluate((el) => el.classList.contains("reveal-visible")));
  await context.close();
}

// 2. Hover-lift on buttons + footer logos (desktop hover only)
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const button = page.locator(".hero-actions .button");
  await button.hover();
  await page.waitForTimeout(250);
  const after = await button.evaluate((el) => getComputedStyle(el).transform);
  const shadow = await button.evaluate((el) => getComputedStyle(el).boxShadow);
  check("button lifts -3px on hover", /matrix\(1, 0, 0, 1, 0, -3\)/.test(after), after);
  check("button gains shadow on hover", shadow !== "none", shadow);
  const seal = page.locator(".institution-slot.hover-lift").first();
  await seal.hover();
  await page.waitForTimeout(250);
  check("footer seal lifts on hover", /matrix\(1, 0, 0, 1, 0, -3\)/.test(await seal.evaluate((el) => getComputedStyle(el).transform)));
  // Mood Digital logo is intentionally static (user request): no hover-lift class, no movement.
  const creditLogo = page.locator(".credit-inner > a");
  await creditLogo.hover();
  await page.waitForTimeout(250);
  check("credit logo stays static on hover", (await creditLogo.getAttribute("class")) === null && (await creditLogo.evaluate((el) => getComputedStyle(el).transform)) === "none");
  await context.close();
}

// 3. Animated underline on text links (desktop nav, explore list)
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(BASE + "/about/", { waitUntil: "networkidle" });
  const navLink = page.locator(".desktop-nav a.link-underline", { hasText: "Agenda" });
  const scaleBefore = await navLink.evaluate((el) => getComputedStyle(el, "::after").transform);
  await navLink.hover();
  await page.waitForTimeout(250);
  const scaleAfter = await navLink.evaluate((el) => getComputedStyle(el, "::after").transform);
  check("nav underline hidden before hover", scaleBefore === "matrix(0, 0, 0, 1, 0, 0)", scaleBefore);
  check("nav underline grows on hover", scaleAfter === "matrix(1, 0, 0, 1, 0, 0)", scaleAfter);
  const current = page.locator(".desktop-nav a.link-underline", { hasText: "Agenda" });
  check("current nav link underline always visible", await current.evaluate((el) => { el.setAttribute("aria-current", "page"); return getComputedStyle(el, "::after").transform === "matrix(1, 0, 0, 1, 0, 0)"; }));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const exploreLink = page.locator(".explore-list > a").first();
  const h3 = exploreLink.locator("h3.link-underline");
  check("explore heading underline hidden before hover", await h3.evaluate((el) => getComputedStyle(el, "::after").transform === "matrix(0, 0, 0, 1, 0, 0)"));
  await exploreLink.hover();
  await page.waitForTimeout(250);
  check("explore heading underline grows on row hover", await h3.evaluate((el) => getComputedStyle(el, "::after").transform === "matrix(1, 0, 0, 1, 0, 0)"));
  await context.close();
}

// 4. Mobile nav: always mounted, class-toggled transition, aria + Escape behavior preserved
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const nav = page.locator("#mobile-nav");
  check("mobile nav mounted while closed", await nav.count() === 1);
  check("mobile nav hidden while closed", await nav.evaluate((el) => getComputedStyle(el).visibility === "hidden"));
  const toggle = page.locator(".menu-toggle");
  check("aria-expanded false while closed", await toggle.getAttribute("aria-expanded") === "false");
  await toggle.click();
  await page.waitForTimeout(350);
  check("mobile nav open class applied", await nav.evaluate((el) => el.classList.contains("mobile-nav-open")));
  check("mobile nav visible while open", await nav.evaluate((el) => getComputedStyle(el).visibility === "visible" && getComputedStyle(el).opacity === "1"));
  check("aria-expanded true while open", await toggle.getAttribute("aria-expanded") === "true");
  check("hamburger swapped to X icon", await toggle.locator(".icon-swap").evaluate((el) => el.classList.contains("icon-swap-alt")));
  // Escape must be pressed while focus is INSIDE the nav (keydown bubbles up to the
  // nav's onKeyDown); use the anchor (focusable), not the label span inside it.
  await nav.locator("a", { hasText: "Agenda" }).press("Escape");
  await page.waitForTimeout(400);
  check("Escape closes mobile nav", await nav.evaluate((el) => !el.classList.contains("mobile-nav-open")));
  check("Escape returns focus to toggle", await page.evaluate(() => document.activeElement?.classList.contains("menu-toggle")));
  await toggle.click();
  await page.waitForTimeout(350);
  await nav.locator("a", { hasText: "Agenda" }).click();
  await page.waitForURL("**/agenda/");
  check("link selection closes mobile nav", await page.locator("#mobile-nav").evaluate((el) => !el.classList.contains("mobile-nav-open")));
  await context.close();
}

// 5. Theme toggle icon swap
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const themeBtn = page.locator(".nav-actions .icon-button").first();
  check("theme toggle starts unswapped (moon)", await themeBtn.locator(".icon-swap").evaluate((el) => !el.classList.contains("icon-swap-alt")));
  await themeBtn.click();
  check("theme flips to dark", await page.evaluate(() => document.documentElement.dataset.theme === "dark"));
  check("theme icon swaps (sun)", await themeBtn.locator(".icon-swap").evaluate((el) => el.classList.contains("icon-swap-alt")));
  await context.close();
}

// 6. Reduced motion: reveal content visible immediately, no waiting on transitions
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("reduced motion: below-fold reveal content not hidden", await page.locator(".explore-heading").evaluate((el) => getComputedStyle(el).opacity === "1"));
  check("reduced motion: hero h1 visible immediately", await page.locator(".hero h1").evaluate((el) => getComputedStyle(el).opacity === "1"));
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
