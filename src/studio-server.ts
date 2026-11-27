import { spawn } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { BANNER_SPECS, type BannerType, renderBannerCanvas } from "./banner.ts";
import { applyDesign, loadConfig } from "./config.ts";
import { exec } from "./exec.ts";
import { resizePngBuffer } from "./image.ts";
import {
  assertSafeHttpUrl,
  assertSafeId,
  assertValidDeviceKey,
  assertValidLocale,
  escapeRegExp,
  resolveContainedPath,
  sanitizeDownloadFilename,
  sanitizeThemeColor,
  ValidationError,
} from "./security.ts";
import { DEVICES, type DeviceKey } from "./specs.ts";
import {
  createStoreGuideContent,
  storeZipPath,
  type ZipEntry,
  zipDirs,
  zipEntries,
} from "./zip.ts";

/**
 * The studio's HTTP surface, shared by `goldie studio` (a static server over
 * the prebuilt studio/dist) and the Vite dev server (studio/vite.config.ts).
 *
 * GET/PUT /api/design - the design choices saved next to the config as
 * goldie.design.json ({ background?, frame?, fontFamily?, copy?, order? }).
 * The CLI's loadConfig() applies the file, so a saved choice also shapes plain
 * `goldie frame` runs. The UI debounces its PUTs; the server writes the file
 * atomically so a half-written JSON never reaches the CLI.
 *
 * POST /api/export - renders the final assets from the raw captures with the
 * chosen background and frame (goldie frame + preview + manifest), zips
 * out/screenshots and out/previews, and streams the CLI log as plain text.
 * Body: { background?, frame?, font?, template?, layout?, screenOnly? };
 * per-scene layouts ride on goldie.design.json, which the CLI reads on its
 * own. The response ends with "[done]" on success or "[failed]" otherwise; on
 * "[done]" the UI downloads GET /api/export/download.
 */

export type StudioPaths = {
  configPath: string;
  configDir: string;
  outDir: string;
  webDir: string;
  designFile: string;
  exportZip: string;
};

/** Every path the studio touches derives from the config file's location. */
export function studioPaths(configPath: string): StudioPaths {
  const configDir = dirname(resolve(configPath));
  const outDir = join(configDir, "out");
  return {
    configPath: resolve(configPath),
    configDir,
    outDir,
    webDir: join(outDir, "web"),
    designFile: existsSync(join(configDir, "appassets.design.json"))
      ? join(configDir, "appassets.design.json")
      : existsSync(join(configDir, "goldie.design.json"))
        ? join(configDir, "goldie.design.json")
        : join(configDir, "appassets.design.json"), // mirrors designPath() in config.ts
    exportZip: join(outDir, "export.zip"),
  };
}

/**
 * Returns all active config files in the project root directory
 * (both appassets.config.ts and goldie.config.ts if present) to keep them synchronized.
 */
export function getConfigPaths(paths: StudioPaths): string[] {
  const files = new Set<string>();
  if (existsSync(paths.configPath)) files.add(paths.configPath);
  const appassetsCfg = join(paths.configDir, "appassets.config.ts");
  if (existsSync(appassetsCfg)) files.add(appassetsCfg);
  const goldieCfg = join(paths.configDir, "goldie.config.ts");
  if (existsSync(goldieCfg)) files.add(goldieCfg);
  return Array.from(files);
}

export type ExportTargets = {
  iphone?: boolean;
  ipad?: boolean;
  googlePlay?: boolean;
  marketing?: boolean;
  guidelines?: boolean;
};

export type ExportOptions = {
  background?: string;
  frame?: string;
  font?: string;
  template?: string;
  layout?: string;
  screenOnly?: boolean;
  fontSizeScale?: number;
  targets?: ExportTargets;
  selectedScenes?: string[];
};

export type StudioApi = {
  paths: StudioPaths;
  /** Command prefix that runs the goldie CLI, e.g. ["node", ".../dist/cli.js"]. */
  cli: string[];
};

/**
 * Extracts and sanitizes the user session identifier from the request:
 * 1. X-Session-ID header
 * 2. appassets_session_id cookie
 * 3. ?sessionId= query parameter
 * Returns "default" if absent or invalid.
 */
export function getSessionIdFromRequest(req?: IncomingMessage | null): string {
  if (!req) return "default";
  const headers = req.headers || {};

  // 1. Header
  const headerSid = headers["x-session-id"];
  if (typeof headerSid === "string" && headerSid.trim()) {
    const clean = headerSid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (clean) return clean;
  }

  // 2. Cookie
  const cookieHeader = headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|; )appassets_session_id=([^;]*)/);
    if (match?.[1]) {
      const clean = decodeURIComponent(match[1])
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64);
      if (clean) return clean;
    }
  }

  // 3. Query Param
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const querySid = url.searchParams.get("sessionId");
    if (querySid?.trim()) {
      const clean = querySid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
      if (clean) return clean;
    }
  } catch {}

  return "default";
}

/**
 * Resolves isolated paths for a specific user/guest session workspace.
 * If sessionId is "default", returns the shared base project paths.
 */
export function resolveWorkspacePaths(api: StudioApi, sessionId: string): StudioPaths {
  if (!sessionId || sessionId === "default") {
    return api.paths;
  }
  const workspaceDir = join(api.paths.configDir, "workspaces", sessionId);
  const outDir = join(workspaceDir, "out");
  return {
    configPath: join(workspaceDir, "appassets.config.ts"),
    configDir: workspaceDir,
    outDir,
    webDir: join(outDir, "web"),
    designFile: join(workspaceDir, "appassets.design.json"),
    exportZip: join(outDir, "export.zip"),
  };
}

/**
 * Ensures that a session's workspace has a valid config file and required assets.
 */
export async function ensureWorkspaceConfig(
  basePaths: StudioPaths,
  wsPaths: StudioPaths,
): Promise<void> {
  await mkdir(wsPaths.configDir, { recursive: true });
  await mkdir(wsPaths.outDir, { recursive: true });
  await mkdir(wsPaths.webDir, { recursive: true });

  if (!existsSync(wsPaths.configPath)) {
    if (existsSync(basePaths.configPath)) {
      let baseContent = await readFile(basePaths.configPath, "utf8");
      // Fix import path to point to the base src/config.ts
      const srcConfigAbs = resolve(basePaths.configDir, "src", "config.ts");
      baseContent = baseContent.replace(
        /import\s+type\s+\{([^}]+)\}\s+from\s+["']\.\/src\/config(?:\.ts)?["'];?/,
        `import type {$1} from ${JSON.stringify(srcConfigAbs)};`,
      );
      // Ensure workspace config starts with empty scenes
      const scenesIdx = baseContent.indexOf("scenes:");
      if (scenesIdx !== -1) {
        const openBracket = baseContent.indexOf("[", scenesIdx);
        if (openBracket !== -1) {
          let depth = 0;
          let closeBracket = -1;
          for (let i = openBracket; i < baseContent.length; i++) {
            if (baseContent[i] === "[") depth++;
            else if (baseContent[i] === "]") {
              depth--;
              if (depth === 0) {
                closeBracket = i;
                break;
              }
            }
          }
          if (closeBracket !== -1) {
            baseContent =
              baseContent.slice(0, openBracket + 1) + "\n  " + baseContent.slice(closeBracket);
          }
        }
      }
      await writeFile(wsPaths.configPath, baseContent);
    }
  }

  // Ensure assets folder is linked or copied
  const baseAssets = join(basePaths.configDir, "assets");
  const wsAssets = join(wsPaths.configDir, "assets");
  if (!existsSync(wsAssets) && existsSync(baseAssets)) {
    try {
      await symlink(baseAssets, wsAssets);
    } catch {
      await cp(baseAssets, wsAssets, { recursive: true });
    }
  }
}

/**
 * Prunes inactive guest workspaces older than maxGuestAgeMs (default 48h).
 */
export async function pruneOldWorkspaces(
  workspacesDir: string,
  maxGuestAgeMs = 48 * 3600 * 1000,
): Promise<void> {
  if (!existsSync(workspacesDir)) return;
  try {
    const entries = await readdir(workspacesDir, { withFileTypes: true });
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const wsPath = join(workspacesDir, entry.name);
      try {
        const stats = await stat(wsPath);
        const age = now - stats.mtimeMs;
        const isGuest = entry.name.startsWith("guest_");
        const maxAge = isGuest ? maxGuestAgeMs : 30 * 24 * 3600 * 1000;
        if (age > maxAge) {
          await rm(wsPath, { recursive: true, force: true });
        }
      } catch {}
    }
  } catch {}
}

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_DESIGN_BODY_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_BODY_BYTES = 60 * 1024 * 1024;

/** Error thrown when an incoming HTTP body exceeds its configured byte limit. */
export class PayloadTooLargeError extends Error {
  statusCode = 413;
  constructor(maxBytes: number) {
    const mb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    super(`Request payload too large (limit ${mb} MB).`);
    this.name = "PayloadTooLargeError";
  }
}

function sendRequestError(res: ServerResponse, err: unknown, asJson = true): void {
  if (res.headersSent || res.writableEnded) return;
  const status =
    err instanceof PayloadTooLargeError || err instanceof ValidationError ? err.statusCode : 500;
  const msg = err instanceof Error ? err.message : String(err);
  res.statusCode = status;
  if (asJson) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: msg }));
  } else {
    res.end(msg);
  }
}

export function readBody(req: IncomingMessage, maxBytes = MAX_JSON_BODY_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers?.["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      reject(new PayloadTooLargeError(maxBytes));
      return;
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    req.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        settled = true;
        chunks.length = 0;
        reject(new PayloadTooLargeError(maxBytes));
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      chunks.length = 0;
      reject(err);
    });
  });
}

/** Handles /api/health and /health for container liveness and uptime monitoring. */
export function healthHandler({ paths: _paths }: StudioApi): Handler {
  const startedAt = Date.now();
  return (_req, res) => {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "appassets-studio",
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString(),
      }),
    );
  };
}

/** Handles /api/design. */
export function designHandler(api: StudioApi): Handler {
  return (req, res) => {
    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);

    if (req.method === "GET") {
      readFile(paths.designFile, "utf8").then(
        (json) => {
          res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(json);
        },
        () => {
          if (sessionId === "default" && existsSync(api.paths.designFile)) {
            readFile(api.paths.designFile, "utf8").then(
              (json) => {
                res.writeHead(200, {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store",
                });
                res.end(json);
              },
              () => {
                res.writeHead(200, {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store",
                });
                res.end("{}");
              },
            );
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end("{}");
        },
      );
      return;
    }
    if (req.method !== "PUT") {
      res.statusCode = 405;
      res.end("GET or PUT only");
      return;
    }
    (async () => {
      let body: string;
      try {
        body = await readBody(req, MAX_DESIGN_BODY_BYTES);
      } catch (err) {
        sendRequestError(res, err, false);
        return;
      }
      let design: Record<string, unknown>;
      try {
        design = JSON.parse(body);
        if (!design || typeof design !== "object") throw new Error();
      } catch {
        res.statusCode = 400;
        res.end("Body must be a JSON object.");
        return;
      }
      try {
        await mkdir(paths.configDir, { recursive: true });
        const tmp = `${paths.designFile}.tmp`;
        await writeFile(tmp, `${JSON.stringify(design, null, 2)}\n`);
        await rename(tmp, paths.designFile);
        res.statusCode = 204;
        res.end();
      } catch (err) {
        res.statusCode = 500;
        res.end(`Failed to write ${paths.designFile}: ${err}`);
      }
    })();
  };
}

/**
 * Renders a pixel-perfect square PNG app icon at the target dimension (e.g. 512 for Google Play, 1024 for App Store).
 * Preserves aspect ratio, centers the icon mark, and applies optional background styling.
 */
