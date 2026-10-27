/**
 * "Clear this chat" on the listening screen (Neel, 27 Oct).
 *
 *   cd frontend
 *   node --import tsx --test src/screens/Listen.clear.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Listen from "./Listen.tsx";
import { LANGS, STRINGS, type StringKey } from "../lib/strings.ts";
import type { Turn } from "../lib/listening.ts";

const noop = () => {};
const SOURCE = readFileSync(new URL("./Listen.tsx", import.meta.url), "utf-8");
const html = (turns: Turn[], draft = "", lang = "en") =>
  renderToStaticMarkup(
    createElement(Listen, {
      lang,
      turns,
      onTurnsChange: noop,
      draft,
      onDraftChange: noop,
      onMakeCard: noop,
      onHome: noop,
      onNeedHelp: noop,
    }),
  );
const clearLabel = (lang: string) => STRINGS["heard.clear"][lang as "en"];

test("an empty chat offers nothing to clear", () => {
  assert.ok(!html([]).includes(clearLabel("en")));
});

test("once anything is written, in the chat or the box, it can be cleared, in every language", () => {
  for (const lang of LANGS) {
    assert.ok(html([{ text: "They took my bag.", kind: "taken" }], "", lang).includes(clearLabel(lang)), lang);
  }
  assert.ok(html([], "half a sentence").includes(clearLabel("en")), "an unsent message counts");
});

test("clearing is never one tap: the first tap only asks", () => {
  const button = SOURCE.match(/onClick=\{\(\) => setConfirmClear\(true\)\}[\s\S]*?heard\.clear"/);
  assert.ok(button, "the Clear button only opens the question");
  assert.match(SOURCE, /onClick=\{clearChat\}[\s\S]*?heard\.clearYes/);
  assert.match(SOURCE, /onClick=\{\(\) => setConfirmClear\(false\)\}[\s\S]*?heard\.clearNo/);
});

test("clearing empties the chat and the box, and drops an answer still on its way", () => {
  const body = SOURCE.match(/function clearChat\(\) \{([\s\S]*?)\n {2}\}/)?.[1] ?? "";
  assert.match(body, /runRef\.current \+= 1/, "a late answer must not land in the cleared chat");
  assert.match(body, /onTurnsChange\(\[\]\)/);
  assert.match(body, /onDraftChange\(""\)/);
  assert.doesNotMatch(body, /setUrgentSeen/, "the Need help glow stays");
});

test("the wording keeps the rules: no 'I', no Devanagari, and never claims more than it does", () => {
  const keys: StringKey[] = ["heard.clear", "heard.clearAsk", "heard.clearYes", "heard.clearNo", "heard.cleared"];
  for (const key of keys) {
    for (const lang of LANGS) {
      assert.ok(STRINGS[key][lang].trim(), `${key}.${lang}`);
      assert.doesNotMatch(STRINGS[key][lang], /[ऀ-ॿ]/, `${key}.${lang}: Hinglish only`);
    }
    assert.doesNotMatch(STRINGS[key].en, /\bI\b|\bme\b/, key);
    // It clears this screen. It does not erase anything anywhere else.
    assert.doesNotMatch(STRINGS[key].en, /forever|everywhere|server|history|device/i, key);
  }
});
