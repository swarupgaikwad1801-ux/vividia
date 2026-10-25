/**
 * Tests for quickExit.
 *
 * Run (Node 22 strips the types itself, so no tsx needed):
 *   node --test frontend/src/lib/quickExit.test.ts
 *
 * Type-check (allowImportingTsExtensions because Node's own type stripping
 * requires the .ts extension in the import, and tsc only accepts it with that
 * flag plus --noEmit):
 *   npx tsc --strict --noEmit --target es2022 --module nodenext \
 *     --moduleResolution nodenext --lib es2022,dom \
 *     --allowImportingTsExtensions frontend/src/lib/*.ts
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  ESCAPE_COUNT,
  ESCAPE_WINDOW_MS,
  NEUTRAL_URL,
  bindQuickExit,
  go,
  onQuickExit,
  quickExit,
  resetQuickExit,
} from "./quickExit.ts";

/** Records what the page was replaced with, and whether assign was used. */
function fakeLocation() {
  const calls: { replaced: string[]; assigned: string[] } = { replaced: [], assigned: [] };
  (globalThis as { location?: unknown }).location = {
    replace: (url: string) => calls.replaced.push(url),
    assign: (url: string) => calls.assigned.push(url),
  };
  return calls;
}

/** A minimal keydown target, so no DOM is needed. */
function fakeTarget() {
  const listeners = new Set<(event: Event) => void>();
  return {
    addEventListener: (_type: string, fn: EventListenerOrEventListenerObject) =>
      listeners.add(fn as (event: Event) => void),
    removeEventListener: (_type: string, fn: EventListenerOrEventListenerObject) =>
      listeners.delete(fn as (event: Event) => void),
    press: (key: string, repeat = false) => {
      for (const fn of [...listeners]) fn({ key, repeat } as unknown as Event);
    },
    get count() {
      return listeners.size;
    },
  };
}

beforeEach(() => {
  resetQuickExit();
});

// --- leaving ---------------------------------------------------------------

test("replaces the page rather than pushing a new entry", () => {
  const location = fakeLocation();

  quickExit();

  assert.deepEqual(location.replaced, [NEUTRAL_URL]);
  assert.deepEqual(
    location.assigned,
    [],
    "assign() would push a history entry, so Back would return to the disclosure",
  );
});

