import { chromium } from "@playwright/test";
import {
  NATIONALITIES,
  UNIVERSITIES,
  ACADEMIC_YEARS,
} from "../lib/registration.js";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? "ok" : "FAIL"} - ${name}${pass ? "" : " :: " + detail}`);
}

const browser = await chromium.launch({ channel: "msedge" });

// ---- Test 1: Desktop inspection (fields, options, validation, mocking, honeypot) ----
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

  // 6. Honeypot path: sends NO network request, but shows success screen
  let networkSent = false;
  await page.route("**/rest/v1/registrations*", (route) => {
    networkSent = true;
    route.abort();
  });

  // Fill in honeypot field
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

// ---- Test 2: Legitimate submission with mocked Supabase request ----
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });

  let capturedPayload = null;
  await page.route("**/rest/v1/registrations*", (route) => {
    if (route.request().method() === "POST") {
      capturedPayload = JSON.parse(route.request().postData() ?? "{}");
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    } else {
      route.continue();
    }
  });

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
  check("payload has nationality", capturedPayload?.nationality === "Egypt");
  check("payload has university", capturedPayload?.university === "Beni Suef National University");
  check("payload has academic_year", capturedPayload?.academic_year === "Third Year");
  check("payload does not contain id or created_at", !capturedPayload?.id && !capturedPayload?.created_at);

  // Check confirmation screen
  check("confirmation greeting shows first name", (await page.locator(".reg-thankyou").textContent())?.includes("Ahmed") === true);
  check("confirmation shows email", (await page.locator(".reg-details").textContent())?.includes("ahmed@example.com") === true);
  check("confirmation shows phone", (await page.locator(".reg-details").textContent())?.includes("+201012345678") === true);
  check("add to calendar button exists", await page.locator("button", { hasText: "Add to calendar" }).count() === 1);
  check("back to home link exists", await page.locator('a[href="/"]', { hasText: "Back to home" }).count() === 1);

  // Focus was moved to confirmation heading
  const activeId = await page.evaluate(() => document.activeElement?.id);
  check("focus moved to confirmation heading", activeId === "reg-success-heading", activeId);

  await context.close();
}

// ---- Test 3: Mobile 390px layout in light and dark mode ----
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE + "/registration/", { waitUntil: "networkidle" });

  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  }, theme);
  await page.waitForTimeout(200);

  // Check no horizontal overflow
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth;
  });
  check(`390px ${theme} mode has no horizontal overflow`, overflow);

  // Form controls fill width nicely
  const inputWidth = await page.locator("#reg-name").evaluate((el) => el.getBoundingClientRect().width);
  check(`390px ${theme} input fills mobile width`, inputWidth >= 300, `${inputWidth}px`);

  await page.screenshot({ path: `.playwright-cli/qa/registration-mobile-${theme}.png` });
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\nREGISTRATION QA: PASS ${results.length - failed.length}/${results.length}`);
if (failed.length) {
  console.log(JSON.stringify(failed, null, 2));
}
process.exit(failed.length ? 1 : 0);
