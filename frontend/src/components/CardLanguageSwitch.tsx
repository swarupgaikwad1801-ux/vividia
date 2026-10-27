/**
 * The one place German appears outside the writing screen: behind this
 * switch, on the card the child shows an adult (issue #3, Neel: "the adult
 * chooses").
 *
 * Two pills: the child's own language, and "Auf Deutsch". The card starts in
 * the child's language, so nothing on screen is German until someone taps.
 * For a German-speaking child there is nothing to switch, so it renders
 * nothing.
 *
 * It offers only the two versions the child already approved. A third
 * language would be a new translation nobody checked, so it is not offered.
 */

import { t, type StringKey } from "../lib/strings.ts";

export interface CardLanguageSwitchProps {
  /** The child's language. */
  lang: string;
  /** What the card is showing now: the child's language, or "de". */
  showing: string;
  onChange: (next: string) => void;
}

export default function CardLanguageSwitch({ lang, showing, onChange }: CardLanguageSwitchProps) {
  if (lang === "de") return null;

  const options = [
    { code: lang, label: t(`lang.${lang}` as StringKey, lang) },
    { code: "de", label: t("card.german", lang) },
  ];

  return (
    <div role="group" aria-label={t("card.languageSwitch", lang)} className="flex gap-2">
      {options.map((option) => {
        const on = option.code === showing;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            aria-pressed={on}
            onClick={() => onChange(option.code)}
            className={`min-h-tap flex-1 rounded-full border-2 px-4 text-base font-semibold transition-colors ${
              on ? "border-ink bg-ink text-page" : "border-line bg-surface text-ink hover:border-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
