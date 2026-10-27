/**
 * The offline service worker, written at build time with no extra dependency.
 *
 * `vite-plugin-pwa` would be the usual tool, but it adds a dependency tree to
 * Vernika's package.json and lists support only up to an older Vite than the
 * 8.x this app builds with. What it would do for us is small: list every file
 * the build wrote, so they can be saved on the first visit. This plugin does
 * exactly that and nothing else.
 *
 * The built `sw.js`:
 * - on install, saves every built file and the page itself, so the second
 *   visit works with no signal at all;
 * - answers requests by `cacheRule` (cacheRule.ts, tested), which never
 *   keeps the child's words: those only ever travel in POST requests;
 * - on activate, deletes the caches of older builds.
 *
 * Translation still needs the network; the writing screen already says so in
 * the child's language when it fails.
 */

import type { Plugin } from "vite";
import { cacheRule } from "./cacheRule.ts";

/** Files in public/ that the bundle does not list, saved on install too. */
export const PUBLIC_FILES = ["manifest.webmanifest", "icon-192.png", "icon-512.png", "icon.svg"];

/** The service worker's source, for a build with these files. */
export function serviceWorkerSource(files: readonly string[], version: string): string {
  return `// Built by src/pwa/offline.ts. Do not edit: it is rewritten on every build.
const VERSION = ${JSON.stringify(version)};
const PRECACHE = ${JSON.stringify(["./", ...files])};
const cacheRule = ${cacheRule.toString()};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== VERSION).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallback) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallback ?? request, response.clone());
    return response;
  } catch (error) {
    const kept = await cache.match(fallback ?? request);
    if (kept) return kept;
    throw error;
  }
}

async function cacheFirst(request) {
  const kept = await caches.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const kind = cacheRule(request.url, request.method, request.mode, self.location.origin);
  if (kind === "page") event.respondWith(networkFirst(request, "./"));
  else if (kind === "api") event.respondWith(networkFirst(request));
  else if (kind === "asset") event.respondWith(cacheFirst(request));
});
`;
}

/** The Vite plugin: emit sw.js beside the build, listing every file in it. */
export function offline(): Plugin {
  return {
    name: "vividia-offline",
    apply: "build",
    generateBundle(_options, bundle) {
      // .woff is the old twin of each .woff2; every browser that can run a
      // service worker loads .woff2, so the twins would only cost storage.
      const built = Object.keys(bundle).filter((name) => !name.endsWith(".map") && !name.endsWith(".woff"));
      const files = [...built, ...PUBLIC_FILES].sort();
      // A new list of hashed names means a new build, so a new cache name.
      let hash = 0;
      for (const char of files.join("|")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
      this.emitFile({ type: "asset", fileName: "sw.js", source: serviceWorkerSource(files, `vividia-${hash.toString(36)}`) });
    },
  };
}
