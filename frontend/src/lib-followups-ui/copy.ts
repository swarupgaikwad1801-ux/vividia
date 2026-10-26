/**
 * Wording for the follow-up and the ladder, and what to do about the sentences
 * `lib/strings.ts` does not have yet.
 *
 * `lib/strings.ts` is Neel's file and the only home for interface copy in three
 * languages. These two screens need sentences that are not in it yet, and
 * adding them here in German or Hindi would be worse than not shipping them:
 * nobody on the team reads German well enough to review it, and Hindi is an
 * unreviewed draft already (`HINDI_REVIEWED === false`). Unreviewed copy that
 * looks reviewed is the failure mode to avoid.
 *
 * So `DRAFT_COPY` holds **English only**, every entry is listed in the PR for
 * Neel to translate, and `copy()` prefers `strings.ts` whenever the key exists
 * there. Nothing in this file has to change on the day the keys land: the
 * lookup starts returning the reviewed sentence by itself, and
 * `copy.test.ts` fails on any draft that has become a duplicate, so the dead
 * draft cannot sit here pretending to be needed.
 *
 * `Copy.lang` is the language of the text that actually came back, so a screen
 * can put it on the element. A German-speaking child using a screen reader
 * should not have an English draft read to them with German phonemes, and
 * `lang` is also how a reader is told honestly which parts are not translated.
 */

import { FALLBACK_LANG, STRINGS, isLang, t, type StringKey } from "../lib/strings.ts";

/**
 * English-only drafts, awaiting keys in `lib/strings.ts`.
 *
 * Empty: every sentence these screens use now has a key in strings.ts with
 * German and Hindi. The mechanism stays, so a new sentence can be shipped as
 * an honest English draft (with the English-only notice) rather than as
 * unreviewed German, and `copy.test.ts` still fails on any draft that
 * duplicates a key in strings.ts.
 */
export const DRAFT_COPY = {} as const satisfies Record<string, string>;

export type DraftKey = keyof typeof DRAFT_COPY;

/** A key in `lib/strings.ts`, or one still waiting to be added to it. */
export type CopyKey = StringKey | DraftKey;

export interface Copy {
  text: string;
  /** The language `text` is actually in, for the element's `lang` attribute. */
  lang: string;
  /** True when this came from `lib/strings.ts` rather than an English draft. */
  fromStrings: boolean;
}

/** The sentence for `key`, preferring `lib/strings.ts` over the English draft. */
export function copy(key: CopyKey, lang: string): Copy {
  if (key in STRINGS) {
    return {
      text: t(key as StringKey, lang),
      lang: isLang(lang) ? lang : FALLBACK_LANG,
      fromStrings: true,
    };
  }
  return { text: DRAFT_COPY[key as DraftKey], lang: "en", fromStrings: false };
}

/**
 * The same thing as props, so a screen cannot render the text and forget the
 * `lang` that goes with it: `<p {...says("ladder.intro", lang)} />`.
 */
export function says(key: CopyKey, lang: string): { lang: string; children: string } {
  const { text, lang: of } = copy(key, lang);
  return { lang: of, children: text };
}

/** Keys still being served from the English drafts, for an honest UI notice. */
export function untranslatedKeys(): DraftKey[] {
  return (Object.keys(DRAFT_COPY) as DraftKey[]).filter((key) => !(key in STRINGS));
}

/**
 * Props for the "some of this is English only" line, or null when it would be
 * untrue or pointless.
 *
 * Null for a child reading English (for whom there is nothing to disclose) and
 * null once every draft above has a key in `lib/strings.ts`, so the notice
 * takes itself off the screen on the day Neel's wording lands rather than
 * waiting for someone to remember to delete it.
 */
export function englishOnlyNotice(lang: string): { lang: string; children: string } | null {
  if (lang === "en" || untranslatedKeys().length === 0) return null;
  return says("app.englishOnly", lang);
}
