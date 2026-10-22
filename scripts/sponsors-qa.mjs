import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/fares/.gemini/antigravity/brain/8a930f24-decb-48f1-ae9c-8d53d5d2a297";
const LOCAL_DIR = ".playwright-cli/qa";
mkdirSync(LOCAL_DIR, { recursive: true });

function saveShot(filename, buf) {
  const localPath = join(LOCAL_DIR, filename);
  const artifactPath = join(ARTIFACT_DIR, filename);
  try {
    writeFileSync(localPath, buf);
    writeFileSync(artifactPath, buf);
    console.log(`Saved screenshot: ${filename}`);
  } catch (err) {
    console.error("Error saving shot:", err);
  }
}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  const status = pass ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${detail ? ` (${detail})` : ""}`);
}

const browser = await chromium.launch({ channel: "msedge" });

try {
  // Test 1: Desktop context (English default)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
  });
  const page = await context.newPage();

  // 1a. Footer logo is a button, not a link
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.locator(".credit-bar").scrollIntoViewIfNeeded();

  const footerBtn = page.locator("button.credit-logo-btn");
  check("Footer logo is a button", (await footerBtn.count()) === 1);
  check("Footer logo button has type='button'", (await footerBtn.getAttribute("type")) === "button");
  check("Footer logo button has aria-haspopup='dialog'", (await footerBtn.getAttribute("aria-haspopup")) === "dialog");
  check(
    "Footer logo button has accessible name",
    (await footerBtn.getAttribute("aria-label")) === "About Mood Digital, Diamond partner"
  );
  check(
    "Old Facebook link 1F8HS7QUMD does not exist in DOM",
    (await page.locator('a[href*="1F8HS7QUMD"]').count()) === 0
  );

  // 1b. Dialog opens from footer button
  await footerBtn.click();
  await page.waitForTimeout(250);
  const openDialog = page.locator("dialog.sponsor-dialog[open]");
  check("Dialog opens from footer", (await openDialog.count()) === 1);

  // Check English tab active by default
  const activeTab = openDialog.locator(".sponsor-dialog-tab-active");
  check("Dialog opens in English tab by default", (await activeTab.textContent())?.trim() === "English");

  // Screenshot: dialog EN light desktop
  const shotEnLight = await page.screenshot({ fullPage: false });
  saveShot("sponsor-dialog-en-light-desktop.png", shotEnLight);

  // Check the 4 exact links in English tab
  const expectedWhatsapp =
    "https://wa.me/201503330110?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20Mood%20Digital!%20%D8%B4%D9%81%D8%AA%D9%83%D9%85%20%D9%81%D9%8A%20%D9%85%D9%88%D9%82%D8%B9%20%D9%85%D8%A4%D8%AA%D9%85%D8%B1%20COMPASS%20%D9%88%D8%AD%D8%A7%D8%A8%D8%A8%20%D8%A3%D8%B3%D8%AA%D9%81%D8%B3%D8%B1%20%D8%B9%D9%86%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%D9%83%D9%85.";
  const expectedFb = "https://www.facebook.com/share/1CUacfNyqD/";
  const expectedIg = "https://www.instagram.com/moodxdigital?rpxt=MTkzZGVucmZ1OWw2Mw==";
  const expectedEmail = "mailto:MoodITBusiness@gmail.com";

  const links = openDialog.locator(".sponsor-dialog-link");
  check("Dialog renders 4 link buttons", (await links.count()) === 4);

  const fbLink = openDialog.locator('.sponsor-dialog-link[aria-label="Mood Digital on Facebook"]');
  check("FB link href matches", (await fbLink.getAttribute("href")) === expectedFb);
  check(
    "FB link has target _blank and rel noopener",
    (await fbLink.getAttribute("target")) === "_blank" &&
      (await fbLink.getAttribute("rel"))?.includes("noopener") === true
  );

  const igLink = openDialog.locator('.sponsor-dialog-link[aria-label="Mood Digital on Instagram"]');
  check("IG link href matches", (await igLink.getAttribute("href")) === expectedIg);
  check(
    "IG link has target _blank and rel noopener",
    (await igLink.getAttribute("target")) === "_blank" &&
      (await igLink.getAttribute("rel"))?.includes("noopener") === true
  );

  const waLink = openDialog.locator('.sponsor-dialog-link[aria-label="Mood Digital on WhatsApp"]');
  check("WhatsApp link href matches byte-for-byte", (await waLink.getAttribute("href")) === expectedWhatsapp);
  check(
    "WhatsApp link has target _blank and rel noopener",
    (await waLink.getAttribute("target")) === "_blank" &&
      (await waLink.getAttribute("rel"))?.includes("noopener") === true
  );

  const mailLink = openDialog.locator('.sponsor-dialog-link[aria-label="Mood Digital on Email"]');
  check("Email link href matches", (await mailLink.getAttribute("href")) === expectedEmail);
  check("Email link has no target _blank", (await mailLink.getAttribute("target")) === null);

  // 1c. Switch to Arabic tab
  const arTabBtn = openDialog.locator('button[role="tab"]:has-text("العربية")');
  await arTabBtn.click();
  await page.waitForTimeout(200);

  const arPanel = openDialog.locator('.sponsor-dialog-panel[lang="ar"]');
  check("Arabic panel has dir='rtl'", (await arPanel.getAttribute("dir")) === "rtl");
  check("Arabic panel has lang='ar'", (await arPanel.getAttribute("lang")) === "ar");

  // Screenshot: dialog AR light desktop
  const shotArLight = await page.screenshot({ fullPage: false });
  saveShot("sponsor-dialog-ar-light-desktop.png", shotArLight);

  // 1d. Escape closes dialog and returns focus to opener
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("Dialog closed after Escape", (await page.locator("dialog.sponsor-dialog[open]").count()) === 0);
  check(
    "Focus returned to footer opener button",
    await page.evaluate(() => document.activeElement === document.querySelector("button.credit-logo-btn"))
  );

  // 1e. Backdrop click closes dialog and returns focus
  await footerBtn.click();
  await page.waitForTimeout(200);
  check("Dialog re-opened", (await page.locator("dialog.sponsor-dialog[open]").count()) === 1);

  // Click backdrop outside dialog rect (top left corner 10, 10)
  await page.mouse.click(10, 10);
  await page.waitForTimeout(200);
  check("Dialog closed after backdrop click", (await page.locator("dialog.sponsor-dialog[open]").count()) === 0);
  check(
    "Focus returned to footer opener button after backdrop click",
    await page.evaluate(() => document.activeElement === document.querySelector("button.credit-logo-btn"))
  );

  // 1f. Dark mode dialog screenshots
  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);

  await footerBtn.click();
  await page.waitForTimeout(200);
  const shotEnDark = await page.screenshot({ fullPage: false });
  saveShot("sponsor-dialog-en-dark-desktop.png", shotEnDark);

  await page.locator('dialog.sponsor-dialog[open] button[role="tab"]:has-text("العربية")').click();
  await page.waitForTimeout(150);
  const shotArDark = await page.screenshot({ fullPage: false });
  saveShot("sponsor-dialog-ar-dark-desktop.png", shotArDark);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // Reset theme to light
  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);

  // 1g. Home strip screenshot and verification
  const homeStrip = page.locator(".sponsor-strip");
  await homeStrip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  check("Home sponsor strip exists", (await homeStrip.count()) === 1);
  check(
    "Home sponsor strip heading preserved",
    (await homeStrip.locator("h2").textContent())?.trim() === "Supported by shared ambition."
  );
  check(
    "Home sponsor strip link to /sponsors preserved",
    (await homeStrip.locator('a[href^="/sponsors"]').count()) === 1
  );

  const homeTile = page.locator(".sponsor-strip-tile-diamond");
  check("Diamond sponsor tile on home strip exists", (await homeTile.count()) === 1);

  // Home strip screenshot
  const shotHomeStrip = await page.screenshot({ fullPage: false });
  saveShot("home-strip-desktop.png", shotHomeStrip);

  // Click home strip logo opens dialog
  await homeTile.click();
  await page.waitForTimeout(200);
  check("Dialog opens from home strip tile", (await page.locator("dialog.sponsor-dialog[open]").count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // 1h. Sponsors page verification and screenshots
  await page.goto(BASE + "/sponsors/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const diamondPanel = page.locator(".sponsor-diamond-panel");
  check("Diamond panel on /sponsors exists", (await diamondPanel.count()) === 1);
  check("Diamond logo renders in panel", (await diamondPanel.locator("img").count()) === 1);
  check(
    "Diamond panel has Mood Digital title",
    (await diamondPanel.locator(".sponsor-diamond-name").textContent())?.trim() === "Mood Digital"
  );
  check(
    "Diamond panel has correct tagline",
    (await diamondPanel.locator(".sponsor-diamond-tagline").textContent())?.trim() ===
      "Official Technology Partner of COMPASS 2026"
  );
  check(
    "Diamond panel tagline renders in serif",
    await diamondPanel.locator(".sponsor-diamond-tagline").evaluate((el) => {
      const ff = getComputedStyle(el).fontFamily.toLowerCase();
      return ff.includes("serif");
    })
  );

  const expectedSummary =
    "Mood Digital is a custom software and digital systems agency specializing in high-performance web applications, automated event & QR check-in ecosystems, clinic management dashboards, and e-learning platforms. Proudly powering the digital experience of COMPASS 2026.";
  const actualSummary = (await diamondPanel.locator(".sponsor-diamond-summary").textContent())?.trim();
  check("Diamond panel summary renders", !!actualSummary);
  check("Diamond panel summary exact copy match", actualSummary === expectedSummary, actualSummary?.slice(0, 50));
  check("Diamond panel summary renders '&' correctly", actualSummary?.includes("automated event & QR check-in ecosystems") === true);

  check(
    "Diamond panel text column has max-width ~540px",
    await diamondPanel.locator(".sponsor-diamond-info").evaluate((el) => {
      const mw = parseFloat(getComputedStyle(el).maxWidth);
      return Math.round(mw) <= 540;
    })
  );

  const learnMoreBtn = diamondPanel.locator("button:has-text('Learn more')");
  check("Diamond panel has 'Learn more' button", (await learnMoreBtn.count()) === 1);

  // Screenshots: /sponsors/ desktop light & dark (1440)
  const shotSponsors1440Light = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1440-light.png", shotSponsors1440Light);
  saveShot("sponsors-page-desktop.png", shotSponsors1440Light);

  // Switch to dark mode for 1440 dark screenshot
  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const shotSponsors1440Dark = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1440-dark.png", shotSponsors1440Dark);

  // Switch back to light
  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);

  // Dialog opens from Diamond panel Learn More button
  await learnMoreBtn.click();
  await page.waitForTimeout(200);
  check(
    "Dialog opens from Diamond panel Learn more button",
    (await page.locator("dialog.sponsor-dialog[open]").count()) === 1
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  await context.close();

  // Test 2: Mobile context (390px)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "en-US",
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE + "/sponsors/", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(250);

  // Check no horizontal overflow at 390px
  const noOverflow = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });
  check("No horizontal overflow on /sponsors/ at 390px", noOverflow);

  // Screenshots: /sponsors/ mobile light & dark (390)
  const shotSponsors390Light = await mobilePage.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-390-light.png", shotSponsors390Light);
  saveShot("sponsors-page-mobile.png", shotSponsors390Light);

  await mobilePage.click('button[aria-label*="theme"]');
  await mobilePage.waitForTimeout(200);
  const shotSponsors390Dark = await mobilePage.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-390-dark.png", shotSponsors390Dark);

  await mobileContext.close();

  // Test 3: Arabic locale auto-detection (locale: ar-EG)
  const arContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ar-EG",
  });
  const arPage = await arContext.newPage();
  await arPage.goto(BASE + "/sponsors/", { waitUntil: "networkidle" });
  await arPage.waitForTimeout(200);

  await arPage.locator(".sponsor-diamond-panel button:has-text('Learn more')").click();
  await arPage.waitForTimeout(250);

  const arActiveTab = arPage.locator("dialog.sponsor-dialog[open] .sponsor-dialog-tab-active");
  check(
    "Playwright locale ar-EG automatically opens dialog in Arabic tab",
    (await arActiveTab.textContent())?.trim() === "العربية"
  );
  const arActivePanel = arPage.locator("dialog.sponsor-dialog[open] .sponsor-dialog-panel");
  check("Auto-detected Arabic panel has dir='rtl'", (await arActivePanel.getAttribute("dir")) === "rtl");

  await arContext.close();

  console.log("\n--- All tests completed successfully ---");
  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.error(`${failed.length} test(s) failed!`);
    process.exit(1);
  } else {
    console.log(`All ${results.length} assertions passed!`);
  }
} finally {
  await browser.close();
}
