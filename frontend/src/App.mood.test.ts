/**
 * The mood the child taps has to reach the entry they write.
 *
 * It did not. `CheckIn` has always handed the chosen code to `onChoose`, and
 * `App.tsx` took no argument and wrote `mood: ""` into every entry. So step 1
 * of the journey — the one step that needs no language, and the one a frozen
 * child can always answer — was collected and dropped on the floor.
 *
 * Nothing caught it, and nothing could have: `mood: ""` is a valid `Entry`,
 * `tsc` is happy with a callback that ignores its argument, and the only
 * screen that renders a mood (`EscalationCarry`) draws an empty span rather
 * than failing. Every test fixture in the suite hard-codes `mood: "sad"`, so
 * the suite proved the storage worked while the app never used it.
 *
 * A regex over the source, like `App.reachable.test.ts`, and for the same
 * reason: it cannot prove the wiring is right, but it fails on the exact
 * mistake that was made.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.tsx"), "utf-8");

test("the entry's mood is not a hard-coded empty string", () => {
  // The literal that was there. Anything quoted is wrong here: a mood is
  // either the child's code or "" because they skipped, and only the running
  // app knows which.
  const literal = /addEntry\(\{[\s\S]*?mood:\s*"/.exec(SOURCE);
  assert.equal(
    literal,
    null,
    'addEntry is given a quoted mood. It must be passed the value CheckIn reported, ' +
      'not a literal: a hard-coded "" is how this was broken for every entry.',
  );
});

test("addEntry is given a mood at all", () => {
  const call = /addEntry\(\{[\s\S]*?\}\)/.exec(SOURCE);
  assert.ok(call, "could not find the addEntry call; this test has stopped working");
  assert.match(
    call[0],
    /\bmood\b/,
    "the entry written on approval has no mood field",
  );
});

test("the check-in handler takes the chosen mood", () => {
  // `afterCheckIn = useCallback(() => ...)` - no parameter - is precisely the
  // bug. CheckIn's onChoose is `(mood: string | null) => void`, so a handler
  // that declares nothing silently discards it.
  const handler = /const afterCheckIn = useCallback\(\s*\(([^)]*)\)/.exec(SOURCE);
  assert.ok(handler, "could not find afterCheckIn; this test has stopped working");
  assert.notEqual(
    handler[1].trim(),
    "",
    "afterCheckIn takes no argument, so the mood CheckIn reports is thrown away",
  );
});

test("the mood is cleared once it has been written", () => {
  // Otherwise the next entry inherits a feeling reported for a different one,
  // which is the inference lib/moods.ts says we never make.
  const after = SOURCE.slice(SOURCE.indexOf("addEntry({"));
  assert.match(
    after,
    /setMood\(""\)/,
    "nothing resets the mood after an entry is saved",
  );
});
