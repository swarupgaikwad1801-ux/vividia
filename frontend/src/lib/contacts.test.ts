/**
 * The contacts built into the app (lib/contacts.ts) are the ones in
 * content/helplines.json, shaped as the API sends them, and the Need help
 * screen shows them before any network call has answered.
 *
 * Neel, 27 Oct: "in people who can help, I can't see any number". Render was
 * asleep, the 15 s fetch timed out, and the screen had nothing else.
 *
 *   cd frontend
 *   node --import tsx --test src/lib/contacts.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BUILT_IN_EMERGENCY, BUILT_IN_HELPLINES } from "./contacts.ts";
import HelpScreen from "../screens/HelpScreen.tsx";

const FILE = JSON.parse(readFileSync(new URL("../../../content/helplines.json", import.meta.url), "utf-8"));

test("the built-in contacts are exactly the ones in helplines.json, in file order", () => {
  assert.deepEqual(BUILT_IN_EMERGENCY.map((c) => c.contact), FILE.emergency.map((c: { contact: string }) => c.contact));
  assert.deepEqual(BUILT_IN_HELPLINES.map((c) => c.contact), FILE.helplines.map((c: { contact: string }) => c.contact));
});

test("shaped like engine/resources.py _curated(): the screen looks the same online or not", () => {
  for (const contact of [...BUILT_IN_EMERGENCY, ...BUILT_IN_HELPLINES]) {
    assert.deepEqual(Object.keys(contact).sort(), ["contact", "hours", "languages", "name", "retrieved_at", "source_url"]);
    assert.equal(contact.retrieved_at, FILE.verified_on);
  }
});

test("Need help shows every number before the network has answered", () => {
  // Server rendering runs no effects, so no fetch has happened here at all:
  // this is the screen a child sees offline, or while Render wakes up.
  for (const lang of ["en", "de", "hi"]) {
    const html = renderToStaticMarkup(createElement(HelpScreen, { lang }));
    for (const contact of [...BUILT_IN_EMERGENCY, ...BUILT_IN_HELPLINES]) {
      assert.ok(html.includes(contact.contact), `${lang}: ${contact.contact}`);
    }
  }
});

test("no contact is typed into the app: contacts.ts imports the file", () => {
  const source = readFileSync(new URL("./contacts.ts", import.meta.url), "utf-8");
  assert.match(source, /from "\.\.\/\.\.\/\.\.\/content\/helplines\.json"/);
  for (const contact of [...FILE.emergency, ...FILE.helplines]) {
    assert.ok(!source.includes(contact.contact), `${contact.contact} is typed into contacts.ts`);
  }
});
