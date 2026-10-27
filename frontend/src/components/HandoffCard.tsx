/**
 * Step two: the handoff card.
 *
 * The card is a thing the child holds up to a person. The app does not deliver
 * it, email it, notify anyone or offer to: there is no send button here and
 * there must never be one. CLAUDE.md, "no alert behind the child's back", and
 * `handoff.youDecide` says so on screen, directly under the title, where the
 * child reads it before they pick anyone.
 *
 * Who may be suggested is not decided here. It comes from
 * `suggestedAdults(where)`, which is the only place the child's answer to
 * "where does this happen?" turns into people. Do not add a conditional to
 * this markup - that is exactly the mistake that file exists to prevent.
 *
 * The role is also printed in German whenever the child is not reading German,
 * because the adult on the other side of the card reads German. That is the
 * argument of the whole product in one line: German support for children is
 * German-only, so the card has to carry German words the child can point at.
 */

import {
  familyExcluded,
  primarySuggestion,
  suggestedAdults,
  type AdultId,
  type WhereItHappens,
} from "./HandoffSuggestions.ts";
import { t } from "../lib/strings.ts";
import type { ReportResponse } from "../types/api.ts";

export interface HandoffCardProps {
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
      <h2 id="handoff-title" className="text-xl font-semibold tracking-tight">
        {t("handoff.title", lang)}
      </h2>

      {/* The promise, before any choice is made. Never collapse or move this
          below the fold: it is the one sentence that tells the child the app
          has not already told someone. */}
      <p className="flex items-start gap-2 rounded-card bg-calm-soft px-4 py-3 text-base text-ink">
        <span aria-hidden="true">🔒</span>
        <span>{t("handoff.youDecide", lang)}</span>
      </p>

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

      <div role="radiogroup" aria-labelledby="handoff-title" className="flex flex-col gap-3">
        {options.map((option) => {
          const checked = recipient?.id === option.id;
          return (
            <label
              key={option.id}
              className={`min-h-tap flex cursor-pointer items-center gap-3 rounded-card border px-4 py-3 text-base transition-colors ${
                checked
                  ? "border-calm bg-calm-soft font-medium text-ink"
                  : "border-line bg-surface text-ink hover:border-calm"
              }`}
            >
              <input
                type="radio"
                name="handoff-adult"
                value={option.id}
                checked={checked}
                onChange={() => onChoose(option.id)}
                className="size-5 shrink-0 accent-calm"
              />
              <span className="flex flex-col">
                <span>{t(option.labelKey, lang)}</span>
                {lang !== "de" && (
                  // The German the child can point at, so a role they cannot
                  // pronounce is still askable for.
                  <span lang="de" className="text-sm text-ink-soft">
                    {t(option.labelKey, "de")}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* The card the child holds up. */}
      <article className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        {recipient && (
          <header className="flex flex-col gap-0.5 border-b border-line pb-3">
            <span className="text-sm text-ink-soft">{t("handoff.showTo", lang)}</span>
            <span className="text-lg font-semibold">{t(recipient.labelKey, lang)}</span>
            {lang !== "de" && (
              <span lang="de" className="text-sm text-ink-soft">
                {t(recipient.labelKey, "de")}
              </span>
            )}
          </header>
        )}

        {/*
          GAP, not a placeholder: the adult also gets a short sourced guide on
          how to respond in the next five minutes. The content exists, reviewed
          and sourced, in `content/adult_guide.json` - but there is no
          `GET /api/guide` in `backend/main.py`, no `GuideResponse` in
          `src/types/api.ts` and no client function in `src/lib/api.ts`. Both
          of those files are frozen contracts I must not change, and inventing
          an endpoint would mean shipping a card that 404s in front of a judge.
          So nothing about the guide is rendered yet. Wire it here once the
          endpoint is agreed; the PR description has the shape it needs.
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

        {!loading && !error && !report && (
          // Nothing approved yet. The wording is Neel's existing timeline copy,
          // which already says what happens to anything the child does save.
          <p className="text-base text-ink-soft">{t("timeline.empty", lang)}</p>
        )}

        {!loading && !error && report && (
          <div className="flex flex-col gap-4">
            {/* German first: it is the half of the card the adult reads. */}
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-ink-soft">{t("write.german", lang)}</h3>
              <p lang="de" className="whitespace-pre-wrap text-base text-ink">
                {report.german_version}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-ink-soft">{t("handoff.yourWords", lang)}</h3>
              <p className="whitespace-pre-wrap text-base text-ink">{report.child_version}</p>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
