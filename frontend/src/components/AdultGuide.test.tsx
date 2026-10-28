/**
 * The adult's 5-minute guide (CLAUDE.md, journey step 4).
 *
 *   cd frontend
 *   node --import tsx --test src/components/AdultGuide.test.tsx
 *
 * Two kinds of test here, because two different things can break.
 *
 * Rendered: `renderToStaticMarkup` does not run effects, so what these see is
 * the component before its fetch resolves. That is exactly the state a judge
 * sees for the first moment, and it is where a leak would show.
 *
 * Read from source: the rules that matter most about this component are about
 * what it must NOT do - translate the guide itself, re-sort the ladder, or
 * render the one untranslated field. None of those are visible in the closed
 * state, so they are checked against the file, the way `Write.honesty.test.ts`
 * and `App.reachable.test.ts` do it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import AdultGuide from "./AdultGuide.tsx";
import HandoffShow from "./HandoffShow.tsx";
import { STRINGS, t } from "../lib/strings.ts";
import type { Entry } from "../types/api.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(HERE, "AdultGuide.tsx"), "utf-8");

/** The file with its comments removed, so an explanation never counts as code. */
function code(): string {
  return SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
}

const ENTRIES: Entry[] = [
  { date: "2026-10-20", mood: "sad", text_child: "They took my lunch again.", text_de: "Sie haben mir wieder mein Essen weggenommen." },
];

test("the open line leads in the card's language and repeats in the child's", () => {
  // Review, 28 Oct: the heading stayed English on a German card. The adult
  // reads the card's language first; the child still has to know what they
  // are opening, so their language follows, small.
  const html = renderToStaticMarkup(createElement(AdultGuide, { showing: "de", lang: "hi" }));
  const german = html.indexOf(STRINGS["guide.open"].de);
  const hinglish = html.indexOf(t("guide.open", "hi"));
  assert.ok(german >= 0, "the card's language should lead");
  assert.ok(hinglish > german, "the child's language should follow it");

  const same = renderToStaticMarkup(createElement(AdultGuide, { showing: "en", lang: "en" }));
  assert.equal(same.split(t("guide.open", "en")).length - 1, 1, "said once when both are the same");
});

test("nothing of the guide is on screen before it has loaded", () => {
  const html = renderToStaticMarkup(createElement(AdultGuide, { showing: "de", lang: "en" }));

  assert.ok(html.includes(t("guide.loading", "de")), "the open state should say it is loading, to the reader");
  assert.ok(!html.includes("<ol"), "no steps should be rendered before the response arrives");
  assert.ok(!html.includes(t("guide.failed", "de")), "it must not claim failure before it has tried");
});

test("the big card mounts it, so the Must is actually met", () => {
  // The failure mode this guards is the one that hit the demo button twice:
  // a component that is written, tested and imported by nobody.
  const html = renderToStaticMarkup(
    createElement(HandoffShow, {
      lang: "en",
      entries: ENTRIES,
      report: null,
      where: "school",
      chosen: "socialWorker",
      onDone: () => {},
    }),
  );

  assert.ok(html.includes(t("guide.open", "en")), "HandoffShow should render the adult guide");
  assert.ok(
    html.includes(ENTRIES[0].text_child),
    "the child's own words must still be on the card, above the guide",
  );
});

test("the guide's own text is never run through t()", () => {
  // `title`, `steps`, `footer` and the ladder arrive already translated, in
  // whichever of de/en the server served. Passing any of them to `t()` would
  // be a lookup miss at best and the wrong language at worst.
  for (const field of ["title", "footer", "checked_on"]) {
    assert.ok(
      !new RegExp(`t\\(\\s*(data|response)\\.${field}`).test(code()),
      `data.${field} is being passed through t(); it is already translated`,
    );
  }
});

test("the element carries the language that was served, not the one we asked for", () => {
  // The guide exists in de and en only. A child writing Hinglish hands the
  // phone to someone who reads German, so `showing` and `data.lang` differ and
  // a screen reader needs the real one.
  assert.match(
    code(),
    /lang=\{data\.lang\}/,
    "the guide's <article> must set lang from the response, not from `showing`",
  );
});

test("the ladder is rendered in the order it arrived", () => {
  // The order is the content: a child who has already been to the head of year
  // must never be sent back to their form teacher.
  assert.ok(
    !/ladder[\s\S]{0,80}\.sort\(/.test(code()),
    "the ladder must never be re-sorted",
  );
});

test("the one untranslated field is not rendered", () => {
  // `home_rule` is a single English string in content/adult_guide.json, served
  // as-is for `lang=de`. Rendering it would put an English sentence in the
  // middle of a German guide. The rule it states is enforced in code, by
  // `suggestedAdults()` / `familyExcluded()`. Delete this test when the
  // content file gains a `de` and the field is rendered on purpose.
  assert.ok(
    !code().includes("home_rule"),
    "home_rule has no German; it must not be rendered until it does",
  );
});
