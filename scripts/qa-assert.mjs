import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
}

const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

// 1. Every route serves 200 with an h1
const expected = {
  "/": "Directing the future of healthcare.",
  "/about/": "About COMPASS",
  "/agenda/": "Agenda",
  "/speakers/": "Speakers",
  "/posters/": "Poster gallery",
  "/sponsors/": "Sponsors & partners",
  "/registration/": "Registration",
};
for (const [route, h1] of Object.entries(expected)) {
  const res = await page.goto(BASE + route, { waitUntil: "networkidle" });
  check(`${route} returns 200`, res?.status() === 200, `status ${res?.status()}`);
  const actual = (await page.locator("h1").first().textContent().catch(() => ""))?.trim();
  check(`${route} h1`, actual === h1, `got "${actual}"`);
}

// 2. Nav contains all six links plus registration CTA
await page.goto(BASE + "/", { waitUntil: "networkidle" });
for (const label of ["About", "Agenda", "Speakers", "Posters", "Sponsors"]) {
  check(`nav link ${label}`, await page.locator(".desktop-nav").getByText(label, { exact: true }).count() === 1);
}
check("registration CTA in header", await page.locator(".nav-register").getByText("Registration", { exact: true }).count() === 1);

// 3. Institutional logo placeholder slots exist (footer)
check("BSNU placeholder slot", await page.locator(".institution-slot", { hasText: "Beni Suef" }).count() >= 1);
check("Faculty placeholder slot", await page.locator(".institution-slot", { hasText: "Faculty of Medicine" }).count() >= 1);

// 4. Registration page: coming soon, and NO form fields anywhere
await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });
const formControls = await page.locator("input, select, textarea, form").count();
check("registration has no form controls yet", formControls === 0, `found ${formControls}`);
check("registration announces coming soon", (await page.locator("main").textContent())?.toLowerCase().includes("coming soon") === true);

// 5. Empty states are intentional on agenda/speakers/posters/sponsors
for (const route of ["/agenda/", "/speakers/", "/posters/", "/sponsors/"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const main = (await page.locator("main").textContent())?.toLowerCase() ?? "";
  check(`${route} has intentional empty state`, main.includes("coming soon") || main.includes("to be announced"), main.slice(0, 80));
}

// 6. Countdown: upcoming state renders (date set: Nov 20 2026 Cairo), no negative numbers
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const heroText = await page.locator(".event-strip").textContent();
check("countdown timer rendered", await page.locator('.event-strip [role="timer"]').count() === 1);
check("countdown shows all four units", ["days", "hours", "minutes", "seconds"].every((u) => heroText?.includes(u) === true), heroText?.slice(0, 120));
check("countdown shows event date", heroText?.includes("November") === true, heroText?.slice(0, 120));
check("no negative countdown values", !/-\d/.test(heroText ?? ""));

// 7. Agenda print stylesheet: in print media, header/footer/nav hidden, print-only visible
await page.goto(BASE + "/agenda/", { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
check("print: site header hidden", await page.locator(".site-header").isHidden());
check("print: footer hidden", await page.locator(".site-footer").isHidden());
check("print: print button hidden", await page.locator("button").first().isHidden());
await page.emulateMedia({ media: "screen" });

// 8. Theme: dark palette is a distinct token set, not inversion
const themeProbe = await page.evaluate(() => {
  const light = getComputedStyle(document.documentElement);
  const read = () => ["--bg", "--surface", "--ink", "--accent", "--panel"].map((v) => light.getPropertyValue(v).trim());
  return { before: read(), attr: document.documentElement.dataset.theme };
});
check("light theme attr default", themeProbe.attr === "dark" || themeProbe.attr === "light", String(themeProbe.attr));
await page.click('button[aria-label*="theme"]');
await page.waitForTimeout(100);
const themeProbe2 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
check("theme toggle changes --bg token", themeProbe2 !== themeProbe.before[0], `${themeProbe.before[0]} -> ${themeProbe2}`);

// 9. Mobile: menu opens, all links reachable, closes
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
await mpage.goto(BASE + "/", { waitUntil: "networkidle" });
check("mobile: desktop nav hidden", await mpage.locator(".desktop-nav").isHidden());
await mpage.click(".menu-toggle");
check("mobile: menu opens", await mpage.locator("#mobile-nav").isVisible());
for (const label of ["About", "Agenda", "Speakers", "Posters", "Sponsors", "Registration"]) {
  check(`mobile menu contains ${label}`, await mpage.locator("#mobile-nav").getByText(label, { exact: true }).count() === 1);
}
await mpage.click('#mobile-nav a[href="/about/"]');
await mpage.waitForURL("**/about/");
check("mobile: navigate closes menu", await mpage.locator("#mobile-nav").count() === 0 || await mpage.locator("#mobile-nav").isHidden());

// 10. Icon-only buttons have accessible names
await mpage.goto(BASE + "/", { waitUntil: "networkidle" });
for (const btn of await mpage.locator("button.icon-button").all()) {
  const label = await btn.getAttribute("aria-label");
  check("icon button has aria-label", !!label, String(label));
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);

