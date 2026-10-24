/**
 * Getting off this screen fast, when someone walks in.
 *
 * A child using this app may be in a room with the person they are writing
 * about. The quick exit has one job: the current page stops being the app, in
 * well under a second, and pressing Back does not bring it returning.
 *
 * ## What it does NOT do, and must never be described as doing
 *
 * **It does not erase browser history.** It cannot. A page cannot delete the
 * entries around it, and `location.replace()` only avoids *adding* one: it
 * swaps the current entry instead of pushing a new one, so Back goes to
 * whatever came before the app rather than to the app. Everything visited
 * before that is still in history, still in the browser's own UI, and still
 * in any synced account.
 *
 * `CLAUDE.md`, the privacy rules: *"quick exit leaves the page; it does not
 * erase browser history, and the UI must not imply that it does."* So the
 * screen offering this must not say "clears your tracks", "hides this from
 * your phone", or anything a child could read as that promise. Say what is
 * true: this leaves the page and does not go back to it.
 *
 * It also does not clear the saved timeline, deliberately. Quick exit is for
 * being interrupted, and a child who gets interrupted has not decided to
 * delete their work. Deleting is its own, deliberate action elsewhere.
 *
 * ## Where it goes
 *
 * Somewhere dull and plausible, that a child could be looking at for any
 * reason, and which does not itself look like an escape. A weather search is
 * the default for that reason. It must not be a page that reveals the app by
 * being an obvious cover.
 */

/** Where the browser lands. Plausible, dull, and nothing to do with this app. */
export const NEUTRAL_URL = "https://www.google.com/search?q=weather";

/** How many Escape presses, and within how long, trigger the exit. */
export const ESCAPE_COUNT = 3;
export const ESCAPE_WINDOW_MS = 1500;

/**
 * Move between the app's own screens WITHOUT adding a history entry.
 *
 * `replace()` in quickExit only swaps the entry the child is on. If moving
 * from check-in to writing had pushed an entry (React Router's default
 * `navigate()` and `<Link>` both do), history would read
 * `[before-app, /checkin, /write]`, the exit would replace `/write`, and Back
 * would land on `/checkin`: inside the app, the one thing this module
 * promises cannot happen.
 *
 * So the rule is: **the app never pushes history.** Screens navigate through
 * this function, or the router is configured with `replace: true` on every
 * navigation. Then the app only ever owns one history entry, and quick exit
 * replaces that one.
 *
 * The cost is that the browser's Back button does not step between our
 * screens; each screen needs its own back control. For a child who may need
 * to leave fast, that is the right trade.
 */
export function go(path: string): void {
  try {
    globalThis.history?.replaceState(globalThis.history.state, "", path);
  } catch {
    // A history API that refuses (sandboxed frame) leaves the URL as it was;
    // the screen still changes, because routing state lives in the app.
  }
}

/**
 * A callback that drops in-memory state: the draft the child was typing, a
 * decrypted timeline, an unlocked PIN session. Registered by the screens that
 * hold such state.
 */
export type ClearState = () => void;

const clearers = new Set<ClearState>();

/**
 * Register something to drop when the exit fires.
 *
 * Returns an unregister function, so a screen can clean up when it unmounts
 * and a clearer for a screen nobody is on cannot run.
 */
export function onQuickExit(clear: ClearState): () => void {
  clearers.add(clear);
  return () => {
    clearers.delete(clear);
  };
}

/** Test seam: forget every registered clearer. */
export function resetQuickExit(): void {
  clearers.clear();
}

/**
 * Leave the app now.
 *
 * In-memory state is dropped first, so that if navigation is slow or blocked
 * the text is already gone from the page. A clearer that throws must not stop
 * the exit: leaving is the part that matters, and a child who pressed this is
 * waiting.
 */
export function quickExit(url: string = NEUTRAL_URL): void {
  for (const clear of [...clearers]) {
    try {
      clear();
    } catch {
      // Nothing to report to: the next line replaces this page.
    }
  }
  clearers.clear();

  // replace(), not assign(): assign() pushes a history entry, so Back would
  // come straight back to the disclosure the child just fled.
  globalThis.location?.replace(url);
}

/**
 * Press Escape three times quickly to leave.
 *
 * A visible button is the primary route and always has to exist; this is for
 * the child who has already learnt the shortcut and needs both hands free of
 * aiming at a target. Three presses rather than one, because a single Escape
 * is pressed by accident all the time and losing the screen mid-sentence
 * would be its own small punishment.
 *
 * Returns an unbind function.
 */
export function bindQuickExit(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener"> | undefined = globalThis.document,
  url: string = NEUTRAL_URL,
): () => void {
  if (!target) return () => {};

  let presses: number[] = [];

  const onKey = (event: Event): void => {
    const { key, repeat } = event as KeyboardEvent;
    // Holding a key down sends repeated keydowns. One long press on Escape
    // must not count as three separate ones, and a held letter must not
    // break a run either: only fresh presses count, in either direction.
    if (repeat) return;
    if (key !== "Escape") {
      // Any other key breaks the run, so three Escapes spread across normal
      // typing do not add up to an exit.
      presses = [];
      return;
    }
    const now = Date.now();
    presses = [...presses, now].filter((at) => now - at < ESCAPE_WINDOW_MS);
    if (presses.length >= ESCAPE_COUNT) {
      presses = [];
      quickExit(url);
    }
  };

  target.addEventListener("keydown", onKey);
  return () => target.removeEventListener("keydown", onKey);
}
