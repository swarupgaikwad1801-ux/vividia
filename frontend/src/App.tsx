import { useState } from "react";
import CheckIn from "./screens/CheckIn";
import { LANGS, t } from "./lib/strings";
import type { Lang } from "./lib/strings";
import { moodEmoji, moodLabel } from "./lib/moods";

/**
 * The app shell, holding what little state exists so far.
 *
 * Two parts of this are temporary and marked as such on screen:
 *
 * - The language row. Item 5 replaces it with real language setup; until then
 *   it is how the three of us check Hindi and German copy on a phone.
 * - The panel after a check-in. The writing screen (item 4) is what comes
 *   next; this stands in so the step is testable end to end rather than
 *   leading nowhere.
 *
 * There is no router yet, on purpose: one piece of state is not a routing
 * problem, and the choice of router is worth making once there are screens to
 * route between.
 */
export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [checkedIn, setCheckedIn] = useState(false);
  const [mood, setMood] = useState<string | null>(null);

  function handleChoose(chosen: string | null) {
    setMood(chosen);
    setCheckedIn(true);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col gap-8 px-4 py-6">
      {/* Temporary: replaced by the language setup in #4 item 5. */}
      <nav aria-label="Language (temporary)" className="flex gap-2">
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            className={`min-h-tap flex-1 rounded-card border text-sm font-medium transition-colors ${
              lang === code
                // `text-page`, never `text-white`: in dark mode --color-calm is a
                // light teal, and white on it measures about 2.3:1 — unreadable, and
                // well under the 4.5:1 this app owes a child. --color-page flips with
                // the theme, giving ~5.7:1 light and ~8:1 dark.
                ? "border-calm bg-calm text-page"
                : "border-line bg-surface text-ink hover:border-calm"
            }`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </nav>

      <main className="flex flex-1 flex-col">
        {checkedIn ? (
          <section className="flex flex-col gap-4" aria-live="polite">
            <p className="text-lg">
              {mood ? (
                <>
                  <span aria-hidden="true" className="mr-2 text-2xl">
                    {moodEmoji(mood)}
                  </span>
                  {moodLabel(mood, lang)}
                </>
              ) : (
                t("checkin.skip", lang)
              )}
            </p>
            <p className="text-sm text-ink-soft">
              Placeholder. The writing screen (#4 item 4) comes next; nothing is saved yet.
            </p>
            <button
              type="button"
              onClick={() => setCheckedIn(false)}
              className="min-h-tap self-start rounded-card border border-line px-4 text-base font-medium"
            >
              Back
            </button>
          </section>
        ) : (
          <CheckIn lang={lang} onChoose={handleChoose} />
        )}
      </main>
    </div>
  );
}
