import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served from https://manikarov.github.io/shadowpanther/ (a GitHub Pages
// project site), so assets must resolve under that subpath.
const BASE = "/shadowpanther/";

// GitHub Pages has no server-side SPA fallback: a direct hit on /weapons 404s.
// Shipping a 404.html that is a copy of index.html makes Pages serve the app
// for any unknown path, and React Router then renders the right route.
function spaFallback() {
  return {
    name: "spa-404-fallback",
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), spaFallback()],
});
