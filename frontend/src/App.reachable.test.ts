/**
 * Every screen the shell mounts has to be reachable.
 *
 * This exists because three were not, and everything was green while they
 * weren't: `tsc --noEmit` clean, 237 tests passing. `"pinSet"` and
 * `"followUp"` appeared in `App.tsx` as rendered screens and in the `Step`
 * union as valid members, and nothing ever assigned them. A member nothing
 * assigns is still a member, so TypeScript has nothing to complain about.
 *
 * What that cost: a child could not set a PIN at all, so `pinStatus()` was
 * never "set", so the lock never engaged. And `"escalation"` was assigned
 * only inside the `"followUp"` block, so the escalation ladder - all of the
 * "don't get dropped" journey step - was dead behind a dead screen.
 *
 * A regex over the source, not a proof. It cannot tell whether a `setStep`
 * sits behind a condition no child can satisfy. But it fails on the mistake
 * that actually happens, which is adding a screen and forgetting the door,
 * and it needs no DOM - the same trade as `forgetEverything.test.ts`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(HERE, "App.tsx"), "utf-8");
// The union moved to lib/nav.ts with the Back button (#75); App.tsx still
// holds every navigation, so the two files are read together.
const NAV = readFileSync(join(HERE, "lib", "nav.ts"), "utf-8");

/** The members of the `Step` union, read out of the type declaration. */
function declaredSteps(): string[] {
  const block = NAV.match(/type Step =([\s\S]*?);/);
  assert.ok(block, "could not find the `Step` union; this test has stopped working");
  const code = block[1].replace(/\/\/.*$/gm, "");
  return [...code.matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
}

/** Every string literal passed to `setStep(...)`. */
function assignedSteps(): Set<string> {
  return new Set([...SOURCE.matchAll(/setStep\(\s*"([a-zA-Z]+)"/g)].map((m) => m[1]));
}

test("the Step union is not empty, so the reader above is still working", () => {
  const steps = declaredSteps();
  assert.ok(
    steps.length >= 5,
    `read only ${steps.length} steps from the union; the regex no longer matches the source`,
  );
});

test("every step has at least one setStep that reaches it", () => {
  const assigned = assignedSteps();

  // `language` is the one honest exception: it is the first-run screen, so it
  // is chosen by the useState initialiser rather than by navigation. Anything
  // else absent from `setStep` is a screen with no door.
  const INITIAL_ONLY = new Set(["language"]);

  const unreachable = declaredSteps().filter((s) => !assigned.has(s) && !INITIAL_ONLY.has(s));

  assert.deepEqual(
    unreachable,
    [],
    `no setStep call reaches: ${unreachable.join(", ")}. Either give the screen an ` +
      `entry point, or take it out of Step and render it in place the way FollowUp is.`,
  );
});

test("the initial step is one of the declared steps", () => {
  // Guards the other direction: a typo in the initialiser would otherwise be
  // a screen that never renders, with nothing to catch it.
  // The trail starts with `start(...)` (lib/nav.ts); every literal it can
  // start on counts, both sides of the first-run condition.
  const call = SOURCE.match(/useState\(\(\)\s*=>\s*start\(([^)]*)\)\)/);
  const initial = call ? [...call[1].matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]) : [];
  assert.ok(initial.length > 0, "could not find the initial step; this test has stopped working");

  const declared = new Set(declaredSteps());
  for (const step of initial) {
    assert.ok(declared.has(step), `the initialiser can return "${step}", which is not a Step`);
  }
});

test("no screen is rendered for a step that does not exist", () => {
  // The inverse mistake: deleting a member from Step but leaving its render
  // block, or renaming one and missing a call site.
  const declared = new Set(declaredSteps());
  const rendered = [...SOURCE.matchAll(/step === "([a-zA-Z]+)"/g)].map((m) => m[1]);
  assert.ok(rendered.length > 0, "found no `step === ...` blocks; this test has stopped working");

  const orphans = [...new Set(rendered)].filter((s) => !declared.has(s));
  assert.deepEqual(orphans, [], `rendered for a step that is not in the union: ${orphans.join(", ")}`);
});
