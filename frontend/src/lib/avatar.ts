/**
 * Which kid head the child picked as their traveller on the map.
 *
 * Stored on this phone like the language choice, and nothing else: it is a
 * picture, not a profile, and it is never sent anywhere. Storage that refuses
 * (private mode, a locked-down browser) just means the first head is used.
 *
 * Unlike the language, "delete everything" clears it (forgetEverything.ts):
 * on a shared phone a saved traveller shows the app was used, and picking
 * one again is a single tap.
 */

export const AVATAR_KEY = "vividia.avatar.v1";

/** How many heads art/People.tsx draws; avatar.test.ts keeps the two equal. */
export const AVATAR_COUNT = 6;

export function loadAvatar(): number {
  try {
    const raw = globalThis.localStorage?.getItem(AVATAR_KEY);
    const n = raw === null || raw === undefined ? 0 : Number(raw);
    return Number.isInteger(n) && n >= 0 && n < AVATAR_COUNT ? n : 0;
  } catch {
    return 0;
  }
}

export function saveAvatar(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= AVATAR_COUNT) return;
  try {
    globalThis.localStorage?.setItem(AVATAR_KEY, String(index));
  } catch {
    // Not saved; the map uses the first head next time. Nothing else depends on it.
  }
}

/** Part of "delete everything". Throws if storage refuses; the caller carries on. */
export function forgetAvatar(): void {
  globalThis.localStorage?.removeItem(AVATAR_KEY);
}
