/**
 * The listening screen's picture: an open notebook that fills as the child
 * talks.
 *
 * Every message the child writes down adds one scribbled line to its pages,
 * drawn in with a short pen stroke, so the thing on screen proves what the
 * screen promises: what you say here is kept, line by line, and nothing else
 * happens to it. That is the whole mechanic, and it is why this is a notebook
 * and not a face. CLAUDE.md: no AI friend, and no character ever speaks. The
 * notebook listens the way paper does.
 *
 * Decoration only (aria-hidden): the conversation below it is the content.
 * The stroke animation is CSS (`.write-in` in index.css), so reduced motion
 * draws every line at once.
 */

const INK = "#1B1B2F";
const PAGE = "#FFFFFF";
const LINE = "#D9D6E8";

/** Ten lines, five per page, left page first. */
const SLOTS = [
  ...[44, 58, 72, 86, 100].map((y) => ({ x: 26, y })),
  ...[44, 58, 72, 86, 100].map((y) => ({ x: 110, y })),
];

/** A handwriting-ish squiggle, its length varied per line so they look written. */
function scribble(x: number, y: number, index: number): string {
  const width = 46 + ((index * 17) % 18);
  const steps = Math.floor(width / 8);
  let d = `M${x} ${y}`;
  for (let i = 1; i <= steps; i++) {
    const up = i % 2 === 0 ? -3 : 2;
    d += ` q4 ${up} 8 0`;
  }
  return d;
}

export default function Notebook({ lines, className }: { lines: number; className?: string }) {
  const shown = Math.min(lines, SLOTS.length);
  const pen = SLOTS[Math.max(0, Math.min(shown, SLOTS.length - 1))];

  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" focusable="false">
      {/* Shadow, cover, then the two pages: the chunky offset shadow every
          card in the app has. */}
      <rect x="14" y="22" width="178" height="108" rx="12" fill={INK} />
      <rect x="8" y="16" width="178" height="108" rx="12" fill="#E3A0BA" stroke={INK} strokeWidth="4" />
      <path d="M18 26 h74 a6 6 0 0 1 6 6 v84 h-74 a6 6 0 0 1 -6 -6 z" fill={PAGE} stroke={INK} strokeWidth="3" />
      <path d="M176 26 h-74 a6 6 0 0 0 -6 6 v84 h74 a6 6 0 0 0 6 -6 z" fill={PAGE} stroke={INK} strokeWidth="3" />
      <line x1="97" y1="28" x2="97" y2="116" stroke={INK} strokeWidth="3" />

      {/* The empty ruling, so an empty notebook still reads as a notebook. */}
      {SLOTS.map(({ x, y }) => (
        <line key={`${x}-${y}`} x1={x} y1={y + 3} x2={x + 62} y2={y + 3} stroke={LINE} strokeWidth="2" />
      ))}

      {/* The child's lines. Only the newest animates: the others are already
          written. Keyed by index so an earlier line never redraws. */}
      {SLOTS.slice(0, shown).map(({ x, y }, index) => (
        <path
          key={index}
          d={scribble(x, y, index)}
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
          className={index === shown - 1 ? "write-in" : undefined}
        />
      ))}

      {/* A small heart on the first page, so the book is clearly a kind one. */}
      <path
        d="M168 36 c-3 -5 -10 -3 -9 3 c1 4 9 9 9 9 s8 -5 9 -9 c1 -6 -6 -8 -9 -3 z"
        fill="#E3A0BA"
        stroke={INK}
        strokeWidth="2"
      />

      {/* The pencil rests at the next empty line. Two groups, because the
          bob is a CSS transform, and a CSS transform replaces the SVG
          transform attribute on the same element: on one group the pencil
          lost its place and sat in the corner (seen in the 360px render). */}
      <g transform={`translate(${pen.x + 58} ${pen.y - 22}) rotate(35)`}>
        <g>
          <rect x="0" y="0" width="9" height="34" rx="2" fill="#EBC88A" stroke={INK} strokeWidth="2.5" />
          <rect x="0" y="0" width="9" height="7" rx="2" fill="#FF8FB8" stroke={INK} strokeWidth="2.5" />
          <path d="M0 34 l4.5 9 l4.5 -9 z" fill="#F9D7BE" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}
