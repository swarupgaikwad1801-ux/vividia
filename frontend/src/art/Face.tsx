/**
 * The check-in faces: one round face per mood, drawn for this app.
 *
 * Flat colour, thick ink outline, big eyes, rosy cheeks. Faces, not people:
 * the mood is the child's, so no face has a skin tone, hair or age. They are
 * decoration (aria-hidden): the label under each is the real name of the
 * choice, read out by a screen reader.
 *
 * Never alarming: "scared" has wide eyes and a small open mouth, not a
 * scream; "sad" has one small tear, not crying; "angry" is cross, not furious.
 */

import type { ReactNode } from "react";

const INK = "#1B1B2F";
const CHEEK = "#FF8FB8";

interface FaceParts {
  fill: string;
  eyes: ReactNode;
  mouth: ReactNode;
  extra?: ReactNode;
}

const dotEyes = (dy = 0) => (
  <>
    <circle cx="36" cy={44 + dy} r="5" fill={INK} />
    <circle cx="64" cy={44 + dy} r="5" fill={INK} />
  </>
);

const FACES: Record<string, FaceParts> = {
  good: {
    fill: "#FFD23F",
    eyes: (
      <>
        <path d="M29 45 q7 -9 14 0" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M57 45 q7 -9 14 0" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      </>
    ),
    mouth: (
      <>
        <path d="M31 58 q19 24 38 0 z" fill={INK} />
        <path d="M41 68 q9 6 18 0 q-9 -5 -18 0 z" fill="#FF6F91" />
      </>
    ),
  },
  ok: {
    fill: "#9EE6C2",
    eyes: dotEyes(),
    mouth: <path d="M35 64 q15 5 30 -2" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />,
  },
  sad: {
    fill: "#8FD8F5",
    eyes: (
      <>
        {dotEyes(2)}
        <path d="M28 35 l12 -4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M72 35 l-12 -4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </>
    ),
    mouth: <path d="M36 70 q14 -12 28 0" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />,
    extra: <path d="M66 52 q4 7 0 10 q-4 -3 0 -10 z" fill="#FFFFFF" stroke={INK} strokeWidth="2" />,
  },
  scared: {
    fill: "#D7C8FF",
    eyes: (
      <>
        <circle cx="36" cy="44" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="3.5" />
        <circle cx="64" cy="44" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="3.5" />
        <circle cx="36" cy="45" r="3.5" fill={INK} />
        <circle cx="64" cy="45" r="3.5" fill={INK} />
        <path d="M27 29 q9 -6 17 -1" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M56 28 q8 -5 17 1" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </>
    ),
    mouth: <ellipse cx="50" cy="68" rx="7" ry="8" fill={INK} />,
  },
  angry: {
    fill: "#FF9A7A",
    eyes: (
      <>
        {dotEyes(3)}
        <path d="M27 33 l15 6" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M73 33 l-15 6" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      </>
    ),
    mouth: <path d="M36 69 q14 -7 28 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />,
  },
  alone: {
    fill: "#FFC7A8",
    eyes: (
      <>
        <circle cx="31" cy="46" r="4.5" fill={INK} />
        <circle cx="59" cy="46" r="4.5" fill={INK} />
      </>
    ),
    mouth: <path d="M38 66 h16" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />,
    // A little "…" bubble: being on your own, without a frown.
    extra: (
      <g fill={INK}>
        <circle cx="78" cy="22" r="2.5" />
        <circle cx="86" cy="16" r="2.5" />
        <circle cx="94" cy="10" r="2.5" />
      </g>
    ),
  },
};

export function hasFace(code: string): boolean {
  return code in FACES;
}

export default function Face({ code, className }: { code: string; className?: string }) {
  const face = FACES[code] ?? FACES.ok;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <circle cx="50" cy="52" r="42" fill={face.fill} stroke={INK} strokeWidth="4.5" />
      <circle cx="26" cy="60" r="7" fill={CHEEK} opacity="0.7" />
      <circle cx="74" cy="60" r="7" fill={CHEEK} opacity="0.7" />
      {face.eyes}
      {face.mouth}
      {face.extra}
    </svg>
  );
}
