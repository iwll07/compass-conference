import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });

for (const width of [390, 768, 1024, 1280, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(BASE + "/about/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const section = document.querySelector("#patrons");
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - 60);
  });
  await page.waitForTimeout(700);
  const report = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".patron-card")];
    const clippedNames = [];
    const clippedTitles = [];
    const cardHeights = new Set();
    for (const card of cards) {
      const name = card.querySelector(".patron-card-name");
      const title = card.querySelector(".patron-card-title");
      cardHeights.add(Math.round(card.getBoundingClientRect().height));
      if (name.scrollHeight > name.clientHeight + 1) clippedNames.push(name.textContent);
      if (title.scrollHeight > title.clientHeight + 1) clippedTitles.push(title.textContent.slice(0, 40));
    }
    return {
      cards: cards.length,
      heights: [...cardHeights],
      clippedNames,
      clippedTitles,
      columns: getComputedStyle(document.querySelector(".patrons-grid:not(.patrons-grid--patronage)")).gridTemplateColumns,
    };
  });
  const lastImg = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll(".patron-card-photo")];
    return {
      total: imgs.length,
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });
  console.log(width, JSON.stringify(report), JSON.stringify(lastImg));
  await context.close();
}

await browser.close();
