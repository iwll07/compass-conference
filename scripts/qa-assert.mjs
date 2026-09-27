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
// Registration is not open: the header CTA is inert, dimmed text — never a link.
const navSoon = page.locator(".nav-register");
check("header reads 'Registration soon'", (await navSoon.textContent())?.trim() === "Registration soon", (await navSoon.textContent())?.trim());
check("header 'Registration soon' is not a link", await navSoon.evaluate((el) => el.tagName.toLowerCase()) === "span");
check("header 'Registration soon' is aria-disabled", await navSoon.getAttribute("aria-disabled") === "true");
check("header 'Registration soon' has no arrow icon", await navSoon.locator("svg").count() === 0);
check("header 'Registration soon' is dimmed", (await navSoon.evaluate((el) => getComputedStyle(el).opacity)) === "0.55");
check("no clickable registration link in header", await page.locator('.nav-actions a[href*="registration"]').count() === 0);

// 2b. Hero CTAs: two equal-weight external call buttons, Discover COMPASS below them
const callSpecs = [
  ["Organization Call", "https://tally.so/r/Zjx190"],
  ["Speaker / Posters Call", "https://tally.so/r/RGpJ7P"],
];
check("hero has exactly two CTA buttons", await page.locator(".hero-actions .button").count() === 2, `${await page.locator(".hero-actions .button").count()}`);
for (const [label, href] of callSpecs) {
  const cta = page.locator(".hero-cta-row a.button", { hasText: label });
  check(`hero CTA "${label}" exists`, await cta.count() === 1);
  check(`hero CTA "${label}" href`, await cta.getAttribute("href") === href, String(await cta.getAttribute("href")));
  check(`hero CTA "${label}" opens in new tab`, (await cta.getAttribute("target")) === "_blank" && ((await cta.getAttribute("rel")) ?? "").includes("noopener"));
  check(`hero CTA "${label}" has hover-lift`, ((await cta.getAttribute("class")) ?? "").split(" ").includes("hover-lift") === true);
}
const ctaRow = await page.locator(".hero-cta-row").boundingBox();
const discover = await page.locator(".hero-actions .hero-link").boundingBox();
check("Discover COMPASS sits below the CTA row", !!ctaRow && !!discover && discover.y > ctaRow.y + ctaRow.height - 1, JSON.stringify({ ctaRow, discover }));
check("hero no longer links to /registration", await page.locator('.hero-actions a[href*="registration"]').count() === 0);

// 3. Institutional logo placeholder slots exist (footer)
check("BSNU placeholder slot", await page.locator(".institution-slot", { hasText: "Beni Suef" }).count() >= 1);
check("Faculty placeholder slot", await page.locator(".institution-slot", { hasText: "Faculty of Medicine" }).count() >= 1);

// 3b. Institutional social links: correct hrefs/targets/labels + "Business contact:" label
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const socialSpecs = [
  ["Beni Suef National University on Facebook", "https://www.facebook.com/share/1CLMS28whQ/"],
  ["Faculty of Medicine and Surgery on Facebook", "https://www.facebook.com/share/18ymt75c2C/"],
  ["Faculty of Medicine and Surgery on TikTok", "https://www.tiktok.com/@bsnu.medvibes"],
];
for (const [label, href] of socialSpecs) {
  const link = page.locator(`.social-links a[aria-label="${label}"]`);
  check(`social link "${label}" exists`, await link.count() === 1);
  check(`social link "${label}" href`, await link.getAttribute("href") === href, await link.getAttribute("href"));
  check(`social link "${label}" opens in new tab`, (await link.getAttribute("target")) === "_blank" && ((await link.getAttribute("rel")) ?? "").includes("noopener"));
  check(`social link "${label}" has hover-lift`, (await link.getAttribute("class"))?.split(" ").includes("hover-lift") === true);
  check(`social link "${label}" renders an svg icon`, await link.locator("svg").count() === 1);
}
const business = (await page.locator(".credit-contact").textContent()) ?? "";
check("business contact label before email", business.includes("Business contact:") && business.includes("MoodITBusiness@gmail.com"), business.slice(0, 80));
check("email link itself unchanged", await page.locator(".credit-contact a.credit-email").getAttribute("href") === "mailto:MoodITBusiness@gmail.com");


