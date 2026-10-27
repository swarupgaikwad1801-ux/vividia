/**
 * Which picture questions to ask, given the answers so far.
 *
 * Neel, 26 Oct: "the questions should change according to the child's
 * answers". The tree is here as data and one pure function, not in JSX, so
 * every branch is a test (questions.test.ts). No model, no network: the
 * choice of the next question is a rule, the same for every child.
 *
 * ## The rules
 *
 * - "What happened?" decides the follow-ups, asked in the fixed tile order:
 *   - pushed or hit  -> "How does your body feel now?"  (once, for either)
 *   - things taken   -> "What was taken?"
 *   - online         -> "Where online?", which replaces the physical "Where?"
 *   - threatened     -> "When did they say it would happen?"
 *   - something else -> the child's own words; if they write something,
 *                       "Where?" and "Who?" are not asked
 *   - left out and called names have no follow-up.
 * - **At most two follow-ups**, the first two in tile order, so it never
 *   turns into an interview (Neel's complaint about the first version).
 *   Danger is not lost to the cap: "hit" and "threatened" already show the
 *   red 110 line on their own (lib/pictures.ts needsHelpRoute).
 * - **"I don't want to say" ends that topic**: no follow-up about it, and
 *   it is never asked again.
 * - **Who = an adult** -> one gentle question, "Where is this adult from?",
 *   then straight to the card with Need help kept prominent. Nothing more
 *   about the adult, and not how often or how it feels: an adult hurting a
 *   child is for an adult to act on, not for the child to describe.
 *   (Outside the two-follow-up cap: it routes, it does not dig.)
 *
 * The answers to a question that is no longer asked (the child went Back
 * and changed an earlier answer) are dropped from the card: `answersFor`.
 */

import { NO_SAY, choicesFrom, type Choices, type Picks } from "./pictures";
import type { Step } from "./nav";

/** A picture question is one of these steps. */
export type QuestionStep =
  | "picWhat"
  | "picBody"
  | "picTaken"
  | "picWhereOnline"
  | "picWhen"
  | "picOwn"
  | "picWhere"
  | "picWho"
  | "picAdultWhere"
  | "picOften"
  | "picFeel";

/** Which answer list each question fills in. */
export const ANSWER_OF: Record<QuestionStep, keyof Picks> = {
  picWhat: "what",
  picBody: "body",
  picTaken: "taken",
  picWhereOnline: "whereOnline",
  picWhen: "when",
  picOwn: "own",
  picWhere: "where",
  picWho: "howMany",
  picAdultWhere: "adultWhere",
  picOften: "often",
  picFeel: "feel",
};

export const MAX_FOLLOW_UPS = 2;

/** The follow-up for each "What happened?" answer, in the fixed tile order. */
const FOLLOW_UP: readonly { when: readonly string[]; ask: QuestionStep }[] = [
  { when: ["pushed", "hit"], ask: "picBody" },
  { when: ["taken"], ask: "picTaken" },
  { when: ["online"], ask: "picWhereOnline" },
  { when: ["threatened"], ask: "picWhen" },
  { when: ["other"], ask: "picOwn" },
];

/** The follow-ups for these "What happened?" taps: tile order, at most two. */
export function followUpsFor(what: readonly string[]): QuestionStep[] {
  if (what.includes(NO_SAY)) return [];
  return FOLLOW_UP.filter((rule) => rule.when.some((code) => what.includes(code)))
    .map((rule) => rule.ask)
    .slice(0, MAX_FOLLOW_UPS);
}

/** True when the child wrote something in their own words. */
export function wroteOwnWords(picks: Picks): boolean {
  return (picks.own[0] ?? "").trim().length > 0;
}

/** True when "Who?" was answered "an adult" (and not "I don't want to say"). */
export function adultRoute(picks: Picks): boolean {
  return picks.kind.includes("adult") && !picks.howMany.includes(NO_SAY);
}

/**
 * Every question to ask, in order, for the answers so far. Recomputed on
 * every tap, so an earlier answer changes what comes after it.
 */
export function questionsFor(picks: Picks): QuestionStep[] {
  const follow = followUpsFor(picks.what);
  const out: QuestionStep[] = ["picWhat", ...follow];

  const ownWritten = follow.includes("picOwn") && wroteOwnWords(picks);
  // Online already says where; own words already say where and who.
  if (!follow.includes("picWhereOnline") && !ownWritten) out.push("picWhere");
  if (!ownWritten) out.push("picWho");

  if (adultRoute(picks)) {
    out.push("picAdultWhere");
    return out; // straight to the card: nothing more about an adult
  }
  out.push("picOften", "picFeel");
  return out;
}

/** The question after this one, or "picReview" when there are no more. */
export function nextQuestion(current: QuestionStep, picks: Picks): QuestionStep | "picReview" {
  const list = questionsFor(picks);
  const at = list.indexOf(current);
  return at === -1 || at === list.length - 1 ? "picReview" : list[at + 1];
}

export function isQuestion(step: Step): step is QuestionStep {
  return step in ANSWER_OF;
}

/**
 * The answers to put on the card: only those whose question is still asked.
 * "Who?" fills two lists, how many and who they were.
 */
export function answersFor(picks: Picks): Choices {
  const asked = new Set<keyof Picks>(questionsFor(picks).map((q) => ANSWER_OF[q]));
  if (asked.has("howMany")) asked.add("kind");
  return choicesFrom(picks, asked);
}
