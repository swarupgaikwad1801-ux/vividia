/**
 * The card, big, for the child to hold up to the person they chose.
 *
 * The end of step 4 (issue #3: handoff was a dead end).
 *
 * ## What is on it: the child's own entries
 *
 * Each entry is a sentence the child wrote and approved word by word on the
 * writing screen, with its German. That is the most faithful thing the app
 * has: no summary rewrites it. The model-written report from step 3 is used
 * only when there are no entries to show (e.g. the demo story). Nothing new
 * is written, translated or sent here; the child shows the phone.
 *
 * ## One language at a time
 *
 * The card starts in the child's language. "Auf Deutsch" is one tap away for
 * the adult (`CardLanguageSwitch`). This is the only place outside the
 * writing screen where German appears (issue #3).
 */

import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";

import AdultGuide from "./AdultGuide.tsx";
import { useScreenAwake } from "./useScreenAwake.ts";
import { quickExit } from "../lib/quickExit.ts";
import ExampleModeBanner from "./ExampleModeBanner.tsx";
import type { EngineMode } from "../lib/engineMode.ts";
import CardLanguageSwitch from "./CardLanguageSwitch.tsx";
import SourceMark from "./SourceMark.tsx";
import type { EntrySource } from "../lib/timeline.ts";
import { primarySuggestion, suggestedAdults, type AdultId, type WhereItHappens } from "./HandoffSuggestions.ts";
import { formatDay } from "../lib-followups-ui/dates.ts";
import { t } from "../lib/strings.ts";
import type { Entry, ReportResponse } from "../types/api.ts";

export interface HandoffShowProps {
  lang: string;
  /** The child's saved entries, oldest first, with where their words came from. */
  entries: readonly (Entry & { source?: EntrySource })[];
  /** Fallback when there are no entries. */
  report: ReportResponse | null;
  where: WhereItHappens;
  /** Who the child picked; null means the card's own suggestion stands. */
  chosen: AdultId | null;
  onDone: () => void;
  /** For full screen, which hides the app's own Example mode strip. */
  engine?: EngineMode;
}

