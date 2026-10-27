/**
 * Step two: the handoff card.
 *
 * The card is a thing the child holds up to a person. The app does not deliver
 * it, email it, notify anyone or offer to: there is no send button here and
 * there must never be one. CLAUDE.md, "no alert behind the child's back".
 * The screen no longer says "nothing gets sent" (Neel, 26 Oct: a child does
 * not understand it); the onboarding card says the app tells nobody.
 *
 * Who may be suggested is not decided here. It comes from
 * `suggestedAdults(where)`, which is the only place the child's answer to
 * "where does this happen?" turns into people. Do not add a conditional to
 * this markup - that is exactly the mistake that file exists to prevent.
 *
 * This screen speaks only the child's language (issue #3). The German is one
 * tap away on the big card that comes next (`HandoffShow`), where the adult
 * chooses the language they read.
 */

import {
  familyExcluded,
  primarySuggestion,
  suggestedAdults,
  type AdultId,
  type WhereItHappens,
} from "./HandoffSuggestions.ts";
import { t } from "../lib/strings.ts";
import { AdultPicture } from "../art/People.tsx";
import type { Entry, ReportResponse } from "../types/api.ts";
import type { EntrySource } from "../lib/timeline.ts";
import SourceMark from "./SourceMark.tsx";

export interface HandoffCardProps {
  /** The child's saved entries: what the card shows, in their language. */
  entries?: readonly (Entry & { source?: EntrySource })[];
  lang: string;
  /** The child's answer. Everything on this card is derived from it. */
  where: WhereItHappens;
  /** Who the child picked; null means the card's own suggestion still stands. */
  chosen: AdultId | null;
  onChoose: (adult: AdultId) => void;
  /** The report the child already approved, word by word, in step 3. */
  report: ReportResponse | null;
  /** True while that report is still being built. */
  loading: boolean;
  /** Already child-safe text (`ApiError.messageChild`), or null. */
  error: string | null;
  onRetry: (() => void) | null;
}

export default function HandoffCard({
  entries = [],
  lang,
  where,
  chosen,
  onChoose,
  report,
  loading,
  error,
  onRetry,
}: HandoffCardProps) {
  const options = suggestedAdults(where);
  // The screen suggests one adult. Until the child picks, the card leads with
  // that suggestion rather than showing an empty recipient - a card with a
  // blank "show this to" line reads as broken, and the child can change it
  // with one tap below.
  const suggestion = primarySuggestion(where);
  const recipient = options.find((option) => option.id === chosen) ?? suggestion;

  return (
    <section aria-labelledby="handoff-title" className="flex flex-col gap-4">
      <h2 id="handoff-title" className="headline text-3xl text-balance">
        {t("handoff.title", lang)}
      </h2>

      {/* The promise, before any choice is made. Never collapse or move this
          below the fold: it is the one sentence that tells the child the app
          has not already told someone. */}

      {/*
        Why family is missing, in words for a child. Rendered from
        `familyExcluded(where)`, the same table that removes the option, so the
        list and the explanation cannot disagree. No judgement about anyone at
        home is made or implied.
      */}
      {familyExcluded(where) && (
        <p className="rounded-card border border-line bg-surface px-4 py-3 text-base text-ink-soft">
          {t("handoff.homeNote", lang)}
        </p>
      )}

      {/* Picture tiles, two by two: chunky people drawn for this app
          (art/People.tsx). The picture is decoration; the label is the
          answer. Only the child's language here (issue #3): the German name
          of the role is on the big card, behind its language switch. */}
      <div role="radiogroup" aria-labelledby="handoff-title" className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const checked = recipient?.id === option.id;
          return (
            <label
              key={option.id}
              className={`squish relative flex cursor-pointer flex-col items-center gap-1 rounded-card border-[3px] border-ink p-2 text-center text-base font-bold text-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-3 ${
                checked ? "bg-calm-soft" : "bg-surface"
              }`}
            >
              <input
                type="radio"
                name="handoff-adult"
                value={option.id}
                checked={checked}
                onChange={() => onChoose(option.id)}
                className="sr-only"
              />
              {checked && (
                <span aria-hidden="true" className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-sm text-page">
                  ✓
                </span>
              )}
              <AdultPicture id={option.id} className="h-24 w-full" />
              <span>{t(option.labelKey, lang)}</span>
            </label>
          );
        })}
      </div>

      {/* The card the child holds up. */}
      <article className="flex flex-col gap-3 rounded-card border-[3px] border-ink bg-surface p-4">
        {recipient && (
          <header className="flex flex-col gap-0.5 border-b border-line pb-3">
            <span className="text-sm text-ink-soft">{t("handoff.showTo", lang)}</span>
            <span className="text-lg font-semibold">{t(recipient.labelKey, lang)}</span>
          </header>
        )}

        {/*
          The gap this comment used to describe is closed. `GET /api/guide`,
          `GuideResponse` and `guide()` all exist now, and the adult's short
          sourced guide renders on `HandoffShow` - deliberately not here.

          This screen is the child choosing who to show, and it speaks only
          their language. The guide is addressed to the adult, in the
          language the adult is reading, so it belongs beside the big card
          behind the same language switch. See `AdultGuide.tsx`.
        */}

        {loading && (
          <p aria-live="polite" className="text-base text-ink-soft">
            {t("handoff.preparing", lang)}
          </p>
        )}

        {!loading && error && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-base text-ink">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-tap rounded-card border border-calm px-4 text-base font-medium text-calm"
              >
                {t("handoff.retry", lang)}
              </button>
            )}
          </div>
        )}

        {!loading && !error && entries.length === 0 && !report && (
          // Nothing approved yet.
          <p className="text-base text-ink-soft">{t("timeline.empty", lang)}</p>
        )}

        {/* The child's own approved words, in their language only. The
            model-written report is the fallback when there are no entries. */}
        {!loading && !error && entries.length > 0 && (
          <ol className="flex flex-col gap-2">
            {entries.map((entry, index) => (
              <li key={`${entry.date}-${index}`} className="flex flex-col items-start gap-1">
                <SourceMark source={entry.source} lang={lang} />
                <span className="whitespace-pre-wrap text-base text-ink">{entry.text_child}</span>
              </li>
            ))}
          </ol>
        )}

        {!loading && !error && entries.length === 0 && report && (
          <p className="whitespace-pre-wrap text-base text-ink">{report.child_version}</p>
        )}
      </article>
    </section>
  );
}
