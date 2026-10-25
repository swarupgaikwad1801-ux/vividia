/**
 * Tests for the language list and the device-language hint.
 *
 * These live beside the code but do NOT run in CI yet: the `test` script in
 * `frontend/package.json` globs `src/lib/**` only, and that file is Vernika's.
 * Run them by hand from `frontend/`:
 *
 *   node --import tsx --test "src/lib-lang/*.test.ts"
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { LANGS } from "../lib/strings.ts";
import {
  LANGUAGE_OPTIONS,
  applyDocumentLang,
  deviceLang,
  matchDeviceLang,
  optionFor,
} from "./languages.ts";

test("every shipped language has an option, in the order strings.ts lists them", () => {
  assert.deepEqual(
    LANGUAGE_OPTIONS.map((option) => option.code),
    [...LANGS],
  );
});

test("each language is written in its own script", () => {
  const by = (code: string) => optionFor(code)!;
  assert.equal(by("en").endonym, "English");
  assert.equal(by("de").endonym, "Deutsch");
  assert.equal(by("hi").endonym, "हिन्दी");
});

test("the Hindi label is really Devanagari, not a transliteration", () => {
  // The point of the endonym is that a child who cannot read Latin script can
  // still find their language. "Hindi" in Latin letters would not do that.
  assert.match(optionFor("hi")!.endonym, /[ऀ-ॿ]/);
  assert.doesNotMatch(optionFor("hi")!.endonym, /[A-Za-z]/);
});

test("English carries no second English name; German and Hindi do", () => {
  assert.equal(optionFor("en")!.englishName, null);
  assert.equal(optionFor("de")!.englishName, "German");
  assert.equal(optionFor("hi")!.englishName, "Hindi");
});

test("every option has an html lang matching its code", () => {
  for (const option of LANGUAGE_OPTIONS) assert.equal(option.htmlLang, option.code);
});

test("nothing we ship is right-to-left", () => {
  // Arabic, Ukrainian and Turkish were dropped at the language gate, so no RTL
  // work exists. If a future language needs it, this test is the reminder that
  // the picker was never built or measured for it.
  for (const option of LANGUAGE_OPTIONS) assert.equal(option.dir, "ltr");
});

test("optionFor does not invent a language we dropped", () => {
  assert.equal(optionFor("ar"), undefined);
  assert.equal(optionFor("uk"), undefined);
  assert.equal(optionFor("tr"), undefined);
  assert.equal(optionFor(""), undefined);
  assert.equal(optionFor("EN"), undefined); // codes are lower case; callers pass Lang
});

test("a region or script subtag still finds the language", () => {
  assert.equal(matchDeviceLang(["de-DE"]), "de");
  assert.equal(matchDeviceLang(["de-AT"]), "de"); // an Austrian phone is still German
  assert.equal(matchDeviceLang(["de_CH"]), "de"); // underscore form, seen in some webviews
  assert.equal(matchDeviceLang(["hi-IN"]), "hi");
  assert.equal(matchDeviceLang(["hi-Latn-IN"]), "hi");
  assert.equal(matchDeviceLang(["en-GB"]), "en");
  assert.equal(matchDeviceLang(["DE"]), "de");
  assert.equal(matchDeviceLang([" de-DE "]), "de");
});

test("the child's first preference wins, not ours", () => {
  assert.equal(matchDeviceLang(["hi-IN", "de-DE", "en-US"]), "hi");
  assert.equal(matchDeviceLang(["fr-FR", "de-DE", "en-US"]), "de");
});

test("a language we do not ship gives no hint at all", () => {
  // Not the nearest thing, and not English-by-default: a hint we cannot back
  // up would be the app leaning on the child's choice for no reason.
  assert.equal(matchDeviceLang(["ar-EG"]), null);
  assert.equal(matchDeviceLang(["uk-UA", "tr-TR"]), null);
  assert.equal(matchDeviceLang([]), null);
  assert.equal(matchDeviceLang([""]), null);
});

test("junk in the tag list is skipped, not thrown at the child", () => {
  const junk = [null, undefined, 42, {}, "", "   ", "de-DE"] as unknown as string[];
  assert.equal(matchDeviceLang(junk), "de");
});

test("deviceLang prefers the full preference list over the single language", () => {
  assert.equal(deviceLang({ languages: ["hi-IN", "en-US"], language: "en-US" }), "hi");
});

test("deviceLang falls back to navigator.language when there is no list", () => {
  assert.equal(deviceLang({ language: "de-DE" }), "de");
});

test("deviceLang survives a navigator with nothing useful on it", () => {
  assert.equal(deviceLang({}), null);
  assert.equal(deviceLang({ languages: [], language: "" }), null);
});

test("deviceLang does not throw where there is no navigator", () => {
  // Under Node there is no browser navigator, which is the same shape of
  // problem as an embedder that throws on the property.
  assert.doesNotThrow(() => deviceLang());
});

test("applyDocumentLang is harmless with no document", () => {
  assert.doesNotThrow(() => applyDocumentLang("hi"));
});
