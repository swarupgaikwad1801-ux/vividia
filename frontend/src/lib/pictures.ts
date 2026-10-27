/**
 * The picture incident builder: for a child who cannot write it down either.
 *
 * The child taps pictures for what happened, where, who and how often (since
 * 26 Oct this is the main way in, before any writing; see
 * screens/PictureQuestions.tsx). This module turns those taps into a timeline
 * entry. It has one rule that outranks everything else in it:
 *
 * ## The sentence is a fixed template, never model-written
 *
 * A model asked to "describe" the taps would add what the child did not say:
 * a motive, an injury, a time of day. The adult reading the card would have
 * no way to tell which words were the child's. So every sentence here is a
 * fixed, hand-written template per choice, in the child's language and in
 * German side by side, and the German is exactly what the adult reads. No
 * network, no model, no translation step: the German exists before the child
 * taps anything. (And the card marks these lines as chosen from pictures, so
 * a tapped tile never reads as a quote: lib/timeline.ts `source`.)
 *
 * ## What the output is
 *
 * An `Entry` (from `src/types/api.ts`), so a picture entry sits in the same
 * timeline as a written one:
 *
 * - `text_child` / `text_de`: one short sentence per thing that happened,
 *   then labelled lines for where, who and how often ("Where: Classroom").
 *   Labels rather than sentences, so the grammar is right for every answer.
 * - `place`: a place CODE (`classroom`, `schoolyard`, ...). These are the
 *   codes `backend/engine/report_text.py` already knows, so the report prints
 *   the place in the reader's language rather than quoting a word.
 *   "Somewhere else" is null: it names no place.
 * - `people`: who, in the child's language. The report quotes it as written,
 *   which is right: it is the child's description.
 *
 * Nothing about *why* or how badly: the pictures do not ask, so the sentence
 * does not say. A child who wants to add that can write.
 *
 * ## "I don't want to say" is never stored
 *
 * It is a tile on every question, and choosing it records nothing at all for
 * that question: no line, no "the child refused". It lives only in the screen.
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
 * one `HINDI_REVIEWED` flag cover it. Not yet read by a native speaker; the
 * German needs a native check too.
 */

import type { Entry } from "../types/api.ts";
import { HINDI_REVIEWED, STRINGS, type Lang, type StringKey } from "./strings.ts";

export { HINDI_REVIEWED, type Lang };

type Copy = Record<Lang, string>;

export interface Choice<C extends string = string> {
  /** Stable code: what the screen and the entry use. */
  code: C;
  label: Copy;
}

/** The two tiles every question ends with, in this order. */
export const OTHER = "other";
export const NO_SAY = "no_say";

// --- what ------------------------------------------------------------------

export type WhatCode = "pushed" | "hit" | "names" | "taken" | "left_out" | "online" | "threatened" | "other";

/** Fixed order: never shuffled, never "most common first". A test pins it. */
export const WHAT: readonly Choice<WhatCode>[] = [
  { code: "pushed", label: STRINGS["pic.what.pushed"] },
  { code: "hit", label: STRINGS["pic.what.hit"] },
  { code: "names", label: STRINGS["pic.what.names"] },
  { code: "taken", label: STRINGS["pic.what.taken"] },
  { code: "left_out", label: STRINGS["pic.what.left_out"] },
  { code: "online", label: STRINGS["pic.what.online"] },
  { code: "threatened", label: STRINGS["pic.what.threatened"] },
  { code: "other", label: STRINGS["q.other"] },
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
  left_out: { say: STRINGS["pic.say.left_out"], passive: STRINGS["pic.passive.left_out"] },
  online: { say: STRINGS["pic.say.online"], passive: STRINGS["pic.passive.online"] },
  threatened: { say: STRINGS["pic.say.threatened"], passive: STRINGS["pic.passive.threatened"] },
  other: { say: STRINGS["pic.say.other"], passive: STRINGS["pic.passive.other"] },
};

/**
 * Taps that get the same help route the writing screen shows for danger
 * (the 110/112 pop-up, and Need help glows), at once and without a model call.
 */
export const DANGER: readonly WhatCode[] = ["hit", "threatened"];

/**
 * Danger from the answers: "hit" or "threatened", or a follow-up that says
 * it is serious now: the body "hurts a lot", or the threat is for "today".
 */
