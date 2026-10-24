/**
 * A PIN lock on the app, and an honest account of what it is worth.
 *
 * ## What this protects against
 *
 * Someone picking up the phone and opening the app: a sibling, a parent
 * glancing over, a classmate who grabbed it. That is the realistic threat for
 * a child, and a 4-digit PIN handles it.
 *
 * ## What it does NOT protect against, and the UI must not imply otherwise
 *
 * Anyone who can open the browser's developer tools can read `localStorage`,
 * take the salt and the hash, and try all ten thousand 4-digit PINs in well
 * under a second. A single SHA-256 is fast on purpose, and that cuts both
 * ways. So this is a lock on a door, not a safe: it stops someone wandering
 * in, not someone who sets out to get in.
 *
 * It also does not encrypt anything. The timeline is still in browser storage
 * in the clear; the PIN gates the screens, not the data. Encrypting the
 * timeline under a key derived from the PIN would be a real improvement and is
 * a different piece of work.
 *
 * If that gap matters, the one-line change is to replace the single digest in
 * `hash()` with PBKDF2 at a high iteration count — same WebCrypto, same
 * stored shape, several orders of magnitude more work per guess. The task
 * specified a salted SHA-256, so that is what this does, and the trade-off is
 * written down rather than implied. For `SAFETY.md`'s threat model.
 *
 * ## The rule that outranks the lock
 *
 * **A child must never be locked out of help.** The delay after repeated
 * wrong tries is capped, so it can never become a lockout, and there is no
 * "too many attempts, try tomorrow" state at all. More importantly, the
 * always-visible help button and the emergency numbers belong OUTSIDE this
 * lock: a child who has forgotten their PIN still needs 110. A screen that
 * puts the help button behind the PIN gate has got this backwards.
 */

/** Stored shape. Versioned so a future hashing change can migrate rather than lock people out. */
interface StoredPin {
  v: 1;
  /** Random per-PIN salt, hex. Stops one rainbow table covering every user. */
  salt: string;
  /** SHA-256 of salt + PIN, hex. The PIN itself is never stored. */
  hash: string;
}

interface StoredTries {
  /** Consecutive wrong attempts. Reset by a correct PIN or by clearPin(). */
  fails: number;
  /** When the last wrong attempt happened, ms since epoch. */
  at: number;
}

export const PIN_KEY = "vividia.pin.v1";
export const TRIES_KEY = "vividia.pin.tries.v1";

export const MIN_DIGITS = 4;
export const MAX_DIGITS = 6;

/** Wrong tries allowed before any delay starts. */
export const FREE_TRIES = 5;
/** The first delay, doubling per further wrong try. */
export const BASE_DELAY_MS = 5_000;
/**
 * The cap, and the reason this is a delay rather than a lockout. Without it,
 * doubling would reach hours and then days, which is a lockout wearing a
 * different name.
 */
export const MAX_DELAY_MS = 60_000;

/** Just enough of the Storage API to be faked in a test. */
export interface PinStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type PinStatus = "set" | "none" | "unavailable";

export type SetResult =
  | { ok: true }
  | { ok: false; reason: "format" | "storage" };

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: "wrong"; retryInMs: number }
  | { ok: false; reason: "none" | "format" | "unavailable"; retryInMs: 0 }
  | { ok: false; reason: "waiting"; retryInMs: number };

