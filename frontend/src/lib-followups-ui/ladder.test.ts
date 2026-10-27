/**
 * Tests for the ladder's display model.
 *
 *   cd frontend
 *   node --import tsx --test "src/lib-followups-ui/*.test.ts"
 *
 * These assert what the rows look like. Which rung comes next is
 * `lib/followups.ts` and is tested there (PR #37); nothing here re-tests it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { LADDER, ladderStep, type Handoff } from "../lib/followups.ts";
import type { Entry } from "../types/api.ts";
import { copy } from "./copy.ts";
import { INTENT_KEY, RUNGS, rungIntents, rungStates, type LadderIntent } from "./ladder.ts";

function entry(date: string): Entry {
  return { date, mood: "sad", text_child: "x", text_de: "x" };
}

test("there is exactly one rung per step in LADDER, in the same order", () => {
  assert.deepEqual(
    RUNGS.map((rung) => rung.step),
    [...LADDER],
  );
});

test("the emergency rung is not a row on this screen", () => {
  // It is left out of LADDER by lib/followups.ts on purpose; this asserts the
  // screen did not quietly add it back as a sixth row.
  assert.ok(!RUNGS.some((rung) => (rung.step as string) === "emergency"));
});

test("every rung names at least one door and says why it is different", () => {
  for (const rung of RUNGS) {
    assert.ok(rung.nameKeys.length > 0, `${rung.step} has no name`);
    for (const key of rung.nameKeys) {
      assert.ok(copy(key, "en").text.trim().length > 0, `${rung.step}: ${key} is blank`);
    }
    assert.ok(copy(rung.whyKey, "en").text.trim().length > 0, `${rung.step} has no why`);
  }
});

test("no rung's own wording contains a digit", () => {
  // The rung is the name of a door, never a number to dial. Both services at
  // the top of the ladder carry contactsElsewhere instead.
  for (const rung of RUNGS) {
    for (const key of [...rung.nameKeys, rung.whyKey]) {
      for (const lang of ["en", "de", "hi"]) {
        const text = copy(key, lang).text;
        assert.ok(!/\d/.test(text), `${rung.step}: ${key} (${lang}) contains a digit: ${text}`);
      }
    }
  }
});

test("the two rungs that are real services get their contacts from elsewhere", () => {
  const elsewhere = RUNGS.filter((rung) => rung.contactsElsewhere).map((rung) => rung.step);
  assert.deepEqual(elsewhere, ["school_psychology", "helplines"]);
});

test("a rung whose contacts live elsewhere offers the way to find them, first", () => {
  for (const rung of RUNGS) {
    const intents = rungIntents(rung);
    if (rung.contactsElsewhere) {
      assert.equal(intents[0]?.kind, "open-help", `${rung.step} does not point at the help screen`);
    } else {
      assert.deepEqual(intents, [{ kind: "open-handoff", step: rung.step }]);
    }
    assert.ok(
      intents.some((intent) => intent.kind === "open-handoff"),
      `${rung.step} offers no way to take the child's words there`,
    );
  }
});

test("every intent the ladder can fire is one that opens a screen", () => {
  // A canary, not a proof. If someone adds a fifth intent this fails, which
  // forces them to say here, in writing, that it does not send anything.
  const kinds: LadderIntent["kind"][] = ["open-handoff", "open-help", "open-timeline", "open-ladder"];
  assert.deepEqual(Object.keys(INTENT_KEY).sort(), [...kinds].sort());
  for (const kind of kinds) {
    assert.ok(kind.startsWith("open-"), `${kind} is not an "open" intent`);
    assert.ok(copy(INTENT_KEY[kind], "en").text.trim().length > 0, `${kind} has no label`);
  }
});

// --- row states ----------------------------------------------------------------

test("with nobody shown yet, only the first rung is the place to start", () => {
  const states = rungStates(ladderStep([entry("2026-10-20")], []), []);
  assert.equal(states.teacher, "start");
  assert.equal(states.trusted, "later");
  assert.equal(states.helplines, "later");
});

test("waiting: the rung the child showed reads as shown, and nothing is pushed", () => {
  const handoffs: Handoff[] = [{ date: "2026-10-21", step: "teacher" }];
  const states = rungStates(ladderStep([entry("2026-10-21")], handoffs), handoffs);
  assert.equal(states.teacher, "shown");
  for (const step of LADDER) {
    if (step !== "teacher") assert.equal(states[step], "later");
  }
});

test("it kept happening: the rung above is next and the one below stays shown", () => {
  const handoffs: Handoff[] = [{ date: "2026-10-21", step: "teacher" }];
  const entries = [entry("2026-10-23"), entry("2026-10-24")];
  const states = rungStates(ladderStep(entries, handoffs), handoffs);
  assert.equal(states.teacher, "shown");
  assert.equal(states.trusted, "next");
  assert.equal(states.head, "later");
});

test("on the top rung it reads as top, not merely done", () => {
  // "top" renders the paragraph saying the child may go back to the same
  // people; showing the row as plain "shown" would read as out of options.
  const handoffs: Handoff[] = [{ date: "2026-10-21", step: "helplines" }];
  const states = rungStates(ladderStep([entry("2026-10-22")], handoffs), handoffs);
  assert.equal(states.helplines, "top");
});

test("a rung the child skipped past is still present, never locked", () => {
  const handoffs: Handoff[] = [{ date: "2026-10-10", step: "head" }];
  const states = rungStates(ladderStep([entry("2026-10-20")], handoffs), handoffs);
  assert.equal(states.teacher, "later", "an unused lower rung is still offered");
  assert.equal(states.head, "shown");
  assert.equal(states.school_psychology, "next");
});
