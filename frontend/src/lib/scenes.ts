/**
 * The colour of each place, and where it sits on the game map.
 *
 * The map is the journey drawn as a path through five places. It is not a
 * level, a score or a race: there is nothing to win, and Back walks the
 * child's token back along it.
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

export interface MapPlace {
  scene: Scene;
  label: StringKey;
}

export const MAP_PLACES: readonly MapPlace[] = [
  { scene: "sun", label: "map.feel" },
  { scene: "sky", label: "map.words" },
  { scene: "grass", label: "map.card" },
  { scene: "pink", label: "map.who" },
  { scene: "lilac", label: "map.done" },
];

/** Where the token stands on the map for this step, or null for no map. */
export function mapIndex(step: Step): number | null {
  switch (step) {
    case "checkIn":
      return 0;
    case "write":
      return 1;
    case "timeline":
    case "report":
      return 2;
    case "handoff":
    case "handoffShow":
      return 3;
    case "handoffDone":
      return 4;
    default:
      return null;
  }
}
