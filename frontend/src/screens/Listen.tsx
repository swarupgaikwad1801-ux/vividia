import { useEffect, useRef, useState } from "react";

import Notebook from "../art/Notebook.tsx";
import DangerDialog, { HelpPulse } from "../components/DangerDialog.tsx";
import { ApiError, listen } from "../lib/api.ts";
import { HELP_NUDGE, MAX_CARD_CHARS, replyFor, wordsForCard, type Turn } from "../lib/listening.ts";
import { t } from "../lib/strings.ts";

/**
 * "Tell us what happened": the child talks, and we answer every message
 * before anything else is offered (Swarup, 27 Oct).
 *
 * It keeps going for as long as the child wants. The card is one tap away
 * the whole time, from the first answer on, and never pushed: nothing is
 * translated, saved as an entry, or put on a card until the child presses
 * "Make a card". Then everything they wrote goes to the writing screen, where
 * the German is checked and they approve it, exactly as before.
 *
 * What we say back is mostly fixed. `POST /api/listen` returns the kind of
 * thing the child said, and `lib/listening.ts` picks a reviewed sentence for
 * it. Only for a message no kind fits may the server add a short reply the
 * model wrote, and only once a code check and a second model have both
 * passed it (engine/listen.py); otherwise the reviewed line is shown. The
 * "we" voice, no promises, and the notebook instead of a face are how this
 * stays on the right side of CLAUDE.md's "no AI friend": we listen so that a
 * person can.
 *
 * The safety check runs on every message, not only on the card: a child who
 * writes "I want to die" halfway through a conversation is shown help then.
 *
 * Every state is designed: empty (the notebook and the first question),
 * reading (dots in our bubble), answered, failed (the message stays, with
 * "Try again"), offline (said before they press anything), full page, and
 * "Not now".
 */

export interface ListenProps {
  lang: string;
  /** The conversation so far, kept by the shell so Back and Help do not lose it. */
  turns: readonly Turn[];
  onTurnsChange: (next: Turn[]) => void;
  /** What the child had typed but not written down yet, same reason. */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Everything they wrote, as one text, when they press "Make a card". */
  onMakeCard: (words: string) => void;
  onHome: () => void;
  /** The red Need help list, the same place the top-bar button goes. */
  onNeedHelp: () => void;
}