export async function renderAppIconCanvas(
  iconSource: string | Buffer,
  size: number,
  options?: {
    scale?: number;
    bg?: string;
    offsetX?: number;
    offsetY?: number;
    cornerRadius?: number;
  },
): Promise<Buffer> {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Optional corner radius clipping
  const cornerRadius = options?.cornerRadius ?? 0;
  if (cornerRadius > 0) {
    const radiusPx = (cornerRadius / 100) * size;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radiusPx);
    ctx.clip();
  }

  // Optional background
  if (options?.bg && options.bg !== "transparent") {
    ctx.fillStyle = options.bg;
    ctx.fillRect(0, 0, size, size);
  }

  const img = await loadImage(iconSource);
  const scale = options?.scale ?? 1.0;
  const offsetX = options?.offsetX ?? 0;
  const offsetY = options?.offsetY ?? 0;

  // Center and maintain aspect ratio
  const imgAspect = img.width / img.height;
  let drawW = size * scale;
  let drawH = size * scale;
  if (imgAspect > 1) {
    drawH = drawW / imgAspect;
  } else if (imgAspect < 1) {
    drawW = drawH * imgAspect;
  }

  const drawX = (size - drawW) / 2 + (offsetX / 100) * drawW;
  const drawY = (size - drawH) / 2 + (offsetY / 100) * drawH;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  return canvas.toBuffer("image/png");
}

/** Handles /api/export and /api/export/download. `sub` is the path after /api/export. */
export function exportHandler(api: StudioApi): (sub: string) => Handler {
  const busySessions = new Set<string>();

  return (sub) => (req, res) => {
    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    if (req.method === "GET" && sub.startsWith("/download")) {
      if (!existsSync(paths.exportZip)) {
        res.statusCode = 404;
        res.end("No export yet. POST /api/export first.");
        return;
      }
      const url = new URL(req.url ?? "/", "http://localhost");
      const filename = url.searchParams.get("filename") || "AppAssets-store-package.zip";
      const safeFilename = filename.replace(/[^\w.-]/g, "_");
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Length": statSync(paths.exportZip).size,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      });
      createReadStream(paths.exportZip).pipe(res);
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }
    if (busySessions.has(sessionId)) {
      res.statusCode = 409;
      res.end("An export is already running.");
      return;
    }
    busySessions.add(sessionId);

    (async () => {
      let opts: ExportOptions;
      try {
        const body = await readBody(req, MAX_JSON_BODY_BYTES);
        try {
          opts = JSON.parse(body || "{}");
        } catch {
          busySessions.delete(sessionId);
          res.statusCode = 400;
          res.end("Body must be JSON.");
          return;
        }
      } catch (err) {
        busySessions.delete(sessionId);
        sendRequestError(res, err, false);
        return;
      }

      const flags: string[] = ["--config", paths.configPath];
      if (opts.background) flags.push("--background", opts.background);
      if (opts.frame) {
        const cleanFrame = opts.frame.replace(/^\/?frames\//, "").replace(/\.png$/, "");
        flags.push("--frame", cleanFrame);
      }
      if (opts.font) flags.push("--font", opts.font);
      if (opts.template) flags.push("--template", opts.template);
      if (opts.layout) flags.push("--layout", opts.layout);
      if (opts.screenOnly) flags.push("--screen-only");
      if (opts.fontSizeScale) flags.push("--font-size-scale", String(opts.fontSizeScale));

      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });

      const [bin, ...prefix] = cli;
      try {
        // 1. Frame all screenshots for configured devices & locales
        res.write("$ appassets frame\n");
        await stream(bin!, [...prefix, "frame", ...flags], paths.configDir, res, {
          APPASSETS_CONFIG: paths.configPath,
          GOLDIE_CONFIG: paths.configPath,
        });

        // 2. Render preview video if configured (gracefully skip if clips not present)
        try {
          res.write("$ appassets preview\n");
          await stream(bin!, [...prefix, "preview", ...flags], paths.configDir, res, {
            APPASSETS_CONFIG: paths.configPath,
            GOLDIE_CONFIG: paths.configPath,
          });
        } catch {
          res.write("  no preview clips found, skipping video preview\n");
        }

        // 3. Update manifest
        res.write("$ appassets manifest\n");
        await stream(bin!, [...prefix, "manifest", ...flags], paths.configDir, res, {
          APPASSETS_CONFIG: paths.configPath,
          GOLDIE_CONFIG: paths.configPath,
        });

        // 4. Build store ZIP package with guide, Google Play Feature Graphic, and Marketing Banners
        const targets = opts.targets || {};
        const includeIPhone = targets.iphone !== false;
        const includeIPad = targets.ipad !== false;
        const includeGooglePlay = targets.googlePlay !== false;
        const includeMarketing = targets.marketing !== false;
        const includeGuidelines = targets.guidelines !== false;

        res.write(
          `$ zip store package (selected: ${
            [
              includeIPhone ? "iPhone" : "",
              includeIPad ? "iPad" : "",
              includeGooglePlay ? "Google Play" : "",
              includeMarketing ? "Marketing" : "",
              includeGuidelines ? "Guidelines" : "",
            ]
              .filter(Boolean)
              .join(", ") || "none"
          })\n`,
        );
        await rm(paths.exportZip, { force: true });
        const extraEntries: ZipEntry[] = [];
        if (includeGuidelines) {
          extraEntries.push({
            name: "STORE_GUIDE.txt",
            data: Buffer.from(createStoreGuideContent(), "utf8"),
            mtime: new Date(),
          });
        }

        try {
          const cfg = await loadConfig(paths.configPath);
          let designJson: any = null;
          if (existsSync(paths.designFile)) {
            try {
              designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
              applyDesign(cfg, designJson);
            } catch {}
          }
          const resolvedAppName = designJson?.appInfo?.name || cfg.store?.name;
          const resolvedTagline =
            designJson?.appInfo?.subtitle ||
            (cfg.store?.subtitle &&
              (cfg.store.subtitle[cfg.locales[0] || "en-US"] ||
                Object.values(cfg.store.subtitle)[0]));
          const resolvedKicker = designJson?.appInfo?.category
            ? `${designJson.appInfo.category} App`.toUpperCase()
            : undefined;
          const resolvedIcon = designJson?.appInfo?.icon || cfg.store?.icon;

          for (const [bType, bSpec] of Object.entries(BANNER_SPECS)) {
            const isGooglePlayBanner = bSpec.storePath.startsWith("GooglePlay/");
            if (isGooglePlayBanner && !includeGooglePlay) continue;
            if (!isGooglePlayBanner && !includeMarketing) continue;

            try {
              const buf = await renderBannerCanvas({
                cfg,
                type: bType as BannerType,
                customTitle: resolvedAppName,
                appName: resolvedAppName,
                customTagline: resolvedTagline,
                kickerHeadline: resolvedKicker,
                customIcon: resolvedIcon,
              });
              extraEntries.push({
                name: bSpec.storePath,
                data: buf,
                mtime: new Date(),
              });
            } catch (err) {
              res.write(`  warning: failed to generate ${bSpec.label}: ${err}\n`);
            }
          }
        } catch (err) {
          res.write(`  warning: could not load config for banners: ${err}\n`);
        }

        // 4b. If an app icon exists, package 512x512 Google Play & 1024x1024 App Store icons
        const iconPath = existsSync(join(paths.webDir, "icon.png"))
          ? join(paths.webDir, "icon.png")
          : existsSync(join(paths.outDir, "icon.png"))
            ? join(paths.outDir, "icon.png")
            : null;

        if (iconPath) {
          try {
            const iconDesc: string[] = [];
            if (includeGooglePlay) {
              const icon512 = await renderAppIconCanvas(iconPath, 512);
              extraEntries.push({
                name: "GooglePlay/app-icon-512x512.png",
                data: icon512,
                mtime: new Date(),
              });
              iconDesc.push("GooglePlay 512x512");
            }
            if (includeIPhone || includeIPad) {
              const icon1024 = await renderAppIconCanvas(iconPath, 1024);
              extraEntries.push({
                name: "AppStore/app-icon-1024x1024.png",
                data: icon1024,
                mtime: new Date(),
              });
              iconDesc.push("AppStore 1024x1024");
            }
            if (iconDesc.length > 0) {
              res.write(`  app icons packaged (${iconDesc.join(" & ")})\n`);
            }
          } catch (err) {
            res.write(`  warning: could not package app icons: ${err}\n`);
          }
        }

        const filter = (relName: string) => {
          // Exclude iPhone-6.9 (1320x2868) from AppStore package since App Store Connect requires 6.3" (1206x2622)
          if (
            relName.startsWith("AppStore/iPhone-6.9/") ||
            relName.startsWith("AppStore/Previews/iPhone-6.9/")
          ) {
            return false;
          }
          if (!includeIPhone) {
            if (
              relName.startsWith("AppStore/iPhone") ||
              relName.startsWith("AppStore/Previews/iPhone")
            ) {
              return false;
            }
          }
          if (!includeIPad) {
            if (
              relName.startsWith("AppStore/iPad") ||
              relName.startsWith("AppStore/Previews/iPad")
            ) {
              return false;
            }
          }
          if (!includeGooglePlay) {
            if (
              relName.startsWith("GooglePlay/Phone") ||
              relName.startsWith("GooglePlay/PromoVideo")
            ) {
              return false;
            }
          }
          if (opts.selectedScenes && opts.selectedScenes.length > 0) {
            const fileName = relName.split("/").pop() || "";
            const isScreenshotOrPreview =
              relName.startsWith("AppStore/") || relName.startsWith("GooglePlay/Phone");
            if (isScreenshotOrPreview) {
              const matches = opts.selectedScenes.some((sId) => {
                return (
                  fileName === `${sId}.png` ||
                  fileName.startsWith(`${sId}.`) ||
                  fileName.includes(`-${sId}.`) ||
                  fileName.includes(`-${sId}-`)
                );
              });
              if (!matches) return false;
            }
          }
          return true;
        };

        // 4c. Generate AppStore/iPhone-6.3 (1206x2622) package entries alongside iPhone-6.9 (1320x2868)
        if (includeIPhone) {
          const iphone69Dir = join(paths.outDir, "screenshots", "iphone-6.9");
          if (existsSync(iphone69Dir)) {
            try {
              const locales = await readdir(iphone69Dir);
              for (const loc of locales) {
                const locDir = join(iphone69Dir, loc);
                if (!existsSync(locDir)) continue;
                const locStat = await stat(locDir);
                if (!locStat.isDirectory()) continue;

                const shotFiles = (await readdir(locDir)).filter((f) => f.endsWith(".png"));
                for (const sf of shotFiles) {
                  if (opts.selectedScenes && opts.selectedScenes.length > 0) {
                    const matches = opts.selectedScenes.some((sId) => {
                      return (
                        sf === `${sId}.png` ||
                        sf.startsWith(`${sId}.`) ||
                        sf.includes(`-${sId}.`) ||
                        sf.includes(`-${sId}-`)
                      );
                    });
                    if (!matches) continue;
                  }

                  try {
                    const origBuf = await readFile(join(locDir, sf));
                    const scaled63 = await resizePngBuffer(origBuf, 1206, 2622);
                    extraEntries.push({
                      name: `AppStore/iPhone-6.3/${loc}/${sf}`,
                      data: scaled63,
                      mtime: new Date(),
                    });
                  } catch (err) {
                    res.write(`  warning: failed to generate 6.3" screenshot ${sf}: ${err}\n`);
                  }
                }
              }
            } catch {}
          }
        }

        const count = await zipDirs(
          paths.outDir,
          ["screenshots", "previews"],
          paths.exportZip,
          storeZipPath,
          extraEntries,
          filter,
        );
        res.write(`  ${count} files packaged into store layout\n`);
        res.write("[done]\n");
      } catch (err) {
        res.write(`[failed] ${err instanceof Error ? err.message : err}\n`);
      } finally {
        busySessions.delete(sessionId);
        res.end();
      }
    })();
  };
}

/**
 * Reads PNG dimensions directly from buffer without disk I/O.
 */
export function getDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } | null {
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return null;
}

/**
 * Auto-resolution routing based on capture image dimensions.
 * Routes to:
 * - "ipad-13": aspect ratio ~ 3:4 = 0.75 (e.g. 2064x2752, 2048x2732)
 * - "pixel-10-pro": 1280x2856, 1080x1920, 1080x2400, or aspect ratio ~0.56 / ~0.448
 * - "iphone-6.9": 1320x2868, 1290x2796, 1179x2556, or aspect ratio ~0.46
 */
