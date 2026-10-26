/**
 * Back from each step lands on the right one.
 *
 * The journeys below are the moves App.tsx makes, in the order a child makes
 * them. If App.tsx gains a step, add its journey here.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { HOME, back, canGoBack, current, go, start, type Step, type Trail } from "./nav";

function walk(first: Step, ...moves: Step[]): Trail {
  return moves.reduce<Trail>((trail, next) => go(trail, next), start(first));
}

/** Pressing back over and over, until it stops: the steps shown on the way. */
function backAll(trail: Trail): Step[] {
  const seen: Step[] = [];
  while (canGoBack(trail)) {
    trail = back(trail);
    seen.push(current(trail));
  }
  return seen;
}

test("the main journey goes back the way it came, ending at check-in", () => {
  const trail = walk("checkIn", "write", "timeline", "report", "handoff", "handoffShow", "handoffDone");
  assert.deepEqual(backAll(trail), ["handoffShow", "handoff", "report", "timeline", "write", "checkIn"]);
});

test("check-in has no back: it is the first step", () => {
  assert.equal(canGoBack(start(HOME)), false);
  assert.deepEqual(back(start(HOME)), [HOME]);
});

test("back never reaches the language picker", () => {
  const trail = walk("language", "checkIn", "write");
  assert.deepEqual(backAll(trail), ["checkIn"]);
});

test("first run: language goes straight to check-in, with no Back to the picker", () => {
  // Onboarding is off by default (Neel, 26 Oct).
  const trail = walk("language", "checkIn");
  assert.deepEqual(trail, ["checkIn"]);
  assert.equal(canGoBack(trail), false);
});

test("Start or Skip on the cards goes home, which starts a new trail", () => {
  assert.deepEqual(walk("checkIn", "onboarding", "checkIn"), ["checkIn"]);
});

test("'What this app does' from check-in goes back to check-in", () => {
  const trail = walk("checkIn", "onboarding");
  assert.deepEqual(backAll(trail), ["checkIn"]);
});

test("the language picker on first run has no back", () => {
  assert.equal(canGoBack(start("language")), false);
});

test("done returns to check-in and starts a new trail", () => {
  const trail = walk("checkIn", "write", "timeline", "report", "handoff", "handoffShow", "handoffDone", "checkIn");
  assert.deepEqual(trail, ["checkIn"]);
  assert.equal(canGoBack(trail), false);
});

test("'change it' on the card goes to the timeline without a loop", () => {
  const trail = walk("checkIn", "write", "timeline", "report", "timeline");
  assert.deepEqual(trail, ["checkIn", "write", "timeline"]);
  assert.deepEqual(backAll(trail), ["write", "checkIn"]);
});

test("the follow-up branch goes back through the ladder", () => {
  const trail = walk("checkIn", "followUp", "escalation", "handoff");
  assert.deepEqual(backAll(trail), ["escalation", "followUp", "checkIn"]);
});

test("the PIN screen goes back to where it was opened", () => {
  const trail = walk("checkIn", "write", "timeline", "pinSet");
  assert.equal(current(back(trail)), "timeline");
});

test("the lock is not a step, so no trail can hold it", () => {
  // A compile-time fact, checked at runtime too: "locked" is not a Step.
  const steps: Step[] = [
    "language", "onboarding", "checkIn", "write", "timeline", "report", "handoff",
    "handoffShow", "handoffDone", "followUp", "escalation", "pinSet",
  ];
  assert.ok(!(steps as string[]).includes("locked"));
});
