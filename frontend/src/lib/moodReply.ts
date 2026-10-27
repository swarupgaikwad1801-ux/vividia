/**
 * What the app says after the check-in, for the face the child tapped.
 *
 * Before this, every answer - "Good" included - went straight to "What
 * happened?", which tells a child having a good day that something must have
 * (Swarup, 27 Oct: "even if we say good ... it still asks what happened").
 * Now the reply fits the face, and the next step is the child's choice:
 * tap pictures, write it their way, or stop here.
 *
 * Fixed sentences only. The mood is a self-report and is never used to
 * conclude anything about the child (lib/moods.ts).
 */

import type { StringKey } from "./strings";

export interface MoodReply {
  /** The first thing the app says back. */
  title: StringKey;
  /** The gentle question under it, or null when the title already asks. */
  question: StringKey | null;
  /** The quiet way out: "That's all for today" after a good face, else "Not now". */
  stop: StringKey;
}

const HARD: Record<string, StringKey> = {
  sad: "moodReply.sad",
  scared: "moodReply.scared",
  angry: "moodReply.angry",
  alone: "moodReply.alone",
};

export function moodReplyFor(mood: string | null): MoodReply {
  if (mood === "good") return { title: "moodReply.good", question: "moodReply.anything", stop: "moodReply.done" };
  if (mood === "ok") return { title: "moodReply.ok", question: "moodReply.anything", stop: "moodReply.done" };
  if (mood && HARD[mood]) return { title: HARD[mood], question: "moodReply.tellUs", stop: "heard.notNow" };
  // Skipped, or a code from an older version: no feeling to answer, so ask.
  return { title: "moodReply.skipped", question: null, stop: "heard.notNow" };
}