test("lands somewhere dull that is nothing to do with this app", () => {
  assert.match(NEUTRAL_URL, /^https:\/\//);
  assert.doesNotMatch(NEUTRAL_URL, /vividia/i);
});

test("drops in-memory state before leaving", () => {
  const location = fakeLocation();
  const order: string[] = [];
  onQuickExit(() => order.push("cleared"));

  quickExit();
  order.push("left");

  assert.deepEqual(order, ["cleared", "left"], "the text must be gone before navigation");
  assert.equal(location.replaced.length, 1);
});

test("clears every registered piece of state", () => {
  fakeLocation();
  let a = "draft";
  let b = "timeline";
  onQuickExit(() => {
    a = "";
  });
  onQuickExit(() => {
    b = "";
  });

  quickExit();

  assert.equal(a, "");
  assert.equal(b, "");
});

test("a clearer that throws does not stop the exit", () => {
  const location = fakeLocation();
  let second = "still here";
  onQuickExit(() => {
    throw new Error("boom");
  });
  onQuickExit(() => {
    second = "";
  });

  quickExit();

  assert.equal(second, "", "a later clearer still ran");
  assert.deepEqual(location.replaced, [NEUTRAL_URL], "the child still left the page");
});

test("an unregistered clearer does not run", () => {
  fakeLocation();
  let ran = false;
  const off = onQuickExit(() => {
    ran = true;
  });

  off();
  quickExit();

  assert.equal(ran, false);
});

test("accepts a different destination", () => {
  const location = fakeLocation();

  quickExit("https://example.org/news");

  assert.deepEqual(location.replaced, ["https://example.org/news"]);
});

// --- the Escape shortcut ---------------------------------------------------

test("three quick Escapes leave", () => {
  const location = fakeLocation();
  const target = fakeTarget();
  bindQuickExit(target);

  for (let i = 0; i < ESCAPE_COUNT; i++) target.press("Escape");

  assert.deepEqual(location.replaced, [NEUTRAL_URL]);
});

test("one Escape does not", () => {
  const location = fakeLocation();
  const target = fakeTarget();
  bindQuickExit(target);

  target.press("Escape");

  assert.deepEqual(location.replaced, [], "losing the screen mid-sentence is its own punishment");
});

test("another key in between breaks the run", () => {
  const location = fakeLocation();
  const target = fakeTarget();
  bindQuickExit(target);

  target.press("Escape");
  target.press("Escape");
  target.press("a");
  target.press("Escape");

  assert.deepEqual(location.replaced, [], "Escapes spread through normal typing must not add up");
});

test("presses outside the window do not add up", async () => {
  const location = fakeLocation();
  const target = fakeTarget();
  bindQuickExit(target);
  const realNow = Date.now;
  let clock = 1_000_000;
  Date.now = () => clock;

  try {
    target.press("Escape");
    target.press("Escape");
    clock += ESCAPE_WINDOW_MS + 1;
    target.press("Escape");

    assert.deepEqual(location.replaced, []);

    // ...but three inside the window still do
    target.press("Escape");
    target.press("Escape");
    assert.deepEqual(location.replaced, [NEUTRAL_URL]);
  } finally {
    Date.now = realNow;
  }
});

test("holding Escape down is one press, not three", () => {
  const location = fakeLocation();
  const target = fakeTarget();
  bindQuickExit(target);

  target.press("Escape");
  for (let i = 0; i < 10; i++) target.press("Escape", true);

  assert.deepEqual(location.replaced, [], "a long press must not throw the child out mid-sentence");
});

test("separate presses still count while another key is held", () => {
  const location = fakeLocation();
  const target = fakeTarget();
  bindQuickExit(target);

  target.press("Escape");
  target.press("Shift", true);
  target.press("Escape");
  target.press("Escape");

  assert.deepEqual(location.replaced, [NEUTRAL_URL]);
});

test("unbinding stops the shortcut", () => {
  const location = fakeLocation();
  const target = fakeTarget();

  const unbind = bindQuickExit(target);
  unbind();
  for (let i = 0; i < ESCAPE_COUNT; i++) target.press("Escape");

  assert.deepEqual(location.replaced, []);
  assert.equal(target.count, 0, "the listener was removed");
});

test("binding with no target is harmless", () => {
  const unbind = bindQuickExit(undefined);
  assert.equal(typeof unbind, "function");
  unbind();
});

// --- moving between screens -------------------------------------------------

/** A history that records whether anything was pushed. */
function fakeHistory() {
  const calls = { pushed: [] as string[], replaced: [] as string[] };
  (globalThis as { history?: unknown }).history = {
    state: null,
    pushState: (_s: unknown, _t: string, url: string) => calls.pushed.push(url),
    replaceState: (_s: unknown, _t: string, url: string) => calls.replaced.push(url),
  };
  return calls;
}

test("moving between screens never pushes a history entry", () => {
  const history = fakeHistory();

  go("/checkin");
  go("/write");
  go("/handoff");

  assert.deepEqual(history.pushed, [], "a pushed entry is where Back would land after a quick exit");
  assert.deepEqual(history.replaced, ["/checkin", "/write", "/handoff"]);
});

test("after moving around, the exit still leaves the app with nothing to go back to", () => {
  const history = fakeHistory();
  const location = fakeLocation();

  go("/checkin");
  go("/write");
  quickExit();

  assert.deepEqual(history.pushed, []);
  assert.deepEqual(location.replaced, [NEUTRAL_URL]);
});

test("a history API that refuses does not throw at the child", () => {
  (globalThis as { history?: unknown }).history = {
    state: null,
    replaceState: () => {
      throw new Error("sandboxed");
    },
  };
  assert.doesNotThrow(() => go("/write"));
});
