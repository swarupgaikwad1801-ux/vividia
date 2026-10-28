/**
 * The PIN lock on the child's notes (issue #133, Neel, 28 Oct).
 *
 * Before this, the PIN was checked once, when the page loaded: after a child
 * set one, the app went straight back to the notes, unlocked, and stayed so
 * until a reload. Now the PIN guards the notes themselves:
 *
 * - Opening **My notes** with no PIN asks the child to set one first.
 * - With a PIN, the notes open only after it is typed, **every time**.
 * - They lock again when the child leaves the notes, when the app is hidden
 *   and when Leave now is pressed (App.tsx).
 *
 * "The notes" are every screen that shows what the child saved: the
 * timeline, the report, the card (handoff and the big card), the escalation
 * ladder, and the PIN settings themselves, so a PIN cannot be changed
 * without knowing it. Moving between them keeps the notes open; leaving to
 * any other screen, help included, locks them.
 *
 * Kept as before:
 * - The lock is never a `Step` (lib/nav.ts): it is a condition App.tsx checks
 *   while rendering, so no navigation can reach past it.
 * - With storage blocked (`pinStatus()` is "unavailable") nothing locks, so a
 *   browser setting cannot shut a child out of their own words.
 * - With no PIN, only My notes asks for one. Making a card straight after the
 *   picture questions still works without a PIN: a child who has not chosen
 *   one is not stopped in the middle of telling someone.
 */

import type { Step } from "./nav";
import type { PinStatus } from "./pin";

export const NOTES_STEPS: ReadonlySet<Step> = new Set<Step>([
  "timeline",
  "report",
  "handoff",
  "handoffShow",
  "escalation",
  "pinSet",
]);

/**
 * What App.tsx shows for this step:
 * - "open": the screen itself;
 * - "unlock": the PIN entry, in place of the screen;
 * - "setFirst": make a PIN, in place of My notes.
 */
export type Gate = "open" | "unlock" | "setFirst";

/**
 * `mustSetPin` is true after "I forgot my PIN": the PIN is gone, and every
 * screen of the notes asks for a new one before it opens. The lock never
 * navigates to do this (App.tsx: a lock that moved `step` was a leak once).
 */
export function notesGate(step: Step, pin: PinStatus, notesOpen: boolean, mustSetPin = false): Gate {
  if (!NOTES_STEPS.has(step)) return "open";
  if (pin === "unavailable") return "open";
  if (pin === "set") return notesOpen ? "open" : "unlock";
  return step === "timeline" || mustSetPin ? "setFirst" : "open";
}

/** True while `step` is one of the notes, so an open lock may stay open. */
export function isNotes(step: Step): boolean {
  return NOTES_STEPS.has(step);
}
