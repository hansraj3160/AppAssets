import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import {
  type Canvas,
  type CanvasGradient,
  createCanvas,
  type Image,
  loadImage,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import {
  type BacklightConfig,
  backgroundToCss,
  type GlowPoint,
  type PanoramaSliceInfo,
  type PatternConfig,
  parseBackground,
  type StructuredBackground,
  withOpacity,
} from "./background.ts";
import type { CaptureManifest } from "./capture.ts";
import {
  type Decoration,
  deviceFrame,
  isPreview,
  isRtlLocale,
  type LoadedConfig,
  resolveCopyColors,
  resolvedScenes,
  type Theme,
} from "./config.ts";
import { execOrThrow } from "./exec.ts";
import {
  ensureCjkFontsLoaded,
  needsCjkFont,
  registerFonts,
  withGlyphFallback,
} from "./fonts.ts";
import { pngInfo } from "./image.ts";
import { BADGE, type Composition, compose, SCREEN_SHADOW, TYPE } from "./layouts.ts";
import { DEVICES, type DeviceKey, PREVIEW, SCREENSHOT_PIXEL_FORMAT } from "./specs.ts";

async function readManifest(cfg: LoadedConfig, deviceKey: DeviceKey): Promise<CaptureManifest> {
  const file = join(cfg.outDir, "raw", deviceKey, "manifest.json");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    throw new Error(`No capture manifest at ${file}. Run: appassets capture`);
  }
}

/**
 * Composites each raw screenshot into its layout on the theme background:
 * copy, decorations, then the device(s), bezel on top. Drawn with a 2D
 * canvas from the geometry compose() returns, the same call the studio's
 * ScreenshotScene makes, so the export is what the browser showed. A
 * panorama layout draws once at span × width and is sliced into store-sized
 * tiles.
 */
