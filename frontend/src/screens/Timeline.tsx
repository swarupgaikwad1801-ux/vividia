/**
 * Step 3a of the journey: the child's own record of what happened.
 *
 * Everything on this screen is already theirs. `lib/timeline.ts` only ever
 * holds entries the child approved on the write screen, so this screen never
 * generates, summarises or interprets anything — it lists, and it deletes.
 *
 * ## What this screen promises, and what it must not
 *
 * `CLAUDE.md` allows exactly one sentence about where this data lives: *"the
 * timeline is stored only in the child's browser, and the child can delete
 * it."* It forbids *"everything stays on your device"*, because the German in
 * each entry was written by a model in the cloud. So the note here is scoped
 * to **this list**, in those words, and the sentence about words leaving the
 * phone lives on the report screen, next to the button that sends them.
 *
 * Nothing here contacts the network, and nothing here reaches an adult. There
 * is no share, no send, no "we have told someone". The only way out of this
 * screen towards another person is `onBuildReport`, which is a button the
 * child presses.
 *
 * ## States
 *
 * - **empty**: `timeline.empty`.
 * - **blocked storage**: `timeline.notPersistent`, shown as a warning rather
 *   than hidden, because the child is about to lose their words and deserves
 *   to know before they close the tab and not after.
 * - **normal**: the entries oldest first, which is how a sequence of incidents
 *   reads as a sequence.
 * - **confirming a delete-all**: in `TimelineDeleteAll`, in the page.
 *
 * There is no loading state: reading the timeline is a synchronous read of
 * browser storage, and faking a spinner over it would be theatre. There is no
 * error state either; `lib/timeline.ts` degrades to memory and reports that
 * through `isPersistent()`, which is the warning above.
 */

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";
import type { StoredEntry } from "../lib/timeline";
import { isPersistent, listEntries, removeEntry, restoreEntry } from "../lib/timeline";
import { forgetEverything } from "../lib/forgetEverything";
import PinRemovedNotice from "../components/PinRemovedNotice";
import TimelineDeleteAll from "../components/TimelineDeleteAll";
import TimelineEntryCard from "../components/TimelineEntryCard";
import LastFourWeeks from "../components/LastFourWeeks";
import { pinStatus } from "../lib/pin";

export interface TimelineProps {
  lang: Lang;
  /**
   * The child pressed "make a report from this". Optional so the screen can be
   * mounted on its own; without it the button is not shown, because a button
   * that goes nowhere is worse than no button.
   */
  onBuildReport?: () => void;
  /**
   * The child wants to set or change the PIN.
   *
   * It lives here because this is the screen about their own stored words -
   * the same screen that carries "delete everything" and the notice saying a
   * PIN was removed. Until this existed, `PinSet` was mounted in `App.tsx` and
   * nothing ever navigated to it, so a child could not set a PIN at all and
   * the lock could never engage. Same rule as `onBuildReport`: no callback,
   * no button.
   */
  onSetPin?: () => void;
}

