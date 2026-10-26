/**
 * Tests for the record of which rungs the child has shown their words to.
 *
 *   cd frontend
 *   node --import tsx --test "src/lib-followups-ui/*.test.ts"
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addHandoff,
  clearHandoffs,
  handoffsFor,
  isPersistent,
  listHandoffs,
  removeHandoff,
  useStorage,
} from "./handoffStore.ts";
import type { StorageLike } from "./localStore.ts";

function fakeStorage(seed?: string): StorageLike {
  const rows = new Map<string, string>();
  if (seed !== undefined) rows.set("vividia.handoffs.v1", seed);
  return {
    getItem: (key) => rows.get(key) ?? null,
    setItem: (key, value) => void rows.set(key, value),
    removeItem: (key) => void rows.delete(key),
  };
}

function fresh(seed?: string): void {
  useStorage(fakeStorage(seed));
}

test("a new browser has shown nobody", () => {
  fresh();
  assert.deepEqual(listHandoffs(), []);
});

test("a handoff is recorded with the rung and the day, and nothing else", () => {
  fresh();
  const stored = addHandoff("teacher", "2026-10-21");
  assert.ok(stored);
  assert.equal(stored.step, "teacher");
  assert.equal(stored.date, "2026-10-21");
  assert.deepEqual(Object.keys(stored).sort(), ["date", "id", "step"]);
});

test("they come back oldest first, whatever order they were added in", () => {
  fresh();
  addHandoff("head", "2026-10-20");
  addHandoff("teacher", "2026-10-10");
  assert.deepEqual(
    listHandoffs().map((row) => row.step),
    ["teacher", "head"],
  );
});

test("tapping it twice on the same day records one, not two", () => {
  fresh();
  const first = addHandoff("teacher", "2026-10-21");
  const second = addHandoff("teacher", "2026-10-21");
  assert.equal(listHandoffs().length, 1);
  assert.equal(first?.id, second?.id);
});

test("showing the same rung again on another day is a second, real handoff", () => {
  fresh();
  addHandoff("teacher", "2026-10-21");
  addHandoff("teacher", "2026-10-28");
  assert.equal(handoffsFor("teacher").length, 2);
});

test("a rung that is not on the ladder is refused", () => {
  fresh();
  // Including `emergency`: it is deliberately not a rung, so nothing may
  // record the child as having "escalated to the police".
  assert.equal(addHandoff("emergency" as never, "2026-10-21"), null);
  assert.equal(addHandoff("police" as never, "2026-10-21"), null);
  assert.deepEqual(listHandoffs(), []);
});

test("a date that is not an ISO day is refused rather than stored", () => {
  fresh();
  assert.equal(addHandoff("teacher", "yesterday"), null);
  assert.equal(addHandoff("teacher", ""), null);
  assert.deepEqual(listHandoffs(), []);
});

test("undo removes exactly one row", () => {
  fresh();
  const first = addHandoff("teacher", "2026-10-21");
  addHandoff("trusted", "2026-10-22");
  removeHandoff(first!.id);
  assert.deepEqual(
    listHandoffs().map((row) => row.step),
    ["trusted"],
  );
});

test("deleting everything leaves no trace of who the child approached", () => {
  fresh();
  addHandoff("teacher", "2026-10-21");
  addHandoff("head", "2026-10-22");
  clearHandoffs();
  assert.deepEqual(listHandoffs(), []);
});

test("a damaged row is dropped, and the good ones survive", () => {
  fresh(
    JSON.stringify([
      { id: "a", step: "teacher", date: "2026-10-21" },
      { id: "b", step: "wizard", date: "2026-10-21" },
      { id: "c", step: "head", date: "soon" },
      "not even an object",
    ]),
  );
  assert.deepEqual(
    listHandoffs().map((row) => row.id),
    ["a"],
  );
});

test("stored JSON that is not a list at all does not break the ladder", () => {
  fresh(JSON.stringify({ teacher: true }));
  assert.deepEqual(listHandoffs(), []);
});

test("with storage off it still works for this visit, and admits it", () => {
  useStorage(null);
  addHandoff("teacher", "2026-10-21");
  assert.equal(listHandoffs().length, 1);
  assert.equal(isPersistent(), false);
});
