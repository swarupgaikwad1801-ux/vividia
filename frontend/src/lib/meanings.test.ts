import { test } from "node:test";
import assert from "node:assert/strict";

import { MEANINGS_KEY, forgetMeanings, isRecalled, phraseKey, recalledMeaning, rememberMeaning } from "./meanings.ts";

function fake() {
  const data = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  return data;
}

test("a meaning the child picked is recalled for the same phrase, however it is typed", () => {
  fake();
  rememberMeaning("get me", { label: "pick me up", meaning_de: "mich abholen" });
  assert.deepEqual(recalledMeaning("Get  me!"), { label: "pick me up", meaning_de: "mich abholen" });
  assert.equal(recalledMeaning("got me"), null);
});

test("'none of these' is never remembered as a meaning", () => {
  fake();
  rememberMeaning("get me", { label: "Something else", meaning_de: "" });
  assert.equal(recalledMeaning("get me"), null);
});

test("only 50 phrases are kept, the oldest dropped first", () => {
  const data = fake();
  for (let i = 0; i < 60; i++) rememberMeaning(`phrase ${i}`, { label: "l", meaning_de: `m${i}` });
  const kept = Object.keys(JSON.parse(data.get(MEANINGS_KEY) ?? "{}"));
  assert.equal(kept.length, 50);
  assert.ok(!kept.includes(phraseKey("phrase 0")));
  assert.ok(kept.includes(phraseKey("phrase 59")));
});

test("an option matches by its German meaning or its label", () => {
  const recalled = { label: "pick me up", meaning_de: "mich abholen" };
  assert.ok(isRecalled({ label: "collect me", meaning_de: "mich abholen" }, recalled));
  assert.ok(isRecalled({ label: "pick me up", meaning_de: "x" }, recalled));
  assert.ok(!isRecalled({ label: "hurt me", meaning_de: "mir wehtun" }, recalled));
  assert.ok(!isRecalled({ label: "pick me up", meaning_de: "" }, null));
});

test("forgetting clears every remembered meaning", () => {
  fake();
  rememberMeaning("get me", { label: "pick me up", meaning_de: "mich abholen" });
  forgetMeanings();
  assert.equal(recalledMeaning("get me"), null);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});
