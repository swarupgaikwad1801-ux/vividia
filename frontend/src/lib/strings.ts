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
 * - German uses "du". The code `hi` is shown as Hinglish in Roman letters
 *   (Neel, 26 Oct: children can't read formal Hindi in Devanagari). It uses
 *   "tum", everyday mixed words ("school", "phone", "save karo"), and no verb
 *   that marks the child's gender (no karoge/karogi, sakte/sakti ho, gaya/gayi
 *   about the child): commands (likho), "Tumne ..." or impersonal forms.
 *   The child may still type Devanagari or Roman; only the screen changed.
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
    hi: "NVIDIA Nemotron se bana",
  },

  "demo.button": { en: "Try Amara's story", de: "Amaras Geschichte ausprobieren", hi: "Amara ki kahani dekho" },
  "demo.notice": {
    en: "Amara is made up. She is not a real child.",
    de: "Amara ist ausgedacht. Sie ist kein echtes Kind.",
    hi: "Amara ek banayi hui kahani hai. Woh koi asli bachchi nahi hai.",
  },
  // The demo button (moved from lib-demo/pendingStrings.ts, same key names).
  // {name} is the persona name from the story, filled with fill(), never typed in.
  "demo.loading": {
    en: "Opening the story…",
    de: "Die Geschichte wird geöffnet…",
    hi: "Kahani khul rahi hai…",
  },
  "demo.loaded": {
    en: "{name}'s story is ready. Her words are already written. Press “Check my words”.",
    de: "{name}s Geschichte ist da. Ihre Worte sind schon geschrieben. Drück auf „Meine Worte prüfen“.",
    hi: "{name} ki kahani ready hai. Uski baat pehle se likhi hai. Ab “Meri baat check karo” dabao.",
  },
  "demo.clear": { en: "Remove the example", de: "Beispiel löschen", hi: "Example hatao" },
  "demo.cleared": {
    en: "The example is gone. The app is empty again.",
    de: "Das Beispiel ist weg. Die App ist wieder leer.",
    hi: "Example hat gaya. App phir se khaali hai.",
  },
  // The refusal: the person has notes of their own, so the example was not
  // loaded at all. Says what happened, and does not offer to load it anyway:
  // the child's own words are what is being protected.
  "demo.notLoadedOwnNotes": {
    en: "You have your own notes here, so the example did not open. Your notes are just as they were.",
    de: "Hier sind schon deine eigenen Notizen. Darum wurde das Beispiel nicht geöffnet. Deine Notizen sind wie vorher.",
    hi: "Yahan tumhare apne notes hain, isliye example nahi khula. Tumhare notes waise hi hain.",
  },

  "help.button": { en: "Need help now?", de: "Brauchst du jetzt Hilfe?", hi: "Abhi madad chahiye?" },
  "help.title": { en: "People who can help", de: "Menschen, die helfen können", hi: "Yeh log madad kar sakte hain" },
  // The red pill in the top bar: short, so it fits beside Leave now at 360px.
  "help.short": { en: "Need help", de: "Hilfe", hi: "Madad chahiye" },
  // The danger pop-up (components/DangerDialog.tsx). Calm and short; the
  // numbers come from /api/emergency (content/helplines.json), never typed here.
  "danger.title": { en: "Are you in danger right now?", de: "Bist du gerade in Gefahr?", hi: "Kya tum abhi khatre mein ho?" },
  "danger.hint": {
    en: "You can call one of these now. Tap a number to call.",
    de: "Du kannst jetzt eine dieser Nummern anrufen. Tipp darauf.",
    hi: "Tum abhi inme se kisi ko call kar sakte ho. Number dabao.",
  },
  // Under 110 and 112, by position (helplines.json's names are German only).
  "danger.police": { en: "Police", de: "Polizei", hi: "Police" },
  "danger.ambulance": { en: "Ambulance and fire brigade", de: "Rettungsdienst und Feuerwehr", hi: "Ambulance aur fire brigade" },
  "danger.orWrite": { en: "Or write to someone", de: "Oder schreib jemandem", hi: "Ya kisi ko likho" },
  "danger.continue": { en: "Continue", de: "Weiter", hi: "Aage chalo" },
  // Shown in the pop-up when /api/emergency cannot be reached.
  "help.dangerLineNoNumber": {
    en: "In danger right now? Tap Need help at the top.",
    de: "Gerade in Gefahr? Tipp oben auf Hilfe.",
    hi: "Abhi khatra hai? Upar “Need help” dabao.",
  },
  "help.source": { en: "Checked on", de: "Geprüft am", hi: "Check kiya" },
  // From #85's Help screen, kept at the merge. hi is draft Hinglish.
  "help.dangerTitle": {
    en: "If you are in danger right now",
    de: "Wenn du gerade in Gefahr bist",
    hi: "Agar tum abhi khatre mein ho",
  },
  "help.talkTitle": {
    en: "Talk to someone",
    de: "Mit jemandem sprechen",
    hi: "Kisi se baat karo",
  },
  "help.sourceLink": { en: "source", de: "Quelle", hi: "source" },
  "help.live": {
    en: "Your area's school counselling was looked up today on an official site.",
    de: "Die Schulberatung für deine Gegend wurde heute auf einer offiziellen Seite gesucht.",
    hi: "Tumhare area ki school counselling aaj ek official site par dekhi gayi.",
  },
  "help.fallback": {
    en: "These come from our own checked list.",
    de: "Diese stammen aus unserer eigenen geprüften Liste.",
    hi: "Yeh hamari apni check ki hui list se hain.",
  },
  "help.loading": { en: "Loading…", de: "Wird geladen…", hi: "Load ho raha hai…" },
  "help.retry": { en: "Try again", de: "Nochmal versuchen", hi: "Phir try karo" },
  "help.back": { en: "Back", de: "Zurück", hi: "Wapas" },
  "help.notCounselling": {
    en: "This app is not a counselling service. The people above are.",
    de: "Diese App ist keine Beratungsstelle. Die Menschen oben sind es.",
    hi: "Yeh app counselling service nahi hai. Upar wale log hain.",
  },

  "quickExit.button": { en: "Leave now", de: "Schnell raus", hi: "Abhi niklo" },
  "quickExit.note": {
    en: "This leaves the app at once. It does not delete your browser history.",
    de: "Damit bist du sofort raus aus der App. Dein Browser-Verlauf wird aber nicht gelöscht.",
    hi: "Isse app turant band hota hai. Par browser history delete nahi hoti.",
  },

  "checkin.title": { en: "How are you today?", de: "Wie geht es dir heute?", hi: "Aaj kaisa lag raha hai?" },
  "checkin.skip": { en: "Skip", de: "Überspringen", hi: "Chhodo" },

  "write.title": { en: "What happened?", de: "Was ist passiert?", hi: "Kya hua?" },
  "write.hint": {
    en: "Write it your way, in your own language.",
    de: "Schreib es so, wie du willst. In deiner Sprache.",
    hi: "Apne tareeke se likho, apni language mein.",
  },
  "write.placeholder": { en: "Write here…", de: "Schreib hier…", hi: "Yahan likho…" },
  "write.send": { en: "Check my words", de: "Meine Worte prüfen", hi: "Meri baat check karo" },
  "write.checking": { en: "Checking your words…", de: "Wir prüfen deine Worte…", hi: "Tumhari baat check ho rahi hai…" },
  "write.german": { en: "In German", de: "Auf Deutsch", hi: "German mein" },

  "clarify.title": { en: "What did you mean?", de: "Was hast du gemeint?", hi: "Tumhara matlab kya tha?" },
  "clarify.hint": {
    en: "Only you know. Pick the one that fits.",
    de: "Nur du weißt es. Such aus, was passt.",
    hi: "Yeh sirf tumhe pata hai. Jo sahi lage, woh chuno.",
  },

  "approve.title": { en: "Is this right?", de: "Stimmt das so?", hi: "Kya yeh sahi hai?" },
  "approve.yes": { en: "Yes, save it", de: "Ja, speichern", hi: "Haan, save karo" },
  "approve.change": { en: "Change it", de: "Ändern", hi: "Badlo" },

  "timeline.title": { en: "What happened so far", de: "Was bisher passiert ist", hi: "Ab tak kya hua" },
  // Also shown on the handoff card when nothing is approved yet. Where things
  // are stored is said once, in timeline.storageNote.
  "timeline.empty": {
    en: "Nothing saved yet.",
    de: "Noch nichts gespeichert.",
    hi: "Abhi kuch save nahi hai.",
  },
  "timeline.delete": { en: "Delete", de: "Löschen", hi: "Delete karo" },
  "timeline.deleteAll": { en: "Delete everything", de: "Alles löschen", hi: "Sab delete karo" },
  "timeline.deleteAllConfirm": {
    en: "Delete everything you saved? You can't get it back.",
    de: "Alles löschen, was du gespeichert hast? Du kannst es dann nicht zurückholen.",
    hi: "Jo save kiya hai, sab delete karna hai? Phir woh wapas nahi aayega.",
  },
  "timeline.notPersistent": {
    en: "This browser is not saving anything. When you close it, your words will be gone.",
    de: "Dieser Browser speichert nichts. Wenn du ihn zumachst, sind deine Worte weg.",
    hi: "Yeh browser kuch save nahi kar raha. Band karte hi tumhari baat chali jaayegi.",
  },

  "where.title": { en: "Where does this happen?", de: "Wo passiert das?", hi: "Yeh kahan hota hai?" },
  "where.school": { en: "At school", de: "In der Schule", hi: "School mein" },
  "where.home": { en: "At home", de: "Zu Hause", hi: "Ghar par" },
  "where.online": { en: "Online", de: "Online", hi: "Online" },
  "where.elsewhere": { en: "Somewhere else", de: "Woanders", hi: "Kahin aur" },

  "handoff.title": {
    en: "Who do you want to show this to?",
    de: "Wem willst du das zeigen?",
    hi: "Yeh kisko dikhana hai?",
  },
  "handoff.homeNote": {
    en: "Because it happens at home, we only show people at school and people you can call.",
    de: "Weil es zu Hause passiert, zeigen wir dir nur Leute aus der Schule und Leute, die du anrufen kannst.",
    hi: "Yeh ghar par hota hai, isliye hum sirf school ke log aur phone par madad karne wale log dikhate hain.",
  },
  // The German of these four is also what the adult reads on the card, so it
  // keeps the role names a German school uses (Vertrauenslehrkraft is a role,
  // not just "a teacher I like").
  "handoff.classTeacher": { en: "My class teacher", de: "Meine Klassenlehrkraft", hi: "Mere class teacher" },
  "handoff.trustedTeacher": { en: "A teacher I trust", de: "Eine Vertrauenslehrkraft", hi: "Koi teacher jin par mujhe bharosa hai" },
  "handoff.socialWorker": { en: "The school social worker", de: "Jemand von der Schulsozialarbeit", hi: "School ke social worker" },
  "handoff.family": { en: "Someone in my family", de: "Jemand aus meiner Familie", hi: "Mere ghar mein koi" },

  // --- writing screen ("Find the words") ---
  // Moved from the temporary components/WriteStrings.ts on feat/write-screen,
  // same key names. {n} is filled with fill().
  "write.yourWords": { en: "Your words", de: "Deine Worte", hi: "Tumhari baat" },
  // Shown while the words are being checked: the moment they leave the phone,
  // and the one place that says so now that onboarding is three cards (#72).
  // "Checked", not "translated": a child writing German is not translated.
  "write.whatWeDo": {
    en: "Your words go to a computer service on the internet to be checked. It keeps nothing.",
    de: "Deine Worte gehen zum Prüfen an einen Computerdienst im Internet. Er behält nichts.",
    hi: "Tumhari baat check hone ke liye internet par ek computer service ke paas jaati hai. Woh kuch nahi rakhti.",
  },
  "write.stillWorking": {
    en: "Still working. Checking carefully takes a little time.",
    de: "Läuft noch. Gut prüfen dauert ein bisschen.",
    hi: "Abhi chal raha hai. Dhyan se check karne mein thoda time lagta hai.",
  },
  "write.stop": { en: "Stop", de: "Stopp", hi: "Roko" },
  "write.retry": { en: "Try again", de: "Nochmal versuchen", hi: "Phir se karo" },
  // Shown as a label before a percentage: "How much the checks agreed  80%".
  "write.agreement": {
    en: "How much the checks agreed",
    de: "So oft waren die Prüfungen gleich",
    hi: "Checks kitne match hue",
  },
  // CLAUDE.md: consensus measures agreement, not correctness. Keep that meaning.
  "write.agreementNote": {
    en: "This shows how often our checks gave the same answer. It does not show if the German is right.",
    de: "Das zeigt, wie oft unsere Prüfungen dasselbe gesagt haben. Es zeigt nicht, ob das Deutsch richtig ist.",
    hi: "Yeh dikhata hai ki hamare checks ne kitni baar ek jaisa jawab diya. Yeh nahi batata ki German sahi hai ya nahi.",
  },
  "write.yourChoiceUsed": {
    en: "Your answer chose this German. The app did not choose for you.",
    de: "Deine Antwort hat dieses Deutsch ausgesucht. Die App hat nicht für dich gewählt.",
    hi: "Yeh German tumhare jawab se chuna gaya. App ne tumhari jagah nahi chuna.",
  },
  "write.checksOne": { en: "1 check", de: "1 Prüfung", hi: "1 check" },
  "write.checks": { en: "{n} checks", de: "{n} Prüfungen", hi: "{n} checks" },
  "write.secondsLong": { en: "{n} seconds so far", de: "schon {n} Sekunden", hi: "Ab tak {n} second" },
  "clarify.important": { en: "Important", de: "Wichtig", hi: "Zaroori" },
  "clarify.send": { en: "That's what I meant", de: "Das habe ich gemeint", hi: "Mera yahi matlab tha" },
  "clarify.rewrite": { en: "Say it another way", de: "Anders sagen", hi: "Doosre tareeke se likho" },
  "clarify.rewriteWhy": {
    en: "None of the answers fit. Only you know what you mean, so change your words and check again.",
    de: "Keine Antwort passt. Nur du weißt, was du meinst. Ändere deine Worte und prüf sie nochmal.",
    hi: "Koi jawab sahi nahi baitha. Tumhara matlab sirf tumhe pata hai. Apni baat badlo aur phir se check karo.",
  },

  "errors.network": {
    en: "No internet right now. What you saved is still on this phone.",
    de: "Gerade gibt es kein Internet. Was du gespeichert hast, ist noch auf dem Handy.",
    hi: "Abhi internet nahi hai. Jo save kiya tha, woh abhi bhi isi phone par hai.",
  },
  "errors.slow": {
    en: "This is taking longer than usual. Try again in a moment.",
    de: "Das dauert gerade länger. Versuch es gleich nochmal.",
    hi: "Isme zyada time lag raha hai. Thodi der mein phir se karo.",
  },
  "errors.generic": {
    en: "Something went wrong on our side. Your words are not lost.",
    de: "Bei uns ist etwas schiefgegangen. Deine Worte sind noch da.",
    hi: "Hamari taraf kuch gadbad ho gayi. Tumhari baat kho nahi gayi.",
  },

  // The emoji check-in (lib/moods.ts). The codes after "mood." are stored in
  // the timeline, so they must not change: "mood.alone" now reads "Lonely"
  // (Neel, 26 Oct) but keeps its code. Hinglish is "Akelapan"
  // ("loneliness"), because akela/akeli would guess the child's gender.
  "mood.good": { en: "Good", de: "Gut", hi: "Achha" },
  "mood.ok": { en: "OK", de: "Geht so", hi: "Theek hai" },
  "mood.sad": { en: "Sad", de: "Traurig", hi: "Dukhi" },
  "mood.scared": { en: "Scared", de: "Angst", hi: "Darr lag raha hai" },
  "mood.angry": { en: "Angry", de: "Wütend", hi: "Gussa" },
  "mood.alone": { en: "Lonely", de: "Einsam", hi: "Akelapan" },

  // Languages a helpline speaks (lib/help.ts). Only the codes that appear in
  // content/helplines.json, plus the two we ship as source languages.
  "lang.de": { en: "German", de: "Deutsch", hi: "German" },
  "lang.en": { en: "English", de: "Englisch", hi: "English" },
  "lang.hi": { en: "Hindi", de: "Hindi", hi: "Hindi" },
  "lang.uk": { en: "Ukrainian", de: "Ukrainisch", hi: "Ukrainian" },

  // The language switch on the card the child shows an adult
  // (components/CardLanguageSwitch.tsx). "Auf Deutsch" stays German in every
  // language: it is the adult who reads and taps it.
  "card.german": { en: "Auf Deutsch", de: "Auf Deutsch", hi: "Auf Deutsch" },
  "card.languageSwitch": { en: "Choose the language", de: "Sprache wählen", hi: "Language chuno" },

  // The game map (components/GameMap.tsx). Places, not levels: nothing is
  // won or locked. Read out once per screen for a screen reader.
  "map.feel": { en: "How you feel", de: "Wie es dir geht", hi: "Kaisa lag raha hai" },
  "map.what": { en: "What happened", de: "Was passiert ist", hi: "Kya hua" },
  "map.where": { en: "Where", de: "Wo", hi: "Kahan" },
  "map.whoDid": { en: "Who", de: "Wer", hi: "Kaun" },
  "map.often": { en: "How often", de: "Wie oft", hi: "Kitni baar" },
  "map.feelAbout": { en: "How it feels", de: "Wie es sich anfühlt", hi: "Kaisa lagta hai" },
  "map.body": { en: "How your body feels", de: "Wie sich dein Körper anfühlt", hi: "Body kaisi hai" },
  "map.taken": { en: "What was taken", de: "Was weggenommen wurde", hi: "Kya liya" },
  "map.whereOnline": { en: "Where online", de: "Wo online", hi: "Online kahan" },
  "map.when": { en: "When", de: "Wann", hi: "Kab" },
  "map.own": { en: "Your own words", de: "Deine eigenen Worte", hi: "Tumhari apni baat" },
  "map.adult": { en: "The adult", de: "Die erwachsene Person", hi: "Woh adult" },
  "map.card": { en: "Your card", de: "Deine Karte", hi: "Tumhara card" },
  "map.who": { en: "Who sees it", de: "Wer es sieht", hi: "Kaun dekhega" },
  "map.done": { en: "Done", de: "Fertig", hi: "Ho gaya" },
  "map.youAreHere": {
    en: "You are here: {place}, place {n} of {total}.",
    de: "Du bist hier: {place}, Ort {n} von {total}.",
    hi: "Tum yahan ho: {place}, {total} mein se {n}.",
  },

  // The traveller on the map: a picture the child picks, never a character
  // that talks. Stored only on this phone (lib/avatar.ts).
  "avatar.pick": { en: "Pick who walks the map", de: "Wer läuft über die Karte?", hi: "Map par kaun chalega, chuno" },
  "avatar.option": { en: "Traveller {n}", de: "Figur {n}", hi: "Traveller {n}" },
  // The traveller on the map is a button: tap it to pick another head.
  "avatar.change": { en: "Change your traveller", de: "Figur ändern", hi: "Apna traveller badlo" },

  // The language note next to each helpline. {list} is the languages joined
  // with help.and; "only" is added when the child's language is not among them.
  "help.and": { en: " and ", de: " und ", hi: " aur " },
  "help.speaks": { en: "Speaks {list}", de: "Spricht {list}", hi: "{list} bolte hain" },
  "help.speaksOnly": { en: "Speaks {list} only", de: "Spricht nur {list}", hi: "Sirf {list} bolte hain" },
  "help.checkedToday": { en: "checked today", de: "heute geprüft", hi: "aaj check kiya" },
  "help.checkedYesterday": { en: "checked yesterday", de: "gestern geprüft", hi: "kal check kiya" },
  "help.checkedDays": { en: "checked {n} days ago", de: "vor {n} Tagen geprüft", hi: "{n} din pehle check kiya" },
  "app.englishOnly": {
    en: "Some words in this app are only in English for now.",
    de: "Manche Wörter in dieser App gibt es bis jetzt nur auf Englisch.",
    hi: "Is app mein kuch words abhi sirf English mein hain.",
  },

  // Timeline and report (moved from components/TimelinePendingStrings.ts).
  "timeline.storageNote": {
    en: "This list is saved only in this browser. You can delete it any time.",
    de: "Diese Liste ist nur in diesem Browser gespeichert. Du kannst sie immer löschen.",
    hi: "Yeh list sirf isi browser mein save hai. Jab chaho, delete kar do.",
  },
  "timeline.deleteAllYes": { en: "Yes, delete everything", de: "Ja, alles löschen", hi: "Haan, sab delete karo" },
  "timeline.deleteAllNo": { en: "No, keep it", de: "Nein, behalten", hi: "Nahi, rehne do" },
  "timeline.deletedAll": {
    en: "Everything you saved is deleted.",
    de: "Alles, was du gespeichert hast, ist gelöscht.",
    hi: "Jo save kiya tha, sab delete ho gaya.",
  },
  "timeline.where": { en: "Where", de: "Wo", hi: "Kahan" },
  "timeline.who": { en: "Who", de: "Wer", hi: "Kaun" },
  // Child text says "card", not "report": it is the card the child shows the
  // adult. The key names keep "report" because the code and the API use it.
  "timeline.buildReport": { en: "Make a card from this", de: "Eine Karte daraus machen", hi: "Isse card banao" },
  "report.title": {
    en: "Your card, to show someone",
    de: "Deine Karte zum Zeigen",
    hi: "Tumhara card, kisi ko dikhane ke liye",
  },
  "report.build": { en: "Make the card", de: "Karte machen", hi: "Card banao" },
  "report.building": { en: "Making your card…", de: "Deine Karte wird gemacht…", hi: "Tumhara card ban raha hai…" },
  "report.needEntries": {
    en: "Save something first. The card is made from what you save.",
    de: "Speicher zuerst etwas. Die Karte wird aus deinen Einträgen gemacht.",
    hi: "Pehle kuch save karo. Card usi se banta hai jo save hai.",
  },
  "report.childLabel": { en: "In your language", de: "In deiner Sprache", hi: "Tumhari language mein" },
  "report.germanNote": {
    en: "This is the part an adult reads.",
    de: "Das ist der Teil für Erwachsene.",
    hi: "Yeh hissa bade logon ke liye hai.",
  },
  "report.readAll": {
    en: "Read it all. Nobody is shown anything until you say it is right.",
    de: "Lies alles. Niemand sieht etwas, bevor du sagst: Das stimmt.",
    hi: "Poora padho. Jab tak tum “Haan, sahi hai” na kaho, koi kuch nahi dekhega.",
  },
  "report.approved": {
    en: "You said this is right.",
    de: "Du hast gesagt: Das stimmt.",
    hi: "Tumne kaha ki yeh sahi hai.",
  },
  "report.offline": {
    en: "There is no internet, so the card can't be made yet. What you saved is still here.",
    de: "Gerade gibt es kein Internet. Darum kann die Karte noch nicht gemacht werden. Was du gespeichert hast, ist noch da.",
    hi: "Abhi internet nahi hai, isliye card abhi nahi ban sakta. Jo save kiya tha, woh yahin hai.",
  },
  "errors.retry": { en: "Try again", de: "Nochmal versuchen", hi: "Phir se karo" },

  // Handoff (moved from components/HandoffTempStrings.ts, which was English only).
  "handoff.showTo": { en: "Show this to", de: "Das zeigst du", hi: "Yeh dikhana hai" },
  "handoff.changeWhere": { en: "Change where it happens", de: "Ort ändern", hi: "Jagah badlo" },
  "handoff.preparing": { en: "Getting your words ready…", de: "Deine Worte werden fertig gemacht…", hi: "Tumhari baat ready ho rahi hai…" },
  "handoff.retry": { en: "Try again", de: "Nochmal versuchen", hi: "Phir se karo" },
  "handoff.yourWords": { en: "Your words", de: "Deine Worte", hi: "Tumhari baat" },
  // The handoff ending (issue #3): a full-screen card, then the follow-up.
  // Not used by a screen yet; Vernika builds it.
  // No first person, same rule as the follow-up: the app is not a friend.
  "handoff.showThem": { en: "Show this to them", de: "Jetzt zeigen", hi: "Yeh unhe dikhao" },
  "handoff.checkLater": {
    en: "In a few days, the app will ask how things are.",
    de: "In ein paar Tagen fragt die App, wie es dir geht.",
    hi: "Kuch din mein app poochega ki sab kaisa chal raha hai.",
  },
  "handoff.done": { en: "Done", de: "Fertig", hi: "Ho gaya" },
  // The closed label on the adult's guide. Once it is open the server's own
  // title replaces this, so this only has to say who the section is for.
  "handoff.forAdult": {
    en: "For the adult: the first 5 minutes",
    de: "Für die erwachsene Person: die ersten 5 Minuten",
    hi: "Bade logon ke liye: pehle 5 minute",
  },

  // Back and next on every screen (issue #3). Back stays inside the app, so
  // quick exit still has nothing to go back to.
  "nav.back": { en: "Back", de: "Zurück", hi: "Peeche" },
  "nav.next": { en: "Next", de: "Weiter", hi: "Aage" },

  // PIN (moved from components/pinText.ts, which was English only). {seconds},
  // {count} and {when} are filled with fill().
  "pin.set.title": { en: "Make a PIN", de: "PIN aussuchen", hi: "PIN banao" },
  "pin.set.titleChange": { en: "Change your PIN", de: "PIN ändern", hi: "Apna PIN badlo" },
  "pin.set.hint": {
    en: "A PIN is 4 to 6 numbers. You type it to open the app.",
    de: "Eine PIN sind 4 bis 6 Zahlen. Du tippst sie ein, um die App zu öffnen.",
    hi: "PIN 4 se 6 number ka hota hai. App kholne ke liye ise type karna hota hai.",
  },
  // Honest limit of the PIN: keep both halves.
  "pin.set.limit": {
    en: "It stops someone who picks up this phone from reading your words. Someone who knows a lot about phones could still get in.",
    de: "Sie hält jemanden ab, der das Handy nimmt und deine Worte lesen will. Wer sich sehr gut mit Handys auskennt, kommt vielleicht trotzdem rein.",
    hi: "Isse koi yeh phone uthakar tumhari baat nahi padh payega. Par jo phone ke baare mein bahut jaanta hai, woh shayad phir bhi khol le.",
  },
  "pin.set.enter": { en: "Choose your PIN", de: "Such dir eine PIN aus", hi: "Apna PIN chuno" },
  "pin.set.again": { en: "Type the same PIN again", de: "Tipp dieselbe PIN nochmal", hi: "Wahi PIN phir se type karo" },
  "pin.set.next": { en: "Next", de: "Weiter", hi: "Aage" },
  "pin.set.save": { en: "Save my PIN", de: "PIN speichern", hi: "PIN save karo" },
  "pin.set.startAgain": { en: "Start again", de: "Nochmal von vorn", hi: "Phir se shuru karo" },
  "pin.set.mismatch": {
    en: "Those were not the same. Type your PIN again.",
    de: "Die zwei waren nicht gleich. Tipp deine PIN nochmal.",
    hi: "Dono ek jaise nahi the. Apna PIN phir se type karo.",
  },
  "pin.set.tooShort": { en: "A PIN is 4 to 6 numbers.", de: "Eine PIN sind 4 bis 6 Zahlen.", hi: "PIN 4 se 6 number ka hota hai." },
  "pin.set.saved": {
    en: "Your PIN is saved. You need it to open the app.",
    de: "Deine PIN ist gespeichert. Du brauchst sie, um die App zu öffnen.",
    hi: "Tumhara PIN save ho gaya. App kholne ke liye iski zaroorat hogi.",
  },
  "pin.set.noStorage": {
    en: "This phone won't let the app save things, so you can't make a PIN here. Nothing was saved.",
    de: "Dieses Handy lässt die App nichts speichern. Darum geht hier keine PIN. Es wurde nichts gespeichert.",
    hi: "Yeh phone app ko kuch save nahi karne deta, isliye yahan PIN nahi ban sakta. Kuch bhi save nahi hua.",
  },
  "pin.set.skip": { en: "Not now", de: "Nicht jetzt", hi: "Abhi nahi" },
  "pin.set.done": { en: "Done", de: "Fertig", hi: "Ho gaya" },
  "pin.remove.button": { en: "Remove the PIN", de: "PIN löschen", hi: "PIN hatao" },
  "pin.remove.ask": {
    en: "Remove the PIN? The app will open without one. Nothing you saved is deleted.",
    de: "PIN löschen? Dann geht die App ohne PIN auf. Was du gespeichert hast, bleibt da.",
    hi: "PIN hatana hai? Phir app bina PIN ke khulega. Jo save hai, woh delete nahi hoga.",
  },
  "pin.remove.yes": { en: "Yes, remove it", de: "Ja, löschen", hi: "Haan, hatao" },
  "pin.remove.no": { en: "Keep the PIN", de: "PIN behalten", hi: "PIN rehne do" },
  "pin.remove.done": {
    en: "The PIN is gone. You can make a new one any time.",
    de: "Die PIN ist weg. Du kannst jederzeit eine neue machen.",
    hi: "PIN hat gaya. Jab chaho, naya bana lena.",
  },
  "pin.unlock.title": { en: "Type your PIN", de: "Tipp deine PIN ein", hi: "Apna PIN type karo" },
  "pin.unlock.hint": { en: "4 to 6 numbers.", de: "4 bis 6 Zahlen.", hi: "4 se 6 number." },
  "pin.unlock.button": { en: "Open", de: "Öffnen", hi: "Kholo" },
  "pin.unlock.checking": { en: "Checking…", de: "Wird geprüft…", hi: "Check ho raha hai…" },
  "pin.unlock.wrong": {
    en: "That is not the PIN. Try again.",
    de: "Das ist nicht die PIN. Versuch es nochmal.",
    hi: "Yeh sahi PIN nahi hai. Phir se karo.",
  },
  "pin.unlock.wait": {
    en: "Wait {seconds} seconds, then try again.",
    de: "Warte {seconds} Sekunden. Dann versuch es nochmal.",
    hi: "{seconds} second ruko, phir se karo.",
  },
  // Hinglish avoids bhool gaya/gayi: the child's gender is never assumed.
  "pin.unlock.forgot": { en: "I forgot my PIN", de: "Ich habe meine PIN vergessen", hi: "Mujhe apna PIN yaad nahi" },
  // Honest limit of the PIN: anyone holding the phone can do the same.
  "pin.unlock.forgotHelp": {
    en: "You can remove the PIN and get back in. Nothing you saved is deleted. But anyone holding this phone could do this too. A PIN like this can't stop that.",
    de: "Du kannst die PIN löschen und wieder reinkommen. Was du gespeichert hast, bleibt da. Aber jeder, der dieses Handy hat, kann das auch. So eine PIN kann das nicht verhindern.",
    hi: "PIN hatao, phir app khul jaayega. Jo save hai, woh delete nahi hoga. Par jiske haath mein yeh phone ho, woh bhi aisa kar sakta hai. Aisa PIN ise rok nahi sakta.",
  },
  "pin.removed.notice": {
    en: "The PIN was removed on {when}. If that was not you, someone else may have opened the app.",
    de: "Die PIN wurde am {when} gelöscht. Warst du das nicht? Dann hat vielleicht jemand anderes die App geöffnet.",
    hi: "PIN {when} ko hataya gaya. Agar yeh tumne nahi kiya, to shayad kisi aur ne app khola tha.",
  },
  "pin.keypad.empty": { en: "No numbers typed yet", de: "Noch keine Zahlen getippt", hi: "Abhi koi number type nahi hua" },
  "pin.keypad.entered": { en: "{count} numbers typed", de: "{count} Zahlen getippt", hi: "{count} number type hue" },
  "pin.keypad.delete": { en: "Delete the last number", de: "Letzte Zahl löschen", hi: "Aakhri number delete karo" },
  "pin.keypad.clear": { en: "Clear", de: "Leeren", hi: "Saaf karo" },

  // Follow-up check-in (moved from lib-followups-ui/copy.ts DRAFT_COPY, which
  // was English only). Tone: never praise "better", never sound let down by
  // "worse", no first person (the app is not a friend).
  "followup.title": { en: "How are things now?", de: "Wie geht es jetzt?", hi: "Ab kaisa chal raha hai?" },
  "followup.gap": {
    en: "It's been a few days since you last wrote something.",
    de: "Du hast seit ein paar Tagen nichts geschrieben.",
    hi: "Pichhli baar kuch likhe hue kuch din ho gaye.",
  },
  // The privacy promise on this screen is followup.notKept, said once.
  "followup.noPressure": {
    en: "You don't have to answer.",
    de: "Du musst nicht antworten.",
    hi: "Jawab dena zaroori nahi.",
  },
  "followup.answerBetter": { en: "A bit better", de: "Ein bisschen besser", hi: "Thoda better" },
  "followup.answerSame": { en: "About the same", de: "Ungefähr gleich", hi: "Pehle jaisa" },
  "followup.answerWorse": { en: "Worse", de: "Schlechter", hi: "Pehle se bura" },
  "followup.notNow": { en: "Not now", de: "Nicht jetzt", hi: "Abhi nahi" },
  "followup.stopAsking": { en: "Stop asking me this", de: "Frag mich das nicht mehr", hi: "Yeh sawaal ab mat poochna" },
  "followup.stopped": {
    en: "This question won't come back. You can still write something any time.",
    de: "Diese Frage kommt nicht wieder. Du kannst trotzdem immer etwas aufschreiben.",
    hi: "Yeh sawaal ab nahi aayega. Kuch likhna ho, to kabhi bhi likho.",
  },
  "followup.afterBetter": {
    en: "Okay. You can write something any time, even something small.",
    de: "Okay. Du kannst immer etwas aufschreiben, auch kleine Sachen.",
    hi: "Theek hai. Kabhi bhi kuch likho, chhoti baat bhi.",
  },
  "followup.afterStill": {
    en: "Okay. There are other people you could show your words to, if you want.",
    de: "Okay. Es gibt noch andere Leute, denen du deine Worte zeigen kannst, wenn du willst.",
    hi: "Theek hai. Chaho to aur logon ko bhi apni baat dikhao.",
  },
  "followup.notKept": {
    en: "This answer is not saved anywhere, and nobody is told.",
    de: "Diese Antwort wird nirgends gespeichert. Niemand erfährt davon.",
    hi: "Yeh jawab kahin save nahi hota. Kisi ko pata nahi chalta.",
  },
  "followup.openLadder": { en: "See who else there is", de: "Schauen, wer noch da ist", hi: "Aur kaun hai, dekho" },

  // Escalation ladder (moved from DRAFT_COPY). "Can act" is not "will act":
  // no rung promises it will help.
  "ladder.title": { en: "Who else there is", de: "Wer noch da ist", hi: "Aur kaun hai" },
  "ladder.intro": {
    en: "Other people you could show your words to. You pick. You show it yourself.",
    de: "Andere Leute, denen du deine Worte zeigen kannst. Du suchst aus. Du zeigst es selbst.",
    hi: "Aur log, jinko apni baat dikhayi ja sakti hai. Chunna tumhare haath mein hai, dikhana bhi.",
  },
  "ladder.noPromise": {
    en: "Nobody can promise it will stop. Each person is a different door, and you can try more than one.",
    de: "Niemand kann versprechen, dass es aufhört. Jede Person ist eine andere Tür. Du kannst mehr als eine ausprobieren.",
    hi: "Koi promise nahi kar sakta ki yeh ruk jaayega. Har insaan ek alag darwaza hai. Ek se zyada try karna theek hai.",
  },
  "ladder.carryTitle": { en: "Your words come with you", de: "Deine Worte kommen mit", hi: "Tumhari baat tumhare saath jaati hai" },
  "ladder.carryWhy": {
    en: "What you already checked and said yes to goes to the next person too. So you never have to explain it all again from the start.",
    de: "Was du schon geprüft und bestätigt hast, kommt mit zur nächsten Person. So musst du nicht wieder ganz von vorn erzählen.",
    hi: "Jo tumne pehle hi check karke sahi kaha hai, woh agle insaan tak bhi jaata hai. Phir se shuru se samjhana nahi padega.",
  },
  "ladder.carryNone": {
    en: "You haven't written anything yet, so there is nothing to show. You can write something first.",
    de: "Du hast noch nichts aufgeschrieben. Darum gibt es nichts zu zeigen. Du kannst zuerst etwas schreiben.",
    hi: "Abhi kuch likha nahi gaya, isliye dikhane ko kuch nahi hai. Chaho to pehle kuch likho.",
  },
  "ladder.stateStart": { en: "A place to start", de: "Hier anfangen", hi: "Shuru karne ke liye" },
  "ladder.stateNext": { en: "You could try this next", de: "Das kannst du als Nächstes probieren", hi: "Aage yeh try karo" },
  "ladder.stateShown": { en: "You showed this", de: "Das hast du gezeigt", hi: "Tumne yeh dikhaya" },
  "ladder.stateLater": { en: "Still here if you need it", de: "Noch da, wenn du es brauchst", hi: "Zaroorat ho to yeh bhi hai" },
  "ladder.show": { en: "Take my words here", de: "Meine Worte hierhin mitnehmen", hi: "Meri baat yahan le chalo" },
  "ladder.seeWho": { en: "See who they are", de: "Schauen, wer das ist", hi: "Dekho yeh kaun hain" },
  "ladder.markShown": { en: "I showed this to them", de: "Ich habe es ihnen gezeigt", hi: "Maine inhe dikhaya" },
  "ladder.undo": { en: "Undo", de: "Rückgängig", hi: "Wapas lo" },
  "ladder.waiting": {
    en: "Nothing new since you showed this. You don't have to do anything now.",
    de: "Seit du das gezeigt hast, ist nichts Neues passiert. Du musst jetzt nichts tun.",
    hi: "Dikhane ke baad se kuch naya nahi hua. Abhi kuch karne ki zaroorat nahi.",
  },
  "ladder.stillHappening": {
    en: "It kept happening after you showed this.",
    de: "Es ist weiter passiert, nachdem du das gezeigt hast.",
    hi: "Dikhane ke baad bhi yeh hota raha.",
  },
  "ladder.topRung": {
    en: "This is the last step this app knows. If it keeps happening, you can go back to any of these people. Asking twice is okay.",
    de: "Das ist der letzte Schritt, den die App kennt. Wenn es weiter passiert, kannst du wieder zu einer dieser Personen gehen. Zweimal fragen ist okay.",
    hi: "Yeh aakhri step hai jo yeh app jaanta hai. Agar yeh hota rahe, to inmein se kisi ke paas phir jaana theek hai. Do baar poochna theek hai.",
  },
  "ladder.dangerNow": {
    en: "If you are in danger right now, press the help button in this app.",
    de: "Bist du gerade in Gefahr? Dann drück den Hilfe-Knopf in dieser App.",
    hi: "Agar abhi khatra hai, to is app mein “Need help” dabao.",
  },
  "ladder.contactsElsewhere": {
    en: "To see how to reach them, press the help button.",
    de: "Wie du sie erreichst, siehst du unter dem Hilfe-Knopf.",
    hi: "Inse kaise baat karein, yeh “Need help” mein hai.",
  },
  "ladder.rung.head": { en: "The head of the school", de: "Die Schulleitung", hi: "School ke principal" },
  "ladder.rung.schoolPsychology": {
    en: "School counsellors for your area",
    de: "Die Schulpsychologie in deiner Nähe",
    hi: "Tumhare area ke school counsellor",
  },
  "ladder.rung.helplines": {
    en: "Helpers you can call or chat with",
    de: "Beratung zum Anrufen oder Chatten",
    hi: "Madad karne wale log, jinse phone ya chat par baat ho sakti hai",
  },
  "ladder.why.teacher": {
    en: "Sees your class every day.",
    de: "Sieht deine Klasse jeden Tag.",
    hi: "Roz tumhari class ke saath hote hain.",
  },
  "ladder.why.trusted": {
    en: "Helping with this is part of their job at school.",
    de: "Bei so etwas helfen ist ihre Aufgabe an der Schule.",
    hi: "Aisi baaton mein madad karna school mein unka kaam hai.",
  },
  "ladder.why.head": {
    en: "Can do something if a teacher didn't.",
    de: "Kann etwas tun, wenn eine Lehrkraft nichts getan hat.",
    hi: "Agar kisi teacher ne kuch nahi kiya, to yeh kuch kar sakte hain.",
  },
  "ladder.why.schoolPsychology": {
    en: "Outside your school, not part of it.",
    de: "Nicht von deiner Schule, sondern von außen.",
    hi: "Tumhare school se bahar ke log.",
  },
  "ladder.why.helplines": {
    en: "Not from your school at all.",
    de: "Haben nichts mit deiner Schule zu tun.",
    hi: "Inka tumhare school se koi lena-dena nahi.",
  },

  // Onboarding (screens/Onboarding.tsx): three picture cards, one at a time.
  // The cards are content/onboarding.json word for word; lib/onboarding.test.ts
  // fails if the two drift, so edit both. Copied here rather than fetched so the
  // first screen after the language works offline and never waits on the
  // backend waking up. {button} is filled with quickExit.button.
  "onboarding.title": { en: "Before you start", de: "Bevor du anfängst", hi: "Shuru karne se pehle" },
  "onboarding.what": {
    en: "This app helps you tell an adult what happened. It is not a person and not a doctor.",
    de: "Die App hilft dir, einem Erwachsenen zu sagen, was passiert ist. Sie ist kein Mensch und kein Arzt.",
    hi: "Yeh app kisi bade ko yeh batane mein madad karta hai ki kya hua. Yeh koi insaan ya doctor nahi hai.",
  },
  "onboarding.youDecide": {
    en: "You choose who sees it. The app tells nobody behind your back.",
    de: "Du suchst aus, wer es sieht. Die App sagt niemandem heimlich etwas.",
    hi: "Kaun dekhega, yeh tum chuno. App chupke se kisi ko kuch nahi batata.",
  },
  "onboarding.leaveNow": {
    en: "“{button}” at the top closes the app fast. It does not delete your browser history.",
    de: "„{button}“ oben schließt die App sofort. Dein Browser-Verlauf wird aber nicht gelöscht.",
    hi: "Upar wala “{button}” button app turant band karta hai. Par browser history delete nahi hoti.",
  },
  // "1 of 3" next to the dots, so a screen reader hears where it is.
  "onboarding.step": { en: "{n} of {total}", de: "{n} von {total}", hi: "{total} mein se {n}" },
  "onboarding.next": { en: "Next", de: "Weiter", hi: "Aage" },
  "onboarding.skip": { en: "Skip", de: "Überspringen", hi: "Chhodo" },
  "onboarding.start": { en: "Start", de: "Los geht's", hi: "Shuru karo" },
  "onboarding.again": { en: "What this app does", de: "Was diese App macht", hi: "Yeh app kya karta hai" },
  // The 🌐 button on the check-in, and the heading of the screen it opens.
  // Hinglish in the "tum" form, like the rest.
  "lang.change": { en: "Change language", de: "Sprache ändern", hi: "Language badlo" },
  // Bigger text and easier reading (components/DisplayButton.tsx). Buttons,
  // so English on Hinglish screens (ENGLISH_IN_HINGLISH).
  "display.open": { en: "Text", de: "Schrift", hi: "Text" },
  "display.large": { en: "Bigger text", de: "Größere Schrift", hi: "Bade letters" },
  "display.easyRead": { en: "Easier reading", de: "Leichter lesen", hi: "Aasaan padhna" },

  // Picture questions (screens/PictureQuestions.tsx). Open questions, never
  // yes/no, never leading, never "why" (see that file's header).
  "q.what.title": { en: "What happened?", de: "Was ist passiert?", hi: "Kya hua?" },
  "q.what.hint": { en: "Tap all that fit.", de: "Tipp alles an, was passt.", hi: "Jo-jo sahi lage, sab chuno." },
  "q.where.title": { en: "Where did it happen?", de: "Wo ist es passiert?", hi: "Kahan hua?" },
  "q.who.title": { en: "Who did it?", de: "Wer war das?", hi: "Kisne kiya?" },
  "q.who.howMany": { en: "How many?", de: "Wie viele?", hi: "Kitne log?" },
  "q.who.kind": { en: "Who were they?", de: "Wer war es?", hi: "Woh kaun the?" },
  "q.often.title": { en: "How often does it happen?", de: "Wie oft passiert das?", hi: "Kitni baar hota hai?" },
  "q.feel.title": { en: "How do you feel about it?", de: "Wie fühlst du dich damit?", hi: "Tumhe iske baare mein kaisa lag raha hai?" },
  "q.pickOne": { en: "Pick one.", de: "Such eins aus.", hi: "Ek chuno." },
  "q.skip": { en: "Skip", de: "Überspringen", hi: "Chhodo" },
  // On every question, always the last two tiles, in this order.
  "q.other": { en: "Something else", de: "Etwas anderes", hi: "Kuch aur" },
  "q.noSay": { en: "I don't want to say", de: "Möchte ich nicht sagen", hi: "Nahi batana" },
  "q.review.hint": { en: "This is what the card will say.", de: "Das steht dann auf der Karte.", hi: "Card par yahi likha hoga." },
  "q.review.nothing": {
    en: "You did not pick anything. That is okay.",
    de: "Du hast nichts ausgewählt. Das ist okay.",
    hi: "Tumne kuch nahi chuna. Koi baat nahi.",
  },
  // Neutral thanks only: never praise tied to what was picked.
  "q.thanks": { en: "Thank you.", de: "Danke.", hi: "Thank you." },
  "q.more.title": {
    en: "Want to say more in your own words?",
    de: "Willst du mehr in deinen eigenen Worten sagen?",
    hi: "Khud likh kar kuch aur batana hai?",
  },
  "q.more.yes": { en: "Yes, I'll write", de: "Ja, ich schreibe", hi: "Haan, likhna hai" },
  "q.more.no": { en: "No thanks", de: "Nein, danke", hi: "Nahi, thank you" },

  // Picture incident builder (lib/pictures.ts): the tiles, in their fixed order.
  "pic.what.pushed": { en: "Pushed me", de: "Geschubst", hi: "Dhakka diya" },
  "pic.what.hit": { en: "Hit me", de: "Geschlagen", hi: "Maara" },
  "pic.what.names": { en: "Called me names", de: "Beschimpft", hi: "Bure naam bole" },
  // ­ is a soft hyphen: a break point shown only when used. Without it
  // these two are wider than a tile at 360px and spilled over the next one.
  // Tile labels only; the card's German comes from the pic.say sentences.
  "pic.what.taken": { en: "Took my things", de: "Sachen weg­ge­nommen", hi: "Meri cheezein li" },
  "pic.what.left_out": { en: "Left me out", de: "Aus­ge­schlossen", hi: "Saath nahi liya" },
  "pic.what.online": { en: "Online", de: "Online", hi: "Online" },
  "pic.what.threatened": { en: "Threatened me", de: "Bedroht", hi: "Dhamkaya" },
  "pic.where.classroom": { en: "Classroom", de: "Klassenzimmer", hi: "Class" },
  "pic.where.schoolyard": { en: "Schoolyard", de: "Schulhof", hi: "School ka ground" },
  "pic.where.toilets": { en: "Toilets", de: "Toiletten", hi: "Toilet" },
  "pic.where.way_to_school": { en: "Way to school", de: "Schulweg", hi: "School ka raasta" },
  "pic.where.online": { en: "Online", de: "Online", hi: "Online" },
  "pic.where.elsewhere": { en: "Somewhere else", de: "Woanders", hi: "Kahin aur" },
  "pic.howMany.one": { en: "One person", de: "Eine Person", hi: "Ek insaan" },
  "pic.howMany.several": { en: "A group", de: "Eine Gruppe", hi: "Ek group" },
  "pic.kind.classmate": { en: "In my class", de: "Aus meiner Klasse", hi: "Meri class se" },
  "pic.kind.older": { en: "Older than me", de: "Älter als ich", hi: "Mujhse bade" },
  "pic.kind.adult": { en: "An adult", de: "Eine erwachsene Person", hi: "Koi adult" },
  "pic.kind.other": { en: "Someone else", de: "Jemand anderes", hi: "Koi aur" },
  "pic.often.once": { en: "Once", de: "Einmal", hi: "Ek baar" },
  "pic.often.few": { en: "A few times", de: "Ein paar Mal", hi: "Kuch baar" },
  "pic.often.daily": { en: "Almost every day", de: "Fast jeden Tag", hi: "Lagbhag roz" },

  // Where, who and how often go on the card as labelled lines, not
  // sentences: fixed words, so the grammar cannot go wrong for any answer.
  "pic.line.where": { en: "Where: {x}", de: "Wo: {x}", hi: "Kahan: {x}" },
  "pic.line.who": { en: "Who: {x}", de: "Wer: {x}", hi: "Kaun: {x}" },
  "pic.line.often": { en: "How often: {x}", de: "Wie oft: {x}", hi: "Kitni baar: {x}" },

  // Follow-up questions (lib/questions.ts): asked only after the answer they
  // follow, and they repeat the child's own pick as a cue ("You said...").
  // Never yes/no, never why. The German needs a native check.
  "q.own.title": {
    en: "You said something else happened. What happened?",
    de: "Du hast gesagt, etwas anderes ist passiert. Was ist passiert?",
    hi: "Tumne kaha kuch aur hua. Kya hua?",
  },
  "q.own.hint": {
    en: "You can write it in your own words.",
    de: "Du kannst es in deinen eigenen Worten schreiben.",
    hi: "Khud likh kar batao.",
  },
  "q.whereOnline.title": {
    en: "You said it happened online. Where online?",
    de: "Du hast gesagt, es war online. Wo online?",
    hi: "Tumne kaha online hua. Online kahan?",
  },
  "q.taken.title": {
    en: "You said things were taken. What was taken?",
    de: "Du hast gesagt, dir wurden Sachen weggenommen. Was wurde weggenommen?",
    hi: "Tumne kaha cheezein li gayi. Kya liya?",
  },
  "q.body.title": {
    en: "You said you were pushed or hit. How does your body feel now?",
    de: "Du hast gesagt, du wurdest geschubst oder geschlagen. Wie fühlt sich dein Körper jetzt an?",
    hi: "Tumne kaha dhakka diya ya maara. Abhi tumhari body kaisi hai?",
  },
  "q.when.title": {
    en: "You said you were threatened. When did they say it would happen?",
    de: "Du hast gesagt, du wurdest bedroht. Wann soll es passieren?",
    hi: "Tumne kaha kisi ne dhamkaya. Kab ke liye bola?",
  },
  "q.adult.title": {
    en: "You said it was an adult. Where is this adult from?",
    de: "Du hast gesagt, es war eine erwachsene Person. Woher kennst du die Person?",
    hi: "Tumne kaha yeh koi adult hai. Yeh adult kahan se hai?",
  },
  // Soft hyphen for the narrow tile; stripped from the card (pictures.ts label()).
  "pic.online.chat": { en: "Group chat", de: "Gruppen­chat", hi: "Group chat" },
  "pic.online.game": { en: "A game", de: "Ein Spiel", hi: "Game" },
  "pic.online.social": { en: "Social media", de: "Soziale Medien", hi: "Social media" },
  "pic.online.messages": { en: "Messages", de: "Nach­richten", hi: "Messages" },
  "pic.taken.lunch": { en: "My lunch", de: "Mein Essen", hi: "Mera khana" },
  "pic.taken.money": { en: "Money", de: "Geld", hi: "Paise" },
  "pic.taken.phone": { en: "My phone", de: "Mein Handy", hi: "Mera phone" },
  // Soft hyphen for the narrow tile; stripped from the card (pictures.ts label()).
  "pic.taken.school_things": { en: "School things", de: "Schul­sachen", hi: "School ka saamaan" },
  "pic.body.fine": { en: "Fine", de: "Gut", hi: "Theek hai" },
  "pic.body.hurts_bit": { en: "Hurts a bit", de: "Tut ein bisschen weh", hi: "Thoda dard hai" },
  "pic.body.hurts_lot": { en: "Hurts a lot", de: "Tut sehr weh", hi: "Bahut dard hai" },
  "pic.when.today": { en: "Today", de: "Heute", hi: "Aaj" },
  // Not "kal": in Hindi it means both yesterday and tomorrow (see PR #70).
  "pic.when.tomorrow": { en: "Tomorrow", de: "Morgen", hi: "Agle din" },
  "pic.when.later": { en: "Later", de: "Später", hi: "Baad mein" },
  "pic.when.dont_know": { en: "I don't know", de: "Weiß ich nicht", hi: "Pata nahi" },
  "pic.adult.school": { en: "From school", de: "Aus der Schule", hi: "School se" },
  "pic.adult.home": { en: "From home", de: "Von zu Hause", hi: "Ghar se" },
  "pic.adult.elsewhere": { en: "Somewhere else", de: "Woanders", hi: "Kahin aur" },
  "pic.line.whereOnline": { en: "Where online: {x}", de: "Wo online: {x}", hi: "Online kahan: {x}" },
  "pic.line.taken": { en: "What was taken: {x}", de: "Was weggenommen wurde: {x}", hi: "Kya liya: {x}" },
  "pic.line.body": { en: "Body now: {x}", de: "Körper jetzt: {x}", hi: "Body abhi: {x}" },
  "pic.line.when": { en: "When it is meant to happen: {x}", de: "Wann es passieren soll: {x}", hi: "Kab ke liye bola: {x}" },
  "pic.line.adult": { en: "The adult is: {x}", de: "Die erwachsene Person ist: {x}", hi: "Woh adult: {x}" },

  // The sentence for each tap when the child said how many. {S} is pic.doer.*;
  // German {hat} becomes "hat" or "haben".
  "pic.doer.one": { en: "Someone", de: "Jemand", hi: "Kisi" },
  "pic.doer.several": { en: "Several people", de: "Mehrere", hi: "Kuch logon" },
  "pic.say.pushed": { en: "{S} pushed me.", de: "{S} {hat} mich geschubst.", hi: "{S} ne mujhe dhakka diya." },
  "pic.say.hit": { en: "{S} hit me.", de: "{S} {hat} mich geschlagen.", hi: "{S} ne mujhe maara." },
  "pic.say.names": { en: "{S} called me names.", de: "{S} {hat} mich beschimpft.", hi: "{S} ne mujhe bure naam bole." },
  "pic.say.taken": { en: "{S} took my things.", de: "{S} {hat} mir Sachen weggenommen.", hi: "{S} ne meri cheezein le li." },
  "pic.say.online": {
    en: "{S} wrote mean things about me online.",
    de: "{S} {hat} online gemeine Dinge über mich geschrieben.",
    hi: "{S} ne online mere baare mein buri baatein likhi.",
  },
  "pic.say.left_out": { en: "{S} left me out.", de: "{S} {hat} mich ausgeschlossen.", hi: "{S} ne mujhe saath nahi liya." },
  "pic.say.threatened": { en: "{S} threatened me.", de: "{S} {hat} mich bedroht.", hi: "{S} ne mujhe dhamkaya." },
  // "Something else": no doer, whatever the count, because nothing is known.
  "pic.say.other": { en: "Something else happened.", de: "Etwas anderes ist passiert.", hi: "Kuch aur hua." },

  // The same sentences when the child did not say how many: passive, so no
  // doer and no count is added that the child never gave.
  "pic.passive.pushed": { en: "I was pushed.", de: "Ich wurde geschubst.", hi: "Mujhe dhakka diya." },
  "pic.passive.hit": { en: "I was hit.", de: "Ich wurde geschlagen.", hi: "Mujhe maara." },
  "pic.passive.names": { en: "I was called names.", de: "Ich wurde beschimpft.", hi: "Mujhe bure naam bole." },
  "pic.passive.taken": { en: "My things were taken.", de: "Mir wurden Sachen weggenommen.", hi: "Meri cheezein le li." },
  "pic.passive.online": {
    en: "Mean things were written about me online.",
    de: "Über mich wurden online gemeine Dinge geschrieben.",
    hi: "Online mere baare mein buri baatein likhi.",
  },
  "pic.passive.left_out": { en: "I was left out.", de: "Ich wurde ausgeschlossen.", hi: "Mujhe saath nahi liya." },
  "pic.passive.threatened": { en: "I was threatened.", de: "Ich wurde bedroht.", hi: "Mujhe dhamkaya." },
  "pic.passive.other": { en: "Something else happened.", de: "Etwas anderes ist passiert.", hi: "Kuch aur hua." },

  // On the card: where each line came from, so a tapped tile never reads as
  // a quote. Shown in the card's current language (the adult may read German).
  "card.fromPictures": { en: "Chosen from pictures", de: "Aus Bildern gewählt", hi: "Pictures se chuna" },
  "card.ownWords": { en: "In my own words", de: "In meinen eigenen Worten", hi: "Meri apni baat" },
} as const satisfies Record<string, Text>;

