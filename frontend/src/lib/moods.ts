/**
 * The emoji check-in: step 1 of the journey, and the one step that needs no
 * language at all.
 *
 * A child who has just arrived in Germany, or who has frozen, can still tap a
 * face. That is the whole point of putting this first: it asks for something
 * the child can always give, before asking for words.
 *
 * ## This is a self-report, never an inference
 *
 * The child picks. We never infer a mood from what they wrote, and the mood
 * is never used to draw a conclusion about them. `CLAUDE.md`: *"No diagnosis,
 * no depression inference. It is a communication tool, not a clinical one."*
 *
 * Which is also why the mood does not appear in the report an adult reads
 * (`engine/report.py` leaves it out deliberately): a feeling-label printed
 * next to a factual entry invites a reader to treat it as an assessment. It
 * belongs in the child's own view of their timeline, where they put it.
 *
 * ## Why these six
 *
 * Six fits two rows of three on a 360px phone, which is the screen size the
 * quality bar names. They are plain feelings a child would recognise, not a
 * scale and not clinical vocabulary. `alone` earns its place because being
 * left out is one of the most common forms of what this app exists for, and a
 * child experiencing it often does not call it bullying.
 *
 * The codes are the stored values, so they must not change once a timeline
 * exists: `content/demo_story.json` already uses `sad` and `scared`, and a
 * test holds that every code that file uses still exists here.
 */

import { HINDI_REVIEWED, STRINGS, type Lang } from "./strings.ts";

// The labels live in strings.ts with the rest of the screen text, so one
// Hindi review and one flag cover all of it. Re-exported so callers of this
// module keep working.
export { HINDI_REVIEWED, type Lang };

export interface Mood {
  /** Stored in the timeline. Stable: changing one orphans existing entries. */
  code: string;
  /** Shown as the button face. */
  emoji: string;
  /** The word under the face, in the child's language. */
  label: Record<Lang, string>;
}

export const MOODS: readonly Mood[] = [
  { code: "good", emoji: "🙂", label: STRINGS["mood.good"] },
  { code: "ok", emoji: "😐", label: STRINGS["mood.ok"] },
  { code: "sad", emoji: "😢", label: STRINGS["mood.sad"] },
  { code: "scared", emoji: "😨", label: STRINGS["mood.scared"] },
  { code: "angry", emoji: "😠", label: STRINGS["mood.angry"] },
  { code: "alone", emoji: "😞", label: STRINGS["mood.alone"] },
];

/** Codes that `content/demo_story.json` relies on; a test checks the file itself. */
export const REQUIRED_CODES = ["sad", "scared"] as const;

export const MOOD_CODES: readonly string[] = MOODS.map((mood) => mood.code);

/** The mood for a stored code, or undefined if it is not one of ours. */
export function moodByCode(code: string): Mood | undefined {
  return MOODS.find((mood) => mood.code === code);
}

/**
 * The label for a mood in the child's language, falling back to English.
 *
 * Takes a code rather than a Mood so a screen can render a stored timeline
 * entry directly. An unknown code returns the code itself: a timeline written
 * by a newer version of the app should still show something rather than a
 * blank, and the raw code is at least honest about what we know.
 */
export function moodLabel(code: string, lang: string): string {
  const mood = moodByCode(code);
  if (!mood) return code;
  return mood.label[lang as Lang] ?? mood.label.en;
}

export function moodEmoji(code: string): string {
  return moodByCode(code)?.emoji ?? "";
}
