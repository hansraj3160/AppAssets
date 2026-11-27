import type {
  AppInfo,
  Design,
  DeviceCaptures,
  DeviceEntry,
  SceneCopy,
  StoreManifest,
} from "../../manifest";

export type BannerFormat = "google-play" | "product-hunt" | "x-twitter" | "instagram-square";

export interface BannerFormatMeta {
  key: BannerFormat;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  aspect: string;
  badge?: string;
  description: string;
}

export interface BannerBenefit {
  id: string;
  text: string;
}

export const BANNER_FORMATS: BannerFormatMeta[] = [
  {
    key: "google-play",
    label: "Google Play Feature Graphic",
    shortLabel: "Google Play",
    width: 1024,
    height: 500,
    aspect: "1024 / 500",
    badge: "Required",
    description: "Mandatory 1024x500 banner for publishing on Google Play Console",
  },
  {
    key: "product-hunt",
    label: "Product Hunt Gallery",
    shortLabel: "Product Hunt",
    width: 1270,
    height: 760,
    aspect: "1270 / 760",
    badge: "Launch",
    description: "Standard 1270x760 featured card for Product Hunt launch page",
  },
  {
    key: "x-twitter",
    label: "X / Twitter Promo Card",
    shortLabel: "X / Twitter",
    width: 1200,
    height: 675,
    aspect: "1200 / 675",
    badge: "16:9",
    description: "High-engagement social share image for X/Twitter & LinkedIn posts",
  },
  {
    key: "instagram-square",
    label: "Instagram Square",
    shortLabel: "Instagram",
    width: 1080,
    height: 1080,
    aspect: "1 / 1",
    badge: "1:1",
    description: "Square promotional card for Instagram, Threads, and feed updates",
  },
];

export const KICKER_PRESETS: { category: string; tags: string[] }[] = [
  {
    category: "Store & Badges",
    tags: [
      "★ FEATURED APP",
      "🔥 EDITOR'S CHOICE",
      "⚡ SMART & FAST",
      "🔒 SECURE & PRIVATE",
      "✨ AI-POWERED",
      "🏆 TOP RATED #1",
      "🚀 NEW & TRENDING",
      "✦ PREMIUM EDITION",
    ],
  },
  {
    category: "App Categories",
    tags: [
      "FINANCE & BUDGET",
      "EXPENSE TRACKER",
      "SMART BILL SPLITTER",
      "UTILITIES & TOOLS",
      "PRODUCTIVITY APP",
      "HEALTH & FITNESS",
      "LIFESTYLE & TRAVEL",
      "BUSINESS & WORK",
    ],
  },
  {
    category: "Feature Highlights",
    tags: [
      "100% FREE DOWNLOAD",
      "WORKS OFFLINE",
      "NO ADS · PRIVATE",
      "ALL-IN-ONE SOLUTION",
      "SYNC ACROSS DEVICES",
      "EASY & INTUITIVE",
    ],
  },
];

export const QUICK_KICKER_CHIPS = [
  "★ FEATURED APP",
  "FINANCE & BUDGET",
  "EXPENSE TRACKER",
  "⚡ SMART & FAST",
  "🔥 EDITOR'S CHOICE",
  "WORKS OFFLINE",
];

export const KICKER_COLOR_SWATCHES = [
  // Sky / Cyan / Blue
  "#38BDF8",
  "#0284C7",
  "#2563EB",
  "#06B6D4",
  "#0D9488",
  // Emerald / Green / Lime
  "#10B981",
  "#059669",
  "#84CC16",
  "#22C55E",
  // Amber / Orange / Red
  "#F59E0B",
  "#D97706",
  "#EA580C",
  "#F97316",
  "#EF4444",
  "#DC2626",
  // Pink / Purple / Indigo
  "#F43F5E",
  "#EC4899",
  "#D946EF",
  "#A855F7",
  "#7C3AED",
  "#6366F1",
  // Light / Neutral
  "#FFFFFF",
  "#CBD5E1",
  "#94A3B8",
  "#0F172A",
];

export const QUICK_TEXT_COLOR_SWATCHES = [
  "#0F172A",
  "#1E293B",
  "#334155",
  "#FFFFFF",
  "#F8FAFC",
  "#2563EB",
  "#059669",
  "#7C3AED",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#0284C7",
];

