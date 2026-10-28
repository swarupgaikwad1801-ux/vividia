import { test } from "node:test";
import assert from "node:assert/strict";

import { VISITS_KEY, forgetVisits, recordVisit, visitDays } from "./visits.ts";

function useFake() {
  const data = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  return data;
}

test("a day is counted once, however often the app is opened", () => {
  useFake();
  recordVisit(new Date(2026, 9, 28, 8));
  recordVisit(new Date(2026, 9, 28, 20));
  assert.deepEqual(visitDays(), ["2026-10-28"]);
});

test("only the last 28 days are kept: nothing older stays on the phone", () => {
  const data = useFake();
  data.set(VISITS_KEY, JSON.stringify(["2026-09-01", "2026-10-01", "2026-10-20"]));
  recordVisit(new Date(2026, 9, 28));
  assert.deepEqual(visitDays(), ["2026-10-01", "2026-10-20", "2026-10-28"]);
});

test("damaged data reads as no days, and forgetting clears them", () => {
  const data = useFake();
  data.set(VISITS_KEY, "nope");
  assert.deepEqual(visitDays(), []);
  recordVisit(new Date(2026, 9, 28));
  forgetVisits();
  assert.deepEqual(visitDays(), []);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});
