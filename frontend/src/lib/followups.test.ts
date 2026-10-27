/**
 * Tests for follow-up check-ins and the escalation ladder. Plain node:test,
 * no DOM, no network, no real clock: every "today" is passed in.
 *
 *   node --test frontend/src/lib/followups.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { Entry } from "../types/api.ts";
import {
  CHECK_IN_AFTER_DAYS,
  LADDER,
  checkInDue,
  ladderStep,
  nextCheckIn,
  type Handoff,
} from "./followups.ts";

function entry(date: string): Entry {
  return { date, mood: "sad", text_child: "x", text_de: "x" };
}

// --- check-ins -----------------------------------------------------------------

test("the check-in comes back three days after the last entry", () => {
  assert.equal(CHECK_IN_AFTER_DAYS, 3);
  assert.equal(nextCheckIn([entry("2026-10-20"), entry("2026-10-22")], "2026-10-22"), "2026-10-25");
});

test("the latest entry counts, whatever order the timeline is in", () => {
  assert.equal(nextCheckIn([entry("2026-10-22"), entry("2026-10-06")], "2026-10-22"), "2026-10-25");
});

test("a missed check-in is due today, once, not once for every day missed", () => {
  const entries = [entry("2026-10-01")];
  assert.equal(nextCheckIn(entries, "2026-10-25"), "2026-10-25");
  assert.equal(checkInDue(entries, "2026-10-25"), true);
});

test("before the gap has passed, it is not due", () => {
  assert.equal(checkInDue([entry("2026-10-22")], "2026-10-24"), false);
  assert.equal(checkInDue([entry("2026-10-22")], "2026-10-25"), true);
});

test("no entries means nothing to follow up on", () => {
  assert.equal(nextCheckIn([], "2026-10-25"), null);
  assert.equal(checkInDue([], "2026-10-25"), false);
});

test("an unreadable date is skipped, never a reason to throw at the child", () => {
  assert.equal(nextCheckIn([entry("yesterday"), entry("2026-10-22")], "2026-10-22"), "2026-10-25");
  assert.equal(nextCheckIn([entry("yesterday")], "2026-10-22"), null);
  assert.equal(nextCheckIn([entry("2026-10-22")], "not a date"), null);
});

test("it crosses month ends correctly", () => {
  assert.equal(nextCheckIn([entry("2026-10-30")], "2026-10-30"), "2026-11-02");
});

// --- the ladder ----------------------------------------------------------------

test("before anyone has been shown, the first suggestion is the class teacher", () => {
  assert.deepEqual(ladderStep([entry("2026-10-20")], []), { kind: "start", step: "teacher" });
});

test("shown someone and nothing new since: wait, and suggest nothing", () => {
  const handoffs: Handoff[] = [{ date: "2026-10-21", step: "teacher" }];
  assert.deepEqual(ladderStep([entry("2026-10-20"), entry("2026-10-21")], handoffs), {
    kind: "waiting",
    since: "2026-10-21",
  });
});

test("an entry on the handoff day does not count as it kept happening", () => {
  const handoffs: Handoff[] = [{ date: "2026-10-21", step: "teacher" }];
  assert.equal(ladderStep([entry("2026-10-21")], handoffs).kind, "waiting");
});

test("it kept happening after the teacher: suggest the trusted teacher or social worker", () => {
  const handoffs: Handoff[] = [{ date: "2026-10-21", step: "teacher" }];
  assert.deepEqual(ladderStep([entry("2026-10-21"), entry("2026-10-23"), entry("2026-10-24")], handoffs), {
    kind: "next",
    step: "trusted",
    after: "teacher",
    newEntries: 2,
  });
});

test("it climbs from the highest rung reached, never back down", () => {
  const handoffs: Handoff[] = [
    { date: "2026-10-10", step: "head" },
    { date: "2026-10-15", step: "teacher" }, // went back to a teacher later
  ];
  const suggestion = ladderStep([entry("2026-10-20")], handoffs);
  assert.equal(suggestion.kind, "next");
  assert.equal(suggestion.kind === "next" && suggestion.step, "school_psychology");
});

test("on the top rung and still happening, it stays there rather than going past it", () => {
  const handoffs: Handoff[] = [{ date: "2026-10-21", step: "helplines" }];
  assert.deepEqual(ladderStep([entry("2026-10-22")], handoffs), {
    kind: "top",
    step: "helplines",
    newEntries: 1,
  });
});

test("the emergency rung is never offered as a next step", () => {
  assert.ok(!(LADDER as readonly string[]).includes("emergency"));
  for (const step of LADDER) {
    const suggestion = ladderStep([entry("2026-10-30")], [{ date: "2026-10-01", step }]);
    assert.notEqual("step" in suggestion && suggestion.step, "emergency");
  }
});

test("a handoff with an unknown rung or a bad date is ignored", () => {
  const handoffs = [
    { date: "2026-10-21", step: "police" },
    { date: "soon", step: "teacher" },
  ] as unknown as Handoff[];
  assert.deepEqual(ladderStep([entry("2026-10-22")], handoffs), { kind: "start", step: "teacher" });
});

test("the rungs match content/adult_guide.json, in order, minus emergency", () => {
  const guide = JSON.parse(
    readFileSync(new URL("../../../content/adult_guide.json", import.meta.url), "utf-8"),
  );
  const ids: string[] = guide.escalation_ladder.steps.map((step: { id: string }) => step.id);
  assert.deepEqual([...LADDER], ids.filter((id) => id !== "emergency"));
  assert.equal(ids[ids.length - 1], "emergency", "the file still ends with the emergency rung");
});
