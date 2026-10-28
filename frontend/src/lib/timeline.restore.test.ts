import { test } from "node:test";
import assert from "node:assert/strict";

import { addEntry, listEntries, removeEntry, restoreEntry, useStorage } from "./timeline.ts";

function store() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

test("undo puts a deleted entry back exactly as it was, once", () => {
  useStorage(store());
  const a = addEntry({ date: "2026-10-20", mood: "sad", text_child: "a", text_de: "a" }, "words");
  const b = addEntry({ date: "2026-10-22", mood: "", text_child: "b", text_de: "b" }, "pictures");
  removeEntry(a.id);
  assert.deepEqual(listEntries().map((e) => e.id), [b.id]);
  restoreEntry(a);
  restoreEntry(a);
  assert.deepEqual(listEntries(), [a, b], "same id, fields and source, in date order, not doubled");
  useStorage(null);
});
