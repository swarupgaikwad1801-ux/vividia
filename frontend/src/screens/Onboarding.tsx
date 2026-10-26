import { ONBOARDING_CARDS } from "../lib/onboarding";
import { t } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * What the app does and never does, in the child's language, before they
 * write a word (CLAUDE.md: Tier A, onboarding).
 *
 * ## One screen, not a carousel
 *
 * Six short sentences fit on a 360px phone with a little scrolling, and one
 * button gets past them. A carousel would make a frightened child tap six
 * times before they could start, and a judge tap six times before the demo.
 * Nothing here is a consent step: there is no checkbox and no "I agree",
 * because the child is not agreeing to anything, only being told.
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
  /** The child pressed Start. */
  onDone: () => void;
}

export default function Onboarding({ lang, onDone }: OnboardingProps) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="onboarding-title">
      <h1 id="onboarding-title" className="text-2xl font-semibold tracking-tight text-balance">
        {t("onboarding.title", lang)}
      </h1>

      <ol className="flex flex-col gap-3">
        {ONBOARDING_CARDS.map((card) => (
          <li key={card.id} className="rounded-card border border-line bg-surface p-4 text-base text-ink">
            {t(card.key, lang)}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onDone}
        // text-page, not text-white: --color-calm is a light teal in dark
        // mode, where white falls below the 4.5:1 floor.
        className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page transition-colors hover:bg-calm-strong"
      >
        {t("onboarding.start", lang)}
      </button>
    </section>
  );
}
