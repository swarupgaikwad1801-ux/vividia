/**
 * Step 4 of the journey: "Choose who hears it".
 *
 * Two questions, in this order, and the order is the point:
 *
 *   1. Where does this happen?
 *   2. Who do you want to show this to?
 *
 * Asking (1) first is what stops (2) suggesting the person the child is
 * escaping. Until this screen existed, step 4 assumed the trusted adult was
 * safe. The whole rule lives in `components/HandoffSuggestions.ts`; this file
 * only sequences the two questions and keeps the answers.
 *
 * Nothing on this screen contacts anybody. No send, no share, no mailto, no
 * notification, no "we've told your teacher". The child shows the card to a
 * person themselves.
 * A future "send" button here would break the one promise the product makes.
 *
 * The screen does no fetching of its own: the report arrives as a prop from
 * whoever wires the flow, with its loading and error state alongside it, so
 * there is one request for the report in the app rather than one per screen.
 */

import { useEffect, useState } from "react";

import HandoffCard from "../components/HandoffCard.tsx";
import HandoffWhere from "../components/HandoffWhere.tsx";
import { isWhereItHappens, type AdultId, type WhereItHappens } from "../components/HandoffSuggestions.ts";
import { t } from "../lib/strings.ts";
import type { Entry, ReportResponse } from "../types/api.ts";
import type { EntrySource } from "../lib/timeline.ts";

export interface HandoffProps {
  lang: string;
  /** The child's saved entries: what the card shows. */
  entries?: readonly (Entry & { source?: EntrySource })[];
  /** The report the child approved in step 3, or null if there is none yet. */
  report?: ReportResponse | null;
  /** True while that report is being built. */
  loading?: boolean;
  /** Child-safe text from `ApiError.messageChild`, or null. */
  error?: string | null;
  /** Retry the report. Omitted when there is nothing to retry. */
  onRetry?: () => void;
  /**
   * The child's answers, handed up so the rest of the flow can keep them.
   * Called on a tap, never on a timer, and nothing leaves the device here.
   */
  onWhereChosen?: (where: WhereItHappens) => void;
  onAdultChosen?: (adult: AdultId) => void;
  /** A remembered answer, e.g. from the demo story. Anything else is ignored. */
  initialWhere?: string | null;
  /** Who the child picked last time, so Back from the big card keeps it. */
  initialAdult?: AdultId | null;
  /**
   * Go on to the big card (issue #3: handoff was a dead end). The Next button
   * appears only once there is something approved to show.
   */
  onNext?: () => void;
}

export default function Handoff({
  lang,
  entries = [],
  report = null,
  loading = false,
  error = null,
  onRetry,
  onWhereChosen,
  onAdultChosen,
  initialWhere = null,
  initialAdult = null,
  onNext,
}: HandoffProps) {
  const remembered = isWhereItHappens(initialWhere) ? initialWhere : null;
  const [where, setWhere] = useState<WhereItHappens | null>(remembered);
  const [step, setStep] = useState<"where" | "card">(remembered ? "card" : "where");
  // Only meaningful with a remembered place: an adult without a place is
  // dropped, and the card drops an id that is not among its options anyway.
  const [chosen, setChosen] = useState<AdultId | null>(remembered ? initialAdult : null);
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    const update = () => setOnline(isOnline());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  /**
   * Changing the place clears who was picked.
   *
   * Without this, a child who picks a family member for "at school" and then
   * corrects the place to "at home" keeps a family member selected after
   * family has been removed from the list. The card drops an id that is not in
   * its own options as well, so the rule holds even if this is ever forgotten,
   * but it must not depend on that.
   */
  function chooseWhere(next: WhereItHappens) {
    setWhere(next);
    setChosen(null);
    setStep("card");
    onWhereChosen?.(next);
  }

  function chooseAdult(next: AdultId) {
    setChosen(next);
    onAdultChosen?.(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-8">
      {/*
        Offline is information, not a blocker: the card is words the child has
        already approved and they are on this phone. Only building a new report
        needs the network, and that failure arrives as `error`.
      */}
      {!online && (
        <p role="status" className="rounded-card bg-help-soft px-4 py-3 text-sm text-help">
          {t("errors.network", lang)}
        </p>
      )}

      {step === "where" || where === null ? (
        /* `value` keeps the earlier answer visible, so correcting the place is
           a one-tap change rather than starting again. */
        <HandoffWhere lang={lang} value={where} onChoose={chooseWhere} />
      ) : (
        <>
          <HandoffCard
            entries={entries}
            lang={lang}
            where={where}
            chosen={chosen}
            onChoose={chooseAdult}
            report={report}
            loading={loading}
            error={error}
            onRetry={onRetry ?? null}
          />

          {(entries.length > 0 || report) && !loading && !error && onNext && (
            <button
              type="button"
              onClick={onNext}
              // text-page, not text-white: --color-calm is a light teal in
              // dark mode, where white falls below the 4.5:1 floor.
              className="sticker min-h-tap rounded-full bg-calm px-4 text-base font-bold text-page hover:bg-calm-strong motion-safe:active:translate-y-1 active:shadow-none"
            >
              {t("nav.next", lang)}
            </button>
          )}

          <button
            type="button"
            onClick={() => setStep("where")}
            className="min-h-tap self-start rounded-card px-2 text-base font-medium text-calm underline"
          >
            {t("handoff.changeWhere", lang)}
          </button>
        </>
      )}
    </main>
  );
}

/**
 * Online is the assumption when the browser will not say (tests, old
 * WebViews): `navigator.onLine` is only trustworthy when it reads false, and a
 * "no internet" banner on a phone that is fine would teach the child to ignore
 * the next one.
 */
function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
