/**
 * Bigger text and easier reading (CLAUDE.md Tier A: "large-text and
 * dyslexia-friendly mode"). Stored only in this browser.
 *
 * - **Bigger text** raises the root font size. Every size in the app is in
 *   rem (Tailwind), so text, buttons and spacing grow together and nothing
 *   overlaps; layouts were checked at 360px.
 * - **Easier reading** applies the text-spacing values WCAG 2.2 (1.4.12)
 *   names: line height 1.5, letter spacing 0.12em, word spacing 0.16em, with
 *   no italics and no justified text. No special "dyslexia font": the evidence
 *   that one helps is weak, and spacing is what the guidance agrees on.
 *
 * - **Darker colours** (27 Oct) switches to the night palette in index.css.
 *   An option, not the default: in Garrido et al. 2024 most young people
 *   (13-25) liked dark palettes, but some found dark gloomy.
 *
 * - **Vibrate on tap** (27 Oct): a short tick when a button or tile is
 *   pressed (main.tsx). Off by default and never automatic: a phone that
 *   buzzes can be heard in a quiet room, which matters for a child using
 *   this without others knowing. Android only; iPhones ignore it.
 *
 * Applied as attributes on <html> (`data-large`, `data-easy-read`,
 * `data-night`, `data-haptics`) and read
 * before the first paint (main.tsx), so the app never flashes small first.
 * Storage that refuses is not an error: the setting holds for this visit.
 */

export const DISPLAY_KEY = "vividia.display.v1";

export interface Display {
  large: boolean;
  easyRead: boolean;
  night: boolean;
  haptics: boolean;
}

export const PLAIN: Display = { large: false, easyRead: false, night: false, haptics: false };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let override: StorageLike | null = null;
let memory: Display = PLAIN;

/** Test seam, the same shape as the other stores. */
export function useStorage(next: StorageLike | null): void {
  override = next;
  memory = PLAIN;
}

function storage(): StorageLike | null {
  if (override) return override;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The saved setting, or plain. Damaged data reads as plain, never a throw. */
export function readDisplay(): Display {
  try {
    const raw = storage()?.getItem(DISPLAY_KEY);
    if (!raw) return memory;
    const v = JSON.parse(raw) as Partial<Display> | null;
    return { large: v?.large === true, easyRead: v?.easyRead === true, night: v?.night === true, haptics: v?.haptics === true };
  } catch {
    return memory;
  }
}

export function saveDisplay(next: Display): void {
  memory = next;
  try {
    storage()?.setItem(DISPLAY_KEY, JSON.stringify(next));
  } catch {
    // Kept in memory for this visit.
  }
}

/** Put the setting on <html>, where index.css reads it. No-op with no document. */
export function applyDisplay(display: Display): void {
  try {
    const root = globalThis.document?.documentElement;
    if (!root) return;
    root.toggleAttribute("data-large", display.large);
    root.toggleAttribute("data-easy-read", display.easyRead);
    root.toggleAttribute("data-night", display.night);
    root.toggleAttribute("data-haptics", display.haptics);
  } catch {
    // Nothing worth breaking a screen over.
  }
}
