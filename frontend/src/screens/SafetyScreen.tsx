import { useEffect, useState } from "react";
import { ContactCard } from "../components/ContactCard";
import { emergency, resources } from "../lib/api";
import { helpView, type HelpView } from "../lib/helpView";
import { t } from "../lib/strings";

/**
 * Shown when `/api/translate` returns `safety.urgent`.
 *
 * `message` is the backend's `message_child`, fixed text written by a person
 * (content/safety_messages.json). It is shown exactly as given: never
 * shortened, reworded or translated here.
 *
 * Then 110/112 and the helplines with their languages, and the plain fact
 * that nothing has been sent to anyone. A clear way back to what the child
 * was writing: this screen interrupts, it does not take over. It never calls
 * or contacts anyone by itself.
 *
 * If the contacts cannot load (no network), the message and the way back
 * still show, and 110 / 112 are named in the message itself.
 */
export function SafetyScreen({ lang, message, onBack }: { lang: string; message: string; onBack: () => void }) {
  const [view, setView] = useState<HelpView | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([emergency(lang), resources(lang)])
      .then(([numbers, found]) => live && setView(helpView(numbers, found.resources, found.source, lang)))
      .catch(() => {
        // The fixed message already names 110; the screen must not fail with it.
      });
    return () => {
      live = false;
    };
  }, [lang]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-6">
      <p role="alert" className="rounded-card bg-help-soft p-4 text-lg font-medium text-ink">
        {message}
      </p>

      {view && (
        <>
          <ul className="flex flex-col gap-3" aria-label={t("help.dangerTitle", lang)}>
            {view.danger.map((contact) => (
              <ContactCard key={contact.contact} contact={contact} lang={lang} urgent />
            ))}
          </ul>
          <ul className="flex flex-col gap-3" aria-label={t("help.talkTitle", lang)}>
            {view.talk.map((contact) => (
              <ContactCard key={contact.contact} contact={contact} lang={lang} />
            ))}
          </ul>
        </>
      )}

      <p className="text-base font-medium">{t("safety.nothingSent", lang)}</p>

      <button
        type="button"
        onClick={onBack}
        className="min-h-tap rounded-card border border-calm px-4 text-base font-medium text-calm"
      >
        {t("safety.back", lang)}
      </button>
    </main>
  );
}
