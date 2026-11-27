import {
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
import type React from "react";
import { memo } from "react";
import type { SceneCopy } from "../../manifest";
import { AdBanner } from "../AdBanner";
import { SceneBackgroundPopover } from "../SceneBackgroundPopover";
import type { ScreenshotEntry } from "../Strip";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  type BannerBenefit,
  type BannerFormatMeta,
  KICKER_COLOR_SWATCHES,
  LOGO_COLOR_SWATCHES,
  QUICK_KICKER_CHIPS,
} from "./presets";

export interface BannerSidebarControlsProps {
  activeFormat: BannerFormatMeta;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
  safeAreaMargin: "15%" | "20%" | "8%";
  onSafeAreaMarginChange: (margin: "15%" | "20%" | "8%") => void;
  deviceCount: "single" | "duo" | "trio";
  onDeviceCountChange: (count: "single" | "duo" | "trio") => void;
  sceneItems: ScreenshotEntry[];
  copy: Record<string, SceneCopy>;
  locale: string;
  selectedSceneId: string;
  onSelectedSceneIdChange: (id: string) => void;
  secondarySceneId: string;
  onSecondarySceneIdChange: (id: string) => void;
  tertiarySceneId: string;
  onTertiarySceneIdChange: (id: string) => void;
  appIconUrl: string | null;
  appInitial: string;
  uploadingIcon: boolean;
  onIconUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetIcon: () => void;
  logoBg: string;
  onLogoBgChange: (bg: string) => void;
  logoFit: "cover" | "contain";
  onLogoFitChange: (fit: "cover" | "contain") => void;
  resolvedLogoBackground: string;
  customTitle: string;
  onCustomTitleChange: (val: string) => void;
  kickerText: string;
  onKickerTextChange: (val: string) => void;
  kickerStyle: "text" | "badge";
  onKickerStyleChange: (style: "text" | "badge") => void;
  kickerColor: string;
  onKickerColorChange: (color: string) => void;
  customHeadline: string;
  onCustomHeadlineChange: (val: string) => void;
  customTagline: string;
  onCustomTaglineChange: (val: string) => void;
  benefits: BannerBenefit[];
  onBenefitsChange: (next: BannerBenefit[]) => void;
  mockupStyle: "card" | "screen";
  onMockupStyleChange: (style: "card" | "screen") => void;
  textColorMode: "auto" | "light" | "dark" | "custom";
  onTextColorModeChange: (mode: "auto" | "light" | "dark" | "custom") => void;
  customTextColor: string;
  onCustomTextColorChange: (color: string) => void;
  isDarkText: boolean;
  customBg: string | undefined;
  onCustomBgChange: (bg: string | undefined) => void;
  background: string;
  activeBg: string;
}

