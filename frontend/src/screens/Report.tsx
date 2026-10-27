/**
 * Step 3b of the journey: the report the child approves word by word.
 *
 * `POST /api/report` turns the entries the child already approved into two
 * versions: `child_version`, which the child reads, and `german_version`,
 * which is what a trusted adult would read. One is shown at a time (issue
 * #3: one language per screen): the child's language first, the German one
 * tap away on `CardLanguageSwitch`. A child who is about to hand German
 * sentences to a teacher has every right to see them first, and
 * `engine/report.py` refuses to let a model describe the child's entries for
 * exactly that reason.
 *
 * ## Nothing happens on its own, twice over
 *
 * 1. **The report is not written on mount.** Writing it sends the child's
 *    words off the phone, so it waits for `report.build` to be pressed.
 *    (`report.cloudNote` used to say so here; Neel removed it, issue #3. The
 *    words first leave the phone on the writing screen, and `write.whatWeDo`
 *    says so there, while they are being checked.)
 * 2. **A written report is not an approved report.** It lands in `review`,
 *    and only `ReportApproval` can move it to `approved`. Nothing is timed,
 *    assumed or inferred.
 *
 * And approving is still not sending: no adult is contacted anywhere in this
 * file. There is no `fetch` here other than `/api/report`, and the only thing
 * that comes back is text for the child to read.
 *
 * ## The mood is not here
 *
 * Deliberately. Entries carry a mood code and `toEntries()` passes it to the
 * backend, which leaves it out of the report (`engine/report.py`), and this
 * screen never renders it. `lib/moods.ts`: the mood *"belongs in the child's
 * own view of their timeline"*, not next to a factual account an adult will
 * read as an assessment.
 *
 * ## States
 *
 * `needEntries` · `idle` · `loading` · `review` · `approved` · `error`, plus
 * an offline notice that disables the one button that needs the network.
 * `lib/api.ts` has already turned every failure into `messageChild`, in the
 * child's language, with no HTTP code or model name in it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReportResponse } from "../types/api";
import { ApiError, report as requestReport } from "../lib/api";
import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";
import { listEntries, toEntries } from "../lib/timeline";
import ReportApproval from "../components/ReportApproval";
import ReportVersion from "../components/ReportVersion";
import CardLanguageSwitch from "../components/CardLanguageSwitch";

type Phase = "idle" | "loading" | "review" | "approved" | "error";

export interface ReportProps {
  lang: Lang;
  /**
   * The child pressed `approve.yes`. Called at no other moment, for no other
   * reason. Receives both versions so a later screen can offer to show them.
   */
  onApproved?: (report: ReportResponse) => void;
  /**
   * The child pressed `approve.change`: the report is not right. Any report
   * handed over by `onApproved` is no longer approved and must be dropped.
   */
  onChange?: () => void;
}

export default function Report({ lang, onApproved, onChange }: ReportProps) {
  // Snapshotted on mount so the text on screen always matches the entries it
  // was written from, even if another tab edits the timeline meanwhile.
  const [entries] = useState(() => listEntries());
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [showing, setShowing] = useState<string>(lang);
  const [errorMessage, setErrorMessage] = useState("");
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Offline is a designed state, not an error: the timeline is still readable
  // and the child is told which part needs the network.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const build = useCallback(async () => {
    setPhase("loading");
    setErrorMessage("");
    try {
      const written = await requestReport({ entries: toEntries(entries), child_lang: lang });
      if (!mounted.current) return;
      setResult(written);
      setPhase("review"); // written, NOT approved
    } catch (error) {
      if (!mounted.current) return;
      // `ApiError.messageChild` is the only error string a child may see.
      setErrorMessage(
        error instanceof ApiError ? error.messageChild : t("errors.generic", lang),
      );
      setPhase("error");
    }
  }, [entries, lang]);

  const approve = useCallback(() => {
    if (!result) return; // nothing can be approved that the child has not read
    setPhase("approved");
    onApproved?.(result);
  }, [onApproved, result]);

  const change = useCallback(() => {
    // Throw the text away as well as the approval. Leaving a report the child
    // just rejected on screen, still readable, invites it to be shown anyway.
    setResult(null);
    setPhase("idle");
    onChange?.();
  }, [onChange]);

  if (entries.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-5 px-4 py-8">
        <h1 className="text-2xl">{t("report.title", lang)}</h1>
        <p className="rounded-card border border-line bg-surface p-4 text-base text-ink-soft">
          {t("report.needEntries", lang)}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-5 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">{t("report.title", lang)}</h1>
      </header>

      {phase === "idle" ? (
        <section className="flex flex-col gap-3">
          {online ? null : (
            <p className="rounded-card border border-help bg-help-soft p-3 text-sm font-medium text-help">
              {t("report.offline", lang)}
            </p>
          )}
          <button
            type="button"
            onClick={build}
            disabled={!online}
            /* text-page, not text-white: --color-calm is a light teal in dark
               mode and white on it fails contrast. */
            className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page disabled:opacity-50"
          >
            {t("report.build", lang)}
          </button>
        </section>
      ) : null}

      {phase === "loading" ? (
        <section
          role="status"
          aria-busy="true"
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
        >
          <p className="text-base font-medium">{t("report.building", lang)}</p>
          {/* A plain bar rather than a spinner, and `animate-pulse` is stopped
              by the reduced-motion rule in index.css. */}
          <div className="h-1.5 w-full overflow-hidden rounded-card bg-calm-soft">
            <div className="h-full w-1/2 animate-pulse bg-calm" />
          </div>
        </section>
      ) : null}

      {phase === "error" ? (
        <section className="flex flex-col gap-3 rounded-card border border-help bg-help-soft p-4">
          <p role="alert" className="text-base font-medium text-help">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={build}
            disabled={!online}
            className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page disabled:opacity-50"
          >
            {t("errors.retry", lang)}
          </button>
        </section>
      ) : null}

      {result && (phase === "review" || phase === "approved") ? (
        <>
          {/* One language at a time: the child's own first, the German one
              tap away. */}
          <CardLanguageSwitch lang={lang} showing={showing} onChange={setShowing} />
          {showing === "de" ? (
            <ReportVersion
              label={t("write.german", lang)}
              note={t("report.germanNote", lang)}
              text={result.german_version}
              textLang="de"
            />
          ) : (
            <ReportVersion
              label={t("report.childLabel", lang)}
              text={result.child_version}
              textLang={lang}
            />
          )}
          <ReportApproval
            lang={lang}
            approved={phase === "approved"}
            onApprove={approve}
            onChange={change}
          />
        </>
      ) : null}
    </main>
  );
}
