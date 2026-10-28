/**
 * What the listening screen says back.
 *
 * Mostly fixed sentences: the model names the `kind` of message and which
 * details it already gives (`told`, engine/listen.py), and this file picks a
 * reviewed line from `heard.*` in strings.ts and the next question. The one
 * exception is a message no kind fits ("other"): there the server may send a
 * short `reply` the model wrote, and only after it passed a code check and a
 * second model's check (Swarup, 27 Oct). Without one, the reviewed line for
 * "other" is shown, so the child always hears something. CLAUDE.md: no AI
 * friend - "we", never "I", and no promises.
 *
 * ## Fitting the answer to the message (Neel, 27 Oct)
 *
 * His screenshot: "Merse baat karo please" ("talk to me, please") was
 * answered "An adult you trust can help…" and then "When did it happen?",
 * and every answer opened with the same "Thank you. We are still listening."
 * So:
 *
 * - **The thanks is said once**, on the first message. After that the answer
 *   is the line for what the child just said, or, when that line was already
 *   said, a short acknowledgement that changes from one message to the next.
 * - **The next question is the first detail still missing**, not the next in
 *   a fixed list: a child who wrote "at school today" is not asked where and
 *   when. A threat asks *when* first, because its timing is what an adult
 *   most needs (CLAUDE.md, `chaaku-kal`). Each question is asked once.
 * - **No detail questions where they do not fit**: a child who asks to talk,
 *   asks what to do, says the day was good, or only says how they feel is not
 *   asked "Where did it happen?" about nothing.
 */

import type { ListenDetail, ListenKind } from "../types/api";
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
  /** Details this message already gives (where, when, who, feeling). */
  told?: readonly ListenDetail[];
  /** The safety check found danger or self-harm in this message. */
  urgent?: boolean;
  /** A checked, model-written answer for an "other" message, or null. */
  written?: string | null;
}

export interface Reply {
  /** Shown together, in one bubble. Never empty. */
  lines: StringKey[];
  /** A checked written answer, shown after `lines`, in place of the kind's line. */
  written?: string;
  /** The gentle question after it, in its own bubble; null when we must not ask. */
  ask: StringKey | null;
}

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
  talk: "heard.kind.talk",
  unclear: "heard.kind.unclear",
  other: "heard.kind.other",
};

/**
 * Said when the line for this kind was already said. Taken in turn, so two
 * answers in a row never open the same way.
 */
export const ACKS: readonly StringKey[] = ["heard.ack.more", "heard.ack.read", "heard.ack.here"];

/** The question for each missing detail. */
const DETAIL_ASK: Record<ListenDetail, StringKey> = {
  where: "heard.ask.where",
  when: "heard.ask.when",
  who: "heard.ask.who",
  feeling: "heard.ask.feel",
};

/** The detail each question asks for, the other way round. */
const ASK_DETAIL: ReadonlyMap<StringKey, ListenDetail> = new Map(
  (Object.entries(DETAIL_ASK) as [ListenDetail, StringKey][]).map(([detail, key]) => [key, detail]),
);

/** Which details to ask about, in order, for something that happened. */
function detailsFor(kind: ListenKind): ListenDetail[] {
  if (kind === "threat") return ["when", "where", "who", "feeling"];
  // "online" already says where; "Where did it happen?" would ask again.
  if (kind === "online") return ["when", "who", "feeling"];
  return ["where", "when", "who", "feeling"];
}

/** Kinds that are about something that happened, so details can be asked. */
const HAPPENED: ReadonlySet<ListenKind> = new Set([
  "hurt", "names", "left_out", "taken", "online", "threat", "other",
]);

/**
 * The reply to every turn up to `index`, in order. Each reply depends on the
 * ones before it (what was said, what was asked), so they are worked out
 * together rather than one at a time.
 */