export function resolveDeviceFromDimensions(
  width: number,
  height: number,
  preferredDevice?: string,
): DeviceKey {
  if (width <= 0 || height <= 0) {
    if (preferredDevice === "ipad-13" || preferredDevice === "pixel-10-pro") {
      return preferredDevice;
    }
    return "iphone-6.9";
  }

  // Normalize orientation to portrait (width <= height)
  const portraitWidth = Math.min(width, height);
  const portraitHeight = Math.max(width, height);
  const aspect = portraitWidth / portraitHeight;

  // 1. iPad: aspect ratio ~ 3:4 = 0.75 (e.g. 2064/2752 = 0.75, 2048/2732 = 0.7496)
  if (aspect >= 0.7 && aspect <= 0.82) {
    return "ipad-13";
  }

  // If a mobile phone preferred device is specified and the aspect ratio is a phone (aspect < 0.65),
  // honor user's preferred device (e.g. using Android screenshots on iPhone or vice versa).
  if (preferredDevice === "iphone-6.9" || preferredDevice === "pixel-10-pro") {
    if (aspect < 0.65) {
      return preferredDevice;
    }
  }

  // 2. Android (Pixel 10 Pro / 9 Pro):
  // Screen sizes: 1280x2856 (aspect 0.448), 1080x2400 (aspect 0.45), 1080x1920 (aspect 0.5625)
  if (
    (portraitWidth === 1280 && portraitHeight === 2856) ||
    (portraitWidth === 1080 && (portraitHeight === 1920 || portraitHeight === 2400)) ||
    (aspect >= 0.53 && aspect <= 0.6)
  ) {
    return "pixel-10-pro";
  }

  // 3. iPhone:
  // 1320x2868 (aspect 0.4602), 1290x2796 (aspect 0.4613), 1179x2556 (aspect 0.4612), etc.
  if (
    (portraitWidth === 1320 && portraitHeight === 2868) ||
    (portraitWidth === 1290 && portraitHeight === 2796) ||
    (portraitWidth === 1179 && portraitHeight === 2556) ||
    (aspect >= 0.44 && aspect <= 0.49)
  ) {
    if (preferredDevice === "pixel-10-pro" && aspect <= 0.455) {
      return "pixel-10-pro";
    }
    return "iphone-6.9";
  }

  // 4. Fallback to preferred device if recognized, otherwise iphone-6.9
  if (preferredDevice === "ipad-13" || preferredDevice === "pixel-10-pro") {
    return preferredDevice;
  }
  return "iphone-6.9";
}

/** Handles POST /api/replace-capture for replacing a single screenshot capture. */
export function replaceCaptureHandler(api: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    readBody(req, MAX_MEDIA_BODY_BYTES).then(
      async (body) => {
        try {
          if (sessionId !== "default") {
            await ensureWorkspaceConfig(api.paths, paths);
          }
          const {
            sceneId,
            device: preferredDevice,
            autoRoute,
            targetMode,
            file,
          } = JSON.parse(body) as {
            sceneId: string;
            device?: string;
            autoRoute?: boolean;
            targetMode?: "current" | "single" | "all";
            file: { name: string; dataUrl: string; width?: number; height?: number };
          };

          if (!sceneId || !file?.dataUrl) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "sceneId and file with dataUrl are required" }));
            return;
          }

          const safeSceneId = assertSafeId(sceneId, "sceneId");
          const validatedPreferredDevice = preferredDevice
            ? assertValidDeviceKey(preferredDevice)
            : undefined;

          const base64Data = file.dataUrl.includes(";base64,")
            ? file.dataUrl.split(";base64,")[1]!
            : file.dataUrl.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");

          const bufDim = getDimensionsFromBuffer(buffer);
          const width = file.width ?? bufDim?.width ?? 0;
          const height = file.height ?? bufDim?.height ?? 0;

          let targetDevices: DeviceKey[];
          if (targetMode === "single" || targetMode === "current") {
            let singleDev: DeviceKey;
            if (autoRoute || !validatedPreferredDevice) {
              singleDev = resolveDeviceFromDimensions(width, height, validatedPreferredDevice);
            } else {
              singleDev = validatedPreferredDevice;
            }
            targetDevices = [singleDev];
          } else {
            // Default: apply to all configured devices (iphone-6.9, ipad-13, pixel-10-pro)
            targetDevices = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
          }

          const [bin, ...prefix] = cli;

          for (const targetDev of targetDevices) {
            const rawDir = resolveContainedPath(paths.outDir, ["raw", targetDev]);
            if (!rawDir) {
              throw new ValidationError(`Invalid device path: ${targetDev}`);
            }
            await mkdir(rawDir, { recursive: true });

            const targetFile = resolveContainedPath(rawDir, [`${safeSceneId}.png`]);
            if (!targetFile) {
              throw new ValidationError("Invalid sceneId path");
            }
            await writeFile(targetFile, buffer);

            // Update raw/<targetDev>/manifest.json
            const manifestPath = join(rawDir, "manifest.json");
            let existingManifest: { screenshots: Array<{ sceneId: string; file: string }> } = {
              screenshots: [],
            };
            if (existsSync(manifestPath)) {
              try {
                existingManifest = JSON.parse(await readFile(manifestPath, "utf8"));
              } catch {}
            }

            const screenshotMap = new Map(
              existingManifest.screenshots.map((s) => [s.sceneId, s.file]),
            );
            screenshotMap.set(safeSceneId, targetFile);

            const updatedManifest = {
              device: targetDev,
              udid: "manual",
              capturedAt: new Date().toISOString(),
              screenshots: Array.from(screenshotMap.entries()).map(([sId, fPath]) => ({
                sceneId: sId,
                file: fPath,
              })),
              preview: null,
            };
            await writeFile(manifestPath, JSON.stringify(updatedManifest, null, 2));

            // Re-frame the screenshot for this device
            try {
              await exec(
                bin!,
                [...prefix, "frame", "--config", paths.configPath, "--device", targetDev],
                { quiet: true },
              );
            } catch (frameErr) {
              console.error(`Frame failed after capture replace for ${targetDev}:`, frameErr);
            }
          }

          const manifestRes = await exec(
            bin!,
            [...prefix, "manifest", "--config", paths.configPath],
            { quiet: true },
          );
          if (manifestRes.code !== 0) {
            console.error(
              "Manifest command failed after replace-capture:",
              manifestRes.stderr || manifestRes.stdout,
            );
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: true,
              device: targetDevices[0],
              devices: targetDevices,
              sceneId: safeSceneId,
            }),
          );
        } catch (err) {
          sendRequestError(res, err, true);
        }
      },
      (err) => sendRequestError(res, err, true),
    );
  };
}

/** Handles POST /api/sync-captures to synchronize captures from a source device (e.g. iphone-6.9) across other devices (pixel-10-pro, ipad-13). */
export function syncCapturesHandler(api: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    readBody(req, MAX_JSON_BODY_BYTES).then(
      async (body) => {
        try {
          if (sessionId !== "default") {
            await ensureWorkspaceConfig(api.paths, paths);
          }

        let parsed: { sourceDevice?: string; targetDevices?: string[] } = {};
        if (body) {
          try {
            parsed = JSON.parse(body);
          } catch {}
        }
        const sourceDevice = parsed.sourceDevice
          ? assertValidDeviceKey(parsed.sourceDevice)
          : "iphone-6.9";
        const allSupported: DeviceKey[] = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
        const resolvedTargets: DeviceKey[] =
          parsed.targetDevices &&
          Array.isArray(parsed.targetDevices) &&
          parsed.targetDevices.length > 0
            ? parsed.targetDevices.map((d) => assertValidDeviceKey(d))
            : allSupported.filter((d) => d !== sourceDevice);

        const sourceRawDir = resolveContainedPath(paths.outDir, ["raw", sourceDevice]);
        if (!sourceRawDir || !existsSync(sourceRawDir)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: `Source device ${sourceDevice} has no raw captures directory`,
            }),
          );
          return;
        }

        const sourceManifestPath = join(sourceRawDir, "manifest.json");
        let sourceManifest: { screenshots: Array<{ sceneId: string; file: string }> } = {
          screenshots: [],
        };
        if (existsSync(sourceManifestPath)) {
          try {
            sourceManifest = JSON.parse(await readFile(sourceManifestPath, "utf8"));
          } catch {}
        }

        if (sourceManifest.screenshots.length === 0) {
          try {
            const rawFiles = await readdir(sourceRawDir);
            for (const rf of rawFiles) {
              if (rf.endsWith(".png")) {
                const sId = rf.slice(0, -4);
                sourceManifest.screenshots.push({
                  sceneId: sId,
                  file: join(sourceRawDir, rf),
                });
              }
            }
          } catch {}
        }

        if (sourceManifest.screenshots.length === 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `No captures found on ${sourceDevice} to sync` }));
          return;
        }

        const [bin, ...prefix] = cli;
        let syncedCount = 0;

        for (const targetDev of resolvedTargets) {
          const targetRawDir = join(paths.outDir, "raw", targetDev);
          await mkdir(targetRawDir, { recursive: true });

          const targetManifestPath = join(targetRawDir, "manifest.json");
          let targetManifest: { screenshots: Array<{ sceneId: string; file: string }> } = {
            screenshots: [],
          };
          if (existsSync(targetManifestPath)) {
            try {
              targetManifest = JSON.parse(await readFile(targetManifestPath, "utf8"));
            } catch {}
          }

          const targetMap = new Map(targetManifest.screenshots.map((s) => [s.sceneId, s.file]));

          for (const s of sourceManifest.screenshots) {
            let safeItemSceneId: string;
            try {
              safeItemSceneId = assertSafeId(s.sceneId, "sceneId");
            } catch {
              continue;
            }
            const candidateFromManifest =
              typeof s.file === "string"
                ? resolveContainedPath(sourceRawDir, [basename(s.file)])
                : null;
            const sourceFilePath =
              candidateFromManifest && existsSync(candidateFromManifest)
                ? candidateFromManifest
                : null;

            if (sourceFilePath) {
              const targetFilePath = resolveContainedPath(targetRawDir, [`${safeItemSceneId}.png`]);
              if (!targetFilePath) continue;
              await cp(sourceFilePath, targetFilePath, { force: true });
              targetMap.set(safeItemSceneId, targetFilePath);
              syncedCount++;
            }
          }

          const updatedTargetManifest = {
            device: targetDev,
            udid: "manual",
            capturedAt: new Date().toISOString(),
            screenshots: Array.from(targetMap.entries()).map(([sId, fPath]) => ({
              sceneId: sId,
              file: fPath,
            })),
            preview: null,
          };
          await writeFile(targetManifestPath, JSON.stringify(updatedTargetManifest, null, 2));

          try {
            await exec(
              bin!,
              [...prefix, "frame", "--config", paths.configPath, "--device", targetDev],
              { quiet: true },
            );
          } catch (frameErr) {
            console.error(`Frame failed for ${targetDev} during sync:`, frameErr);
          }
        }

        const manifestRes = await exec(
          bin!,
          [...prefix, "manifest", "--config", paths.configPath],
          { quiet: true },
        );
        if (manifestRes.code !== 0) {
          console.error(
            "Manifest command failed after sync-captures:",
            manifestRes.stderr || manifestRes.stdout,
          );
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: true,
            syncedCount,
            sourceDevice,
            targetDevices: resolvedTargets,
          }),
        );
      } catch (err) {
        sendRequestError(res, err, true);
      }
    }, (err) => sendRequestError(res, err, true));
  };
}

/**
 * Assigns clean, collision-free scene IDs to incoming files, ensuring they never
 * collide with or overwrite existing scenes from prior imports or other scenes in the batch.
 */
