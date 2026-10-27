/**
 * What the child has typed but not yet saved, kept on this phone so that a
 * closed tab, a phone call or a cheap phone killing the browser does not
 * throw away a sentence that was hard to write (the Google Forms / Docs
 * rule: never lose what someone typed).
 *
 * Two boxes: the writing screen (`write`) and the chat (`talk`). Cleared:
 * - when the words are saved (App.tsx sets them back to "");
 * - by Leave now, before the page is replaced (lib/quickExit.ts clearers), so
 *   leaving in a hurry never leaves a half-written disclosure behind;
 * - by "Delete everything" (forgetEverything.ts).
 *
 * Storage that refuses is not an error: the drafts then live only as long
 * as the page, as they always did.
 */

export const DRAFTS_KEY = "vividia.drafts.v1";

export interface Drafts {
  write: string;
  talk: string;
}

export const EMPTY: Drafts = { write: "", talk: "" };

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readDrafts(): Drafts {
  try {
    const raw = storage()?.getItem(DRAFTS_KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<Drafts> | null;
    return {
      write: typeof v?.write === "string" ? v.write : "",
      talk: typeof v?.talk === "string" ? v.talk : "",
    };
  } catch {
    return EMPTY;
  }
}

export function saveDrafts(next: Drafts): void {
  try {
    if (!next.write && !next.talk) storage()?.removeItem(DRAFTS_KEY);
    else storage()?.setItem(DRAFTS_KEY, JSON.stringify(next));
  } catch {
    // Kept in the page only.
  }
}

export function forgetDrafts(): void {
  try {
    storage()?.removeItem(DRAFTS_KEY);
  } catch {
    // Nothing stored to forget.
  }
}
