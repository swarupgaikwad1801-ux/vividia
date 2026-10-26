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

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
