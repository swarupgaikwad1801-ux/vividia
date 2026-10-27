/**
 * Tests for what the Help and Safety screens show. Plain node:test.
 *
 *   npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type { Resource } from "../types/api.ts";
import { contactLink, helpView, settledHelpView } from "./helpView.ts";

const NOW = new Date("2026-10-26T12:00:00Z");

function resource(name: string, contact: string, languages: string[]): Resource {
  return {
    name,
    contact,
    hours: "24/7",
    languages,
    source_url: "https://example.org/",
    retrieved_at: "2026-10-24",
  };
}

const POLICE = resource("Polizei (Notruf)", "110", ["de"]);
const AMBULANCE = resource("Feuerwehr und Rettungsdienst (Notruf)", "112", ["de"]);
const PHONE_LINE = resource("Nummer gegen Kummer", "116 111", ["de"]);
const CHAT = resource("krisenchat", "https://krisenchat.de/", ["de", "uk"]);
const ENGLISH_SERVICE = resource("An English-speaking service", "0800 000 000", ["de", "en"]);

test("110 and 112 come first, in file order, whatever the child's language", () => {
  const view = helpView([POLICE, AMBULANCE], [PHONE_LINE, ENGLISH_SERVICE], "fallback", "en", NOW);
  assert.deepEqual(view.danger.map((c) => c.contact), ["110", "112"]);
});

test("a service in the child's own language never jumps above the emergency numbers", () => {
  const view = helpView([POLICE], [PHONE_LINE, ENGLISH_SERVICE], "fallback", "en", NOW);
  assert.equal(view.danger[0]!.contact, "110");
  assert.equal(view.talk[0]!.contact, "0800 000 000", "but it does lead the talk list");
});

test("every service says which languages it speaks, and 'only' when the child's is missing", () => {
  const view = helpView([POLICE], [PHONE_LINE, CHAT], "fallback", "en", NOW);
  assert.equal(view.danger[0]!.languages, "Speaks German only");
  assert.equal(view.talk.find((c) => c.name === "krisenchat")!.languages, "Speaks German and Ukrainian only");
});

test("the language note follows the child's language", () => {
  const view = helpView([POLICE], [], "fallback", "de", NOW);
  assert.equal(view.danger[0]!.languages, "Spricht Deutsch");
});

test("each service shows how long ago it was checked", () => {
  const view = helpView([POLICE], [], "fallback", "en", NOW);
  assert.equal(view.danger[0]!.checked, "checked 2 days ago");
});

test("a service listed in both responses is shown once, under danger", () => {
  const view = helpView([POLICE], [POLICE, PHONE_LINE], "fallback", "en", NOW);
  assert.deepEqual(view.danger.map((c) => c.contact), ["110"]);
  assert.deepEqual(view.talk.map((c) => c.contact), ["116 111"]);
});

test("whether the local lookup was live is passed through for the screen to say", () => {
  assert.equal(helpView([], [], "live", "en", NOW).source, "live");
  assert.equal(helpView([], [], "fallback", "en", NOW).source, "fallback");
});

test("phone numbers get a tel: link with the spaces removed, the number itself stays as written", () => {
  assert.deepEqual(contactLink("116 111"), { href: "tel:116111", kind: "phone" });
  assert.deepEqual(contactLink("110"), { href: "tel:110", kind: "phone" });
  assert.deepEqual(contactLink("+49 30 1234"), { href: "tel:+49301234", kind: "phone" });
  const view = helpView([], [PHONE_LINE], "fallback", "en", NOW);
  assert.equal(view.talk[0]!.contact, "116 111");
});

test("an https site gets a link; anything else gets none rather than a guess", () => {
  assert.deepEqual(contactLink("https://krisenchat.de/"), { href: "https://krisenchat.de/", kind: "web" });
  assert.deepEqual(contactLink("http://insecure.example"), { href: null, kind: "other" });
  assert.deepEqual(contactLink("javascript:alert(1)"), { href: null, kind: "other" });
  assert.deepEqual(contactLink("WhatsApp: ask at school"), { href: null, kind: "other" });
});

test("nothing is lost: every service passed in appears exactly once", () => {
  const view = helpView([POLICE, AMBULANCE], [PHONE_LINE, CHAT, ENGLISH_SERVICE], "live", "hi", NOW);
  assert.equal(view.danger.length + view.talk.length, 5);
});

test("a source link is only ever https", () => {
  const view = helpView(
    [POLICE],
    [{ ...PHONE_LINE, source_url: "javascript:alert(1)" }, { ...CHAT, source_url: "http://krisenchat.de/" }],
    "live",
    "en",
    NOW,
  );
  assert.equal(view.danger[0]!.sourceUrl, "https://example.org/");
  assert.deepEqual(view.talk.map((c) => c.sourceUrl), [null, null]);
});

const ok = <T,>(value: T): PromiseSettledResult<T> => ({ status: "fulfilled", value });
const failed = (reason: unknown): PromiseRejectedResult => ({ status: "rejected", reason });

test("a failed live lookup does not hide 110 and 112", () => {
  const loaded = settledHelpView(ok([POLICE, AMBULANCE]), failed(new Error("offline")), "en", NOW);
  assert.equal(loaded.status, "ready");
  if (loaded.status !== "ready") return;
  assert.deepEqual(loaded.view.danger.map((c) => c.contact), ["110", "112"]);
  assert.deepEqual(loaded.view.talk, []);
  assert.ok(loaded.talkError instanceof Error);
  assert.equal(loaded.dangerError, undefined);
});

test("a failed emergency call does not hide the services that loaded", () => {
  const loaded = settledHelpView(failed("down"), ok({ resources: [PHONE_LINE], source: "fallback" as const }), "en", NOW);
  assert.equal(loaded.status, "ready");
  if (loaded.status !== "ready") return;
  assert.deepEqual(loaded.view.talk.map((c) => c.contact), ["116 111"]);
  assert.equal(loaded.dangerError, "down");
  assert.equal(loaded.talkError, undefined);
});

test("only when both fail is there nothing to show", () => {
  const loaded = settledHelpView(failed("a"), failed("b"), "en", NOW);
  assert.deepEqual(loaded, { status: "error", error: "a" });
});
