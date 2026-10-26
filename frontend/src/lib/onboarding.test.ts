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
import { LANGS, STRINGS } from "./strings";

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
    const text = STRINGS["onboarding.leaveNow"][lang];
    assert.ok(text.includes(STRINGS["quickExit.button"][lang]), `names "Leave now" as the button says it (${lang})`);
  }
  // CLAUDE.md: quick exit does not erase browser history, and the UI must not
  // imply that it does.
  assert.match(STRINGS["onboarding.leaveNow"].en, /does not delete your browser history/);
});