export function assignUniqueSceneIds<T extends { name: string }>(
  files: T[],
  existingSceneIds: Set<string>,
): Array<{ f: T; id: string; label: string }> {
  const assignments: Array<{ f: T; id: string; label: string }> = [];
  const allocatedIds = new Set(existingSceneIds);

  for (const f of files) {
    const rawName = f.name.replace(/\.[^.]+$/, "");
    let baseId = rawName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    baseId = baseId.replace(/^_+|_+$/g, "");
    if (!baseId) {
      baseId = "screenshot";
    }

    const label =
      rawName
        .replace(/[_-]/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || `Screenshot ${allocatedIds.size + 1}`;

    let candidateId = baseId;
    let counter = 2;
    const numMatch = baseId.match(/^(.*?)_(\d+)$/);
    let prefix = baseId;
    if (numMatch) {
      prefix = numMatch[1]!;
      counter = Number.parseInt(numMatch[2]!, 10) + 1;
    }

    while (allocatedIds.has(candidateId)) {
      candidateId = `${prefix}_${counter}`;
      counter++;
    }

    allocatedIds.add(candidateId);
    assignments.push({ f, id: candidateId, label });
  }

  return assignments;
}

/**
 * Appends new scene definitions to the end of the scenes array in the config file,
 * preserving existing scene order and indentation.
 */
export function appendScenesToConfig(
  configContent: string,
  scenesToAdd: Array<{ id: string; label: string }>,
): string {
  if (!scenesToAdd || scenesToAdd.length === 0) return configContent;

  const scenesIdx = configContent.indexOf("scenes:");
  if (scenesIdx === -1) return configContent;

  const openBracket = configContent.indexOf("[", scenesIdx);
  if (openBracket === -1) return configContent;

  // Find matching closing bracket for scenes array
  let depth = 0;
  let closeBracket = -1;
  for (let i = openBracket; i < configContent.length; i++) {
    if (configContent[i] === "[") depth++;
    else if (configContent[i] === "]") {
      depth--;
      if (depth === 0) {
        closeBracket = i;
        break;
      }
    }
  }

  if (closeBracket === -1) return configContent;

  // Filter scenes that are not already present in the config
  const scenesToInsert = scenesToAdd.filter(
    (s) => !configContent.includes(`id: "${s.id}"`) && !configContent.includes(`id: '${s.id}'`),
  );

  if (scenesToInsert.length === 0) return configContent;

  const blocks = scenesToInsert
    .map(
      (s) =>
        `    {\n      kind: "screenshot",\n      id: ${JSON.stringify(s.id)},\n      flow: ${JSON.stringify(`store-${s.id}`)},\n      headline: { "en-US": ${JSON.stringify(s.label)} },\n      subhead: { "en-US": "Describe your key benefit here." },\n    },`,
    )
    .join("\n");

  const scenesInside = configContent.slice(openBracket + 1, closeBracket);
  const isEmpty = scenesInside.trim().length === 0;

  if (isEmpty) {
    return `${configContent.slice(0, openBracket + 1)}\n${blocks}\n  ${configContent.slice(closeBracket)}`;
  }

  const beforeClose = configContent.slice(0, closeBracket);
  const trimmedBefore = beforeClose.trimEnd();
  const needsComma = !trimmedBefore.endsWith(",") && !trimmedBefore.endsWith("[");

  return `${trimmedBefore}${needsComma ? "," : ""}\n${blocks}\n  ${configContent.slice(closeBracket).trimStart()}`;
}

/** Handles POST /api/import for uploading screenshots directly from Studio UI. */
export function importHandler(api: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    readBody(req, MAX_MEDIA_BODY_BYTES).then(
      async (body) => {
        try {
          if (sessionId !== "default") {
            await ensureWorkspaceConfig(api.paths, paths);
          }
        const { files, autoRoute, preferredDevice, targetMode } = JSON.parse(body) as {
          files: Array<{ name: string; dataUrl: string; width?: number; height?: number }>;
          autoRoute?: boolean;
          preferredDevice?: string;
          targetMode?: "current" | "single" | "auto" | "all";
        };
        if (!Array.isArray(files) || files.length === 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No files provided" }));
          return;
        }

        const allDevices: DeviceKey[] = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
        const validatedPreferredDevice = preferredDevice
          ? assertValidDeviceKey(preferredDevice)
          : undefined;

        const filesByDevice = new Map<DeviceKey, typeof files>();
        if ((targetMode === "single" || targetMode === "current") && validatedPreferredDevice) {
          filesByDevice.set(validatedPreferredDevice, files);
        } else if (autoRoute) {
          for (const f of files) {
            const base64Data = f.dataUrl.includes(";base64,")
              ? f.dataUrl.split(";base64,")[1]!
              : f.dataUrl.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const bufDim = getDimensionsFromBuffer(buffer);
            const w = f.width ?? bufDim?.width ?? 0;
            const h = f.height ?? bufDim?.height ?? 0;
            const dev = resolveDeviceFromDimensions(w, h, validatedPreferredDevice);
            const list = filesByDevice.get(dev) ?? [];
            list.push(f);
            filesByDevice.set(dev, list);
          }
        } else {
          // Default: apply to all configured devices (iphone-6.9, ipad-13, pixel-10-pro)
          for (const dev of allDevices) {
            filesByDevice.set(dev, files);
          }
        }

        // 1. Collect all existing scene IDs across manifests, configs, and design overrides
        const existingSceneIds = new Set<string>();

        // From raw directories across devices
        const rawBaseDir = join(paths.outDir, "raw");
        if (existsSync(rawBaseDir)) {
          try {
            const devEntries = await readdir(rawBaseDir);
            for (const devEntry of devEntries) {
              const devRawDir = join(rawBaseDir, devEntry);
              const mPath = join(devRawDir, "manifest.json");
              if (existsSync(mPath)) {
                try {
                  const m = JSON.parse(await readFile(mPath, "utf8"));
                  if (Array.isArray(m.screenshots)) {
                    for (const s of m.screenshots) {
                      if (s.sceneId) existingSceneIds.add(String(s.sceneId));
                    }
                  }
                } catch {}
              }
              try {
                const rawFiles = await readdir(devRawDir);
                for (const rf of rawFiles) {
                  if (rf.endsWith(".png")) {
                    const rawId = rf.slice(0, -4);
                    if (rawId) existingSceneIds.add(rawId);
                  }
                }
              } catch {}
            }
          } catch {}
        }

        // From all config files
        const configFiles = getConfigPaths(paths);
        for (const cfgPath of configFiles) {
          if (existsSync(cfgPath)) {
            try {
              const content = await readFile(cfgPath, "utf8");
              const idMatches = content.matchAll(/id:\s*["']([^"']+)["']/g);
              for (const m of idMatches) {
                if (m[1]) existingSceneIds.add(m[1]);
              }
            } catch {}
          }
        }

        // From design file
        if (existsSync(paths.designFile)) {
          try {
            const designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
            if (Array.isArray(designJson.order)) {
              for (const id of designJson.order) {
                if (typeof id === "string" && id) existingSceneIds.add(id);
              }
            }
          } catch {}
        }

        const fileSceneAssignments = assignUniqueSceneIds(files, existingSceneIds);
        const assignmentMap = new Map<(typeof files)[0], { id: string; label: string }>();
        for (const a of fileSceneAssignments) {
          assignmentMap.set(a.f, { id: a.id, label: a.label });
        }

        const newScenes: Array<{ id: string; label: string }> = [];

        for (const [dev, devFiles] of filesByDevice.entries()) {
          const rawDir = join(paths.outDir, "raw", dev);
          await mkdir(rawDir, { recursive: true });

          const manifestPath = join(rawDir, "manifest.json");
          let existingManifest: {
            screenshots: Array<{ sceneId: string; file: string }>;
            preview?: any;
          } = {
            screenshots: [],
          };
          if (existsSync(manifestPath)) {
            try {
              existingManifest = JSON.parse(await readFile(manifestPath, "utf8"));
            } catch {}
          }

          const screenshotMap = new Map(
            existingManifest.screenshots.map((s) => [s.sceneId, s.file]),
          );

          for (const f of devFiles) {
            const assignment = assignmentMap.get(f) ?? {
              id: `screenshot_${Date.now()}`,
              label: "Screenshot",
            };
            const { id, label } = assignment;

            const base64Data = f.dataUrl.includes(";base64,")
              ? f.dataUrl.split(";base64,")[1]!
              : f.dataUrl.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const targetFile = join(rawDir, `${id}.png`);
            await writeFile(targetFile, buffer);

            screenshotMap.set(id, targetFile);
            if (!newScenes.some((s) => s.id === id)) {
              newScenes.push({ id, label });
            }
          }

          const updatedManifest = {
            device: dev,
            udid: "manual",
            capturedAt: new Date().toISOString(),
            screenshots: Array.from(screenshotMap.entries()).map(([sceneId, file]) => ({
              sceneId,
              file,
            })),
            preview: existingManifest.preview ?? null,
          };
          await writeFile(manifestPath, JSON.stringify(updatedManifest, null, 2));
        }

        // Auto-register missing scenes in all config files (appassets.config.ts and/or goldie.config.ts)
        for (const cfgPath of configFiles) {
          if (existsSync(cfgPath)) {
            const configContent = await readFile(cfgPath, "utf8");
            const updatedConfig = appendScenesToConfig(configContent, newScenes);
            if (updatedConfig !== configContent) {
              await writeFile(cfgPath, updatedConfig);
            }
          }
        }

        // If design file has an order array, append newly added scene IDs so design order is preserved
        if (existsSync(paths.designFile)) {
          try {
            const designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
            if (Array.isArray(designJson.order)) {
              let orderChanged = false;
              for (const s of newScenes) {
                if (!designJson.order.includes(s.id)) {
                  designJson.order.push(s.id);
                  orderChanged = true;
                }
              }
              if (orderChanged) {
                await writeFile(paths.designFile, JSON.stringify(designJson, null, 2));
              }
            }
          } catch {}
        }

        // Rebuild store.json via manifest command
        const [bin, ...prefix] = cli;
        const manifestRes = await exec(
          bin!,
          [...prefix, "manifest", "--config", paths.configPath],
          { quiet: true },
        );
        if (manifestRes.code !== 0) {
          console.error(
            "Manifest command failed during import:",
            manifestRes.stderr || manifestRes.stdout,
          );
          throw new Error(
            `Manifest generation failed: ${manifestRes.stderr || manifestRes.stdout || `Exit code ${manifestRes.code}`}`,
          );
        }

        const targetDevices = Array.from(filesByDevice.keys());
        const primaryDevice =
          preferredDevice && targetDevices.includes(preferredDevice as DeviceKey)
            ? preferredDevice
            : targetDevices[0] || "iphone-6.9";
        const targetPlatform = DEVICES[primaryDevice as DeviceKey]?.platform ?? "ios";

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: true,
            imported: files.length,
            devices: targetDevices,
            targetDevice: primaryDevice,
            targetPlatform,
          }),
        );
      } catch (err) {
        console.error("Import error in importHandler:", err);
        sendRequestError(res, err, true);
      }
    }, (err) => sendRequestError(res, err, true));
  };
}

/** Handles /api/icon for uploading, retrieving, and resetting app icon/logo. */
export function iconHandler(api: StudioApi): Handler {
  return (req, res) => {
    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);

    if (req.method === "GET") {
      (async () => {
        let iconUrl: string | null = null;
        if (existsSync(paths.designFile)) {
          try {
            const design = JSON.parse(await readFile(paths.designFile, "utf8"));
            if (design?.appIcon) iconUrl = design.appIcon;
          } catch {}
        }
        if (!iconUrl) {
          const webIcon = join(paths.webDir, "icon.png");
          const outIcon = join(paths.outDir, "icon.png");
          if (existsSync(webIcon) || existsSync(outIcon)) {
            iconUrl = "/icon.png";
          }
        }
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ iconUrl }));
      })();
      return;
    }

    if (req.method === "POST") {
      readBody(req, MAX_MEDIA_BODY_BYTES).then(
        async (body) => {
          try {
            const { dataUrl } = JSON.parse(body) as { dataUrl: string };
            if (!dataUrl) {
              res.statusCode = 400;
              res.end("dataUrl required");
              return;
            }

            const base64Data = dataUrl.includes(";base64,")
              ? dataUrl.split(";base64,")[1]!
              : dataUrl.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");

            await mkdir(paths.webDir, { recursive: true });
            await mkdir(paths.outDir, { recursive: true });

            await writeFile(join(paths.webDir, "icon.png"), buffer);
            await writeFile(join(paths.outDir, "icon.png"), buffer);

            // Persist in goldie.design.json
            let design: Record<string, any> = {};
            if (existsSync(paths.designFile)) {
              try {
                design = JSON.parse(await readFile(paths.designFile, "utf8"));
              } catch {}
            }
            design.appIcon = "/icon.png";
            if (design.appInfo && typeof design.appInfo === "object") {
              design.appInfo.icon = "/icon.png";
            }
            const tmp = `${paths.designFile}.tmp`;
            await writeFile(tmp, `${JSON.stringify(design, null, 2)}\n`);
            await rename(tmp, paths.designFile);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, iconUrl: "/icon.png" }));
          } catch (err) {
            sendRequestError(res, err, false);
          }
        },
        (err) => sendRequestError(res, err, false),
      );
      return;
    }

    if (req.method === "DELETE") {
      (async () => {
        try {
          const webIcon = join(paths.webDir, "icon.png");
          const outIcon = join(paths.outDir, "icon.png");
          if (existsSync(webIcon)) await rm(webIcon, { force: true });
          if (existsSync(outIcon)) await rm(outIcon, { force: true });

          if (existsSync(paths.designFile)) {
            try {
              const design = JSON.parse(await readFile(paths.designFile, "utf8"));
              delete design.appIcon;
              if (design.appInfo && typeof design.appInfo === "object") {
                delete design.appInfo.icon;
              }
              const tmp = `${paths.designFile}.tmp`;
              await writeFile(tmp, `${JSON.stringify(design, null, 2)}\n`);
              await rename(tmp, paths.designFile);
            } catch {}
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, iconUrl: null }));
        } catch (err) {
          res.statusCode = 500;
          res.end(err instanceof Error ? err.message : String(err));
        }
      })();
      return;
    }

    res.statusCode = 405;
    res.end("GET, POST, or DELETE only");
  };
}

