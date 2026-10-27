/**
 * The question tree: every branch in lib/questions.ts, one test each.
 *
 *   cd frontend
 *   node --import tsx --test src/lib/questions.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { NO_PICKS, NO_SAY, entryFor, needsHelpRoute, type Picks } from "./pictures";
import { MAX_FOLLOW_UPS, answersFor, followUpsFor, nextQuestion, questionsFor } from "./questions";
import { mapFor } from "./scenes";

const picks = (over: Partial<Picks>): Picks => ({ ...NO_PICKS, ...over });

test("with no answers yet, the five plain questions are asked", () => {
  assert.deepEqual(questionsFor(NO_PICKS), ["picWhat", "picWhere", "picWho", "picOften", "picFeel"]);
});

test("'something else' goes to the child's own words; writing something skips Where and Who", () => {
  assert.deepEqual(questionsFor(picks({ what: ["other"] })), ["picWhat", "picOwn", "picWhere", "picWho", "picOften", "picFeel"]);
  assert.deepEqual(questionsFor(picks({ what: ["other"], own: ["They locked me in."] })), ["picWhat", "picOwn", "picOften", "picFeel"]);
});

test("'online' asks where online, instead of the physical Where?", () => {
  const list = questionsFor(picks({ what: ["online"] }));
  assert.ok(list.includes("picWhereOnline"));
  assert.ok(!list.includes("picWhere"));
});

test("'things taken' asks what was taken", () => {
  assert.deepEqual(followUpsFor(["taken"]), ["picTaken"]);
});

test("'pushed' or 'hit' asks once about the body, never twice", () => {
  assert.deepEqual(followUpsFor(["pushed"]), ["picBody"]);
  assert.deepEqual(followUpsFor(["pushed", "hit"]), ["picBody"]);
});

test("'threatened' asks when", () => {
  assert.deepEqual(followUpsFor(["threatened"]), ["picWhen"]);
});

test("'left out' and 'called names' add no follow-up, and no body question", () => {
  assert.deepEqual(followUpsFor(["left_out", "names"]), []);
  assert.deepEqual(questionsFor(picks({ what: ["left_out"] })), ["picWhat", "picWhere", "picWho", "picOften", "picFeel"]);
});

test("at most two follow-ups, the first two in the fixed tile order", () => {
  const all = ["other", "threatened", "online", "taken", "hit"];
  const follow = followUpsFor(all);
  assert.equal(follow.length, MAX_FOLLOW_UPS);
  assert.deepEqual(follow, ["picBody", "picTaken"], "tile order, whatever the tap order");
});

test("'I don't want to say' on What happened? asks no follow-up at all", () => {
  assert.deepEqual(followUpsFor([NO_SAY]), []);
});

test("an adult gets one gentle question, then straight to the card", () => {
  const list = questionsFor(picks({ kind: ["adult"] }));
  assert.deepEqual(list.slice(-2), ["picWho", "picAdultWhere"]);
  assert.ok(!list.includes("picOften") && !list.includes("picFeel"));
  assert.equal(nextQuestion("picAdultWhere", picks({ kind: ["adult"] })), "picReview");
});

test("a face tapped at the check-in is not asked about again; a skipped check-in is", () => {
  assert.deepEqual(questionsFor(NO_PICKS, "sad"), ["picWhat", "picWhere", "picWho", "picOften"]);
  assert.ok(questionsFor(NO_PICKS, null).includes("picFeel"));
  assert.equal(nextQuestion("picOften", NO_PICKS, "scared"), "picReview");
  assert.equal(nextQuestion("picOften", NO_PICKS, null), "picFeel");
  // The map loses the stop too, so the traveller never walks to a question
  // that will not come.
  assert.equal(mapFor("picWhat", NO_PICKS, "sad")?.places.length, 1 + 4 + 3);
});

test("'I don't want to say' on Who? never opens the adult question", () => {
  assert.ok(!questionsFor(picks({ howMany: [NO_SAY], kind: [] })).includes("picAdultWhere"));
});

test("the next question follows the answers: taken, then the plain questions", () => {
  const p = picks({ what: ["taken"] });
  assert.equal(nextQuestion("picWhat", p), "picTaken");
  assert.equal(nextQuestion("picTaken", p), "picWhere");
  assert.equal(nextQuestion("picFeel", p), "picReview");
});

test("an answer to a question no longer asked is dropped from the card", () => {
  // Taken was answered, then the child went Back and un-picked 'taken'.
  const answers = answersFor(picks({ what: ["names"], taken: ["money"] }));
  assert.equal(answers.taken, null);
  assert.equal(answersFor(picks({ what: ["taken"], taken: ["money"] })).taken, "money");
});

test("every follow-up puts a fixed German line on the card", () => {
  const entry = entryFor(
    answersFor(picks({ what: ["pushed", "taken"], body: ["hurts_bit"], taken: ["phone"] })),
    "en",
    "2026-10-26",
    "",
  );
  assert.match(entry.text_de, /Körper jetzt: Tut ein bisschen weh/);
  assert.match(entry.text_de, /Was weggenommen wurde: Mein Handy/);
  assert.match(entry.text_child, /Body now: Hurts a bit/);
});

test("the adult line, and the online line, reach the card", () => {
  const adult = entryFor(answersFor(picks({ kind: ["adult"], adultWhere: ["home"] })), "de", "2026-10-26", "");
  assert.match(adult.text_de, /Die erwachsene Person ist: Von zu Hause/);
  const online = entryFor(answersFor(picks({ what: ["online"], whereOnline: ["game"] })), "en", "2026-10-26", "");
  assert.match(online.text_child, /Where online: A game/);
});

test("danger branches show the 110 line: hurts a lot, or a threat for today", () => {
  assert.equal(needsHelpRoute(answersFor(picks({ what: ["pushed"], body: ["hurts_lot"] }))), true);
  assert.equal(needsHelpRoute(answersFor(picks({ what: ["threatened"], when: ["today"] }))), true);
  assert.equal(needsHelpRoute(answersFor(picks({ what: ["pushed"], body: ["fine"] }))), false);
});

test("the map has one stop per question actually asked", () => {
  const short = mapFor("picWhat", picks({ kind: ["adult"] }));
  const long = mapFor("picWhat", picks({ what: ["pushed", "taken"] }));
  // check-in + questions + card, who sees it, done
  assert.equal(short?.places.length, 1 + questionsFor(picks({ kind: ["adult"] })).length + 3);
  assert.equal(long?.places.length, 1 + 7 + 3);
  assert.equal(mapFor("picTaken", picks({ what: ["taken"] }))?.at, 2);
});
