import { useState } from "react";

import { t, type StringKey } from "../lib/strings";

/**
 * "Need a way to start?": the first few words of a sentence, for a child
 * who freezes at an empty box. Tapping one adds it to their text, on a new
 * line, ready for them to finish. They are openings only: nothing here says
 * what happened, so the words that follow are always the child's.
 *
 * The set follows what anti-bullying services ask people to record: when,
 * what was said, what was done, who saw it, how it felt, and what they want
 * now (Kidscape's incident log; Contact's "keeping a record").
 */

export const STARTERS: readonly StringKey[] = [
  "start.when",
  "start.said",
  "start.did",
  "start.saw",
  "start.felt",
  "start.want",
];

/** `text` with `starter` added on its own line. */
export function withStarter(text: string, starter: string): string {
  if (!text.trim()) return starter;
  return `${text.replace(/\s+$/, "")}\n${starter}`;
}

export default function SentenceStarters({ lang, onPick }: { lang: string; onPick: (starter: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-tap self-start rounded-full px-1 text-sm font-bold text-ink underline decoration-2 underline-offset-4"
      >
        {t("start.title", lang)}
      </button>
      {open && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onPick(t(key, lang))}
              className="sticker min-h-tap rounded-full bg-surface px-3 text-sm font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
            >
              {t(key, lang).trim().replace(/:$/, "")}…
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
