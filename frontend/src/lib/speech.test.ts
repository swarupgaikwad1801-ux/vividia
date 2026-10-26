/**
 * Read-aloud picks an on-device voice or none: a network voice would send the
 * child's screen to a speech service (CLAUDE.md: nothing leaves the phone).
 *
 *   node --import tsx --test src/lib/speech.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { pickVoice, readableText, speak, stopSpeaking, type VoiceLike } from "./speech.ts";

const v = (lang: string, localService: boolean, name = lang, isDefault = false): VoiceLike => ({
  lang,
  localService,
  name,
  default: isDefault,
});

test("a network voice is never chosen, even when it is the only one for the language", () => {
  const voices = [v("de-DE", false, "Google Deutsch"), v("en-US", true)];
  assert.equal(pickVoice(voices, "de"), null);
});

test("each screen language gets a local voice in that language", () => {
  const voices = [v("en-GB", true), v("de-DE", true), v("hi-IN", true), v("de-DE", false, "Google Deutsch")];
  assert.equal(pickVoice(voices, "en")?.lang, "en-GB");
  assert.equal(pickVoice(voices, "de")?.name, "de-DE");
  assert.equal(pickVoice(voices, "hi")?.lang, "hi-IN");
});

test("Hinglish falls back to Indian English, never to a British or American voice", () => {
  assert.equal(pickVoice([v("en-US", true), v("en-IN", true)], "hi")?.lang, "en-IN");
  assert.equal(pickVoice([v("en-US", true), v("en-GB", true)], "hi"), null);
});

test("Android's underscore tags are understood", () => {
  assert.equal(pickVoice([v("de_DE", true)], "de")?.lang, "de_DE");
});

test("the device's default voice wins among equals", () => {
  const voices = [v("en-US", true, "a"), v("en-GB", true, "b", true)];
  assert.equal(pickVoice(voices, "en")?.name, "b");
});

test("no voices, no button", () => {
  assert.equal(pickVoice([], "en"), null);
});

test("each line becomes a sentence, so the voice pauses between choices", () => {
  assert.equal(readableText("What happened?\n\nPushed me\nHit me\n"), "What happened? Pushed me. Hit me.");
});

test("with no speech engine (Node, an old browser) nothing throws and nothing plays", () => {
  assert.doesNotThrow(() => stopSpeaking());
  assert.equal(speak("hello", "en", {} as SpeechSynthesisVoice, () => {}), false);
});