function removeSceneFromConfig(configContent: string, sceneId: string): string {
  const idPattern = new RegExp(`id:\\s*["']${escapeRegExp(sceneId)}["']`);
  const match = idPattern.exec(configContent);
  if (!match) return configContent;

  const idIndex = match.index;
  let startIndex = -1;
  let depth = 0;
  for (let i = idIndex; i >= 0; i--) {
    if (configContent[i] === "}") depth++;
    else if (configContent[i] === "{") {
      if (depth === 0) {
        startIndex = i;
        break;
      }
      depth--;
    }
  }
  if (startIndex === -1) return configContent;

  depth = 0;
  let endIndex = -1;
  for (let i = startIndex; i < configContent.length; i++) {
    if (configContent[i] === "{") depth++;
    else if (configContent[i] === "}") {
      depth--;
      if (depth === 0) {
        let after = i + 1;
        while (
          after < configContent.length &&
          (configContent[after] === " " || configContent[after] === "\t")
        )
          after++;
        if (after < configContent.length && configContent[after] === ",") after++;
        while (
          after < configContent.length &&
          (configContent[after] === " " || configContent[after] === "\t")
        )
          after++;
        if (after < configContent.length && configContent[after] === "\n") after++;
        endIndex = after;
        break;
      }
    }
  }
  if (endIndex === -1) return configContent;
  let lineStart = startIndex;
  while (
    lineStart > 0 &&
    (configContent[lineStart - 1] === " " || configContent[lineStart - 1] === "\t")
  ) {
    lineStart--;
  }
  return configContent.slice(0, lineStart) + configContent.slice(endIndex);
}

/** Handles POST /api/delete for removing a screenshot scene. */
export function deleteHandler(api: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    readBody(req, MAX_JSON_BODY_BYTES).then(
      async (body) => {
        try {
          const { sceneId } = JSON.parse(body) as { sceneId?: string };
        if (!sceneId || typeof sceneId !== "string") {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No sceneId provided" }));
          return;
        }
        const safeSceneId = assertSafeId(sceneId, "sceneId");

        const devices: DeviceKey[] = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
        for (const dev of devices) {
          const rawDir = join(paths.outDir, "raw", dev);
          const rawFile = resolveContainedPath(rawDir, [`${safeSceneId}.png`]);
          if (rawFile) {
            await rm(rawFile, { force: true });
          }

          const manifestPath = join(rawDir, "manifest.json");
          if (existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
              if (Array.isArray(manifest.screenshots)) {
                manifest.screenshots = manifest.screenshots.filter(
                  (s: { sceneId: string }) => s.sceneId !== sceneId,
                );
                await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
              }
            } catch {}
          }
        }

        // Remove from all existing config files (appassets.config.ts and/or goldie.config.ts)
        const configFiles = getConfigPaths(paths);
        for (const cfgPath of configFiles) {
          const configContent = await readFile(cfgPath, "utf8");
          const updatedConfig = removeSceneFromConfig(configContent, sceneId);
          if (updatedConfig !== configContent) {
            await writeFile(cfgPath, updatedConfig);
          }
        }

        // Clean up from goldie.design.json if present
        if (existsSync(paths.designFile)) {
          try {
            const designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
            if (Array.isArray(designJson.order)) {
              designJson.order = designJson.order.filter((id: string) => id !== sceneId);
            }
            if (designJson.copy?.[sceneId]) {
              delete designJson.copy[sceneId];
            }
            if (designJson.sceneLayouts?.[sceneId]) {
              delete designJson.sceneLayouts[sceneId];
            }
            await writeFile(paths.designFile, JSON.stringify(designJson, null, 2));
          } catch {}
        }

        // Rebuild store.json via manifest command
        const [bin, ...prefix] = cli;
        const manifestRes = await exec(
          bin!,
          [...prefix, "manifest", "--config", paths.configPath],
          { quiet: true },
        );
        if (manifestRes.code !== 0) {
          console.error(
            "Manifest failed in deleteHandler:",
            manifestRes.stderr || manifestRes.stdout,
          );
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, deleted: sceneId }));
      } catch (err) {
        sendRequestError(res, err, true);
      }
    }, (err) => sendRequestError(res, err, true));
  };
}

/** Handles POST /api/delete-all for removing all screenshots at once. */
export function deleteAllHandler(api: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    (async () => {
      try {
        if (sessionId !== "default" && existsSync(paths.configDir)) {
          await rm(paths.configDir, { recursive: true, force: true });
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, cleared: true }));
          return;
        }
        const devices = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
        for (const dev of devices) {
          const rawDir = join(paths.outDir, "raw", dev);
          if (existsSync(rawDir)) {
            const files = await readdir(rawDir);
            for (const f of files) {
              if (
                f.endsWith(".png") ||
                f.endsWith(".jpg") ||
                f.endsWith(".jpeg") ||
                f.endsWith(".webp")
              ) {
                await rm(join(rawDir, f), { force: true });
              }
            }

            const manifestPath = join(rawDir, "manifest.json");
            const manifest = {
              device: dev,
              udid: "manual",
              capturedAt: new Date().toISOString(),
              screenshots: [],
              preview: null,
            };
            await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
          }
        }

        // Empty scenes in all config files (appassets.config.ts and/or goldie.config.ts)
        const configFiles = getConfigPaths(paths);

        for (const cfgFile of configFiles) {
          if (existsSync(cfgFile)) {
            let configContent = await readFile(cfgFile, "utf8");
            const scenesIdx = configContent.indexOf("scenes:");
            if (scenesIdx !== -1) {
              const openBracket = configContent.indexOf("[", scenesIdx);
              if (openBracket !== -1) {
                let depth = 0;
                let closeBracket = -1;
                for (let i = openBracket; i < configContent.length; i++) {
                  if (configContent[i] === "[") depth++;
                  else if (configContent[i] === "]") {
                    depth--;
                    if (depth === 0) {
                      closeBracket = i;
                      break;
                    }
                  }
                }
                if (closeBracket !== -1) {
                  configContent =
                    configContent.slice(0, openBracket + 1) +
                    "\n  " +
                    configContent.slice(closeBracket);
                  await writeFile(cfgFile, configContent);
                }
              }
            }
          }
        }

        // Clean goldie.design.json and app identity
        if (existsSync(paths.designFile)) {
          try {
            const designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
            designJson.order = [];
            designJson.copy = {};
            designJson.sceneLayouts = {};
            designJson.sceneBackgrounds = {};
            designJson.sceneBadges = {};
            delete designJson.appInfo;
            delete designJson.appIcon;
            await writeFile(paths.designFile, JSON.stringify(designJson, null, 2));
          } catch {}
        }

        const webIcon = join(paths.webDir, "icon.png");
        const outIcon = join(paths.outDir, "icon.png");
        if (existsSync(webIcon)) await rm(webIcon, { force: true });
        if (existsSync(outIcon)) await rm(outIcon, { force: true });

        // Rebuild store.json via manifest command
        const [bin, ...prefix] = cli;
        const manifestRes = await exec(
          bin!,
          [...prefix, "manifest", "--config", paths.configPath],
          { quiet: true },
        );
        if (manifestRes.code !== 0) {
          console.error(
            "Manifest failed in deleteAllHandler:",
            manifestRes.stderr || manifestRes.stdout,
          );
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, cleared: true }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    })();
  };
}

function stream(
  cmd: string,
  args: string[],
  cwd: string,
  res: ServerResponse,
  env: Record<string, string> = {},
): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });
    child.stdout.on("data", (d) => res.write(d));
    child.stderr.on("data", (d) => res.write(d));
    child.on("error", fail);
    child.on("close", (code) => (code === 0 ? done() : fail(new Error(`exit code ${code}`))));
  });
}

export const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

/** Serve `file` with Range support, so the preview video seeks in the browser. */
function sendFile(req: IncomingMessage, res: ServerResponse, file: string, cacheControl?: string) {
  const size = statSync(file).size;
  const type = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  const isHashedAsset = req.url?.includes("/assets/");
  const cc = cacheControl ?? (isHashedAsset ? "public, max-age=31536000, immutable" : "no-store");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "Cache-Control": cc,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": size,
    "Accept-Ranges": "bytes",
    "Cache-Control": cc,
  });
  createReadStream(file).pipe(res);
}

