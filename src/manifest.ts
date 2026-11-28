import { existsSync } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import type { CaptureManifest } from "./capture.ts";
import {
  type Decoration,
  deviceFrame,
  FRAME_VARIANTS,
  framePath,
  isPreview,
  isScreenshot,
  type LoadedConfig,
  variantFramePath,
} from "./config.ts";
import { execOrThrow } from "./exec.ts";
import { FONTS, fontFilePath } from "./fonts.ts";
import { imageSize } from "./image.ts";
import { type FrameGeometry, LAYOUTS, TEMPLATES } from "./layouts.ts";
import type {
  BundledFont,
  BundledFontFace,
  Design,
  DesignScene,
  DeviceCaptures,
  DeviceEntry,
  LayoutEntry,
  LocaleAssets,
  StoreManifest as SharedStoreManifest,
  TemplateEntry,
} from "./manifest-schema.ts";
import { DEVICES, type DeviceKey } from "./specs.ts";

export type {
  BundledFont,
  BundledFontFace,
  Design,
  DesignScene,
  DeviceCaptures,
  DeviceEntry,
  LayoutEntry,
  LocaleAssets,
  TemplateEntry,
};

/**
 * `out/web/` - the studio's static root. It holds the manifest, the
 * bezel art, and symlinks to the finished assets and the raw
 * captures. The raw captures and bezels are what the studio composites in
 * the browser (instant background/frame changes); the finished files under
 * screenshots/ and previews/ are what an export zips up.
 *
 * Derived directly from the single canonical `StoreManifest` in `src/manifest-schema.ts`
 * with `DeviceKey`-narrowed devices and populated `assets`.
 */
export type StoreManifest = SharedStoreManifest<DeviceKey> & {
  assets: Record<string, Record<string, LocaleAssets>>;
};

export const WEB_DIR = "web";

export async function writeManifest(cfg: LoadedConfig): Promise<string> {
  const webDir = join(cfg.outDir, WEB_DIR);
  await mkdir(webDir, { recursive: true });
  await link(join(cfg.outDir, "screenshots"), join(webDir, "screenshots"));
  await link(join(cfg.outDir, "previews"), join(webDir, "previews"));
  await link(join(cfg.outDir, "raw"), join(webDir, "raw"));

  // Bezel art the browser composites with; every bundled variant so switching
  // frames never waits on a server.
  const framesDir = join(webDir, "frames");
  await mkdir(framesDir, { recursive: true });
  for (const variant of FRAME_VARIANTS) {
    await copyFile(variantFramePath(variant), join(framesDir, `${variant}.png`));
  }
  const custom = "variant" in cfg.frame ? null : "frames/custom.png";
  if (custom) await copyFile(framePath(cfg), join(webDir, custom));

  // Bezel art a device brings itself, copied under its device key: the
  // android Pixel art and iPad art, which the frame picker does not apply to.
  const deviceFrames: Record<string, { url: string; geom: FrameGeometry }> = {};
  for (const key of cfg.devices) {
    if (DEVICES[key].platform === "ios") continue;
    const { image, geom } = deviceFrame(cfg, key);
    const url = `frames/${key}${extname(image)}`;
    await copyFile(image, join(webDir, url));
    deviceFrames[key] = { url, geom };
  }

  // Bundled WOFF2 subsets for browser previews (~433 KB total). Lazy CJK fonts
  // are never copied into per-session workspaces; the browser loads chunked
  // unicode-range WOFF2 subsets via stylesheetUrl only when CJK is active.
  const fontsDir = join(webDir, "fonts");
  await mkdir(fontsDir, { recursive: true });
  // Prune any legacy unoptimized .otf/.ttf copies from older workspaces.
  for (const existing of await ls(fontsDir)) {
    if (existing.endsWith(".otf") || existing.endsWith(".ttf")) {
      await rm(join(fontsDir, existing), { force: true });
    }
  }
  const copiedFontFiles = new Set<string>();
  const fonts: StoreManifest["design"]["fonts"] = [];
  for (const [key, font] of Object.entries(FONTS)) {
    const isLazy = "lazy" in font && Boolean(font.lazy);
    const stylesheetUrl = "stylesheetUrl" in font ? font.stylesheetUrl : undefined;
    const faces: Array<{ weight: number; url: string; unicodeRange?: string }> = [];
    if (!isLazy) {
      for (const face of font.faces) {
        const srcPath = fontFilePath(face.file);
        if (!existsSync(srcPath)) continue;
        if (!copiedFontFiles.has(face.file)) {
          await copyFile(srcPath, join(fontsDir, face.file));
          copiedFontFiles.add(face.file);
        }
        faces.push({
          weight: face.weight,
          url: `fonts/${face.file}`,
          ...(face.unicodeRange ? { unicodeRange: face.unicodeRange } : {}),
        });
      }
    }
    fonts.push({
      key,
      family: font.family,
      fallback: font.fallback,
      faces,
      ...(isLazy ? { lazy: true } : {}),
      ...(stylesheetUrl ? { stylesheetUrl } : {}),
    });
  }

  // Decoration images, copied so the browser can draw the same layers.
  const decorDir = join(webDir, "decor");
  await mkdir(decorDir, { recursive: true });
  const webDecorations = async (list: Decoration[] | undefined) =>
    Promise.all(
      (list ?? []).map(async (d) => {
        if (d.kind !== "image") return d;
        const name = basename(d.src);
        await copyFile(resolve(cfg.root, d.src), join(decorDir, name));
        return { ...d, src: `decor/${name}` };
      }),
    );
  const scenes: StoreManifest["design"]["scenes"] = [];
  for (const scene of cfg.scenes.filter(isScreenshot)) {
    scenes.push({
      id: scene.id,
      headline: scene.headline,
      ...(scene.subhead ? { subhead: scene.subhead } : {}),
      ...(scene.layout ? { layout: scene.layout } : {}),
      ...(scene.secondScene ? { secondScene: scene.secondScene } : {}),
      ...(scene.decorations ? { decorations: await webDecorations(scene.decorations) } : {}),
    });
  }

  const assets: StoreManifest["assets"] = {};
  for (const deviceKey of cfg.devices) {
    assets[deviceKey] = {};
    for (const locale of cfg.locales) {
      assets[deviceKey][locale] = await collect(cfg, deviceKey, locale);
    }
  }

  const captures: StoreManifest["design"]["captures"] = {};
  for (const deviceKey of cfg.devices) {
    const raw = await readCaptureManifest(cfg, deviceKey);
    if (!raw) continue;
    captures[deviceKey] = {
      screenshots: raw.screenshots.map((s) => ({
        sceneId: s.sceneId,
        url: `raw/${deviceKey}/${basename(s.file)}`,
      })),
      clips: raw.preview
        ? raw.preview.clips.map((c) => ({
            segmentId: c.segmentId,
            url: `raw/${deviceKey}/${basename(c.file)}`,
            durationSeconds: c.durationSeconds,
          }))
        : null,
    };
  }

  const previewScene = cfg.scenes.find(isPreview);
  const manifest: StoreManifest = {
    generatedAt: new Date().toISOString(),
    app: { ...cfg.store },
    devices: cfg.devices.map((key) => ({
      key,
      label: DEVICES[key].label,
      platform: DEVICES[key].platform,
      simulatorName: DEVICES[key].simulatorName ?? null,
      screenshot: DEVICES[key].screenshot,
      preview: DEVICES[key].preview,
      frame: deviceFrames[key] ?? null,
    })),
    locales: cfg.locales,
    assets,
    design: {
      theme: cfg.theme,
      frameVariant: "variant" in cfg.frame ? cfg.frame.variant : null,
      frameVariants: [...FRAME_VARIANTS],
      customFrameUrl: custom,
      fonts,
      layouts: Object.values(LAYOUTS).map(({ key, label, description, span }) => ({
        key,
        label,
        description,
        span,
      })),
      templates: Object.values(TEMPLATES),
      template: cfg.theme.template ?? null,
      layout: cfg.theme.layout ?? "classic",
      screenOnly: cfg.theme.screenOnly ?? false,
      decorations: await webDecorations(cfg.theme.decorations),
      scenes,
      preview: previewScene
        ? {
            sceneId: previewScene.id,
            segments: previewScene.segments.map(({ id }) => ({ id })),
          }
        : null,
      captures,
    },
  };

  const file = join(webDir, "store.json");
  await writeFile(file, JSON.stringify(manifest, null, 2));
  return file;
}

