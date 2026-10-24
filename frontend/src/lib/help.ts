/**
 * Presenting the help list honestly.
 *
 * This is the smallest module in the app and it carries one of its hardest
 * truths. From `CLAUDE.md`:
 *
 * > `116 111` is German; krisenchat is German and Ukrainian. Neither confirms
 * > Hindi or English counselling. So in a crisis we currently hand a
 * > Hindi-speaking child a number nobody will answer them on.
 * >
 * > **The crisis screen must print each service's languages**; hiding this is
 * > worse than the gap itself.
 *
 * So `languageNote()` exists to be shown, not to be available. A screen that
 * renders the name, the number and the hours but drops the language note is
 * the screen that sends a child to a phone line where nobody can talk to
 * them, and lets them find that out alone.
 *
 * `sortForChild()` does what it can about it: a service the child can
 * actually use comes first. It cannot create one.
 *
 * Nothing here changes `src/types/api.ts`; `Resource` is imported as it is.
 */

import type { Resource } from "../types/api.ts";

/** Languages we have interface copy for. */
export type Lang = "en" | "de" | "hi";

const FALLBACK_LANG: Lang = "en";

function pick(lang: string): Lang {
  return lang === "de" || lang === "hi" ? lang : FALLBACK_LANG;
}

/**
 * Language names, in each language we ship.
 *
 * Only the codes that actually appear in `content/helplines.json` (`de`,
 * `uk`) plus the two we ship as source languages. An unknown code falls back
 * to the code in capitals, which is ugly but never wrong: inventing a name
 * for a language we do not have a word for would be.
 *
 * The German and Hindi wording has NOT been read by a native speaker.
 */
const LANGUAGE_NAMES: Record<string, Record<Lang, string>> = {
  de: { en: "German", de: "Deutsch", hi: "जर्मन" },
  en: { en: "English", de: "Englisch", hi: "अंग्रेज़ी" },
  hi: { en: "Hindi", de: "Hindi", hi: "हिंदी" },
  uk: { en: "Ukrainian", de: "Ukrainisch", hi: "यूक्रेनी" },
};

/** "and" as a list joiner, per language. */
const AND: Record<Lang, string> = { en: " and ", de: " und ", hi: " और " };

export const HINDI_REVIEWED = false;

export function languageName(code: string, lang: string): string {
  return LANGUAGE_NAMES[code]?.[pick(lang)] ?? code.toUpperCase();
}

/** Does this service work in the child's own language? */
export function speaksChildLanguage(resource: Resource, lang: string): boolean {
  return resource.languages.includes(lang);
}

/**
 * The sentence a screen must print next to the service.
 *
 * "only" is added whenever the child's own language is NOT among them, which
 * is the case the child needs to know about before they dial. A service that
 * does speak their language gets a plain statement rather than a warning.
 *
 * Returns "" when the service declares no languages at all, because a note
 * that says nothing is worse than no note: it looks like an answer.
 */
export function languageNote(resource: Resource, lang: string): string {
  const of = pick(lang);
  const names = resource.languages.map((code) => languageName(code, of));
  if (names.length === 0) return "";

  const list =
    names.length === 1
      ? names[0]!
      : `${names.slice(0, -1).join(", ")}${AND[of]}${names[names.length - 1]!}`;

  const onlyThese = !speaksChildLanguage(resource, lang);
  switch (of) {
    case "de":
      return onlyThese ? `Spricht nur ${list}` : `Spricht ${list}`;
    case "hi":
      return onlyThese ? `सिर्फ़ ${list} बोलते हैं` : `${list} बोलते हैं`;
    default:
      return onlyThese ? `Speaks ${list} only` : `Speaks ${list}`;
  }
}

/**
 * Services the child can use first, order otherwise untouched.
 *
 * Stable on purpose. The backend already returns these in a considered order
 * (`resources_with_source` puts the curated helplines before the local
 * lookup), and this must re-rank on exactly one axis without quietly
 * reshuffling the rest. Decorating with the original index rather than
 * trusting the engine's sort stability, because the cost is one map and the
 * failure mode is a crisis screen in a surprising order.
 */
export function sortForChild(resources: readonly Resource[], lang: string): Resource[] {
  return resources
    .map((resource, index) => ({ resource, index }))
    .sort((a, b) => {
      const aSpeaks = speaksChildLanguage(a.resource, lang) ? 0 : 1;
      const bSpeaks = speaksChildLanguage(b.resource, lang) ? 0 : 1;
      return aSpeaks - bSpeaks || a.index - b.index;
    })
    .map(({ resource }) => resource);
}

/** How a checked-on date reads, per language. */
const FRESHNESS: Record<Lang, { today: string; yesterday: string; days: (n: number) => string }> = {
  en: {
    today: "checked today",
    yesterday: "checked yesterday",
    days: (n) => `checked ${n} days ago`,
  },
  de: {
    today: "heute geprüft",
    yesterday: "gestern geprüft",
    days: (n) => `vor ${n} Tagen geprüft`,
  },
  hi: {
    today: "आज जाँचा गया",
    yesterday: "कल जाँचा गया",
    days: (n) => `${n} दिन पहले जाँचा गया`,
  },
};

/**
 * A short age for `Resource.retrieved_at`, so nothing looks fresher than it is.
 *
 * Returns "" for a date we cannot read. A wrong age is worse than none: the
 * whole reason this is on screen is that a child should be able to see how
 * old the number they are about to call actually is.
 *
 * A date in the future reads as today. Clock skew between a phone and a
 * server is ordinary, and "checked in -1 days" is not a thing to show anyone.
 *
 * `now` is injectable so the tests do not depend on the day they run.
 */
export function freshness(retrievedAt: string, lang: string = "en", now: Date = new Date()): string {
  const when = new Date(retrievedAt);
  if (Number.isNaN(when.getTime())) return "";

  const copy = FRESHNESS[pick(lang)];
  // Whole days apart by calendar date, not by elapsed hours: something checked
  // late yesterday reads as "yesterday", not as "today" because it was 20
  // hours ago.
  const startOf = (date: Date) =>
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.floor((startOf(now) - startOf(when)) / 86_400_000);

  if (days <= 0) return copy.today;
  if (days === 1) return copy.yesterday;
  return copy.days(days);
}
