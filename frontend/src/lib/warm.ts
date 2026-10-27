/**
 * The one warm line the app says back, after the child has told it something.
 *
 * Neel, 27 Oct: the app should answer the child kindly, the way a good
 * listener would. Not an AI reply: CLAUDE.md rules out an AI friend, and a
 * model writing freely to a frightened 11-year-old is the riskiest thing this
 * app could do. So every line is written in advance, reviewed in strings.ts,
 * and chosen here by a rule, the same way questions.ts chooses the next
 * question. No model, no network, nothing about the child leaves the phone.
 *
 * ## The rules
 *
 * - **The face from the check-in** gets one line above "What happened?".
 *   Skipping the check-in gets none: there is nothing to answer. The good
 *   face gets none here either: it has its own screen first (GoodDay.tsx),
 *   so a child who had a good day is never asked what happened as if
 *   something must have.
 * - **"What happened?"** gets one line on the screen after it, chosen by the
 *   most serious tile tapped (`WHAT_ORDER`), so a child who taps "names" and
 *   "threatened" hears about the threat. Skipping, or "I don't want to say",
 *   gets "That's OK", because not saying is an answer too.
 * - **An adult** gets its own line on "Where is this adult from?": an adult
 *   treating a child this way is for adults to stop (questions.ts).
 *
 * ## What a line may say
 *
 * Thanks, comfort and "it is not your fault". Never whether the account is
 * true, never "you are safe now", never advice, never "I": the app is not a
 * person (strings.ts wording rules). One line per screen, so it never turns
 * into a conversation.
 */

import { NO_SAY } from "./pictures";
import type { StringKey } from "./strings";

// No line for "good": that face goes to its own screen first (GoodDay.tsx),
// which has already answered it by the time "What happened?" comes.
const MOOD_LINE: Readonly<Record<string, StringKey>> = {
  ok: "warm.mood.ok",
  sad: "warm.mood.sad",
  scared: "warm.mood.scared",
  angry: "warm.mood.angry",
  alone: "warm.mood.alone",
};

/** The line for the face the child tapped, or null for a skip or unknown code. */
export function moodLine(mood: string | null): StringKey | null {
  return (mood && MOOD_LINE[mood]) || null;
}

/** Most serious first: the line answers the worst thing the child tapped. */
const WHAT_ORDER: readonly { code: string; line: StringKey }[] = [
  { code: "threatened", line: "warm.what.threatened" },
  { code: "hit", line: "warm.what.hurt" },
  { code: "pushed", line: "warm.what.hurt" },
  { code: "taken", line: "warm.what.taken" },
  { code: "online", line: "warm.what.online" },
  { code: "names", line: "warm.what.names" },
  { code: "left_out", line: "warm.what.left_out" },
  { code: "other", line: "warm.what.other" },
];

/** The line for these "What happened?" taps. */
export function whatLine(what: readonly string[]): StringKey {
  if (what.includes(NO_SAY)) return "warm.what.noSay";
  return WHAT_ORDER.find((rule) => what.includes(rule.code))?.line ?? "warm.what.noSay";
}

export const ADULT_LINE: StringKey = "warm.adult";
