/**
 * The picture incident builder: for a child who cannot write it down either.
 *
 * The child taps pictures for what happened, where, and who. This module
 * turns those taps into a timeline entry. It has one rule that outranks
 * everything else in it:
 *
 * ## The sentence is a fixed template, never model-written
 *
 * A model asked to "describe" three taps would add what the child did not
 * say: a motive, an injury, a time of day. The adult reading the report would
 * have no way to tell which words were the child's. So every sentence here is
 * a fixed, hand-written template per choice, in the child's language and in
 * German side by side, and the German is exactly what the adult reads. No
 * network, no model, no translation step: the German exists before the child
 * taps anything.
 *
 * ## What the output is
 *
 * An `Entry` (from `src/types/api.ts`), so a picture entry sits in the same
 * timeline as a written one and goes through the same approval:
 *
 * - `text_child` / `text_de`: one short sentence per thing that happened.
 * - `place`: a place CODE (`classroom`, `corridor`, ...). These are the codes
 *   `backend/engine/report_text.py` already knows, so the report prints the
 *   place in the reader's language rather than quoting a word.
 * - `people`: who, in the child's language. The report quotes it as written,
 *   which is right: it is the child's description.
 *
 * Nothing about *why*, how badly, or how often: the pictures do not ask, so
 * the sentence does not say. A child who wants to add that can write.
 *
 * ## Grammar choices, so a reviewer knows what to check
 *
 * - The doer is "someone" or "several people", never "he" or "she", because a
 *   tap does not tell us, and Hindi verbs with ने agree with the object, so
 *   the same Hindi template works for one person or several.
 * - Nothing about the child is gendered: no अकेला/अकेली, no बड़ा/बड़ी.
 * - German uses Perfekt, as a child would say it aloud, with `hat`/`haben`
 *   chosen by the count.
 *
 * The Hindi and German have NOT been read by a native speaker.
 */

import type { Entry } from "../types/api.ts";

/** Languages we ship copy for. */
export type Lang = "en" | "de" | "hi";

export const HINDI_REVIEWED = false;

type Copy = Record<Lang, string>;

export interface Choice {
  /** Stable code, stored in nothing but used by screens and tests. */
  code: string;
  /** Shown on the tile. */
  emoji: string;
  label: Copy;
}

// --- what ------------------------------------------------------------------

export type WhatCode = "pushed" | "hit" | "names" | "taken" | "online" | "left_out";

export const WHAT: readonly Choice[] = [
  { code: "pushed", emoji: "🫸", label: { en: "Pushed me", de: "Geschubst", hi: "धक्का दिया" } },
  { code: "hit", emoji: "👊", label: { en: "Hit me", de: "Geschlagen", hi: "मारा" } },
  { code: "names", emoji: "🗯️", label: { en: "Called me names", de: "Beschimpft", hi: "बुरे नाम बुलाए" } },
  { code: "taken", emoji: "🎒", label: { en: "Took my things", de: "Sachen weggenommen", hi: "मेरी चीज़ें लीं" } },
  { code: "online", emoji: "📱", label: { en: "Online", de: "Online", hi: "ऑनलाइन" } },
  { code: "left_out", emoji: "🚪", label: { en: "Left me out", de: "Ausgeschlossen", hi: "शामिल नहीं किया" } },
];

/**
 * One sentence per thing that happened. `{S}` is the doer; German also has
 * `{hat}`, which becomes "hat" or "haben".
 */
const WHAT_SENTENCE: Record<WhatCode, Copy> = {
  pushed: { en: "{S} pushed me.", de: "{S} {hat} mich geschubst.", hi: "{S} ने मुझे धक्का दिया।" },
  hit: { en: "{S} hit me.", de: "{S} {hat} mich geschlagen.", hi: "{S} ने मुझे मारा।" },
  names: { en: "{S} called me names.", de: "{S} {hat} mich beschimpft.", hi: "{S} ने मुझे बुरे नामों से बुलाया।" },
  taken: { en: "{S} took my things.", de: "{S} {hat} mir Sachen weggenommen.", hi: "{S} ने मेरी चीज़ें ले लीं।" },
  online: {
    en: "{S} wrote mean things about me online.",
    de: "{S} {hat} online gemeine Dinge über mich geschrieben.",
    hi: "{S} ने ऑनलाइन मेरे बारे में बुरी बातें लिखीं।",
  },
  left_out: { en: "{S} left me out.", de: "{S} {hat} mich ausgeschlossen.", hi: "{S} ने मुझे शामिल नहीं किया।" },
};