function replies(index: number, turns: readonly Turn[]): Reply[] {
  const out: Reply[] = [];
  const saidKinds = new Set<ListenKind>();
  const told = new Set<ListenDetail>();
  const asked = new Set<StringKey>();
  // The detail the previous reply asked for, so an answer to it is thanked
  // as an answer (Swarup, 28 Oct: "I want it to think").
  let lastAsk: ListenDetail | null = null;
  // Messages that were words, not keys hit at random: the first of them is
  // thanked, even if an "unclear" one came before it.
  let real = 0;
  // The kind of the first message about something that happened: its details
  // are the ones still worth asking about after a "talk" or a feeling.
  let incident: ListenKind | null = null;
  let acks = 0;

  for (let i = 0; i <= index && i < turns.length; i += 1) {
    const turn = turns[i];
    const kind = turn.kind ?? "other";
    const answeredLastAsk = lastAsk !== null && (turn.told ?? []).includes(lastAsk);
    // Keys hit at random: say we did not understand, offer another way, and
    // ask nothing. Not "thank you for telling us" about nothing. It does not
    // count as something said, so a real message after it is answered fully.
    if (kind === "unclear") {
      out.push({ lines: ["heard.kind.unclear"], ask: null });
      lastAsk = null;
      continue;
    }
    for (const detail of turn.told ?? []) told.add(detail);
    if (incident === null && HAPPENED.has(kind)) incident = kind;
    const first = real === 0;
    real += 1;

    // A message the safety check flagged gets its own line and NO question.
    // Seen in the first render: "Sometimes I want to die" was answered "It
    // takes courage to write this. When did it happen?" The danger pop-up has
    // already opened; what is left in the conversation points to help and stops.
    if (turn.urgent) {
      out.push({ lines: first ? ["heard.thanks.first", "heard.urgent"] : ["heard.urgent"], ask: null });
      continue;
    }

    // Written for this message, so it is said even when an earlier message
    // was "other" too: it answers what they just wrote, not the kind.
    const written = kind === "other" ? turn.written?.trim() : "";
    const lines: StringKey[] = first ? ["heard.thanks.first"] : [];
    if (!written && kind === "other" && answeredLastAsk) {
      // A short answer to the question we just asked: thank them for the
      // answer, then go on to the next thing still missing.
      lines.push("heard.gotIt");
    } else if (!written) {
      if (!saidKinds.has(kind)) {
        lines.push(KIND_LINE[kind]);
      } else if (!first) {
        lines.push(ACKS[acks % ACKS.length]);
        acks += 1;
      }
    }
    saidKinds.add(kind);

    const ask = nextAsk(kind, incident, told, asked, first);
    if (ask) asked.add(ask);
    lastAsk = ask ? ASK_DETAIL.get(ask) ?? null : null;
    out.push(written ? { lines, written, ask } : { lines, ask });
  }
  return out;
}

function nextAsk(
  kind: ListenKind,
  incident: ListenKind | null,
  told: ReadonlySet<ListenDetail>,
  asked: ReadonlySet<StringKey>,
  first: boolean,
): StringKey | null {
  const once = (key: StringKey) => (asked.has(key) ? null : key);
  // They asked what to do, or the day was good: answered, nothing to ask.
  if (kind === "asking" || kind === "good") return null;
  // They want someone to talk to: an open door, never "Where did it happen?".
  if (kind === "talk") return once(incident ? "heard.ask.more" : "heard.ask.open");
  // Only a feeling so far: ask whether something happened, once.
  if (kind === "feeling" && incident === null) return once("heard.ask.what");
  // A first message no kind fits: what it is about is not known yet, so the
  // open question, not "Where did it happen?" about something unnamed.
  if (kind === "other" && first) return once("heard.ask.more");
  // Something happened: the first detail the child has not given yet.
  if (incident !== null) {
    for (const detail of detailsFor(incident)) {
      if (!told.has(detail) && !asked.has(DETAIL_ASK[detail])) return DETAIL_ASK[detail];
    }
  }
  // Everything is known, or nothing happened to ask about: the open
  // question once, then "anything else" once, then the closing line, then
  // nothing at all, so the app stops asking rather than interrogating.
  if (first) return once("heard.ask.more");
  return once("heard.ask.else") ?? once("heard.ask.done");
}

/** The reply to turn `index`, given everything the child wrote before it. */
/**
 * The detail the app asked for just before turn `index` was written, sent
 * with that message so a short answer is read as an answer. null for the
 * first message, or when the last question was not about a detail.
 */
export function askedBefore(index: number, turns: readonly Turn[]): ListenDetail | null {
  if (index <= 0) return null;
  const ask = replies(index - 1, turns)[index - 1]?.ask;
  return ask ? ASK_DETAIL.get(ask) ?? null : null;
}

export function replyFor(index: number, turns: readonly Turn[]): Reply {
  return replies(index, turns)[index] ?? { lines: ["heard.kind.other"], ask: null };
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
