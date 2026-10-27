/**
 * People, drawn for this app: the adults a child can choose to show the card
 * to, and the kid heads a child can pick as their traveller on the map.
 *
 * Chunky: a big head on a small body, simple shapes, a thick ink outline,
 * no rosy cheeks (removed 27 Oct, for an audience up to about 20). Many skin tones and hair types. They are pictures of people,
 * never speakers: no speech bubbles, no names, no text in the art (CLAUDE.md:
 * no AI friend, no mascot). All aria-hidden: the label next to each picture
 * is what a screen reader reads.
 */

import type { ReactNode } from "react";

const INK = "#1B1B2F";

export const SKIN = ["#F9D7BE", "#E8B48E", "#C98B5E", "#A0663F", "#6E4128", "#4A2C1C"] as const;

type Hair = "short" | "bun" | "curly" | "long" | "puffs" | "cap" | "none";

interface HeadSpec {
  skin: string;
  hair: Hair;
  hairColor: string;
  glasses?: boolean;
}

/** A head centred on (cx, cy) with radius r. */
function Head({ cx, cy, r, skin, hair, hairColor, glasses }: HeadSpec & { cx: number; cy: number; r: number }) {
  const s = r / 30;
  const back: ReactNode = (() => {
    switch (hair) {
      case "long":
        return <rect x={cx - r * 1.05} y={cy - r * 0.6} width={r * 2.1} height={r * 1.9} rx={r * 0.9} fill={hairColor} stroke={INK} strokeWidth={3 * s} />;
      case "puffs":
        return (
          <>
            <circle cx={cx - r * 0.95} cy={cy - r * 0.75} r={r * 0.45} fill={hairColor} stroke={INK} strokeWidth={3 * s} />
            <circle cx={cx + r * 0.95} cy={cy - r * 0.75} r={r * 0.45} fill={hairColor} stroke={INK} strokeWidth={3 * s} />
          </>
        );
      case "bun":
        return <circle cx={cx} cy={cy - r * 1.1} r={r * 0.42} fill={hairColor} stroke={INK} strokeWidth={3 * s} />;
      case "curly":
        return (
          <g fill={hairColor} stroke={INK} strokeWidth={3 * s}>
            {[-0.85, -0.45, 0, 0.45, 0.85].map((k) => (
              <circle key={k} cx={cx + r * k} cy={cy - r * 0.8 + Math.abs(k) * r * 0.3} r={r * 0.4} />
            ))}
          </g>
        );
      default:
        return null;
    }
  })();

  const front: ReactNode = (() => {
    switch (hair) {
      case "none":
        return null;
      case "cap":
        return (
          <>
            <path d={`M${cx - r} ${cy - r * 0.15} a ${r} ${r} 0 0 1 ${2 * r} 0 z`} fill={hairColor} stroke={INK} strokeWidth={3 * s} />
            <rect x={cx} y={cy - r * 0.28} width={r * 1.25} height={r * 0.26} rx={r * 0.13} fill={hairColor} stroke={INK} strokeWidth={3 * s} />
          </>
        );
      default:
        // A fringe over the top of the head.
        return (
          <path
            d={`M${cx - r} ${cy - r * 0.05} a ${r} ${r} 0 0 1 ${2 * r} 0 q ${-r * 0.5} ${-r * 0.45} ${-r} ${-r * 0.3} q ${-r * 0.5} ${r * 0.15} ${-r} ${r * 0.3} z`}
            fill={hairColor}
            stroke={INK}
            strokeWidth={3 * s}
            strokeLinejoin="round"
          />
        );
    }
  })();

  return (
    <g>
      {back}
      <circle cx={cx} cy={cy} r={r} fill={skin} stroke={INK} strokeWidth={3.5 * s} />
      {front}
      <circle cx={cx - r * 0.33} cy={cy + r * 0.05} r={r * 0.11} fill={INK} />
      <circle cx={cx + r * 0.33} cy={cy + r * 0.05} r={r * 0.11} fill={INK} />
      {glasses && (
        <g fill="none" stroke={INK} strokeWidth={2.5 * s}>
          <circle cx={cx - r * 0.33} cy={cy + r * 0.05} r={r * 0.26} />
          <circle cx={cx + r * 0.33} cy={cy + r * 0.05} r={r * 0.26} />
          <path d={`M${cx - r * 0.07} ${cy + r * 0.05} h ${r * 0.14}`} />
        </g>
      )}
      <path
        d={`M${cx - r * 0.28} ${cy + r * 0.42} q ${r * 0.28} ${r * 0.28} ${r * 0.56} 0`}
        fill="none"
        stroke={INK}
        strokeWidth={3 * s}
        strokeLinecap="round"
      />
    </g>
  );
}

