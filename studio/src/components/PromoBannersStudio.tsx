import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Type,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  AppInfo,
  Design,
  DeviceCaptures,
  DeviceEntry,
  SceneCopy,
  StoreManifest,
} from "../manifest";
import { SceneBackgroundPopover } from "./SceneBackgroundPopover";
import { buildScreenshotEntries, type ScreenshotEntry } from "./Strip";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

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

export const KICKER_COLOR_SWATCHES = [
  // Sky / Cyan / Blue
  "#38BDF8", "#0284C7", "#2563EB", "#06B6D4", "#0D9488",
  // Emerald / Green / Lime
  "#10B981", "#059669", "#84CC16", "#22C55E",
  // Amber / Orange / Red
  "#F59E0B", "#D97706", "#EA580C", "#F97316", "#EF4444", "#DC2626",
  // Pink / Purple / Indigo
  "#F43F5E", "#EC4899", "#D946EF", "#A855F7", "#7C3AED", "#6366F1",
  // Light / Neutral
  "#FFFFFF", "#CBD5E1", "#94A3B8", "#0F172A",
];

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(56, 189, 248, ${alpha})`;
  let c = hex.replace("#", "").trim();
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length === 6) {
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export const LOGO_COLOR_SWATCHES = [
  "#FFFFFF", "#0F172A", "#000000", "#2563EB", "#0284C7", "#059669",
  "#10B981", "#D97706", "#F59E0B", "#DC2626", "#EF4444", "#7C3AED",
  "#9333EA", "#DB2777", "#F8FAFC", "#E2E8F0", "#64748B", "#1E293B",
];

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

export function PromoBannersStudio({
  manifest,
  platform: _platform,
  design,
  captures,
  spec,
  locale,
  background,
  frameUrl,
  fontFamily,
  headlineColor,
  subheadColor,
  fontSizeScale,
  copy,
  order,
  template,
  layout,
  screenOnly,
  sceneLayouts,
  sceneBackgrounds,
  sceneBadges,
  appInfo,
}: PromoBannersStudioProps) {
  const [selectedFormat, setSelectedFormat] = useState<BannerFormat>("google-play");
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [safeAreaMargin, setSafeAreaMargin] = useState<"15%" | "20%" | "8%">("15%");
  const [deviceCount, setDeviceCount] = useState<"single" | "duo" | "trio">("trio");

  // Screenshots available to feature inside the banner
  const screenshotEntries: ScreenshotEntry[] = useMemo(() => {
    return buildScreenshotEntries({
      design,
      captures,
      spec,
      locale,
      background,
      frameUrl,
      fontFamily,
      headlineColor,
      subheadColor,
      fontSizeScale,
      copy,
      order,
      template,
      layout,
      screenOnly,
      sceneLayouts,
      sceneBackgrounds,
      sceneBadges,
    });
  }, [
    design,
    captures,
    spec,
    locale,
    background,
    frameUrl,
    fontFamily,
    headlineColor,
    subheadColor,
    fontSizeScale,
    copy,
    order,
    template,
    layout,
    screenOnly,
    sceneLayouts,
    sceneBackgrounds,
    sceneBadges,
  ]);

  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    screenshotEntries[0]?.sceneId || "home",
  );
  const [secondarySceneId, setSecondarySceneId] = useState<string>(
    screenshotEntries[1]?.sceneId || screenshotEntries[0]?.sceneId || "stats",
  );
  const [tertiarySceneId, setTertiarySceneId] = useState<string>(
    screenshotEntries[2]?.sceneId || screenshotEntries[0]?.sceneId || "settings",
  );

  // Content state prefilled from app info and manifest
  const defaultTitle = appInfo?.name || manifest.app?.name || "My App";
  const defaultTagline =
    appInfo?.subtitle ||
    manifest.app?.subtitle?.[locale] ||
    manifest.app?.subtitle?.["en-US"] ||
    Object.values(manifest.app?.subtitle || {})[0] ||
    "Fast, Secure & Easy to Use";
  const defaultHeadline =
    copy[screenshotEntries[0]?.sceneId || ""]?.headline?.[locale] ??
    design.scenes[0]?.headline?.[locale] ??
    "Simple & Powerful";

  const [customTitle, setCustomTitle] = useState(defaultTitle);
  const categoryName = appInfo?.category || manifest.app?.category || "Mobile";
  const [kickerText, setKickerText] = useState(`${categoryName} App`.toUpperCase());
  const [customHeadline, setCustomHeadline] = useState(defaultHeadline);
  const [customTagline, setCustomTagline] = useState(defaultTagline);
  const [benefits, setBenefits] = useState<{ id: string; text: string }[]>([
    { id: "b1", text: "Achieve More in Less Time" },
    { id: "b2", text: "Plan, Prioritize and Prosper" },
    { id: "b3", text: "Boost Your Daily Output" },
  ]);

  const [customBg, setCustomBg] = useState<string | undefined>(undefined);
  const [mockupStyle, setMockupStyle] = useState<"card" | "screen">("screen");
  const [appIconUrl, setAppIconUrl] = useState<string | null>(() => {
    return appInfo?.icon || (design as any)?.appIcon || null;
  });
  const [logoBg, setLogoBg] = useState<string>("gradient");
  const [logoFit, setLogoFit] = useState<"cover" | "contain">("cover");

  const resolvedLogoBackground = useMemo(() => {
    if (logoBg === "transparent") return "transparent";
    if (logoBg === "gradient")
      return "linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #9333EA 100%)";
    return logoBg;
  }, [logoBg]);

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [exportResolution, setExportResolution] = useState<"1x" | "2x">("1x");

  // Keep banner text in sync with appInfo when user edits app details
  useEffect(() => {
    if (appInfo?.name) setCustomTitle(appInfo.name);
    if (appInfo?.subtitle) setCustomTagline(appInfo.subtitle);
    if (appInfo?.category) setKickerText(`${appInfo.category} App`.toUpperCase());
    if (appInfo?.icon) setAppIconUrl(appInfo.icon);
  }, [appInfo]);

  // Sync icon from backend if available
  useEffect(() => {
    fetch("/api/icon")
      .then((res) => res.json())
      .then((data) => {
        if (data?.iconUrl) setAppIconUrl(data.iconUrl);
      })
      .catch(() => {});
  }, []);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      setAppIconUrl(dataUrl);
      setUploadingIcon(true);
      try {
        const res = await fetch("/api/icon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        const data = await res.json();
        if (data?.iconUrl) setAppIconUrl(data.iconUrl);
      } catch (err) {
        console.error("Failed to upload icon:", err);
      } finally {
        setUploadingIcon(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetIcon = async () => {
    setAppIconUrl(null);
    try {
      await fetch("/api/icon", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to reset icon:", err);
    }
  };

  const activeFormat = BANNER_FORMATS.find((f) => f.key === selectedFormat) || BANNER_FORMATS[0]!;
  const activeBg = customBg || background;

  // Text color mode & custom color state
  const [textColorMode, setTextColorMode] = useState<"auto" | "light" | "dark" | "custom">("auto");
  const [customTextColor, setCustomTextColor] = useState<string>("#0F172A");
  const [kickerColor, setKickerColor] = useState<string>("");
  const [kickerStyle, setKickerStyle] = useState<"text" | "badge">("text");

  // Determine if active background is light/white
  const isLightBg = useMemo(() => {
    if (!activeBg) return false;
    const s = activeBg.trim().toLowerCase();
    if (s === "#fff" || s === "#ffffff" || s === "white") return true;
    const hexes = s.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi);
    if (hexes && hexes.length > 0) {
      let totalLum = 0;
      for (const h of hexes) {
        let hex = h.slice(1);
        if (hex.length === 3) {
          hex = hex.split("").map((c) => c + c).join("");
        }
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        totalLum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      }
      return totalLum / hexes.length > 0.58;
    }
    return false;
  }, [activeBg]);

  // Effective text colors based on mode and background luminance
  const effectiveTextColor = useMemo(() => {
    if (textColorMode === "light") return "#FFFFFF";
    if (textColorMode === "dark") return "#0F172A";
    if (textColorMode === "custom") return customTextColor || "#FFFFFF";
    // "auto": light text on dark backgrounds, dark text on light backgrounds
    return isLightBg ? "#0F172A" : "#FFFFFF";
  }, [textColorMode, customTextColor, isLightBg]);

  const isDarkText = effectiveTextColor === "#0F172A" || textColorMode === "dark" || (textColorMode === "auto" && isLightBg);

  const effectiveSubtextColor = isDarkText ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.8)";
  const effectiveBulletColor = isDarkText ? "#1E293B" : "rgba(255, 255, 255, 0.95)";
  const effectiveKickerColor = kickerColor || (isDarkText ? "#0284C7" : "#38BDF8");

  // Deduplicated list of scenes for sidebar selection
  const sceneItems = useMemo(() => {
    const seen = new Set<string>();
    const items: ScreenshotEntry[] = [];
    for (const entry of screenshotEntries) {
      if (entry.sceneId && !seen.has(entry.sceneId)) {
        seen.add(entry.sceneId);
        items.push(entry);
      }
    }
    return items;
  }, [screenshotEntries]);

  // Synchronize scene selection when screenshot entries load
  useEffect(() => {
    if (sceneItems.length > 0) {
      if (!sceneItems.some((s) => s.sceneId === selectedSceneId)) {
        setSelectedSceneId(sceneItems[0]!.sceneId);
      }
      if (!sceneItems.some((s) => s.sceneId === secondarySceneId)) {
        setSecondarySceneId(sceneItems[1]?.sceneId || sceneItems[0]!.sceneId);
      }
      if (!sceneItems.some((s) => s.sceneId === tertiarySceneId)) {
        setTertiarySceneId(
          sceneItems[2]?.sceneId || sceneItems[1]?.sceneId || sceneItems[0]!.sceneId,
        );
      }
    }
  }, [sceneItems, selectedSceneId, secondarySceneId, tertiarySceneId]);

  // Primary / Center phone entry & capture
  const activeEntry =
    screenshotEntries.find((e) => e.sceneId === selectedSceneId) || screenshotEntries[0];
  const activeCapture =
    captures?.screenshots?.find((s) => s.sceneId === activeEntry?.sceneId) ||
    captures?.screenshots?.find((s) => s.sceneId === selectedSceneId) ||
    captures?.screenshots?.[0];

  // Secondary / Left phone entry & capture
  const secondaryEntry =
    screenshotEntries.find((e) => e.sceneId === secondarySceneId) ||
    screenshotEntries[1] ||
    screenshotEntries[0];
  const secondaryCapture =
    captures?.screenshots?.find((s) => s.sceneId === secondaryEntry?.sceneId) ||
    captures?.screenshots?.find((s) => s.sceneId === secondarySceneId) ||
    captures?.screenshots?.[1] ||
    captures?.screenshots?.[0];

  // Tertiary / Right phone entry & capture
  const tertiaryEntry =
    screenshotEntries.find((e) => e.sceneId === tertiarySceneId) ||
    screenshotEntries[2] ||
    screenshotEntries[0];
  const tertiaryCapture =
    captures?.screenshots?.find((s) => s.sceneId === tertiaryEntry?.sceneId) ||
    captures?.screenshots?.find((s) => s.sceneId === tertiarySceneId) ||
    captures?.screenshots?.[2] ||
    captures?.screenshots?.[0];

  const appInitial = (customTitle || "A").charAt(0).toUpperCase();

  // Download & Copy state
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getExportPayload = () => {
    const isRetina = exportResolution === "2x";
    return {
      type: selectedFormat,
      device: spec.key,
      scale: isRetina ? 2 : 1,
      retina: isRetina,
      locale,
      layout: selectedFormat === "instagram-square" ? "center" : "split",
      mockupStyle,
      deviceCount,
      sceneId: selectedSceneId,
      sceneId2: deviceCount !== "single" ? secondarySceneId : undefined,
      sceneId3: deviceCount === "trio" ? tertiarySceneId : undefined,
      kicker: kickerText,
      headline: customHeadline,
      tagline: customTagline,
      benefits: benefits.map((b) => b.text).filter(Boolean),
      background: customBg,
      customIcon: appIconUrl || undefined,
      logoBg,
      logoFit,
    };
  };

  const renderClientBannerBlob = async (): Promise<Blob | null> => {
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

    // Vignette
    const spot = ctx.createRadialGradient(
      width * 0.35,
      height * 0.35,
      width * 0.05,
      width * 0.5,
      height * 0.5,
      width * 0.8,
    );
    spot.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    spot.addColorStop(1, "rgba(0, 0, 0, 0.35)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, width, height);

    // Subtle waves
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.moveTo(width * 0.32, 0);
    ctx.bezierCurveTo(
      width * 0.52,
      height * 0.28,
      width * 0.48,
      height * 0.72,
      width * 0.88,
      height,
    );
    ctx.lineTo(width, height);
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Image loader helper
    const loadImg = (src?: string | null): Promise<HTMLImageElement | null> => {
      if (!src) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    const iconImg = appIconUrl ? await loadImg(appIconUrl) : null;
    const cap1Img = activeCapture?.url ? await loadImg(`/${activeCapture.url}`) : null;
    const cap2Img = secondaryCapture?.url ? await loadImg(`/${secondaryCapture.url}`) : null;
    const cap3Img = tertiaryCapture?.url ? await loadImg(`/${tertiaryCapture.url}`) : null;

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
      // Step-down unrotated intermediate mipmap pre-scaling to eliminate downscale aliasing & pixel breakup
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

    if (selectedFormat === "instagram-square") {
      const iconSize = Math.round(Math.min(width, height) * 0.12);
      const iconX = (width - iconSize) / 2;
      const iconY = height * 0.08;
      const iconR = iconSize * 0.22;

      ctx.save();
      if (logoBg !== "transparent") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
        ctx.shadowBlur = iconSize * 0.3;
        ctx.shadowOffsetY = iconSize * 0.1;

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
        ctx.strokeStyle = isDarkText && (logoBg === "#FFFFFF" || logoBg === "#F8FAFC") ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.25)";
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
      // Split Layout - Google Play Feature Standard
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
      phoneBacklight.addColorStop(0, "rgba(59, 130, 246, 0.28)");
      phoneBacklight.addColorStop(0.5, "rgba(147, 51, 234, 0.12)");
      phoneBacklight.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.save();
      ctx.fillStyle = phoneBacklight;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      const iconSize = Math.round(height * 0.1);
      const iconX = width * 0.06;
      const iconY = height * 0.09;
      const iconR = iconSize * 0.24;

      ctx.save();
      if (logoBg !== "transparent") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = iconSize * 0.35;
        ctx.shadowOffsetY = iconSize * 0.12;

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
        ctx.strokeStyle = isDarkText && (logoBg === "#FFFFFF" || logoBg === "#F8FAFC") ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.3)";
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

    // Downsample 2x SSAA buffer to exact 1x dimensions for store compliance with high quality
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
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const payload = getExportPayload();
      let blob: Blob | null = null;

      // 1. Try server-side export first (via POST with JSON body)
      try {
        const res = await fetch("/api/export-banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          blob = await res.blob();
        } else {
          console.warn("Server banner export responded with status:", res.status);
        }
      } catch (networkErr) {
        console.warn(
          "Backend export request failed, attempting browser canvas fallback:",
          networkErr,
        );
      }

      // 2. Browser HTML5 Canvas Fallback (100% reliable even if server is offline or not restarted)
      if (!blob) {
        blob = await renderClientBannerBlob();
      }

      if (!blob) throw new Error("Could not render banner image");

      const isRetina = exportResolution === "2x";
      const outW = isRetina ? activeFormat.width * 2 : activeFormat.width;
      const outH = isRetina ? activeFormat.height * 2 : activeFormat.height;
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${selectedFormat}-${outW}x${outH}${isRetina ? "@2x" : ""}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download banner");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyClipboard = async () => {
    try {
      const payload = getExportPayload();
      let blob: Blob | null = null;

      try {
        const res = await fetch("/api/export-banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          blob = await res.blob();
        }
      } catch {}

      if (!blob) {
        blob = await renderClientBannerBlob();
      }

      if (!blob) throw new Error("Could not copy banner image");

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not copy image to clipboard");
    }
  };

  const renderPhoneCard = (
    entry?: ScreenshotEntry,
    capture?: any,
    extraClasses = "",
    style: React.CSSProperties = {},
  ) => {
    return (
      <div
        className={`relative overflow-hidden shrink-0 select-none ${
          mockupStyle === "card" ? "rounded-2xl border border-white/25" : "rounded-[22px]"
        } ${extraClasses}`}
        style={{
          aspectRatio: `${entry ? entry.width : spec.screenshot.width} / ${entry ? entry.height : spec.screenshot.height}`,
          ...style,
        }}
      >
        {mockupStyle === "screen" && capture ? (
          <div className="relative h-full w-full rounded-[22px] overflow-hidden bg-neutral-950 p-[2.5px] ring-1 ring-white/25">
            <div className="relative h-full w-full rounded-[20px] overflow-hidden bg-neutral-900">
              <img
                src={`/${capture.url}`}
                alt={entry?.sceneId || "Screenshot"}
                className="h-full w-full object-cover object-top select-none"
                draggable={false}
              />
              {/* Dynamic Island Notch */}
              <div className="absolute top-[2.2%] left-1/2 -translate-x-1/2 h-[3%] w-[28%] bg-black rounded-full shadow-xs border border-neutral-800/80 z-20 pointer-events-none" />
              {/* Specular glass reflection */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 30%, transparent 60%)",
                }}
              />
              <div className="absolute bottom-[1.8%] left-1/2 -translate-x-1/2 h-[0.7%] w-[36%] bg-white/40 rounded-full z-20 pointer-events-none" />
            </div>
          </div>
        ) : entry ? (
          entry.render(false)
        ) : capture ? (
          <img
            src={`/${capture.url}`}
            alt="Screenshot"
            className="h-full w-full object-cover rounded-2xl select-none"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/10 text-white/60 text-xs">
            No Screenshot
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top Banner Format Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-6 py-2.5 backdrop-blur-md">
        {/* Left Format Tabs */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5">
          {BANNER_FORMATS.map((fmt) => (
            <button
              key={fmt.key}
              type="button"
              onClick={() => setSelectedFormat(fmt.key)}
              className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer select-none ${
                selectedFormat === fmt.key
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{fmt.shortLabel || fmt.label}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md font-normal ${
                  selectedFormat === fmt.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background/80 text-muted-foreground border border-border/50"
                }`}
              >
                {fmt.width}×{fmt.height}
              </span>
              {fmt.badge ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    selectedFormat === fmt.key
                      ? "bg-primary-foreground/25 text-primary-foreground"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {fmt.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Right Actions: Safe Area Toggle, Copy, Download */}
        <div className="flex shrink-0 items-center gap-2 ml-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSafeArea(!showSafeArea)}
            className={`h-8.5 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer border-border/80 whitespace-nowrap shrink-0 transition-all ${
              showSafeArea
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs"
                : "bg-background/80 hover:bg-muted text-muted-foreground"
            }`}
          >
            {showSafeArea ? (
              <Eye className="size-3.5 text-amber-500" />
            ) : (
              <EyeOff className="size-3.5" />
            )}
            <span>{showSafeArea ? "Safe Area: ON" : "Safe Area"}</span>
          </Button>

          {/* Resolution Selector: 1x Store Spec vs 2x Retina */}
          <div className="flex items-center rounded-xl bg-muted/80 p-0.5 border border-border/80 shrink-0">
            <button
              type="button"
              onClick={() => setExportResolution("1x")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                exportResolution === "1x"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Store Spec: exact 1024×500 with 2x SSAA downsampling for Google Play Console"
            >
              1x Store
            </button>
            <button
              type="button"
              onClick={() => setExportResolution("2x")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                exportResolution === "2x"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Ultra HD Retina: 2048×1000 crystal clear for marketing and presentations"
            >
              2x Retina
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyClipboard}
            className="h-8.5 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer border-border/80 bg-background/80 hover:bg-muted whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied PNG!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy Image</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-8.5 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
          >
            {isDownloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>
              Download PNG (
              {exportResolution === "2x" ? activeFormat.width * 2 : activeFormat.width}×
              {exportResolution === "2x" ? activeFormat.height * 2 : activeFormat.height})
            </span>
          </Button>
        </div>
      </div>

      {/* Main Studio Body: Canvas on Left/Center, Controls on Right */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Banner Preview Canvas Area */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 overflow-auto bg-neutral-950/20 dark:bg-black/40">
          <div className="flex flex-col items-center gap-4 max-w-full">
            {/* Quick Edit Toolbar Directly Above Banner Card */}
            <div className="w-full max-w-[960px] flex flex-wrap items-center justify-between gap-2 px-1 select-none">
              {/* Left: Quick Label & Format Info */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Quick Edit</span>
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/50">
                  {activeFormat.shortLabel} · {activeFormat.width}×{activeFormat.height}
                </span>
              </div>

              {/* Right: Quick Controls (Text Color Mode, Kicker Color, Background) */}
              <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md p-1 rounded-xl border border-border/70 shadow-xs">
                {/* Text Color Segmented Control */}
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground px-1.5 flex items-center gap-1">
                    <Type className="size-3 text-primary" />
                    <span>Text:</span>
                  </span>

                  {/* Auto button */}
                  <button
                    type="button"
                    onClick={() => setTextColorMode("auto")}
                    title="Smart Auto-Contrast: Automatically switches text color based on background luminance"
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                      textColorMode === "auto"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Auto {isLightBg ? "(Dark)" : "(Light)"}
                  </button>

                  {/* Dark text button */}
                  <button
                    type="button"
                    onClick={() => setTextColorMode("dark")}
                    title="Dark Text: High contrast for white/light card backgrounds"
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md cursor-pointer flex items-center gap-1 transition-all ${
                      textColorMode === "dark"
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs ring-1 ring-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="size-2 rounded-full bg-neutral-950 border border-white/50" />
                    <span>Dark</span>
                  </button>

                  {/* Light text button */}
                  <button
                    type="button"
                    onClick={() => setTextColorMode("light")}
                    title="Light Text: High contrast for dark/colorful backgrounds"
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md cursor-pointer flex items-center gap-1 transition-all ${
                      textColorMode === "light"
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs ring-1 ring-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="size-2 rounded-full bg-white border border-neutral-400" />
                    <span>Light</span>
                  </button>

                  {/* Custom Text Color Picker Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        title="Pick Custom Text Color"
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md cursor-pointer flex items-center gap-1 transition-all ${
                          textColorMode === "custom"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className="size-2.5 rounded-full border border-border/80"
                          style={{ backgroundColor: customTextColor }}
                        />
                        <Palette className="size-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 space-y-2.5" side="bottom" align="end">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Custom Text Color</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{customTextColor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTextColor.startsWith("#") ? customTextColor : "#0F172A"}
                          onChange={(e) => {
                            setCustomTextColor(e.target.value);
                            setTextColorMode("custom");
                          }}
                          className="size-8 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                        />
                        <Input
                          type="text"
                          value={customTextColor}
                          onChange={(e) => {
                            setCustomTextColor(e.target.value);
                            setTextColorMode("custom");
                          }}
                          className="h-8 flex-1 text-xs font-mono uppercase"
                          placeholder="#0F172A"
                        />
                      </div>
                      <div className="text-[10px] font-medium text-muted-foreground pt-0.5">Quick Swatches</div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {["#0F172A", "#1E293B", "#334155", "#FFFFFF", "#F8FAFC", "#2563EB", "#059669", "#7C3AED", "#DC2626", "#EA580C", "#D97706", "#0284C7"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCustomTextColor(c);
                              setTextColorMode("custom");
                            }}
                            className={`size-6 rounded-md border border-border/60 cursor-pointer transition-transform hover:scale-110 ${
                              customTextColor === c ? "ring-2 ring-primary ring-offset-1" : ""
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Quick Kicker Tag / Badge Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 gap-1.5 rounded-lg text-[10px] font-medium border-border/70 cursor-pointer hover:border-primary/50"
                      title="Edit Kicker Tag (Presets, Style, Color)"
                    >
                      <Tag className="size-3 shrink-0" style={{ color: effectiveKickerColor }} />
                      <span className="max-w-[85px] truncate font-semibold">
                        {kickerText || "Tag"}
                      </span>
                      {kickerStyle === "badge" ? (
                        <span
                          className="text-[8px] font-extrabold px-1 rounded-sm uppercase tracking-wide border leading-tight"
                          style={{
                            color: effectiveKickerColor,
                            borderColor: hexToRgba(effectiveKickerColor, 0.4),
                            backgroundColor: hexToRgba(effectiveKickerColor, 0.15),
                          }}
                        >
                          Pill
                        </span>
                      ) : (
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: effectiveKickerColor }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3.5 space-y-3" side="bottom" align="end">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Tag className="size-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground">Kicker Tag / Badge</span>
                      </div>
                      {kickerColor || kickerStyle !== "text" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setKickerColor("");
                            setKickerStyle("text");
                          }}
                          className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <RotateCcw className="size-2.5" />
                          <span>Reset</span>
                        </button>
                      ) : null}
                    </div>

                    {/* Tag Text Input */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Tag Text
                        </label>
                        <span className="text-[9px] font-mono text-muted-foreground">{kickerText.length} chars</span>
                      </div>
                      <Input
                        value={kickerText}
                        onChange={(e) => setKickerText(e.target.value)}
                        placeholder="e.g. FINANCE APP, ★ FEATURED"
                        className="h-7.5 text-xs font-semibold uppercase tracking-wider"
                      />
                    </div>

                    {/* Style Toggle (Plain Eyebrow vs Pill Badge) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Display Style
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setKickerStyle("text")}
                          className={`py-1 rounded-md transition-all cursor-pointer ${
                            kickerStyle === "text"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Plain Eyebrow
                        </button>
                        <button
                          type="button"
                          onClick={() => setKickerStyle("badge")}
                          className={`py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            kickerStyle === "badge"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-primary" />
                          <span>Pill Badge</span>
                        </button>
                      </div>
                    </div>

                    {/* Presets & Suggestions */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Presets & Suggestions
                      </label>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {KICKER_PRESETS.map((grp) => (
                          <div key={grp.category} className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wide uppercase">
                              {grp.category}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {grp.tags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setKickerText(tag)}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border ${
                                    kickerText.toUpperCase() === tag
                                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                                      : "bg-muted/70 text-foreground/90 border-border/60 hover:bg-muted hover:border-primary/50"
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Accent Color Palette & Custom Hex */}
                    <div className="space-y-1.5 pt-1 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Accent Color
                        </label>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {effectiveKickerColor}
                        </span>
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {KICKER_COLOR_SWATCHES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setKickerColor(c)}
                            className={`size-6 rounded-md border border-border/60 cursor-pointer transition-transform hover:scale-115 ${
                              kickerColor === c ? "ring-2 ring-primary ring-offset-1 scale-105" : ""
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="color"
                          value={kickerColor.startsWith("#") ? kickerColor : (isDarkText ? "#0284C7" : "#38BDF8")}
                          onChange={(e) => setKickerColor(e.target.value)}
                          className="size-7 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                        />
                        <Input
                          type="text"
                          value={kickerColor}
                          onChange={(e) => setKickerColor(e.target.value)}
                          placeholder="Custom Hex (e.g. #38BDF8)"
                          className="h-7 text-xs font-mono uppercase flex-1"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Quick Logo Background & Fit Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 gap-1.5 rounded-lg text-[10px] font-medium border-border/70 cursor-pointer hover:border-primary/50"
                      title="Edit Logo Background & Fit (Transparent, White, Custom, Gradient)"
                    >
                      <div
                        className="size-3 rounded-xs flex items-center justify-center shrink-0 overflow-hidden border border-border/60"
                        style={{
                          background:
                            logoBg === "transparent"
                              ? "repeating-conic-gradient(#94a3b8 0% 25%, transparent 0% 50%) 50% / 4px 4px"
                              : resolvedLogoBackground,
                        }}
                      >
                        {appIconUrl ? (
                          <img src={appIconUrl} alt="" className="size-full object-contain" />
                        ) : (
                          <span className="text-[6px] font-black text-white">{appInitial}</span>
                        )}
                      </div>
                      <span className="font-semibold">Logo BG</span>
                      <span className="text-[9px] text-muted-foreground capitalize font-mono">
                        {logoBg === "gradient" ? "Grad" : logoBg === "transparent" ? "Clear" : logoBg === "#FFFFFF" ? "White" : logoBg.startsWith("#") ? logoBg.slice(0, 4) : "Custom"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 space-y-2.5" side="bottom" align="end">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-foreground">Logo Background & Fit</span>
                      </div>
                      {logoBg !== "gradient" || logoFit !== "cover" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoBg("gradient");
                            setLogoFit("cover");
                          }}
                          className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <RotateCcw className="size-2.5" />
                          <span>Reset</span>
                        </button>
                      ) : null}
                    </div>

                    {/* Quick Presets (Transparent, White, Dark, Gradient) */}
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => setLogoBg("transparent")}
                        className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          logoBg === "transparent"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                        }`}
                        title="Transparent: No background squircle, lets PNG float clean"
                      >
                        <div className="size-4 rounded-xs border border-border/60 bg-[repeating-conic-gradient(#94a3b8_0%_25%,transparent_0%_50%)_50%/4px_4px]" />
                        <span>Clear</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoBg("#FFFFFF")}
                        className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          logoBg === "#FFFFFF"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                        }`}
                        title="White: Clean white card squircle for dark/colorful logos"
                      >
                        <div className="size-4 rounded-xs bg-white border border-neutral-300 shadow-2xs" />
                        <span>White</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoBg("#0F172A")}
                        className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          logoBg === "#0F172A"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                        }`}
                        title="Dark: Dark slate squircle for light/white logos"
                      >
                        <div className="size-4 rounded-xs bg-[#0F172A] border border-neutral-700 shadow-2xs" />
                        <span>Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoBg("gradient")}
                        className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          logoBg === "gradient"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                        }`}
                        title="Gradient: Default vibrant app icon gradient"
                      >
                        <div className="size-4 rounded-xs bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 border border-white/20 shadow-2xs" />
                        <span>Gradient</span>
                      </button>
                    </div>

                    {/* Brand Color Swatches */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Custom Color
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {logoBg.startsWith("#") ? logoBg : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {LOGO_COLOR_SWATCHES.slice(0, 12).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setLogoBg(c)}
                            className={`size-6 rounded-md border border-border/60 cursor-pointer transition-transform hover:scale-115 ${
                              logoBg === c ? "ring-2 ring-primary ring-offset-1 scale-105" : ""
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="color"
                          value={logoBg.startsWith("#") ? logoBg : "#FFFFFF"}
                          onChange={(e) => setLogoBg(e.target.value)}
                          className="size-7 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                        />
                        <Input
                          type="text"
                          value={logoBg.startsWith("#") ? logoBg : ""}
                          onChange={(e) => setLogoBg(e.target.value)}
                          placeholder="#FFFFFF or Hex"
                          className="h-7 text-xs font-mono uppercase flex-1"
                        />
                      </div>
                    </div>

                    {/* Inset / Padding Toggle */}
                    <div className="space-y-1 pt-1 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Icon Fit & Padding
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setLogoFit("cover")}
                          className={`py-1 rounded-md transition-all cursor-pointer ${
                            logoFit === "cover"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Full Bleed: Icon fills entire squircle without padding"
                        >
                          Full Bleed (Cover)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoFit("contain")}
                          className={`py-1 rounded-md transition-all cursor-pointer ${
                            logoFit === "contain"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Inset Icon: Adds padding so transparent PNG symbols sit centered nicely"
                        >
                          Inset (Padding)
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Quick Background Picker */}
                <SceneBackgroundPopover
                  value={customBg}
                  globalBackground={background}
                  onChange={setCustomBg}
                  side="bottom"
                  align="end"
                  sceneName="Banner Card"
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 gap-1.5 rounded-lg text-[10px] font-medium border-border/70 cursor-pointer"
                      title="Change Card Background"
                    >
                      <span
                        className="size-3 rounded-full border border-white/20 shrink-0 shadow-2xs"
                        style={{ background: activeBg }}
                      />
                      <span>Card BG</span>
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Banner Canvas Frame */}
            <div
              className="relative w-full max-w-[960px] rounded-2xl overflow-hidden shadow-2xl border border-white/15 transition-all select-none @container"
              style={{
                aspectRatio: activeFormat.aspect,
                background: activeBg,
                containerType: "size",
              }}
            >
              {/* Radial Lighting / Spotlight */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isLightBg
                    ? "radial-gradient(circle at 35% 35%, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.06) 100%)"
                    : "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.3) 100%)",
                }}
              />

              {/* Organic Background Wave Curves */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ opacity: isLightBg ? 0.08 : 0.25 }}
                viewBox="0 0 1024 500"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M320,0 C530,140 490,360 900,500 L1024,500 L1024,0 Z"
                  fill={isLightBg ? "#000000" : "white"}
                  fillOpacity="0.12"
                  stroke={isLightBg ? "#000000" : "white"}
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
                <path
                  d="M470,0 C690,110 590,410 1024,340 L1024,0 Z"
                  fill={isLightBg ? "#000000" : "white"}
                  fillOpacity="0.08"
                  stroke={isLightBg ? "#000000" : "white"}
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                />
              </svg>

              {/* Safe Area Guideline Overlay */}
              {showSafeArea ? (
                <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                  <div
                    className="absolute inset-0 border-[3px] border-dashed border-amber-400/90 shadow-[inset_0_0_0_9999px_rgba(245,158,11,0.08)] transition-all"
                    style={{
                      top: safeAreaMargin,
                      bottom: safeAreaMargin,
                      left: safeAreaMargin,
                      right: safeAreaMargin,
                    }}
                  >
                    {/* Top-Left Safe Area Badge */}
                    <div className="absolute -top-3.5 left-2 bg-amber-500 text-black text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-md flex items-center gap-1">
                      <span>Safe Zone ({safeAreaMargin})</span>
                    </div>

                    {/* Bottom-Right Warning Badge */}
                    <div className="absolute -bottom-3.5 right-2 bg-amber-500 text-black text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-md">
                      <span>Keep Core Copy & Brand Inside</span>
                    </div>

                    {/* Center Crosshair guidelines */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-amber-400/30" />
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-amber-400/30" />
                  </div>

                  {/* Top Center Simulator Banner */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/40 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-amber-400" />
                    <span>Store Crop Simulator Active</span>
                  </div>
                </div>
              ) : null}

              {/* Banner Layout Content */}
              {selectedFormat === "instagram-square" ? (
                // ============================================
                // CENTER LAYOUT
                // ============================================
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-6 sm:p-8 text-center">
                  {/* Top: Icon, Kicker, Headline, Subtitle */}
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0">
                    <div
                      className={`size-13 sm:size-16 rounded-[22%] flex items-center justify-center text-white font-bold text-xl sm:text-2xl overflow-hidden transition-all ${
                        logoBg === "transparent"
                          ? ""
                          : isDarkText && (logoBg === "#FFFFFF" || logoBg === "#F8FAFC")
                            ? "shadow-lg border border-black/10"
                            : "shadow-xl border border-white/25"
                      }`}
                      style={{ background: resolvedLogoBackground }}
                    >
                      {appIconUrl ? (
                        <img
                          src={appIconUrl}
                          alt="App Logo"
                          className={`w-full h-full ${
                            logoFit === "contain" ? "object-contain p-[12%]" : "object-cover"
                          }`}
                        />
                      ) : (
                        <span>{appInitial}</span>
                      )}
                    </div>

                    {kickerStyle === "badge" ? (
                      <span
                        className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs backdrop-blur-xs"
                        style={{
                          color: effectiveKickerColor,
                          borderColor: hexToRgba(effectiveKickerColor, 0.35),
                          backgroundColor: hexToRgba(effectiveKickerColor, 0.15),
                        }}
                      >
                        {kickerText || "FEATURED APP"}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-widest"
                        style={{ color: effectiveKickerColor }}
                      >
                        {kickerText || "FEATURED APP"}
                      </span>
                    )}

                    <h2
                      className="text-lg sm:text-2xl font-extrabold tracking-tight"
                      style={{
                        color: effectiveTextColor,
                        textShadow: isDarkText ? "none" : "0 2px 4px rgba(0,0,0,0.35)",
                      }}
                    >
                      {customHeadline}
                    </h2>

                    <p
                      className="max-w-md text-xs sm:text-sm font-medium"
                      style={{ color: effectiveSubtextColor }}
                    >
                      {customTagline}
                    </p>
                  </div>

                  {/* Bottom: Rising Mockup */}
                  <div className="relative flex-1 w-full flex items-end justify-center overflow-hidden pt-2">
                    <div className="h-full max-h-[380px] transform hover:-translate-y-1 transition-transform translate-y-3">
                      {renderPhoneCard(activeEntry, activeCapture, "h-full")}
                    </div>
                  </div>
                </div>
              ) : (
                // ============================================
                // SPLIT LAYOUT (Store Feature Graphic Standard)
                // ============================================
                <div
                  className="absolute inset-0 z-10 flex items-center justify-between"
                  style={{
                    paddingLeft: "6cqw",
                    paddingRight: "4cqw",
                    paddingTop: "5cqh",
                    paddingBottom: "5cqh",
                  }}
                >
                  {/* Left Column: Brand, Kicker, Headline, Subtitle, 3 Benefits */}
                  <div
                    className="flex flex-col justify-center h-full"
                    style={{
                      width: deviceCount === "trio" ? "42cqw" : "45cqw",
                      gap: "2cqh",
                    }}
                  >
                    {/* 1. Brand Row: Squircle Logo + Wordmark */}
                    <div className="flex items-center" style={{ gap: "2cqw" }}>
                      <div
                        className={`rounded-[22%] flex items-center justify-center text-white font-black shrink-0 overflow-hidden transition-all ${
                          logoBg === "transparent"
                            ? ""
                            : isDarkText && (logoBg === "#FFFFFF" || logoBg === "#F8FAFC")
                              ? "shadow-md border border-black/10"
                              : "shadow-lg border border-white/30"
                        }`}
                        style={{
                          width: "9.5cqh",
                          height: "9.5cqh",
                          fontSize: "5cqh",
                          background: resolvedLogoBackground,
                        }}
                      >
                        {appIconUrl ? (
                          <img
                            src={appIconUrl}
                            alt="App Logo"
                            className={`w-full h-full ${
                              logoFit === "contain" ? "object-contain p-[12%]" : "object-cover"
                            }`}
                          />
                        ) : (
                          <span>{appInitial}</span>
                        )}
                      </div>
                      <span
                        className="font-black tracking-tight whitespace-nowrap overflow-hidden"
                        style={{
                          fontSize: "5.4cqh",
                          maxWidth: "32cqw",
                          textOverflow: "ellipsis",
                          color: effectiveTextColor,
                          textShadow: isDarkText ? "none" : "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      >
                        {customTitle}
                      </span>
                    </div>

                    {/* 2. Kicker / Category Eyebrow */}
                    <div style={{ marginTop: "0.2cqh" }}>
                      {kickerStyle === "badge" ? (
                        <span
                          className="inline-flex items-center font-extrabold uppercase rounded-full border shadow-2xs backdrop-blur-xs"
                          style={{
                            fontSize: "2.1cqh",
                            letterSpacing: "0.08em",
                            color: effectiveKickerColor,
                            borderColor: hexToRgba(effectiveKickerColor, 0.35),
                            backgroundColor: hexToRgba(effectiveKickerColor, 0.15),
                            paddingLeft: "1.2cqw",
                            paddingRight: "1.2cqw",
                            paddingTop: "0.3cqh",
                            paddingBottom: "0.3cqh",
                          }}
                        >
                          {kickerText || "FEATURED APP"}
                        </span>
                      ) : (
                        <span
                          className="font-extrabold uppercase"
                          style={{
                            fontSize: "2.4cqh",
                            letterSpacing: "0.14em",
                            color: effectiveKickerColor,
                          }}
                        >
                          {kickerText || "FEATURED APP"}
                        </span>
                      )}
                    </div>

                    {/* 3. Main Marketing Headline */}
                    <h2
                      className="font-black tracking-tight line-clamp-2"
                      style={{
                        fontSize: deviceCount === "trio" ? "6.8cqh" : "7.5cqh",
                        lineHeight: 1.15,
                        color: effectiveTextColor,
                        textShadow: isDarkText ? "none" : "0 2px 4px rgba(0,0,0,0.35)",
                      }}
                    >
                      {customHeadline}
                    </h2>

                    {/* 4. Subtitle / Tagline */}
                    <p
                      className="font-medium line-clamp-2"
                      style={{
                        fontSize: "3.2cqh",
                        lineHeight: 1.32,
                        color: effectiveSubtextColor,
                      }}
                    >
                      {customTagline}
                    </p>

                    {/* 5. 2–3 Short Benefits Bullets */}
                    {benefits && benefits.length > 0 ? (
                      <div
                        className="flex flex-col"
                        style={{
                          marginTop: "0.4cqh",
                          gap: "1.2cqh",
                        }}
                      >
                        {benefits.slice(0, 3).map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center"
                            style={{ gap: "1.8cqw", color: effectiveBulletColor }}
                          >
                            <div
                              className="rounded-full bg-emerald-500 shrink-0 shadow-xs"
                              style={{ width: "1.3cqh", height: "1.3cqh" }}
                            />
                            <span className="font-semibold truncate" style={{ fontSize: "2.7cqh" }}>
                              {b.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Right Column: Multi-Phone Showcase Cluster */}
                  <div
                    className="relative h-full flex items-center justify-center overflow-visible"
                    style={{
                      width: deviceCount === "trio" ? "53cqw" : "49cqw",
                    }}
                  >
                    {/* Radial backlight behind phones */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(circle at 60% 50%, rgba(59,130,246,0.3) 0%, rgba(147,51,234,0.15) 50%, rgba(0,0,0,0) 75%)",
                      }}
                    />

                    {deviceCount === "trio" ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Left Phone (Behind, tilted -7.5deg) */}
                        <div
                          className="absolute z-10 transition-all"
                          style={{
                            height: "79cqh",
                            top: "10cqh",
                            left: "7%",
                            transform: "rotate(-7.5deg)",
                          }}
                        >
                          {renderPhoneCard(
                            secondaryEntry,
                            secondaryCapture,
                            "h-full opacity-95 shadow-[0_18px_36px_rgba(0,0,0,0.42)]",
                          )}
                        </div>

                        {/* Right Phone (Behind, tilted +7.5deg) */}
                        <div
                          className="absolute z-10 transition-all"
                          style={{
                            height: "79cqh",
                            top: "10cqh",
                            right: "7%",
                            transform: "rotate(7.5deg)",
                          }}
                        >
                          {renderPhoneCard(
                            tertiaryEntry,
                            tertiaryCapture,
                            "h-full opacity-95 shadow-[0_18px_36px_rgba(0,0,0,0.42)]",
                          )}
                        </div>

                        {/* Center Phone (Hero Front, upright, overlapping side phones at bottom) */}
                        <div
                          className="relative z-20 transform hover:scale-[1.03] transition-all duration-300"
                          style={{
                            height: "81cqh",
                            top: "0.5cqh",
                          }}
                        >
                          {renderPhoneCard(
                            activeEntry,
                            activeCapture,
                            "h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.65)]",
                          )}
                        </div>
                      </div>
                    ) : deviceCount === "duo" ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Right / Back Phone (Tilted +7.5deg) */}
                        <div
                          className="absolute z-10 transition-all duration-300 hover:scale-[1.02]"
                          style={{
                            height: "80cqh",
                            top: "10cqh",
                            right: "11%",
                            transform: "rotate(7.5deg)",
                          }}
                        >
                          {renderPhoneCard(
                            secondaryEntry,
                            secondaryCapture,
                            "h-full opacity-95 shadow-[0_20px_45px_rgba(0,0,0,0.45)]",
                          )}
                        </div>

                        {/* Left / Front Phone (Tilted -7.5deg, overlapping right phone at bottom) */}
                        <div
                          className="absolute z-20 transform hover:scale-[1.03] transition-all duration-300"
                          style={{
                            height: "80cqh",
                            top: "10cqh",
                            left: "11%",
                            transform: "rotate(-7.5deg)",
                          }}
                        >
                          {renderPhoneCard(
                            activeEntry,
                            activeCapture,
                            "h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.65)]",
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Single Phone */
                      <div
                        className="relative z-20 transform hover:scale-[1.03] transition-all duration-300"
                        style={{
                          height: "82cqh",
                        }}
                      >
                        {renderPhoneCard(
                          activeEntry,
                          activeCapture,
                          "h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.6)]",
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Description & Store upload guidance note */}
            <p className="text-[11px] text-muted-foreground text-center max-w-lg">
              {activeFormat.description}. Bundled automatically in the Store ZIP package.
            </p>
          </div>
        </div>

        {/* Right Customizer Sidebar */}
        <div className="w-[320px] shrink-0 border-l border-border/70 bg-sidebar p-4 space-y-4 overflow-y-auto text-sidebar-foreground">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Sparkles className="size-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Banner Customizer
            </h3>
          </div>

          {/* 1. Safe Area & Cutoff Zones Section */}
          <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-amber-500" />
                <span>Store Safe Area Overlay</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSafeArea(!showSafeArea)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${
                  showSafeArea
                    ? "bg-amber-500 text-black shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {showSafeArea ? "ON" : "OFF"}
              </button>
            </div>

            {showSafeArea ? (
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Cutoff Margin Preset
                </span>
                <div className="grid grid-cols-3 gap-1 bg-background/80 p-1 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setSafeAreaMargin("15%")}
                    className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                      safeAreaMargin === "15%"
                        ? "bg-amber-500 text-black shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Play (15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafeAreaMargin("20%")}
                    className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                      safeAreaMargin === "20%"
                        ? "bg-amber-500 text-black shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Strict (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafeAreaMargin("8%")}
                    className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                      safeAreaMargin === "8%"
                        ? "bg-amber-500 text-black shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Bleed (8%)
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* 2. Multi-Phone Showcase & Screens Setup */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="size-3.5 text-blue-500" />
              <span>Phone Mockups Arrangement</span>
            </span>

            {/* Device Count Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setDeviceCount("single")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  deviceCount === "single"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                1 phone
              </button>
              <button
                type="button"
                onClick={() => setDeviceCount("duo")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  deviceCount === "duo"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                2 phone
              </button>
              <button
                type="button"
                onClick={() => setDeviceCount("trio")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  deviceCount === "trio"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                3 phone
              </button>
            </div>

            {/* Phone Screen Assigners */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {deviceCount === "duo"
                    ? "Left Screen (Front)"
                    : deviceCount === "trio"
                      ? "Center Screen (Hero Front)"
                      : "Hero Screen"}
                </span>
                <select
                  value={selectedSceneId}
                  onChange={(e) => setSelectedSceneId(e.target.value)}
                  className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs font-medium cursor-pointer"
                >
                  {sceneItems.map((entry) => (
                    <option key={entry.sceneId} value={entry.sceneId}>
                      {copy[entry.sceneId]?.headline?.[locale] || entry.sceneId}
                    </option>
                  ))}
                </select>
              </div>

              {deviceCount !== "single" ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {deviceCount === "duo"
                      ? "Right Screen (Tilted Back)"
                      : "Left Screen (Fanned Back)"}
                  </span>
                  <select
                    value={secondarySceneId}
                    onChange={(e) => setSecondarySceneId(e.target.value)}
                    className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs font-medium cursor-pointer"
                  >
                    {sceneItems.map((entry) => (
                      <option key={entry.sceneId} value={entry.sceneId}>
                        {copy[entry.sceneId]?.headline?.[locale] || entry.sceneId}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {deviceCount === "trio" ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Right Screen (Fanned Back)
                  </span>
                  <select
                    value={tertiarySceneId}
                    onChange={(e) => setTertiarySceneId(e.target.value)}
                    className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs font-medium cursor-pointer"
                  >
                    {sceneItems.map((entry) => (
                      <option key={entry.sceneId} value={entry.sceneId}>
                        {copy[entry.sceneId]?.headline?.[locale] || entry.sceneId}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </div>

          {/* 3. Marketing Content Hierarchy */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-purple-500" />
              <span>Marketing Hierarchy</span>
            </span>

            {/* App Icon / Logo Uploader */}
            <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-border/80 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-blue-500" />
                  <span>App Icon / Logo</span>
                </span>
                {appIconUrl ? (
                  <button
                    type="button"
                    onClick={handleResetIcon}
                    className="text-[10px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Reset to Initial
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                {/* Logo Preview Squircle */}
                <div
                  className={`size-12 rounded-[22%] flex items-center justify-center text-white font-black text-lg overflow-hidden shrink-0 transition-all ${
                    logoBg === "transparent" ? "border border-border/80 bg-neutral-900/40" : "shadow-md border border-white/25"
                  }`}
                  style={{ background: resolvedLogoBackground }}
                >
                  {appIconUrl ? (
                    <img
                      src={appIconUrl}
                      alt="App Icon Preview"
                      className={`w-full h-full ${
                        logoFit === "contain" ? "object-contain p-1.5" : "object-cover"
                      }`}
                    />
                  ) : (
                    <span>{appInitial}</span>
                  )}
                </div>

                {/* Upload Control */}
                <div className="flex-1 flex flex-col gap-1">
                  <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-primary/60 bg-background/60 hover:bg-background text-xs font-medium text-foreground cursor-pointer transition-all">
                    {uploadingIcon ? (
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                    ) : (
                      <Upload className="size-3.5 text-primary" />
                    )}
                    <span>{appIconUrl ? "Change Logo" : "Upload App Logo"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleIconUpload}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    PNG, JPG or WebP (512×512 recommended)
                  </span>
                </div>
              </div>

              {/* Logo Background & Fit Controls */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Logo Background
                  </span>
                  {logoBg !== "gradient" ? (
                    <button
                      type="button"
                      onClick={() => setLogoBg("gradient")}
                      className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <RotateCcw className="size-2.5" />
                      <span>Reset</span>
                    </button>
                  ) : null}
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => setLogoBg("transparent")}
                    className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      logoBg === "transparent"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                    }`}
                  >
                    <span>Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoBg("#FFFFFF")}
                    className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      logoBg === "#FFFFFF"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                    }`}
                  >
                    <span className="size-2 rounded-full bg-white border border-neutral-300" />
                    <span>White</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoBg("#0F172A")}
                    className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      logoBg === "#0F172A"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                    }`}
                  >
                    <span className="size-2 rounded-full bg-neutral-900 border border-neutral-700" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoBg("gradient")}
                    className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      logoBg === "gradient"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                    }`}
                  >
                    <span>Gradient</span>
                  </button>
                </div>

                {/* Swatches & Color Picker */}
                <div className="grid grid-cols-6 gap-1">
                  {LOGO_COLOR_SWATCHES.slice(0, 12).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLogoBg(c)}
                      className={`h-5 rounded-md border border-border/60 cursor-pointer transition-transform hover:scale-110 ${
                        logoBg === c ? "ring-2 ring-primary ring-offset-1 scale-105" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={logoBg.startsWith("#") ? logoBg : "#FFFFFF"}
                    onChange={(e) => setLogoBg(e.target.value)}
                    className="size-6 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                  />
                  <Input
                    type="text"
                    value={logoBg.startsWith("#") ? logoBg : ""}
                    onChange={(e) => setLogoBg(e.target.value)}
                    placeholder="Custom Hex (e.g. #FFFFFF)"
                    className="h-6.5 text-[11px] font-mono uppercase flex-1"
                  />
                </div>

                {/* Fit / Padding Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Icon Fit
                  </span>
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setLogoFit("cover")}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        logoFit === "cover"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Full Bleed
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoFit("contain")}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        logoFit === "contain"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Inset (Padding)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* App Title / Wordmark */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="banner-app-title"
                className="text-[11px] font-semibold text-muted-foreground"
              >
                Brand / App Wordmark
              </label>
              <Input
                id="banner-app-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="App Brand Name"
                className="h-8 text-xs font-medium"
              />
            </div>

            {/* Kicker Headline / Category Eyebrow */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="banner-kicker"
                  className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"
                >
                  <Tag className="size-3 text-primary" />
                  <span>Kicker / Category Eyebrow</span>
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {kickerStyle === "badge" ? "Pill Badge" : "Eyebrow"}
                </span>
              </div>
              <Input
                id="banner-kicker"
                value={kickerText}
                onChange={(e) => setKickerText(e.target.value)}
                placeholder="PRODUCTIVITY APP"
                className="h-8 text-xs font-medium uppercase tracking-wide"
              />
              {/* Quick suggestion chips under input */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  "★ FEATURED APP",
                  "FINANCE & BUDGET",
                  "EXPENSE TRACKER",
                  "⚡ SMART & FAST",
                  "🔥 EDITOR'S CHOICE",
                  "WORKS OFFLINE",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setKickerText(tag)}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer border ${
                      kickerText.toUpperCase() === tag
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/60 text-muted-foreground border-border/50 hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Marketing Headline */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="banner-headline"
                className="text-[11px] font-semibold text-muted-foreground"
              >
                Main Headline
              </label>
              <Input
                id="banner-headline"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                placeholder="Main Marketing Headline"
                className="h-8 text-xs font-medium"
              />
            </div>

            {/* Subtitle / Tagline */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="banner-tagline"
                className="text-[11px] font-semibold text-muted-foreground"
              >
                Subtitle / Tagline
              </label>
              <Input
                id="banner-tagline"
                value={customTagline}
                onChange={(e) => setCustomTagline(e.target.value)}
                placeholder="Subtitle explaining key value"
                className="h-8 text-xs font-medium"
              />
            </div>

            {/* 3 Short Benefits */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                3 Short Benefits / Features
              </span>
              {benefits.map((b, idx) => (
                <div key={b.id} className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold text-xs shrink-0">•</span>
                  <Input
                    value={b.text}
                    onChange={(e) => {
                      const next = [...benefits];
                      next[idx] = { id: b.id, text: e.target.value };
                      setBenefits(next);
                    }}
                    placeholder={`Benefit ${idx + 1}`}
                    className="h-7 text-xs font-medium flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 4. Mockup Style */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-foreground">Mockup Style</span>
              <div className="grid grid-cols-2 gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setMockupStyle("screen")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mockupStyle === "screen"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Device Screen
                </button>
                <button
                  type="button"
                  onClick={() => setMockupStyle("card")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mockupStyle === "card"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Full Card
                </button>
              </div>
            </div>
          </div>

          {/* 5. Typography & Text Colors */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Type className="size-3.5 text-primary" />
                <span>Text Contrast & Color</span>
              </span>
              {textColorMode !== "auto" || kickerColor ? (
                <button
                  type="button"
                  onClick={() => {
                    setTextColorMode("auto");
                    setKickerColor("");
                  }}
                  className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="size-2.5" />
                  <span>Reset to Auto</span>
                </button>
              ) : null}
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-4 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setTextColorMode("auto")}
                className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  textColorMode === "auto"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Auto Contrast based on background"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setTextColorMode("dark")}
                className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  textColorMode === "dark"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dark text (#0F172A)"
              >
                <span className="size-2 rounded-full bg-neutral-950 border border-white/50" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTextColorMode("light")}
                className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  textColorMode === "light"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Light text (#FFFFFF)"
              >
                <span className="size-2 rounded-full bg-white border border-neutral-400" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTextColorMode("custom")}
                className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  textColorMode === "custom"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Custom color"
              >
                <Palette className="size-2.5" />
                <span>Custom</span>
              </button>
            </div>

            {textColorMode === "custom" ? (
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background/80 border border-border/60">
                <input
                  type="color"
                  value={customTextColor.startsWith("#") ? customTextColor : "#0F172A"}
                  onChange={(e) => setCustomTextColor(e.target.value)}
                  className="size-7 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                />
                <Input
                  type="text"
                  value={customTextColor}
                  onChange={(e) => setCustomTextColor(e.target.value)}
                  className="h-7 text-xs font-mono uppercase flex-1"
                  placeholder="#0F172A"
                />
              </div>
            ) : null}

            {/* Category / Kicker Accent & Style Controls */}
            <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="size-3 text-primary" />
                  <span>Kicker Tag Style & Accent</span>
                </span>
                {kickerColor || kickerStyle !== "text" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setKickerColor("");
                      setKickerStyle("text");
                    }}
                    className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <RotateCcw className="size-2.5" />
                    <span>Reset</span>
                  </button>
                ) : null}
              </div>

              {/* Style selector */}
              <div className="grid grid-cols-2 gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setKickerStyle("text")}
                  className={`py-1 rounded-md transition-all cursor-pointer ${
                    kickerStyle === "text"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Plain Eyebrow
                </button>
                <button
                  type="button"
                  onClick={() => setKickerStyle("badge")}
                  className={`py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    kickerStyle === "badge"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span>Pill Badge</span>
                </button>
              </div>

              {/* Swatch grid */}
              <div className="grid grid-cols-8 gap-1 pt-0.5">
                {KICKER_COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setKickerColor(c)}
                    className={`size-5 rounded-md border border-border/60 cursor-pointer transition-transform hover:scale-115 ${
                      kickerColor === c ? "ring-2 ring-primary ring-offset-1 scale-105" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Color picker & Hex */}
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={kickerColor.startsWith("#") ? kickerColor : (isDarkText ? "#0284C7" : "#38BDF8")}
                  onChange={(e) => setKickerColor(e.target.value)}
                  className="size-6 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                />
                <Input
                  type="text"
                  value={kickerColor}
                  onChange={(e) => setKickerColor(e.target.value)}
                  placeholder="Custom Hex (e.g. #38BDF8)"
                  className="h-6.5 text-[11px] font-mono uppercase flex-1"
                />
              </div>
            </div>
          </div>

          {/* 6. Background Customizer */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Background Style</span>
              {customBg ? (
                <button
                  type="button"
                  onClick={() => setCustomBg(undefined)}
                  className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="size-2.5" />
                  <span>Reset to Theme</span>
                </button>
              ) : null}
            </div>

            <SceneBackgroundPopover
              value={customBg}
              globalBackground={background}
              onChange={setCustomBg}
              side="left"
              align="start"
              sceneName="Promo Banner"
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs font-medium cursor-pointer"
                >
                  <span
                    className="size-4 rounded-full border border-white/20 shrink-0 shadow-xs"
                    style={{ background: activeBg }}
                  />
                  <span className="truncate">
                    {customBg ? "Custom Background" : "Inherit Global Theme"}
                  </span>
                </Button>
              }
            />
          </div>

          {/* 6. Quick Format Info Card */}
          <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5 text-xs text-muted-foreground mt-2">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>{activeFormat.label}</span>
              <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {activeFormat.width} × {activeFormat.height}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">{activeFormat.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
