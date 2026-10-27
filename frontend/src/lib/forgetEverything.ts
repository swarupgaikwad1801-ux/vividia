/**
 * One place that knows what "everything" means.
 *
 * "Delete everything" used to call `clearAll()` from `timeline.ts` only, and
 * by then the app had grown three more stores: the check-in schedule, the
 * handoff record, and the note saying when the PIN was removed. A child who
 * pressed it was told everything was gone while the app still remembered
 * that they had taken a report to a teacher and when their PIN was taken
 * off. On a shared phone that is the opposite of what they asked for.
 *
 * The risk is not that any one of these is hard to clear. It is that the
 * next feature adds a fifth store and nobody edits the delete button. So the
 * list lives here, next to a test that fails when a store is added and not
 * added here, rather than inside a screen where it reads as an
 * implementation detail of the timeline.
 *
 * Nothing here is network. Every one of these is browser storage on the
 * child's own device: deleting is local and immediate, and no one is told.
 */

import { clearHandoffs } from "../lib-followups-ui/handoffStore";
import { forgetCheckIns } from "../lib-followups-ui/checkInState";
import { forgetPinRemoved } from "./pin";
import { clearAll } from "./timeline";
import { forgetAvatar } from "./avatar";

/**
 * Every store the app writes to, cleared.
 *
 * Each call is wrapped: storage can refuse (a private window, a full disk, a
 * browser with site data blocked), and one store refusing must not leave the
 * other three behind. A child asking to be forgotten gets as much of it as
 * the device will allow, not the first store and then an exception.
 *
 * This is the same rule as everywhere else in the app: one failure never
 * hides the part that matters.
 */
export function forgetEverything(): void {
  for (const forget of [clearAll, forgetCheckIns, clearHandoffs, forgetPinRemoved, forgetAvatar]) {
    try {
      forget();
    } catch {
      // Deliberately silent, and deliberately not rethrown. There is nothing
      // the child could do with the error, and the remaining stores still
      // need clearing.
    }
  }
}
