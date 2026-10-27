/**
 * The danger pop-up (Vernika on #77: an urgent result showed nothing).
 *
 * The contacts are read from content/helplines.json, read-only, so the test
 * renders what the server would send and types no number of its own.
 *
 *   node --import tsx --test src/components/DangerDialog.test.tsx
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { Resource } from "../types/api.ts";
import { DangerDialogView, opensForResult, opensForTiles } from "./DangerDialog.tsx";
import { STRINGS } from "../lib/strings.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(SRC, path), "utf-8");

/** The contacts as /api/emergency and /api/resources serve them. */
function served(): { emergency: Resource[]; chat: Resource } {
  const data = JSON.parse(readFileSync(join(SRC, "../../content/helplines.json"), "utf8"));
  const toResource = (entry: Resource) => ({ ...entry, retrieved_at: data.verified_on });
  return {
    emergency: data.emergency.map(toResource),
    chat: toResource(data.helplines.find((entry: { id: string }) => entry.id === "krisenchat")),
  };
}

const urgent = { safety: { urgent: true } };
const calm = { safety: { urgent: false } };

test("an urgent result opens it; a calm one does not", () => {
  assert.equal(opensForResult(urgent, "they will hurt me", null), true);
  assert.equal(opensForResult(calm, "they laughed at me", null), false);
  assert.equal(opensForResult(null, "", null), false);
});

test("once per result: not again for the same words, again for new ones", () => {
  assert.equal(opensForResult(urgent, "they will hurt me", "they will hurt me"), false);
  assert.equal(opensForResult(urgent, "they hurt me again today", "they will hurt me"), true);
});

test("a danger tile opens it, once; other tiles do not", () => {
  assert.equal(opensForTiles([], ["hit"]), true);
  assert.equal(opensForTiles(["names"], ["names", "threatened"]), true);
  assert.equal(opensForTiles(["names"], ["names", "pushed"]), false);
  assert.equal(opensForTiles(["hit"], ["hit", "threatened"]), false, "already open for this pick");
  assert.equal(opensForTiles(["hit"], []), false);
});

test("it renders the numbers from the response as buttons that dial", () => {
  const { emergency, chat } = served();
  const markup = renderToStaticMarkup(
    createElement(DangerDialogView, { lang: "en", contacts: emergency, failed: false, chat, onContinue: () => {} }),
  );
  assert.ok(emergency.length >= 2);
  for (const contact of emergency) {
    assert.ok(markup.includes(`href="tel:${contact.contact}"`), contact.name);
    assert.ok(markup.includes(`>${contact.contact}<`), contact.name);
  }
  assert.match(markup, /role="alertdialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.ok(markup.includes(STRINGS["danger.title"].en));
  assert.ok(markup.includes(STRINGS["danger.continue"].en));
  // krisenchat after the numbers, with its languages printed.
  assert.ok(markup.indexOf(chat.name) > markup.indexOf(emergency[emergency.length - 1].contact));
  assert.ok(markup.includes("Speaks German and Ukrainian only"));
});

test("helplines.json lists police then emergency, the order the labels assume", () => {
  // The labels under the numbers go by position. A reordered file must fail
  // here rather than put "Police" under the ambulance number.
  const data = JSON.parse(readFileSync(join(SRC, "../../content/helplines.json"), "utf8"));
  assert.deepEqual(data.emergency.map((entry: { id: string }) => entry.id), ["police", "emergency"]);
});

test("the pop-up is in the child's language, labels under the numbers included", () => {
  const { emergency, chat } = served();
  for (const lang of ["en", "de", "hi"] as const) {
    const markup = renderToStaticMarkup(
      createElement(DangerDialogView, { lang, contacts: emergency, failed: false, chat, onContinue: () => {} }),
    );
    const at = (key: keyof typeof STRINGS) => markup.indexOf(`>${STRINGS[key][lang]}<`);
    assert.ok(at("danger.police") > -1, `${lang} police`);
    assert.ok(at("danger.ambulance") > at("danger.police"), `${lang} ambulance after police`);
    for (const key of ["danger.title", "danger.hint", "danger.orWrite", "danger.continue"] as const) {
      assert.ok(at(key) > -1, `${lang} ${key}`);
    }
    // The German-only names from the file are not shown.
    for (const contact of emergency) assert.ok(!markup.includes(contact.name), `${lang}: ${contact.name}`);
  }
  const hi = renderToStaticMarkup(
    createElement(DangerDialogView, { lang: "hi", contacts: null, failed: true, chat, onContinue: () => {} }),
  );
  assert.ok(hi.includes(STRINGS["help.dangerLineNoNumber"].hi));
  assert.ok(!hi.includes("Speaks"), "krisenchat's language note is in Hinglish too");
});

test("an unexpected extra contact keeps its own name", () => {
  const { emergency } = served();
  const extra = { ...emergency[0], name: "Extra service" };
  const markup = renderToStaticMarkup(
    createElement(DangerDialogView, { lang: "en", contacts: [...emergency, extra], failed: false, chat: null, onContinue: () => {} }),
  );
  assert.ok(markup.includes(">Extra service<"));
});

test("if /api/emergency fails, it says where help is instead of the numbers", () => {
  const markup = renderToStaticMarkup(
    createElement(DangerDialogView, { lang: "de", contacts: null, failed: true, chat: null, onContinue: () => {} }),
  );
  assert.ok(markup.includes(STRINGS["help.dangerLineNoNumber"].de));
  assert.doesNotMatch(markup, /tel:/);
  assert.ok(markup.includes(STRINGS["danger.continue"].de), "Continue is still there");
});

test("nothing in it moves, and it promises nothing it cannot keep", () => {
  const source = read("components/DangerDialog.tsx");
  assert.doesNotMatch(source, /animate-|transition/);
  for (const key of ["danger.title", "danger.hint", "danger.orWrite", "danger.continue"] as const) {
    for (const text of Object.values(STRINGS[key])) {
      assert.doesNotMatch(text, /keeps? you safe|nothing (is|gets) sent|sicher|kuch nahi bheja/i, key);
    }
  }
});

test("Write and PictureQuestions both mount it, and Continue only closes it", () => {
  for (const file of ["screens/Write.tsx", "screens/PictureQuestions.tsx"]) {
    const source = read(file);
    // onClose sets the dialog flag and nothing else: the child's text and
    // picks are other state, untouched.
    assert.match(source, /<DangerDialog lang=\{lang\} onClose=\{\(\) => setDanger\(false\)\} \/>/, file);
    assert.match(source, /<HelpPulse \/>/, `${file} keeps the glow`);
  }
  assert.match(read("components/DangerDialog.tsx"), /onContinue=\{onClose\}/);
});

test("Leave now stays above the dialog and in its Tab cycle", () => {
  assert.match(read("components/QuickExitButton.tsx"), /sticky top-0 z-40/);
  assert.match(read("components/QuickExitButton.tsx"), /data-quick-exit/);
  const dialog = read("components/DangerDialog.tsx");
  assert.match(dialog, /fixed inset-0 z-30/);
  assert.match(dialog, /\[data-quick-exit\]/);
});