export const BannerSidebarControls = memo(function BannerSidebarControls(
  props: BannerSidebarControlsProps,
) {
  const {
    activeFormat,
    showSafeArea,
    onToggleSafeArea,
    safeAreaMargin,
    onSafeAreaMarginChange,
    deviceCount,
    onDeviceCountChange,
    sceneItems,
    copy,
    locale,
    selectedSceneId,
    onSelectedSceneIdChange,
    secondarySceneId,
    onSecondarySceneIdChange,
    tertiarySceneId,
    onTertiarySceneIdChange,
    appIconUrl,
    appInitial,
    uploadingIcon,
    onIconUpload,
    onResetIcon,
    logoBg,
    onLogoBgChange,
    logoFit,
    onLogoFitChange,
    resolvedLogoBackground,
    customTitle,
    onCustomTitleChange,
    kickerText,
    onKickerTextChange,
    kickerStyle,
    onKickerStyleChange,
    kickerColor,
    onKickerColorChange,
    customHeadline,
    onCustomHeadlineChange,
    customTagline,
    onCustomTaglineChange,
    benefits,
    onBenefitsChange,
    mockupStyle,
    onMockupStyleChange,
    textColorMode,
    onTextColorModeChange,
    customTextColor,
    onCustomTextColorChange,
    isDarkText,
    customBg,
    onCustomBgChange,
    background,
    activeBg,
  } = props;

  return (
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
            onClick={onToggleSafeArea}
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
              {(
                [
                  { value: "15%", label: "Play (15%)" },
                  { value: "20%", label: "Strict (20%)" },
                  { value: "8%", label: "Bleed (8%)" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onSafeAreaMarginChange(preset.value)}
                  className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                    safeAreaMargin === preset.value
                      ? "bg-amber-500 text-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Multi-Phone Showcase & Screens Setup */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Smartphone className="size-3.5 text-[#FF6B00]" />
          <span>Phone Mockups Arrangement</span>
        </span>

        <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
          {(
            [
              { key: "single", label: "1 phone" },
              { key: "duo", label: "2 phone" },
              { key: "trio", label: "3 phone" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onDeviceCountChange(item.key)}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                deviceCount === item.key
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

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
              onChange={(e) => onSelectedSceneIdChange(e.target.value)}
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
                onChange={(e) => onSecondarySceneIdChange(e.target.value)}
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
                onChange={(e) => onTertiarySceneIdChange(e.target.value)}
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
              <ImageIcon className="size-3.5 text-[#FF6B00]" />
              <span>App Icon / Logo</span>
            </span>
            {appIconUrl ? (
              <button
                type="button"
                onClick={onResetIcon}
                className="text-[10px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
              >
                Reset to Initial
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`size-12 rounded-[22%] flex items-center justify-center text-white font-black text-lg overflow-hidden shrink-0 transition-all ${
                logoBg === "transparent"
                  ? "border border-border/80 bg-neutral-900/40"
                  : "shadow-md border border-white/25"
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
                  onChange={onIconUpload}
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
                  onClick={() => onLogoBgChange("gradient")}
                  className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <RotateCcw className="size-2.5" />
                  <span>Reset</span>
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => onLogoBgChange("transparent")}
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
                onClick={() => onLogoBgChange("#FFFFFF")}
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
                onClick={() => onLogoBgChange("#0F172A")}
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
                onClick={() => onLogoBgChange("gradient")}
                className={`py-1 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  logoBg === "gradient"
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
                }`}
              >
                <span>Gradient</span>
              </button>
            </div>

            <div className="grid grid-cols-6 gap-1">
              {LOGO_COLOR_SWATCHES.slice(0, 12).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onLogoBgChange(c)}
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
                onChange={(e) => onLogoBgChange(e.target.value)}
                className="size-6 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
              />
              <Input
                type="text"
                value={logoBg.startsWith("#") ? logoBg : ""}
                onChange={(e) => onLogoBgChange(e.target.value)}
                placeholder="Custom Hex (e.g. #FFFFFF)"
                className="h-6.5 text-[11px] font-mono uppercase flex-1"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Icon Fit
              </span>
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => onLogoFitChange("cover")}
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
                  onClick={() => onLogoFitChange("contain")}
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

        {/* Brand / App Wordmark */}
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
            onChange={(e) => onCustomTitleChange(e.target.value)}
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
            onChange={(e) => onKickerTextChange(e.target.value)}
            placeholder="PRODUCTIVITY APP"
            className="h-8 text-xs font-medium uppercase tracking-wide"
          />
          <div className="flex flex-wrap gap-1 pt-0.5">
            {QUICK_KICKER_CHIPS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onKickerTextChange(tag)}
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
            onChange={(e) => onCustomHeadlineChange(e.target.value)}
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
            onChange={(e) => onCustomTaglineChange(e.target.value)}
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
                  onBenefitsChange(next);
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
              onClick={() => onMockupStyleChange("screen")}
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
              onClick={() => onMockupStyleChange("card")}
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
                onTextColorModeChange("auto");
                onKickerColorChange("");
              }}
              className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="size-2.5" />
              <span>Reset to Auto</span>
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => onTextColorModeChange("auto")}
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
            onClick={() => onTextColorModeChange("dark")}
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
            onClick={() => onTextColorModeChange("light")}
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
            onClick={() => onTextColorModeChange("custom")}
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
              onChange={(e) => onCustomTextColorChange(e.target.value)}
              className="size-7 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
            />
            <Input
              type="text"
              value={customTextColor}
              onChange={(e) => onCustomTextColorChange(e.target.value)}
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
                  onKickerColorChange("");
                  onKickerStyleChange("text");
                }}
                className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <RotateCcw className="size-2.5" />
                <span>Reset</span>
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => onKickerStyleChange("text")}
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
              onClick={() => onKickerStyleChange("badge")}
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

          <div className="grid grid-cols-8 gap-1 pt-0.5">
            {KICKER_COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onKickerColorChange(c)}
                className={`size-5 rounded-md border border-border/60 cursor-pointer transition-transform hover:scale-115 ${
                  kickerColor === c ? "ring-2 ring-primary ring-offset-1 scale-105" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={
                kickerColor.startsWith("#") ? kickerColor : isDarkText ? "#0284C7" : "#38BDF8"
              }
              onChange={(e) => onKickerColorChange(e.target.value)}
              className="size-6 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
            />
            <Input
              type="text"
              value={kickerColor}
              onChange={(e) => onKickerColorChange(e.target.value)}
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
              onClick={() => onCustomBgChange(undefined)}
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
          onChange={onCustomBgChange}
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

      {/* Format Info Card */}
      <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5 text-xs text-muted-foreground mt-2">
        <div className="flex items-center justify-between font-semibold text-foreground">
          <span>{activeFormat.label}</span>
          <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            {activeFormat.width} × {activeFormat.height}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed">{activeFormat.description}</p>
      </div>

      <div className="pt-2">
        <AdBanner variant="sidebar" />
      </div>
    </div>
  );
});
