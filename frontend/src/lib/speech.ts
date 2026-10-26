/**
 * Read-aloud with the device's own speech engine (CLAUDE.md Tier A: "nothing
 * leaves the phone").
 *
 * ## Only on-device voices
 *
 * `speechSynthesis` is not always local. Chrome on a laptop lists "Google
 * Deutsch", "Google UK English" and so on, and those are network voices
 * (`localService === false`): the text is sent to Google to be spoken. A
 * child's screen can hold their own words, so a network voice would break the
 * promise in the one place it matters most. `pickVoice` therefore only ever
 * returns a voice with `localService === true`, and with no such voice for the
 * screen's language the read-aloud button is not shown at all. A button that
 * quietly sends text away, or that reads German with an English voice, is
 * worse than no button.
 *
 * ## Which voice for which screen
 *
 * - `en`: any local English voice.
 * - `de`: a local German voice.
 * - `hi` (Hinglish, Roman letters): a local Hindi voice first, then Indian
 *   English, which reads romanised Hindi the way the child would say it.
 *   A British or American voice would mangle it, so it is not offered.
 */

import type { Lang } from "./strings.ts";

/** The parts of SpeechSynthesisVoice this needs, so a test can pass plain objects. */
export interface VoiceLike {
  lang: string;
  localService: boolean;
  default?: boolean;
  name?: string;
}

/** BCP-47 prefixes to try, best first. */
const WANTED: Record<Lang, readonly string[]> = {
  en: ["en"],
  de: ["de"],
  hi: ["hi", "en-in"],
};

/** The tag the utterance carries, so the engine knows how to read the text. */
export const UTTERANCE_LANG: Record<Lang, string> = { en: "en", de: "de-DE", hi: "hi-IN" };

/** The best on-device voice for a screen's language, or null if it has none. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: Lang): V | null {
  const local = voices.filter((voice) => voice.localService === true);
  for (const prefix of WANTED[lang]) {
    const matching = local.filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(prefix));
    if (matching.length > 0) return matching.find((voice) => voice.default) ?? matching[0];
  }
  return null;
}

function synth(): SpeechSynthesis | null {
  try {
    return globalThis.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

/** The voices the device has now; empty where there is no speech engine. */
export function deviceVoices(): SpeechSynthesisVoice[] {
  try {
    return synth()?.getVoices() ?? [];
  } catch {
    return [];
  }
}

/** Call `listener` when the device's voice list changes (it loads late). */
export function onVoicesChanged(listener: () => void): () => void {
  const engine = synth();
  if (!engine) return () => {};
  engine.addEventListener("voiceschanged", listener);
  return () => engine.removeEventListener("voiceschanged", listener);
}

/** Stop anything being read. Safe to call with nothing playing, or no engine. */
export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    // Nothing to stop.
  }
}

/**
 * Read `text` aloud with `voice`, replacing anything already being read.
 * Returns false when it could not start. `onEnd` runs when it finishes or is
 * stopped.
 */
export function speak(text: string, lang: Lang, voice: SpeechSynthesisVoice, onEnd: () => void): boolean {
  const engine = synth();
  if (!engine || !text.trim() || typeof SpeechSynthesisUtterance === "undefined") return false;
  try {
    engine.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = UTTERANCE_LANG[lang];
    utterance.rate = 0.9;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    engine.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/**
 * A screen's visible text (`innerText` of the live screen, which skips hidden
 * parts) as one string to read. Each line ends with a full stop, so the voice
 * pauses between a title and each choice instead of running them together.
 */
export function readableText(visible: string): string {
  return visible
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/[.?!:…।]$/.test(line) ? line : `${line}.`))
    .join(" ");
}
