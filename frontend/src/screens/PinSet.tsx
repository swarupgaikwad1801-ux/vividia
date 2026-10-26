import { useEffect, useState } from "react";

import PinKeypad from "../components/PinKeypad";
import PinNotice from "../components/PinNotice";
import { fill } from "../lib/strings";
import { isValidPin, pinStatus, setPin, clearPin } from "../lib/pin";
import type { PinStore } from "../lib/pin";
import { onQuickExit } from "../lib/quickExit";

/**
 * Setting, changing and removing the PIN.
 *
 * Format rules, salting, hashing and storage are all `lib/pin.ts`. Nothing in
 * this file validates a PIN, hashes one, or touches `localStorage`; it calls
 * `setPin`, reads the reason back, and says it to the child.
 *
 * ## Why this screen says so much about what the PIN is not worth
 *
 * `lib/pin.ts`: *"this is a lock on a door, not a safe: it stops someone
 * wandering in, not someone who sets out to get in."* A child who believes the
 * PIN hides their words from a determined adult may write things down they
 * would not otherwise write. So `pin.set.limit` is on screen next to the
 * keypad, not on a help page. It is the same rule as the quick exit note.
 *
 * ## Why removing the PIN is a button and not a secret
 *
 * `clearPin()` deliberately takes no PIN, because a child who forgets theirs
 * must not lose the app that holds the words they were going to show someone.
 * That only helps if the child can find it, so the way out sits on this screen
 * whenever a PIN is set, in plain words, with a two-step confirm (in-page: the
 * team forbids `window.confirm`, and a native dialog freezes QA's automation).
 *
 * What it costs is that anyone holding the phone can clear the lock too. That
 * is written down rather than designed around, because the alternative is a
 * child locked out.
 *
 * ## Confirming twice
 *
 * A mistyped PIN that is never used again is a lockout the child inflicted on
 * themselves, and the only cure would be removing the PIN — which works, but
 * is a bad first experience. Typing it twice costs five seconds.
 */
export interface PinSetProps {
  lang: string;
  /**
   * The child is finished here: PIN saved, PIN removed, or they chose not to
   * set one. Nothing on this screen sends anything anywhere, so "done" only
   * ever means "move me on".
   */
  onDone?: () => void;
  /** Test seam. Left out, `lib/pin.ts` uses the browser's own storage. */
  store?: PinStore;
}

type Stage = "enter" | "confirm" | "saved" | "removed";

type Notice = { tone: "problem" | "good"; text: string } | null;