export default function Listen({
  lang,
  turns,
  onTurnsChange,
  draft,
  onDraftChange,
  onMakeCard,
  onHome,
  onNeedHelp,
}: ListenProps) {
  /** Index of the turn being read, or null. */
  const [reading, setReading] = useState<number | null>(null);
  const [failed, setFailed] = useState<{ index: number; message: string } | null>(null);
  const [danger, setDanger] = useState<string | null>(null);
  const [urgentSeen, setUrgentSeen] = useState(false);
  const [resting, setResting] = useState(false);
  // "Clear this chat" asks once more before anything goes (clearChat below).
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [online, setOnline] = useState(() => navigator?.onLine !== false);
  const endRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  /** Drops the answer to a message the child has moved on from. */
  const runRef = useRef(0);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Keep the newest thing in view, the way any conversation does.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [turns.length, reading]);

  const used = wordsForCard(turns).length;
  const room = Math.max(0, MAX_CARD_CHARS - used - 2);
  const full = room < 20;
  const text = draft.trim();
  const answered = turns.some((turn) => turn.kind !== null);

  async function read(index: number, all: Turn[]) {
    const id = ++runRef.current;
    setFailed(null);
    setReading(index);
    try {
      const heard = await listen({ text: all[index].text, lang });
      if (id !== runRef.current) return;
      onTurnsChange(
        all.map((turn, i) =>
          i === index
            ? {
                ...turn,
                kind: heard.kind,
                // Which details it gave, so the next question asks for one it did not.
                told: heard.told ?? [],
                urgent: heard.safety.urgent,
                written: heard.reply,
              }
            : turn,
        ),
      );
      if (heard.safety.urgent) {
        setUrgentSeen(true);
        setDanger(heard.safety.message_child);
      }
    } catch (error) {
      if (id !== runRef.current) return;
      setFailed({
        index,
        message: error instanceof ApiError ? error.messageChild : t("errors.generic", lang),
      });
    } finally {
      if (id === runRef.current) setReading(null);
    }
  }

  function writeDown() {
    if (!text || !online || reading !== null || full) return;
    const next = [...turns, { text, kind: null }];
    onTurnsChange(next);
    onDraftChange("");
    setCleared(false);
    void read(next.length - 1, next);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  /**
   * "Clear this chat", after the child has said yes a second time (Neel,
   * 27 Oct). Everything on this screen goes: every message, every answer and
   * the unsent box. Bumping `runRef` drops an answer still on its way, so a
   * reply cannot land in the empty chat a moment later. The Need help glow
   * stays if danger was seen: clearing the words does not clear the reason
   * help is one tap away. Entries already saved as a card are not touched;
   * the conversation lives only in memory, so there is nothing stored to
   * delete.
   */
  function clearChat() {
    runRef.current += 1;
    setReading(null);
    setFailed(null);
    setDanger(null);
    setConfirmClear(false);
    onTurnsChange([]);
    onDraftChange("");
    setCleared(true);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  if (resting) {
    return (
      <section aria-labelledby="listen-rest" className="mx-4 my-6 flex flex-col items-center gap-4 rounded-card border-[3px] border-ink bg-surface p-5 text-center">
        <Notebook lines={turns.length} className="h-28 w-auto" />
        <p id="listen-rest" className="text-lg text-ink">{t("heard.notNowDone", lang)}</p>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => setResting(false)}
            className="squish min-h-tap rounded-full bg-calm px-4 text-base font-bold text-page"
          >
            {t("heard.keepWriting", lang)}
          </button>
          <button
            type="button"
            onClick={onHome}
            className="squish min-h-tap rounded-full border-[3px] border-ink bg-surface px-4 text-base font-bold text-ink"
          >
            {t("heard.home", lang)}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="listen-title" className="flex flex-col gap-4 px-4 pt-3 pb-6">
      {urgentSeen && <HelpPulse />}
      {danger !== null && <DangerDialog lang={lang} message={danger} onClose={() => setDanger(null)} />}

      <header className="flex flex-col items-center gap-1 text-center">
        <Notebook lines={turns.length} className="h-32 w-auto drop-shadow-none" />
        <h1 id="listen-title" className="text-3xl text-balance text-ink">
          {t("heard.title", lang)}
        </h1>
        {turns.length === 0 && <p className="text-base text-ink-soft">{t("heard.hint", lang)}</p>}
      </header>

      {/* The conversation. role=log so a screen reader announces each new
          answer without the child having to go looking for it. */}
      <ol role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-3">
        {turns.map((turn, index) => {
          const reply = turn.kind !== null ? replyFor(index, turns) : null;
          return (
            <li key={index} className="flex flex-col gap-2">
              <div className="animate-pop-in ml-10 self-end rounded-card rounded-br-md border-[3px] border-ink bg-surface px-4 py-3 shadow-[3px_3px_0_0_#1B1B2F]">
                <span className="sr-only">{t("heard.you", lang)}: </span>
                <p lang={lang} className="whitespace-pre-wrap text-base text-ink">{turn.text}</p>
              </div>

              {reading === index && (
                <div className="mr-10 flex items-center gap-2 self-start rounded-card rounded-bl-md border-[3px] border-ink bg-sun px-4 py-3">
                  <span className="sr-only">{t("heard.reading", lang)}</span>
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      aria-hidden="true"
                      className="reading-dot size-2.5 rounded-full bg-ink"
                      style={{ animationDelay: `${dot * 160}ms` }}
                    />
                  ))}
                </div>
              )}

              {failed?.index === index && (
                <div role="alert" className="mr-10 flex flex-col items-start gap-2 self-start rounded-card border-[3px] border-ink bg-surface px-4 py-3">
                  <p className="text-base text-ink">{failed.message}</p>
                  <button
                    type="button"
                    onClick={() => void read(index, [...turns])}
                    disabled={!online}
                    className="squish min-h-tap rounded-full bg-calm px-4 text-base font-bold text-page disabled:opacity-50"
                  >
                    {t("heard.retry", lang)}
                  </button>
                </div>
              )}

              {reply && (
                <>
                  <div className="animate-pop-in mr-10 self-start rounded-card rounded-bl-md border-[3px] border-ink bg-sun px-4 py-3">
                    <span className="sr-only">{t("heard.us", lang)}: </span>
                    {reply.lines.map((key) => (
                      <p key={key} className="text-base text-ink">{t(key, lang)}</p>
                    ))}
                    {/* Written by the model for this message, after both
                        checks (engine/listen.py). In the child's language. */}
                    {reply.written && (
                      <p lang={lang} className="text-base text-ink">{reply.written}</p>
                    )}
                    {/* Help one tap from the sentence that needed it, for a
                        child who was hurt or threatened (lib/listening.ts). */}
                    {turn.kind !== null && HELP_NUDGE.has(turn.kind) && !turn.urgent && (
                      <button
                        type="button"
                        onClick={onNeedHelp}
                        className="squish mt-2 min-h-tap rounded-full border-[3px] border-help bg-help px-4 text-base font-bold text-page"
                      >
                        {t("help.short", lang)}
                      </button>
                    )}
                  </div>
                  {/* Only the newest question: an old one, already answered,
                      would read as the app asking it again. */}
                  {index === turns.length - 1 && reply.ask && (
                    <div
                      className="animate-pop-in mr-10 self-start rounded-card rounded-bl-md border-[3px] border-ink bg-sun px-4 py-3"
                      style={{ animationDelay: "350ms" }}
                    >
                      <p className="text-base font-semibold text-ink">{t(reply.ask, lang)}</p>
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />

      {!online && (
        <p role="status" className="rounded-card border-[3px] border-ink bg-help-soft p-3 text-sm text-help">
          {t("errors.network", lang)}
        </p>
      )}

      {/* The writing box stays at the bottom of the conversation, so the next
          thing to say is always right there. */}
      {full ? (
        <p className="rounded-card border-[3px] border-ink bg-surface p-3 text-base text-ink">{t("heard.full", lang)}</p>
      ) : (
        <div className="flex flex-col gap-2 rounded-card border-[3px] border-ink bg-surface p-2">
          <textarea
            ref={editorRef}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={3}
            maxLength={room}
            lang={lang}
            aria-label={t("heard.title", lang)}
            placeholder={t("write.placeholder", lang)}
            className="w-full resize-none rounded-xl bg-surface p-2 text-base leading-relaxed text-ink placeholder:text-ink-soft focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={writeDown}
            disabled={!text || !online || reading !== null}
            className="squish min-h-tap rounded-full bg-calm px-4 text-base font-bold text-page disabled:opacity-50"
          >
            {t("heard.send", lang)}
          </button>
        </div>
      )}

      {/* The card, offered once we have answered, and never more than that:
          there all the time, pushed never. */}
      {answered && (
        <div className="animate-pop-in flex flex-col gap-2 rounded-card border-[3px] border-ink bg-calm-soft p-4">
          <p className="text-base text-ink">{t("heard.cardOffer", lang)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onMakeCard(wordsForCard(turns))}
              disabled={reading !== null}
              className="squish min-h-tap flex-1 rounded-full border-[3px] border-ink bg-sun px-4 text-base font-bold text-ink disabled:opacity-50"
            >
              {t("heard.makeCard", lang)}
            </button>
            <button
              type="button"
              onClick={() => setResting(true)}
              className="squish min-h-tap rounded-full border-[3px] border-ink bg-surface px-4 text-base font-bold text-ink"
            >
              {t("heard.notNow", lang)}
            </button>
          </div>
        </div>
      )}

      {/* Clear this chat: quiet, at the very bottom, and never in one tap. */}
      {(turns.length > 0 || draft.trim() !== "") &&
        (confirmClear ? (
          <div role="group" aria-labelledby="listen-clear-ask" className="flex flex-col gap-2 rounded-card border-[3px] border-ink bg-surface p-4">
            <p id="listen-clear-ask" className="text-base text-ink">{t("heard.clearAsk", lang)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearChat}
                className="squish min-h-tap flex-1 rounded-full border-[3px] border-ink bg-surface px-4 text-base font-bold text-ink"
              >
                {t("heard.clearYes", lang)}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="squish min-h-tap flex-1 rounded-full bg-calm px-4 text-base font-bold text-page"
              >
                {t("heard.clearNo", lang)}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="squish min-h-tap self-center rounded-full px-4 text-sm font-bold text-ink-soft underline"
          >
            {t("heard.clear", lang)}
          </button>
        ))}
      {cleared && turns.length === 0 && (
        <p role="status" className="text-center text-base text-ink-soft">{t("heard.cleared", lang)}</p>
      )}
    </section>
  );
}
