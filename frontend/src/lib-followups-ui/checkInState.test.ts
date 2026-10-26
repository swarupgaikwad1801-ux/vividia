/**
 * Tests for "ask once, then stop".
 *
 *   cd frontend
 *   node --import tsx --test "src/lib-followups-ui/*.test.ts"
 *
 * Every "today" is passed in, as in `lib/followups.test.ts`: no real clock.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type { Entry } from "../types/api.ts";
import {
  forgetCheckIns,
  isPersistent,
  markHandled,
  readCheckInState,
  shouldAsk,
  silence,
  unsilence,
  useStorage,
} from "./checkInState.ts";
import type { StorageLike } from "./localStore.ts";

function entry(date: string): Entry {
  return { date, mood: "sad", text_child: "x", text_de: "x" };
}

function fakeStorage(): StorageLike {
  const rows = new Map<string, string>();
  return {
    getItem: (key) => rows.get(key) ?? null,
    setItem: (key, value) => void rows.set(key, value),
    removeItem: (key) => void rows.delete(key),
  };
}

/** A clean browser before each test; the module is a singleton. */
function fresh(): void {
  useStorage(fakeStorage());
}

test("before the gap has passed, the question is not asked", () => {
  fresh();
  assert.equal(shouldAsk([entry("2026-10-22")], "2026-10-24"), false);
});

test("once the gap has passed, it is asked", () => {
  fresh();
  assert.equal(shouldAsk([entry("2026-10-22")], "2026-10-25"), true);
});

test("no entries means nothing to follow up on", () => {
  fresh();
  assert.equal(shouldAsk([], "2026-10-25"), false);
});

test("answering stops it coming back today and every day after", () => {
  fresh();
  const entries = [entry("2026-10-01")];
  assert.equal(shouldAsk(entries, "2026-10-25"), true);
  markHandled(entries);
  assert.equal(shouldAsk(entries, "2026-10-25"), false);
  // This is the nag `lib/followups.ts` promises not to be: checkInDue() alone
  // still reads true on all of these days.
  assert.equal(shouldAsk(entries, "2026-10-26"), false);
  assert.equal(shouldAsk(entries, "2026-11-30"), false);
});

test("dismissing costs the same as answering: the gap is closed either way", () => {
  fresh();
  const entries = [entry("2026-10-01")];
  markHandled(entries); // "not now" calls exactly this
  assert.equal(shouldAsk(entries, "2026-10-25"), false);
});

test("a new entry starts a new gap, and the question may come back once", () => {
  fresh();
  const first = [entry("2026-10-01")];
  markHandled(first);
  assert.equal(shouldAsk(first, "2026-10-25"), false);

  const withNew = [...first, entry("2026-10-25")];
  assert.equal(shouldAsk(withNew, "2026-10-26"), false, "the new gap has not passed yet");
  assert.equal(shouldAsk(withNew, "2026-10-28"), true, "three days later, once");
  markHandled(withNew);
  assert.equal(shouldAsk(withNew, "2026-10-29"), false);
});

test("stop asking is honoured in every future gap, not only this one", () => {
  fresh();
  silence();
  assert.equal(shouldAsk([entry("2026-10-01")], "2026-10-25"), false, "silenced, though due");
  assert.equal(shouldAsk([entry("2026-12-01")], "2027-01-01"), false);
  assert.equal(readCheckInState().silenced, true);
});

test("stop asking is reversible, because a choice a child cannot undo is a trap", () => {
  fresh();
  silence();
  unsilence();
  assert.equal(shouldAsk([entry("2026-10-01")], "2026-10-25"), true);
});

test("forgetting the record leaves nothing behind", () => {
  fresh();
  markHandled([entry("2026-10-01")]);
  silence();
  forgetCheckIns();
  assert.deepEqual(readCheckInState(), { handledFor: null, silenced: false });
});

test("the answer itself is never stored", () => {
  fresh();
  // There is no API to store it, by design: the app has no use for a history
  // of how a child said they felt and may not infer anything from one.
  markHandled([entry("2026-10-01")]);
  assert.deepEqual(Object.keys(readCheckInState()).sort(), ["handledFor", "silenced"]);
});

test("damaged storage is survivable: it keeps working, and admits it is not saving", () => {
  useStorage({
    getItem: () => "not json at all",
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => undefined,
  });
  assert.deepEqual(readCheckInState(), { handledFor: null, silenced: false });
  markHandled([entry("2026-10-01")]);
  assert.equal(isPersistent(), false);
});

test("with storage switched off entirely, the record still works for this visit", () => {
  useStorage(null);
  const entries = [entry("2026-10-01")];
  assert.equal(shouldAsk(entries, "2026-10-25"), true);
  markHandled(entries);
  assert.equal(shouldAsk(entries, "2026-10-25"), false);
  assert.equal(isPersistent(), false);
});

test("an unreadable entry date is never a reason to ask or to throw", () => {
  fresh();
  assert.equal(shouldAsk([entry("yesterday")], "2026-10-25"), false);
  assert.equal(shouldAsk([entry("yesterday"), entry("2026-10-01")], "2026-10-25"), true);
});
