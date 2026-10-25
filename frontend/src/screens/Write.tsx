import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, clarify, translate } from "../lib/api.ts";
import type { TranslateResponse } from "../types/api.ts";
import { t } from "../lib/strings.ts";
import WriteClarify, { SOMETHING_ELSE } from "../components/WriteClarify.tsx";
import WriteProgress from "../components/WriteProgress.tsx";
import WriteResult from "../components/WriteResult.tsx";
import WriteSafetyNote from "../components/WriteSafetyNote.tsx";
import { tt } from "../components/WriteStrings.ts";

/**
 * "Find the words" — the child writes in their own language and sees the
 * verified German beside it.
 *
 * The one promise this screen keeps above all others: **nothing leaves here
 * except when the child presses something.** There is no autosave, no
 * translate-as-you-type, no debounce that quietly posts a half-written
 * sentence, and no notification to anybody. `translate()` and `clarify()` are
 * called from exactly two click handlers below and from nowhere else, which is
 * the only way to make "child-initiated, every single time" a property of the
 * code rather than an intention.
 *
 * Self-contained on purpose: Vernika wires this into the shell herself
 * (CLAUDE.md, file ownership), so the screen owns no routing and no storage.
 * It reports upwards through `onApproved` and `onNeedHelp` and keeps its own
 * draft in component state.
 *
 * Every state is designed, because the quality bar asks for it and because
 * each one is a real moment for the child:
 *
 * - *writing* — the draft, with send disabled while it is blank;
 * - *offline* — said plainly before they press anything, not after;
 * - *checking* — a 12 s wait with the clock showing (see WriteProgress);
 * - *result* — their words and the German side by side, plus the live check
 *   count from `usage.calls_made`;
 * - *question* — an ambiguity, with a third way out (see WriteClarify);
 * - *error* — `ApiError.messageChild` and nothing else, text kept.
 *
 * What a child sees on failure is **only** `ApiError.messageChild`. No code,
 * no status, no model name, no stack — and nothing they wrote is ever logged
 * here, not even to the console, because a console log is one screen-share
 * away from being read out in a classroom.
 */

export interface ApprovedWords {
  /** Exactly what the child typed. */
  text_child: string;
  /** The German they just looked at and accepted. */
  text_de: string;
  /** Agreement between passes, NOT a correctness score. Passed on unchanged. */
  confidence: number;
  /** `{ phrase: option.id }` for the answers the child gave, if any. */
  clarifications: Record<string, string>;
}

export interface WriteProps {
  /** The child's language: "en", "hi", or "de" for a German-speaking child. */
  lang: string;
  /**
   * Pre-filled draft, for "Try Amara's story" (a judge presses send, nothing
   * more). Read once, when the screen mounts: remount with a new `key` to
   * replace a draft the child may have started.
   */
  initialText?: string;
  /**
   * Called when the child approves the German. Until it is wired, the approve
   * button is not rendered at all — CLAUDE.md's quality bar says every button
   * works, and a button that silently does nothing is worse than its absence.
   */
  onApproved?: (approved: ApprovedWords) => void;
  /**
   * Route to the help list. Required, because the safety floor must have
   * somewhere to go: see WriteSafetyNote.
   */
  onNeedHelp: () => void;
}

type Phase = "writing" | "checking" | "result" | "error";

/** What the last send did, so "try again" repeats it rather than guessing. */
type Run =
  | { kind: "translate"; text: string }
  | { kind: "clarify"; text: string; choices: Record<string, string> };

