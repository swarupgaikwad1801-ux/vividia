/**
 * The Need help screen lists each service with the languages it speaks
 * (CLAUDE.md: the crisis screen must print them), and when and where it was
 * checked (#85's ContactCard, folded in at the merge).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HelpList } from "./HelpScreen.tsx";
import { languageNote } from "../lib/help.ts";
import { helpView } from "../lib/helpView.ts";
import { STRINGS } from "../lib/strings.ts";
import type { Resource } from "../types/api.ts";

const NOW = new Date("2026-10-26T12:00:00Z");

// Shapes only: these are test fixtures, not contacts the app shows.
const CONTACTS: Resource[] = [
  { name: "Emergency A", contact: "000", hours: "24/7", languages: ["de"], source_url: "https://example.org/a", retrieved_at: "2026-10-24T00:00:00Z" },
  { name: "Chat B", contact: "https://example.org", hours: "daily", languages: ["de", "en"], source_url: "x", retrieved_at: "2026-10-24T00:00:00Z" },
];

const views = (lang: string) => helpView([], CONTACTS, "fallback", lang, NOW).talk;

test("each service shows the languages it speaks, in the child's language", () => {
  for (const lang of ["en", "hi"]) {
    const markup = renderToStaticMarkup(createElement(HelpList, { lang, contacts: views(lang) }));
    for (const contact of CONTACTS) assert.ok(markup.includes(languageNote(contact, lang)), `${lang}: ${contact.name}`);
  }
});

test("a number is a tel: link and a web address is a link", () => {
  const markup = renderToStaticMarkup(createElement(HelpList, { lang: "en", contacts: views("en") }));
  assert.match(markup, /href="tel:000"/);
  assert.match(markup, /href="https:\/\/example.org"/);
});

test("each card says when it was checked, and links an https source only", () => {
  const markup = renderToStaticMarkup(createElement(HelpList, { lang: "en", contacts: views("en") }));
  assert.ok(markup.includes(STRINGS["help.checkedDays"].en.replace("{n}", "2")));
  assert.match(markup, /href="https:\/\/example.org\/a"/);
  assert.equal(markup.split(`>${STRINGS["help.sourceLink"].en}<`).length - 1, 1, "the non-https source gets no link");
});

test("an empty list renders nothing", () => {
  assert.equal(renderToStaticMarkup(createElement(HelpList, { lang: "en", contacts: [] })), "");
});
