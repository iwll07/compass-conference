import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const NATIONALITIES = [
  "Egypt",
  "Sudan",
  "Saudi Arabia",
  "UAE",
  "Kuwait",
  "Qatar",
  "Syria",
  "Other",
];

const UNIVERSITIES = [
  "Beni Suef National University",
  "Beni Suef University",
  "Benha National University",
  "Alexandria National University",
  "Mansoura National University",
  "American University",
  "New Giza University",
  "New Valley University",
  "Other",
];

const ACADEMIC_YEARS = [
  "First Year",
  "Second Year",
  "Third Year",
  "Fourth Year",
  "Fifth Year",
  "Intern",
  "Graduate",
];

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? "ok" : "FAIL"} - ${name}${pass ? "" : " :: " + detail}`);
}

mkdirSync(".playwright-cli/qa", { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

// Helper to mock Supabase POST /rest/v1/registrations
async function setupMock(page, onPayload) {
  await page.route("**/rest/v1/registrations*", (route) => {
    if (route.request().method() === "POST") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      if (onPayload) onPayload(payload);
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    } else {
      route.continue();
    }
  });
}

// ---- Test 1: Desktop inspection (fields, options, validation, font sizes, honeypot) ----
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });

  // 1. All six fields are required and present with visible labels
  const fields = ["reg-name", "reg-email", "reg-phone", "reg-nationality", "reg-university", "reg-year"];
  for (const id of fields) {
    const el = page.locator(`#${id}`);
    check(`field #${id} exists`, await el.count() === 1);
    check(`field #${id} has required attribute`, await el.getAttribute("required") !== null);
    const label = page.locator(`label[for="${id}"]`);
    check(`label for #${id} is visible`, await label.isVisible() && (await label.textContent())?.trim().length > 0);
  }

  // 2. Selects contain exactly the listed options in order
  const checkSelectOptions = async (selector, expectedOptions) => {
    const options = await page.locator(`${selector} option`).allTextContents();
    const [first, ...rest] = options;
    const isFirstDisabled = await page.locator(`${selector} option`).first().getAttribute("disabled");
    return first === "Select…" && isFirstDisabled !== null && JSON.stringify(rest) === JSON.stringify(expectedOptions);
  };

  check("nationality select options match exactly", await checkSelectOptions("#reg-nationality", [...NATIONALITIES]));
  check("university select options match exactly", await checkSelectOptions("#reg-university", [...UNIVERSITIES]));
  check("academic year select options match exactly", await checkSelectOptions("#reg-year", [...ACADEMIC_YEARS]));

  // 3. Inputs have 16px font-size to prevent iOS zoom
  for (const id of fields) {
    const fs = await page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).fontSize);
    check(`field #${id} font-size is 16px`, fs === "16px", fs);
  }

  // 4. Fixed visible "+20" prefix
  const prefix = page.locator(".reg-phone-prefix");
  check("phone prefix reads '+20'", (await prefix.textContent())?.trim() === "+20");
  check("phone prefix is aria-hidden", await prefix.getAttribute("aria-hidden") === "true");

  // 5. Blank field and bad phone are blocked with inline errors
  await page.fill("#reg-name", "Fares"); // single word, too short
  await page.locator("#reg-name").blur();
  check("name single-word triggers inline error", await page.locator("#reg-name-error").isVisible());

  await page.fill("#reg-phone", "01312345678"); // invalid operator
  await page.locator("#reg-phone").blur();
  check("invalid phone triggers inline error", await page.locator("#reg-phone-error").isVisible());

  // 6. Honeypot path: sends NO network request, but shows confirmation screen
  let networkSent = false;
  await page.route("**/rest/v1/registrations*", (route) => {
    networkSent = true;
    route.abort();
  });

  await page.fill("#reg-website", "spambot");
  await page.fill("#reg-name", "Bot User");
  await page.fill("#reg-email", "bot@example.com");
  await page.fill("#reg-phone", "01012345678");
  await page.selectOption("#reg-nationality", "Egypt");
  await page.selectOption("#reg-university", "Beni Suef National University");
  await page.selectOption("#reg-year", "First Year");

  await page.click('button[type="submit"]');
  await page.waitForTimeout(300);

  check("honeypot sends NO network request", !networkSent);
  check("honeypot shows confirmation heading", await page.locator("#reg-success-heading").isVisible());

  await context.close();
}

