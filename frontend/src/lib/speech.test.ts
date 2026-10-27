/**
 * Read-aloud picks an on-device voice or none: a network voice would send the
 * child's screen to a speech service (CLAUDE.md: nothing leaves the phone).
 *
 *   node --import tsx --test src/lib/speech.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { pickVoice, speak, stopSpeaking, utteranceLang, type VoiceLike } from "./speech.ts";

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

test("English and German screens get a local voice in their language", () => {
  const voices = [v("en-GB", true), v("de-DE", true), v("de-DE", false, "Google Deutsch")];
  assert.equal(pickVoice(voices, "en")?.lang, "en-GB");
  assert.equal(pickVoice(voices, "de")?.name, "de-DE");
});

test("Hinglish uses Indian English first, even when a Hindi voice is there (Neel's phone, 27 Oct)", () => {
  assert.equal(pickVoice([v("hi-IN", true), v("en-IN", true)], "hi")?.lang, "en-IN");
});

test("Hinglish falls back to Hindi, never to a British or American voice", () => {
  assert.equal(pickVoice([v("en-US", true), v("hi-IN", true)], "hi")?.lang, "hi-IN");
  assert.equal(pickVoice([v("en-US", true), v("en-GB", true)], "hi"), null);
});

test("the utterance carries the language of the voice it uses", () => {
  assert.equal(utteranceLang(v("en-IN", true)), "en-IN");
  assert.equal(utteranceLang(v("en_IN", true)), "en-IN", "Android's underscore form");
  assert.equal(utteranceLang(v("hi-IN", true)), "hi-IN");
});

test("Android's underscore tags are understood when choosing", () => {
  assert.equal(pickVoice([v("de_DE", true)], "de")?.lang, "de_DE");
  assert.equal(pickVoice([v("en_IN", true)], "hi")?.lang, "en_IN");
});

test("the device's default voice wins among equals", () => {
  const voices = [v("en-US", true, "a"), v("en-GB", true, "b", true)];
  assert.equal(pickVoice(voices, "en")?.name, "b");
});

test("no voices, no button", () => {
  assert.equal(pickVoice([], "en"), null);
});

test("with no speech engine (Node, an old browser) nothing throws and nothing plays", () => {
  assert.doesNotThrow(() => stopSpeaking());
  assert.equal(speak("hello", {} as SpeechSynthesisVoice, () => {}), false);
});
