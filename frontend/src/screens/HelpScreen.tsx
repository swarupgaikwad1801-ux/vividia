import { useCallback, useEffect, useState } from "react";
import { ContactCard } from "../components/ContactCard";
import { ApiError, emergency, resources } from "../lib/api";
import { settledHelpView, type HelpView } from "../lib/helpView";
import { t } from "../lib/strings";

type State =
  | { status: "loading" }
  | { status: "ready"; view: HelpView; dangerMissing?: string; talkMissing?: string }
  | { status: "error"; message: string };

function childMessage(error: unknown, lang: string): string {
  return error instanceof ApiError ? error.messageChild : t("errors.generic", lang);
}

/**
 * Who can help: 110/112 at the top, then the services the child can talk to,
 * each with its languages, hours and source.
 *
 * Opened from the "Need help now?" button on every screen. Fetches the
 * contacts each time it opens (both routes are outside the spending cap and
 * need no key). If one list fails the other still shows, with
 * `ApiError.messageChild` where the missing one would be, never a stack
 * trace (`settledHelpView()`). It contacts nobody.
 */
export function HelpScreen({ lang, state: region = "", onBack }: { lang: string; state?: string; onBack: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    void Promise.allSettled([emergency(lang), resources(lang, region)]).then(([numbers, found]) => {
      const loaded = settledHelpView(numbers, found, lang);
      if (loaded.status === "error") {
        setState({ status: "error", message: childMessage(loaded.error, lang) });
        return;
      }
      setState({
        status: "ready",
        view: loaded.view,
        ...(loaded.dangerError !== undefined ? { dangerMissing: childMessage(loaded.dangerError, lang) } : {}),
        ...(loaded.talkError !== undefined ? { talkMissing: childMessage(loaded.talkError, lang) } : {}),
      });
    });
  }, [lang, region]);

  const missing = (message: string) => (
    <div role="alert" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <p className="text-base">{message}</p>
      <button
        type="button"
        onClick={load}
        className="min-h-tap self-start rounded-card border border-calm px-4 text-base font-medium text-calm"
      >
        {t("help.retry", lang)}
      </button>
    </div>
  );

  useEffect(load, [load]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-6">
      <button
        type="button"
        onClick={onBack}
        className="min-h-tap self-start rounded-card px-2 text-base font-medium text-calm"
      >
        ← {t("help.back", lang)}
      </button>

      <h1 className="text-2xl font-semibold tracking-tight">{t("help.title", lang)}</h1>

      {state.status === "loading" && (
        <p role="status" className="text-base text-ink-soft">
          {t("help.loading", lang)}
        </p>
      )}

      {state.status === "error" && missing(state.message)}

      {state.status === "ready" && (
        <>
          <section aria-labelledby="danger" className="flex flex-col gap-3">
            <h2 id="danger" className="text-lg font-semibold text-help">
              {t("help.dangerTitle", lang)}
            </h2>
            {state.dangerMissing ? (
              missing(state.dangerMissing)
            ) : (
              <ul className="flex flex-col gap-3">
                {state.view.danger.map((contact) => (
                  <ContactCard key={contact.contact} contact={contact} lang={lang} urgent />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="talk" className="flex flex-col gap-3">
            <h2 id="talk" className="text-lg font-semibold">
              {t("help.talkTitle", lang)}
            </h2>
            {state.talkMissing ? (
              missing(state.talkMissing)
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {state.view.talk.map((contact) => (
                    <ContactCard key={contact.contact} contact={contact} lang={lang} />
                  ))}
                </ul>
                <p className="text-sm text-ink-soft">
                  {t(state.view.source === "live" ? "help.live" : "help.fallback", lang)}
                </p>
              </>
            )}
          </section>

          <p className="text-sm text-ink-soft">{t("help.notCounselling", lang)}</p>
        </>
      )}
    </main>
  );
}
