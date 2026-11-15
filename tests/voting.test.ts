import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  getVotePercentage,
  getVoteWinners,
  isVotingStatus,
  mapVoteResult,
} from "../lib/voting";
import { votingCandidates } from "../lib/voting-candidates";
import { buildVotingSeedSql, sqlLiteral } from "../lib/voting-seed";

// ---- Vote result messages ---------------------------------------------------

test("mapVoteResult: every cast_vote code maps to the agreed message", () => {
  assert.equal(
    mapVoteResult("ok"),
    "Your vote has been recorded. Thank you for taking part."
  );
  assert.equal(mapVoteResult("closed"), "Voting is closed.");
  assert.equal(
    mapVoteResult("invalid"),
    "Check the phone number and try again."
  );
  assert.equal(
    mapVoteResult("not_registered"),
    "We couldn't verify this phone number. Use the number you registered with."
  );
  assert.equal(
    mapVoteResult("already_voted"),
    "This number has already voted. Thank you."
  );
});

test("mapVoteResult: unknown, empty and missing codes fall back", () => {
  const fallback = "Something went wrong. Please try again.";
  assert.equal(mapVoteResult("teapot"), fallback);
  assert.equal(mapVoteResult(""), fallback);
  assert.equal(mapVoteResult(null), fallback);
  assert.equal(mapVoteResult(undefined), fallback);
});

test("isVotingStatus: accepts only the three statuses", () => {
  assert.equal(isVotingStatus("soon"), true);
  assert.equal(isVotingStatus("open"), true);
  assert.equal(isVotingStatus("closed"), true);
  assert.equal(isVotingStatus("OPEN"), false);
  assert.equal(isVotingStatus(""), false);
  assert.equal(isVotingStatus(null), false);
  assert.equal(isVotingStatus(1), false);
});

// ---- Winners and percentages ------------------------------------------------

test("getVoteWinners: no winner when there are no tallies or no votes", () => {
  assert.deepEqual(getVoteWinners([]), { winners: [], votes: 0 });
  assert.deepEqual(
    getVoteWinners([
      { id: "a", votes: 0 },
      { id: "b", votes: 0 },
    ]),
    { winners: [], votes: 0 }
  );
});

test("getVoteWinners: a clear leader wins alone", () => {
  assert.deepEqual(
    getVoteWinners([
      { id: "a", votes: 4 },
      { id: "b", votes: 12 },
      { id: "c", votes: 1 },
    ]),
    { winners: ["b"], votes: 12 }
  );
});

test("getVoteWinners: equal top counts are joint winners", () => {
  assert.deepEqual(
    getVoteWinners([
      { id: "a", votes: 7 },
      { id: "b", votes: 3 },
      { id: "c", votes: 7 },
    ]),
    { winners: ["a", "c"], votes: 7 }
  );
});

test("getVoteWinners: every candidate can tie", () => {
  assert.deepEqual(
    getVoteWinners([
      { id: "a", votes: 2 },
      { id: "b", votes: 2 },
      { id: "c", votes: 2 },
    ]),
    { winners: ["a", "b", "c"], votes: 2 }
  );
});

test("getVotePercentage: handles zero totals and rounds to whole numbers", () => {
  assert.equal(getVotePercentage(0, 0), 0);
  assert.equal(getVotePercentage(5, 0), 0);
  assert.equal(getVotePercentage(0, 10), 0);
  assert.equal(getVotePercentage(5, 10), 50);
  assert.equal(getVotePercentage(1, 3), 33);
  assert.equal(getVotePercentage(2, 3), 67);
  assert.equal(getVotePercentage(10, 10), 100);
  assert.equal(getVotePercentage(11, 10), 100);
  assert.equal(getVotePercentage(Number.NaN, 10), 0);
});

// ---- Candidate data ---------------------------------------------------------

test("voting candidates: ids are unique, kebab-case and have required text", () => {
  const ids = new Set<string>();
  for (const candidate of votingCandidates) {
    assert.match(
      candidate.id,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `id is not kebab-case: ${candidate.id}`
    );
    assert.ok(!ids.has(candidate.id), `duplicate id: ${candidate.id}`);
    ids.add(candidate.id);

    assert.ok(candidate.presenter.trim().length > 0, `${candidate.id}: missing presenter`);
    assert.ok(candidate.title.trim().length > 0, `${candidate.id}: missing title`);
    assert.equal(typeof candidate.university, "string");
    assert.equal(typeof candidate.academicYear, "string");
  }
});

