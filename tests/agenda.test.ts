import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { schedule, speakers, type Session } from "../lib/content";
import {
  formatDay,
  formatTime,
  getSpeakerInitials,
  groupRows,
  hallColumns,
  isBreak,
  isEventBar,
  isSpeakerCard,
  spansAllHalls,
  validateSchedule,
} from "../lib/agenda";

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "s",
    day: "2026-11-24",
    start: "09:00",
    end: "10:00",
    title: "A session",
    kind: "session",
    hall: null,
    speakers: [],
    description: null,
    ...overrides,
  };
}

test("agenda initials ignore honorifics and keep the first two names", () => {
  assert.equal(getSpeakerInitials("Prof. Dr. Wael El-Shaer"), "WE");
  assert.equal(getSpeakerInitials("Dr. Malak Ashraf"), "MA");
  assert.equal(getSpeakerInitials("Ahmed M. Gaber"), "AG");
  assert.equal(getSpeakerInitials("Nada El Sayem"), "NE");
  assert.equal(getSpeakerInitials("رسالة إلى طبيب المستقبل"), "رإ");
});

test("agenda rendering rules classify cards, breaks and event bars", () => {
  assert.equal(isSpeakerCard(session({ speakers: ["malak"] })), true);
  assert.equal(isSpeakerCard(session({ kind: "keynote" })), true);
  assert.equal(isSpeakerCard(session({ kind: "panel" })), true);
  assert.equal(isSpeakerCard(session({ kind: "workshop" })), true);
  assert.equal(isSpeakerCard(session({ kind: "session" })), true);
  assert.equal(isSpeakerCard(session({ kind: "break" })), false);
  assert.equal(isSpeakerCard(session({ kind: "social" })), false);
  assert.equal(isBreak(session({ kind: "break" })), true);
  assert.equal(isEventBar(session({ kind: "social" })), true);
  assert.equal(isEventBar(session({ kind: "opening" })), true);
  assert.equal(isEventBar(session({ speakers: ["malak"] })), false);
  assert.equal(spansAllHalls(session({ hall: null })), true);
  assert.equal(spansAllHalls(session({ hall: "Main", kind: "opening" })), true);
  assert.equal(spansAllHalls(session({ hall: "Main", kind: "session" })), false);
});

test("agenda grouping aligns identical time slots and orders them", () => {
  const rows = groupRows([
    session({ id: "b", start: "10:00", end: "10:30" }),
    session({ id: "a", start: "09:00", end: "09:30" }),
    session({ id: "c", start: "10:00", end: "10:30", hall: "Main" }),
  ]);
  assert.deepEqual(rows.map((row) => row.key), [
    "2026-11-24|09:00|09:30",
    "2026-11-24|10:00|10:30",
  ]);
  assert.deepEqual(
    rows[1].sessions.map((item) => item.id),
    ["b", "c"]
  );
});

test("agenda hall columns follow first appearance and ignore null halls", () => {
  const sessions = [
    session({ id: "a", hall: "Main" }),
    session({ id: "b", hall: "Annex" }),
    session({ id: "c", hall: "Main" }),
    session({ id: "d", hall: null }),
    session({ id: "e", hall: "Other", day: "2026-11-25" }),
  ];
  assert.deepEqual(hallColumns(sessions, "2026-11-24"), ["Main", "Annex"]);
  assert.deepEqual(hallColumns(sessions, "2026-11-25"), ["Other"]);
  assert.deepEqual(hallColumns(sessions, "2026-11-26"), []);
});

test("agenda time and day formatting", () => {
  assert.equal(formatTime("09:15"), "9:15 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(formatTime("14:40"), "2:40 PM");
  assert.equal(formatDay("2026-11-24"), "Tuesday, 24 November 2026");
});

test("agenda validation accepts the real schedule", () => {
  assert.deepEqual(validateSchedule(schedule, speakers), []);
});

test("agenda validation rejects bad times, overlaps and unknown speakers", () => {
  const people = [{ ...speakers[0], id: "someone" }] as typeof speakers;
  const problems = validateSchedule(
    [
      session({ id: "bad-time", start: "11:00", end: "10:00" }),
      session({ id: "bad-format", start: "9:00" }),
      session({ id: "unknown", speakers: ["nobody"] }),
      session({ id: "a", hall: "Main", start: "09:00", end: "10:00" }),
      session({ id: "b", hall: "Main", start: "09:30", end: "10:30" }),
      session({ id: "c", hall: "Annex", start: "09:15", end: "09:45" }),
      session({ id: "bad-time" }),
    ],
    people
  );
  assert.ok(problems.some((p) => p.includes("bad-time: end")));
  assert.ok(problems.some((p) => p.includes("bad-format: start")));
  assert.ok(problems.some((p) => p.includes('unknown speaker id "nobody"')));
  assert.ok(problems.some((p) => p.includes("overlap in hall")));
  assert.ok(problems.some((p) => p.includes("overlap with different times")));
  assert.ok(problems.some((p) => p.includes("Duplicate session id")));
});

test("agenda validation rejects duplicate speaker ids", () => {
  const people = [speakers[0], { ...speakers[0] }];
  assert.ok(
    validateSchedule([], people).some((p) => p.includes("Duplicate speaker id"))
  );
});

test("agenda PDF program: ids, day, hall and the seven opening speakers", () => {
  assert.equal(schedule.length, 21);
  assert.equal(new Set(schedule.map((s) => s.id)).size, 21);
  assert.deepEqual([...new Set(schedule.map((s) => s.day))], ["2026-11-24"]);
  assert.ok(schedule.every((s) => s.hall === null));
  const speeches = schedule.find((s) => s.id === "opening-speeches");
  assert.deepEqual(speeches?.speakers, [
    "tarek-ali",
    "rasha-tawfik",
    "ahmed-osama",
    "doaa-hamdy",
    "emad-el-banna",
    "hani-hamed",
    "ahmed-mohamed-gaber",
  ]);
  assert.equal(
    schedule.find((s) => s.id === "sim-era-medical-systems")?.speakers.length,
    0
  );
  assert.equal(schedule.find((s) => s.id === "message-to-future-doctor")?.title, "رسالة إلى طبيب المستقبل");
  assert.equal(schedule.find((s) => s.id === "stories-to-be-told")?.title, "حكايات ولازم تتحكي");
});

test("agenda speaker photos exist, are square, and stay within budget", async () => {
  const used = new Set(schedule.flatMap((s) => s.speakers));
  const byId = new Map(speakers.map((s) => [s.id, s]));
  for (const id of used) {
    const speaker = byId.get(id);
    assert.ok(speaker, `missing speaker data for ${id}`);
    const square = `/speakers/${id}.webp`;
    const disk = path.join(process.cwd(), "public", square.replace(/^\//, ""));
    assert.ok(fs.existsSync(disk), `${id} photo missing: ${disk}`);
    assert.ok(fs.statSync(disk).size <= 120 * 1024, `${id} photo over 120KB`);
    const meta = await import("sharp").then(({ default: sharp }) => sharp(disk).metadata());
    assert.equal(meta.width, 480, `${id} photo width`);
    assert.equal(meta.height, 480, `${id} photo height`);
  }
});

test("agenda-only guests stay off the Speakers page", () => {
  const visible = speakers.filter((s) => s.group === "grand" || s.group === "student");
  assert.equal(visible.length, 12);
  assert.equal(visible.some((s) => s.group === "other"), false);
});
