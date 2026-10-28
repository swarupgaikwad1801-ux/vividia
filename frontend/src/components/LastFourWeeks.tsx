import type { StoredEntry } from "../lib/timeline";
import { dayKey, visitDays } from "../lib/visits";
import { fill, t } from "../lib/strings";

/**
 * "Days you came back": the last four weeks on the timeline, one square per
 * day. A filled square is a day the child opened the app; a dot inside is a
 * day they also saved something.
 *
 * Swarup, 28 Oct: show coming back as something achieved. It is counted,
 * never chained: there is no streak, no "days in a row", no badge and no
 * empty square drawn as a loss (index.css: no points, scores, streaks or
 * badges). For a child in a hard place, a missed day must never feel like
 * failing, so the note under it says so in words.
 *
 * The dots also keep what the grid was first for: dates are what a school
 * acts on (Kidscape's incident log; Contact, "keeping a record").
 *
 * The grid is decoration (aria-hidden); the sentences say the same.
 */

const DAYS = 28;

/** The last 28 days, oldest first, ending today. */
export function lastDays(today: Date = new Date()): string[] {
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    return dayKey(d);
  });
}

export function daysWithEntries(entries: readonly StoredEntry[], days: readonly string[]): Set<string> {
  const wanted = new Set(days);
  return new Set(entries.map((entry) => entry.date).filter((date) => wanted.has(date)));
}

export default function LastFourWeeks({ entries, lang }: { entries: readonly StoredEntry[]; lang: string }) {
  const days = lastDays();
  const inRange = new Set(days);
  const visited = new Set(visitDays().filter((d) => inRange.has(d)));
  const saved = daysWithEntries(entries, days);
  const today = days[days.length - 1];
  const n = visited.size;
  if (n === 0) return null;

  return (
    <section aria-labelledby="visits-title" className="flex flex-col gap-3 rounded-card border-[2.5px] border-ink bg-surface p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="visits-title" className="text-base font-bold text-ink">{t("visits.title", lang)}</h2>
          <p className="text-sm text-ink-soft">{fill("visits.count", lang, { n })}</p>
        </div>
        {/* The number, big: this is the thing worth noticing. */}
        <p aria-hidden="true" className="headline text-5xl leading-none text-ink tabular-nums">{n}</p>
      </div>

      <ol aria-hidden="true" className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <li
            key={day}
            className={`flex aspect-square items-center justify-center rounded-md border-2 ${
              visited.has(day) ? "border-ink bg-scene-deep" : "border-line bg-surface"
            } ${day === today ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
          >
            {saved.has(day) && <span className="size-2 rounded-full bg-ink" />}
          </li>
        ))}
      </ol>

      <p className="text-base font-bold text-ink">{t(n === 1 ? "visits.first" : "visits.some", lang)}</p>
      <p className="text-sm text-ink-soft">{t("visits.note", lang)}</p>
      {saved.size > 0 && <p className="text-sm text-ink-soft">{t("visits.savedKey", lang)}</p>}
    </section>
  );
}
