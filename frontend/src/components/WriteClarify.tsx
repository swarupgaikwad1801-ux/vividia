import type { Ambiguity } from "../types/api.ts";
import { t } from "../lib/strings.ts";

/**
 * The question to the child — the thing this whole product is for.
 *
 * When the child's sentence carries two honest readings, the app asks instead
 * of guessing, and the answer decides the German. CLAUDE.md:
 *
 * > A disagreement because a pass was wrong is ours to fix silently. A
 * > disagreement because the child's words carry two honest readings is theirs
 * > to decide. We never ask a child to adjudicate our own mistake.
 *
 * Design decisions and why:
 *
 * - **There is always a third option, and the engine provides it.** Two
 *   readings are a trap when neither is what happened: a child already
 *   struggling to be heard would pick the nearest one and end up handing a
 *   teacher a sentence they did not mean. So every question carries a third
 *   choice - but it arrives from the backend, which appends
 *   `{id: "other"}` in the child's own language
 *   (`engine/clarify_text.py`). This component used to add a SECOND one of
 *   its own, so the child saw the same choice twice.
 *
 *   It is recognised by `id === OTHER_ID` and routes the child back to their
 *   own words. It is filtered out of `choices` before /api/clarify: "neither
 *   of those" has no German to render, which is why the engine gives it an
 *   empty `meaning_de`. Sending it would ask the server to translate a
 *   decision the child declined to make.
 * - **Nothing is pre-selected.** A default would be the app deciding.
 * - **`meaning_de` is shown under each option**, quietly and tagged `lang="de"`,
 *   because the child is choosing what a German-speaking adult will read. It
 *   is the consequence of the choice, so it belongs next to the choice.
 * - **The question is printed as the backend sent it.** It is already in the
 *   child's language and quotes what they actually wrote; rewording it here
 *   would put our words in their question.
 * - Native radio inputs, one group per phrase, so a screen reader announces
 *   "2 of 3" and the keyboard works without any of our help.
 */

/**
 * Our own option, never a backend id. Double underscores so it cannot collide
 * with an id the engine invents.
 */
// The engine appends this option to every ambiguity itself, already in
// the child's language (`clarify_text.other_option`, and `translate.py`
// around the question builder). It is a convention, not a contract field.
//
// This screen used to add a SECOND "something else" of its own, so the child
// saw the same choice twice - and picking the engine's one was then sent to
// /api/clarify as if "other" were a meaning. There is only one now, and it
// is the engine's.
export const OTHER_ID = "other";

export interface WriteClarifyProps {
  lang: string;
  ambiguities: readonly Ambiguity[];
  /** phrase -> chosen option id, possibly the engine's `OTHER_ID`. */
  choices: Readonly<Record<string, string>>;
  onChoose: (phrase: string, optionId: string) => void;
  /** Send the answers through `clarify()`. */
  onSubmit: () => void;
  /** The child said none of the readings fit: back to the editor. */
  onRewrite: () => void;
}

export default function WriteClarify({
  lang,
  ambiguities,
  choices,
  onChoose,
  onSubmit,
  onRewrite,
}: WriteClarifyProps) {
  const answered = ambiguities.filter((item) => choices[item.phrase]);
  const rejectedAll = answered.some((item) => choices[item.phrase] === OTHER_ID);

  return (
    <section
      aria-label={t("clarify.title", lang)}
      className="flex flex-col gap-4 rounded-card border border-calm/30 bg-surface p-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{t("clarify.title", lang)}</h2>
        <p className="text-sm text-ink-soft">{t("clarify.hint", lang)}</p>
      </header>

      {ambiguities.map((item, index) => {
        const group = `ambiguity-${index}`;
        return (
          <fieldset key={`${item.phrase}-${index}`} className="flex flex-col gap-2">
            <legend className="mb-1 flex flex-col gap-1">
              <span className="text-base font-medium">{item.question}</span>
              {/* What they wrote, quoted back so the question has an anchor. */}
              <span lang={lang} className="text-sm text-ink-soft">
                “{item.phrase}”
              </span>
              {item.severity === "critical" && (
                // Marks the questions where the two readings change who did
                // what, or flip a negation. Text, not a colour alone.
                <span className="w-fit rounded-card bg-help-soft px-2 py-0.5 text-xs font-medium text-help">
                  {t("clarify.important", lang)}
                </span>
              )}
            </legend>

            {item.options.map((option) => (
              <label
                key={option.id}
                className={`flex min-h-tap cursor-pointer items-start gap-3 rounded-card border p-3 ${
                  choices[item.phrase] === option.id
                    ? "border-calm bg-calm-soft"
                    : "border-line bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name={group}
                  value={option.id}
                  checked={choices[item.phrase] === option.id}
                  onChange={() => onChoose(item.phrase, option.id)}
                  className="mt-1 size-5 accent-calm"
                />
                <span className="flex flex-col gap-0.5">
                  <span lang={lang} className="text-base">
                    {option.label}
                  </span>
                  <span lang="de" className="text-sm text-ink-soft">
                    {option.meaning_de}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        );
      })}

      {rejectedAll ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-soft">{t("clarify.rewriteWhy", lang)}</p>
          <button
            type="button"
            onClick={onRewrite}
            // text-page, not text-white: white on dark-mode --color-calm is
            // ~2.3:1, under the 4.5:1 floor. text-page flips with the theme.
            className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page"
          >
            {t("clarify.rewrite", lang)}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          // Nothing to send until they have answered something, and answering
          // is never compulsory: the German already on screen stands if they
          // would rather not.
          disabled={answered.length === 0}
          className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page disabled:opacity-50"
        >
          {t("clarify.send", lang)}
        </button>
      )}
    </section>
  );
}
