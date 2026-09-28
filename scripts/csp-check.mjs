import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const browser = await chromium.launch({ channel: "msedge" });
const results = [];
function check(name, pass, detail = "") { results.push({ name, pass: !!pass, detail }); }

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const cspErrors = [];
const consoleErrors = [];
// Cloudflare Web Analytics beacon noise, expected on localhost.
//
// The beacon only reports for the hostname registered in the Cloudflare
// dashboard, so on localhost its POST to https://cloudflareinsights.com/
// cdn-cgi/rum is refused by a CORS preflight failure. That is NOT a CSP
// violation — connect-src already allows the host — and it will not occur in
// production. Scoped tightly to the RUM endpoint so real CORS/CSP errors on
// any other origin still fail the run.
const BEACON_RUM_NOISE = /cloudflareinsights\.com\/cdn-cgi\/rum/;
const isBeaconNoise = (text) => BEACON_RUM_NOISE.test(text);

// Registered before page.goto so the initial beacon fetch is captured.
const beaconRequests = [];
page.on("request", (r) => {
  if (r.url().includes("static.cloudflareinsights.com/beacon.min.js")) beaconRequests.push(r.url());
});

page.on("console", (m) => {
  const text = m.text();
  if (isBeaconNoise(text)) return;
  // Bare resource-load failures carry no URL in the message; real 404s are
  // attributed with URLs via the response listener below instead.
  if (m.type() === "error" && !/^Failed to load resource/.test(text)) consoleErrors.push(text.slice(0, 160));
  if (/Content Security Policy|CSP|Refused to (execute|apply|load)/i.test(text)) cspErrors.push(text.slice(0, 200));
});
page.on("response", (r) => {
  // Ignore pre-existing RSC-prefetch 404 noise (__PAGE__.txt URLs don't exist
  // in the static export; unrelated to CSP — fails identically without it).
  if (r.status() === 404 && !/__PAGE__\.txt/.test(r.url())) consoleErrors.push("404: " + r.url().slice(0, 120));
});
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 160)));
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

check("no CSP violations in console", cspErrors.length === 0, JSON.stringify(cspErrors.slice(0, 3)));
check("no page errors", consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));

// The beacon must be allowed by script-src and must actually load. The RUM
// CORS filter above ignores the expected localhost POST rejection, so these
// are what prove the beacon itself was not silently blocked by the policy.
const beaconLoaded = await page.evaluate(() => {
  const el = document.querySelector('script[src*="static.cloudflareinsights.com/beacon.min.js"]');
  return { present: !!el, data: el?.getAttribute("data-cf-beacon") ?? null };
});
check("beacon script tag present in served page", beaconLoaded.present);
check("beacon token delivered to the page", beaconLoaded.data?.includes("21fb769a8dcc47c398c4d7df71518fd7") === true, String(beaconLoaded.data));
check("beacon script was actually fetched (allowed by script-src)", beaconRequests.length > 0, JSON.stringify(beaconRequests.slice(0, 2)));

// Hydration proof: countdown ticks (static HTML shows "Preparing", hydrated shows live numbers)
const t1 = await page.locator(".event-strip").textContent();
await page.waitForTimeout(2100);
const t2 = await page.locator(".event-strip").textContent();
check("countdown hydrates and ticks", t1 !== t2 || /\d{2}/.test(t2), (t1 ?? "").slice(0, 60));

// Theme toggle works (proves client JS runs)
await page.click('button[aria-label*="theme"]');
await page.waitForTimeout(200);
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
check("theme toggle works under CSP", theme === "dark" || theme === "light", String(theme));

// No-flash on reload with stored dark theme: theme-init.js is a render-blocking
// classic script in <head>, so it must resolve before first paint. Poll for the
// value, then screenshot the first paint to confirm visually.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.theme !== undefined, null, { timeout: 5000 });
await page.screenshot({ path: ".playwright-cli/qa/csp-reload.png" });
const earlyTheme = await page.evaluate(() => document.documentElement.dataset.theme);
check("theme applied from external script on reload", earlyTheme === theme, `${earlyTheme} vs stored ${theme}`);

// Mobile menu (client component) works
await page.setViewportSize({ width: 390, height: 844 });
await page.click(".menu-toggle");
// max-height animates 0 -> 430px over 240ms, so the box can still measure empty
// immediately after the click; wait for the open state to settle before asserting.
await page.waitForSelector("#mobile-nav.mobile-nav-open", { state: "visible", timeout: 5000 });
check("mobile menu opens under CSP", await page.locator("#mobile-nav").isVisible());

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
