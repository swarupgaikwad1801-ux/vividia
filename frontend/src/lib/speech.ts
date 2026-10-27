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
 * - `hi` (Hinglish, Roman letters): Indian English first, which reads
 *   romanised Hindi the way the child would say it; a Hindi voice only as a
 *   fallback, because on Neel's phone (27 Oct) it mangled Roman letters. A
 *   British or American voice would too, so it is not offered.
 *
 * The utterance carries the language of the voice it uses, so the engine
 * never reads with one voice under another language's rules.
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
  hi: ["en-in", "hi"],
};

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
export function speak(text: string, voice: SpeechSynthesisVoice, onEnd: () => void): boolean {
  const engine = synth();
  if (!engine || !text.trim() || typeof SpeechSynthesisUtterance === "undefined") return false;
  try {
    engine.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = utteranceLang(voice);
    utterance.rate = 0.9;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    engine.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** The voice's own language, as a BCP-47 tag ("en_IN" on Android becomes "en-IN"). */
export function utteranceLang(voice: Pick<VoiceLike, "lang">): string {
  return voice.lang.replace("_", "-");
}