export function needsHelpRoute(choices: Pick<Choices, "what" | "body" | "when">): boolean {
  return (
    choices.what.some((code) => (DANGER as readonly string[]).includes(code)) ||
    choices.body === "hurts_lot" ||
    choices.when === "today"
  );
}

// --- where -----------------------------------------------------------------

/**
 * Codes shared with backend/engine/report_text.py PLACES (a test pins this),
 * plus "elsewhere", which names no place and is stored as null.
 */
export type WhereCode = "classroom" | "schoolyard" | "toilets" | "way_to_school" | "online" | "elsewhere";

export const WHERE: readonly Choice<WhereCode>[] = [
  { code: "classroom", label: STRINGS["pic.where.classroom"] },
  { code: "schoolyard", label: STRINGS["pic.where.schoolyard"] },
  { code: "toilets", label: STRINGS["pic.where.toilets"] },
  { code: "way_to_school", label: STRINGS["pic.where.way_to_school"] },
  { code: "online", label: STRINGS["pic.where.online"] },
  { code: "elsewhere", label: STRINGS["pic.where.elsewhere"] },
];

// --- who -------------------------------------------------------------------

export type HowMany = "one" | "several";
export type WhoKind = "classmate" | "older" | "adult" | "other";

export const HOW_MANY: readonly Choice<HowMany>[] = [
  { code: "one", label: STRINGS["pic.howMany.one"] },
  { code: "several", label: STRINGS["pic.howMany.several"] },
];

export const WHO_KIND: readonly Choice<WhoKind>[] = [
  { code: "classmate", label: STRINGS["pic.kind.classmate"] },
  { code: "older", label: STRINGS["pic.kind.older"] },
  { code: "adult", label: STRINGS["pic.kind.adult"] },
  { code: "other", label: STRINGS["pic.kind.other"] },
];

/** The doer at the start of a sentence, by count. */
const DOER: Record<HowMany, Copy> = {
  one: STRINGS["pic.doer.one"],
  several: STRINGS["pic.doer.several"],
};

const HAT: Record<HowMany, string> = { one: "hat", several: "haben" };

// --- how often -------------------------------------------------------------

export type Often = "once" | "few" | "daily" | "other";

export const OFTEN: readonly Choice<Often>[] = [
  { code: "once", label: STRINGS["pic.often.once"] },
  { code: "few", label: STRINGS["pic.often.few"] },
  { code: "daily", label: STRINGS["pic.often.daily"] },
  { code: "other", label: STRINGS["q.other"] },
];

// --- follow-ups (asked only after the answer they follow: lib/questions.ts) ---

export type WhereOnline = "chat" | "game" | "social" | "messages" | "other";
export const WHERE_ONLINE: readonly Choice<WhereOnline>[] = [
  { code: "chat", label: STRINGS["pic.online.chat"] },
  { code: "game", label: STRINGS["pic.online.game"] },
  { code: "social", label: STRINGS["pic.online.social"] },
  { code: "messages", label: STRINGS["pic.online.messages"] },
  { code: "other", label: STRINGS["q.other"] },
];

export type Taken = "lunch" | "money" | "phone" | "school_things" | "other";
export const TAKEN: readonly Choice<Taken>[] = [
  { code: "lunch", label: STRINGS["pic.taken.lunch"] },
  { code: "money", label: STRINGS["pic.taken.money"] },
  { code: "phone", label: STRINGS["pic.taken.phone"] },
  { code: "school_things", label: STRINGS["pic.taken.school_things"] },
  { code: "other", label: STRINGS["q.other"] },
];

export type Body = "fine" | "hurts_bit" | "hurts_lot" | "other";
export const BODY: readonly Choice<Body>[] = [
  { code: "fine", label: STRINGS["pic.body.fine"] },
  { code: "hurts_bit", label: STRINGS["pic.body.hurts_bit"] },
  { code: "hurts_lot", label: STRINGS["pic.body.hurts_lot"] },
  { code: "other", label: STRINGS["q.other"] },
];

export type When = "today" | "tomorrow" | "later" | "dont_know" | "other";
export const WHEN: readonly Choice<When>[] = [
  { code: "today", label: STRINGS["pic.when.today"] },
  { code: "tomorrow", label: STRINGS["pic.when.tomorrow"] },
  { code: "later", label: STRINGS["pic.when.later"] },
  { code: "dont_know", label: STRINGS["pic.when.dont_know"] },
  { code: "other", label: STRINGS["q.other"] },
];

