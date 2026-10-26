/**
 * The ladder as something a screen can render: a rung's names, why it is a
 * different door, where its contacts come from, and what state it is in.
 *
 * ## What this is NOT
 *
 * It is not a second copy of `lib/followups.ts`. That module (Neel, PR #37)
 * decides which rung comes next and this one never second-guesses it:
 * `rungStates()` takes the `Suggestion` it produced and does nothing but
 * translate it into per-row display state. `RUNGS` is checked against `LADDER`
 * by a test, so a rung added there cannot be silently missing here.
 *
 * ## Every intent is navigation
 *
 * `LadderIntent` is the complete set of things the ladder can ask the app to
 * do, and **every member of it opens a screen for the child to look at**.
 * There is deliberately no intent that sends, shares, mails, dials or posts
 * anything, and no intent carries a recipient — because the recipient is a
 * person standing in front of the child, not an address. Adding a sixth
 * member that transmitted something would be a visible change to this type in
 * review, which is the point of having it.
 *
 * `noSend.test.ts` backs that up mechanically by reading these files and
 * failing on network and dialling primitives.
 *
 * ## Contacts come from somewhere else, on purpose
 *
 * The top two rungs are real services with real phone numbers. Those numbers
 * are defined once, in `content/helplines.json`, and reach the app through
 * `GET /api/resources`; `lib/help.ts` formats and sorts them, and Neel's help
 * screen (PR #47) renders them. A rung marked `contactsElsewhere` therefore
 * names the door and hands off to that screen, and no contact detail is
 * written down here.
 */

import { LADDER, type Handoff, type LadderStep, type Suggestion } from "../lib/followups.ts";
import type { CopyKey } from "./copy.ts";

/** One rung, as a row on the screen. */
export interface Rung {
  step: LadderStep;
  /**
   * The names of this door, one line each.
   *
   * A list rather than one string because `trusted` is genuinely two roles
   * ("Vertrauenslehrkraft" and "Schulsozialarbeit") and joining them would
   * need the word "or" in three languages for no gain.
   */
  nameKeys: readonly CopyKey[];
  /** What makes this door different from the one below it. */
  whyKey: CopyKey;
  /**
   * True when this rung's contact details live in Neel's help screen rather
   * than anywhere in this feature. See the file header.
   */
  contactsElsewhere: boolean;
}

export const RUNGS: readonly Rung[] = [
  {
    step: "teacher",
    // Already translated in lib/strings.ts, so not re-drafted in copy.ts.
    nameKeys: ["handoff.classTeacher"],
    whyKey: "ladder.why.teacher",
    contactsElsewhere: false,
  },
  {
    step: "trusted",
    nameKeys: ["handoff.trustedTeacher", "handoff.socialWorker"],
    whyKey: "ladder.why.trusted",
    contactsElsewhere: false,
  },
  {
    step: "head",
    nameKeys: ["ladder.rung.head"],
    whyKey: "ladder.why.head",
    contactsElsewhere: false,
  },
  {
    step: "school_psychology",
    nameKeys: ["ladder.rung.schoolPsychology"],
    // content/adult_guide.json: "contacts_from: resources.py (live, per state)".
    whyKey: "ladder.why.schoolPsychology",
    contactsElsewhere: true,
  },
  {
    step: "helplines",
    nameKeys: ["ladder.rung.helplines"],
    whyKey: "ladder.why.helplines",
    contactsElsewhere: true,
  },
] as const;

/**
 * How one rung reads right now.
 *
 * - `shown`   the child recorded that they showed this rung
 * - `start`   nobody has been shown yet, and this is the first rung
 * - `next`    it kept happening after the last handoff, and this is the rung above
 * - `top`     the highest rung is reached and it is still happening
 * - `later`   none of the above: present, not pushed
 */
export type RungState = "shown" | "start" | "next" | "top" | "later";

/** The copy that labels each state. */
export const STATE_KEY: Record<RungState, CopyKey | null> = {
  shown: "ladder.stateShown",
  start: "ladder.stateStart",
  next: "ladder.stateNext",
  // `top` already gets the `ladder.topRung` paragraph; a badge too would be
  // the app saying "you are out of steps" twice.
  top: "ladder.stateShown",
  later: "ladder.stateLater",
};

/**
 * Display state per rung.
 *
 * The suggested rung wins over `shown` when they are the same row, which only
 * happens for `top`: the child is already at the highest rung and it is still
 * happening. `ladder.topRung` says they may go back to the same people, so
 * showing it as merely "done" would be the one reading that is wrong.
 */
export function rungStates(
  suggestion: Suggestion,
  handoffs: readonly Handoff[],
): Record<LadderStep, RungState> {
  const shown = new Set(handoffs.map((handoff) => handoff.step));
  const suggested = "step" in suggestion ? suggestion.step : null;

  const states = {} as Record<LadderStep, RungState>;
  for (const step of LADDER) {
    if (step === suggested && suggestion.kind !== "waiting") {
      states[step] = suggestion.kind;
    } else if (shown.has(step)) {
      states[step] = "shown";
    } else {
      states[step] = "later";
    }
  }
  return states;
}

/**
 * Everything the ladder can ask the app to do. All of it is navigation: each
 * member opens a screen the child then looks at and acts on themselves.
 */
export type LadderIntent =
  /** Open the handoff card (journey step 4) for this rung. */
  | { kind: "open-handoff"; step: LadderStep }
  /** Open Neel's help screen, which renders the real contacts. */
  | { kind: "open-help" }
  /** Open the child's own timeline, so they can see what would travel. */
  | { kind: "open-timeline" }
  /** Open the ladder itself, from the follow-up check-in. */
  | { kind: "open-ladder" };

/**
 * The buttons a rung offers, in order.
 *
 * Returned as data so the choice is testable without a DOM, and so the rule
 * "a rung whose contacts live elsewhere must offer the way to find them" is
 * one assertion rather than a branch buried in JSX.
 */
export function rungIntents(rung: Rung): readonly LadderIntent[] {
  const handoff: LadderIntent = { kind: "open-handoff", step: rung.step };
  return rung.contactsElsewhere ? [{ kind: "open-help" }, handoff] : [handoff];
}

/** The button label for an intent. */
export const INTENT_KEY: Record<LadderIntent["kind"], CopyKey> = {
  "open-handoff": "ladder.show",
  "open-help": "ladder.seeWho",
  "open-timeline": "timeline.title",
  "open-ladder": "followup.openLadder",
};
