import { useCallback, useEffect, useState } from "react";
import { ContactCard } from "../components/ContactCard";
import { ApiError, emergency, resources } from "../lib/api";
import { helpView, type HelpView } from "../lib/helpView";
import { t } from "../lib/strings";

type State =
  | { status: "loading" }
  | { status: "ready"; view: HelpView }
  | { status: "error"; message: string };

/**
 * Who can help: 110/112 at the top, then the services the child can talk to,
 * each with its languages, hours and source.
 *
 * Opened from the "Need help now?" button on every screen. Fetches the
 * contacts each time it opens (both routes are outside the spending cap and
 * need no key), and shows only `ApiError.messageChild` if that fails, never a
 * stack trace. It contacts nobody.
 */
export function HelpScreen({ lang, state: region = "", onBack }: { lang: string; state?: string; onBack: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    Promise.all([emergency(lang), resources(lang, region)])
      .then(([numbers, found]) =>
        setState({ status: "ready", view: helpView(numbers, found.resources, found.source, lang) }),
      )
      .catch((error: unknown) =>
        setState({
          status: "error",
          message: error instanceof ApiError ? error.messageChild : t("errors.generic", lang),
        }),
      );
  }, [lang, region]);

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

      {state.status === "error" && (
        <div role="alert" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <p className="text-base">{state.message}</p>
          <button
            type="button"
            onClick={load}
            className="min-h-tap self-start rounded-card border border-calm px-4 text-base font-medium text-calm"
          >
            {t("help.retry", lang)}
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <section aria-labelledby="danger" className="flex flex-col gap-3">
            <h2 id="danger" className="text-lg font-semibold text-help">
              {t("help.dangerTitle", lang)}
            </h2>
            <ul className="flex flex-col gap-3">
              {state.view.danger.map((contact) => (
                <ContactCard key={contact.contact} contact={contact} lang={lang} urgent />
              ))}
            </ul>
          </section>

          <section aria-labelledby="talk" className="flex flex-col gap-3">
            <h2 id="talk" className="text-lg font-semibold">
              {t("help.talkTitle", lang)}
            </h2>
            <ul className="flex flex-col gap-3">
              {state.view.talk.map((contact) => (
                <ContactCard key={contact.contact} contact={contact} lang={lang} />
              ))}
            </ul>
            <p className="text-sm text-ink-soft">
              {t(state.view.source === "live" ? "help.live" : "help.fallback", lang)}
            </p>
          </section>

          <p className="text-sm text-ink-soft">{t("help.notCounselling", lang)}</p>
        </>
      )}
    </main>
  );
}
