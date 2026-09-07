import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "./exec.ts";
import { storeZipPath, zipDirs } from "./zip.ts";

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
      : join(configDir, "goldie.design.json"), // mirrors designPath() in config.ts
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

export type ExportOptions = {
  background?: string;
  frame?: string;
  font?: string;
  template?: string;
  layout?: string;
  screenOnly?: boolean;
  fontSizeScale?: number;
};

export type StudioApi = {
  paths: StudioPaths;
  /** Command prefix that runs the goldie CLI, e.g. ["node", ".../dist/cli.js"]. */
  cli: string[];
};

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((done) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => done(body));
  });
}

/** Handles /api/design. */
export function designHandler({ paths }: StudioApi): Handler {
  return (req, res) => {
    if (req.method === "GET") {
      readFile(paths.designFile, "utf8").then(
        (json) => {
          res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(json);
        },
        () => {
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
    readBody(req).then(async (body) => {
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
        const tmp = `${paths.designFile}.tmp`;
        await writeFile(tmp, `${JSON.stringify(design, null, 2)}\n`);
        await rename(tmp, paths.designFile);
        res.statusCode = 204;
        res.end();
      } catch (err) {
        res.statusCode = 500;
        res.end(err instanceof Error ? err.message : String(err));
      }
    });
  };
}

/** Handles /api/export and /api/export/download. `sub` is the path after /api/export. */
export function exportHandler({ paths, cli }: StudioApi): (sub: string) => Handler {
  let busy = false;

  return (sub) => (req, res) => {
    if (req.method === "GET" && sub === "/download") {
      if (!existsSync(paths.exportZip)) {
        res.statusCode = 404;
        res.end("No export yet. POST /api/export first.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Length": statSync(paths.exportZip).size,
        "Content-Disposition": 'attachment; filename="appstore-assets.zip"',
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
    if (busy) {
      res.statusCode = 409;
      res.end("An export is already running.");
      return;
    }
    busy = true;

    readBody(req).then(async (body) => {
      let opts: ExportOptions;
      try {
        opts = JSON.parse(body || "{}");
      } catch {
        busy = false;
        res.statusCode = 400;
        res.end("Body must be JSON.");
        return;
      }

      const flags: string[] = [];
      if (opts.background) flags.push("--background", opts.background);
      if (opts.frame) flags.push("--frame", opts.frame);
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
        for (const command of ["frame", "preview", "manifest"]) {
          res.write(`$ appassets ${command}\n`);
          await stream(bin!, [...prefix, command, ...flags], paths.configDir, res, {
            APPASSETS_CONFIG: paths.configPath,
            GOLDIE_CONFIG: paths.configPath,
          });
        }
        res.write("$ zip screenshots + previews\n");
        await rm(paths.exportZip, { force: true });
        const count = await zipDirs(
          paths.outDir,
          ["screenshots", "previews"],
          paths.exportZip,
          storeZipPath,
        );
        res.write(`  ${count} files\n`);
        res.write("[done]\n");
      } catch (err) {
        res.write(`[failed] ${err instanceof Error ? err.message : err}\n`);
      } finally {
        busy = false;
        res.end();
      }
    });
  };
}

/** Handles POST /api/import for uploading screenshots directly from Studio UI. */
export function importHandler({ paths, cli }: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    readBody(req).then(async (body) => {
      try {
        const { files } = JSON.parse(body) as {
          files: Array<{ name: string; dataUrl: string }>;
        };
        if (!Array.isArray(files) || files.length === 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No files provided" }));
          return;
        }

        const devices = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
        const newScenes: Array<{ id: string; label: string }> = [];

        for (const dev of devices) {
          const rawDir = join(paths.outDir, "raw", dev);
          await mkdir(rawDir, { recursive: true });

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

          for (const f of files) {
            const rawName = f.name.replace(/\.[^.]+$/, "");
            const id = rawName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
            const label = rawName.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

            const base64Data = f.dataUrl.replace(/^data:image\/\w+;base64,/, "");
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
            preview: null,
          };
          await writeFile(manifestPath, JSON.stringify(updatedManifest, null, 2));
        }

        // Auto-register missing scenes in all config files (appassets.config.ts and/or goldie.config.ts)
        const configFiles = getConfigPaths(paths);
        for (const cfgPath of configFiles) {
          let configContent = await readFile(cfgPath, "utf8");
          let modified = false;

          for (const s of newScenes) {
            if (
              !configContent.includes(`id: "${s.id}"`) &&
              !configContent.includes(`id: '${s.id}'`)
            ) {
              const sceneBlock = `    {\n      kind: "screenshot",\n      id: "${s.id}",\n      flow: "store-${s.id}",\n      headline: { "en-US": "${s.label}" },\n      subhead: { "en-US": "Describe your key benefit here." },\n    },\n`;
              const scenesIndex = configContent.indexOf("scenes:");
              if (scenesIndex !== -1) {
                const openBracket = configContent.indexOf("[", scenesIndex);
                if (openBracket !== -1) {
                  const afterBracket = configContent.slice(openBracket + 1);
                  if (afterBracket.trimStart().startsWith("]")) {
                    const closeBracket = openBracket + 1 + afterBracket.indexOf("]");
                    configContent =
                      configContent.slice(0, openBracket + 1) +
                      "\n" +
                      sceneBlock +
                      "  " +
                      configContent.slice(closeBracket);
                  } else {
                    const insertPos = openBracket + 1 + (afterBracket.startsWith("\n") ? 1 : 0);
                    configContent =
                      configContent.slice(0, insertPos) +
                      (afterBracket.startsWith("\n") ? "" : "\n") +
                      sceneBlock +
                      configContent.slice(insertPos);
                  }
                  modified = true;
                }
              }
            }
          }

          if (modified) {
            await writeFile(cfgPath, configContent);
          }
        }

        // Rebuild store.json via manifest command
        const [bin, ...prefix] = cli;
        await exec(bin!, [...prefix, "manifest", "--config", paths.configPath], { quiet: true });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, imported: files.length }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
  };
}

function removeSceneFromConfig(configContent: string, sceneId: string): string {
  const idPattern = new RegExp(`id:\\s*["']${sceneId}["']`);
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
export function deleteHandler({ paths, cli }: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    readBody(req).then(async (body) => {
      try {
        const { sceneId } = JSON.parse(body) as { sceneId?: string };
        if (!sceneId || typeof sceneId !== "string") {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No sceneId provided" }));
          return;
        }

        const devices = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
        for (const dev of devices) {
          const rawDir = join(paths.outDir, "raw", dev);
          const rawFile = join(rawDir, `${sceneId}.png`);
          await rm(rawFile, { force: true });

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
        await exec(bin!, [...prefix, "manifest", "--config", paths.configPath], { quiet: true });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, deleted: sceneId }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
  };
}

/** Handles POST /api/delete-all for removing all screenshots at once. */
export function deleteAllHandler({ paths, cli }: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    (async () => {
      try {
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

        // Clean goldie.design.json
        if (existsSync(paths.designFile)) {
          try {
            const designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
            designJson.order = [];
            designJson.copy = {};
            designJson.sceneLayouts = {};
            await writeFile(paths.designFile, JSON.stringify(designJson, null, 2));
          } catch {}
        }

        // Rebuild store.json via manifest command
        const [bin, ...prefix] = cli;
        await exec(bin!, [...prefix, "manifest", "--config", paths.configPath], { quiet: true });

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

const MIME: Record<string, string> = {
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
};

/** Serve `file` with Range support, so the preview video seeks in the browser. */
function sendFile(req: IncomingMessage, res: ServerResponse, file: string) {
  const size = statSync(file).size;
  const type = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(res);
}

/** Resolve a URL path inside `root`, or null when it escapes or is missing. */
function fileIn(root: string, urlPath: string): string | null {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const file = join(root, rel);
  if (!file.startsWith(root)) return null;
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
  if (slice !== undefined && !Number.isNaN(slice)) {
    // Slices are 1-indexed in file names (e.g. 02-home-1.png, 03-home-2.png); normalize 0 to 1
    const targetSlice = slice === 0 ? 1 : slice;
    const slicePattern = new RegExp(`(?:^|\\d+-)${sceneId}-${targetSlice}\\.png$`);
    const found = files.find((f) => slicePattern.test(f));
    if (found) return found;
  }

  // If no slice was requested (or slice 1), prefer slice 1 if multi-slice exists
  const slice1Pattern = new RegExp(`(?:^|\\d+-)${sceneId}-1\\.png$`);
  const foundSlice1 = files.find((f) => slice1Pattern.test(f));
  if (foundSlice1 && (slice === undefined || slice === 1 || slice === 0)) return foundSlice1;

  // Single-tile pattern (e.g. 01-home.png)
  const singlePattern = new RegExp(`(?:^|\\d+-)${sceneId}\\.png$`);
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

/** Handles GET /api/export-single?sceneId=...&device=...&locale=...&slice=... for downloading a single screenshot. */
export function singleExportHandler({ paths, cli }: StudioApi): Handler {
  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const sceneId = url.searchParams.get("sceneId");
    const device = url.searchParams.get("device") || "iphone-6.9";
    const locale = url.searchParams.get("locale") || "en-US";
    const sliceParam = url.searchParams.get("slice");
    const sliceNum = sliceParam !== null ? parseInt(sliceParam, 10) : undefined;

    if (!sceneId) {
      res.statusCode = 400;
      res.end("sceneId query param required");
      return;
    }

    (async () => {
      try {
        const screenshotsDir = join(paths.outDir, "screenshots", device, locale);
        let targetFile: string | null = null;

        if (existsSync(screenshotsDir)) {
          const files = await readdir(screenshotsDir);
          const matched = findScreenshotFile(files, sceneId, sliceNum);
          if (matched) targetFile = join(screenshotsDir, matched);
        }

        // If file not found yet, run frame first
        if (!targetFile || !existsSync(targetFile)) {
          const [bin, ...prefix] = cli;
          await exec(
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
            ],
            { quiet: true },
          );
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

        const stat = statSync(targetFile);
        const targetSlice =
          sliceNum !== undefined && !Number.isNaN(sliceNum)
            ? sliceNum === 0
              ? 1
              : sliceNum
            : undefined;
        const sliceSuffix = targetSlice && targetSlice > 1 ? `-${targetSlice}` : "";
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": stat.size,
          "Content-Disposition": `attachment; filename="${sceneId}${sliceSuffix}-${device}.png"`,
        });
        createReadStream(targetFile).pipe(res);
      } catch (err) {
        res.statusCode = 500;
        res.end(err instanceof Error ? err.message : String(err));
      }
    })();
  };
}

/** The studio bundle Vite emits; shipped in the npm package. */
export const STUDIO_DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "studio", "dist");

/**
 * Serve the prebuilt studio plus the app's out/web at `/`, with the API on top.
 * Resolves with the URL once listening.
 */
export function serveStudio(api: StudioApi, port = 4321): Promise<string> {
  if (!existsSync(join(STUDIO_DIST, "index.html"))) {
    throw new Error(
      `No studio build at ${STUDIO_DIST}. In a source checkout run: bun run studio:build`,
    );
  }
  const design = designHandler(api);
  const exp = exportHandler(api);
  const expSingle = singleExportHandler(api);
  const imp = importHandler(api);
  const del = deleteHandler(api);
  const delAll = deleteAllHandler(api);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (path === "/api/design") return design(req, res);
    if (path.startsWith("/api/export-single")) return expSingle(req, res);
    if (path.startsWith("/api/export")) return exp(path.slice("/api/export".length))(req, res);
    if (path === "/api/import") return imp(req, res);
    if (path === "/api/delete") return del(req, res);
    if (path === "/api/delete-all") return delAll(req, res);

    const file = fileIn(api.paths.webDir, path) ?? fileIn(STUDIO_DIST, path);
    if (file) return sendFile(req, res, file);
    if (path === "/store.json") {
      res.statusCode = 404;
      res.end("No out/web/store.json. Run: goldie manifest");
      return;
    }
    sendFile(req, res, join(STUDIO_DIST, "index.html"));
  });

  return new Promise((done, fail) => {
    server.on("error", fail);
    server.listen(port, "127.0.0.1", () => done(`http://localhost:${port}`));
  });
}

/** Open a URL in the default browser; best effort. */
export async function openInBrowser(url: string): Promise<void> {
  // `start` is a cmd.exe builtin, not a program; the empty string is its window title.
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", '""', url]]
        : ["xdg-open", [url]];
  await exec(cmd, args, { quiet: true });
}
