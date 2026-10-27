import type { StoredEntry } from "../lib/timeline";
import { fill, t } from "../lib/strings";

/**
 * The last four weeks at a glance, on the timeline: one square per day, the
 * days with something saved filled in.
 *
 * Bullying is repeated behaviour, and how often it happens is what a school
 * acts on; services that advise keeping a log say dates are the part people
 * forget (Kidscape's incident log; Contact, "keeping a record"). So this
 * shows dates and nothing else: no count of "bad days", no colour for mood,
 * no trend line and no conclusion. It describes the child's own list, never
 * the child.
 *
 * The grid is decoration (aria-hidden); the sentence under it says the same.
 */

const DAYS = 28;

/** "YYYY-MM-DD" in local time, matching how the date is shown. */
function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

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
  const marked = daysWithEntries(entries, days);
  if (marked.size === 0) return null;
  const today = days[days.length - 1];

  return (
    <section aria-labelledby="weeks-title" className="flex flex-col gap-2 rounded-card border-[2.5px] border-ink bg-surface p-4">
      <h2 id="weeks-title" className="text-base font-bold text-ink">{t("timeline.weeks", lang)}</h2>
      <ol aria-hidden="true" className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <li
            key={day}
            className={`aspect-square rounded-md border-2 ${
              marked.has(day) ? "border-ink bg-ink" : "border-line bg-surface"
            } ${day === today ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
          />
        ))}
      </ol>
      <p className="text-sm text-ink">{fill("timeline.weeksCount", lang, { n: marked.size })}</p>
      <p className="text-sm text-ink-soft">{t("timeline.weeksWhy", lang)}</p>
    </section>
  );
}
