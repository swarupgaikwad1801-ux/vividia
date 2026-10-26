/**
 * The onboarding cards, in the order the child reads them.
 *
 * `content/onboarding.json` is where the wording is written and reviewed, and
 * `GET /api/onboarding` serves it. The screen does not fetch it: the first
 * screen after choosing a language must work with the radio off and must not
 * sit on a spinner while a free-tier backend wakes up. So the sentences are
 * copied into `strings.ts`, and `onboarding.test.ts` fails the build if the
 * copy and the file ever disagree - the same arrangement as the escalation
 * ladder in `followups.ts`.
 *
 * Nothing here is stored. Whether onboarding has been shown follows from the
 * language choice: it appears once, straight after the child picks one.
 */

import type { StringKey } from "./strings";

export interface OnboardingCard {
  /** The `id` in `content/onboarding.json`. */
  id: string;
  key: StringKey;
}

export const ONBOARDING_CARDS: readonly OnboardingCard[] = [
  { id: "what", key: "onboarding.what" },
  { id: "you-decide", key: "onboarding.youDecide" },
  { id: "where-words-go", key: "onboarding.whereWordsGo" },
  { id: "check-meaning", key: "onboarding.checkMeaning" },
  { id: "not-a-person", key: "onboarding.notAPerson" },
  { id: "leave-now", key: "onboarding.leaveNow" },
];
