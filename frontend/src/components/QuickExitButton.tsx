import { useEffect, type ReactNode } from "react";

import { NEUTRAL_URL, bindQuickExit, quickExit } from "../lib/quickExit";
import { t } from "../lib/strings";

/**
 * The way off this screen, reachable from every screen.
 *
 * Mount this ONCE in the shell, above whatever is routing, and it is available
 * everywhere. All of the behaviour lives in `lib/quickExit.ts`; this file is
 * the control and nothing else.
 *
 * ## Three decisions worth defending
 *
 * **No confirmation step.** CLAUDE.md's quality bar is "quick exit works in
 * under 1 s", and the child pressing this may have someone walking towards
 * them. `quickExit()` is synchronous: state clearers run, then
 * `location.replace()`. There is no await, no animation and no "are you sure",
 * so the page is gone in one frame. The cost of a mis-tap is coming back to
 * the app; the cost of a confirmation is the thing this button exists to
 * prevent. (`window.confirm` is also banned outright by the team rules,
 * because it freezes the automation QA runs.)
 *
 * **The history note lives elsewhere, once.** `quickExit.note` says this
 * closes the app and does *not* delete browser history: the exit cannot erase
 * history and a child must never read it as though it could. Neel removed it
 * from under the button (26 Oct): repeated on every screen it was noise. The
 * fact is kept where it is read once and on purpose: the "Leave now"
 * onboarding card, and the help on the PIN lock screen. The
 * label "Leave now" alone implies nothing about history, so it is honest by
 * itself (CLAUDE.md forbids implying erasure, not omitting the note).
 *
 * **Sticky, not fixed.** Sticky keeps the bar in the document flow, so it
 * cannot sit on top of a screen's own content or hide the last line of a text
 * area on a 360px phone. It stays on screen while scrolling, which is what
 * "reachable from anywhere" actually needs.
 *
 * ## For whoever wires this in
 *
 * - The Escape shortcut (three presses, `bindQuickExit`) is bound while this
 *   component is mounted. If the shell unmounts it — behind a PIN gate, for
 *   instance — the shortcut goes with it. Keep it mounted outside any gate.
 * - Screens must navigate with `go()` from `lib/quickExit.ts`, or with
 *   `replace: true`. The promise that Back does not return to the app only
 *   holds if the app never pushes a history entry.
 */
export interface QuickExitButtonProps {
  /** The child's language, for `lib/strings.ts`. */
  lang: string;
  /**
   * Shown to the left of Leave now in the same sticky bar: the red Need help
   * button. Leave now stays rightmost, where a thumb finds it.
   */
  beside?: ReactNode;
  /**
   * Where the browser lands. Defaults to the dull, plausible page
   * `lib/quickExit.ts` picked; a screen should almost never override it.
   */
  url?: string;
}

export default function QuickExitButton({ lang, url = NEUTRAL_URL, beside }: QuickExitButtonProps) {
  // Returns the unbind function, so the listener goes when the shell does.
  useEffect(() => bindQuickExit(document, url), [url]);

  return (
    // bg-scene: the bar takes the colour of the place it sits in (index.css),
    // so it stays readable when the page scrolls under it without looking
    // like a white box pasted on top.
    // No side padding of its own: the app's top row already has it, and at
    // 360px Back, Need help and Leave now need every pixel to stay on one line.
    <div className="sticky top-0 z-40 bg-scene py-2">
      <div className="mx-auto flex max-w-sm flex-col gap-1">
        {/* gap-3: room between the red Need help and Leave now, so a thumb
            reaching for one does not land on the other. */}
        <div className="flex items-center justify-end gap-3">
          {beside}
          <button
            type="button"
            onClick={() => quickExit(url)}
            // DangerDialog keeps this in its Tab cycle, so it stays reachable.
            data-quick-exit
            className="min-h-tap inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[3px] border-ink bg-surface px-3 text-base font-bold text-ink"
          >
            {/* An arrow out of a door, for a child who reads the shape faster
                than the word, or reads no German or English at all. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
              <path d="M16 8l4 4-4 4" />
              <path d="M20 12H10" />
            </svg>
            {t("quickExit.button", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