export default function PinSet({ lang, onDone, store }: PinSetProps) {
  const [status, setStatus] = useState(() => pinStatus(store));
  const [stage, setStage] = useState<Stage>("enter");
  const [first, setFirst] = useState("");
  const [again, setAgain] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  // A half-typed PIN is in-memory state like any draft: gone before the quick
  // exit navigates, so it is not sitting on screen if navigation is slow.
  useEffect(
    () =>
      onQuickExit(() => {
        setFirst("");
        setAgain("");
      }),
    [],
  );

  const next = (): void => {
    if (!isValidPin(first)) {
      setNotice({ tone: "problem", text: fill("pin.set.tooShort", lang) });
      return;
    }
    setNotice(null);
    setStage("confirm");
  };

  const save = async (): Promise<void> => {
    if (busy) return;
    if (again !== first) {
      // Only the second entry is cleared: the child almost certainly typed the
      // PIN they meant the first time, and making them start over implies they
      // got that wrong too.
      setAgain("");
      setNotice({ tone: "problem", text: fill("pin.set.mismatch", lang) });
      return;
    }

    setBusy(true);
    const result = await setPin(first, store);
    setBusy(false);

    if (result.ok) {
      setFirst("");
      setAgain("");
      setStatus(pinStatus(store));
      setNotice({ tone: "good", text: fill("pin.set.saved", lang) });
      setStage("saved");
      return;
    }

    if (result.reason === "storage") {
      // The honest branch. `lib/pin.ts` refuses to pretend, so neither does
      // this: no "PIN saved" screen, and the child is told the device is the
      // problem rather than left to discover it next time they open the app.
      setNotice({ tone: "problem", text: fill("pin.set.noStorage", lang) });
      setStatus("unavailable");
      return;
    }

    setNotice({ tone: "problem", text: fill("pin.set.tooShort", lang) });
    setStage("enter");
  };

  const remove = (): void => {
    clearPin(store);
    setAsking(false);
    setFirst("");
    setAgain("");
    setStatus(pinStatus(store));
    setNotice({ tone: "good", text: fill("pin.remove.done", lang) });
    setStage("removed");
  };

  const restart = (): void => {
    setFirst("");
    setAgain("");
    setNotice(null);
    setStage("enter");
  };

  const primary =
    "min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page disabled:opacity-40";
  const secondary =
    "min-h-tap rounded-card border border-line bg-surface px-4 text-base font-medium text-ink";

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {fill(status === "set" ? "pin.set.titleChange" : "pin.set.title", lang)}
        </h1>
        <p className="text-base text-ink-soft">{fill("pin.set.hint", lang)}</p>
        {/* Not a footnote. See the file comment. */}
        <p className="text-sm text-ink-soft">{fill("pin.set.limit", lang)}</p>
      </header>

      {notice ? <PinNotice tone={notice.tone}>{notice.text}</PinNotice> : null}

      {status === "unavailable" ? (
        // No keypad at all: this device cannot keep a PIN, and offering the
        // pad would be inviting the child to type one into nothing.
        <>
          <PinNotice tone="problem">{fill("pin.set.noStorage", lang)}</PinNotice>
          {onDone ? (
            <button type="button" onClick={onDone} className={primary}>
              {fill("pin.set.done", lang)}
            </button>
          ) : null}
        </>
      ) : (
        <>
          {stage === "enter" ? (
            <>
              <PinKeypad
                label={fill("pin.set.enter", lang)}
                value={first}
                onChange={setFirst}
                onSubmit={next}
                lang={lang}
              />
              <button type="button" onClick={next} disabled={!isValidPin(first)} className={primary}>
                {fill("pin.set.next", lang)}
              </button>
            </>
          ) : null}

          {stage === "confirm" ? (
            <>
              <PinKeypad
                label={fill("pin.set.again", lang)}
                value={again}
                onChange={setAgain}
                onSubmit={() => void save()}
                disabled={busy}
                lang={lang}
              />
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || !isValidPin(again)}
                className={primary}
              >
                {fill("pin.set.save", lang)}
              </button>
              <button type="button" onClick={restart} className={secondary}>
                {fill("pin.set.startAgain", lang)}
              </button>
            </>
          ) : null}

          {stage === "saved" || stage === "removed" ? (
            <div className="flex flex-col gap-3">
              {stage === "removed" ? (
                <button type="button" onClick={restart} className={primary}>
                  {fill("pin.set.title", lang)}
                </button>
              ) : null}
              {onDone ? (
                <button type="button" onClick={onDone} className={stage === "removed" ? secondary : primary}>
                  {fill("pin.set.done", lang)}
                </button>
              ) : null}
            </div>
          ) : null}

          {/* The way back in, visible whenever there is a lock to undo. */}
          {status === "set" ? (
            <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
              {asking ? (
                <>
                  <p className="text-base">{fill("pin.remove.ask", lang)}</p>
                  <button
                    type="button"
                    onClick={remove}
                    className="min-h-tap rounded-card bg-help-soft px-4 text-base font-semibold text-help"
                  >
                    {fill("pin.remove.yes", lang)}
                  </button>
                  <button type="button" onClick={() => setAsking(false)} className={secondary}>
                    {fill("pin.remove.no", lang)}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setAsking(true)} className={secondary}>
                  {fill("pin.remove.button", lang)}
                </button>
              )}
            </div>
          ) : null}

          {stage === "enter" && onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="min-h-tap rounded-card px-4 text-base text-ink-soft underline"
            >
              {fill("pin.set.skip", lang)}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
