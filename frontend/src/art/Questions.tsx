/**
 * Pictures for the picture questions, drawn for this app.
 *
 * Symbolic and gentle (style brief): nobody is hurt in a picture, no faces in
 * pain, no blood, no weapons. An action is shown with an arrow, motion ticks
 * or an object. People are simple round shapes in several skin tones, never
 * anyone in particular. All aria-hidden: each tile's label is what a screen
 * reader reads.
 */

import type { ReactNode } from "react";

import { AdultPicture, SKIN } from "./People";
import { PlacePicture, Sparkle } from "./Things";

const INK = "#1B1B2F";
const W = 3.5;

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}

/** A simple round person: head and body, no face detail. */
function Person({ x, y, s = 1, skin = SKIN[2], shirt = "#4CC9F0", tilt = 0 }: { x: number; y: number; s?: number; skin?: string; shirt?: string; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <rect x="-13" y="2" width="26" height="30" rx="11" fill={shirt} stroke={INK} strokeWidth={W} />
      <circle cx="0" cy="-12" r="13" fill={skin} stroke={INK} strokeWidth={W} />
    </g>
  );
}

function Ticks({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const d = flip ? -1 : 1;
  return (
    <path
      d={`M${x} ${y} l${8 * d} -4 M${x} ${y + 10} l${10 * d} 0 M${x} ${y + 20} l${8 * d} 4`}
      stroke={INK}
      strokeWidth="3"
      strokeLinecap="round"
    />
  );
}

/** "Something else": a question mark with sparkles. Shared by every question. */
function OtherPicture({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="60" cy="48" r="32" fill="#B69CFF" stroke={INK} strokeWidth={W} />
      <path d="M50 40 q0 -12 11 -12 q11 0 11 10 q0 7 -9 10 v7" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="63" cy="68" r="3.5" fill={INK} />
      <Sparkle x={20} y={22} size={8} fill="#FFD23F" />
      <Sparkle x={100} y={74} size={7} fill="#FF6FB5" />
    </Svg>
  );
}

/** "I don't want to say": a closed speech bubble with a zip. Shared too. */
function NoSayPicture({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M24 18 h72 a10 10 0 0 1 10 10 v32 a10 10 0 0 1 -10 10 h-44 l-14 14 v-14 h-14 a10 10 0 0 1 -10 -10 v-32 a10 10 0 0 1 10 -10 z" fill="#E8F1F2" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      <path d="M32 44 h56" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      {[38, 48, 58, 68, 78].map((x) => (
        <path key={x} d={`M${x} 39 v10`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      ))}
      <rect x="84" y="38" width="10" height="13" rx="3" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
    </Svg>
  );
}