/** Resolve a URL path inside `root`, or null when it escapes or is missing. */
function fileIn(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const rel = normalize(decoded).replace(/^[/\\]+/, "");
  if (!rel || rel === ".") return null;
  const file = resolveContainedPath(root, [rel]);
  if (!file) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

/**
 * Finds the screenshot file matching a given scene and optional slice index (e.g. 1 or 2 for a panorama).
 */
export function findScreenshotFile(
  files: string[],
  sceneId: string,
  slice?: number,
): string | null {
  const escapedId = escapeRegExp(sceneId);
  if (slice !== undefined && !Number.isNaN(slice)) {
    // Slices are 1-indexed in file names (e.g. 02-home-1.png, 03-home-2.png); normalize 0 to 1
    const targetSlice = slice === 0 ? 1 : slice;
    const slicePattern = new RegExp(`(?:^|\\d+-)${escapedId}-${targetSlice}\\.png$`);
    const found = files.find((f) => slicePattern.test(f));
    if (found) return found;
  }

  // If no slice was requested (or slice 1), prefer slice 1 if multi-slice exists
  const slice1Pattern = new RegExp(`(?:^|\\d+-)${escapedId}-1\\.png$`);
  const foundSlice1 = files.find((f) => slice1Pattern.test(f));
  if (foundSlice1 && (slice === undefined || slice === 1 || slice === 0)) return foundSlice1;

  // Single-tile pattern (e.g. 01-home.png)
  const singlePattern = new RegExp(`(?:^|\\d+-)${escapedId}\\.png$`);
  const foundSingle = files.find((f) => singlePattern.test(f));
  if (foundSingle) return foundSingle;

  // Fallback looser match
  return (
    files.find(
      (f) =>
        f.endsWith(".png") &&
        (f.includes(`-${sceneId}.png`) ||
          f.includes(`-${sceneId}-`) ||
          f.startsWith(`${sceneId}.`)),
    ) ?? null
  );
}

/** Handles GET /api/export-single?sceneId=...&device=...&size=...&locale=...&slice=... for downloading a single screenshot. */
export function singleExportHandler(api: StudioApi): Handler {
  return (req, res) => {
    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    const url = new URL(req.url ?? "/", "http://localhost");
    const rawSceneId = url.searchParams.get("sceneId");
    const rawDevice = url.searchParams.get("device") || "iphone-6.9";
    const sizeParam = url.searchParams.get("size");
    const rawLocale = url.searchParams.get("locale") || "en-US";
    const sliceParam = url.searchParams.get("slice");
    const sliceNum = sliceParam !== null ? parseInt(sliceParam, 10) : undefined;

    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const background = url.searchParams.get("background");
    const frame = url.searchParams.get("frame");
    const font = url.searchParams.get("font");
    const template = url.searchParams.get("template");
    const layout = url.searchParams.get("layout");
    const screenOnly = url.searchParams.get("screenOnly") === "true";
    const fontSizeScale = url.searchParams.get("fontSizeScale");

    if (!rawSceneId) {
      res.statusCode = 400;
      res.end("sceneId query param required");
      return;
    }

    let sceneId: string;
    let device: DeviceKey;
    let locale: string;
    try {
      sceneId = assertSafeId(rawSceneId, "sceneId");
      device = assertValidDeviceKey(rawDevice, { allowIphoneAliases: true });
      locale = assertValidLocale(rawLocale);
    } catch (err) {
      sendRequestError(res, err, false);
      return;
    }

    const isIphone = device === "iphone-6.9" || sizeParam === "1206x2622";
    const isIphone63 = isIphone && sizeParam !== "1320x2868";

    (async () => {
      try {
        const screenshotsDir = resolveContainedPath(paths.outDir, ["screenshots", device, locale]);
        if (!screenshotsDir) {
          throw new ValidationError("Invalid export path");
        }
        let targetFile: string | null = null;

        if (existsSync(screenshotsDir)) {
          const files = await readdir(screenshotsDir);
          const matched = findScreenshotFile(files, sceneId, sliceNum);
          if (matched) targetFile = join(screenshotsDir, matched);
        }

        const designExists = existsSync(paths.designFile);
        const isStale =
          !targetFile ||
          !existsSync(targetFile) ||
          (designExists && statSync(paths.designFile).mtimeMs > statSync(targetFile).mtimeMs);

        // If file not found, stale, or explicitly forced, run frame
        if (force || isStale) {
          const flags: string[] = [];
          if (background) flags.push("--background", background);
          if (frame) {
            const cleanFrame = frame.replace(/^\/?frames\//, "").replace(/\.png$/, "");
            flags.push("--frame", cleanFrame);
          }
          if (font) flags.push("--font", font);
          if (template && template !== "none") flags.push("--template", template);
          if (layout) flags.push("--layout", layout);
          if (screenOnly) flags.push("--screen-only");
          if (fontSizeScale) flags.push("--font-size-scale", fontSizeScale);

          const [bin, ...prefix] = cli;
          const execRes = await exec(
            bin!,
            [
              ...prefix,
              "frame",
              "--config",
              paths.configPath,
              "--device",
              device,
              "--locale",
              locale,
              ...flags,
            ],
            { quiet: true },
          );
          if (execRes.code !== 0) {
            res.statusCode = 500;
            res.end(
              `Frame rendering failed: ${execRes.stderr || execRes.stdout || `exit code ${execRes.code}`}`,
            );
            return;
          }
          if (existsSync(screenshotsDir)) {
            const files = await readdir(screenshotsDir);
            const matched = findScreenshotFile(files, sceneId, sliceNum);
            if (matched) targetFile = join(screenshotsDir, matched);
          }
        }

        if (!targetFile || !existsSync(targetFile)) {
          const sliceMsg = sliceNum ? ` (slice ${sliceNum})` : "";
          res.statusCode = 404;
          res.end(`Screenshot for scene "${sceneId}"${sliceMsg} not found`);
          return;
        }

        const targetSlice =
          sliceNum !== undefined && !Number.isNaN(sliceNum)
            ? sliceNum === 0
              ? 1
              : sliceNum
            : undefined;
        const sliceSuffix = targetSlice && targetSlice > 1 ? `-${targetSlice}` : "";

        if (isIphone63) {
          const rawBuf = await readFile(targetFile);
          const scaledBuf = await resizePngBuffer(rawBuf, 1206, 2622);
          const dlName = sanitizeDownloadFilename(
            `${sceneId}${sliceSuffix}-iphone-6.3-1206x2622.png`,
            "screenshot-iphone-6.3.png",
          );
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": scaledBuf.length,
            "Content-Disposition": `attachment; filename="${dlName}"`,
            "Cache-Control": "no-store",
          });
          res.end(scaledBuf);
          return;
        }

        const stat = statSync(targetFile);
        const dlName = sanitizeDownloadFilename(
          `${sceneId}${sliceSuffix}-${device}.png`,
          "screenshot.png",
        );
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": stat.size,
          "Content-Disposition": `attachment; filename="${dlName}"`,
          "Cache-Control": "no-store",
        });
        createReadStream(targetFile).pipe(res);
      } catch (err) {
        res.statusCode = 500;
        res.end(err instanceof Error ? err.message : String(err));
      }
    })();
  };
}

/** Handles POST /api/export-selected-zip for packaging selected screenshots into a single ZIP archive */
export function selectedExportZipHandler(api: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    readBody(req, MAX_JSON_BODY_BYTES).then(
      async (rawBody) => {
        try {
          const body = JSON.parse(rawBody || "{}");
        const rawDevice = body.device || "iphone-6.9";
        const device = assertValidDeviceKey(rawDevice, { allowIphoneAliases: true });
        const isIphone = device === "iphone-6.9" || body.size === "1206x2622";
        const isIphone63 = isIphone && body.size !== "1320x2868";
        const locale = assertValidLocale(body.locale || "en-US");
        const rawItems: Array<{ sceneId: string; slice?: number }> = Array.isArray(body.items)
          ? body.items
          : [];

        if (rawItems.length === 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "items array cannot be empty" }));
          return;
        }

        const items = rawItems.map((item) => ({
          sceneId: assertSafeId(item?.sceneId, "sceneId"),
          slice: item?.slice,
        }));

        const flags: string[] = [];
        if (body.background) flags.push("--background", body.background);
        if (body.frame) {
          const cleanFrame = body.frame.replace(/^\/?frames\//, "").replace(/\.png$/, "");
          flags.push("--frame", cleanFrame);
        }
        if (body.font) flags.push("--font", body.font);
        if (body.template && body.template !== "none") flags.push("--template", body.template);
        if (body.layout) flags.push("--layout", body.layout);
        if (body.screenOnly) flags.push("--screen-only");
        if (body.fontSizeScale) flags.push("--font-size-scale", String(body.fontSizeScale));

        const [bin, ...prefix] = cli;
        const execRes = await exec(
          bin!,
          [
            ...prefix,
            "frame",
            "--config",
            paths.configPath,
            "--device",
            device,
            "--locale",
            locale,
            ...flags,
          ],
          { quiet: true },
        );
        if (execRes.code !== 0) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: `Frame rendering failed: ${execRes.stderr || execRes.stdout || `exit code ${execRes.code}`}`,
            }),
          );
          return;
        }

        const screenshotsDir = resolveContainedPath(paths.outDir, ["screenshots", device, locale]);
        if (!screenshotsDir || !existsSync(screenshotsDir)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No screenshots found for this device" }));
          return;
        }

        const files = await readdir(screenshotsDir);
        const zipList: ZipEntry[] = [];

        for (const item of items) {
          const matched = findScreenshotFile(files, item.sceneId, item.slice);
          if (matched) {
            const filePath = join(screenshotsDir, matched);
            if (existsSync(filePath)) {
              let data: Buffer = await readFile(filePath);
              let entryName = matched;
              if (isIphone63) {
                data = Buffer.from(await resizePngBuffer(data, 1206, 2622));
                entryName = matched.replace(/\.png$/, "-1206x2622.png");
              }
              zipList.push({
                name: entryName,
                data,
                mtime: new Date(),
              });
            }
          }
        }

        if (zipList.length === 0) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "None of the selected screenshots were found" }));
          return;
        }

        const zipFileName = sanitizeDownloadFilename(
          isIphone63
            ? "selected-screenshots-iphone-6.3-1206x2622.zip"
            : `selected-screenshots-${device}.zip`,
          "selected-screenshots.zip",
        );
        const zipBuffer = zipEntries(zipList);
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Length": zipBuffer.length,
          "Content-Disposition": `attachment; filename="${zipFileName}"`,
          "Cache-Control": "no-store",
        });
        res.end(zipBuffer);
      } catch (err) {
        sendRequestError(res, err, true);
      }
    }, (err) => sendRequestError(res, err, true));
  };
}

/** Handles GET /api/export-banner?type=...&sceneId=...&locale=... for downloading individual marketing/store banners */
export function bannerExportHandler(api: StudioApi): Handler {
  return (req, res) => {
    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);

    (async () => {
      try {
        let body: Record<string, any> = {};
        if (req.method === "POST") {
          const raw = await readBody(req, MAX_JSON_BODY_BYTES);
          try {
            body = raw ? JSON.parse(raw) : {};
          } catch {}
        }

        const url = new URL(req.url ?? "/", "http://localhost");
        const type = (body.type || url.searchParams.get("type") || "google-play") as BannerType;
        const sceneId = body.sceneId || url.searchParams.get("sceneId") || undefined;
        const secondarySceneId = body.sceneId2 || url.searchParams.get("sceneId2") || undefined;
        const tertiarySceneId = body.sceneId3 || url.searchParams.get("sceneId3") || undefined;
        const locale = body.locale || url.searchParams.get("locale") || undefined;
        const deviceKey = (body.device ||
          body.deviceKey ||
          url.searchParams.get("device") ||
          undefined) as DeviceKey | undefined;
        const deviceCount = (body.deviceCount ||
          url.searchParams.get("deviceCount") ||
          undefined) as "single" | "duo" | "trio" | undefined;
        const kickerHeadline = body.kicker || url.searchParams.get("kicker") || undefined;
        const customHeadline = body.headline || url.searchParams.get("headline") || undefined;
        const customTagline = body.tagline || url.searchParams.get("tagline") || undefined;
        const customTitle =
          body.title ||
          body.appName ||
          body.customTitle ||
          url.searchParams.get("title") ||
          url.searchParams.get("appName") ||
          url.searchParams.get("customTitle") ||
          undefined;

        let benefits: string[] | undefined = Array.isArray(body.benefits)
          ? body.benefits
          : undefined;
        if (!benefits) {
          const benefitsParam = url.searchParams.get("benefits");
          if (benefitsParam) {
            try {
              benefits = JSON.parse(benefitsParam);
            } catch {
              benefits = benefitsParam
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            }
          }
        }

        const customBackground = body.background || url.searchParams.get("background") || undefined;
        const customIcon = body.customIcon || url.searchParams.get("customIcon") || undefined;
        const layout = (body.layout || url.searchParams.get("layout") || "split") as
          | "split"
          | "center";
        const mockupStyle = (body.mockupStyle || url.searchParams.get("mockupStyle") || "card") as
          | "card"
          | "screen";

        const scale = Number(body.scale || url.searchParams.get("scale") || 1) as 1 | 2;
        const retina =
          body.retina === true || url.searchParams.get("retina") === "true" || scale === 2;

        const spec = BANNER_SPECS[type];
        if (!spec) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Unknown banner type: ${type}` }));
          return;
        }

        const cfg = await loadConfig(paths.configPath);
        let designJson: any = null;
        if (existsSync(paths.designFile)) {
          try {
            designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
            applyDesign(cfg, designJson);
          } catch {}
        }

        const resolvedTitle =
          customTitle || designJson?.appInfo?.name || cfg.store?.name || undefined;

        const resolvedTagline = customTagline || designJson?.appInfo?.subtitle || undefined;

        const resolvedKicker =
          kickerHeadline ||
          (designJson?.appInfo?.category
            ? `${designJson.appInfo.category} App`.toUpperCase()
            : undefined);

        const resolvedIcon = customIcon || designJson?.appInfo?.icon || undefined;

        const buffer = await renderBannerCanvas({
          cfg,
          type,
          sceneId,
          secondarySceneId,
          tertiarySceneId,
          deviceKey,
          deviceCount,
          locale,
          customTitle: resolvedTitle,
          appName: resolvedTitle,
          kickerHeadline: resolvedKicker,
          customHeadline,
          customTagline: resolvedTagline,
          customIcon: resolvedIcon,
          benefits,
          customBackground,
          layout,
          mockupStyle,
          scale: retina ? 2 : 1,
          retina,
        });

        const outW = retina ? spec.width * 2 : spec.width;
        const outH = retina ? spec.height * 2 : spec.height;
        const filename = `${type}-${outW}x${outH}${retina ? "@2x" : ""}.png`;
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": buffer.length,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        });
        res.end(buffer);
      } catch (err) {
        sendRequestError(res, err, true);
      }
    })();
  };
}

/**
 * Handles /api/export-favicon.
 * Generates an end-to-end favicon and web app kit ZIP containing:
 * - favicon.ico (32x32)
 * - favicon-16x16.png
 * - favicon-32x32.png
 * - apple-touch-icon.png (180x180 with squircle clipping)
 * - android-chrome-192x192.png (192x192)
 * - android-chrome-512x512.png (512x512)
 * - site.webmanifest
 * - html-snippet.html (copy-pasteable HTML <head> snippet)
 * - README.md
 */
export function faviconExportHandler(api: StudioApi): Handler {
  return (req, res) => {
    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);

    (async () => {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        let appName = url.searchParams.get("appName") || "App";
        let iconSource: string | Buffer | null = null;
        let themeColor = url.searchParams.get("themeColor") || "#007aff";
        let customDataUrl: string | null = null;

        if (req.method === "POST") {
          const body = await readBody(req, MAX_MEDIA_BODY_BYTES);
          try {
            const parsed = JSON.parse(body || "{}");
            if (parsed.appName) appName = parsed.appName;
            if (parsed.themeColor) themeColor = parsed.themeColor;
            if (parsed.iconDataUrl) customDataUrl = parsed.iconDataUrl;
          } catch {
            // ignore
          }
        }

        if (customDataUrl?.startsWith("data:image/")) {
          const base64Data = customDataUrl.includes(";base64,")
            ? customDataUrl.split(";base64,")[1]!
            : customDataUrl.replace(/^data:[^;]+;base64,/, "");
          iconSource = Buffer.from(base64Data, "base64");
        } else {
          // Resolve from existing project icons
          const candidates = [
            join(paths.webDir, "icon.png"),
            join(paths.outDir, "icon.png"),
            join(paths.configDir, "icon.png"),
            join(paths.configDir, "assets", "icon.png"),
          ];
          for (const cand of candidates) {
            if (existsSync(cand)) {
              iconSource = cand;
              break;
            }
          }
        }

        if (!iconSource) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No app icon found. Please upload an icon first." }));
          return;
        }

        const safeName = sanitizeDownloadFilename(appName.trim(), "app");
        themeColor = sanitizeThemeColor(themeColor);

        // Generate icon resolutions
        const icon16 = await renderAppIconCanvas(iconSource, 16);
        const icon32 = await renderAppIconCanvas(iconSource, 32);
        const icon180 = await renderAppIconCanvas(iconSource, 180, { cornerRadius: 22.5 });
        const icon192 = await renderAppIconCanvas(iconSource, 192, { cornerRadius: 20 });
        const icon512 = await renderAppIconCanvas(iconSource, 512, { cornerRadius: 20 });

        // Manifest JSON
        const manifestContent = JSON.stringify(
          {
            name: appName,
            short_name: appName,
            icons: [
              { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
              { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
            ],
            theme_color: themeColor,
            background_color: "#ffffff",
            display: "standalone",
          },
          null,
          2,
        );

        // HTML Header Snippet
        const htmlSnippet = `<!-- Favicon & Web App Manifest generated by Goldie / AppAssets -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${themeColor}">
`;

        const readme = `# Favicon & Web App Kit for ${appName}

Generated by Goldie / AppAssets.

## Files Included:
- \`favicon.ico\` (32×32)
- \`favicon-16x16.png\` & \`favicon-32x32.png\` (Standard browser tab icons)
- \`apple-touch-icon.png\` (180×180 iOS Home Screen bookmark icon)
- \`android-chrome-192x192.png\` & \`android-chrome-512x512.png\` (PWA / Android install icons)
- \`site.webmanifest\` (PWA manifest)
- \`html-snippet.html\` (HTML <head> code to copy-paste)

## Quick Setup:
Copy the files into your web root (e.g. \`public/\` in Next.js, Vite, or Astro) and paste the code from \`html-snippet.html\` into your HTML \`<head>\`.
`;

        const entries: ZipEntry[] = [
          { name: "favicon-16x16.png", data: icon16, mtime: new Date() },
          { name: "favicon-32x32.png", data: icon32, mtime: new Date() },
          { name: "favicon.ico", data: icon32, mtime: new Date() },
          { name: "apple-touch-icon.png", data: icon180, mtime: new Date() },
          { name: "android-chrome-192x192.png", data: icon192, mtime: new Date() },
          { name: "android-chrome-512x512.png", data: icon512, mtime: new Date() },
          {
            name: "site.webmanifest",
            data: Buffer.from(manifestContent, "utf8"),
            mtime: new Date(),
          },
          { name: "html-snippet.html", data: Buffer.from(htmlSnippet, "utf8"), mtime: new Date() },
          { name: "README.md", data: Buffer.from(readme, "utf8"), mtime: new Date() },
        ];

        const zipBuffer = zipEntries(entries);

        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Length": zipBuffer.length,
          "Content-Disposition": `attachment; filename="${safeName}-favicon-web-kit.zip"`,
          "Cache-Control": "no-store",
        });
        res.end(zipBuffer);
      } catch (err) {
        sendRequestError(res, err, true);
      }
    })();
  };
}

