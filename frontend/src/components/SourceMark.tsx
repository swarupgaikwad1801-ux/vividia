/**
 * Where a line on the card came from: chosen from pictures, or the child's
 * own words. A tapped tile must never read as a quote (psychology rule for
 * the picture questions), so every entry on the card carries one of these.
 *
 * In the language the card is showing, because the adult reads it too.
 */

import { t } from "../lib/strings.ts";
import type { EntrySource } from "../lib/timeline.ts";

const INK = "#1B1B2F";

export default function SourceMark({ source, lang }: { source: EntrySource | undefined; lang: string }) {
  const pictures = source === "pictures";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-calm-soft px-2.5 py-0.5 text-sm font-semibold text-ink">
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="size-4">
        {pictures ? (
          // A little picture frame: a sun over a hill.
          <g fill="none" stroke={INK} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="2" y="3" width="16" height="14" rx="2.5" />
            <circle cx="7" cy="8" r="1.8" />
            <path d="M3 15 l5 -4 l3 3 l3 -2 l4 3" />
          </g>
        ) : (
          // A pencil.
          <path d="M4 16 l1 -4 l8 -8 l3 3 l-8 8 z M11 6 l3 3" fill="none" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        )}
      </svg>
      {t(pictures ? "card.fromPictures" : "card.ownWords", lang)}
    </span>
  );
}