export type AdultWhere = "school" | "home" | "elsewhere";
export const ADULT_WHERE: readonly Choice<AdultWhere>[] = [
  { code: "school", label: STRINGS["pic.adult.school"] },
  { code: "home", label: STRINGS["pic.adult.home"] },
  { code: "elsewhere", label: STRINGS["pic.adult.elsewhere"] },
];

// --- building the entry ----------------------------------------------------

export interface Choices {
  /** Shown in the order the child tapped them. May be empty. */
  what: WhatCode[];
  where?: WhereCode | null;
  howMany?: HowMany | null;
  kind?: WhoKind | null;
  often?: Often | null;
  whereOnline?: WhereOnline | null;
  taken?: Taken | null;
  body?: Body | null;
  when?: When | null;
  adultWhere?: AdultWhere | null;
}

export const NO_CHOICES: Choices = { what: [], where: null, howMany: null, kind: null, often: null };

function pick(lang: string): Lang {
  return lang === "de" || lang === "hi" ? lang : "en";
}

function label<C extends string>(list: readonly Choice<C>[], code: C, lang: Lang): string {
  // Soft hyphens (­) are line-break hints for a narrow tile; the card's
  // text goes to an adult and to the report, so it never carries them.
  return (list.find((choice) => choice.code === code)?.label[lang] ?? code).replace(/­/g, "");
}

function line(key: StringKey, x: string, lang: Lang): string {
  return STRINGS[key][lang].replace("{x}", x);
}

/**
 * The sentences for what happened: in the child's language, and in German.
 *
 * Duplicate taps collapse to one sentence. When the child has not said how
 * many, the sentence is passive and names no doer.
 */
export function sentenceFor(choices: Choices, lang: string): { text_child: string; text_de: string } {
  const child = pick(lang);
  const count = choices.howMany ?? null;
  const what = [...new Set(choices.what)].filter((code) => code in WHAT_SENTENCE);

  const render = (into: Lang) =>
    what
      .map((code) =>
        count && code !== "other"
          ? WHAT_SENTENCE[code].say[into].replace("{S}", DOER[count][into]).replace("{hat}", HAT[count])
          : WHAT_SENTENCE[code].passive[into],
      )
      .join(" ");

  return { text_child: render(child), text_de: render("de") };
}

