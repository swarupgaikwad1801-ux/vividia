/**
 * The colour of each place, and where it sits on the game map.
 *
 * The map is the journey drawn as a path of stops: one per picture question,
 * then the card, who sees it, and done. It is not a level, a score or a race:
 * there is nothing to win, and Back walks the child's token back along it.
 *
 * Help, crisis, safety, the PIN and the follow-up stay on the "quiet" scene:
 * a pale, plain colour with no map and no motion (CLAUDE.md, and the style
 * brief: those screens stay calm and still).
 */

import type { StringKey } from "./strings";
import type { Step } from "./nav";

export type Scene = "sun" | "sky" | "grass" | "pink" | "lilac" | "quiet";

export const SCENE: Record<Step, Scene> = {
  language: "sky",
  onboarding: "lilac",
  checkIn: "sun",
  picWhat: "sky",
  picWhere: "grass",
  picWho: "pink",
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
  followUp: "quiet",
  escalation: "quiet",
  pinSet: "quiet",
};

/** The little drawing on a stop. */
export type Glyph = "face" | "burst" | "pin" | "people" | "calendar" | "heart" | "card" | "eyes" | "house";

export interface MapPlace {
  scene: Scene;
  glyph: Glyph;
  label: StringKey;
}

export const MAP_PLACES: readonly MapPlace[] = [
  { scene: "sun", glyph: "face", label: "map.feel" },
  { scene: "sky", glyph: "burst", label: "map.what" },
  { scene: "grass", glyph: "pin", label: "map.where" },
  { scene: "pink", glyph: "people", label: "map.whoDid" },
  { scene: "lilac", glyph: "calendar", label: "map.often" },
  { scene: "sun", glyph: "heart", label: "map.feelAbout" },
  { scene: "grass", glyph: "card", label: "map.card" },
  { scene: "pink", glyph: "eyes", label: "map.who" },
  { scene: "lilac", glyph: "house", label: "map.done" },
];

/** Where the token stands on the map for this step, or null for no map. */
export function mapIndex(step: Step): number | null {
  switch (step) {
    case "checkIn":
      return 0;
    case "picWhat":
      return 1;
    case "picWhere":
      return 2;
    case "picWho":
      return 3;
    case "picOften":
      return 4;
    case "picFeel":
      return 5;
    case "picReview":
    case "picMore":
    case "write":
    case "timeline":
    case "report":
      return 6;
    case "handoff":
    case "handoffShow":
      return 7;
    case "handoffDone":
      return 8;
    default:
      return null;
  }
}
