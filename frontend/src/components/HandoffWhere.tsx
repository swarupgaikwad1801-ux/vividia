/**
 * Step one: "Where does this happen?"
 *
 * One tap, no Continue button. The answer is not a preference, it is the input
 * to the only safety rule on this screen (see HandoffSuggestions.ts), so it is
 * asked on its own with nothing else competing for attention.
 *
 * This component renders four choices and reports the tap. It does not decide
 * anything, and it has no opinion about what the answer means - deriving people
 * from places happens in exactly one place, and this is not it.
 */

import { WHERE_OPTIONS, type WhereItHappens } from "./HandoffSuggestions.ts";
import { t } from "../lib/strings.ts";
import { PlacePicture } from "../art/Things.tsx";
import { SpokenQuestion } from "./ReadAloud.tsx";

export interface HandoffWhereProps {
  lang: string;
  /** The answer so far, so coming back shows what the child already picked. */
  value: WhereItHappens | null;
  onChoose: (where: WhereItHappens) => void;
}

export default function HandoffWhere({ lang, value, onChoose }: HandoffWhereProps) {
  return (
    <section aria-labelledby="handoff-where-title" className="flex flex-col gap-4">
      <SpokenQuestion
        as="h2"
        lang={lang}
        id="handoff-where-title"
        text={t("where.title", lang)}
        className="headline text-3xl text-balance"
      />

      {/*
        Real radios rather than buttons: this is one answer out of four, and a
        screen reader should say "2 of 4" and let the child arrow through them.
        The input is visually hidden but still focusable, so the ring lands on
        the label it belongs to.
      */}
      {/* Picture tiles, two by two. The picture is decoration (aria-hidden):
          the label is the answer a screen reader reads. */}
      <div role="radiogroup" aria-labelledby="handoff-where-title" className="grid grid-cols-2 gap-3">
        {WHERE_OPTIONS.map((option) => {
          const checked = value === option.id;
          return (
            <label
              key={option.id}
              className={`squish flex cursor-pointer flex-col items-center gap-1 rounded-card border-[3px] p-2 text-center text-base font-bold text-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-3 ${
                checked ? "border-ink bg-calm-soft" : "border-ink bg-surface"
              }`}
            >
              <input
                type="radio"
                name="handoff-where"
                value={option.id}
                checked={checked}
                onChange={() => onChoose(option.id)}
                className="sr-only"
              />
              <PlacePicture id={option.id} className="h-20 w-full" />
              <span>{t(option.labelKey, lang)}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
