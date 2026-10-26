import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import { onQuickExit } from "../lib/quickExit";
import { deviceVoices, onVoicesChanged, pickVoice, readableText, speak, stopSpeaking } from "../lib/speech";
import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";

/**
 * The speaker button: reads the screen below it aloud, in the screen's
 * language, with an on-device voice only (`lib/speech.ts` says why). Pressing
 * it again stops. Nothing is sent anywhere.
 *
 * It renders nothing when the device has no local voice for the language, so
 * there is never a button that does nothing or reads in the wrong language.
 * Leaving the screen stops the voice, and so does Leave now: a phone that keeps
 * talking after the child has fled is the opposite of a quick exit.
 */
export default function ReadAloud({ lang, target }: { lang: Lang; target: RefObject<HTMLElement | null> }) {
  const [voice, setVoice] = useState(() => pickVoice(deviceVoices(), lang));
  const [speaking, setSpeaking] = useState(false);

  // Voices load late on most phones, and a language change needs another one.
  useEffect(() => {
    const refresh = () => setVoice(pickVoice(deviceVoices(), lang));
    refresh();
    return onVoicesChanged(refresh);
  }, [lang]);

  // Stop on leaving this screen, and on Leave now.
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
    const text = readableText(target.current?.innerText ?? "");
    if (voice && speak(text, lang, voice, () => setSpeaking(false))) setSpeaking(true);
  }, [speaking, target, voice, lang]);

  if (!voice) return null;

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={speaking}
      className="squish min-h-tap inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface px-4 text-sm font-bold text-ink"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {speaking ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
      </svg>
      {t(speaking ? "read.stop" : "read.aloud", lang)}
    </button>
  );
}
