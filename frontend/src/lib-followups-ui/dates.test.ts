/**
 * Tests for the date chores.
 *
 *   cd frontend
 *   node --import tsx --test "src/lib-followups-ui/*.test.ts"
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type { Entry } from "../types/api.ts";
import { formatDay, latestEntryDate, todayIso } from "./dates.ts";

function entry(date: string): Entry {
  return { date, mood: "sad", text_child: "x", text_de: "x" };
}

test("today is the device's own day, not a UTC day", () => {
  // Constructed from local parts, so this holds in Germany and in India. Late
  // in the evening the UTC date is already tomorrow, and a check-in reading a
  // day ahead of the entry the child just wrote is a visible bug.
  assert.equal(todayIso(new Date(2026, 9, 25, 23, 30)), "2026-10-25");
  assert.equal(todayIso(new Date(2026, 0, 1, 0, 1)), "2026-01-01");
});

test("the newest entry wins, whatever order the timeline is in", () => {
  assert.equal(latestEntryDate([entry("2026-10-06"), entry("2026-10-22")]), "2026-10-22");
  assert.equal(latestEntryDate([entry("2026-10-22"), entry("2026-10-06")]), "2026-10-22");
});

test("it crosses a year end by date, not by string luck", () => {
  assert.equal(latestEntryDate([entry("2026-12-31"), entry("2027-01-01")]), "2027-01-01");
});

test("an unreadable date is skipped, never thrown at the child", () => {
  assert.equal(latestEntryDate([entry("yesterday"), entry("2026-10-22")]), "2026-10-22");
  assert.equal(latestEntryDate([entry("yesterday")]), null);
  assert.equal(latestEntryDate([]), null);
});

test("a day is formatted for display, and a broken one is shown as it is", () => {
  assert.match(formatDay("2026-10-21", "en"), /21/);
  // Wrong is worse than ugly: an unparseable date is printed raw rather than
  // guessed at.
  assert.equal(formatDay("yesterday", "en"), "yesterday");
  assert.equal(formatDay("", "en"), "");
});

test("the formatted day does not drift by a timezone", () => {
  // Formatted in UTC from a UTC midnight, so the 21st never prints as the 20th
  // for a child whose device is behind UTC.
  assert.match(formatDay("2026-10-21", "en"), /\b21\b/);
  assert.match(formatDay("2026-01-01", "en"), /\b1\b/);
});
