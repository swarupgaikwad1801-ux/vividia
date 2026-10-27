/**
 * Bigger text and easier reading: saved in this browser only, damaged data
 * reads as plain, and the CSS actually responds to both switches.
 *
 *   node --import tsx --test src/lib/display.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DISPLAY_KEY, PLAIN, applyDisplay, readDisplay, saveDisplay, useStorage } from "./display.ts";

function memoryStore(initial?: string, refuse = false) {
  const data = new Map<string, string>(initial === undefined ? [] : [[DISPLAY_KEY, initial]]);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (refuse) throw new Error("refused");
      data.set(k, v);
    },
  };
}

test("nothing saved means plain text", () => {
  useStorage(memoryStore());
  assert.deepEqual(readDisplay(), PLAIN);
  useStorage(null);
});

test("a choice is kept for the next visit", () => {
  const store = memoryStore();
  useStorage(store);
  saveDisplay({ large: true, easyRead: false });
  assert.deepEqual(readDisplay(), { large: true, easyRead: false });
  useStorage(null);
});

test("damaged data reads as plain, never a throw", () => {
  for (const raw of ["not json", "null", '"large"', '{"large":"yes"}']) {
    useStorage(memoryStore(raw));
    assert.deepEqual(readDisplay(), PLAIN, raw);
  }
  useStorage(null);
});

test("storage that refuses still keeps the choice for this visit", () => {
  useStorage(memoryStore(undefined, true));
  saveDisplay({ large: false, easyRead: true });
  assert.deepEqual(readDisplay(), { large: false, easyRead: true });
  useStorage(null);
});

test("with no document, applying does nothing and does not throw", () => {
  assert.doesNotThrow(() => applyDisplay({ large: true, easyRead: true }));
});

test("the stylesheet responds to both switches, with the WCAG text-spacing values", () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.css"), "utf-8");
  assert.match(css, /:root\[data-large\]\s*\{\s*font-size:/);
  const easy = css.match(/:root\[data-easy-read\] body \*\s*\{([^}]*)\}/);
  assert.ok(easy, "no easy-read rule");
  assert.match(easy[1], /line-height:\s*1\.5/);
  assert.match(easy[1], /letter-spacing:\s*0\.12em/);
  assert.match(easy[1], /word-spacing:\s*0\.16em/);
});