export const LOGO_COLOR_SWATCHES = [
  "#FFFFFF",
  "#0F172A",
  "#000000",
  "#2563EB",
  "#0284C7",
  "#059669",
  "#10B981",
  "#D97706",
  "#F59E0B",
  "#DC2626",
  "#EF4444",
  "#7C3AED",
  "#9333EA",
  "#DB2777",
  "#F8FAFC",
  "#E2E8F0",
  "#64748B",
  "#1E293B",
];

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(56, 189, 248, ${alpha})`;
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  }
  if (c.length === 6) {
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function isLightBackground(bg?: string): boolean {
  if (!bg) return false;
  const s = bg.trim().toLowerCase();
  if (s === "#fff" || s === "#ffffff" || s === "white") return true;
  const hexes = s.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi);
  if (hexes && hexes.length > 0) {
    let totalLum = 0;
    for (const h of hexes) {
      let hex = h.slice(1);
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      }
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      totalLum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    return totalLum / hexes.length > 0.58;
  }
  return false;
}

export function resolveLogoBg(logoBg: string): string {
  if (logoBg === "transparent") return "transparent";
  if (logoBg === "gradient") {
    return "linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #9333EA 100%)";
  }
  return logoBg;
}

export interface PromoBannersStudioProps {
  manifest: StoreManifest;
  platform: "ios" | "ipad" | "android";
  design: Design;
  captures: DeviceCaptures;
  spec: DeviceEntry;
  locale: string;
  background: string;
  frameUrl: string;
  fontFamily: string;
  headlineColor?: string;
  subheadColor?: string;
  fontSizeScale?: number;
  copy: Record<string, SceneCopy>;
  order: string[];
  template: string | string[];
  layout: string;
  screenOnly: boolean;
  sceneLayouts: Record<string, string>;
  sceneBackgrounds?: Record<string, string>;
  sceneBadges?: Record<
    string,
    {
      text: string;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      background?: string;
      color?: string;
    }
  >;
  appInfo?: AppInfo;
}

export interface ClientBannerRenderOptions {
  activeFormat: BannerFormatMeta;
  selectedFormat: BannerFormat;
  exportResolution: "1x" | "2x";
  activeBg: string;
  appIconUrl: string | null;
  appInitial: string;
  logoBg: string;
  logoFit: "cover" | "contain";
  isDarkText: boolean;
  effectiveTextColor: string;
  effectiveSubtextColor: string;
  effectiveBulletColor: string;
  effectiveKickerColor: string;
  kickerText: string;
  kickerStyle: "text" | "badge";
  customTitle: string;
  customHeadline: string;
  customTagline: string;
  benefits: BannerBenefit[];
  mockupStyle: "card" | "screen";
  deviceCount: "single" | "duo" | "trio";
  activeCaptureUrl?: string;
  secondaryCaptureUrl?: string;
  tertiaryCaptureUrl?: string;
}

function loadCanvasImage(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderClientBannerBlob(
  opts: ClientBannerRenderOptions,
): Promise<Blob | null> {
  const {
    activeFormat,
    selectedFormat,
    exportResolution,
    activeBg,
    appIconUrl,
    appInitial,
    logoBg,
    logoFit,
    isDarkText,
    effectiveTextColor,
    effectiveSubtextColor,
    effectiveBulletColor,
    effectiveKickerColor,
    kickerText,
    kickerStyle,
    customTitle,
    customHeadline,
    customTagline,
    benefits,
    mockupStyle,
    deviceCount,
    activeCaptureUrl,
    secondaryCaptureUrl,
    tertiaryCaptureUrl,
  } = opts;

  const width = activeFormat.width;
  const height = activeFormat.height;
  const isRetina = exportResolution === "2x";
  const renderScale = 2; // Full-Scene Supersampling Anti-Aliasing (SSAA 2x)
  const canvas = document.createElement("canvas");
  canvas.width = width * renderScale;
  canvas.height = height * renderScale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(renderScale, renderScale);

  // Background
  const bgCss = activeBg || "#0E1B2A";
  if (bgCss.includes("gradient")) {
    const hexes = bgCss.match(/#[0-9a-fA-F]{6}|rgba?\([^)]+\)/g);
    if (hexes && hexes.length >= 2) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, hexes[0]!);
      grad.addColorStop(1, hexes[hexes.length - 1]!);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "#0E1B2A";
    }
  } else {
    ctx.fillStyle = bgCss;
  }
  ctx.fillRect(0, 0, width, height);

  const [iconImg, cap1Img, cap2Img, cap3Img] = await Promise.all([
    appIconUrl ? loadCanvasImage(appIconUrl) : Promise.resolve(null),
    activeCaptureUrl ? loadCanvasImage(`/${activeCaptureUrl}`) : Promise.resolve(null),
    secondaryCaptureUrl ? loadCanvasImage(`/${secondaryCaptureUrl}`) : Promise.resolve(null),
    tertiaryCaptureUrl ? loadCanvasImage(`/${tertiaryCaptureUrl}`) : Promise.resolve(null),
  ]);

  const drawPhone = (
    img: HTMLImageElement | null,
    x: number,
    y: number,
    w: number,
    h: number,
    rotDeg: number,
    shadowBlur = 30,
    shadowOffsetY = 18,
  ) => {
    let sourceToDraw: CanvasImageSource | null = img;
    if (img?.width && img.width > w * 2.2) {
      const stepW = Math.round(w * 2);
      const stepH = Math.round(h * 2);
      const stepCanvas = document.createElement("canvas");
      stepCanvas.width = stepW;
      stepCanvas.height = stepH;
      const stepCtx = stepCanvas.getContext("2d");
      if (stepCtx) {
        stepCtx.imageSmoothingEnabled = true;
        stepCtx.imageSmoothingQuality = "high";
        stepCtx.drawImage(img, 0, 0, stepW, stepH);
        sourceToDraw = stepCanvas;
      }
    }

    ctx.save();
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx, cy);
    if (rotDeg !== 0) ctx.rotate((rotDeg * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const cornerR = w * 0.085;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffsetY;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, cornerR);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, cornerR);
    ctx.clip();
    if (sourceToDraw) {
      ctx.drawImage(sourceToDraw, x, y, w, h);
    } else {
      ctx.fillStyle = "#111827";
      ctx.fillRect(x, y, w, h);
    }

    if (mockupStyle === "screen") {
      const nw = w * 0.28;
      const nh = h * 0.032;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.roundRect(x + (w - nw) / 2, y + h * 0.022, nw, nh, nh / 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  };

  const drawLogoSquircle = (iconX: number, iconY: number, iconSize: number, iconR: number) => {
    ctx.save();
    if (logoBg !== "transparent") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
      ctx.shadowBlur = iconSize * 0.32;
      ctx.shadowOffsetY = iconSize * 0.11;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(iconX, iconY, iconSize, iconSize, iconR);
      if (logoBg === "gradient") {
        const grad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
        grad.addColorStop(0, "#3B82F6");
        grad.addColorStop(0.5, "#6366F1");
        grad.addColorStop(1, "#9333EA");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = logoBg;
      }
      ctx.fill();
      ctx.strokeStyle =
        isDarkText && (logoBg === "#FFFFFF" || logoBg === "#F8FAFC")
          ? "rgba(0, 0, 0, 0.08)"
          : "rgba(255, 255, 255, 0.28)";
      ctx.lineWidth = Math.max(1, Math.round(iconSize * 0.02));
      ctx.stroke();
      ctx.restore();
    }

    if (iconImg) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(iconX, iconY, iconSize, iconSize, iconR);
      ctx.clip();
      if (logoFit === "contain") {
        const pad = Math.round(iconSize * 0.14);
        ctx.drawImage(iconImg, iconX + pad, iconY + pad, iconSize - pad * 2, iconSize - pad * 2);
      } else {
        ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
      }
      ctx.restore();
    } else {
      if (logoBg === "transparent") {
        ctx.fillStyle = "#3B82F6";
        ctx.beginPath();
        ctx.roundRect(iconX, iconY, iconSize, iconSize, iconR);
        ctx.fill();
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.round(iconSize * 0.55)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(appInitial, iconX + iconSize / 2, iconY + iconSize / 2);
    }
    ctx.restore();
  };

  if (selectedFormat === "instagram-square") {
    const iconSize = Math.round(Math.min(width, height) * 0.12);
    const iconX = (width - iconSize) / 2;
    const iconY = height * 0.08;
    drawLogoSquircle(iconX, iconY, iconSize, iconSize * 0.22);

    const kickerStr = (kickerText || "FEATURED APP").toUpperCase();
    const kickerFontSize = Math.round(height * 0.025);
    ctx.font = `bold ${kickerFontSize}px sans-serif`;
    const kickerY = iconY + iconSize + height * 0.04;

    if (kickerStyle === "badge") {
      const textMetrics = ctx.measureText(kickerStr);
      const padX = kickerFontSize * 0.7;
      const padY = kickerFontSize * 0.35;
      const pillW = textMetrics.width + padX * 2;
      const pillH = kickerFontSize + padY * 2;
      const pillX = width / 2 - pillW / 2;
      const pillY = kickerY - kickerFontSize * 0.85;
      const pillR = pillH / 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
      ctx.fillStyle = hexToRgba(effectiveKickerColor, 0.16);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(effectiveKickerColor, 0.38);
      ctx.lineWidth = Math.max(1, Math.round(height * 0.002));
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = effectiveKickerColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(kickerStr, width / 2, kickerY);

    ctx.fillStyle = effectiveTextColor;
    ctx.font = `bold ${Math.round(height * 0.05)}px sans-serif`;
    ctx.fillText(customHeadline, width / 2, iconY + iconSize + height * 0.1);

    ctx.fillStyle = effectiveSubtextColor;
    ctx.font = `500 ${Math.round(height * 0.028)}px sans-serif`;
    ctx.fillText(customTagline, width / 2, iconY + iconSize + height * 0.15);

    const phW = width * 0.42;
    const phH = phW * (2868 / 1320);
    drawPhone(cap1Img, (width - phW) / 2, height * 0.44, phW, phH, 0);
  } else {
    const iconSize = Math.round(height * 0.1);
    const iconX = width * 0.06;
    const iconY = height * 0.09;
    drawLogoSquircle(iconX, iconY, iconSize, iconSize * 0.24);

    ctx.fillStyle = effectiveTextColor;
    ctx.font = `bold ${Math.round(height * 0.056)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(customTitle, iconX + iconSize + height * 0.025, iconY + iconSize / 2);

    const kickerY = iconY + iconSize + height * 0.045;
    const kickerStr = (kickerText || "FEATURED APP").toUpperCase();
    const kickerFontSize = Math.round(height * 0.025);
    ctx.font = `bold ${kickerFontSize}px sans-serif`;

    if (kickerStyle === "badge") {
      const textMetrics = ctx.measureText(kickerStr);
      const padX = kickerFontSize * 0.7;
      const padY = kickerFontSize * 0.35;
      const pillW = textMetrics.width + padX * 2;
      const pillH = kickerFontSize + padY * 2;
      const pillX = iconX;
      const pillY = kickerY - kickerFontSize * 0.85;
      const pillR = pillH / 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
      ctx.fillStyle = hexToRgba(effectiveKickerColor, 0.16);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(effectiveKickerColor, 0.38);
      ctx.lineWidth = Math.max(1, Math.round(height * 0.002));
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = effectiveKickerColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(kickerStr, iconX + padX, kickerY);
    } else {
      ctx.fillStyle = effectiveKickerColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(kickerStr, iconX, kickerY);
    }

    const headY = kickerY + height * 0.06;
    ctx.fillStyle = effectiveTextColor;
    ctx.font = `bold ${Math.round(height * 0.068)}px sans-serif`;
    ctx.fillText(customHeadline, iconX, headY);

    const tagY = headY + height * 0.07;
    ctx.fillStyle = effectiveSubtextColor;
    ctx.font = `500 ${Math.round(height * 0.032)}px sans-serif`;
    ctx.fillText(customTagline, iconX, tagY);

    let benY = tagY + height * 0.07;
    for (const b of benefits) {
      if (!b.text) continue;
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(iconX + 6, benY - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = effectiveBulletColor;
      ctx.font = `bold ${Math.round(height * 0.027)}px sans-serif`;
      ctx.fillText(b.text, iconX + 18, benY);
      benY += height * 0.055;
    }

    const baseH = height * 0.81;
    const baseW = baseH * (1320 / 2868);

    if (deviceCount === "trio") {
      const centerW = baseW * 1.02;
      const centerH = baseH * 1.02;
      const centerPhoneX = width * 0.72 - centerW / 2;
      const centerPhoneY = height * 0.085;

      const sideW = baseW * 0.94;
      const sideH = baseH * 0.94;
      const sideY = height * 0.13;
      const leftX = centerPhoneX - sideW * 0.58;
      const rightX = centerPhoneX + centerW - sideW * 0.42;

      drawPhone(cap2Img || cap1Img, leftX, sideY, sideW, sideH, -7.5, 30, 16);
      drawPhone(cap3Img || cap1Img, rightX, sideY, sideW, sideH, 7.5, 30, 16);
      drawPhone(cap1Img, centerPhoneX, centerPhoneY, centerW, centerH, 0, 45, 24);
    } else if (deviceCount === "duo") {
      const duoW = baseW * 0.98;
      const duoH = baseH * 0.98;
      const clusterCenter = width * 0.72;
      const separation = duoW * 0.42;
      const duoY = height * 0.1;
      const leftX = clusterCenter - separation - duoW / 2;
      const rightX = clusterCenter + separation - duoW / 2;

      drawPhone(cap2Img || cap1Img, rightX, duoY, duoW, duoH, 7.5, 32, 18);
      drawPhone(cap1Img, leftX, duoY, duoW, duoH, -7.5, 42, 22);
    } else {
      const singleW = baseW * 1.02;
      const singleH = baseH * 1.02;
      drawPhone(cap1Img, width * 0.7 - singleW / 2, height * 0.09, singleW, singleH, 0, 40, 20);
    }
  }

  if (isRetina) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  // Downsample 2x SSAA buffer to exact 1x dimensions for store compliance
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalCtx = finalCanvas.getContext("2d");
  if (finalCtx) {
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = "high";
    finalCtx.drawImage(canvas, 0, 0, width, height);
    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
