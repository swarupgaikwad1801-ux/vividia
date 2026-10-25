/**
 * The at-home rule, pinned.
 *
 * > If the child said it happens at home, never suggest family members at any
 * > step. - CLAUDE.md, README, content/adult_guide.json
 *
 * NOT RUN BY `npm test` YET. The test script in frontend/package.json globs
 * `src/lib/**` only, and package.json is Vernika's file, so this branch does
 * not change it. Until it does, run this by hand:
 *
 *   cd frontend
 *   node --import tsx --test src/components/HandoffSuggestions.test.ts
 *
 * The one-line change that puts it in CI is in the PR description. A rule this
 * absolute should not depend on somebody remembering to run a file.
 *
 * The last test is the one that matters: it does not name "home", it asserts
 * that for EVERY place, the family option appears if and only if the child is
 * told why it does not. That is the invariant a future edit would break.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  WHERE_OPTIONS,
  familyExcluded,
  isWhereItHappens,
  primarySuggestion,
  suggestedAdults,
  type WhereItHappens,
} from "./HandoffSuggestions.ts";

const PLACES = WHERE_OPTIONS.map((option) => option.id);

function ids(where: WhereItHappens): string[] {
  return suggestedAdults(where).map((option) => option.id);
}

test("at home, no family member is suggested", () => {
  assert.ok(!ids("home").includes("family"));
});

test("at home, no suggestion is a family one even by context", () => {
  // Stronger than checking the id: a future option called "myMum" tagged
  // family must be caught too.
  for (const option of suggestedAdults("home")) {
    assert.notEqual(option.context, "family");
  }
});

test("at home, the child is still offered someone", () => {
  // Removing family must not leave an empty screen; that would be its own
  // failure - a child told to show it to nobody.
  assert.ok(ids("home").length >= 2);
  assert.equal(primarySuggestion("home")?.id, "socialWorker");
});

test("the other places keep the family option", () => {
  for (const place of PLACES.filter((p) => p !== "home")) {
    assert.ok(ids(place).includes("family"), place);
  }
});

test("an unrecognised answer falls back to the most restrictive list", () => {
  // A stale value from storage or a hand-typed URL must never widen the list.
  const unknown = "the bus" as WhereItHappens;
  assert.deepEqual(ids(unknown), ids("home"));
  assert.equal(familyExcluded(unknown), true);
});

test("isWhereItHappens accepts only the four offered answers", () => {
  for (const place of PLACES) assert.equal(isWhereItHappens(place), true);
  for (const value of ["", "HOME", "the bus", null, undefined, 0, {}]) {
    assert.equal(isWhereItHappens(value), false);
  }
});

test("the explanation and the options can never disagree", () => {
  // The invariant. `familyExcluded` drives `handoff.homeNote` on screen, so if
  // these two ever come apart the child either loses the family option with no
  // reason given, or reads a reason that is not true of what they can see.
  for (const place of PLACES) {
    assert.equal(
      ids(place).includes("family"),
      !familyExcluded(place),
      `${place}: the list and the note disagree`,
    );
  }
});

test("every place offers a suggestion to lead with", () => {
  for (const place of PLACES) {
    assert.ok(primarySuggestion(place), place);
    assert.equal(primarySuggestion(place)?.id, ids(place)[0]);
  }
});
