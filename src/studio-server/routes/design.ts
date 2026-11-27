import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { exec } from "../../exec.ts";
import { assertValidLocale } from "../../security.ts";
import {
  extractLocalesFromConfig,
  PRESET_LOCALES,
  updateLocalesInConfig,
} from "../config-helpers.ts";
import {
  MAX_DESIGN_BODY_BYTES,
  MAX_JSON_BODY_BYTES,
  MAX_MEDIA_BODY_BYTES,
  readBody,
  sendRequestError,
} from "../http.ts";
import type { Handler, StudioApi } from "../types.ts";
import { getConfigPaths, getSessionIdFromRequest, resolveWorkspacePaths } from "../workspace.ts";

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

  const cornerRadius = options?.cornerRadius ?? 0;
  if (cornerRadius > 0) {
    const radiusPx = (cornerRadius / 100) * size;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radiusPx);
    ctx.clip();
  }

  if (options?.bg && options.bg !== "transparent") {
    ctx.fillStyle = options.bg;
    ctx.fillRect(0, 0, size, size);
  }

  const img = await loadImage(iconSource);
  const scale = options?.scale ?? 1.0;
  const offsetX = options?.offsetX ?? 0;
  const offsetY = options?.offsetY ?? 0;

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

            for (const cfgPath of configFiles) {
              try {
                const content = await readFile(cfgPath, "utf8");
                const updatedContent = updateLocalesInConfig(content, updatedLocales);
                await writeFile(cfgPath, updatedContent, "utf8");
              } catch {}
            }

            if (existsSync(paths.designFile)) {
              try {
                const design = JSON.parse(await readFile(paths.designFile, "utf8"));
                design.locales = updatedLocales;
                await writeFile(paths.designFile, JSON.stringify(design, null, 2), "utf8");
              } catch {}
            }

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
        },
        (err) => sendRequestError(res, err, true),
      );
      return;
    }

    res.statusCode = 405;
    res.end("Method Not Allowed");
  };
}