// 4. Registration page: coming soon, and NO form fields anywhere
await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });
const formControls = await page.locator("input, select, textarea, form").count();
check("registration has no form controls yet", formControls === 0, `found ${formControls}`);
check("registration announces coming soon", (await page.locator("main").textContent())?.toLowerCase().includes("coming soon") === true);
const openCallLinks = await page.locator(".open-calls a").count();
check("registration page points to both open calls", openCallLinks === 2, `found ${openCallLinks}`);
for (const [label, href] of callSpecs) {
  const link = page.locator(".open-calls a", { hasText: label });
  check(`registration page links "${label}"`, await link.count() === 1 && await link.getAttribute("href") === href, String(await link.getAttribute("href")));
  check(`registration page "${label}" opens in new tab`, (await link.getAttribute("target")) === "_blank" && ((await link.getAttribute("rel")) ?? "").includes("noopener"));
}

// 5. Empty states are intentional on agenda/speakers/posters/sponsors
for (const route of ["/agenda/", "/speakers/", "/posters/", "/sponsors/"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const main = (await page.locator("main").textContent())?.toLowerCase() ?? "";
  check(`${route} has intentional empty state`, main.includes("coming soon") || main.includes("to be announced"), main.slice(0, 80));
}

// 6. Countdown: upcoming state renders (date set: Nov 25 2026 Cairo), no negative numbers
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const heroText = await page.locator(".event-strip").textContent();
check("countdown timer rendered", await page.locator('.event-strip [role="timer"]').count() === 1);
check("countdown shows all four units", ["days", "hours", "minutes", "seconds"].every((u) => heroText?.includes(u) === true), heroText?.slice(0, 120));
check("countdown shows event date", heroText?.includes("November") === true, heroText?.slice(0, 120));
// Exact date, from conferenceWindow: homepage countdown + agenda status line + agenda meta
check("countdown shows 24 November", heroText?.includes("24 November 2026") === true, heroText?.slice(0, 140));
await page.goto(BASE + "/agenda/", { waitUntil: "networkidle" });
const agendaStatus = (await page.locator(".page-body .status-line").first().textContent())?.trim();
check("agenda status line shows 24 November 2026", agendaStatus === "24 November 2026, 09:00–17:00 Africa/Cairo", String(agendaStatus));
const agendaMeta = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
check("agenda meta description shows 24 November 2026", agendaMeta.includes("24 November 2026, 09:00–17:00 Africa/Cairo"), agendaMeta.slice(0, 140));
await page.goto(BASE + "/", { waitUntil: "networkidle" });
// Event-strip place link: the arrow affordance is present and it is still a valid external link
const place = page.locator("a.event-place");
check("event-strip place has an arrow icon", await place.locator(".event-place-name svg").count() === 1);
check("event-strip place icon is decorative", (await place.locator(".event-place-name svg").getAttribute("aria-hidden")) === "true");
check("event-strip place keeps its accessible name", (await place.getAttribute("aria-label")) === "Beni Suef National University on Google Maps");
check("event-strip place still opens in a new tab", (await place.getAttribute("target")) === "_blank" && ((await place.getAttribute("rel")) ?? "").includes("noopener"));
check("no negative countdown values", !/-\d/.test(heroText ?? ""));

// 6b. Speakers + posters pages each surface the Speaker / Posters Call CTA
const speakerPostersHref = "https://tally.so/r/RGpJ7P";
for (const [route, noteId] of [["/speakers/", "speakers-call"], ["/posters/", "poster-submissions"]]) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const note = page.locator(`[aria-labelledby="${noteId}"]`);
  check(`${route} has a call-to-action note`, await note.count() === 1);
  const cta = note.locator(`a.call-button[href="${speakerPostersHref}"]`);
  check(`${route} CTA links the Speaker / Posters Call`, await cta.count() === 1, `${await cta.count()}`);
  check(`${route} CTA opens in new tab`, (await cta.getAttribute("target")) === "_blank" && ((await cta.getAttribute("rel")) ?? "").includes("noopener"));
  check(`${route} CTA has hover-lift`, ((await cta.getAttribute("class")) ?? "").split(" ").includes("hover-lift") === true);
  check(`${route} CTA is labelled`, (await cta.textContent())?.includes("Speaker / Posters Call") === true, (await cta.textContent())?.trim());
  // The old "not open on this website" copy must be gone now that the call is live.
  check(`${route} no longer claims submissions are closed`, ((await page.locator("main").textContent()) ?? "").toLowerCase().includes("not open on this website") === false);
  // Key dates for the call, shared by both pages. The presentation date is
  // derived from conferenceWindow, so this also guards against drift.
  const dl = note.locator(".call-deadlines");
  check(`${route} shows the call key dates`, await dl.count() === 1);
  const dlText = ((await dl.textContent()) ?? "").replace(/\s+/g, " ");
  for (const [label, value] of [
    ["Submission deadline", "11 October 2026"],
    ["Notification of acceptance", "20 October 2026"],
    ["Presentation date", "24 November 2026"],
  ]) {
    check(`${route} shows ${label}`, dlText.includes(label) && dlText.includes(value), dlText.slice(0, 120));
  }
  check(`${route} no longer promises future deadlines`, ((await note.textContent()) ?? "").includes("once they are confirmed") === false);
}


