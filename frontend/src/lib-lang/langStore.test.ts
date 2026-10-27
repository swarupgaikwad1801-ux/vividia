/**
 * Tests for remembering the child's language.
 *
 * These live beside the code but do NOT run in CI yet: the `test` script in
 * `frontend/package.json` globs `src/lib/**` only, and that file is Vernika's.
 * Run them by hand from `frontend/`:
 *
 *   node --import tsx --test "src/lib-lang/*.test.ts"
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  LANG_KEY,
  forgetLang,
  isPersistent,
  languageSetupState,
  readLang,
  saveLang,
  useStorage,
} from "./langStore.ts";

type Fake = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A working fake of the bits of Storage this module uses. */
function memoryStore(): Fake & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/** Storage that exists but refuses everything: a private window, a locked tablet. */
function brokenStore(): Fake {
  return {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
}

/** Storage holding one raw string under our key, however damaged. */
function storeHolding(raw: string): Fake {
  const store = memoryStore();
  store.data.set(LANG_KEY, raw);
  return store;
}

beforeEach(() => {
  useStorage(memoryStore());
});

test("nothing is stored before the child chooses", () => {
  assert.equal(readLang(), null);
});

test("a choice is remembered", () => {
  saveLang("hi");
  assert.equal(readLang(), "hi");
  assert.equal(isPersistent(), true);
});

test("a later choice replaces the earlier one", () => {
  saveLang("hi");
  saveLang("de");
  assert.equal(readLang(), "de");
});

test("the stored shape is versioned, under one known key", () => {
  const store = memoryStore();
  useStorage(store);
  saveLang("de");
  assert.equal(LANG_KEY, "vividia.lang.v1");
  assert.deepEqual(JSON.parse(store.data.get(LANG_KEY)!), { v: 1, lang: "de" });
});

test("forgetting puts the child back on the picker", () => {
  saveLang("de");
  forgetLang();
  assert.equal(readLang(), null);
});

test("damaged stored data reads as nothing stored, never as a throw", () => {
  for (const raw of [
    "not json at all",
    "",
    "null",
    "{}",
    '"hi"', // a bare string: an older shape we never wrote
    "[]",
    '{"lang":"hi"}', // no version
    '{"v":2,"lang":"hi"}', // a version from the future
    '{"v":1}', // no language
    '{"v":1,"lang":42}',
    '{"v":1,"lang":""}',
  ]) {
    useStorage(storeHolding(raw));
    assert.equal(readLang(), null, `expected nothing stored for ${raw || "(empty)"}`);
  }
});

test("a language we dropped reads as nothing stored", () => {
  // Arabic, Ukrainian and Turkish were dropped at the language gate. A build
  // that stored one must put the child back on the picker rather than render a
  // screen in a language strings.ts has no words for.
  for (const code of ["ar", "uk", "tr", "fr"]) {
    useStorage(storeHolding(JSON.stringify({ v: 1, lang: code })));
    assert.equal(readLang(), null, `expected nothing stored for ${code}`);
  }
});

test("storage that refuses everything still gives the child a working app", () => {
  useStorage(brokenStore());
  saveLang("hi");
  // The choice holds for this visit, so the child is not asked twice in one
  // sitting; it is simply forgotten when the page closes.
  assert.equal(readLang(), "hi");
  assert.equal(isPersistent(), false);
});

test("no storage at all behaves the same way", () => {
  useStorage(null);
  assert.equal(isPersistent(), false);
  assert.equal(readLang(), null);
  saveLang("de");
  assert.equal(readLang(), "de");
  forgetLang();
  assert.equal(readLang(), null);
});

test("forgetting on broken storage does not throw", () => {
  useStorage(brokenStore());
  assert.doesNotThrow(() => forgetLang());
});

test("a stored choice means the child is not asked again", () => {
  saveLang("hi");
  assert.deepEqual(languageSetupState({ language: "de-DE" }), {
    needsChoice: false,
    lang: "hi",
    suggested: null,
  });
});

test("no stored choice: the device's language is a hint, and the app waits", () => {
  const state = languageSetupState({ languages: ["de-DE"] });
  assert.equal(state.needsChoice, true);
  assert.equal(state.suggested, "de");
  // The screen's own few words render in German; nothing is chosen or stored.
  assert.equal(state.lang, "de");
  assert.equal(readLang(), null);
});

test("a device speaking none of our three gets no hint and falls back to English", () => {
  const state = languageSetupState({ languages: ["ar-EG", "tr-TR"] });
  assert.equal(state.needsChoice, true);
  assert.equal(state.suggested, null);
  assert.equal(state.lang, "en");
});

test("damaged storage sends the child to the picker, with the device hint intact", () => {
  useStorage(storeHolding('{"v":1,"lang":"ar"}'));
  assert.deepEqual(languageSetupState({ languages: ["hi-IN"] }), {
    needsChoice: true,
    lang: "hi",
    suggested: "hi",
  });
});

test("the whole setup decision is synchronous, so there is no loading state", () => {
  // Not a formality: choosing a language must work with the radio off, and a
  // promise here would be a spinner on the first screen a frightened child
  // sees. If this ever becomes async, that promise is broken.
  const state = languageSetupState({ languages: ["en-GB"] });
  assert.equal(typeof state.needsChoice, "boolean");
  assert.ok(!(state instanceof Promise));
});
