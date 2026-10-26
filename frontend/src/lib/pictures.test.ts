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
  NO_PICKS,
  NO_SAY,
  OFTEN,
  choicesFrom,
  toggle,
  WHAT,
  WHERE,
  WHO_KIND,
  entryFor,
  handoffWhereFor,
  hasAnswers,
  linesFor,
  needsHelpRoute,
  peopleFor,
  sentenceFor,
  type Lang,
} from "./pictures.ts";
import { STRINGS } from "./strings.ts";

const LANGS: Lang[] = ["en", "de", "hi"];

// --- the sentences ---------------------------------------------------------

test("one tap gives one sentence, in the child's language and in German", () => {
  assert.deepEqual(sentenceFor({ what: ["pushed"], howMany: "one" }, "en"), {
    text_child: "Someone pushed me.",
    text_de: "Jemand hat mich geschubst.",
  });
});

test("no count tapped means no doer and no count in the sentence", () => {
  // German "Jemand hat" says one person; the child never said that.
  assert.deepEqual(sentenceFor({ what: ["pushed"] }, "en"), {
    text_child: "I was pushed.",
    text_de: "Ich wurde geschubst.",
  });
  assert.equal(sentenceFor({ what: ["taken"], howMany: null }, "hi").text_child, "मेरी चीज़ें ले ली गईं।");
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
  const { text_child } = sentenceFor({ what: ["names", "pushed", "names"], howMany: "one" }, "en");
  assert.equal(text_child, "Someone called me names. Someone pushed me.");
});

test("'something else' never invents a doer, even when a count was tapped", () => {
  assert.deepEqual(sentenceFor({ what: ["other"], howMany: "several" }, "en"), {
    text_child: "Something else happened.",
    text_de: "Etwas anderes ist passiert.",
  });
});

