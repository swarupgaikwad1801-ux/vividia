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
 *
 * Simple words (issue #3): every child-facing sentence is written for a
 * 10-year-old. Short sentences, everyday words, one idea per sentence.
 * - A screen speaks only the child's language. German appears next to it only
 *   on the card the child shows the adult.
 * - German uses "du". Hindi uses तुम, as adults speak to children, and avoids
 *   verbs that mark the child's gender (no करोगे/करोगी, सकते/सकती हो): it uses
 *   commands (लिखो), "तुमने ..." or impersonal forms (लिखा जा सकता है) instead.
 */

export type Lang = "en" | "de" | "hi";

export const LANGS: readonly Lang[] = ["en", "de", "hi"] as const;
export const FALLBACK_LANG: Lang = "en";
export const HINDI_REVIEWED = false;

type Text = Record<Lang, string>;

export const STRINGS = {
  "app.name": { en: "Vividia", de: "Vividia", hi: "Vividia" },
  "app.poweredBy": {
    en: "Made with NVIDIA Nemotron",
    de: "Gemacht mit NVIDIA Nemotron",
    hi: "NVIDIA Nemotron से बना",
  },

  "demo.button": { en: "Try Amara's story", de: "Amaras Geschichte ausprobieren", hi: "अमारा की कहानी देखो" },
  "demo.notice": {
    en: "Amara is made up. She is not a real child.",
    de: "Amara ist ausgedacht. Sie ist kein echtes Kind.",
    hi: "अमारा एक बनाई हुई कहानी है। वह कोई असली बच्ची नहीं है।",
  },
  // The demo button (moved from lib-demo/pendingStrings.ts, same key names).
  // {name} is the persona name from the story, filled with fill(), never typed in.
  "demo.loading": {
    en: "Opening the story…",
    de: "Die Geschichte wird geöffnet…",
    hi: "कहानी खुल रही है…",
  },
  "demo.loaded": {
    en: "{name}'s story is ready. Her words are already written. Press “Check my words”.",
    de: "{name}s Geschichte ist da. Ihre Worte sind schon geschrieben. Drück auf „Meine Worte prüfen“.",
    hi: "{name} की कहानी तैयार है। उसके शब्द पहले से लिखे हैं। अब “मेरे शब्द जाँचो” दबाओ।",
  },
  "demo.clear": { en: "Remove the example", de: "Beispiel löschen", hi: "उदाहरण हटाओ" },
  "demo.cleared": {
    en: "The example is gone. The app is empty again.",
    de: "Das Beispiel ist weg. Die App ist wieder leer.",
    hi: "उदाहरण हट गया। ऐप फिर से खाली है।",
  },
  // The refusal: the person has notes of their own, so the example was not
  // loaded at all. Says what happened, and does not offer to load it anyway:
  // the child's own words are what is being protected.
  "demo.notLoadedOwnNotes": {
    en: "You have your own notes here, so the example did not open. Your notes are just as they were.",
    de: "Hier sind schon deine eigenen Notizen. Darum wurde das Beispiel nicht geöffnet. Deine Notizen sind wie vorher.",
    hi: "यहाँ तुम्हारे अपने नोट्स हैं, इसलिए उदाहरण नहीं खुला। तुम्हारे नोट्स वैसे ही हैं।",
  },

  "help.button": { en: "Need help now?", de: "Brauchst du jetzt Hilfe?", hi: "अभी मदद चाहिए?" },
  "help.title": { en: "People who can help", de: "Menschen, die helfen können", hi: "ये लोग मदद कर सकते हैं" },
  // The red pill in the top bar: short, so it fits beside Leave now at 360px.
  "help.short": { en: "Need help", de: "Hilfe", hi: "मदद" },
  // The one red line on danger. Split around the number, which comes from
  // /api/emergency (content/helplines.json), never typed here.
  "help.dangerBefore": { en: "In danger right now? Call", de: "Gerade in Gefahr? Ruf die", hi: "अभी ख़तरे में हो?" },
  "help.dangerAfter": { en: ".", de: " an.", hi: " पर कॉल करो।" },
  "help.dangerLineNoNumber": {
    en: "In danger right now? Tap Need help at the top.",
    de: "Gerade in Gefahr? Tipp oben auf Hilfe.",
    hi: "अभी ख़तरे में हो? ऊपर मदद दबाओ।",
  },
  "help.source": { en: "Checked on", de: "Geprüft am", hi: "जाँचा गया" },

  "quickExit.button": { en: "Leave now", de: "Schnell raus", hi: "तुरंत निकलो" },
  "quickExit.note": {
    en: "This leaves the app at once. It does not delete your browser history.",
    de: "Damit bist du sofort raus aus der App. Dein Browser-Verlauf wird aber nicht gelöscht.",
    hi: "इससे ऐप तुरंत बंद हो जाता है। पर ब्राउज़र की हिस्ट्री नहीं मिटती।",
  },

  "checkin.title": { en: "How are you today?", de: "Wie geht es dir heute?", hi: "आज कैसा लग रहा है?" },
  "checkin.skip": { en: "Skip", de: "Überspringen", hi: "छोड़ो" },

  "write.title": { en: "What happened?", de: "Was ist passiert?", hi: "क्या हुआ?" },
  "write.hint": {
    en: "Write it your way, in your own language.",
    de: "Schreib es so, wie du willst. In deiner Sprache.",
    hi: "अपने तरीके से लिखो, अपनी भाषा में।",
  },
  "write.placeholder": { en: "Write here…", de: "Schreib hier…", hi: "यहाँ लिखो…" },
  "write.send": { en: "Check my words", de: "Meine Worte prüfen", hi: "मेरे शब्द जाँचो" },
  "write.checking": { en: "Checking your words…", de: "Wir prüfen deine Worte…", hi: "हम तुम्हारे शब्द जाँच रहे हैं…" },
  "write.german": { en: "In German", de: "Auf Deutsch", hi: "जर्मन में" },

  "clarify.title": { en: "What did you mean?", de: "Was hast du gemeint?", hi: "तुम्हारा मतलब क्या था?" },
  "clarify.hint": {
    en: "Only you know. Pick the one that fits.",
    de: "Nur du weißt es. Such aus, was passt.",
    hi: "यह सिर्फ़ तुम्हें पता है। जो सही लगे, वह चुनो।",
  },

  "approve.title": { en: "Is this right?", de: "Stimmt das so?", hi: "क्या यह ठीक है?" },
  "approve.yes": { en: "Yes, save it", de: "Ja, speichern", hi: "हाँ, सेव करो" },
  "approve.change": { en: "Change it", de: "Ändern", hi: "बदलो" },

  "timeline.title": { en: "What happened so far", de: "Was bisher passiert ist", hi: "अब तक क्या हुआ" },
  // Also shown on the handoff card when nothing is approved yet. Where things
  // are stored is said once, in timeline.storageNote.
  "timeline.empty": {
    en: "Nothing saved yet.",
    de: "Noch nichts gespeichert.",
    hi: "अभी कुछ सेव नहीं है।",
  },
  "timeline.delete": { en: "Delete", de: "Löschen", hi: "मिटाओ" },
  "timeline.deleteAll": { en: "Delete everything", de: "Alles löschen", hi: "सब मिटाओ" },
  "timeline.deleteAllConfirm": {
    en: "Delete everything you saved? You can't get it back.",
    de: "Alles löschen, was du gespeichert hast? Du kannst es dann nicht zurückholen.",
    hi: "जो सेव किया है, सब मिटा दें? फिर यह वापस नहीं आएगा।",
  },
  "timeline.notPersistent": {
    en: "This browser is not saving anything. When you close it, your words will be gone.",
    de: "Dieser Browser speichert nichts. Wenn du ihn zumachst, sind deine Worte weg.",
    hi: "यह ब्राउज़र कुछ सेव नहीं कर रहा। इसे बंद करते ही तुम्हारे शब्द चले जाएँगे।",
  },

  "where.title": { en: "Where does this happen?", de: "Wo passiert das?", hi: "यह कहाँ होता है?" },
  "where.school": { en: "At school", de: "In der Schule", hi: "स्कूल में" },
  "where.home": { en: "At home", de: "Zu Hause", hi: "घर पर" },
  "where.online": { en: "Online", de: "Online", hi: "ऑनलाइन" },
  "where.elsewhere": { en: "Somewhere else", de: "Woanders", hi: "कहीं और" },

  "handoff.title": {
    en: "Who do you want to show this to?",
    de: "Wem willst du das zeigen?",
    hi: "यह किसे दिखाना है?",
  },
  "handoff.homeNote": {
    en: "Because it happens at home, we only show people at school and people you can call.",
    de: "Weil es zu Hause passiert, zeigen wir dir nur Leute aus der Schule und Leute, die du anrufen kannst.",
    hi: "क्योंकि यह घर पर होता है, हम सिर्फ़ स्कूल के लोग और फ़ोन पर मदद करने वाले लोग दिखाते हैं।",
  },
  "handoff.youDecide": {
    en: "Nothing gets sent. You pick who sees it. You show it yourself.",
    de: "Nichts wird verschickt. Du suchst aus, wer es sieht. Du zeigst es selbst.",
    hi: "कुछ भी भेजा नहीं जाता। कौन देखेगा, यह तुम चुनो। दिखाना भी तुम्हारे हाथ में है।",
  },
  // The German of these four is also what the adult reads on the card, so it
  // keeps the role names a German school uses (Vertrauenslehrkraft is a role,
  // not just "a teacher I like").
  "handoff.classTeacher": { en: "My class teacher", de: "Meine Klassenlehrkraft", hi: "मेरे क्लास टीचर" },
  "handoff.trustedTeacher": { en: "A teacher I trust", de: "Eine Vertrauenslehrkraft", hi: "कोई टीचर जिन पर मुझे भरोसा है" },
  "handoff.socialWorker": { en: "The school social worker", de: "Jemand von der Schulsozialarbeit", hi: "स्कूल के सोशल वर्कर" },
  "handoff.family": { en: "Someone in my family", de: "Jemand aus meiner Familie", hi: "मेरे परिवार में कोई" },

  // --- writing screen ("Find the words") ---
  // Moved from the temporary components/WriteStrings.ts on feat/write-screen,
  // same key names. {n} is filled with fill().
  "write.yourWords": { en: "Your words", de: "Deine Worte", hi: "तुम्हारे शब्द" },
  // Shown while the words are being checked: the moment they leave the phone,
  // and the one place that says so now that onboarding is three cards (#72).
  // "Checked", not "translated": a child writing German is not translated.
  "write.whatWeDo": {
    en: "Your words go to a computer service on the internet to be checked. It keeps nothing.",
    de: "Deine Worte gehen zum Prüfen an einen Computerdienst im Internet. Er behält nichts.",
    hi: "तुम्हारे शब्द जाँच के लिए इंटरनेट पर एक कंप्यूटर सेवा के पास जाते हैं। वह कुछ नहीं रखती।",
  },
  "write.stillWorking": {
    en: "Still working. Checking carefully takes a little time.",
    de: "Läuft noch. Gut prüfen dauert ein bisschen.",
    hi: "अभी चल रहा है। ध्यान से जाँचने में थोड़ा समय लगता है।",
  },
  "write.stop": { en: "Stop", de: "Stopp", hi: "रोको" },
  "write.retry": { en: "Try again", de: "Nochmal versuchen", hi: "फिर से करो" },
  // Shown as a label before a percentage: "How much the checks agreed  80%".
  "write.agreement": {
    en: "How much the checks agreed",
    de: "So oft waren die Prüfungen gleich",
    hi: "जाँचें कितनी मिलीं",
  },
  // CLAUDE.md: consensus measures agreement, not correctness. Keep that meaning.
  "write.agreementNote": {
    en: "This shows how often our checks gave the same answer. It does not show if the German is right.",
    de: "Das zeigt, wie oft unsere Prüfungen dasselbe gesagt haben. Es zeigt nicht, ob das Deutsch richtig ist.",
    hi: "यह दिखाता है कि हमारी जाँचों ने कितनी बार एक जैसा जवाब दिया। यह नहीं बताता कि जर्मन सही है या नहीं।",
  },
  "write.yourChoiceUsed": {
    en: "Your answer chose this German. The app did not choose for you.",
    de: "Deine Antwort hat dieses Deutsch ausgesucht. Die App hat nicht für dich gewählt.",
    hi: "यह जर्मन तुम्हारे जवाब से चुना गया। ऐप ने तुम्हारी जगह नहीं चुना।",
  },
  "write.checksOne": { en: "1 check", de: "1 Prüfung", hi: "1 जाँच" },
  "write.checks": { en: "{n} checks", de: "{n} Prüfungen", hi: "{n} जाँचें" },
  "write.secondsLong": { en: "{n} seconds so far", de: "schon {n} Sekunden", hi: "अब तक {n} सेकंड" },
  "clarify.important": { en: "Important", de: "Wichtig", hi: "ज़रूरी" },
  "clarify.send": { en: "That's what I meant", de: "Das habe ich gemeint", hi: "मेरा यही मतलब था" },
  "clarify.rewrite": { en: "Say it another way", de: "Anders sagen", hi: "दूसरे तरीके से लिखो" },
  "clarify.rewriteWhy": {
    en: "None of the answers fit. Only you know what you mean, so change your words and check again.",
    de: "Keine Antwort passt. Nur du weißt, was du meinst. Ändere deine Worte und prüf sie nochmal.",
    hi: "कोई जवाब सही नहीं बैठा। तुम्हारा मतलब सिर्फ़ तुम्हें पता है। अपने शब्द बदलो और फिर से जाँचो।",
  },

  "errors.network": {
    en: "No internet right now. What you saved is still on this phone.",
    de: "Gerade gibt es kein Internet. Was du gespeichert hast, ist noch auf dem Handy.",
    hi: "अभी इंटरनेट नहीं मिल रहा। जो सेव किया था, वह अभी भी इसी फ़ोन पर है।",
  },
  "errors.slow": {
    en: "This is taking longer than usual. Try again in a moment.",
    de: "Das dauert gerade länger. Versuch es gleich nochmal.",
    hi: "इसमें ज़्यादा समय लग रहा है। थोड़ी देर में फिर से करो।",
  },
  "errors.generic": {
    en: "Something went wrong on our side. Your words are not lost.",
    de: "Bei uns ist etwas schiefgegangen. Deine Worte sind noch da.",
    hi: "हमारी तरफ़ कुछ गड़बड़ हो गई। तुम्हारे शब्द खोए नहीं हैं।",
  },

  // The emoji check-in (lib/moods.ts). The codes after "mood." are stored in
  // the timeline, so they must not change: "mood.alone" now reads "Lonely"
  // (Neel, 26 Oct) but keeps its code. Hindi is अकेलापन ("loneliness"),
  // because अकेला/अकेली would guess the child's gender.
  "mood.good": { en: "Good", de: "Gut", hi: "अच्छा" },
  "mood.ok": { en: "OK", de: "Geht so", hi: "ठीक है" },
  "mood.sad": { en: "Sad", de: "Traurig", hi: "दुखी" },
  "mood.scared": { en: "Scared", de: "Angst", hi: "डर लग रहा है" },
  "mood.angry": { en: "Angry", de: "Wütend", hi: "गुस्सा" },
  "mood.alone": { en: "Lonely", de: "Einsam", hi: "अकेलापन" },

  // Languages a helpline speaks (lib/help.ts). Only the codes that appear in
  // content/helplines.json, plus the two we ship as source languages.
  "lang.de": { en: "German", de: "Deutsch", hi: "जर्मन" },
  "lang.en": { en: "English", de: "Englisch", hi: "अंग्रेज़ी" },
  "lang.hi": { en: "Hindi", de: "Hindi", hi: "हिंदी" },
  "lang.uk": { en: "Ukrainian", de: "Ukrainisch", hi: "यूक्रेनी" },

  // The language switch on the card the child shows an adult
  // (components/CardLanguageSwitch.tsx). "Auf Deutsch" stays German in every
  // language: it is the adult who reads and taps it.
  "card.german": { en: "Auf Deutsch", de: "Auf Deutsch", hi: "Auf Deutsch" },
  "card.languageSwitch": { en: "Choose the language", de: "Sprache wählen", hi: "भाषा चुनो" },

  // The game map (components/GameMap.tsx). Places, not levels: nothing is
  // won or locked. Read out once per screen for a screen reader.
  "map.feel": { en: "How you feel", de: "Wie es dir geht", hi: "कैसा लग रहा है" },
  "map.what": { en: "What happened", de: "Was passiert ist", hi: "क्या हुआ" },
  "map.where": { en: "Where", de: "Wo", hi: "कहाँ" },
  "map.whoDid": { en: "Who", de: "Wer", hi: "कौन" },
  "map.often": { en: "How often", de: "Wie oft", hi: "कितनी बार" },
  "map.feelAbout": { en: "How it feels", de: "Wie es sich anfühlt", hi: "कैसा लगता है" },
  "map.body": { en: "How your body feels", de: "Wie sich dein Körper anfühlt", hi: "शरीर कैसा है" },
  "map.taken": { en: "What was taken", de: "Was weggenommen wurde", hi: "क्या लिया गया" },
  "map.whereOnline": { en: "Where online", de: "Wo online", hi: "ऑनलाइन कहाँ" },
  "map.when": { en: "When", de: "Wann", hi: "कब" },
  "map.own": { en: "Your own words", de: "Deine eigenen Worte", hi: "तुम्हारे अपने शब्द" },
  "map.adult": { en: "The adult", de: "Die erwachsene Person", hi: "वह वयस्क" },
  "map.card": { en: "Your card", de: "Deine Karte", hi: "तुम्हारा कार्ड" },
  "map.who": { en: "Who sees it", de: "Wer es sieht", hi: "कौन देखेगा" },
  "map.done": { en: "Done", de: "Fertig", hi: "हो गया" },
  "map.youAreHere": {
    en: "You are here: {place}, place {n} of {total}.",
    de: "Du bist hier: {place}, Ort {n} von {total}.",
    hi: "तुम यहाँ हो: {place}, {total} में से {n}।",
  },

  // The traveller on the map: a picture the child picks, never a character
  // that talks. Stored only on this phone (lib/avatar.ts).
  "avatar.pick": { en: "Pick who walks the map", de: "Wer läuft über die Karte?", hi: "नक्शे पर कौन चलेगा, चुनो" },
  "avatar.option": { en: "Traveller {n}", de: "Figur {n}", hi: "यात्री {n}" },
  // The traveller on the map is a button: tap it to pick another head.
  "avatar.change": { en: "Change your traveller", de: "Figur ändern", hi: "अपना यात्री बदलो" },

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
    de: "Manche Wörter in dieser App gibt es bis jetzt nur auf Englisch.",
    hi: "इस ऐप में कुछ शब्द अभी सिर्फ़ अंग्रेज़ी में हैं।",
  },

  // Timeline and report (moved from components/TimelinePendingStrings.ts).
  "timeline.storageNote": {
    en: "This list is saved only in this browser. You can delete it any time.",
    de: "Diese Liste ist nur in diesem Browser gespeichert. Du kannst sie immer löschen.",
    hi: "यह लिस्ट सिर्फ़ इसी ब्राउज़र में सेव है। जब चाहो, इसे मिटा दो।",
  },
  "timeline.deleteAllYes": { en: "Yes, delete everything", de: "Ja, alles löschen", hi: "हाँ, सब मिटाओ" },
  "timeline.deleteAllNo": { en: "No, keep it", de: "Nein, behalten", hi: "नहीं, रहने दो" },
  "timeline.deletedAll": {
    en: "Everything you saved is deleted.",
    de: "Alles, was du gespeichert hast, ist gelöscht.",
    hi: "जो सेव किया था, सब मिट गया।",
  },
  "timeline.where": { en: "Where", de: "Wo", hi: "कहाँ" },
  "timeline.who": { en: "Who", de: "Wer", hi: "कौन" },
  // Child text says "card", not "report": it is the card the child shows the
  // adult. The key names keep "report" because the code and the API use it.
  "timeline.buildReport": { en: "Make a card from this", de: "Eine Karte daraus machen", hi: "इससे कार्ड बनाओ" },
  "report.title": {
    en: "Your card, to show someone",
    de: "Deine Karte zum Zeigen",
    hi: "तुम्हारा कार्ड, किसी को दिखाने के लिए",
  },
  "report.build": { en: "Make the card", de: "Karte machen", hi: "कार्ड बनाओ" },
  "report.building": { en: "Making your card…", de: "Deine Karte wird gemacht…", hi: "तुम्हारा कार्ड बन रहा है…" },
  "report.needEntries": {
    en: "Save something first. The card is made from what you save.",
    de: "Speicher zuerst etwas. Die Karte wird aus deinen Einträgen gemacht.",
    hi: "पहले कुछ सेव करो। कार्ड उसी से बनता है जो सेव है।",
  },
  "report.childLabel": { en: "In your language", de: "In deiner Sprache", hi: "तुम्हारी भाषा में" },
  "report.germanNote": {
    en: "This is the part an adult reads.",
    de: "Das ist der Teil für Erwachsene.",
    hi: "यह हिस्सा बड़ों के लिए है।",
  },
  "report.readAll": {
    en: "Read it all. Nobody is shown anything until you say it is right.",
    de: "Lies alles. Niemand sieht etwas, bevor du sagst: Das stimmt.",
    hi: "पूरा पढ़ो। जब तक तुम “हाँ, सही है” न कहो, कोई कुछ नहीं देखेगा।",
  },
  // "Nothing is sent" is said once, on the handoff choice (handoff.youDecide).
  "report.approved": {
    en: "You said this is right.",
    de: "Du hast gesagt: Das stimmt.",
    hi: "तुमने कहा कि यह सही है।",
  },
  "report.offline": {
    en: "There is no internet, so the card can't be made yet. What you saved is still here.",
    de: "Gerade gibt es kein Internet. Darum kann die Karte noch nicht gemacht werden. Was du gespeichert hast, ist noch da.",
    hi: "अभी इंटरनेट नहीं है, इसलिए कार्ड अभी नहीं बन सकता। जो सेव किया था, वह यहीं है।",
  },
  "errors.retry": { en: "Try again", de: "Nochmal versuchen", hi: "फिर से करो" },

  // Handoff (moved from components/HandoffTempStrings.ts, which was English only).
  "handoff.showTo": { en: "Show this to", de: "Das zeigst du", hi: "यह दिखाना है" },
  "handoff.changeWhere": { en: "Change where it happens", de: "Ort ändern", hi: "जगह बदलो" },
  "handoff.preparing": { en: "Getting your words ready…", de: "Deine Worte werden fertig gemacht…", hi: "तुम्हारे शब्द तैयार हो रहे हैं…" },
  "handoff.retry": { en: "Try again", de: "Nochmal versuchen", hi: "फिर से करो" },
  "handoff.yourWords": { en: "Your words", de: "Deine Worte", hi: "तुम्हारे शब्द" },
  // The handoff ending (issue #3): a full-screen card, then the follow-up.
  // Not used by a screen yet; Vernika builds it.
  // No first person, same rule as the follow-up: the app is not a friend.
  "handoff.showThem": { en: "Show this to them", de: "Jetzt zeigen", hi: "यह उन्हें दिखाओ" },
  "handoff.checkLater": {
    en: "In a few days, the app will ask how things are.",
    de: "In ein paar Tagen fragt die App, wie es dir geht.",
    hi: "कुछ दिनों में ऐप पूछेगा कि कैसा चल रहा है।",
  },
  "handoff.done": { en: "Done", de: "Fertig", hi: "हो गया" },

  // Back and next on every screen (issue #3). Back stays inside the app, so
  // quick exit still has nothing to go back to.
  "nav.back": { en: "Back", de: "Zurück", hi: "पीछे" },
  "nav.next": { en: "Next", de: "Weiter", hi: "आगे" },

  // PIN (moved from components/pinText.ts, which was English only). {seconds},
  // {count} and {when} are filled with fill().
  "pin.set.title": { en: "Make a PIN", de: "PIN aussuchen", hi: "PIN बनाओ" },
  "pin.set.titleChange": { en: "Change your PIN", de: "PIN ändern", hi: "अपना PIN बदलो" },
  "pin.set.hint": {
    en: "A PIN is 4 to 6 numbers. You type it to open the app.",
    de: "Eine PIN sind 4 bis 6 Zahlen. Du tippst sie ein, um die App zu öffnen.",
    hi: "PIN 4 से 6 नंबर का होता है। ऐप खोलने के लिए इसे टाइप करना होता है।",
  },
  // Honest limit of the PIN: keep both halves.
  "pin.set.limit": {
    en: "It stops someone who picks up this phone from reading your words. Someone who knows a lot about phones could still get in.",
    de: "Sie hält jemanden ab, der das Handy nimmt und deine Worte lesen will. Wer sich sehr gut mit Handys auskennt, kommt vielleicht trotzdem rein.",
    hi: "इससे कोई यह फ़ोन उठाकर तुम्हारे शब्द नहीं पढ़ पाएगा। पर जो फ़ोन के बारे में बहुत जानता है, वह शायद फिर भी खोल ले।",
  },
  "pin.set.enter": { en: "Choose your PIN", de: "Such dir eine PIN aus", hi: "अपना PIN चुनो" },
  "pin.set.again": { en: "Type the same PIN again", de: "Tipp dieselbe PIN nochmal", hi: "वही PIN फिर से टाइप करो" },
  "pin.set.next": { en: "Next", de: "Weiter", hi: "आगे" },
  "pin.set.save": { en: "Save my PIN", de: "PIN speichern", hi: "PIN सेव करो" },
  "pin.set.startAgain": { en: "Start again", de: "Nochmal von vorn", hi: "फिर से शुरू करो" },
  "pin.set.mismatch": {
    en: "Those were not the same. Type your PIN again.",
    de: "Die zwei waren nicht gleich. Tipp deine PIN nochmal.",
    hi: "दोनों एक जैसे नहीं थे। अपना PIN फिर से टाइप करो।",
  },
  "pin.set.tooShort": { en: "A PIN is 4 to 6 numbers.", de: "Eine PIN sind 4 bis 6 Zahlen.", hi: "PIN 4 से 6 नंबर का होता है।" },
  "pin.set.saved": {
    en: "Your PIN is saved. You need it to open the app.",
    de: "Deine PIN ist gespeichert. Du brauchst sie, um die App zu öffnen.",
    hi: "तुम्हारा PIN सेव हो गया। ऐप खोलने के लिए इसकी ज़रूरत होगी।",
  },
  "pin.set.noStorage": {
    en: "This phone won't let the app save things, so you can't make a PIN here. Nothing was saved.",
    de: "Dieses Handy lässt die App nichts speichern. Darum geht hier keine PIN. Es wurde nichts gespeichert.",
    hi: "यह फ़ोन ऐप को कुछ सेव नहीं करने देता, इसलिए यहाँ PIN नहीं बन सकता। कुछ भी सेव नहीं हुआ।",
  },
  "pin.set.skip": { en: "Not now", de: "Nicht jetzt", hi: "अभी नहीं" },
  "pin.set.done": { en: "Done", de: "Fertig", hi: "हो गया" },
  "pin.remove.button": { en: "Remove the PIN", de: "PIN löschen", hi: "PIN हटाओ" },
  "pin.remove.ask": {
    en: "Remove the PIN? The app will open without one. Nothing you saved is deleted.",
    de: "PIN löschen? Dann geht die App ohne PIN auf. Was du gespeichert hast, bleibt da.",
    hi: "PIN हटाना है? फिर ऐप बिना PIN के खुलेगा। जो सेव है, वह नहीं मिटेगा।",
  },
  "pin.remove.yes": { en: "Yes, remove it", de: "Ja, löschen", hi: "हाँ, हटाओ" },
  "pin.remove.no": { en: "Keep the PIN", de: "PIN behalten", hi: "PIN रहने दो" },
  "pin.remove.done": {
    en: "The PIN is gone. You can make a new one any time.",
    de: "Die PIN ist weg. Du kannst jederzeit eine neue machen.",
    hi: "PIN हट गया। जब चाहो, नया बना लेना।",
  },
  "pin.unlock.title": { en: "Type your PIN", de: "Tipp deine PIN ein", hi: "अपना PIN टाइप करो" },
  "pin.unlock.hint": { en: "4 to 6 numbers.", de: "4 bis 6 Zahlen.", hi: "4 से 6 नंबर।" },
  "pin.unlock.button": { en: "Open", de: "Öffnen", hi: "खोलो" },
  "pin.unlock.checking": { en: "Checking…", de: "Wird geprüft…", hi: "जाँच रहे हैं…" },
  "pin.unlock.wrong": {
    en: "That is not the PIN. Try again.",
    de: "Das ist nicht die PIN. Versuch es nochmal.",
    hi: "यह सही PIN नहीं है। फिर से करो।",
  },
  "pin.unlock.wait": {
    en: "Wait {seconds} seconds, then try again.",
    de: "Warte {seconds} Sekunden. Dann versuch es nochmal.",
    hi: "{seconds} सेकंड रुको, फिर से करो।",
  },
  // Hindi avoids भूल गया/गई: the child's gender is never assumed.
  "pin.unlock.forgot": { en: "I forgot my PIN", de: "Ich habe meine PIN vergessen", hi: "मुझे अपना PIN याद नहीं" },
  // Honest limit of the PIN: anyone holding the phone can do the same.
  "pin.unlock.forgotHelp": {
    en: "You can remove the PIN and get back in. Nothing you saved is deleted. But anyone holding this phone could do this too. A PIN like this can't stop that.",
    de: "Du kannst die PIN löschen und wieder reinkommen. Was du gespeichert hast, bleibt da. Aber jeder, der dieses Handy hat, kann das auch. So eine PIN kann das nicht verhindern.",
    hi: "PIN हटाकर फिर से अंदर आया जा सकता है। जो सेव है, वह नहीं मिटेगा। पर जिसके हाथ में यह फ़ोन हो, वह भी ऐसा कर सकता है। ऐसा PIN इसे रोक नहीं सकता।",
  },
  "pin.removed.notice": {
    en: "The PIN was removed on {when}. If that was not you, someone else may have opened the app.",
    de: "Die PIN wurde am {when} gelöscht. Warst du das nicht? Dann hat vielleicht jemand anderes die App geöffnet.",
    hi: "PIN {when} को हटाया गया। अगर यह तुमने नहीं किया, तो शायद किसी और ने ऐप खोला था।",
  },
  "pin.keypad.empty": { en: "No numbers typed yet", de: "Noch keine Zahlen getippt", hi: "अभी कोई नंबर टाइप नहीं हुआ" },
  "pin.keypad.entered": { en: "{count} numbers typed", de: "{count} Zahlen getippt", hi: "{count} नंबर टाइप हुए" },
  "pin.keypad.delete": { en: "Delete the last number", de: "Letzte Zahl löschen", hi: "आखिरी नंबर मिटाओ" },
  "pin.keypad.clear": { en: "Clear", de: "Leeren", hi: "साफ़ करो" },

  // Follow-up check-in (moved from lib-followups-ui/copy.ts DRAFT_COPY, which
  // was English only). Tone: never praise "better", never sound let down by
  // "worse", no first person (the app is not a friend).
  "followup.title": { en: "How are things now?", de: "Wie geht es jetzt?", hi: "अब कैसा चल रहा है?" },
  "followup.gap": {
    en: "It's been a few days since you last wrote something.",
    de: "Du hast seit ein paar Tagen nichts geschrieben.",
    hi: "पिछली बार कुछ लिखे हुए कुछ दिन हो गए।",
  },
  // The privacy promise on this screen is followup.notKept, said once.
  "followup.noPressure": {
    en: "You don't have to answer.",
    de: "Du musst nicht antworten.",
    hi: "जवाब देना ज़रूरी नहीं।",
  },
  "followup.answerBetter": { en: "A bit better", de: "Ein bisschen besser", hi: "थोड़ा अच्छा" },
  "followup.answerSame": { en: "About the same", de: "Ungefähr gleich", hi: "पहले जैसा" },
  "followup.answerWorse": { en: "Worse", de: "Schlechter", hi: "पहले से बुरा" },
  "followup.notNow": { en: "Not now", de: "Nicht jetzt", hi: "अभी नहीं" },
  "followup.stopAsking": { en: "Stop asking me this", de: "Frag mich das nicht mehr", hi: "यह सवाल अब मत पूछना" },
  "followup.stopped": {
    en: "This question won't come back. You can still write something any time.",
    de: "Diese Frage kommt nicht wieder. Du kannst trotzdem immer etwas aufschreiben.",
    hi: "यह सवाल अब नहीं आएगा। कुछ लिखना हो, तो कभी भी लिखो।",
  },
  "followup.afterBetter": {
    en: "Okay. You can write something any time, even something small.",
    de: "Okay. Du kannst immer etwas aufschreiben, auch kleine Sachen.",
    hi: "ठीक है। कभी भी कुछ लिखो, छोटी बात भी।",
  },
  "followup.afterStill": {
    en: "Okay. There are other people you could show your words to, if you want.",
    de: "Okay. Es gibt noch andere Leute, denen du deine Worte zeigen kannst, wenn du willst.",
    hi: "ठीक है। चाहो तो और भी लोग हैं, जिन्हें अपने शब्द दिखाए जा सकते हैं।",
  },
  "followup.notKept": {
    en: "This answer is not saved anywhere, and nobody is told.",
    de: "Diese Antwort wird nirgends gespeichert. Niemand erfährt davon.",
    hi: "यह जवाब कहीं सेव नहीं होता। किसी को पता नहीं चलता।",
  },
  "followup.openLadder": { en: "See who else there is", de: "Schauen, wer noch da ist", hi: "और कौन है, देखो" },

  // Escalation ladder (moved from DRAFT_COPY). "Can act" is not "will act":
  // no rung promises it will help.
  "ladder.title": { en: "Who else there is", de: "Wer noch da ist", hi: "और कौन है" },
  "ladder.intro": {
    en: "Other people you could show your words to. You pick. You show it yourself.",
    de: "Andere Leute, denen du deine Worte zeigen kannst. Du suchst aus. Du zeigst es selbst.",
    hi: "और लोग, जिन्हें अपने शब्द दिखाए जा सकते हैं। चुनना तुम्हारे हाथ में है, दिखाना भी।",
  },
  "ladder.noPromise": {
    en: "Nobody can promise it will stop. Each person is a different door, and you can try more than one.",
    de: "Niemand kann versprechen, dass es aufhört. Jede Person ist eine andere Tür. Du kannst mehr als eine ausprobieren.",
    hi: "कोई वादा नहीं कर सकता कि यह रुक जाएगा। हर इंसान एक अलग दरवाज़ा है। एक से ज़्यादा आज़माना ठीक है।",
  },
  "ladder.carryTitle": { en: "Your words come with you", de: "Deine Worte kommen mit", hi: "तुम्हारे शब्द तुम्हारे साथ जाते हैं" },
  "ladder.carryWhy": {
    en: "What you already checked and said yes to goes to the next person too. So you never have to explain it all again from the start.",
    de: "Was du schon geprüft und bestätigt hast, kommt mit zur nächsten Person. So musst du nicht wieder ganz von vorn erzählen.",
    hi: "जो तुमने पहले ही जाँचकर सही कहा है, वह अगले इंसान तक भी जाता है। फिर से शुरू से समझाना नहीं पड़ेगा।",
  },
  "ladder.carryNone": {
    en: "You haven't written anything yet, so there is nothing to show. You can write something first.",
    de: "Du hast noch nichts aufgeschrieben. Darum gibt es nichts zu zeigen. Du kannst zuerst etwas schreiben.",
    hi: "अभी कुछ लिखा नहीं गया, इसलिए दिखाने को कुछ नहीं है। चाहो तो पहले कुछ लिखो।",
  },
  "ladder.stateStart": { en: "A place to start", de: "Hier anfangen", hi: "शुरुआत के लिए" },
  "ladder.stateNext": { en: "You could try this next", de: "Das kannst du als Nächstes probieren", hi: "आगे यह आज़माओ" },
  "ladder.stateShown": { en: "You showed this", de: "Das hast du gezeigt", hi: "तुमने यह दिखाया" },
  "ladder.stateLater": { en: "Still here if you need it", de: "Noch da, wenn du es brauchst", hi: "ज़रूरत हो तो यह भी है" },
  "ladder.show": { en: "Take my words here", de: "Meine Worte hierhin mitnehmen", hi: "मेरे शब्द यहाँ ले चलो" },
  "ladder.seeWho": { en: "See who they are", de: "Schauen, wer das ist", hi: "देखो ये कौन हैं" },
  "ladder.markShown": { en: "I showed this to them", de: "Ich habe es ihnen gezeigt", hi: "मैंने इन्हें दिखाया" },
  "ladder.undo": { en: "Undo", de: "Rückgängig", hi: "वापस लो" },
  "ladder.waiting": {
    en: "Nothing new since you showed this. You don't have to do anything now.",
    de: "Seit du das gezeigt hast, ist nichts Neues passiert. Du musst jetzt nichts tun.",
    hi: "दिखाने के बाद से कुछ नया नहीं हुआ। अभी कुछ करने की ज़रूरत नहीं।",
  },
  "ladder.stillHappening": {
    en: "It kept happening after you showed this.",
    de: "Es ist weiter passiert, nachdem du das gezeigt hast.",
    hi: "दिखाने के बाद भी यह होता रहा।",
  },
  "ladder.topRung": {
    en: "This is the last step this app knows. If it keeps happening, you can go back to any of these people. Asking twice is okay.",
    de: "Das ist der letzte Schritt, den die App kennt. Wenn es weiter passiert, kannst du wieder zu einer dieser Personen gehen. Zweimal fragen ist okay.",
    hi: "यह आख़िरी कदम है जो यह ऐप जानता है। अगर यह होता रहे, तो इनमें से किसी के पास फिर जाना ठीक है। दो बार पूछना ठीक है।",
  },
  "ladder.dangerNow": {
    en: "If you are in danger right now, press the help button in this app.",
    de: "Bist du gerade in Gefahr? Dann drück den Hilfe-Knopf in dieser App.",
    hi: "अगर अभी ख़तरा है, तो इस ऐप में मदद वाला बटन दबाओ।",
  },
  "ladder.contactsElsewhere": {
    en: "To see how to reach them, press the help button.",
    de: "Wie du sie erreichst, siehst du unter dem Hilfe-Knopf.",
    hi: "इन तक कैसे पहुँचें, यह मदद वाले बटन में है।",
  },
  "ladder.rung.head": { en: "The head of the school", de: "Die Schulleitung", hi: "स्कूल के प्रिंसिपल" },
  "ladder.rung.schoolPsychology": {
    en: "School counsellors for your area",
    de: "Die Schulpsychologie in deiner Nähe",
    hi: "तुम्हारे इलाके के स्कूल काउंसलर",
  },
  "ladder.rung.helplines": {
    en: "Helpers you can call or chat with",
    de: "Beratung zum Anrufen oder Chatten",
    hi: "मदद करने वाले लोग, जिनसे फ़ोन या चैट पर बात हो सकती है",
  },
  "ladder.why.teacher": {
    en: "Sees your class every day.",
    de: "Sieht deine Klasse jeden Tag.",
    hi: "रोज़ तुम्हारी क्लास के साथ होते हैं।",
  },
  "ladder.why.trusted": {
    en: "Helping with this is part of their job at school.",
    de: "Bei so etwas helfen ist ihre Aufgabe an der Schule.",
    hi: "ऐसी बातों में मदद करना स्कूल में उनका काम है।",
  },
  "ladder.why.head": {
    en: "Can do something if a teacher didn't.",
    de: "Kann etwas tun, wenn eine Lehrkraft nichts getan hat.",
    hi: "अगर किसी टीचर ने कुछ नहीं किया, तो ये कुछ कर सकते हैं।",
  },
  "ladder.why.schoolPsychology": {
    en: "Outside your school, not part of it.",
    de: "Nicht von deiner Schule, sondern von außen.",
    hi: "तुम्हारे स्कूल से बाहर के लोग।",
  },
  "ladder.why.helplines": {
    en: "Not from your school at all.",
    de: "Haben nichts mit deiner Schule zu tun.",
    hi: "इनका तुम्हारे स्कूल से कोई लेना-देना नहीं।",
  },

  // Onboarding (screens/Onboarding.tsx): three picture cards, one at a time.
  // The cards are content/onboarding.json word for word; lib/onboarding.test.ts
  // fails if the two drift, so edit both. Copied here rather than fetched so the
  // first screen after the language works offline and never waits on the
  // backend waking up. {button} is filled with quickExit.button.
  "onboarding.title": { en: "Before you start", de: "Bevor du anfängst", hi: "शुरू करने से पहले" },
  "onboarding.what": {
    en: "This app helps you tell an adult what happened. It is not a person and not a doctor.",
    de: "Die App hilft dir, einem Erwachsenen zu sagen, was passiert ist. Sie ist kein Mensch und kein Arzt.",
    hi: "यह ऐप किसी बड़े को यह बताने में मदद करता है कि क्या हुआ। यह कोई इंसान या डॉक्टर नहीं है।",
  },
  "onboarding.youDecide": {
    en: "You choose who sees it. The app tells nobody behind your back.",
    de: "Du suchst aus, wer es sieht. Die App sagt niemandem heimlich etwas.",
    hi: "कौन देखेगा, यह तुम चुनो। ऐप चुपके से किसी को कुछ नहीं बताता।",
  },
  "onboarding.leaveNow": {
    en: "“{button}” at the top closes the app fast. It does not delete your browser history.",
    de: "„{button}“ oben schließt die App sofort. Dein Browser-Verlauf wird aber nicht gelöscht.",
    hi: "ऊपर वाला “{button}” बटन ऐप तुरंत बंद करता है। पर ब्राउज़र की हिस्ट्री नहीं मिटती।",
  },
  // "1 of 3" next to the dots, so a screen reader hears where it is.
  "onboarding.step": { en: "{n} of {total}", de: "{n} von {total}", hi: "{total} में से {n}" },
  "onboarding.next": { en: "Next", de: "Weiter", hi: "आगे" },
  "onboarding.skip": { en: "Skip", de: "Überspringen", hi: "छोड़ो" },
  "onboarding.start": { en: "Start", de: "Los geht's", hi: "शुरू करो" },
  "onboarding.again": { en: "What this app does", de: "Was diese App macht", hi: "यह ऐप क्या करता है" },
  // The 🌐 button on the check-in, and the heading of the screen it opens.
  // Hindi in the तुम form, like the rest.
  "lang.change": { en: "Change language", de: "Sprache ändern", hi: "भाषा बदलो" },

  // Picture questions (screens/PictureQuestions.tsx). Open questions, never
  // yes/no, never leading, never "why" (see that file's header).
  "q.what.title": { en: "What happened?", de: "Was ist passiert?", hi: "क्या हुआ?" },
  "q.what.hint": { en: "Tap all that fit.", de: "Tipp alles an, was passt.", hi: "जो-जो सही लगे, सब चुनो।" },
  "q.where.title": { en: "Where did it happen?", de: "Wo ist es passiert?", hi: "यह कहाँ हुआ?" },
  "q.who.title": { en: "Who did it?", de: "Wer war das?", hi: "यह किसने किया?" },
  "q.who.howMany": { en: "How many?", de: "Wie viele?", hi: "कितने?" },
  "q.who.kind": { en: "Who were they?", de: "Wer war es?", hi: "वे कौन थे?" },
  "q.often.title": { en: "How often does it happen?", de: "Wie oft passiert das?", hi: "यह कितनी बार होता है?" },
  "q.feel.title": { en: "How do you feel about it?", de: "Wie fühlst du dich damit?", hi: "इसके बारे में कैसा लगता है?" },
  "q.pickOne": { en: "Pick one.", de: "Such eins aus.", hi: "एक चुनो।" },
  "q.skip": { en: "Skip", de: "Überspringen", hi: "छोड़ो" },
  // On every question, always the last two tiles, in this order.
  "q.other": { en: "Something else", de: "Etwas anderes", hi: "कुछ और" },
  "q.noSay": { en: "I don't want to say", de: "Möchte ich nicht sagen", hi: "नहीं बताना" },
  "q.review.hint": { en: "This is what the card will say.", de: "Das steht dann auf der Karte.", hi: "कार्ड पर यही लिखा होगा।" },
  "q.review.nothing": {
    en: "You did not pick anything. That is okay.",
    de: "Du hast nichts ausgewählt. Das ist okay.",
    hi: "तुमने कुछ नहीं चुना। कोई बात नहीं।",
  },
  // Neutral thanks only: never praise tied to what was picked.
  "q.thanks": { en: "Thank you.", de: "Danke.", hi: "धन्यवाद।" },
  "q.more.title": {
    en: "Want to say more in your own words?",
    de: "Willst du mehr in deinen eigenen Worten sagen?",
    hi: "क्या अपने शब्दों में कुछ और कहना है?",
  },
  "q.more.yes": { en: "Yes, I'll write", de: "Ja, ich schreibe", hi: "हाँ, लिखना है" },
  "q.more.no": { en: "No thanks", de: "Nein, danke", hi: "नहीं, धन्यवाद" },

  // Picture incident builder (lib/pictures.ts): the tiles, in their fixed order.
  "pic.what.pushed": { en: "Pushed me", de: "Geschubst", hi: "धक्का दिया" },
  "pic.what.hit": { en: "Hit me", de: "Geschlagen", hi: "मारा" },
  "pic.what.names": { en: "Called me names", de: "Beschimpft", hi: "बुरे नाम बुलाए" },
  "pic.what.taken": { en: "Took my things", de: "Sachen weggenommen", hi: "मेरी चीज़ें लीं" },
  "pic.what.left_out": { en: "Left me out", de: "Ausgeschlossen", hi: "शामिल नहीं किया" },
  "pic.what.online": { en: "Online", de: "Online", hi: "ऑनलाइन" },
  "pic.what.threatened": { en: "Threatened me", de: "Bedroht", hi: "धमकाया" },
  "pic.where.classroom": { en: "Classroom", de: "Klassenzimmer", hi: "क्लास" },
  "pic.where.schoolyard": { en: "Schoolyard", de: "Schulhof", hi: "स्कूल का मैदान" },
  "pic.where.toilets": { en: "Toilets", de: "Toiletten", hi: "टॉयलेट" },
  "pic.where.way_to_school": { en: "Way to school", de: "Schulweg", hi: "स्कूल का रास्ता" },
  "pic.where.online": { en: "Online", de: "Online", hi: "ऑनलाइन" },
  "pic.where.elsewhere": { en: "Somewhere else", de: "Woanders", hi: "कहीं और" },
  "pic.howMany.one": { en: "One person", de: "Eine Person", hi: "एक व्यक्ति" },
  "pic.howMany.several": { en: "A group", de: "Eine Gruppe", hi: "एक ग्रुप" },
  "pic.kind.classmate": { en: "In my class", de: "Aus meiner Klasse", hi: "मेरी क्लास से" },
  "pic.kind.older": { en: "Older than me", de: "Älter als ich", hi: "मुझसे उम्र में बड़े" },
  "pic.kind.adult": { en: "An adult", de: "Eine erwachsene Person", hi: "एक वयस्क" },
  "pic.kind.other": { en: "Someone else", de: "Jemand anderes", hi: "कोई और" },
  "pic.often.once": { en: "Once", de: "Einmal", hi: "एक बार" },
  "pic.often.few": { en: "A few times", de: "Ein paar Mal", hi: "कुछ बार" },
  "pic.often.daily": { en: "Almost every day", de: "Fast jeden Tag", hi: "लगभग हर दिन" },

  // Where, who and how often go on the card as labelled lines, not
  // sentences: fixed words, so the grammar cannot go wrong for any answer.
  "pic.line.where": { en: "Where: {x}", de: "Wo: {x}", hi: "कहाँ: {x}" },
  "pic.line.who": { en: "Who: {x}", de: "Wer: {x}", hi: "कौन: {x}" },
  "pic.line.often": { en: "How often: {x}", de: "Wie oft: {x}", hi: "कितनी बार: {x}" },

  // Follow-up questions (lib/questions.ts): asked only after the answer they
  // follow, and they repeat the child's own pick as a cue ("You said...").
  // Never yes/no, never why. The German needs a native check.
  "q.own.title": {
    en: "You said something else happened. What happened?",
    de: "Du hast gesagt, etwas anderes ist passiert. Was ist passiert?",
    hi: "तुमने कहा कि कुछ और हुआ। क्या हुआ?",
  },
  "q.own.hint": {
    en: "You can write it in your own words.",
    de: "Du kannst es in deinen eigenen Worten schreiben.",
    hi: "अपने शब्दों में लिखो।",
  },
  "q.whereOnline.title": {
    en: "You said it happened online. Where online?",
    de: "Du hast gesagt, es war online. Wo online?",
    hi: "तुमने कहा कि यह ऑनलाइन हुआ। ऑनलाइन कहाँ?",
  },
  "q.taken.title": {
    en: "You said things were taken. What was taken?",
    de: "Du hast gesagt, dir wurden Sachen weggenommen. Was wurde weggenommen?",
    hi: "तुमने कहा कि चीज़ें ली गईं। क्या लिया गया?",
  },
  "q.body.title": {
    en: "You said you were pushed or hit. How does your body feel now?",
    de: "Du hast gesagt, du wurdest geschubst oder geschlagen. Wie fühlt sich dein Körper jetzt an?",
    hi: "तुमने कहा कि धक्का दिया गया या मारा गया। अभी शरीर कैसा लग रहा है?",
  },
  "q.when.title": {
    en: "You said you were threatened. When did they say it would happen?",
    de: "Du hast gesagt, du wurdest bedroht. Wann soll es passieren?",
    hi: "तुमने कहा कि धमकाया गया। यह कब होने को कहा गया?",
  },
  "q.adult.title": {
    en: "You said it was an adult. Where is this adult from?",
    de: "Du hast gesagt, es war eine erwachsene Person. Woher kennst du die Person?",
    hi: "तुमने कहा कि यह कोई वयस्क है। यह वयस्क कहाँ से है?",
  },
  "pic.online.chat": { en: "Group chat", de: "Gruppenchat", hi: "ग्रुप चैट" },
  "pic.online.game": { en: "A game", de: "Ein Spiel", hi: "गेम" },
  "pic.online.social": { en: "Social media", de: "Soziale Medien", hi: "सोशल मीडिया" },
  "pic.online.messages": { en: "Messages", de: "Nachrichten", hi: "मैसेज" },
  "pic.taken.lunch": { en: "My lunch", de: "Mein Essen", hi: "मेरा खाना" },
  "pic.taken.money": { en: "Money", de: "Geld", hi: "पैसे" },
  "pic.taken.phone": { en: "My phone", de: "Mein Handy", hi: "मेरा फ़ोन" },
  "pic.taken.school_things": { en: "School things", de: "Schulsachen", hi: "स्कूल का सामान" },
  "pic.body.fine": { en: "Fine", de: "Gut", hi: "ठीक है" },
  "pic.body.hurts_bit": { en: "Hurts a bit", de: "Tut ein bisschen weh", hi: "थोड़ा दर्द है" },
  "pic.body.hurts_lot": { en: "Hurts a lot", de: "Tut sehr weh", hi: "बहुत दर्द है" },
  "pic.when.today": { en: "Today", de: "Heute", hi: "आज" },
  // Not कल: in Hindi it means both yesterday and tomorrow (see PR #70).
  "pic.when.tomorrow": { en: "Tomorrow", de: "Morgen", hi: "अगले दिन" },
  "pic.when.later": { en: "Later", de: "Später", hi: "बाद में" },
  "pic.when.dont_know": { en: "I don't know", de: "Weiß ich nicht", hi: "पता नहीं" },
  "pic.adult.school": { en: "From school", de: "Aus der Schule", hi: "स्कूल से" },
  "pic.adult.home": { en: "From home", de: "Von zu Hause", hi: "घर से" },
  "pic.adult.elsewhere": { en: "Somewhere else", de: "Woanders", hi: "कहीं और" },
  "pic.line.whereOnline": { en: "Where online: {x}", de: "Wo online: {x}", hi: "ऑनलाइन कहाँ: {x}" },
  "pic.line.taken": { en: "What was taken: {x}", de: "Was weggenommen wurde: {x}", hi: "क्या लिया गया: {x}" },
  "pic.line.body": { en: "Body now: {x}", de: "Körper jetzt: {x}", hi: "शरीर अभी: {x}" },
  "pic.line.when": { en: "When it is meant to happen: {x}", de: "Wann es passieren soll: {x}", hi: "यह कब होने वाला है: {x}" },
  "pic.line.adult": { en: "The adult is: {x}", de: "Die erwachsene Person ist: {x}", hi: "वह वयस्क: {x}" },

  // The sentence for each tap when the child said how many. {S} is pic.doer.*;
  // German {hat} becomes "hat" or "haben".
  "pic.doer.one": { en: "Someone", de: "Jemand", hi: "किसी" },
  "pic.doer.several": { en: "Several people", de: "Mehrere", hi: "कुछ लोगों" },
  "pic.say.pushed": { en: "{S} pushed me.", de: "{S} {hat} mich geschubst.", hi: "{S} ने मुझे धक्का दिया।" },
  "pic.say.hit": { en: "{S} hit me.", de: "{S} {hat} mich geschlagen.", hi: "{S} ने मुझे मारा।" },
  "pic.say.names": { en: "{S} called me names.", de: "{S} {hat} mich beschimpft.", hi: "{S} ने मुझे बुरे नामों से बुलाया।" },
  "pic.say.taken": { en: "{S} took my things.", de: "{S} {hat} mir Sachen weggenommen.", hi: "{S} ने मेरी चीज़ें ले लीं।" },
  "pic.say.online": {
    en: "{S} wrote mean things about me online.",
    de: "{S} {hat} online gemeine Dinge über mich geschrieben.",
    hi: "{S} ने ऑनलाइन मेरे बारे में बुरी बातें लिखीं।",
  },
  "pic.say.left_out": { en: "{S} left me out.", de: "{S} {hat} mich ausgeschlossen.", hi: "{S} ने मुझे शामिल नहीं किया।" },
  "pic.say.threatened": { en: "{S} threatened me.", de: "{S} {hat} mich bedroht.", hi: "{S} ने मुझे धमकाया।" },
  // "Something else": no doer, whatever the count, because nothing is known.
  "pic.say.other": { en: "Something else happened.", de: "Etwas anderes ist passiert.", hi: "कुछ और हुआ।" },

  // The same sentences when the child did not say how many: passive, so no
  // doer and no count is added that the child never gave.
  "pic.passive.pushed": { en: "I was pushed.", de: "Ich wurde geschubst.", hi: "मुझे धक्का दिया गया।" },
  "pic.passive.hit": { en: "I was hit.", de: "Ich wurde geschlagen.", hi: "मुझे मारा गया।" },
  "pic.passive.names": { en: "I was called names.", de: "Ich wurde beschimpft.", hi: "मुझे बुरे नामों से बुलाया गया।" },
  "pic.passive.taken": { en: "My things were taken.", de: "Mir wurden Sachen weggenommen.", hi: "मेरी चीज़ें ले ली गईं।" },
  "pic.passive.online": {
    en: "Mean things were written about me online.",
    de: "Über mich wurden online gemeine Dinge geschrieben.",
    hi: "ऑनलाइन मेरे बारे में बुरी बातें लिखी गईं।",
  },
  "pic.passive.left_out": { en: "I was left out.", de: "Ich wurde ausgeschlossen.", hi: "मुझे शामिल नहीं किया गया।" },
  "pic.passive.threatened": { en: "I was threatened.", de: "Ich wurde bedroht.", hi: "मुझे धमकाया गया।" },
  "pic.passive.other": { en: "Something else happened.", de: "Etwas anderes ist passiert.", hi: "कुछ और हुआ।" },

  // On the card: where each line came from, so a tapped tile never reads as
  // a quote. Shown in the card's current language (the adult may read German).
  "card.fromPictures": { en: "Chosen from pictures", de: "Aus Bildern gewählt", hi: "तस्वीरों से चुना" },
  "card.ownWords": { en: "In my own words", de: "In meinen eigenen Worten", hi: "मेरे अपने शब्दों में" },
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
