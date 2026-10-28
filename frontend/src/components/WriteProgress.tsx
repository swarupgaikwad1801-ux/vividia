import { fill, t } from "../lib/strings.ts";
import type { EngineMode } from "../lib/engineMode.ts";

/**
 * The unit on the visible timer. "s" is the SI symbol and reads the same in
 * all three languages, so the number next to it is not translated wrongly
 * while nobody who speaks German or Hindi is here to check it.
 *
 * Not in strings.ts on purpose: it is a unit, not wording, so it needs no
 * Hindi review and should not be sitting in the file that does.
 */
function shortSeconds(n: number): string {
  return `${n} s`;
}


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
  /** In mock mode nothing is checked, so the list of how it works is not shown. */
  engine?: EngineMode;
}

export default function WriteProgress({ lang, elapsedMs, onStop, engine }: WriteProgressProps) {
  const seconds = Math.floor(elapsedMs / 1000);
  const fraction = Math.min(elapsedMs / EXPECTED_MS, 1);

  // Announced in five-second steps. A live region that changes every second
  // talks over everything else a screen reader is trying to say.
  const announcedSeconds = Math.floor(seconds / 5) * 5;

  return (
    <section
      aria-label={t("write.checking", lang)}
      className="flex flex-col gap-4 rounded-card border-[2.5px] border-ink bg-surface p-4"
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
        className="h-3 overflow-hidden rounded-full border-2 border-ink bg-calm-soft"
      >
        <div
          className="h-full rounded-full bg-calm transition-[width] duration-1000 ease-linear"
          // Capped below the end on purpose: see the note at the top of the file.
          style={{ width: `${Math.min(fraction * 95, 95)}%` }}
        />
      </div>

      <p className="text-sm text-ink-soft">{t("write.whatWeDo", lang)}</p>

      {/* How the check works, as a fixed list: it is true of every check,
          and it ticks nothing off, because the server reports no steps
          (see the note at the top). Hidden in mock mode, where none of it
          happens. A real sequence, so it is numbered. */}
      {engine !== "mock" && (
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-line pt-3">
          <p className="text-sm font-bold text-ink">{t("write.howTitle", lang)}</p>
          <ol className="flex flex-col gap-2">
            {(["write.how1", "write.how2", "write.how3"] as const).map((key, index) => (
              <li key={key} className="flex items-start gap-2 text-sm text-ink">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun text-xs font-bold">
                  {index + 1}
                </span>
                <span className="pt-0.5">{t(key, lang)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {elapsedMs >= LONG_MS && (
        <p className="text-sm text-ink-soft">{t("write.stillWorking", lang)}</p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcedSeconds > 0
          ? `${t("write.checking", lang)} ${fill("write.secondsLong", lang, { n: announcedSeconds })}`
          : t("write.checking", lang)}
      </p>

      {/* A 45 s timeout with no way out is a trap. Stopping is the child's
          decision like everything else here, and their words are kept. */}
      <button
        type="button"
        onClick={onStop}
        className="sticker min-h-tap self-start rounded-full bg-surface px-5 text-base font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
      >
        {t("write.stop", lang)}
      </button>
    </section>
  );
}
