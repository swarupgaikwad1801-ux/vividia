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

export interface HandoffWhereProps {
  lang: string;
  /** The answer so far, so coming back shows what the child already picked. */
  value: WhereItHappens | null;
  onChoose: (where: WhereItHappens) => void;
}

export default function HandoffWhere({ lang, value, onChoose }: HandoffWhereProps) {
  return (
    <section aria-labelledby="handoff-where-title" className="flex flex-col gap-4">
      <h2 id="handoff-where-title" className="text-xl font-semibold tracking-tight">
        {t("where.title", lang)}
      </h2>

      {/*
        Real radios rather than buttons: this is one answer out of four, and a
        screen reader should say "2 of 4" and let the child arrow through them.
        The input is visually hidden but still focusable, so the ring lands on
        the label it belongs to.
      */}
      <div role="radiogroup" aria-labelledby="handoff-where-title" className="flex flex-col gap-3">
        {WHERE_OPTIONS.map((option) => {
          const checked = value === option.id;
          return (
            <label
              key={option.id}
              className={`min-h-tap flex cursor-pointer items-center gap-3 rounded-card border px-4 py-3 text-base transition-colors ${
                checked
                  ? "border-calm bg-calm-soft font-medium text-ink"
                  : "border-line bg-surface text-ink hover:border-calm"
              }`}
            >
              <input
                type="radio"
                name="handoff-where"
                value={option.id}
                checked={checked}
                onChange={() => onChoose(option.id)}
                className="size-5 shrink-0 accent-calm"
              />
              <span>{t(option.labelKey, lang)}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
