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
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(SRC, "App.tsx"), "utf-8");

/** The members of the `Step` union, read out of the type declaration. */
function declaredSteps(): string[] {
  const block = SOURCE.match(/type Step =([\s\S]*?);/);
  assert.ok(block, "could not find the `Step` union; this test has stopped working");
  return [...block[1].matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
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
  const initial = [...SOURCE.matchAll(/useState<Step>\([\s\S]{0,200}?"([a-zA-Z]+)"/g)].map(
    (m) => m[1],
  );
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

/**
 * The blind spot the four tests above have, found the hard way.
 *
 * All of them read `App.tsx` and reason about the `Step` union, so they catch
 * a screen that is in the union with no door. They are blind to a screen or
 * component file that **nothing imports at all**: it is not a member of
 * anything, so there is nothing for them to notice. `tsc` is blind to it too -
 * an unused module is not an error - and so is the bundler, which simply
 * leaves it out.
 *
 * That cost us `DemoButton`. "Try Amara's story" was written, tested, styled
 * and never mounted, and the way it surfaced was `/api/demo` missing from a
 * production bundle while the test suite was green. A **Must** item, the first
 * thing a judge presses, invisible to every check we had.
 *
 * So this test asks the cruder question the others cannot: does any
 * non-test file import this one?
 */

/** Every non-test source file under `src/`, as absolute paths. */
function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: "utf-8" })
    .filter((rel) => /\.tsx?$/.test(rel) && !/\.test\.tsx?$/.test(rel))
    .map((rel) => join(SRC, rel));
}

test("every screen and component file is imported by something", () => {
  const files = sourceFiles();
  assert.ok(files.length > 10, `read only ${files.length} source files; the walk has stopped working`);

  const everything = files.map((path) => readFileSync(path, "utf-8")).join("\n");

  // Known and accepted, with a reason. Anything else here should be a question
  // asked of whoever owns the file, not a line added to this list.
  //
  // `screens/SafetyScreen.tsx` arrived with #47 and has no caller on any
  // branch. It is Neel's file and CLAUDE.md says not to edit someone else's,
  // so it is flagged to him in #85 rather than deleted or wired by me: the
  // safety floor is already served by `EmergencyHelp` and the help screen, so
  // this may be a duplicate to remove rather than a screen to mount. Delete
  // this entry the moment he decides either way.
  const KNOWN_ORPHANS = new Set(["screens/SafetyScreen.tsx"]);

  const orphans: string[] = [];
  for (const path of files) {
    const dir = path.slice(SRC.length + 1).replace(/\\/g, "/");
    if (!/^(screens|components)\//.test(dir)) continue;

    // Matches `from "./Foo"`, `from "../components/Foo"` and the `.tsx` form.
    // The file's own text is in `everything`, but a file cannot import itself,
    // so there is nothing to exclude.
    const base = dir.replace(/^.*\//, "").replace(/\.tsx?$/, "");
    const imported = new RegExp(`from\\s+"[^"]*/${base}(\\.tsx?)?"`).test(everything);

    if (!imported && !KNOWN_ORPHANS.has(dir)) orphans.push(dir);
  }

  assert.deepEqual(
    orphans,
    [],
    `nothing imports: ${orphans.join(", ")}. A file nothing imports is not in the ` +
      `bundle, so the feature does not exist however well it is written. Mount it, ` +
      `or delete it, or add it to KNOWN_ORPHANS with a reason.`,
  );
});
