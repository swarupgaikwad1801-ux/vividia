/**
 * Wording the demo entry point needs that lib/strings.ts does not have yet.
 *
 * TEMPORARY, and deliberately in its own file so it is one delete.
 * Neel owns every sentence a child or a judge reads, and lib/strings.ts is his
 * file, so this branch may not add keys to it. These are drafts, so the button
 * is not half-built while the keys are agreed; the PR description lists them
 * with this English wording. When they land in STRINGS, delete this file and
 * change the `tp(...)` calls in DemoButton.tsx to `t(...)`.
 *
 * The German and Hindi here are UNREVIEWED drafts by the same rule that keeps
 * HINDI_REVIEWED false in strings.ts. Nothing claims otherwise.
 */

import { FALLBACK_LANG, isLang } from "../lib/strings";
import type { Lang } from "../lib/strings";

type Text = Record<Lang, string>;

export const PENDING_STRINGS = {
  "demo.loading": {
    en: "Loading the example story…",
    de: "Die Beispielgeschichte wird geladen…",
    hi: "उदाहरण कहानी लोड हो रही है…",
  },
  /** {name} is replaced with the persona name from the story, never typed in. */
  "demo.loaded": {
    en: "{name}'s story is loaded. Her sentence is written and waiting — you press send.",
    de: "{name}s Geschichte ist geladen. Ihr Satz ist geschrieben und wartet — du drückst Senden.",
    hi: "{name} की कहानी लोड हो गई है। उसका वाक्य लिखा हुआ तैयार है — भेजना आप दबाते हैं।",
  },
  "demo.clear": {
    en: "Clear the example",
    de: "Beispiel entfernen",
    hi: "उदाहरण हटाएँ",
  },
  "demo.cleared": {
    en: "The example is gone. The app is back to empty.",
    de: "Das Beispiel ist weg. Die App ist wieder leer.",
    hi: "उदाहरण हट गया। ऐप फिर से खाली है।",
  },
  /**
   * The refusal: the person has notes of their own, so the example was not
   * loaded at all.
   *
   * It says what happened and what to do, and it does NOT apologise or offer
   * to load it anyway. The child's own words are the thing being protected
   * here, and the example is the thing that can wait.
   *
   * Earlier wording said "the example is added next to them", from when both
   * were kept side by side. After the refusal landed that sentence described
   * the opposite of what happens, and a child reading it would have gone
   * looking for entries that were never written.
   */
  "demo.notLoadedOwnNotes": {
    en: "You have your own notes here, so the example was not loaded. Nothing of yours has changed.",
    de: "Du hast hier eigene Notizen, deshalb wurde das Beispiel nicht geladen. An deinen Notizen hat sich nichts geändert.",
    hi: "यहाँ आपके अपने नोट्स हैं, इसलिए उदाहरण लोड नहीं हुआ। आपका कुछ भी नहीं बदला।",
  },
} as const satisfies Record<string, Text>;

export type PendingKey = keyof typeof PENDING_STRINGS;

/** Same contract as `t` in strings.ts, so swapping it later is a rename. */
export function tp(key: PendingKey, lang: string): string {
  const entry: Text = PENDING_STRINGS[key];
  return (isLang(lang) && entry[lang]) || entry[FALLBACK_LANG];
}
