// Copies parser output (../../data, ../../assets) into public/ so Vite can serve it.
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const jobs = [
  [path.join(root, "data"), path.join(here, "..", "public", "data")],
  [path.join(root, "assets"), path.join(here, "..", "public", "assets")],
];

for (const [src, dest] of jobs) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Synced ${src} -> ${dest}`);
}
