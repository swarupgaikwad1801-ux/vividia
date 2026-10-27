/**
 * The approval step. The only thing in this screen that makes a report usable.
 *
 * ## Approval is an act, never a default
 *
 * A generated report arrives **unapproved**. There is no timer, no "looks
 * good" inference, no treating "the child scrolled past it" as consent. The
 * only path from written to approved is the child pressing `approve.yes`.
 *
 * And approval is not the same as sending. Nothing leaves this phone towards
 * an adult here: approving marks the words as the child's own, so that a later
 * screen can offer to show them. Neel removed the "nothing gets sent" lines
 * (26 Oct), so neither `handoff.youDecide` nor #81's `approve.nothingGoes`
 * is shown here.
 *
 * ## "Change it" stays available after approval
 *
 * A child who approves and then thinks better of it must be able to take it
 * back, so `approve.change` is still there in the approved state. The parent's
 * `onChange` means "this is no longer approved" and must drop whatever it
 * stored.
 */

import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";

interface Props {
  lang: Lang;
  approved: boolean;
  /** The child pressed "yes, this is right". Nothing else may call this. */
  onApprove: () => void;
  /** The child pressed "change it". Any approval already given is withdrawn. */
  onChange: () => void;
}

export default function ReportApproval({ lang, approved, onApprove, onChange }: Props) {
  if (approved) {
    return (
      <section className="flex flex-col gap-3 rounded-card border border-calm bg-calm-soft p-4">
        <p role="status" className="text-base font-medium">
          {t("report.approved", lang)}
        </p>
        <button
          type="button"
          onClick={onChange}
          className="min-h-tap rounded-card border border-line bg-surface px-4 text-base font-medium"
        >
          {t("approve.change", lang)}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <h2 className="text-lg font-semibold">{t("approve.title", lang)}</h2>
      <p className="text-base text-ink-soft">{t("report.readAll", lang)}</p>
      {/* "Yes" first and full width because it is the child's own decision,
          not a risk to guard against; "change it" is equally reachable and not
          styled as a retreat. */}
      <button
        type="button"
        onClick={onApprove}
        /* text-page, not text-white: --color-calm is a light teal in dark
           mode and white on it fails contrast. */
        className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page"
      >
        {t("approve.yes", lang)}
      </button>
      <button
        type="button"
        onClick={onChange}
        className="min-h-tap rounded-card border border-line px-4 text-base font-medium"
      >
        {t("approve.change", lang)}
      </button>
    </section>
  );
}
