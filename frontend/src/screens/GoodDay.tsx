import { useState } from "react";

import { t } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * After the good face on the check-in (Neel, 27 Oct: choosing "good" still
 * asked "What happened?").
 *
 * A child who says their day was good is not asked what happened as if
 * something must have. They are asked whether anything did. "Yes" goes on
 * to the picture questions as before; "No" is a happy ending, not a dead
 * end: one line, and the way back to the start.
 *
 * Both answers are one tap, the same as the check-in itself, and nothing is
 * stored: the mood was already kept by the shell, and "No" saves nothing.
 */
export interface GoodDayProps {
  lang: Lang;
  /** Something happened after all: on to "What happened?". */
  onSomething: () => void;
  /** "Back to the start", after the happy ending. */
  onHome: () => void;
}

export default function GoodDay({ lang, onSomething, onHome }: GoodDayProps) {
  const [allGood, setAllGood] = useState(false);

  if (allGood) {
    return (
      <section aria-labelledby="good-done" className="flex flex-col gap-6 px-4 py-6">
        <p id="good-done" className="text-2xl font-bold text-balance text-ink">
          {t("good.done", lang)}
        </p>
        <button
          type="button"
          onClick={onHome}
          className="squish min-h-tap rounded-full border-[3px] border-ink bg-surface px-4 text-lg font-bold text-ink"
        >
          {t("good.home", lang)}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="good-title" className="flex flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 id="good-title" className="text-3xl text-balance">
          {t("good.title", lang)}
        </h1>
        <p className="text-lg font-medium text-ink">{t("good.ask", lang)}</p>
      </header>
      <button
        type="button"
        onClick={onSomething}
        className="squish min-h-tap rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong"
      >
        {t("good.yes", lang)}
      </button>
      <button
        type="button"
        onClick={() => setAllGood(true)}
        className="squish min-h-tap rounded-full border-[3px] border-ink bg-surface px-4 text-lg font-bold text-ink"
      >
        {t("good.no", lang)}
      </button>
    </section>
  );
}
