/**
 * The app has to say when it is not actually translating.
 *
 * `ENGINE_MODE` defaults to "mock". A backend started without it answers from
 * `engine/mock.py`, which ignores the child's text and returns one fixed
 * German sentence about a bag being taken - under "The checks agreed 82%" and
 * "11 checks", both constants in that file.
 *
 * Found by Swarup running the app locally: he typed "I dont feel good" and the
 * screen showed it beside "Sie haben mir wieder meine Tasche weggenommen und
 * alle haben über mich gelacht", then asked him to confirm what he meant by
 * "laughed at me" - a phrase he never wrote. Nothing on the page said it was
 * an example.
 *
 * That is worse than an error. An error is honest, and this app's one promise
 * is that the German says what the child said.
 *
 * Static markup (`renderToStaticMarkup`), like WriteClarify.test.tsx.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ExampleModeBanner from "./ExampleModeBanner.tsx";
import WriteResult from "./WriteResult.tsx";
import type { EngineMode } from "../lib/engineMode.ts";
import { t } from "../lib/strings.ts";

const LANGS = ["en", "de", "hi"];

function banner(engine: EngineMode, lang = "en") {
  return renderToStaticMarkup(createElement(ExampleModeBanner, { lang, engine }));
}

/** Exactly what engine/mock.py returns, so the test breaks if the mock changes. */
const MOCK_RESULT = {
  translation: "Sie haben mir wieder meine Tasche weggenommen und alle haben über mich gelacht.",
  confidence: 0.82,
  ambiguities: [],
  safety: { urgent: false, category: "none" as const, message_child: "" },
  strategy_used: "adaptive" as const,
  usage: {
    calls_made: 11,
    input_tokens: 0,
    output_tokens: 0,
    latency_ms: 1505,
    estimated_cost_usd: 0,
  },
};

function resultCard(engine: EngineMode, lang = "en") {
  return renderToStaticMarkup(
    createElement(WriteResult, {
      lang,
      childText: "I dont feel good",
      result: MOCK_RESULT,
      decidedByChild: false,
      engine,
    }),
  );
}

// --- the banner --------------------------------------------------------------

test("in mock mode the app says so", () => {
  const html = banner("mock");
  assert.ok(html.includes(t("example.title", "en")));
  assert.ok(html.includes(t("example.body", "en")));
});

test("in live mode it says nothing at all", () => {
  assert.equal(banner("live"), "");
});

test("an unreachable backend is not called an example", () => {
  // "unknown" means the health check failed, which is a different thing.
  // Claiming example mode there would be its own lie, and the translate call
  // will fail on its own and say so properly.
  assert.equal(banner("unknown"), "");
});

test("it is written in every language we ship", () => {
  for (const lang of LANGS) {
    assert.ok(banner("mock", lang).includes(t("example.body", lang)), lang);
  }
  // Not an English fallback wearing another language's name.
  assert.notEqual(t("example.body", "de"), t("example.body", "en"));
  assert.notEqual(t("example.body", "hi"), t("example.body", "en"));
});

test("the Hindi speaks to the child as तुम", () => {
  const hi = t("example.body", "hi") + " " + t("example.resultNote", "hi");
  assert.ok(hi.includes("तुम"));
  assert.ok(!/(?:^|\s)आप(?:का|की|के|को|से|ने)?(?:\s|।|$)/.test(hi));
});

// --- the result card ---------------------------------------------------------

test("in mock mode the agreement score is replaced, not shown", () => {
  const html = resultCard("mock");
  assert.ok(!html.includes("82%"), "a percentage nobody measured must not appear");
  assert.ok(!html.includes("11"), "nor the invented check count");
  assert.ok(html.includes(t("example.resultNote", "en")));
});

test("in live mode the score is exactly as before", () => {
  const html = resultCard("live");
  assert.ok(html.includes("82%"));
  assert.ok(html.includes(t("write.agreementNote", "en")));
  assert.ok(!html.includes(t("example.resultNote", "en")));
});

test("an unspecified engine behaves as before, so no caller breaks", () => {
  const html = renderToStaticMarkup(
    createElement(WriteResult, {
      lang: "en",
      childText: "I dont feel good",
      result: MOCK_RESULT,
      decidedByChild: false,
    }),
  );
  assert.ok(html.includes("82%"));
});

test("the child's own words survive either way", () => {
  // The left column is the one thing that is never an example.
  for (const engine of ["mock", "live"] as const) {
    assert.ok(resultCard(engine).includes("I dont feel good"));
  }
});
