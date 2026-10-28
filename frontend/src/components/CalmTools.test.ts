/**
 * The breathing bubble's clock (28 Oct: Start crashed the whole app).
 *
 * A frame's timestamp can be a few ms before the moment Start was read, so
 * the first tick saw -1 seconds; PHASES[-1] was undefined and `t()` threw.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { phaseAt } from "./CalmTools.tsx";

const here = dirname(fileURLToPath(import.meta.url));

test("a clock a moment behind Start still says 'Breathe in', never nothing", () => {
  for (const seconds of [-1, -0.004, Number.NaN, 0]) {
    assert.equal(phaseAt(seconds), "calm.in", String(seconds));
  }
});

test("the words follow in, hold, out, hold, four seconds each", () => {
  assert.deepEqual([0, 4, 8, 12, 16].map(phaseAt), ["calm.in", "calm.hold", "calm.out", "calm.hold", "calm.in"]);
});

test("the frame clock is clamped at zero", () => {
  const source = readFileSync(join(here, "CalmTools.tsx"), "utf8");
  assert.match(source, /Math\.max\(0, \(now - begun\) \/ 1000\)/);
});

test("a crash in one screen keeps the top bar: the screens sit inside the boundary", () => {
  const app = readFileSync(join(here, "..", "App.tsx"), "utf8");
  const open = app.indexOf("<ScreenErrorBoundary");
  const close = app.indexOf("</ScreenErrorBoundary>");
  const topBar = app.indexOf('className="top-bar');
  assert.ok(open > 0 && close > open, "the boundary wraps the screens");
  assert.ok(topBar > 0 && topBar < open, "Need help and Leave now are outside it");
  assert.ok(app.indexOf('step === "help"') < close, "every screen, Help included, is inside");
});
