/**
 * Places and objects, drawn for this app.
 *
 * Places are cut-away boxes you look into, like a doll's house: a classroom,
 * a home, a phone, a park. Gentle and symbolic: nobody is in them, nothing
 * bad is happening in them. They answer "where?", nothing more.
 *
 * Everything is aria-hidden: the label next to each picture is what a screen
 * reader reads.
 */

import type { CSSProperties, ReactNode } from "react";

const INK = "#1B1B2F";
const W = 3.5; // outline width

function Svg({ viewBox, className, children }: { viewBox: string; className?: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}

/** "Where does this happen?" pictures, by WhereItHappens. */
export function PlacePicture({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case "school":
      return (
        <Svg viewBox="0 0 120 96" className={className}>
          <path d="M10 34 L60 8 L110 34 Z" fill="#FF6FB5" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <rect x="16" y="34" width="88" height="56" rx="6" fill="#FFF4D6" stroke={INK} strokeWidth={W} />
          <rect x="28" y="44" width="64" height="26" rx="3" fill="#2F6B4F" stroke={INK} strokeWidth={W} />
          <path d="M36 54 h18 M36 61 h28" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="34" y="76" width="22" height="8" rx="2" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
          <rect x="64" y="76" width="22" height="8" rx="2" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
          <path d="M60 8 V0" stroke={INK} strokeWidth="2.5" />
          <path d="M60 1 h12 l-3 4 l3 4 h-12 z" fill="#4CC9F0" stroke={INK} strokeWidth="2" />
        </Svg>
      );
    case "home":
      return (
        <Svg viewBox="0 0 120 96" className={className}>
          <path d="M14 40 L60 10 L106 40 Z" fill="#FF9A7A" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <rect x="20" y="40" width="80" height="50" rx="6" fill="#E9F7FF" stroke={INK} strokeWidth={W} />
          <rect x="30" y="50" width="22" height="18" rx="3" fill="#4CC9F0" stroke={INK} strokeWidth="2.5" />
          <path d="M41 50 v18 M30 59 h22" stroke={INK} strokeWidth="2" />
          <rect x="60" y="66" width="32" height="14" rx="6" fill="#B69CFF" stroke={INK} strokeWidth="2.5" />
          <rect x="62" y="58" width="12" height="10" rx="4" fill="#B69CFF" stroke={INK} strokeWidth="2.5" />
          <rect x="78" y="58" width="12" height="10" rx="4" fill="#B69CFF" stroke={INK} strokeWidth="2.5" />
        </Svg>
      );
    case "online":
      return (
        <Svg viewBox="0 0 120 96" className={className}>
          <rect x="38" y="6" width="44" height="84" rx="10" fill="#1B1B2F" />
          <rect x="43" y="14" width="34" height="66" rx="4" fill="#FFFFFF" />
          <rect x="47" y="22" width="22" height="10" rx="5" fill="#4CC9F0" stroke={INK} strokeWidth="2" />
          <rect x="51" y="38" width="22" height="10" rx="5" fill="#FFD23F" stroke={INK} strokeWidth="2" />
          <rect x="47" y="54" width="18" height="10" rx="5" fill="#38D47A" stroke={INK} strokeWidth="2" />
          <path d="M92 30 q8 8 0 16 M100 24 q14 14 0 28" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M28 30 q-8 8 0 16 M20 24 q-14 14 0 28" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </Svg>
      );
    default:
      // Somewhere else: a park path with a tree and a bench.
      return (
        <Svg viewBox="0 0 120 96" className={className}>
          <rect x="6" y="56" width="108" height="34" rx="10" fill="#38D47A" stroke={INK} strokeWidth={W} />
          <path d="M40 90 q10 -20 40 -34" fill="none" stroke="#FFF4D6" strokeWidth="10" strokeLinecap="round" />
          <rect x="24" y="36" width="8" height="26" fill="#8B5A3C" stroke={INK} strokeWidth="2.5" />
          <circle cx="28" cy="30" r="18" fill="#2FB866" stroke={INK} strokeWidth={W} />
          <rect x="78" y="50" width="28" height="6" rx="2" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
          <path d="M82 56 v8 M102 56 v8" stroke={INK} strokeWidth="2.5" />
          <circle cx="98" cy="18" r="9" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
        </Svg>
      );
  }
}

/** The three onboarding cards: words → person, you choose, the way out. */
export function OnboardingPicture({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case "what":
      return (
        <Svg viewBox="0 0 120 96" className={className}>
          <path d="M14 14 h62 a10 10 0 0 1 10 10 v28 a10 10 0 0 1 -10 10 h-36 l-14 14 v-14 h-12 a10 10 0 0 1 -10 -10 v-28 a10 10 0 0 1 10 -10 z" fill="#FFFFFF" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <path d="M26 30 h44 M26 42 h30" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M84 50 l14 -10 l0 8 h14 v4 h-14 l0 8 z" fill="#FFD23F" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </Svg>
      );
    case "you-decide":
      return (
        <Svg viewBox="0 0 120 96" className={className}>
          <circle cx="60" cy="50" r="34" fill="#FFD23F" stroke={INK} strokeWidth={W} />
          <path d="M44 52 l10 10 l22 -24" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <Sparkle x={14} y={18} size={12} />
          <Sparkle x={100} y={78} size={10} />
        </Svg>
      );
    default:
      // The way out: a door, open, with an arrow.
      return (
        <Svg viewBox="0 0 120 96" className={className}>
          <rect x="30" y="8" width="52" height="82" rx="4" fill="#FFF4D6" stroke={INK} strokeWidth={W} />
          <path d="M30 8 L58 16 V84 L30 90 Z" fill="#B69CFF" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <circle cx="51" cy="52" r="3" fill={INK} />
          <path d="M70 50 h36 m-10 -10 l10 10 l-10 10" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
  }
}

/** The four-point sparkle, our accent. */
export function Sparkle({ x = 0, y = 0, size = 10, fill = "#FFFFFF" }: { x?: number; y?: number; size?: number; fill?: string }) {
  const s = size;
  return (
    <path
      d={`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`}
      fill={fill}
      stroke={INK}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
}

/** "In a few days, the app will ask": a little sprout. */
export function SproutPicture({ className }: { className?: string }) {
  return (
    <Svg viewBox="0 0 100 100" className={className}>
      <path d="M22 78 q28 -20 56 0 v12 h-56 z" fill="#C98B5E" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      <path d="M50 74 V44" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M50 52 q-26 2 -28 -20 q24 -2 28 20 z" fill="#38D47A" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      <path d="M50 46 q22 -2 26 -22 q-24 0 -26 22 z" fill="#38D47A" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      <Sparkle x={84} y={40} size={7} fill="#FFD23F" />
    </Svg>
  );
}

/**
 * A burst of sparkles, played once when the card is shown. "You did it", not
 * "you won": no score, no sound, and nothing with reduced motion.
 */
export function SparkleBurst() {
  const bits = [
    { dx: -110, dy: -40, c: "#FFD23F" },
    { dx: -70, dy: -90, c: "#FF6FB5" },
    { dx: 0, dy: -110, c: "#4CC9F0" },
    { dx: 70, dy: -90, c: "#38D47A" },
    { dx: 110, dy: -40, c: "#B69CFF" },
    { dx: -90, dy: 30, c: "#4CC9F0" },
    { dx: 90, dy: 30, c: "#FFD23F" },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
      {bits.map((bit, i) => (
        <svg
          key={i}
          viewBox="-12 -12 24 24"
          className="animate-sparkle absolute size-6"
          style={{ "--dx": `${bit.dx}px`, "--dy": `${bit.dy}px`, animationDelay: `${i * 40}ms` } as CSSProperties}
        >
          <Sparkle size={10} fill={bit.c} />
        </svg>
      ))}
    </div>
  );
}