test("voting candidates: every referenced photo exists, is square and within budget", async () => {
  const BUDGET_BYTES = 120 * 1024;

  for (const candidate of votingCandidates) {
    const photos = [
      { field: "photo", src: candidate.photo, expectedBase: `${candidate.id}.png` },
      ...(candidate.coPresenterPhoto
        ? [
            {
              field: "coPresenterPhoto",
              src: candidate.coPresenterPhoto,
              expectedBase: `${candidate.id}-co.png`,
            },
          ]
        : []),
    ];

    for (const { field, src, expectedBase } of photos) {
      assert.ok(src, `${candidate.id}: missing ${field}`);
      assert.ok(!src.includes(" "), `${candidate.id}: ${field} has spaces: ${src}`);
      assert.equal(
        path.posix.basename(src),
        expectedBase,
        `${candidate.id}: ${field} should be public/voting/${expectedBase}`
      );

      const diskPath = path.join(process.cwd(), "public", src.replace(/^\//, ""));
      assert.ok(fs.existsSync(diskPath), `${candidate.id}: ${field} file missing: ${diskPath}`);

      const stat = fs.statSync(diskPath);
      assert.ok(
        stat.size <= BUDGET_BYTES,
        `${candidate.id}: ${field} is ${stat.size} bytes, over 120KB`
      );

      const meta = await sharp(diskPath).metadata();
      assert.equal(meta.width, 480, `${candidate.id}: ${field} width`);
      assert.equal(meta.height, 480, `${candidate.id}: ${field} height`);
      assert.equal(meta.hasAlpha, true, `${candidate.id}: ${field} needs transparency`);
    }
  }
});

test("voting candidates: co-presenter text always comes with a photo", () => {
  for (const candidate of votingCandidates) {
    if (candidate.coPresenter) {
      assert.ok(
        candidate.coPresenterPhoto,
        `${candidate.id}: coPresenter needs coPresenterPhoto`
      );
    }
    if (candidate.coPresenterPhoto) {
      assert.ok(
        candidate.coPresenter,
        `${candidate.id}: coPresenterPhoto needs coPresenter`
      );
    }
  }
});

// ---- Seed SQL ---------------------------------------------------------------

test("sqlLiteral: doubles single quotes", () => {
  assert.equal(sqlLiteral("plain"), "'plain'");
  assert.equal(sqlLiteral("o'brien"), "'o''brien'");
});

test("buildVotingSeedSql: exact output for sample data", () => {
  const sql = buildVotingSeedSql([{ id: "alpha" }, { id: "beta" }]);
  assert.equal(
    sql,
    [
      "-- COMPASS voting candidates seed",
      "-- Generated by scripts/voting-seed.mjs from lib/voting-candidates.json.",
      "-- Safe to re-run: upserts ids/positions and deactivates ids not listed.",
      "-- Run in the Supabase SQL Editor after the voting migrations.",
      "",
      "insert into public.voting_candidates (id, position, active)",
      "values",
      "  ('alpha', 1, true),",
      "  ('beta', 2, true)",
      "on conflict (id) do update",
      "  set position = excluded.position,",
      "      active = excluded.active;",
      "",
      "update public.voting_candidates",
      "set active = false",
      "where id not in (",
      "  'alpha',",
      "  'beta'",
      ");",
      "",
    ].join("\n")
  );
});

test("buildVotingSeedSql: empty list deactivates everything", () => {
  const sql = buildVotingSeedSql([]);
  assert.ok(sql.includes("-- No candidates in lib/voting-candidates.json."));
  assert.ok(sql.includes("update public.voting_candidates\nset active = false;"));
  assert.ok(!sql.includes("insert into"));
});

test("buildVotingSeedSql: real candidates are ordered and quoted", () => {
  const sql = buildVotingSeedSql(votingCandidates);
  let previous = -1;
  for (const [index, candidate] of votingCandidates.entries()) {
    const position = index + 1;
    assert.ok(
      sql.includes(`('${candidate.id}', ${position}, true)`),
      `missing seed row for ${candidate.id} at position ${position}`
    );
    const at = sql.indexOf(`('${candidate.id}'`);
    assert.ok(at > previous, `${candidate.id} is out of order`);
    previous = at;
  }
});
