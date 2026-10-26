/**
 * The journey as a little map: five coloured places on a winding path, and
 * the child's own traveller standing on the one they are at.
 *
 * Moving on walks the traveller forward; Back walks it back. There is nothing
 * to collect and no score: places are not "levels", and none is locked.
 * Decorative for a screen reader except one sentence saying where they are.
 */

import { useState } from "react";

import { AVATARS, AvatarGroup, AvatarHead } from "../art/People";
import { Sparkle } from "../art/Things";
import { MAP_PLACES } from "../lib/scenes";
import { fill, t } from "../lib/strings";

const INK = "#1B1B2F";
const SCENE_FILL: Record<string, string> = {
  sun: "#FFD23F",
  sky: "#4CC9F0",
  grass: "#38D47A",
  pink: "#FF6FB5",
  lilac: "#B69CFF",
};

const XS = [34, 102, 170, 238, 306];
// Low enough that the traveller standing on a high place stays inside the frame.
const YS = [70, 52, 70, 52, 70];

/** A tiny glyph for each place: a face, a pencil, a card, two people, a house. */
function Glyph({ i, x, y }: { i: number; x: number; y: number }) {
  switch (i) {
    case 0:
      return (
        <g>
          <circle cx={x - 4} cy={y - 2} r="1.8" fill={INK} />
          <circle cx={x + 4} cy={y - 2} r="1.8" fill={INK} />
          <path d={`M${x - 5} ${y + 3} q5 5 10 0`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 1:
      return <path d={`M${x - 6} ${y + 6} l2 -6 l9 -9 l4 4 l-9 9 z`} fill="#FFFFFF" stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
    case 2:
      return <rect x={x - 6} y={y - 8} width="12" height="16" rx="2" fill="#FFFFFF" stroke={INK} strokeWidth="2" />;
    case 3:
      return (
        <g fill="#FFFFFF" stroke={INK} strokeWidth="2">
          <circle cx={x - 4} cy={y - 2} r="4" />
          <circle cx={x + 5} cy={y - 1} r="3.2" />
          <path d={`M${x - 9} ${y + 8} q5 -7 10 0 M${x + 1} ${y + 8} q4 -6 8 0`} fill="none" />
        </g>
      );
    default:
      return (
        <path d={`M${x - 7} ${y + 7} v-8 l7 -6 l7 6 v8 z`} fill="#FFFFFF" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      );
  }
}

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
        style={{ left: `${(XS[at] / 340) * 100}%`, top: `${((YS[at] - 30) / 96) * 100}%` }}
      />
      <svg viewBox="0 0 340 96" aria-hidden="true" focusable="false" className="block w-full">
        {/* The path */}
        <path
          d={`M${XS[0]} ${YS[0]} C 68 ${YS[0]}, 68 ${YS[1]}, ${XS[1]} ${YS[1]} S 136 ${YS[2]}, ${XS[2]} ${YS[2]} S 204 ${YS[3]}, ${XS[3]} ${YS[3]} S 272 ${YS[4]}, ${XS[4]} ${YS[4]}`}
          fill="none"
          stroke="#D9D6E8"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M${XS[0]} ${YS[0]} C 68 ${YS[0]}, 68 ${YS[1]}, ${XS[1]} ${YS[1]} S 136 ${YS[2]}, ${XS[2]} ${YS[2]} S 204 ${YS[3]}, ${XS[3]} ${YS[3]} S 272 ${YS[4]}, ${XS[4]} ${YS[4]}`}
          fill="none"
          stroke={INK}
          strokeWidth="2.5"
          strokeDasharray="2 9"
          strokeLinecap="round"
        />
        {/* The places */}
        {MAP_PLACES.map((p, i) => (
          <g key={p.label}>
            <circle cx={XS[i]} cy={YS[i]} r={i === at ? 17 : 14} fill={SCENE_FILL[p.scene]} stroke={INK} strokeWidth="3" />
            <Glyph i={i} x={XS[i]} y={YS[i]} />
          </g>
        ))}
        <Sparkle x={320} y={18} size={6} fill="#FFD23F" />
        <Sparkle x={150} y={16} size={5} fill="#FF6FB5" />
        {/* The traveller: slides to the place, then bobs gently. */}
        <g
          style={{
            transform: `translate(${XS[at]}px, ${YS[at] - 30}px)`,
            transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <g className="animate-bob">
            <AvatarGroup index={avatar} x={0} y={0} r={13} />
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
