/**
 * Tests for the emoji check-in list.
 *
 * The one that matters reads content/demo_story.json and checks that every
 * mood code the one-click demo uses still exists here. content/ is Neel's and
 * read-only from this side: the test asserts against it, never edits it.
 *
 * Run:
 *   node --test frontend/src/lib/moods.test.ts
 *
 * Type-check. module/moduleResolution match what Vite + React + TS uses,
 * which is what these files are written for; nodenext would resolve them as
 * CommonJS and reject the import.meta below:
 *   npx tsc --strict --noEmit --target es2022 --module esnext \
 *     --moduleResolution bundler --lib es2022,dom \
 *     --allowImportingTsExtensions frontend/src/lib/*.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HINDI_REVIEWED,
  MOODS,
  MOOD_CODES,
  REQUIRED_CODES,
  moodByCode,
  moodEmoji,
  moodLabel,
  type Lang,
} from "./moods.ts";

const LANGS: Lang[] = ["en", "de", "hi"];

/** The demo story, read from content/ so the two cannot drift apart. */
function demoStory(): { timeline: { mood: string }[] } {
  const path = new URL("../../../content/demo_story.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf8"));
}

// --- the codes the rest of the repo depends on -----------------------------

test("every mood the demo story uses exists here", () => {
  const used = [...new Set(demoStory().timeline.map((entry) => entry.mood))];

  assert.ok(used.length > 0, "the demo timeline has no moods; is the path still right?");
  for (const code of used) {
    assert.ok(
      moodByCode(code),
      `content/demo_story.json uses mood "${code}", which this list does not have`,
    );
  }
});

test("sad and scared are present, since the demo relies on them", () => {
  for (const code of REQUIRED_CODES) {
    assert.ok(moodByCode(code), `${code} is missing`);
  }
});

test("the required codes really are the ones the file uses", () => {
  const used = new Set(demoStory().timeline.map((entry) => entry.mood));
  for (const code of REQUIRED_CODES) {
    assert.ok(used.has(code), `${code} is listed as required but the demo does not use it`);
  }
});

// --- shape -----------------------------------------------------------------

test("codes are unique, because they are stored values", () => {
  assert.equal(new Set(MOOD_CODES).size, MOOD_CODES.length);
});

test("codes are plain lowercase identifiers", () => {
  for (const code of MOOD_CODES) {
    assert.match(code, /^[a-z][a-z_]*$/, `${code} is not a safe stored value`);
  }
});

test("every mood has an emoji and a label in every shipped language", () => {
  for (const mood of MOODS) {
    assert.ok(mood.emoji.length > 0, `${mood.code} has no emoji`);
    for (const lang of LANGS) {
      assert.ok(mood.label[lang]?.trim(), `${mood.code} has no ${lang} label`);
    }
  }
});

test("the labels are distinct within each language", () => {
  for (const lang of LANGS) {
    const labels = MOODS.map((mood) => mood.label[lang]);
    assert.equal(
      new Set(labels).size,
      labels.length,
      `two moods share a ${lang} label, so the buttons would read the same`,
    );
  }
});

test("there are six, which is two rows of three at 360px", () => {
  assert.equal(MOODS.length, 6);
});

// --- lookups ---------------------------------------------------------------

test("a label comes back in the child's language", () => {
  assert.equal(moodLabel("sad", "de"), "Traurig");
  assert.equal(moodLabel("sad", "en"), "Sad");
  assert.notEqual(moodLabel("sad", "hi"), moodLabel("sad", "en"));
});

test("a language we have no copy for falls back to English", () => {
  assert.equal(moodLabel("scared", "uk"), moodLabel("scared", "en"));
});

test("a code from a newer version shows something rather than a blank", () => {
  assert.equal(moodLabel("elated", "en"), "elated");
  assert.equal(moodEmoji("elated"), "");
  assert.equal(moodByCode("elated"), undefined);
});

test("an emoji comes back for a known code", () => {
  assert.equal(moodEmoji("scared"), "😨");
});

// --- the Hindi caveat ------------------------------------------------------

test("the Hindi labels are still flagged as unreviewed", () => {
  // When a native speaker has read them, flip HINDI_REVIEWED in the same
  // commit and name who read it. Until then this test is the reminder.
  assert.equal(
    HINDI_REVIEWED,
    false,
    "if the Hindi has been reviewed, say who in the commit; if not, the flag must stay false",
  );
});
