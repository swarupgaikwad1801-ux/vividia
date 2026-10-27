/**
 * What the listening screen says back, decided in code from fixed sentences.
 *
 * The model's whole part is one word per message, the `kind`
 * (engine/listen.py). Everything the child reads comes from `heard.*` in
 * strings.ts and is picked here, so this file is the complete list of what
 * the app can ever answer - which is the point. CLAUDE.md: no AI friend.
 */

import type { ListenKind } from "../types/api";
import type { StringKey } from "./strings";

/**
 * The most the card's text can hold: TranslateRequest.text is max 2000 in
 * app/schemas.py. The writing box shrinks to what is left rather than letting
 * the child write words the card would then refuse.
 */
export const MAX_CARD_CHARS = 2000;

/** One thing the child wrote down, and what we understood it to be about. */
export interface Turn {
  text: string;
  /** null while it is being read, or if reading it failed. */
  kind: ListenKind | null;
  /** The safety check found danger or self-harm in this message. */
  urgent?: boolean;
}

export interface Reply {
  /** Shown together, in one bubble. */
  lines: StringKey[];
  /** The gentle question after it, in its own bubble; null when we must not ask. */
  ask: StringKey | null;
}

/**
 * Asked one after another, one per answer. Each is optional: the child can
 * answer it, write about something else, or make the card. The last one is
 * not a question, so the app stops asking rather than interrogating.
 */
export const ASKS: readonly StringKey[] = [
  "heard.ask.more",
  "heard.ask.where",
  "heard.ask.when",
  "heard.ask.who",
  "heard.ask.feel",
  "heard.ask.else",
  "heard.ask.done",
];

const KIND_LINE: Record<ListenKind, StringKey> = {
  hurt: "heard.kind.hurt",
  names: "heard.kind.names",
  left_out: "heard.kind.left_out",
  taken: "heard.kind.taken",
  online: "heard.kind.online",
  threat: "heard.kind.threat",
  feeling: "heard.kind.feeling",
  good: "heard.kind.good",
  asking: "heard.kind.asking",
  other: "heard.kind.other",
};

/**
 * The reply to turn `index`, given what every turn so far was about.
 *
 * A kind's sentence is said once. Hearing "Words like that can really hurt"
 * three times in a row stops sounding like listening and starts sounding
 * like a machine, which is what it is - so on a repeat the app just thanks
 * the child and asks the next thing.
 */
export function replyFor(index: number, turns: readonly Turn[]): Reply {
  const thanks: StringKey = index === 0 ? "heard.thanks.first" : "heard.thanks.again";
  // A message the safety check flagged gets its own line and NO question.
  // Seen in the first render: "Sometimes I want to die" was answered "It
  // takes courage to write this. When did it happen?" The danger pop-up has
  // already opened by then; what is left in the conversation must point to
  // help and stop, not carry on asking.
  if (turns[index]?.urgent) return { lines: [thanks, "heard.urgent"], ask: null };
  const kind = turns[index]?.kind ?? "other";
  const before = new Set(turns.slice(0, index).map((turn) => turn.kind));
  const lines: StringKey[] = [thanks];
  if (!before.has(kind)) lines.push(KIND_LINE[kind]);
  return { lines, ask: ASKS[Math.min(index, ASKS.length - 1)] };
}

/**
 * Kinds that get a "Need help?" button inside our answer.
 *
 * Not the danger pop-up: that opens only when the safety check says danger
 * or self-harm NOW, because a crisis screen for "he hit me last week" teaches
 * a child the app over-reacts (safety.py, rule 3). Someone hurting or
 * threatening a child still deserves help one tap from the sentence that
 * said so, without an alarm. Swarup, 27 Oct: "there should be a pop up for
 * need help" when a child writes something like "hit me".
 */
export const HELP_NUDGE: ReadonlySet<ListenKind> = new Set(["hurt", "threat"]);

/**
 * Everything the child wrote, as one text for the card, oldest first.
 *
 * Their words exactly, each message on its own paragraph. The questions are
 * not included: the card carries what the child said, not what we asked.
 */
export function wordsForCard(turns: readonly Turn[]): string {
  return turns
    .map((turn) => turn.text.trim())
    .filter(Boolean)
    .join("\n\n");
}
