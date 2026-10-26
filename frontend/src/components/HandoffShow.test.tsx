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

import HandoffShow from "./HandoffShow.tsx";
import HandoffDone from "../screens/HandoffDone.tsx";
import Handoff from "../screens/Handoff.tsx";
import { STRINGS } from "../lib/strings.ts";
import type { ReportResponse } from "../types/api.ts";

const REPORT: ReportResponse = {
  child_version: "They took my lunch again.",
  german_version: "Sie haben mir wieder mein Essen weggenommen.",
  usage: { calls_made: 3, latency_ms: 900 } as ReportResponse["usage"],
};

const noop = () => {};

test("the big card leads with the German and names the person in German", () => {
  const markup = renderToStaticMarkup(
    createElement(HandoffShow, { lang: "en", report: REPORT, where: "school", chosen: "socialWorker", onDone: noop }),
  );
  assert.ok(markup.includes(STRINGS["handoff.showThem"].en));
  assert.ok(markup.includes(REPORT.german_version));
  assert.ok(markup.includes(STRINGS["handoff.socialWorker"].de));
  assert.ok(markup.indexOf(REPORT.german_version) < markup.indexOf(REPORT.child_version), "German first");
  assert.ok(markup.includes('lang="de"'));
});

test("for a German-speaking child the big card does not print the same words twice", () => {
  const markup = renderToStaticMarkup(
    createElement(HandoffShow, { lang: "de", report: REPORT, where: "school", chosen: null, onDone: noop }),
  );
  assert.ok(!markup.includes(REPORT.child_version));
});

test("the big card never offers family when it happens at home", () => {
  const markup = renderToStaticMarkup(
    createElement(HandoffShow, { lang: "en", report: REPORT, where: "home", chosen: "family", onDone: noop }),
  );
  assert.ok(!markup.includes(STRINGS["handoff.family"].de));
});

test("the done screen says the app will ask, and has a way home", () => {
  for (const lang of ["en", "de", "hi"] as const) {
    const markup = renderToStaticMarkup(createElement(HandoffDone, { lang, onHome: noop }));
    assert.ok(markup.includes(STRINGS["handoff.checkLater"][lang]), lang);
    assert.ok(markup.includes(STRINGS["handoff.done"][lang]), lang);
  }
});

test("Next on the handoff card appears only when there is a card to show", () => {
  const next = STRINGS["nav.next"].en;
  const withReport = renderToStaticMarkup(
    createElement(Handoff, { lang: "en", initialWhere: "school", report: REPORT, onNext: noop }),
  );
  assert.ok(withReport.includes(next));

  const noReport = renderToStaticMarkup(createElement(Handoff, { lang: "en", initialWhere: "school", onNext: noop }));
  assert.ok(!noReport.includes(next));
});

test("a remembered adult is kept when the place is remembered too", () => {
  // Back from the big card must not reset the child's choice.
  const markup = renderToStaticMarkup(
    createElement(Handoff, { lang: "en", initialWhere: "school", initialAdult: "socialWorker", report: REPORT }),
  );
  assert.match(markup, /checked="" value="socialWorker"/);
  assert.equal(markup.match(/checked=""/g)?.length, 1);
});
