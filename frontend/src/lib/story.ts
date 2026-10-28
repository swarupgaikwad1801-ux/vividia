/**
 * "Help Kim": a short story for a child who is not ready to talk about
 * themselves yet.
 *
 * The child walks a made-up character, Kim, through one school day and
 * chooses what happens at each place. At the end they are asked, once and
 * plainly, whether something like this has happened to them. That is the
 * whole bridge: talking about someone else first is often easier, and the
 * child decides whether to cross it.
 *
 * ## What this is not
 *
 * Not an assessment. Nothing the child taps for Kim is scored, stored, sent,
 * or read as a sign of anything about the child (CLAUDE.md: no diagnosis, no
 * inference behind the child's back). Kim's day is Kim's. A child who picks
 * "someone hits Kim" four times has told us nothing about themselves, and the
 * app must not act as if they had.
 *
 * So this module has no storage and no network, and the picks live only in
 * the component's state until the story closes. A test pins that it imports
 * nothing that could save or send them.
 *
 * ## Where it leads
 *
 * "Yes, I want to tell" offers the two ways the app already has: writing, or
 * the picture builder. Both open **empty**. Pre-filling them with Kim's day
 * would put words in the child's mouth, which is the one thing the product
 * exists not to do. "Not now" ends kindly, with no follow-up question.
 *
 * All wording is in `strings.ts` under `story.*`.
 */

import type { StringKey } from "./strings.ts";

export type SceneId = "way" | "classroom" | "break" | "evening";

export type Happening = "nothing" | "pushed" | "hit" | "names" | "taken" | "left_out" | "online";

export interface Scene {
  id: SceneId;
  /** "nothing" is always first, so the calm answer is never the hardest to reach. */
  options: readonly Happening[];
}

export const SCENES: readonly Scene[] = [
  { id: "way", options: ["nothing", "pushed", "names", "taken"] },
  { id: "classroom", options: ["nothing", "names", "left_out", "taken"] },
  { id: "break", options: ["nothing", "pushed", "hit", "left_out"] },
  { id: "evening", options: ["nothing", "online", "left_out"] },
];

export type HelpChoice = "teacher" | "friend" | "write" | "keep";

/** Every answer gets a kind reply; "keep it secret" is not a wrong answer. */
export const HELP_CHOICES: readonly HelpChoice[] = ["teacher", "friend", "write", "keep"];

export type Step =
  | { kind: "intro" }
  | { kind: "scene"; index: number }
  /** After the last scene: "what could help?" on a hard day, "a calm day" otherwise. */
  | { kind: "dayEnd" }
  | { kind: "helpReply"; choice: HelpChoice }
  | { kind: "bridge" }
  | { kind: "how" }
  | { kind: "notNow" };

export interface Story {
  step: Step;
  /** One pick per scene, in order. In memory only. */
  picks: readonly Happening[];
}

export type Action =
  | { type: "start" }
  | { type: "pick"; happening: Happening }
  | { type: "help"; choice: HelpChoice }
  | { type: "next" }
  | { type: "tell" }
  | { type: "notNow" }
  | { type: "restart" };

export const START: Story = { step: { kind: "intro" }, picks: [] };

/** True if anything other than "nothing" happened to Kim. */
export function hardDay(picks: readonly Happening[]): boolean {
  return picks.some((pick) => pick !== "nothing");
}

/**
 * The next state. Actions that don't belong to the current step are ignored
 * (a double tap must never skip a scene), so a screen can wire buttons
 * without guarding each one.
 */
export function reduce(story: Story, action: Action): Story {
  const { step } = story;

  if (action.type === "restart") return START;

  switch (step.kind) {
    case "intro":
      return action.type === "start" ? { step: { kind: "scene", index: 0 }, picks: [] } : story;

    case "scene": {
      if (action.type !== "pick") return story;
      if (!SCENES[step.index].options.includes(action.happening)) return story;
      const picks = [...story.picks, action.happening];
      const last = step.index + 1 >= SCENES.length;
      return { step: last ? { kind: "dayEnd" } : { kind: "scene", index: step.index + 1 }, picks };
    }

    case "dayEnd":
      // On a hard day the child answers "what could help?"; on a calm day "next" goes on.
      if (hardDay(story.picks)) {
        return action.type === "help" ? { ...story, step: { kind: "helpReply", choice: action.choice } } : story;
      }
      return action.type === "next" ? { ...story, step: { kind: "bridge" } } : story;

    case "helpReply":
      return action.type === "next" ? { ...story, step: { kind: "bridge" } } : story;

    case "bridge":
      // Kim's picks are dropped here: nothing about Kim travels past the question.
      if (action.type === "tell") return { step: { kind: "how" }, picks: [] };
      if (action.type === "notNow") return { step: { kind: "notNow" }, picks: [] };
      return story;

    case "how":
    case "notNow":
      // The screen leaves from here (to writing or pictures, or home).
      return story;
  }
}

export const sceneKey = (id: SceneId) => `story.scene.${id}` as StringKey;
export const happeningKey = (happening: Happening) => `story.happens.${happening}` as StringKey;
export const helpKey = (choice: HelpChoice) => `story.help.${choice}` as StringKey;
export const replyKey = (choice: HelpChoice) => `story.reply.${choice}` as StringKey;
