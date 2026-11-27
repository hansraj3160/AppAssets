import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { exec } from "./exec.ts";
import { assertSafeHttpUrl } from "./security.ts";
import {
  fileIn,
  STUDIO_DIST,
  STUDIO_INDEX_FALLBACK,
  STUDIO_PUBLIC,
  sendFile,
} from "./studio-server/http.ts";
import { aiCopyHandler } from "./studio-server/routes/ai.ts";
import {
  deleteAllHandler,
  deleteHandler,
  importHandler,
  replaceCaptureHandler,
  syncCapturesHandler,
} from "./studio-server/routes/captures.ts";
import {
  designHandler,
  healthHandler,
  iconHandler,
  localesHandler,
} from "./studio-server/routes/design.ts";
import {
  bannerExportHandler,
  exportHandler,
  faviconExportHandler,
  selectedExportZipHandler,
  singleExportHandler,
} from "./studio-server/routes/export.ts";
import type { Handler, StudioApi } from "./studio-server/types.ts";
import {
  getSessionIdFromRequest,
  pruneOldWorkspaces,
  resolveWorkspacePaths,
} from "./studio-server/workspace.ts";

/**
 * The studio's HTTP surface, shared by `goldie studio` (a static server over
 * the prebuilt studio/dist) and the Vite dev server (studio/vite.config.ts).
 *
 * Modular architecture:
 * - `./studio-server/types.ts`: shared API & request types
 * - `./studio-server/http.ts`: body limits, streaming, static file & MIME helpers
 * - `./studio-server/workspace.ts`: per-session isolated workspace resolution & pruning
 * - `./studio-server/rate-limit.ts`: in-memory rate limiting & client IP detection
 * - `./studio-server/config-helpers.ts`: screenshot dimension routing & config parsing
 * - `./studio-server/routes/{design,captures,export,ai}.ts`: domain route controllers
 */

export {
  appendScenesToConfig,
  assignUniqueSceneIds,
  extractLocalesFromConfig,
  findScreenshotFile,
  getDimensionsFromBuffer,
  PRESET_LOCALES,
  removeSceneFromConfig,
  resolveDeviceFromDimensions,
  updateLocalesInConfig,
} from "./studio-server/config-helpers.ts";
export {
  MAX_DESIGN_BODY_BYTES,
  MAX_JSON_BODY_BYTES,
  MAX_MEDIA_BODY_BYTES,
  MIME,
  PayloadTooLargeError,
  readBody,
  STUDIO_DIST,
  STUDIO_PUBLIC,
} from "./studio-server/http.ts";
export { aiRateLimiter, getClientIp, MemoryRateLimiter } from "./studio-server/rate-limit.ts";
export {
  aiCopyHandler,
  getGeminiApiKey,
  optimizeScreenshotForAi,
} from "./studio-server/routes/ai.ts";
export {
  deleteAllHandler,
  deleteHandler,
  importHandler,
  replaceCaptureHandler,
  syncCapturesHandler,
} from "./studio-server/routes/captures.ts";
export {
  designHandler,
  healthHandler,
  iconHandler,
  localesHandler,
  renderAppIconCanvas,
} from "./studio-server/routes/design.ts";
export {
  bannerExportHandler,
  exportHandler,
  faviconExportHandler,
  selectedExportZipHandler,
  singleExportHandler,
} from "./studio-server/routes/export.ts";
export type {
  ExportOptions,
  ExportTargets,
  Handler,
  PresetLocale,
  RateLimitConfig,
  StudioApi,
  StudioPaths,
} from "./studio-server/types.ts";
export {
  ensureWorkspaceConfig,
  getConfigPaths,
  getSessionIdFromRequest,
  pruneOldWorkspaces,
  resolveWorkspacePaths,
  studioPaths,
} from "./studio-server/workspace.ts";

const KNOWN_SPA_ROUTES = new Set([
  "/",
  "/privacy",
  "/terms",
  "/about",
  "/contact",
  "/guidelines",
  "/studio",
]);

/**
 * Creates the HTTP request handler for AppAssets Studio, handling APIs, static assets,
 * known routes (/privacy, /terms, /studio, /) with HTTP 200, unknown API paths with HTTP 404 JSON,
 * and unknown frontend routes with HTTP 404 HTML.
 */
