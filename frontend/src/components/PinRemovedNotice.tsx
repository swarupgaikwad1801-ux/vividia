import { type PinStore, pinRemovedAt } from "../lib/pin";
import { fill } from "../lib/strings";

/**
 * One quiet line on the timeline: when the PIN was last removed.
 *
 * "I forgot my PIN" removes the lock without asking for it (SAFETY.md,
 * threat 2), so anyone holding the phone can do it. This line is what makes
 * that visible afterwards: the child sees the date and can tell whether it
 * was them. It has no dismiss button on purpose, because whoever removed the
 * PIN could dismiss it just as easily. It goes away only with "delete
 * everything" (`forgetPinRemoved()`).
 *
 * Renders nothing when the PIN was never removed.
 */
export interface PinRemovedNoticeProps {
  lang: string;
  /** For tests; the real app uses localStorage. */
  store?: PinStore;
}

export default function PinRemovedNotice({ lang, store }: PinRemovedNoticeProps) {
  const at = pinRemovedAt(store);
  if (at === undefined) return null;

  let when: string;
  try {
    when = new Date(at).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    when = new Date(at).toISOString().slice(0, 16).replace("T", " ");
  }

  return (
    <p className="rounded-card border border-line bg-surface p-3 text-sm text-ink-soft">
      {fill("pin.removed.notice", lang, { when })}
    </p>
  );
}
