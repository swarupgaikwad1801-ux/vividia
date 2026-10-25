/**
 * Don't get dropped: when to check in again, and what to try next.
 *
 * Step 8 of the journey in `CLAUDE.md`. Telling one adult is often not the
 * end: the adult does nothing, or it keeps happening. A child who was let
 * down once is the least likely to try again on their own. So the app keeps
 * two small, local promises:
 *
 * 1. **It asks again.** `nextCheckIn()` says when the check-in should come
 *    back after the last entry.
 * 2. **It knows the next door.** `ladderStep()` suggests the next rung of the
 *    escalation ladder when entries keep coming after the child showed
 *    someone, carrying the same timeline with it.
 *
 * ## What this never does
 *
 * - **It never contacts anyone.** A suggestion is text on the child's own
 *   screen; the child decides whether to act on it. No alert, no message, no
 *   network call: everything here runs on the child's device.
 * - **It never suggests the emergency rung as a "next step".** 110/112 are on
 *   every screen already, through the help button. Offering them as the
 *   natural follow-up to a teacher not acting would turn "it keeps
 *   happening" into "call the police", which is not ours to decide.
 * - **It never nags.** At most one check-in suggestion per gap; a child who
 *   ignores it is not reminded again until they write something new.
 *
 * The ladder's rungs come from `content/adult_guide.json`; the ids here must
 * match it, and a test reads the file to keep the two in sync.
 */

import type { Entry } from "../types/api.ts";

/** Days after the last entry before the app asks again how things are. */
export const CHECK_IN_AFTER_DAYS = 3;

/**
 * The ladder, lowest rung first, as in `content/adult_guide.json`.
 *
 * `emergency` is the last rung in that file and is deliberately left out
 * here: see "What this never does".
 */
export const LADDER = ["teacher", "trusted", "head", "school_psychology", "helplines"] as const;

export type LadderStep = (typeof LADDER)[number];

/** The child marked that they showed their entries to someone on this rung. */
export interface Handoff {
  /** ISO date, e.g. "2026-10-21" */
  date: string;
  step: LadderStep;
}

export type Suggestion =
  /** Nobody has been shown yet: the first rung. */
  | { kind: "start"; step: LadderStep }
  /** Shown someone, and nothing new since: give it time, suggest nothing. */
  | { kind: "waiting"; since: string }
  /** It kept happening after the last handoff: the next rung up. */
  | { kind: "next"; step: LadderStep; after: LadderStep; newEntries: number }
  /** Already on the top rung and still happening: stay there, with helplines. */
  | { kind: "top"; step: LadderStep; newEntries: number };

const DAY_MS = 86_400_000;

/** Whole days, on ISO dates only. Null for a date we cannot read. */
function dayNumber(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / DAY_MS);
}

function isoFromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** The latest readable date among the entries, as a day number. */
function lastDay(entries: readonly Entry[]): number | null {
  let latest: number | null = null;
  for (const entry of entries) {
    const day = dayNumber(entry.date);
    if (day !== null && (latest === null || day > latest)) latest = day;
  }
  return latest;
}

/**
 * When the check-in should come back, as an ISO date.
 *
 * `CHECK_IN_AFTER_DAYS` after the last entry. If that day has already passed,
 * the answer is `today`: the check-in is due now, once, rather than piling up
 * a reminder for every day missed. Null when there are no entries, because
 * there is nothing to follow up on and the first check-in is the app's
 * normal start screen.
 */
export function nextCheckIn(entries: readonly Entry[], today: string): string | null {
  const last = lastDay(entries);
  const now = dayNumber(today);
  if (last === null || now === null) return null;
  return isoFromDay(Math.max(last + CHECK_IN_AFTER_DAYS, now));
}

/** True when the check-in is due on `today`. */
export function checkInDue(entries: readonly Entry[], today: string): boolean {
  const next = nextCheckIn(entries, today);
  return next !== null && next <= today;
}

/**
 * What to suggest next on the escalation ladder.
 *
 * Counts entries dated **after** the last handoff (same day doesn't count:
 * that is usually what the child showed). With none, the suggestion is to
 * wait. With one or more, it is the rung above the highest one reached so
 * far, so a child who went from teacher to head of school is never sent
 * back down to a teacher.
 */
export function ladderStep(entries: readonly Entry[], handoffs: readonly Handoff[]): Suggestion {
  const known = handoffs.filter((handoff) => LADDER.includes(handoff.step) && dayNumber(handoff.date) !== null);
  if (known.length === 0) return { kind: "start", step: LADDER[0] };

  const lastHandoff = Math.max(...known.map((handoff) => dayNumber(handoff.date)!));
  const highest = Math.max(...known.map((handoff) => LADDER.indexOf(handoff.step)));
  const newEntries = entries.filter((entry) => {
    const day = dayNumber(entry.date);
    return day !== null && day > lastHandoff;
  }).length;

  if (newEntries === 0) return { kind: "waiting", since: isoFromDay(lastHandoff) };

  const reached = LADDER[highest]!;
  if (highest === LADDER.length - 1) return { kind: "top", step: reached, newEntries };
  return { kind: "next", step: LADDER[highest + 1]!, after: reached, newEntries };
}