export default function HandoffShow({ lang, entries, report, where, chosen, onDone, engine }: HandoffShowProps) {
  const [showing, setShowing] = useState(lang);
  // False until the adult first switches language: the card pops in once,
  // then turns over like a real card each time the language changes.
  const [turned, setTurned] = useState(false);

  // The same rule as HandoffCard, so the big card names the person the small
  // one did.
  const recipient = suggestedAdults(where).find((option) => option.id === chosen) ?? primarySuggestion(where);

  // What the card says in one language. The screen shows one side at a
  // time; the printout shows both, one after the other.
  const body = (side: string) => {
    const inGerman = side === "de";
    return (
      <>
        {recipient && (
          <p className="text-base font-medium text-ink-soft">{t(recipient.labelKey, side)}</p>
        )}

        {entries.length > 0 ? (
          <ol className="flex flex-col gap-4">
            {entries.map((entry, index) => (
              <li key={`${entry.date}-${index}`} className="flex flex-col items-start gap-1">
                <span className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                  {formatDay(entry.date, side)}
                  <SourceMark source={entry.source} lang={side} />
                </span>
                <p className="whitespace-pre-wrap text-xl leading-relaxed text-ink">
                  {inGerman ? entry.text_de : entry.text_child}
                </p>
              </li>
            ))}
          </ol>
        ) : report ? (
          <p className="whitespace-pre-wrap text-xl leading-relaxed text-ink">
            {inGerman ? report.german_version : report.child_version}
          </p>
        ) : null}
      </>
    );
  };
  // The child's language first, then German; one side for a German speaker.
  const printSides = lang === "de" ? ["de"] : [lang, "de"];
  // The printout exists only while printing, so German is never in the page
  // (or read by a screen reader) before the adult picks it (issue #3).
  // Ctrl+P works too: beforeprint fires either way.
  const [printing, setPrinting] = useState(false);
  const awake = useScreenAwake();

  // Full screen: just the language switch and the card, big, for an adult
  // reading over a desk. Offered only where the browser can do it (not
  // iPhone Safari). Leave now comes with it: the top bar is hidden in full
  // screen, and the way out must be on every screen.
  const stage = useRef<HTMLDivElement>(null);
  const [canFull] = useState(() => typeof document !== "undefined" && document.fullscreenEnabled === true);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === stage.current && stage.current !== null);
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  useEffect(() => {
    const start = () => setPrinting(true);
    const end = () => setPrinting(false);
    window.addEventListener("beforeprint", start);
    window.addEventListener("afterprint", end);
    return () => {
      window.removeEventListener("beforeprint", start);
      window.removeEventListener("afterprint", end);
    };
  }, []);

  return (
    <main className="relative mx-auto flex w-full max-w-sm flex-col gap-5 px-4 py-6">
      {/* No sparkle burst here any more (27 Oct): the app is for young people
          up to about 20, and the card itself appearing is the moment. */}

      <h1 className="text-3xl text-balance">{t("handoff.showThem", lang)}</h1>

      <div ref={stage} className="card-stage flex flex-col gap-5">
      {full && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void document.exitFullscreen().catch(() => {})}
            className="sticker min-h-tap rounded-full bg-surface px-4 text-base font-bold text-ink"
          >
            {t("card.exitFullscreen", lang)}
          </button>
          <button
            type="button"
            onClick={() => quickExit()}
            className="sticker min-h-tap rounded-full bg-surface px-4 text-base font-bold text-ink"
          >
            {t("quickExit.button", lang)}
          </button>
        </div>
      )}
      {/* Full screen hides the strip at the top of the app; in example mode
          the German on this card is not the child's words, so it comes too. */}
      {full && engine && (
        <div className="-mx-4">
          <ExampleModeBanner lang={lang} engine={engine} />
        </div>
      )}
      <CardLanguageSwitch
        lang={lang}
        showing={showing}
        onChange={(next) => {
          if (next !== showing) setTurned(true);
          setShowing(next);
        }}
      />

      <article
        // Keyed by language, so a switch remounts the card and plays the turn.
        key={showing}
        lang={showing}
        className={`${turned ? "animate-card-flip" : "animate-pop-in"} flex flex-col gap-4 rounded-card border-[3px] border-ink bg-surface p-5 shadow-[6px_6px_0_0_#1B1B2F]`}
      >
        {body(showing)}
      </article>
      </div>

      {canFull && (
        <button
          type="button"
          onClick={() => void stage.current?.requestFullscreen().catch(() => {})}
          className="sticker min-h-tap self-start rounded-full bg-surface px-4 text-base font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
        >
          <span aria-hidden="true">⛶ </span>
          {t("card.fullscreen", lang)}
        </button>
      )}

      {awake && <p className="-mt-2 text-sm text-ink-soft">{t("card.awake", lang)}</p>}

      {/* Under the child's words, not above them: the card is what the child
          holds up, and the guide is for the person now reading it. It follows
          `showing`, so switching the card to German switches the guide with
          it - one language on screen at a time (issue #3). */}
      <AdultGuide showing={showing} lang={lang} />

      {/* Paper is still a card the child holds up: printing sends nothing to
          anyone. "Save as PDF" is the same browser dialog. Both languages go
          on the page, so a teacher who reads German and a parent who reads
          the child's language can each read one. Day One and most journals
          offer the same: your words, on paper, when you want them. */}
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => {
            flushSync(() => setPrinting(true));
            window.print();
          }}
          className="sticker min-h-tap rounded-full bg-surface px-4 text-base font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
        >
          <span aria-hidden="true">🖨️ </span>
          {t("card.print", lang)}
        </button>
        {printSides.length > 1 && <p className="text-sm text-ink-soft">{t("card.printBoth", lang)}</p>}
      </div>

      {/* Only on paper (index.css, @media print), outside the app so nothing
          else, hidden or not, takes up the page. */}
      {printing && createPortal(
      <div className="print-only" aria-hidden="true">
        {printSides.map((side) => (
          <section key={side} lang={side} className="print-side">
            {body(side)}
          </section>
        ))}
      </div>,
        document.body,
      )}

      <button
        type="button"
        onClick={onDone}
        // text-page, not text-white: --color-calm is a light teal in dark
        // mode, where white falls below the 4.5:1 floor.
        className="sticker min-h-tap rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong motion-safe:active:translate-y-1 active:shadow-none"
      >
        {/* Says what the child did, not "Done": the next screen has Done.
            Nothing is recorded by pressing it. */}
        {t("ladder.markShown", lang)}
      </button>
    </main>
  );
}
