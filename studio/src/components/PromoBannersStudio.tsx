import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useStudioActions } from "../context/StudioContext";
import { trackAssetDownloaded, trackExport, trackToolOpened } from "../lib/analytics";
import { apiFetch } from "../lib/api";
import { buildScreenshotEntries, type ScreenshotEntry } from "./Strip";
import { BannerPreviewStage } from "./promo-banners/BannerPreviewStage";
import { BannerSidebarControls } from "./promo-banners/BannerSidebarControls";
import { BannerTopBar } from "./promo-banners/BannerTopBar";
import {
  BANNER_FORMATS,
  type BannerBenefit,
  type BannerFormat,
  type BannerFormatMeta,
  hexToRgba,
  isLightBackground,
  KICKER_COLOR_SWATCHES,
  KICKER_PRESETS,
  LOGO_COLOR_SWATCHES,
  type PromoBannersStudioProps,
  renderClientBannerBlob,
  resolveLogoBg,
} from "./promo-banners/presets";

export {
  BANNER_FORMATS,
  type BannerBenefit,
  type BannerFormat,
  type BannerFormatMeta,
  hexToRgba,
  KICKER_COLOR_SWATCHES,
  KICKER_PRESETS,
  LOGO_COLOR_SWATCHES,
  type PromoBannersStudioProps,
};

