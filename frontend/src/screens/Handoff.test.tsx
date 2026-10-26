/**
 * A smoke test for the screen, because nothing imports it yet.
 *
 * Vernika wires screens into App.tsx herself, so this file is the only thing
 * that proves Handoff.tsx actually renders rather than merely type-checks: it
 * asks the "where" question first, and offers nobody until that is answered.
 *
 * NOT RUN BY `npm test` YET - the script in frontend/package.json globs
 * `src/lib/**` only. Run it by hand:
 *
 *   cd frontend
 *   node --import tsx --test src/screens/Handoff.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Handoff, { type HandoffProps } from "./Handoff.tsx";
import { STRINGS } from "../lib/strings.ts";

/**
 * A real element, not a call to the function: the screen uses hooks, and those
 * need a renderer to be mounted in. `useEffect` does not run in a static
 * render, which is why the offline listener is not exercised here.
 */
function render(props: HandoffProps): string {
  return renderToStaticMarkup(createElement(Handoff, props));
}

test("step one asks where, and suggests nobody yet", () => {
  const markup = render({ lang: "en" });
  assert.ok(markup.includes(STRINGS["where.title"].en));
  assert.ok(markup.includes(STRINGS["where.home"].en));
  // The order is the safety feature: no adult may be offered before the place
  // is known, because the place is what decides who may be offered.
  assert.ok(!markup.includes(STRINGS["handoff.family"].en));
  assert.ok(!markup.includes(STRINGS["handoff.classTeacher"].en));
});

test("a remembered answer of 'home' goes straight to a card with no family", () => {
  const markup = render({ lang: "en", initialWhere: "home" });
  assert.ok(markup.includes(STRINGS["handoff.youDecide"].en));
  assert.ok(markup.includes(STRINGS["handoff.homeNote"].en));
  assert.ok(!markup.includes(STRINGS["handoff.family"].en));
});

test("a remembered answer we do not recognise asks the question again", () => {
  // Rather than guessing, which is how a family member would get suggested.
  const markup = render({ lang: "en", initialWhere: "the bus" });
  assert.ok(markup.includes(STRINGS["where.title"].en));
});

test("with no report yet, the card says so instead of showing an empty card", () => {
  const markup = render({ lang: "en", initialWhere: "school" });
  assert.ok(markup.includes(STRINGS["timeline.empty"].en));
});

test("an error shows the child-safe message, never a code", () => {
  const markup = render({ lang: "en", initialWhere: "school", error: STRINGS["errors.generic"].en });
  assert.ok(markup.includes(STRINGS["errors.generic"].en));
  assert.ok(!markup.includes("upstream_"));
});

