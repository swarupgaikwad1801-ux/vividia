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

  // --- help-a-character story (lib/story.ts) ---
  // Kim is gender-neutral in all three languages: no he/she in English or
  // German, and the Hindi avoids verbs that agree with Kim's gender.
  "story.button": { en: "Help Kim", de: "Hilf Kim", hi: "किम की मदद करें" },
  "story.buttonNote": {
    en: "A short story. No writing needed.",
    de: "Eine kurze Geschichte. Ohne Schreiben.",
    hi: "एक छोटी कहानी। कुछ लिखना नहीं है।",
  },
  "story.title": { en: "Kim's day", de: "Kims Tag", hi: "किम का दिन" },
  "story.intro": {
    en: "This is Kim. It is Kim's first year at this school. Walk through Kim's day and choose what happens.",
    de: "Das ist Kim. Es ist Kims erstes Jahr an dieser Schule. Geh mit Kim durch den Tag und wähl aus, was passiert.",
    hi: "यह किम है। इस स्कूल में किम का पहला साल है। किम के दिन में साथ चलें और चुनें कि क्या होता है।",
  },
  "story.private": {
    en: "This is only a story. Nothing you tap here is saved or sent.",
    de: "Das ist nur eine Geschichte. Nichts, was du hier antippst, wird gespeichert oder verschickt.",
    hi: "यह सिर्फ़ एक कहानी है। यहाँ आप जो भी चुनेंगे, वह न सेव होगा, न कहीं भेजा जाएगा।",
  },
  "story.start": { en: "Start", de: "Los geht's", hi: "शुरू करें" },
  "story.next": { en: "Next", de: "Weiter", hi: "आगे" },
  "story.question": { en: "What happens to Kim here?", de: "Was passiert Kim hier?", hi: "यहाँ किम के साथ क्या होता है?" },

  "story.scene.way": { en: "On the way to school", de: "Auf dem Schulweg", hi: "स्कूल के रास्ते में" },
  "story.scene.classroom": { en: "In class", de: "Im Unterricht", hi: "क्लास में" },
  // Not "छुट्टी": in Hindi that also means a holiday (see content/ambiguous_words.json).
  "story.scene.break": { en: "At break time", de: "In der Pause", hi: "ब्रेक के समय" },
  "story.scene.evening": { en: "In the evening, on the phone", de: "Abends am Handy", hi: "शाम को, फ़ोन पर" },

  "story.happens.nothing": { en: "Nothing bad", de: "Nichts Schlimmes", hi: "कुछ बुरा नहीं" },
  "story.happens.pushed": { en: "Someone pushes Kim", de: "Jemand schubst Kim", hi: "कोई किम को धक्का देता है" },
  "story.happens.hit": { en: "Someone hits Kim", de: "Jemand schlägt Kim", hi: "कोई किम को मारता है" },
  "story.happens.names": {
    en: "Someone calls Kim names",
    de: "Jemand beschimpft Kim",
    hi: "कोई किम को बुरे नामों से बुलाता है",
  },
  "story.happens.taken": {
    en: "Someone takes Kim's things",
    de: "Jemand nimmt Kim Sachen weg",
    hi: "कोई किम की चीज़ें ले लेता है",
  },
  "story.happens.left_out": { en: "Kim is left out", de: "Kim wird ausgeschlossen", hi: "किम को शामिल नहीं किया जाता" },
  "story.happens.online": {
    en: "Someone writes mean things about Kim",
    de: "Jemand schreibt gemeine Dinge über Kim",
    hi: "कोई किम के बारे में बुरी बातें लिखता है",
  },

  "story.calmDay": { en: "Kim had a calm day.", de: "Kim hatte einen ruhigen Tag.", hi: "किम का दिन शांति से बीता।" },
  "story.hardDay": {
    en: "Kim had a hard day. What could help?",
    de: "Kim hatte einen schweren Tag. Was könnte helfen?",
    hi: "किम का दिन मुश्किल रहा। क्या मदद कर सकता है?",
  },
  "story.noWrong": { en: "There is no wrong answer.", de: "Es gibt keine falsche Antwort.", hi: "इसमें कोई ग़लत जवाब नहीं है।" },
  "story.help.teacher": { en: "Tell a teacher", de: "Einer Lehrkraft sagen", hi: "टीचर को बताना" },
  "story.help.friend": {
    en: "Tell a friend",
    de: "Einem Freund oder einer Freundin sagen",
    hi: "किसी दोस्त को बताना",
  },
  "story.help.write": { en: "Write it down", de: "Aufschreiben", hi: "लिख लेना" },
  "story.help.keep": { en: "Keep it secret", de: "Für sich behalten", hi: "किसी को न बताना" },
  "story.reply.teacher": {
    en: "Telling a teacher is a good step. Words written down first make it easier.",
    de: "Es einer Lehrkraft zu sagen, ist ein guter Schritt. Vorher aufgeschriebene Worte machen es leichter.",
    hi: "टीचर को बताना एक अच्छा कदम है। पहले से लिखे हुए शब्दों से बताना आसान हो जाता है।",
  },
  "story.reply.friend": {
    en: "A friend can listen, and can come along to an adult.",
    de: "Ein Freund oder eine Freundin kann zuhören und mit zu einem Erwachsenen kommen.",
    hi: "दोस्त सुन सकते हैं, और किसी बड़े के पास साथ चल सकते हैं।",
  },
  "story.reply.write": {
    en: "Writing it down helps to remember what happened, and when.",
    de: "Aufschreiben hilft, sich zu merken, was wann passiert ist.",
    hi: "लिख लेने से याद रहता है कि क्या हुआ, और कब।",
  },
  "story.reply.keep": {
    en: "Many children do that at first. That's okay. Telling someone later is still possible, any time.",
    de: "Das machen viele Kinder am Anfang. Das ist okay. Später kann man es immer noch jemandem sagen.",
    hi: "कई बच्चे शुरू में ऐसा ही करते हैं। कोई बात नहीं। बाद में भी किसी को बताया जा सकता है, कभी भी।",
  },

  "story.bridge": {
    en: "Sometimes things like this happen to real children too. Has something like this happened to you?",
    de: "Manchmal passiert so etwas auch echten Kindern. Ist dir so etwas auch passiert?",
    hi: "कभी-कभी असली बच्चों के साथ भी ऐसा होता है। क्या आपके साथ भी ऐसा कुछ हुआ है?",
  },
  "story.bridgeYes": { en: "Yes, I want to tell", de: "Ja, ich möchte es erzählen", hi: "हाँ, मुझे बताना है" },
  "story.bridgeNotNow": { en: "Not now", de: "Jetzt nicht", hi: "अभी नहीं" },
  "story.how": {
    en: "How do you want to tell it? It can be like Kim's story, or different.",
    de: "Wie möchtest du es erzählen? Es kann wie bei Kim sein oder ganz anders.",
    hi: "आप इसे कैसे बताना चाहेंगे? यह किम की कहानी जैसा हो सकता है, या अलग।",
  },
  "story.howWrite": { en: "Write it in my words", de: "In meinen Worten schreiben", hi: "अपने शब्दों में लिखना" },
  "story.howPictures": { en: "Tap pictures", de: "Bilder antippen", hi: "तस्वीरें चुनना" },
  "story.notNow": {
    en: "That's okay. Kim's story is here whenever you want. The help button is on every screen.",
    de: "Das ist okay. Kims Geschichte ist da, wann immer du willst. Den Hilfe-Knopf gibt es auf jeder Seite.",
    hi: "कोई बात नहीं। किम की कहानी जब चाहें यहाँ है। मदद का बटन हर स्क्रीन पर है।",
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
  "handoff.youDecide": {
    en: "Nothing is sent. You choose who sees it, and you show it yourself.",
    de: "Es wird nichts verschickt. Du entscheidest, wer es sieht, und zeigst es selbst.",
    hi: "कुछ भी भेजा नहीं जाता। आप तय करते हैं कि कौन देखेगा, और आप ख़ुद दिखाते हैं।",
  },
  "handoff.classTeacher": { en: "My class teacher", de: "Meine Klassenlehrkraft", hi: "मेरे क्लास टीचर" },
  "handoff.trustedTeacher": { en: "A teacher I trust", de: "Eine Vertrauenslehrkraft", hi: "कोई टीचर जिन पर मुझे भरोसा है" },
  "handoff.socialWorker": { en: "The school social worker", de: "Die Schulsozialarbeit", hi: "स्कूल के सोशल वर्कर" },
  "handoff.family": { en: "Someone in my family", de: "Jemand aus meiner Familie", hi: "मेरे परिवार में कोई" },

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
} as const satisfies Record<string, Text>;

export type StringKey = keyof typeof STRINGS;

/** The text for `key` in `lang`, falling back to English for unknown languages. */
export function t(key: StringKey, lang: string): string {
  const entry: Text = STRINGS[key];
  return (isLang(lang) && entry[lang]) || entry[FALLBACK_LANG];
}

export function isLang(lang: string): lang is Lang {
  return (LANGS as readonly string[]).includes(lang);
}
