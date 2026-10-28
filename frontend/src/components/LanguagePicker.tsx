import { LANGUAGE_OPTIONS } from "../lib-lang/languages";
import { saveLang } from "../lib-lang/langStore";
import { t, type Lang } from "../lib/strings";

/**
 * The language control, in two shapes (#4 item 5).
 *
 * One component rather than two, because the first-run screen and the
 * change-it-later control are the same three choices with the same rules; only
 * the room they sit in differs. `layout="stack"` is the full-width list the
 * first screen shows; `layout="row"` is the compact segmented control Vernika
 * can drop into a header or a settings line.
 *
 * ## It contains no copy at all
 *
 * Every label is a language's own name for itself (`lib-lang/languages.ts`),
 * so there is no sentence here that could be mistranslated, and no key this
 * needs from `strings.ts`. That is why the control works on the very first
 * screen, before anyone knows what the child reads. A child who cannot read a
 * word of English can still find "Deutsch" or "Hinglish".
 *
 * ## Why one tap commits, with no "Continue"
 *
 * Same reason `CheckIn.tsx` gives: a second tap to confirm is a second chance
 * to back out of a screen the child is already frightened of. Three options,
 * each unmistakable, and changing a wrong pick costs exactly one more tap —
 * which is the whole point of this control existing outside the first run.
 *
 * ## What "suggested" is and is not
 *
 * It is the device's own language (`navigator`), drawn with a calm border so a
 * German phone's owner finds "Deutsch" without reading the other two. It is
 * **never** applied: with `value={null}` nothing is pressed, nothing is
 * stored, and the app is in no language until the child taps. CLAUDE.md's
 * promise is that the app never decides for the child, and that starts here.
 *
 * ## Why it writes to storage itself
 *
 * `remember` defaults to true and calls `saveLang` before `onChange`. Leaving
 * the write to each mount site is how one of them forgets and the child gets
 * asked again every launch. It is a browser-storage write and nothing else:
 * no network, no request, nothing leaves the phone. The demo story can pass
 * `remember={false}` to show the app in another language without overwriting
 * what the child chose.
 *
 * ## States
 *
 * There is no loading state and no offline state, because there is nothing to
 * fetch — by design, since choosing a language is not something to make a
 * frightened child wait for. There is no empty state: the three languages are
 * compiled in. The only failure is storage refusing the write, which
 * `langStore` absorbs into memory for this visit; see its header for why that
 * is not worth a warning here.
 */
export interface LanguagePickerProps {
  /** The language in use, or `null` on first run when nothing is chosen yet. */
  value: Lang | null;
  /** The device's language, marked as a hint. Never applied. */
  suggested?: Lang | null;
  onChange: (lang: Lang) => void;
  layout?: "stack" | "row";
  /** Write the choice to browser storage. Default true; see above. */
  remember?: boolean;
  /**
   * Accessible name for the group of buttons.
   *
   * Optional and unset by default, because the only honest value would be a
   * translated sentence and `strings.ts` has no key for one yet (see the PR:
   * `langSetup.groupLabel`). Each button already carries its own full name, so
   * a screen reader on the first screen announces "English, button. Deutsch,
   * button. Hinglish, button.", which is unambiguous without a group label.
   * Pass `t("langSetup.groupLabel", lang)` once Neel has added it.
   */
  label?: string;
}

export default function LanguagePicker({
  value,
  suggested = null,
  onChange,
  layout = "stack",
  remember = true,
  label,
}: LanguagePickerProps) {
  const stack = layout === "stack";

  function choose(code: Lang): void {
    if (remember) saveLang(code);
    onChange(code);
  }

  return (
    <div
      role="group"
      aria-label={label}
      // On a wide screen the stack becomes three tall chips side by side,
      // so each greeting can be large instead of a long, mostly empty bar.
      className={stack ? "flex flex-col gap-3 lg:grid lg:grid-cols-3" : "flex gap-2"}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const chosen = option.code === value;
        // A hint never competes with a real choice: once something is chosen,
        // the device's language stops being drawn differently from the rest.
        const hinted = !chosen && option.code === suggested;

        return (
          <button
            key={option.code}
            type="button"
            onClick={() => choose(option.code)}
            aria-pressed={chosen}
            lang={option.htmlLang}
            dir={option.dir}
            className={
              stack
                ? // A sticker card (index.css), pressed in when chosen.
                  [
                    "sticker relative flex min-h-tap items-center justify-between gap-3 rounded-card px-5 py-4 text-left text-ink motion-safe:active:translate-y-1 lg:min-h-44 lg:flex-col-reverse lg:items-start lg:py-5",
                    chosen ? "sticker-on" : "bg-surface",
                  ].join(" ")
                : [
                    // border-2 on every state, so marking one never shifts the
                    // layout by a pixel under a thumb that is already moving.
                    "min-h-tap flex-1 rounded-card border-2 px-2 py-2 text-center transition-colors",
                    chosen
                      ? "border-calm bg-calm-soft font-semibold text-ink"
                      : hinted
                        ? "border-calm bg-surface text-ink"
                        : "border-line bg-surface text-ink hover:border-calm",
                  ].join(" ")
            }
          >
            {/*
              The endonym carries the option's own `lang`, inherited from the
              button, so a screen reader reads "Deutsch" with a German voice
              and "Hinglish" (hi-Latn) as Hindi.
            */}
            {stack ? (
              <span className="flex flex-col">
                {/* "Hallo!" on the Deutsch card, "Namaste!" on Hinglish: each
                    card greets in its own language. aria-hidden, so the
                    button is still announced by its name alone. */}
                <span aria-hidden="true" className="headline text-2xl leading-tight lg:text-3xl">
                  {t("langSetup.hello", option.code)}
                </span>
                <span className="text-base font-semibold text-ink-soft">{option.endonym}</span>
              </span>
            ) : (
              <span className="text-base font-medium">{option.endonym}</span>
            )}

            <span className={stack ? "flex shrink-0 items-center gap-2" : "contents"}>
              {/*
                The English name sits on the same line, right-aligned and
                quiet: every row stays one line and the same height, which a
                stacked second line would break on the one row (English) that
                has nothing to put there. `lang="en"` so it is not read aloud
                in the voice of the language it is naming. Left out of the
                compact row, where there is no space for it at 360px.
              */}
              {/* No English name beside it (Neel, 26 Oct: "just keep Deutsch"). */}

              {/*
                Decoration only: `aria-pressed` already tells a screen reader
                which one is chosen, and repeating it as a glyph would announce
                it twice. It is here because colour must never be the only
                signal (WCAG 2.2, 1.4.1), alongside the heavier weight.
              */}
              {/* With every card outlined the same, the device's language is
                  marked by a small sun dot rather than by its border. */}
              {stack && hinted && (
                <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-ink bg-sun" />
              )}
              {chosen && (
                <span
                  aria-hidden="true"
                  className={stack ? "flex size-7 items-center justify-center rounded-full bg-ink text-sm text-page" : "text-base text-calm-strong"}
                >
                  ✓
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
