/**
 * The good face is answered before anything is asked (Neel, 27 Oct: choosing
 * "good" still asked "What happened?").
 *
 *   cd frontend
 *   node --import tsx --test src/screens/GoodDay.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import GoodDay from "./GoodDay.tsx";
import { LANGS, STRINGS, type StringKey } from "../lib/strings.ts";
import { mapFor } from "../lib/scenes.ts";
import { NO_PICKS } from "../lib/pictures.ts";

const noop = () => {};
const APP = readFileSync(new URL("../App.tsx", import.meta.url), "utf-8");

test("the good face goes to its own screen; every other face, and a skip, to What happened?", () => {
  assert.match(APP, /if \(mood === "good"\) setStep\("checkInGood"\);\s*else setStep\("picWhat"\);/);
});

test("the screen asks whether anything happened, with a yes and a no, in every language", () => {
  for (const lang of LANGS) {
    const html = renderToStaticMarkup(createElement(GoodDay, { lang, onSomething: noop, onHome: noop }));
    for (const key of ["good.title", "good.ask", "good.yes", "good.no"] as StringKey[]) {
      assert.ok(html.includes(STRINGS[key][lang].replace(/'/g, "&#x27;")), `${lang}: ${key}`);
    }
    // Not "What happened?": that is only for a child who said something did.
    assert.ok(!html.includes(STRINGS["q.what.title"][lang]), lang);
  }
});

test("'yes' goes on to the questions, and the happy ending goes home", () => {
  const tag = APP.match(/<GoodDay[\s\S]*?\/>/)?.[0] ?? "";
  assert.match(tag, /onSomething=\{\(\) => setStep\("picWhat"\)\}/);
  assert.match(tag, /onHome=\{\(\) => setTrail\(\[HOME\]\)\}/);
});

test("the traveller stays on the check-in stop", () => {
  assert.equal(mapFor("checkInGood", NO_PICKS)?.at, 0);
});

test("the good lines keep the wording rules: no 'I', no promise of safety, no Devanagari", () => {
  const keys = (Object.keys(STRINGS) as StringKey[]).filter((key) => key.startsWith("good."));
  assert.ok(keys.length >= 6);
  for (const key of keys) {
    for (const lang of LANGS) {
      assert.ok(STRINGS[key][lang].trim(), `${key}.${lang}`);
      assert.doesNotMatch(STRINGS[key][lang], /[ऀ-ॿ]/, `${key}.${lang}: Hinglish only`);
    }
    assert.doesNotMatch(STRINGS[key].en, /\bI\b|\bI'm\b|\bme\b/, `${key}: the app never says "I"`);
    assert.doesNotMatch(STRINGS[key].en, /\bsafe\b/i, key);
    assert.doesNotMatch(STRINGS[key].de, /\bsicher\b/i, key);
    // No verb that marks the child's gender in Hinglish.
    assert.doesNotMatch(STRINGS[key].hi, /\bchaht[ei]\b/, key);
  }
});
