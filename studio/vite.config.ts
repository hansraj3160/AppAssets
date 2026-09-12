import { createReadStream, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import {
  aiCopyHandler,
  bannerExportHandler,
  deleteAllHandler,
  deleteHandler,
  designHandler,
  exportHandler,
  faviconExportHandler,
  healthHandler,
  iconHandler,
  importHandler,
  localesHandler,
  replaceCaptureHandler,
  type StudioApi,
  singleExportHandler,
  studioPaths,
} from "../src/studio-server.ts";

const SRC_DIR = resolve(import.meta.dirname, "src");
const APPASSETS_ROOT = resolve(import.meta.dirname, "..");
const STUDIO_PUBLIC = resolve(import.meta.dirname, "public");

// APPASSETS_CONFIG / GOLDIE_CONFIG points at a config outside this repo; out/ and the design
// sidecar live next to it.
const CONFIG =
  process.env.APPASSETS_CONFIG || process.env.GOLDIE_CONFIG
    ? resolve((process.env.APPASSETS_CONFIG || process.env.GOLDIE_CONFIG)!)
    : existsSync(join(APPASSETS_ROOT, "appassets.config.ts"))
      ? join(APPASSETS_ROOT, "appassets.config.ts")
      : join(APPASSETS_ROOT, "goldie.config.ts");
const PATHS = studioPaths(CONFIG);

/**
 * Dev server: `out/web` is the static root - the manifest, the bezel art and
 * symlinks to the raw captures and finished assets, all served from `/`.
 * Nothing is copied into the studio, so a re-run of `appassets capture` shows
 * up on reload. Run `appassets manifest` first; the directory does not exist
 * before that. `fs.allow` covers the root because the studio imports
 * src/layouts.ts for the shared geometry.
 *
 * Build: no publicDir, so studio/dist is just the app shell. `appassets studio`
 * serves it together with the app's out/web and the same API (see
 * src/studio-server.ts); that is what the npm package ships.
 */
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), appassetsApi()],
  resolve: { alias: { "@": SRC_DIR } },
  publicDir: command === "build" ? resolve(import.meta.dirname, "public") : PATHS.webDir,
  server: { port: 4321, open: true, fs: { allow: [APPASSETS_ROOT, PATHS.outDir] } },
}));

/** Mounts the shared /api handlers on the dev server, running the CLI from source. */
function appassetsApi(): Plugin {
  const api: StudioApi = { paths: PATHS, cli: ["bun", join(APPASSETS_ROOT, "src", "cli.ts")] };
  const design = designHandler(api);
  const exp = exportHandler(api);
  const expSingle = singleExportHandler(api);
  const expBanner = bannerExportHandler(api);
  const expFavicon = faviconExportHandler(api);
  const icon = iconHandler(api);
  const imp = importHandler(api);
  const repCapture = replaceCaptureHandler(api);
  const del = deleteHandler(api);
  const delAll = deleteAllHandler(api);
  const locales = localesHandler(api);
  const aiCopy = aiCopyHandler(api);
  const health = healthHandler(api);
  return {
    name: "appassets-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/health", health);
      server.middlewares.use("/health", health);
      server.middlewares.use("/api/ai/generate-copy", aiCopy);
      server.middlewares.use("/api/design", design);
      server.middlewares.use("/api/locales", locales);
      server.middlewares.use("/api/icon", icon);
      server.middlewares.use("/api/export-single", expSingle);
      server.middlewares.use("/api/export-banner", expBanner);
      server.middlewares.use("/api/export-favicon", expFavicon);
      server.middlewares.use("/api/export", (req, res) => exp(req.url ?? "")(req, res));
      server.middlewares.use("/api/import", imp);
      server.middlewares.use("/api/replace-capture", repCapture);
      server.middlewares.use("/api/delete-all", delAll);
      server.middlewares.use("/api/delete", del);
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === "/logo.png" || req.url === "/favicon.png")) {
          const filePath = join(STUDIO_PUBLIC, req.url.slice(1));
          if (existsSync(filePath)) {
            res.setHeader("Content-Type", "image/png");
            createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}
