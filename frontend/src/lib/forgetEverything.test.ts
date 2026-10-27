/**
 * "Delete everything" has to mean everything.
 *
 * The failure guarded against here is not a hard one, it is a forgettable
 * one: a feature adds a store, nobody edits the delete button, and a child
 * who asked to be forgotten is still remembered on a shared phone.
 *
 * Writing the scan at the end of this file is what found
 * `vividia.followup.v1` and `vividia.pin.tries.v1`, neither of which was in
 * the original list of stores to clear.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { forgetEverything } from "./forgetEverything";
import { addEntry, listEntries, useStorage as useTimelineStorage } from "./timeline";
import { markHandled, readCheckInState, useStorage as useCheckInStorage } from "../lib-followups-ui/checkInState";
import { addHandoff, listHandoffs, useStorage as useHandoffStorage } from "../lib-followups-ui/handoffStore";

/** A localStorage good enough for all four stores, which can be told to refuse. */
function fakeStorage(refuse?: string) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (refuse && k.includes(refuse)) throw new Error("storage refused");
      data.set(k, v);
    },
    removeItem: (k: string) => {
      if (refuse && k.includes(refuse)) throw new Error("storage refused");
      data.delete(k);
    },
  };
}

/** Point every store at one fake, including pin.ts, which reads the global. */
function useEverywhere(store: ReturnType<typeof fakeStorage>) {
  useTimelineStorage(store);
  useCheckInStorage(store);
  useHandoffStorage(store);
  Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
}

function release() {
  useTimelineStorage(null);
  useCheckInStorage(null);
  useHandoffStorage(null);
}

const ENTRY = {
  date: "2026-10-02",
  mood: "sad",
  text_child: "my own words",
  text_de: "meine eigenen Worte",
};

test("it clears every store, not just the timeline", () => {
  const store = fakeStorage();
  useEverywhere(store);
  try {
    addEntry(ENTRY);
    markHandled([ENTRY]);
    addHandoff("teacher", "2026-10-02");
    store.setItem("vividia.pin.removed.v1", '"2026-10-21"');
    store.setItem("vividia.avatar.v1", "3");

    assert.ok(store.data.size >= 3, "precondition: several stores hold something");

    forgetEverything();

    assert.equal(store.data.has("vividia.avatar.v1"), false, "the map traveller survived");

    assert.equal(listEntries().length, 0, "the timeline survived");
    assert.equal(listHandoffs().length, 0, "the handoff record survived");
    assert.equal(
      store.data.has("vividia.pin.removed.v1"),
      false,
      "the note saying when the PIN was removed survived",
    );
    assert.equal(
      readCheckInState().handledFor,
      null,
      "the check-in schedule survived",
    );
  } finally {
    release();
  }
});

test("one store refusing does not leave the others behind", () => {
  // A private window, a full disk, blocked site data. The child asked to be
  // forgotten: they get as much of it as the device allows, not the first
  // store and then an exception. Same rule as everywhere else in the app -
  // one failure never hides the part that matters.
  const store = fakeStorage();
  useEverywhere(store);
  try {
    addEntry(ENTRY);
    addHandoff("teacher", "2026-10-02");

    const refusing = fakeStorage("timeline");
    for (const [k, v] of store.data) refusing.data.set(k, v);
    useEverywhere(refusing);

    assert.doesNotThrow(() => forgetEverything(), "a refusing store must not throw at the child");

    assert.equal(
      refusing.data.has("vividia.handoffs.v1"),
      false,
      "the handoff record was left behind because another store refused",
    );
  } finally {
    release();
  }
});

test("every storage key in the app has a decision recorded here", () => {
  // The real guard, and the one that found two stores nobody had listed.
  // A grep, not a proof - but it fails on the accident, which is the failure
  // that actually happens.
  const HERE = dirname(fileURLToPath(import.meta.url));
  const roots = ["lib", "lib-followups-ui", "lib-demo"];
  const found = new Set<string>();

  for (const root of roots) {
    let names: string[] = [];
    try {
      names = readdirSync(join(HERE, "..", root));
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
      const source = readFileSync(join(HERE, "..", root, name), "utf-8");
      for (const [, key] of source.matchAll(/["'](vividia.[A-Za-z0-9.]+)["']/g)) found.add(key);
    }
  }

  assert.ok(found.size >= 6, `the scan found only ${found.size} keys; it has stopped working`);

  /** Cleared by forgetEverything, directly or by the module that owns it. */
  const CLEARED = new Set([
    "vividia.timeline.v1", // clearAll
    "vividia.checkins.v1", // forgetCheckIns
    "vividia.followup.v1", // forgetCheckIns, same module
    "vividia.handoffs.v1", // clearHandoffs
    "vividia.pin.removed.v1", // forgetPinRemoved
    // forgetAvatar. Unlike the language, nothing needs it to find the way
    // back, and on a shared phone a saved traveller shows the app was used.
    "vividia.avatar.v1",
    // forgetDrafts: half-written words, the most sensitive thing on the phone.
    "vividia.drafts.v1",
  ]);

  /** Deliberately kept, with the reason, so the next person need not re-decide. */
  const KEPT = new Set([
    // The lock itself. Removing a child's PIN because they cleared their
    // notes is a surprise they did not ask for, and `clearPin()` already
    // exists for when they do ask. There is nothing left to read anyway.
    "vividia.pin.v1",
    "vividia.pin.tries.v1",
    // A preference, not a record of what happened. Clearing it reveals
    // nothing and only makes the app harder to read on the next open.
    "vividia.lang.v1",
    // Bigger text / easier reading: the same kind of preference as the
    // language, visible only inside the app, and needed to read it.
    "vividia.display.v1",
    // Cleared by clearDemo() using the ids it seeded. Wiping the key
    // wholesale would take a child's own entries with it.
    "vividia.demo.v1",
  ]);

  const undecided = [...found].filter((k) => !CLEARED.has(k) && !KEPT.has(k));
  assert.deepEqual(
    undecided,
    [],
    `new storage key(s): ${undecided.join(", ")}. Decide whether "delete everything" ` +
      `clears them, then add to forgetEverything.ts and to CLEARED, or to KEPT with the reason.`,
  );
});
