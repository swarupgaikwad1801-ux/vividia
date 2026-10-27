/**
 * Tests for the "Help Kim" story.
 *
 * The ones that matter: nothing about Kim is saved, sent or carried into the
 * child's own entry, and the calm answer is always on offer.
 *
 * Run:
 *   node --import tsx --test frontend/src/lib/story.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HELP_CHOICES,
  SCENES,
  START,
  happeningKey,
  hardDay,
  helpKey,
  reduce,
  replyKey,
  sceneKey,
  type Action,
  type Story,
} from "./story.ts";
import { LANGS, STRINGS, type StringKey } from "./strings.ts";

function run(...actions: Action[]): Story {
  return actions.reduce(reduce, START);
}

const calmDay: Action[] = [
  { type: "start" },
  ...SCENES.map((): Action => ({ type: "pick", happening: "nothing" })),
];

const hardDayActions: Action[] = [
  { type: "start" },
  { type: "pick", happening: "names" },
  { type: "pick", happening: "nothing" },
  { type: "pick", happening: "hit" },
  { type: "pick", happening: "online" },
];

test("every scene offers 'nothing bad' first", () => {
  for (const scene of SCENES) assert.equal(scene.options[0], "nothing", scene.id);
});

test("a calm day goes straight on to the question, without 'what could help'", () => {
  const end = run(...calmDay);
  assert.deepEqual(end.step, { kind: "dayEnd" });
  assert.equal(hardDay(end.picks), false);
  assert.equal(reduce(end, { type: "help", choice: "teacher" }), end, "no help step on a calm day");
  assert.deepEqual(reduce(end, { type: "next" }).step, { kind: "bridge" });
});

test("a hard day asks what could help, and every answer gets a reply", () => {
  const end = run(...hardDayActions);
  assert.deepEqual(end.step, { kind: "dayEnd" });
  assert.equal(reduce(end, { type: "next" }), end, "the help question can't be skipped by a stray tap");
  for (const choice of HELP_CHOICES) {
    const reply = reduce(end, { type: "help", choice });
    assert.deepEqual(reply.step, { kind: "helpReply", choice });
    assert.deepEqual(reduce(reply, { type: "next" }).step, { kind: "bridge" });
  }
});

test("Kim's picks are dropped at the question, whatever the child answers", () => {
  const bridge = run(...hardDayActions, { type: "help", choice: "keep" }, { type: "next" });
  assert.equal(bridge.picks.length, SCENES.length);

  const told = reduce(bridge, { type: "tell" });
  assert.deepEqual(told.step, { kind: "how" });
  assert.deepEqual(told.picks, [], "the child's own entry must start empty, not from Kim's day");

  const notNow = reduce(bridge, { type: "notNow" });
  assert.deepEqual(notNow.step, { kind: "notNow" });
  assert.deepEqual(notNow.picks, []);
});

test("an option that isn't in the scene is ignored, and a double tap never skips a scene", () => {
  const first = run({ type: "start" });
  assert.equal(reduce(first, { type: "pick", happening: "online" }), first, "'online' is not on the way to school");

  const second = reduce(first, { type: "pick", happening: "pushed" });
  assert.deepEqual(second.step, { kind: "scene", index: 1 });
  assert.equal(second.picks.length, 1);
});

test("restart always goes back to the beginning", () => {
  assert.deepEqual(run(...hardDayActions, { type: "restart" }), START);
});

test("every story text exists in English, German and Hindi", () => {
  const keys: StringKey[] = [
    ...SCENES.map((scene) => sceneKey(scene.id)),
    ...SCENES.flatMap((scene) => scene.options.map(happeningKey)),
    ...HELP_CHOICES.flatMap((choice) => [helpKey(choice), replyKey(choice)]),
  ];
  for (const key of keys) {
    const entry = (STRINGS as Record<string, Record<string, string>>)[key];
    assert.ok(entry, `missing ${key}`);
    for (const lang of LANGS) assert.ok(entry[lang]?.trim(), `${key} has no ${lang}`);
  }
});

test("Kim stays gender-neutral", () => {
  const story = Object.entries(STRINGS).filter(([key]) => key.startsWith("story."));
  for (const [key, text] of story) {
    assert.doesNotMatch(text.en, /\b(he|she|him|her|his|hers)\b/i, `${key} en`);
    // Not bare "sein": it is also the verb "to be" ("wie bei Kim sein").
    assert.doesNotMatch(text.de, /\b(er|sie|ihn|ihm|seine[mnrs]?|ihre[mnrs]?)\b/, `${key} de`);
    // Hindi verbs and adjectives that would give Kim a gender, in the Latin
    // script the screens use. Matching only Devanagari would pass Hinglish
    // without checking it.
    assert.doesNotMatch(text.hi, /[ऀ-ॿ]/, `${key} hi is Hinglish`);
    assert.doesNotMatch(text.hi, /\b(naya|nayi|nai|gaya|gayi|akela|akeli|ladka|ladki|chahta|chahti)\b/i, `${key} hi`);
  }
});

test("the story module cannot save or send anything", () => {
  const source = readFileSync(new URL("./story.ts", import.meta.url), "utf8");
  const imports = [...source.matchAll(/^import .* from "(.+)";$/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["./strings.ts"]);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\(/);
});
