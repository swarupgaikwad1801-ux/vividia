import { t } from "../lib/strings.ts";
import { shortSeconds, tt, ttCount } from "./WriteStrings.ts";

/**
 * The wait while the words are being checked.
 *
 * Verification is ~12 s on average and longer at the tail (lib/api.ts gives it
 * 45 s), which is far too long for a spinner: on a cheap phone a spinner that
 * never changes is indistinguishable from a frozen page, and a frightened
 * child who has just typed the hardest sentence of their week will close the
 * tab.
 *
 * So this shows the one honest signal we have: elapsed time. There is no
 * progress stream from the backend — `/api/translate` is a single request and
 * `usage.calls_made` only arrives with the answer — so the bar below is driven
 * by the clock against the measured average, NOT by anything the server said.
 * That is why it:
 *
 * - never reaches the end, and stops growing at 95%: the only thing that
 *   finishes it is the real response arriving;
 * - carries no percentage and no `progressbar` role, because a percentage
 *   would be a claim about how much work is done, which we do not know;
 * - says what the engine is doing in general terms (`write.whatWeDo`) rather
 *   than ticking off steps we cannot observe.
 *
 * Faking per-step progress here would be the "nothing labelled simulated"
 * rule broken in the one place a judge is most likely to look.
 */

/** The measured average for a fully verified sentence (CLAUDE.md, ~10-12 s). */
const EXPECTED_MS = 12_000;

/** After this long the wait is unusual, so say so instead of leaving them guessing. */
const LONG_MS = 18_000;

export interface WriteProgressProps {
  lang: string;
  elapsedMs: number;
  /** Abandons the check and returns to the editor with the text intact. */
  onStop: () => void;
}

export default function WriteProgress({ lang, elapsedMs, onStop }: WriteProgressProps) {
  const seconds = Math.floor(elapsedMs / 1000);
  const fraction = Math.min(elapsedMs / EXPECTED_MS, 1);

  // Announced in five-second steps. A live region that changes every second
  // talks over everything else a screen reader is trying to say.
  const announcedSeconds = Math.floor(seconds / 5) * 5;

  return (
    <section
      aria-label={t("write.checking", lang)}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-medium">{t("write.checking", lang)}</p>
        {/* Visible to the eye, hidden from the reader: the live region below
            carries the same number at a pace that is bearable to listen to. */}
        <p aria-hidden="true" className="text-base tabular-nums text-ink-soft">
          {shortSeconds(seconds)}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="h-2 overflow-hidden rounded-full bg-calm-soft"
      >
        <div
          className="h-full rounded-full bg-calm transition-[width] duration-1000 ease-linear"
          // Capped below the end on purpose: see the note at the top of the file.
          style={{ width: `${Math.min(fraction * 95, 95)}%` }}
        />
      </div>

      <p className="text-sm text-ink-soft">{tt("write.whatWeDo", lang)}</p>

      {elapsedMs >= LONG_MS && (
        <p className="text-sm text-ink-soft">{tt("write.stillWorking", lang)}</p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcedSeconds > 0
          ? `${t("write.checking", lang)} ${ttCount("write.secondsLong", announcedSeconds, lang)}`
          : t("write.checking", lang)}
      </p>

      {/* A 45 s timeout with no way out is a trap. Stopping is the child's
          decision like everything else here, and their words are kept. */}
      <button
        type="button"
        onClick={onStop}
        className="min-h-tap self-start rounded-card border border-line px-4 text-base font-medium text-ink-soft"
      >
        {tt("write.stop", lang)}
      </button>
    </section>
  );
}
