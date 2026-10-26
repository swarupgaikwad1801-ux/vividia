/**
 * The picture questions keep the psychology rules in screens/PictureQuestions.tsx.
 *
 *   cd frontend
 *   node --import tsx --test src/screens/PictureQuestions.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  FeelQuestion,
  MoreQuestion,
  OftenQuestion,
  PictureReview,
  QUESTION_TITLES,
  WhatQuestion,
  WhereQuestion,
  WhoQuestion,
} from "./PictureQuestions.tsx";
import { NO_SAY, WHAT } from "../lib/pictures.ts";
import { LANGS, STRINGS } from "../lib/strings.ts";

const noop = () => {};
const QUESTIONS = [WhatQuestion, WhereQuestion, OftenQuestion, FeelQuestion];

function render(component: unknown, props: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(component as never, props as never));
}

function labelsInOrder(markup: string): string[] {
  return [...markup.matchAll(/<span class="leading-tight">([^<]*)<\/span>/g)].map((m) => m[1].replace(/&#x27;/g, "'"));
}

test("every question can be skipped, in every language", () => {
  for (const lang of LANGS) {
    for (const Q of QUESTIONS) {
      assert.ok(render(Q, { lang, value: [], onChange: noop, onNext: noop }).includes(STRINGS["q.skip"][lang]));
    }
    assert.ok(render(WhoQuestion, { lang, howMany: [], kind: [], onChange: noop, onNext: noop }).includes(STRINGS["q.skip"][lang]));
  }
});

test("nothing is pre-selected when a question opens", () => {
  for (const Q of QUESTIONS) {
    assert.doesNotMatch(render(Q, { lang: "en", value: [], onChange: noop, onNext: noop }), /checked=""/);
  }
  assert.doesNotMatch(render(WhoQuestion, { lang: "en", howMany: [], kind: [], onChange: noop, onNext: noop }), /checked=""/);
});

test("an answer given earlier is shown again when the child comes Back", () => {
  // The answers live in App.tsx and come back in as `value`.
  const markup = render(WhatQuestion, { lang: "en", value: ["names"], onChange: noop, onNext: noop });
  assert.match(markup, /checked="" value="names"/);
});

test("every question ends with 'Something else' then 'I don't want to say'", () => {
  for (const Q of [WhatQuestion, OftenQuestion, FeelQuestion]) {
    const labels = labelsInOrder(render(Q, { lang: "en", value: [], onChange: noop, onNext: noop }));
    assert.deepEqual(labels.slice(-2), [STRINGS["q.other"].en, STRINGS["q.noSay"].en], labels.join(" | "));
  }
  const where = labelsInOrder(render(WhereQuestion, { lang: "en", value: [], onChange: noop, onNext: noop }));
  assert.deepEqual(where.slice(-2), [STRINGS["pic.where.elsewhere"].en, STRINGS["q.noSay"].en]);
  const who = labelsInOrder(render(WhoQuestion, { lang: "en", howMany: [], kind: [], onChange: noop, onNext: noop }));
  assert.deepEqual(who.slice(-2), [STRINGS["pic.kind.other"].en, STRINGS["q.noSay"].en]);
});

test("the tiles on screen are in the fixed order, every time", () => {
  const first = labelsInOrder(render(WhatQuestion, { lang: "en", value: [], onChange: noop, onNext: noop }));
  const again = labelsInOrder(render(WhatQuestion, { lang: "en", value: ["hit"], onChange: noop, onNext: noop }));
  assert.deepEqual(first, again);
  assert.deepEqual(first.slice(0, WHAT.length), WHAT.map((c) => c.label.en));
});

test("no question is a yes/no question, and none asks why", () => {
  for (const key of QUESTION_TITLES) {
    const en = STRINGS[key].en;
    assert.match(en, /^(What|Where|Who|How)\b/, `${key} is not an open question: ${en}`);
    assert.doesNotMatch(en, /\bwhy\b/i);
    assert.doesNotMatch(STRINGS[key].de, /^(Hast|Bist|Hat|Wurdest|Warum)\b/);
  }
});

test("'hit' or 'threatened' shows the help panel on the check screen; other taps do not", () => {
  const danger = render(PictureReview, { lang: "en", choices: { what: ["threatened"] }, onSave: noop, onChange: noop, onNext: noop, onNeedHelp: noop });
  assert.ok(danger.includes(STRINGS["q.safety"].en));
  assert.ok(danger.includes(STRINGS["help.button"].en));
  const calm = render(PictureReview, { lang: "en", choices: { what: ["names"] }, onSave: noop, onChange: noop, onNext: noop, onNeedHelp: noop });
  assert.ok(!calm.includes(STRINGS["q.safety"].en));
});

test("the check screen shows the lines the card will carry, and offers nothing to save when empty", () => {
  const some = render(PictureReview, {
    lang: "en",
    choices: { what: ["names"], where: "schoolyard", often: "daily" },
    onSave: noop, onChange: noop, onNext: noop, onNeedHelp: noop,
  });
  assert.ok(some.includes("I was called names."));
  assert.ok(some.includes("Where: Schoolyard"));
  assert.ok(some.includes(STRINGS["approve.yes"].en));
  const none = render(PictureReview, { lang: "en", choices: { what: [] }, onSave: noop, onChange: noop, onNext: noop, onNeedHelp: noop });
  assert.ok(none.includes(STRINGS["q.review.nothing"].en));
  assert.ok(!none.includes(STRINGS["approve.yes"].en));
});

test("the end is a neutral thank you and an optional offer to write", () => {
  const markup = render(MoreQuestion, { lang: "en", onWrite: noop, onNoThanks: noop });
  assert.ok(markup.includes(STRINGS["q.thanks"].en));
  assert.ok(markup.includes(STRINGS["q.more.no"].en));
  assert.doesNotMatch(markup, /well done|good job|brave/i);
});

test("'I don't want to say' is a tile on every question", () => {
  for (const Q of QUESTIONS) {
    assert.match(render(Q, { lang: "en", value: [], onChange: noop, onNext: noop }), new RegExp(`value="${NO_SAY}"`));
  }
});