function store(given?: PinStore): PinStore | undefined {
  if (given) return given;
  // Reading localStorage can itself throw: a private window, or site data
  // blocked by policy. Not just the get/set calls - the property access.
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

function read<T>(key: string, from?: PinStore): T | undefined {
  const target = store(from);
  if (!target) return undefined;
  try {
    const raw = target.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    // Unreadable or corrupt. Treated as absent, never as a reason to throw at
    // a child who is trying to get into their own app.
    return undefined;
  }
}

function write(key: string, value: unknown, from?: PinStore): boolean {
  const target = store(from);
  if (!target) return false;
  try {
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function drop(key: string, from?: PinStore): void {
  const target = store(from);
  if (!target) return;
  try {
    target.removeItem(key);
  } catch {
    // Nothing useful to do; the caller is clearing, not relying on this.
  }
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** True for a PIN of the right length made only of digits. */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^[0-9]{${MIN_DIGITS},${MAX_DIGITS}}$`).test(pin);
}

async function hash(salt: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hex(new Uint8Array(digest));
}

/**
 * Compare without an early exit.
 *
 * Timing is not the real attack here - anyone who can time this can also just
 * read the hash - but comparing two short hex strings in constant time costs
 * nothing, and a cheap habit is worth keeping.
 */
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The stored PIN, only if it has the shape we wrote.
 *
 * Valid JSON is not enough: `{}` or `"x"` under PIN_KEY would otherwise read
 * as "a PIN is set" that no PIN can ever match, which locks the child out of
 * their own app. Anything else is treated as absent, the same as corrupt.
 */
function readPin(from?: PinStore): StoredPin | undefined {
  const record = read<Partial<StoredPin>>(PIN_KEY, from);
  if (
    record &&
    typeof record === "object" &&
    record.v === 1 &&
    typeof record.salt === "string" &&
    typeof record.hash === "string"
  ) {
    return record as StoredPin;
  }
  return undefined;
}

/** The wrong-try count, only if it has the shape we wrote. */
function readTries(from?: PinStore): StoredTries {
  const tries = read<Partial<StoredTries>>(TRIES_KEY, from);
  if (
    tries &&
    typeof tries === "object" &&
    Number.isInteger(tries.fails) &&
    (tries.fails as number) >= 0 &&
    Number.isFinite(tries.at)
  ) {
    return tries as StoredTries;
  }
  return { fails: 0, at: 0 };
}

/** Is a PIN set on this device, and can we even tell? */
export function pinStatus(from?: PinStore): PinStatus {
  if (!store(from)) return "unavailable";
  return readPin(from) ? "set" : "none";
}

/**
 * How long the child must wait before the next attempt counts.
 *
 * 0 for the first FREE_TRIES wrong attempts, then a doubling delay, capped.
 */
export function delayAfter(fails: number): number {
  if (fails < FREE_TRIES) return 0;
  const steps = fails - FREE_TRIES;
  return Math.min(BASE_DELAY_MS * 2 ** steps, MAX_DELAY_MS);
}

/** Set or replace the PIN. Returns why it failed rather than throwing. */
export async function setPin(pin: string, from?: PinStore): Promise<SetResult> {
  if (!isValidPin(pin)) return { ok: false, reason: "format" };

  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const record: StoredPin = { v: 1, salt, hash: await hash(salt, pin) };

  if (!write(PIN_KEY, record, from)) {
    // Worth telling the child plainly: this device will not remember a PIN.
    // Pretending it worked would lock them out of nothing and teach them the
    // app lies.
    return { ok: false, reason: "storage" };
  }
  drop(TRIES_KEY, from);
  return { ok: true };
}

/**
 * Check a PIN.
 *
 * The delay is enforced by refusing early rather than by sleeping: a caller
 * cannot skip it, the clock decides when it expires, and nothing blocks the
 * UI thread. `retryInMs` is there so a screen can show a countdown instead of
 * a dead button.
 */
export async function checkPin(pin: string, from?: PinStore): Promise<CheckResult> {
  if (!store(from)) return { ok: false, reason: "unavailable", retryInMs: 0 };

  const record = readPin(from);
  if (!record) return { ok: false, reason: "none", retryInMs: 0 };
  if (!isValidPin(pin)) return { ok: false, reason: "format", retryInMs: 0 };

  let tries = readTries(from);
  // A clock moved backwards (set by hand, a bad sync) makes the last wrong try
  // look like it is in the future. Re-anchor it to now, so the wait runs from
  // here and ends within the cap; otherwise the child would wait until the
  // clock caught up, which can be hours. The cap is what keeps this from being
  // a lockout.
  const now = Date.now();
  if (tries.at > now) {
    tries = { ...tries, at: now };
    write(TRIES_KEY, tries, from);
  }
  const waited = now - tries.at;
  const owed = delayAfter(tries.fails);
  if (owed > 0 && waited < owed) {
    // Refused without hashing, so guessing fast buys nothing.
    return { ok: false, reason: "waiting", retryInMs: Math.min(owed - waited, MAX_DELAY_MS) };
  }

  if (sameHash(await hash(record.salt, pin), record.hash)) {
    drop(TRIES_KEY, from);
    return { ok: true };
  }

  const fails = tries.fails + 1;
  write(TRIES_KEY, { fails, at: Date.now() }, from);
  return { ok: false, reason: "wrong", retryInMs: delayAfter(fails) };
}

/**
 * Remove the PIN and forget the wrong attempts.
 *
 * Deliberately needs no PIN to call. A child who cannot remember theirs must
 * be able to get back into their own app; the alternative is a child locked
 * out of the thing holding the words they were going to show someone. What
 * that costs is that anyone holding the phone can also clear the lock, which
 * is the honest limit of a client-side PIN and is written down here rather
 * than hidden.
 */
export function clearPin(from?: PinStore): void {
  drop(PIN_KEY, from);
  drop(TRIES_KEY, from);
}