/** Finds and loads GEMINI_API_KEY from process.env or .env file in config dir, workspace root, or cwd */
export function getGeminiApiKey(paths?: StudioPaths): string | undefined {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }

  const envCandidates: string[] = [];
  if (paths?.configPath) {
    envCandidates.push(join(dirname(paths.configPath), ".env"));
  }
  envCandidates.push(
    join(process.cwd(), ".env"),
    join(process.cwd(), "..", ".env"),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env"),
  );

  for (const envPath of envCandidates) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, "utf8");
        const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n#]+)["']?/m);
        if (match?.[1]?.trim()) {
          const key = match[1].trim();
          process.env.GEMINI_API_KEY = key;
          return key;
        }
      } catch {}
    }
  }
  return undefined;
}

/** Downsamples screenshot to max ~640px JPEG to drastically reduce upload payload size and latency */
export async function optimizeScreenshotForAi(
  imageBuffer: Buffer,
  maxDimension = 640,
): Promise<{ base64: string; mimeType: string }> {
  try {
    const img = await loadImage(imageBuffer);
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const jpegBuffer = canvas.toBuffer("image/jpeg", 75);
    return {
      base64: jpegBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  } catch {
    // Fallback to raw buffer if canvas downsampling fails
    return {
      base64: imageBuffer.toString("base64"),
      mimeType: "image/png",
    };
  }
}

/** Configuration for in-memory rate limiting */
export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

/**
 * Lightweight, memory-safe in-memory rate limiter with periodic cleanup.
 * Prevents API exhaustion and abuse without requiring external Redis/database.
 */
export class MemoryRateLimiter {
  private records = new Map<string, { count: number; resetTime: number }>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  public config: RateLimitConfig;

  constructor(
    config: RateLimitConfig = {
      windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
      maxRequests: Number(process.env.AI_RATE_LIMIT_MAX) || 10,
    },
  ) {
    this.config = config;
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  public check(key: string): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const existing = this.records.get(key);

    if (!existing || now >= existing.resetTime) {
      const resetTime = now + this.config.windowMs;
      this.records.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - 1),
        resetTime,
        retryAfterSeconds: 0,
      };
    }

    if (existing.count < this.config.maxRequests) {
      existing.count += 1;
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - existing.count),
        resetTime: existing.resetTime,
        retryAfterSeconds: 0,
      };
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
    return {
      allowed: false,
      limit: this.config.maxRequests,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfterSeconds,
    };
  }

  public reset(key?: string): void {
    if (key) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [k, v] of this.records.entries()) {
      if (now >= v.resetTime) {
        this.records.delete(k);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.records.clear();
  }
}

/** Global in-memory rate limiter instance for AI endpoints */
export const aiRateLimiter = new MemoryRateLimiter();

/** Resolves client IP address across reverse proxies (Cloudflare, Nginx, Vercel, Railway, etc.) */
export function getClientIp(req: IncomingMessage): string {
  const headers = req.headers || {};
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const cfIp = headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) {
    return cfIp.trim();
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || "127.0.0.1";
}

/** Handles POST /api/ai/generate-copy for visual screenshot analysis and ASO copy generation with Gemini Vision. */
export function aiCopyHandler(api: StudioApi, rateLimiter = aiRateLimiter): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const clientIp = getClientIp(req);
    const rateCheck = rateLimiter.check(clientIp);

    res.setHeader("X-RateLimit-Limit", String(rateCheck.limit));
    res.setHeader("X-RateLimit-Remaining", String(rateCheck.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(rateCheck.resetTime / 1000)));

    if (!rateCheck.allowed) {
      res.statusCode = 429;
      res.setHeader("Retry-After", String(rateCheck.retryAfterSeconds));
      res.setHeader("Content-Type", "application/json");
      const waitMinutes = Math.ceil(rateCheck.retryAfterSeconds / 60);
      res.end(
        JSON.stringify({
          error: `Rate limit reached (${rateCheck.limit} generations per ${Math.round(rateLimiter.config.windowMs / 60000)} minutes). Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before trying again.`,
          retryAfter: rateCheck.retryAfterSeconds,
          limit: rateCheck.limit,
          remaining: 0,
          resetTime: rateCheck.resetTime,
        }),
      );
      return;
    }

    readBody(req, MAX_MEDIA_BODY_BYTES).then(
      async (body) => {
        try {
          const sessionId = getSessionIdFromRequest(req);
          const sessionPaths = resolveWorkspacePaths(api, sessionId);

          const {
            sceneId,
            device = "iphone-6.9",
            locale = "en-US",
            tone,
            customPrompt,
            appContext,
            imageBase64: directImageBase64,
          } = JSON.parse(body || "{}") as {
          sceneId?: string;
          device?: string;
          locale?: string;
          tone?: string;
          customPrompt?: string;
          appContext?: {
            name?: string;
            category?: string;
            description?: string;
          };
          imageBase64?: string;
        };

        if (!sceneId) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "sceneId is required" }));
          return;
        }

        if (customPrompt && customPrompt.length > 300) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "customPrompt exceeds maximum allowed length of 300 characters",
            }),
          );
          return;
        }

        const apiKey = getGeminiApiKey(sessionPaths) || getGeminiApiKey(api.paths);
        if (!apiKey) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                "GEMINI_API_KEY is not configured. Please ensure GEMINI_API_KEY=your_key is in the .env file.",
            }),
          );
          return;
        }

        let imageBase64: string = "";
        let mimeType: string = "image/jpeg";

        if (directImageBase64) {
          const rawBase64 = directImageBase64.replace(/^data:image\/[a-z0-9]+;base64,/, "");
          const buf = Buffer.from(rawBase64, "base64");
          const optimized = await optimizeScreenshotForAi(buf, 640);
          imageBase64 = optimized.base64;
          mimeType = optimized.mimeType;
        } else {
          // Clean candidate names (handle #slice, trailing -1, etc.)
          const cleanSceneId = sceneId.split("#")[0];
          const cleanBaseSceneId = cleanSceneId.replace(/-\d+$/, "");
          const candidateNames = Array.from(
            new Set([sceneId, cleanSceneId, cleanBaseSceneId].filter(Boolean)),
          );

          const devicesToTry = Array.from(
            new Set([device, "iphone-6.9", "pixel-10-pro", "ipad-13"].filter(Boolean)),
          );

          const outDirsToTry = Array.from(
            new Set(
              [sessionPaths.outDir, sessionPaths.webDir, api.paths.outDir, api.paths.webDir].filter(
                Boolean,
              ),
            ),
          );

          let screenshotPath: string | null = null;

          for (const outDir of outDirsToTry) {
            // 1. Direct match in raw folder
            for (const dev of devicesToTry) {
              for (const name of candidateNames) {
                for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
                  const p = join(outDir, "raw", dev, `${name}${ext}`);
                  if (existsSync(p)) {
                    screenshotPath = p;
                    break;
                  }
                }
                if (screenshotPath) break;
              }
              if (screenshotPath) break;
            }
            if (screenshotPath) break;

            // 2. Try screenshots folder for each device
            for (const dev of devicesToTry) {
              const screenshotsDir = join(outDir, "screenshots", dev, locale);
              if (existsSync(screenshotsDir)) {
                const files = await readdir(screenshotsDir);
                for (const name of candidateNames) {
                  const matched = findScreenshotFile(files, name);
                  if (matched) {
                    screenshotPath = join(screenshotsDir, matched);
                    break;
                  }
                }
              }
              if (screenshotPath) break;
            }
            if (screenshotPath) break;

            // 3. Loose fallback in raw folder
            for (const dev of devicesToTry) {
              const rawDir = join(outDir, "raw", dev);
              if (existsSync(rawDir)) {
                const files = await readdir(rawDir);
                for (const name of candidateNames) {
                  const matched = files.find(
                    (f) =>
                      f.toLowerCase().includes(name.toLowerCase()) &&
                      (f.endsWith(".png") ||
                        f.endsWith(".jpg") ||
                        f.endsWith(".jpeg") ||
                        f.endsWith(".webp")),
                  );
                  if (matched) {
                    screenshotPath = join(rawDir, matched);
                    break;
                  }
                }
              }
              if (screenshotPath) break;
            }
            if (screenshotPath) break;

            // 4. Loose fallback directly in outDir/webDir
            if (existsSync(outDir)) {
              try {
                const files = await readdir(outDir);
                for (const name of candidateNames) {
                  const matched = files.find(
                    (f) =>
                      f.toLowerCase().includes(name.toLowerCase()) &&
                      (f.endsWith(".png") ||
                        f.endsWith(".jpg") ||
                        f.endsWith(".jpeg") ||
                        f.endsWith(".webp")),
                  );
                  if (matched) {
                    screenshotPath = join(outDir, matched);
                    break;
                  }
                }
              } catch {}
            }
            if (screenshotPath) break;
          }

          if (!screenshotPath || !existsSync(screenshotPath)) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: `Screenshot file for scene "${sceneId}" not found in out/raw or out/screenshots.`,
              }),
            );
            return;
          }

          const imageBuffer = await readFile(screenshotPath);
          const optimized = await optimizeScreenshotForAi(imageBuffer, 640);
          imageBase64 = optimized.base64;
          mimeType = optimized.mimeType;
        }

        // Build concise, token-efficient ASO prompt
        const appName = appContext?.name ? `App: "${appContext.name}"` : "";
        const appCat = appContext?.category ? `Category: ${appContext.category}` : "";
        const appDesc = appContext?.description
          ? `Summary: ${appContext.description.slice(0, 160)}`
          : "";
        const customGuide = customPrompt ? `Direction: "${customPrompt}"` : "";
        const toneInstruction =
          tone && tone !== "all"
            ? `Target Tone: ${tone}. Return 3 options in this style.`
            : "Provide 3 options with diverse marketing angles (Punchy, Benefit-Driven, Action-Oriented).";

        const contextInfo = [appName, appCat, appDesc, customGuide, toneInstruction]
          .filter(Boolean)
          .join(" | ");

        const promptText = `Analyze this mobile UI screenshot as an elite App Store copywriter.
Target Language/Locale: ${locale}
Reference App Context (may be fallback or generic): ${contextInfo || "None"}

CRITICAL RULES:
1. PRIMARY FOCUS: Inspect the visible UI in this screenshot first. Identify the actual app name, domain (e.g. VPN, Privacy & Security, Utility, Finance, Social, Health), features, status, buttons, and metrics shown on screen.
2. If the screenshot clearly depicts a different app than the reference context, ALWAYS base your copy 100% on what is visually shown in the screenshot. Do NOT force copy about an unrelated app or category.
3. Headline: punchy, compelling marketing copy under 30 characters highlighting this screen's core benefit.
4. Subhead: clear, benefit-driven explanation under 80 characters.
5. Return exactly 3 options in valid JSON:
{
  "screenAnalysis": "1-sentence summary of visible UI",
  "suggestions": [
    {
      "tone": "Punchy" | "Benefit-Driven" | "Action-Oriented" | "Minimalist",
      "headline": "...",
      "subhead": "..."
    }
  ]
}`;

        // High-speed, low-latency models with zero thinking-overhead
        const candidateModels = [
          "gemini-3.5-flash-lite",
          "gemini-flash-lite-latest",
          "gemini-3.5-flash",
          "gemini-3.6-flash",
        ];
        let rawContent: string | null = null;
        let lastError: string | null = null;

        for (const model of candidateModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: promptText },
                        {
                          inlineData: {
                            mimeType,
                            data: imageBase64,
                          },
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 600,
                    temperature: 0.7,
                  },
                }),
              },
            );

            if (geminiRes.ok) {
              const data = (await geminiRes.json()) as any;
              rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawContent) break;
            } else {
              lastError = await geminiRes.text().catch(() => "");
            }
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
          }
        }

        if (!rawContent) {
          let readableError = lastError || "Failed to generate copy from Gemini API.";
          try {
            const parsedErr = JSON.parse(readableError);
            if (parsedErr?.error?.message) {
              readableError = parsedErr.error.message;
            }
          } catch {}
          throw new Error(`Gemini API: ${readableError}`);
        }

        let parsed: any;
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          const cleaned = rawContent.replace(/```(?:json)?\n?|\n?```/g, "").trim();
          parsed = JSON.parse(cleaned);
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: true,
            sceneId,
            screenAnalysis: parsed.screenAnalysis || "UI Screen analysis completed.",
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            rateLimit: {
              limit: rateCheck.limit,
              remaining: rateCheck.remaining,
              resetTime: rateCheck.resetTime,
            },
          }),
        );
      } catch (err) {
        console.error("AI Copy generation error in aiCopyHandler:", err);
        sendRequestError(res, err, true);
      }
    }, (err) => sendRequestError(res, err, true));
  };
}

