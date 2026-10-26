import { useEffect, useId } from "react";

import { MAX_DIGITS } from "../lib/pin";
import { pinText } from "./pinText";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * The number pad both PIN screens type into.
 *
 * ## Why a pad of our own rather than `<input type="password">`
 *
 * A child may be entering this in a hurry, one-handed, on a cheap phone, while
 * someone is in the room. A text input means waiting for the system keyboard
 * to animate up, then hitting 6mm letter keys. These are nine big targets that
 * are in the same place every time, and they appear with the screen.
 *
 * The buttons are well over the 44px floor (`min-h-tap` plus padding) because
 * the floor is the minimum for a calm thumb, not a shaking one.
 *
 * ## What is shown back
 *
 * Dots, not digits. The realistic threat `lib/pin.ts` describes is someone
 * stood next to the child, so echoing the numbers at 24px would hand the PIN
 * to exactly the person it is meant to stop. One dot per digit typed, so the
 * child can still see how far they have got.
 *
 * A physical keyboard works too (school tablet with a case, a judge on a
 * laptop): digits type, Backspace deletes, Enter submits. Events from a real
 * input are left alone, so this cannot eat someone else's typing.
 */
export interface PinKeypadProps {
  /** Visible label for the field, e.g. "Choose your PIN". */
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Enter on a physical keyboard. */
  onSubmit?: () => void;
  disabled?: boolean;
  lang: string;
}

export default function PinKeypad({
  label,
  value,
  onChange,
  onSubmit,
  disabled = false,
  lang,
}: PinKeypadProps) {
  const labelId = useId();

  useEffect(() => {
    if (disabled) return;

    const onKey = (event: KeyboardEvent): void => {
      // Never steal a keystroke meant for a real field. Nothing else on these
      // screens has one today, but the keypad may end up on a screen that does.
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        if (value.length < MAX_DIGITS) onChange(value + event.key);
      } else if (event.key === "Backspace") {
        onChange(value.slice(0, -1));
      } else if (event.key === "Enter" && onSubmit) {
        onSubmit();
      } else {
        // Escape in particular: the quick exit owns it, and swallowing it here
        // would break the one shortcut that has to work.
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onChange, onSubmit, disabled]);

  const press = (digit: string): void => {
    if (value.length < MAX_DIGITS) onChange(value + digit);
  };

  const digitClass =
    "min-h-tap rounded-card border border-line bg-surface py-3 text-2xl font-semibold text-ink active:bg-calm-soft disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      <p id={labelId} className="text-base font-medium">
        {label}
      </p>

      {/* Dots are decoration; the live region below is what a screen reader
          hears, so it is not read twice. */}
      <div
        aria-hidden="true"
        className="min-h-tap flex items-center justify-center gap-2 rounded-card border border-line bg-surface px-3"
      >
        {value.length === 0 ? (
          <span className="text-base text-ink-soft">{pinText("pin.keypad.empty", lang)}</span>
        ) : (
          [...value].map((_, index) => (
            <span key={index} className="h-3 w-3 rounded-full bg-calm" />
          ))
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {pinText("pin.keypad.entered", lang, { count: String(value.length) })}
      </p>

      <div role="group" aria-labelledby={labelId} className="grid grid-cols-3 gap-2">
        {KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => press(digit)}
            className={digitClass}
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={() => press("0")}
          className={`${digitClass} col-span-2`}
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(value.slice(0, -1))}
          aria-label={pinText("pin.keypad.delete", lang)}
          className={`${digitClass} flex items-center justify-center`}
        >
          {/* Drawn rather than the ⌫ character, which is missing from the font
              on plenty of cheap Android builds and renders as a blank box. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9L3 12z" />
            <path d="M12 9l5 6M17 9l-5 6" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        disabled={disabled || value.length === 0}
        onClick={() => onChange("")}
        className="min-h-tap self-center rounded-card px-4 text-base text-ink-soft underline disabled:opacity-40"
      >
        {pinText("pin.keypad.clear", lang)}
      </button>
    </div>
  );
}
