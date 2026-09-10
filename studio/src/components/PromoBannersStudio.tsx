import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Design, DeviceCaptures, DeviceEntry, SceneCopy, StoreManifest } from "../manifest";
import { SceneBackgroundPopover } from "./SceneBackgroundPopover";
import { buildScreenshotEntries, type ScreenshotEntry } from "./Strip";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

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
}: PromoBannersStudioProps) {
  const [selectedFormat, setSelectedFormat] = useState<BannerFormat>("google-play");
  const [layoutStyle, setLayoutStyle] = useState<"split" | "center">("split");
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

  // Content state prefilled from app manifest
  const defaultTitle = manifest.app?.name || "Expense Manager";
  const defaultTagline =
    manifest.app?.subtitle?.[locale] ||
    manifest.app?.subtitle?.["en-US"] ||
    Object.values(manifest.app?.subtitle || {})[0] ||
    "Smart Budget & Expense Tracking";
  const defaultHeadline =
    copy[screenshotEntries[0]?.sceneId || ""]?.headline?.[locale] ??
    design.scenes[0]?.headline?.[locale] ??
    "Time Management at Your Fingertips";

  const [customTitle, setCustomTitle] = useState(defaultTitle);
  const [kickerText, setKickerText] = useState(
    (manifest.app?.category ? `${manifest.app.category} App` : "Productivity App").toUpperCase(),
  );
  const [customHeadline, setCustomHeadline] = useState(defaultHeadline);
  const [customTagline, setCustomTagline] = useState(defaultTagline);
  const [benefits, setBenefits] = useState<{ id: string; text: string }[]>([
    { id: "b1", text: "Achieve More in Less Time" },
    { id: "b2", text: "Plan, Prioritize and Prosper" },
    { id: "b3", text: "Boost Your Daily Output" },
  ]);

  const [customBg, setCustomBg] = useState<string | undefined>(undefined);
  const [mockupStyle, setMockupStyle] = useState<"card" | "screen">("screen");

  const activeFormat = BANNER_FORMATS.find((f) => f.key === selectedFormat) || BANNER_FORMATS[0]!;
  const activeBg = customBg || background;

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

  const getExportUrl = () => {
    const params = new URLSearchParams({
      type: selectedFormat,
      device: spec.key,
      locale,
      layout: selectedFormat === "instagram-square" ? "center" : layoutStyle,
      mockupStyle,
      deviceCount,
    });
    if (selectedSceneId) params.set("sceneId", selectedSceneId);
    if (secondarySceneId && deviceCount !== "single") params.set("sceneId2", secondarySceneId);
    if (tertiarySceneId && deviceCount === "trio") params.set("sceneId3", tertiarySceneId);
    if (kickerText) params.set("kicker", kickerText);
    if (customHeadline) params.set("headline", customHeadline);
    if (customTagline) params.set("tagline", customTagline);
    const benefitTexts = benefits.map((b) => b.text).filter(Boolean);
    if (benefitTexts.length > 0) params.set("benefits", JSON.stringify(benefitTexts));
    if (customBg) params.set("background", customBg);
    return `/api/export-banner?${params.toString()}`;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = getExportUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to export banner");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${selectedFormat}-${activeFormat.width}x${activeFormat.height}.png`;
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
      const url = getExportUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch image for clipboard");
      const blob = await res.blob();
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
              Download PNG ({activeFormat.width}×{activeFormat.height})
            </span>
          </Button>
        </div>
      </div>

      {/* Main Studio Body: Canvas on Left/Center, Controls on Right */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Banner Preview Canvas Area */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 overflow-auto bg-neutral-950/20 dark:bg-black/40">
          <div className="flex flex-col items-center gap-4 max-w-full">
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
                  background:
                    "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.3) 100%)",
                }}
              />

              {/* Organic Background Wave Curves */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
                viewBox="0 0 1024 500"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M320,0 C530,140 490,360 900,500 L1024,500 L1024,0 Z"
                  fill="white"
                  fillOpacity="0.12"
                  stroke="white"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
                <path
                  d="M470,0 C690,110 590,410 1024,340 L1024,0 Z"
                  fill="white"
                  fillOpacity="0.08"
                  stroke="white"
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
              {selectedFormat === "instagram-square" || layoutStyle === "center" ? (
                // ============================================
                // CENTER LAYOUT
                // ============================================
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-6 sm:p-8 text-center">
                  {/* Top: Icon, Kicker, Headline, Subtitle */}
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0">
                    <div className="size-13 sm:size-16 rounded-[22%] bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 shadow-xl border border-white/25 flex items-center justify-center text-white font-bold text-xl sm:text-2xl">
                      <span>{appInitial}</span>
                    </div>

                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-sky-400 drop-shadow-xs">
                      {kickerText || "FEATURED APP"}
                    </span>

                    <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
                      {customHeadline}
                    </h2>

                    <p className="max-w-md text-xs sm:text-sm font-medium text-white/80 drop-shadow-xs">
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
                        className="rounded-[22%] bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 shadow-lg border border-white/30 flex items-center justify-center text-white font-black shrink-0"
                        style={{
                          width: "9.5cqh",
                          height: "9.5cqh",
                          fontSize: "5cqh",
                        }}
                      >
                        <span>{appInitial}</span>
                      </div>
                      <span
                        className="font-black text-white tracking-tight drop-shadow-sm whitespace-nowrap overflow-hidden"
                        style={{
                          fontSize: "5.4cqh",
                          maxWidth: "32cqw",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {customTitle}
                      </span>
                    </div>

                    {/* 2. Kicker / Category Eyebrow */}
                    <div style={{ marginTop: "0.2cqh" }}>
                      <span
                        className="font-extrabold uppercase text-sky-300 drop-shadow-xs"
                        style={{
                          fontSize: "2.4cqh",
                          letterSpacing: "0.14em",
                        }}
                      >
                        {kickerText || "FEATURED APP"}
                      </span>
                    </div>

                    {/* 3. Main Marketing Headline */}
                    <h2
                      className="font-black tracking-tight text-white drop-shadow-md line-clamp-2"
                      style={{
                        fontSize: deviceCount === "trio" ? "6.8cqh" : "7.5cqh",
                        lineHeight: 1.15,
                      }}
                    >
                      {customHeadline}
                    </h2>

                    {/* 4. Subtitle / Tagline */}
                    <p
                      className="font-medium text-white/80 drop-shadow-xs line-clamp-2"
                      style={{
                        fontSize: "3.2cqh",
                        lineHeight: 1.32,
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
                            className="flex items-center text-white/95"
                            style={{ gap: "1.8cqw" }}
                          >
                            <div
                              className="rounded-full bg-emerald-400 shrink-0 shadow-xs"
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
                        {/* Left Phone (Behind) */}
                        <div
                          className="absolute z-10 transition-all"
                          style={{
                            height: "72cqh",
                            top: "14cqh",
                            left: "2%",
                            transform: "rotate(-2deg)",
                          }}
                        >
                          {renderPhoneCard(
                            secondaryEntry,
                            secondaryCapture,
                            "h-full opacity-95 shadow-[0_15px_30px_rgba(0,0,0,0.45)]",
                          )}
                        </div>

                        {/* Right Phone (Behind) */}
                        <div
                          className="absolute z-10 transition-all"
                          style={{
                            height: "72cqh",
                            top: "14cqh",
                            right: "2%",
                            transform: "rotate(2deg)",
                          }}
                        >
                          {renderPhoneCard(
                            tertiaryEntry,
                            tertiaryCapture,
                            "h-full opacity-95 shadow-[0_15px_30px_rgba(0,0,0,0.45)]",
                          )}
                        </div>

                        {/* Center Phone (Hero Front) */}
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
                            "h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.6)]",
                          )}
                        </div>
                      </div>
                    ) : deviceCount === "duo" ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Left / Front Phone */}
                        <div
                          className="absolute z-20 transform hover:scale-[1.03] transition-all duration-300"
                          style={{
                            height: "80cqh",
                            top: "10cqh",
                            left: "10%",
                            transform: "rotate(0deg)",
                          }}
                        >
                          {renderPhoneCard(
                            activeEntry,
                            activeCapture,
                            "h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.6)]",
                          )}
                        </div>

                        {/* Right / Back Phone */}
                        <div
                          className="absolute z-10 transition-all"
                          style={{
                            height: "74cqh",
                            top: "13cqh",
                            right: "10%",
                            transform: "rotate(2deg)",
                          }}
                        >
                          {renderPhoneCard(
                            secondaryEntry,
                            secondaryCapture,
                            "h-full opacity-95 shadow-[0_18px_35px_rgba(0,0,0,0.5)]",
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
                1 Phone
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
                2 Phones
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
                3 Phones (Trio)
              </button>
            </div>

            {/* Phone Screen Assigners */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Center / Hero Screen
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
                    Left Screen
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
                    Right Screen
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
            <div className="flex flex-col gap-1">
              <label
                htmlFor="banner-kicker"
                className="text-[11px] font-semibold text-muted-foreground"
              >
                Kicker / Category Eyebrow
              </label>
              <Input
                id="banner-kicker"
                value={kickerText}
                onChange={(e) => setKickerText(e.target.value)}
                placeholder="PRODUCTIVITY APP"
                className="h-8 text-xs font-medium"
              />
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

          {/* 4. Layout & Mockup Style */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            {selectedFormat !== "instagram-square" ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground">Layout Presentation</span>
                <div className="grid grid-cols-2 gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setLayoutStyle("split")}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      layoutStyle === "split"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Split (Left/Right)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutStyle("center")}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      layoutStyle === "center"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Center (Top/Bottom)
                  </button>
                </div>
              </div>
            ) : null}

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

          {/* 5. Background Customizer */}
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
