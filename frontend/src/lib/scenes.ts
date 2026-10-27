/**
 * The colour of each place, and the stops on the game map.
 *
 * The map is the journey drawn as a path of stops: the check-in, one stop per
 * picture question actually asked (so it grows and shrinks with the child's
 * answers, lib/questions.ts), then the card, who sees it, and done. It is not
 * a level, a score or a race: there is nothing to win, and Back walks the
 * child's token back along it.
 *
 * Help, crisis, safety, the PIN and the follow-up stay on the "quiet" scene:
 * a pale, plain colour with no map and no motion (CLAUDE.md, and the style
 * brief: those screens stay calm and still).
 */

import type { StringKey } from "./strings";
import type { Step } from "./nav";
import type { Picks } from "./pictures";
import { isQuestion, questionsFor, type QuestionStep } from "./questions";

export type Scene = "sun" | "sky" | "grass" | "pink" | "lilac" | "quiet";

export const SCENE: Record<Step, Scene> = {
  language: "sky",
  onboarding: "lilac",
  checkIn: "sun",
  checkInGood: "sun",
  picWhat: "sky",
  picBody: "sun",
  picTaken: "lilac",
  picWhereOnline: "grass",
  picWhen: "lilac",
  picOwn: "sky",
  picWhere: "grass",
  picWho: "pink",
  picAdultWhere: "pink",
  picOften: "lilac",
  picFeel: "sun",
  picReview: "sky",
  picMore: "sky",
  write: "sky",
  timeline: "grass",
  report: "grass",
  handoff: "pink",
  handoffShow: "pink",
  handoffDone: "lilac",
  escalation: "quiet",
  pinSet: "quiet",
  help: "quiet",
};

/** The little drawing on a stop. */
export type Glyph =
  | "face" | "burst" | "pin" | "people" | "calendar" | "heart" | "card" | "eyes" | "house"
  | "bag" | "phone" | "clock" | "pencil" | "bandage";

export interface MapPlace {
  scene: Scene;
  glyph: Glyph;
  label: StringKey;
}

const CHECK_IN: MapPlace = { scene: "sun", glyph: "face", label: "map.feel" };

const QUESTION_PLACE: Record<QuestionStep, MapPlace> = {
  picWhat: { scene: "sky", glyph: "burst", label: "map.what" },
  picBody: { scene: "sun", glyph: "bandage", label: "map.body" },
  picTaken: { scene: "lilac", glyph: "bag", label: "map.taken" },
  picWhereOnline: { scene: "grass", glyph: "phone", label: "map.whereOnline" },
  picWhen: { scene: "lilac", glyph: "clock", label: "map.when" },
  picOwn: { scene: "sky", glyph: "pencil", label: "map.own" },
  picWhere: { scene: "grass", glyph: "pin", label: "map.where" },
  picWho: { scene: "pink", glyph: "people", label: "map.whoDid" },
  picAdultWhere: { scene: "pink", glyph: "pin", label: "map.adult" },
  picOften: { scene: "lilac", glyph: "calendar", label: "map.often" },
  picFeel: { scene: "sun", glyph: "heart", label: "map.feelAbout" },
};

const ENDING: readonly MapPlace[] = [
  { scene: "grass", glyph: "card", label: "map.card" },
  { scene: "pink", glyph: "eyes", label: "map.who" },
  { scene: "lilac", glyph: "house", label: "map.done" },
];

/** Steps that stand on the card stop (the checking, writing and card screens). */
const ON_CARD: readonly Step[] = ["picReview", "picMore", "write", "timeline", "report"];

/**
 * The stops for these answers, and where the traveller stands for this step,
 * or null for a step with no map (language, onboarding, the quiet screens).
 */
export function mapFor(
  step: Step,
  picks: Picks,
  mood: string | null = null,
): { places: MapPlace[]; at: number } | null {
  const questions = questionsFor(picks, mood);
  const places = [CHECK_IN, ...questions.map((q) => QUESTION_PLACE[q]), ...ENDING];
  const card = 1 + questions.length;
  let at: number;
  if (step === "checkIn" || step === "checkInGood") at = 0;
  else if (isQuestion(step)) {
    const i = questions.indexOf(step);
    // A question the answers no longer lead to (seen after Back): stand on
    // the last stop before the card rather than vanish.
    at = i === -1 ? card - 1 : 1 + i;
  } else if (ON_CARD.includes(step)) at = card;
  else if (step === "handoff" || step === "handoffShow") at = card + 1;
  else if (step === "handoffDone") at = card + 2;
  else return null;
  return { places, at };
}