async function readCaptureManifest(
  cfg: LoadedConfig,
  deviceKey: DeviceKey,
): Promise<CaptureManifest | null> {
  try {
    return JSON.parse(await readFile(join(cfg.outDir, "raw", deviceKey, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function collect(
  cfg: LoadedConfig,
  deviceKey: DeviceKey,
  locale: string,
): Promise<LocaleAssets> {
  const shotDir = join(cfg.outDir, "screenshots", deviceKey, locale);
  const previewDir = join(cfg.outDir, "previews", deviceKey, locale);
  const sceneOrder = cfg.scenes.filter(isScreenshot).map((s) => s.id);

  const screenshots: LocaleAssets["screenshots"] = [];
  for (const name of (await ls(shotDir)).filter((f) => f.endsWith(".png")).sort()) {
    const file = join(shotDir, name);
    const { width, height } = await imageSize(file);
    // Files are named "<index>-<sceneId>.png".
    const sceneId = sceneOrder.find((id) => name.includes(id)) ?? basename(name, ".png");
    screenshots.push({
      sceneId,
      url: `screenshots/${deviceKey}/${locale}/${name}`,
      width,
      height,
      bytes: (await stat(file)).size,
    });
  }

  const previewScene = cfg.scenes.find(isPreview);
  const previewName = (await ls(previewDir)).find((f) => f.endsWith(".mp4"));
  let preview: LocaleAssets["preview"] = null;
  if (previewScene && previewName) {
    const file = join(previewDir, previewName);
    const probe = await videoInfo(file);
    preview = {
      sceneId: previewScene.id,
      url: `previews/${deviceKey}/${locale}/${previewName}`,
      ...probe,
      bytes: (await stat(file)).size,
    };
  }

  return { screenshots, preview };
}

const ls = async (dir: string) => readdir(dir).catch(() => [] as string[]);

/**
 * Directory link, replaced on every run so a moved out/ never goes stale.
 * A relative symlink on macOS and Linux. On Windows a directory symlink needs
 * Developer Mode or a privilege most accounts lack, so an NTFS junction is
 * used instead; junctions need an absolute target and no special rights.
 */
async function link(target: string, path: string): Promise<void> {
  // Unlink an existing link by name; a recursive rm must never follow a
  // junction into the real captures on a rerun.
  const existing = await lstat(path).catch(() => null);
  if (existing?.isSymbolicLink()) await unlink(path);
  else if (existing) await rm(path, { recursive: true, force: true });
  if (process.platform === "win32") {
    await mkdir(target, { recursive: true }); // a junction to a missing dir is dangling
    await symlink(resolve(target), path, "junction");
  } else {
    await symlink(relative(dirname(path), target), path, "dir");
  }
}

async function videoInfo(file: string) {
  const r = await execOrThrow("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    file,
  ]);
  const probe = JSON.parse(r.stdout);
  return {
    width: probe.streams[0].width as number,
    height: probe.streams[0].height as number,
    durationSeconds: Number(probe.format.duration),
  };
}