// ---- Test 2: Desktop confirmation screen & card assertions (1440px) ----
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });

  let capturedPayload = null;
  await setupMock(page, (p) => { capturedPayload = p; });

  await page.fill("#reg-name", "Ahmed Mahmoud");
  await page.fill("#reg-email", "ahmed@example.com");
  await page.fill("#reg-phone", "01012345678");
  await page.selectOption("#reg-nationality", "Egypt");
  await page.selectOption("#reg-university", "Beni Suef National University");
  await page.selectOption("#reg-year", "Third Year");

  await page.click('button[type="submit"]');
  await page.waitForSelector("#reg-success-heading", { timeout: 4000 });

  check("mocked registration sent payload", !!capturedPayload);
  check("payload has full_name", capturedPayload?.full_name === "Ahmed Mahmoud");
  check("payload has email", capturedPayload?.email === "ahmed@example.com");
  check("payload has phone with +20", capturedPayload?.phone === "+201012345678");

  // Confirmation screen heading and greeting
  check("confirmation greeting shows first name", (await page.locator(".reg-thankyou").textContent())?.includes("Ahmed") === true);

  // Focus was moved to confirmation heading
  const activeId = await page.evaluate(() => document.activeElement?.id);
  check("focus moved to confirmation heading", activeId === "reg-success-heading", activeId);

  // Attendance confirmation note
  const noteText = (await page.locator(".reg-note").textContent())?.trim();
  check("attendance confirmation note exists", !!noteText);
  check("attendance confirmation note contains unconfirmed notice", noteText?.toLowerCase().includes("attendance is not confirmed until you receive an email") === true, noteText);

  // Masked contact line
  const maskedText = (await page.locator(".reg-masked-contact").textContent())?.trim();
  check("masked contact line exists", !!maskedText);
  check("masked contact line has masked email", maskedText?.includes("a•••@example.com") === true, maskedText);
  check("masked contact line has masked phone", maskedText?.includes("+20 ••• ••• 678") === true, maskedText);

  // Card assertions: must contain name, year, university, date, and NO email or phone
  const card = page.locator(".reg-card");
  check("card figure exists", await card.count() === 1);

  // Assert card is visible with opacity 1 (not stuck at opacity 0)
  await page.waitForFunction(() => {
    const el = document.querySelector(".reg-card");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });
  const opacity = await card.evaluate((el) => getComputedStyle(el).opacity);
  check("card is visible with opacity 1", opacity === "1", `opacity: ${opacity}`);

  const cardText = (await card.textContent()) ?? "";

  check("card contains name", cardText.includes("Ahmed Mahmoud"));
  check("card contains academic year", cardText.includes("Third Year"));
  check("card contains university", cardText.includes("Beni Suef National University"));
  check("card contains conference date", cardText.includes("24 November 2026"));
  check("card contains REGISTERED label", cardText.includes("REGISTERED"));
  check("card contains venue", cardText.includes("Faculty of Medicine, Beni Suef National University"));
  check("card contains tagline", cardText.includes("Directing the Future of Healthcare"));

  // Privacy assertions on the card
  check("card does NOT contain email", !cardText.includes("ahmed@example.com") && !cardText.includes("@"));
  check("card does NOT contain phone", !cardText.includes("+20") && !cardText.includes("01012345678"));
  check("card does NOT contain reference code", !cardText.toLowerCase().includes("reference"));

  // Desktop 2-column layout at 1440px
  const headerBox = await page.locator(".reg-confirmed-header").boundingBox();
  const cardBox = await card.boundingBox();
  const bodyBox = await page.locator(".reg-confirmed-body").boundingBox();
  check("layout is two columns at 1440px", !!headerBox && !!cardBox && cardBox.x > headerBox.x + 150);
  check("body is in left column below header", !!headerBox && !!bodyBox && bodyBox.y > headerBox.y && Math.abs(bodyBox.x - headerBox.x) < 20);

  // Light mode background color of card
  const lightBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
  check("card has white background in light mode", lightBg === "rgb(255, 255, 255)");

  // Buttons in confirmation screen
  const calBtn = page.locator("button", { hasText: "Add to calendar" });
  check("Add to calendar button exists", await calBtn.count() === 1);

  const saveBtn = page.locator("button", { hasText: "Save card as image" });
  check("Save card as image button exists", await saveBtn.count() === 1);

  // Test 1: Fallback download mechanism
  await page.evaluate(() => {
    window.navigator.canShare = () => false;
  });

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 10000 }),
    saveBtn.click(),
  ]);
  check(
    "downloaded card filename matches compass-attendee-card.png",
    download.suggestedFilename() === "compass-attendee-card.png",
    download.suggestedFilename()
  );

  // Test 2: Native share sheet when navigator.canShare works
  await page.evaluate(() => {
    window.navigator.canShare = (data) => !!data?.files?.length;
    window.navigator.share = async (data) => {
      window._sharedData = { title: data.title, fileName: data.files?.[0]?.name };
    };
  });
  await saveBtn.click();
  await page.waitForTimeout(600);
  const shared = await page.evaluate(() => window._sharedData);
  check(
    "navigator.share called with file when canShare is supported",
    shared?.fileName === "compass-attendee-card.png",
    JSON.stringify(shared)
  );

  await page.screenshot({ path: ".playwright-cli/qa/registration-desktop-light.png" });

  // Dark mode test: card stays light in dark mode
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(100);

  const darkCardBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
  check("card stays white background in dark mode", darkCardBg === "rgb(255, 255, 255)");

  const pageBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("page body is dark in dark mode", pageBg !== "rgb(255, 255, 255)");

  await page.screenshot({ path: ".playwright-cli/qa/registration-desktop-dark.png" });

  await context.close();
}

