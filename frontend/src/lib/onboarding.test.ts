/**
 * The onboarding screen says exactly what content/onboarding.json says.
 *
 * The file is where the promises are reviewed against the shipped app; the
 * copy in strings.ts is what a child actually reads. Two copies agree on the
 * day they are written and drift afterwards, so this reads the file and
 * compares every card, in order, in every language.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ONBOARDING_CARDS } from "./onboarding";
import { LANGS, STRINGS, fill } from "./strings";

interface Screen {
  id: string;
  en: string;
  de: string;
  hi: string;
}

const FILE: { screens: Screen[] } = JSON.parse(
  readFileSync(new URL("../../../content/onboarding.json", import.meta.url), "utf-8"),
);

test("the cards are the file's screens, in the file's order", () => {
  assert.deepEqual(
    ONBOARDING_CARDS.map((card) => card.id),
    FILE.screens.map((screen) => screen.id),
  );
});

test("every card's wording matches the file in every language", () => {
  for (const [i, card] of ONBOARDING_CARDS.entries()) {
    const screen = FILE.screens[i];
    for (const lang of LANGS) {
      assert.equal(
        STRINGS[card.key][lang],
        screen[lang],
        `onboarding "${card.id}" (${lang}) differs from content/onboarding.json`,
      );
    }
  }
});

test("no card promises a help button on every screen", () => {
  // Not true until the help screen (#47) is reachable from every screen. The
  // card that said so was replaced with "Leave now", which is.
  for (const card of ONBOARDING_CARDS) {
    for (const lang of LANGS) {
      assert.ok(!STRINGS[card.key][lang].includes(STRINGS["help.button"][lang]), `${card.id} (${lang})`);
    }
  }
});

test("the leave-now card names the real button and keeps the history caveat", () => {
  for (const lang of LANGS) {
    // The button's name is filled in from quickExit.button, so it can never
    // be spelled differently from the button itself.
    const text = fill("onboarding.leaveNow", lang, { button: STRINGS["quickExit.button"][lang] });
    assert.ok(text.includes(STRINGS["quickExit.button"][lang]), `names "Leave now" as the button says it (${lang})`);
    assert.ok(!text.includes("{"), `no unfilled placeholder (${lang})`);
  }
  // CLAUDE.md: quick exit does not erase browser history, and the UI must not
  // imply that it does.
  assert.match(STRINGS["onboarding.leaveNow"].en, /does not delete your browser history/);
});

test("onboarding stays short: at most three cards, at most two sentences each", () => {
  // Issue #3: six cards of promises made the app feel like an interview. Each
  // promise belongs on the screen where it matters, not here.
  assert.ok(ONBOARDING_CARDS.length <= 3, `${ONBOARDING_CARDS.length} cards`);
  for (const card of ONBOARDING_CARDS) {
    for (const lang of LANGS) {
      const sentences = STRINGS[card.key][lang].split(/[.!?।]/).filter((s) => s.trim());
      assert.ok(sentences.length <= 2, `${card.id} (${lang}) has ${sentences.length} sentences`);
    }
  }
});

test("the app still says it is not a person and not a doctor", () => {
  // CLAUDE.md: a communication tool, not counselling; the UI says so. This
  // card is the only place that says it.
  assert.match(STRINGS["onboarding.what"].en, /not a person and not a doctor/);
});
