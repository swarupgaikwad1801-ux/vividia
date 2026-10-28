import { test } from "node:test";
import assert from "node:assert/strict";

import { DRAFTS_KEY, EMPTY, forgetDrafts, readDrafts, saveDrafts } from "./drafts.ts";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

test("a draft survives a reload, and empty drafts leave nothing stored", () => {
  const store = fakeStorage();
  (globalThis as { localStorage?: unknown }).localStorage = store;
  saveDrafts({ write: "They took", talk: "" });
  assert.deepEqual(readDrafts(), { write: "They took", talk: "" });
  saveDrafts(EMPTY);
  assert.equal(store.data.has(DRAFTS_KEY), false);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test("forgetting removes the drafts, and damaged data reads as empty", () => {
  const store = fakeStorage();
  (globalThis as { localStorage?: unknown }).localStorage = store;
  saveDrafts({ write: "a", talk: "b" });
  forgetDrafts();
  assert.deepEqual(readDrafts(), EMPTY);
  store.data.set(DRAFTS_KEY, "not json");
  assert.deepEqual(readDrafts(), EMPTY);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});
