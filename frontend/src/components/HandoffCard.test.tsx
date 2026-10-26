/**
 * The at-home rule, pinned again - this time at the rendered markup.
 *
 * `HandoffSuggestions.test.ts` proves the derivation is right. This proves the
 * screen actually renders what the derivation says, which is the half that a
 * future edit to the markup could break without touching the rule at all.
 * Someone adding `{where === "school" && ...}` to HandoffCard.tsx fails here.
 *
 * It also pins the two sentences that must be on screen rather than available:
 * `handoff.youDecide` (nothing is sent) and `handoff.homeNote` (why family is
 * missing), and that no send/share control exists anywhere on the card.
 *
 * NOT RUN BY `npm test` YET - the script in frontend/package.json globs
 * `src/lib/**` only, and that file is Vernika's. Run it by hand:
 *
 *   cd frontend
 *   node --import tsx --test src/components/HandoffCard.test.tsx
 *
 * Static markup only (`renderToStaticMarkup`), so there is no DOM and no test
 * library to add to the lock file for this.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import HandoffCard from "./HandoffCard.tsx";
import { STRINGS } from "../lib/strings.ts";
import type { WhereItHappens } from "./HandoffSuggestions.ts";
import type { ReportResponse } from "../types/api.ts";

const REPORT: ReportResponse = {
  child_version: "They took my lunch again.",
  german_version: "Sie haben mir wieder mein Essen weggenommen.",
  usage: { calls_made: 1, input_tokens: 10, output_tokens: 20, latency_ms: 300, estimated_cost_usd: 0 },
};

/** A real element, so this keeps working if the card ever needs a hook. */
function render(where: WhereItHappens, lang = "en"): string {
  return renderToStaticMarkup(
    createElement(HandoffCard, {
      lang,
      where,
      chosen: null,
      onChoose: () => {},
      report: REPORT,
      loading: false,
      error: null,
      onRetry: null,
    }),
  );
}

/** Markup with HTML entities decoded enough to search for our own copy. */
function text(markup: string): string {
  return markup.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

test("at home, the family option is not in the markup, in any language", () => {
  for (const lang of ["en", "de", "hi"] as const) {
    const markup = text(render("home", lang));
    assert.ok(
      !markup.includes(STRINGS["handoff.family"][lang]),
      `${lang}: a family option reached the screen for "at home"`,
    );
    // The German label is printed alongside for the adult, so check it too.
    assert.ok(!markup.includes(STRINGS["handoff.family"].de), `${lang}: German family label present`);
  }
});

test("at home, the child is told why, in their language", () => {
  for (const lang of ["en", "de", "hi"] as const) {
    assert.ok(text(render("home", lang)).includes(STRINGS["handoff.homeNote"][lang]), lang);
  }
});

test("at school, the family option is offered and no note claims otherwise", () => {
  const markup = text(render("school"));
  assert.ok(markup.includes(STRINGS["handoff.family"].en));
  assert.ok(!markup.includes(STRINGS["handoff.homeNote"].en));
});

test("nothing is sent: the promise is on the screen, not available", () => {
  for (const where of ["school", "home", "online", "elsewhere"] as const) {
    assert.ok(text(render(where)).includes(STRINGS["handoff.youDecide"].en), where);
  }
});

test("the card has no way to send anything", () => {
  const markup = render("home").toLowerCase();
  for (const forbidden of ["mailto:", "<form", "type=\"submit\"", "sms:", "navigator.share"]) {
    assert.ok(!markup.includes(forbidden), `the card must not contain ${forbidden}`);
  }
});

test("the choice screen speaks only the child's language: no German on it", () => {
  // Issue #3 (Neel): one language per screen. The German is on the big card
  // that comes next, behind its language switch (HandoffShow.test.tsx).
  const markup = render("home", "hi");
  assert.ok(!markup.includes(REPORT.german_version));
  assert.ok(!markup.includes('lang="de"'));
  assert.ok(!markup.includes(STRINGS["handoff.socialWorker"].de));
  assert.ok(markup.includes(REPORT.child_version));
});

test("the card shows the child's own saved words before any summary", () => {
  const markup = renderToStaticMarkup(
    createElement(HandoffCard, {
      entries: [{ date: "2026-10-20", mood: "sad", text_child: "My own sentence.", text_de: "Mein eigener Satz." }],
      lang: "en",
      where: "school",
      chosen: null,
      onChoose: () => {},
      report: REPORT,
      loading: false,
      error: null,
      onRetry: null,
    }),
  );
  assert.ok(markup.includes("My own sentence."));
  assert.ok(!markup.includes(REPORT.child_version));
  assert.ok(!markup.includes("Mein eigener Satz."));
});

test("the card leads with one suggested adult", () => {
  // "Suggesting one trusted adult": the recipient line is filled in before the
  // child picks, so the card is never a blank thing to hold up.
  assert.ok(text(render("home")).includes(STRINGS["handoff.socialWorker"].en));
});
