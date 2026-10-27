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

import type { ListenKind } from "../types/api.ts";
import { ASKS, HELP_NUDGE, MAX_CARD_CHARS, replyFor, wordsForCard, type Turn } from "./listening.ts";
import { LANGS, STRINGS, t } from "./strings.ts";

const KINDS: ListenKind[] = [
  "hurt", "names", "left_out", "taken", "online", "threat", "feeling", "good", "asking", "other",
];

const turn = (kind: ListenKind, text = "x"): Turn => ({ text, kind });

test("every kind has its own sentence, in every language", () => {
  const seen = new Set<string>();
  for (const kind of KINDS) {
    const { lines } = replyFor(0, [turn(kind)]);
    assert.equal(lines[0], "heard.thanks.first");
    assert.equal(lines.length, 2, `${kind} has no sentence of its own`);
    seen.add(lines[1]);
    for (const lang of LANGS) {
      assert.ok(STRINGS[lines[1]][lang].trim(), `${lines[1]} is empty in ${lang}`);
    }
  }
  assert.equal(seen.size, KINDS.length);
});

test("a kind is answered once, then the app just thanks and asks on", () => {
  const turns = [turn("names"), turn("names"), turn("hurt")];
  assert.deepEqual(replyFor(1, turns).lines, ["heard.thanks.again"]);
  assert.deepEqual(replyFor(2, turns).lines, ["heard.thanks.again", "heard.kind.hurt"]);
});

test("the questions come one at a time and then stop asking", () => {
  const many = Array.from({ length: ASKS.length + 3 }, () => turn("other"));
  assert.equal(replyFor(0, many).ask, "heard.ask.more");
  assert.equal(replyFor(many.length - 1, many).ask, "heard.ask.done");
  assert.ok(!t("heard.ask.done", "en").includes("?"), "the last one must not be a question");
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
  assert.deepEqual([...new Set(used)].sort(), ["kind", "reply", "safety"]);
});

test("a message the safety check flagged is answered with help, and nothing is asked", () => {
  // Found in the 360px render: "Sometimes I want to die" got "When did it
  // happen?" underneath it.
  const turns: Turn[] = [turn("names"), { text: "x", kind: "other", urgent: true }];
  assert.deepEqual(replyFor(1, turns), { lines: ["heard.thanks.again", "heard.urgent"], ask: null });
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
