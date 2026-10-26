/**
 * Asking once, and then not again: the difference between a follow-up and a nag.
 *
 * `lib/followups.ts` answers "is a check-in due?" from the entries and the
 * date alone. Its own header promises more than that:
 *
 * > **It never nags.** At most one check-in suggestion per gap; a child who
 * > ignores it is not reminded again until they write something new.
 *
 * `checkInDue()` cannot keep that promise by itself, because it has no memory:
 * once the gap has passed it returns true today, tomorrow and every day after,
 * so a child who looked at the question and did not want to answer would be
 * asked again every single time they opened the app. **That is reported as a
 * gap in PR #37, not fixed there** — this module supplies the memory instead,
 * on top of the unchanged function.
 *
 * The memory is two fields and is kept in the child's browser:
 *
 * - `handledFor` — the newest entry date at the moment the child last answered
 *   or dismissed. A newer entry means a new gap, so the question may come back
 *   once; until then it stays gone.
 * - `silenced` — the child said stop. Then it never comes back, in any gap,
 *   until they turn it back on themselves.
 *
 * **The child's answer is not stored.** "Better", "the same" and "worse" live
 * in React state for as long as the screen is open and are then forgotten. The
 * app has no use for a history of how a child said they felt, it is not allowed
 * to infer anything from one (`CLAUDE.md`: no diagnosis, no depression
 * inference), and a record of it on a shared phone is a risk to the child for
 * no benefit. Nothing is written to the timeline either: the timeline is the
 * child's account of what happened to them, and the app does not add rows to it.
 */

import { checkInDue } from "../lib/followups.ts";
import type { Entry } from "../types/api.ts";
import { latestEntryDate } from "./dates.ts";
import { localStore, type StorageLike } from "./localStore.ts";

export interface CheckInState {
  /** ISO date of the newest entry when the child last answered or dismissed. */
  handledFor: string | null;
  /** The child asked not to be asked again. */
  silenced: boolean;
}

const KEY = "vividia.followup.v1";

function empty(): CheckInState {
  return { handledFor: null, silenced: false };
}

function parse(raw: unknown): CheckInState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  return {
    handledFor: typeof value.handledFor === "string" ? value.handledFor : null,
    silenced: value.silenced === true,
  };
}

const store = localStore<CheckInState>(KEY, empty, parse);

export function readCheckInState(): CheckInState {
  return store.read();
}

/** False when this record will be gone when the page closes. */
export function isPersistent(): boolean {
  return store.isPersistent();
}

/** For tests, or to switch storage off. `null` keeps everything in memory. */
export function useStorage(next: StorageLike | null): void {
  store.useStorage(next);
}

/**
 * Should the check-in be on screen at all?
 *
 * `checkInDue()` decides the timing; this only adds "and the child has not
 * already dealt with this one". Four reasons to stay quiet, and the child
 * controls three of them.
 */
export function shouldAsk(entries: readonly Entry[], today: string): boolean {
  const state = store.read();
  if (state.silenced) return false;
  if (!checkInDue(entries, today)) return false;

  const latest = latestEntryDate(entries);
  if (latest === null) return false; // no readable entry: nothing to follow up on
  return state.handledFor === null || state.handledFor < latest;
}

/**
 * The child answered, or chose "not now".
 *
 * Both do exactly the same thing on purpose. Dismissing a question has to cost
 * the child no more than answering it, or the quiet option is not really
 * offered; and the app has no reason to treat silence as a different kind of
 * data point from speech.
 */
export function markHandled(entries: readonly Entry[]): void {
  store.write({ ...store.read(), handledFor: latestEntryDate(entries) });
}

/** "Stop asking me this." Honoured in every future gap, not just this one. */
export function silence(): void {
  store.write({ ...store.read(), silenced: true });
}

/**
 * Turn the question back on.
 *
 * Exported because "stop asking" must be reversible somewhere the child can
 * reach — a setting they cannot undo is a trap, not a choice. Vernika owns
 * where that control lives; see the gaps list in the PR.
 */
export function unsilence(): void {
  store.write({ ...store.read(), silenced: false });
}

/**
 * Forget the whole record.
 *
 * Belongs in the "delete everything" flow next to `timeline.clearAll()`:
 * a child who wipes their timeline should not leave a row behind saying which
 * day they last answered a question about it. That wiring is Vernika's, and
 * `lib/timeline.ts` is hers to change; flagged in the PR.
 */
export function forgetCheckIns(): void {
  store.clear();
}
