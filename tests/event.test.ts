import { test } from "node:test";
import assert from "node:assert/strict";
import { formatEventWindow, getEventState, type EventWindow } from "../lib/event.ts";

const window: EventWindow = {
  startsAt: "2026-10-01T09:00:00+02:00",
  endsAt: "2026-10-01T17:00:00+02:00",
  timeZone: "Africa/Cairo",
};

test("null event or unparseable input is unannounced, never negative", () => {
  assert.equal(getEventState(null, Date.now()).phase, "unannounced");
  assert.equal(getEventState({ ...window, startsAt: "not-a-date" }, Date.now()).phase, "unannounced");
  assert.equal(getEventState({ ...window, endsAt: "2026-10-01T08:00:00+02:00" }, Date.now()).phase, "unannounced");
  assert.equal(getEventState(window, Number.NaN).phase, "unannounced");
});

test("invalid timezone is unannounced", () => {
  assert.equal(getEventState({ ...window, timeZone: "Not/AZone" }, Date.now()).phase, "unannounced");
});

test("before start reports upcoming parts", () => {
  const state = getEventState(window, Date.parse("2026-09-30T09:00:00+02:00"));
  assert.deepEqual(state, { phase: "upcoming", days: 1, hours: 0, minutes: 0, seconds: 0 });
});

test("during event reports live regardless of client timezone", () => {
  const utcNoon = Date.parse("2026-10-01T12:00:00Z");
  assert.equal(getEventState(window, utcNoon).phase, "live");
});

test("after end reports ended", () => {
  assert.equal(getEventState(window, Date.parse("2026-10-01T18:00:00+02:00")).phase, "ended");
});

test("formatEventWindow renders date, time range and zone", () => {
  // Fixture date is arbitrary: formatEventWindow is a pure formatter, so this
  // intentionally does NOT need to match the real conferenceWindow date.
  assert.equal(
    formatEventWindow({ startsAt: "2026-11-20T09:00:00+02:00", endsAt: "2026-11-20T17:00:00+02:00", timeZone: "Africa/Cairo" }),
    "20 November 2026, 09:00–17:00 Africa/Cairo"
  );
});

test("formatEventWindow returns null without a usable window", () => {
  assert.equal(formatEventWindow(null), null);
  assert.equal(formatEventWindow({ ...window, timeZone: "Not/AZone" }), null);
  assert.equal(formatEventWindow({ ...window, endsAt: "2026-10-01T08:00:00+02:00" }), null);
});

test("offsets without timezone names still resolve", () => {
  const w: EventWindow = { ...window, timeZone: "Etc/UTC" };
  assert.equal(getEventState(w, Date.parse("2026-10-01T08:00:00Z")).phase, "live");
});
