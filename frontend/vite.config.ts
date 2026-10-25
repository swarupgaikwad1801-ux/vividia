import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // `host: true` publishes the dev server on the local network, so the daily
    // 22:00 phone test can open it on a real Android device instead of a
    // desktop window pretending to be one (CLAUDE.md, quality bar: 360px).
    host: true,
    port: 5173,
  },
  build: {
    // Judges open this on a cheap phone, so a regression in bundle size is a
    // product bug. Warn early rather than at deploy.
    chunkSizeWarningLimit: 300,
  },
});