function WhatPicture({ code, className }: { code: string; className?: string }) {
  switch (code) {
    case "pushed":
      return (
        <Svg className={className}>
          <Person x={44} y={54} skin={SKIN[1]} shirt="#FF6FB5" />
          <Person x={82} y={56} skin={SKIN[3]} shirt="#38D47A" tilt={14} />
          <path d="M54 46 h14 m-6 -6 l6 6 l-6 6" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <Ticks x={100} y={34} />
        </Svg>
      );
    case "hit":
      return (
        <Svg className={className}>
          {/* An impact star and motion lines: the action, not a person hurt. */}
          <path d="M60 14 l9 18 l20 -6 l-10 18 l18 12 l-21 2 l2 21 l-18 -12 l-16 14 l1 -21 l-20 -4 l17 -12 l-10 -18 l20 6 z" fill="#FFD23F" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <Ticks x={14} y={34} flip />
          <Ticks x={106} y={34} />
        </Svg>
      );
    case "names":
      return (
        <Svg className={className}>
          <path d="M18 14 h70 a10 10 0 0 1 10 10 v30 a10 10 0 0 1 -10 10 h-40 l-14 14 v-14 h-16 a10 10 0 0 1 -10 -10 v-30 a10 10 0 0 1 10 -10 z" fill="#FF9A7A" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <path d="M28 38 q5 -10 10 0 t10 0 M58 30 l8 16 M66 30 l-8 16 M76 32 a5 5 0 1 0 0.1 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </Svg>
      );
    case "taken":
      return (
        <Svg className={className}>
          <rect x="22" y="28" width="40" height="50" rx="10" fill="#4CC9F0" stroke={INK} strokeWidth={W} />
          <path d="M32 28 v-6 a10 10 0 0 1 20 0 v6" fill="none" stroke={INK} strokeWidth={W} />
          <rect x="30" y="48" width="24" height="14" rx="4" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
          <path d="M70 50 h34 m-10 -10 l10 10 l-10 10" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "left_out":
      return (
        <Svg className={className}>
          <Person x={26} y={56} s={0.8} skin={SKIN[0]} shirt="#FF6FB5" />
          <Person x={48} y={56} s={0.8} skin={SKIN[4]} shirt="#FFD23F" />
          <Person x={37} y={50} s={0.8} skin={SKIN[2]} shirt="#38D47A" />
          <path d="M66 22 v56" stroke={INK} strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
          <Person x={92} y={56} s={0.8} skin={SKIN[3]} shirt="#B69CFF" />
        </Svg>
      );
    case "online":
      return (
        <Svg className={className}>
          <rect x="38" y="6" width="44" height="84" rx="10" fill={INK} />
          <rect x="43" y="14" width="34" height="66" rx="4" fill="#FFFFFF" />
          <rect x="47" y="24" width="26" height="22" rx="6" fill="#FF9A7A" stroke={INK} strokeWidth="2" />
          <path d="M51 35 l4 -5 l4 8 l4 -8 l4 5" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <rect x="47" y="54" width="18" height="9" rx="4.5" fill="#D9D6E8" />
        </Svg>
      );
    case "threatened":
      return (
        <Svg className={className}>
          <path d="M18 14 h70 a10 10 0 0 1 10 10 v30 a10 10 0 0 1 -10 10 h-40 l-14 14 v-14 h-16 a10 10 0 0 1 -10 -10 v-30 a10 10 0 0 1 10 -10 z" fill="#FFD23F" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <path d="M53 24 v18" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <circle cx="53" cy="53" r="4" fill={INK} />
          <Ticks x={104} y={20} />
        </Svg>
      );
    default:
      return <OtherPicture className={className} />;
  }
}

function WherePicture({ code, className }: { code: string; className?: string }) {
  switch (code) {
    case "classroom":
      return <PlacePicture id="school" className={className} />;
    case "online":
      return <PlacePicture id="online" className={className} />;
    case "schoolyard":
      return (
        <Svg className={className}>
          <rect x="6" y="54" width="108" height="36" rx="10" fill="#38D47A" stroke={INK} strokeWidth={W} />
          <path d="M14 54 v-22 M30 54 v-22 M46 54 v-22 M10 38 h40" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="86" cy="68" r="11" fill="#FFFFFF" stroke={INK} strokeWidth={W} />
          <path d="M77 64 q9 6 18 0 M86 57 v22" fill="none" stroke={INK} strokeWidth="2" />
          <circle cx="96" cy="20" r="9" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
        </Svg>
      );
    case "toilets":
      return (
        <Svg className={className}>
          <rect x="30" y="8" width="60" height="82" rx="4" fill="#E9F7FF" stroke={INK} strokeWidth={W} />
          <rect x="40" y="18" width="40" height="22" rx="4" fill="#4CC9F0" stroke={INK} strokeWidth="2.5" />
          <circle cx="52" cy="25" r="3.5" fill={INK} />
          <path d="M52 29 v8 M68 25 a3.5 3.5 0 1 0 0.1 0 M64 37 l4 -8 l4 8 z" fill={INK} stroke={INK} strokeWidth="2.5" />
          <circle cx="80" cy="58" r="3" fill={INK} />
        </Svg>
      );
    case "way_to_school":
      return (
        <Svg className={className}>
          <path d="M14 88 q30 -30 50 -40 t40 -24" fill="none" stroke="#C98B5E" strokeWidth="12" strokeLinecap="round" />
          <path d="M14 88 q30 -30 50 -40 t40 -24" fill="none" stroke="#FFF4D6" strokeWidth="3" strokeDasharray="6 8" strokeLinecap="round" />
          <path d="M84 30 l14 -12 l14 12 v18 h-28 z" fill="#FF6FB5" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="18" y="38" width="22" height="28" rx="7" fill="#4CC9F0" stroke={INK} strokeWidth="3" />
        </Svg>
      );
    default:
      return <PlacePicture id="elsewhere" className={className} />;
  }
}

function WhoPicture({ code, className }: { code: string; className?: string }) {
  switch (code) {
    case "one":
      return (
        <Svg className={className}>
          <Person x={60} y={54} s={1.3} skin={SKIN[2]} shirt="#FF6FB5" />
        </Svg>
      );
    case "several":
      return (
        <Svg className={className}>
          <Person x={34} y={58} s={0.95} skin={SKIN[0]} shirt="#4CC9F0" />
          <Person x={86} y={58} s={0.95} skin={SKIN[4]} shirt="#FFD23F" />
          <Person x={60} y={52} s={1.05} skin={SKIN[3]} shirt="#38D47A" />
        </Svg>
      );
    case "classmate":
      return (
        <Svg className={className}>
          <Person x={60} y={44} s={1} skin={SKIN[1]} shirt="#B69CFF" />
          <rect x="22" y="64" width="76" height="12" rx="3" fill="#FFD23F" stroke={INK} strokeWidth={W} />
          <path d="M32 76 v14 M88 76 v14" stroke={INK} strokeWidth={W} strokeLinecap="round" />
        </Svg>
      );
    case "older":
      return (
        <Svg className={className}>
          <Person x={42} y={64} s={0.75} skin={SKIN[2]} shirt="#4CC9F0" />
          <Person x={80} y={50} s={1.25} skin={SKIN[5]} shirt="#FF9A7A" />
          <path d="M104 74 v-50 m-6 8 l6 -8 l6 8" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "adult":
      return <AdultPicture id="trustedTeacher" className={className} />;
    default:
      return <OtherPicture className={className} />;
  }
}

function OftenPicture({ code, className }: { code: string; className?: string }) {
  if (code === "other") return <OtherPicture className={className} />;
  const filled = code === "once" ? 1 : code === "few" ? 3 : 11;
  return (
    <Svg className={className}>
      <rect x="22" y="14" width="76" height="72" rx="8" fill="#FFFFFF" stroke={INK} strokeWidth={W} />
      <rect x="22" y="14" width="76" height="16" rx="6" fill="#FF6FB5" stroke={INK} strokeWidth={W} />
      {Array.from({ length: 12 }, (_, i) => (
        <circle
          key={i}
          cx={34 + (i % 4) * 17}
          cy={42 + Math.floor(i / 4) * 14}
          r="5"
          fill={i < filled ? "#1B1B2F" : "#E8E5F2"}
        />
      ))}
    </Svg>
  );
}

export type QuestionKind = "what" | "where" | "who" | "often";

/** The picture for one tile. "no_say" and "other" look the same on every question. */
export default function QuestionPicture({ kind, code, className }: { kind: QuestionKind; code: string; className?: string }) {
  if (code === "no_say") return <NoSayPicture className={className} />;
  switch (kind) {
    case "what":
      return <WhatPicture code={code} className={className} />;
    case "where":
      return <WherePicture code={code} className={className} />;
    case "who":
      return <WhoPicture code={code} className={className} />;
    default:
      return <OftenPicture code={code} className={className} />;
  }
}