export type PresetLocale = {
  code: string;
  label: string;
  rtl: boolean;
};

export const PRESET_LOCALES: PresetLocale[] = [
  { code: "en-US", label: "English (US)", rtl: false },
  { code: "es-ES", label: "Spanish (Spain)", rtl: false },
  { code: "es-MX", label: "Spanish (Mexico)", rtl: false },
  { code: "fr-FR", label: "French (France)", rtl: false },
  { code: "de-DE", label: "German (Germany)", rtl: false },
  { code: "it-IT", label: "Italian (Italy)", rtl: false },
  { code: "pt-BR", label: "Portuguese (Brazil)", rtl: false },
  { code: "ja-JP", label: "Japanese", rtl: false },
  { code: "ko-KR", label: "Korean", rtl: false },
  { code: "zh-Hans", label: "Chinese (Simplified)", rtl: false },
  { code: "zh-Hant", label: "Chinese (Traditional)", rtl: false },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)", rtl: true },
  { code: "he-IL", label: "Hebrew (Israel)", rtl: true },
  { code: "fa-IR", label: "Persian (Iran)", rtl: true },
  { code: "ur-PK", label: "Urdu (Pakistan)", rtl: true },
  { code: "ru-RU", label: "Russian", rtl: false },
  { code: "hi-IN", label: "Hindi (India)", rtl: false },
  { code: "tr-TR", label: "Turkish", rtl: false },
  { code: "nl-NL", label: "Dutch (Netherlands)", rtl: false },
  { code: "vi-VN", label: "Vietnamese", rtl: false },
  { code: "th-TH", label: "Thai", rtl: false },
  { code: "id-ID", label: "Indonesian", rtl: false },
  { code: "sv-SE", label: "Swedish", rtl: false },
];

export function extractLocalesFromConfig(content: string): string[] {
  const match = content.match(/locales:\s*\[([^\]]*)\]/);
  if (!match) return ["en-US"];
  const rawItems = match[1].split(",");
  const locales = rawItems
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter((s) => s.length > 0);
  return locales.length > 0 ? locales : ["en-US"];
}

export function updateLocalesInConfig(content: string, locales: string[]): string {
  const safeLocales = locales.map((l) => assertValidLocale(l));
  const formatted = `locales: [${safeLocales.map((l) => JSON.stringify(l)).join(", ")}]`;
  const regex = /locales:\s*\[[^\]]*\]/;
  if (regex.test(content)) {
    return content.replace(regex, formatted);
  }
  const devicesMatch = content.match(/devices:\s*\[[^\]]*\],?/);
  if (devicesMatch && devicesMatch.index !== undefined) {
    const pos = devicesMatch.index + devicesMatch[0].length;
    return `${content.slice(0, pos)}\n  ${formatted},${content.slice(pos)}`;
  }
  return content;
}

/** Handles GET and POST /api/locales */
export function localesHandler(api: StudioApi): Handler {
  return (req, res) => {
    const sessionId = getSessionIdFromRequest(req);
    const paths = resolveWorkspacePaths(api, sessionId);
    const cli = api.cli;

    if (req.method === "GET") {
      (async () => {
        try {
          let currentLocales: string[] = [];
          if (existsSync(paths.designFile)) {
            try {
              const design = JSON.parse(await readFile(paths.designFile, "utf8"));
              if (Array.isArray(design.locales) && design.locales.length > 0) {
                currentLocales = design.locales;
              }
            } catch {}
          }
          if (currentLocales.length === 0) {
            const configFiles = getConfigPaths(paths);
            for (const cfgPath of configFiles) {
              try {
                const content = await readFile(cfgPath, "utf8");
                currentLocales = extractLocalesFromConfig(content);
                if (currentLocales.length > 0) break;
              } catch {}
            }
          }
          if (currentLocales.length === 0) {
            currentLocales = ["en-US"];
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ locales: currentLocales, presets: PRESET_LOCALES }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      })();
      return;
    }

    if (req.method === "POST") {
      readBody(req, MAX_JSON_BODY_BYTES).then(
        async (body) => {
          try {
            const payload = JSON.parse(body || "{}") as {
              action?: "add" | "remove";
              locale?: string;
              locales?: string[];
            };

          let currentLocales: string[] = [];
          const configFiles = getConfigPaths(paths);
          for (const cfgPath of configFiles) {
            try {
              const content = await readFile(cfgPath, "utf8");
              currentLocales = extractLocalesFromConfig(content);
              if (currentLocales.length > 0) break;
            } catch {}
          }
          if (currentLocales.length === 0) currentLocales = ["en-US"];

          let updatedLocales: string[] = [...currentLocales];

          if (Array.isArray(payload.locales) && payload.locales.length > 0) {
            updatedLocales = Array.from(
              new Set(payload.locales.map((l) => assertValidLocale(l))),
            );
          } else if (payload.action === "add" && payload.locale) {
            const l = assertValidLocale(payload.locale);
            if (!updatedLocales.includes(l)) {
              updatedLocales.push(l);
            }
          } else if (payload.action === "remove" && payload.locale) {
            const l = assertValidLocale(payload.locale);
            if (updatedLocales.length <= 1) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Cannot remove the only remaining locale" }));
              return;
            }
            updatedLocales = updatedLocales.filter((item) => item !== l);
          } else {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid locale request payload" }));
            return;
          }

          if (updatedLocales.length === 0) {
            updatedLocales = ["en-US"];
          }

          // Write updated locales into all config files
          for (const cfgPath of configFiles) {
            try {
              const content = await readFile(cfgPath, "utf8");
              const updatedContent = updateLocalesInConfig(content, updatedLocales);
              await writeFile(cfgPath, updatedContent, "utf8");
            } catch {}
          }

          // Also update designFile if it exists
          if (existsSync(paths.designFile)) {
            try {
              const design = JSON.parse(await readFile(paths.designFile, "utf8"));
              design.locales = updatedLocales;
              await writeFile(paths.designFile, JSON.stringify(design, null, 2), "utf8");
            } catch {}
          }

          // Run manifest to refresh out/web/store.json
          const [bin, ...prefix] = cli;
          const manifestRes = await exec(
            bin!,
            [...prefix, "manifest", "--config", paths.configPath],
            { quiet: true },
          );
          if (manifestRes.code !== 0) {
            console.error(
              "Manifest failed in localesHandler:",
              manifestRes.stderr || manifestRes.stdout,
            );
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, locales: updatedLocales }));
        } catch (err) {
          sendRequestError(res, err, true);
        }
      }, (err) => sendRequestError(res, err, true));
      return;
    }

    res.statusCode = 405;
    res.end("Method Not Allowed");
  };
}

/** The studio bundle Vite emits; shipped in the npm package. */
export const STUDIO_DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "studio", "dist");

export const STUDIO_PUBLIC = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "studio",
  "public",
);

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
    const isKnownRoute =
      normalizedPath === "/" ||
      normalizedPath === "/privacy" ||
      normalizedPath === "/terms" ||
      normalizedPath === "/about" ||
      normalizedPath === "/contact" ||
      normalizedPath === "/guidelines" ||
      normalizedPath === "/studio";

    const indexPath =
      (existsSync(join(STUDIO_DIST, "index.html")) ? join(STUDIO_DIST, "index.html") : null) ??
      (existsSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", "studio", "index.html"))
        ? resolve(dirname(fileURLToPath(import.meta.url)), "..", "studio", "index.html")
        : null);

    if (isKnownRoute) {
      if (indexPath) {
        sendFile(req, res, indexPath);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><html><body><div id="root"></div></body></html>');
      return;
    }

    // For unknown paths, return HTTP 404 status code while serving index.html so client renders 404 view
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

  // Prune stale guest workspaces on startup and periodically every 2 hours
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
  // `start` is a cmd.exe builtin, not a program; the empty string is its window title.
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [safeUrl]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", '""', safeUrl]]
        : ["xdg-open", [safeUrl]];
  await exec(cmd, args, { quiet: true });
}
