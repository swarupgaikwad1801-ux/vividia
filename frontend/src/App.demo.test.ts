/**
 * "Try Amara's story" has a door, and her English sentence is sent as English.
 *
 * CLAUDE.md's judging notes: make it super easy to try, a pre-filled demo a
 * judge just presses send on. `DemoButton` existed for days with nothing
 * mounting it. Same trade as `App.reachable.test.ts`: a regex over the
 * source, no DOM, and it fails on the mistake that actually happened.
 *
 *   node --import tsx --test src/App.demo.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(join(HERE, "App.tsx"), "utf-8");
const WRITE = readFileSync(join(HERE, "screens", "Write.tsx"), "utf-8");
const STORY = JSON.parse(readFileSync(join(HERE, "..", "..", "content", "demo_story.json"), "utf-8"));

test("the demo button is on the check-in, the screen the app opens on", () => {
  const checkIn = APP.match(/step === "checkIn" && \(([\s\S]*?)\n {6}\)\}/);
  assert.ok(checkIn, "could not find the check-in block; this test has stopped working");
  assert.match(checkIn[1], /<DemoButton\b[^>]*onLoaded=\{demoLoaded\}/);
});

test("loading the story opens the writing screen with her sentence, and sends nothing", () => {
  assert.match(APP, /setDraft\(session\.draft\.text\)/);
  assert.match(APP, /setTrail\(\[HOME, "write"\]\)/);
  // No translate call on load: the judge presses "Check my words".
  const loaded = APP.match(/const demoLoaded = useCallback\(([\s\S]*?)\n {2}\);/);
  assert.ok(loaded, "could not find demoLoaded");
  assert.doesNotMatch(loaded[1], /translate|clarify|report\(/);
});

test("her sentence is sent in her language, whatever the screen's language", () => {
  assert.notEqual(STORY.persona.child_lang, undefined);
  assert.match(APP, /sourceLang=\{draftLang \?\? undefined\}/);
  assert.match(WRITE, /translate\(\{ text: next\.text, source_lang: writtenIn \}\)/);
  assert.match(WRITE, /clarify\(\{ text: next\.text, source_lang: writtenIn,/);
  assert.match(WRITE, /const writtenIn = sourceLang \?\? lang;/);
});
