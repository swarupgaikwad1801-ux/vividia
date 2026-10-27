/**
 * Tests for the help list helpers.
 *
 * The real contacts are read from content/helplines.json, read-only, so these
 * tests exercise the actual gap the app has rather than an invented one: both
 * German helplines are German-only, and a Hindi-speaking child gets a number
 * nobody will answer them on.
 *
 * Run:
 *   node --test frontend/src/lib/help.test.ts
 *
 * Type-check (Vite-shaped settings; see moods.test.ts for why not nodenext):
 *   npx tsc --strict --noEmit --target es2022 --module esnext \
 *     --moduleResolution bundler --lib es2022,dom \
 *     --allowImportingTsExtensions frontend/src/lib/*.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { Resource } from "../types/api.ts";
import {
  HINDI_REVIEWED,
  freshness,
  languageName,
  languageNote,
  sortForChild,
  speaksChildLanguage,
} from "./help.ts";

function resource(over: Partial<Resource> = {}): Resource {
  return {
    name: "A service",
    contact: "116 111",
    hours: "Mo–Sa 14–20 Uhr",
    languages: ["de"],
    source_url: "https://example.org/",
    retrieved_at: "2026-10-24",
    ...over,
  };
}

/** The curated contacts, as the app really serves them. */
function curated(): Resource[] {
  const path = new URL("../../../content/helplines.json", import.meta.url);
  const data = JSON.parse(readFileSync(path, "utf8"));
  return [...data.helplines, ...data.emergency].map(
    (entry: { name: string; contact: string; hours: string; languages: string[]; source_url: string }) => ({
      name: entry.name,
      contact: entry.contact,
      hours: entry.hours,
      languages: entry.languages,
      source_url: entry.source_url,
      retrieved_at: data.verified_on,
    }),
  );
}

// --- the gap this module exists to show ------------------------------------

test("the real curated list really is German-only, which is the point", () => {
  const real = curated();

  assert.ok(real.length > 0, "no contacts read; is the path still right?");
  for (const service of real) {
    assert.equal(
      speaksChildLanguage(service, "hi"),
      false,
      `${service.name} now lists Hindi; if that is real, CLAUDE.md needs updating too`,
    );
  }
});

test("a Hindi-speaking child is told, in Hindi, that the service is not", () => {
  const [helpline] = curated();
  const note = languageNote(helpline!, "hi");

  assert.ok(note.length > 0, "the note a screen must print is empty");
  assert.ok(note.includes("Sirf"), "the note does not convey 'only'");
  assert.notEqual(note, languageNote(helpline!, "en"), "it is not in the child's language");
});

test("a note is never silently empty for a service that declares languages", () => {
  for (const service of curated()) {
    for (const lang of ["en", "de", "hi"]) {
      assert.ok(languageNote(service, lang).trim(), `${service.name}/${lang} has no note`);
    }
  }
});

// --- languageNote ----------------------------------------------------------

test("says 'only' when the child's language is not among them", () => {
  const german = resource({ languages: ["de"] });

  assert.equal(languageNote(german, "en"), "Speaks German only");
  assert.equal(languageNote(german, "hi"), "Sirf German bolte hain");
  assert.equal(languageNote(german, "de"), "Spricht Deutsch");
});

test("drops 'only' when the service does speak the child's language", () => {
  const both = resource({ languages: ["de", "en"] });

  assert.equal(languageNote(both, "en"), "Speaks German and English");
  assert.equal(languageNote(both, "de"), "Spricht Deutsch und Englisch");
});

test("lists two languages with the right conjunction", () => {
  const krisenchat = resource({ languages: ["de", "uk"] });

  // An English-speaking child: neither language is theirs, so "only".
  assert.equal(languageNote(krisenchat, "en"), "Speaks German and Ukrainian only");
  // A German-speaking child: this service DOES speak their language, so
  // "nur" would be misleading rather than informative.
  assert.equal(languageNote(krisenchat, "de"), "Spricht Deutsch und Ukrainisch");
});

test("lists three or more with commas and a final conjunction", () => {
  const many = resource({ languages: ["de", "uk", "en"] });

  // Hindi is not among them, so the note still has to say so.
  assert.equal(languageNote(many, "hi"), "Sirf German, Ukrainian aur English bolte hain");
  // ...and for an English child it drops, because English is in the list.
  assert.equal(languageNote(many, "en"), "Speaks German, Ukrainian and English");
});

test("a service that declares no languages gets no note at all", () => {
  // A note that says nothing is worse than none: it looks like an answer.
  assert.equal(languageNote(resource({ languages: [] }), "en"), "");
});