export function createStudioRequestHandler(api: StudioApi): Handler {
  const design = designHandler(api);
  const exp = exportHandler(api);
  const expSingle = singleExportHandler(api);
  const expSelectedZip = selectedExportZipHandler(api);
  const expBanner = bannerExportHandler(api);
  const expFavicon = faviconExportHandler(api);
  const imp = importHandler(api);
  const repCapture = replaceCaptureHandler(api);
  const syncCaptures = syncCapturesHandler(api);
  const del = deleteHandler(api);
  const delAll = deleteAllHandler(api);
  const locales = localesHandler(api);
  const aiCopy = aiCopyHandler(api);
  const icon = iconHandler(api);
  const health = healthHandler(api);

  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (path === "/api/health" || path === "/health") return health(req, res);
    if (path === "/api/icon") return icon(req, res);
    if (path === "/api/design") return design(req, res);
    if (path === "/api/locales") return locales(req, res);
    if (path === "/api/ai/generate-copy") return aiCopy(req, res);
    if (path.startsWith("/api/export-single")) return expSingle(req, res);
    if (path.startsWith("/api/export-selected-zip")) return expSelectedZip(req, res);
    if (path.startsWith("/api/export-banner")) return expBanner(req, res);
    if (path.startsWith("/api/export-favicon")) return expFavicon(req, res);
    if (path.startsWith("/api/export")) return exp(path.slice("/api/export".length))(req, res);
    if (path === "/api/import") return imp(req, res);
    if (path === "/api/replace-capture") return repCapture(req, res);
    if (path === "/api/sync-captures") return syncCaptures(req, res);
    if (path === "/api/delete") return del(req, res);
    if (path === "/api/delete-all") return delAll(req, res);

    if (path.startsWith("/api/")) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Endpoint not found" }));
      return;
    }

    const sessionId = getSessionIdFromRequest(req);
    const sessionPaths = resolveWorkspacePaths(api, sessionId);

    if (path === "/store.json") {
      if (sessionId !== "default" && existsSync(join(sessionPaths.webDir, "store.json"))) {
        return sendFile(req, res, join(sessionPaths.webDir, "store.json"));
      }
      if (existsSync(join(api.paths.webDir, "store.json"))) {
        return sendFile(req, res, join(api.paths.webDir, "store.json"));
      }
      res.statusCode = 404;
      res.end("No out/web/store.json. Run: goldie manifest");
      return;
    }

    const file =
      (sessionId !== "default" ? fileIn(sessionPaths.webDir, path) : null) ??
      fileIn(api.paths.webDir, path) ??
      fileIn(STUDIO_DIST, path) ??
      fileIn(STUDIO_PUBLIC, path);
    if (file) return sendFile(req, res, file);

    const normalizedPath = path.replace(/\/+$/, "") || "/";
    const isKnownRoute = KNOWN_SPA_ROUTES.has(normalizedPath);

    const indexPath =
      (existsSync(join(STUDIO_DIST, "index.html")) ? join(STUDIO_DIST, "index.html") : null) ??
      (existsSync(STUDIO_INDEX_FALLBACK) ? STUDIO_INDEX_FALLBACK : null);

    if (isKnownRoute) {
      if (indexPath) {
        sendFile(req, res, indexPath);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><html><body><div id="root"></div></body></html>');
      return;
    }

    if (indexPath) {
      res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      createReadStream(indexPath).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end('<!doctype html><html><body><div id="root">Not Found</div></body></html>');
  };
}

/**
 * Serve the prebuilt studio plus the app's out/web at `/`, with the API on top.
 * Resolves with the URL once listening.
 */
export function serveStudio(
  api: StudioApi,
  port = Number(process.env.PORT) || 3000,
  host = process.env.HOST || "0.0.0.0",
): Promise<string> {
  if (!existsSync(join(STUDIO_DIST, "index.html"))) {
    throw new Error(
      `No studio build at ${STUDIO_DIST}. In a source checkout run: npm run studio:build`,
    );
  }
  const handler = createStudioRequestHandler(api);
  const server = createServer(handler);

  const workspacesDir = join(api.paths.configDir, "workspaces");
  pruneOldWorkspaces(workspacesDir).catch(() => {});
  const pruneInterval = setInterval(
    () => {
      pruneOldWorkspaces(workspacesDir).catch(() => {});
    },
    2 * 3600 * 1000,
  );
  if (typeof pruneInterval.unref === "function") pruneInterval.unref();

  return new Promise((done, fail) => {
    server.on("error", fail);
    server.listen(port, host, () =>
      done(`http://${host === "0.0.0.0" ? "localhost" : host}:${port}`),
    );
  });
}

/** Open a URL in the default browser; best effort. */
export async function openInBrowser(url: string): Promise<void> {
  const safeUrl = assertSafeHttpUrl(url);
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [safeUrl]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", '""', safeUrl]]
        : ["xdg-open", [safeUrl]];
  await exec(cmd, args, { quiet: true });
}
