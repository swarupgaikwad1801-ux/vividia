/**
 * Tests for the copy lookup.
 *
 *   cd frontend
 *   node --import tsx --test "src/lib-followups-ui/*.test.ts"
 *
 * NOTE: `package.json`'s test script globs `src/lib/**` only, so these do not
 * run in CI yet. `package.json` is Vernika's file; the one-line glob change is
 * requested in the PR.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { STRINGS } from "../lib/strings.ts";
import { DRAFT_COPY, copy, englishOnlyNotice, says, untranslatedKeys } from "./copy.ts";

test("every draft is a key strings.ts does not have yet", () => {
  // The point of this assertion: the day Neel adds one of these to
  // strings.ts, this test fails and the dead English draft gets deleted
  // instead of sitting here looking like it is still needed.
  for (const key of Object.keys(DRAFT_COPY)) {
    assert.ok(
      !(key in STRINGS),
      `${key} is in strings.ts now; delete the draft from DRAFT_COPY`,
    );
  }
});

test("a key that exists in strings.ts comes from strings.ts, not from here", () => {
  const result = copy("handoff.youDecide", "de");
  assert.equal(result.fromStrings, true);
  assert.equal(result.lang, "de");
  assert.equal(result.text, STRINGS["handoff.youDecide"].de);
});

test("the ladder and follow-up wording now comes from strings.ts in the child's language", () => {
  const result = copy("ladder.carryTitle", "de");
  assert.equal(result.fromStrings, true);
  assert.equal(result.lang, "de");
  assert.equal(result.text, STRINGS["ladder.carryTitle"].de);
});

test("an unknown language falls back to English rather than an empty screen", () => {
  assert.equal(copy("handoff.youDecide", "fr").lang, "en");
  assert.equal(copy("handoff.youDecide", "fr").text, STRINGS["handoff.youDecide"].en);
});

test("says() carries the text and the language it is in together", () => {
  assert.deepEqual(says("ladder.title", "hi"), {
    lang: "hi",
    children: STRINGS["ladder.title"].hi,
  });
  assert.deepEqual(says("handoff.classTeacher", "hi"), {
    lang: "hi",
    children: STRINGS["handoff.classTeacher"].hi,
  });
});

test("no draft is empty or only whitespace", () => {
  for (const [key, text] of Object.entries(DRAFT_COPY as Record<string, string>)) {
    assert.ok(text.trim().length > 0, `${key} is blank`);
  }
});

test("no follow-up or ladder sentence contains a number that could be read as a contact", () => {
  // CLAUDE.md: content/helplines.json is the only place a contact may be
  // defined. A digit in a sentence on these screens is almost certainly someone
  // typing a helpline in by hand, so the whole set is simply digit-free.
  const texts = [
    ...Object.entries(DRAFT_COPY as Record<string, string>),
    ...Object.entries(STRINGS)
      .filter(([key]) => key.startsWith("followup.") || key.startsWith("ladder."))
      .flatMap(([key, text]) => Object.values(text).map((value) => [key, value] as const)),
  ];
  for (const [key, text] of texts) {
    assert.ok(!/\d/.test(text), `${key} contains a digit: ${text}`);
  }
});

test("the English-only notice takes itself off once nothing is English-only", () => {
  assert.equal(englishOnlyNotice("en"), null, "nothing to disclose to an English reader");
  assert.deepEqual(untranslatedKeys(), [], "every draft has a key in strings.ts now");
  assert.equal(englishOnlyNotice("de"), null);
  assert.equal(englishOnlyNotice("hi"), null);
});
