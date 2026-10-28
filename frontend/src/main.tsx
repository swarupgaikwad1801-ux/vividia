import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyDisplay, readDisplay } from "./lib/display";
// Fonts are bundled, not fetched from a font service: the app works offline
// and no request leaves the phone to load a typeface. Only the weights and
// scripts the screens use. Inter for text (latin); Outfit 800 for headlines
// (Neel's pick, the closest free look to a heavy geometric display face);
// Baloo 2 for Devanagari, which neither covers: the screens are Hinglish in
// Roman letters, but a child may still type Devanagari, and it shows on their
// card and in the engine's questions. Its files load only when a Devanagari
// letter is on screen (unicode-range), so a Hinglish screen costs nothing.
import "@fontsource/outfit/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/baloo-2/devanagari-400.css";
import "@fontsource/baloo-2/devanagari-600.css";
import "@fontsource/baloo-2/devanagari-800.css";
import "./index.css";

// Bigger text / easier reading, before the first paint, so nothing flashes small.
applyDisplay(readDisplay());

// Vibrate on tap: only when the child turned it on (data-haptics, see
// lib/display.ts), only on something pressable, and only where the phone
// supports it. One listener for the whole app, so no screen changes.
document.addEventListener("pointerdown", (event) => {
  if (!document.documentElement.hasAttribute("data-haptics")) return;
  if (typeof navigator.vibrate !== "function") return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("button, label, a")) navigator.vibrate(8);
});

// Privacy cover, like Signal's "Screen Security": the moment the app is
// hidden (home button, app switcher, another tab), the page goes blank, so
// the preview a phone keeps of it shows nothing of what the child wrote.
// Best effort: a browser may take that preview before this runs. It comes
// back as soon as the app is visible again; nothing is lost.
const cover = () => document.documentElement.toggleAttribute("data-covered", document.visibilityState === "hidden");
document.addEventListener("visibilitychange", cover);
window.addEventListener("pagehide", () => document.documentElement.setAttribute("data-covered", ""));
window.addEventListener("pageshow", cover);

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline after the first visit (src/pwa/offline.ts). Built app only: in
// development a cached build would hide every change. A failure only means
// the app needs the network, as it did before.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
