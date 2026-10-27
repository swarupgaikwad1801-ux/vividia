import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import PinKeypad from "../components/PinKeypad";
import PinNotice from "../components/PinNotice";
import { fill } from "../lib/strings";
import { checkPin, clearPin, isValidPin, pinStatus } from "../lib/pin";
import type { PinStore } from "../lib/pin";
import { onQuickExit } from "../lib/quickExit";

/**
 * The lock screen.
 *
 * Every rule about tries, delays and hashing is `lib/pin.ts`. This screen
 * calls `checkPin`, reads the reason, and renders it. It never counts
 * attempts itself and never sleeps — the delay is enforced by `checkPin`
 * refusing early, so the countdown here is a label on a wait that already
 * exists, not the thing creating it.
 *
 * ## Three ways this screen refuses to lock a child out
 *
 * 1. **A forgotten PIN has a visible way out.** `clearPin()` needs no PIN by
 *    design. "I forgot my PIN" is on screen from the start, not after five
 *    failures, because a child who cannot get in is already having the worst
 *    version of this and should not have to earn the exit. It explains what it
 *    does and what it costs before it does it.
 * 2. **Nothing to check against lets the child in.** `reason: "none"` (no PIN
 *    stored, or storage corrupt) and `reason: "unavailable"` (no storage at
 *    all) both open the app. If the stored hash cannot be read, no PIN on
 *    earth can match it, so holding the child at this screen would be a
 *    permanent lockout caused by the lock rather than by them.
 * 3. **The wait is shown, never imposed.** `retryInMs` is capped at a minute
 *    by `lib/pin.ts`, and the countdown says how many seconds are left. There
 *    is no "too many attempts" state, and there is nothing to say it in.
 *
 * ## Help belongs OUTSIDE this gate
 *
 * `lib/pin.ts`: *"a child who has forgotten their PIN still needs 110. A
 * screen that puts the help button behind the PIN gate has got this
 * backwards."* So `help` is a **required** prop. Passing `null` is allowed and
 * is a deliberate choice someone can see in review; forgetting to pass
 * anything is not possible. The slot renders above the PIN card, where it is
 * read first.
 *
 * The quick exit has the same problem and this screen cannot solve it:
 * `QuickExitButton` must be mounted by the shell OUTSIDE whatever renders this
 * screen. If it only exists inside the unlocked app, then the one moment a
 * child most needs to leave — someone walking in while the lock screen is up —
 * is the one moment the button and the Escape shortcut are gone.
 */
export interface PinUnlockProps {
  lang: string;
  /**
   * The always-reachable help control, rendered above the lock. Required so
   * that leaving emergency numbers behind the gate has to be a decision.
   * `null` if the help control genuinely does not exist yet.
   */
  help: ReactNode;
  /** The PIN was accepted, removed, or there was none to check. Let them in. */
  onUnlocked: () => void;
  /** Test seam. Left out, `lib/pin.ts` uses the browser's own storage. */
  store?: PinStore;
}

type Notice = { tone: "problem" | "good"; text: string } | null;

