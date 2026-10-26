/**
 * The Need help screen lists each service with the languages it speaks
 * (CLAUDE.md: the crisis screen must print them).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HelpList } from "./HelpScreen.tsx";
import { languageNote } from "../lib/help.ts";
import type { Resource } from "../types/api.ts";

// Shapes only: these are test fixtures, not contacts the app shows.
const CONTACTS: Resource[] = [
  { name: "Emergency A", contact: "000", hours: "24/7", languages: ["de"], source_url: "x", retrieved_at: "2026-10-24T00:00:00Z" },
  { name: "Chat B", contact: "https://example.org", hours: "daily", languages: ["de", "en"], source_url: "x", retrieved_at: "2026-10-24T00:00:00Z" },
];

test("each service shows the languages it speaks, in the child's language", () => {
  for (const lang of ["en", "hi"]) {
    const markup = renderToStaticMarkup(createElement(HelpList, { lang, contacts: CONTACTS }));
    for (const contact of CONTACTS) assert.ok(markup.includes(languageNote(contact, lang)), `${lang}: ${contact.name}`);
  }
});

test("a number is a tel: link and a web address is a link", () => {
  const markup = renderToStaticMarkup(createElement(HelpList, { lang: "en", contacts: CONTACTS }));
  assert.match(markup, /href="tel:000"/);
  assert.match(markup, /href="https:\/\/example.org"/);
});

test("an empty list renders nothing", () => {
  assert.equal(renderToStaticMarkup(createElement(HelpList, { lang: "en", contacts: [] })), "");
});
