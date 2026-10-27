/**
 * A tiny JSON store in the child's own browser, and nowhere else.
 *
 * `lib/timeline.ts` already does this for the entries, and I cannot add to
 * `lib/` (Vernika's), so the two small records this feature needs — did the
 * child already answer this check-in, and which rungs have they shown — use
 * this instead. The failure handling is deliberately the same as
 * `timeline.ts`: storage can be absent or throw (private windows, blocked
 * site data, a full disk), and the answer to that is to keep working in
 * memory for this visit and let `isPersistent()` say so, never to crash a
 * screen a frightened child is standing in front of.
 *
 * ## Why there is no network in this file
 *
 * Because there is no version of "don't get dropped" that involves telling
 * anyone. Both records here are about what the child has already done, and
 * they exist so the app can stop asking — the opposite of a notification.
 * Nothing in this directory imports `lib/api.ts`, and `noSend.test.ts` reads
 * the source to keep it that way.
 */

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // some browsers throw on the getter itself when storage is blocked
  }
}

export interface LocalStore<T> {
  read(): T;
  write(value: T): void;
  clear(): void;
  /** False when nothing will survive closing the page. */
  isPersistent(): boolean;
  /** For tests, or to switch storage off. `null` keeps everything in memory. */
  useStorage(next: StorageLike | null): void;
}

/**
 * @param key      the localStorage key, versioned so a format change is a new key
 * @param fallback a fresh empty value; called, never shared, so no caller can
 *                 mutate the default for everyone else
 * @param parse    returns the value, or null if the stored JSON is not usable
 */
export function localStore<T>(
  key: string,
  fallback: () => T,
  parse: (raw: unknown) => T | null,
): LocalStore<T> {
  let storage = defaultStorage();
  let memory = fallback();
  let persistent = storage !== null;

  return {
    read() {
      if (!storage) return memory;
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback();
        return parse(JSON.parse(raw) as unknown) ?? fallback();
      } catch {
        // Damaged or unreadable: the child starts from the default rather than
        // seeing an error about their own browser.
        persistent = false;
        return memory;
      }
    },
    write(value: T) {
      memory = value;
      if (!storage) return;
      try {
        storage.setItem(key, JSON.stringify(value));
        persistent = true;
      } catch {
        persistent = false;
      }
    },
    clear() {
      memory = fallback();
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        persistent = false;
      }
    },
    isPersistent() {
      return persistent;
    },
    useStorage(next: StorageLike | null) {
      storage = next;
      memory = fallback();
      persistent = next !== null;
    },
  };
}
