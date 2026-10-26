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
  "app.englishOnly": {
    en: "Some words in this app are only in English for now.",
    de: "Manche Wörter in dieser App gibt es bisher nur auf Englisch.",
    hi: "इस ऐप के कुछ शब्द अभी सिर्फ़ अंग्रेज़ी में हैं।",
  },

  // Timeline and report (moved from components/TimelinePendingStrings.ts).
  "timeline.storageNote": {
    en: "This list is saved only in this browser. You can delete it whenever you want.",
    de: "Diese Liste wird nur in diesem Browser gespeichert. Du kannst sie jederzeit löschen.",
    hi: "यह सूची सिर्फ़ इसी ब्राउज़र में सेव होती है। आप इसे जब चाहें मिटा सकते हैं।",
  },
  "timeline.deleteAllYes": { en: "Yes, delete everything", de: "Ja, alles löschen", hi: "हाँ, सब कुछ मिटाएँ" },
  "timeline.deleteAllNo": { en: "No, keep it", de: "Nein, behalten", hi: "नहीं, रहने दें" },
  "timeline.deletedAll": {
    en: "Everything you saved has been deleted.",
    de: "Alles, was du gespeichert hast, ist gelöscht.",
    hi: "आपने जो सेव किया था, सब मिट गया है।",
  },
  "timeline.where": { en: "Where", de: "Wo", hi: "कहाँ" },
  "timeline.who": { en: "Who", de: "Wer", hi: "कौन" },
  "timeline.buildReport": { en: "Make a report from this", de: "Daraus einen Bericht machen", hi: "इससे एक रिपोर्ट बनाएँ" },
  "report.title": {
    en: "The report you can show someone",
    de: "Der Bericht, den du jemandem zeigen kannst",
    hi: "वह रिपोर्ट जो आप किसी को दिखा सकते हैं",
  },
  "report.build": { en: "Write the report", de: "Bericht schreiben", hi: "रिपोर्ट लिखें" },
  "report.building": { en: "Writing your report…", de: "Dein Bericht wird geschrieben…", hi: "आपकी रिपोर्ट लिखी जा रही है…" },
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

  // Handoff (moved from components/HandoffTempStrings.ts, which was English only).
  "handoff.showTo": { en: "Show this to", de: "Wem du das zeigst", hi: "किसे दिखाना है" },
  "handoff.changeWhere": { en: "Change where this happens", de: "Ändern, wo das passiert", hi: "यह कहाँ होता है, बदलें" },
  "handoff.preparing": { en: "Getting your words ready…", de: "Deine Worte werden vorbereitet…", hi: "आपके शब्द तैयार हो रहे हैं…" },
  "handoff.retry": { en: "Try again", de: "Noch einmal versuchen", hi: "फिर कोशिश करें" },
  "handoff.yourWords": { en: "Your words", de: "Deine Worte", hi: "आपके शब्द" },

  // PIN (moved from components/pinText.ts, which was English only). {seconds},
  // {count} and {when} are filled with fill().
  "pin.set.title": { en: "Set a PIN", de: "PIN festlegen", hi: "PIN सेट करें" },
  "pin.set.titleChange": { en: "Change your PIN", de: "Deine PIN ändern", hi: "अपना PIN बदलें" },
  "pin.set.hint": {
    en: "A PIN is 4 to 6 numbers. You type it to open the app.",
    de: "Eine PIN hat 4 bis 6 Ziffern. Du gibst sie ein, um die App zu öffnen.",
    hi: "PIN 4 से 6 अंकों का होता है। ऐप खोलने के लिए आप इसे टाइप करते हैं।",
  },
  "pin.set.limit": {
    en: "It stops someone picking up this phone and reading your words. It will not stop someone who knows phones well.",
    de: "Sie hält jemanden ab, der dieses Handy nimmt und deine Worte lesen will. Jemanden, der sich gut mit Handys auskennt, hält sie nicht auf.",
    hi: "इससे कोई यह फ़ोन उठाकर आपके शब्द नहीं पढ़ पाएगा। पर जो फ़ोन के बारे में बहुत जानता है, उसे यह नहीं रोकेगा।",
  },
  "pin.set.enter": { en: "Choose your PIN", de: "Wähle deine PIN", hi: "अपना PIN चुनें" },
  "pin.set.again": { en: "Type the same PIN again", de: "Gib dieselbe PIN noch einmal ein", hi: "वही PIN फिर से टाइप करें" },
  "pin.set.next": { en: "Next", de: "Weiter", hi: "आगे" },
  "pin.set.save": { en: "Save my PIN", de: "PIN speichern", hi: "मेरा PIN सेव करें" },
  "pin.set.startAgain": { en: "Start again", de: "Neu anfangen", hi: "फिर से शुरू करें" },
  "pin.set.mismatch": {
    en: "Those two were not the same. Type your PIN again.",
    de: "Die beiden waren nicht gleich. Gib deine PIN noch einmal ein.",
    hi: "दोनों एक जैसे नहीं थे। अपना PIN फिर से टाइप करें।",
  },
  "pin.set.tooShort": { en: "A PIN is 4 to 6 numbers.", de: "Eine PIN hat 4 bis 6 Ziffern.", hi: "PIN 4 से 6 अंकों का होता है।" },
  "pin.set.saved": {
    en: "Your PIN is saved. You will need it to open the app.",
    de: "Deine PIN ist gespeichert. Du brauchst sie, um die App zu öffnen.",
    hi: "आपका PIN सेव हो गया। ऐप खोलने के लिए आपको इसकी ज़रूरत होगी।",
  },
  "pin.set.noStorage": {
    en: "This phone is not letting the app save anything, so a PIN cannot be set here. Nothing was saved.",
    de: "Dieses Handy lässt die App nichts speichern, deshalb kann hier keine PIN festgelegt werden. Es wurde nichts gespeichert.",
    hi: "यह फ़ोन ऐप को कुछ भी सेव नहीं करने दे रहा, इसलिए यहाँ PIN सेट नहीं हो सकता। कुछ भी सेव नहीं हुआ।",
  },
  "pin.set.skip": { en: "Not now", de: "Nicht jetzt", hi: "अभी नहीं" },
  "pin.set.done": { en: "Done", de: "Fertig", hi: "हो गया" },
  "pin.remove.button": { en: "Remove the PIN", de: "PIN entfernen", hi: "PIN हटाएँ" },
  "pin.remove.ask": {
    en: "Remove the PIN? The app will open without one. Nothing you saved is deleted.",
    de: "PIN entfernen? Die App öffnet sich dann ohne PIN. Nichts, was du gespeichert hast, wird gelöscht.",
    hi: "PIN हटाएँ? ऐप बिना PIN के खुलेगा। आपका सेव किया हुआ कुछ भी नहीं मिटेगा।",
  },
  "pin.remove.yes": { en: "Yes, remove it", de: "Ja, entfernen", hi: "हाँ, हटाएँ" },
  "pin.remove.no": { en: "Keep the PIN", de: "PIN behalten", hi: "PIN रहने दें" },
  "pin.remove.done": {
    en: "The PIN is removed. You can set a new one whenever you want.",
    de: "Die PIN ist entfernt. Du kannst jederzeit eine neue festlegen.",
    hi: "PIN हट गया। आप जब चाहें नया सेट कर सकते हैं।",
  },
  "pin.unlock.title": { en: "Type your PIN", de: "Gib deine PIN ein", hi: "अपना PIN टाइप करें" },
  "pin.unlock.hint": { en: "4 to 6 numbers.", de: "4 bis 6 Ziffern.", hi: "4 से 6 अंक।" },
  "pin.unlock.button": { en: "Open", de: "Öffnen", hi: "खोलें" },
  "pin.unlock.checking": { en: "Checking…", de: "Wird geprüft…", hi: "जाँच हो रही है…" },
  "pin.unlock.wrong": {
    en: "That is not the PIN. Try again.",
    de: "Das ist nicht die PIN. Versuch es noch einmal.",
    hi: "यह सही PIN नहीं है। फिर कोशिश करें।",
  },
  "pin.unlock.wait": {
    en: "Wait {seconds} seconds, then try again.",
    de: "Warte {seconds} Sekunden, dann versuch es noch einmal.",
    hi: "{seconds} सेकंड रुकें, फिर कोशिश करें।",
  },
  // Hindi avoids भूल गया/गई: the child's gender is never assumed.
  "pin.unlock.forgot": { en: "I forgot my PIN", de: "Ich habe meine PIN vergessen", hi: "मुझे अपना PIN याद नहीं" },
  "pin.unlock.forgotHelp": {
    en: "You can remove the PIN and get back in. Nothing you saved is deleted. Anyone holding this phone could do the same, which is the honest limit of a PIN like this.",
    de: "Du kannst die PIN entfernen und wieder hineinkommen. Nichts, was du gespeichert hast, wird gelöscht. Jeder, der dieses Handy in der Hand hat, könnte das auch – das ist die ehrliche Grenze einer solchen PIN.",
    hi: "आप PIN हटाकर फिर से अंदर आ सकते हैं। आपका सेव किया हुआ कुछ भी नहीं मिटेगा। जिसके हाथ में भी यह फ़ोन हो, वह भी ऐसा कर सकता है — ऐसे PIN की यही सच्ची सीमा है।",
  },
  "pin.removed.notice": {
    en: "The PIN was removed on {when}. If that was not you, someone else may have opened the app.",
    de: "Die PIN wurde am {when} entfernt. Wenn du das nicht warst, hat vielleicht jemand anderes die App geöffnet.",
    hi: "PIN {when} को हटाया गया था। अगर यह आपने नहीं किया, तो हो सकता है किसी और ने ऐप खोला हो।",
  },
  "pin.keypad.empty": { en: "No numbers typed yet", de: "Noch keine Ziffern eingegeben", hi: "अभी कोई अंक टाइप नहीं हुआ" },
  "pin.keypad.entered": { en: "{count} numbers typed", de: "{count} Ziffern eingegeben", hi: "{count} अंक टाइप हुए" },
  "pin.keypad.delete": { en: "Delete the last number", de: "Letzte Ziffer löschen", hi: "आखिरी अंक मिटाएँ" },
  "pin.keypad.clear": { en: "Clear", de: "Leeren", hi: "साफ़ करें" },

  // Follow-up check-in (moved from lib-followups-ui/copy.ts DRAFT_COPY, which
  // was English only). Tone: never praise "better", never sound let down by
  // "worse", no first person (the app is not a friend).
  "followup.title": { en: "How are things now?", de: "Wie läuft es jetzt?", hi: "अब हालात कैसे हैं?" },
  "followup.gap": {
    en: "It has been a few days since the last thing you wrote.",
    de: "Seit deinem letzten Eintrag sind ein paar Tage vergangen.",
    hi: "आपने आख़िरी बार कुछ लिखा था, उसे कुछ दिन हो गए हैं।",
  },
  "followup.noPressure": {
    en: "You do not have to answer this. Nothing is sent to anyone, whatever you pick.",
    de: "Du musst darauf nicht antworten. Egal, was du wählst, es wird an niemanden geschickt.",
    hi: "इसका जवाब देना ज़रूरी नहीं है। आप कुछ भी चुनें, किसी को कुछ नहीं भेजा जाता।",
  },
  "followup.answerBetter": { en: "A bit better", de: "Ein bisschen besser", hi: "थोड़ा बेहतर" },
  "followup.answerSame": { en: "About the same", de: "Ungefähr gleich", hi: "लगभग वैसा ही" },
  "followup.answerWorse": { en: "Worse", de: "Schlechter", hi: "पहले से बुरा" },
  "followup.notNow": { en: "Not now", de: "Nicht jetzt", hi: "अभी नहीं" },
  "followup.stopAsking": { en: "Stop asking me this", de: "Frag mich das nicht mehr", hi: "यह सवाल दोबारा न पूछें" },
  "followup.stopped": {
    en: "This question will not come back. You can still write something down whenever you want to.",
    de: "Diese Frage kommt nicht wieder. Du kannst trotzdem jederzeit etwas aufschreiben.",
    hi: "यह सवाल दोबारा नहीं आएगा। आप जब चाहें, फिर भी कुछ लिख सकते हैं।",
  },
  "followup.afterBetter": {
    en: "Okay. You can write something down any time, even if it seems small.",
    de: "Okay. Du kannst jederzeit etwas aufschreiben, auch wenn es klein wirkt.",
    hi: "ठीक है। आप कभी भी कुछ लिख सकते हैं, चाहे वह छोटी बात लगे।",
  },
  "followup.afterStill": {
    en: "Okay. There are other people you could show your words to, if you want to.",
    de: "Okay. Es gibt noch andere Menschen, denen du deine Worte zeigen könntest, wenn du willst.",
    hi: "ठीक है। अगर आप चाहें, तो और भी लोग हैं जिन्हें आप अपने शब्द दिखा सकते हैं।",
  },
  "followup.notKept": {
    en: "This answer is not saved anywhere, and nobody is told.",
    de: "Diese Antwort wird nirgends gespeichert, und niemand erfährt davon.",
    hi: "यह जवाब कहीं सेव नहीं होता, और किसी को बताया नहीं जाता।",
  },
  "followup.openLadder": { en: "See who else there is", de: "Sehen, wer noch da ist", hi: "देखें और कौन है" },

  // Escalation ladder (moved from DRAFT_COPY). "Can act" is not "will act":
  // no rung promises it will help.
  "ladder.title": { en: "Who else there is", de: "Wer noch da ist", hi: "और कौन है" },
  "ladder.intro": {
    en: "Other people you could show your own words to. You pick, and you show it yourself.",
    de: "Andere Menschen, denen du deine eigenen Worte zeigen könntest. Du wählst aus, und du zeigst es selbst.",
    hi: "और लोग जिन्हें आप अपने शब्द दिखा सकते हैं। आप चुनते हैं, और ख़ुद दिखाते हैं।",
  },
  "ladder.noPromise": {
    en: "None of them can promise it will stop. Each one is a different door, and you can try more than one.",
    de: "Niemand von ihnen kann versprechen, dass es aufhört. Jede Person ist eine andere Tür, und du kannst mehr als eine ausprobieren.",
    hi: "इनमें से कोई वादा नहीं कर सकता कि यह रुक जाएगा। हर एक अलग दरवाज़ा है, और आप एक से ज़्यादा आज़मा सकते हैं।",
  },
  "ladder.carryTitle": { en: "Your words go with you", de: "Deine Worte gehen mit dir", hi: "आपके शब्द आपके साथ जाते हैं" },
  "ladder.carryWhy": {
    en: "The entries you already checked and approved go to the next person too, so you never have to start explaining from nothing again.",
    de: "Die Einträge, die du schon geprüft und bestätigt hast, gehen auch an die nächste Person. So musst du nie wieder ganz von vorne erklären.",
    hi: "जो बातें आप पहले ही जाँचकर सही कह चुके हैं, वे अगले व्यक्ति तक भी जाती हैं, ताकि आपको कभी फिर से शुरू से समझाना न पड़े।",
  },
  "ladder.carryNone": {
    en: "You have not written anything down yet, so there would be nothing to show. You can write something first.",
    de: "Du hast noch nichts aufgeschrieben, deshalb gäbe es nichts zu zeigen. Du kannst zuerst etwas aufschreiben.",
    hi: "आपने अभी तक कुछ नहीं लिखा है, इसलिए दिखाने के लिए कुछ नहीं होगा। आप पहले कुछ लिख सकते हैं।",
  },
  "ladder.stateStart": { en: "A place to start", de: "Ein Anfang", hi: "शुरू करने की जगह" },
  "ladder.stateNext": { en: "You could try this next", de: "Das könntest du als Nächstes versuchen", hi: "आप आगे इसे आज़मा सकते हैं" },
  "ladder.stateShown": { en: "You showed this", de: "Das hast du gezeigt", hi: "आपने यह दिखाया" },
  "ladder.stateLater": { en: "Still there if you need it", de: "Noch da, wenn du es brauchst", hi: "ज़रूरत हो तो अब भी मौजूद" },
  "ladder.show": { en: "Take my words here", de: "Meine Worte hierhin mitnehmen", hi: "मेरे शब्द यहाँ ले जाएँ" },
  "ladder.seeWho": { en: "See who they are", de: "Sehen, wer das ist", hi: "देखें ये कौन हैं" },
  "ladder.markShown": { en: "I showed this to them", de: "Ich habe es ihnen gezeigt", hi: "मैंने उन्हें यह दिखाया" },
  "ladder.undo": { en: "Undo", de: "Rückgängig", hi: "वापस लें" },
  "ladder.waiting": {
    en: "Nothing new since you showed this. You do not have to do anything right now.",
    de: "Seit du das gezeigt hast, ist nichts Neues passiert. Du musst gerade nichts tun.",
    hi: "यह दिखाने के बाद से कुछ नया नहीं हुआ। अभी आपको कुछ करने की ज़रूरत नहीं है।",
  },
  "ladder.stillHappening": {
    en: "Things kept happening after you showed this.",
    de: "Nachdem du das gezeigt hast, ist es weiter passiert.",
    hi: "यह दिखाने के बाद भी चीज़ें होती रहीं।",
  },
  "ladder.topRung": {
    en: "This is the last step this app knows about. If it keeps happening you can go back to any of these people again: asking twice is allowed.",
    de: "Das ist der letzte Schritt, den diese App kennt. Wenn es weiter passiert, kannst du zu jeder dieser Personen zurückgehen: Zweimal fragen ist erlaubt.",
    hi: "यह आख़िरी कदम है जो यह ऐप जानता है। अगर यह होता रहे, तो आप इनमें से किसी के पास भी फिर जा सकते हैं: दो बार पूछना ठीक है।",
  },
  "ladder.dangerNow": {
    en: "If you are in danger right now, use the help button in this app.",
    de: "Wenn du gerade in Gefahr bist, nutze den Hilfe-Knopf in dieser App.",
    hi: "अगर आप अभी ख़तरे में हैं, तो इस ऐप का मदद वाला बटन दबाएँ।",
  },
  "ladder.contactsElsewhere": {
    en: "The app shows how to reach them under the help button.",
    de: "Wie du sie erreichst, zeigt die App unter dem Hilfe-Knopf.",
    hi: "इन तक कैसे पहुँचें, यह ऐप मदद वाले बटन में दिखाता है।",
  },
  "ladder.rung.head": { en: "The head of the school", de: "Die Schulleitung", hi: "स्कूल के प्रिंसिपल" },
  "ladder.rung.schoolPsychology": {
    en: "The school counselling service for your area",
    de: "Die schulpsychologische Beratungsstelle in deiner Gegend",
    hi: "आपके इलाके की स्कूल काउंसलिंग सेवा",
  },
  "ladder.rung.helplines": {
    en: "Counsellors you can call or chat with",
    de: "Beratung, die du anrufen oder mit der du chatten kannst",
    hi: "काउंसलर जिन्हें आप फ़ोन कर सकते हैं या चैट कर सकते हैं",
  },
  "ladder.why.teacher": {
    en: "The person who sees your class every day.",
    de: "Die Person, die deine Klasse jeden Tag sieht.",
    hi: "वह व्यक्ति जो रोज़ आपकी क्लास को देखता है।",
  },
  "ladder.why.trusted": {
    en: "Helping with this is part of their job at school.",
    de: "Bei so etwas zu helfen gehört zu ihrer Aufgabe an der Schule.",
    hi: "इसमें मदद करना स्कूल में उनके काम का हिस्सा है।",
  },
  "ladder.why.head": {
    en: "Can act when a teacher has not.",
    de: "Kann handeln, wenn eine Lehrkraft es nicht getan hat.",
    hi: "जब किसी टीचर ने कुछ न किया हो, तब कदम उठा सकते हैं।",
  },
  "ladder.why.schoolPsychology": {
    en: "Outside your school, and not part of it.",
    de: "Außerhalb deiner Schule und kein Teil davon.",
    hi: "आपके स्कूल से बाहर, और उसका हिस्सा नहीं।",
  },
  "ladder.why.helplines": { en: "Not from your school at all.", de: "Gar nicht von deiner Schule.", hi: "बिलकुल भी आपके स्कूल से नहीं।" },

  // Listening: "Tell it your way" and the gentle questions (#3 proposal,
  // 26 Oct). One soft question at a time, and every one can be skipped. The
  // app never says "I": it is not a person, and does not pretend to be one.
  "listen.waysTitle": { en: "How do you want to tell it?", de: "Wie möchtest du es erzählen?", hi: "आप इसे कैसे बताना चाहते हैं?" },
  "listen.waysIntro": {
    en: "Pick whatever feels easiest. You can change your mind at any time.",
    de: "Nimm, was sich am leichtesten anfühlt. Du kannst jederzeit wechseln.",
    hi: "जो सबसे आसान लगे, वह चुनें। आप कभी भी बदल सकते हैं।",
  },
  "listen.wayWrite": { en: "Write it", de: "Aufschreiben", hi: "लिखकर बताएँ" },
  "listen.wayPictures": { en: "Tap pictures", de: "Bilder antippen", hi: "तस्वीरों पर टैप करें" },
  "listen.waySpeak": { en: "Say it out loud", de: "Laut sagen", hi: "बोलकर बताएँ" },
  // Next to "Say it out loud". Speaking can be overheard by the very person
  // the child is telling about, so voice is never the default.
  "listen.speakCaution": {
    en: "Only if no one nearby can hear you.",
    de: "Nur wenn dich niemand in der Nähe hören kann.",
    hi: "सिर्फ़ तब, जब आस-पास कोई आपको सुन न सके।",
  },
  "listen.startAnywhere": {
    en: "You can start anywhere. Even one word is enough.",
    de: "Du kannst irgendwo anfangen. Schon ein Wort reicht.",
    hi: "आप कहीं से भी शुरू कर सकते हैं। एक शब्द भी काफ़ी है।",
  },
  "listen.takeYourTime": {
    en: "Take your time. Nothing is sent to anyone.",
    de: "Lass dir Zeit. Nichts wird an jemanden geschickt.",
    hi: "जितना समय चाहिए, लें। किसी को कुछ नहीं भेजा जाता।",
  },
  "listen.stopAnyTime": { en: "You can stop whenever you want.", de: "Du kannst aufhören, wann immer du willst.", hi: "आप जब चाहें रुक सकते हैं।" },
  "listen.skip": { en: "Skip this", de: "Überspringen", hi: "इसे छोड़ें" },
  "listen.notNow": { en: "Not now", de: "Jetzt nicht", hi: "अभी नहीं" },
  "listen.dontKnow": { en: "I don't know", de: "Weiß ich nicht", hi: "मुझे नहीं पता" },
  "listen.askWhere": {
    en: "Do you want to say where it happened? You can skip this.",
    de: "Möchtest du sagen, wo es passiert ist? Du kannst das überspringen.",
    hi: "क्या आप बताना चाहते हैं कि यह कहाँ हुआ? आप इसे छोड़ भी सकते हैं।",
  },
  "listen.askWhen": {
    en: "Do you want to say when it happened? You can skip this.",
    de: "Möchtest du sagen, wann es passiert ist? Du kannst das überspringen.",
    hi: "क्या आप बताना चाहते हैं कि यह कब हुआ? आप इसे छोड़ भी सकते हैं।",
  },
  "listen.askMore": {
    en: "Is there anything else you want to add? You don't have to.",
    de: "Möchtest du noch etwas dazusagen? Du musst nicht.",
    hi: "क्या आप कुछ और जोड़ना चाहते हैं? ज़रूरी नहीं है।",
  },
  "listen.readBack": { en: "Here is what we understood. Is it right?", de: "Das haben wir verstanden. Stimmt das?", hi: "हमने यह समझा। क्या यह सही है?" },
  "listen.readBackYes": { en: "Yes, that's right", de: "Ja, das stimmt", hi: "हाँ, यह सही है" },
  // Not "let me fix it": in Hindi that needs a gendered verb (करूँगा/करूँगी).
  "listen.readBackFix": { en: "Not quite, change it", de: "Nicht ganz, ändern", hi: "पूरी तरह नहीं, बदलें" },
  "listen.thanks": {
    en: "Thank you for putting this into words.",
    de: "Danke, dass du das in Worte gefasst hast.",
    hi: "इसे शब्दों में कहने के लिए धन्यवाद।",
  },

  // Voice, both ways. Reading aloud uses the device's own speechSynthesis and
  // leaves the phone; turning speech into text usually does not stay on it,
  // so voice.privacy must be shown wherever the mic button is.
  "voice.speak": { en: "Speak", de: "Sprechen", hi: "बोलें" },
  "voice.listening": {
    en: "Listening… press Stop when you are done.",
    de: "Hört zu … drück auf Stopp, wenn du fertig bist.",
    hi: "सुन रहा है… पूरा होने पर 'रोकें' दबाएँ।",
  },
  "voice.stop": { en: "Stop", de: "Stopp", hi: "रोकें" },
  "voice.checkText": {
    en: "Read what we heard, and fix anything that is wrong.",
    de: "Lies, was wir gehört haben, und korrigiere, was falsch ist.",
    hi: "हमने जो सुना उसे पढ़ें, और जो गलत हो उसे ठीक करें।",
  },
  "voice.privacy": {
    en: "To turn your voice into text, your browser sends it to a speech service, usually Google or Apple. If you type instead, no voice is sent.",
    de: "Um deine Stimme in Text umzuwandeln, schickt dein Browser sie an einen Sprachdienst, meist Google oder Apple. Wenn du tippst, wird keine Stimme verschickt.",
    hi: "आपकी आवाज़ को टेक्स्ट में बदलने के लिए आपका ब्राउज़र उसे एक स्पीच सेवा को भेजता है, आमतौर पर Google या Apple को। अगर आप टाइप करें, तो कोई आवाज़ नहीं भेजी जाती।",
  },
  "voice.unsupported": {
    en: "Speaking does not work in this browser. You can type, or use the microphone on your keyboard.",
    de: "Sprechen funktioniert in diesem Browser nicht. Du kannst tippen oder das Mikrofon auf deiner Tastatur benutzen.",
    hi: "इस ब्राउज़र में बोलना काम नहीं करता। आप टाइप कर सकते हैं, या अपने कीबोर्ड का माइक्रोफ़ोन इस्तेमाल कर सकते हैं।",
  },
  "voice.keyboardHint": {
    en: "You can also tap the microphone on your keyboard and speak. Your keyboard then sends your voice to its own speech service.",
    de: "Du kannst auch auf das Mikrofon deiner Tastatur tippen und sprechen. Deine Tastatur schickt deine Stimme dann an ihren eigenen Sprachdienst.",
    hi: "आप अपने कीबोर्ड के माइक्रोफ़ोन पर टैप करके भी बोल सकते हैं। तब आपका कीबोर्ड आपकी आवाज़ अपनी स्पीच सेवा को भेजता है।",
  },
  "voice.readAloud": { en: "Read aloud", de: "Vorlesen", hi: "पढ़कर सुनाएँ" },
  "voice.stopReading": { en: "Stop reading", de: "Vorlesen stoppen", hi: "सुनाना रोकें" },
  // Many phones have no Hindi voice installed; say so instead of a silent button.
  "voice.noVoice": {
    en: "This phone has no voice for your language, so reading aloud is off.",
    de: "Dieses Handy hat keine Stimme für deine Sprache, deshalb ist Vorlesen aus.",
    hi: "इस फ़ोन में आपकी भाषा की आवाज़ नहीं है, इसलिए पढ़कर सुनाना बंद है।",
  },

  // The helpers on the checking screen: the Nemotron steps, shown as jobs,
  // never as friends. For a German-speaking child nothing is translated, so
  // only the Asker applies (CLAUDE.md, "A child who already writes German").
  // The Checker "looks for" mistakes: agreement is not correctness.
  "helper.title": { en: "Who checks your words", de: "Wer deine Worte prüft", hi: "आपके शब्द कौन जाँचता है" },
  "helper.writer.name": { en: "The Writer", de: "Der Schreiber", hi: "लेखक" },
  "helper.writer.job": {
    en: "Writes your words in German. When a sentence needs extra care, it writes several versions.",
    de: "Schreibt deine Worte auf Deutsch. Wenn ein Satz besondere Sorgfalt braucht, schreibt er mehrere Fassungen.",
    hi: "आपके शब्दों को जर्मन में लिखता है। जब किसी वाक्य पर ज़्यादा ध्यान चाहिए, तो वह कई रूप लिखता है।",
  },
  "helper.checker.name": { en: "The Checker", de: "Der Prüfer", hi: "जाँचने वाला" },
  "helper.checker.job": {
    en: "Compares the versions with what you wrote and looks for mistakes.",
    de: "Vergleicht die Fassungen mit dem, was du geschrieben hast, und sucht nach Fehlern.",
    hi: "इन रूपों की तुलना आपके लिखे से करता है और गलतियाँ ढूँढता है।",
  },
  "helper.asker.name": { en: "The Asker", de: "Der Frager", hi: "पूछने वाला" },
  "helper.asker.job": {
    en: "Notices when your words could mean two things, and asks you instead of guessing.",
    de: "Merkt, wenn deine Worte zwei Dinge bedeuten könnten, und fragt dich, statt zu raten.",
    hi: "ध्यान देता है कि कब आपके शब्दों के दो मतलब हो सकते हैं, और अंदाज़ा लगाने के बजाय आपसे पूछता है।",
  },
  "helper.note": {
    en: "They are computer programs (NVIDIA Nemotron), not people and not friends. Only you decide what your words mean.",
    de: "Das sind Computerprogramme (NVIDIA Nemotron), keine Menschen und keine Freunde. Nur du entscheidest, was deine Worte bedeuten.",
    hi: "ये कंप्यूटर प्रोग्राम (NVIDIA Nemotron) हैं, इंसान या दोस्त नहीं। आपके शब्दों का मतलब सिर्फ़ आप तय करते हैं।",
  },
} as const satisfies Record<string, Text>;

export type StringKey = keyof typeof STRINGS;

/** The text for `key` in `lang`, falling back to English for unknown languages. */
export function t(key: StringKey, lang: string): string {
  const entry: Text = STRINGS[key];
  return (isLang(lang) && entry[lang]) || entry[FALLBACK_LANG];
}

/** `t()` with `{name}` placeholders filled in, e.g. fill("help.checkedDays", "de", { n: 3 }). */
export function fill(key: StringKey, lang: string, values: Readonly<Record<string, string | number>> = {}): string {
  return t(key, lang).replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

export function isLang(lang: string): lang is Lang {
  return (LANGS as readonly string[]).includes(lang);
}
