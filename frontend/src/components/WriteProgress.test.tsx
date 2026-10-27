/**
 * The wait card's "how the check works" list: shown only when a real check is
 * running, and never dressed up as progress.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import WriteProgress from "./WriteProgress.tsx";
import type { EngineMode } from "../lib/engineMode.ts";
import { t } from "../lib/strings.ts";

function card(engine: EngineMode | undefined, lang = "en") {
  return renderToStaticMarkup(
    createElement(WriteProgress, { lang, elapsedMs: 4000, onStop: () => {}, engine }),
  );
}

test("with the live engine the card says how the check works, in every language", () => {
  for (const lang of ["en", "de", "hi"]) {
    const html = card("live", lang);
    for (const key of ["write.howTitle", "write.how1", "write.how2", "write.how3"] as const) {
      assert.ok(html.includes(t(key, lang)), `${lang} ${key}`);
    }
  }
});

test("in mock mode nothing is checked, so the list is not shown", () => {
  const html = card("mock");
  assert.ok(!html.includes(t("write.how1", "en")));
  assert.ok(html.includes(t("write.checking", "en")), "the wait itself is still shown");
});

test("the list is not progress: no ticks, no progressbar, no percentage", () => {
  const html = card("live");
  assert.ok(!html.includes("✓"));
  assert.ok(!html.includes('role="progressbar"'));
  assert.ok(!/\d+%/.test(html.replace(/width:\s*[\d.]+%/g, "")), "only the bar's own width may be a percentage");
});