// --- where -----------------------------------------------------------------

/** Codes shared with backend/engine/report_text.py PLACES. A test pins this. */
export type WhereCode = "classroom" | "corridor" | "schoolyard" | "toilets" | "online" | "way_to_school";

export const WHERE: readonly Choice[] = [
  { code: "classroom", emoji: "🏫", label: { en: "Classroom", de: "Klassenzimmer", hi: "क्लास" } },
  { code: "corridor", emoji: "🚶", label: { en: "Corridor", de: "Flur", hi: "गलियारा" } },
  { code: "schoolyard", emoji: "⛹️", label: { en: "Schoolyard", de: "Schulhof", hi: "स्कूल का मैदान" } },
  { code: "toilets", emoji: "🚻", label: { en: "Toilets", de: "Toiletten", hi: "टॉयलेट" } },
  { code: "online", emoji: "💻", label: { en: "Online", de: "Online", hi: "ऑनलाइन" } },
  { code: "way_to_school", emoji: "🛣️", label: { en: "Way to school", de: "Schulweg", hi: "स्कूल का रास्ता" } },
];

// --- who -------------------------------------------------------------------

export type HowMany = "one" | "several";
export type HowOld = "older" | "same_age";

export const HOW_MANY: readonly Choice[] = [
  { code: "one", emoji: "🧍", label: { en: "One person", de: "Eine Person", hi: "एक व्यक्ति" } },
  { code: "several", emoji: "👥", label: { en: "Several people", de: "Mehrere", hi: "कई लोग" } },
];

export const HOW_OLD: readonly Choice[] = [
  { code: "older", emoji: "⬆️", label: { en: "Older than me", de: "Älter als ich", hi: "मुझसे उम्र में बड़े" } },
  { code: "same_age", emoji: "↔️", label: { en: "My age", de: "So alt wie ich", hi: "मेरी उम्र के" } },
];

/** The doer at the start of a sentence, by count. */
const DOER: Record<HowMany, Copy> = {
  one: { en: "Someone", de: "Jemand", hi: "किसी" },
  several: { en: "Several people", de: "Mehrere", hi: "कुछ लोगों" },
};

const HAT: Record<HowMany, string> = { one: "hat", several: "haben" };

// --- building the entry ----------------------------------------------------

export interface Choices {
  /** At least one; shown in the order the child tapped them. */
  what: WhatCode[];
  where?: WhereCode | null;
  howMany?: HowMany | null;
  howOld?: HowOld | null;
}

function pick(lang: string): Lang {
  return lang === "de" || lang === "hi" ? lang : "en";
}

function label(list: readonly Choice[], code: string, lang: Lang): string {
  return list.find((choice) => choice.code === code)?.label[lang] ?? code;
}

/**
 * The sentences for the child's taps: in their language, and in German.
 *
 * Duplicate taps collapse to one sentence. An empty `what` gives empty
 * strings, so a screen can keep the "save" button disabled until the child
 * has picked something rather than saving an entry that says nothing.
 * "Someone" is the doer when the child has not said how many.
 */
export function sentenceFor(choices: Choices, lang: string): { text_child: string; text_de: string } {
  const child = pick(lang);
  const count: HowMany = choices.howMany ?? "one";
  const what = [...new Set(choices.what)].filter((code) => code in WHAT_SENTENCE);

  const render = (into: Lang) =>
    what
      .map((code) =>
        WHAT_SENTENCE[code][into].replace("{S}", DOER[count][into]).replace("{hat}", HAT[count]),
      )
      .join(" ");

  return { text_child: render(child), text_de: render("de") };
}

/** Who, in the child's language, as the report will quote it. Null if nothing was tapped. */
export function peopleFor(choices: Choices, lang: string): string | null {
  const child = pick(lang);
  const parts = [
    choices.howMany ? label(HOW_MANY, choices.howMany, child) : null,
    choices.howOld ? label(HOW_OLD, choices.howOld, child) : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : null;
}

/**
 * A timeline entry from the child's taps. The child still approves it on the
 * same screen as a written entry; this only fills it in.
 */
export function entryFor(choices: Choices, lang: string, date: string, mood: string): Entry {
  return {
    date,
    mood,
    ...sentenceFor(choices, lang),
    place: choices.where ?? null,
    people: peopleFor(choices, lang),
  };
}
