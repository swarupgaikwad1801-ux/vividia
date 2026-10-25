/**
 * TEMPORARY wording for "Find the words", until Neel adds these keys.
 *
 * `src/lib/strings.ts` is Neel's file and no branch but his may grow a key in
 * it (CLAUDE.md: he owns the wording, Vernika owns where it appears). So every
 * sentence this screen needs that does not exist there yet sits here, in one
 * file, with the key name it should eventually have. Moving it is then a
 * delete and a find-and-replace, not a hunt through three components.
 *
 * Everything that DOES exist in strings.ts is read from there via `t()`. This
 * file is deliberately the smaller half.
 *
 * The German and Hindi below have NOT been read by a native speaker, the same
 * caveat `lib/strings.ts` and `lib/help.ts` already carry. The English is what
 * Neel should review; the other two are placeholders good enough to show the
 * layout in the right script, and nothing here may go in a video as finished
 * copy.
 */

export type TempLang = "en" | "de" | "hi";

type Text = Record<TempLang, string>;

function pick(lang: string): TempLang {
  return lang === "de" || lang === "hi" ? lang : "en";
}

/**
 * Keys are named as they should appear in `lib/strings.ts`, dots included, so
 * the eventual move does not rename anything.
 */
const TEMP = {
  "write.yourWords": { en: "Your words", de: "Deine Worte", hi: "आपके शब्द" },

  "write.whatWeDo": {
    en: "We translate your words more than once and compare the results.",
    de: "Wir übersetzen deine Worte mehr als einmal und vergleichen die Ergebnisse.",
    hi: "हम आपके शब्दों का एक से ज़्यादा बार अनुवाद करते हैं और नतीजों की तुलना करते हैं।",
  },
  "write.stillWorking": {
    en: "Still going. A careful check can take a while.",
    de: "Läuft noch. Eine sorgfältige Prüfung kann dauern.",
    hi: "अभी चल रहा है। ध्यान से जाँचने में समय लग सकता है।",
  },
  "write.stop": { en: "Stop", de: "Abbrechen", hi: "रोकें" },
  "write.retry": { en: "Try again", de: "Nochmal versuchen", hi: "फिर कोशिश करें" },

  "write.agreement": {
    en: "The checks agreed",
    de: "Die Prüfungen stimmten überein",
    hi: "जाँचें सहमत थीं",
  },
  "write.agreementNote": {
    en: "That is how much our checks said the same thing as each other. It is not a mark for whether the German is right.",
    de: "So sehr haben unsere Prüfungen dasselbe gesagt. Es ist keine Note dafür, ob das Deutsch richtig ist.",
    hi: "इसका मतलब है कि हमारी जाँचें आपस में कितना एक जैसा कह रही थीं। यह इस बात का अंक नहीं है कि जर्मन सही है या नहीं।",
  },

  "write.yourChoiceUsed": {
    en: "Your answer decided this German. The app did not choose for you.",
    de: "Deine Antwort hat dieses Deutsch entschieden. Die App hat nicht für dich gewählt.",
    hi: "यह जर्मन आपके जवाब से तय हुआ। ऐप ने आपके लिए नहीं चुना।",
  },

  "clarify.important": { en: "Important", de: "Wichtig", hi: "ज़रूरी" },
  "clarify.somethingElse": { en: "Something else", de: "Etwas anderes", hi: "कुछ और" },
  "clarify.somethingElseHint": {
    en: "Neither of these is what I meant",
    de: "Keines davon habe ich gemeint",
    hi: "इनमें से कोई भी मेरा मतलब नहीं था",
  },
  "clarify.send": { en: "That's what I meant", de: "Das habe ich gemeint", hi: "मेरा यही मतलब था" },
  "clarify.rewrite": { en: "Say it another way", de: "Sag es anders", hi: "दूसरे तरीके से कहें" },
  "clarify.rewriteWhy": {
    en: "You said none of the answers fit. Nobody can pick for you, so change your own words and check them again.",
    de: "Du hast gesagt, dass keine Antwort passt. Niemand kann für dich wählen, also ändere deine eigenen Worte und prüfe sie noch einmal.",
    hi: "आपने कहा कि कोई भी जवाब सही नहीं है। कोई आपके लिए नहीं चुन सकता, इसलिए अपने शब्द बदलें और उन्हें फिर जाँचें।",
  },
} as const satisfies Record<string, Text>;

export type TempKey = keyof typeof TEMP;

/** Same shape as `t()` in lib/strings.ts, so swapping one for the other is mechanical. */
export function tt(key: TempKey, lang: string): string {
  return TEMP[key][pick(lang)];
}

/**
 * Counted strings, kept apart because `lib/strings.ts` stores plain text only
 * and these need a number put in. Neel will decide the final form; a count and
 * a unit is the least a plural rule can break.
 */
const COUNTED = {
  /** The live check count from `usage.calls_made`. */
  "write.checks": {
    en: (n: number) => (n === 1 ? "1 check" : `${n} checks`),
    de: (n: number) => (n === 1 ? "1 Prüfung" : `${n} Prüfungen`),
    hi: (n: number) => `${n} जाँच`,
  },
  /** Spoken form of the elapsed timer, for screen readers. */
  "write.secondsLong": {
    en: (n: number) => `${n} seconds so far`,
    de: (n: number) => `bisher ${n} Sekunden`,
    hi: (n: number) => `अब तक ${n} सेकंड`,
  },
} as const satisfies Record<string, Record<TempLang, (n: number) => string>>;

export type CountedKey = keyof typeof COUNTED;

export function ttCount(key: CountedKey, n: number, lang: string): string {
  return COUNTED[key][pick(lang)](n);
}

/**
 * The unit on the visible timer. "s" is the SI symbol and reads the same in
 * all three languages, so the number next to it is not translated wrongly
 * while nobody who speaks German or Hindi is here to check it.
 */
export function shortSeconds(n: number): string {
  return `${n} s`;
}
