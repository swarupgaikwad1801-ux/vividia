/**
 * TEMPORARY wording for keys that do not exist in `lib/strings.ts` yet.
 *
 * Neel owns every sentence a child reads and `lib/strings.ts` is his file, so
 * this branch does not add keys to it. They sit here instead, in one module,
 * so that landing the real keys is a delete of this file plus a rename of
 * `tPending` to `t` at each call site — not a hunt through two screens and
 * four components. The PR description lists every key and its English.
 *
 * The English is the proposal. German and Hindi are drafts that no native
 * speaker has read, which is the caveat the rest of our non-English copy
 * already carries (`HINDI_REVIEWED` in `lib/strings.ts` and `lib/moods.ts`).
 *
 * Every sentence below obeys the same rules as `strings.ts`:
 * - nothing claims the app keeps a child safe
 * - nothing judges whether what the child wrote is true, and nothing diagnoses
 * - nothing is sent, shown or shared unless the child presses it themselves
 * - nothing says the child's words stay on the phone. The timeline does; the
 *   German does not, because it is written by a model in the cloud. That is
 *   why `report.cloudNote` exists and why it is on screen before the child
 *   presses the button that sends anything.
 */

import type { Lang } from "../lib/strings";

const FALLBACK_LANG: Lang = "en";

type Text = Record<Lang, string>;

export const PENDING_STRINGS = {
  "timeline.storageNote": {
    en: "This list is saved only in this browser. You can delete it whenever you want.",
    de: "Diese Liste wird nur in diesem Browser gespeichert. Du kannst sie jederzeit löschen.",
    hi: "यह सूची सिर्फ़ इसी ब्राउज़र में सेव होती है। आप इसे जब चाहें मिटा सकते हैं।",
  },
  "timeline.deleteAllYes": {
    en: "Yes, delete everything",
    de: "Ja, alles löschen",
    hi: "हाँ, सब कुछ मिटाएँ",
  },
  "timeline.deleteAllNo": {
    en: "No, keep it",
    de: "Nein, behalten",
    hi: "नहीं, रहने दें",
  },
  "timeline.deletedAll": {
    en: "Everything you saved has been deleted.",
    de: "Alles, was du gespeichert hast, ist gelöscht.",
    hi: "आपने जो सेव किया था, सब मिट गया है।",
  },
  "timeline.where": { en: "Where", de: "Wo", hi: "कहाँ" },
  "timeline.who": { en: "Who", de: "Wer", hi: "कौन" },
  "timeline.buildReport": {
    en: "Make a report from this",
    de: "Daraus einen Bericht machen",
    hi: "इससे एक रिपोर्ट बनाएँ",
  },

  "report.title": {
    en: "The report you can show someone",
    de: "Der Bericht, den du jemandem zeigen kannst",
    hi: "वह रिपोर्ट जो आप किसी को दिखा सकते हैं",
  },
  "report.build": { en: "Write the report", de: "Bericht schreiben", hi: "रिपोर्ट लिखें" },
  "report.building": {
    en: "Writing your report…",
    de: "Dein Bericht wird geschrieben…",
    hi: "आपकी रिपोर्ट लिखी जा रही है…",
  },
  "report.needEntries": {
    en: "Save something first. The report is made from what you saved.",
    de: "Speicher zuerst etwas. Der Bericht entsteht aus dem, was du gespeichert hast.",
    hi: "पहले कुछ सेव करें। रिपोर्ट उसी से बनती है जो आपने सेव किया है।",
  },
  "report.childLabel": { en: "In your language", de: "In deiner Sprache", hi: "आपकी भाषा में" },
  "report.germanNote": {
    en: "This is the part an adult would read.",
    de: "Diesen Teil würde eine erwachsene Person lesen.",
    hi: "यह हिस्सा कोई बड़ा व्यक्ति पढ़ेगा।",
  },
  "report.readAll": {
    en: "Read all of it. Nothing can be shown to anyone until you say it is right.",
    de: "Lies alles durch. Niemandem kann etwas gezeigt werden, bevor du sagst, dass es stimmt.",
    hi: "पूरा पढ़ें। जब तक आप यह न कहें कि यह सही है, किसी को कुछ नहीं दिखाया जा सकता।",
  },
  "report.approved": {
    en: "You said this is right. It has not been sent to anyone.",
    de: "Du hast gesagt, dass das stimmt. Es wurde an niemanden geschickt.",
    hi: "आपने कहा कि यह सही है। यह किसी को नहीं भेजा गया है।",
  },
  "report.cloudNote": {
    en: "To write the German, your words are sent to a translation service and come straight back. Our server keeps no copy, and the service does not store them afterwards.",
    de: "Um das Deutsch zu schreiben, werden deine Worte an einen Übersetzungsdienst geschickt und kommen direkt zurück. Unser Server behält keine Kopie, und der Dienst speichert sie danach nicht.",
    hi: "जर्मन लिखने के लिए आपके शब्द एक अनुवाद सेवा को भेजे जाते हैं और सीधे वापस आ जाते हैं। हमारा सर्वर कोई कॉपी नहीं रखता, और वह सेवा उन्हें बाद में सेव नहीं करती।",
  },
  "report.offline": {
    en: "You are offline, so the report cannot be written yet. What you saved is still here.",
    de: "Du bist offline, deshalb kann der Bericht noch nicht geschrieben werden. Was du gespeichert hast, ist noch da.",
    hi: "आप ऑफ़लाइन हैं, इसलिए रिपोर्ट अभी नहीं लिखी जा सकती। आपने जो सेव किया है वह अभी भी यहीं है।",
  },

  "errors.retry": { en: "Try again", de: "Noch einmal versuchen", hi: "फिर कोशिश करें" },
} as const satisfies Record<string, Text>;

export type PendingKey = keyof typeof PENDING_STRINGS;

/**
 * Same signature as `t()` on purpose, so the call sites do not change when
 * these keys move into `lib/strings.ts`.
 */
export function tPending(key: PendingKey, lang: string): string {
  const entry: Text = PENDING_STRINGS[key];
  return (isLang(lang) && entry[lang]) || entry[FALLBACK_LANG];
}

function isLang(lang: string): lang is Lang {
  return lang === "en" || lang === "de" || lang === "hi";
}