test("an unknown language code shows the code rather than an invented name", () => {
  assert.equal(languageName("zz", "en"), "ZZ");
  assert.equal(languageNote(resource({ languages: ["zz"] }), "en"), "Speaks ZZ only");
});

test("a language we have no interface copy for falls back to English", () => {
  const german = resource({ languages: ["de"] });
  assert.equal(languageNote(german, "uk"), languageNote(german, "en"));
});

// --- sortForChild ----------------------------------------------------------

test("a service the child can use comes first", () => {
  const list = [
    resource({ name: "German only", languages: ["de"] }),
    resource({ name: "Speaks Hindi", languages: ["de", "hi"] }),
  ];

  assert.deepEqual(
    sortForChild(list, "hi").map((r) => r.name),
    ["Speaks Hindi", "German only"],
  );
});

test("order is otherwise untouched", () => {
  // The backend already returns a considered order, so re-ranking on one axis
  // must not reshuffle the rest.
  const list = [
    resource({ name: "first", languages: ["de"] }),
    resource({ name: "second", languages: ["de"] }),
    resource({ name: "third", languages: ["de"] }),
  ];

  assert.deepEqual(
    sortForChild(list, "hi").map((r) => r.name),
    ["first", "second", "third"],
  );
});

test("stable within both groups", () => {
  const list = [
    resource({ name: "de-1", languages: ["de"] }),
    resource({ name: "hi-1", languages: ["hi"] }),
    resource({ name: "de-2", languages: ["de"] }),
    resource({ name: "hi-2", languages: ["hi"] }),
  ];

  assert.deepEqual(
    sortForChild(list, "hi").map((r) => r.name),
    ["hi-1", "hi-2", "de-1", "de-2"],
  );
});

test("does not mutate the list it was given", () => {
  const list = [
    resource({ name: "a", languages: ["de"] }),
    resource({ name: "b", languages: ["hi"] }),
  ];

  sortForChild(list, "hi");

  assert.deepEqual(list.map((r) => r.name), ["a", "b"]);
});

test("an empty list is fine", () => {
  assert.deepEqual(sortForChild([], "en"), []);
});

test("the real list puts nothing ahead of the helplines for an English child", () => {
  // Neither speaks English, so nothing is promoted and the curated order,
  // which puts the helplines before the emergency numbers, survives.
  const real = curated();
  assert.deepEqual(
    sortForChild(real, "en").map((r) => r.contact),
    real.map((r) => r.contact),
  );
});

// --- freshness -------------------------------------------------------------

const NOW = new Date("2026-10-24T12:00:00Z");

test("today, yesterday, and a number of days", () => {
  assert.equal(freshness("2026-10-24", "en", NOW), "checked today");
  assert.equal(freshness("2026-10-23", "en", NOW), "checked yesterday");
  assert.equal(freshness("2026-10-21", "en", NOW), "checked 3 days ago");
});

test("in the child's language", () => {
  assert.equal(freshness("2026-10-24", "de", NOW), "heute geprüft");
  assert.equal(freshness("2026-10-23", "hi", NOW), "kal check kiya");
  assert.equal(freshness("2026-10-21", "de", NOW), "vor 3 Tagen geprüft");
});

test("counted by calendar day, not by elapsed hours", () => {
  // Checked late yesterday, read early today: 14 hours apart, but it is still
  // "yesterday" to anyone reading it.
  const earlyToday = new Date("2026-10-24T08:00:00Z");
  assert.equal(freshness("2026-10-23T18:00:00Z", "en", earlyToday), "checked yesterday");
});

test("a full ISO timestamp works, not just a date", () => {
  assert.equal(freshness("2026-10-22T09:30:00Z", "en", NOW), "checked 2 days ago");
});

test("a date we cannot read shows nothing rather than a wrong age", () => {
  assert.equal(freshness("not a date", "en", NOW), "");
  assert.equal(freshness("", "en", NOW), "");
});

test("a future date reads as today rather than as negative days", () => {
  // Clock skew between a phone and a server is ordinary.
  assert.equal(freshness("2026-10-26", "en", NOW), "checked today");
});

test("the real curated date renders", () => {
  for (const service of curated()) {
    assert.ok(freshness(service.retrieved_at, "en", NOW).length > 0, service.name);
  }
});

// --- the Hindi caveat ------------------------------------------------------

test("the Hindi wording is still flagged as unreviewed", () => {
  assert.equal(HINDI_REVIEWED, false);
});
