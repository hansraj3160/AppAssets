import {
  ArrowLeft,
  Battery,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Mic,
  Moon,
  Search,
  Settings2,
  Share2,
  Signal,
  Smartphone,
  Star,
  Sun,
  Tablet,
  Upload,
  Wifi,
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
import { buildScreenshotEntries, downloadSingleScreenshot, type ScreenshotEntry } from "./Strip";

export interface StoreMockupPreviewProps {
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
  onOpenAppDetails?: () => void;
}

export function StoreMockupPreview({
  manifest,
  platform,
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
  onOpenAppDetails,
}: StoreMockupPreviewProps) {
  // Store Platform: Apple App Store vs Google Play
  const [store, setStore] = useState<"apple" | "google">(() =>
    platform === "android" ? "google" : "apple",
  );

  // Auto-switch default store when user changes the platform in the sidebar
  useEffect(() => {
    setStore(platform === "android" ? "google" : "apple");
  }, [platform]);

  // View Mode: Search Results vs Product Page
  const [viewMode, setViewMode] = useState<"search" | "product">("search");

  // Store Appearance: Light vs Dark mode for the store mockup
  const [storeTheme, setStoreTheme] = useState<"light" | "dark">("dark");

  // Description expanded toggle
  const [descExpanded, setDescExpanded] = useState(false);

  // Live screenshot entries computed with identical composition engine
  const screenshotItems: ScreenshotEntry[] = useMemo(() => {
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

  const appName = appInfo?.name || manifest.app.name || "My App";
  const appSubtitle =
    appInfo?.subtitle ||
    manifest.app.subtitle?.[locale] ||
    manifest.app.subtitle?.["en-US"] ||
    Object.values(manifest.app.subtitle || {})[0] ||
    "Fast, Secure & Easy to Use";
  const appDeveloper = appInfo?.developer || manifest.app.developer || "Developer Studio";
  const appCategory = appInfo?.category || manifest.app.category || "Utilities";
  const appRating = manifest.app.rating || 4.9;
  const appRatingCount = manifest.app.ratingCount || "2.4K Ratings";
  const appAgeRating = manifest.app.ageRating || "4+";
  const appDescription =
    appInfo?.description ||
    manifest.app.description?.[locale] ||
    manifest.app.description?.["en-US"] ||
    Object.values(manifest.app.description || {})[0] ||
    "Experience next-level speed, privacy, and seamless controls designed specifically for modern mobile users.";

  const isDarkStore = storeTheme === "dark";
  const isTablet = platform === "ipad";

  // Gradient style for the app icon fallback
  const appInitial = appName.charAt(0).toUpperCase() || "A";
  const [appIcon, setAppIcon] = useState<string | null>(
    () => appInfo?.icon || (design as any)?.appIcon || null,
  );

  useEffect(() => {
    if (appInfo?.icon) setAppIcon(appInfo.icon);
  }, [appInfo?.icon]);

  useEffect(() => {
    fetch("/api/icon")
      .then((r) => r.json())
      .then((d) => {
        if (d?.iconUrl) setAppIcon(d.iconUrl);
      })
      .catch(() => {});
  }, []);

  const [uploadingIcon, setUploadingIcon] = useState(false);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const res = await fetch("/api/icon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        if (res.ok) {
          const data = await res.json();
          setAppIcon(data.iconUrl || dataUrl);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // ignore
    } finally {
      setUploadingIcon(false);
    }
  };

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleDownload = async (entry: ScreenshotEntry) => {
    setDownloadingKey(entry.key);
    try {
      const sliceNumber = entry.slice !== undefined ? entry.slice + 1 : undefined;
      await downloadSingleScreenshot({
        sceneId: entry.sceneId,
        slice: sliceNumber,
        device: spec.key,
        locale,
        background:
          entry.sceneBg || (entry.sceneId && sceneBackgrounds?.[entry.sceneId]) || background,
        frameUrl: spec.frame?.url ?? frameUrl,
        fontFamily,
        template,
        layout: (entry.sceneId && sceneLayouts?.[entry.sceneId]) || layout,
        screenOnly,
        fontSizeScale,
        design,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download screenshot");
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-6 py-4 animate-in fade-in duration-200">
      {/* 1. Control Toolbar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-2.5 shadow-lg backdrop-blur-md max-w-4xl w-full">
        {/* Store Platform Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/70 p-1">
          <button
            type="button"
            onClick={() => setStore("apple")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              store === "apple"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AppleIcon className="size-3.5" />
            <span>App Store</span>
          </button>
          <button
            type="button"
            onClick={() => setStore("google")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              store === "google"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GooglePlayIcon className="size-3.5" />
            <span>Google Play</span>
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/70 p-1">
          <button
            type="button"
            onClick={() => setViewMode("search")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "search"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="size-3.5" />
            <span>Search Result</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("product")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "product"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>Product Page</span>
          </button>
        </div>

        {/* Store Appearance & Live indicator */}
        <div className="flex items-center gap-2">
          {/* Store theme toggle */}
          <button
            type="button"
            onClick={() => setStoreTheme(isDarkStore ? "light" : "dark")}
            title={isDarkStore ? "Switch to Light Store" : "Switch to Dark Store"}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors shadow-2xs"
          >
            {isDarkStore ? (
              <>
                <Sun className="size-3.5 text-amber-500" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="size-3.5 text-blue-500" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Logo upload shortcut */}
          <label
            title={appIcon ? "Change App Logo / Icon" : "Upload App Logo / Icon"}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors shadow-2xs"
          >
            {uploadingIcon ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : appIcon ? (
              <div className="size-3.5 rounded-[4px] overflow-hidden">
                <img src={appIcon} alt="" className="size-full object-cover" />
              </div>
            ) : (
              <Upload className="size-3.5 text-primary" />
            )}
            <span className="hidden sm:inline">{appIcon ? "Logo" : "Upload Logo"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleIconUpload}
              className="sr-only"
            />
          </label>

          {/* App Info Settings Shortcut */}
          {onOpenAppDetails ? (
            <button
              type="button"
              onClick={onOpenAppDetails}
              title="Edit App Details (Name, Category, Description, etc.)"
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors shadow-2xs"
            >
              <Settings2 className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Edit App Details</span>
            </button>
          ) : null}

          {/* Device tag */}
          <div className="hidden md:flex items-center gap-1.5 rounded-xl bg-muted/50 border border-border/40 px-2.5 py-1.5 text-[11px] text-muted-foreground font-mono">
            {isTablet ? <Tablet className="size-3" /> : <Smartphone className="size-3" />}
            <span>{spec.label}</span>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* 2. Phone / Tablet Mockup Frame */}
      <div
        className={`w-full transition-all duration-300 ${
          isTablet ? "max-w-[820px]" : "max-w-[430px]"
        }`}
      >
        <div
          className={`overflow-hidden rounded-[38px] border shadow-2xl transition-colors duration-200 ${
            isDarkStore
              ? "border-neutral-800 bg-black text-white shadow-black/80"
              : "border-neutral-200 bg-white text-neutral-900 shadow-neutral-300/60"
          }`}
        >
          {/* Status Bar */}
          {store === "apple" ? (
            <AppleStatusBar isDark={isDarkStore} />
          ) : (
            <AndroidStatusBar isDark={isDarkStore} />
          )}

          {/* Store Content */}
          <div className="flex flex-col min-h-[680px] max-h-[820px] overflow-y-auto overflow-x-hidden select-none">
            {store === "apple" ? (
              viewMode === "search" ? (
                <AppleSearchResultView
                  isDark={isDarkStore}
                  isTablet={isTablet}
                  appName={appName}
                  appSubtitle={appSubtitle}
                  appRatingCount={appRatingCount}
                  appInitial={appInitial}
                  appIcon={appIcon}
                  screenshotItems={screenshotItems}
                  onDownload={handleDownload}
                  downloadingKey={downloadingKey}
                />
              ) : (
                <AppleProductPageView
                  isDark={isDarkStore}
                  isTablet={isTablet}
                  appName={appName}
                  appSubtitle={appSubtitle}
                  appDeveloper={appDeveloper}
                  appCategory={appCategory}
                  appRating={appRating}
                  appRatingCount={appRatingCount}
                  appAgeRating={appAgeRating}
                  appDescription={appDescription}
                  appInitial={appInitial}
                  appIcon={appIcon}
                  screenshotItems={screenshotItems}
                  descExpanded={descExpanded}
                  onToggleDesc={() => setDescExpanded(!descExpanded)}
                  onDownload={handleDownload}
                  downloadingKey={downloadingKey}
                />
              )
            ) : viewMode === "search" ? (
              <GooglePlaySearchResultView
                isDark={isDarkStore}
                isTablet={isTablet}
                appName={appName}
                appDeveloper={appDeveloper}
                appRating={appRating}
                appInitial={appInitial}
                appIcon={appIcon}
                screenshotItems={screenshotItems}
                onDownload={handleDownload}
                downloadingKey={downloadingKey}
              />
            ) : (
              <GooglePlayProductPageView
                isDark={isDarkStore}
                isTablet={isTablet}
                appName={appName}
                appDeveloper={appDeveloper}
                appCategory={appCategory}
                appRating={appRating}
                appRatingCount={appRatingCount}
                appDescription={appDescription}
                appInitial={appInitial}
                appIcon={appIcon}
                screenshotItems={screenshotItems}
                descExpanded={descExpanded}
                onToggleDesc={() => setDescExpanded(!descExpanded)}
                onDownload={handleDownload}
                downloadingKey={downloadingKey}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1. APPLE APP STORE VIEWS
// ==========================================

function AppleStatusBar({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-between px-7 pt-3.5 pb-2 text-xs font-semibold tracking-tight ${
        isDark ? "text-white" : "text-neutral-900"
      }`}
    >
      {/* Time */}
      <span className="w-12 text-left font-medium">9:41</span>

      {/* Dynamic Island */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 flex items-center justify-end h-7 w-28 rounded-full bg-black px-2 shadow-sm border border-neutral-800">
        <div className="size-2 rounded-full bg-neutral-900 border border-neutral-700" />
      </div>

      {/* Status Icons */}
      <div className="flex items-center gap-1.5 w-12 justify-end">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <Battery className="size-4" strokeWidth={2.2} />
      </div>
    </div>
  );
}

function AppleSearchResultView({
  isDark,
  isTablet,
  appName,
  appSubtitle,
  appRatingCount,
  appInitial,
  appIcon,
  screenshotItems,
  onDownload,
  downloadingKey,
}: {
  isDark: boolean;
  isTablet: boolean;
  appName: string;
  appSubtitle: string;
  appRatingCount: string;
  appInitial: string;
  appIcon?: string | null;
  screenshotItems: ScreenshotEntry[];
  onDownload: (entry: ScreenshotEntry) => void;
  downloadingKey: string | null;
}) {
  // Take up to 3 screenshots for portrait preview
  const displayShots = isTablet ? screenshotItems.slice(0, 2) : screenshotItems.slice(0, 3);

  return (
    <div className="flex flex-col p-4 sm:p-5 gap-4">
      {/* iOS App Store Search Bar */}
      <div className="flex flex-col gap-2">
        <h2
          className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-neutral-950"}`}
        >
          Search
        </h2>
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
            isDark ? "bg-neutral-900 text-neutral-400" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          <Search className="size-4 shrink-0 text-neutral-400" />
          <span className="flex-1 truncate">Games, Apps, Stories and More</span>
          <Mic className="size-4 shrink-0 text-neutral-400" />
        </div>
      </div>

      {/* App Result Card */}
      <div
        className={`flex flex-col gap-3.5 rounded-3xl p-4 transition-colors ${
          isDark
            ? "bg-neutral-900/60 border border-neutral-800/80"
            : "bg-neutral-50/80 border border-neutral-200/80"
        }`}
      >
        {/* Header row: Icon, Details, GET button */}
        <div className="flex items-center gap-3.5">
          {/* App Icon */}
          <div className="relative size-14 shrink-0 overflow-hidden rounded-[22%] bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-md flex items-center justify-center text-white font-bold text-xl border border-white/20">
            {appIcon ? (
              <img src={appIcon} alt={appName} className="size-full object-cover" />
            ) : (
              <span>{appInitial}</span>
            )}
          </div>

          {/* App Name, Subtitle, Rating */}
          <div className="flex min-w-0 flex-1 flex-col">
            <h3
              className={`font-semibold text-sm leading-snug truncate ${isDark ? "text-white" : "text-neutral-900"}`}
            >
              {appName}
            </h3>
            <p className="text-[11px] text-neutral-500 truncate mt-0.5">{appSubtitle}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 stars
                    key={i}
                    className="size-2.5 fill-amber-500 text-amber-500"
                  />
                ))}
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">{appRatingCount}</span>
            </div>
          </div>

          {/* GET Button */}
          <div className="flex flex-col items-center shrink-0">
            <button
              type="button"
              className={`rounded-full px-5 py-1 text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? "bg-neutral-800 text-blue-400 hover:bg-neutral-700"
                  : "bg-neutral-200/90 text-blue-600 hover:bg-neutral-300"
              }`}
            >
              GET
            </button>
            <span className="text-[8px] text-neutral-400 mt-1 scale-90">In-App Purchases</span>
          </div>
        </div>

        {/* Screenshots preview row */}
        {displayShots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-1">
            {displayShots.map((entry) => (
              <div
                key={entry.key}
                className="group relative overflow-hidden rounded-xl border border-neutral-700/30 shadow-md transition-transform duration-200 hover:scale-[1.02]"
                style={{ aspectRatio: `${entry.width} / ${entry.height}` }}
              >
                {entry.render(false)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(entry);
                  }}
                  disabled={downloadingKey === entry.key}
                  className="absolute bottom-2 right-2 z-20 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white border border-white/20 shadow-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 disabled:opacity-50"
                  aria-label={`Download screenshot for ${entry.sceneId}`}
                  title={`Download screenshot for "${entry.sceneId}"`}
                >
                  {downloadingKey === entry.key ? (
                    <Loader2 className="size-3.5 text-white animate-spin" />
                  ) : (
                    <Download className="size-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-neutral-700/50 text-xs text-neutral-500">
            No screenshots available to preview
          </div>
        )}
      </div>
    </div>
  );
}

function AppleProductPageView({
  isDark,
  isTablet,
  appName,
  appSubtitle,
  appDeveloper,
  appCategory,
  appRating,
  appRatingCount,
  appAgeRating,
  appDescription,
  appInitial,
  appIcon,
  screenshotItems,
  descExpanded,
  onToggleDesc,
  onDownload,
  downloadingKey,
}: {
  isDark: boolean;
  isTablet: boolean;
  appName: string;
  appSubtitle: string;
  appDeveloper: string;
  appCategory: string;
  appRating: number;
  appRatingCount: string;
  appAgeRating: string;
  appDescription: string;
  appInitial: string;
  appIcon?: string | null;
  screenshotItems: ScreenshotEntry[];
  descExpanded: boolean;
  onToggleDesc: () => void;
  onDownload: (entry: ScreenshotEntry) => void;
  downloadingKey: string | null;
}) {
  return (
    <div className="flex flex-col p-4 sm:p-5 gap-5">
      {/* Top Nav Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-400 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Search</span>
        </button>
        <button
          type="button"
          className={`size-7 rounded-full flex items-center justify-center transition-colors ${
            isDark ? "bg-neutral-800 text-neutral-300" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          <Share2 className="size-3.5" />
        </button>
      </div>

      {/* Hero Section: Large App Icon, Titles, GET Button */}
      <div className="flex items-start gap-4">
        <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-[22%] bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg flex items-center justify-center text-white font-bold text-3xl border border-white/20">
          {appIcon ? (
            <img src={appIcon} alt={appName} className="size-full object-cover" />
          ) : (
            <span>{appInitial}</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
          <div>
            <h1
              className={`text-lg sm:text-xl font-bold leading-tight truncate ${isDark ? "text-white" : "text-neutral-900"}`}
            >
              {appName}
            </h1>
            <p className="text-xs text-neutral-500 truncate mt-0.5">{appSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              className="rounded-full bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer shadow-xs transition-colors"
            >
              GET
            </button>
            <span className="text-[9px] text-neutral-400">In-App Purchases</span>
          </div>
        </div>
      </div>

      {/* Metrics Highlights Bar */}
      <div
        className={`flex items-center divide-x overflow-x-auto py-2.5 text-center text-xs ${
          isDark
            ? "divide-neutral-800 border-y border-neutral-800"
            : "divide-neutral-200 border-y border-neutral-200"
        }`}
      >
        {/* Metric 1: Rating */}
        <div className="flex flex-col items-center px-4 min-w-[90px]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            Ratings
          </span>
          <div className="flex items-center gap-1 mt-0.5 font-bold text-sm">
            <span>{appRating}</span>
            <Star className="size-3 fill-amber-500 text-amber-500" />
          </div>
          <span className="text-[9px] text-neutral-500 mt-0.5">{appRatingCount}</span>
        </div>

        {/* Metric 2: Rank */}
        <div className="flex flex-col items-center px-4 min-w-[90px]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            Chart
          </span>
          <span className="font-bold text-sm mt-0.5">#1</span>
          <span className="text-[9px] text-neutral-500 mt-0.5 truncate max-w-[80px]">
            {appCategory}
          </span>
        </div>

        {/* Metric 3: Age */}
        <div className="flex flex-col items-center px-4 min-w-[80px]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            Age
          </span>
          <span className="font-bold text-sm mt-0.5">{appAgeRating}</span>
          <span className="text-[9px] text-neutral-500 mt-0.5">Years Old</span>
        </div>

        {/* Metric 4: Developer */}
        <div className="flex flex-col items-center px-4 min-w-[100px]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            Developer
          </span>
          <span className="font-bold text-sm mt-0.5 truncate max-w-[90px]">{appDeveloper}</span>
          <span className="text-[9px] text-neutral-500 mt-0.5">Verified</span>
        </div>

        {/* Metric 5: Language */}
        <div className="flex flex-col items-center px-4 min-w-[80px]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            Language
          </span>
          <span className="font-bold text-sm mt-0.5">EN</span>
          <span className="text-[9px] text-neutral-500 mt-0.5">+15 More</span>
        </div>
      </div>

      {/* What's New Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-neutral-900"}`}>
            What's New
          </h3>
          <span className="text-xs text-blue-500 cursor-pointer hover:underline">
            Version History
          </span>
        </div>
        <span className="text-[11px] text-neutral-400">Version 2.4.0 • 2d ago</span>
        <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">
          • Real-time store mockup previews for App Store & Google Play
          <br />• Multi-language typography and translation matrix
          <br />• Performance improvements and bug fixes.
        </p>
      </div>

      {/* Preview Screenshots Section */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-neutral-900"}`}>
            Preview
          </h3>
          <span className="rounded-full bg-neutral-800/80 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-300">
            {isTablet ? "iPad" : "iPhone"}
          </span>
        </div>

        {/* Horizontal Scrollable Carousel */}
        {screenshotItems.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-neutral-700/50">
            {screenshotItems.map((entry) => (
              <div
                key={entry.key}
                className="group relative shrink-0 overflow-hidden rounded-2xl border border-neutral-700/30 shadow-md transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  width: isTablet ? "300px" : "210px",
                  aspectRatio: `${entry.width} / ${entry.height}`,
                }}
              >
                {entry.render(false)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(entry);
                  }}
                  disabled={downloadingKey === entry.key}
                  className="absolute bottom-2 right-2 z-20 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white border border-white/20 shadow-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 disabled:opacity-50"
                  aria-label={`Download screenshot for ${entry.sceneId}`}
                  title={`Download screenshot for "${entry.sceneId}"`}
                >
                  {downloadingKey === entry.key ? (
                    <Loader2 className="size-3.5 text-white animate-spin" />
                  ) : (
                    <Download className="size-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-neutral-700/50 text-xs text-neutral-500">
            No screenshots found
          </div>
        )}
      </div>

      {/* Description Section */}
      <div className="flex flex-col gap-1.5">
        <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-neutral-900"}`}>
          Description
        </h3>
        <p
          className={`text-xs text-neutral-500 leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}
        >
          {appDescription}
        </p>
        <button
          type="button"
          onClick={onToggleDesc}
          className="self-start text-xs font-semibold text-blue-500 hover:text-blue-400 cursor-pointer"
        >
          {descExpanded ? "less" : "more"}
        </button>
      </div>

      {/* App Information Section */}
      <div
        className={`flex flex-col divide-y text-xs ${isDark ? "divide-neutral-800 border-t border-neutral-800 text-neutral-400" : "divide-neutral-200 border-t border-neutral-200 text-neutral-600"}`}
      >
        <div className="flex items-center justify-between py-2">
          <span>Provider</span>
          <span className="font-medium text-foreground">{appDeveloper}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span>Category</span>
          <span className="font-medium text-foreground">{appCategory}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span>Compatibility</span>
          <span className="font-medium text-foreground">
            Works on {isTablet ? "iPad" : "iPhone"}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span>Languages</span>
          <span className="font-medium text-foreground">English and 15 more</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. GOOGLE PLAY STORE VIEWS
// ==========================================

function AndroidStatusBar({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-6 pt-3 pb-2 text-xs font-medium ${
        isDark ? "text-neutral-300" : "text-neutral-700"
      }`}
    >
      <span className="font-semibold text-xs">10:00</span>
      <div className="flex items-center gap-2">
        <Wifi className="size-3.5" />
        <span className="text-[10px] font-bold">5G</span>
        <Battery className="size-3.5" />
      </div>
    </div>
  );
}

function GooglePlaySearchResultView({
  isDark,
  isTablet,
  appName,
  appDeveloper,
  appRating,
  appInitial,
  appIcon,
  screenshotItems,
  onDownload,
  downloadingKey,
}: {
  isDark: boolean;
  isTablet: boolean;
  appName: string;
  appDeveloper: string;
  appRating: number;
  appInitial: string;
  appIcon?: string | null;
  screenshotItems: ScreenshotEntry[];
  onDownload: (entry: ScreenshotEntry) => void;
  downloadingKey: string | null;
}) {
  const displayShots = isTablet ? screenshotItems.slice(0, 2) : screenshotItems.slice(0, 3);

  return (
    <div className="flex flex-col p-4 sm:p-5 gap-4">
      {/* Google Play Search Field */}
      <div
        className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-xs shadow-xs ${
          isDark ? "bg-neutral-800 text-neutral-300" : "bg-neutral-100 text-neutral-600"
        }`}
      >
        <Search className="size-4 text-neutral-400" />
        <span className="flex-1 truncate">Search apps & games</span>
        <Mic className="size-4 text-neutral-400" />
        <div className="size-5 rounded-full bg-emerald-600 text-[10px] font-bold text-white flex items-center justify-center">
          G
        </div>
      </div>

      {/* Google Play Result Card */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-3.5">
          {/* App Icon */}
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md flex items-center justify-center text-white font-bold text-xl">
            {appIcon ? (
              <img src={appIcon} alt={appName} className="size-full object-cover" />
            ) : (
              <span>{appInitial}</span>
            )}
          </div>

          {/* Titles & Stats */}
          <div className="flex min-w-0 flex-1 flex-col">
            <h3
              className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-neutral-900"}`}
            >
              {appName}
            </h3>
            <span className="text-xs text-emerald-500 font-medium truncate">{appDeveloper}</span>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
              <span className="flex items-center gap-0.5 font-semibold text-foreground">
                {appRating} <Star className="size-2.5 fill-current" />
              </span>
              <span>•</span>
              <span>24 MB</span>
              <span>•</span>
              <span className="border border-neutral-700/60 rounded px-1 text-[9px]">3+</span>
            </div>
          </div>

          {/* Green Install Button */}
          <button
            type="button"
            className="rounded-full bg-[#01875f] hover:bg-[#01704f] px-5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
          >
            Install
          </button>
        </div>

        {/* Screenshots Row */}
        {displayShots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {displayShots.map((entry) => (
              <div
                key={entry.key}
                className="group relative overflow-hidden rounded-xl border border-neutral-800 shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                style={{ aspectRatio: `${entry.width} / ${entry.height}` }}
              >
                {entry.render(false)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(entry);
                  }}
                  disabled={downloadingKey === entry.key}
                  className="absolute bottom-2 right-2 z-20 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white border border-white/20 shadow-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 disabled:opacity-50"
                  aria-label={`Download screenshot for ${entry.sceneId}`}
                  title={`Download screenshot for "${entry.sceneId}"`}
                >
                  {downloadingKey === entry.key ? (
                    <Loader2 className="size-3.5 text-white animate-spin" />
                  ) : (
                    <Download className="size-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-neutral-700/50 text-xs text-neutral-500">
            No screenshots available
          </div>
        )}
      </div>
    </div>
  );
}

function GooglePlayProductPageView({
  isDark,
  isTablet,
  appName,
  appDeveloper,
  appCategory,
  appRating,
  appRatingCount,
  appDescription,
  appInitial,
  appIcon,
  screenshotItems,
  descExpanded,
  onToggleDesc,
  onDownload,
  downloadingKey,
}: {
  isDark: boolean;
  isTablet: boolean;
  appName: string;
  appDeveloper: string;
  appCategory: string;
  appRating: number;
  appRatingCount: string;
  appDescription: string;
  appInitial: string;
  appIcon?: string | null;
  screenshotItems: ScreenshotEntry[];
  descExpanded: boolean;
  onToggleDesc: () => void;
  onDownload: (entry: ScreenshotEntry) => void;
  downloadingKey: string | null;
}) {
  return (
    <div className="flex flex-col p-4 sm:p-5 gap-5">
      {/* App Header */}
      <div className="flex items-start gap-4">
        <div className="relative size-16 sm:size-18 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md flex items-center justify-center text-white font-bold text-2xl">
          {appIcon ? (
            <img src={appIcon} alt={appName} className="size-full object-cover" />
          ) : (
            <span>{appInitial}</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h1
            className={`text-lg sm:text-xl font-semibold leading-tight truncate ${isDark ? "text-white" : "text-neutral-900"}`}
          >
            {appName}
          </h1>
          <span className="text-xs text-emerald-500 font-medium truncate mt-0.5">
            {appDeveloper}
          </span>
          <span className="text-[11px] text-neutral-400 mt-1">Contains ads · In-app purchases</span>
        </div>
      </div>

      {/* Metrics Bar */}
      <div
        className={`flex items-center justify-between py-2 text-center text-xs ${
          isDark ? "border-y border-neutral-800" : "border-y border-neutral-200"
        }`}
      >
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-1 font-bold text-sm">
            <span>{appRating}</span>
            <Star className="size-3 fill-current" />
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">{appRatingCount}</span>
        </div>

        <div className="h-6 w-px bg-neutral-800" />

        <div className="flex flex-col items-center flex-1">
          <span className="font-bold text-sm">1M+</span>
          <span className="text-[10px] text-neutral-400 mt-0.5">Downloads</span>
        </div>

        <div className="h-6 w-px bg-neutral-800" />

        <div className="flex flex-col items-center flex-1">
          <span className="font-bold text-sm">Everyone</span>
          <span className="text-[10px] text-neutral-400 mt-0.5">Rated for 3+</span>
        </div>
      </div>

      {/* Full-width Install Button */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-full bg-[#01875f] hover:bg-[#01704f] active:bg-[#016043] py-2.5 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-sm"
        >
          Install
        </button>
        <div className="flex items-center justify-center gap-6 text-xs text-emerald-500 pt-1">
          <button
            type="button"
            className="flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            <Share2 className="size-3.5" />
            <span>Share</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            <ExternalLink className="size-3.5" />
            <span>Add to wishlist</span>
          </button>
        </div>
      </div>

      {/* Screenshot Carousel */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-neutral-700/50">
          {screenshotItems.map((entry) => (
            <div
              key={entry.key}
              className="group relative shrink-0 overflow-hidden rounded-xl border border-neutral-800 shadow-sm transition-transform duration-200 hover:scale-[1.02]"
              style={{
                width: isTablet ? "300px" : "210px",
                aspectRatio: `${entry.width} / ${entry.height}`,
              }}
            >
              {entry.render(false)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(entry);
                }}
                disabled={downloadingKey === entry.key}
                className="absolute bottom-2 right-2 z-20 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white border border-white/20 shadow-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 disabled:opacity-50"
                aria-label={`Download screenshot for ${entry.sceneId}`}
                title={`Download screenshot for "${entry.sceneId}"`}
              >
                {downloadingKey === entry.key ? (
                  <Loader2 className="size-3.5 text-white animate-spin" />
                ) : (
                  <Download className="size-3.5" strokeWidth={2} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* About this app */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-neutral-900"}`}>
            About this app
          </h3>
          <ChevronRight className="size-4 text-neutral-400" />
        </div>
        <p
          className={`text-xs text-neutral-400 leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}
        >
          {appDescription}
        </p>
        <button
          type="button"
          onClick={onToggleDesc}
          className="self-start text-xs font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer"
        >
          {descExpanded ? "Show less" : "Read more"}
        </button>
      </div>

      {/* Category Badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="rounded-full border border-neutral-700/60 px-3 py-1 text-[11px] font-medium text-neutral-400">
          #1 Top Free in {appCategory}
        </span>
        <span className="rounded-full border border-neutral-700/60 px-3 py-1 text-[11px] font-medium text-neutral-400">
          {appCategory}
        </span>
        <span className="rounded-full border border-neutral-700/60 px-3 py-1 text-[11px] font-medium text-neutral-400">
          Verified Safe
        </span>
      </div>
    </div>
  );
}

// Brand SVG Icons
function AppleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <title>Apple</title>
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.97-14.43-5.75-8.81-10.37-18.79-13.88-29.93-3.5-11.15-5.26-21.75-5.26-31.81 0-14.68 3.79-26.69 11.37-36.03 7.58-9.34 17.13-14.15 28.65-14.42 5.02 0 10.46 1.34 16.32 4.02 5.86 2.68 9.58 4.07 11.16 4.17 1.48-.1 5.34-1.57 11.58-4.42 6.24-2.85 11.89-4.14 16.96-3.86 12.63.63 22.84 5.35 30.64 14.16-11.03 6.69-16.42 15.93-16.17 27.71.25 9.34 3.86 17.26 10.83 23.77 6.97 6.51 15.22 10.23 24.75 11.16-2.22 6.54-4.87 13.1-7.94 19.68zM119.22 33.64c0-7.39 2.64-14.28 7.92-20.67 5.28-6.39 11.87-10.74 19.78-13.06.33 1.25.5 2.5.5 3.74 0 7.31-2.76 14.37-8.29 21.19-5.52 6.81-12.28 11.14-20.27 12.98-.12-1.39-.18-2.79-.18-4.18z" />
    </svg>
  );
}

function GooglePlayIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="currentColor">
      <title>Google Play</title>
      <path fill="#4285F4" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 59.9.2.2z" />
      <path
        fill="#34A853"
        d="M47 38.6c-4.1 7.1-6.5 15.6-6.5 25.4v384c0 9.8 2.4 18.3 6.5 25.4L256 264.4 47 38.6z"
      />
      <path fill="#EA4335" d="M325.3 277.7l60.1 60.1L104.6 499l220.9-221.1.2-.2z" />
      <path
        fill="#FBBC04"
        d="M459.7 236.4l-74.3-42.7-60.1 60.1 60.1 60.1 74.3-42.7c17.2-9.9 17.2-25.9 0-35.8z"
      />
    </svg>
  );
}
