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
    <section className="flex flex-col gap-6 px-4 pt-6 pb-6" aria-labelledby="checkin-title">
      <h1 id="checkin-title" className="q-title">
        {t("checkin.title", lang)}
      </h1>

      {/* The answers as one block; display: contents, so it adds nothing to
          the layout. */}
      <div className="contents">

      {/*
        Six moods in two rows of three: the layout moods.ts was written for,
        and the one that fits a 360px phone without shrinking a tap target.
      */}
      <ul className="tile-grid grid grid-cols-3 gap-2.5">
        {MOODS.map((mood) => (
          <li key={mood.code}>
            <button
              type="button"
              onClick={() => onChoose(mood.code)}
              // A sticker like a picture tile, and pressed down the same way
              // (PictureQuestions.tsx). A tap commits, so there is no picked
              // state to show here.
              className="sticker flex w-full flex-col items-start justify-center gap-2 rounded-card bg-surface px-3 pt-3 pb-3 hover:bg-scene-deep/50 motion-safe:active:translate-y-1"
            >
              {/*
                The face is decoration (aria-hidden, art/Face.tsx): the label
                underneath is the real name of the choice, so a screen reader
                announces "Scared", never a description of a drawing. The
                faces stay still: the app is for young people up to about
                20, and the press is the only motion here.
              */}
              <span className="block">
                {hasFace(mood.code) ? (
                  <Face code={mood.code} className="size-14" />
                ) : (
                  <span aria-hidden="true" className="text-4xl leading-none">
                    {mood.emoji}
                  </span>
                )}
              </span>
              <span className="text-left font-display text-lg leading-tight font-semibold text-ink">
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
        className="min-h-tap self-start rounded-full px-1 text-base font-bold text-ink underline decoration-ink/50 decoration-2 underline-offset-[5px] motion-safe:active:translate-y-1"
      >
        {t("checkin.skip", lang)}
      </button>
      </div>
    </section>
  );
}