export default function Timeline({ lang, onBuildReport, onSetPin }: TimelineProps) {
  // Read once on mount and after every change. `listEntries()` is called
  // before `isPersistent()` because a failed read is what flips that flag.
  const [entries, setEntries] = useState<StoredEntry[]>(() => listEntries());
  const [persistent, setPersistent] = useState<boolean>(() => isPersistent());
  const [status, setStatus] = useState("");

  const refresh = useCallback(() => {
    setEntries(listEntries());
    setPersistent(isPersistent());
  }, []);

  // The entry just deleted, for Undo. Deleted at once (so Leave now right
  // after leaves nothing behind); Undo puts it back as it was. An undo bar
  // rather than "Are you sure?": people click through confirmations
  // without reading them (GNOME HIG, "always provide an undo").
  const [undoable, setUndoable] = useState<StoredEntry | null>(null);
  useEffect(() => {
    if (!undoable) return;
    const id = setTimeout(() => setUndoable(null), 10_000);
    return () => clearTimeout(id);
  }, [undoable]);

  const deleteOne = useCallback(
    (id: string) => {
      setUndoable(entries.find((entry) => entry.id === id) ?? null);
      removeEntry(id);
      setStatus(""); // the list visibly shrinks; a second announcement is noise
      refresh();
    },
    [entries, refresh],
  );

  const undo = useCallback(() => {
    if (undoable) restoreEntry(undoable);
    setUndoable(null);
    refresh();
  }, [undoable, refresh]);

  const deleteEverything = useCallback(() => {
    // Not clearAll(): that empties the timeline and leaves the check-in
    // schedule, the handoff record and the note about the PIN behind. A
    // child who pressed this was told everything was gone while the app
    // still remembered that they had taken a report to a teacher.
    // forgetEverything() is the one place that knows the full list.
    forgetEverything();
    setUndoable(null);
    setStatus(t("timeline.deletedAll", lang));
    refresh();
  }, [lang, refresh]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-5 px-4 py-8">
      {/* If someone removed the PIN without knowing it, this is where the
          child finds out. On the timeline because that is the screen they
          open to see their own words - the place they would notice. */}
      <PinRemovedNotice lang={lang} />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">{t("timeline.title", lang)}</h1>
        {/* Only ever a claim about this list. Never about the whole app. */}
        {persistent ? (
          <p className="text-sm text-ink-soft">{t("timeline.storageNote", lang)}</p>
        ) : (
          <p className="rounded-card border border-help bg-help-soft p-3 text-sm font-medium text-help">
            {t("timeline.notPersistent", lang)}
          </p>
        )}
      </header>

      {/* Announces the one change a child cannot see the result of, because
          after a delete-all there is nothing left on screen to look at. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {undoable && (
        <div role="status" className="animate-pop-in flex items-center justify-between gap-3 rounded-full border-[2.5px] border-ink bg-ink py-1 pr-1 pl-4 text-page">
          <span className="text-base font-bold">{t("timeline.deletedOne", lang)}</span>
          <button
            type="button"
            onClick={undo}
            className="min-h-tap rounded-full bg-page px-4 text-base font-bold text-ink"
          >
            {t("timeline.undo", lang)}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="rounded-card border-[2.5px] border-ink bg-surface p-4 text-base text-ink-soft">
          {t("timeline.empty", lang)}
        </p>
      ) : (
        <>
          {/* Oldest first, from `listEntries()`: a pattern of incidents only
              reads as a pattern in the order it happened. */}
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <TimelineEntryCard key={entry.id} entry={entry} lang={lang} onDelete={deleteOne} />
            ))}
          </ul>

          {onBuildReport ? (
            <button
              type="button"
              onClick={onBuildReport}
              /* text-page, not text-white: in dark mode --color-calm is a
                 light teal and white on it is roughly 1.8:1. --color-page
                 flips with the theme, so this reads at ~5.8:1 in light and
                 ~7.7:1 in dark. */
              className="sticker min-h-tap rounded-full bg-calm px-4 text-base font-bold text-page motion-safe:active:translate-y-1 active:shadow-none"
            >
              {t("timeline.buildReport", lang)}
            </button>
          ) : null}
        </>
      )}

      {/* Below the child's own words (review, 28 Oct: the 28-day grid sat
          above them). Outside the "has entries" branch: coming back counts
          even on a day nothing was saved. */}
      <LastFourWeeks entries={entries} lang={lang} />

      {/* Outside the "has entries" branch on purpose: a child may want the
          lock on before there is anything to lock, and setting it up first is
          the sensible order, not an edge case. Quiet styling - it is a setting,
          not a step in the journey. */}
      {onSetPin ? (
        <button
          type="button"
          onClick={onSetPin}
          className="sticker min-h-tap self-start rounded-full bg-surface px-4 text-base font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
        >
          {t(pinStatus() === "set" ? "pin.set.titleChange" : "pin.set.title", lang)}
        </button>
      ) : null}

      {/* At the very bottom, far from Make a card (review, 28 Oct: it sat
          right under it), and visually quiet: it is the child's to use, not a
          thing to reach for by accident while reading. */}
      {entries.length > 0 && <TimelineDeleteAll lang={lang} onConfirm={deleteEverything} />}
    </main>
  );
}
