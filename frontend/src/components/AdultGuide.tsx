/**
 * The five minutes after a child hands you the phone.
 *
 * `content/adult_guide.json` has been reviewed and sourced since 24 Oct,
 * `GET /api/guide` serves it and `guide()` calls it - and until now nothing
 * rendered it, so the one thing the adult needs in the moment they are
 * handed a card existed in three places and no screen. The stale "GAP"
 * comment in `HandoffCard` said the endpoint did not exist; it does.
 *
 * ## Why it lives on the big card and not on the child's screen
 *
 * `HandoffCard` is the child choosing who to show. Its own rule is that it
 * speaks only the child's language. This guide is addressed to the adult, in
 * the language *the adult* is reading, so it belongs on `HandoffShow`, next
 * to the card they are already looking at and behind the same language
 * switch.
 *
 * ## Closed until asked for
 *
 * It opens on a tap and fetches then, not on mount. A child holding out a
 * phone should not be waiting on a network call for something the adult has
 * not asked to see, and the card itself must never be pushed down the screen
 * by advice. Opening is the adult's decision, made after they have read what
 * the child wrote.
 *
 * ## The rules this screen must not break
 *
 * - **The served language is not the requested one.** The guide exists in
 *   `de` and `en`; anything else falls back to `de`. So `lang` comes off the
 *   response and goes on the element, or a screen reader pronounces a German
 *   guide as Hindi.
 * - **A missing source is shown, not hidden.** A claim about how to treat a
 *   child who has just disclosed carries its source; when `source_url` is
 *   null the absence is visible, which is what the contract asks for.
 * - **Nothing is re-ordered or summarised.** The steps are the content.
 */

import { useCallback, useEffect, useState } from "react";

import { guide } from "../lib/api.ts";
import { t } from "../lib/strings.ts";
import type { GuideResponse } from "../types/api.ts";

const INK = "#1B1B2F";

type Phase =
  | { phase: "closed" }
  | { phase: "loading" }
  | { phase: "ready"; guide: GuideResponse }
  | { phase: "error"; message: string };

/** The host of a source, which is what an adult actually recognises. */
function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function AdultGuide({ lang }: { lang: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Phase>({ phase: "closed" });

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      setState({ phase: "ready", guide: await guide(lang) });
    } catch (error) {
      // `messageChild` is already safe to show; anything else falls back to
      // the wording the rest of the app uses for "our side broke".
      const message =
        (error as { messageChild?: string })?.messageChild || t("errors.generic", lang);
      setState({ phase: "error", message });
    }
  }, [lang]);

  // The adult can switch the card to German while the guide is open. Follow
  // them: a guide in the language they just turned away from is worse than
  // no guide.
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const served = state.phase === "ready" ? state.guide : null;

  return (
    <section className="rounded-card border-[3px] border-ink bg-surface">
      <h3>
        <button
          type="button"
          onClick={() => {
            setOpen((wasOpen) => !wasOpen);
            if (open) setState({ phase: "closed" });
          }}
          aria-expanded={open}
          aria-controls="adult-guide-body"
          className="min-h-tap flex w-full items-center justify-between gap-3 rounded-card px-4 py-3 text-left text-base font-semibold focus-visible:outline focus-visible:outline-3 focus-visible:outline-ink"
        >
          {/* Before it is open there is no served title yet, so the button
              names the reader rather than the content. */}
          <span>{served ? served.title : t("handoff.forAdult", lang)}</span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`size-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="M5 8 l5 5 l5 -5" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>

      {open && (
        <div id="adult-guide-body" className="border-t border-line px-4 pb-4 pt-3">
          {state.phase === "loading" && (
            <p aria-live="polite" className="text-base text-ink-soft">
              {t("handoff.preparing", lang)}
            </p>
          )}

          {state.phase === "error" && (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-base text-ink">{state.message}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="min-h-tap rounded-card border border-calm px-4 text-base font-medium text-calm"
              >
                {t("handoff.retry", lang)}
              </button>
            </div>
          )}

          {served && <GuideBody guide={served} lang={lang} />}
        </div>
      )}
    </section>
  );
}

/**
 * The guide itself, with no fetching in it.
 *
 * Split out so it can be rendered from a test: the suite uses
 * `renderToStaticMarkup`, which runs no effects, so a component that only
 * shows its content after a request is a component no test ever sees. The
 * rules below are the ones worth pinning, and now they can be.
 */
export function GuideBody({ guide: served, lang }: { guide: GuideResponse; lang: string }) {
  return (
            // The served language, not the requested one.
            <div lang={served.lang} className="flex flex-col gap-3">
              <ol className="flex flex-col gap-3">
                {served.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-ink text-sm font-bold"
                    >
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-base">{step.text}</p>
                      {step.source_url ? (
                        <a
                          href={step.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="w-fit text-sm font-medium text-calm underline underline-offset-2"
                        >
                          {host(step.source_url)}
                        </a>
                      ) : (
                        // Shown, not hidden: a step with nothing behind it
                        // should look different from one that is sourced.
                        <span className="text-sm text-ink-soft">—</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <p className="border-t border-line pt-3 text-base text-ink-soft">{served.footer}</p>

              <p className="text-sm text-ink-soft">
                {t("help.source", lang)} {served.checked_on}
              </p>
            </div>
  );
}
