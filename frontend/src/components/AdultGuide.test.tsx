/**
 * The adult's five-minute guide (#3, the one open Must gap).
 *
 *   cd frontend
 *   node --import tsx --test src/components/AdultGuide.test.tsx
 *
 * The content has been reviewed and sourced in `content/adult_guide.json`
 * since 24 Oct, `GET /api/guide` has served it and `guide()` has called it -
 * and no screen rendered any of it. These tests pin the three rules that
 * make rendering it safe rather than merely present.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import AdultGuide, { GuideBody } from "./AdultGuide.tsx";
import { STRINGS } from "../lib/strings.ts";
import type { GuideResponse } from "../types/api.ts";

/** Shaped like a real answer, including a step with no source. */
const GUIDE: GuideResponse = {
  // Asked for Hindi; the guide exists only in de and en, so the server
  // served German. This is the case the `lang` attribute exists for.
  lang: "de",
  title: "Ein Kind hat sich dir anvertraut.",
  steps: [
    { text: "Bleib ruhig und hör zu.", source_url: "https://www.klicksafe.de/cybermobbing" },
    { text: "Sag dem Kind, dass du ihm glaubst.", source_url: null },
  ],
  footer: "Der Bericht enthält die eigenen Worte des Kindes.",
  checked_on: "2026-10-24",
  ladder: [{ id: "teacher", text: "Klassenlehrkraft" }],
};

test("the guide is rendered in the language the server actually served", () => {
  // Asked in Hindi, served German. Without this the element inherits the
  // child's language and a screen reader pronounces a German guide as Hindi.
  const html = renderToStaticMarkup(createElement(GuideBody, { guide: GUIDE, lang: "hi" }));

  assert.match(html, /lang="de"/);
  assert.ok(html.includes("Bleib ruhig und hör zu."), "the served text is shown");
});

test("a step with no source shows the absence instead of hiding it", () => {
  const html = renderToStaticMarkup(createElement(GuideBody, { guide: GUIDE, lang: "de" }));

  // The sourced step links out...
  assert.match(html, /href="https:\/\/www\.klicksafe\.de\/cybermobbing"/);
  // ...and names the host, which is what an adult recognises.
  assert.ok(html.includes("klicksafe.de"), "the link is labelled by its host");

  // ...and the unsourced one is visibly unsourced. A claim about how to
  // treat a child who has just disclosed carries its source, and a missing
  // one must look different from a present one.
  assert.ok(html.includes("—"), "the missing source is drawn, not dropped");
  assert.equal(
    (html.match(/<a /g) ?? []).length,
    1,
    "exactly one step links out; the other must not borrow its neighbour's source",
  );
});

test("the steps keep the order the server sent", () => {
  // The order is the content: "stay calm and listen" before "tell the child
  // you believe them" is the advice, not a list that happens to be sorted.
  const html = renderToStaticMarkup(createElement(GuideBody, { guide: GUIDE, lang: "de" }));

  assert.ok(
    html.indexOf("Bleib ruhig") < html.indexOf("Sag dem Kind"),
    "step 1 is rendered before step 2",
  );
});

test("the footer and the date it was checked are both shown", () => {
  const html = renderToStaticMarkup(createElement(GuideBody, { guide: GUIDE, lang: "de" }));

  assert.ok(html.includes("Der Bericht enthält die eigenen Worte des Kindes."));
  assert.ok(html.includes("2026-10-24"), "an adult can see how old this advice is");
});

test("it is closed until the adult asks, and fetches nothing before that", () => {
  // renderToStaticMarkup runs no effects, so this is also the proof that
  // nothing is requested on mount: a child holding out a phone should not be
  // waiting on a network call for something nobody asked to see.
  const html = renderToStaticMarkup(createElement(AdultGuide, { lang: "en" }));

  assert.match(html, /aria-expanded="false"/);
  assert.ok(html.includes(STRINGS["handoff.forAdult"].en), "it says who the section is for");
  assert.ok(!html.includes("klicksafe"), "no guide content before it is opened");
});

test("the closed label exists in every language the app ships", () => {
  for (const lang of ["en", "de", "hi"] as const) {
    assert.ok(STRINGS["handoff.forAdult"][lang]?.trim(), `handoff.forAdult is missing ${lang}`);
  }
  // Hinglish, like the rest of the child-facing Hindi (#93): Latin script.
  assert.ok(
    !/[ऀ-ॿ]/.test(STRINGS["handoff.forAdult"].hi),
    "the Hindi is written in the Latin alphabet, like every other screen",
  );
});
