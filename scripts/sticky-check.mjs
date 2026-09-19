import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });
const results = [];
function check(name, pass, detail = "") { results.push({ name, pass: !!pass, detail }); }

// Short page: footer must sit at viewport bottom
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
  const page = await context.newPage();
  await page.goto(BASE + "/posters/", { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const footer = document.querySelector(".site-footer");
    const r = footer.getBoundingClientRect();
    return { footerBottom: Math.round(r.bottom), viewport: window.innerHeight, docHeight: document.documentElement.scrollHeight };
  });
  check("short page: footer at viewport bottom", Math.abs(m.footerBottom - m.viewport) <= 1, JSON.stringify(m));
  await context.close();
}

// Long page: footer follows content (document taller than viewport, footer at document end)
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const footer = document.querySelector(".site-footer");
    return { docHeight: document.documentElement.scrollHeight, viewport: window.innerHeight, footerBottom: Math.round(footer.getBoundingClientRect().bottom + window.scrollY) };
  });
  check("long page: content taller than viewport", m.docHeight > m.viewport, JSON.stringify(m));
  check("long page: footer at document end", Math.abs(m.footerBottom - m.docHeight) <= 2, JSON.stringify(m));
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
