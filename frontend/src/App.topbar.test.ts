/**
 * The top bar after Neel's 28 Oct change: My notes on the left, Need help and
 * Leave now as icons only (red headphones, a door).
 *
 * An icon-only button is only usable if it still has a name, so these pin the
 * names to strings.ts, keep My notes off the PIN lock (it would open the
 * child's words past their own PIN), and keep every line that sends a child
 * to an icon naming what they will actually see.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import QuickExitButton from "./components/QuickExitButton.tsx";
import { LANGS, STRINGS, t } from "./lib/strings.ts";

const APP = readFileSync(new URL("./App.tsx", import.meta.url), "utf-8");

/**
 * The PIN lock on the notes (issue #133): what a child sees in place of their
 * notes until they type their PIN. It replaced the early-return lock at start-up.
 */
const LOCK = APP.slice(APP.indexOf("{/* NOTES GATE START */}"), APP.indexOf("{/* NOTES GATE END */}"));

test("Leave now is an icon with its name from strings.ts, in every language", () => {
  for (const lang of LANGS) {
    const markup = renderToStaticMarkup(createElement(QuickExitButton, { lang }));
    const button = markup.slice(markup.indexOf("<button"), markup.indexOf("</button>") + 9);
    assert.match(button, new RegExp(`aria-label="${t("quickExit.button", lang)}"`), lang);
    // No visible word inside the button: only the door.
    assert.equal(button.replace(/<[^>]+>/g, "").trim(), "", `${lang}: text inside Leave now`);
  }
});

test("Need help is red headphones named by help.short, not typed in the component", () => {
  assert.match(APP, /aria-label=\{t\("help\.short", lang\)\}/);
  assert.match(APP, /title=\{t\("help\.short", lang\)\}/);
  assert.match(APP, /className="need-help sticker size-tap/, "Need help keeps its pulse hook and a 44px target");
});

test("My notes opens the timeline and never appears on the PIN lock", () => {
  assert.ok(LOCK.length > 0, "could not find the notes lock in App.tsx");
  assert.match(APP, /onClick=\{\(\) => setStep\("timeline"\)\}[\s\S]{0,1200}t\("nav\.notes", lang\)/);
  assert.doesNotMatch(LOCK, /nav\.notes|setStep\("timeline"\)/, "My notes on the lock bypasses the PIN");
  // The lock still has its own help (EmergencyHelp, which never moves step),
  // and Leave now stays in the top bar, which is drawn on every screen and
  // around the lock, never inside a branch that the lock replaces.
  assert.match(LOCK, /EmergencyHelp/);
  const bar = APP.slice(APP.indexOf('<div className="top-bar'), APP.indexOf("{/* NOTES GATE START */}"));
  assert.match(bar, /<QuickExitButton/, "Leave now is not in the bar above the lock");
});

test("a line that sends a child to Need help names the red headphones, in every language", () => {
  const phone = { en: "red headphones", de: "roten Kopfhörer", hi: "laal headphone" } as const;
  for (const key of ["help.dangerLineNoNumber", "heard.urgent", "ladder.dangerNow", "ladder.contactsElsewhere"] as const) {
    for (const lang of LANGS) {
      const text = STRINGS[key][lang];
      assert.ok(text.includes(phone[lang]), `${key} (${lang}) does not say what the button looks like: ${text}`);
    }
  }
});

test("a line that sends a child to Leave now names the door, in every language", () => {
  const door = { en: "door button", de: "Tür-Knopf", hi: "darwaze wala" } as const;
  for (const key of ["onboarding.leaveNow", "draft.kept"] as const) {
    for (const lang of LANGS) {
      const text = STRINGS[key][lang];
      assert.ok(text.includes(door[lang]), `${key} (${lang}) does not say what the button looks like: ${text}`);
    }
  }
});
