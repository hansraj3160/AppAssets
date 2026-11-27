import { createReadStream, existsSync, statSync } from "node:fs";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { BANNER_SPECS, type BannerType, renderBannerCanvas } from "../../banner.ts";
import { applyDesign, loadConfig } from "../../config.ts";
import { exec } from "../../exec.ts";
import { resizePngBuffer } from "../../image.ts";
import {
  assertSafeId,
  assertValidDeviceKey,
  assertValidLocale,
  resolveContainedPath,
  sanitizeDownloadFilename,
  sanitizeThemeColor,
  ValidationError,
} from "../../security.ts";
import type { DeviceKey } from "../../specs.ts";
import {
  createStoreGuideContent,
  storeZipPath,
  type ZipEntry,
  zipDirs,
  zipEntries,
} from "../../zip.ts";
import { findScreenshotFile } from "../config-helpers.ts";
import {
  MAX_JSON_BODY_BYTES,
  MAX_MEDIA_BODY_BYTES,
  readBody,
  sendRequestError,
  stream,
} from "../http.ts";
import type { ExportOptions, Handler, StudioApi } from "../types.ts";
import { getSessionIdFromRequest, resolveWorkspacePaths } from "../workspace.ts";
import { renderAppIconCanvas } from "./design.ts";

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
        res.write("$ appassets frame\n");
        await stream(bin!, [...prefix, "frame", ...flags], paths.configDir, res, {
          APPASSETS_CONFIG: paths.configPath,
          GOLDIE_CONFIG: paths.configPath,
        });

        try {
          res.write("$ appassets preview\n");
          await stream(bin!, [...prefix, "preview", ...flags], paths.configDir, res, {
            APPASSETS_CONFIG: paths.configPath,
            GOLDIE_CONFIG: paths.configPath,
          });
        } catch {
          res.write("  no preview clips found, skipping video preview\n");
        }

        res.write("$ appassets manifest\n");
        await stream(bin!, [...prefix, "manifest", ...flags], paths.configDir, res, {
          APPASSETS_CONFIG: paths.configPath,
          GOLDIE_CONFIG: paths.configPath,
        });

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

/** Handles GET /api/export-single?sceneId=...&device=...&size=...&locale=...&slice=... */
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

        const fileStat = statSync(targetFile);
        const dlName = sanitizeDownloadFilename(
          `${sceneId}${sliceSuffix}-${device}.png`,
          "screenshot.png",
        );
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": fileStat.size,
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

          const screenshotsDir = resolveContainedPath(paths.outDir, [
            "screenshots",
            device,
            locale,
          ]);
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
      },
      (err) => sendRequestError(res, err, true),
    );
  };
}

/** Handles GET/POST /api/export-banner for downloading individual marketing/store banners */
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

/** Handles /api/export-favicon for generating a complete favicon and web app kit ZIP. */
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
          } catch {}
        }

        if (customDataUrl?.startsWith("data:image/")) {
          const base64Data = customDataUrl.includes(";base64,")
            ? customDataUrl.split(";base64,")[1]!
            : customDataUrl.replace(/^data:[^;]+;base64,/, "");
          iconSource = Buffer.from(base64Data, "base64");
        } else {
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

        const icon16 = await renderAppIconCanvas(iconSource, 16);
        const icon32 = await renderAppIconCanvas(iconSource, 32);
        const icon180 = await renderAppIconCanvas(iconSource, 180, { cornerRadius: 22.5 });
        const icon192 = await renderAppIconCanvas(iconSource, 192, { cornerRadius: 20 });
        const icon512 = await renderAppIconCanvas(iconSource, 512, { cornerRadius: 20 });

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
