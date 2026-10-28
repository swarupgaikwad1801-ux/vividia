/**
 * The journey as a little map: coloured stops on a winding path (one per
 * picture question, then the card, who sees it, done), and the child's own
 * traveller standing on the one they are at.
 *
 * Moving on walks the traveller forward; Back walks it back. There is nothing
 * to collect and no score: places are not "levels", and none is locked.
 * Decorative for a screen reader except one sentence saying where they are.
 *
 * Made the hero rather than a strip (#3, Neel's pattern 1 + 6). It was 96px
 * tall with 24px stops, which at 360px read as decoration: too small to see
 * where you were, too small to touch, and the one element that could carry
 * "you are going somewhere, with someone" was a progress bar in a costume.
 *
 * Four changes, all inside this file so the question screens stay Neel's:
 *
 * 1. The path has real vertical travel, so it looks walked rather than
 *    printed, and the stop you are on is half as big again as the rest.
 * 2. Three states a child can tell apart without counting: **been there**
 *    (full colour), **here** (enlarged, ringed, the traveller on it) and
 *    **not yet** (outlined, waiting). No locks: ahead is pale, never barred.
 * 3. Every stop is tappable and says its own name, so "what is that one?"
 *    is answerable without walking there. The name of wherever you are
 *    looking is always written under the map - orientation in words, not
 *    only in position.
 * 4. "Step 2 of 9" written under the map, because "place 2 of 9" was only
 *    ever said to screen readers, and nine steps is a long way when you are
 *    frightened. It replaced a thin progress bar (27 Oct polish): two
 *    indicators for one fact is one too many, and words need no decoding.
 *
 * No new strings: every stop already has a translated label, so this reads
 * in all three languages without touching `strings.ts`, which the screen
 * stack is editing at the same time.
 */

import { useState } from "react";

import { AVATARS, AvatarGroup, AvatarHead } from "../art/People";
import type { Glyph as GlyphKind, MapPlace } from "../lib/scenes";
import { fill, t } from "../lib/strings";

const INK = "#1B1B2F";
const SCENE_FILL: Record<string, string> = {
  sun: "#EBC88A",
  sky: "#86C3C2",
  grass: "#92C7A0",
  pink: "#E3A0BA",
  lilac: "#B5A7E3",
};

/**
 * Big and clear (c-bigtype, 28 Oct): the map is a slim strip, not a card.
 * The stops sit on one straight line across a 340 x 40 drawing, so the
 * whole thing is about 70px tall with its "Step 2 of 9" line instead of
 * 156px, and the question below it is the first big thing on the screen.
 * The three states and the traveller keep their meaning: been there (filled),
 * here (the traveller's head in a ring of the scene's colour), not yet
 * (outlined, pale, never locked).
 */
const Y = 20;
/** The traveller's head is drawn this much bigger than a stop. */
const HERE = 1.35;

function layout(n: number) {
  // 20 in from each side, so the bigger stop you are on and its ring stay
  // inside the drawing at the first and last stop.
  const step = 300 / Math.max(1, n - 1);
  const xs = Array.from({ length: n }, (_, i) => 20 + i * step);
  const ys = Array.from({ length: n }, () => Y);
  // 11 at most, so the traveller (x1.35) and its ring never touch a
  // neighbour, with 9 stops or with 11.
  const r = Math.min(11, step * 0.32);
  return { xs, ys, r, step };
}

/** A tiny glyph per stop, drawn at 12px radius and scaled to the stop. */
function Glyph({ kind, x, y, s }: { kind: GlyphKind; x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
      <GlyphShape kind={kind} x={x} y={y} />
    </g>
  );
}

