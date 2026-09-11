import { existsSync, readdirSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { backgroundLuminance, isScreenshot, type LoadedConfig } from "./config.ts";
import { paint, wrapLines } from "./render.ts";
import type { DeviceKey } from "./specs.ts";

export type BannerType = "google-play" | "product-hunt" | "x-twitter" | "instagram-square";

export interface BannerSpec {
  key: BannerType;
  width: number;
  height: number;
  label: string;
  description: string;
  storePath: string;
}

export const BANNER_SPECS: Record<BannerType, BannerSpec> = {
  "google-play": {
    key: "google-play",
    width: 1024,
    height: 500,
    label: "Google Play Feature Graphic",
    description: "Mandatory 1024x500 banner for Google Play Console release",
    storePath: "GooglePlay/feature-graphic.png",
  },
  "product-hunt": {
    key: "product-hunt",
    width: 1270,
    height: 760,
    label: "Product Hunt Gallery Banner",
    description: "Featured launch banner for Product Hunt gallery",
    storePath: "Marketing/product-hunt-1270x760.png",
  },
  "x-twitter": {
    key: "x-twitter",
    width: 1200,
    height: 675,
    label: "X / Twitter Promo Card",
    description: "16:9 social share promo card for X/Twitter & LinkedIn",
    storePath: "Marketing/x-twitter-1200x675.png",
  },
  "instagram-square": {
    key: "instagram-square",
    width: 1080,
    height: 1080,
    label: "Instagram Square Post",
    description: "1:1 square promo card for Instagram, Threads, and feed posts",
    storePath: "Marketing/instagram-square-1080x1080.png",
  },
};

export interface RenderBannerOptions {
  cfg: LoadedConfig;
  type: BannerType;
  sceneId?: string;
  secondarySceneId?: string;
  tertiarySceneId?: string;
  locale?: string;
  deviceKey?: DeviceKey;
  deviceCount?: "single" | "duo" | "trio";
  kickerHeadline?: string;
  customHeadline?: string;
  customTagline?: string;
  customIcon?: string;
  benefits?: string[];
  customBackground?: string;
  layout?: "split" | "center";
  mockupStyle?: "card" | "screen";
  showWaves?: boolean;
  scale?: 1 | 2;
  retina?: boolean;
}

/**
 * Scans directories for all candidate screenshots.
 */
function getAllScreenshotPaths(
  outDir: string,
  deviceKey: string,
  locale: string,
  mockupStyle: "card" | "screen" = "card",
): string[] {
  const screenshotsDirs = [
    join(outDir, "screenshots", deviceKey, locale),
    join(outDir, "screenshots", "iphone-6.9", locale),
    join(outDir, "screenshots", "pixel-10-pro", locale),
  ];
  const rawDirs = [
    join(outDir, "raw", deviceKey),
    join(outDir, "raw", "iphone-6.9"),
    join(outDir, "raw", "pixel-10-pro"),
  ];

  const candidatesDirs =
    mockupStyle === "screen" ? [...rawDirs, ...screenshotsDirs] : [...screenshotsDirs, ...rawDirs];

  const paths: string[] = [];
  const seen = new Set<string>();

  for (const dir of candidatesDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir).filter(
        (f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg"),
      );
      for (const f of files) {
        if (!seen.has(f)) {
          seen.add(f);
          paths.push(join(dir, f));
        }
      }
    } catch {}
  }
  return paths;
}

/**
 * Finds the best matching screenshot file on disk for a given scene.
 */
function findScreenshotPath(
  outDir: string,
  deviceKey: string,
  locale: string,
  sceneId?: string,
  mockupStyle: "card" | "screen" = "card",
): string | null {
  const all = getAllScreenshotPaths(outDir, deviceKey, locale, mockupStyle);
  if (all.length === 0) return null;
  if (!sceneId) return all[0] ?? null;

  const exact = all.find(
    (p) =>
      p.endsWith(`-${sceneId}.png`) ||
      p.includes(`/${sceneId}.`) ||
      p.includes(`-${sceneId}-`) ||
      p.includes(`${sceneId}`),
  );
  return exact || all[0] || null;
}

/**
 * Helper to draw organic background wave arcs matching top-tier store feature banners.
 */
