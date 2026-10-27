/**
 * Where the child is, and where "back" goes from there.
 *
 * The app has no router (see App.tsx), so back is a trail of steps kept in
 * memory: every move adds one, back removes one. Nothing touches
 * `history.pushState`, which is what lets quick exit leave with nothing to go
 * back to.
 *
 * Three rules, each tested in nav.test.ts:
 *
 * 1. **Check-in is home.** Going to it starts a new trail, so back never
 *    reaches the language picker (first run only) or anything before home.
 * 2. **The lock is not a step.** Being locked is a condition in App.tsx, so
 *    no trail can contain it and back can never land on or behind it.
 * 3. **No loops.** Going to a step already on the trail cuts back to it, so
 *    timeline → card → "change it" → timeline leaves one timeline, and back
 *    from there goes where the child came from, not round in a circle.
 */

export type Step =
  | "language" // first run, and the 🌐 button on the check-in
  | "onboarding" // three picture cards: after the language, and on request
  | "checkIn" // the emoji check-in: the step that needs no language
  // The picture questions (screens/PictureQuestions.tsx), one per screen, so
  // Back goes one question back.
  | "picWhat"
  // Follow-ups, asked only after the answer they follow (lib/questions.ts).
  | "picBody"
  | "picTaken"
  | "picWhereOnline"
  | "picWhen"
  | "picOwn"
  | "picWhere"
  | "picWho"
  | "picAdultWhere"
  | "picOften"
  | "picFeel"
  | "picReview" // the child checks the lines before they are saved
  | "picMore" // "Want to say more in your own words?": optional writing
  | "write" // the centrepiece: find the words
  | "timeline" // everything they have written
  | "report" // the bilingual card, approved word by word
  | "handoff" // choose who sees it
  | "handoffShow" // the card, big, to hold up to that person
  | "handoffDone" // "in a few days, the app will ask how things are"
  | "escalation" // the next door, if the first one did not open
  | "pinSet" // set or change the PIN
  | "help"; // the people who can help, behind the red Need help button

/*
 * Every member must have a door: some navigation in App.tsx that reaches it
 * (Vernika's #82). `followUp` is not a step: `FollowUp` gates itself and is
 * rendered in place above the check-in, which is where its door to
 * `escalation` is. `App.reachable.test.ts` checks this union against App.tsx.
 */

export const HOME: Step = "checkIn";

/** A trail is never empty: its last step is the one showing. */
export type Trail = readonly Step[];

export function start(first: Step): Trail {
  return [first];
}

export function current(trail: Trail): Step {
  return trail[trail.length - 1];
}

export function go(trail: Trail, next: Step): Trail {
  if (next === HOME) return [HOME];
  const seen = trail.indexOf(next);
  if (seen !== -1) return trail.slice(0, seen + 1);
  return [...trail, next];
}

export function canGoBack(trail: Trail): boolean {
  return trail.length > 1;
}

export function back(trail: Trail): Trail {
  return canGoBack(trail) ? trail.slice(0, -1) : trail;
}

/**
 * After a language is chosen: back to where the child was (the 🌐 button on
 * the check-in), or home on first run, when there is nowhere to go back to.
 */
export function afterLanguage(trail: Trail): Trail {
  return canGoBack(trail) ? back(trail) : go(trail, HOME);
}
