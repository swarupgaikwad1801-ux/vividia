/**
 * The card, big, for the child to hold up to the person they chose.
 *
 * The end of step 4 (issue #3: handoff was a dead end).
 *
 * ## What is on it: the child's own entries
 *
 * Each entry is a sentence the child wrote and approved word by word on the
 * writing screen, with its German. That is the most faithful thing the app
 * has: no summary rewrites it. The model-written report from step 3 is used
 * only when there are no entries to show (e.g. the demo story). Nothing new
 * is written, translated or sent here; the child shows the phone.
 *
 * ## One language at a time
 *
 * The card starts in the child's language. "Auf Deutsch" is one tap away for
 * the adult (`CardLanguageSwitch`). This is the only place outside the
 * writing screen where German appears (issue #3).
 */

import { useState } from "react";

import CardLanguageSwitch from "./CardLanguageSwitch.tsx";
import { SparkleBurst } from "../art/Things.tsx";
import { primarySuggestion, suggestedAdults, type AdultId, type WhereItHappens } from "./HandoffSuggestions.ts";
import { formatDay } from "../lib-followups-ui/dates.ts";
import { t } from "../lib/strings.ts";
import type { Entry, ReportResponse } from "../types/api.ts";

export interface HandoffShowProps {
  lang: string;
  /** The child's saved entries, oldest first. */
  entries: readonly Entry[];
  /** Fallback when there are no entries. */
  report: ReportResponse | null;
  where: WhereItHappens;
  /** Who the child picked; null means the card's own suggestion stands. */
  chosen: AdultId | null;
  onDone: () => void;
}

export default function HandoffShow({ lang, entries, report, where, chosen, onDone }: HandoffShowProps) {
  const [showing, setShowing] = useState(lang);
  const german = showing === "de";

  // The same rule as HandoffCard, so the big card names the person the small
  // one did.
  const recipient = suggestedAdults(where).find((option) => option.id === chosen) ?? primarySuggestion(where);

  return (
    <main className="relative mx-auto flex w-full max-w-sm flex-col gap-5 px-4 py-6">
      {/* "You did it", once, as the card appears. Not "you won": no score,
          no sound, and nothing at all with reduced motion. */}
      <SparkleBurst />

      <h1 className="text-3xl text-balance">{t("handoff.showThem", lang)}</h1>

      <CardLanguageSwitch lang={lang} showing={showing} onChange={setShowing} />

      <article
        lang={showing}
        className="animate-pop-in flex flex-col gap-4 rounded-card border-[3px] border-ink bg-surface p-5 shadow-[6px_6px_0_0_#1B1B2F]"
      >
        {recipient && (
          <p className="text-base font-medium text-ink-soft">{t(recipient.labelKey, showing)}</p>
        )}

        {entries.length > 0 ? (
          <ol className="flex flex-col gap-4">
            {entries.map((entry, index) => (
              <li key={`${entry.date}-${index}`} className="flex flex-col gap-1">
                <span className="text-sm text-ink-soft">{formatDay(entry.date, showing)}</span>
                <p className="whitespace-pre-wrap text-xl leading-relaxed text-ink">
                  {german ? entry.text_de : entry.text_child}
                </p>
              </li>
            ))}
          </ol>
        ) : report ? (
          <p className="whitespace-pre-wrap text-xl leading-relaxed text-ink">
            {german ? report.german_version : report.child_version}
          </p>
        ) : null}
      </article>

      <button
        type="button"
        onClick={onDone}
        // text-page, not text-white: --color-calm is a light teal in dark
        // mode, where white falls below the 4.5:1 floor.
        className="squish min-h-tap rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong"
      >
        {/* Says what the child did, not "Done": the next screen has Done.
            Nothing is recorded by pressing it. */}
        {t("ladder.markShown", lang)}
      </button>
    </main>
  );
}
