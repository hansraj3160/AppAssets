import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
  locale?: string;
  deviceKey?: DeviceKey;
  customHeadline?: string;
  customTagline?: string;
  customBackground?: string;
  layout?: "split" | "center";
  mockupStyle?: "card" | "screen";
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

  for (const dir of candidatesDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir).filter(
        (f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg"),
      );
      if (files.length === 0) continue;

      if (sceneId) {
        const exact = files.find(
          (f) =>
            f.endsWith(`-${sceneId}.png`) ||
            f.startsWith(`${sceneId}.`) ||
            f.includes(`-${sceneId}-`) ||
            f.includes(`${sceneId}`),
        );
        if (exact) return join(dir, exact);
      }
      return join(dir, files[0]!);
    } catch {}
  }
  return null;
}

/**
 * Renders a high-resolution marketing banner or Google Play Feature Graphic.
 */
export async function renderBannerCanvas(options: RenderBannerOptions): Promise<Buffer> {
  const {
    cfg,
    type,
    sceneId,
    locale = cfg.locales[0] || "en-US",
    deviceKey = "iphone-6.9",
    customHeadline,
    customTagline,
    customBackground,
    layout = "split",
    mockupStyle = "card",
  } = options;

  const spec = BANNER_SPECS[type];
  const width = spec.width;
  const height = spec.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Resolve Background
  const bgCss = customBackground || cfg.theme.background || "#0E1B2A";
  ctx.fillStyle = paint(ctx, bgCss, width, height);
  ctx.fillRect(0, 0, width, height);

  // Subtle radial vignette / spotlight overlay for studio polish
  const bgLuminance = backgroundLuminance(bgCss) ?? 0.2;
  const isDarkBg = bgLuminance < 0.5;

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

  // 2. Resolve Text & Content
  const appName = customHeadline || cfg.store?.name || cfg.appPath?.split("/").pop() || "AppAssets";

  const appSubtitle =
    customTagline ||
    (cfg.store?.subtitle &&
      (cfg.store.subtitle[locale] ||
        cfg.store.subtitle["en-US"] ||
        Object.values(cfg.store.subtitle)[0])) ||
    (cfg.scenes?.find(isScreenshot)?.headline &&
      (cfg.scenes.find(isScreenshot)?.headline[locale] ||
        cfg.scenes.find(isScreenshot)?.headline["en-US"])) ||
    "Crafted for Excellence";

  const category = cfg.store?.category || "App";
  const rating = cfg.store?.rating ?? 4.9;
  const ratingText = `★ ${rating} Rating · ${category}`;

  const textPrimary = isDarkBg ? "#FFFFFF" : "#0E1B2A";
  const textMuted = isDarkBg ? "rgba(255, 255, 255, 0.75)" : "rgba(14, 27, 42, 0.75)";
  const pillBg = isDarkBg ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.07)";
  const pillBorder = isDarkBg ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.12)";
  const pillText = isDarkBg ? "#FBBF24" : "#D97706";

  // 3. Find and load screenshot
  const shotPath = findScreenshotPath(cfg.outDir, deviceKey, locale, sceneId, mockupStyle);
  let shotImage: any = null;
  if (shotPath) {
    try {
      shotImage = await loadImage(shotPath);
    } catch {}
  }

  if (layout === "center" || type === "instagram-square") {
    // ----------------------------------------------------
    // CENTER LAYOUT (Top Text, Rising Device Bottom)
    // ----------------------------------------------------
    const contentTop = height * 0.08;

    // App Icon (Squircle)
    const iconSize = Math.round(Math.min(width, height) * 0.12);
    const iconX = (width - iconSize) / 2;
    const iconY = contentTop;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = iconSize * 0.3;
    ctx.shadowOffsetY = iconSize * 0.1;
    ctx.fillStyle = isDarkBg ? "#2563EB" : "#3B82F6";
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize, iconSize, iconSize * 0.22);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // App Initial
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${iconSize * 0.55}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(appName.charAt(0).toUpperCase(), iconX + iconSize / 2, iconY + iconSize / 2);

    // Title
    const titleY = iconY + iconSize + height * 0.04;
    ctx.fillStyle = textPrimary;
    ctx.font = `bold ${Math.round(width * 0.042)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(appName, width / 2, titleY);

    // Tagline
    const tagY = titleY + width * 0.052;
    ctx.fillStyle = textMuted;
    ctx.font = `500 ${Math.round(width * 0.024)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(appSubtitle, width / 2, tagY);

    // Device Mockup in lower half
    if (shotImage) {
      const devAspect = shotImage.width / shotImage.height;
      const devH = height * 0.62;
      const devW = devH * devAspect;
      const devX = (width - devW) / 2;
      const devY = height - devH + height * 0.04;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = width * 0.04;
      ctx.shadowOffsetY = height * 0.03;

      // Draw device with rounded corners
      const radius = devW * 0.08;
      ctx.beginPath();
      ctx.roundRect(devX, devY, devW, devH, radius);
      ctx.clip();
      ctx.drawImage(shotImage, devX, devY, devW, devH);
      ctx.restore();

      // Outer bezel line
      ctx.save();
      ctx.strokeStyle = isDarkBg ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(devX, devY, devW, devH, radius);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // ----------------------------------------------------
    // SPLIT LAYOUT (Text on Left, Angled Device on Right)
    // ----------------------------------------------------
    const leftX = width * 0.08;

    // App Icon (Squircle)
    const iconSize = Math.round(height * 0.18);
    const iconY = height * 0.16;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = iconSize * 0.3;
    ctx.shadowOffsetY = iconSize * 0.1;
    const iconGrad = ctx.createLinearGradient(leftX, iconY, leftX + iconSize, iconY + iconSize);
    iconGrad.addColorStop(0, "#3B82F6");
    iconGrad.addColorStop(1, "#1D4ED8");
    ctx.fillStyle = iconGrad;
    ctx.beginPath();
    ctx.roundRect(leftX, iconY, iconSize, iconSize, iconSize * 0.22);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // App Initial
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${iconSize * 0.55}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(appName.charAt(0).toUpperCase(), leftX + iconSize / 2, iconY + iconSize / 2);

    // Rating Badge Pill
    const badgeY = iconY + iconSize + height * 0.05;
    ctx.font = `bold ${Math.round(height * 0.04)}px sans-serif`;
    const ratingWidth = ctx.measureText(ratingText).width;
    const pillPadX = height * 0.035;
    const pillH = height * 0.075;

    ctx.save();
    ctx.fillStyle = pillBg;
    ctx.strokeStyle = pillBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(leftX, badgeY, ratingWidth + pillPadX * 2, pillH, pillH / 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = pillText;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(ratingText, leftX + pillPadX, badgeY + pillH / 2);

    // Main App Title
    const titleY = badgeY + pillH + height * 0.05;
    ctx.fillStyle = textPrimary;
    const titleSize = Math.round(height * 0.11);
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const titleLines = wrapLines(ctx, appName, `bold ${titleSize}px sans-serif`, 0, width * 0.44);
    let curY = titleY;
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, leftX, curY);
      curY += titleSize * 1.15;
    }

    // Subtitle / Tagline
    ctx.fillStyle = textMuted;
    const tagSize = Math.round(height * 0.055);
    ctx.font = `500 ${tagSize}px sans-serif`;
    const tagLines = wrapLines(ctx, appSubtitle, `500 ${tagSize}px sans-serif`, 0, width * 0.44);
    curY += height * 0.015;
    for (const line of tagLines.slice(0, 2)) {
      ctx.fillText(line, leftX, curY);
      curY += tagSize * 1.25;
    }

    // Framed Device Mockup on Right
    if (shotImage) {
      const devAspect = shotImage.width / shotImage.height;
      const devH = height * 1.02;
      const devW = devH * devAspect;
      const devX = width * 0.58;
      const devY = height * 0.14;

      ctx.save();
      // Slight elegant rotation (-4 deg) for dynamic 3D look
      const cx = devX + devW / 2;
      const cy = devY + devH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((-4 * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      // 3D Shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = width * 0.045;
      ctx.shadowOffsetY = height * 0.035;

      const radius = devW * 0.085;
      ctx.beginPath();
      ctx.roundRect(devX, devY, devW, devH, radius);
      ctx.clip();
      ctx.drawImage(shotImage, devX, devY, devW, devH);
      ctx.restore();

      // Outer bezel outline with same rotation
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((-4 * Math.PI) / 180);
      ctx.translate(-cx, -cy);
      ctx.strokeStyle = isDarkBg ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(devX, devY, devW, devH, radius);
      ctx.stroke();
      ctx.restore();
    }
  }

  return canvas.encode("png");
}
