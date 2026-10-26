/**
 * The 110 panel appears before the child has answered. What it may claim.
 *
 * Neel's finding 4 (issue #5). A child writes "he said he would get me after
 * school". The safety check reads that sentence and returns `danger`, so the
 * panel with 110 on it is on screen - and the app has not yet asked the child
 * whether "get me" was a threat or an offer of a lift home. A child who meant
 * the lift sees an emergency number about their own words.
 *
 * The order is deliberate and is not what changes here. Showing the panel
 * only after the question would mean a child in real danger has to answer
 * something before the number appears, and that is a worse failure than being
 * startled. CLAUDE.md: "show 110/112 and krisenchat at once."
 *
 * What changes is the claim. While a question is outstanding the panel says
 * in plain words that we do not know yet and are about to ask, so it reads as
 * a number offered just in case rather than a finding the app has reached
 * about the child.
 *
 * Static markup only (`renderToStaticMarkup`), like WriteClarify.test.tsx: no
 * DOM, no effects, so the fetched contact lists are empty here. That is fine
 * - what is under test is the text, and the contacts have their own tests.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import WriteSafetyNote from "./WriteSafetyNote.tsx";
import { t } from "../lib/strings.ts";

const DANGER = {
  urgent: true,
  category: "danger" as const,
  message_child: "If someone can hurt you right now, call 110.",
};

function render(pendingQuestion: boolean, lang = "en") {
  return renderToStaticMarkup(
    createElement(WriteSafetyNote, {
      lang,
      safety: DANGER,
      onNeedHelp: () => {},
      pendingQuestion,
    }),
  );
}

test("with a question outstanding, the panel says we have not decided anything", () => {
  const html = render(true);
  assert.ok(
    html.includes(t("safety.notSureYet", "en")),
    "a child who meant 'pick me up' must be told the app is still asking",
  );
});

test("once there is nothing left to ask, the line is gone", () => {
  const html = render(false);
  assert.ok(!html.includes(t("safety.notSureYet", "en")));
});

test("the safety message itself is shown either way", () => {
  // The point of the panel. Whatever else is true, the number is on screen
  // before the child answers anything.
  for (const pending of [true, false]) {
    assert.ok(render(pending).includes(DANGER.message_child));
  }
});

test("the line comes before the help button, not after it", () => {
  // A child who reads two lines and stops should still have got it.
  const html = render(true);
  const note = html.indexOf(t("safety.notSureYet", "en"));
  const button = html.indexOf(t("help.button", "en"));
  assert.ok(note > -1 && button > -1);
  assert.ok(note < button, "the hedge has to be read before the panel is acted on");
});

test("it is written in every language we ship", () => {
  for (const lang of ["en", "de", "hi"]) {
    const line = t("safety.notSureYet", lang);
    assert.ok(line.length > 0, `${lang} has no safety.notSureYet`);
    assert.ok(render(true, lang).includes(line), `${lang} does not reach the panel`);
  }
  // Each language says its own thing: a missing translation falls back to
  // English, which would pass the check above while showing a child English.
  assert.notEqual(t("safety.notSureYet", "de"), t("safety.notSureYet", "en"));
  assert.notEqual(t("safety.notSureYet", "hi"), t("safety.notSureYet", "en"));
});

test("the Hindi speaks to the child as तुम, like the screens", () => {
  // Same rule as the backend's test_hindi_register.py: आप is what a form
  // calls you. This string is read at the worst moment of the whole app.
  const hi = t("safety.notSureYet", "hi");
  assert.ok(hi.includes("तुम"), "the Hindi must address the child informally");
  assert.ok(!/(?:^|\s)आप(?:का|की|के|को|से|ने)?(?:\s|।|$)/.test(hi));
});
