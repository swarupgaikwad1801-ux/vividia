/**
 * Who the app may suggest, derived from where the child said it happens.
 *
 * This module exists for one absolute rule. From CLAUDE.md and
 * `content/adult_guide.json`:
 *
 * > If the child said it happens at home, never suggest family members at any
 * > step.
 *
 * Step 4 of the journey used to assume the trusted adult was safe. The
 * question "Where does this happen?" is what removes that assumption, and this
 * file is the only place the child's answer turns into a list of people.
 *
 * Nothing may filter these options inside JSX. A condition hidden in a render
 * is invisible to the type checker and to whoever edits the markup next, and
 * the failure mode is not a layout bug: it hands a child's disclosure to the
 * person harming them.
 *
 * Three things make the rule hard to break by accident:
 *
 * 1. An option declares the *kind* of adult it is (`context`), and a place
 *    allows kinds, never names. A new option tagged `"family"` - "my mum", "my
 *    older brother" - inherits the exclusion without anyone remembering it.
 * 2. `ALLOWED_CONTEXTS` is an exhaustive `Record` over `WhereItHappens`, so
 *    adding a place (a bus, a sports club, a care home) does not compile until
 *    someone decides which kinds of adult it allows. There is no permissive
 *    default to fall into.
 * 3. An answer this module does not recognise - a stale value from storage, a
 *    typo in a URL - resolves to the most restrictive list rather than the
 *    most generous one. Unknown input must never widen who gets suggested.
 *
 * The sentence the child reads about the exclusion is derived from the same
 * table (`familyExcluded`), so the explanation on screen cannot drift out of
 * step with the options on screen.
 *
 * This module sends nothing anywhere. It returns labels for a list; the child
 * shows the card to a person themselves.
 */

import type { StringKey } from "../lib/strings.ts";

/** The child's answer to `where.title`. */
export type WhereItHappens = "school" | "home" | "online" | "elsewhere";

/** Order the places are offered in, and their wording in strings.ts. */
export const WHERE_OPTIONS: readonly { id: WhereItHappens; labelKey: StringKey }[] = [
  { id: "school", labelKey: "where.school" },
  { id: "home", labelKey: "where.home" },
  { id: "online", labelKey: "where.online" },
  { id: "elsewhere", labelKey: "where.elsewhere" },
];

/**
 * What kind of adult an option is, which is the only thing a place reasons
 * about.
 *
 * - `school`: staff the child already sees every day.
 * - `professional`: trained support attached to the school (Schulsozialarbeit).
 * - `family`: anyone the child lives with or is related to.
 */
export type AdultContext = "school" | "professional" | "family";

export type AdultId = "classTeacher" | "trustedTeacher" | "socialWorker" | "family";

export interface AdultOption {
  id: AdultId;
  labelKey: StringKey;
  context: AdultContext;
}

/**
 * Every adult the app can suggest, with no filtering applied.
 *
 * Add here, tag the `context` honestly, and the rules below do the rest. The
 * labels live in strings.ts (Neel owns the wording); only the key is here.
 */
const ADULT_OPTIONS: readonly AdultOption[] = [
  { id: "classTeacher", labelKey: "handoff.classTeacher", context: "school" },
  { id: "trustedTeacher", labelKey: "handoff.trustedTeacher", context: "school" },
  { id: "socialWorker", labelKey: "handoff.socialWorker", context: "professional" },
  { id: "family", labelKey: "handoff.family", context: "family" },
];

/**
 * Which kinds of adult each place allows, in the order they are offered.
 *
 * The list is both the filter and the priority: the first entry decides which
 * adult the card suggests first.
 *
 * `home` is the rule this screen exists for. It does not list `family`, so no
 * family option can reach the screen when the child says it happens at home -
 * and `professional` comes first, because the trained support role is the
 * better default when the people at home are the ones involved.
 *
 * `online` and `elsewhere` keep `family`, deliberately. The rule in CLAUDE.md
 * is about home, and cutting a child off from a parent who could help - when
 * the harm is happening in a group chat - would be its own harm. "Somewhere
 * else" is the uncertain one; see the PR description, it is a product question
 * for the team, not something to decide silently in code.
 */
const ALLOWED_CONTEXTS: Record<WhereItHappens, readonly AdultContext[]> = {
  school: ["school", "professional", "family"],
  home: ["professional", "school"],
  online: ["school", "professional", "family"],
  elsewhere: ["school", "professional", "family"],
};

/**
 * The most restrictive answer we have, used for anything unrecognised.
 *
 * Pointing this at `home` is on purpose: if we cannot tell where the harm is,
 * we must not be the ones to suggest a family member.
 */
const SAFEST_WHERE: WhereItHappens = "home";

export function isWhereItHappens(value: unknown): value is WhereItHappens {
  return WHERE_OPTIONS.some((option) => option.id === value);
}

function contextsFor(where: WhereItHappens): readonly AdultContext[] {
  // `where` is typed, but it can arrive from storage, a URL or another screen,
  // so an unknown value narrows the list instead of widening it.
  return ALLOWED_CONTEXTS[where] ?? ALLOWED_CONTEXTS[SAFEST_WHERE];
}

/**
 * The adults the app may suggest for this answer, best suggestion first.
 *
 * Derived, never hand-written per place: the table above is the whole rule.
 */
export function suggestedAdults(where: WhereItHappens): readonly AdultOption[] {
  const allowed = contextsFor(where);
  return ADULT_OPTIONS.filter((option) => allowed.includes(option.context)).sort(
    (a, b) => allowed.indexOf(a.context) - allowed.indexOf(b.context),
  );
}

/**
 * The one adult the card leads with. `null` only if every option were removed,
 * which no place currently does.
 */
export function primarySuggestion(where: WhereItHappens): AdultOption | null {
  return suggestedAdults(where)[0] ?? null;
}

/**
 * True when this answer takes family out of the list, which is when the child
 * is owed an explanation (`handoff.homeNote`).
 *
 * Read from the same table as the options, so the note and the list can never
 * contradict each other.
 */
export function familyExcluded(where: WhereItHappens): boolean {
  return !contextsFor(where).includes("family");
}
