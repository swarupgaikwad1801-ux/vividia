/**
 * The pop-up when what the child wrote or picked means danger: 110 and 112 as
 * big buttons that dial, then krisenchat, then "Continue".
 *
 * It replaces DangerLine. Vernika on #77: with the red line removed (Neel,
 * 26 Oct), an urgent result showed nothing at all except the Need help glow,
 * and with reduced motion not even that. CLAUDE.md, a Must: if the child
 * writes about danger, show 110/112 at once. The glow (`HelpPulse`) stays as
 * well; it is just no longer the only thing.
 *
 * ## Rules this follows
 *
 * - **No number typed here or in strings.ts** (`lib/__tests__/lib.test.ts`).
 *   110, 112 and krisenchat come out of `content/helplines.json`, the one
 *   place a contact is defined: built into the app (lib/contacts.ts) so they
 *   show at once, then refreshed from `/api/emergency` and `/api/resources`.
 *   A network failure keeps the built-in numbers on screen.
 * - **krisenchat's languages are printed** (`languageNote`): it is German and
 *   Ukrainian, and a child must not find that out on the line.
 * - **Nothing moves.** No animation class, so reduced motion loses nothing.
 * - **Leave now stays on top.** The backdrop is z-30, the sticky bar with
 *   Leave now is z-40 (QuickExitButton), and Tab reaches Leave now from the
 *   dialog. Esc closes the dialog without stopping the event, so three quick
 *   Escapes still leave the app (`lib/quickExit.ts`).
 * - **Continue only closes.** Whatever the child wrote or picked is state in
 *   the screen behind, which this never touches.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Resource } from "../types/api.ts";
import { emergency, resources } from "../lib/api.ts";
import { BUILT_IN_EMERGENCY, BUILT_IN_HELPLINES } from "../lib/contacts.ts";
import { languageNote } from "../lib/help.ts";
import { t, type StringKey } from "../lib/strings.ts";
import { DANGER } from "../lib/pictures.ts";

// --- when it opens ------------------------------------------------------------

/** Set while danger is on screen; index.css makes Need help glow. */
const FLAG = "danger";

/**
 * Need help glows while this is mounted. Kept beside the pop-up, not instead
 * of it: a child who closed the pop-up still sees where help is.
 */
export function HelpPulse() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset[FLAG] = "1";
    return () => {
      delete root.dataset[FLAG];
    };
  }, []);
  return null;
}

/**
 * Open for this result? Only when it is urgent and its text is not the one
 * the pop-up was already shown for: Continue, a re-render, or answering a
 * question about the same words must not bring it back. New words, checked
 * again, are a new result.
 */
export function opensForResult(result: { safety: { urgent: boolean } } | null, text: string, shownFor: string | null): boolean {
  return !!result && result.safety.urgent && text !== shownFor;
}

/**
 * The chat's messages, as the chat's own safety check saw them, for this
 * page load only (memory, never storage). Review, 28 Oct: one sentence
 * opened the pop-up in the chat and again on "Make a card", because the
 * card's check reads the same words.
 */
const chatChecked = new Set<string>();
const chatShown = new Set<string>();

/** The chat checked this message; `shown` when it opened the pop-up for it. */
export function noteChatChecked(text: string, shown: boolean): void {
  const words = text.trim();
  if (!words) return;
  chatChecked.add(words);
  if (shown) chatShown.add(words);
}

/**
 * True only when the pop-up was already shown in the chat for these words
 * and the card holds nothing the chat did not check. Any new words, which
 * the chat never saw, open it again: a missed pop-up costs more than a
 * repeated one.
 */
export function shownAlreadyInChat(text: string): boolean {
  let rest = text;
  let shown = false;
  for (const words of [...chatChecked].sort((a, b) => b.length - a.length)) {
    if (!rest.includes(words)) continue;
    if (chatShown.has(words)) shown = true;
    rest = rest.split(words).join(" ");
  }
  return shown && !/[\p{L}\p{N}]/u.test(rest);
}

/** Open for this tap? Only when it adds a danger tile to a pick that had none. */
export function opensForTiles(before: readonly string[], after: readonly string[]): boolean {
  const danger = (codes: readonly string[]) => codes.some((code) => (DANGER as readonly string[]).includes(code));
  return !danger(before) && danger(after);
}

// --- the dialog ---------------------------------------------------------------

const TEL = (contact: string) => `tel:${contact.replace(/[^+\d]/g, "")}`;

/**
 * The label under each emergency number, by position: `/api/emergency`
 * serves helplines.json's `emergency` list in file order, police then
 * emergency (a test pins that order), and its names are German only. Keyed
 * on position, never on the number, which is not typed anywhere here. An
 * unexpected extra contact keeps its own name.
 */
const EMERGENCY_LABELS: readonly StringKey[] = ["danger.police", "danger.ambulance"];

export function emergencyLabel(contact: Resource, index: number, lang: string): string {
  const key = EMERGENCY_LABELS[index];
  return key ? t(key, lang) : contact.name;
}

