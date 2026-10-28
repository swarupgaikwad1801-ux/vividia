import { useEffect, useRef, useState } from "react";

import { t, type StringKey } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * "Need a moment first?": two short ways to slow down before telling it.
 *
 * - **Breathe**: box breathing, in 4 / hold 4 / out 4 / hold 4, with a
 *   bubble that breathes: it grows as you breathe in while specks of air
 *   drift into it; on the hold it goes still and a thin ring closes round
 *   it; breathing out it shrinks and the specks drift away. Two rounds,
 *   one ripple, then it stops by itself. (Swarup picked the bubble, 28 Oct.)
 * - **Notice 5 things**: the 5-4-3-2-1 grounding steps, one at a time, each
 *   moved on by the child, never by a timer.
 *
 * Both are common coping tools in youth services (Childline's Calm Zone, the
 * UNICEF guide on fear and anxiety). The evidence for either in teenagers is
 * thin, so nothing here promises an effect: it is offered, not prescribed,
 * collapsed by default, and closes with one tap. No character, no voice, no
 * score, and nothing is saved.
 *
 * Reduced motion: the bubble changes size once a second instead of gliding,
 * with no wobble, no specks and no ripple; the words still change every 4
 * seconds.
 */

const SIDE_S = 4;
const ROUNDS = 2; // two full in-and-out cycles (Swarup, 28 Oct; was four)
const TOTAL_S = ROUNDS * 4 * SIDE_S;
const PHASES: readonly StringKey[] = ["calm.in", "calm.hold", "calm.out", "calm.hold"];
const GROUND: readonly StringKey[] = ["calm.g5", "calm.g4", "calm.g3", "calm.g2", "calm.g1"];

// The bubble, in viewBox units (the box runs -60..60 both ways).
const SMALL = 19; // core radius after breathing out
const BIG = 36; // core radius after breathing in
const EDGE = 58; // where the specks of air start and end
// Core, middle, haze: each a little bigger and a little behind the one inside
// it, so breathing in opens like a ripple and breathing out folds back.
const LAYERS = [
  { scale: 1, lag: 0, opacity: 1, wobble: 0.035, seed: 0 },
  { scale: 1.2, lag: 0.25, opacity: 0.45, wobble: 0.05, seed: 1.7 },
  { scale: 1.42, lag: 0.5, opacity: 0.22, wobble: 0.065, seed: 3.1 },
] as const;
const SPECKS = 14;

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

/** Core radius `t` seconds in: grows, stays, shrinks, stays. Continuous across steps. */
function coreAt(t: number): number {
  if (t <= 0) return SMALL;
  const step = Math.floor(t / SIDE_S) % 4;
  const f = (t % SIDE_S) / SIDE_S;
  return [SMALL + (BIG - SMALL) * ease(f), BIG, BIG - (BIG - SMALL) * ease(f), SMALL][step];
}

