/**
 * After the check-in, the app answers the face the child tapped.
 *
 * Swarup, 27 Oct: "even if we say good when the app asks how are you it still
 * asks what happened". These pin that "Good" and "OK" are never followed by
 * "What happened?", that every face gets its own answer, and that the app
 * goes there instead of straight into the questions.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { MOODS } from "./moods.ts";
import { moodReplyFor } from "./moodReply.ts";
import { LANGS, STRINGS } from "./strings.ts";

test("a good day is not asked what happened", () => {
  for (const mood of ["good", "ok"]) {
    const reply = moodReplyFor(mood);
    assert.notEqual(reply.question, "moodReply.tellUs", mood);
    assert.equal(reply.stop, "moodReply.done");
  }
});

test("every face gets its own answer, in every language", () => {
  const titles = MOODS.map((mood) => moodReplyFor(mood.code).title);
  assert.equal(new Set(titles).size, MOODS.length);
  for (const key of titles) {
    for (const lang of LANGS) assert.ok(STRINGS[key][lang].trim(), `${key} in ${lang}`);
  }
});

test("a hard feeling is answered, then asked gently, with a way out", () => {
  for (const mood of ["sad", "scared", "angry", "alone"]) {
    const reply = moodReplyFor(mood);
    assert.equal(reply.question, "moodReply.tellUs", mood);
    assert.equal(reply.stop, "heard.notNow", mood);
  }
});

test("skipping the face still offers both ways to tell it", () => {
  assert.deepEqual(moodReplyFor(null), { title: "moodReply.skipped", question: null, stop: "heard.notNow" });
});

test("the check-in goes to the answer, not straight into the questions", () => {
  const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  const afterCheckIn = app.slice(app.indexOf("const afterCheckIn"), app.indexOf("const finishPictures"));
  assert.match(afterCheckIn, /setStep\("checkInReply"\)/);
  assert.doesNotMatch(afterCheckIn, /setStep\("picWhat"\)/);
});
