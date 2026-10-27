/**
 * Small marks for the 27 Oct polish. No characters: CLAUDE.md says no AI
 * friend and no character speaks, and the app is for young people up to
 * about 20, who should not feel it was drawn for small children.
 *
 * Decoration only (aria-hidden): the note beside it is the content.
 */

const INK = "#1B1B2F";
const PINK = "#FF6FB5";
const PAGE = "#FFFFFF";

/**
 * The mark beside a screen's one line of help: a pen in a small ink circle,
 * so the line reads as a written note. Not a character, no face.
 */
export function NoteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="15" fill={INK} />
      <g transform="rotate(45 16 16)">
        <rect x="13" y="6" width="6" height="16" rx="1.5" fill={PAGE} />
        <path d="M13 22 l3 5 l3 -5 z" fill={PAGE} />
        <rect x="13" y="6" width="6" height="3.5" rx="1.5" fill={PINK} />
      </g>
    </svg>
  );
}

/** "I don't want to say": a closed zip, for the quiet button under the tiles. */
export function ZipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="13" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
      <circle cx="11" cy="12.5" r="1.8" fill={INK} />
      <circle cx="21" cy="12.5" r="1.8" fill={INK} />
      <path d="M8.5 20 h15" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M11 18.2 v3.6 M14 18.2 v3.6 M17 18.2 v3.6 M20 18.2 v3.6" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="22" y="18.5" width="4.5" height="6" rx="1.5" fill={PAGE} stroke={INK} strokeWidth="1.8" />
    </svg>
  );
}
