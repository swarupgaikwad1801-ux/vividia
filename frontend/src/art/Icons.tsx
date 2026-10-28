/**
 * Line icons in the sticker style: 2.5px strokes in the current text colour,
 * round ends. Used where a system emoji (🖼 ✏) clashed with the drawn art
 * (review, 28 Oct). Decoration only: the button's words are its name.
 */

/** Pictures: a framed picture with a sun and a hill. */
export function PicturesIcon({ className = "size-8 text-ink" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect x="3" y="5" width="26" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="11" cy="12" r="2.5" fill="currentColor" />
      <path d="M4.5 24 L13 16.5 L18 21 L22 17.5 L27.5 23" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Writing: a pencil on a line. */
export function PencilIcon({ className = "size-8 text-ink" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <path d="M7 22 L21 8 L25 12 L11 26 L6 27 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 11 L22 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 29 L28 29" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
