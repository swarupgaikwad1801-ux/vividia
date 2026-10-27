/**
 * What the service worker may keep, decided in one plain function so it can
 * be tested here and pasted, unchanged, into the built `sw.js` (offline.ts).
 *
 * Kept for offline use:
 * - "page": the app's own page (any navigation on our origin), network first,
 *   so an online phone always gets the newest build.
 * - "asset": our own built files (scripts, styles, fonts, icons), which never
 *   change under the same name, so cache first.
 * - "api": four GET answers that hold no child data at all: the emergency
 *   numbers, the helpline list, the adult guide and the demo story. Network
 *   first, so the help list is never older than it has to be, and still there
 *   with no signal.
 *
 * Never kept: anything that is not a GET (translate, clarify and report are
 * POSTs carrying the child's words), any other /api/ path, and any other
 * site. Returning null means "do not touch it": the browser fetches it as if
 * there were no service worker.
 */
export type CacheKind = "page" | "asset" | "api";

export function cacheRule(href: string, method: string, mode: string, origin: string): CacheKind | null {
  if (method !== "GET") return null;
  const url = new URL(href);
  const KEEP_API = ["/api/emergency", "/api/resources", "/api/guide", "/api/demo"];
  if (url.pathname.startsWith("/api/")) return KEEP_API.includes(url.pathname) ? "api" : null;
  if (url.origin !== origin) return null;
  if (mode === "navigate") return "page";
  return "asset";
}
