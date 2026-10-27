import { test } from "node:test";
import assert from "node:assert/strict";

import { AVATARS } from "../art/People";
import { AVATAR_COUNT, AVATAR_KEY, forgetAvatar, loadAvatar, saveAvatar } from "./avatar";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

test("the store and the drawings agree on how many travellers there are", () => {
  assert.equal(AVATARS.length, AVATAR_COUNT);
});

test("a picked traveller is remembered, and anything odd falls back to the first", () => {
  const store = fakeStorage();
  Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
  assert.equal(loadAvatar(), 0);
  saveAvatar(3);
  assert.equal(loadAvatar(), 3);
  saveAvatar(99);
  assert.equal(loadAvatar(), 3, "an out-of-range pick is ignored");
  store.setItem(AVATAR_KEY, "banana");
  assert.equal(loadAvatar(), 0);
});

test("forgetting removes the traveller, so the phone shows no sign of use", () => {
  const store = fakeStorage();
  Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
  saveAvatar(2);
  forgetAvatar();
  assert.equal(store.data.has(AVATAR_KEY), false);
  assert.equal(loadAvatar(), 0);
});
