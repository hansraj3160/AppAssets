import { spawn } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { BANNER_SPECS, type BannerType, renderBannerCanvas } from "./banner.ts";
import { applyDesign, loadConfig } from "./config.ts";
import { exec } from "./exec.ts";
import { DEVICES, type DeviceKey } from "./specs.ts";
import { createStoreGuideContent, storeZipPath, type ZipEntry, zipDirs } from "./zip.ts";

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

      const flags: string[] = ["--config", paths.configPath];
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
        res.write(
          "$ zip store package (including Google Play Feature Graphic & Marketing Banners)\n",
        );
        await rm(paths.exportZip, { force: true });
        const extraEntries: ZipEntry[] = [
          {
            name: "STORE_GUIDE.txt",
            data: Buffer.from(createStoreGuideContent(), "utf8"),
            mtime: new Date(),
          },
        ];

        try {
          const cfg = await loadConfig(paths.configPath);
          if (existsSync(paths.designFile)) {
            try {
              const designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
              applyDesign(cfg, designJson);
            } catch {}
          }
          for (const [bType, bSpec] of Object.entries(BANNER_SPECS)) {
            try {
              const buf = await renderBannerCanvas({
                cfg,
                type: bType as BannerType,
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

        const count = await zipDirs(
          paths.outDir,
          ["screenshots", "previews"],
          paths.exportZip,
          storeZipPath,
          extraEntries,
        );
        res.write(`  ${count} files packaged into store layout\n`);
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
export function replaceCaptureHandler({ paths, cli }: StudioApi): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    readBody(req).then(async (body) => {
      try {
        const {
          sceneId,
          device: preferredDevice,
          autoRoute,
          file,
        } = JSON.parse(body) as {
          sceneId: string;
          device?: string;
          autoRoute?: boolean;
          file: { name: string; dataUrl: string; width?: number; height?: number };
        };

        if (!sceneId || !file?.dataUrl) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "sceneId and file with dataUrl are required" }));
          return;
        }

        const base64Data = file.dataUrl.includes(";base64,")
          ? file.dataUrl.split(";base64,")[1]!
          : file.dataUrl.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const bufDim = getDimensionsFromBuffer(buffer);
        const width = file.width ?? bufDim?.width ?? 0;
        const height = file.height ?? bufDim?.height ?? 0;

        let targetDevice: DeviceKey;
        if (autoRoute || !preferredDevice) {
          targetDevice = resolveDeviceFromDimensions(width, height, preferredDevice);
        } else {
          targetDevice = (preferredDevice as DeviceKey) || "iphone-6.9";
        }

        const rawDir = join(paths.outDir, "raw", targetDevice);
        await mkdir(rawDir, { recursive: true });

        const targetFile = join(rawDir, `${sceneId}.png`);
        await writeFile(targetFile, buffer);

        // Update raw/<targetDevice>/manifest.json
        const manifestPath = join(rawDir, "manifest.json");
        let existingManifest: { screenshots: Array<{ sceneId: string; file: string }> } = {
          screenshots: [],
        };
        if (existsSync(manifestPath)) {
          try {
            existingManifest = JSON.parse(await readFile(manifestPath, "utf8"));
          } catch {}
        }

        const screenshotMap = new Map(existingManifest.screenshots.map((s) => [s.sceneId, s.file]));
        screenshotMap.set(sceneId, targetFile);

        const updatedManifest = {
          device: targetDevice,
          udid: "manual",
          capturedAt: new Date().toISOString(),
          screenshots: Array.from(screenshotMap.entries()).map(([sId, fPath]) => ({
            sceneId: sId,
            file: fPath,
          })),
          preview: null,
        };
        await writeFile(manifestPath, JSON.stringify(updatedManifest, null, 2));

        // Re-frame the screenshot for this device and rebuild store manifest
        const [bin, ...prefix] = cli;
        try {
          await exec(
            bin!,
            [...prefix, "frame", "--config", paths.configPath, "--device", targetDevice],
            { quiet: true },
          );
        } catch (frameErr) {
          console.error("Frame failed after capture replace:", frameErr);
        }

        await exec(bin!, [...prefix, "manifest", "--config", paths.configPath], { quiet: true });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, device: targetDevice, sceneId }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
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
        const { files, autoRoute, preferredDevice, targetMode } = JSON.parse(body) as {
          files: Array<{ name: string; dataUrl: string; width?: number; height?: number }>;
          autoRoute?: boolean;
          preferredDevice?: string;
          targetMode?: "current" | "auto" | "all";
        };
        if (!Array.isArray(files) || files.length === 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No files provided" }));
          return;
        }

        const allDevices: DeviceKey[] = ["iphone-6.9", "ipad-13", "pixel-10-pro"];
        const filesByDevice = new Map<DeviceKey, typeof files>();

        if (targetMode === "current" && preferredDevice) {
          filesByDevice.set(preferredDevice as DeviceKey, files);
        } else if (targetMode === "auto" || (autoRoute && targetMode !== "all")) {
          for (const f of files) {
            const base64Data = f.dataUrl.includes(";base64,")
              ? f.dataUrl.split(";base64,")[1]!
              : f.dataUrl.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const bufDim = getDimensionsFromBuffer(buffer);
            const w = f.width ?? bufDim?.width ?? 0;
            const h = f.height ?? bufDim?.height ?? 0;
            const dev = resolveDeviceFromDimensions(w, h, preferredDevice);
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

        const newScenes: Array<{ id: string; label: string }> = [];

        for (const [dev, devFiles] of filesByDevice.entries()) {
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

          for (const f of devFiles) {
            const rawName = f.name.replace(/\.[^.]+$/, "");
            const id = rawName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
            const label = rawName.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const background = url.searchParams.get("background");
    const frame = url.searchParams.get("frame");
    const font = url.searchParams.get("font");
    const template = url.searchParams.get("template");
    const layout = url.searchParams.get("layout");
    const screenOnly = url.searchParams.get("screenOnly") === "true";
    const fontSizeScale = url.searchParams.get("fontSizeScale");

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

        const designExists = existsSync(paths.designFile);
        const isStale =
          !targetFile ||
          !existsSync(targetFile) ||
          (designExists && statSync(paths.designFile).mtimeMs > statSync(targetFile).mtimeMs);

        // If file not found, stale, or explicitly forced, run frame
        if (force || isStale) {
          const flags: string[] = [];
          if (background) flags.push("--background", background);
          if (frame) flags.push("--frame", frame);
          if (font) flags.push("--font", font);
          if (template && template !== "none") flags.push("--template", template);
          if (layout) flags.push("--layout", layout);
          if (screenOnly) flags.push("--screen-only");
          if (fontSizeScale) flags.push("--font-size-scale", fontSizeScale);

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
              ...flags,
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

/** Handles GET /api/export-banner?type=...&sceneId=...&locale=... for downloading individual marketing/store banners */
export function bannerExportHandler({ paths }: StudioApi): Handler {
  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const type = (url.searchParams.get("type") || "google-play") as BannerType;
    const sceneId = url.searchParams.get("sceneId") || undefined;
    const secondarySceneId = url.searchParams.get("sceneId2") || undefined;
    const tertiarySceneId = url.searchParams.get("sceneId3") || undefined;
    const locale = url.searchParams.get("locale") || undefined;
    const deviceCount = (url.searchParams.get("deviceCount") || undefined) as
      | "single"
      | "duo"
      | "trio"
      | undefined;
    const kickerHeadline = url.searchParams.get("kicker") || undefined;
    const customHeadline = url.searchParams.get("headline") || undefined;
    const customTagline = url.searchParams.get("tagline") || undefined;
    const benefitsParam = url.searchParams.get("benefits");
    let benefits: string[] | undefined;
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
    const customBackground = url.searchParams.get("background") || undefined;
    const layout = (url.searchParams.get("layout") || "split") as "split" | "center";
    const mockupStyle = (url.searchParams.get("mockupStyle") || "card") as "card" | "screen";

    const spec = BANNER_SPECS[type];
    if (!spec) {
      res.statusCode = 400;
      res.end(`Unknown banner type: ${type}`);
      return;
    }

    (async () => {
      try {
        const cfg = await loadConfig(paths.configPath);
        if (existsSync(paths.designFile)) {
          try {
            const designJson = JSON.parse(await readFile(paths.designFile, "utf8"));
            applyDesign(cfg, designJson);
          } catch {}
        }

        const buffer = await renderBannerCanvas({
          cfg,
          type,
          sceneId,
          secondarySceneId,
          tertiarySceneId,
          deviceCount,
          locale,
          kickerHeadline,
          customHeadline,
          customTagline,
          benefits,
          customBackground,
          layout,
          mockupStyle,
        });

        const filename = `${type}-${spec.width}x${spec.height}.png`;
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": buffer.length,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        });
        res.end(buffer);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
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

  constructor(
    public config: RateLimitConfig = {
      windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
      maxRequests: Number(process.env.AI_RATE_LIMIT_MAX) || 10,
    },
  ) {
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
export function aiCopyHandler({ paths }: StudioApi, rateLimiter = aiRateLimiter): Handler {
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

    readBody(req).then(async (body) => {
      try {
        const {
          sceneId,
          device = "iphone-6.9",
          locale = "en-US",
          tone,
          customPrompt,
          appContext,
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

        const apiKey = getGeminiApiKey(paths);
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

        // Clean candidate names (handle #slice, trailing -1, etc.)
        const cleanSceneId = sceneId.split("#")[0];
        const cleanBaseSceneId = cleanSceneId.replace(/-\d+$/, "");
        const candidateNames = Array.from(
          new Set([sceneId, cleanSceneId, cleanBaseSceneId].filter(Boolean)),
        );

        const devicesToTry = Array.from(
          new Set([device, "iphone-6.9", "pixel-10-pro", "ipad-13"].filter(Boolean)),
        );

        let screenshotPath: string | null = null;

        // 1. Direct match in raw folder
        for (const dev of devicesToTry) {
          for (const name of candidateNames) {
            for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
              const p = join(paths.outDir, "raw", dev, `${name}${ext}`);
              if (existsSync(p)) {
                screenshotPath = p;
                break;
              }
            }
            if (screenshotPath) break;
          }
          if (screenshotPath) break;
        }

        // 2. Try screenshots folder for each device
        if (!screenshotPath) {
          for (const dev of devicesToTry) {
            const screenshotsDir = join(paths.outDir, "screenshots", dev, locale);
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
        }

        // 3. Loose fallback in raw folder
        if (!screenshotPath) {
          for (const dev of devicesToTry) {
            const rawDir = join(paths.outDir, "raw", dev);
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
        const { base64: imageBase64, mimeType } = await optimizeScreenshotForAi(imageBuffer, 640);

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
Context: ${contextInfo}
Target Language/Locale: ${locale}

Rules:
1. Headline: punchy, under 30 characters.
2. Subhead: highlights user benefit or screen feature, under 80 characters.
3. Return exactly 3 options in JSON:
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
                    maxOutputTokens: 350,
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
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
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
  const formatted = `locales: [${locales.map((l) => `"${l}"`).join(", ")}]`;
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
export function localesHandler({ paths, cli }: StudioApi): Handler {
  return (req, res) => {
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
      readBody(req).then(async (body) => {
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
              new Set(payload.locales.map((l) => l.trim()).filter(Boolean)),
            );
          } else if (payload.action === "add" && payload.locale) {
            const l = payload.locale.trim();
            if (l && !updatedLocales.includes(l)) {
              updatedLocales.push(l);
            }
          } else if (payload.action === "remove" && payload.locale) {
            const l = payload.locale.trim();
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
          await exec(bin!, [...prefix, "manifest", "--config", paths.configPath], { quiet: true });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, locales: updatedLocales }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end("Method Not Allowed");
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
  const expBanner = bannerExportHandler(api);
  const imp = importHandler(api);
  const repCapture = replaceCaptureHandler(api);
  const del = deleteHandler(api);
  const delAll = deleteAllHandler(api);
  const locales = localesHandler(api);
  const aiCopy = aiCopyHandler(api);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (path === "/api/design") return design(req, res);
    if (path === "/api/locales") return locales(req, res);
    if (path === "/api/ai/generate-copy") return aiCopy(req, res);
    if (path.startsWith("/api/export-single")) return expSingle(req, res);
    if (path.startsWith("/api/export-banner")) return expBanner(req, res);
    if (path.startsWith("/api/export")) return exp(path.slice("/api/export".length))(req, res);
    if (path === "/api/import") return imp(req, res);
    if (path === "/api/replace-capture") return repCapture(req, res);
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
