/**
 * Wording for the follow-up and the ladder, and what to do about the sentences
 * `lib/strings.ts` does not have yet.
 *
 * `lib/strings.ts` is Neel's file and the only home for interface copy in three
 * languages. These two screens need sentences that are not in it yet, and
 * adding them here in German or Hindi would be worse than not shipping them:
 * nobody on the team reads German well enough to review it, and Hindi is an
 * unreviewed draft already (`HINDI_REVIEWED === false`). Unreviewed copy that
 * looks reviewed is the failure mode to avoid.
 *
 * So `DRAFT_COPY` holds **English only**, every entry is listed in the PR for
 * Neel to translate, and `copy()` prefers `strings.ts` whenever the key exists
 * there. Nothing in this file has to change on the day the keys land: the
 * lookup starts returning the reviewed sentence by itself, and
 * `copy.test.ts` fails on any draft that has become a duplicate, so the dead
 * draft cannot sit here pretending to be needed.
 *
 * `Copy.lang` is the language of the text that actually came back, so a screen
 * can put it on the element. A German-speaking child using a screen reader
 * should not have an English draft read to them with German phonemes, and
 * `lang` is also how a reader is told honestly which parts are not translated.
 */

import { FALLBACK_LANG, STRINGS, isLang, t, type StringKey } from "../lib/strings.ts";

/**
 * English-only drafts, awaiting keys in `lib/strings.ts`.
 *
 * Tone rules these were written against (`CLAUDE.md`, and the fact that this
 * screen talks to a child whose situation may not have improved):
 * - nothing congratulatory, so "a bit better" is acknowledged, never praised
 * - nothing that reads as disappointment, so "worse" gets the same flat voice
 * - no promise that the next rung will fix it, hence `ladder.noPromise`
 * - no first person: the app is not a friend or a companion, it is a bridge
 * - no contact is named or dialled here; those come from Neel's help screen
 */
export const DRAFT_COPY = {
  /**
   * Shown when any draft below is still being served, and only to a child who
   * did not ask for English. It removes itself: once Neel has translated every
   * key, `untranslatedKeys()` is empty and the notice never renders again.
   */
  "app.englishOnly": "Some words in this app are only in English for now.",

  // --- the follow-up check-in -------------------------------------------------
  "followup.title": "How are things now?",
  "followup.gap": "It has been a few days since the last thing you wrote.",
  "followup.noPressure":
    "You do not have to answer this. Nothing is sent to anyone, whatever you pick.",
  "followup.answerBetter": "A bit better",
  "followup.answerSame": "About the same",
  "followup.answerWorse": "Worse",
  "followup.notNow": "Not now",
  "followup.stopAsking": "Stop asking me this",
  "followup.stopped":
    "This question will not come back. You can still write something down whenever you want to.",
  // "Okay" on purpose, for both. It is the one word that is neither a
  // congratulation for "better" nor a disappointment at "worse".
  "followup.afterBetter": "Okay. You can write something down any time, even if it seems small.",
  "followup.afterStill":
    "Okay. There are other people you could show your words to, if you want to.",
  "followup.notKept": "This answer is not saved anywhere, and nobody is told.",
  "followup.openLadder": "See who else there is",

  // --- the escalation ladder --------------------------------------------------
  "ladder.title": "Who else there is",
  "ladder.intro": "Other people you could show your own words to. You pick, and you show it yourself.",
  "ladder.noPromise":
    "None of them can promise it will stop. Each one is a different door, and you can try more than one.",
  "ladder.carryTitle": "Your words go with you",
  "ladder.carryWhy":
    "The entries you already checked and approved go to the next person too, so you never have to start explaining from nothing again.",
  "ladder.carryNone":
    "You have not written anything down yet, so there would be nothing to show. You can write something first.",
  "ladder.stateStart": "A place to start",
  "ladder.stateNext": "You could try this next",
  "ladder.stateShown": "You showed this",
  "ladder.stateLater": "Still there if you need it",
  "ladder.show": "Take my words here",
  "ladder.seeWho": "See who they are",
  "ladder.markShown": "I showed this to them",
  "ladder.undo": "Undo",
  "ladder.waiting": "Nothing new since you showed this. You do not have to do anything right now.",
  "ladder.stillHappening": "Things kept happening after you showed this.",
  "ladder.topRung":
    "This is the last step this app knows about. If it keeps happening you can go back to any of these people again: asking twice is allowed.",
  "ladder.dangerNow": "If you are in danger right now, use the help button in this app.",
  "ladder.contactsElsewhere": "The app shows how to reach them under the help button.",

  // Rung names. `teacher` and `trusted` already exist in strings.ts as
  // handoff.classTeacher / handoff.trustedTeacher / handoff.socialWorker, so
  // they are not drafted again here.
  "ladder.rung.head": "The head of the school",
  "ladder.rung.schoolPsychology": "The school counselling service for your area",
  "ladder.rung.helplines": "Counsellors you can call or chat with",

  // Why this door is different from the last one. Deliberately flat statements
  // of fact: "can act" is not "will act", and none of them says it will help.
  "ladder.why.teacher": "The person who sees your class every day.",
  "ladder.why.trusted": "Helping with this is part of their job at school.",
  "ladder.why.head": "Can act when a teacher has not.",
  "ladder.why.schoolPsychology": "Outside your school, and not part of it.",
  "ladder.why.helplines": "Not from your school at all.",
} as const satisfies Record<string, string>;

export type DraftKey = keyof typeof DRAFT_COPY;

/** A key in `lib/strings.ts`, or one still waiting to be added to it. */
export type CopyKey = StringKey | DraftKey;

export interface Copy {
  text: string;
  /** The language `text` is actually in, for the element's `lang` attribute. */
  lang: string;
  /** True when this came from `lib/strings.ts` rather than an English draft. */
  fromStrings: boolean;
}

/** The sentence for `key`, preferring `lib/strings.ts` over the English draft. */
export function copy(key: CopyKey, lang: string): Copy {
  if (key in STRINGS) {
    return {
      text: t(key as StringKey, lang),
      lang: isLang(lang) ? lang : FALLBACK_LANG,
      fromStrings: true,
    };
  }
  return { text: DRAFT_COPY[key as DraftKey], lang: "en", fromStrings: false };
}

/**
 * The same thing as props, so a screen cannot render the text and forget the
 * `lang` that goes with it: `<p {...says("ladder.intro", lang)} />`.
 */
export function says(key: CopyKey, lang: string): { lang: string; children: string } {
  const { text, lang: of } = copy(key, lang);
  return { lang: of, children: text };
}

/** Keys still being served from the English drafts, for an honest UI notice. */
export function untranslatedKeys(): DraftKey[] {
  return (Object.keys(DRAFT_COPY) as DraftKey[]).filter((key) => !(key in STRINGS));
}

/**
 * Props for the "some of this is English only" line, or null when it would be
 * untrue or pointless.
 *
 * Null for a child reading English (for whom there is nothing to disclose) and
 * null once every draft above has a key in `lib/strings.ts`, so the notice
 * takes itself off the screen on the day Neel's wording lands rather than
 * waiting for someone to remember to delete it.
 */
export function englishOnlyNotice(lang: string): { lang: string; children: string } | null {
  if (lang === "en" || untranslatedKeys().length === 0) return null;
  return says("app.englishOnly", lang);
}