export default function PinUnlock({ lang, help, onUnlocked, store }: PinUnlockProps) {
  const [digits, setDigits] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  /** When the next attempt is allowed, ms since epoch, or null. */
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // onUnlocked may be a fresh closure on every render of the parent; a ref
  // keeps the "there is nothing to unlock" path from firing twice.
  const letIn = useRef(false);
  const open = (): void => {
    if (letIn.current) return;
    letIn.current = true;
    setDigits("");
    onUnlocked();
  };

  useEffect(() => onQuickExit(() => setDigits("")), []);

  // If there is no PIN to check, this screen has no business existing. Read
  // once on mount, deliberately with no dependencies: re-running it would let
  // a storage hiccup mid-typing bounce the child out of the screen they are
  // using, and `store` is a test seam that never changes in the app.
  useEffect(() => {
    if (pinStatus(store) !== "set") open();
  }, []);

  const waitMs = openAt === null ? 0 : Math.max(0, openAt - now);

  /**
   * Begin a wait.
   *
   * `now` is re-anchored in the same update as `openAt`, because otherwise it
   * is whatever the clock said when this screen mounted and the countdown
   * opens on a number minutes too large until the first tick corrects it.
   */
  const startWait = (ms: number): void => {
    const at = Date.now();
    setNow(at);
    setOpenAt(at + ms);
  };

  useEffect(() => {
    if (openAt === null) return;
    // Four ticks a second: the seconds label never looks stuck, and the timer
    // stops the moment the wait is over rather than running for the session.
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [openAt]);

  useEffect(() => {
    if (openAt !== null && now >= openAt) {
      setOpenAt(null);
      setNotice(null);
    }
  }, [now, openAt]);

  const submit = async (): Promise<void> => {
    if (busy || waitMs > 0) return;

    setBusy(true);
    const result = await checkPin(digits, store);
    setBusy(false);

    if (result.ok) {
      open();
      return;
    }

    switch (result.reason) {
      case "wrong":
        // Cleared, so the next try starts from nothing rather than from a
        // wrong number the child has to spot and delete.
        setDigits("");
        setNotice({ tone: "problem", text: fill("pin.unlock.wrong", lang) });
        if (result.retryInMs > 0) startWait(result.retryInMs);
        break;

      case "waiting":
        startWait(result.retryInMs);
        break;

      case "format":
        setNotice({ tone: "problem", text: fill("pin.set.tooShort", lang) });
        break;

      case "none":
      case "unavailable":
        // See reason 2 in the file comment: there is no hash we can read, so
        // there is no PIN to be wrong about.
        open();
        break;
    }
  };

  const forget = (): void => {
    clearPin(store);
    open();
  };

  const seconds = Math.ceil(waitMs / 1000);
  const primary =
    "min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page disabled:opacity-40";
  const secondary =
    "min-h-tap rounded-card border border-line bg-surface px-4 text-base font-medium text-ink";

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-5 px-4 py-6">
      {/* First in the document, not last: a child in trouble reaches this
          before the keypad, with a screen reader or with their eyes. */}
      {help}

      <h1 className="text-2xl font-semibold tracking-tight">{fill("pin.unlock.title", lang)}</h1>
      <p className="text-base text-ink-soft">{fill("pin.unlock.hint", lang)}</p>

      {waitMs > 0 ? (
        <PinNotice tone="problem">
          {fill("pin.unlock.wait", lang, { seconds: String(seconds) })}
        </PinNotice>
      ) : notice ? (
        <PinNotice tone={notice.tone}>{notice.text}</PinNotice>
      ) : null}

      <PinKeypad
        label={fill("pin.unlock.title", lang)}
        value={digits}
        onChange={setDigits}
        onSubmit={() => void submit()}
        disabled={busy || waitMs > 0}
        lang={lang}
      />

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || waitMs > 0 || !isValidPin(digits)}
        className={primary}
      >
        {busy ? fill("pin.unlock.checking", lang) : fill("pin.unlock.button", lang)}
      </button>

      {/* Never disabled, not even during the wait: the wait is there to slow
          guessing down, and a child who has given up on remembering should not
          have to wait for the way out. */}
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        {forgot ? (
          <>
            <p className="text-base">{fill("pin.unlock.forgotHelp", lang)}</p>
            <button
              type="button"
              onClick={forget}
              className="min-h-tap rounded-card bg-help-soft px-4 text-base font-semibold text-help"
            >
              {fill("pin.remove.yes", lang)}
            </button>
            <button type="button" onClick={() => setForgot(false)} className={secondary}>
              {fill("pin.remove.no", lang)}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setForgot(true)} className={secondary}>
            {fill("pin.unlock.forgot", lang)}
          </button>
        )}
      </div>
    </section>
  );
}