export default function Write({ lang, initialText, onApproved, onNeedHelp }: WriteProps) {
  const [text, setText] = useState(initialText ?? "");
  const [phase, setPhase] = useState<Phase>("writing");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  /** The text the result belongs to; the left column must never drift from it. */
  const [checkedText, setCheckedText] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [decidedByChild, setDecidedByChild] = useState(false);
  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null);
  const [lastRun, setLastRun] = useState<Run | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  // Assume online unless the browser actually says otherwise: `onLine` is
  // missing in some runtimes, and a false "you are offline" banner would stop
  // a child who has a perfectly good connection from sending anything.
  const [online, setOnline] = useState(() => navigator?.onLine !== false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  /**
   * Which send is still the current one. `lib/api.ts` owns the fetch and
   * exposes no abort, so "Stop" cannot cancel the request on the wire — it
   * bumps this, and the answer to an abandoned send is dropped instead of
   * appearing over whatever the child is doing by then. Same guard stops a
   * slow first reply overwriting a faster second one.
   */
  const runRef = useRef(0);

  // The clock for the progress view. Restarted by the phase change itself, so
  // a second check cannot inherit the first one's elapsed time.
  useEffect(() => {
    if (phase !== "checking") return;
    const startedAt = Date.now();
    setElapsedMs(0);
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 500);
    return () => clearInterval(timer);
  }, [phase]);

  // Offline is a state the child is told about before they press send, not a
  // failure they discover afterwards.
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Move the reader to the German when it arrives. Without this a screen
  // reader user is left at the bottom of a form that has silently changed.
  useEffect(() => {
    if (phase === "result") resultRef.current?.focus();
  }, [phase]);

  const run = useCallback(
    async (next: Run) => {
      const id = ++runRef.current;
      setLastRun(next);
      setFailure(null);
      setPhase("checking");
      try {
        const response =
          next.kind === "clarify"
            ? await clarify({ text: next.text, source_lang: lang, choices: next.choices })
            : await translate({ text: next.text, source_lang: lang });
        if (id !== runRef.current) return;
        setResult(response);
        setCheckedText(next.text);
        setDecidedByChild(next.kind === "clarify");
        setPhase("result");
      } catch (error) {
        if (id !== runRef.current) return;
        // messageChild is the only string a child may see; `error.message` and
        // the HTTP status stay here, unread and unlogged.
        const safe =
          error instanceof ApiError
            ? { message: error.messageChild, retryable: error.retryable }
            : { message: t("errors.generic", lang), retryable: true };
        setFailure(safe);
        setPhase("error");
      }
    },
    [lang],
  );

  const draft = text.trim();
  const ambiguities = result?.ambiguities ?? [];

  function send() {
    if (!draft || !online) return;
    setChoices({});
    void run({ kind: "translate", text: draft });
  }

  function answerAmbiguities() {
    // SOMETHING_ELSE is ours, not the engine's: it must never reach the
    // backend as an option id. A phrase the child answered that way is left
    // out of `choices` entirely and handled by `rewrite()` instead.
    const sendable = Object.fromEntries(
      Object.entries(choices).filter(([, id]) => id !== SOMETHING_ELSE),
    );
    if (Object.keys(sendable).length === 0) return;
    void run({ kind: "clarify", text: checkedText, choices: sendable });
  }

  /** Back to the editor with the draft intact. Used by Stop, Change it, and Say it another way. */
  function backToEditor() {
    runRef.current += 1; // abandon anything in flight
    setPhase("writing");
    // `text` is never cleared by a send, so the textarea still holds exactly
    // what the child typed — including an edit they made and then abandoned.
    // Nothing is restored over the top of it on purpose.
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function approve() {
    if (!result || !onApproved) return;
    onApproved({
      text_child: checkedText,
      text_de: result.translation,
      confidence: result.confidence,
      clarifications: Object.fromEntries(
        Object.entries(choices).filter(([, id]) => id !== SOMETHING_ELSE),
      ),
    });
  }

  return (
    // A section, not a <main>: the shell owns the page landmark, and two
    // <main> elements on one page is invalid and confuses a screen reader.
    // The max width and padding let the screen stand up on its own; the shell
    // can drop them by wrapping it.
    <section
      aria-labelledby="write-title"
      className="mx-auto flex w-full max-w-sm flex-col gap-5 px-4 py-6 sm:max-w-2xl"
    >
      <header className="flex flex-col gap-1">
        <h1 id="write-title" className="text-2xl font-semibold tracking-tight">
          {t("write.title", lang)}
        </h1>
        <p id="write-hint" className="text-base text-ink-soft">
          {t("write.hint", lang)}
        </p>
      </header>

      {!online && (
        // The wording is the same sentence lib/api.ts shows for a failed
        // fetch, so the child reads one explanation, not two.
        <p role="status" className="rounded-card border border-line bg-help-soft p-3 text-sm text-help">
          {t("errors.network", lang)}
        </p>
      )}

      {phase === "writing" && (
        <section className="flex flex-col gap-3">
          <textarea
            ref={editorRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            // No autofocus: on Android that throws the keyboard over the
            // screen before the child has read what this page is for.
            rows={7}
            lang={lang}
            aria-labelledby="write-title"
            aria-describedby="write-hint"
            placeholder={t("write.placeholder", lang)}
            className="w-full resize-y rounded-card border border-line bg-surface p-3 text-base leading-relaxed placeholder:text-ink-soft"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft || !online}
            // text-page, not text-white: --color-calm is a light teal in dark
            // mode, where white measures ~2.3:1 against the 4.5:1 floor.
            className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page disabled:opacity-50"
          >
            {t("write.send", lang)}
          </button>
          {/* Said on the screen where the words are written, not buried in a
              settings page: this is the moment the child is deciding whether
              to trust the app at all. */}
          <p className="text-sm text-ink-soft">{t("handoff.youDecide", lang)}</p>
        </section>
      )}

      {phase === "checking" && (
        <WriteProgress lang={lang} elapsedMs={elapsedMs} onStop={backToEditor} />
      )}

      {phase === "error" && failure && (
        <section role="alert" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <p className="text-base">{failure.message}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {failure.retryable && lastRun && (
              <button
                type="button"
                onClick={() => void run(lastRun)}
                disabled={!online}
                className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page disabled:opacity-50 sm:flex-1"
              >
                {tt("write.retry", lang)}
              </button>
            )}
            <button
              type="button"
              onClick={backToEditor}
              className="min-h-tap rounded-card border border-line px-4 text-base font-medium sm:flex-1"
            >
              {t("approve.change", lang)}
            </button>
          </div>
        </section>
      )}

      {phase === "result" && result && (
        // tabIndex -1 so the focus move above has somewhere to land; it is not
        // in the tab order.
        <div ref={resultRef} tabIndex={-1} className="flex flex-col gap-5">
          {/* First, before the German: the safety floor (CLAUDE.md). Shown
              because the text said something urgent — not because anyone was
              told anything. Nothing was sent. */}
          {result.safety.urgent && result.safety.message_child && (
            <WriteSafetyNote lang={lang} safety={result.safety} onNeedHelp={onNeedHelp} />
          )}

          <WriteResult
            lang={lang}
            childText={checkedText}
            result={result}
            decidedByChild={decidedByChild}
          />

          {ambiguities.length > 0 && (
            <WriteClarify
              lang={lang}
              ambiguities={ambiguities}
              choices={choices}
              onChoose={(phrase, optionId) =>
                setChoices((current) => ({ ...current, [phrase]: optionId }))
              }
              onSubmit={answerAmbiguities}
              onRewrite={backToEditor}
            />
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {onApproved && (
              <button
                type="button"
                onClick={approve}
                className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page sm:flex-1"
              >
                {t("approve.yes", lang)}
              </button>
            )}
            <button
              type="button"
              onClick={backToEditor}
              className="min-h-tap rounded-card border border-line px-4 text-base font-medium sm:flex-1"
            >
              {t("approve.change", lang)}
            </button>
          </div>

          <p className="text-sm text-ink-soft">{t("handoff.youDecide", lang)}</p>
        </div>
      )}
    </section>
  );
}
