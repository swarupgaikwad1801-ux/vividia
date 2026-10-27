/**
 * Amara's story is removed from the app (Neel, 27 Oct), and a browser that
 * loaded it before does not keep her entries for ever.
 *
 *   cd frontend
 *   node --import tsx --test src/lib-demo/removed.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { STRINGS } from "../lib/strings.ts";

const APP = readFileSync(new URL("../App.tsx", import.meta.url), "utf-8");

test("no button loads the story: not mounted, and the component is gone", () => {
  assert.doesNotMatch(APP, /<DemoButton\b/);
  assert.ok(!existsSync(new URL("../components/DemoButton.tsx", import.meta.url)));
  assert.ok(!("demo.button" in STRINGS));
});

test("example entries left from an earlier visit are cleared once, on start", () => {
  // clearDemo() removes only the ids the example seeded (demoStory.ts), so
  // the child's own entries are never touched by this.
  assert.match(APP, /if \(activeDemo\(\)\) \{\s*clearDemo\(\);\s*refreshEntries\(\);/);
});
