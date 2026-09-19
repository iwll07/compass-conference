import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });
const results = [];
function check(name, pass, detail = "") { results.push({ name, pass: !!pass, detail }); }

async function creditShot(tag, width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (tag === "dark") await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  await page.locator(".credit-bar").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const bar = await page.evaluate(() => {
    const el = document.querySelector(".credit-bar");
    const cs = getComputedStyle(el);
    const logo = el.querySelector(".credit-logo");
    const lr = logo.getBoundingClientRect();
    const email = el.querySelector(".credit-email");
    const fb = el.querySelector('a[aria-label="Mood Digital on Facebook"]');
    const strongs = [...el.querySelectorAll("strong")].map((s) => s.textContent);
    return {
      bg: cs.backgroundColor,
      text: el.querySelector("p").textContent.slice(0, 60),
      strongs,
      emailHref: email.getAttribute("href"),
      emailText: email.textContent,
      fbHref: fb.getAttribute("href"),
      fbTarget: fb.getAttribute("target"),
      fbRel: fb.getAttribute("rel"),
      logoW: Math.round(lr.width),
      logoH: Math.round(lr.height),
      logoNatural: logo.naturalWidth,
      sealsIntact: document.querySelectorAll(".seal-logo").length,
      footerBottomIntact: !!document.querySelector(".footer-bottom"),
    };
  });
  check(`${tag} ${width}: credit text present`, bar.text.includes("Website developed by"));
  check(`${tag} ${width}: strongs`, JSON.stringify(bar.strongs) === JSON.stringify(["Mood Digital", "Mahmoud Ahmed Abdallah"]), JSON.stringify(bar.strongs));
  check(`${tag} ${width}: mailto`, bar.emailHref === "mailto:MoodITBusiness@gmail.com" && bar.emailText === "MoodITBusiness@gmail.com", bar.emailHref);
  check(`${tag} ${width}: fb link`, bar.fbHref === "https://www.facebook.com/share/1F8HS7QUMD/" && bar.fbTarget === "_blank" && bar.fbRel === "noopener noreferrer", `${bar.fbHref} ${bar.fbTarget}`);
  check(`${tag} ${width}: logo 54px`, bar.logoW === 54 && bar.logoH === 54 && bar.logoNatural === 487, `${bar.logoW}x${bar.logoH} natural ${bar.logoNatural}`);
  check(`${tag} ${width}: existing footer intact`, bar.sealsIntact === 2 && bar.footerBottomIntact, `seals ${bar.sealsIntact}`);
  // Overlap check: credit text and logo boxes must not intersect
  const overlap = await page.evaluate(() => {
    const t = document.querySelector(".credit-text").getBoundingClientRect();
    const l = document.querySelector(".credit-logo").getBoundingClientRect();
    return t.left < l.right && l.left < t.right && t.top < l.bottom && l.top < t.bottom;
  });
  check(`${tag} ${width}: no text/logo overlap`, !overlap, String(overlap));
  await page.screenshot({ path: `.playwright-cli/qa/credit-${tag}-${width}.png` });
  await context.close();
}

await creditShot("light", 1440);
await creditShot("dark", 1440);
await creditShot("light", 390);

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
