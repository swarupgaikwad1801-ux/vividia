/**
 * Tests for the picture incident builder. Plain node:test, no DOM, no network.
 *
 *   node --test frontend/src/lib/pictures.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HINDI_REVIEWED,
  HOW_MANY,
  HOW_OLD,
  WHAT,
  WHERE,
  entryFor,
  peopleFor,
  sentenceFor,
  type Lang,
} from "./pictures.ts";

const LANGS: Lang[] = ["en", "de", "hi"];

// --- the sentences ---------------------------------------------------------

test("one tap gives one sentence, in the child's language and in German", () => {
  assert.deepEqual(sentenceFor({ what: ["pushed"] }, "en"), {
    text_child: "Someone pushed me.",
    text_de: "Jemand hat mich geschubst.",
  });
});

test("several people changes the German verb, not just the subject", () => {
  const { text_de } = sentenceFor({ what: ["hit"], howMany: "several" }, "en");
  assert.equal(text_de, "Mehrere haben mich geschlagen.");
});

test("Hindi uses the same verb for one person or several, because ने agrees with the object", () => {
  assert.equal(sentenceFor({ what: ["taken"], howMany: "one" }, "hi").text_child, "किसी ने मेरी चीज़ें ले लीं।");
  assert.equal(sentenceFor({ what: ["taken"], howMany: "several" }, "hi").text_child, "कुछ लोगों ने मेरी चीज़ें ले लीं।");
});

test("several taps give several sentences, in tap order, and a repeat counts once", () => {
  const { text_child } = sentenceFor({ what: ["names", "pushed", "names"] }, "en");
  assert.equal(text_child, "Someone called me names. Someone pushed me.");
});

test("every 'what' has a sentence in every language, with nothing left unfilled", () => {
  for (const choice of WHAT) {
    for (const lang of LANGS) {
      for (const howMany of ["one", "several"] as const) {
        const { text_child, text_de } = sentenceFor({ what: [choice.code as never], howMany }, lang);
        for (const text of [text_child, text_de]) {
          assert.ok(text.trim(), `${choice.code}/${lang} is empty`);
          assert.doesNotMatch(text, /[{}]/, `${choice.code}/${lang} kept a placeholder: ${text}`);
        }
      }
    }
  }
});

test("nothing tapped means nothing to save, not a sentence that says nothing", () => {
  assert.deepEqual(sentenceFor({ what: [] }, "en"), { text_child: "", text_de: "" });
});

test("an unknown language falls back to English for the child, German stays German", () => {
  assert.deepEqual(sentenceFor({ what: ["left_out"] }, "uk"), {
    text_child: "Someone left me out.",
    text_de: "Jemand hat mich ausgeschlossen.",
  });
});

test("the sentence never says he or she, because a tap does not tell us", () => {
  for (const choice of WHAT) {
    const { text_child, text_de } = sentenceFor({ what: [choice.code as never], howMany: "one" }, "en");
    assert.doesNotMatch(text_child, /\b(he|she|him|her)\b/i);
    assert.doesNotMatch(text_de, /\b(er|sie|ihn)\b/);
  }
});

// --- who and where -----------------------------------------------------------

test("who is written in the child's language, for the report to quote", () => {
  assert.equal(peopleFor({ what: ["hit"], howMany: "several", howOld: "older" }, "en"), "Several people, Older than me");
  assert.equal(peopleFor({ what: ["hit"], howMany: "one", howOld: "same_age" }, "hi"), "एक व्यक्ति, मेरी उम्र के");
  assert.equal(peopleFor({ what: ["hit"] }, "en"), null);
});

test("nothing about the child is gendered in Hindi", () => {
  const all = [...WHAT, ...WHERE, ...HOW_MANY, ...HOW_OLD].map((choice) => choice.label.hi).join(" ");
  for (const gendered of ["अकेला", "अकेली", "बड़ा", "बड़ी", "छोटा", "छोटी"]) {
    assert.ok(!all.includes(gendered), `gendered word ${gendered} in the Hindi labels`);
  }
});

test("every place code is one the report already knows, so it renders in the reader's language", () => {
  const reportText = readFileSync(
    new URL("../../../backend/engine/report_text.py", import.meta.url),
    "utf-8",
  );
  for (const place of WHERE) {
    assert.match(reportText, new RegExp(`"${place.code}"\\s*:`), `report_text.py has no ${place.code}`);
  }
});

// --- the entry ---------------------------------------------------------------

test("the entry has the exact Entry shape, ready for the same approval as a written one", () => {
  const entry = entryFor({ what: ["taken"], where: "corridor", howMany: "several", howOld: "older" }, "en", "2026-10-21", "scared");
  assert.deepEqual(entry, {
    date: "2026-10-21",
    mood: "scared",
    text_child: "Several people took my things.",
    text_de: "Mehrere haben mir Sachen weggenommen.",
    place: "corridor",
    people: "Several people, Older than me",
  });
});

test("an untapped place or who is null, not an empty string", () => {
  const entry = entryFor({ what: ["names"] }, "en", "2026-10-21", "sad");
  assert.equal(entry.place, null);
  assert.equal(entry.people, null);
});

// --- labels ------------------------------------------------------------------

test("every tile has an emoji and a label in all three languages", () => {
  for (const choice of [...WHAT, ...WHERE, ...HOW_MANY, ...HOW_OLD]) {
    assert.ok(choice.emoji, `${choice.code} has no picture`);
    for (const lang of LANGS) assert.ok(choice.label[lang].trim(), `${choice.code} has no ${lang} label`);
  }
});

test("six 'what' and six 'where' tiles, two rows of three on a 360px phone", () => {
  assert.equal(WHAT.length, 6);
  assert.equal(WHERE.length, 6);
});

test("the Hindi stays marked unreviewed until a native speaker signs it", () => {
  assert.equal(HINDI_REVIEWED, false);
});