export interface DangerDialogViewProps {
  lang: string;
  /** 110 and 112, in file order. `null` while loading. */
  contacts: readonly Resource[] | null;
  /** `/api/emergency` failed: say where help is instead of the numbers. */
  failed: boolean;
  /** krisenchat, when `/api/resources` has answered. */
  chat: Resource | null;
  /**
   * The safety check's own calm text (`safety.message_child`), already in the
   * child's language. Shown instead of `danger.hint` when it is non-empty;
   * the picture path has none and keeps the hint.
   */
  message?: string;
  onContinue: () => void;
}

/** What the dialog shows, without fetching or a portal, so a test can render it. */
export function DangerDialogView({ lang, contacts, failed, chat, message, onContinue }: DangerDialogViewProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="danger-title"
      aria-describedby="danger-hint"
      className="flex max-h-[85dvh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-card border-[3px] border-help bg-surface p-5"
    >
      <h2 id="danger-title" className="text-2xl font-bold text-ink">
        {t("danger.title", lang)}
      </h2>
      <p id="danger-hint" className="text-base text-ink">
        {failed ? t("help.dangerLineNoNumber", lang) : message?.trim() || t("danger.hint", lang)}
      </p>

      {!failed && contacts && contacts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {contacts.map((contact, index) => (
            <li key={`${contact.name}-${contact.contact}`}>
              <a
                href={TEL(contact.contact)}
                data-danger-call
                className="flex min-h-tap flex-col items-center rounded-card border-[3px] border-help bg-help px-4 py-3 text-page"
              >
                <span className="text-3xl font-bold">{contact.contact}</span>
                <span className="text-base font-medium">{emergencyLabel(contact, index, lang)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {chat && (
        <section className="flex flex-col gap-0.5 rounded-card border-[3px] border-ink p-4">
          <h3 className="text-base font-medium text-ink">{t("danger.orWrite", lang)}</h3>
          <a href={chat.contact} className="min-h-tap text-lg font-bold text-help underline break-all">
            {chat.name}
          </a>
          <span className="text-sm text-ink-soft">{chat.hours}</span>
          <span className="text-sm text-ink-soft">{languageNote(chat, lang)}</span>
        </section>
      )}

      {/* Pinned to the dialog's bottom edge: on an iPhone it sat below the
          fold, so closing the pop-up meant finding a scroll first (review,
          28 Oct). */}
      <button
        type="button"
        onClick={onContinue}
        data-danger-continue
        className="sticky bottom-0 min-h-tap shrink-0 rounded-card border-[3px] border-ink bg-surface px-4 text-lg font-bold text-ink"
      >
        {t("danger.continue", lang)}
      </button>
    </div>
  );
}

/** Everything the child can reach with Tab while the dialog is open. */
function tabStops(dialog: HTMLElement): HTMLElement[] {
  const inside = [...dialog.querySelectorAll<HTMLElement>("a[href], button")];
  const leave = document.querySelector<HTMLElement>("[data-quick-exit]");
  return leave ? [...inside, leave] : inside;
}

export interface DangerDialogProps {
  lang: string;
  /** `safety.message_child` on the Write path; see DangerDialogViewProps. */
  message?: string;
  /** Continue or Esc: closes the dialog and nothing else. */
  onClose: () => void;
}

const krisenchat = (list: readonly Resource[]) => list.find((r) => /krisenchat/i.test(r.name)) ?? null;

/** Mount it to open it; the screen unmounts it on `onClose`. */
export default function DangerDialog({ lang, message, onClose }: DangerDialogProps) {
  // Built into the app first (lib/contacts.ts), so 110/112 show at once,
  // offline and while the server wakes; the network only refreshes them.
  const [contacts, setContacts] = useState<readonly Resource[]>(BUILT_IN_EMERGENCY);
  const [chat, setChat] = useState<Resource | null>(() => krisenchat(BUILT_IN_HELPLINES));
  const box = useRef<HTMLDivElement>(null);

  // Fetched separately, as on the Help screen: 110/112 must not wait on, or
  // fail with, the second list. A failure keeps the built-in numbers.
  useEffect(() => {
    let live = true;
    emergency(lang)
      .then((res) => live && res.contacts.length > 0 && setContacts(res.contacts))
      .catch(() => {});
    resources(lang)
      .then((res) => live && setChat(krisenchat(res.resources) ?? krisenchat(BUILT_IN_HELPLINES)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lang]);

  // Focus on the first call button when the pop-up opens, else on Continue.
  // Once only: the numbers are there from the start, and a refresh from the
  // network must not pull focus away from where the child has tabbed to.
  useEffect(() => {
    const dialog = box.current;
    if (!dialog) return;
    const first = dialog.querySelector<HTMLElement>("[data-danger-call]") ?? dialog.querySelector<HTMLElement>("[data-danger-continue]");
    first?.focus();
  }, []);

  // Esc closes; Tab cycles inside the dialog and Leave now.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dialog = box.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        // Not stopped: three quick Escapes must still leave the app.
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const stops = tabStops(dialog);
      if (stops.length === 0) return;
      const at = stops.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : (at === -1 || at === stops.length - 1 ? 0 : at + 1);
      event.preventDefault();
      stops[next].focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    // z-30: under the sticky bar (z-40), so Leave now stays visible and tappable.
    <div ref={box} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/60 px-4 pt-16 pb-4">
      <DangerDialogView lang={lang} contacts={contacts} failed={false} chat={chat} message={message} onContinue={onClose} />
    </div>,
    document.body,
  );
}
