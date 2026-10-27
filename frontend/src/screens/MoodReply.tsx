import { useState } from "react";

import Face, { hasFace } from "../art/Face";
import { moodReplyFor } from "../lib/moodReply";
import { t } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * Right after the check-in: an answer to the face the child tapped, then
 * their choice of what happens next (lib/moodReply.ts).
 *
 * Two ways to tell it, side by side and equal: tap pictures (the questions,
 * for a child who would rather not write) or write it their way (the
 * listening screen). And a third, quieter way out, because a child who said
 * "Good" owes us nothing more.
 */
export interface MoodReplyProps {
  lang: Lang;
  /** What the child tapped on the check-in, or null if they skipped. */
  mood: string | null;
  onPictures: () => void;
  onWrite: () => void;
  onHome: () => void;
}

export default function MoodReply({ lang, mood, onPictures, onWrite, onHome }: MoodReplyProps) {
  const reply = moodReplyFor(mood);
  const [stopped, setStopped] = useState(false);
  const face = mood && hasFace(mood) ? mood : null;

  if (stopped) {
    return (
      <section aria-labelledby="mood-bye" className="flex flex-col items-center gap-5 px-4 py-8 text-center">
        {face && <Face code={face} className="animate-pop-in size-24" />}
        <h1 id="mood-bye" className="text-3xl text-balance text-ink">{t("moodReply.bye", lang)}</h1>
        <button
          type="button"
          onClick={onHome}
          className="squish min-h-tap w-full rounded-full bg-calm px-4 text-base font-bold text-page"
        >
          {t("heard.home", lang)}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="mood-reply" className="flex flex-col items-center gap-5 px-4 py-6 text-center">
      {face && (
        <span className="animate-bob block">
          <Face code={face} className="animate-pop-in size-24" />
        </span>
      )}
      <h1 id="mood-reply" className="text-3xl text-balance text-ink">{t(reply.title, lang)}</h1>
      {reply.question && <p className="text-lg text-ink">{t(reply.question, lang)}</p>}

      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onPictures}
          className="squish flex min-h-24 flex-col items-center justify-center gap-1 rounded-card border-[3px] border-ink bg-surface p-3 text-base font-bold text-ink shadow-[4px_4px_0_0_#1B1B2F]"
        >
          <span aria-hidden="true" className="text-3xl leading-none">🖼️</span>
          {t("moodReply.pictures", lang)}
        </button>
        <button
          type="button"
          onClick={onWrite}
          className="squish flex min-h-24 flex-col items-center justify-center gap-1 rounded-card border-[3px] border-ink bg-surface p-3 text-base font-bold text-ink shadow-[4px_4px_0_0_#1B1B2F]"
        >
          <span aria-hidden="true" className="text-3xl leading-none">✏️</span>
          {t("moodReply.write", lang)}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setStopped(true)}
        className="squish min-h-tap rounded-full bg-surface px-6 text-base font-bold text-ink"
      >
        {t(reply.stop, lang)}
      </button>
    </section>
  );
}
