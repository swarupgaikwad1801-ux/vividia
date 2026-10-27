/**
 * The few date chores these two screens need, and nothing more.
 *
 * `lib/followups.ts` (Neel, PR #37) owns every rule about *when* a check-in is
 * due and *which* rung comes next. This file deliberately does not touch any of
 * that: it reads a day off the clock, finds the newest entry, and formats a day
 * for display. Nothing here decides anything.
 *
 * `today` is passed into the screens rather than read inside them, so the
 * behaviour can be tested without waiting for a date to arrive. `todayIso()`
 * is the default those props fall back to, in one place.
 */

import type { Entry } from "../types/api.ts";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today as an ISO date, in the device's own timezone. */
export function todayIso(now: Date = new Date()): string {
  // Local parts, not toISOString(): for a child in Germany at 23:30 the UTC
  // date is already tomorrow, and the check-in would read as a day ahead of
  // the entry they just wrote.
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The newest readable entry date, or null.
 *
 * ISO dates sort correctly as strings, so this is a max, not arithmetic. An
 * unreadable date is skipped rather than throwing, exactly as
 * `lib/followups.ts` does with the same input.
 */
export function latestEntryDate(entries: readonly Entry[]): string | null {
  let latest: string | null = null;
  for (const entry of entries) {
    if (!ISO_DAY.test(entry.date)) continue;
    if (latest === null || entry.date > latest) latest = entry.date;
  }
  return latest;
}

/**
 * A short day for the child to recognise, e.g. "21 Oct".
 *
 * `Intl` is used rather than a month-name table, because a table would be
 * copy in three languages that nobody reviewed. Falls back to the raw ISO date
 * when the runtime cannot do it: a wrong date is worse than an ugly one.
 */
export function formatDay(iso: string, lang: string): string {
  if (!ISO_DAY.test(iso)) return iso;
  try {
    return new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}
