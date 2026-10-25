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

/** ISO 639-1 codes we ship copy for. */
export type Lang = "en" | "de" | "hi";

export interface Mood {
  /** Stored in the timeline. Stable: changing one orphans existing entries. */
  code: string;
  /** Shown as the button face. */
  emoji: string;
  /** The word under the face, in the child's language. */
  label: Record<Lang, string>;
}

/**
 * The Hindi labels have NOT been read by a native speaker.
 *
 * Kept as an exported flag rather than only a comment so a screen can show
 * the same caveat the rest of our Hindi copy carries, and so a test fails if
 * someone deletes the marker without doing the review. Flip it in the same
 * commit as the review, naming who read it.
 */
export const HINDI_REVIEWED = false;

export const MOODS: readonly Mood[] = [
  { code: "good", emoji: "🙂", label: { en: "Good", de: "Gut", hi: "अच्छा" } },
  { code: "ok", emoji: "😐", label: { en: "OK", de: "Geht so", hi: "ठीक है" } },
  { code: "sad", emoji: "😢", label: { en: "Sad", de: "Traurig", hi: "दुखी" } },
  { code: "scared", emoji: "😨", label: { en: "Scared", de: "Angst", hi: "डर लग रहा है" } },
  { code: "angry", emoji: "😠", label: { en: "Angry", de: "Wütend", hi: "गुस्सा" } },
  { code: "alone", emoji: "😞", label: { en: "Alone", de: "Allein", hi: "अकेला" } },
] as const;

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
