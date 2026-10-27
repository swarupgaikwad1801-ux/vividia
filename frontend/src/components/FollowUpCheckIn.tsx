/**
 * The question that comes back a few days later.
 *
 * ## Why the three answers look identical
 *
 * "A bit better", "About the same" and "Worse" are one row of equal buttons in
 * the same neutral colour. Not green-amber-red, not a happy face next to a sad
 * one, no order that reads as best-to-worst reward. A child whose situation has
 * not improved is about to press the third one, and the screen must not make
 * that the button that looks like failing. The same reason there is no "well
 * done" on the first one: nothing congratulatory, nothing that reads as
 * disappointment in them.
 *
 * ## Why "stop asking" is right here, not buried in a setting
 *
 * The promise is that this is never a nag. A child cannot take the app's word
 * for that; they can take a visible off switch for it. It sits next to the
 * answers, in plain words, on the first time they ever see the question.
 *
 * ## Nothing is sent
 *
 * Every callback here is a local state change. No contact, no adult and no
 * server learns that this question was asked or how it was answered — see
 * `lib-followups-ui/checkInState.ts`, which does not even store the answer.
 */

import { says } from "../lib-followups-ui/copy.ts";

/** The child's own word for how things are. Never inferred, never scored. */
export type CheckInAnswer = "better" | "same" | "worse";

const ANSWERS = [
  { answer: "better", key: "followup.answerBetter" },
  { answer: "same", key: "followup.answerSame" },
  { answer: "worse", key: "followup.answerWorse" },
] as const;

export interface FollowUpCheckInProps {
  lang: string;
  /** The child picked one of the three. Stays on this device. */
  onAnswer: (answer: CheckInAnswer) => void;
  /** "Not now": gone until the child writes something new. */
  onNotNow: () => void;
  /** "Stop asking me this": gone for good, until the child turns it back on. */
  onStopAsking: () => void;
}

export default function FollowUpCheckIn({
  lang,
  onAnswer,
  onNotNow,
  onStopAsking,
}: FollowUpCheckInProps) {
  return (
    <section
      aria-labelledby="followup-title"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
    >
      <h2 id="followup-title" className="text-lg font-medium" {...says("followup.title", lang)} />
      <p className="text-base text-ink-soft" {...says("followup.gap", lang)} />
      {/* Read before choosing, not after: the child should know nothing leaves
          this phone before they touch any of the three buttons. */}
      <p className="text-sm text-ink-soft" {...says("followup.noPressure", lang)} />

      <div className="flex flex-col gap-2">
        {ANSWERS.map(({ answer, key }) => (
          <button
            key={answer}
            type="button"
            onClick={() => onAnswer(answer)}
            className="min-h-tap rounded-card border border-line bg-surface px-4 text-base font-medium text-ink transition-colors hover:border-calm"
            {...says(key, lang)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onNotNow}
          className="min-h-tap text-base font-medium text-calm underline underline-offset-4"
          {...says("followup.notNow", lang)}
        />
        <button
          type="button"
          onClick={onStopAsking}
          className="min-h-tap text-base text-ink-soft underline underline-offset-4"
          {...says("followup.stopAsking", lang)}
        />
      </div>
    </section>
  );
}
