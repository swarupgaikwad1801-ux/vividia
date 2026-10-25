/**
 * "Delete everything", with the confirmation step built into the page.
 *
 * ## Why not `window.confirm`
 *
 * Two reasons, and the second is the one that matters to the child:
 *
 * 1. A native dialog freezes the browser automation the team uses for QA, so
 *    the one irreversible action in the app would be the one action nobody
 *    can test.
 * 2. `window.confirm` renders in the *browser's* language, not the child's.
 *    A Hindi-speaking newcomer on a German phone would be asked to confirm
 *    deleting their own record in buttons reading "OK" and "Abbrechen". This
 *    app exists because that child is locked out of German-only interfaces;
 *    we are not going to hand them one at the point of no return.
 *
 * So the question and both answers come from our own strings, in the child's
 * language, rendered in the page.
 *
 * ## Why "No" is the default
 *
 * Deleting is unrecoverable and the child may be in a hurry or frightened.
 * Focus lands on "No, keep it" when the question appears, Escape is the same
 * as "No", and "No" is the button that looks like the ordinary choice. Nothing
 * deletes until the child presses the destructive button on purpose.
 */

import { useEffect, useId, useRef, useState } from "react";
import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";
import { tPending } from "./TimelinePendingStrings";

interface Props {
  lang: Lang;
  /** Runs only after the child has answered the question with "yes". */
  onConfirm: () => void;
}

export default function TimelineDeleteAll({ lang, onConfirm }: Props) {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const questionId = useId();

  // Move focus to the safe answer, so the question is announced and so a
  // keyboard or switch user cannot delete everything with a stray Enter.
  useEffect(() => {
    if (asking) cancelRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="min-h-tap rounded-card border border-line px-4 text-base font-medium text-help transition-colors hover:border-help"
      >
        {t("timeline.deleteAll", lang)}
      </button>
    );
  }

  return (
    <section
      aria-labelledby={questionId}
      onKeyDown={(event) => {
        if (event.key === "Escape") setAsking(false);
      }}
      className="rounded-card border border-help bg-help-soft p-4"
    >
      <p id={questionId} className="text-base font-medium text-help">
        {t("timeline.deleteAllConfirm", lang)}
      </p>
      {/* Stacked, not side by side: at 360px two buttons in a row are narrow
          enough to mis-tap, and this is the one choice that cannot be undone. */}
      <div className="mt-3 flex flex-col gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => setAsking(false)}
          /* text-page rather than text-white: --color-calm is a light teal in
             dark mode, where white text on it fails contrast. */
          className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page"
        >
          {tPending("timeline.deleteAllNo", lang)}
        </button>
        <button
          type="button"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
          className="min-h-tap rounded-card border border-help bg-surface px-4 text-base font-semibold text-help"
        >
          {tPending("timeline.deleteAllYes", lang)}
        </button>
      </div>
    </section>
  );
}
