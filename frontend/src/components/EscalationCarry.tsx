/**
 * "Your words go with you" — the part of the ladder that is the whole point.
 *
 * The reason a child stops after one adult is not only that the adult did
 * nothing. It is that the next door means starting the explanation again from
 * nothing, to a stranger, in a language that may not be theirs. So the ladder
 * shows them, before they decide anything, exactly what already exists: the
 * entries they wrote and approved, and the German that was checked with them
 * word by word. They do not have to produce any of it again.
 *
 * ## It shows, it does not package
 *
 * Nothing here re-translates, re-words, summarises or scores the entries. They
 * are rendered as the child approved them, which is the same rule
 * `engine/report.py` follows on the backend: no model may describe a child's
 * entry back at them. The German line is only shown when it actually differs
 * from what the child wrote, because for a child who writes German the two are
 * the same text and printing it twice would imply a translation happened.
 *
 * The mood is here because this is the child's own view of their timeline,
 * which is the only place `lib/moods.ts` says it belongs — it is deliberately
 * absent from the report an adult reads.
 */

import { moodEmoji, moodLabel } from "../lib/moods.ts";
import type { Entry } from "../types/api.ts";
import { says } from "../lib-followups-ui/copy.ts";
import { formatDay } from "../lib-followups-ui/dates.ts";
import { INTENT_KEY, type LadderIntent } from "../lib-followups-ui/ladder.ts";

export interface EscalationCarryProps {
  lang: string;
  /** The child's approved entries, as stored. Rendered, never rewritten. */
  entries: readonly Entry[];
  /** Navigation only: opens the child's full timeline. */
  onOpen: (intent: LadderIntent) => void;
}

const OPEN_TIMELINE: LadderIntent = { kind: "open-timeline" };

export default function EscalationCarry({ lang, entries, onOpen }: EscalationCarryProps) {
  return (
    <section
      aria-labelledby="carry-title"
      className="flex flex-col gap-2 rounded-card border border-calm-soft bg-calm-soft p-4"
    >
      <h2 id="carry-title" className="text-base font-semibold" {...says("ladder.carryTitle", lang)} />

      {entries.length === 0 ? (
        <p className="text-base text-ink-soft" {...says("ladder.carryNone", lang)} />
      ) : (
        <>
          <p className="text-sm text-ink-soft" {...says("ladder.carryWhy", lang)} />
          <ul className="flex flex-col gap-2">
            {entries.map((entry, index) => (
              // Entries have no stable id in the HTTP contract (`StoredEntry`
              // adds one locally, and this takes the plain `Entry` so a demo
              // story renders too), so the key is the position in a list that
              // is only ever re-rendered whole.
              <li
                key={`${entry.date}-${index}`}
                className="flex flex-col gap-0.5 border-t border-line pt-2 first:border-t-0 first:pt-0"
              >
                <p className="text-sm text-ink-soft">
                  <span aria-hidden="true">{moodEmoji(entry.mood)} </span>
                  {formatDay(entry.date, lang)}
                  <span className="sr-only"> {moodLabel(entry.mood, lang)}</span>
                </p>
                {/* Child's language only (issue #3). The German is on the
                    card itself, behind its language switch. */}
                <p className="text-base">{entry.text_child}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onOpen(OPEN_TIMELINE)}
            className="min-h-tap self-start text-base font-medium text-calm underline underline-offset-4"
            {...says(INTENT_KEY["open-timeline"], lang)}
          />
        </>
      )}
    </section>
  );
}
