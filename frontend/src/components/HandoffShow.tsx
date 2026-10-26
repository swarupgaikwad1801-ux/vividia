/**
 * The card, big, for the child to hold up to the person they chose.
 *
 * The end of step 4 (issue #3: handoff was a dead end). It shows only what the
 * child already approved word by word on the card screen: the German first,
 * because that is what the adult reads, then the child's own words. Nothing
 * new is written, translated or sent here; the child shows the phone.
 *
 * The heading is in the child's language ("Show this to them"). The person's
 * role is printed in German too, so the adult sees at once who the card is
 * for. The switch that lets the adult pick the language they read in is a
 * separate piece of work (issue #3).
 */

import { primarySuggestion, suggestedAdults, type AdultId, type WhereItHappens } from "./HandoffSuggestions.ts";
import { t } from "../lib/strings.ts";
import type { ReportResponse } from "../types/api.ts";

export interface HandoffShowProps {
  lang: string;
  report: ReportResponse;
  where: WhereItHappens;
  /** Who the child picked; null means the card's own suggestion stands. */
  chosen: AdultId | null;
  onDone: () => void;
}

export default function HandoffShow({ lang, report, where, chosen, onDone }: HandoffShowProps) {
  // The same rule as HandoffCard, so the big card names the person the small
  // one did.
  const recipient = suggestedAdults(where).find((option) => option.id === chosen) ?? primarySuggestion(where);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        <span aria-hidden="true">👀 </span>
        {t("handoff.showThem", lang)}
      </h1>

      <article className="flex flex-col gap-5 rounded-card border-2 border-calm bg-surface p-5">
        {recipient && (
          <p lang="de" className="text-base font-medium text-ink-soft">
            {t(recipient.labelKey, "de")}
          </p>
        )}
        <p lang="de" className="whitespace-pre-wrap text-xl leading-relaxed text-ink">
          {report.german_version}
        </p>
        {lang !== "de" && (
          <div className="flex flex-col gap-1 border-t border-line pt-4">
            <h2 className="text-sm font-medium text-ink-soft">{t("handoff.yourWords", lang)}</h2>
            <p className="whitespace-pre-wrap text-base text-ink">{report.child_version}</p>
          </div>
        )}
      </article>

      <button
        type="button"
        onClick={onDone}
        // text-page, not text-white: --color-calm is a light teal in dark
        // mode, where white falls below the 4.5:1 floor.
        className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page transition-colors hover:bg-calm-strong"
      >
        {/* Says what the child did, not "Done": the next screen has Done.
            Nothing is recorded by pressing it. */}
        {t("ladder.markShown", lang)}
      </button>
    </main>
  );
}
