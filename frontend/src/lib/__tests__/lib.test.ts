// Tests for strings.ts, timeline.ts and api.ts. No network, no browser:
// fetch and storage are replaced with fakes.
//   npx tsx --test frontend/src/lib/__tests__/lib.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { LANGS, STRINGS, t, type StringKey } from "../strings";
import { addEntry, clearAll, isPersistent, listEntries, removeEntry, toEntries, useStorage } from "../timeline";
import { ApiError, clarify, resources, setApiBaseUrl, translate } from "../api";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const entry = (date: string, text: string) => ({ date, mood: "sad", text_child: text, text_de: `DE ${text}` });

// --- strings ---------------------------------------------------------------

test("every string exists in every language", () => {
  for (const [key, text] of Object.entries(STRINGS)) {
    for (const lang of LANGS) assert.ok((text as Record<string, string>)[lang]?.trim(), `${key}.${lang} is empty`);
  }
});

test("unknown languages fall back to English", () => {
  assert.equal(t("help.button", "tr"), STRINGS["help.button"].en);
  assert.equal(t("help.button", "de"), "Brauchst du jetzt Hilfe?");
});

test("no phone number is hard-coded in the strings", () => {
  for (const [key, text] of Object.entries(STRINGS)) {
    for (const value of Object.values(text)) assert.doesNotMatch(value, /\b11[02]\b|116\s?111/, `${key} holds a number`);
  }
});

test("quick exit never promises to erase history", () => {
  assert.match(t("quickExit.note" as StringKey, "en"), /does not delete/);
});

// --- timeline --------------------------------------------------------------

test("entries are saved, listed oldest first, and deleted", () => {
  useStorage(memoryStorage());
  addEntry(entry("2026-10-21", "second"));
  const first = addEntry(entry("2026-10-06", "first"));
  assert.deepEqual(listEntries().map((e) => e.text_child), ["first", "second"]);
  removeEntry(first.id);
  assert.deepEqual(listEntries().map((e) => e.text_child), ["second"]);
  clearAll();
  assert.equal(listEntries().length, 0);
});

test("the report payload carries no local ids", () => {
  useStorage(memoryStorage());
  addEntry(entry("2026-10-06", "x"));
  const [sent] = toEntries();
  assert.equal("id" in sent, false);
  assert.equal(sent.text_de, "DE x");
});

test("damaged stored data is dropped, not fatal", () => {
  const store = memoryStorage();
  store.setItem("vividia.timeline.v1", JSON.stringify([{ nonsense: true }, { id: "a", date: "2026-10-01", mood: "sad", text_child: "ok", text_de: "ok" }]));
  useStorage(store);
  assert.deepEqual(listEntries().map((e) => e.id), ["a"]);
  store.setItem("vividia.timeline.v1", "{not json");
  assert.deepEqual(listEntries(), []);
});

test("blocked storage keeps working in memory and says so", () => {
  useStorage({
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  });
  addEntry(entry("2026-10-06", "kept in memory"));
  assert.equal(isPersistent(), false);
  assert.equal(listEntries().length, 1);
});

test("no storage at all is not persistent", () => {
  useStorage(null);
  assert.equal(isPersistent(), false);
});

// --- api -------------------------------------------------------------------

type Call = { url: string; init: RequestInit };
function fakeFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return calls;
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("translate posts to the right URL and returns the body", async () => {
  setApiBaseUrl("https://api.example/");
  const calls = fakeFetch(() => json(200, { translation: "Hallo", ambiguities: [] }));
  const out = await translate({ text: "hi", source_lang: "en" });
  assert.equal(out.translation, "Hallo");
  assert.equal(calls[0].url, "https://api.example/api/translate");
  assert.equal(calls[0].init.method, "POST");
});

test("a backend error carries its child-safe message", async () => {
  setApiBaseUrl("");
  fakeFetch(() => json(503, { code: "upstream_unavailable", message: "dev detail", message_child: "Versuch es gleich nochmal.", retryable: true }));
  await assert.rejects(clarify({ text: "x", source_lang: "de", choices: {} } as never), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.messageChild, "Versuch es gleich nochmal.");
    assert.equal(error.code, "upstream_unavailable");
    assert.equal(error.retryable, true);
    return true;
  });
});

test("no network gives the child a calm message in their language", async () => {
  fakeFetch(() => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(translate({ text: "x", source_lang: "hi" }), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "network");
    assert.equal(error.messageChild, STRINGS["errors.network"].hi);
    return true;
  });
});

test("a non-JSON error page still gives a child-safe message", async () => {
  fakeFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
  await assert.rejects(translate({ text: "x", source_lang: "en" }), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.messageChild, STRINGS["errors.generic"].en);
    assert.equal(error.retryable, true);
    return true;
  });
});

test("resources builds its query and skips an empty state", async () => {
  const calls = fakeFetch(() => json(200, { resources: [], source: "fallback" }));
  await resources("en");
  await resources("de", "BY");
  assert.equal(calls[0].url, "/api/resources?lang=en");
  assert.equal(calls[1].url, "/api/resources?lang=de&state=BY");
});
