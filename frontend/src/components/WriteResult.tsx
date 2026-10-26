import type { TranslateResponse } from "../types/api.ts";
import { fill, t } from "../lib/strings.ts";

/**
 * The child's own words and the German, side by side.
 *
 * Side by side is the whole point of the screen: the child has to be able to
 * see that the German belongs to them before they show it to an adult. At
 * 360px there is no room for two readable columns of 17px text, so below
 * `sm` the two stack with their own headings and keep the same order every
 * time — the child's words first, always, because they are the original and
 * the German is the copy. From `sm` up they really are two columns.
 *
 * Both halves carry a `lang` attribute, so a screen reader switches voice at
 * the right place instead of reading German with a Hindi pronunciation, and
 * the German is set a step larger because the phone will be held out at arm's
 * length for a teacher to read.
 *
 * `confidence` is labelled as agreement between our checks and nothing else
 * (CLAUDE.md: "consensus measures agreement, not correctness"). Calling it
 * accuracy would be the single easiest way to make this app lie.
 */

export interface WriteResultProps {
  lang: string;
  /**
   * What the child typed, passed in rather than echoed back from the response:
   * the contract has no field for the original, and we would not trust one if
   * it did. The left column must be the child's text character for character.
   */
  childText: string;
  result: TranslateResponse;
  /** True once the child has answered a question and the German was redone. */
  decidedByChild: boolean;
}

export default function WriteResult({ lang, childText, result, decidedByChild }: WriteResultProps) {
  const agreement = Math.round(Math.max(0, Math.min(1, result.confidence)) * 100);
  const latencySeconds = Math.max(result.usage.latency_ms / 1000, 0.1);

  return (
    <section
      aria-label={t("write.german", lang)}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-ink-soft">{t("write.yourWords", lang)}</h2>
          {/* whitespace-pre-line: the child's line breaks are part of what they wrote. */}
          <p lang={lang} className="whitespace-pre-line text-base">
            {childText}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-ink-soft">{t("write.german", lang)}</h2>
          <p lang="de" className="whitespace-pre-line text-lg">
            {result.translation}
          </p>
        </div>
      </div>

      {decidedByChild && (
        <p className="rounded-card bg-calm-soft p-3 text-sm text-ink">
          {t("write.yourChoiceUsed", lang)}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-ink-soft">{t("write.agreement", lang)}</span>
          <span className="font-medium tabular-nums">{agreement}%</span>
        </div>
        {/* Decorative twin of the number above it, hence aria-hidden: the
            percentage is already read out, and a second reading of the same
            value as a meter adds nothing. */}
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-calm-soft">
          <div className="h-full rounded-full bg-calm" style={{ width: `${agreement}%` }} />
        </div>
        <p className="text-xs text-ink-soft">{t("write.agreementNote", lang)}</p>
        {/* The live check count from the engine. Shown because the work is the
            product: a child (and a judge) can see that more than one pass
            looked at this sentence. Real numbers from `usage`, never invented. */}
        <p className="text-xs tabular-nums text-ink-soft">
          {result.usage.calls_made === 1
            ? t("write.checksOne", lang)
            : fill("write.checks", lang, { n: result.usage.calls_made })} ·{" "}
          {latencySeconds.toFixed(1)} s
        </p>
      </div>
    </section>
  );
}