export async function renderScreenshots(cfg: LoadedConfig, deviceKey: DeviceKey, locale: string) {
  const spec = DEVICES[deviceKey];
  const manifest = await readManifest(cfg, deviceKey);
  // Releases before 0.3 keyed this dir by spec.label; a stale label dir
  // would otherwise ride along into the export zip.
  if (spec.label !== deviceKey)
    await rm(join(cfg.outDir, "screenshots", spec.label), { recursive: true, force: true });
  const outDir = join(cfg.outDir, "screenshots", deviceKey, locale);
  await mkdir(outDir, { recursive: true });
  // A layout change renumbers the files; stale ones would otherwise be exported.
  for (const name of await readdir(outDir)) {
    if (name.endsWith(".png")) await rm(join(outDir, name), { force: true });
  }
  // Each device brings its own bezel art and geometry: the config's frame on
  // iOS, the bundled (or config-supplied) Pixel art on android. A device spec
  // can force screen-only rendering, which drops the bezel entirely.
  const { image, geom } = deviceFrame(cfg, deviceKey);
  const screenOnly = Boolean(cfg.theme.screenOnly || spec.screenOnly);
  const bezel = screenOnly ? null : await loadImage(image);

  const tile = spec.screenshot;
  const findShot = (sceneId: string) => {
    const shot = manifest.screenshots.find((s) => s.sceneId === sceneId);
    if (!shot)
      throw new Error(`Scene "${sceneId}" is in the config but not in the capture manifest.`);
    return shot;
  };

  // Output numbers count tiles, so a panorama takes two consecutive slots.
  let slot = 0;
  const jobs = resolvedScenes(cfg).map((r) => {
    const first = slot;
    slot += r.layout.span;
    return { ...r, first };
  });

  // Register compact Latin WOFF2 fonts eagerly, and lazy-load CJK fonts only
  // when rendering Chinese/CJK locales, CJK copy, or explicit Noto Sans SC.
  registerFonts();
  const renderedTexts: Array<string | undefined> = [];
  for (const { scene } of jobs) {
    renderedTexts.push(scene.headline[locale] ?? scene.headline["en-US"]);
    if (scene.subhead) renderedTexts.push(scene.subhead[locale] ?? scene.subhead["en-US"]);
    for (const d of [...(cfg.theme.decorations ?? []), ...(scene.decorations ?? [])]) {
      if (d.kind === "badge") renderedTexts.push(d.text[locale] ?? d.text["en-US"]);
    }
  }
  const useCjk = needsCjkFont({
    locale,
    fontFamily: cfg.theme.fontFamily,
    texts: renderedTexts,
  });
  if (useCjk) {
    await ensureCjkFontsLoaded();
  }

  const totalTiles = jobs.reduce((sum, j) => sum + j.layout.span, 0);
  const totalWidth = totalTiles * tile.width;

  const files = await Promise.all(
    jobs.map(async ({ scene, layout, secondScene, first }) => {
      console.log(`  frame ${scene.id}`);
      const c = compose(layout, tile, cfg.theme, { screenOnly, geom });

      const canvas = createCanvas(c.width, c.height);
      const ctx = canvas.getContext("2d");
      const background = scene.background ?? cfg.theme.background;
      const transparent = isTransparent(background);
      if (!transparent) {
        let customBgImage: Image | null = null;
        const parsedBg = parseBackground(background);
        if (parsedBg.type === "custom-image" && parsedBg.src) {
          try {
            const srcPath =
              parsedBg.src.startsWith("data:") ||
              parsedBg.src.startsWith("http://") ||
              parsedBg.src.startsWith("https://")
                ? parsedBg.src
                : resolve(cfg.root, parsedBg.src);
            customBgImage = await loadImage(srcPath);
          } catch (err) {
            console.warn(`Failed to load custom background image: ${err}`);
          }
        }

        const sliceInfo: PanoramaSliceInfo = {
          sliceIndex: first,
          totalSlices: totalTiles,
          globalX: first * tile.width,
          totalWidth: totalWidth,
          sliceWidth: c.width,
          sliceHeight: c.height,
        };
        const pattern: PatternConfig | undefined = cfg.theme.backgroundPattern
          ? {
              type: cfg.theme.backgroundPattern,
              opacity: cfg.theme.patternOpacity ?? 0.05,
              color: cfg.theme.patternColor,
            }
          : undefined;

        renderBackground(ctx, background, c.width, c.height, {
          pattern,
          panoramaOffset: cfg.theme.panoramaMode ? sliceInfo : undefined,
          customImage: customBgImage ?? undefined,
        });
      }

      if (c.copy) {
        const resolvedColors = resolveCopyColors(cfg.theme, background);
        drawCopy(
          ctx,
          c.copy,
          { width: c.designWidth, height: c.height },
          { ...cfg.theme, ...resolvedColors },
          {
            headline: pick(scene.headline, locale, scene.id, "headline"),
            subhead: scene.subhead ? pick(scene.subhead, locale, scene.id, "subhead") : undefined,
          },
          resolvedColors,
          locale,
          useCjk,
        );
      }

      await drawDecorations(
        ctx,
        cfg,
        [...(cfg.theme.decorations ?? []), ...(scene.decorations ?? [])],
        c,
        tile,
        locale,
        scene.id,
        useCjk,
      );

      for (const device of c.devices) {
        const sceneId = device.capture === "secondary" ? secondScene || scene.id : scene.id;
        const capture = await loadImage(findShot(sceneId).file);
        drawDevice(
          ctx,
          device,
          capture,
          bezel,
          { width: c.designWidth },
          cfg.theme.deviceBacklight,
        );
      }

      const out: string[] = [];
      for (let i = 0; i < layout.span; i++) {
        const slice = createCanvas(tile.width, tile.height);
        slice.getContext("2d").drawImage(canvas, -i * tile.width, 0);
        const suffix = layout.span > 1 ? `-${i + 1}` : "";
        const name = `${String(first + i + 1).padStart(2, "0")}-${scene.id}${suffix}.png`;
        out.push(await writePng(slice, outDir, name, transparent));
      }
      return out;
    }),
  );
  return files.flat();
}

/**
 * Writes the canvas as an opaque PNG. App Store rejects screenshots carrying
 * an alpha channel, and the canvas always encodes RGBA, so ffmpeg strips it
 * on the way out. A transparent background keeps the alpha channel: those
 * files are for compositing elsewhere, not for upload.
 */
async function writePng(
  canvas: Canvas,
  outDir: string,
  name: string,
  keepAlpha = false,
): Promise<string> {
  const final = join(outDir, name);
  if (keepAlpha) {
    await writeFile(final, await canvas.encode("png"));
    return final;
  }
  const raw = join(outDir, `.${name}.rgba.png`);
  await writeFile(raw, await canvas.encode("png"));
  await execOrThrow("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    raw,
    "-pix_fmt",
    SCREENSHOT_PIXEL_FORMAT,
    final,
  ]);
  await rm(raw, { force: true });
  return final;
}

