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
 * - **No count the child did not give.** If they skip "how many", the sentence
 *   is passive ("Ich wurde geschubst"), because German "Jemand hat" commits to
 *   one person where English "someone" stays vague.
 * - Nothing about the child is gendered: no अकेला/अकेली, no बड़ा/बड़ी.
 * - German uses Perfekt, as a child would say it aloud, with `hat`/`haben`
 *   chosen by the count.
 *
 * All the text lives in strings.ts (`pic.*`), so the one Hindi review and the
 * one `HINDI_REVIEWED` flag cover it. Not yet read by a native speaker.
 */

import type { Entry } from "../types/api.ts";
import { HINDI_REVIEWED, STRINGS, type Lang } from "./strings.ts";

export { HINDI_REVIEWED, type Lang };

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
  { code: "pushed", emoji: "🫸", label: STRINGS["pic.what.pushed"] },
  { code: "hit", emoji: "👊", label: STRINGS["pic.what.hit"] },
  { code: "names", emoji: "🗯️", label: STRINGS["pic.what.names"] },
  { code: "taken", emoji: "🎒", label: STRINGS["pic.what.taken"] },
  { code: "online", emoji: "📱", label: STRINGS["pic.what.online"] },
  { code: "left_out", emoji: "🚪", label: STRINGS["pic.what.left_out"] },
];

/**
 * One sentence per thing that happened. `say` has `{S}` for the doer, and
 * German `{hat}`, which becomes "hat" or "haben"; `passive` names no doer.
 */
const WHAT_SENTENCE: Record<WhatCode, { say: Copy; passive: Copy }> = {
  pushed: { say: STRINGS["pic.say.pushed"], passive: STRINGS["pic.passive.pushed"] },
  hit: { say: STRINGS["pic.say.hit"], passive: STRINGS["pic.passive.hit"] },
  names: { say: STRINGS["pic.say.names"], passive: STRINGS["pic.passive.names"] },
  taken: { say: STRINGS["pic.say.taken"], passive: STRINGS["pic.passive.taken"] },
  online: { say: STRINGS["pic.say.online"], passive: STRINGS["pic.passive.online"] },
  left_out: { say: STRINGS["pic.say.left_out"], passive: STRINGS["pic.passive.left_out"] },
};

// --- where -----------------------------------------------------------------

/** Codes shared with backend/engine/report_text.py PLACES. A test pins this. */
export type WhereCode = "classroom" | "corridor" | "schoolyard" | "toilets" | "online" | "way_to_school";

export const WHERE: readonly Choice[] = [
  { code: "classroom", emoji: "🏫", label: STRINGS["pic.where.classroom"] },
  { code: "corridor", emoji: "🚶", label: STRINGS["pic.where.corridor"] },
  { code: "schoolyard", emoji: "⛹️", label: STRINGS["pic.where.schoolyard"] },
  { code: "toilets", emoji: "🚻", label: STRINGS["pic.where.toilets"] },
  { code: "online", emoji: "💻", label: STRINGS["pic.where.online"] },
  { code: "way_to_school", emoji: "🛣️", label: STRINGS["pic.where.way_to_school"] },
];

// --- who -------------------------------------------------------------------

export type HowMany = "one" | "several";
export type HowOld = "older" | "same_age";

export const HOW_MANY: readonly Choice[] = [
  { code: "one", emoji: "🧍", label: STRINGS["pic.howMany.one"] },
  { code: "several", emoji: "👥", label: STRINGS["pic.howMany.several"] },
];

export const HOW_OLD: readonly Choice[] = [
  { code: "older", emoji: "⬆️", label: STRINGS["pic.howOld.older"] },
  { code: "same_age", emoji: "↔️", label: STRINGS["pic.howOld.same_age"] },
];

/** The doer at the start of a sentence, by count. */
const DOER: Record<HowMany, Copy> = {
  one: STRINGS["pic.doer.one"],
  several: STRINGS["pic.doer.several"],
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
 * When the child has not said how many, the sentence is passive and names
 * no doer.
 */
export function sentenceFor(choices: Choices, lang: string): { text_child: string; text_de: string } {
  const child = pick(lang);
  const count = choices.howMany ?? null;
  const what = [...new Set(choices.what)].filter((code) => code in WHAT_SENTENCE);

  const render = (into: Lang) =>
    what
      .map((code) =>
        count
          ? WHAT_SENTENCE[code].say[into].replace("{S}", DOER[count][into]).replace("{hat}", HAT[count])
          : WHAT_SENTENCE[code].passive[into],
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
