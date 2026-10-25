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

import { useCallback, useState } from "react";
import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";
import type { StoredEntry } from "../lib/timeline";
import { clearAll, isPersistent, listEntries, removeEntry } from "../lib/timeline";
import TimelineDeleteAll from "../components/TimelineDeleteAll";
import TimelineEntryCard from "../components/TimelineEntryCard";
import { tPending } from "../components/TimelinePendingStrings";

export interface TimelineProps {
  lang: Lang;
  /**
   * The child pressed "make a report from this". Optional so the screen can be
   * mounted on its own; without it the button is not shown, because a button
   * that goes nowhere is worse than no button.
   */
  onBuildReport?: () => void;
}

export default function Timeline({ lang, onBuildReport }: TimelineProps) {
  // Read once on mount and after every change. `listEntries()` is called
  // before `isPersistent()` because a failed read is what flips that flag.
  const [entries, setEntries] = useState<StoredEntry[]>(() => listEntries());
  const [persistent, setPersistent] = useState<boolean>(() => isPersistent());
  const [status, setStatus] = useState("");

  const refresh = useCallback(() => {
    setEntries(listEntries());
    setPersistent(isPersistent());
  }, []);

  const deleteOne = useCallback(
    (id: string) => {
      removeEntry(id);
      setStatus(""); // the list visibly shrinks; a second announcement is noise
      refresh();
    },
    [refresh],
  );

  const deleteEverything = useCallback(() => {
    clearAll();
    setStatus(tPending("timeline.deletedAll", lang));
    refresh();
  }, [lang, refresh]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-5 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("timeline.title", lang)}</h1>
        {/* Only ever a claim about this list. Never about the whole app. */}
        {persistent ? (
          <p className="text-sm text-ink-soft">{tPending("timeline.storageNote", lang)}</p>
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

      {entries.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-4 text-base text-ink-soft">
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

          <div className="flex flex-col gap-3">
            {onBuildReport ? (
              <button
                type="button"
                onClick={onBuildReport}
                /* text-page, not text-white: in dark mode --color-calm is a
                   light teal and white on it is roughly 1.8:1. --color-page
                   flips with the theme, so this reads at ~5.8:1 in light and
                   ~7.7:1 in dark. */
                className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page"
              >
                {tPending("timeline.buildReport", lang)}
              </button>
            ) : null}
            {/* Last, and visually quiet: it is the child's to use, not a thing
                to reach for by accident while reading. */}
            <TimelineDeleteAll lang={lang} onConfirm={deleteEverything} />
          </div>
        </>
      )}
    </main>
  );
}