export type StringKey = keyof typeof STRINGS;

/** The text for `key` in `lang`, falling back to English for unknown languages. */
/**
 * Names of the app's features and its buttons stay English on Hinglish
 * screens (Neel, 26 Oct: "just keep the interactive part in the hinglish.
 * keep the features of the app like 'What this app does' in english").
 * Hinglish already mixes English for these ("phone", "save"), and a child
 * who meets "Leave now" or "Need help" on every screen learns it once.
 * The questions, answers and anything said to the child stay Hinglish.
 */
export const ENGLISH_IN_HINGLISH: ReadonlySet<StringKey> = new Set<StringKey>([
  "app.poweredBy",
  "demo.button",
  "demo.clear",
  "help.button",
  "help.title",
  "help.short",
  "quickExit.button",
  "nav.back",
  "nav.next",
  "lang.change",
  "display.open",
  "display.large",
  "display.easyRead",
  "onboarding.title",
  "onboarding.again",
  "onboarding.next",
  "onboarding.skip",
  "onboarding.start",
  "timeline.title",
  "timeline.delete",
  "timeline.deleteAll",
  "timeline.buildReport",
  "report.title",
  "report.build",
  "avatar.change",
  "pin.set.title",
  "pin.set.titleChange",
  "pin.set.save",
  "pin.set.skip",
  "pin.remove.button",
  "pin.unlock.title",
  "pin.unlock.button",
  "pin.keypad.delete",
  "pin.keypad.clear",
  "ladder.title",
]);

export function t(key: StringKey, lang: string): string {
  const entry: Text = STRINGS[key];
  if (lang === "hi" && ENGLISH_IN_HINGLISH.has(key)) return entry.en;
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
