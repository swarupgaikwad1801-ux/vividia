/**
 * The 🌐 button on the check-in: the child can change language at any time,
 * and nothing they have saved changes with it (Neel, 26 Oct).
 *
 *   node --import tsx --test src/components/LanguageButton.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import LanguageButton from "./LanguageButton.tsx";
import LanguageSetup from "../screens/LanguageSetup.tsx";
import CheckIn from "../screens/CheckIn.tsx";
import { LANGS, STRINGS } from "../lib/strings.ts";
import { HOME, afterLanguage, current, go, start } from "../lib/nav.ts";
import { readLang, saveLang, useStorage as useLangStorage } from "../lib-lang/langStore.ts";
import { addEntry, listEntries, useStorage as useTimelineStorage } from "../lib/timeline.ts";

const noop = () => {};

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

test("the button says what it does in every language, and shows the language's own name", () => {
  const names = { en: "English", de: "Deutsch", hi: "हिन्दी" } as const;
  for (const lang of LANGS) {
    const markup = renderToStaticMarkup(createElement(LanguageButton, { lang, onOpen: noop }));
    assert.ok(markup.includes(`aria-label="${STRINGS["lang.change"][lang]}: ${names[lang]}"`), lang);
    assert.ok(markup.includes(`>${names[lang]}</span>`), `${lang}: visible name missing`);
    assert.match(markup, /min-h-tap/, "tap target under 44px");
  }
});

test("opened from the check-in, the picker marks the language in use and suggests nothing", () => {
  const markup = renderToStaticMarkup(createElement(LanguageSetup, { lang: "de", suggested: "hi", onChoose: noop, changing: true }));
  assert.ok(markup.includes(STRINGS["lang.change"].de));
  assert.equal((markup.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(markup, /aria-pressed="true"[^>]*lang="de"/);
});

test("first run is unchanged: nothing chosen, the app name as the heading", () => {
  const markup = renderToStaticMarkup(createElement(LanguageSetup, { lang: "en", suggested: "hi", onChoose: noop }));
  assert.ok(markup.includes(STRINGS["app.name"].en));
  assert.ok(!markup.includes('aria-pressed="true"'));
});

test("choosing returns to the check-in, and on first run goes there", () => {
  const changed = afterLanguage(go(start(HOME), "language"));
  assert.deepEqual(changed, [HOME]);
  assert.equal(current(afterLanguage(start("language"))), HOME);
});

test("from the check-in, change to Hindi: the words switch and saved entries are untouched", () => {
  useLangStorage(memoryStore());
  useTimelineStorage(memoryStore());
  try {
    saveLang("en");
    addEntry({ date: "2026-10-26", mood: "sad", text_child: "my own words", text_de: "meine eigenen Worte" }, "words");
    const before = JSON.stringify(listEntries());

    saveLang("hi");

    assert.equal(readLang(), "hi");
    assert.equal(JSON.stringify(listEntries()), before);
    const markup = renderToStaticMarkup(createElement(CheckIn, { lang: readLang() ?? "en", onChoose: noop }));
    assert.ok(markup.includes(STRINGS["checkin.title"].hi));
    assert.ok(!markup.includes(STRINGS["checkin.title"].en));
  } finally {
    useLangStorage(null);
    useTimelineStorage(null);
  }
});
