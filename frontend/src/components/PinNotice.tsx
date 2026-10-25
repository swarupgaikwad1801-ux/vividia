import type { ReactNode } from "react";

/**
 * One sentence back to the child after they did something on a PIN screen.
 *
 * `aria-live` rather than a role, so a wrong PIN or a saved PIN is announced
 * where it appears instead of as an interruption. `assertive` for a refusal,
 * because the child is about to press the same button again.
 *
 * Named `PinNotice` and not `Notice` on purpose: four of us are adding
 * components to this folder this week, and a generic name is a merge conflict
 * waiting to happen.
 */
export interface PinNoticeProps {
  tone: "problem" | "good";
  children: ReactNode;
}

export default function PinNotice({ tone, children }: PinNoticeProps) {
  const problem = tone === "problem";
  return (
    <p
      aria-live={problem ? "assertive" : "polite"}
      className={`rounded-card px-4 py-3 text-base ${
        problem ? "bg-help-soft text-help" : "bg-calm-soft text-calm-strong"
      }`}
    >
      {children}
    </p>
  );
}