export const PromoBannersStudio = memo(function PromoBannersStudio({
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
  const studioActions = useStudioActions();
  const [selectedFormat, setSelectedFormat] = useState<BannerFormat>("google-play");
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [safeAreaMargin, setSafeAreaMargin] = useState<"15%" | "20%" | "8%">("15%");
  const [deviceCount, setDeviceCount] = useState<"single" | "duo" | "trio">("trio");

  useEffect(() => {
    trackToolOpened("promo_banners");
  }, []);

  const screenshotEntries: ScreenshotEntry[] = useMemo(
    () =>
      buildScreenshotEntries({
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
      }),
    [
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
    ],
  );

  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    screenshotEntries[0]?.sceneId || "home",
  );
  const [secondarySceneId, setSecondarySceneId] = useState<string>(
    screenshotEntries[1]?.sceneId || screenshotEntries[0]?.sceneId || "stats",
  );
  const [tertiarySceneId, setTertiarySceneId] = useState<string>(
    screenshotEntries[2]?.sceneId || screenshotEntries[0]?.sceneId || "settings",
  );

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
  const [benefits, setBenefits] = useState<BannerBenefit[]>([
    { id: "b1", text: "Achieve More in Less Time" },
    { id: "b2", text: "Plan, Prioritize and Prosper" },
    { id: "b3", text: "Boost Your Daily Output" },
  ]);

  const [customBg, setCustomBg] = useState<string | undefined>(undefined);
  const [mockupStyle, setMockupStyle] = useState<"card" | "screen">("screen");
  const [appIconUrl, setAppIconUrl] = useState<string | null>(() => {
    return appInfo?.icon || (design as { appIcon?: string })?.appIcon || null;
  });
  const [logoBg, setLogoBg] = useState<string>("gradient");
  const [logoFit, setLogoFit] = useState<"cover" | "contain">("cover");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [exportResolution, setExportResolution] = useState<"1x" | "2x">("1x");
  const [textColorMode, setTextColorMode] = useState<"auto" | "light" | "dark" | "custom">("auto");
  const [customTextColor, setCustomTextColor] = useState<string>("#0F172A");
  const [kickerColor, setKickerColor] = useState<string>("");
  const [kickerStyle, setKickerStyle] = useState<"text" | "badge">("text");
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const resolvedLogoBackground = useMemo(() => resolveLogoBg(logoBg), [logoBg]);

  useEffect(() => {
    if (appInfo?.name) setCustomTitle(appInfo.name);
    if (appInfo?.subtitle) setCustomTagline(appInfo.subtitle);
    if (appInfo?.category) setKickerText(`${appInfo.category} App`.toUpperCase());
    if (appInfo?.icon) setAppIconUrl(appInfo.icon);
  }, [appInfo]);

  useEffect(() => {
    apiFetch("/api/icon")
      .then((res) => res.json())
      .then((data) => {
        if (data?.iconUrl) setAppIconUrl(data.iconUrl);
      })
      .catch(() => {});
  }, []);

  const handleIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      setAppIconUrl(dataUrl);
      setUploadingIcon(true);
      try {
        const res = await apiFetch("/api/icon", {
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
  }, []);

  const handleResetIcon = useCallback(async () => {
    setAppIconUrl(null);
    try {
      await apiFetch("/api/icon", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to reset icon:", err);
    }
  }, []);

  const activeFormat = BANNER_FORMATS.find((f) => f.key === selectedFormat) || BANNER_FORMATS[0]!;
  const activeBg = customBg || background;
  const isLightBg = useMemo(() => isLightBackground(activeBg), [activeBg]);

  const effectiveTextColor = useMemo(() => {
    if (textColorMode === "light") return "#FFFFFF";
    if (textColorMode === "dark") return "#0F172A";
    if (textColorMode === "custom") return customTextColor || "#FFFFFF";
    return isLightBg ? "#0F172A" : "#FFFFFF";
  }, [textColorMode, customTextColor, isLightBg]);

  const isDarkText =
    effectiveTextColor === "#0F172A" ||
    textColorMode === "dark" ||
    (textColorMode === "auto" && isLightBg);

  const effectiveSubtextColor = isDarkText ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.8)";
  const effectiveBulletColor = isDarkText ? "#1E293B" : "rgba(255, 255, 255, 0.95)";
  const effectiveKickerColor = kickerColor || (isDarkText ? "#0284C7" : "#38BDF8");

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

  const activeEntry =
    screenshotEntries.find((e) => e.sceneId === selectedSceneId) || screenshotEntries[0];
  const activeCapture =
    captures?.screenshots?.find((s) => s.sceneId === activeEntry?.sceneId) ||
    captures?.screenshots?.find((s) => s.sceneId === selectedSceneId) ||
    captures?.screenshots?.[0];

  const secondaryEntry =
    screenshotEntries.find((e) => e.sceneId === secondarySceneId) ||
    screenshotEntries[1] ||
    screenshotEntries[0];
  const secondaryCapture =
    captures?.screenshots?.find((s) => s.sceneId === secondaryEntry?.sceneId) ||
    captures?.screenshots?.find((s) => s.sceneId === secondarySceneId) ||
    captures?.screenshots?.[1] ||
    captures?.screenshots?.[0];

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

  const buildExportBlob = useCallback(async (): Promise<Blob | null> => {
    const isRetina = exportResolution === "2x";
    const payload = {
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
      title: customTitle,
      appName: customTitle,
      kicker: kickerText,
      headline: customHeadline,
      tagline: customTagline,
      benefits: benefits.map((b) => b.text).filter(Boolean),
      background: customBg,
      customIcon: appIconUrl || undefined,
      logoBg,
      logoFit,
    };

    try {
      const res = await apiFetch("/api/export-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.blob();
      }
      console.warn("Server banner export responded with status:", res.status);
    } catch (networkErr) {
      console.warn("Backend export request failed, falling back to browser canvas:", networkErr);
    }

    return renderClientBannerBlob({
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
      activeCaptureUrl: activeCapture?.url,
      secondaryCaptureUrl: secondaryCapture?.url,
      tertiaryCaptureUrl: tertiaryCapture?.url,
    });
  }, [
    activeBg,
    activeCapture?.url,
    activeFormat,
    appIconUrl,
    appInitial,
    benefits,
    customBg,
    customHeadline,
    customTagline,
    customTitle,
    deviceCount,
    effectiveBulletColor,
    effectiveKickerColor,
    effectiveSubtextColor,
    effectiveTextColor,
    exportResolution,
    isDarkText,
    kickerStyle,
    kickerText,
    locale,
    logoBg,
    logoFit,
    mockupStyle,
    secondaryCapture?.url,
    secondarySceneId,
    selectedFormat,
    selectedSceneId,
    spec.key,
    tertiaryCapture?.url,
    tertiarySceneId,
  ]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    trackExport("started", {
      export_type: "banner",
      format: selectedFormat,
      resolution: exportResolution,
    });
    try {
      const blob = await buildExportBlob();
      if (!blob) throw new Error("Could not render banner image");

      const isRetina = exportResolution === "2x";
      const outW = isRetina ? activeFormat.width * 2 : activeFormat.width;
      const outH = isRetina ? activeFormat.height * 2 : activeFormat.height;
      const fileName = `${selectedFormat}-${outW}x${outH}${isRetina ? "@2x" : ""}.png`;
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();

      trackExport("completed", {
        export_type: "banner",
        format: selectedFormat,
        resolution: exportResolution,
      });
      trackAssetDownloaded({ asset_type: "banner", file_name: fileName });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download banner";
      trackExport("failed", {
        export_type: "banner",
        format: selectedFormat,
        reason: message,
      });
      studioActions?.toast(`Failed to download banner: ${message}`);
    } finally {
      setIsDownloading(false);
    }
  }, [
    activeFormat.height,
    activeFormat.width,
    buildExportBlob,
    exportResolution,
    selectedFormat,
    studioActions,
  ]);

  const handleCopyClipboard = useCallback(async () => {
    try {
      const blob = await buildExportBlob();
      if (!blob) throw new Error("Could not copy banner image");

      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not copy image to clipboard";
      studioActions?.toast(message);
    }
  }, [buildExportBlob, studioActions]);

  const handleToggleSafeArea = useCallback(() => {
    setShowSafeArea((prev) => !prev);
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <BannerTopBar
        selectedFormat={selectedFormat}
        activeFormat={activeFormat}
        exportResolution={exportResolution}
        copied={copied}
        isDownloading={isDownloading}
        onSelectFormat={setSelectedFormat}
        onSelectResolution={setExportResolution}
        onCopyClipboard={handleCopyClipboard}
        onDownload={handleDownload}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <BannerPreviewStage
          selectedFormat={selectedFormat}
          activeFormat={activeFormat}
          spec={spec}
          activeBg={activeBg}
          background={background}
          customBg={customBg}
          onCustomBgChange={setCustomBg}
          showSafeArea={showSafeArea}
          safeAreaMargin={safeAreaMargin}
          deviceCount={deviceCount}
          mockupStyle={mockupStyle}
          appIconUrl={appIconUrl}
          appInitial={appInitial}
          logoBg={logoBg}
          onLogoBgChange={setLogoBg}
          logoFit={logoFit}
          onLogoFitChange={setLogoFit}
          resolvedLogoBackground={resolvedLogoBackground}
          textColorMode={textColorMode}
          onTextColorModeChange={setTextColorMode}
          customTextColor={customTextColor}
          onCustomTextColorChange={setCustomTextColor}
          isLightBg={isLightBg}
          isDarkText={isDarkText}
          effectiveTextColor={effectiveTextColor}
          effectiveSubtextColor={effectiveSubtextColor}
          effectiveBulletColor={effectiveBulletColor}
          effectiveKickerColor={effectiveKickerColor}
          kickerText={kickerText}
          onKickerTextChange={setKickerText}
          kickerColor={kickerColor}
          onKickerColorChange={setKickerColor}
          kickerStyle={kickerStyle}
          onKickerStyleChange={setKickerStyle}
          customTitle={customTitle}
          customHeadline={customHeadline}
          customTagline={customTagline}
          benefits={benefits}
          activeEntry={activeEntry}
          activeCapture={activeCapture}
          secondaryEntry={secondaryEntry}
          secondaryCapture={secondaryCapture}
          tertiaryEntry={tertiaryEntry}
          tertiaryCapture={tertiaryCapture}
        />

        <BannerSidebarControls
          activeFormat={activeFormat}
          showSafeArea={showSafeArea}
          onToggleSafeArea={handleToggleSafeArea}
          safeAreaMargin={safeAreaMargin}
          onSafeAreaMarginChange={setSafeAreaMargin}
          deviceCount={deviceCount}
          onDeviceCountChange={setDeviceCount}
          sceneItems={sceneItems}
          copy={copy}
          locale={locale}
          selectedSceneId={selectedSceneId}
          onSelectedSceneIdChange={setSelectedSceneId}
          secondarySceneId={secondarySceneId}
          onSecondarySceneIdChange={setSecondarySceneId}
          tertiarySceneId={tertiarySceneId}
          onTertiarySceneIdChange={setTertiarySceneId}
          appIconUrl={appIconUrl}
          appInitial={appInitial}
          uploadingIcon={uploadingIcon}
          onIconUpload={handleIconUpload}
          onResetIcon={handleResetIcon}
          logoBg={logoBg}
          onLogoBgChange={setLogoBg}
          logoFit={logoFit}
          onLogoFitChange={setLogoFit}
          resolvedLogoBackground={resolvedLogoBackground}
          customTitle={customTitle}
          onCustomTitleChange={setCustomTitle}
          kickerText={kickerText}
          onKickerTextChange={setKickerText}
          kickerStyle={kickerStyle}
          onKickerStyleChange={setKickerStyle}
          kickerColor={kickerColor}
          onKickerColorChange={setKickerColor}
          customHeadline={customHeadline}
          onCustomHeadlineChange={setCustomHeadline}
          customTagline={customTagline}
          onCustomTaglineChange={setCustomTagline}
          benefits={benefits}
          onBenefitsChange={setBenefits}
          mockupStyle={mockupStyle}
          onMockupStyleChange={setMockupStyle}
          textColorMode={textColorMode}
          onTextColorModeChange={setTextColorMode}
          customTextColor={customTextColor}
          onCustomTextColorChange={setCustomTextColor}
          isDarkText={isDarkText}
          customBg={customBg}
          onCustomBgChange={setCustomBg}
          background={background}
          activeBg={activeBg}
        />
      </div>
    </div>
  );
});
