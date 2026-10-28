/**
 * Every box a child types their own words into turns off the browser's
 * writing suggestions (lib/privateText.ts). Read from the source, so a new
 * text box anywhere in src/ fails here until it spreads PRIVATE_TEXT.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PRIVATE_TEXT } from "./privateText.ts";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

test("every textarea in the app spreads PRIVATE_TEXT", () => {
  let found = 0;
  for (const file of sources(SRC)) {
    const code = readFileSync(file, "utf-8");
    for (const match of code.matchAll(/<textarea\b([\s\S]*?)\/?>/g)) {
      found++;
      assert.match(match[1], /\{\.\.\.PRIVATE_TEXT\}/, `${file}: a <textarea> without {...PRIVATE_TEXT}`);
    }
  }
  assert.ok(found >= 3, `expected the chat, Write and own-words boxes, found ${found}`);
});

test("React writes the attribute to the page as the browser expects it", () => {
  const html = renderToStaticMarkup(createElement("textarea", { ...PRIVATE_TEXT, readOnly: true }));
  assert.match(html, /writingsuggestions="false"/);
});
