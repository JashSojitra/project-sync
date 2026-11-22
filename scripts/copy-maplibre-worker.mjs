// Copies MapLibre's standalone worker into /public so it can be served at a stable URL.
// MapLibre resolves its worker with a dynamic `new URL(...)` that bundlers cannot follow.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json"));
const outDir = join(process.cwd(), "public", "vendor");
mkdirSync(outDir, { recursive: true });
copyFileSync(join(pkgDir, "dist", "maplibre-gl-worker.mjs"), join(outDir, "maplibre-gl-worker.mjs"));
console.log("maplibre worker -> public/vendor/maplibre-gl-worker.mjs");