function drawWaveAccents(ctx: any, width: number, height: number, isDarkBg: boolean) {
  ctx.save();
  const waveStroke = isDarkBg ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.35)";
  const waveFill = isDarkBg ? "rgba(255, 255, 255, 0.025)" : "rgba(255, 255, 255, 0.12)";

  // Upper smooth wave flowing across top right
  ctx.beginPath();
  ctx.moveTo(width * 0.32, 0);
  ctx.bezierCurveTo(width * 0.52, height * 0.28, width * 0.48, height * 0.72, width * 0.88, height);
  ctx.lineTo(width, height);
  ctx.lineTo(width, 0);
  ctx.closePath();
  ctx.fillStyle = waveFill;
  ctx.fill();
  ctx.strokeStyle = waveStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Secondary soft accent curve
  ctx.beginPath();
  ctx.moveTo(width * 0.46, 0);
  ctx.bezierCurveTo(width * 0.68, height * 0.22, width * 0.58, height * 0.82, width, height * 0.68);
  ctx.lineTo(width, 0);
  ctx.closePath();
  ctx.fillStyle = waveFill;
  ctx.fill();
  ctx.strokeStyle = waveStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a realistic smartphone or framed card mockup with depth shadow and hardware bezels.
 */
function drawPhoneMockup(
  ctx: any,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number = 0,
  shadowBlur: number = 30,
  shadowOffsetY: number = 18,
  mockupStyle: "card" | "screen" = "screen",
  isDarkBg: boolean = true,
  shadowOpacity: number = 0.45,
) {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.translate(cx, cy);
  if (rotationDeg !== 0) {
    ctx.rotate((rotationDeg * Math.PI) / 180);
  }
  ctx.translate(-cx, -cy);

  const cornerRadius = w * 0.085;

  // 1. Drop Shadow
  ctx.save();
  ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffsetY;
  ctx.fillStyle = "rgba(0, 0, 0, 1)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, cornerRadius);
  ctx.fill();
  ctx.restore();

  // 2. Clipped Screen / Card Content
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, cornerRadius);
  ctx.clip();

  if (img) {
    let renderImg = img;
    // Step-down mipmap pre-scaling straight (unrotated) if downscaling significantly
    if (img.width && img.width > w * 2.2) {
      const preW = Math.round(w * 2);
      const preH = Math.round(h * 2);
      const preCanvas = createCanvas(preW, preH);
      const preCtx = preCanvas.getContext("2d");
      preCtx.imageSmoothingEnabled = true;
      preCtx.imageSmoothingQuality = "high";
      preCtx.drawImage(img, 0, 0, preW, preH);
      renderImg = preCanvas;
    }
    ctx.drawImage(renderImg, x, y, w, h);
  } else {
    // Placeholder screen
    ctx.fillStyle = isDarkBg ? "#111827" : "#F3F4F6";
    ctx.fillRect(x, y, w, h);
  }

  // Realistic hardware details if mockupStyle === "screen"
  if (mockupStyle === "screen") {
    // Dynamic Island pill
    const notchW = w * 0.28;
    const notchH = h * 0.032;
    const notchX = x + (w - notchW) / 2;
    const notchY = y + h * 0.022;
    const notchR = notchH / 2;

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.roundRect(notchX, notchY, notchW, notchH, notchR);
    ctx.fill();

    // Camera lens reflex inside pill
    ctx.fillStyle = "#1E293B";
    ctx.beginPath();
    ctx.arc(notchX + notchW * 0.78, notchY + notchH / 2, notchH * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Specular diagonal glare
    const glare = ctx.createLinearGradient(x, y, x + w, y + h);
    glare.addColorStop(0, "rgba(255, 255, 255, 0.09)");
    glare.addColorStop(0.3, "rgba(255, 255, 255, 0.02)");
    glare.addColorStop(0.55, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glare;
    ctx.fillRect(x, y, w, h);
  }

  ctx.restore();

  // 3. Bezel Outline Rim
  ctx.strokeStyle = isDarkBg ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = mockupStyle === "screen" ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, cornerRadius);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders a high-resolution marketing banner or Google Play Feature Graphic.
 */
export async function renderBannerCanvas(options: RenderBannerOptions): Promise<Buffer> {
  const {
    cfg,
    type,
    sceneId,
    secondarySceneId,
    tertiarySceneId,
    locale = cfg.locales[0] || "en-US",
    deviceKey = "iphone-6.9",
    deviceCount,
    kickerHeadline,
    customHeadline,
    customTagline,
    customIcon,
    benefits,
    customBackground,
    layout = "split",
    mockupStyle = "card",
    showWaves = true,
  } = options;

  const spec = BANNER_SPECS[type];
  const width = spec.width;
  const height = spec.height;

  const isRetina = options.retina === true || options.scale === 2;
  const renderScale = 2; // Always render internally at 2x SSAA for crisp graphics

  const canvas = createCanvas(width * renderScale, height * renderScale);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(renderScale, renderScale);

  // Determine effective device count
  const effectiveDeviceCount: "single" | "duo" | "trio" =
    deviceCount ||
    (type === "google-play" || type === "product-hunt"
      ? "trio"
      : type === "x-twitter"
        ? "duo"
        : "single");

  // 1. Resolve Background
  const bgCss = customBackground || cfg.theme.background || "#0E1B2A";
  ctx.fillStyle = paint(ctx, bgCss, width, height);
  ctx.fillRect(0, 0, width, height);

  const bgLuminance = backgroundLuminance(bgCss) ?? 0.2;
  const isDarkBg = bgLuminance < 0.5;

  // Subtle radial vignette / spotlight overlay
  const spotlight = ctx.createRadialGradient(
    width * 0.35,
    height * 0.35,
    width * 0.05,
    width * 0.5,
    height * 0.5,
    width * 0.8,
  );
  if (isDarkBg) {
    spotlight.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    spotlight.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  } else {
    spotlight.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    spotlight.addColorStop(1, "rgba(0, 0, 0, 0.06)");
  }
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, 0, width, height);

  // Background wave arcs
  if (showWaves) {
    drawWaveAccents(ctx, width, height, isDarkBg);
  }

  // 2. Resolve Text & Marketing Content Hierarchy
  const appName = cfg.store?.name || cfg.appPath?.split("/").pop() || "AppAssets";
  const brandWordmark = appName;

  const category = cfg.store?.category || "App";
  const defaultKicker = `${category} App`.toUpperCase();
  const kicker = kickerHeadline || defaultKicker;

  const headline =
    customHeadline ||
    (cfg.scenes?.find(isScreenshot)?.headline &&
      (cfg.scenes.find(isScreenshot)?.headline[locale] ||
        cfg.scenes.find(isScreenshot)?.headline["en-US"])) ||
    appName;

  const appSubtitle =
    customTagline ||
    (cfg.store?.subtitle &&
      (cfg.store.subtitle[locale] ||
        cfg.store.subtitle["en-US"] ||
        Object.values(cfg.store.subtitle)[0])) ||
    "Crafted for Excellence";

  const defaultBenefits = [
    "Achieve More in Less Time",
    "Plan, Prioritize and Prosper",
    "Boost Your Daily Output",
  ];
  const activeBenefits = benefits !== undefined ? benefits : defaultBenefits;

  const textPrimary = isDarkBg ? "#FFFFFF" : "#0E1B2A";
  const textMuted = isDarkBg ? "rgba(255, 255, 255, 0.78)" : "rgba(14, 27, 42, 0.78)";

  // 2.5 Resolve and load App Icon (custom image or letter initial)
  const iconCandidate =
    customIcon ||
    cfg.store?.icon ||
    (existsSync(join(cfg.outDir, "icon.png")) ? join(cfg.outDir, "icon.png") : undefined) ||
    (existsSync(join(cfg.outDir, "web", "icon.png"))
      ? join(cfg.outDir, "web", "icon.png")
      : undefined) ||
    (existsSync(join(cfg.root, "icon.png")) ? join(cfg.root, "icon.png") : undefined) ||
    (existsSync(join(cfg.root, "assets", "icon.png"))
      ? join(cfg.root, "assets", "icon.png")
      : undefined);

  let iconImage: any = null;
  if (iconCandidate) {
    try {
      if (iconCandidate.startsWith("data:")) {
        const base64Data = iconCandidate.includes(";base64,")
          ? iconCandidate.split(";base64,")[1]!
          : iconCandidate.replace(/^data:[^;]+;base64,/, "");
        iconImage = await loadImage(Buffer.from(base64Data, "base64"));
      } else {
        let iconPath = iconCandidate;
        if (iconCandidate.startsWith("/")) {
          const rel = iconCandidate.replace(/^\/+/, "");
          const candidates = [
            join(cfg.outDir, "web", rel),
            join(cfg.outDir, rel),
            join(cfg.root, rel),
            join(cfg.root, "assets", rel),
            iconCandidate,
          ];
          for (const c of candidates) {
            if (existsSync(c)) {
              iconPath = c;
              break;
            }
          }
        } else if (!isAbsolute(iconCandidate)) {
          iconPath = resolve(cfg.root, iconCandidate);
        }
        if (existsSync(iconPath)) {
          iconImage = await loadImage(iconPath);
        }
      }
    } catch {}
  }

  // 3. Find and load screenshots for up to 3 phone slots
  const allShots = getAllScreenshotPaths(cfg.outDir, deviceKey, locale, mockupStyle);

  const loadShot = async (targetId?: string, fallbackIdx = 0) => {
    const p = findScreenshotPath(cfg.outDir, deviceKey, locale, targetId, mockupStyle);
    if (p) {
      try {
        return await loadImage(p);
      } catch {}
    }
    if (allShots.length > fallbackIdx) {
      try {
        return await loadImage(allShots[fallbackIdx]!);
      } catch {}
    }
    if (allShots.length > 0) {
      try {
        return await loadImage(allShots[0]!);
      } catch {}
    }
    return null;
  };

  const shotImage1 = await loadShot(sceneId, 0);
  let shotImage2: any = null;
  let shotImage3: any = null;

  if (effectiveDeviceCount === "duo" || effectiveDeviceCount === "trio") {
    shotImage2 = await loadShot(secondarySceneId, 1);
  }
  if (effectiveDeviceCount === "trio") {
    shotImage3 = await loadShot(tertiarySceneId, 2);
  }

  if (layout === "center" || type === "instagram-square") {
    // ----------------------------------------------------
    // CENTER LAYOUT (Top Branding, Bottom Rising Mockup)
    // ----------------------------------------------------
    const contentTop = height * 0.08;

    // App Icon (Squircle)
    const iconSize = Math.round(Math.min(width, height) * 0.12);
    const iconX = (width - iconSize) / 2;
    const iconY = contentTop;
    const iconCornerR = iconSize * 0.22;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = iconSize * 0.3;
    ctx.shadowOffsetY = iconSize * 0.1;

    if (iconImage) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(iconX, iconY, iconSize, iconSize, iconCornerR);
      ctx.clip();
      ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    } else {
      ctx.fillStyle = isDarkBg ? "#2563EB" : "#3B82F6";
      ctx.beginPath();
      ctx.roundRect(iconX, iconY, iconSize, iconSize, iconCornerR);
      ctx.fill();

      // App Initial
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${iconSize * 0.55}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        brandWordmark.charAt(0).toUpperCase(),
        iconX + iconSize / 2,
        iconY + iconSize / 2,
      );
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize, iconSize, iconCornerR);
    ctx.stroke();
    ctx.restore();

    // Kicker
    const kickerY = iconY + iconSize + height * 0.025;
    ctx.fillStyle = isDarkBg ? "#38BDF8" : "#0284C7";
    ctx.font = `bold ${Math.round(width * 0.022)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.letterSpacing = "1.2px";
    ctx.fillText(kicker, width / 2, kickerY);
    ctx.letterSpacing = "0px";

    // Title / Headline
    const titleY = kickerY + width * 0.035;
    ctx.fillStyle = textPrimary;
    ctx.font = `bold ${Math.round(width * 0.042)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(headline, width / 2, titleY);

    // Tagline / Subtitle
    const tagY = titleY + width * 0.052;
    ctx.fillStyle = textMuted;
    ctx.font = `500 ${Math.round(width * 0.024)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(appSubtitle, width / 2, tagY);

    // Device Mockup in lower half
    const devH = height * 0.62;
    const devAspect = shotImage1 ? shotImage1.width / shotImage1.height : 9 / 19.5;
    const devW = devH * devAspect;
    const devX = (width - devW) / 2;
    const devY = height - devH + height * 0.04;

    drawPhoneMockup(
      ctx,
      shotImage1,
      devX,
      devY,
      devW,
      devH,
      0,
      width * 0.04,
      height * 0.03,
      mockupStyle,
      isDarkBg,
      0.45,
    );
  } else {
    // ----------------------------------------------------
    // SPLIT LAYOUT (Google Play Store Feature Standard)
    // ----------------------------------------------------
    // Radial backlight behind the phone showcase cluster
    const phoneCenterGlowX = width * 0.72;
    const phoneCenterGlowY = height * 0.5;
    const phoneBacklight = ctx.createRadialGradient(
      phoneCenterGlowX,
      phoneCenterGlowY,
      width * 0.04,
      phoneCenterGlowX,
      phoneCenterGlowY,
      width * 0.38,
    );
    if (isDarkBg) {
      phoneBacklight.addColorStop(0, "rgba(59, 130, 246, 0.28)");
      phoneBacklight.addColorStop(0.5, "rgba(147, 51, 234, 0.12)");
      phoneBacklight.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else {
      phoneBacklight.addColorStop(0, "rgba(59, 130, 246, 0.20)");
      phoneBacklight.addColorStop(0.6, "rgba(255, 255, 255, 0.4)");
      phoneBacklight.addColorStop(1, "rgba(255, 255, 255, 0)");
    }
    ctx.save();
    ctx.fillStyle = phoneBacklight;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Left Column Marketing Hierarchy
    const leftX = width * 0.06;
    const maxTextWidth = effectiveDeviceCount === "trio" ? width * 0.4 : width * 0.44;

    // 1. Brand Row: Squircle Logo + Wordmark Title
    const iconSize = Math.round(height * 0.1);
    const iconY = height * 0.09;
    const iconCornerR = iconSize * 0.24;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = iconSize * 0.35;
    ctx.shadowOffsetY = iconSize * 0.12;

    if (iconImage) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(leftX, iconY, iconSize, iconSize, iconCornerR);
      ctx.clip();
      ctx.drawImage(iconImage, leftX, iconY, iconSize, iconSize);
      ctx.restore();
    } else {
      const iconGrad = ctx.createLinearGradient(leftX, iconY, leftX + iconSize, iconY + iconSize);
      iconGrad.addColorStop(0, "#3B82F6");
      iconGrad.addColorStop(1, "#1D4ED8");
      ctx.fillStyle = iconGrad;
      ctx.beginPath();
      ctx.roundRect(leftX, iconY, iconSize, iconSize, iconCornerR);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.round(iconSize * 0.55)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        brandWordmark.charAt(0).toUpperCase(),
        leftX + iconSize / 2,
        iconY + iconSize / 2,
      );
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(leftX, iconY, iconSize, iconSize, iconCornerR);
    ctx.stroke();
    ctx.restore();

    const wordmarkX = leftX + iconSize + height * 0.025;
    ctx.fillStyle = textPrimary;
    ctx.font = `bold ${Math.round(height * 0.056)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(brandWordmark, wordmarkX, iconY + iconSize / 2);

    // 2. Kicker Headline / Category Eyebrow
    const kickerY = iconY + iconSize + height * 0.035;
    const kickerSize = Math.round(height * 0.026);
    ctx.font = `bold ${kickerSize}px sans-serif`;
    ctx.letterSpacing = "1.2px";
    ctx.fillStyle = isDarkBg ? "#38BDF8" : "#0284C7";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(kicker, leftX, kickerY);
    ctx.letterSpacing = "0px";

    // 3. Main Marketing Headline
    let curY = kickerY + kickerSize + height * 0.02;
    ctx.fillStyle = textPrimary;
    const titleSize = Math.round(height * (effectiveDeviceCount === "trio" ? 0.07 : 0.076));
    ctx.font = `800 ${titleSize}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const titleLines = wrapLines(ctx, headline, `800 ${titleSize}px sans-serif`, 0, maxTextWidth);
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, leftX, curY);
      curY += titleSize * 1.15;
    }

    // 4. Subtitle / Tagline
    curY += height * 0.01;
    ctx.fillStyle = textMuted;
    const tagSize = Math.round(height * (effectiveDeviceCount === "trio" ? 0.033 : 0.036));
    ctx.font = `500 ${tagSize}px sans-serif`;
    const tagLines = wrapLines(ctx, appSubtitle, `500 ${tagSize}px sans-serif`, 0, maxTextWidth);
    for (const line of tagLines.slice(0, 2)) {
      ctx.fillText(line, leftX, curY);
      curY += tagSize * 1.25;
    }

    // 5. Short Benefits Bullets (2–3 bullet points)
    if (activeBenefits && activeBenefits.length > 0) {
      curY += height * 0.022;
      const bulletSize = Math.round(height * 0.028);
      ctx.font = `600 ${bulletSize}px sans-serif`;
      for (const b of activeBenefits.slice(0, 3)) {
        const dotRadius = height * 0.006;
        const dotY = curY + bulletSize * 0.55;
        ctx.beginPath();
        ctx.arc(leftX + dotRadius, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDarkBg ? "#34D399" : "#059669";
        ctx.fill();

        ctx.fillStyle = textPrimary;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(b, leftX + dotRadius * 2 + height * 0.018, curY);
        curY += bulletSize * 1.6;
      }
    }

    // Right Column: Multi-Phone Mockup Showcase Cluster
    const baseH = height * 0.81;
    const devAspect = shotImage1 ? shotImage1.width / shotImage1.height : 9 / 19.5;
    const baseW = baseH * devAspect;

    if (effectiveDeviceCount === "trio") {
      // Trio Dynamic Fan with bottom overlap:
      // Center hero upright in front, Left phone tilted -7.5deg behind, Right phone tilted +7.5deg behind.
      // Base corners converge and overlap at the bottom behind the center hero.
      const centerScale = 1.0;
      const centerW = baseW * centerScale;
      const centerH = baseH * centerScale;
      const centerPhoneX = width * 0.715 - centerW / 2;
      const centerPhoneY = height * 0.095;

      const sideScale = 0.98;
      const sideW = baseW * sideScale;
      const sideH = baseH * sideScale;
      const sideY = height * 0.1;

      const leftPhoneX = centerPhoneX - sideW * 0.65;
      const rightPhoneX = centerPhoneX + centerW - sideW * 0.35;

      // Left Phone (tilted -7.5deg behind)
      drawPhoneMockup(
        ctx,
        shotImage2 || shotImage1,
        leftPhoneX,
        sideY,
        sideW,
        sideH,
        -7.5,
        Math.round(width * 0.028),
        Math.round(height * 0.025),
        mockupStyle,
        isDarkBg,
        0.42,
      );

      // Right Phone (tilted +7.5deg behind)
      drawPhoneMockup(
        ctx,
        shotImage3 || shotImage1,
        rightPhoneX,
        sideY,
        sideW,
        sideH,
        7.5,
        Math.round(width * 0.028),
        Math.round(height * 0.025),
        mockupStyle,
        isDarkBg,
        0.42,
      );

      // Center Phone (Phone 1 - Front & Center Elevated Hero)
      drawPhoneMockup(
        ctx,
        shotImage1,
        centerPhoneX,
        centerPhoneY,
        centerW,
        centerH,
        0,
        Math.round(width * 0.045),
        Math.round(height * 0.04),
        mockupStyle,
        isDarkBg,
        0.65,
      );
    } else if (effectiveDeviceCount === "duo") {
      // Duo V-Shape arrangement with bottom overlap:
      // Left phone tilted -7.5deg (front), Right phone tilted +7.5deg (back)
      // Bottom-right of front phone overlaps over bottom-left of back phone
      const duoScale = 1.0;
      const duoW = baseW * duoScale;
      const duoH = baseH * duoScale;

      const clusterCenter = width * 0.73;
      const offset = duoW * 0.83;

      const leftPhoneX = clusterCenter - offset;
      const leftPhoneY = height * 0.1;

      const rightPhoneX = clusterCenter + offset - duoW;
      const rightPhoneY = height * 0.1;

      // Back Phone (Phone 2 - Right phone at +7.5deg)
      drawPhoneMockup(
        ctx,
        shotImage2 || shotImage1,
        rightPhoneX,
        rightPhoneY,
        duoW,
        duoH,
        7.5,
        Math.round(width * 0.03),
        Math.round(height * 0.025),
        mockupStyle,
        isDarkBg,
        0.45,
      );

      // Front Phone (Phone 1 - Left phone at -7.5deg with bottom overlap)
      drawPhoneMockup(
        ctx,
        shotImage1,
        leftPhoneX,
        leftPhoneY,
        duoW,
        duoH,
        -7.5,
        Math.round(width * 0.045),
        Math.round(height * 0.038),
        mockupStyle,
        isDarkBg,
        0.65,
      );
    } else {
      // Single Hero Phone
      const singleScale = 1.02;
      const singleW = baseW * singleScale;
      const singleH = baseH * singleScale;
      const singlePhoneX = width * 0.7 - singleW / 2;
      const singlePhoneY = height * 0.09;
      drawPhoneMockup(
        ctx,
        shotImage1,
        singlePhoneX,
        singlePhoneY,
        singleW,
        singleH,
        0,
        Math.round(width * 0.045),
        Math.round(height * 0.035),
        mockupStyle,
        isDarkBg,
        0.5,
      );
    }
  }

  if (isRetina) {
    return canvas.encode("png");
  }

  // Downsample 2x SSAA buffer to exact target store dimensions with high quality antialiasing
  const finalCanvas = createCanvas(width, height);
  const finalCtx = finalCanvas.getContext("2d");
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = "high";
  finalCtx.drawImage(canvas, 0, 0, width, height);
  return finalCanvas.encode("png");
}
