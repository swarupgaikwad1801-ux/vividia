/**
 * Tests for the PIN lock.
 *
 * Run (Node 22 strips the types itself, and provides WebCrypto globally):
 *   node --test frontend/src/lib/pin.test.ts
 *
 * Type-check:
 *   npx tsc --strict --noEmit --target es2022 --module nodenext \
 *     --moduleResolution nodenext --lib es2022,dom \
 *     --allowImportingTsExtensions frontend/src/lib/*.ts
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  BASE_DELAY_MS,
  FREE_TRIES,
  MAX_DELAY_MS,
  MAX_DIGITS,
  MIN_DIGITS,
  PIN_KEY,
  TRIES_KEY,
  type CheckResult,
  type PinStore,
  checkPin,
  clearPin,
  delayAfter,
  isValidPin,
  pinStatus,
  setPin,
} from "./pin.ts";

/** A working fake of the bits of Storage this module uses. */
function memoryStore(): PinStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** Storage that is present but refuses everything, as in a private window. */
function brokenStore(): PinStore {
  return {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
}

/**
 * Narrow a CheckResult to its refusal branch.
 *
 * `result.ok === false && result.reason` reads fine but does not narrow the
 * union for TypeScript, so reaching retryInMs afterwards is a type error.
 * assert.fail returns never, which does narrow.
 */
function refused(result: CheckResult): Extract<CheckResult, { ok: false }> {
  if (result.ok) assert.fail("expected the PIN to be refused");
  return result;
}

let store: ReturnType<typeof memoryStore>;
const realNow = Date.now;

beforeEach(() => {
  store = memoryStore();
  Date.now = realNow;
});

// --- format ----------------------------------------------------------------

test("accepts 4 to 6 digits and nothing else", () => {
  assert.ok(isValidPin("1234"));
  assert.ok(isValidPin("123456"));
  assert.equal(isValidPin("123"), false, "too short");
  assert.equal(isValidPin("1234567"), false, "too long");
  assert.equal(isValidPin("12a4"), false, "not digits");
  assert.equal(isValidPin(""), false);
  assert.equal(isValidPin(" 1234"), false);
});

test("a badly formatted PIN is refused without storing anything", async () => {
  const result = await setPin("abc", store);

  assert.deepEqual(result, { ok: false, reason: "format" });
  assert.equal(store.data.size, 0);
});

// --- what gets stored ------------------------------------------------------

test("the PIN itself is never stored", async () => {
  await setPin("4321", store);

  const raw = store.data.get(PIN_KEY) ?? "";
  assert.ok(raw.length > 0);
  assert.equal(raw.includes("4321"), false, "the PIN is in storage in the clear");
});

test("stores a salt and a hash, and nothing else", async () => {
  await setPin("1234", store);

  const record = JSON.parse(store.data.get(PIN_KEY) ?? "{}");
  assert.deepEqual(Object.keys(record).sort(), ["hash", "salt", "v"]);
  assert.match(record.salt, /^[0-9a-f]{32}$/, "16 random bytes, hex");
  assert.match(record.hash, /^[0-9a-f]{64}$/, "SHA-256, hex");
});

test("the same PIN gets a different salt and hash each time", async () => {
  const a = memoryStore();
  const b = memoryStore();

  await setPin("1234", a);
  await setPin("1234", b);

  const ra = JSON.parse(a.data.get(PIN_KEY) ?? "{}");
  const rb = JSON.parse(b.data.get(PIN_KEY) ?? "{}");
  assert.notEqual(ra.salt, rb.salt, "a shared salt makes one table cover everyone");
  assert.notEqual(ra.hash, rb.hash);
});

// --- checking --------------------------------------------------------------

test("the right PIN opens it", async () => {
  await setPin("1234", store);
  assert.deepEqual(await checkPin("1234", store), { ok: true });
});

test("a wrong PIN does not", async () => {
  await setPin("1234", store);

  assert.equal(refused(await checkPin("9999", store)).reason, "wrong");
});

test("checking before a PIN is set says so", async () => {
  const result = await checkPin("1234", store);
  assert.equal(refused(result).reason, "none");
});

test("setting a PIN again replaces the old one", async () => {
  await setPin("1234", store);
  await setPin("5678", store);

  assert.deepEqual(await checkPin("5678", store), { ok: true });
  assert.equal((await checkPin("1234", store)).ok, false);
});

test("a correct PIN forgets the earlier wrong tries", async () => {
  await setPin("1234", store);
  await checkPin("0000", store);
  await checkPin("0000", store);

  await checkPin("1234", store);

  assert.equal(store.data.has(TRIES_KEY), false);
});

// --- the delay, and why it can never become a lockout ----------------------

test("the first wrong tries are free", () => {
  for (let fails = 1; fails < FREE_TRIES; fails++) {
    assert.equal(delayAfter(fails), 0, `try ${fails} should not be delayed`);
  }
});

test("the delay starts after five wrong tries and then doubles", () => {
  assert.equal(delayAfter(FREE_TRIES), BASE_DELAY_MS);
  assert.equal(delayAfter(FREE_TRIES + 1), BASE_DELAY_MS * 2);
  assert.equal(delayAfter(FREE_TRIES + 2), BASE_DELAY_MS * 4);
});

test("the delay is capped, so it is never a lockout", () => {
  // The property that matters: no number of wrong tries locks a child out.
  for (const fails of [10, 50, 1000, 100_000]) {
    assert.equal(delayAfter(fails), MAX_DELAY_MS, `${fails} tries must still be a wait`);
  }
  assert.ok(MAX_DELAY_MS <= 60_000, "a minute at most; longer is a lockout by another name");
});

test("five wrong tries then a delay, and the sixth is refused while it runs", async () => {
  await setPin("1234", store);
  let clock = 1_000_000;
  Date.now = () => clock;

  for (let i = 0; i < FREE_TRIES; i++) {
    const result = await checkPin("0000", store);
    assert.equal(refused(result).reason, "wrong");
  }

  const blocked = refused(await checkPin("0000", store));
  assert.equal(blocked.reason, "waiting");
  assert.ok(blocked.retryInMs > 0, "the screen needs a countdown to show");
});

test("waiting long enough lets the child try again", async () => {
  await setPin("1234", store);
  let clock = 1_000_000;
  Date.now = () => clock;

  for (let i = 0; i < FREE_TRIES; i++) await checkPin("0000", store);
  assert.equal((await checkPin("1234", store)).ok, false, "refused during the wait");

  clock += BASE_DELAY_MS + 1;

  assert.deepEqual(await checkPin("1234", store), { ok: true }, "and the real PIN works after");
});

test("a refused-while-waiting attempt does not count as another wrong try", async () => {
  await setPin("1234", store);
  let clock = 1_000_000;
  Date.now = () => clock;

  for (let i = 0; i < FREE_TRIES; i++) await checkPin("0000", store);
  const first = JSON.parse(store.data.get(TRIES_KEY) ?? "{}").fails;

  await checkPin("0000", store);
  await checkPin("0000", store);

  const after = JSON.parse(store.data.get(TRIES_KEY) ?? "{}").fails;
  assert.equal(after, first, "hammering during the wait must not extend it");
});

test("a clock moved backwards never makes the wait longer than the cap", async () => {
  await setPin("1234", store);
  let clock = 1_000_000;
  Date.now = () => clock;

  for (let i = 0; i < FREE_TRIES + 10; i++) {
    clock += MAX_DELAY_MS + 1;
    await checkPin("0000", store);
  }
  clock -= 60 * 60 * 1000; // the device clock jumps back an hour

  const blocked = refused(await checkPin("1234", store));
  assert.equal(blocked.reason, "waiting");
  assert.ok(blocked.retryInMs <= MAX_DELAY_MS, `waited ${blocked.retryInMs} ms, over the cap`);

  clock += MAX_DELAY_MS + 1;
  assert.deepEqual(await checkPin("1234", store), { ok: true }, "and it opens once the cap has passed");
});

test("a try count from the future is capped, not an hour-long lock", async () => {
  await setPin("1234", store);
  Date.now = () => 1_000_000;
  store.data.set(TRIES_KEY, JSON.stringify({ fails: FREE_TRIES + 3, at: 1_000_000 + 3_600_000 }));

  const blocked = refused(await checkPin("1234", store));
  assert.ok(blocked.retryInMs <= MAX_DELAY_MS);
});

// --- clearing --------------------------------------------------------------

test("clearing removes the PIN and the attempt count", async () => {
  await setPin("1234", store);
  await checkPin("0000", store);

  clearPin(store);

  assert.equal(store.data.size, 0);
  assert.equal(pinStatus(store), "none");
});

test("clearing needs no PIN, because a child must not be locked out of their own app", async () => {
  await setPin("1234", store);

  clearPin(store);

  assert.equal(pinStatus(store), "none");
});

// --- storage that does not work --------------------------------------------

test("a device that cannot store says so instead of pretending", async () => {
  const result = await setPin("1234", brokenStore());
  assert.deepEqual(result, { ok: false, reason: "storage" });
});

test("checking against unreadable storage never throws", async () => {
  const result = await checkPin("1234", brokenStore());
  assert.equal(refused(result).reason, "none");
});

test("clearing against broken storage never throws", () => {
  assert.doesNotThrow(() => clearPin(brokenStore()));
});

test("corrupt stored data is treated as no PIN, not as an error", async () => {
  store.data.set(PIN_KEY, "{not json");

  assert.equal(pinStatus(store), "none");
  const result = await checkPin("1234", store);
  assert.equal(refused(result).reason, "none");
});

for (const [label, stored] of [
  ["an empty object", "{}"],
  ["a bare string", '"x"'],
  ["a future version", JSON.stringify({ v: 2, salt: "aa", hash: "bb" })],
  ["a missing hash", JSON.stringify({ v: 1, salt: "aa" })],
  ["a number as salt", JSON.stringify({ v: 1, salt: 7, hash: "bb" })],
] as const) {
  test(`valid JSON with the wrong shape (${label}) reads as no PIN, not a PIN nothing can open`, async () => {
    store.data.set(PIN_KEY, stored);

    assert.equal(pinStatus(store), "none");
    assert.equal(refused(await checkPin("1234", store)).reason, "none");
  });
}

test("a damaged try count is ignored rather than trusted", async () => {
  await setPin("1234", store);
  store.data.set(TRIES_KEY, JSON.stringify({ fails: "lots", at: "yesterday" }));

  assert.deepEqual(await checkPin("1234", store), { ok: true });
});

test("storage that throws reads as no PIN set", () => {
  // Present but refusing: we cannot see a PIN, so there is not one to check.
  assert.equal(pinStatus(brokenStore()), "none");
});

test("no storage at all reads as unavailable, which is a different thing", () => {
  // Node has no localStorage unless --experimental-webstorage, so passing no
  // store exercises the branch a browser hits when the property itself throws.
  assert.equal(pinStatus(), "unavailable");
});

test("a PIN cannot be set at all with no storage", async () => {
  const result = await setPin("1234");
  assert.deepEqual(result, { ok: false, reason: "storage" });
});

// --- the stated bounds -----------------------------------------------------

test("the digit bounds are the ones the task asked for", () => {
  assert.equal(MIN_DIGITS, 4);
  assert.equal(MAX_DIGITS, 6);
});
