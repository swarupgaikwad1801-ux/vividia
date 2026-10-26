/**
 * Every sentence the core flow shows a child or an adult, in the three
 * languages we ship: English and Hindi (what the child writes in) and German
 * (what the adult reads).
 *
 * Neel owns the wording; Vernika owns where it appears. Hindi is a draft until
 * a native speaker on the team has read it, so `HINDI_REVIEWED` stays false
 * until then and nothing should claim otherwise.
 *
 * Wording rules (CLAUDE.md, privacy and honesty):
 * - never "this keeps you safe", never a judgement on whether something is true
 * - quick exit leaves the page; it does not erase browser history
 * - nothing is sent to anyone unless the child chooses
 * Contacts (phone numbers, names) are NOT here: they come from
 * content/helplines.json through /api/resources and must never be copied.
 */

export type Lang = "en" | "de" | "hi";

export const LANGS: readonly Lang[] = ["en", "de", "hi"] as const;
export const FALLBACK_LANG: Lang = "en";
export const HINDI_REVIEWED = false;

type Text = Record<Lang, string>;

export const STRINGS = {
  "app.name": { en: "Vividia", de: "Vividia", hi: "Vividia" },
  "app.poweredBy": {
    en: "Powered by NVIDIA Nemotron",
    de: "Mit NVIDIA Nemotron",
    hi: "NVIDIA Nemotron द्वारा संचालित",
  },

  "demo.button": { en: "Try Amara's story", de: "Amaras Geschichte ausprobieren", hi: "अमारा की कहानी आज़माएँ" },
  "demo.notice": {
    en: "Amara is a made-up example. No real child is shown.",
    de: "Amara ist ein ausgedachtes Beispiel. Es wird kein echtes Kind gezeigt.",
    hi: "अमारा एक काल्पनिक उदाहरण है। कोई असली बच्चा नहीं दिखाया गया है।",
  },

  "help.button": { en: "Need help now?", de: "Brauchst du jetzt Hilfe?", hi: "अभी मदद चाहिए?" },
  "help.title": { en: "People who can help", de: "Menschen, die helfen können", hi: "जो लोग मदद कर सकते हैं" },
  "help.source": { en: "Checked on", de: "Geprüft am", hi: "जाँचा गया" },

  "quickExit.button": { en: "Leave now", de: "Sofort verlassen", hi: "तुरंत बाहर निकलें" },
  "quickExit.note": {
    en: "This closes the app at once. It does not delete your browser history.",
    de: "Damit schließt sich die App sofort. Dein Browserverlauf wird dabei nicht gelöscht.",
    hi: "इससे ऐप तुरंत बंद हो जाता है। यह आपके ब्राउज़र की हिस्ट्री नहीं मिटाता।",
  },

  "checkin.title": { en: "How are you today?", de: "Wie geht es dir heute?", hi: "आज आप कैसा महसूस कर रहे हैं?" },
  "checkin.skip": { en: "Skip", de: "Überspringen", hi: "छोड़ें" },

  "write.title": { en: "What happened?", de: "Was ist passiert?", hi: "क्या हुआ?" },
  "write.hint": {
    en: "Write it in your own words, in your own language.",
    de: "Schreib es in deinen eigenen Worten, in deiner eigenen Sprache.",
    hi: "इसे अपने शब्दों में, अपनी भाषा में लिखें।",
  },
  "write.placeholder": { en: "Write here…", de: "Schreib hier…", hi: "यहाँ लिखें…" },
  "write.send": { en: "Check my words", de: "Meine Worte prüfen", hi: "मेरे शब्द जाँचें" },
  "write.checking": { en: "Checking your words…", de: "Deine Worte werden geprüft…", hi: "आपके शब्द जाँचे जा रहे हैं…" },
  "write.german": { en: "In German", de: "Auf Deutsch", hi: "जर्मन में" },

  "clarify.title": { en: "What did you mean?", de: "Was hast du gemeint?", hi: "आपका क्या मतलब था?" },
  "clarify.hint": {
    en: "Only you know. Pick the one that fits.",
    de: "Nur du weißt es. Wähl das, was passt.",
    hi: "यह सिर्फ़ आप जानते हैं। जो सही लगे वह चुनें।",
  },

  "approve.title": { en: "Is this right?", de: "Stimmt das so?", hi: "क्या यह सही है?" },
  "approve.yes": { en: "Yes, save it", de: "Ja, speichern", hi: "हाँ, सेव करें" },
  "approve.change": { en: "Change it", de: "Ändern", hi: "बदलें" },

  "timeline.title": { en: "What happened so far", de: "Was bisher passiert ist", hi: "अब तक क्या हुआ" },
  "timeline.empty": {
    en: "Nothing saved yet. What you save stays only on this phone.",
    de: "Noch nichts gespeichert. Was du speicherst, bleibt nur auf diesem Handy.",
    hi: "अभी कुछ सेव नहीं है। जो आप सेव करेंगे वह सिर्फ़ इसी फ़ोन पर रहेगा।",
  },
  "timeline.delete": { en: "Delete", de: "Löschen", hi: "मिटाएँ" },
  "timeline.deleteAll": { en: "Delete everything", de: "Alles löschen", hi: "सब कुछ मिटाएँ" },
  "timeline.deleteAllConfirm": {
    en: "Delete everything you saved? This cannot be undone.",
    de: "Alles löschen, was du gespeichert hast? Das kann man nicht rückgängig machen.",
    hi: "जो कुछ आपने सेव किया है, सब मिटा दें? इसे वापस नहीं लाया जा सकता।",
  },
  "timeline.notPersistent": {
    en: "This browser is not saving anything. Your words will be gone when you close it.",
    de: "Dieser Browser speichert nichts. Deine Worte sind weg, wenn du ihn schließt.",
    hi: "यह ब्राउज़र कुछ सेव नहीं कर रहा। इसे बंद करने पर आपके शब्द चले जाएँगे।",
  },

  "where.title": { en: "Where does this happen?", de: "Wo passiert das?", hi: "यह कहाँ होता है?" },
  "where.school": { en: "At school", de: "In der Schule", hi: "स्कूल में" },
  "where.home": { en: "At home", de: "Zu Hause", hi: "घर पर" },
  "where.online": { en: "Online", de: "Online", hi: "ऑनलाइन" },
  "where.elsewhere": { en: "Somewhere else", de: "Woanders", hi: "कहीं और" },

  "handoff.title": {
    en: "Who do you want to show this to?",
    de: "Wem möchtest du das zeigen?",
    hi: "आप यह किसे दिखाना चाहते हैं?",
  },
  "handoff.homeNote": {
    en: "Because it happens at home, we only suggest people at school and helplines.",
    de: "Weil es zu Hause passiert, schlagen wir nur Menschen in der Schule und Beratungsstellen vor.",
    hi: "क्योंकि यह घर पर होता है, हम सिर्फ़ स्कूल के लोग और हेल्पलाइन सुझाते हैं।",
  },
  // Shown inside the safety panel while a question about the child's own
  // words is still unanswered. The panel appears before the question, on
  // purpose - a child in real danger must not have to answer anything to
  // reach 110 - so this line is what keeps it from reading as a verdict the
  // app has already reached about them. See WriteSafetyNote.
  "safety.notSureYet": {
    en: "We are not sure yet what you meant. We will ask you next. This is here in case you need it right now.",
    de: "Wir wissen noch nicht genau, was du gemeint hast. Wir fragen dich gleich. Das steht hier, falls du es jetzt brauchst.",
    hi: "हमें अभी पक्का नहीं पता कि तुम्हारा क्या मतलब था। हम आगे तुमसे पूछेंगे। यह यहाँ इसलिए है कि अगर तुम्हें अभी ज़रूरत हो।",
  },

  "handoff.youDecide": {
    en: "Nothing is sent. You choose who sees it, and you show it yourself.",
    de: "Es wird nichts verschickt. Du entscheidest, wer es sieht, und zeigst es selbst.",
    hi: "कुछ भी भेजा नहीं जाता। आप तय करते हैं कि कौन देखेगा, और आप ख़ुद दिखाते हैं।",
  },
  "handoff.classTeacher": { en: "My class teacher", de: "Meine Klassenlehrkraft", hi: "मेरे क्लास टीचर" },
  "handoff.trustedTeacher": { en: "A teacher I trust", de: "Eine Vertrauenslehrkraft", hi: "कोई टीचर जिन पर मुझे भरोसा है" },
  "handoff.socialWorker": { en: "The school social worker", de: "Die Schulsozialarbeit", hi: "स्कूल के सोशल वर्कर" },
  "handoff.family": { en: "Someone in my family", de: "Jemand aus meiner Familie", hi: "मेरे परिवार में कोई" },

  // --- writing screen ("Find the words") ---
  // Moved from the temporary components/WriteStrings.ts on feat/write-screen,
  // same key names. {n} is filled with fill().
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
  "write.checksOne": { en: "1 check", de: "1 Prüfung", hi: "1 जाँच" },
  "write.checks": { en: "{n} checks", de: "{n} Prüfungen", hi: "{n} जाँच" },
  "write.secondsLong": { en: "{n} seconds so far", de: "bisher {n} Sekunden", hi: "अब तक {n} सेकंड" },
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

  "errors.network": {
    en: "We can't reach the internet right now. What you saved is still on this phone.",
    de: "Wir erreichen gerade das Internet nicht. Was du gespeichert hast, ist noch auf diesem Handy.",
    hi: "अभी इंटरनेट से जुड़ नहीं पा रहे। आपने जो सेव किया है वह अभी भी इसी फ़ोन पर है।",
  },
  "errors.slow": {
    en: "This is taking longer than usual. Please try again in a moment.",
    de: "Das dauert länger als sonst. Bitte versuch es gleich noch einmal.",
    hi: "इसमें सामान्य से ज़्यादा समय लग रहा है। कृपया थोड़ी देर में फिर कोशिश करें।",
  },
  "errors.generic": {
    en: "Something went wrong on our side. Your words are not lost.",
    de: "Bei uns ist etwas schiefgegangen. Deine Worte sind nicht verloren.",
    hi: "हमारी तरफ़ से कुछ गड़बड़ हो गई। आपके शब्द खोए नहीं हैं।",
  },

  // The emoji check-in (lib/moods.ts). The codes after "mood." are stored in
  // the timeline, so they must not change.
  "mood.good": { en: "Good", de: "Gut", hi: "अच्छा" },
  "mood.ok": { en: "OK", de: "Geht so", hi: "ठीक है" },
  "mood.sad": { en: "Sad", de: "Traurig", hi: "दुखी" },
  "mood.scared": { en: "Scared", de: "Angst", hi: "डर लग रहा है" },
  "mood.angry": { en: "Angry", de: "Wütend", hi: "गुस्सा" },
  "mood.alone": { en: "Alone", de: "Allein", hi: "अकेला" },

  // Languages a helpline speaks (lib/help.ts). Only the codes that appear in
  // content/helplines.json, plus the two we ship as source languages.
  "lang.de": { en: "German", de: "Deutsch", hi: "जर्मन" },
  "lang.en": { en: "English", de: "Englisch", hi: "अंग्रेज़ी" },
  "lang.hi": { en: "Hindi", de: "Hindi", hi: "हिंदी" },
  "lang.uk": { en: "Ukrainian", de: "Ukrainisch", hi: "यूक्रेनी" },

  // The language note next to each helpline. {list} is the languages joined
  // with help.and; "only" is added when the child's language is not among them.
  "help.and": { en: " and ", de: " und ", hi: " और " },
  "help.speaks": { en: "Speaks {list}", de: "Spricht {list}", hi: "{list} बोलते हैं" },
  "help.speaksOnly": { en: "Speaks {list} only", de: "Spricht nur {list}", hi: "सिर्फ़ {list} बोलते हैं" },
  "help.checkedToday": { en: "checked today", de: "heute geprüft", hi: "आज जाँचा गया" },
  "help.checkedYesterday": { en: "checked yesterday", de: "gestern geprüft", hi: "कल जाँचा गया" },
  "help.checkedDays": { en: "checked {n} days ago", de: "vor {n} Tagen geprüft", hi: "{n} दिन पहले जाँचा गया" },
} as const satisfies Record<string, Text>;

export type StringKey = keyof typeof STRINGS;

/** The text for `key` in `lang`, falling back to English for unknown languages. */
export function t(key: StringKey, lang: string): string {
  const entry: Text = STRINGS[key];
  return (isLang(lang) && entry[lang]) || entry[FALLBACK_LANG];
}

/** `t()` with `{name}` placeholders filled in, e.g. fill("help.checkedDays", "de", { n: 3 }). */
export function fill(key: StringKey, lang: string, values: Record<string, string | number>): string {
  return t(key, lang).replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

export function isLang(lang: string): lang is Lang {
  return (LANGS as readonly string[]).includes(lang);
}