/** A soft closed shape round the centre: a circle whose edge moves a little. */
function blob(r: number, wobble: number, seed: number, time: number): string {
  const n = 10;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wobble * (0.6 * Math.sin(3 * a + time * 0.9 + seed) + 0.4 * Math.sin(5 * a - time * 0.6 + seed * 2));
    return [Math.cos(a) * r * k, Math.sin(a) * r * k];
  });
  // Catmull-Rom through the points, as cubic Beziers: smooth, no corners.
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d}Z`;
}

function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduce, setReduce] = useState(() => typeof matchMedia !== "undefined" && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia(query);
    const sync = () => setReduce(m.matches);
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);
  return reduce;
}

/**
 * One clock (requestAnimationFrame) moves the bubble; React re-renders only
 * once a second, for the words and the countdown. The loop runs only while
 * the exercise runs, plus one ripple at the end: at rest nothing moves and
 * no frame is drawn.
 */
function Breathe({ lang }: { lang: Lang }) {
  const reduce = useReducedMotion();
  const [seconds, setSeconds] = useState<number | null>(null);
  const running = seconds !== null && seconds < TOTAL_S;
  const finished = seconds !== null && !running;

  const layerRefs = useRef<(SVGPathElement | null)[]>([]);
  const speckRefs = useRef<(SVGCircleElement | null)[]>([]);
  const ringRef = useRef<SVGCircleElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const rippleRef = useRef<SVGCircleElement>(null);

  // The bubble as it is `t` seconds in; `time` drives the slow wobble.
  const draw = (t: number, time: number, still: boolean) => {
    const step = Math.floor(t / SIDE_S) % 4;
    const f = (t % SIDE_S) / SIDE_S;
    const holding = t > 0 && t < TOTAL_S && (step === 1 || step === 3);
    // Holding is stillness: the edge settles while the ring counts.
    const calm = still ? 0 : holding ? 0.25 : 1;
    LAYERS.forEach((layer, i) => {
      const r = coreAt(still ? t : t - layer.lag) * layer.scale;
      layerRefs.current[i]?.setAttribute("d", blob(r, layer.wobble * calm, layer.seed, time));
    });

    const core = coreAt(t);
    const breathingIn = step === 0 && t > 0 && t < TOTAL_S;
    const breathingOut = step === 2 && t < TOTAL_S;
    speckRefs.current.forEach((speck, i) => {
      if (!speck) return;
      if (still || !(breathingIn || breathingOut)) {
        speck.setAttribute("opacity", "0");
        return;
      }
      // Each speck sets off a little after the one before, on its own ray.
      const local = Math.min(1, Math.max(0, f * 1.6 - (i / SPECKS) * 0.6));
      const angle = (i / SPECKS) * Math.PI * 2 + (i % 3) * 0.35 + local * (breathingIn ? 0.5 : -0.5);
      const from = breathingIn ? EDGE : core * 1.05;
      const to = breathingIn ? core * 1.05 : EDGE;
      const r = from + (to - from) * ease(local);
      speck.setAttribute("cx", (Math.cos(angle) * r).toFixed(2));
      speck.setAttribute("cy", (Math.sin(angle) * r).toFixed(2));
      speck.setAttribute("opacity", (Math.sin(Math.PI * local) * 0.55).toFixed(3));
    });

    // The hold ring: a thin line round the bubble that closes in 4 seconds.
    const ring = ringRef.current;
    const head = headRef.current;
    if (ring && head) {
      const rr = core * LAYERS[2].scale + 4;
      const around = 2 * Math.PI * rr;
      ring.setAttribute("r", rr.toFixed(2));
      ring.setAttribute("stroke-dasharray", around.toFixed(2));
      ring.setAttribute("stroke-dashoffset", (holding ? around * (1 - f) : around).toFixed(2));
      const a = -Math.PI / 2 + f * Math.PI * 2;
      head.setAttribute("cx", (Math.cos(a) * rr).toFixed(2));
      head.setAttribute("cy", (Math.sin(a) * rr).toFixed(2));
      head.setAttribute("opacity", holding ? "1" : "0");
    }
  };

  useEffect(() => {
    if (!running) return;
    const begun = performance.now() - (seconds ?? 0) * 1000;
    let frame = 0;
    let shown = seconds ?? 0;
    const tick = (now: number) => {
      const elapsed = Math.min(TOTAL_S, (now - begun) / 1000);
      const whole = Math.floor(elapsed);
      // With reduced motion the bubble changes once a second and never glides.
      draw(reduce ? whole : elapsed, now / 1000, reduce);
      if (whole !== shown) {
        shown = whole;
        setSeconds(whole);
      }
      if (elapsed < TOTAL_S) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `seconds` only seeds the clock when a run starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduce]);

  // At rest (before Start, after Stop, at the end) the bubble is drawn once.
  useEffect(() => {
    if (!running) draw(0, 0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // One ripple when the rounds are done, then nothing moves.
  useEffect(() => {
    const ripple = rippleRef.current;
    if (!finished || !ripple || reduce) return;
    const begun = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - begun) / 1600);
      ripple.setAttribute("r", (SMALL + (EDGE - SMALL) * ease(p)).toFixed(2));
      ripple.setAttribute("opacity", ((1 - p) * 0.6).toFixed(3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [finished, reduce]);

  const s = seconds ?? 0;
  const phase = PHASES[Math.floor(s / SIDE_S) % 4];
  const left = SIDE_S - (s % SIDE_S);
  // Rounds already done, and the one under way.
  const done = finished ? ROUNDS : Math.floor(s / (4 * SIDE_S));

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center text-sm text-ink-soft">{t("calm.breatheHint", lang)}</p>
      <div aria-hidden="true" className="relative size-56">
        <svg viewBox="-60 -60 120 120" className="absolute inset-0 size-full overflow-visible">
          <circle ref={rippleRef} r={SMALL} fill="none" opacity={0} strokeWidth={1.5} style={{ stroke: "var(--color-ink)" }} />
          {/* Haze first, core last, so the core paints on top. */}
          {LAYERS.map((_, i) => LAYERS.length - 1 - i).map((i) => (
            <path
              key={i}
              ref={(node) => {
                layerRefs.current[i] = node;
              }}
              opacity={LAYERS[i].opacity}
              // The core gets a thin ink edge: the scene's deep colour alone
              // sits too close to the panel behind it, worst in night mode.
              style={{
                fill: "var(--color-scene-deep)",
                stroke: i === 0 ? "var(--color-ink)" : "none",
                strokeOpacity: 0.45,
                strokeWidth: 1.3,
              }}
            />
          ))}
          {Array.from({ length: SPECKS }, (_, i) => (
            <circle
              key={i}
              ref={(node) => {
                speckRefs.current[i] = node;
              }}
              r={i % 2 ? 1.1 : 1.6}
              opacity={0}
              style={{ fill: "var(--color-ink)" }}
            />
          ))}
          <circle
            ref={ringRef}
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
            transform="rotate(-90)"
            style={{ stroke: "var(--color-ink)" }}
          />
          <circle
            ref={headRef}
            r={2.6}
            opacity={0}
            strokeWidth={1.2}
            style={{ fill: "var(--color-scene-deep)", stroke: "var(--color-ink)" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          {running && <span className="text-4xl font-bold tabular-nums text-ink">{left}</span>}
        </span>
      </div>
      {/* The word sits under the bubble, so a long one ("Saans bahar chhodo")
          never squeezes inside it. A fixed height, so nothing jumps. */}
      <p className="headline flex min-h-9 items-center text-center text-2xl text-ink">
        {running ? t(phase, lang) : finished ? t("calm.done", lang) : ""}
      </p>
      <ol aria-hidden="true" className="flex gap-2">
        {Array.from({ length: ROUNDS }, (_, i) => (
          <li
            key={i}
            className={`size-2.5 rounded-full border-2 border-ink ${
              i < done ? "bg-ink" : running && i === done ? "bg-ink/35" : ""
            }`}
          />
        ))}
      </ol>
      {/* The words, for a screen reader, at the pace they change (every 4 s). */}
      <p className="sr-only" aria-live="polite">
        {running ? t(phase, lang) : finished ? t("calm.done", lang) : ""}
      </p>
      <button
        type="button"
        onClick={() => setSeconds(running ? null : 0)}
        className="sticker min-h-tap rounded-full bg-calm px-6 text-base font-bold text-page motion-safe:active:translate-y-1 active:shadow-none"
      >
        {running ? t("calm.stop", lang) : finished ? t("calm.again", lang) : t("calm.start", lang)}
      </button>
    </div>
  );
}

function Ground({ lang }: { lang: Lang }) {
  const [step, setStep] = useState(0);
  const done = step >= GROUND.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-ink-soft">{t("calm.groundHint", lang)}</p>
      <ol aria-hidden="true" className="flex gap-2">
        {GROUND.map((key, index) => (
          <li
            key={key}
            className={`flex size-9 items-center justify-center rounded-full border-2 border-ink text-base font-bold ${
              index < step ? "bg-ink text-page" : index === step ? "bg-scene-deep text-ink" : "bg-surface text-ink"
            }`}
          >
            {5 - index}
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="headline min-h-14 text-center text-2xl text-balance text-ink">
        {done ? t("calm.done", lang) : t(GROUND[step], lang)}
      </p>
      <button
        type="button"
        onClick={() => setStep(done ? 0 : step + 1)}
        className="sticker min-h-tap rounded-full bg-calm px-6 text-base font-bold text-page motion-safe:active:translate-y-1 active:shadow-none"
      >
        {done ? t("calm.again", lang) : t("calm.next", lang)}
      </button>
    </div>
  );
}

export default function CalmTools({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<"breathe" | "ground">("breathe");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="min-h-tap rounded-full px-1 text-base font-bold text-ink underline decoration-ink/50 decoration-2 underline-offset-[5px]"
      >
        {t("calm.open", lang)}
      </button>
    );
  }

  return (
    <section
      aria-label={t("calm.open", lang)}
      className="animate-pop-in flex w-full flex-col gap-4 rounded-card bg-surface p-4"
    >
      <div role="group" aria-label={t("calm.open", lang)} className="flex gap-2">
        {(["breathe", "ground"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={tool === id}
            onClick={() => setTool(id)}
            className={`sticker min-h-tap flex-1 rounded-full px-3 text-sm font-bold motion-safe:active:translate-y-1 active:shadow-none ${
              tool === id ? "sticker-on" : "bg-surface"
            } text-ink`}
          >
            {t(id === "breathe" ? "calm.breathe" : "calm.ground", lang)}
          </button>
        ))}
      </div>
      {tool === "breathe" ? <Breathe lang={lang} /> : <Ground lang={lang} />}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="min-h-tap self-center rounded-full px-4 text-sm font-bold text-ink-soft underline"
      >
        {t("calm.close", lang)}
      </button>
    </section>
  );
}