/** The headline and subhead, top-anchored or bottom-anchored per the composition. */
function drawCopy(
  ctx: SKRSContext2D,
  copy: NonNullable<Composition["copy"]>,
  tile: { width: number; height: number },
  theme: Theme,
  text: { headline: string; subhead?: string },
  colors?: { headlineColor?: string; subheadColor?: string },
  locale?: string,
  includeCjk = false,
) {
  const rtl = isRtlLocale(locale);
  const family = withGlyphFallback(theme.fontFamily, { includeCjk });
  const headlineColor = colors?.headlineColor ?? theme.headlineColor;
  const subheadColor = colors?.subheadColor ?? theme.subheadColor;
  const scale = theme.fontSizeScale ?? 1;
  const blocks = [
    {
      text: text.headline,
      font: `${TYPE.headlineWeight} ${tile.width * TYPE.headlineSize * scale}px ${family}`,
      color: headlineColor,
      lineHeight: TYPE.headlineLineHeight,
      letterSpacing: tile.width * TYPE.headlineTracking * scale,
    },
    ...(text.subhead
      ? [
          {
            text: text.subhead,
            font: `${TYPE.subheadWeight} ${tile.width * TYPE.subheadSize * scale}px ${family}`,
            color: subheadColor,
            lineHeight: TYPE.subheadLineHeight,
            letterSpacing: 0,
          },
        ]
      : []),
  ].map((b) => ({ ...b, lines: wrapLines(ctx, b.text, b.font, b.letterSpacing, copy.maxWidth) }));

  const gap = tile.height * TYPE.gap;
  const total =
    blocks.reduce((sum, b) => sum + b.lines.length * fontSize(b.font) * b.lineHeight, 0) +
    gap * (blocks.length - 1);
  let y = copy.position === "top" ? copy.y : copy.y - total;
  const align = rtl && copy.align === "left" ? "right" : copy.align;
  const x = rtl && copy.align === "left" ? tile.width - copy.x : copy.x;

  for (const b of blocks) {
    y = drawLines(ctx, { ...b, x, y, align, rtl });
    y += gap;
  }
}

/**
 * One device: the capture cover-fitted and clipped to the rounded screen,
 * then the bezel over it (its cutout is transparent), or a drop shadow
 * under the bare screen when there is no bezel. Rotated about its centre.
 */
