/**
 * The mood the child taps has to reach the entry it belongs to.
 *
 * Step 1 of the journey is the emoji check-in: the one step that needs no
 * language, and the one a frozen child can always answer. `CheckIn` has always
 * handed the chosen code up through `onChoose`.
 *
 * This has now been half-broken twice, in different places:
 *
 * 1. Originally `afterCheckIn` took no argument at all, so every entry was
 *    written with `mood: ""` (#90).
 * 2. The screen stack (#66 -> #77) rewrote `App.tsx` and brought back the
 *    capture - `afterCheckIn(mood)` - and used it for the PICTURE entry, but
 *    `keepWords` still wrote a hard-coded `""`. So the fix was in place for
 *    the secondary path and missing on the centrepiece, and #90, which would
 *    have caught it, was about to be closed as "already merged".
 *
 * Nothing caught either one, and nothing could have: `mood: ""` is a valid
 * `Entry`, `tsc` is happy with a callback that ignores its argument, and
 * `EscalationCarry` - the only screen that renders a mood - draws an empty
 * span rather than failing. Every fixture in the suite hard-codes
 * `mood: "sad"`, so the suite proved the storage worked while the app put
 * nothing into it.
 *
 * A regex over the source, like `App.reachable.test.ts`, for the same reason:
 * it cannot prove the wiring is right, but it fails on the exact mistakes that
 * were made.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.tsx"), "utf-8");

/**
 * The file with comments stripped. These tests search for string literals, and
 * the comments here quote the very literals they warn about - without this,
 * explaining the bug would trip the test that guards it.
 */
function code(): string {
  return SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

test("no entry is written with a hard-coded mood", () => {
  // The literal that was there, twice. Anything quoted is wrong: a mood is
  // either the child's code or "" because they skipped, and only the running
  // app knows which.
  const literals = [...code().matchAll(/mood:\s*"/g)];
  assert.deepEqual(
    literals.map((m) => m[0]),
    [],
    'an entry is given a quoted mood. It must be passed the value CheckIn ' +
      'reported, not a literal: a hard-coded "" is how this broke twice.',
  );
});

test("the entry written from the child's own words carries a mood", () => {
  // Specifically `keepWords`, which is the centrepiece path and the one that
  // was still broken after #77.
  const keep = /const keepWords = useCallback\([\s\S]*?\n  \);/.exec(code());
  assert.ok(keep, "could not find keepWords; this test has stopped working");
  assert.match(
    keep[0],
    /mood:\s*checkInMood/,
    "the entry written on approval does not use the mood the child tapped",
  );
});

test("the check-in handler takes the chosen mood", () => {
  // `afterCheckIn = useCallback(() => ...)` - no parameter - was the original
  // bug. CheckIn's onChoose is `(mood: string | null) => void`, so a handler
  // that declares nothing silently discards it.
  const handler = /const afterCheckIn = useCallback\(\s*\(([^)]*)\)/.exec(code());
  assert.ok(handler, "could not find afterCheckIn; this test has stopped working");
  assert.notEqual(
    handler[1].trim(),
    "",
    "afterCheckIn takes no argument, so the mood CheckIn reports is thrown away",
  );
});

test("every path that saves an entry clears the mood afterwards", () => {
  // Otherwise the next entry inherits a feeling reported about a different
  // one, which is the inference lib/moods.ts and CLAUDE.md say we never make.
  // Both savers must do it: the picture answers and the child's own words.
  const body = code();
  const clears = [...body.matchAll(/setCheckInMood\(null\)/g)];
  assert.ok(
    clears.length >= 2,
    `the mood is cleared ${clears.length} time(s); both the picture entry and ` +
      `the written entry must clear it, or a feeling carries to the next entry`,
  );
});
