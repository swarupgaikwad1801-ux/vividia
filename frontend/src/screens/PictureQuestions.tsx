/**
 * The picture questions: how a child tells what happened without writing.
 *
 * Neel, 26 Oct: "don't make the child write ... ask questions to the child".
 * After the check-in the child answers one picture question per screen:
 * what happened, where, who, how often, how they feel about it. Their taps
 * become a timeline entry in fixed words (lib/pictures.ts) that they check
 * before it is saved. Writing in their own words is offered last, and is
 * optional.
 *
 * ## The rules (child psychology; keep them when you change this file)
 *
 * 1. **Open questions only.** "What happened?", never "Did someone hurt
 *    you?". No yes/no, nothing that suggests an answer, and never "why":
 *    "why" sounds like blame.
 * 2. **Every question ends with "Something else" and "I don't want to
 *    say".** A child who is not offered a way out picks the nearest tile
 *    instead, and then the card says something that did not happen.
 *    "I don't want to say" records nothing at all.
 * 3. **Nothing is pre-selected, and the tile order is fixed.** No shuffling,
 *    no "most common first": order and defaults are suggestions, and a
 *    frightened child takes suggestions.
 * 4. **Neutral thanks only.** "Thank you." at the end, never praise tied to
 *    what was picked ("Well done for telling us about the hitting").
 * 5. **Ask nothing an adult would not act on.** Data minimisation, and these
 *    are minors: no name, no class, no time of day, no injury questions.
 * 6. **On the card, picture lines are marked as chosen from pictures**
 *    (SourceMark), and written lines as the child's own words, so a tapped
 *    tile never reads as a quote.
 * 7. **Calm where it matters.** Choosing "hit" or "threatened" shows the
 *    same help panel the writing screen shows for danger (110/112 and the
 *    helplines), still and plain, and without any model call.
 *    `prefers-reduced-motion` stops every animation here (index.css).
 *
 * Every question can be skipped, and Back returns to it as the child left
 * it: the answers live in App.tsx, not here.
 */

import { useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import Face from "../art/Face";
import QuestionPicture, { type QuestionKind } from "../art/Questions";
import DangerDialog, { HelpPulse, opensForTiles } from "../components/DangerDialog";
import { MOODS } from "../lib/moods";
import {
  ADULT_WHERE,
  BODY,
  HOW_MANY,
  NO_SAY,
  OFTEN,
  TAKEN,
  WHAT,
  WHEN,
  WHERE,
  WHERE_ONLINE,
  WHO_KIND,
  linesFor,
  needsHelpRoute,
  sentenceFor,
  toggle,
  type Choice,
  type Choices,
} from "../lib/pictures";
import { t, type StringKey } from "../lib/strings";


// --- the pieces ----------------------------------------------------------------

interface Tile {
  code: string;
  label: string;
  picture: ReactNode;
}

/**
 * One big picture tile. A real checkbox or radio underneath, visually hidden.
 *
 * Unpicked is quiet: a thin line, white. Picked is unmistakable: the primary
 * outline, the soft fill and a check mark, so the state never rests on colour
 * alone. A tap presses the tile down onto its thicker bottom edge; reduced
 * motion turns that off (motion-safe).
 */
function TileButton({
  tile,
  checked,
  multi,
  name,
  index,
  onTap,
}: {
  tile: Tile;
  checked: boolean;
  multi: boolean;
  name: string;
  index: number;
  onTap: () => void;
}) {
  return (
    <label
      // Tiles pop in one after another; the stagger is the only animation
      // that runs on its own here, and reduced motion stops it.
      style={{ animationDelay: `${index * 45}ms` } as CSSProperties}
      className={`animate-pop-in relative flex cursor-pointer flex-col items-center gap-1 rounded-card p-2 text-center text-base font-bold text-ink transition-[translate] duration-100 motion-safe:active:translate-y-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 ${
        checked
          ? "border-[3px] border-b-[5px] border-calm bg-calm-soft motion-safe:active:border-b-[3px]"
          : "border-2 border-b-4 border-line bg-surface motion-safe:active:border-b-2"
      }`}
    >
      <input
        type={multi ? "checkbox" : "radio"}
        name={name}
        value={tile.code}
        checked={checked}
        onChange={onTap}
        className="sr-only"
      />
      {checked && (
        <span aria-hidden="true" className="animate-pop-in absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-sm text-page">
          ✓
        </span>
      )}
      <span className={`block w-full ${checked ? "animate-bob" : ""}`}>{tile.picture}</span>
      <span className="leading-tight">{tile.label}</span>
    </label>
  );
}

function TileGrid({
  tiles,
  value,
  multi,
  name,
  labelledBy,
  onChange,
  cols = 3,
}: {
  tiles: readonly Tile[];
  value: readonly string[];
  multi: boolean;
  name: string;
  labelledBy: string;
  onChange: (next: string[]) => void;
  cols?: 2 | 3;
}) {
  return (
    <div
      role={multi ? "group" : "radiogroup"}
      aria-labelledby={labelledBy}
      className={`tile-grid grid gap-2.5 ${cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}
    >
      {tiles.map((tile, i) => (
        <TileButton
          key={tile.code}
          tile={tile}
          index={i}
          name={name}
          multi={multi}
          checked={value.includes(tile.code)}
          onTap={() => onChange(toggle(value, tile.code, multi))}
        />
      ))}
    </div>
  );
}

/**
 * Skip and Next, in a bar fixed to the bottom of the screen, so the way on
 * never scrolls out of reach under a long grid of tiles (#3, Swarup's points
 * 5 and 7).
 *
 * Skip always works. Next stays a real button throughout: quiet (a thin
 * outline) and disabled until something is picked, then the one bold button
 * on the screen. While it is disabled it is described by the screen's hint
 * ("Pick one"), so a screen reader says why, not just "dimmed".
 *
 * Portalled to <body>: the screen wrapper in App.tsx keeps a transform from
 * its slide-in, and `fixed` inside a transform sticks to that box, not the
 * screen. z-20 keeps it under the danger pop-up (z-30) and the top bar with
 * Need help and Leave now (z-40). A spacer of the bar's height stays in the
 * page, so the last tiles can scroll clear of it.
 */
function Footer({
  lang,
  ready,
  hintId,
  onNext,
  onSkip,
}: {
  lang: string;
  ready: boolean;
  hintId?: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const bar = (
    <div
      data-action-bar
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-sm items-center gap-3">
        <button type="button" onClick={onSkip} className="squish min-h-tap shrink-0 rounded-full px-4 text-base font-bold text-ink">
          {t("q.skip", lang)}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!ready}
          aria-describedby={ready ? undefined : hintId}
          className={`min-h-tap flex-1 rounded-full px-4 text-lg font-bold ${
            ready
              ? "squish border-[3px] border-calm bg-calm text-page hover:bg-calm-strong"
              : "border-2 border-line bg-surface text-ink-soft/60"
          }`}
        >
          {t("nav.next", lang)}
        </button>
      </div>
    </div>
  );
  return (
    <>
      <div aria-hidden="true" className="h-[calc(5rem+env(safe-area-inset-bottom,0px))] shrink-0" />
      {/* No document when rendered to a string (tests): the bar stays inline. */}
      {typeof document === "undefined" ? bar : createPortal(bar, document.body)}
    </>
  );
}

function Screen({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-1">
        <h1 id={id} className="text-3xl text-balance">
          {title}
        </h1>
        {hint && (
          <p id={`${id}-hint`} className="text-base font-medium text-ink">
            {hint}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function tilesFor<C extends string>(kind: QuestionKind, list: readonly Choice<C>[], lang: string): Tile[] {
  const l = lang === "de" || lang === "hi" ? lang : "en";
  return [
    ...list.map((choice) => ({
      code: choice.code,
      label: choice.label[l],
      picture: <QuestionPicture kind={kind} code={choice.code} className="h-16 w-full" />,
    })),
    {
      code: NO_SAY,
      label: t("q.noSay", lang),
      picture: <QuestionPicture kind={kind} code={NO_SAY} className="h-16 w-full" />,
    },
  ];
}

// --- the questions ---------------------------------------------------------------

export interface QuestionProps {
  lang: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  /**
   * Go on. `skipped` is true when Skip cleared the answer: the app works out
   * the next question from the cleared answer, not the stale one (state
   * updates land after this call).
   */
  onNext: (skipped?: boolean) => void;
}

/** What happened? Several answers allowed. */
export function WhatQuestion({ lang, value, onChange, onNext }: QuestionProps) {
  // The safety floor: picking "hit" or "threatened" opens the danger pop-up,
  // once, on the tap that adds danger to a pick that had none.
  const [danger, setDanger] = useState(false);
  const choose = (next: string[]) => {
    if (opensForTiles(value, next)) setDanger(true);
    onChange(next);
  };
  return (
    <Screen id="q-what" title={t("q.what.title", lang)} hint={t("q.what.hint", lang)}>
      {danger && <DangerDialog lang={lang} onClose={() => setDanger(false)} />}
      <TileGrid tiles={tilesFor("what", WHAT, lang)} value={value} multi name="q-what" labelledBy="q-what" onChange={choose} />
      <Footer lang={lang} hintId="q-what-hint" ready={value.length > 0} onNext={() => onNext()} onSkip={() => { onChange([]); onNext(true); }} />
    </Screen>
  );
}

/** Where? One answer. */
export function WhereQuestion({ lang, value, onChange, onNext }: QuestionProps) {
  return (
    <Screen id="q-where" title={t("q.where.title", lang)} hint={t("q.pickOne", lang)}>
      <TileGrid tiles={tilesFor("where", WHERE, lang)} value={value} multi={false} name="q-where" labelledBy="q-where" onChange={onChange} cols={2} />
      <Footer lang={lang} hintId="q-where-hint" ready={value.length > 0} onNext={() => onNext()} onSkip={() => { onChange([]); onNext(true); }} />
    </Screen>
  );
}

/** How often? One answer. */
export function OftenQuestion({ lang, value, onChange, onNext }: QuestionProps) {
  return (
    <Screen id="q-often" title={t("q.often.title", lang)} hint={t("q.pickOne", lang)}>
      <TileGrid tiles={tilesFor("often", OFTEN, lang)} value={value} multi={false} name="q-often" labelledBy="q-often" onChange={onChange} cols={2} />
      <Footer lang={lang} hintId="q-often-hint" ready={value.length > 0} onNext={() => onNext()} onSkip={() => { onChange([]); onNext(true); }} />
    </Screen>
  );
}

export interface WhoQuestionProps {
  lang: string;
  howMany: readonly string[];
  kind: readonly string[];
  onChange: (next: { howMany: string[]; kind: string[] }) => void;
  onNext: (skipped?: boolean) => void;
}

/**
 * Who? Two small parts on one screen, how many and who they were, each with
 * one answer, and one "I don't want to say" for the whole question.
 */
export function WhoQuestion({ lang, howMany, kind, onChange, onNext }: WhoQuestionProps) {
  const noSay = howMany.includes(NO_SAY);
  const many = tilesFor("who", HOW_MANY, lang).filter((tile) => tile.code !== NO_SAY);
  const kinds = tilesFor("who", WHO_KIND, lang).filter((tile) => tile.code !== NO_SAY);
  const noSayTile = tilesFor("who", HOW_MANY, lang).find((tile) => tile.code === NO_SAY)!;
  const answered = noSay || howMany.length > 0 || kind.length > 0;
  return (
    <Screen id="q-who" title={t("q.who.title", lang)}>
      <h2 id="q-who-many" className="text-lg font-bold text-ink">
        {t("q.who.howMany", lang)}
      </h2>
      <TileGrid
        tiles={many}
        value={noSay ? [] : howMany}
        multi={false}
        name="q-who-many"
        labelledBy="q-who-many"
        cols={2}
        onChange={(next) => onChange({ howMany: next, kind: noSay ? [] : [...kind] })}
      />
      <h2 id="q-who-kind" className="text-lg font-bold text-ink">
        {t("q.who.kind", lang)}
      </h2>
      <TileGrid
        tiles={kinds}
        value={noSay ? [] : kind}
        multi={false}
        name="q-who-kind"
        labelledBy="q-who-kind"
        cols={2}
        onChange={(next) => onChange({ howMany: noSay ? [] : [...howMany], kind: next })}
      />
      <TileGrid
        tiles={[noSayTile]}
        value={noSay ? [NO_SAY] : []}
        multi
        name="q-who-nosay"
        labelledBy="q-who"
        cols={2}
        onChange={(next) => onChange({ howMany: next.includes(NO_SAY) ? [NO_SAY] : [], kind: [] })}
      />
      <Footer lang={lang} ready={answered} onNext={() => onNext()} onSkip={() => { onChange({ howMany: [], kind: [] }); onNext(true); }} />
    </Screen>
  );
}

/** How do you feel about it? The check-in faces, plus the two ways out. */
export function FeelQuestion({ lang, value, onChange, onNext }: QuestionProps) {
  const l = lang === "de" || lang === "hi" ? lang : "en";
  const tiles: Tile[] = [
    ...MOODS.map((mood) => ({
      code: mood.code,
      label: mood.label[l] ?? mood.label.en,
      picture: <Face code={mood.code} className="mx-auto h-14 w-14" />,
    })),
    { code: "other", label: t("q.other", lang), picture: <QuestionPicture kind="what" code="other" className="h-14 w-full" /> },
    { code: NO_SAY, label: t("q.noSay", lang), picture: <QuestionPicture kind="what" code={NO_SAY} className="h-14 w-full" /> },
  ];
  return (
    <Screen id="q-feel" title={t("q.feel.title", lang)} hint={t("q.pickOne", lang)}>
      <TileGrid tiles={tiles} value={value} multi={false} name="q-feel" labelledBy="q-feel" onChange={onChange} />
      <Footer lang={lang} hintId="q-feel-hint" ready={value.length > 0} onNext={() => onNext()} onSkip={() => { onChange([]); onNext(true); }} />
    </Screen>
  );
}

// --- follow-ups (lib/questions.ts decides when each is asked) ---------------------

const FOLLOW_UPS = {
  picBody: { kind: "body", title: "q.body.title", list: BODY, cols: 2 },
  picTaken: { kind: "taken", title: "q.taken.title", list: TAKEN, cols: 3 },
  picWhereOnline: { kind: "whereOnline", title: "q.whereOnline.title", list: WHERE_ONLINE, cols: 3 },
  picWhen: { kind: "when", title: "q.when.title", list: WHEN, cols: 3 },
  picAdultWhere: { kind: "adultWhere", title: "q.adult.title", list: ADULT_WHERE, cols: 2 },
} as const satisfies Record<string, { kind: QuestionKind; title: StringKey; list: readonly Choice[]; cols: 2 | 3 }>;

export type FollowUpStep = keyof typeof FOLLOW_UPS;

export interface FollowUpQuestionProps extends QuestionProps {
  step: FollowUpStep;
}

/**
 * A follow-up: one answer, its title repeating the child's own pick as a cue
 * ("You said things were taken. What was taken?"). Same rules as every other
 * question: open, nothing pre-selected, fixed order, Something else and
 * I don't want to say last, and Skip.
 */
export function FollowUpQuestion({ step, lang, value, onChange, onNext }: FollowUpQuestionProps) {
  const q = FOLLOW_UPS[step];
  const id = `q-${step}`;
  return (
    <Screen id={id} title={t(q.title, lang)} hint={t("q.pickOne", lang)}>
      <TileGrid tiles={tilesFor(q.kind, q.list, lang)} value={value} multi={false} name={id} labelledBy={id} onChange={onChange} cols={q.cols} />
      <Footer lang={lang} hintId={`${id}-hint`} ready={value.length > 0} onNext={() => onNext()} onSkip={() => { onChange([]); onNext(true); }} />
    </Screen>
  );
}

/**
 * "Something else" on What happened?: the child's own words. Kept on the
 * phone until the questions end, then handed to the writing screen, where
 * the German is checked and the child approves it like any written entry.
 */
export function OwnWordsQuestion({ lang, value, onChange, onNext }: QuestionProps) {
  const text = value[0] ?? "";
  return (
    <Screen id="q-own" title={t("q.own.title", lang)} hint={t("q.own.hint", lang)}>
      <textarea
        aria-labelledby="q-own"
        value={text}
        onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
        rows={5}
        className="w-full rounded-card border-[3px] border-ink bg-surface p-4 text-lg text-ink"
        placeholder={t("write.placeholder", lang)}
      />
      <Footer lang={lang} hintId="q-own-hint" ready={text.trim().length > 0} onNext={() => onNext()} onSkip={() => { onChange([]); onNext(true); }} />
    </Screen>
  );
}

// --- checking, and the offer to write --------------------------------------------

export interface PictureReviewProps {
  lang: string;
  choices: Choices;
  /** Save the entry (only offered when there is something to save). */
  onSave: () => void;
  /** Start the questions again from the first one. */
  onChange: () => void;
  /** Nothing to save: go on to the offer to write. */
  onNext: () => void;
  /**
   * Keep Need help prominent (it pulses) without the danger line: the adult
   * route (lib/questions.ts). An adult hurting a child is for an adult to act on.
   */
  prominentHelp?: boolean;
}

/**
 * The lines the card will carry, in the child's language, for the child to
 * check before anything is saved: the same "is this right?" as a written
 * entry gets.
 */
export function PictureReview({ lang, choices, onSave, onChange, onNext, prominentHelp = false }: PictureReviewProps) {
  const what = sentenceFor(choices, lang).text_child;
  const lines = [...(what ? [what] : []), ...linesFor(choices, lang)];
  const help = needsHelpRoute(choices);

  return (
    <Screen id="q-review" title={t("approve.title", lang)} hint={lines.length ? t("q.review.hint", lang) : undefined}>
      {/* The safety floor: on danger, the red Need help button in the top bar
          pulses. No red line in the screen (Neel, 26 Oct: "remove the
          emergency message"); help is one tap away on every screen. */}
      {(help || prominentHelp) && <HelpPulse />}

      {lines.length > 0 ? (
        <>
          <ul className="animate-pop-in flex flex-col gap-2 rounded-card border-[3px] border-ink bg-surface p-4">
            {lines.map((text) => (
              <li key={text} className="text-lg text-ink">
                {text}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onSave}
            className="squish min-h-tap rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong"
          >
            {t("approve.yes", lang)}
          </button>
          <button type="button" onClick={onChange} className="squish min-h-tap self-center rounded-full bg-surface px-6 text-base font-bold text-ink">
            {t("approve.change", lang)}
          </button>
        </>
      ) : (
        <>
          <p className="rounded-card border-[3px] border-ink bg-surface p-4 text-lg text-ink">{t("q.review.nothing", lang)}</p>
          <button
            type="button"
            onClick={onNext}
            className="squish min-h-tap rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong"
          >
            {t("nav.next", lang)}
          </button>
        </>
      )}
    </Screen>
  );
}

export interface MoreQuestionProps {
  lang: string;
  onWrite: () => void;
  /** "No thanks": nothing more today. The answers are already saved. */
  onNoThanks: () => void;
  /**
   * "Make a card", the card as its own choice. "No thanks" used to lead
   * straight to choosing who sees it, but saying no to writing is not asking
   * for a card (Swarup, 27 Oct). Not rendered when absent.
   */
  onMakeCard?: () => void;
}

/** "Thank you." and the offer to say more in their own words. Optional. */
export function MoreQuestion({ lang, onWrite, onNoThanks, onMakeCard }: MoreQuestionProps) {
  return (
    <Screen id="q-more" title={t("q.more.title", lang)}>
      <p className="text-xl font-bold text-ink">{t("q.thanks", lang)}</p>
      <button
        type="button"
        onClick={onWrite}
        className="squish min-h-tap rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong"
      >
        <span aria-hidden="true">✏️ </span>
        {t("q.more.yes", lang)}
      </button>
      {onMakeCard && (
        <button
          type="button"
          onClick={onMakeCard}
          className="squish min-h-tap rounded-full border-[3px] border-ink bg-sun px-4 text-lg font-bold text-ink"
        >
          {t("heard.makeCard", lang)}
        </button>
      )}
      <button type="button" onClick={onNoThanks} className="squish min-h-tap rounded-full border-[3px] border-ink bg-surface px-4 text-lg font-bold text-ink">
        {t("q.more.no", lang)}
      </button>
    </Screen>
  );
}

/** For tests: every question's title key, so a test can check none is yes/no. */
export const QUESTION_TITLES: readonly StringKey[] = [
  "q.what.title",
  "q.where.title",
  "q.who.title",
  "q.often.title",
  "q.feel.title",
];
