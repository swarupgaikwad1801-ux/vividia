import { useState } from "react";

import { AvatarHead, AVATARS } from "../art/People";
import { OnboardingPicture } from "../art/Things";
import { ONBOARDING_CARDS } from "../lib/onboarding";
import { fill, t } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * What the app does and never does, in the child's language, before they
 * write a word (CLAUDE.md: Tier A, onboarding).
 *
 * ## Three picture cards, one at a time, and Skip
 *
 * Six cards of promises on one screen made the app feel like an interview
 * (issue #3). Now there are three, each a big picture and one or two short
 * sentences. "Skip" is on every card, so a child who wants to start, or a
 * judge, gets past in one tap. Nothing here is a consent step: there is no
 * checkbox and no "I agree", because the child is not agreeing to anything,
 * only being told.
 *
 * ## Every sentence is a promise the app keeps
 *
 * The wording is `content/onboarding.json`, reviewed against the shipped app,
 * and `lib/onboarding.test.ts` keeps this screen identical to it. Do not
 * reword here; change the file and `strings.ts` together.
 *
 * ## Offline, loading, error, empty
 *
 * The same screen: nothing is fetched, so nothing can fail.
 */
export interface OnboardingProps {
  lang: Lang;
  /** The traveller the child has picked for the map (lib/avatar.ts). */
  avatar?: number;
  /** Omitted: no picker is shown. */
  onAvatar?: (index: number) => void;
  /** The child pressed Start or Skip. */
  onDone: () => void;
}

export default function Onboarding({ lang, avatar = 0, onAvatar, onDone }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const card = ONBOARDING_CARDS[index];
  const last = index === ONBOARDING_CARDS.length - 1;

  return (
    <section className="flex flex-col gap-6 px-4 py-6" aria-labelledby="onboarding-title">
      <div className="flex items-center justify-between gap-3">
        <h1 id="onboarding-title" className="text-3xl tracking-tight text-balance">
          {t("onboarding.title", lang)}
        </h1>
        {!last && (
          <button
            type="button"
            onClick={onDone}
            className="min-h-tap shrink-0 rounded-full bg-surface px-4 text-base font-bold text-ink"
          >
            {t("onboarding.skip", lang)}
          </button>
        )}
      </div>

      {/* aria-live so a screen reader reads the new card after Next. Keyed by
          card so each one pops in. */}
      <div
        key={card.id}
        aria-live="polite"
        className="animate-pop-in flex flex-col items-center gap-4 rounded-card border-[3px] border-ink bg-surface p-6 text-center"
      >
        <OnboardingPicture id={card.id} className="h-28 w-36" />
        <p className="text-lg font-medium text-ink">
          {fill(card.key, lang, { button: t("quickExit.button", lang) })}
        </p>
      </div>

      {/* The traveller for the map, on the last card. A picture only: it
          never talks, and it is kept on this phone. */}
      {last && onAvatar && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-lg font-bold text-ink">{t("avatar.pick", lang)}</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {AVATARS.map((_, i) => (
              <label
                key={i}
                className={`squish flex aspect-square cursor-pointer items-center justify-center rounded-full border-[3px] bg-surface ${
                  i === avatar ? "border-ink ring-4 ring-ink/20" : "border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="avatar"
                  className="sr-only"
                  checked={i === avatar}
                  onChange={() => onAvatar(i)}
                  aria-label={fill("avatar.option", lang, { n: i + 1 })}
                />
                <AvatarHead index={i} className="size-full" />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center justify-center gap-2">
        <span className="sr-only">
          {fill("onboarding.step", lang, { n: index + 1, total: ONBOARDING_CARDS.length })}
        </span>
        {ONBOARDING_CARDS.map((dot, i) => (
          <span
            key={dot.id}
            aria-hidden="true"
            className={`h-3 rounded-full border-2 border-ink transition-all ${i === index ? "w-8 bg-ink" : "w-3 bg-surface"}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={last ? onDone : () => setIndex(index + 1)}
        className="squish min-h-tap rounded-full bg-calm px-4 text-lg font-bold text-page hover:bg-calm-strong"
      >
        {t(last ? "onboarding.start" : "onboarding.next", lang)}
      </button>
    </section>
  );
}
