/**
 * One moment in the child's timeline, as the child sees it.
 *
 * The child's own words come first and the German sits underneath, because
 * this screen belongs to the child: the German is what an adult would read,
 * not the authoritative version of what happened.
 *
 * The mood is rendered here and nowhere else. `lib/moods.ts` is explicit about
 * why: *"a feeling-label printed next to a factual entry invites a reader to
 * treat it as an assessment. It belongs in the child's own view of their
 * timeline, where they put it."* So it appears in this card and never in
 * `Report.tsx`.
 */

import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";
import type { StoredEntry } from "../lib/timeline";
import { moodEmoji, moodLabel } from "../lib/moods";
import SourceMark from "./SourceMark";

interface Props {
  entry: StoredEntry;
  lang: Lang;
  onDelete: (id: string) => void;
}

/**
 * `Entry.date` is a plain calendar day ("2026-10-21") with no time in it, so
 * it is formatted in UTC.
 *
 * `new Date("2026-10-21")` is parsed as UTC midnight; formatting that in any
 * timezone behind UTC prints the 20th. A record of what happened on which day
 * is the last place in this app to be off by one, and a child showing it to a
 * teacher would be the one contradicted.
 *
 * An unreadable date falls back to the stored string. Ugly, but it shows what
 * is actually saved instead of "Invalid Date".
 */
function formatDay(iso: string, lang: Lang): string {
  const parsed = new Date(iso.includes("T") ? iso : `${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  try {
    return parsed.toLocaleDateString(lang, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export default function TimelineEntryCard({ entry, lang, onDelete }: Props) {
  const day = formatDay(entry.date, lang);
  const emoji = moodEmoji(entry.mood);

  return (
    <li className="rounded-card border-[2.5px] border-ink bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink-soft">{day}</p>
          {/* The emoji is decoration over the word, never instead of it: a
              screen reader and a child who does not read the face both get
              the label. */}
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            {emoji ? <span aria-hidden="true">{emoji}</span> : null}
            <span>{moodLabel(entry.mood, lang)}</span>
          </p>
        </div>

        {/* The accessible name carries the date, so a screen reader user moving
            through a list of "Delete" buttons knows which day they are on. */}
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          aria-label={`${t("timeline.delete", lang)} — ${day}`}
          className="min-h-tap shrink-0 rounded-full border-2 border-help bg-surface px-3 text-sm font-bold text-help"
        >
          {t("timeline.delete", lang)}
        </button>
      </div>

      <div className="mt-3">
        <SourceMark source={entry.source} lang={lang} />
      </div>
      <p lang={lang} className="mt-2 whitespace-pre-wrap text-base">
        {entry.text_child}
      </p>

      {/* Child's language only (issue #3). The German is kept with the entry
          and shown on the card the child shows an adult, behind its switch. */}

      {/* Shown only when the child actually filled them in. Dropping details
          they chose to record would be a silent edit of their own account. */}
      {entry.place || entry.people ? (
        <dl className="mt-3 flex flex-col gap-1 text-sm text-ink-soft">
          {entry.place ? (
            <div className="flex gap-2">
              <dt className="font-medium">{t("timeline.where", lang)}</dt>
              <dd lang={lang}>{entry.place}</dd>
            </div>
          ) : null}
          {entry.people ? (
            <div className="flex gap-2">
              <dt className="font-medium">{t("timeline.who", lang)}</dt>
              <dd lang={lang}>{entry.people}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </li>
  );
}
