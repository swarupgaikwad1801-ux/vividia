/**
 * The picture questions keep the psychology rules in screens/PictureQuestions.tsx.
 *
 *   cd frontend
 *   node --import tsx --test src/screens/PictureQuestions.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
import CheckIn from "./CheckIn.tsx";
import { NO_SAY, WHAT, WHERE } from "../lib/pictures.ts";
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

test("'hit' or 'threatened' shows no emergency message in the screen: Need help pulses instead", () => {
  // Neel, 26 Oct: "remove the emergency message". The red Need help button
  // in the top bar (every screen) pulses on danger; that happens in an effect,
  // so it is not in this static markup.
  const danger = render(PictureReview, { lang: "en", choices: { what: ["threatened"] }, onSave: noop, onChange: noop, onNext: noop });
  assert.ok(!danger.includes(STRINGS["help.dangerLineNoNumber"].en));
  assert.doesNotMatch(danger, /role="alert"/);
  assert.ok(!danger.includes(STRINGS["help.title"].en), "the full help list is not inline");
});

test("the check screen shows the lines the card will carry, and offers nothing to save when empty", () => {
  const some = render(PictureReview, {
    lang: "en",
    choices: { what: ["names"], where: "schoolyard", often: "daily" },
    onSave: noop, onChange: noop, onNext: noop,
  });
  assert.ok(some.includes("I was called names."));
  assert.ok(some.includes("Where: Schoolyard"));
  assert.ok(some.includes(STRINGS["approve.yes"].en));
  const none = render(PictureReview, { lang: "en", choices: { what: [] }, onSave: noop, onChange: noop, onNext: noop });
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

// --- the action bar and the card states (#3, patterns 2 and 3) ---------------------

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

/** The Next button's opening tag: the last button in the rendered bar. */
function nextButton(markup: string): string {
  const bar = markup.slice(markup.indexOf("data-action-bar"));
  return [...bar.matchAll(/<button[^>]*>/g)].at(-1)![0];
}

test("Skip and Next sit in one bar fixed to the bottom, Skip first, as the child sees them", () => {
  const markup = render(WhereQuestion, { lang: "en", value: [], onChange: noop, onNext: noop });
  const bar = markup.slice(markup.indexOf("data-action-bar"));
  assert.match(markup, /data-action-bar="true" class="fixed inset-x-0 bottom-0 z-20 /);
  assert.ok(bar.indexOf(STRINGS["q.skip"].en) < bar.indexOf(STRINGS["nav.next"].en));
  assert.match(bar, /env\(safe-area-inset-bottom\)/);
});

test("before a pick, Next is a quiet, disabled button that says why; after one, the bold one", () => {
  const before = nextButton(render(WhereQuestion, { lang: "en", value: [], onChange: noop, onNext: noop }));
  assert.match(before, /disabled=""/);
  assert.match(before, /aria-describedby="q-where-hint"/);
  assert.match(before, /border-line/);
  assert.doesNotMatch(before, /bg-calm/);

  const after = nextButton(render(WhereQuestion, { lang: "en", value: [WHERE[0].code], onChange: noop, onNext: noop }));
  assert.doesNotMatch(after, /disabled|aria-describedby/);
  assert.match(after, /bg-calm text-page/);
});

test("the hint Next points at is on the screen", () => {
  const markup = render(WhereQuestion, { lang: "en", value: [], onChange: noop, onNext: noop });
  assert.match(markup, new RegExp(`<p id="q-where-hint"[^>]*>${STRINGS["q.pickOne"].en}</p>`));
});

test("the bar stays under the danger pop-up and the top bar with Need help and Leave now", () => {
  const z = (text: string, re: RegExp) => Number(re.exec(text)![1]);
  const bar = z(source("./PictureQuestions.tsx"), /fixed inset-x-0 bottom-0 z-(\d+)/);
  assert.ok(bar < z(source("../components/DangerDialog.tsx"), /fixed inset-0 z-(\d+)/));
  assert.ok(bar < z(source("../components/QuickExitButton.tsx"), /sticky top-0 z-(\d+)/));
});

test("a picked tile has the outline, the fill and a check mark; an unpicked one is a thin line", () => {
  const markup = render(WhereQuestion, { lang: "en", value: [WHERE[0].code], onChange: noop, onNext: noop });
  const labels = [...markup.matchAll(/<label[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/label>/g)];
  const picked = labels.filter((m) => /checked=""/.test(m[2]));
  const unpicked = labels.filter((m) => !/checked=""/.test(m[2]));
  assert.equal(picked.length, 1);
  assert.match(picked[0][1], /border-calm bg-calm-soft/);
  assert.match(picked[0][2], /✓/);
  for (const m of unpicked) {
    assert.match(m[1], /border-2 border-b-4 border-line bg-surface/);
    assert.doesNotMatch(m[2], /✓/);
  }
});

test("tiles and mood faces press down only when motion is allowed", () => {
  const tiles = render(WhereQuestion, { lang: "en", value: [], onChange: noop, onNext: noop });
  const faces = render(CheckIn, { lang: "en", onChoose: noop });
  for (const markup of [tiles, faces]) {
    assert.match(markup, /motion-safe:active:translate-y-0\.5/);
    assert.doesNotMatch(markup, /(?<!motion-safe:)active:translate/);
  }
});