/** Who, in one language, e.g. "One person, Older than me". Null if nothing was tapped. */
function whoIn(choices: Choices, lang: Lang): string | null {
  const parts = [
    choices.howMany ? label(HOW_MANY, choices.howMany, lang) : null,
    choices.kind ? label(WHO_KIND, choices.kind, lang) : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : null;
}

/** Who, in the child's language, as the report will quote it. Null if nothing was tapped. */
export function peopleFor(choices: Choices, lang: string): string | null {
  return whoIn(choices, pick(lang));
}

/**
 * Labelled lines for where, who and how often, in one language. "Somewhere
 * else" for how often says nothing an adult can use, so it adds no line.
 */
export function linesFor(choices: Choices, lang: string): string[] {
  const into = pick(lang);
  const out: string[] = [];
  // A follow-up answer of "Something else" adds no line: it tells an adult
  // nothing they could act on, and no line is better than a vague one.
  const add = <C extends string>(key: StringKey, list: readonly Choice<C>[], code: C | null | undefined) => {
    if (code && code !== "other") out.push(line(key, label(list, code, into), into));
  };
  add("pic.line.taken", TAKEN, choices.taken);
  add("pic.line.body", BODY, choices.body);
  add("pic.line.when", WHEN, choices.when);
  add("pic.line.whereOnline", WHERE_ONLINE, choices.whereOnline);
  if (choices.where) out.push(line("pic.line.where", label(WHERE, choices.where, into), into));
  const who = whoIn(choices, into);
  if (who) out.push(line("pic.line.who", who, into));
  add("pic.line.adult", ADULT_WHERE, choices.adultWhere);
  add("pic.line.often", OFTEN, choices.often);
  return out;
}

/** True when the taps say anything at all worth saving. */
export function hasAnswers(choices: Choices): boolean {
  return choices.what.length > 0 || linesFor(choices, "en").length > 0;
}

/**
 * A timeline entry from the child's taps: the sentences, then the lines, in
 * the child's language and in German. The child approves it before it is
 * saved; this only fills it in.
 */
export function entryFor(choices: Choices, lang: string, date: string, mood: string): Entry {
  const { text_child, text_de } = sentenceFor(choices, lang);
  const join = (sentences: string, lines: string[]) => [sentences, ...lines].filter(Boolean).join("\n");
  return {
    date,
    mood,
    text_child: join(text_child, linesFor(choices, lang)),
    text_de: join(text_de, linesFor(choices, "de")),
    place: choices.where && choices.where !== "elsewhere" ? choices.where : null,
    people: peopleFor(choices, lang),
  };
}

// --- what the screens hold while the child answers --------------------------

/**
 * The raw taps per question, including "no_say", kept by the app so Back
 * returns to each question exactly as the child left it. Nothing is
 * pre-selected: every list starts empty.
 */
export interface Picks {
  what: string[];
  where: string[];
  howMany: string[];
  kind: string[];
  often: string[];
  feel: string[];
  // Follow-ups (lib/questions.ts decides which are asked).
  whereOnline: string[];
  taken: string[];
  body: string[];
  when: string[];
  adultWhere: string[];
  /** "Something else" in the child's own words: [text], or [] if none. */
  own: string[];
}

export const NO_PICKS: Picks = {
  what: [],
  where: [],
  howMany: [],
  kind: [],
  often: [],
  feel: [],
  whereOnline: [],
  taken: [],
  body: [],
  when: [],
  adultWhere: [],
  own: [],
};

/**
 * One tap on a tile. "I don't want to say" stands alone: tapping it clears
 * the other answers, and tapping an answer clears it. Tapping a chosen tile
 * again un-chooses it.
 */
export function toggle(current: readonly string[], code: string, multi: boolean): string[] {
  if (current.includes(code)) return current.filter((c) => c !== code);
  if (code === NO_SAY) return [NO_SAY];
  const rest = current.filter((c) => c !== NO_SAY);
  return multi ? [...rest, code] : [code];
}

function one<C extends string>(list: readonly Choice<C>[], picked: readonly string[]): C | null {
  const code = picked.find((c) => list.some((choice) => choice.code === c));
  return (code as C | undefined) ?? null;
}

/**
 * The answers worth keeping: "no_say" and anything unknown drop out here.
 *
 * `asked` is the questions actually asked this time (lib/questions.ts
 * `answersFor` passes it): an answer to a question the flow no longer asks,
 * because the child went Back and changed an earlier answer, is dropped
 * rather than left on the card. Omitted, every answer counts.
 */
export function choicesFrom(picks: Picks, asked?: ReadonlySet<keyof Picks>): Choices {
  const use = (key: keyof Picks): string[] => (!asked || asked.has(key) ? picks[key] : []);
  return {
    what: use("what").filter((c): c is WhatCode => WHAT.some((choice) => choice.code === c)),
    where: one(WHERE, use("where")),
    howMany: one(HOW_MANY, use("howMany")),
    kind: one(WHO_KIND, use("kind")),
    often: one(OFTEN, use("often")),
    whereOnline: one(WHERE_ONLINE, use("whereOnline")),
    taken: one(TAKEN, use("taken")),
    body: one(BODY, use("body")),
    when: one(WHEN, use("when")),
    adultWhere: one(ADULT_WHERE, use("adultWhere")),
  };
}

/**
 * Where the handoff screen should start, from the picture answer: the school
 * places mean school, online means online. Anything else asks again there,
 * because "at home" changes who is suggested and the pictures do not ask it.
 */
export function handoffWhereFor(
  where: WhereCode | null | undefined,
  adultWhere?: AdultWhere | null,
  online?: boolean,
): "school" | "home" | "online" | null {
  // An adult from home means the handoff must not suggest family: start it
  // at "home", which removes family from the list (HandoffSuggestions.ts).
  if (adultWhere === "home") return "home";
  if (adultWhere === "school") return "school";
  if (where === "online" || online) return "online";
  if (where === "classroom" || where === "schoolyard" || where === "toilets" || where === "way_to_school") return "school";
  return null;
}
