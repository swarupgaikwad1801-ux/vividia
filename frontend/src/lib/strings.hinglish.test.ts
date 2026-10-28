/**
 * Hinglish never shows whether the child is a boy or a girl (#130).
 *
 * "tum dekh sakte ho", "tum wapas aaye", "akela", "ignore kiya hua" are all
 * masculine: a girl would read them as written for someone else. Commands
 * ("dekho"), nouns ("akelapan") and passives ("badla ja sakta hai") say the
 * same thing to everyone. This pins the forms that were found and fixed on
 * 28 Oct so they do not come back; it cannot catch every gendered word, and
 * the native read in #130 still decides.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { STRINGS } from "./strings.ts";

const GENDERED = /\b(sakte|sakti|rahe|rahi|karte|karti) ho\b|\bwapas aaye\b|\bkiya hua\b|\bakela\b/i;

test("no Hinglish line uses a verb or adjective that genders the child", () => {
  const found = Object.entries(STRINGS)
    .filter(([, text]) => GENDERED.test((text as { hi: string }).hi))
    .map(([key, text]) => `${key}: ${(text as { hi: string }).hi}`);
  assert.deepEqual(found, []);
});
