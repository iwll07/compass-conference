// Public vote page QA. Every Supabase request is mocked: this script never
// reads or writes the live database.
//
// Usage: BASE_URL=http://localhost:3002 node scripts/voting-qa.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3002";
const OUT = ".playwright-cli/qa/vote";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? "ok" : "FAIL"} - ${name}${pass ? "" : " :: " + detail}`);
}

const CANDIDATE_IDS = [
  "artificial-intelligence-revolution-or-risk",
  "base-editing-revolution",
  "dna-origami-nanorobotics",
  "digital-phenotyping-mental-health",
  "preeclampsia-statin-metformin-vitamin-d",
  "organoids-miniature-organs",
];

function resultsPayload(votes, total) {
  return {
    status: "closed",
    live_results: false,
    total: total ?? votes.reduce((sum, value) => sum + value, 0),
    candidates: CANDIDATE_IDS.map((id, index) => ({
      id,
      votes: votes[index] ?? 0,
    })),
  };
}

const browser = await chromium.launch({ channel: "msedge" });

async function createPage(config = {}) {
  const {
    status = "soon",
    liveResults = false,
    results = null,
    settingsDelay = 0,
    vote = { code: "ok" },
    theme = "light",
    viewport = { width: 1440, height: 1000 },
    storedVote = null,
  } = config;

  const context = await browser.newContext({ viewport });
  await context.addInitScript(
    ({ theme, storedVote }) => {
      localStorage.setItem("compass-theme", theme);
      if (storedVote) localStorage.setItem("compass-vote", storedVote);
      else localStorage.removeItem("compass-vote");
    },
    { theme, storedVote }
  );

  await context.route("**/rest/v1/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/voting_settings")) {
      if (settingsDelay) {
        await new Promise((resolve) => setTimeout(resolve, settingsDelay));
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "current",
          status,
          live_results: liveResults,
        }),
      });
    }

    if (url.includes("/rpc/voting_results")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          results ?? { status, live_results: liveResults, total: 0, candidates: [] }
        ),
      });
    }

    if (url.includes("/rpc/cast_vote")) {
      if (vote.networkError) return route.abort();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(vote.code ?? "ok"),
      });
    }

    // Keep the test completely offline: other pages' reads never reach Supabase.
    return route.abort();
  });

  const page = await context.newPage();
  return { context, page };
}

async function gotoVote(page) {
  await page.goto(BASE + "/vote/", { waitUntil: "domcontentloaded" });
}

async function shot(page, name, width, theme) {
  // Loading is lazy, so walk the page once to start every portrait before
  // taking a full-page screenshot.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  try {
    await page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      null,
      { timeout: 5000 }
    );
  } catch {}
  await page.waitForTimeout(100);
  await page.screenshot({
    path: `${OUT}/${name}-${width}-${theme}.png`,
    fullPage: true,
  });
}

// ---- Functional checks ------------------------------------------------------

// Unknown first load: a skeleton and no status sentence.
{
  const { context, page } = await createPage({ settingsDelay: 1200 });
  await gotoVote(page);
  check("unknown: skeleton is visible", await page.locator(".vote-skeleton").isVisible());
  check(
    "unknown: no status text leaks",
    (await page.locator(".vote-status").count()) === 0
  );
  await page.waitForSelector(".vote-status", { timeout: 5000 });
  check(
    "unknown: resolves to the served status",
    (await page.locator(".vote-status").innerText()).includes(
      "Voting opens during the conference."
    )
  );
  await context.close();
}

// Soon: six cards, no vote buttons.
{
  const { context, page } = await createPage({ status: "soon" });
  await gotoVote(page);
  await page.waitForSelector(".vote-status");
  check("soon: six candidate cards", (await page.locator(".vote-card").count()) === 6);
  check("soon: no vote buttons", (await page.locator(".vote-button").count()) === 0);
  check(
    "soon: every card carries a decorative compass behind the cut-out",
    (await page.locator(".vote-card .vote-card-stage > .vote-card-compass").count()) === 6
  );
  check(
    "soon: the compass is hidden from assistive tech and has no text",
    (await page
      .locator(".vote-card-compass")
      .first()
      .evaluate(
        (el) =>
          el.getAttribute("aria-hidden") === "true" &&
          (el.textContent ?? "").trim() === "" &&
          el.getAttribute("focusable") === "false"
      )) === true
  );
  check(
    "soon: status sentence",
    (await page.locator(".vote-status").innerText()).trim() ===
      "Voting opens during the conference."
  );
  await context.close();
}

// Open: vote buttons with accessible names, dialog, errors, focus return, ok.
{
  const vote = { code: "ok" };
  const { context, page } = await createPage({ status: "open", vote });
  await gotoVote(page);
  await page.waitForSelector(".vote-button");

  const buttons = page.locator(".vote-button");
  check("open: six vote buttons", (await buttons.count()) === 6);
  check(
    "open: accessible name includes title and presenter",
    (await buttons.first().getAttribute("aria-label")).includes(
      "Vote for Artificial intelligence: Revolution or risk by Lobna Ahmed Diab & Abdelrahman Eid Abdelfatah"
    )
  );

  await buttons.first().click();
  await page.waitForSelector(".vote-dialog[open]");
  check("dialog: shows chosen presentation", (await page.locator(".vote-dialog-title").innerText()).includes("Artificial intelligence"));
  check(
    "dialog: phone input receives focus",
    await page.evaluate(() =>
      document.activeElement?.matches(".vote-phone-row input")
    )
  );
  check(
    "dialog: fixed +20 prefix",
    (await page.locator(".vote-phone-prefix").innerText()).trim() === "+20"
  );
  check(
    "dialog: warns votes cannot be changed",
    (await page.locator(".vote-dialog-note").innerText()).includes(
      "Votes can't be changed."
    )
  );

  const input = page.locator(".vote-phone-row input");
  const submit = page.locator(".vote-dialog-submit");

  // Empty phone → invalid message, dialog stays open.
  await submit.click();
  check(
    "dialog: empty phone shows invalid message",
    (await page.locator(".vote-dialog-error").innerText()) ===
      "Check the phone number and try again."
  );

  // Each server code maps to its message; the input value is retained.
  await input.fill("1012345678");
  for (const [code, expected] of [
    ["not_registered", "We couldn't verify this phone number. Use the number you registered with."],
    ["already_voted", "This number has already voted. Thank you."],
    ["closed", "Voting is closed."],
    ["invalid", "Check the phone number and try again."],
  ]) {
    vote.code = code;
    await submit.click();
    await page.waitForFunction(
      (text) => document.querySelector(".vote-dialog-error")?.textContent === text,
      expected
    );
    check(`dialog: ${code} message`, (await page.locator(".vote-dialog-error").innerText()) === expected);
    check(`dialog: ${code} keeps the phone value`, (await input.inputValue()) === "1012345678");
  }

  // Network failure → retry message, no stuck spinner, still open.
  vote.networkError = true;
  await submit.click();
  await page.waitForFunction(() =>
    document.querySelector(".vote-dialog-error")?.textContent?.includes("couldn't reach the server")
  );
  check(
    "dialog: network error shows retry message",
    (await page.locator(".vote-dialog-error").innerText()).includes(
      "We couldn't reach the server. Check your connection and try again."
    )
  );
  check(
    "dialog: confirm button is usable after failure",
    await page.locator(".vote-dialog-submit").isEnabled()
  );
  check(
    "dialog: submit label is not stuck",
    (await page.locator(".vote-dialog-submit").innerText()).trim() ===
      "Confirm my vote"
  );

  // Success → closes, stores the cosmetic marker, marks the card, disables the rest.
  vote.networkError = false;
  vote.code = "ok";
  await submit.click();
  await page.waitForFunction(() => !document.querySelector(".vote-dialog")?.open, null, { timeout: 5000 });
  check(
    "ok: localStorage marker written",
    (await page.evaluate(() => localStorage.getItem("compass-vote"))) ===
      CANDIDATE_IDS[0]
  );
  check(
    "ok: chosen card marked",
    (await page.locator(".vote-card-marker").textContent())?.trim() === "Your vote"
  );
  check(
    "ok: other vote buttons disabled",
    (await page.locator(".vote-button:disabled").count()) === 5
  );
  check(
    "ok: status explains results timing",
    (await page.locator(".vote-status").innerText()).includes(
      "Results are announced when voting closes."
    )
  );

  // Re-open a dialog and close with Escape; focus returns to the trigger.
  await context.close();
}

// Dialog Escape and focus return on a fresh page.
{
  const { context, page } = await createPage({ status: "open" });
  await gotoVote(page);
  await page.waitForSelector(".vote-button");
  const trigger = page.locator(".vote-button").nth(1);
  const label = await trigger.getAttribute("aria-label");
  await trigger.click();
  await page.waitForSelector(".vote-dialog[open]");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".vote-dialog")?.open);
  check(
    "dialog: Escape closes it",
    !(await page.locator(".vote-dialog").evaluate((el) => el.open))
  );
  await page.waitForTimeout(50);
  check(
    "dialog: focus returns to the vote button",
    (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) ===
      label
  );
  await context.close();
}

// Backdrop click closes the dialog.
{
  const { context, page } = await createPage({ status: "open" });
  await gotoVote(page);
  await page.waitForSelector(".vote-button");
  await page.locator(".vote-button").first().click();
  await page.waitForSelector(".vote-dialog[open]");
  await page.mouse.click(5, 5);
  await page.waitForFunction(() => !document.querySelector(".vote-dialog")?.open);
  check("dialog: backdrop click closes it", true);
  await context.close();
}

// Voted (cosmetic), reloaded from localStorage.
{
  const { context, page } = await createPage({
    status: "open",
    storedVote: CANDIDATE_IDS[1],
  });
  await gotoVote(page);
  await page.waitForSelector(".vote-card-marker");
  check(
    "voted: stored card is marked",
    (await page.locator(".vote-card-marker").textContent())?.trim() === "Your vote"
  );
  check(
    "voted: other buttons disabled",
    (await page.locator(".vote-button:disabled").count()) === 5
  );
  check(
    "voted: no enabled vote buttons",
    (await page.locator(".vote-button:not(:disabled)").count()) === 0
  );
  await context.close();
}

// Open with live results: bars, no winner, voting still enabled.
{
  const { context, page } = await createPage({
    status: "open",
    liveResults: true,
    results: {
      status: "open",
      live_results: true,
      total: 15,
      candidates: resultsPayload([8, 3, 2, 1, 1, 0]).candidates,
    },
  });
  await gotoVote(page);
  await page.waitForSelector(".vote-bar");
  check("open live: bars shown", (await page.locator(".vote-bar").count()) === 6);
  check("open live: no winner label", (await page.locator(".vote-winner").count()) === 0);
  check(
    "open live: voting still available",
    (await page.locator(".vote-button").count()) === 6
  );
  check(
    "open live: total shown",
    (await page.locator(".vote-total").innerText()).includes("15 votes cast")
  );
  await context.close();
}

// Closed with a clear winner.
{
  const { context, page } = await createPage({
    status: "closed",
    results: resultsPayload([10, 4, 3, 2, 1, 0]),
  });
  await gotoVote(page);
  await page.waitForSelector(".vote-bar");
  check("closed: bars shown", (await page.locator(".vote-bar").count()) === 6);
  check("closed: one winner", (await page.locator(".vote-winner").count()) === 1);
  check(
    "closed: winner is the top card",
    (await page.locator(".vote-card--winner .vote-card-title").innerText()).includes(
      "Artificial intelligence"
    )
  );
  check(
    "closed: total votes",
    (await page.locator(".vote-total").innerText()).includes("20 votes cast")
  );
  check("closed: no vote buttons", (await page.locator(".vote-button").count()) === 0);
  check(
    "closed: status sentence",
    (await page.locator(".vote-status").innerText()).includes("Voting has closed.")
  );
  await context.close();
}

// Closed tie.
{
  const { context, page } = await createPage({
    status: "closed",
    results: resultsPayload([4, 4, 1, 0, 0, 0]),
  });
  await gotoVote(page);
  await page.waitForSelector(".vote-bar");
  check("tie: two winners", (await page.locator(".vote-winner").count()) === 2);
  check(
    "tie: both top cards highlighted",
    (await page.locator(".vote-card--winner").count()) === 2
  );
  await context.close();
}

// Closed with no votes.
{
  const { context, page } = await createPage({
    status: "closed",
    results: resultsPayload([0, 0, 0, 0, 0, 0]),
  });
  await gotoVote(page);
  await page.waitForSelector(".vote-bar");
  check("zero: no winner", (await page.locator(".vote-winner").count()) === 0);
  check(
    "zero: total is zero",
    (await page.locator(".vote-total").innerText()).includes("0 votes cast")
  );
  await context.close();
}

// ---- Screenshots ------------------------------------------------------------

const STATES = [
  { name: "soon", config: { status: "soon" } },
  { name: "open", config: { status: "open" } },
  {
    name: "open-live",
    config: {
      status: "open",
      liveResults: true,
      results: {
        status: "open",
        live_results: true,
        total: 15,
        candidates: resultsPayload([8, 3, 2, 1, 1, 0]).candidates,
      },
    },
    openDialog: false,
  },
  {
    name: "voted",
    config: { status: "open", storedVote: CANDIDATE_IDS[0] },
  },
  {
    name: "closed",
    config: { status: "closed", results: resultsPayload([10, 4, 3, 2, 1, 0]) },
  },
  {
    name: "tie",
    config: { status: "closed", results: resultsPayload([4, 4, 1, 0, 0, 0]) },
  },
  {
    name: "zero",
    config: { status: "closed", results: resultsPayload([0, 0, 0, 0, 0, 0]) },
  },
  {
    name: "dialog",
    config: { status: "open" },
    openDialog: true,
  },
];

for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    for (const state of STATES) {
      const { context, page } = await createPage({
        ...state.config,
        theme,
        viewport: { width, height: width === 390 ? 844 : 1000 },
      });
      await gotoVote(page);
      await page.waitForSelector(state.openDialog ? ".vote-button" : ".vote-status");
      if (state.openDialog) {
        await page.locator(".vote-button").first().click();
        await page.waitForSelector(".vote-dialog[open]");
        await page.waitForTimeout(150);
      }
      await shot(page, state.name, width, theme);
      await context.close();
    }
  }
}

// Unknown-state screenshot: capture while the mocked settings call is pending.
for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    const { context, page } = await createPage({
      settingsDelay: 2500,
      theme,
      viewport: { width, height: width === 390 ? 844 : 1000 },
    });
    await gotoVote(page);
    await page.waitForSelector(".vote-skeleton");
    await shot(page, "unknown", width, theme);
    await context.close();
  }
}

await browser.close();

const failed = results.filter((result) => !result.pass);
console.log(`\nPASS ${results.length - failed.length}/${results.length}`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);
