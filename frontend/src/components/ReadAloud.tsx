import { useCallback, useEffect, useState } from "react";
import { onQuickExit } from "../lib/quickExit";
import { deviceVoices, onVoicesChanged, pickVoice, speak, stopSpeaking } from "../lib/speech";
import type { Lang } from "../lib/strings";
import { isLang, t } from "../lib/strings";

/**
 * The speaker button beside a question: reads that question aloud, and only
 * the question (Neel's phone test, 27 Oct: reading every tile, button and the
 * top bar was noise). A screen that asks nothing has no button.
 *
 * On-device voices only (`lib/speech.ts` says why); with none for the
 * language it renders nothing. Pressing again stops. Leaving the screen stops
 * the voice, and so does Leave now.
 */
export default function ReadAloud({ lang: given, text }: { lang: string; text: string }) {
  const lang: Lang = isLang(given) ? given : "en";
  const [voice, setVoice] = useState(() => pickVoice(deviceVoices(), lang));
  const [speaking, setSpeaking] = useState(false);

  // Voices load late on most phones, and a language change needs another one.
  useEffect(() => {
    const refresh = () => setVoice(pickVoice(deviceVoices(), lang));
    refresh();
    return onVoicesChanged(refresh);
  }, [lang]);

  useEffect(() => {
    const unregister = onQuickExit(stopSpeaking);
    return () => {
      unregister();
      stopSpeaking();
    };
  }, []);

  const press = useCallback(() => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (voice && speak(text, voice, () => setSpeaking(false))) setSpeaking(true);
  }, [speaking, voice, text]);

  if (!voice) return null;

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={speaking}
      aria-label={t(speaking ? "read.stop" : "read.aloud", lang)}
      className="squish inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface text-ink"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {speaking ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
      </svg>
    </button>
  );
}

/**
 * A screen's question with its speaker button beside it. `as` keeps each
 * screen's own heading level; `className` its own size.
 */
export function SpokenQuestion({
  lang,
  text,
  id,
  as: Tag = "h1",
  className = "",
}: {
  lang: string;
  text: string;
  id?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <Tag id={id} className={className}>
        {text}
      </Tag>
      <ReadAloud lang={lang} text={text} />
    </div>
  );
}
