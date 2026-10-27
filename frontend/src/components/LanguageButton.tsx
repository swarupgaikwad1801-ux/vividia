import { optionFor } from "../lib-lang/languages";
import { t } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * The 🌐 button on the check-in: change the language at any time (Neel, 26 Oct).
 *
 * Before this, the picker showed on first run only, so a child who tapped the
 * wrong language, or handed the phone to a sibling, had no way back to it.
 *
 * The globe is drawn, not an emoji, so it looks the same on every phone, and
 * the visible text is the current language's own name ("Hinglish", "Deutsch"):
 * a child who cannot read the screen they are stuck on can still read that.
 * The accessible name says what the button does, in the current language,
 * and includes the visible name, so speech control ("tap English") works.
 */
export default function LanguageButton({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  const name = optionFor(lang)?.endonym ?? lang;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${t("lang.change", lang)}: ${name}`}
      className="sticker min-h-tap inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-2.5 text-sm font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18M5 7h14M5 17h14" />
      </svg>
      <span lang={optionFor(lang)?.htmlLang}>{name}</span>
    </button>
  );
}
