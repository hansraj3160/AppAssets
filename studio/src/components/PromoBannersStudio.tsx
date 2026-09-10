import { Check, Copy, Download, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
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

  // Content state prefilled from app manifest
  const defaultTitle = manifest.app?.name || "Expense Manager";
  const defaultTagline =
    manifest.app?.subtitle?.[locale] ||
    manifest.app?.subtitle?.["en-US"] ||
    Object.values(manifest.app?.subtitle || {})[0] ||
    "Smart Budget & Expense Tracking";

  const [customTitle, setCustomTitle] = useState(defaultTitle);
  const [customTagline, setCustomTagline] = useState(defaultTagline);
  const [customBg, setCustomBg] = useState<string | undefined>(undefined);
  const [mockupStyle, setMockupStyle] = useState<"card" | "screen">("card");

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

  // Selected screenshot entry
  const activeEntry =
    screenshotEntries.find((e) => e.sceneId === selectedSceneId) || screenshotEntries[0];

  const activeCapture = captures?.screenshots?.find(
    (s) => s.sceneId === (activeEntry?.sceneId || selectedSceneId),
  );

  const appInitial = (customTitle || "A").charAt(0).toUpperCase();
  const rating = manifest.app?.rating || 4.9;
  const category = manifest.app?.category || "Finance";

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
    });
    if (selectedSceneId) params.set("sceneId", selectedSceneId);
    if (customTitle && customTitle !== defaultTitle) params.set("headline", customTitle);
    if (customTagline && customTagline !== defaultTagline) params.set("tagline", customTagline);
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

        {/* Right Actions: Copy & Download */}
        <div className="flex shrink-0 items-center gap-2 ml-4">
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
              className="relative w-full max-w-[920px] rounded-2xl overflow-hidden shadow-2xl border border-white/15 transition-all"
              style={{
                aspectRatio: activeFormat.aspect,
                background: activeBg,
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

              {/* Banner Layout Content */}
              {selectedFormat === "instagram-square" || layoutStyle === "center" ? (
                // ============================================
                // CENTER LAYOUT
                // ============================================
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-6 sm:p-8 text-center">
                  {/* Top: Icon, Title, Subtitle */}
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* App Icon */}
                    <div className="size-14 sm:size-18 rounded-[22%] bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 shadow-xl border border-white/25 flex items-center justify-center text-white font-bold text-xl sm:text-3xl">
                      <span>{appInitial}</span>
                    </div>

                    {/* App Title */}
                    <h2 className="mt-0.5 text-xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
                      {customTitle}
                    </h2>

                    {/* Tagline */}
                    <p className="max-w-md text-xs sm:text-sm font-medium text-white/80 drop-shadow-xs">
                      {customTagline}
                    </p>
                  </div>

                  {/* Bottom: Rising Mockup */}
                  <div className="relative flex-1 w-full flex items-end justify-center overflow-hidden pt-2">
                    <div
                      className={`relative shadow-2xl overflow-hidden transform hover:-translate-y-1 transition-transform translate-y-3 shrink-0 select-none ${
                        mockupStyle === "card"
                          ? "rounded-2xl border border-white/25"
                          : "rounded-[30px]"
                      }`}
                      style={{
                        height: "100%",
                        maxHeight: "380px",
                        aspectRatio: `${activeEntry ? activeEntry.width : spec.screenshot.width} / ${activeEntry ? activeEntry.height : spec.screenshot.height}`,
                      }}
                    >
                      {mockupStyle === "screen" && activeCapture ? (
                        <div className="relative h-full w-full rounded-[28px] overflow-hidden bg-neutral-950 p-[3px] shadow-2xl ring-1 ring-white/25">
                          <div className="relative h-full w-full rounded-[25px] overflow-hidden bg-neutral-900">
                            <img
                              src={`/${activeCapture.url}`}
                              alt={activeEntry?.sceneId || "Screenshot"}
                              className="h-full w-full object-cover object-top select-none"
                              draggable={false}
                            />
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3 w-16 bg-black rounded-full shadow-xs border border-neutral-800/80 z-20 pointer-events-none" />
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-20 bg-white/40 rounded-full z-20 pointer-events-none" />
                          </div>
                        </div>
                      ) : activeEntry ? (
                        activeEntry.render(false)
                      ) : activeCapture ? (
                        <img
                          src={`/${activeCapture.url}`}
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
                  </div>
                </div>
              ) : (
                // ============================================
                // SPLIT LAYOUT (Text Left, Phone Right)
                // ============================================
                <div className="absolute inset-0 z-10 grid grid-cols-12 items-center px-6 sm:px-12">
                  {/* Left Column: Icon + Branding + Tagline */}
                  <div className="col-span-7 flex flex-col justify-center gap-2.5 sm:gap-3 pr-4">
                    {/* App Icon */}
                    <div className="size-12 sm:size-16 rounded-[22%] bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 shadow-xl border border-white/25 flex items-center justify-center text-white font-bold text-xl sm:text-2xl">
                      <span>{appInitial}</span>
                    </div>

                    {/* Trust Rating Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-md border border-white/20 text-amber-300 w-fit shadow-xs">
                      <span>★ {rating} Rating</span>
                      <span className="opacity-40">·</span>
                      <span className="text-white/90 font-medium">{category}</span>
                    </div>

                    {/* App Title */}
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md line-clamp-2">
                      {customTitle}
                    </h2>

                    {/* App Tagline */}
                    <p className="text-xs sm:text-base font-medium text-white/80 drop-shadow-xs line-clamp-2 leading-relaxed">
                      {customTagline}
                    </p>
                  </div>

                  {/* Right Column: Angled Framed Phone */}
                  <div className="col-span-5 relative flex h-full items-center justify-center overflow-visible">
                    <div
                      className={`relative shadow-2xl overflow-hidden transform -rotate-3 hover:rotate-0 transition-all duration-300 translate-y-3 shrink-0 select-none ${
                        mockupStyle === "card"
                          ? "rounded-2xl border border-white/25"
                          : "rounded-[30px]"
                      }`}
                      style={{
                        height: "88%",
                        maxHeight: "440px",
                        aspectRatio: `${activeEntry ? activeEntry.width : spec.screenshot.width} / ${activeEntry ? activeEntry.height : spec.screenshot.height}`,
                      }}
                    >
                      {mockupStyle === "screen" && activeCapture ? (
                        <div className="relative h-full w-full rounded-[28px] overflow-hidden bg-neutral-950 p-[3px] shadow-2xl ring-1 ring-white/25">
                          <div className="relative h-full w-full rounded-[25px] overflow-hidden bg-neutral-900">
                            <img
                              src={`/${activeCapture.url}`}
                              alt={activeEntry?.sceneId || "Screenshot"}
                              className="h-full w-full object-cover object-top select-none"
                              draggable={false}
                            />
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3 w-16 bg-black rounded-full shadow-xs border border-neutral-800/80 z-20 pointer-events-none" />
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-20 bg-white/40 rounded-full z-20 pointer-events-none" />
                          </div>
                        </div>
                      ) : activeEntry ? (
                        activeEntry.render(false)
                      ) : activeCapture ? (
                        <img
                          src={`/${activeCapture.url}`}
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
        <div className="w-[300px] shrink-0 border-l border-border/70 bg-sidebar p-4 space-y-4 overflow-y-auto text-sidebar-foreground">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Sparkles className="size-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Banner Customizer
            </h3>
          </div>

          {/* 1. Feature Scene Picker */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">Featured Screenshot</span>
            <div className="grid grid-cols-2 gap-1.5">
              {sceneItems.map((entry, idx) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setSelectedSceneId(entry.sceneId || "")}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    selectedSceneId === entry.sceneId
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                      : "border-border/80 bg-background/60 text-muted-foreground hover:bg-background"
                  }`}
                >
                  <span className="truncate max-w-[110px]">
                    {copy[entry.sceneId]?.headline?.[locale] ??
                      design.scenes.find((s) => s.id === entry.sceneId)?.headline?.[locale] ??
                      `Slide ${idx + 1}`}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground/80">
                    {entry.sceneId}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Layout & Mockup Style */}
          <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
            {selectedFormat !== "instagram-square" ? (
              <div className="flex flex-col gap-1.5">
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

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground">Mockup Style</span>
              <div className="grid grid-cols-2 gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
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
              </div>
            </div>
          </div>

          {/* 3. Text Customization */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
            <div className="flex flex-col gap-1">
              <label htmlFor="banner-app-title" className="text-xs font-semibold text-foreground">
                App Title / Brand
              </label>
              <Input
                id="banner-app-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="App Name"
                className="h-8 text-xs font-medium"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="banner-app-tagline" className="text-xs font-semibold text-foreground">
                Tagline / Headline
              </label>
              <Input
                id="banner-app-tagline"
                value={customTagline}
                onChange={(e) => setCustomTagline(e.target.value)}
                placeholder="Punchy App Tagline"
                className="h-8 text-xs font-medium"
              />
            </div>
          </div>

          {/* 4. Background Customizer */}
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

          {/* 5. Quick Format Info Card */}
          <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5 text-xs text-muted-foreground mt-4">
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
