/**
 * The one-click demo: load the example story, seed the timeline from it, and
 * be able to take it all back out again.
 *
 * Why this module exists at all: a judge should never paste an API key or type
 * a disclosure to see what the app does (CLAUDE.md, what Jacquie asked for).
 * Pressing one button has to leave the app in the state a child would be in
 * five entries into their own timeline, with the next sentence already written
 * so the judge only has to press send.
 *
 * Two promises shape every decision below.
 *
 * 1. **Nothing is sent to any adult by the app itself.** So this module seeds a
 *    timeline and prepares a *draft*. It does not call /api/translate, does not
 *    produce a report and does not pick a trusted adult. The story's handoff
 *    block is carried through as suggestions the child may ignore.
 * 2. **Reversible.** Someone has to be able to get a clean app back. We record
 *    the local ids of the entries we added, so clearing the demo deletes
 *    exactly those and leaves anything the person wrote themselves alone.
 *    `clearAll()` in timeline.ts would be simpler and is wrong: a judge
 *    clicking "clear demo" must not be able to delete a real child's words.
 *
 * Nothing the child writes is read, logged or sent from here.
 */

import { ApiError, demo as fetchStory } from "../lib/api";
import type { DemoStory } from "../lib/api";
import { addEntry, listEntries, removeEntry } from "../lib/timeline";
import { t } from "../lib/strings";
import type { Entry } from "../types/api";

/** Our own key. The timeline keeps its own, and we never write to it. */
const KEY = "vividia.demo.v1";

/** The sentence the judge presses send on, ready for the writing screen. */
export interface DemoDraft {
  /** Exactly as the story wrote it; the screen must not alter it. */
  text: string;
  /** The persona's language, so the writing screen translates from the right one. */
  lang: string;
  /** Why this sentence was chosen. Team-facing, not for a child's screen. */
  why?: string;
}

/** What a loaded demo leaves behind, enough to undo it after a page reload. */
export interface DemoSession {
  persona: DemoStory["persona"];
  draft: DemoDraft;
  /** Suggestions only. The child still chooses, and still shows it themselves. */
  handoff?: DemoStory["handoff"];
  /** Local timeline ids this demo created, so only these are removed again. */
  seededIds: string[];
  /** ISO timestamp, for a screen that wants to say when the example was loaded. */
  loadedAt: string;
}

export interface DemoLoadResult {
  session: DemoSession;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let storage: StorageLike | null = defaultStorage();
let memory: DemoSession | null = null;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // blocked site data can throw on the getter itself
  }
}

/**
 * For tests, or when storage is switched off. `null` keeps the marker in
 * memory, so the demo still loads and still clears within one visit; it just
 * cannot be undone after a reload.
 */
export function useDemoStorage(next: StorageLike | null): void {
  storage = next;
  memory = null;
}

function isSession(value: unknown): value is DemoSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const draft = v.draft as Record<string, unknown> | undefined;
  return (
    typeof v.persona === "object" &&
    v.persona !== null &&
    typeof draft === "object" &&
    draft !== null &&
    typeof draft.text === "string" &&
    typeof draft.lang === "string" &&
    Array.isArray(v.seededIds) &&
    v.seededIds.every((id) => typeof id === "string")
  );
}

function readSession(): DemoSession | null {
  if (!storage) return memory;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // A damaged marker must not strand anyone in demo state: treat it as no
    // demo rather than throwing, and let them clear the timeline by hand.
    return isSession(parsed) ? parsed : null;
  } catch {
    return memory;
  }
}

function writeSession(session: DemoSession | null): void {
  memory = session;
  if (!storage) return;
  try {
    if (session === null) storage.removeItem(KEY);
    else storage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Keep going in memory. The demo still works for this visit, which is the
    // whole of what a judge needs.
  }
}

/** The demo currently loaded in this browser, or null. */
export function activeDemo(): DemoSession | null {
  return readSession();
}

export function isDemoLoaded(): boolean {
  return readSession() !== null;
}

