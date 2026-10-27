/**
 * Which rungs the child has already shown their words to, kept in their browser.
 *
 * `ladderStep()` in `lib/followups.ts` takes `Handoff[]` and nothing in the app
 * produced one yet, so this is where they come from. A handoff is recorded by
 * exactly one thing: **the child tapping "I showed this to them".** It is not
 * inferred from opening the handoff card, not from a timer, and not from
 * anything the backend says, because the app does not know whether a child who
 * opened a card actually walked into a room.
 *
 * Getting that wrong in the other direction would be worse: a handoff the child
 * did not make pushes the ladder up a rung and tells them to go to the head of
 * the school about a conversation that never happened.
 *
 * A handoff is also undoable. The child may tap it by accident, or decide that
 * what happened did not count as showing anyone.
 *
 * Nothing here is sent anywhere. The record exists so the app can stop
 * suggesting a door the child has already tried.
 */

import { LADDER, type Handoff, type LadderStep } from "../lib/followups.ts";
import { localStore, type StorageLike } from "./localStore.ts";

/** A handoff plus a local id, so one row can be undone. Mirrors `StoredEntry`. */
export interface StoredHandoff extends Handoff {
  /** Local only; never sent to the backend, which has no handoff endpoint. */
  id: string;
}

const KEY = "vividia.handoffs.v1";

function empty(): StoredHandoff[] {
  return [];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isStoredHandoff(value: unknown): value is StoredHandoff {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.date === "string" &&
    ISO_DAY.test(row.date) &&
    typeof row.step === "string" &&
    (LADDER as readonly string[]).includes(row.step)
  );
}

function parse(raw: unknown): StoredHandoff[] | null {
  // A damaged row is dropped rather than breaking the ladder. `ladderStep()`
  // filters unknown rungs again on its own side; this is the cheaper guard,
  // and it stops a bad row surviving in storage for the rest of the visit.
  return Array.isArray(raw) ? raw.filter(isStoredHandoff) : null;
}

const store = localStore<StoredHandoff[]>(KEY, empty, parse);

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Every handoff, oldest first. */
export function listHandoffs(): StoredHandoff[] {
  return [...store.read()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The child showed their words to this rung on this day.
 *
 * A second tap on a rung already recorded for that day is ignored rather than
 * stored twice: `ladderStep()` counts entries, not handoffs, so a duplicate
 * would change nothing except the number of Undo buttons on the row.
 */
export function addHandoff(step: LadderStep, date: string): StoredHandoff | null {
  if (!ISO_DAY.test(date) || !(LADDER as readonly string[]).includes(step)) return null;

  const current = store.read();
  const already = current.find((row) => row.step === step && row.date === date);
  if (already) return already;

  const stored: StoredHandoff = { id: newId(), step, date };
  store.write([...current, stored]);
  return stored;
}

export function removeHandoff(id: string): void {
  store.write(store.read().filter((row) => row.id !== id));
}

/** Every handoff recorded for one rung, so a row can offer Undo. */
export function handoffsFor(step: LadderStep): StoredHandoff[] {
  return listHandoffs().filter((row) => row.step === step);
}

/**
 * Forget every handoff.
 *
 * Belongs in the "delete everything" flow beside `timeline.clearAll()`: the
 * list of adults a child approached is as sensitive as the entries themselves,
 * and deleting one without the other leaves half a trail on a shared phone.
 * `lib/timeline.ts` is Vernika's file, so that wiring is flagged in the PR
 * rather than done here.
 */
export function clearHandoffs(): void {
  store.clear();
}

/** False when these rows will be gone when the page closes. */
export function isPersistent(): boolean {
  return store.isPersistent();
}

/** For tests, or to switch storage off. `null` keeps everything in memory. */
export function useStorage(next: StorageLike | null): void {
  store.useStorage(next);
}
