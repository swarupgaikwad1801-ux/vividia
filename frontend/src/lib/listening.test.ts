/**
 * The listening screen's replies: chosen by code from fixed sentences.
 *
 * The model's only part is the `kind`. These pin that every kind has a
 * reviewed sentence in every language, that the app does not repeat itself,
 * that it stops asking, and that the card carries the child's words and
 * nothing of ours.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { ListenDetail, ListenKind } from "../types/api.ts";
import { ACKS, HELP_NUDGE, MAX_CARD_CHARS, replyFor, wordsForCard, type Turn } from "./listening.ts";
import { LANGS, STRINGS, t } from "./strings.ts";

const KINDS: ListenKind[] = [
  "hurt", "names", "left_out", "taken", "online", "threat", "feeling", "good", "asking", "talk",
  "thanks", "bye", "unsure", "not_now", "about_app", "smalltalk", "unclear", "other",
];

const turn = (kind: ListenKind, text = "x", told: ListenDetail[] = []): Turn => ({ text, kind, told });
/** Every question asked over a whole conversation, in order. */
const asks = (turns: Turn[]) => turns.map((_, i) => replyFor(i, turns).ask);

test("every kind has its own sentence, in every language", () => {
  const seen = new Set<string>();
  // Only something that happened, or a feeling, is thanked first (Swarup,
  // 28 Oct: "hi" and "ok" were answered "Thank you for telling us").
  const thanked = new Set(["hurt", "names", "left_out", "taken", "online", "threat", "feeling", "other"]);
  for (const kind of KINDS) {
    const { lines } = replyFor(0, [turn(kind)]);
    assert.equal(lines[0] === "heard.thanks.first", thanked.has(kind), `${kind}: thanks`);
    assert.equal(lines.length, thanked.has(kind) ? 2 : 1, `${kind} has no sentence of its own`);
    const own = lines[lines.length - 1];
    seen.add(own);
    for (const lang of LANGS) {
      assert.ok(STRINGS[own][lang].trim(), `${own} is empty in ${lang}`);
    }
  }
  assert.equal(seen.size, KINDS.length);
});

test("the thanks is said once; a new kind gets its own line, a repeat gets a short acknowledgement", () => {
  // Neel's 27 Oct screenshot: "Thank you. We are still listening." opened every answer.
  const turns = [turn("names"), turn("names"), turn("hurt"), turn("hurt")];
  assert.deepEqual(replyFor(0, turns).lines, ["heard.thanks.first", "heard.kind.names"]);
  assert.deepEqual(replyFor(1, turns).lines, [ACKS[0]]);
  assert.deepEqual(replyFor(2, turns).lines, ["heard.kind.hurt"]);
  assert.deepEqual(replyFor(3, turns).lines, [ACKS[1]]);
  for (let i = 1; i < turns.length; i += 1) {
    assert.ok(!replyFor(i, turns).lines.includes("heard.thanks.first"), `answer ${i} thanks again`);
  }
});

test("two answers in a row never open with the same line", () => {
  const turns = Array.from({ length: 8 }, () => turn("names"));
  for (let i = 1; i < turns.length; i += 1) {
    assert.notDeepEqual(replyFor(i, turns).lines, replyFor(i - 1, turns).lines, `answers ${i - 1} and ${i}`);
  }
});

test("'talk to me' gets an open door, never a question about something not mentioned", () => {
  // The screenshot: "Merse baat karo please" was answered "An adult you trust
  // can help" and then "When did it happen?".
  const alone = replyFor(0, [turn("talk", "Merse baat karo please")]);
  assert.deepEqual(alone, { lines: ["heard.kind.talk"], ask: "heard.ask.open" });
  const later = [turn("threat"), { text: "x", kind: "other", urgent: true } as Turn, turn("talk")];
  const reply = replyFor(2, later);
  assert.deepEqual(reply.lines, ["heard.kind.talk"]);
  assert.ok(!["heard.ask.where", "heard.ask.when", "heard.ask.who"].includes(reply.ask ?? ""), String(reply.ask));
});

test("the next question is the first detail the child has not given", () => {
  // "He pushed me at school today": where and when are known, so who is asked.
  assert.equal(replyFor(0, [turn("hurt", "x", ["where", "when"])]).ask, "heard.ask.who");
  // Nothing given yet: where first.
  assert.equal(replyFor(0, [turn("names")]).ask, "heard.ask.where");
  // A detail given in a later message is not asked for afterwards.
  const turns = [turn("taken"), turn("taken", "at the bus stop yesterday", ["where", "when"])];
  assert.equal(replyFor(1, turns).ask, "heard.ask.who");
});

test("a threat asks when first, and something online is never asked where", () => {
  assert.equal(replyFor(0, [turn("threat")]).ask, "heard.ask.when");
  assert.deepEqual(asks([turn("online"), turn("online"), turn("online")]), [
    "heard.ask.when", "heard.ask.who", "heard.ask.feel",
  ]);
});