/**
 * timeline.ts drops a stored entry whose five required fields are not all
 * strings. A story entry missing one would therefore vanish *after* being
 * saved, and the judge would see a short timeline with no error anywhere. So
 * we check the same five fields here and fail loudly instead.
 */
function isUsableEntry(entry: unknown): entry is Entry {
  if (typeof entry !== "object" || entry === null) return false;
  const v = entry as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    typeof v.mood === "string" &&
    typeof v.text_child === "string" &&
    typeof v.text_de === "string"
  );
}

/**
 * A broken or unexpected story is our bug, so the person sees one calm
 * sentence in their own language and never a parse error. Reusing ApiError
 * means the button has exactly one error path.
 */
function brokenStory(lang: string): ApiError {
  return new ApiError("internal", t("errors.generic", lang), false);
}

/**
 * Refused because this browser already holds somebody's own entries.
 *
 * Not an error in our code, but it travels the error path on purpose: a
 * caller can read a boolean and carry on regardless, which is exactly what
 * happened here before, and cannot ignore a throw. `ownEntriesKept` was
 * computed and then seeded over.
 *
 * `retryable` is false: pressing again will not help, and the person has to
 * decide to clear their own timeline first.
 */
function notOnTopOfRealEntries(lang: string): ApiError {
  return new ApiError("invalid_input", t("demo.notLoadedOwnNotes", lang), false);
}

/**
 * Turn a story into the app state it describes.
 *
 * Split out from `loadDemo` so it can be tested, and so a caller that already
 * has the story (an offline build, a fixture) can seed without a fetch.
 *
 * Seeds the timeline with the story's entries, which `demo_story.json` states
 * are already approved by the persona, so `addEntry` is the right door: it is
 * for entries a child has approved. Nothing is translated or reworded.
 */
export function seedFromStory(story: DemoStory, lang?: string): DemoLoadResult {
  const messageLang = lang ?? story?.persona?.child_lang ?? "en";
  const live = story?.live_message;
  if (!story?.persona || typeof live?.text !== "string" || !live.text.trim()) {
    throw brokenStory(messageLang);
  }

  const entries = Array.isArray(story.timeline) ? story.timeline : [];
  if (!entries.every(isUsableEntry)) throw brokenStory(messageLang);

  // Pressing the button twice must not double the timeline, and must not
  // orphan the first run's entries with no way to remove them. Done before
  // the check below so a previous run of the example does not read as the
  // child's own writing.
  clearDemo();

  // The example is never written on top of somebody's own entries.
  //
  // Amara's incidents are fiction. A timeline holding both is the source for
  // the report, the handoff card and the follow-ups, so a made-up incident
  // could reach a real teacher in a real child's name. The button is visible
  // to everyone, not only judges, and a curious child will press it.
  //
  // Judges lose nothing: they open the demo in a fresh browser.
  if (listEntries().length > 0) {
    throw notOnTopOfRealEntries(messageLang);
  }

  const seededIds = entries.map((entry) => addEntry(entry).id);

  const session: DemoSession = {
    persona: story.persona,
    draft: {
      text: live.text,
      lang: story.persona.child_lang || "en",
      why: live.why,
    },
    handoff: story.handoff,
    seededIds,
    loadedAt: new Date().toISOString(),
  };
  writeSession(session);
  return { session };
}

/**
 * Fetch GET /api/demo and seed from it.
 *
 * `lang` only decides which language an error sentence comes back in; the
 * story itself is one fixed persona who writes in her own language.
 */
export async function loadDemo(lang = "en"): Promise<DemoLoadResult> {
  const story = await fetchStory(lang);
  return seedFromStory(story, lang);
}

/**
 * Take the demo back out: remove the entries it added, forget the marker.
 *
 * Only the ids this module created are removed, so a child's own entries
 * survive a judge pressing this. Safe to call when no demo is loaded.
 */
export function clearDemo(): void {
  const session = readSession();
  if (!session) return;
  for (const id of session.seededIds) removeEntry(id);
  writeSession(null);
}
