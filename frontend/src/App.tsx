import { useState } from "react";
import { LANGS, t } from "./lib/strings";
import type { Lang } from "./lib/strings";
import { HelpButton } from "./components/HelpButton";
import { HelpScreen } from "./screens/HelpScreen";

/**
 * Scaffold check, not a screen.
 *
 * This exists so the setup can be proved end to end before any real screen is
 * built on it: React renders, Tailwind applies the design tokens, and the
 * wording really does come from lib/strings.ts in all three languages rather
 * than being typed into a component.
 *
 * It is replaced by the emoji check-in (issue #4, item 3). Nothing here is a
 * product screen, and no text here is written by hand: if a sentence below
 * looks wrong, the fix belongs in lib/strings.ts, which Neel owns.
 */
export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [helpOpen, setHelpOpen] = useState(false);

  if (helpOpen) return <HelpScreen lang={lang} onBack={() => setHelpOpen(false)} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("app.name", lang)}</h1>
        <p className="text-sm text-ink-soft">{t("app.poweredBy", lang)}</p>
      </header>

      <section aria-label="Language" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink-soft">Language</h2>
        <div className="flex gap-2">
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={`min-h-tap flex-1 rounded-card border px-3 text-base font-medium transition-colors ${
                lang === code
                  ? "border-calm bg-calm text-white"
                  : "border-line bg-surface text-ink hover:border-calm"
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section
        aria-label="Wording check"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
      >
        <p className="text-lg font-medium">{t("checkin.title", lang)}</p>
        <p className="text-base text-ink-soft">{t("write.hint", lang)}</p>
        <p className="text-sm text-ink-soft">{t("quickExit.note", lang)}</p>
      </section>

      <HelpButton lang={lang} onOpen={() => setHelpOpen(true)} />

      <p className="mt-auto text-xs text-ink-soft">
        Setup check only. The real screens replace this; see issue #4.
      </p>
    </main>
  );
}
