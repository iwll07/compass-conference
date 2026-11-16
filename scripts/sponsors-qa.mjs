import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
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
    (await footerBtn.getAttribute("aria-label")) === "About Mood Digital"
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

  const homeTile = page.locator(".sponsor-strip-tile");
  check("Every sponsor has a tile on the home strip", (await homeTile.count()) === 6);
  check(
    "Home strip tiles all use the one shared style",
    (await homeTile
      .evaluateAll((els) => els.every((el) => el.className.trim() === "sponsor-strip-tile hover-lift")))
  );

  // Home strip screenshot
  const shotHomeStrip = await page.screenshot({ fullPage: false });
  saveShot("home-strip-desktop.png", shotHomeStrip);

  // Click home strip logo opens dialog
  await homeTile.first().click();
  await page.waitForTimeout(200);
  check("Dialog opens from home strip tile", (await page.locator("dialog.sponsor-dialog[open]").count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // 1h. Sponsors page verification
  await page.goto(BASE + "/sponsors/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const panels = page.locator(".sponsor-panel");
  check("Six sponsor panels on /sponsors", (await panels.count()) === 6);
  // Mood Digital is first in declaration order and owns the detailed assertions.
  const moodPanel = panels.first();

  // Logo checks
  const logoImg = moodPanel.locator(".sponsor-panel-logo");
  check("Sponsor logo renders in panel", (await logoImg.count()) === 1);
  check("Sponsor logo uses its data alt", (await logoImg.getAttribute("alt")) === "Mood Digital logo");
  const logoDims = await logoImg.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
  check("Sponsor logo renders at 72px height", logoDims.h === 72 && logoDims.w > 0, `${logoDims.w}x${logoDims.h}`);

  // Name & tagline
  const nameEl = moodPanel.locator(".sponsor-panel-name");
  check(
    "Mood panel has Mood Digital title",
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
    "Mood panel name in site's heading font (24-26px)",
    nameStyles.fontSize >= 24 && nameStyles.fontSize <= 26 && nameStyles.fontFamily.includes("serif"),
    `${nameStyles.fontSize}px ${nameStyles.fontFamily}`
  );

  const taglineEl = moodPanel.locator(".sponsor-panel-tagline");
  check(
    "Mood panel has correct tagline",
    (await taglineEl.textContent())?.trim() === "Official Technology Partner of COMPASS 2026"
  );
  const taglineStyles = await taglineEl.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontSize: parseFloat(cs.fontSize) };
  });
  check("Mood panel tagline is 14px", Math.round(taglineStyles.fontSize) === 14);

  // Logo and text aligned vertically
  const brandAligned = await moodPanel.locator(".sponsor-panel-brand").evaluate((el) => {
    return getComputedStyle(el).alignItems === "center";
  });
  check("Logo and text aligned vertically in brand container", brandAligned);

  // Right: 4 icon links at 24px with 44px hit areas
  const panelLinks = moodPanel.locator(".sponsor-panel-link");
  check("Mood panel has 4 icon links", (await panelLinks.count()) === 4);
  const linksValid = await panelLinks.evaluateAll((els) => {
    return els.every((el) => {
      const rect = el.getBoundingClientRect();
      const svg = el.querySelector("svg");
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      return rect.width >= 44 && rect.height >= 44 && svgRect && Math.round(svgRect.width) === 24;
    });
  });
  check("Each icon link has >=44px hit area and 24px icon", linksValid);

  // Check exact hrefs and rels on panel
  const panelFb = moodPanel.locator('.sponsor-panel-link[aria-label="Mood Digital on Facebook"]');
  check("Panel FB href matches", (await panelFb.getAttribute("href")) === expectedFb);
  check("Panel FB rel contains noopener", (await panelFb.getAttribute("rel"))?.includes("noopener") === true);

  const panelIg = moodPanel.locator('.sponsor-panel-link[aria-label="Mood Digital on Instagram"]');
  check("Panel IG href matches", (await panelIg.getAttribute("href")) === expectedIg);

  const panelWa = moodPanel.locator('.sponsor-panel-link[aria-label="Mood Digital on WhatsApp"]');
  check("Panel WA href matches", (await panelWa.getAttribute("href")) === expectedWhatsapp);

  const panelEmail = moodPanel.locator('.sponsor-panel-link[aria-label="Mood Digital on Email"]');
  check("Panel Email href matches", (await panelEmail.getAttribute("href")) === expectedEmail);
  check("Panel Email has no target", (await panelEmail.getAttribute("target")) === null);

  // Divider
  const divider = moodPanel.locator(".sponsor-panel-divider");
  check("Mood panel 1px divider exists", (await divider.count()) === 1);
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
  const summaryEl = moodPanel.locator(".sponsor-panel-summary");
  const actualSummary = (await summaryEl.textContent())?.trim();
  check("Mood panel summary renders exact copy", actualSummary === expectedSummary);
  check("Mood panel summary renders '&' correctly", actualSummary?.includes("event & QR check-in") === true);
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
  const learnMoreBtn = moodPanel.locator("button.sponsor-panel-btn");
  check("Mood panel has 'Learn more' button", (await learnMoreBtn.count()) === 1);
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

  // Tiers are gone: nothing on the page may say "Diamond", "Gold" or "Silver".
  const pageText = await page.locator(".sponsors-page-body").innerText();
  check(
    "No tier labels or tier wording remain",
    (await page.locator(".sponsor-tier-label").count()) === 0 &&
      !/\bdiamond\b|\bgold\b|\bsilver\b/i.test(pageText)
  );

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

  // Dialog opens from the Mood Digital panel's Learn More button
  await learnMoreBtn.click();
  await page.waitForTimeout(200);
  check(
    "Dialog opens from the panel Learn more button",
    (await page.locator("dialog.sponsor-dialog[open]").count()) === 1
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // Sim Era: second full panel
  const simPanel = panels.filter({ hasText: "Sim Era" });
  check("Sim Era panel exists", (await simPanel.count()) === 1);
  check(
    "Sim Era panel has correct tagline",
    (await simPanel.locator(".sponsor-panel-tagline").textContent())?.trim() ===
      "Medical Simulation & Education Partner of COMPASS 2026"
  );
  check(
    "Sim Era logo has alt 'Sim Era logo'",
    (await simPanel.locator(".sponsor-panel-logo").getAttribute("alt")) === "Sim Era logo"
  );
  const simLogoDims = await simPanel.locator(".sponsor-panel-logo").evaluate((el) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
  }));
  check(
    "Sim Era logo is a square badge (circular like C4 and Thrills)",
    simLogoDims.w === 320 && simLogoDims.h === 320,
    `${simLogoDims.w}x${simLogoDims.h}`
  );
  const simLinks = simPanel.locator(".sponsor-panel-link");
  check("Sim Era panel has 2 icon links", (await simLinks.count()) === 2);
  const simWebsite = simPanel.locator('.sponsor-panel-link[aria-label="Visit Sim Era website"]');
  check("Sim Era website href matches", (await simWebsite.getAttribute("href")) === "https://www.sim-era.com/");
  check("Sim Era website opens in new tab", (await simWebsite.getAttribute("target")) === "_blank");
  const simEmail = simPanel.locator('.sponsor-panel-link[aria-label="Sim Era on Email"]');
  check("Sim Era email href matches", (await simEmail.getAttribute("href")) === "mailto:info@sim-era.com");
  check("Sim Era email has no target", (await simEmail.getAttribute("target")) === null);

  // Sim Era dialog: EN and AR details render
  await simPanel.locator("button.sponsor-panel-btn").click();
  await page.waitForTimeout(200);
  const simDialog = page.locator("dialog.sponsor-dialog[open]");
  check("Sim Era dialog opens", (await simDialog.count()) === 1);
  check(
    "Sim Era dialog shows English title",
    (await simDialog.locator(".sponsor-dialog-title").textContent())?.trim() ===
      "Medical Simulation & Education Partner of COMPASS 2026"
  );
  await simDialog.locator('button[role="tab"]:has-text("العربية")').click();
  await page.waitForTimeout(150);
  check(
    "Sim Era dialog switches to Arabic",
    (await simDialog.locator(".sponsor-dialog-panel").getAttribute("dir")) === "rtl"
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // Beni-Swef Medical Syndicate: no description, so a compact panel and a
  // links-only dialog (Facebook + Google Maps location).
  const syndicatePanel = panels.filter({ hasText: "Beni-Swef Medical Syndicate" });
  check("Syndicate panel exists", (await syndicatePanel.count()) === 1);
  check(
    "Syndicate uses the compact panel",
    (await syndicatePanel.getAttribute("class"))?.includes("sponsor-panel-compact") === true
  );
  check(
    "Compact panel has no summary and no Learn more button",
    (await syndicatePanel.locator(".sponsor-panel-summary").count()) === 0 &&
      (await syndicatePanel.locator(".sponsor-panel-btn").count()) === 0
  );
  const syndicateLinks = syndicatePanel.locator(".sponsor-panel-link");
  check("Syndicate panel has 2 icon links", (await syndicateLinks.count()) === 2);
  const syndicateFb = syndicatePanel.locator(
    '.sponsor-panel-link[aria-label="Beni-Swef Medical Syndicate on Facebook"]'
  );
  check(
    "Syndicate Facebook href matches",
    (await syndicateFb.getAttribute("href")) === "https://www.facebook.com/share/1RBzviQhJf/"
  );
  const syndicateMap = syndicatePanel.locator(
    '.sponsor-panel-link[aria-label="Location of Beni-Swef Medical Syndicate on Google Maps"]'
  );
  check(
    "Syndicate location href matches",
    (await syndicateMap.getAttribute("href")) === "https://maps.app.goo.gl/DY6VGfV7ufUTTQEu7"
  );
  check("Syndicate location opens in a new tab", (await syndicateMap.getAttribute("target")) === "_blank");

  const compactBox = await syndicatePanel.boundingBox();
  const fullBox = await moodPanel.boundingBox();
  check(
    "Compact panel is the same width as a full panel",
    !!compactBox && !!fullBox && Math.abs(compactBox.width - fullBox.width) <= 1,
    `${Math.round(compactBox?.width ?? 0)}px vs ${Math.round(fullBox?.width ?? 0)}px`
  );
  check(
    "Compact panel has no divider",
    (await syndicatePanel.locator(".sponsor-panel-divider").count()) === 0
  );

  // Clicking the compact panel opens the links-only dialog.
  await syndicatePanel.locator("button.sponsor-panel-compact-btn").click();
  await page.waitForTimeout(200);
  const syndicateDialog = page.locator("dialog.sponsor-dialog[open]");
  check("Syndicate dialog opens", (await syndicateDialog.count()) === 1);
  check(
    "Syndicate dialog is the links-only variant",
    (await syndicateDialog.getAttribute("class"))?.includes("sponsor-dialog--links-only") === true
  );
  check(
    "Syndicate dialog has no language tabs and no body copy",
    (await syndicateDialog.locator(".sponsor-dialog-tabs").count()) === 0 &&
      (await syndicateDialog.locator(".sponsor-dialog-title").count()) === 0
  );
  check(
    "Syndicate dialog shows the sponsor name",
    (await syndicateDialog.locator(".sponsor-dialog-name").textContent())?.trim() ===
      "Beni-Swef Medical Syndicate"
  );
  const syndicateDialogLinks = syndicateDialog.locator(".sponsor-dialog-link");
  check("Syndicate dialog renders 2 link buttons", (await syndicateDialogLinks.count()) === 2);
  check(
    "Syndicate dialog links are Facebook and Location",
    (await syndicateDialogLinks.locator("span").allTextContents()).join("|") === "Facebook|Location"
  );
  check(
    "Syndicate location link uses the maps icon",
    (await syndicateDialog
      .locator('a[aria-label="Location of Beni-Swef Medical Syndicate on Google Maps"] svg')
      .count()) === 1
  );
  const linksOnlyWidth = await syndicateDialog.evaluate((el) =>
    parseFloat(getComputedStyle(el).width)
  );
  check("Links-only dialog is the smaller 420px panel", Math.round(linksOnlyWidth) === 420, `${linksOnlyWidth}px`);

  saveShot("sponsor-links-dialog-1440-light.png", await page.screenshot({ fullPage: false }));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check(
    "Links-only dialog closes on Escape and returns focus",
    (await page.locator("dialog.sponsor-dialog[open]").count()) === 0 &&
      (await page.evaluate(
        () => document.activeElement?.classList.contains("sponsor-panel-compact-btn") === true
      ))
  );

  // Thrills: links only, no description — compact panel and links-only dialog,
  // with the new TikTok kind alongside the usual ones.
  const thrillsPanel = panels.filter({ hasText: "Thrills" });
  check("Thrills panel exists", (await thrillsPanel.count()) === 1);
  check(
    "Thrills uses the compact panel",
    (await thrillsPanel.getAttribute("class"))?.includes("sponsor-panel-compact") === true
  );
  const thrillsLogoDims = await thrillsPanel.locator(".sponsor-panel-logo").evaluate((el) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
  }));
  check(
    "Thrills logo is a square badge (circular like C4)",
    thrillsLogoDims.w === 320 && thrillsLogoDims.h === 320,
    `${thrillsLogoDims.w}x${thrillsLogoDims.h}`
  );
  const thrillsLinks = thrillsPanel.locator(".sponsor-panel-link");
  check("Thrills panel has 4 icon links", (await thrillsLinks.count()) === 4);
  const thrillsTiktok = thrillsPanel.locator(
    '.sponsor-panel-link[aria-label="Thrills on TikTok"]'
  );
  check(
    "Thrills TikTok href matches",
    (await thrillsTiktok.getAttribute("href")) ===
      "https://www.tiktok.com/@thrills.eg?_r=1&_t=ZS-9BS7IHRsHej"
  );
  check(
    "Thrills TikTok opens in a new tab",
    (await thrillsTiktok.getAttribute("target")) === "_blank"
  );
  const thrillsEmail = thrillsPanel.locator(
    '.sponsor-panel-link[aria-label="Thrills on Email"]'
  );
  check(
    "Thrills email href matches",
    (await thrillsEmail.getAttribute("href")) === "mailto:mythrills.eg@gmail.com"
  );
  check("Thrills email has no target", (await thrillsEmail.getAttribute("target")) === null);

  await thrillsPanel.locator("button.sponsor-panel-compact-btn").click();
  await page.waitForTimeout(200);
  const thrillsDialog = page.locator("dialog.sponsor-dialog[open]");
  check("Thrills dialog opens", (await thrillsDialog.count()) === 1);
  check(
    "Thrills dialog shows the sponsor name",
    (await thrillsDialog.locator(".sponsor-dialog-name").textContent())?.trim() === "Thrills"
  );
  check(
    "Thrills dialog links are Facebook, Instagram, TikTok and Email",
    (await thrillsDialog.locator(".sponsor-dialog-link span").allTextContents()).join("|") ===
      "Facebook|Instagram|TikTok|Email"
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // C4 Gym & Fitness: links only, including WhatsApp. The number is a
  // WhatsApp contact, not a plain phone link.
  const c4Panel = panels.filter({ hasText: "C4 Gym & Fitness" });
  check("C4 panel exists", (await c4Panel.count()) === 1);
  check(
    "C4 uses the compact panel",
    (await c4Panel.getAttribute("class"))?.includes("sponsor-panel-compact") === true
  );
  const c4Links = c4Panel.locator(".sponsor-panel-link");
  check("C4 panel has 3 icon links", (await c4Links.count()) === 3);
  const c4Map = c4Panel.locator(
    '.sponsor-panel-link[aria-label="Location of C4 Gym & Fitness on Google Maps"]'
  );
  check(
    "C4 location href matches",
    (await c4Map.getAttribute("href")) === "https://maps.app.goo.gl/YX4dhLVywhDSrb2YA"
  );
  const c4Wa = c4Panel.locator(
    '.sponsor-panel-link[aria-label="C4 Gym & Fitness on WhatsApp"]'
  );
  check("C4 WhatsApp href matches", (await c4Wa.getAttribute("href")) === "https://wa.me/201007007257");
  check("C4 WhatsApp opens in a new tab", (await c4Wa.getAttribute("target")) === "_blank");

  await c4Panel.locator("button.sponsor-panel-compact-btn").click();
  await page.waitForTimeout(200);
  const c4Dialog = page.locator("dialog.sponsor-dialog[open]");
  check("C4 dialog opens", (await c4Dialog.count()) === 1);
  check(
    "C4 dialog links are Facebook, Location and WhatsApp",
    (await c4Dialog.locator(".sponsor-dialog-link span").allTextContents()).join("|") ===
      "Facebook|Location|WhatsApp"
  );
  const c4DialogWa = c4Dialog.locator(
    'a[aria-label="C4 Gym & Fitness on WhatsApp"]'
  );
  check(
    "C4 dialog WhatsApp href matches and opens in a new tab",
    (await c4DialogWa.getAttribute("href")) === "https://wa.me/201007007257" &&
      (await c4DialogWa.getAttribute("target")) === "_blank"
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // Scrubbie: links only, no description — compact panel and links-only
  // dialog, with the circular badge trimmed from the uploaded banner.
  const scrubbiePanel = panels.filter({ hasText: "Scrubbie" });
  check("Scrubbie panel exists", (await scrubbiePanel.count()) === 1);
  check(
    "Scrubbie uses the compact panel",
    (await scrubbiePanel.getAttribute("class"))?.includes("sponsor-panel-compact") === true
  );
  const scrubbieLogoDims = await scrubbiePanel.locator(".sponsor-panel-logo").evaluate((el) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
  }));
  check(
    "Scrubbie logo is a square badge (circular like C4 and Thrills)",
    scrubbieLogoDims.w === 320 && scrubbieLogoDims.h === 320,
    `${scrubbieLogoDims.w}x${scrubbieLogoDims.h}`
  );
  const scrubbieLinks = scrubbiePanel.locator(".sponsor-panel-link");
  check("Scrubbie panel has 4 icon links", (await scrubbieLinks.count()) === 4);
  const scrubbieLinkSpecs = [
    ["Scrubbie on Facebook", "https://www.facebook.com/share/19eiru5qts/", true],
    ["Scrubbie on Instagram", "https://www.instagram.com/scrubbie6r?obrf=cjE4Nmw2dXd1MHN2", true],
    ["Scrubbie on TikTok", "https://www.tiktok.com/@scrubbie6?_r=1&_t=ZS-9BSOfSvPXPQ", true],
    ["Scrubbie on Email", "mailto:hanarawan2005@icloud.com", false],
  ];
  for (const [label, href, external] of scrubbieLinkSpecs) {
    const link = scrubbiePanel.locator(`.sponsor-panel-link[aria-label="${label}"]`);
    check(`Scrubbie "${label}" href matches`, (await link.getAttribute("href")) === href);
    check(
      `Scrubbie "${label}" ${external ? "opens" : "does not open"} in a new tab`,
      external
        ? (await link.getAttribute("target")) === "_blank"
        : (await link.getAttribute("target")) === null
    );
  }

  await scrubbiePanel.locator("button.sponsor-panel-compact-btn").click();
  await page.waitForTimeout(200);
  const scrubbieDialog = page.locator("dialog.sponsor-dialog[open]");
  check("Scrubbie dialog opens", (await scrubbieDialog.count()) === 1);
  check(
    "Scrubbie dialog shows the sponsor name",
    (await scrubbieDialog.locator(".sponsor-dialog-name").textContent())?.trim() === "Scrubbie"
  );
  check(
    "Scrubbie dialog links are Facebook, Instagram, TikTok and Email",
    (await scrubbieDialog.locator(".sponsor-dialog-link span").allTextContents()).join("|") ===
      "Facebook|Instagram|TikTok|Email"
  );
  check(
    "Scrubbie dialog email href matches",
    (await scrubbieDialog.locator('a[aria-label="Scrubbie on Email"]').getAttribute("href")) ===
      "mailto:hanarawan2005@icloud.com"
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // Screenshots at 1440, 1280, 1024, 390 in light and dark
  // 1440 light & dark
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(150);
  const shot1440Light = await page.screenshot({ fullPage: true });
  saveShot("sponsors-1440-light.png", shot1440Light);
  saveShot("sponsors-page-desktop.png", shot1440Light);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const shot1440Dark = await page.screenshot({ fullPage: true });
  saveShot("sponsors-1440-dark.png", shot1440Dark);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);

  // 1280 light & dark
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(150);
  const shot1280Light = await page.screenshot({ fullPage: true });
  saveShot("sponsors-1280-light.png", shot1280Light);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const shot1280Dark = await page.screenshot({ fullPage: true });
  saveShot("sponsors-1280-dark.png", shot1280Dark);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(150);

  // 1024 light & dark
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(150);
  const shot1024Light = await page.screenshot({ fullPage: true });
  saveShot("sponsors-1024-light.png", shot1024Light);

  await page.click('button[aria-label*="theme"]');
  await page.waitForTimeout(200);
  const shot1024Dark = await page.screenshot({ fullPage: true });
  saveShot("sponsors-1024-dark.png", shot1024Dark);

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
  const mobileHeaderStacked = await mobilePage.locator(".sponsor-panel-header").first().evaluate((el) => {
    return getComputedStyle(el).flexDirection === "column";
  });
  check("Below 700px: sponsor header stacks vertically", mobileHeaderStacked);

  const mobileBtnFullWidth = await mobilePage.locator("button.sponsor-panel-btn").first().evaluate((el) => {
    const parentPadding = parseFloat(getComputedStyle(el.parentElement).paddingLeft) + parseFloat(getComputedStyle(el.parentElement).paddingRight);
    const parentContentWidth = el.parentElement.clientWidth - parentPadding;
    return Math.abs(el.offsetWidth - parentContentWidth) <= 4;
  });
  check("Below 700px: Learn more button is full width", mobileBtnFullWidth);

  // The compact panel's header stacks like the full panels do.
  const mobileCompactStacked = await mobilePage
    .locator(".sponsor-panel-compact .sponsor-panel-header")
    .first()
    .evaluate((el) => getComputedStyle(el).flexDirection === "column");
  check("Below 700px: compact panel header stacks", mobileCompactStacked);

  // Screenshots: /sponsors/ mobile light & dark (390)
  const shotSponsors390Light = await mobilePage.screenshot({ fullPage: true });
  saveShot("sponsors-390-light.png", shotSponsors390Light);
  saveShot("sponsors-page-mobile.png", shotSponsors390Light);

  await mobilePage.click('button[aria-label*="theme"]');
  await mobilePage.waitForTimeout(200);
  const shotSponsors390Dark = await mobilePage.screenshot({ fullPage: true });
  saveShot("sponsors-390-dark.png", shotSponsors390Dark);

  // Links-only dialog on mobile, light
  await mobilePage.click('button[aria-label*="theme"]');
  await mobilePage.waitForTimeout(150);
  await mobilePage.locator("button.sponsor-panel-compact-btn").first().click();
  await mobilePage.waitForTimeout(200);
  saveShot("sponsor-links-dialog-390-light.png", await mobilePage.screenshot({ fullPage: false }));
  await mobilePage.keyboard.press("Escape");
  await mobilePage.waitForTimeout(150);

  await mobileContext.close();

  // Test 3: Arabic locale auto-detection (locale: ar-EG)
  const arContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ar-EG",
  });
  const arPage = await arContext.newPage();
  await arPage.goto(BASE + "/sponsors/", { waitUntil: "networkidle" });
  await arPage.waitForTimeout(200);

  await arPage.locator(".sponsor-panel button:has-text('Learn more')").first().click();
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
