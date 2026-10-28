/**
 * The days the child opened the app, for "Days you came back" on the
 * timeline (components/LastFourWeeks.tsx).
 *
 * Deliberately small and deliberately not a streak (index.css: no points,
 * scores, streaks or badges): only the last 28 days are kept, only the date
 * (never a time or what was done), and nothing ever counts a gap. Coming
 * back to an app like this one is worth noticing; missing a day must never
 * read as failing.
 *
 * On a shared phone a list of days shows the app was used, like the
 * timeline does, so "Delete everything" clears it (forgetEverything.ts).
 */

export const VISITS_KEY = "vividia.visits.v1";
const KEEP_DAYS = 28;

/** "YYYY-MM-DD" in local time. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Saved days, oldest first, valid dates only. */
export function visitDays(): string[] {
  try {
    const raw = storage()?.getItem(VISITS_KEY);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() : [];
  } catch {
    return [];
  }
}

/** Note that the app was opened today. Keeps only the last 28 days. */
export function recordVisit(today: Date = new Date()): void {
  const oldest = new Date(today);
  oldest.setDate(today.getDate() - (KEEP_DAYS - 1));
  const from = dayKey(oldest);
  const days = new Set(visitDays().filter((d) => d >= from));
  days.add(dayKey(today));
  try {
    storage()?.setItem(VISITS_KEY, JSON.stringify([...days].sort()));
  } catch {
    // Not kept; the timeline just shows fewer days.
  }
}

export function forgetVisits(): void {
  try {
    storage()?.removeItem(VISITS_KEY);
  } catch {
    // Nothing kept.
  }
}
