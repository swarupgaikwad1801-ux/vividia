import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Fonts are bundled, not fetched from a font service: the app works offline
// and no request leaves the phone to load a typeface. Only the weights and
// scripts the screens use. Inter for text (latin); Baloo 2 for Hindi
// (Devanagari), which Inter does not cover; the browser picks per character.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/baloo-2/devanagari-400.css";
import "@fontsource/baloo-2/devanagari-600.css";
import "@fontsource/baloo-2/devanagari-800.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
