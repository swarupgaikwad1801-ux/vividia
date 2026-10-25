import type { Safety } from "../types/api.ts";
import { t } from "../lib/strings.ts";

/**
 * The safety floor, shown the moment the check comes back urgent.
 *
 * Two rules from CLAUDE.md meet in this little component, and they pull in
 * opposite directions:
 *
 * 1. "If the child writes about danger or self-harm, show 110/112 and
 *    krisenchat at once. Nothing is sent to anyone."
 * 2. "`content/helplines.json` is the only place a contact may be defined.
 *    Nothing may copy a contact into a second file."
 *
 * So this screen does not print a number. It prints `safety.message_child` —
 * calm text the backend already wrote in the child's language — and hands over
 * to the help route, which reads `/api/resources` and must print each
 * service's languages (lib/help.ts). A phone number typed into this file would
 * be the copy that nobody remembers to update, in front of the child who needs
 * it most.
 *
 * `onNeedHelp` is therefore required, not optional: a safety panel with no way
 * out of it is worse than no panel. The shell must wire it.
 *
 * Styled in `help`, which the design system defines as serious and
 * deliberately not an alarm colour: a child reaching this point is frightened
 * already.
 */

export interface WriteSafetyNoteProps {
  lang: string;
  safety: Safety;
  onNeedHelp: () => void;
}

export default function WriteSafetyNote({ lang, safety, onNeedHelp }: WriteSafetyNoteProps) {
  return (
    // role="alert": this appears after the child pressed send and is the one
    // thing on the page that must not be scrolled past silently.
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-card border border-help/30 bg-help-soft p-4"
    >
      <p className="text-base font-medium text-help">{safety.message_child}</p>
      <button
        type="button"
        onClick={onNeedHelp}
        className="min-h-tap rounded-card bg-help px-4 text-base font-semibold text-white"
      >
        {t("help.button", lang)}
      </button>
      {/* The promise that makes the panel bearable: seeing this did not tell
          anyone anything. Nothing on this screen sends. */}
      <p className="text-sm text-help">{t("handoff.youDecide", lang)}</p>
    </section>
  );
}
