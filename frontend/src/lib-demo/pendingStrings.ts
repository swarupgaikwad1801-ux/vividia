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
  /** Shown only when the person already had their own entries before pressing. */
  "demo.ownEntriesKept": {
    en: "You already have your own notes saved. The example is added next to them, and clearing it removes only the example.",
    de: "Du hast schon eigene Notizen gespeichert. Das Beispiel kommt daneben, und beim Entfernen wird nur das Beispiel gelöscht.",
    hi: "आपके अपने नोट्स पहले से सेव हैं। उदाहरण उनके साथ जुड़ता है, और हटाने पर सिर्फ़ उदाहरण मिटेगा।",
  },
} as const satisfies Record<string, Text>;

export type PendingKey = keyof typeof PENDING_STRINGS;

/** Same contract as `t` in strings.ts, so swapping it later is a rename. */
export function tp(key: PendingKey, lang: string): string {
  const entry: Text = PENDING_STRINGS[key];
  return (isLang(lang) && entry[lang]) || entry[FALLBACK_LANG];
}
