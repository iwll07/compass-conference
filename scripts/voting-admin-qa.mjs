// Admin voting QA. Every Supabase request is mocked: this script never reads
// or writes the live database. Auth is a fake magic-link session in the URL,
// exactly like scripts/registration-qa.mjs uses.
//
// Usage: node scripts/voting-admin-qa.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3002";
const OUT = ".playwright-cli/qa/voting-admin";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? "ok" : "FAIL"} - ${name}${pass ? "" : " :: " + detail}`);
}

const CANDIDATE_IDS = [
  "digital-phenotyping-mental-health",
  "artificial-intelligence-revolution-or-risk",
  "base-editing-revolution",
  "dna-origami-nanorobotics",
  "preeclampsia-statin-metformin-vitamin-d",
  "organoids-miniature-organs",
];

const browser = await chromium.launch({ channel: "msedge" });

/**
 * One mock server per page. The mutable objects are the "database": PATCH
 * writes into voting, and voting_results() reads it back, so a status change
 * has to survive the page's follow-up refresh for the test to pass.
 */
async function createAdminPage(config = {}) {
  const {
    signedIn = true,
    email = "admin@example.com",
    status = "open",
    liveResults = false,
    votes = [10, 4, 3, 2, 1, 0],
    theme = "light",
    viewport = { width: 1440, height: 1000 },
  } = config;

  const voting = { status, live_results: liveResults };
  const tallies = [...votes];
  const patches = [];
  let resultsCalls = 0;
  let resetCalls = 0;
  let castCalls = 0;

  const context = await browser.newContext({ viewport });
  await context.addInitScript((theme) => {
    localStorage.setItem("compass-theme", theme);
  }, theme);

  await context.route("**/auth/v1/user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "mock-user-id",
        email,
        role: "authenticated",
        app_metadata: {},
        user_metadata: {},
      }),
    })
  );

  await context.route("**/auth/v1/token*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: { id: "mock-user-id", email },
      }),
    })
  );

  await context.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (url.includes("/rest/v1/voting_settings")) {
      if (method === "PATCH") {
        const body = JSON.parse(request.postData() ?? "{}");
        patches.push(body);
        Object.assign(voting, body);
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "current",
          status: voting.status,
          live_results: voting.live_results,
        }),
      });
    }

    if (url.includes("/rest/v1/rpc/voting_results")) {
      resultsCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: voting.status,
          live_results: voting.live_results,
          total: tallies.reduce((sum, value) => sum + value, 0),
          candidates: CANDIDATE_IDS.map((id, index) => ({
            id,
            votes: tallies[index] ?? 0,
          })),
        }),
      });
    }

    if (url.includes("/rest/v1/rpc/cast_vote")) {
      castCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify("ok"),
      });
    }

    if (url.includes("/rest/v1/rpc/clear_all_votes")) {
      const deleted = tallies.reduce((sum, value) => sum + value, 0);
      tallies.fill(0);
      resetCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(deleted),
      });
    }

    if (url.includes("/rest/v1/registration_settings")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "current", status: "open" }),
      });
    }

    if (url.includes("/rest/v1/rpc/registration_summary")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 0,
          by_university: [],
          by_academic_year: [],
        }),
      });
    }

    if (url.includes("/rest/v1/rpc/search_registrations")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    // Everything else on the admin page (announcements, logs, registration
    // counts) is empty. An empty array is a valid PostgREST response for a
    // list select and keeps the page quiet.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-0/0" },
      body: JSON.stringify([]),
    });
  });

  const page = await context.newPage();
  const hash = signedIn
    ? "/admin/#access_token=mock-token&refresh_token=mock-refresh&expires_in=3600&token_type=bearer&type=recovery"
    : "/admin/";
  await page.goto(BASE + hash, { waitUntil: "domcontentloaded" });

  return {
    context,
    page,
    voting,
    tallies,
    patches,
    resultsCalls: () => resultsCalls,
    resetCalls: () => resetCalls,
    castCalls: () => castCalls,
  };
}

// ---- Controls and results ---------------------------------------------------

{
  const { context, page, voting, tallies, patches, resultsCalls } =
    await createAdminPage();

  await page.waitForSelector(".vote-admin-section");

  check(
    "admin: voting section is present",
    (await page.locator(".vote-admin-section").count()) === 1
  );
  check(
    "admin: status pills match the three states",
    (await page.locator(".vote-admin-status [role=radio]").count()) === 3
  );
  check(
    "admin: open is selected",
    (await page
      .locator(".vote-admin-status")
      .getByRole("radio", { name: /^Open/ })
      .getAttribute("aria-checked")) === "true"
  );
  check(
    "admin: live results start unchecked",
    !(await page.locator(".vote-admin-toggle input").isChecked())
  );

  await page.waitForSelector(".vote-admin-table tbody tr");
  check(
    "admin: six candidate rows",
    (await page.locator(".vote-admin-table tbody tr").count()) === 6
  );

  const firstRow = page.locator(".vote-admin-table tbody tr").first();
  const firstCells = firstRow.locator("td");
  check(
    "admin: first row shows the presenter",
    (await firstCells.nth(0).textContent())?.includes("Malak Ashraf Saad Abdelfatah") === true
  );
  check(
    "admin: first row votes",
    (await firstCells.nth(1).textContent())?.trim() === "10"
  );
  check(
    "admin: first row percentage",
    (await firstCells.nth(2).textContent())?.trim() === "50%"
  );
  check(
    "admin: total row",
    (await page.locator(".vote-admin-total").textContent())?.includes(
      "20 votes cast"
    ) === true
  );
  check(
    "admin: the manual reset note is gone",
    (await page.locator(".vote-admin-note").count()) === 0 &&
      (await page.locator("main").textContent())?.includes(
        "delete rows from"
      ) === false
  );

  const previewBtn = page.locator(".vote-preview-btn");
  check(
    "admin: 'Open vote preview' button exists",
    (await previewBtn.count()) === 1
  );
  check(
    "admin: preview button links to the vote preview",
    (await previewBtn.getAttribute("href")) === "/vote/?preview=true"
  );
  check(
    "admin: preview button opens in a new tab",
    (await previewBtn.getAttribute("target")) === "_blank"
  );

  // Close voting.
  await page
    .locator(".vote-admin-status")
    .getByRole("radio", { name: /^Closed/ })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".admin-notice")?.textContent?.includes("Voting is now closed."),
    null,
    { timeout: 5000 }
  );
  check(
    "admin: closed PATCH sent",
    patches.some((patch) => patch.status === "closed" && !("live_results" in patch))
  );
  check("admin: closed persisted", voting.status === "closed");
  check(
    "admin: closed becomes selected",
    (await page
      .locator(".vote-admin-status")
      .getByRole("radio", { name: /^Closed/ })
      .getAttribute("aria-checked")) === "true"
  );
  check(
    "admin: status notice",
    (await page.locator(".admin-notice").textContent())?.includes(
      "Voting is now closed."
    ) === true
  );

  // Publish live results. The checkbox is controlled, so its checked state only
  // flips once the PATCH response lands — click and wait, rather than check(),
  // which asserts on the state change immediately.
  await page.locator(".vote-admin-toggle input").click();
  await page.waitForFunction(
    () =>
      (document.querySelector(".vote-admin-toggle input"))?.checked === true &&
      document.querySelector(".admin-notice")?.textContent?.includes(
        "Live results are now visible"
      ),
    null,
    { timeout: 5000 }
  );
  check(
    "admin: live-results PATCH sent",
    patches.some((patch) => patch.live_results === true && !("status" in patch))
  );
  check("admin: live results persisted", voting.live_results === true);
  check(
    "admin: live results notice",
    (await page.locator(".admin-notice").textContent())?.includes(
      "Live results are now visible while voting is open."
    ) === true
  );

  // Refresh picks up new tallies without a page reload.
  tallies.splice(0, tallies.length, 12, 5, 2, 1, 0, 0);
  const before = resultsCalls();
  await page.locator(".vote-admin-refresh").click();
  await page.waitForFunction(
    () => document.querySelector(".vote-admin-table tbody tr td:nth-child(2)")?.textContent?.trim() === "12",
    null,
    { timeout: 5000 }
  );
  check("admin: refresh re-fetches results", resultsCalls() > before);
  check(
    "admin: refresh updates the total",
    (await page.locator(".vote-admin-total").textContent())?.includes(
      "20 votes cast"
    ) === true
  );
  check(
    "admin: refresh updates the percentage",
    (await page
      .locator(".vote-admin-table tbody tr")
      .first()
      .locator("td")
      .nth(2)
      .textContent())?.trim() === "60%"
  );
  check(
    "admin: no reset button for a normal admin",
    (await page.locator(".vote-admin-reset-btn").count()) === 0
  );

  await context.close();
}

// ---- Vote reset (fares9005@gmail.com only) ----------------------------------

{
  const { context, page, tallies, resetCalls } = await createAdminPage({
    email: "fares9005@gmail.com",
  });

  await page.waitForSelector(".vote-admin-table tbody tr");
  const resetBtn = page.locator(".vote-admin-reset-btn");
  const dialog = page.locator(".vote-admin-dialog");

  // Pretend this browser already voted: the marker is what disables the ballot
  // after a reset, so the reset has to clear it too.
  await page.evaluate(() =>
    localStorage.setItem("compass-vote", "digital-phenotyping-mental-health")
  );

  check(
    "reset: button is visible to the authorised account",
    (await resetBtn.count()) === 1
  );

  await resetBtn.click();
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  check(
    "reset: dialog opens as a modal",
    (await dialog.evaluate((el) => el.open)) === true
  );
  check(
    "reset: confirm is disabled until RESET is typed",
    await page.locator(".vote-modal-delete-btn").isDisabled()
  );

  // Cancel must not touch the database.
  await page.locator(".vote-admin-dialog .button-secondary").click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  check("reset: cancel closes the dialog", resetCalls() === 0);
  check("reset: cancel leaves the votes alone", tallies.some((v) => v > 0));

  // Reopen, type the word, confirm.
  await resetBtn.click();
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await page.locator("#vote-reset-input").fill("RESET");
  check(
    "reset: confirm enables once RESET is typed",
    await page.locator(".vote-modal-delete-btn").isEnabled()
  );
  await page.locator(".vote-admin-dialog .vote-modal-delete-btn").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(".admin-notice")
        ?.textContent?.includes("votes deleted"),
    null,
    { timeout: 5000 }
  );
  await dialog.waitFor({ state: "hidden", timeout: 5000 });

  check("reset: exactly one RPC call", resetCalls() === 1);
  check(
    "reset: notice reports the count",
    (await page.locator(".admin-notice").textContent())?.includes(
      "20 votes deleted"
    ) === true
  );
  check(
    "reset: table total returns to zero",
    (await page.locator(".vote-admin-total").textContent())?.includes(
      "0 votes cast"
    ) === true
  );
  check(
    "reset: rows are still listed at zero",
    (await page.locator(".vote-admin-table tbody tr").count()) === 6
  );
  check(
    "reset: settings are untouched",
    (await page
      .locator(".vote-admin-status")
      .getByRole("radio", { name: /^Open/ })
      .getAttribute("aria-checked")) === "true"
  );
  check(
    "reset: this browser's vote marker is cleared so you can vote again",
    (await page.evaluate(() => localStorage.getItem("compass-vote"))) === null
  );

  await context.close();
}

// ---- Admin vote preview (?preview=true) -------------------------------------

{
  const { context, page, castCalls } = await createAdminPage({ status: "soon" });

  // Let the magic-link hash finish hydrating the session before leaving /admin.
  await page.waitForSelector(".vote-admin-section");

  // The public page must stay exactly as it is for everyone else.
  await page.goto(BASE + "/vote/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".vote-status");
  check(
    "preview: the public page still hides the ballot while soon",
    (await page.locator(".vote-button").count()) === 0 &&
      (await page.locator(".admin-preview-banner").count()) === 0
  );

  // The signed-in admin gets the real ballot plus a banner.
  await page.goto(BASE + "/vote/?preview=true", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".admin-preview-banner");
  check(
    "preview: signed-in admin sees the banner",
    (await page.locator(".admin-preview-banner").count()) === 1
  );
  const banner =
    (await page.locator(".admin-preview-banner").textContent()) ?? "";
  check("preview: banner states the public status", banner.includes("soon"));
  check(
    "preview: banner warns the votes are real",
    banner.replace(/\s+/g, " ").includes("votes cast in preview are real votes.")
  );
  {
    const href =
      (await page.locator(".admin-preview-back-link").getAttribute("href")) ??
      "";
    check(
      "preview: banner links back to admin",
      href.startsWith("/admin") && href.endsWith("#admin-voting"),
      href
    );
  }
  check(
    "preview: the ballot is shown despite the soon status",
    (await page.locator(".vote-button").count()) === 6
  );
  check(
    "preview: first card is Malak",
    (await page.locator(".vote-card-presenter").first().innerText()).includes(
      "Malak Ashraf Saad Abdelfatah"
    )
  );
  check(
    "preview: the status line reads as open",
    (await page.locator(".vote-status").first().innerText()).includes(
      "Voting is open. Choose one presentation."
    )
  );

  // A preview vote goes through the same cast_vote path as a public vote.
  await page.locator(".vote-button").first().click();
  await page.waitForSelector(".vote-dialog[open]");
  await page.locator(".vote-dialog input").fill("1012345678");
  await page.locator(".vote-dialog-submit").click();
  await page.waitForFunction(
    () => !document.querySelector(".vote-dialog")?.open,
    null,
    { timeout: 5000 }
  );
  check("preview: the vote reached cast_vote", castCalls() === 1);
  check(
    "preview: the chosen card is marked",
    (await page.locator(".vote-card-marker").count()) === 1
  );

  await context.close();
}

// Without a session the query string is ignored: no banner, no ballot.
{
  const { context, page } = await createAdminPage({
    signedIn: false,
    status: "soon",
  });
  await page.goto(BASE + "/vote/?preview=true", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".vote-status");
  check(
    "preview: signed-out visitor gets no banner",
    (await page.locator(".admin-preview-banner").count()) === 0
  );
  check(
    "preview: signed-out visitor gets no ballot",
    (await page.locator(".vote-button").count()) === 0
  );
  check(
    "preview: signed-out visitor is not left on the skeleton",
    (await page.locator(".vote-skeleton").count()) === 0
  );
  check(
    "preview: signed-out visitor sees the real soon status",
    (await page.locator(".vote-status").first().innerText()).includes(
      "Voting opens during the conference."
    )
  );
  await context.close();
}

// ---- Signed out -------------------------------------------------------------

{
  const { context, page } = await createAdminPage({ signedIn: false });
  await page.waitForSelector(".admin-login");
  check(
    "signed out: no voting controls",
    (await page.locator(".vote-admin-section").count()) === 0
  );
  await context.close();
}

// ---- Screenshots ------------------------------------------------------------

async function shot(theme, width) {
  const { context, page } = await createAdminPage({
    theme,
    viewport: { width, height: width === 390 ? 844 : 1000 },
  });
  await page.waitForSelector(".vote-admin-table tbody tr");
  await page.waitForTimeout(150);
  await page.locator("#admin-voting").screenshot({
    path: `${OUT}/voting-${width}-${theme}.png`,
  });
  await context.close();
}

for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    await shot(theme, width);
  }
}

// The reset danger zone and its dialog, for the authorised account only.
async function resetShot(theme, width) {
  const { context, page } = await createAdminPage({
    email: "fares9005@gmail.com",
    theme,
    viewport: { width, height: width === 390 ? 844 : 1000 },
  });
  await page.waitForSelector(".vote-admin-table tbody tr");
  await page.waitForTimeout(150);
  await page.locator("#admin-voting").screenshot({
    path: `${OUT}/reset-zone-${width}-${theme}.png`,
  });
  await page.locator(".vote-admin-reset-btn").click();
  await page.locator(".vote-admin-dialog").waitFor({ state: "visible" });
  await page.waitForTimeout(150);
  await page.locator(".vote-admin-dialog").screenshot({
    path: `${OUT}/reset-dialog-${width}-${theme}.png`,
  });
  await context.close();
}

for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    await resetShot(theme, width);
  }
}

await browser.close();

const failed = results.filter((result) => !result.pass);
console.log(`\nPASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