interface AdultSpec extends HeadSpec {
  outfit: string;
  prop?: "book" | "lanyard" | "heart" | "whistle";
}

/** One grown-up, standing: a small rounded body and a big head. */
function Adult({ x = 0, scale = 1, spec }: { x?: number; scale?: number; spec: AdultSpec }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`}>
      <rect x="26" y="74" width="48" height="44" rx="18" fill={spec.outfit} stroke={INK} strokeWidth="3.5" />
      {spec.prop === "lanyard" && (
        <>
          <path d="M40 76 L50 92 L60 76" fill="none" stroke={INK} strokeWidth="2.5" />
          <rect x="44" y="91" width="12" height="15" rx="2" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" />
        </>
      )}
      {spec.prop === "book" && (
        <rect x="52" y="88" width="20" height="16" rx="2" fill="#4CC9F0" stroke={INK} strokeWidth="2.5" transform="rotate(-8 62 96)" />
      )}
      {spec.prop === "heart" && (
        <path d="M44 92 c0 -6 8 -6 6 0 c-2 -6 6 -6 6 0 c0 5 -6 8 -6 11 c0 -3 -6 -6 -6 -11 z" fill="#FF6FB5" stroke={INK} strokeWidth="2" />
      )}
      {spec.prop === "whistle" && (
        <>
          <path d="M40 76 L50 90 L60 76" fill="none" stroke={INK} strokeWidth="2.5" />
          <circle cx="50" cy="93" r="4" fill="#FFD23F" stroke={INK} strokeWidth="2" />
        </>
      )}
      <Head cx={50} cy={44} r={28} {...spec} />
    </g>
  );
}

/** The adults the handoff screen offers, by AdultId. */
export const ADULTS: Record<string, AdultSpec[]> = {
  classTeacher: [{ skin: SKIN[2], hair: "bun", hairColor: "#3B2A20", outfit: "#38D47A", glasses: true, prop: "book" }],
  trustedTeacher: [{ skin: SKIN[0], hair: "short", hairColor: "#C9763A", outfit: "#B69CFF", prop: "heart" }],
  socialWorker: [{ skin: SKIN[4], hair: "curly", hairColor: "#1B1B2F", outfit: "#FFD23F", prop: "lanyard" }],
  family: [
    { skin: SKIN[3], hair: "long", hairColor: "#2B1B14", outfit: "#FF6FB5" },
    { skin: SKIN[3], hair: "cap", hairColor: "#4CC9F0", outfit: "#38D47A" },
  ],
};

export function AdultPicture({ id, className }: { id: string; className?: string }) {
  const people = ADULTS[id] ?? ADULTS.trustedTeacher;
  const two = people.length > 1;
  return (
    <svg viewBox={two ? "0 0 150 120" : "0 0 100 120"} aria-hidden="true" focusable="false" className={className}>
      {two ? (
        <>
          <Adult x={0} spec={people[0]} />
          <Adult x={78} scale={0.72} spec={people[1]} />
        </>
      ) : (
        <Adult spec={people[0]} />
      )}
    </svg>
  );
}

/** The kid heads a child can pick as their traveller on the map. */
// The first one is the default. Short hair, not the puffs that used to lead:
// the default traveller should not read as a small child (27 Oct).
export const AVATARS: readonly HeadSpec[] = [
  { skin: SKIN[0], hair: "short", hairColor: "#F2C14E" },
  { skin: SKIN[1], hair: "puffs", hairColor: "#2B1B14" },
  { skin: SKIN[4], hair: "curly", hairColor: "#1B1B2F" },
  { skin: SKIN[2], hair: "long", hairColor: "#5A3420" },
  { skin: SKIN[3], hair: "cap", hairColor: "#FF6FB5" },
  { skin: SKIN[5], hair: "bun", hairColor: "#1B1B2F" },
];

export function AvatarHead({ index, className }: { index: number; className?: string }) {
  const spec = AVATARS[index] ?? AVATARS[0];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <Head cx={50} cy={56} r={34} {...spec} />
    </svg>
  );
}

/** For the map token: the same head, as an SVG group at (x, y) with radius r. */
export function AvatarGroup({ index, x, y, r }: { index: number; x: number; y: number; r: number }) {
  const spec = AVATARS[index] ?? AVATARS[0];
  return <Head cx={x} cy={y} r={r} {...spec} />;
}
