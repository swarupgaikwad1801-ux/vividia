/**
 * The 5-minute guide, for the adult the child just handed the phone to.
 *
 * The last Must on the journey table: "handoff card for one trusted adult,
 * **with a 5-minute guide for that adult**". The content has existed, reviewed
 * and sourced, in `content/adult_guide.json` since 24 Oct; `GET /api/guide`,
 * `GuideResponse` and `lib/api.ts guide()` have all existed for a while too.
 * Nothing rendered it, so the Must was unmet by one component.
 *
 * ## Why it lives here and not on the handoff card
 *
 * `HandoffCard` says it in its own header: that screen speaks only the child's
 * language, and German appears one tap away on the big card (`HandoffShow`),
 * where the adult picks the language they read. A German guide on the child's
 * screen would break that rule. So the guide hangs off the big card, under the
 * child's words, where the adult is already looking.
 *
 * ## Two languages, and the response decides which
 *
 * The guide exists in `de` and `en` only. A child writing Hinglish may well
 * hand the phone to someone who reads German, so `guide()` is asked for the
 * language the card is showing and the response says what it actually served.
 * The `<article>` carries THAT language, not the one we asked for, or a screen
 * reader pronounces the whole guide wrongly.
 *
 * The summary line is the exception: it is in the child's language, because
 * the child is the one holding the phone out and deciding to open it.
 *
 * ## Closed until opened
 *
 * `<details>` rather than an always-open block. The child's own words are the
 * point of this screen and must stay above the fold on a 360px phone; seven
 * steps and a five-rung ladder would push them off it. `<details>` is keyboard
 * and screen-reader native, so this costs no accessibility.
 *
 * ## What a failure costs
 *
 * The guide is additional; the child's words are the essential part. So a
 * failed fetch shows one plain line and leaves the card untouched, per the
 * "one failure never hides the part that matters" rule in CLAUDE.md. It never
 * shows a network error: the adult is reading a card a child has just worked
 * up the courage to hand them, and our connection is not their problem.
 */

import { useEffect, useState } from "react";

import { guide as fetchGuide } from "../lib/api.ts";
import { fill, t } from "../lib/strings.ts";
import type { GuideResponse } from "../types/api.ts";

export interface AdultGuideProps {
  /**
   * The language the card is currently showing, which is the adult's choice
   * once they have made one. Asked for, not assumed: see the header.
   */
  showing: string;
  /** The child's language, for the one line the child reads. */
  lang: string;
}

export default function AdultGuide({ showing, lang }: AdultGuideProps) {
  const [data, setData] = useState<GuideResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);

    fetchGuide(showing)
      .then((response) => {
        if (live) setData(response);
      })
      .catch(() => {
        if (live) setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [showing]);

  return (
    <details className="rounded-card border-[3px] border-ink bg-surface">
      <summary className="squish min-h-tap cursor-pointer list-none px-4 py-3 text-base font-bold text-ink">
        {t("guide.open", lang)}
      </summary>

      <div className="border-t border-line px-4 py-3">
        {!data && !failed && (
          <p aria-live="polite" className="text-base text-ink-soft">
            {t("guide.loading", lang)}
          </p>
        )}

        {failed && (
          <p role="alert" className="text-base text-ink">
            {t("guide.failed", lang)}
          </p>
        )}

        {data && (
          // `data.lang` is what the server served, which is not always what we
          // asked for. Everything below this line is already in that language
          // and must never be run through `t()`.
          <article lang={data.lang} className="flex flex-col gap-3">
            <h3 className="text-lg font-bold text-ink text-balance">{data.title}</h3>

            <ol className="flex list-decimal flex-col gap-3 pl-5">
              {data.steps.map((step, index) => (
                <li key={index} className="text-base leading-relaxed text-ink">
                  {step.text}
                  {step.source_url && (
                    <>
                      {" "}
                      <a
                        href={step.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="whitespace-nowrap text-sm font-medium text-calm underline"
                      >
                        {t("guide.source", data.lang)}
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ol>

            {data.ladder && data.ladder.length > 0 && (
              <section className="flex flex-col gap-1">
                <h4 className="text-base font-bold text-ink">{t("guide.ladder", data.lang)}</h4>
                {/* Never re-sorted: the order IS the content, and a child who
                    has already been to the head of year must not be sent back
                    to their form teacher. `types/api.ts` says the same. */}
                <ol className="flex list-decimal flex-col gap-1 pl-5">
                  {data.ladder.map((rung) => (
                    <li key={rung.id} className="text-base text-ink">
                      {rung.text}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* `home_rule` is deliberately not rendered. It is one English
                string in `content/adult_guide.json` with no translation, so a
                German-reading adult would get an English sentence in the
                middle of a German guide - and the rule it states is already
                enforced in code by `suggestedAdults()` / `familyExcluded()`,
                which is where it belongs. Flagged to Neel, whose file it is;
                render it here once it has a `de`. */}

            <p className="text-base leading-relaxed text-ink-soft">{data.footer}</p>

            <p className="text-sm text-ink-soft">
              {fill("guide.checked", data.lang, { date: data.checked_on })}
            </p>
          </article>
        )}
      </div>
    </details>
  );
}
