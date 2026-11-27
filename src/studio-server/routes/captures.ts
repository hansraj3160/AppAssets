import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { exec } from "../../exec.ts";
import {
  assertSafeId,
  assertValidDeviceKey,
  resolveContainedPath,
  ValidationError,
} from "../../security.ts";
import { DEVICES, type DeviceKey } from "../../specs.ts";
import {
  appendScenesToConfig,
  assignUniqueSceneIds,
  getDimensionsFromBuffer,
  removeSceneFromConfig,
  resolveDeviceFromDimensions,
} from "../config-helpers.ts";
import {
  MAX_JSON_BODY_BYTES,
  MAX_MEDIA_BODY_BYTES,
  readBody,
  sendRequestError,
} from "../http.ts";
import type { Handler, StudioApi } from "../types.ts";
import {
  ensureWorkspaceConfig,
  getConfigPaths,
  getSessionIdFromRequest,
  resolveWorkspacePaths,
} from "../workspace.ts";

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

/** Handles POST /api/sync-captures to synchronize captures from a source device across other devices. */
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
                const targetFilePath = resolveContainedPath(targetRawDir, [
                  `${safeItemSceneId}.png`,
                ]);
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
      },
      (err) => sendRequestError(res, err, true),
    );
  };
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
            for (const dev of allDevices) {
              filesByDevice.set(dev, files);
            }
          }

          const existingSceneIds = new Set<string>();

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

          for (const cfgPath of configFiles) {
            if (existsSync(cfgPath)) {
              const configContent = await readFile(cfgPath, "utf8");
              const updatedConfig = appendScenesToConfig(configContent, newScenes);
              if (updatedConfig !== configContent) {
                await writeFile(cfgPath, updatedConfig);
              }
            }
          }

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
      },
      (err) => sendRequestError(res, err, true),
    );
  };
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

          const configFiles = getConfigPaths(paths);
          for (const cfgPath of configFiles) {
            const configContent = await readFile(cfgPath, "utf8");
            const updatedConfig = removeSceneFromConfig(configContent, sceneId);
            if (updatedConfig !== configContent) {
              await writeFile(cfgPath, updatedConfig);
            }
          }

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
      },
      (err) => sendRequestError(res, err, true),
    );
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
                  configContent = `${configContent.slice(0, openBracket + 1)}\n  ${configContent.slice(closeBracket)}`;
                  await writeFile(cfgFile, configContent);
                }
              }
            }
          }
        }

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