test("every 'what' has a sentence in every language, with nothing left unfilled", () => {
  for (const choice of WHAT) {
    for (const lang of LANGS) {
      for (const howMany of ["one", "several", null] as const) {
        const { text_child, text_de } = sentenceFor({ what: [choice.code], howMany }, lang);
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
  assert.equal(hasAnswers({ what: [] }), false);
  assert.equal(hasAnswers({ what: [], often: "daily" }), true);
});

test("an unknown language falls back to English for the child, German stays German", () => {
  assert.deepEqual(sentenceFor({ what: ["left_out"] }, "uk"), {
    text_child: "I was left out.",
    text_de: "Ich wurde ausgeschlossen.",
  });
});

test("the sentence never says he or she, because a tap does not tell us", () => {
  for (const choice of WHAT) {
    const { text_child, text_de } = sentenceFor({ what: [choice.code], howMany: "one" }, "en");
    assert.doesNotMatch(text_child, /\b(he|she|him|her)\b/i);
    assert.doesNotMatch(text_de, /\b(er|sie|ihn)\b/);
  }
});

// --- who, where, how often -------------------------------------------------

test("who is written in the child's language, for the report to quote", () => {
  assert.equal(peopleFor({ what: ["hit"], howMany: "several", kind: "older" }, "en"), "A group, Older than me");
  assert.equal(peopleFor({ what: ["hit"], howMany: "one", kind: "classmate" }, "hi"), "एक व्यक्ति, मेरी क्लास से");
  assert.equal(peopleFor({ what: ["hit"] }, "en"), null);
});

test("where, who and how often become labelled lines, in each language", () => {
  const choices = { what: [], where: "schoolyard", howMany: "one", kind: "adult", often: "daily" } as const;
  assert.deepEqual(linesFor({ ...choices, what: [] }, "en"), [
    "Where: Schoolyard",
    "Who: One person, An adult",
    "How often: Almost every day",
  ]);
  assert.deepEqual(linesFor({ ...choices, what: [] }, "de"), [
    "Wo: Schulhof",
    "Wer: Eine Person, Eine erwachsene Person",
    "Wie oft: Fast jeden Tag",
  ]);
});

test("'something else' for how often adds no line: it tells an adult nothing", () => {
  assert.deepEqual(linesFor({ what: [], often: "other" }, "en"), []);
});

test("nothing about the child is gendered in Hindi", () => {
  const all = [...WHAT, ...WHERE, ...HOW_MANY, ...WHO_KIND, ...OFTEN].map((choice) => choice.label.hi).join(" ");
  for (const gendered of ["अकेला", "अकेली", "बड़ा", "बड़ी", "छोटा", "छोटी"]) {
    assert.ok(!all.includes(gendered), `gendered word ${gendered} in the Hindi labels`);
  }
});

test("every place code is one the report already knows, so it renders in the reader's language", () => {
  const reportText = readFileSync(new URL("../../../backend/engine/report_text.py", import.meta.url), "utf-8");
  for (const place of WHERE.filter((p) => p.code !== "elsewhere")) {
    assert.match(reportText, new RegExp(`"${place.code}"\\s*:`), `report_text.py has no ${place.code}`);
  }
});

// --- the entry ---------------------------------------------------------------

test("the entry has the exact Entry shape: sentences first, then the lines", () => {
  const entry = entryFor({ what: ["taken"], where: "classroom", howMany: "several", kind: "older" }, "en", "2026-10-21", "scared");
  assert.deepEqual(entry, {
    date: "2026-10-21",
    mood: "scared",
    text_child: "Several people took my things.\nWhere: Classroom\nWho: A group, Older than me",
    text_de: "Mehrere haben mir Sachen weggenommen.\nWo: Klassenzimmer\nWer: Eine Gruppe, Älter als ich",
    place: "classroom",
    people: "A group, Older than me",
  });
});

test("an untapped place or who is null, not an empty string; 'somewhere else' is null too", () => {
  const entry = entryFor({ what: ["names"] }, "en", "2026-10-21", "sad");
  assert.equal(entry.place, null);
  assert.equal(entry.people, null);
  assert.equal(entryFor({ what: ["names"], where: "elsewhere" }, "en", "2026-10-21", "").place, null);
});

test("an entry with no 'what' still carries the other answers, with no empty first line", () => {
  const entry = entryFor({ what: [], often: "few" }, "en", "2026-10-21", "");
  assert.equal(entry.text_child, "How often: A few times");
});

// --- the psychology rules, pinned --------------------------------------------

test("tile order is fixed: the order a child sees never changes", () => {
  assert.deepEqual(
    WHAT.map((c) => c.code),
    ["pushed", "hit", "names", "taken", "left_out", "online", "threatened", "other"],
  );
  assert.deepEqual(WHERE.map((c) => c.code), ["classroom", "schoolyard", "toilets", "way_to_school", "online", "elsewhere"]);
  assert.deepEqual(OFTEN.map((c) => c.code), ["once", "few", "daily", "other"]);
});

test("'something else' is the last answer tile on every multi-answer list", () => {
  // "I don't want to say" is added by the screen after it, on every question.
  assert.equal(WHAT.at(-1)?.label, STRINGS["q.other"]);
  assert.equal(OFTEN.at(-1)?.label, STRINGS["q.other"]);
  assert.equal(WHO_KIND.at(-1)?.code, "other");
  assert.equal(WHERE.at(-1)?.code, "elsewhere");
});

test("'hit', 'threatened', 'hurts a lot' or 'today' shows the help route; nothing else does", () => {
  assert.equal(needsHelpRoute({ what: ["hit"] }), true);
  assert.equal(needsHelpRoute({ what: ["names", "threatened"] }), true);
  assert.equal(needsHelpRoute({ what: ["pushed"], body: "hurts_lot" }), true);
  assert.equal(needsHelpRoute({ what: [], when: "today" }), true);
  assert.equal(needsHelpRoute({ what: ["names", "taken", "left_out", "online", "pushed", "other"] }), false);
  assert.equal(needsHelpRoute({ what: ["pushed"], body: "hurts_bit", when: "later" }), false);
});

test("the handoff starts at school or online when the picture said so, else it asks", () => {
  assert.equal(handoffWhereFor("toilets"), "school");
  assert.equal(handoffWhereFor("online"), "online");
  assert.equal(handoffWhereFor("elsewhere"), null);
  assert.equal(handoffWhereFor(null), null);
});

// --- taps ----------------------------------------------------------------------

test("nothing is pre-selected: every question starts empty", () => {
  for (const list of Object.values(NO_PICKS)) assert.deepEqual(list, []);
});

test("'I don't want to say' stands alone, and an answer replaces it", () => {
  assert.deepEqual(toggle(["hit", "names"], NO_SAY, true), [NO_SAY]);
  assert.deepEqual(toggle([NO_SAY], "names", true), ["names"]);
  assert.deepEqual(toggle(["names"], "names", true), [], "a second tap un-chooses");
  assert.deepEqual(toggle(["once"], "daily", false), ["daily"], "single answer questions keep one");
});

test("'I don't want to say' is never stored: it records nothing for that question", () => {
  const choices = choicesFrom({ ...NO_PICKS, what: [NO_SAY], where: [NO_SAY], often: ["daily"] });
  assert.deepEqual(choices.what, []);
  assert.equal(choices.where, null);
  assert.equal(choices.often, "daily");
  const entry = entryFor(choices, "en", "2026-10-21", "");
  assert.doesNotMatch(entry.text_child + entry.text_de, /want to say|nicht sagen/i);
});

// --- labels ------------------------------------------------------------------

test("every tile has a label in all three languages", () => {
  for (const choice of [...WHAT, ...WHERE, ...HOW_MANY, ...WHO_KIND, ...OFTEN]) {
    for (const lang of LANGS) assert.ok(choice.label[lang].trim(), `${choice.code} has no ${lang} label`);
  }
});

test("the Hindi stays marked unreviewed until a native speaker signs it", () => {
  assert.equal(HINDI_REVIEWED, false);
});
