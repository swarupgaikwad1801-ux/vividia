/**
 * The three languages a child may choose, and how each one is written.
 *
 * ## Why this is not in `lib/strings.ts`
 *
 * `strings.ts` holds sentences the app says to a child, in every language.
 * A language's *name* is not that: "Deutsch" is the same word whichever
 * language the surrounding screen is in, because it is written the way its own
 * speakers write it. A child who cannot read a word of English must still be
 * able to find their language on the very first screen, and that only works if
 * the label is in their own script rather than translated into ours.
 *
 * So the endonym is the label, and the English name is a quiet second label
 * beside it (see `englishName` for why it is not on every row).
 *
 * ## Why the list is derived from `LANGS`
 *
 * The shipped set lives in `lib/strings.ts` and is not ours to change. Mapping
 * over `LANGS` through a `Record<Lang, …>` means a language added there
 * without a name here is a type error, not a picker that silently offers two
 * options out of three.
 *
 * ## Nothing here is right-to-left, on purpose
 *
 * Arabic, Ukrainian and Turkish were dropped (CLAUDE.md, the language gate),
 * so every language we ship is left-to-right. `dir` is therefore typed `"ltr"`
 * and not `string`: writing `dir="rtl"` here would not compile, which is the
 * point. Nobody should read this file and think RTL is supported and tested
 * when no RTL language survived the gate.
 *
 * Nothing in this module touches the network or browser storage.
 */

import { LANGS, isLang } from "../lib/strings.ts";
import type { Lang } from "../lib/strings.ts";

/**
 * Writing direction of an option.
 *
 * Deliberately narrower than HTML allows. See the note above: we ship no
 * right-to-left language, and a `dir` that could be `"rtl"` would advertise
 * support that was never built or measured.
 */
export type Dir = "ltr";

export interface LanguageOption {
  code: Lang;
  /** The language's name as its own speakers write it. The real label. */
  endonym: string;
  /**
   * The English name, or `null` when it would only repeat the endonym
   * ("English", "Hinglish").
   *
   * English gets `null`: "English / English" is noise on the one row that
   * needs no help. German and Hindi get theirs, because the child this app is
   * hardest for may read Latin script better than their own written script —
   * a Hindi-speaking 13-year-old schooled in Germany often reads "Hindi"
   * faster than "हिन्दी". The cost is one small grey word; the gain is that
   * both kinds of reader can find the same row.
   */
  englishName: string | null;
  /** BCP-47 tag for the `lang` attribute on the option. */
  htmlLang: string;
  dir: Dir;
}

/**
 * Names, keyed by the shipped language codes.
 *
 * These are endonyms, not translations, so no reviewer is needed for them the
 * way `strings.ts` needs one for Hindi copy: "Deutsch" is how German names
 * itself and is the same on every screen.
 *
 * The code `hi` is labelled "Hinglish" (Neel, 26 Oct): its screens are Hindi
 * in Roman letters, because the children we build for read that more easily
 * than Devanagari. "Hinglish" is also what those children call it, and it is
 * the same word in English, so it needs no second name. `hi-Latn` tells the
 * browser and a screen reader the text is Hindi written in Latin script.
 */
const NAMES: Record<Lang, Omit<LanguageOption, "code" | "dir">> = {
  en: { endonym: "English", englishName: null, htmlLang: "en" },
  de: { endonym: "Deutsch", englishName: "German", htmlLang: "de" },
  hi: { endonym: "Hinglish", englishName: null, htmlLang: "hi-Latn" },
};

/**
 * Every language a child can pick, in the order `strings.ts` lists them.
 *
 * The order is fixed and never re-sorted around the device's language. A list
 * of three that rearranges itself is harder to learn than one that does not,
 * and the device's language is marked instead (see `suggested` in the picker).
 */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = LANGS.map((code) => ({
  code,
  ...NAMES[code],
  dir: "ltr",
}));

/** The option for a code, or `undefined` for a language we do not ship. */
export function optionFor(code: string): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find((option) => option.code === code);
}

/**
 * The first shipped language in a list of BCP-47 tags, or `null` for none.
 *
 * Matches on the primary subtag only, so "de-AT", "de_DE" and "DE" are all
 * German: a child on an Austrian phone is not a child with no language. A tag
 * for a language we dropped ("ar-EG") returns `null` rather than the nearest
 * thing, because guessing here would put a screen in front of a child in a
 * language they did not ask for.
 */
export function matchDeviceLang(tags: readonly string[]): Lang | null {
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (primary && isLang(primary)) return primary;
  }
  return null;
}

/** Just the two `navigator` fields this needs, so a test can pass its own. */
export interface DeviceLangSource {
  readonly language?: string;
  readonly languages?: readonly string[];
}

function safeNavigator(): DeviceLangSource | null {
  try {
    // Reading the property itself can throw in locked-down embedders, and
    // `navigator` is simply absent under Node, where the tests run.
    return (globalThis.navigator as DeviceLangSource | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * What the device says the child reads, or `null` if it is none of our three.
 *
 * `navigator.languages` first, because it is the child's whole preference
 * order most-wanted first, and a phone set to Hindi with German second should
 * land on Hindi. `navigator.language` is appended as the fallback for
 * browsers that omit the list.
 *
 * This is a **hint and nothing else**. CLAUDE.md's promise is that the app
 * never decides for the child; the caller marks this option on the first-run
 * screen and waits for a tap. Nothing here writes storage or applies a
 * language.
 */
export function deviceLang(source?: DeviceLangSource): Lang | null {
  const nav = source ?? safeNavigator();
  if (!nav) return null;
  const tags = [...(nav.languages ?? []), ...(nav.language ? [nav.language] : [])];
  return matchDeviceLang(tags);
}

/**
 * Put the chosen language on `<html lang>` and `<html dir>`.
 *
 * Worth doing: it is what tells a screen reader which voice to read a Hindi
 * screen in, and what lets the browser pick "Noto Sans Devanagari" out of the
 * font stack rather than falling back to a system face.
 *
 * Exported rather than called from a component, because `<html>` belongs to
 * the app shell and `App.tsx` is Vernika's file. Safe to call in an effect on
 * every language change; it never throws if there is no document.
 */
export function applyDocumentLang(lang: Lang): void {
  const option = optionFor(lang);
  if (!option) return;
  try {
    const root = globalThis.document?.documentElement;
    if (!root) return;
    root.lang = option.htmlLang;
    root.dir = option.dir;
  } catch {
    // Nothing a child can do about it, and nothing worth breaking a screen
    // over: the app still reads correctly, just with the document's old tag.
  }
}