test("asking what to do, or a good day, gets no question; only a feeling asks what happened", () => {
  assert.equal(replyFor(0, [turn("asking")]).ask, null);
  assert.equal(replyFor(0, [turn("good")]).ask, null);
  assert.equal(replyFor(0, [turn("feeling", "x", ["feeling"])]).ask, "heard.ask.what");
});

test("each question is asked once, and then the app stops asking", () => {
  const many = Array.from({ length: 10 }, () => turn("hurt"));
  const all = asks(many);
  assert.deepEqual(all.slice(0, 6), [
    "heard.ask.where", "heard.ask.when", "heard.ask.who", "heard.ask.feel", "heard.ask.else", "heard.ask.done",
  ]);
  assert.deepEqual(all.slice(6), [null, null, null, null]);
  assert.ok(!t("heard.ask.done", "en").includes("?"), "the last one must not be a question");
});

test("a first message no kind fits gets the open question, not 'Where did it happen?'", () => {
  assert.equal(replyFor(0, [turn("other")]).ask, "heard.ask.more");
});

test("the app never speaks as I, in English", () => {
  // CLAUDE.md: no AI friend. The app is "we", never a person.
  for (const [key, text] of Object.entries(STRINGS)) {
    if (key.startsWith("heard.")) assert.ok(!/\bI\b|\bI'm\b|\bme\b|\bmy\b/.test(text.en), `${key}: ${text.en}`);
  }
});

test("the card carries the child's words, in order, and none of ours", () => {
  const words = wordsForCard([turn("hurt", "  He pushed me. "), turn("other", ""), turn("names", "Then they laughed.")]);
  assert.equal(words, "He pushed me.\n\nThen they laughed.");
  for (const key of Object.keys(STRINGS).filter((k) => k.startsWith("heard."))) {
    assert.ok(!words.includes(t(key as keyof typeof STRINGS, "en")));
  }
});

test("the card limit matches what the server accepts", () => {
  const schemas = readFileSync(new URL("../../../backend/app/schemas.py", import.meta.url), "utf8");
  const translate = schemas.slice(schemas.indexOf("class TranslateRequest"));
  assert.match(translate, new RegExp(`max_length=${MAX_CARD_CHARS}\\b`));
});

test("the listening screen shows no text from the server but the checked reply and the safety message", () => {
  // Any new field of the response rendered here would be a new way for the
  // model to talk to a child without going through engine/listen.py's checks.
  const screen = readFileSync(new URL("../screens/Listen.tsx", import.meta.url), "utf8");
  // The response variable, not the "heard.*" string keys inside quotes.
  const used = [...screen.matchAll(/(?<!["'])\bheard\.(\w+)/g)].map((m) => m[1]);
  // `told` is a list of closed-enum codes that only choose a question; it is
  // never shown.
  assert.deepEqual([...new Set(used)].sort(), ["kind", "reply", "safety", "told"]);
});

test("a message the safety check flagged is answered with help, and nothing is asked", () => {
  // Found in the 360px render: "Sometimes I want to die" got "When did it
  // happen?" underneath it.
  const turns: Turn[] = [turn("names"), { text: "x", kind: "other", urgent: true }];
  assert.deepEqual(replyFor(1, turns), { lines: ["heard.urgent"], ask: null });
});

test("being hurt or threatened puts Need help inside the answer, nothing else does", () => {
  assert.deepEqual([...HELP_NUDGE].sort(), ["hurt", "threat"]);
  const screen = readFileSync(new URL("../screens/Listen.tsx", import.meta.url), "utf8");
  assert.match(screen, /HELP_NUDGE\.has\(turn\.kind\)/);
  assert.match(screen, /onClick=\{onNeedHelp\}/);
});

test("a checked written reply answers an 'other' message in place of the general line", () => {
  const turns: Turn[] = [{ text: "x", kind: "other", written: "We can hear how much this weighs on you." }];
  assert.deepEqual(replyFor(0, turns), {
    lines: ["heard.thanks.first"],
    written: "We can hear how much this weighs on you.",
    ask: "heard.ask.more",
  });
});

test("without a written reply, 'other' still gets the reviewed line", () => {
  assert.deepEqual(replyFor(0, [{ text: "x", kind: "other", written: null }]).lines, [
    "heard.thanks.first",
    "heard.kind.other",
  ]);
});

test("a written reply is never used for a kind that has a reviewed line, or for urgent", () => {
  const hurt: Turn = { text: "x", kind: "hurt", written: "anything" };
  assert.equal(replyFor(0, [hurt]).written, undefined);
  const urgent: Turn = { text: "x", kind: "other", urgent: true, written: "anything" };
  assert.equal(replyFor(0, [urgent]).written, undefined);
});
