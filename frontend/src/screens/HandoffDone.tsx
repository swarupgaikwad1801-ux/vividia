/**
 * After the child has shown the card: what happens next, in one sentence.
 *
 * "In a few days, the app will ask how things are" is the follow-up check-in
 * (step 8), which only ever asks, on this phone, and tells nobody. The app is
 * the subject, never "we": the app is not a friend (CLAUDE.md).
 *
 * The one button goes home to the check-in, which starts a new trail, so back
 * from there does not walk the child through the card again.
 */

import { t } from "../lib/strings.ts";
import { SproutPicture } from "../art/Things.tsx";

export interface HandoffDoneProps {
  lang: string;
  onHome: () => void;
}

export default function HandoffDone({ lang, onHome }: HandoffDoneProps) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4 py-10 text-center">
      <span className="animate-bob block">
        <SproutPicture className="size-32" />
      </span>
      <p className="rounded-card border-[3px] border-ink bg-surface px-5 py-4 text-xl font-bold text-ink text-balance">
        {t("handoff.checkLater", lang)}
      </p>
      <button
        type="button"
        onClick={onHome}
        className="squish min-h-tap w-full rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong"
      >
        {t("handoff.done", lang)}
      </button>
    </main>
  );
}
