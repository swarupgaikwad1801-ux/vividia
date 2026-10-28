/**
 * What this child meant last time: their own answers to "what did you mean
 * by ...?", kept on this phone so the app can learn their way of writing.
 *
 * The next time the same phrase is unclear, the meaning they picked before
 * is offered first and marked "You meant this last time". It is never
 * chosen for them: the child still taps it (CLAUDE.md: the child confirms
 * meaning; the model never decides it). Someone who says "get me" for "pick
 * me up" once may mean a threat the next time.
 *
 * Only the phrase and the reading they chose, never the sentence around it.
 * Up to 50 phrases, the oldest dropped first. Cleared by Delete everything.
 */

export const MEANINGS_KEY = "vividia.meanings.v1";
const MAX = 50;

export interface Meaning {
  label: string;
  meaning_de: string;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The same phrase however it was typed: case, spaces and quotes ignored. */
export function phraseKey(phrase: string): string {
  return phrase.toLowerCase().replace(/["'“”‘’.,!?]/g, "").replace(/\s+/g, " ").trim();
}

function readAll(): Record<string, Meaning> {
  try {
    const raw = storage()?.getItem(MEANINGS_KEY);
    const v: unknown = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Meaning>) : {};
  } catch {
    return {};
  }
}

export function recalledMeaning(phrase: string): Meaning | null {
  const m = readAll()[phraseKey(phrase)];
  return m && typeof m.label === "string" && typeof m.meaning_de === "string" ? m : null;
}

export function rememberMeaning(phrase: string, meaning: Meaning): void {
  const key = phraseKey(phrase);
  if (!key || !meaning.meaning_de) return;
  const all = readAll();
  delete all[key];
  all[key] = { label: meaning.label, meaning_de: meaning.meaning_de };
  const keys = Object.keys(all);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX))) delete all[old];
  try {
    storage()?.setItem(MEANINGS_KEY, JSON.stringify(all));
  } catch {
    // Not kept: the child is simply asked without a suggestion next time.
  }
}

export function forgetMeanings(): void {
  try {
    storage()?.removeItem(MEANINGS_KEY);
  } catch {
    // Nothing kept.
  }
}

/** True when `option` is the reading this child picked last time. */
export function isRecalled(option: Meaning, recalled: Meaning | null): boolean {
  return recalled !== null && (option.meaning_de === recalled.meaning_de || option.label === recalled.label);
}
