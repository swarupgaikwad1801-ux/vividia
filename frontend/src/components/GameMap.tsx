/**
 * The journey as a little map: coloured stops on a winding path (one per
 * picture question, then the card, who sees it, done), and the child's own
 * traveller standing on the one they are at.
 *
 * Moving on walks the traveller forward; Back walks it back. There is nothing
 * to collect and no score: places are not "levels", and none is locked.
 * Decorative for a screen reader except one sentence saying where they are.
 */

import { useState } from "react";

import { AVATARS, AvatarGroup, AvatarHead } from "../art/People";
import { Sparkle } from "../art/Things";
import { MAP_PLACES, type Glyph as GlyphKind } from "../lib/scenes";
import { fill, t } from "../lib/strings";

const INK = "#1B1B2F";
const SCENE_FILL: Record<string, string> = {
  sun: "#FFD23F",
  sky: "#4CC9F0",
  grass: "#38D47A",
  pink: "#FF6FB5",
  lilac: "#B69CFF",
};

// Evenly spaced across the 340-wide drawing, alternating low and high. Low
// enough that the traveller on a high stop stays inside the frame.
const N = MAP_PLACES.length;
const XS = MAP_PLACES.map((_, i) => 22 + (i * 296) / (N - 1));
const YS = MAP_PLACES.map((_, i) => (i % 2 === 0 ? 70 : 54));
const R = 12;

/** A tiny glyph per stop, scaled to fit inside its circle. */
function Glyph({ kind, x, y }: { kind: GlyphKind; x: number; y: number }) {
  const g = { fill: "#FFFFFF", stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (kind) {
    case "face":
      return (
        <g>
          <circle cx={x - 3.5} cy={y - 2} r="1.6" fill={INK} />
          <circle cx={x + 3.5} cy={y - 2} r="1.6" fill={INK} />
          <path d={`M${x - 4.5} ${y + 2.5} q4.5 4 9 0`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "burst":
      return <path d={`M${x} ${y - 7} l2 5 l5 -1 l-3 4 l3 4 l-5 -1 l-2 5 l-2 -5 l-5 1 l3 -4 l-3 -4 l5 1 z`} {...g} />;
    case "pin":
      return (
        <g {...g}>
          <path d={`M${x} ${y + 7} q-7 -7 -7 -11 a7 7 0 0 1 14 0 q0 4 -7 11 z`} />
          <circle cx={x} cy={y - 4} r="2" fill={INK} stroke="none" />
        </g>
      );
    case "people":
      return (
        <g {...g}>
          <circle cx={x - 3.5} cy={y - 2} r="3.5" />
          <circle cx={x + 4} cy={y - 1} r="2.8" />
          <path d={`M${x - 8} ${y + 7} q4.5 -6 9 0 M${x + 1} ${y + 7} q3.5 -5 7 0`} fill="none" />
        </g>
      );
    case "calendar":
      return (
        <g {...g}>
          <rect x={x - 6} y={y - 5} width="12" height="11" rx="2" />
          <path d={`M${x - 6} ${y - 1} h12`} />
        </g>
      );
    case "heart":
      return <path d={`M${x} ${y + 6} c-8 -5 -8 -11 -4 -12 c2 0 4 2 4 3 c0 -1 2 -3 4 -3 c4 1 4 7 -4 12 z`} {...g} />;
    case "card":
      return <rect x={x - 5} y={y - 7} width="10" height="14" rx="2" {...g} />;
    case "eyes":
      return (
        <g {...g}>
          <circle cx={x - 3.5} cy={y} r="3.5" />
          <circle cx={x + 3.5} cy={y} r="3.5" />
          <circle cx={x - 3} cy={y + 0.5} r="1.2" fill={INK} stroke="none" />
          <circle cx={x + 4} cy={y + 0.5} r="1.2" fill={INK} stroke="none" />
        </g>
      );
    default:
      return <path d={`M${x - 6} ${y + 6} v-7 l6 -5 l6 5 v7 z`} {...g} />;
  }
}

/** The winding path through every stop, as one smooth curve. */
const PATH = XS.reduce((d, x, i) => {
  if (i === 0) return `M${x} ${YS[0]}`;
  const mid = (XS[i - 1] + x) / 2;
  return `${d} C ${mid} ${YS[i - 1]}, ${mid} ${YS[i]}, ${x} ${YS[i]}`;
}, "");

export interface GameMapProps {
  at: number;
  avatar: number;
  lang: string;
  /** The child tapped their traveller and picked another head. */
  onAvatar: (index: number) => void;
}

export default function GameMap({ at, avatar, lang, onAvatar }: GameMapProps) {
  const [picking, setPicking] = useState(false);
  const place = MAP_PLACES[at];
  return (
    <div className="mx-4 mt-2 flex flex-col gap-2">
    <div className="relative rounded-card border-[3px] border-ink bg-surface/90 px-1">
      <p className="sr-only">
        {fill("map.youAreHere", lang, { place: t(place.label, lang), n: at + 1, total: MAP_PLACES.length })}
      </p>
      {/* The traveller is the one thing on the map you can tap: it opens the
          heads to choose from. A real button laid over the drawing, at least
          44px, following the traveller as it moves. */}
      <button
        type="button"
        onClick={() => setPicking((open) => !open)}
        aria-expanded={picking}
        aria-label={t("avatar.change", lang)}
        className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,top] duration-500"
        style={{ left: `${(XS[at] / 340) * 100}%`, top: `${((YS[at] - 28) / 96) * 100}%` }}
      />
      <svg viewBox="0 0 340 96" aria-hidden="true" focusable="false" className="block w-full">
        {/* The path */}
        <path d={PATH} fill="none" stroke="#D9D6E8" strokeWidth="9" strokeLinecap="round" />
        <path d={PATH} fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" />
        {/* The stops. The ones already passed are filled; the rest are pale,
            so the child can see how far along they are without a number. */}
        {MAP_PLACES.map((p, i) => (
          <g key={p.label} opacity={i <= at ? 1 : 0.55}>
            <circle cx={XS[i]} cy={YS[i]} r={i === at ? R + 3 : R} fill={SCENE_FILL[p.scene]} stroke={INK} strokeWidth="3" />
            <Glyph kind={p.glyph} x={XS[i]} y={YS[i]} />
          </g>
        ))}
        <Sparkle x={326} y={16} size={6} fill="#FFD23F" />
        <Sparkle x={160} y={14} size={5} fill="#FF6FB5" />
        {/* The traveller: slides to the stop, then bobs gently. */}
        <g
          style={{
            transform: `translate(${XS[at]}px, ${YS[at] - 28}px)`,
            transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <g className="animate-bob">
            <AvatarGroup index={avatar} x={0} y={0} r={12} />
          </g>
        </g>
      </svg>
    </div>

      {/* A picture only: it never talks, and it is kept on this phone. */}
      {picking && (
        <fieldset className="animate-pop-in rounded-card border-[3px] border-ink bg-surface p-3">
          <legend className="sr-only">{t("avatar.pick", lang)}</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {AVATARS.map((_, i) => (
              <label
                key={i}
                className={`squish flex aspect-square cursor-pointer items-center justify-center rounded-full border-[3px] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 ${
                  i === avatar ? "border-ink bg-calm-soft" : "border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="avatar"
                  className="sr-only"
                  checked={i === avatar}
                  onChange={() => {
                    onAvatar(i);
                    setPicking(false);
                  }}
                  aria-label={fill("avatar.option", lang, { n: i + 1 })}
                />
                <AvatarHead index={i} className="size-full" />
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