function GlyphShape({ kind, x, y }: { kind: GlyphKind; x: number; y: number }) {
  const g = { fill: "#FFFFFF", stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (kind) {
    case "bag":
      return (
        <g {...g}>
          <rect x={x - 5} y={y - 3} width="10" height="10" rx="2.5" />
          <path d={`M${x - 2.5} ${y - 3} v-2 a2.5 2.5 0 0 1 5 0 v2`} fill="none" />
        </g>
      );
    case "phone":
      return (
        <g {...g}>
          <rect x={x - 4} y={y - 7} width="8" height="14" rx="2" />
          <path d={`M${x - 1.5} ${y + 4.5} h3`} />
        </g>
      );
    case "clock":
      return (
        <g {...g}>
          <circle cx={x} cy={y} r="6" />
          <path d={`M${x} ${y - 3.5} v3.5 l2.5 2`} fill="none" />
        </g>
      );
    case "pencil":
      return <path d={`M${x - 6} ${y + 6} l2 -6 l9 -9 l4 4 l-9 9 z`} {...g} />;
    case "bandage":
      return (
        <g {...g}>
          <rect x={x - 7} y={y - 3} width="14" height="6" rx="3" transform={`rotate(-35 ${x} ${y})`} />
          <circle cx={x} cy={y} r="1" fill={INK} stroke="none" />
        </g>
      );
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

export interface GameMapProps {
  /** The stops for this child's answers (lib/scenes.ts mapFor). */
  places: readonly MapPlace[];
  at: number;
  avatar: number;
  lang: string;
  /** The child tapped their traveller and picked another head. */
  onAvatar: (index: number) => void;
}

export default function GameMap({ places, at, avatar, lang, onAvatar }: GameMapProps) {
  const [picking, setPicking] = useState(false);
  /**
   * The stop the child tapped to ask "what is that one?". It only changes
   * what is written under the map; it never moves the traveller, because
   * looking ahead is not the same as going there.
   */
  const [peek, setPeek] = useState<{ at: number; i: number } | null>(null);
  const place = places[at];
  const { xs: XS, ys: YS, r: R, step: STEP } = layout(places.length);

  // Looking at whichever stop was tapped, otherwise at where they are. The
  // peek records the stop it was made from, so moving on clears it without
  // an effect: a question asked on one screen should not still be answered
  // on the next.
  const asked = peek && peek.at === at && peek.i < places.length ? peek.i : null;
  const looking = asked ?? at;
  const done = looking < at;
  const here = looking === at;

  return (
    <div className="mx-4 mt-1 flex flex-col gap-1">
      {/* Left: "Step 2 of 9", always. Right: the answer to a tapped stop,
          and only that (it used to repeat the heading underneath). The
          height is held either way so nothing below it jumps. */}
      <p aria-hidden="true" className="flex h-6 items-center justify-between gap-2 text-sm font-medium">
        <span className="shrink-0 font-display text-base font-bold text-ink">
          {fill("map.step", lang, { n: at + 1, total: places.length })}
        </span>
        {asked !== null && (
          <span className="flex min-w-0 items-center gap-1.5">
            {done && (
              <svg viewBox="0 0 16 16" className="size-4 shrink-0">
                <path
                  d="M3 8.5 L6.5 12 L13 4.5"
                  fill="none"
                  stroke={INK}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span className={`truncate ${here ? "text-ink" : "text-ink-soft"}`}>{t(places[looking].label, lang)}</span>
          </span>
        )}
      </p>

    <div className="relative">
      <p className="sr-only">
        {fill("map.youAreHere", lang, { place: t(place.label, lang), n: at + 1, total: places.length })}
      </p>

      {/* The traveller is the one thing on the strip that opens something:
          the heads to choose from. A real button laid over the drawing, 44px,
          following the traveller as it moves. */}
      <button
        type="button"
        onClick={() => setPicking((open) => !open)}
        aria-expanded={picking}
        aria-label={t("avatar.change", lang)}
        className="absolute z-10 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-200"
        style={{ left: `${(XS[at] / 340) * 100}%`, top: "50%" }}
      />

      {/* One real button per stop, laid over the drawing, as wide as the
          stops are apart (about 36px with nine stops on a 360px phone); a
          tap only names the stop, and the same name is read out above. The
          one you are on sits under the traveller's button, so a tap there
          opens the heads; it stays here for the keyboard. */}
      {places.map((p, i) => (
        <button
          key={`hit-${p.label}-${i}`}
          type="button"
          onClick={() => setPeek(asked === i ? null : { at, i })}
          aria-label={t(p.label, lang)}
          aria-pressed={asked === i}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-3 focus-visible:outline-ink"
          style={{
            left: `${(XS[i] / 340) * 100}%`,
            width: `${Math.max(28, Math.min(44, STEP))}px`,
            height: "44px",
          }}
        />
      ))}

      <svg viewBox="0 0 340 40" aria-hidden="true" focusable="false" className="block w-full">
        {/* The line: pale ahead, solid ink where you have been. */}
        <line x1={XS[0]} y1={Y} x2={XS[XS.length - 1]} y2={Y} style={{ stroke: "var(--color-ink)" }} strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
        {at > 0 && <line x1={XS[0]} y1={Y} x2={XS[at]} y2={Y} style={{ stroke: "var(--color-ink)" }} strokeWidth="3" strokeLinecap="round" />}

        {places.map((p, i) => {
          const isHere = i === at;
          const passed = i < at;
          if (isHere) {
            const r = R * HERE;
            return (
              <g key={`${p.label}-${i}`}>
                <circle cx={XS[i]} cy={YS[i]} r={r + 3.5} style={{ fill: "var(--color-scene-deep)" }} />
                <AvatarGroup index={avatar} x={XS[i]} y={YS[i]} r={r} />
              </g>
            );
          }
          return (
            <g key={`${p.label}-${i}`}>
              <circle
                cx={XS[i]}
                cy={YS[i]}
                r={R}
                fill={passed ? SCENE_FILL[p.scene] : "#FFFFFF"}
                stroke={INK}
                strokeWidth={passed ? 2 : 1.75}
                opacity={passed ? 1 : 0.55}
              />
              <g opacity={passed ? 1 : 0.5}>
                <Glyph kind={p.glyph} x={XS[i]} y={YS[i]} s={(R / 12) * 0.85} />
              </g>
              {/* The stop the child is asking about, ringed. */}
              {asked === i && <circle cx={XS[i]} cy={YS[i]} r={R + 3.5} fill="none" stroke={INK} strokeWidth="2" />}
            </g>
          );
        })}
      </svg>
    </div>

      {/* A picture only: it never talks, and it is kept on this phone. */}
      {picking && (
        <fieldset className="animate-pop-in rounded-card bg-surface p-3">
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
