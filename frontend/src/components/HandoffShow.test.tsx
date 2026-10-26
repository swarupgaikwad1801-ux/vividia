/**
 * The handoff ending (issue #3): Next on the card, the big card, and done.
 *
 *   cd frontend
 *   node --import tsx --test src/components/HandoffShow.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import HandoffShow, { type HandoffShowProps } from "./HandoffShow.tsx";
import CardLanguageSwitch from "./CardLanguageSwitch.tsx";
import HandoffDone from "../screens/HandoffDone.tsx";
import Handoff from "../screens/Handoff.tsx";
import { STRINGS } from "../lib/strings.ts";
import type { Entry, ReportResponse } from "../types/api.ts";

const REPORT: ReportResponse = {
  child_version: "Something happened at school. (summary)",
  german_version: "In der Schule ist etwas passiert. (Zusammenfassung)",
  usage: { calls_made: 1, input_tokens: 10, output_tokens: 20, latency_ms: 300, estimated_cost_usd: 0 },
};

const ENTRIES: Entry[] = [
  { date: "2026-10-20", mood: "sad", text_child: "They took my lunch again.", text_de: "Sie haben mir wieder mein Essen weggenommen." },
  { date: "2026-10-22", mood: "scared", text_child: "Everyone laughed at me.", text_de: "Alle haben mich ausgelacht." },
];

const noop = () => {};

function show(props: Partial<HandoffShowProps> = {}): string {
  return renderToStaticMarkup(
    createElement(HandoffShow, {
      lang: "en",
      entries: ENTRIES,
      report: REPORT,
      where: "school",
      chosen: "socialWorker",
      onDone: noop,
      ...props,
    }),
  );
}

test("the big card starts in the child's language, with no German on screen", () => {
  const markup = show();
  assert.ok(markup.includes(STRINGS["handoff.showThem"].en));
  for (const entry of ENTRIES) {
    assert.ok(markup.includes(entry.text_child));
    assert.ok(!markup.includes(entry.text_de), "German only after the adult taps");
  }
  assert.ok(markup.includes(STRINGS["handoff.socialWorker"].en));
  assert.ok(!markup.includes(STRINGS["handoff.socialWorker"].de));
});

test("the big card shows the child's own entries, not the model's summary", () => {
  const markup = show();
  assert.ok(!markup.includes(REPORT.child_version));
});

test("with no entries, the big card falls back to the approved report", () => {
  assert.ok(show({ entries: [] }).includes(REPORT.child_version));
});

test("the switch offers the child's language and Auf Deutsch, starting on the child's", () => {
  const markup = renderToStaticMarkup(createElement(CardLanguageSwitch, { lang: "hi", showing: "hi", onChange: noop }));
  assert.ok(markup.includes(STRINGS["lang.hi"].hi));
  assert.ok(markup.includes(STRINGS["card.german"].hi));
  assert.match(markup, /lang="hi" aria-pressed="true"/);
  assert.match(markup, /lang="de" aria-pressed="false"/);
});

test("a German-speaking child gets no switch: there is only one language", () => {
  assert.equal(renderToStaticMarkup(createElement(CardLanguageSwitch, { lang: "de", showing: "de", onChange: noop })), "");
  const markup = show({ lang: "de" });
  assert.ok(markup.includes(ENTRIES[0].text_de));
  assert.ok(!markup.includes(STRINGS["card.german"].de));
});

test("the big card never offers family when it happens at home", () => {
  assert.ok(!show({ where: "home", chosen: "family" }).includes(STRINGS["handoff.family"].en));
});

test("the done screen says the app will ask, and has a way home", () => {
  for (const lang of ["en", "de", "hi"] as const) {
    const markup = renderToStaticMarkup(createElement(HandoffDone, { lang, onHome: noop }));
    assert.ok(markup.includes(STRINGS["handoff.checkLater"][lang]), lang);
    assert.ok(markup.includes(STRINGS["handoff.done"][lang]), lang);
  }
});

test("Next on the handoff card appears only when there is something to show", () => {
  const next = STRINGS["nav.next"].en;
  const withReport = renderToStaticMarkup(
    createElement(Handoff, { lang: "en", initialWhere: "school", report: REPORT, onNext: noop }),
  );
  assert.ok(withReport.includes(next));

  const withEntries = renderToStaticMarkup(
    createElement(Handoff, { lang: "en", initialWhere: "school", entries: ENTRIES, onNext: noop }),
  );
  assert.ok(withEntries.includes(next));

  const nothing = renderToStaticMarkup(createElement(Handoff, { lang: "en", initialWhere: "school", onNext: noop }));
  assert.ok(!nothing.includes(next));
});

test("a remembered adult is kept when the place is remembered too", () => {
  // Back from the big card must not reset the child's choice.
  const markup = renderToStaticMarkup(
    createElement(Handoff, { lang: "en", initialWhere: "school", initialAdult: "socialWorker", report: REPORT }),
  );
  assert.match(markup, /checked="" value="socialWorker"/);
  assert.equal(markup.match(/checked=""/g)?.length, 1);
});
