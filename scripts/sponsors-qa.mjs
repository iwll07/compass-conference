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

  // 1h. Sponsors page verification
  await page.goto(BASE + "/sponsors/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const diamondPanel = page.locator(".sponsor-diamond-panel");
  check("Diamond panel on /sponsors exists", (await diamondPanel.count()) === 1);

  // Logo checks
  const logoImg = diamondPanel.locator(".sponsor-diamond-logo");
  check("Diamond logo renders in panel", (await logoImg.count()) === 1);
  check("Diamond logo has alt 'Mood Digital'", (await logoImg.getAttribute("alt")) === "Mood Digital");
  const logoDims = await logoImg.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
  check("Diamond logo renders at 72px", logoDims.w === 72 && logoDims.h === 72, `${logoDims.w}x${logoDims.h}`);

  // Name & tagline
  const nameEl = diamondPanel.locator(".sponsor-diamond-name");
  check(
    "Diamond panel has Mood Digital title",
    (await nameEl.textContent())?.trim() === "Mood Digital"
  );
  const nameStyles = await nameEl.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      fontSize: parseFloat(cs.fontSize),
      fontFamily: cs.fontFamily.toLowerCase(),
      fontWeight: cs.fontWeight,
    };
  });
  check(
    "Diamond panel name in site's heading font (24-26px)",
    nameStyles.fontSize >= 24 && nameStyles.fontSize <= 26 && nameStyles.fontFamily.includes("serif"),
    `${nameStyles.fontSize}px ${nameStyles.fontFamily}`
  );

  const taglineEl = diamondPanel.locator(".sponsor-diamond-tagline");
  check(
    "Diamond panel has correct tagline",
    (await taglineEl.textContent())?.trim() === "Official Technology Partner of COMPASS 2026"
  );
  const taglineStyles = await taglineEl.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontSize: parseFloat(cs.fontSize) };
  });
  check("Diamond panel tagline is 14px", Math.round(taglineStyles.fontSize) === 14);

  // Logo and text aligned vertically
  const brandAligned = await diamondPanel.locator(".sponsor-diamond-brand").evaluate((el) => {
    return getComputedStyle(el).alignItems === "center";
  });
  check("Logo and text aligned vertically in brand container", brandAligned);

  // Right: 4 icon links at 24px with 44px hit areas
  const diamondLinks = diamondPanel.locator(".sponsor-diamond-link");
  check("Diamond panel has 4 icon links", (await diamondLinks.count()) === 4);
  const linksValid = await diamondLinks.evaluateAll((els) => {
    return els.every((el) => {
      const rect = el.getBoundingClientRect();
      const svg = el.querySelector("svg");
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      return rect.width >= 44 && rect.height >= 44 && svgRect && Math.round(svgRect.width) === 24;
    });
  });
  check("Each icon link has >=44px hit area and 24px icon", linksValid);

  // Check exact hrefs and rels on panel
  const panelFb = diamondPanel.locator('.sponsor-diamond-link[aria-label="Mood Digital on Facebook"]');
  check("Panel FB href matches", (await panelFb.getAttribute("href")) === expectedFb);
  check("Panel FB rel contains noopener", (await panelFb.getAttribute("rel"))?.includes("noopener") === true);

  const panelIg = diamondPanel.locator('.sponsor-diamond-link[aria-label="Mood Digital on Instagram"]');
  check("Panel IG href matches", (await panelIg.getAttribute("href")) === expectedIg);

  const panelWa = diamondPanel.locator('.sponsor-diamond-link[aria-label="Mood Digital on WhatsApp"]');
  check("Panel WA href matches", (await panelWa.getAttribute("href")) === expectedWhatsapp);

  const panelEmail = diamondPanel.locator('.sponsor-diamond-link[aria-label="Mood Digital on Email"]');
  check("Panel Email href matches", (await panelEmail.getAttribute("href")) === expectedEmail);
  check("Panel Email has no target", (await panelEmail.getAttribute("target")) === null);

  // Divider
  const divider = diamondPanel.locator(".sponsor-diamond-divider");
  check("Diamond panel 1px divider exists", (await divider.count()) === 1);
  const dividerStyles = await divider.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      height: parseFloat(cs.height),
      marginTop: parseFloat(cs.marginTop),
      marginBottom: parseFloat(cs.marginBottom),
    };
  });
  check(
    "Divider is 1px with 24px margin above and below",
    dividerStyles.height === 1 && Math.round(dividerStyles.marginTop) === 24 && Math.round(dividerStyles.marginBottom) === 24
  );

  // Row 2: summary paragraph at 14.5px, line-height 1.7, max-width ~66ch
  const expectedSummary =
    "Mood Digital is a custom software and digital systems agency specializing in high-performance web applications, automated event & QR check-in ecosystems, clinic management dashboards, and e-learning platforms. Proudly powering the digital experience of COMPASS 2026.";
  const summaryEl = diamondPanel.locator(".sponsor-diamond-summary");
  const actualSummary = (await summaryEl.textContent())?.trim();
  check("Diamond panel summary renders exact copy", actualSummary === expectedSummary);
  check("Diamond panel summary renders '&' correctly", actualSummary?.includes("event & QR check-in") === true);
  const summaryStyles = await summaryEl.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      fontSize: parseFloat(cs.fontSize),
      lineHeight: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
    };
  });
  check(
    "Summary has 14.5px font-size and ~1.7 line-height",
    Math.abs(summaryStyles.fontSize - 14.5) <= 0.5 && Math.abs(summaryStyles.lineHeight - 1.7) <= 0.1
  );

  // Row 3: "Learn more" button (inverse button style, min-height 44px, 8px radius, trailing ArrowRight)
  const learnMoreBtn = diamondPanel.locator("button.sponsor-diamond-btn");
  check("Diamond panel has 'Learn more' button", (await learnMoreBtn.count()) === 1);
  check("Learn more button has trailing arrow icon", (await learnMoreBtn.locator("svg").count()) === 1);
  const btnStyles = await learnMoreBtn.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      borderRadius: parseFloat(cs.borderRadius),
      minHeight: parseFloat(cs.minHeight),
    };
  });
  check(
    "Learn more button has min-height >=44px and 8px radius",
    btnStyles.minHeight >= 44 && btnStyles.borderRadius === 8
  );

  // Tier label styling
  const tierLabel = page.locator(".sponsor-tier-label").first();
  const labelStyles = await tierLabel.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      fontSize: parseFloat(cs.fontSize),
      fontFamily: cs.fontFamily.toLowerCase(),
      textTransform: cs.textTransform,
      letterSpacing: cs.letterSpacing,
      marginBottom: parseFloat(cs.marginBottom),
    };
  });
  check("Tier label is sans-serif", labelStyles.fontFamily.includes("public sans"));
  check("Tier label is 11px uppercase", labelStyles.fontSize === 11 && labelStyles.textTransform === "uppercase");
  check("Tier label has ~14px margin to panel", Math.round(labelStyles.marginBottom) === 14);

  // Note below tiers
  const supportSection = page.locator(".sponsor-support-section");
  check("Support note section exists below tiers", (await supportSection.count()) === 1);
  check(
    "Support note copy is updated",
    (await supportSection.locator(".sponsor-support-copy").textContent())?.trim() ===
      "Other partners and sponsors have not been announced yet. Once confirmed they will be announced here along the way."
  );
  check(
    "Support note heading is 20px",
    await supportSection.locator(".sponsor-support-heading").evaluate((el) => {
      return Math.round(parseFloat(getComputedStyle(el).fontSize)) === 20;
    })
  );
  check(
    "Support note has link to /about",
    (await supportSection.locator('a[href^="/about"]').count()) === 1
  );

  // Dialog opens from Diamond panel Learn More button
  await learnMoreBtn.click();
  await page.waitForTimeout(200);
  check(
    "Dialog opens from Diamond panel Learn more button",
    (await page.locator("dialog.sponsor-dialog[open]").count()) === 1
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // Screenshots at 1440, 1280, 1024, 390 in light and dark
  // 1440 light & dark
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(150);
  const shot1440Light = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1440-light.png", shot1440Light);
  saveShot("sponsors-page-desktop.png", shot1440Light);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const shot1440Dark = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1440-dark.png", shot1440Dark);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);

  // 1280 light & dark
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(150);
  const shot1280Light = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1280-light.png", shot1280Light);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const shot1280Dark = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1280-dark.png", shot1280Dark);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);

  // 1024 light & dark
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(150);
  const shot1024Light = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1024-light.png", shot1024Light);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const shot1024Dark = await page.screenshot({ fullPage: true });
  saveShot("sponsors-diamond-1024-dark.png", shot1024Dark);

  await page.click('button[aria-label*="theme"]');
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

  // Check mobile stacked layout below 700px
  const mobileHeaderStacked = await mobilePage.locator(".sponsor-diamond-header").evaluate((el) => {
    return getComputedStyle(el).flexDirection === "column";
  });
  check("Below 700px: Diamond header stacks vertically", mobileHeaderStacked);

  const mobileBtnFullWidth = await mobilePage.locator("button.sponsor-diamond-btn").evaluate((el) => {
    const parentPadding = parseFloat(getComputedStyle(el.parentElement).paddingLeft) + parseFloat(getComputedStyle(el.parentElement).paddingRight);
    const parentContentWidth = el.parentElement.clientWidth - parentPadding;
    return Math.abs(el.offsetWidth - parentContentWidth) <= 4;
  });
  check("Below 700px: Learn more button is full width", mobileBtnFullWidth);

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
