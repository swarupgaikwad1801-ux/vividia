import { useEffect, useState } from "react";

import { t, type StringKey } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * "Need a moment first?": two short ways to slow down before telling it.
 *
 * - **Breathe**: box breathing, in 4 / hold 4 / out 4 / hold 4, following a
 *   dot round a square. Four rounds, then it stops by itself.
 * - **Notice 5 things**: the 5-4-3-2-1 grounding steps, one at a time, each
 *   moved on by the child, never by a timer.
 *
 * Both are common coping tools in youth services (Childline's Calm Zone, the
 * UNICEF guide on fear and anxiety). The evidence for either in teenagers is
 * thin, so nothing here promises an effect: it is offered, not prescribed,
 * collapsed by default, and closes with one tap. No character, no voice, no
 * score, and nothing is saved.
 *
 * Reduced motion: the dot jumps instead of gliding (index.css stops every
 * transition), and the words still change every 4 seconds.
 */

const SIDE_S = 4;
const ROUNDS = 4;
const PHASES: readonly StringKey[] = ["calm.in", "calm.hold", "calm.out", "calm.hold"];
const GROUND: readonly StringKey[] = ["calm.g5", "calm.g4", "calm.g3", "calm.g2", "calm.g1"];

/** Where the dot is after `s` seconds, as % of the square: up the left, across the top, down, back. */
function dotAt(s: number): { x: number; y: number } {
  const side = Math.floor(s / SIDE_S) % 4;
  const along = (s % SIDE_S) / SIDE_S;
  switch (side) {
    case 0:
      return { x: 0, y: 100 - along * 100 };
    case 1:
      return { x: along * 100, y: 0 };
    case 2:
      return { x: 100, y: along * 100 };
    default:
      return { x: 100 - along * 100, y: 100 };
  }
}

function Breathe({ lang }: { lang: Lang }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const running = seconds !== null && seconds < ROUNDS * 4 * SIDE_S;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => (s === null ? s : s + 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const s = seconds ?? 0;
  const phase = PHASES[Math.floor(s / SIDE_S) % 4];
  const left = SIDE_S - (s % SIDE_S);
  const dot = dotAt(running ? s + 1 : s);
  const finished = seconds !== null && !running;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-ink-soft">{t("calm.breatheHint", lang)}</p>
      <div aria-hidden="true" className="relative size-40">
        <div className="absolute inset-0 rounded-xl border-[3px] border-dashed border-ink/40" />
        <span
          className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-scene-deep transition-[left,top] duration-1000 ease-linear"
          style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
        />
        <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="headline text-xl text-ink">{running ? t(phase, lang) : ""}</span>
          {running && <span className="text-3xl font-bold tabular-nums text-ink">{left}</span>}
        </span>
      </div>
      {/* The words, for a screen reader, at the pace they change (every 4 s). */}
      <p className="sr-only" aria-live="polite">
        {running ? t(phase, lang) : finished ? t("calm.done", lang) : ""}
      </p>
      {finished && <p className="text-base font-bold text-ink">{t("calm.done", lang)}</p>}
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