// 7. Agenda print stylesheet: in print media, header/footer/nav hidden, print-only visible
await page.goto(BASE + "/agenda/", { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
check("print: site header hidden", await page.locator(".site-header").isHidden());
check("print: footer hidden", await page.locator(".site-footer").isHidden());
check("print: print button hidden", await page.locator(".no-print").first().isHidden());
await page.emulateMedia({ media: "screen" });

// 7b. Agenda "Download agenda" is dimmed and inert (program not confirmed yet)
const dl = page.locator(".print-button-disabled");
check("agenda download affordance exists", await dl.count() === 1);
check("agenda button reads 'Download agenda'", (await dl.textContent())?.trim() === "Download agenda", (await dl.textContent())?.trim());
check("agenda button is a span, not a <button>", await dl.evaluate((el) => el.tagName.toLowerCase()) === "span");
check("agenda button is aria-disabled", await dl.getAttribute("aria-disabled") === "true");
check("agenda button is not focusable", await dl.evaluate((el) => el.tabIndex) === -1);
check("agenda button is dimmed", (await dl.evaluate((el) => getComputedStyle(el).opacity)) === "0.55");
check("no clickable button remains on the agenda", await page.locator(".page-body button").count() === 0);
check("agenda no longer promises a print/PDF", ((await page.locator("main").textContent()) ?? "").includes("save this agenda as a PDF") === false);

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
for (const label of ["About", "Agenda", "Speakers", "Posters", "Sponsors", "Registration soon"]) {
  check(`mobile menu contains ${label}`, await mpage.locator("#mobile-nav").getByText(label, { exact: true }).count() === 1);
}
const mSoon = mpage.locator("#mobile-nav .nav-register-disabled");
check("mobile menu 'Registration soon' is a span, not a link", await mSoon.evaluate((el) => el.tagName.toLowerCase()) === "span");
check("mobile menu 'Registration soon' is aria-disabled", await mSoon.getAttribute("aria-disabled") === "true");
check("mobile menu 'Registration soon' is dimmed", (await mSoon.evaluate((el) => getComputedStyle(el).opacity)) === "0.55");
check("mobile menu has no registration link", await mpage.locator('#mobile-nav a[href*="registration"]').count() === 0);
check("mobile menu 'Registration soon' is not focusable", await mSoon.evaluate((el) => el.tabIndex) === -1);
// Hero CTAs must stack (not sit side by side) at 390px
const mBox1 = await mpage.locator(".hero-cta-row a.button").nth(0).boundingBox();
const mBox2 = await mpage.locator(".hero-cta-row a.button").nth(1).boundingBox();
check("mobile: hero CTAs stack vertically", !!mBox1 && !!mBox2 && mBox2.y > mBox1.y + mBox1.height - 1, JSON.stringify({ mBox1, mBox2 }));
await mpage.click('#mobile-nav a[href="/about/"]');
await mpage.waitForURL("**/about/");
// close transition holds visibility:visible for 240ms before flipping to hidden - poll instead of instant check
await mpage.waitForFunction(() => { const n = document.querySelector("#mobile-nav"); return n && getComputedStyle(n).visibility === "hidden"; }, null, { timeout: 3000 }).catch(() => {});
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

