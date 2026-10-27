import { useState } from "react";

import Face, { hasFace } from "../art/Face";
import CalmTools from "../components/CalmTools";
import { moodReplyFor } from "../lib/moodReply";
import { fill, t, type StringKey } from "../lib/strings";
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
  /** Write it my way. `words` is "I feel ..." built from the feeling words
   *  the child tapped, to start their text with; absent if they tapped none. */
  onWrite: (words?: string) => void;
  onHome: () => void;
}

/** The faces after which "Need a moment first?" is offered. */
const CALM_FOR = new Set(["sad", "scared", "angry", "alone"]);

/**
 * More exact words for each hard feeling. Naming a feeling precisely
 * ("affect labelling") lowered amygdala activity in Lieberman et al. 2007,
 * and an exact word is also what a teacher needs to hear. Offered, never
 * required: nothing is chosen for the child, and the words only go into
 * their own text box, where they can change or delete them.
 */
const FEELING_WORDS: Record<string, readonly StringKey[]> = {
  sad: ["feel.hurt", "feel.embarrassed", "feel.leftOut", "feel.disappointed"],
  scared: ["feel.nervous", "feel.worried", "feel.unsafe", "feel.panicky"],
  angry: ["feel.annoyed", "feel.frustrated", "feel.unfair", "feel.furious"],
  alone: ["feel.lonely", "feel.ignored", "feel.invisible", "feel.different"],
};

export default function MoodReply({ lang, mood, onPictures, onWrite, onHome }: MoodReplyProps) {
  const reply = moodReplyFor(mood);
  const [stopped, setStopped] = useState(false);
  const [picked, setPicked] = useState<readonly StringKey[]>([]);
  const words = mood ? FEELING_WORDS[mood] : undefined;
  const sentence = picked.length
    ? fill("feel.sentence", lang, { words: picked.map((key) => t(key, lang)).join(", ") })
    : undefined;
  const face = mood && hasFace(mood) ? mood : null;

  if (stopped) {
    return (
      <section aria-labelledby="mood-bye" className="flex flex-col items-center gap-5 px-4 py-8 text-center">
        {face && <Face code={face} className="animate-pop-in size-24" />}
        <h1 id="mood-bye" className="text-3xl text-balance text-ink">{t("moodReply.bye", lang)}</h1>
        <button
          type="button"
          onClick={onHome}
          className="sticker min-h-tap w-full rounded-full bg-calm px-4 text-base font-bold text-page motion-safe:active:translate-y-1 active:shadow-none"
        >
          {t("heard.home", lang)}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="mood-reply" className="flex flex-col items-center gap-5 px-4 py-6 text-center">
      {face && (
        <span className="block">
          <Face code={face} className="animate-pop-in size-24" />
        </span>
      )}
      <h1 id="mood-reply" className="text-3xl text-balance text-ink">{t(reply.title, lang)}</h1>
      {reply.question && <p className="text-lg text-ink">{t(reply.question, lang)}</p>}

      {/* Only after a hard feeling: a child who tapped Good or OK is not
          offered a way to calm down they did not ask for. */}
      {words && (
        <section aria-labelledby="feel-title" className="flex w-full flex-col items-center gap-2">
          <h2 id="feel-title" className="text-base font-bold text-ink">{t("feel.title", lang)}</h2>
          <p className="text-sm text-ink-soft">{t("feel.hint", lang)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {words.map((key) => {
              const on = picked.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(on ? picked.filter((k) => k !== key) : [...picked, key])}
                  className={`sticker min-h-tap rounded-full px-3.5 text-sm font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none ${
                    on ? "sticker-on" : "bg-surface"
                  }`}
                >
                  {on && <span aria-hidden="true">✓ </span>}
                  {t(key, lang)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {mood && CALM_FOR.has(mood) && <CalmTools lang={lang} />}

      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onPictures}
          className="sticker flex min-h-24 flex-col items-center justify-center gap-1 rounded-card bg-surface p-3 text-base font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
        >
          <span aria-hidden="true" className="text-3xl leading-none">🖼️</span>
          {t("moodReply.pictures", lang)}
        </button>
        <button
          type="button"
          onClick={() => onWrite(sentence)}
          className="sticker flex min-h-24 flex-col items-center justify-center gap-1 rounded-card bg-surface p-3 text-base font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
        >
          <span aria-hidden="true" className="text-3xl leading-none">✏️</span>
          {t("moodReply.write", lang)}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setStopped(true)}
        className="sticker min-h-tap rounded-full bg-surface px-6 text-base font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
      >
        {t(reply.stop, lang)}
      </button>
    </section>
  );
}
