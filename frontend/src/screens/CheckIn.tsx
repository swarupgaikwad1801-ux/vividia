import Face, { hasFace } from "../art/Face";
import { MOODS } from "../lib/moods";
import { t } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * Step 1: the emoji check-in (#4 item 3).
 *
 * The one step that needs no language. A child who has just arrived, or who
 * has frozen, can still tap a face, so this asks for something they can always
 * give before it asks for words.
 *
 * ## Why a tap commits, with no "Continue"
 *
 * strings.ts offers exactly two sentences for this screen, `checkin.title` and
 * `checkin.skip`, and no confirm wording. A second tap to confirm a feeling
 * would also be a second chance to change your mind about saying anything at
 * all, which is the moment this app exists to get past. So a face goes
 * straight on, and `null` means the child skipped.
 *
 * The mood is a self-report and nothing more: it is never inferred from what
 * the child writes, and it never reaches the adult's report (moods.ts, and
 * engine/report.py leaves it out on purpose).
 */
export interface CheckInProps {
  lang: Lang;
  /** The chosen mood code, or null when the child skipped. */
  onChoose: (mood: string | null) => void;
}

export default function CheckIn({ lang, onChoose }: CheckInProps) {
  return (
    <section className="flex flex-col gap-6 px-4 py-6" aria-labelledby="checkin-title">
      <h1 id="checkin-title" className="text-3xl text-balance">
        {t("checkin.title", lang)}
      </h1>

      {/*
        Six moods in two rows of three: the layout moods.ts was written for,
        and the one that fits a 360px phone without shrinking a tap target.
      */}
      <ul className="tile-grid grid grid-cols-3 gap-3">
        {MOODS.map((mood, i) => (
          <li key={mood.code}>
            <button
              type="button"
              onClick={() => onChoose(mood.code)}
              // Quiet like an unpicked picture tile, and pressed down the
              // same way (PictureQuestions.tsx). A tap commits, so there is
              // no picked state to show here.
              className="flex w-full flex-col items-center justify-center gap-1 rounded-card border-2 border-b-4 border-line bg-surface px-1 pt-2 pb-2 transition-[translate] duration-100 hover:bg-calm-soft motion-safe:active:translate-y-0.5 motion-safe:active:border-b-2"
            >
              {/*
                The face is decoration (aria-hidden, art/Face.tsx): the label
                underneath is the real name of the choice, so a screen reader
                announces "Scared", never a description of a drawing. Each
                face bobs a little, out of step with its neighbours.
              */}
              <span className="animate-bob block" style={{ animationDelay: `${i * 180}ms` }}>
                {hasFace(mood.code) ? (
                  <Face code={mood.code} className="size-16" />
                ) : (
                  <span aria-hidden="true" className="text-4xl leading-none">
                    {mood.emoji}
                  </span>
                )}
              </span>
              <span className="text-center text-base font-bold text-ink">
                {mood.label[lang] ?? mood.label.en}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/*
        Skip is a real answer, not an escape hatch. A child who does not want
        to name a feeling still gets to the part where they can write, so it
        stays plain text rather than a disabled-looking afterthought.
      */}
      <button
        type="button"
        onClick={() => onChoose(null)}
        className="squish min-h-tap self-center rounded-full bg-surface px-6 text-base font-bold text-ink"
      >
        {t("checkin.skip", lang)}
      </button>
    </section>
  );
}