// ---- Test 3: Mobile 390px confirmation screen in light and dark mode ----
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });

  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  }, theme);

  await setupMock(page);

  await page.fill("#reg-name", "Hossam Hassan");
  await page.fill("#reg-email", "hossam@example.com");
  await page.fill("#reg-phone", "01123456789");
  await page.selectOption("#reg-nationality", "Egypt");
  await page.selectOption("#reg-university", "Alexandria National University");
  await page.selectOption("#reg-year", "Second Year");

  await page.click('button[type="submit"]');
  await page.waitForSelector("#reg-success-heading", { timeout: 4000 });
  await page.waitForFunction(() => {
    const el = document.querySelector(".reg-card");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });

  // Check no horizontal overflow
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  check(`390px ${theme} confirmation has no horizontal overflow`, overflow);

  // Check vertical order at 390px: Header -> Card -> Body/Buttons
  const mHeader = await page.locator(".reg-confirmed-header").boundingBox();
  const mCard = await page.locator(".reg-confirmed-card").boundingBox();
  const mBody = await page.locator(".reg-confirmed-body").boundingBox();

  check(
    `390px ${theme} order is header -> card -> body`,
    !!mHeader && !!mCard && !!mBody && mHeader.y < mCard.y && mCard.y < mBody.y,
    JSON.stringify({ headerY: mHeader?.y, cardY: mCard?.y, bodyY: mBody?.y })
  );

  // Card stays light in both light and dark modes
  const cardBg = await page.locator(".reg-card").evaluate((el) => getComputedStyle(el).backgroundColor);
  check(`390px ${theme} card has white background`, cardBg === "rgb(255, 255, 255)");

  await page.screenshot({ path: `.playwright-cli/qa/registration-mobile-${theme}.png` });
  await context.close();
}

// ---- Test 4: Long Latin Name wrapping & layout ----
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });
  await setupMock(page);

  const longName = "Alexander Bartholomew Montgomery-Smith III";
  await page.fill("#reg-name", longName);
  await page.fill("#reg-email", "alexander@example.com");
  await page.fill("#reg-phone", "01234567890");
  await page.selectOption("#reg-nationality", "Egypt");
  await page.selectOption("#reg-university", "American University");
  await page.selectOption("#reg-year", "Intern");

  await page.click('button[type="submit"]');
  await page.waitForSelector("#reg-success-heading", { timeout: 4000 });
  await page.waitForFunction(() => {
    const el = document.querySelector(".reg-card");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });

  const nameEl = page.locator(".reg-card-name");
  const nameText = (await nameEl.textContent())?.trim();
  check("long Latin name rendered", nameText === longName);

  // Check that card name doesn't overflow horizontally
  const nameOverflow = await nameEl.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  check("long Latin name does not overflow card width", nameOverflow);

  await page.screenshot({ path: ".playwright-cli/qa/registration-long-latin.png" });
  await context.close();
}

// ---- Test 5: Arabic Name rendering (dir="auto", RTL layout) ----
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });
  await setupMock(page);

  const arabicName = "د. محمد عبد الرحمن إبراهيم النجار";
  await page.fill("#reg-name", arabicName);
  await page.fill("#reg-email", "mohamed@example.com");
  await page.fill("#reg-phone", "01512345678");
  await page.selectOption("#reg-nationality", "Egypt");
  await page.selectOption("#reg-university", "Beni Suef University");
  await page.selectOption("#reg-year", "Fifth Year");

  await page.click('button[type="submit"]');
  await page.waitForSelector("#reg-success-heading", { timeout: 4000 });
  await page.waitForFunction(() => {
    const el = document.querySelector(".reg-card");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });

  const nameEl = page.locator(".reg-card-name");
  const computedDir = await nameEl.evaluate((el) => getComputedStyle(el).direction);
  check("Arabic name computes to direction: rtl", computedDir === "rtl", computedDir);

  const nameOverflow = await nameEl.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  check("Arabic name does not overflow card width", nameOverflow);

  await page.screenshot({ path: ".playwright-cli/qa/registration-arabic.png" });
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\nREGISTRATION QA: PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) {
  console.log(JSON.stringify(failed, null, 2));
}
process.exit(failed.length ? 1 : 0);
