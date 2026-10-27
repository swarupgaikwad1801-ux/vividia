/**
 * Journey step 8, first half: the app asks again, later.
 *
 * A child who told one adult and was let down is the least likely to try again
 * on their own. This screen is the app noticing that someone was dropped. It is
 * **not** surveillance, not a streak, not a mood graph and not a diagnosis: it
 * asks one question, in three plain words, and takes no for an answer.
 *
 * ## What it renders when it is not due: nothing
 *
 * `FollowUp` returns `null` unless `shouldAsk()` says the question is due and
 * unanswered. That is deliberate, so Vernika can mount it at the top of the
 * home screen unconditionally and the child only ever sees it on the days it
 * belongs there. It never becomes a permanent fixture asking how they are.
 *
 * ## Nothing is sent, and nothing is even kept
 *
 * There is no network call in this file, and the answer itself is never
 * stored — see `lib-followups-ui/checkInState.ts`. The only thing written to
 * the device is "this gap has been dealt with", which exists so the question
 * stops coming back. The app has no use for a record of how a child said they
 * felt and is not allowed to infer anything from one.
 *
 * ## Wiring (Vernika)
 *
 * ```tsx
 * <FollowUp lang={lang} entries={listEntries()} onOpen={go} />
 * ```
 * `onOpen` receives navigation intents only; `open-handoff` and `open-help`
 * are the existing handoff card and Neel's help screen.
 */

import { useState } from "react";

import FollowUpCheckIn, { type CheckInAnswer } from "../components/FollowUpCheckIn.tsx";
import { markHandled, shouldAsk, silence } from "../lib-followups-ui/checkInState.ts";
import { englishOnlyNotice, says } from "../lib-followups-ui/copy.ts";
import { todayIso } from "../lib-followups-ui/dates.ts";
import type { LadderIntent } from "../lib-followups-ui/ladder.ts";
import type { Entry } from "../types/api.ts";

export interface FollowUpProps {
  lang: string;
  /** The child's approved entries, from `lib/timeline.ts`. */
  entries: readonly Entry[];
  /** ISO date. Injectable so the behaviour is testable on any day. */
  today?: string;
  /** Navigation only: nothing here transmits anything. */
  onOpen: (intent: LadderIntent) => void;
}

/**
 * What happened in this visit. `null` means the child has not touched it yet.
 * `notNow` is kept distinct from `null` so the question disappears for the rest
 * of the visit even before storage has been consulted again.
 */
type Outcome = CheckInAnswer | "notNow" | "stopped";

export default function FollowUp({ lang, entries, today = todayIso(), onOpen }: FollowUpProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Recomputed every render rather than captured once, so a timeline that
  // gains an entry while the screen is open starts a fresh gap correctly.
  const due = shouldAsk(entries, today);

  if (outcome === null && !due) return null;
  if (outcome === "notNow") return null;

  function answer(picked: CheckInAnswer) {
    markHandled(entries);
    setOutcome(picked);
  }

  function notNow() {
    // Dismissing costs the child exactly what answering costs: the gap is
    // closed either way, and neither is treated as the more informative act.
    markHandled(entries);
    setOutcome("notNow");
  }

  function stopAsking() {
    silence();
    setOutcome("stopped");
  }

  if (outcome === "stopped") {
    return (
      <section
        aria-live="polite"
        className="flex flex-col gap-2 rounded-card border-[2.5px] border-ink bg-surface p-4"
      >
        <p className="text-base" {...says("followup.stopped", lang)} />
      </section>
    );
  }

  if (outcome !== null) {
    const still = outcome !== "better";
    return (
      <section
        aria-live="polite"
        className="flex flex-col gap-3 rounded-card border-[2.5px] border-ink bg-surface p-4"
      >
        <p
          className="text-base"
          {...says(still ? "followup.afterStill" : "followup.afterBetter", lang)}
        />
        <p className="text-sm text-ink-soft" {...says("followup.notKept", lang)} />
        {/* Offered after every answer, including "a bit better": things change
            back, and a child should not have to say they are worse to be told
            who else exists. A link, never a push. */}
        <button
          type="button"
          onClick={() => onOpen({ kind: "open-ladder" })}
          className="min-h-tap self-start text-base font-medium text-calm underline underline-offset-4"
          {...says("followup.openLadder", lang)}
        />
      </section>
    );
  }

  const notice = englishOnlyNotice(lang);
  return (
    <div className="flex flex-col gap-2">
      <FollowUpCheckIn lang={lang} onAnswer={answer} onNotNow={notNow} onStopAsking={stopAsking} />
      {notice && <p className="text-xs text-ink-soft" {...notice} />}
    </div>
  );
}
