/**
 * The chat thinks about what it just asked, and about nonsense (28 Oct).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { askedBefore, replyFor, type Turn } from "./listening.ts";

const turn = (kind: Turn["kind"], told: Turn["told"] = [], text = "x"): Turn => ({ text, kind, told });

test("keys hit at random get 'we are not sure we understood', and no question", () => {
  const reply = replyFor(0, [turn("unclear")]);
  assert.deepEqual(reply.lines, ["heard.kind.unclear"]);
  assert.equal(reply.ask, null);
});

test("it says so every time, not 'we read it' about nothing", () => {
  const turns = [turn("unclear"), turn("unclear")];
  assert.deepEqual(replyFor(1, turns).lines, ["heard.kind.unclear"]);
});

test("the first real message after nonsense is still thanked as the first", () => {
  const turns = [turn("unclear"), turn("hurt")];
  assert.equal(replyFor(1, turns).lines[0], "heard.thanks.first");
});

test("the question asked before a message is sent with it", () => {
  const turns = [turn("hurt"), turn(null)];
  assert.equal(replyFor(0, turns).ask, "heard.ask.where");
  assert.equal(askedBefore(1, turns), "where");
  assert.equal(askedBefore(0, turns), null, "nothing was asked before the first message");
});

test("a short answer to that question is thanked as an answer, and the next detail is asked", () => {
  const turns = [turn("hurt"), turn("other", ["where"], "at the bus stop")];
  const reply = replyFor(1, turns);
  assert.deepEqual(reply.lines, ["heard.gotIt"]);
  assert.equal(reply.ask, "heard.ask.when", "where is known now, so when comes next");
});

test("an 'other' message that does not answer the question gets the usual line", () => {
  const turns = [turn("hurt"), turn("other", [], "and also")];
  assert.notDeepEqual(replyFor(1, turns).lines, ["heard.gotIt"]);
});
