/**
 * The service worker keeps the app and the help list for offline use, and
 * never the child's words.
 *
 *   node --import tsx --test src/pwa/offline.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cacheRule } from "./cacheRule.ts";
import { PUBLIC_FILES, serviceWorkerSource } from "./offline.ts";

const APP = "https://app.example";
const API = "https://api.example";

test("the child's words are never kept: translate, clarify and report are not touched", () => {
  for (const path of ["/api/translate", "/api/clarify", "/api/report"]) {
    assert.equal(cacheRule(`${API}${path}`, "POST", "cors", APP), null, path);
    // Even if one were ever sent as a GET, it is not on the list.
    assert.equal(cacheRule(`${API}${path}?text=x`, "GET", "cors", APP), null, path);
  }
});

test("the help list, the guide and the demo story are kept, from the API's own host too", () => {
  assert.equal(cacheRule(`${API}/api/emergency`, "GET", "cors", APP), "api");
  assert.equal(cacheRule(`${API}/api/resources?lang=hi&state=BY`, "GET", "cors", APP), "api");
  assert.equal(cacheRule(`${APP}/api/guide?lang=de`, "GET", "cors", APP), "api");
  assert.equal(cacheRule(`${API}/api/demo`, "GET", "cors", APP), "api");
});

test("health checks and unknown API paths are not kept", () => {
  assert.equal(cacheRule(`${API}/api/health`, "GET", "cors", APP), null);
  assert.equal(cacheRule(`${API}/api/anything`, "GET", "cors", APP), null);
});

test("our page and files are kept; other sites are left alone", () => {
  assert.equal(cacheRule(`${APP}/`, "GET", "navigate", APP), "page");
  assert.equal(cacheRule(`${APP}/assets/index-abc.js`, "GET", "no-cors", APP), "asset");
  assert.equal(cacheRule("https://elsewhere.example/x.js", "GET", "no-cors", APP), null);
});

test("the built sw.js is valid JavaScript with the rule pasted in, and lists the files", () => {
  const source = serviceWorkerSource(["assets/index-abc.js", ...PUBLIC_FILES], "vividia-test");
  assert.doesNotThrow(() => new Function(source), "sw.js does not parse");
  // The tested function itself, pasted in: not a copy that could drift.
  assert.ok(source.includes(`const cacheRule = ${cacheRule.toString()};`));
  assert.match(source, /"assets\/index-abc\.js"/);
  assert.match(source, /"manifest\.webmanifest"/);
  assert.match(source, /\/api\/emergency/);
});

test("every file the manifest names exists in public/", () => {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
  const manifest = JSON.parse(readFileSync(join(publicDir, "manifest.webmanifest"), "utf-8"));
  for (const icon of manifest.icons) assert.doesNotThrow(() => readFileSync(join(publicDir, icon.src)), icon.src);
  for (const file of PUBLIC_FILES) assert.doesNotThrow(() => readFileSync(join(publicDir, file)), file);
  assert.equal(manifest.display, "standalone");
});
