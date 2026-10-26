/**
 * Journey step 8, second half: the escalation ladder that carries the timeline.
 *
 * Teacher → Vertrauenslehrkraft or Schulsozialarbeit → Schulleitung →
 * schulpsychologische Beratungsstelle → helplines. The order is
 * `LADDER` in `lib/followups.ts`, which a test holds against
 * `content/adult_guide.json`, which takes it from `CLAUDE.md`.
 *
 * ## The one thing this screen must never do
 *
 * An escalation ladder is the feature that tempts an app into acting for a
 * child: *"they said it is still happening, so we will tell the school."* We
 * never do that. This screen shows **what the child could do next and who else
 * exists**. The child takes every step themselves, or takes none.
 *
 * Three things make that hard to break here by accident rather than only
 * promised in a comment:
 *
 * 1. There is no network primitive in this feature. No `fetch`, no dialling, no
 *    sharing, no mail. `lib-followups-ui/noSend.test.ts` reads every file in
 *    this feature and fails if one appears, so the guard survives someone who
 *    has not read this header.
 * 2. Every outgoing callback is typed `LadderIntent`, and each of its four
 *    members opens a screen for the child to look at. None of them carries a
 *    recipient, because the recipient is a person the child walks up to.
 * 3. A rung is only ever marked as reached when the child taps "I showed this
 *    to them". Opening a handoff card does not count, and nothing else in the
 *    app may record one.
 *
 * ## Why no phone number appears in this file
 *
 * The top two rungs are real services. Their contacts are defined once, in
 * `content/helplines.json`, served by `GET /api/resources`, formatted and
 * sorted by `lib/help.ts`, and rendered by Neel's help and safety screens
 * (PR #47). This screen names those doors and sends the child to that screen;
 * it does not build a contact list, and the emergency rung is not shown as a
 * "next step" at all — see `GAP` below and `lib/followups.ts`, which leaves
 * `emergency` out of `LADDER` on purpose.
 *
 * ## Wiring (Vernika)
 *
 * ```tsx
 * <Escalation lang={lang} entries={listEntries()} onOpen={go} />
 * ```
 *
 * GAP, for Vernika to connect once PR #47 lands: `onOpen({kind:"open-help"})`
 * should route to Neel's Help screen, and `{kind:"open-handoff", step}` to the
 * handoff card (journey step 4) with that rung preselected. Until both exist,
 * every button here is wired and fires its intent; what it opens is the
 * shell's decision, not this screen's.
 */

import { useState } from "react";

import EscalationCarry from "../components/EscalationCarry.tsx";
import EscalationRung from "../components/EscalationRung.tsx";
import { ladderStep, type LadderStep } from "../lib/followups.ts";
import { englishOnlyNotice, says } from "../lib-followups-ui/copy.ts";
import { todayIso } from "../lib-followups-ui/dates.ts";
import {
  addHandoff,
  handoffsFor,
  listHandoffs,
  removeHandoff,
  type StoredHandoff,
} from "../lib-followups-ui/handoffStore.ts";
import { RUNGS, rungStates, type LadderIntent } from "../lib-followups-ui/ladder.ts";
import type { Entry } from "../types/api.ts";

export interface EscalationProps {
  lang: string;
  /** The child's approved entries, from `lib/timeline.ts`. */
  entries: readonly Entry[];
  /** ISO date, used to stamp a handoff. Injectable for tests. */
  today?: string;
  /** Navigation only. See the file header. */
  onOpen: (intent: LadderIntent) => void;
}

export default function Escalation({ lang, entries, today = todayIso(), onOpen }: EscalationProps) {
  // Handoffs live in this feature's own store rather than arriving as a prop,
  // so the screen is complete on its own: every button does what it says
  // before the rest of the shell exists.
  const [handoffs, setHandoffs] = useState<StoredHandoff[]>(() => listHandoffs());

  const suggestion = ladderStep(entries, handoffs);
  const states = rungStates(suggestion, handoffs);
  const notice = englishOnlyNotice(lang);

  function markShown(step: LadderStep) {
    addHandoff(step, today);
    setHandoffs(listHandoffs());
  }

  function undoShown(step: LadderStep) {
    // Undo removes the most recent handoff for that rung only. An older one
    // from a previous attempt is the child's record of something that did
    // happen, and this button did not ask about it.
    const rows = handoffsFor(step);
    const last = rows[rows.length - 1];
    if (last) removeHandoff(last.id);
    setHandoffs(listHandoffs());
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl" {...says("ladder.title", lang)} />
        <p className="text-base text-ink-soft" {...says("ladder.intro", lang)} />
        {/* Already translated in lib/strings.ts: "Nothing is sent. You choose
            who sees it, and you show it yourself." It is the promise of the
            whole app, so it is on the screen most tempted to break it. */}
        <p className="text-base font-medium" {...says("handoff.youDecide", lang)} />
        {notice && <p className="text-xs text-ink-soft" {...notice} />}
      </header>

      {/* Where the ladder stands right now, in the child's situation. Flat
          statements: "things kept happening" is never "you should have done
          something sooner", and the top rung is never "we are out of ideas". */}
      <section aria-live="polite" className="flex flex-col gap-2">
        {suggestion.kind === "waiting" && (
          <p className="text-base" {...says("ladder.waiting", lang)} />
        )}
        {(suggestion.kind === "next" || suggestion.kind === "top") && (
          <p className="text-base" {...says("ladder.stillHappening", lang)} />
        )}
        {suggestion.kind === "top" && (
          <p className="text-base text-ink-soft" {...says("ladder.topRung", lang)} />
        )}
      </section>

      <EscalationCarry lang={lang} entries={entries} onOpen={onOpen} />

      <ul className="flex flex-col gap-3">
        {RUNGS.map((rung) => (
          <EscalationRung
            key={rung.step}
            rung={rung}
            state={states[rung.step]}
            lang={lang}
            onOpen={onOpen}
            onMarkShown={() => markShown(rung.step)}
            onUndoShown={() => undoShown(rung.step)}
          />
        ))}
      </ul>

      <footer className="flex flex-col gap-2 border-t border-line pt-4">
        {/* No rung promises an outcome, so the screen says so once, plainly,
            rather than letting each row imply one. */}
        <p className="text-sm text-ink-soft" {...says("ladder.noPromise", lang)} />
        {/* The emergency rung is NOT a step on this ladder: turning "a teacher
            did nothing" into "call the police" is not ours to decide. It is
            reachable the way it always is, through the help button, and this
            line points at it without naming or dialling a number. */}
        <p className="text-sm text-help" {...says("ladder.dangerNow", lang)} />
      </footer>
    </main>
  );
}
