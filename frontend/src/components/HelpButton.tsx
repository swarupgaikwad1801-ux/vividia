import { t } from "../lib/strings";

/**
 * "Need help now?", meant to sit on every screen.
 *
 * It only opens the Help screen. It never calls, messages or alerts anyone:
 * the child decides what happens next (CLAUDE.md, "no alert behind the
 * child's back"). It is never placed behind the PIN lock either, because a
 * child who has forgotten their PIN still needs 110.
 */
export function HelpButton({ lang, onOpen }: { lang: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="min-h-tap rounded-card bg-help-soft px-4 text-base font-semibold text-help"
    >
      {t("help.button", lang)}
    </button>
  );
}
