/**
 * The warm lines: which one the app says back, one test per rule in
 * lib/warm.ts, and the wording rules every line has to keep.
 *
 *   cd frontend
 *   node --import tsx --test src/lib/warm.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { NO_SAY } from "./pictures";
import { LANGS, STRINGS, type StringKey } from "./strings";
import { ADULT_LINE, whatLine } from "./warm";

test("the line answers the most serious thing tapped, not the first", () => {
  assert.equal(whatLine(["names", "threatened"]), "warm.what.threatened");
  assert.equal(whatLine(["left_out", "hit"]), "warm.what.hurt");
  assert.equal(whatLine(["pushed"]), "warm.what.hurt");
  assert.equal(whatLine(["online", "names"]), "warm.what.online");
  assert.equal(whatLine(["other"]), "warm.what.other");
});

test("not saying is an answer too: a skip and 'I don't want to say' get 'That's OK'", () => {
  assert.equal(whatLine([]), "warm.what.noSay");
  assert.equal(whatLine([NO_SAY]), "warm.what.noSay");
});

const ALL_LINES = (Object.keys(STRINGS) as StringKey[]).filter((key) => key.startsWith("warm."));

test("every line the rules can choose exists, and every written line is reachable", () => {
  const chosen = new Set<StringKey>([
    ...["threatened", "hit", "pushed", "taken", "online", "names", "left_out", "other"].map((c) => whatLine([c])),
    whatLine([]),
    ADULT_LINE,
  ]);
  assert.deepEqual([...chosen].sort(), [...ALL_LINES].sort());
});

test("no line speaks as a person, promises safety, or slips into Devanagari", () => {
  for (const key of ALL_LINES) {
    for (const lang of LANGS) {
      const text = STRINGS[key][lang];
      assert.ok(text.trim(), `${key}.${lang} is empty`);
      assert.doesNotMatch(text, /[ऀ-ॿ]/, `${key}.${lang}: Hinglish only`);
    }
    // The app is not a person (strings.ts): "we", never "I".
    assert.doesNotMatch(STRINGS[key].en, /\bI\b|\bI'm\b|\bme\b/, `${key}: the app never says "I"`);
    // CLAUDE.md: never "this keeps you safe".
    assert.doesNotMatch(STRINGS[key].en, /\bsafe\b/i, `${key}: never promise safety`);
    assert.doesNotMatch(STRINGS[key].de, /\bsicher\b/i, `${key}: never promise safety`);
  }
});