function drawDevice(
  ctx: SKRSContext2D,
  device: Composition["devices"][number],
  capture: Image,
  bezel: Image | null,
  tile: { width: number },
  backlight?: boolean | BacklightConfig,
) {
  const { frame, screen } = device;
  ctx.save();
  if (device.rotate) {
    const cx = frame.left + frame.width / 2;
    const cy = frame.top + frame.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((device.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // 1. Ambient backlight halo behind phone
  if (backlight) {
    drawDeviceBacklight(ctx, device, tile, backlight);
  }

  // 2. Realistic shadows behind device
  drawDeviceShadow(ctx, device, tile, Boolean(bezel));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(screen.left, screen.top, screen.width, screen.height, screen.radius);
  ctx.clip();
  const scale = Math.max(screen.width / capture.width, screen.height / capture.height);
  const w = capture.width * scale;
  const h = capture.height * scale;
  ctx.drawImage(
    capture,
    screen.left + (screen.width - w) / 2,
    screen.top + (screen.height - h) / 2,
    w,
    h,
  );
  ctx.restore();
  if (bezel) ctx.drawImage(bezel, frame.left, frame.top, frame.width, frame.height);
  ctx.restore();
}

/** Badge pills in the composition's corners and image layers placed by tile fractions. */
async function drawDecorations(
  ctx: SKRSContext2D,
  cfg: LoadedConfig,
  decorations: Decoration[],
  _c: Composition,
  tile: { width: number; height: number },
  locale: string,
  sceneId: string,
  includeCjk = false,
) {
  for (const d of decorations) {
    if (d.kind === "badge") {
      const text = pick(d.text, locale, sceneId, "badge");
      const font = `${BADGE.weight} ${tile.width * BADGE.fontSize}px ${withGlyphFallback(cfg.theme.fontFamily, { includeCjk })}`;
      ctx.font = font;
      ctx.letterSpacing = "0px";
      const size = fontSize(font);
      const w = ctx.measureText(text).width + 2 * tile.width * BADGE.padX;
      const h = size * 1.2 + 2 * tile.width * BADGE.padY;
      const inset = Math.min(tile.width, tile.height) * BADGE.inset;
      const slice = d.slice ?? 0;
      const sliceOffset = slice * tile.width;
      const left = sliceOffset + (d.position.endsWith("left") ? inset : tile.width - inset - w);
      const top = d.position.startsWith("top") ? inset : tile.height - inset - h;
      ctx.fillStyle = d.background ?? "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.roundRect(left, top, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = d.color ?? cfg.theme.headlineColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, left + w / 2, top + h / 2);
    } else {
      const image = await loadImage(resolve(cfg.root, d.src));
      const w = tile.width * d.width;
      const h = (w * image.height) / image.width;
      const left = tile.width * d.x;
      const top = tile.height * d.y;
      ctx.save();
      if (d.rotate) {
        ctx.translate(left + w / 2, top + h / 2);
        ctx.rotate((d.rotate * Math.PI) / 180);
        ctx.translate(-(left + w / 2), -(top + h / 2));
      }
      ctx.drawImage(image, left, top, w, h);
      ctx.restore();
    }
  }
}

const fontSize = (font: string) => Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1]);

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

/**
 * Splits a paragraph at the points a line may break. Splitting on spaces
 * alone would leave CJK copy as one unbreakable run (those scripts use no
 * spaces), so segmentation finds the word boundaries instead. Whitespace and
 * punctuation glue to the preceding unit, so a line never starts with them.
 */
function breakableUnits(paragraph: string): string[] {
  const units: string[] = [];
  for (const s of segmenter.segment(paragraph)) {
    if (s.isWordLike || units.length === 0) units.push(s.segment);
    else units[units.length - 1] += s.segment;
  }
  return units;
}

/** Word-wraps text to `maxWidth`, honouring explicit newlines. */
export function wrapLines(
  ctx: SKRSContext2D,
  text: string,
  font: string,
  letterSpacing: number,
  maxWidth: number,
): string[] {
  ctx.font = font;
  ctx.letterSpacing = `${letterSpacing}px`;
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const unit of breakableUnits(paragraph.replace(/\s+/g, " ").trim())) {
      const next = line + unit;
      if (line && ctx.measureText(next.trimEnd()).width > maxWidth) {
        lines.push(line.trimEnd());
        line = unit;
      } else {
        line = next;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** Draws wrapped lines from `y` down. Returns the y below the last line. */
function drawLines(
  ctx: SKRSContext2D,
  o: {
    lines: string[];
    font: string;
    color: string;
    lineHeight: number;
    letterSpacing: number;
    x: number;
    y: number;
    align: "left" | "center" | "right";
    rtl?: boolean;
  },
): number {
  ctx.save();
  if (o.rtl && "direction" in ctx) {
    try {
      (ctx as any).direction = "rtl";
    } catch {
      // ignore if unsupported
    }
  }
  ctx.font = o.font;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align;
  ctx.textBaseline = "top";
  ctx.letterSpacing = `${o.letterSpacing}px`;
  const size = fontSize(o.font);
  const step = size * o.lineHeight;
  let y = o.y;
  for (const line of o.lines) {
    // Centre the glyph box inside the line box, as CSS line-height does.
    ctx.fillText(line, o.x, y + (step - size) / 2);
    y += step;
  }
  ctx.restore();
  return y;
}

/** Whether a CSS background asks for no fill at all. */
function isTransparent(css: string): boolean {
  return css.trim().toLowerCase() === "transparent";
}

/**
 * Draws an ambient halo backlight behind the device frame.
 */
export function drawDeviceBacklight(
  ctx: SKRSContext2D,
  device: Composition["devices"][number],
  _tile: { width: number },
  backlight?: boolean | BacklightConfig,
) {
  if (!backlight) return;
  if (typeof backlight === "object" && backlight.enabled === false) return;

  const { frame } = device;
  const cx = frame.left + frame.width / 2;
  const cy = frame.top + frame.height * 0.45;
  const rx = frame.width * 0.85;
  const ry = frame.height * 0.65;

  const haloColor = (typeof backlight === "object" && backlight.color) || "rgba(56, 189, 248, 0.4)";
  const intensity =
    typeof backlight === "object" && backlight.intensity !== undefined ? backlight.intensity : 0.45;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, withOpacity(haloColor, intensity));
  grad.addColorStop(0.5, withOpacity(haloColor, intensity * 0.4));
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws realistic drop shadows behind the device frame (sharp contact + soft ambient).
 */
export function drawDeviceShadow(
  ctx: SKRSContext2D,
  device: Composition["devices"][number],
  tile: { width: number },
  isBezel: boolean,
) {
  const { frame, screen } = device;
  if (!isBezel) {
    ctx.save();
    ctx.shadowColor = SCREEN_SHADOW.color;
    ctx.shadowBlur = tile.width * SCREEN_SHADOW.blur;
    ctx.shadowOffsetY = tile.width * SCREEN_SHADOW.offsetY;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.roundRect(screen.left, screen.top, screen.width, screen.height, screen.radius);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Sharp contact shadow under phone bottom
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = tile.width * 0.022;
  ctx.shadowOffsetY = tile.width * 0.016;
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.beginPath();
  ctx.roundRect(
    frame.left + 3,
    frame.top + 3,
    frame.width - 6,
    frame.height - 6,
    screen.radius * 1.12,
  );
  ctx.fill();
  ctx.restore();

  // Diffused ambient elevation blur around phone
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = tile.width * 0.085;
  ctx.shadowOffsetY = tile.width * 0.04;
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.beginPath();
  ctx.roundRect(
    frame.left + 4,
    frame.top + 4,
    frame.width - 8,
    frame.height - 8,
    screen.radius * 1.12,
  );
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a solid or simple background fill onto the canvas.
 */
export function drawBaseBackground(
  ctx: SKRSContext2D,
  base: string,
  width: number,
  height: number,
) {
  ctx.save();
  if (base.startsWith("linear-gradient")) {
    ctx.fillStyle = paint(ctx, base, width, height);
  } else {
    ctx.fillStyle = base;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Renders an Aurora mesh glow with multi-point radial light sources.
 */
export function drawAuroraGlow(
  ctx: SKRSContext2D,
  glowPoints: GlowPoint[],
  width: number,
  height: number,
  panoramaOffset?: PanoramaSliceInfo,
) {
  const totalW = panoramaOffset ? panoramaOffset.totalWidth : width;
  for (const pt of glowPoints) {
    const cx = panoramaOffset
      ? panoramaOffset.totalWidth * pt.x - panoramaOffset.globalX
      : width * pt.x;
    const cy = height * pt.y;
    const radius = Math.max(totalW, height) * (pt.radius || 0.6);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const glowColor = withOpacity(pt.color, pt.opacity ?? 0.4);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(0.5, withOpacity(pt.color, (pt.opacity ?? 0.4) * 0.4));
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

/**
 * Draws a subtle tech pattern overlay (micro dot grid, isometric dots, or fine blueprint grid lines).
 */
export function drawPatternOverlay(
  ctx: SKRSContext2D,
  pattern: PatternConfig,
  width: number,
  height: number,
  panoramaOffset?: PanoramaSliceInfo,
) {
  if (!pattern || pattern.type === "none" || pattern.opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, pattern.opacity));
  const color = pattern.color || "#FFFFFF";
  const spacing =
    pattern.spacing && pattern.spacing > 1
      ? pattern.spacing
      : Math.round(width * (pattern.spacing || 0.035));
  const xOffset = panoramaOffset ? -(panoramaOffset.globalX % spacing) : 0;

  if (pattern.type === "dot-grid") {
    const dotRadius = Math.max(1.5, spacing * 0.04);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let x = xOffset; x <= width + spacing; x += spacing) {
      for (let y = 0; y <= height + spacing; y += spacing) {
        ctx.moveTo(x + dotRadius, y);
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  } else if (pattern.type === "isometric-dot") {
    const dotRadius = Math.max(1.5, spacing * 0.04);
    ctx.fillStyle = color;
    ctx.beginPath();
    let rowIndex = 0;
    for (let y = 0; y <= height + spacing; y += spacing * 0.866) {
      const stagger = rowIndex % 2 === 1 ? spacing * 0.5 : 0;
      for (let x = xOffset + stagger; x <= width + spacing; x += spacing) {
        ctx.moveTo(x + dotRadius, y);
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
      rowIndex++;
    }
    ctx.fill();
  } else if (pattern.type === "blueprint") {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, spacing * 0.02);
    ctx.beginPath();
    for (let x = xOffset; x <= width + spacing; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height + spacing; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a custom background image with cover or contain scaling,
 * accounting for panorama offsets when present.
 */
export function drawCoverImage(
  ctx: SKRSContext2D,
  img: Image,
  width: number,
  height: number,
  fit: "cover" | "contain" = "cover",
  panoramaOffset?: PanoramaSliceInfo,
) {
  const targetW = panoramaOffset ? panoramaOffset.totalWidth : width;
  const targetH = height;
  const imgRatio = img.width / img.height;
  const targetRatio = targetW / targetH;

  let scaledW = targetW;
  let scaledH = targetH;
  let offX = 0;
  let offY = 0;

  if (fit === "cover") {
    if (imgRatio > targetRatio) {
      scaledH = targetH;
      scaledW = img.width * (targetH / img.height);
      offX = (targetW - scaledW) / 2;
    } else {
      scaledW = targetW;
      scaledH = img.height * (targetW / img.width);
      offY = (targetH - scaledH) / 2;
    }
  } else {
    // contain
    if (imgRatio > targetRatio) {
      scaledW = targetW;
      scaledH = img.height * (targetW / img.width);
      offY = (targetH - scaledH) / 2;
    } else {
      scaledH = targetH;
      scaledW = img.width * (targetH / img.height);
      offX = (targetW - scaledW) / 2;
    }
  }

  const finalX = panoramaOffset ? offX - panoramaOffset.globalX : offX;
  const finalY = offY;

  ctx.drawImage(img, finalX, finalY, scaledW, scaledH);
}

/**
 * Composites the full screenshot background: base fill/gradient, aurora glow,
 * pattern overlay, and panorama coordinate support.
 */
export function renderBackground(
  ctx: SKRSContext2D,
  background: string | StructuredBackground,
  width: number,
  height: number,
  options?: {
    pattern?: PatternConfig;
    panoramaOffset?: PanoramaSliceInfo;
    customImage?: Image;
  },
) {
  const bg = parseBackground(background);

  if (bg.type === "solid") {
    if (bg.color !== "transparent" && bg.color !== "") {
      ctx.save();
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  } else if (bg.type === "linear-gradient") {
    ctx.save();
    if (options?.panoramaOffset) {
      const rad = (bg.angle * Math.PI) / 180;
      const totalW = options.panoramaOffset.totalWidth;
      const length = Math.abs(totalW * Math.sin(rad)) + Math.abs(height * Math.cos(rad));
      const dx = (Math.sin(rad) * length) / 2;
      const dy = (-Math.cos(rad) * length) / 2;
      const globalCx = totalW / 2 - options.panoramaOffset.globalX;
      const globalCy = height / 2;
      const grad = ctx.createLinearGradient(
        globalCx - dx,
        globalCy - dy,
        globalCx + dx,
        globalCy + dy,
      );
      for (const s of bg.stops) {
        grad.addColorStop(s.at ?? 0, s.color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = paint(ctx, backgroundToCss(bg), width, height);
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  } else if (bg.type === "aurora") {
    drawBaseBackground(ctx, bg.baseColor, width, height);
    drawAuroraGlow(ctx, bg.glowPoints, width, height, options?.panoramaOffset);
  } else if (bg.type === "tech-grid") {
    drawBaseBackground(ctx, bg.baseColor, width, height);
    if (bg.linearGradient) {
      ctx.save();
      ctx.fillStyle = paint(ctx, backgroundToCss(bg.linearGradient), width, height);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    if (bg.glowPoints && bg.glowPoints.length > 0) {
      drawAuroraGlow(ctx, bg.glowPoints, width, height, options?.panoramaOffset);
    }
    drawPatternOverlay(ctx, bg.pattern, width, height, options?.panoramaOffset);
  } else if (bg.type === "custom-image") {
    ctx.save();
    if (options?.customImage) {
      drawCoverImage(ctx, options.customImage, width, height, bg.fit, options?.panoramaOffset);
      if (bg.overlayColor && bg.overlayColor !== "transparent") {
        ctx.fillStyle = bg.overlayColor;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = bg.overlayColor || "#000000";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  // Draw standalone pattern overlay if configured via options and not already drawn
  if (options?.pattern && bg.type !== "tech-grid") {
    drawPatternOverlay(ctx, options.pattern, width, height, options?.panoramaOffset);
  }
}

/**
 * A canvas fill for a CSS background: a plain color, or a `linear-gradient()`
 * with an optional angle / `to <side>` and color stops with optional
 * percentages. Anything else is handed to the canvas as-is.
 */
export function paint(
  ctx: SKRSContext2D,
  css: string,
  width: number,
  height: number,
): string | CanvasGradient {
  const m = css.trim().match(/^linear-gradient\((.*)\)$/s);
  if (!m) return css;
  const parts = splitTopLevel(m[1]!);

  let angle = 180;
  const first = parts[0]!.trim();
  const deg = first.match(/^(-?\d+(?:\.\d+)?)deg$/);
  if (deg) {
    angle = Number(deg[1]);
    parts.shift();
  } else if (first.startsWith("to ")) {
    const sides: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 };
    const words = first.slice(3).split(/\s+/);
    const angles = words.map((w) => sides[w]).filter((a): a is number => a !== undefined);
    if (angles.length === 2 && angles.includes(0) && angles.includes(270)) angle = 315;
    else if (angles.length === 2) angle = (angles[0]! + angles[1]!) / 2;
    else if (angles.length === 1) angle = angles[0]!;
    parts.shift();
  }

  // CSS gradient line: through the centre, long enough that the corners meet
  // the first and last stop exactly.
  const rad = (angle * Math.PI) / 180;
  const length = Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad));
  const dx = (Math.sin(rad) * length) / 2;
  const dy = (-Math.cos(rad) * length) / 2;
  const gradient = ctx.createLinearGradient(
    width / 2 - dx,
    height / 2 - dy,
    width / 2 + dx,
    height / 2 + dy,
  );

  const stops = parts.map((p) => {
    const s = p.trim().match(/^(.*?)(?:\s+(-?\d+(?:\.\d+)?)%)?$/);
    return { color: s![1]!.trim(), at: s![2] !== undefined ? Number(s![2]) / 100 : undefined };
  });
  if (stops.length && stops[0]!.at === undefined) stops[0]!.at = 0;
  if (stops.length && stops[stops.length - 1]!.at === undefined) stops[stops.length - 1]!.at = 1;
  for (let i = 0; i < stops.length; i++) {
    if (stops[i]!.at !== undefined) continue;
    let j = i;
    while (stops[j]!.at === undefined) j++;
    const from = stops[i - 1]!.at!;
    const to = stops[j]!.at!;
    for (let k = i; k < j; k++) stops[k]!.at = from + ((to - from) * (k - i + 1)) / (j - i + 1);
  }
  let last = 0;
  for (const s of stops) {
    last = Math.min(1, Math.max(last, s.at!));
    gradient.addColorStop(last, s.color);
  }
  return gradient;
}

/** Splits on commas that are not inside parentheses (rgb(), hsl()). */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Normalizes file paths for FFmpeg concat demuxer (normalizes backslashes for Windows and escapes single quotes).
 */
export function formatFfmpegConcatList(filePaths: string[]): string {
  return filePaths
    .map((file) => `file '${file.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");
}

/**
 * Joins the raw segment clips into one plain screen recording at the spec's
 * preview size. App Store previews must be the device screen and nothing
 * else, so no bezel, background or captions are added; only an audio track,
 * which Apple requires even when it is silent. The android video follows the
 * same shape, destined for the YouTube promo link the user posts themselves.
 */
export async function renderPreview(cfg: LoadedConfig, deviceKey: DeviceKey, locale: string) {
  const spec = DEVICES[deviceKey];
  const scene = cfg.scenes.find(isPreview);
  if (!scene) return null;
  if (!spec.preview) {
    console.log(`  ${deviceKey} has no preview pipeline`);
    return null;
  }
  const manifest = await readManifest(cfg, deviceKey);
  if (!manifest.preview)
    throw new Error("No preview clips in the capture manifest. Run: appassets capture");

  const clips = scene.segments.map((segment) => {
    const clip = manifest.preview!.clips.find((c) => c.segmentId === segment.id);
    if (!clip)
      throw new Error(`Segment "${segment.id}" is in the config but not in the capture manifest.`);
    return clip;
  });

  const seconds = clips.reduce((s, c) => s + c.durationSeconds, 0);
  // The 15-30s window is Apple's upload rule; a YouTube video has no bounds.
  if (
    (spec.platform === "ios" || spec.platform === "ipad") &&
    (seconds < PREVIEW.minSeconds || seconds > PREVIEW.maxSeconds)
  ) {
    throw new Error(
      `Preview is ${seconds.toFixed(1)}s; Apple requires ${PREVIEW.minSeconds}-${PREVIEW.maxSeconds}s. ` +
        `Adjust the segment flows or their holdSeconds and re-capture.`,
    );
  }

  if (spec.label !== deviceKey)
    await rm(join(cfg.outDir, "previews", spec.label), { recursive: true, force: true });
  const outDir = join(cfg.outDir, "previews", deviceKey, locale);
  await mkdir(outDir, { recursive: true });
  const list = join(outDir, `.${scene.id}.clips.txt`);
  await writeFile(list, formatFfmpegConcatList(clips.map((c) => c.file)));
  const final = join(outDir, `${scene.id}.mp4`);

  const { width, height } = spec.preview;
  const audio = scene.audio
    ? ["-i", resolve(cfg.root, scene.audio), "-filter:a", "volume=0.35"]
    : ["-f", "lavfi", "-i", `anullsrc=r=${PREVIEW.audioSampleRate}:cl=stereo`];

  console.log(`  render preview (${seconds.toFixed(1)}s)`);
  await execOrThrow("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    ...audio,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    // Cover the upload size and crop the sliver the aspect ratios disagree on.
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height},fps=${PREVIEW.fps},format=yuv420p`,
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-b:v",
    PREVIEW.videoBitrate,
    "-c:a",
    "aac",
    "-b:a",
    PREVIEW.audioBitrate,
    "-ar",
    String(PREVIEW.audioSampleRate),
    "-shortest",
    "-movflags",
    "+faststart",
    final,
  ]);
  await rm(list, { force: true });

  return final;
}

/**
 * Resolves localized copy with smart fallback:
 * 1. Exact locale (e.g. "hi-IN")
 * 2. Language-only code (e.g. "hi")
 * 3. Base/default locale ("en-US" or "en")
 * 4. First available translation in the map
 */
export function pick(
  map: Record<string, string>,
  locale: string,
  sceneId: string,
  field: string,
): string {
  if (!map) {
    throw new Error(`Scene "${sceneId}" has no ${field} mapping.`);
  }
  // 1. Exact locale match
  if (map[locale] !== undefined) {
    return map[locale];
  }
  // 2. Language-only prefix match (e.g. "hi" for "hi-IN")
  const lang = locale.split("-")[0];
  if (lang && map[lang] !== undefined) {
    return map[lang];
  }
  // 3. Fallback to default en-US or en
  if (map["en-US"] !== undefined) {
    return map["en-US"];
  }
  if (map.en !== undefined) {
    return map.en;
  }
  // 4. Fallback to first available translation
  const values = Object.values(map);
  if (values.length > 0 && values[0] !== undefined) {
    return values[0];
  }
  throw new Error(`Scene "${sceneId}" has no ${field} for locale "${locale}".`);
}

/** Compares finished assets against the Apple spec table and prints a report. */
export async function verify(
  cfg: LoadedConfig,
  deviceKey: DeviceKey,
  locale: string,
): Promise<boolean> {
  const spec = DEVICES[deviceKey];
  let ok = true;

  const shotDir = join(cfg.outDir, "screenshots", deviceKey, locale);
  for (const file of await filesWithExt(shotDir, ".png")) {
    const { width, height, hasAlpha: alpha } = await pngInfo(file);
    // A transparent theme background keeps its alpha on purpose.
    const alphaOk = !alpha || isTransparent(cfg.theme.background);
    const good = width === spec.screenshot.width && height === spec.screenshot.height && alphaOk;
    ok &&= good;
    console.log(
      `  ${good ? "ok  " : "FAIL"} ${basename(file)}  ${width}x${height}` +
        `${alpha ? (alphaOk ? "  transparent (not for upload)" : "  alpha channel present") : ""}` +
        `${good ? "" : `  expected ${spec.screenshot.width}x${spec.screenshot.height}, no alpha`}`,
    );
  }

  // A null preview spec means no video pipeline; screenshots are the whole story.
  const previewSpec = spec.preview;
  if (!previewSpec) return ok;

  const previewDir = join(cfg.outDir, "previews", deviceKey, locale);
  for (const file of await filesWithExt(previewDir, ".mp4")) {
    const r = await execOrThrow("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name,width,height,avg_frame_rate,sample_rate,channels:format=duration",
      "-of",
      "json",
      file,
    ]);
    const probe = JSON.parse(r.stdout);
    const video = probe.streams.find((s: any) => s.codec_type === "video");
    const audio = probe.streams.find((s: any) => s.codec_type === "audio");
    const duration = Number(probe.format.duration);
    const fps = evalRatio(video?.avg_frame_rate ?? "0/1");
    const bytes = (await stat(file)).size;

    // Duration and file-size bounds are Apple upload rules; the android video
    // goes to YouTube, so only the pipeline's own output is checked there.
    const appleBounds = spec.platform === "ios" || spec.platform === "ipad";
    const checks: Array<[string, boolean, string]> = [
      [
        "size",
        video?.width === previewSpec.width && video?.height === previewSpec.height,
        `${video?.width}x${video?.height} (need ${previewSpec.width}x${previewSpec.height})`,
      ],
      ["codec", video?.codec_name === "h264", String(video?.codec_name)],
      ["fps", fps <= PREVIEW.fps + 0.01, fps.toFixed(2)],
      [
        "duration",
        !appleBounds || (duration >= PREVIEW.minSeconds && duration <= PREVIEW.maxSeconds),
        `${duration.toFixed(1)}s`,
      ],
      [
        "audio",
        Boolean(audio) && audio.codec_name === "aac",
        audio ? `${audio.codec_name} ${audio.sample_rate}Hz` : "none",
      ],
      [
        "filesize",
        !appleBounds || bytes <= PREVIEW.maxBytes,
        `${(bytes / 1024 / 1024).toFixed(1)} MB`,
      ],
    ];
    for (const [name, good, detail] of checks) {
      ok &&= good;
      console.log(`  ${good ? "ok  " : "FAIL"} ${basename(file)}  ${name}: ${detail}`);
    }
  }

  return ok;
}

/** Absolute paths of the files in `dir` with the extension, sorted; empty when the dir is missing. */
async function filesWithExt(dir: string, ext: string): Promise<string[]> {
  const names = await readdir(dir).catch(() => [] as string[]);
  return names
    .filter((n) => n.endsWith(ext))
    .sort()
    .map((n) => join(dir, n));
}

const evalRatio = (r: string) => {
  const [n, d] = r.split("/").map(Number);
  return d ? n / d : 0;
};
