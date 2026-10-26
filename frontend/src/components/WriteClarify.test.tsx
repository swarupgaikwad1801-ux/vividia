/**
 * One "something else", and it is the engine's.
 *
 * Found in Neel's review of #53. The engine appends its own third option to
 * every ambiguity, already in the child's language
 * (`engine/clarify_text.py` -> `other_option`), and this component appended a
 * second one of its own. The child saw the same choice twice, and picking the
 * engine's one was sent to /api/clarify as though "other" were a meaning.
 *
 * Two readings are a trap when neither is what happened, so the third option
 * matters - it is the only answer that is really the child's. Which is why
 * there has to be exactly one of it, unmistakable.
 *
 * Static markup only (`renderToStaticMarkup`), the same approach as
 * HandoffCard.test.tsx: no DOM and nothing new in the lock file.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import WriteClarify, { OTHER_ID } from "./WriteClarify.tsx";

/** As the engine sends it: two readings, then its own third option. */
const AMBIGUITY = {
  phrase: "get me",
  question: "What did he mean?",
  options: [
    { id: "opt0", label: "He will hurt me", meaning_de: "mich fertigmachen" },
    { id: "opt1", label: "He will pick me up", meaning_de: "mich abholen" },
    { id: OTHER_ID, label: "Something else — I'll explain", meaning_de: "" },
  ],
  severity: "critical" as const,
};

function render(choices: Record<string, string> = {}) {
  return renderToStaticMarkup(
    createElement(WriteClarify, {
      lang: "en",
      ambiguities: [AMBIGUITY],
      choices,
      onChoose: () => {},
      onSubmit: () => {},
      onRewrite: () => {},
    }),
  );
}

test("the engine's third option is offered exactly once", () => {
  const html = render();
  const radios = html.match(/value="other"/g) ?? [];

  assert.equal(
    radios.length,
    1,
    `expected one "other" radio, found ${radios.length}. Two of them means ` +
      `the child is asked the same thing twice, and the component is adding ` +
      `one the engine already sent.`,
  );
});

test("the component invents no option of its own", () => {
  const html = render();

  assert.ok(
    !html.includes("__something_else__"),
    "the old locally-invented id is still being rendered",
  );
  // Every radio on screen must be one the engine sent.
  const values = [...html.matchAll(/<input[^>]*value="([^"]*)"/g)].map((m) => m[1]);
  const sent = AMBIGUITY.options.map((o) => o.id);
  for (const value of values) {
    assert.ok(
      sent.includes(value),
      `rendered an option the engine never sent: ${value}`,
    );
  }
});

/** renderToStaticMarkup escapes the markup it produces, so a label with an
 *  apostrophe arrives as `I&#x27;ll`. Compare like for like rather than
 *  loosening the assertion - a test that searched for a fragment would stop
 *  catching a label that went missing. */
function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

test("all three readings reach the child", () => {
  const html = render();

  for (const option of AMBIGUITY.options) {
    assert.ok(
      html.includes(escapeHtml(option.label)),
      `option missing from the question: ${option.label}`,
    );
  }
});

test("choosing 'other' offers the way back to the child's own words", () => {
  const html = render({ "get me": OTHER_ID });

  assert.ok(
    html.toLowerCase().includes("button"),
    "picking 'neither of those' must lead somewhere, not dead-end",
  );
});
