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

// Swarup, 28 Oct: "even if we put random messages it still says, thank you
// for your message". Messages that tell us nothing about the child's day.

test("'thanks', 'bye', 'ok', 'not now' get their own line, no thanks and no question", () => {
  for (const kind of ["thanks", "bye", "unsure", "not_now", "smalltalk"] as const) {
    const reply = replyFor(0, [turn(kind)]);
    assert.deepEqual(reply.lines, [`heard.kind.${kind}`], kind);
    assert.equal(reply.ask, null, kind);
  }
});

test("'hi', 'what should I do' and good news are not thanked like a form letter", () => {
  for (const kind of ["talk", "asking", "good"] as const) {
    assert.ok(!replyFor(0, [turn(kind)]).lines.includes("heard.thanks.first"), kind);
  }
});

test("what the child tells us after 'hi' is the first thing thanked", () => {
  const turns = [turn("talk"), turn("unsure"), turn("hurt")];
  assert.deepEqual(replyFor(2, turns).lines, ["heard.thanks.first", "heard.kind.hurt"]);
});

test("'who are you?' says plainly it is an app, and opens the door once", () => {
  const turns = [turn("about_app"), turn("about_app")];
  assert.deepEqual(replyFor(0, turns), { lines: ["heard.kind.about_app"], ask: "heard.ask.open" });
  assert.equal(replyFor(1, turns).ask, null);
  // After something happened, no open question: the details come next.
  assert.equal(replyFor(1, [turn("hurt"), turn("about_app")]).ask, null);
});

test("'idk' to 'Where did it happen?' is not pushed with the next question", () => {
  const turns = [turn("hurt"), turn("unsure")];
  assert.equal(replyFor(0, turns).ask, "heard.ask.where");
  assert.deepEqual(replyFor(1, turns), { lines: ["heard.kind.unsure"], ask: null });
  // Nor is the next message read as the answer to "where".
  assert.equal(askedBefore(2, [...turns, turn(null)]), null);
});

test("the next real message after 'idk' carries on with the details", () => {
  const turns = [turn("hurt"), turn("unsure"), turn("names")];
  assert.equal(replyFor(2, turns).ask, "heard.ask.when");
});

test("'ok' twice does not get the same three sentences twice", () => {
  const turns = [turn("unsure"), turn("unsure")];
  assert.deepEqual(replyFor(1, turns).lines, ["heard.ack.here"]);
});

test("danger is answered as danger, even in a message that looks like 'bye'", () => {
  const reply = replyFor(0, [{ text: "bye", kind: "bye", urgent: true }]);
  assert.deepEqual(reply.lines, ["heard.thanks.first", "heard.urgent"]);
  assert.equal(reply.ask, null);
});
