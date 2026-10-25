/**
 * The child's chosen language, kept only in this browser.
 *
 * Nothing here talks to the network, and nothing here is ever sent anywhere.
 * A language choice is not a disclosure, but it is still the child's, so it
 * follows the same rule as the timeline: browser storage only.
 *
 * ## The shape is copied from `lib/timeline.ts` and `lib/pin.ts`, deliberately
 *
 * Storage can be missing or refuse to work: a private window, site data
 * blocked by a school tablet's policy, a full disk. Reading the
 * `localStorage` property can itself throw, not only the get/set calls. So
 * every access is wrapped, a failed write falls back to memory for this visit,
 * and `isPersistent()` says which of the two happened.
 *
 * The cost of a failed write is small and worth naming: the child picks again
 * next visit. That is one tap, so this module does **not** warn about it the
 * way `timeline.notPersistent` warns about losing written words — a warning
 * here would be noise on the calmest screen in the app. `isPersistent()` is
 * exported anyway so a settings screen can mention it if Vernika wants.
 *
 * ## Damaged data reads as "nothing stored"
 *
 * Never as a throw, and never as a language. A stored `"ar"` from an older
 * build — Arabic was dropped at the language gate — must put the child back on
 * the picker, not render a screen in a language `strings.ts` has no words for.
 * Same for `{}`, `null`, a bare string, a future version, or any text that is
 * not JSON at all.
 */

import { FALLBACK_LANG, isLang } from "../lib/strings.ts";
import type { Lang } from "../lib/strings.ts";
import { deviceLang } from "./languages.ts";
import type { DeviceLangSource } from "./languages.ts";

/** Exported so a test can assert the key, and so nothing else guesses it. */
export const LANG_KEY = "vividia.lang.v1";

/** Versioned, so a later change can migrate instead of asking everyone again. */
interface StoredLang {
  v: 1;
  lang: Lang;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let storage: StorageLike | null = defaultStorage();
let memory: Lang | null = null;
let persistent = storage !== null;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // some browsers throw on the getter itself when storage is blocked
  }
}

/** For tests, or to switch storage off. `null` keeps the choice in memory. */
export function useStorage(next: StorageLike | null): void {
  storage = next;
  memory = null;
  persistent = next !== null;
}

/** False when the choice will not survive closing the page. */
export function isPersistent(): boolean {
  return persistent;
}

/** A stored record, only if it has the exact shape we wrote. */
function storedLang(value: unknown): Lang | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.v !== 1) return null;
  return typeof record.lang === "string" && isLang(record.lang) ? record.lang : null;
}

/**
 * The language the child chose on this device, or `null` if they never did.
 *
 * Falls back to `memory` rather than to `null` when storage holds nothing,
 * because a write that threw earlier in this visit left the choice there. The
 * child should not be asked twice in one sitting just because the browser
 * refuses to remember.
 */
export function readLang(): Lang | null {
  if (!storage) return memory;
  try {
    const raw = storage.getItem(LANG_KEY);
    if (!raw) return memory;
    return storedLang(JSON.parse(raw) as unknown) ?? memory;
  } catch {
    persistent = false;
    return memory;
  }
}

/** Remember the child's choice. Never throws at the caller. */
export function saveLang(lang: Lang): void {
  memory = lang;
  if (!storage) return;
  try {
    const record: StoredLang = { v: 1, lang };
    storage.setItem(LANG_KEY, JSON.stringify(record));
    persistent = true;
  } catch {
    persistent = false; // keep working in memory for this visit
  }
}

/**
 * Forget the choice, so the first-run picker is shown again.
 *
 * Needed by the "delete everything" path: a child wiping this device should
 * not leave behind a note of which language they read.
 */
export function forgetLang(): void {
  memory = null;
  if (!storage) return;
  try {
    storage.removeItem(LANG_KEY);
  } catch {
    persistent = false;
  }
}

export interface LanguageSetupState {
  /** True when the child has not chosen yet and must be asked. */
  needsChoice: boolean;
  /**
   * The language to render in right now.
   *
   * When a choice exists, it is that choice. When it does not, it is the
   * device's language, used only so the handful of words around the picker are
   * not in a language the child cannot read. That is not the app deciding: the
   * picker still shows nothing as chosen, and only a tap chooses.
   */
  lang: Lang;
  /**
   * The option the first-run screen marks as the device's own, or `null` when
   * the device speaks none of our three.
   *
   * `null` is the honest answer there. Marking English by default would be the
   * app leaning on a child's choice with no reason to.
   */
  suggested: Lang | null;
}

/**
 * Everything the shell needs to decide whether to show the first-run screen.
 *
 * Synchronous and offline by construction: one browser-storage read and one
 * look at `navigator`. Choosing a language is not something to make a
 * frightened child wait for, so there is no loading state to design — there is
 * nothing to load.
 */
export function languageSetupState(source?: DeviceLangSource): LanguageSetupState {
  const chosen = readLang();
  if (chosen) return { needsChoice: false, lang: chosen, suggested: null };

  const suggested = deviceLang(source);
  return { needsChoice: true, lang: suggested ?? FALLBACK_LANG, suggested };
}
