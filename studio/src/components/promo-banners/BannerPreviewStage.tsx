import { Image as ImageIcon, Palette, RotateCcw, ShieldCheck, Sparkles, Tag, Type } from "lucide-react";
import type React from "react";
import { memo } from "react";
import type { DeviceCaptures, DeviceEntry } from "../../manifest";
type ScreenshotCapture = DeviceCaptures["screenshots"][number];
import { SceneBackgroundPopover } from "../SceneBackgroundPopover";
import type { ScreenshotEntry } from "../Strip";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  type BannerBenefit,
  type BannerFormat,
  type BannerFormatMeta,
  hexToRgba,
  KICKER_COLOR_SWATCHES,
  KICKER_PRESETS,
  LOGO_COLOR_SWATCHES,
  QUICK_TEXT_COLOR_SWATCHES,
} from "./presets";

export interface BannerPreviewStageProps {
  selectedFormat: BannerFormat;
  activeFormat: BannerFormatMeta;
  spec: DeviceEntry;
  activeBg: string;
  background: string;
  customBg: string | undefined;
  onCustomBgChange: (bg: string | undefined) => void;
  showSafeArea: boolean;
  safeAreaMargin: "15%" | "20%" | "8%";
  deviceCount: "single" | "duo" | "trio";
  mockupStyle: "card" | "screen";
  appIconUrl: string | null;
  appInitial: string;
  logoBg: string;
  onLogoBgChange: (bg: string) => void;
  logoFit: "cover" | "contain";
  onLogoFitChange: (fit: "cover" | "contain") => void;
  resolvedLogoBackground: string;
  textColorMode: "auto" | "light" | "dark" | "custom";
  onTextColorModeChange: (mode: "auto" | "light" | "dark" | "custom") => void;
  customTextColor: string;
  onCustomTextColorChange: (color: string) => void;
  isLightBg: boolean;
  isDarkText: boolean;
  effectiveTextColor: string;
  effectiveSubtextColor: string;
  effectiveBulletColor: string;
  effectiveKickerColor: string;
  kickerText: string;
  onKickerTextChange: (text: string) => void;
  kickerColor: string;
  onKickerColorChange: (color: string) => void;
  kickerStyle: "text" | "badge";
  onKickerStyleChange: (style: "text" | "badge") => void;
  customTitle: string;
  customHeadline: string;
  customTagline: string;
  benefits: BannerBenefit[];
  activeEntry?: ScreenshotEntry;
  activeCapture?: ScreenshotCapture;
  secondaryEntry?: ScreenshotEntry;
  secondaryCapture?: ScreenshotCapture;
  tertiaryEntry?: ScreenshotEntry;
  tertiaryCapture?: ScreenshotCapture;
}

function PhoneMockupCard({
  entry,
  capture,
  spec,
  mockupStyle,
  extraClasses = "",
  style = {},
}: {
  entry?: ScreenshotEntry;
  capture?: ScreenshotCapture;
  spec: DeviceEntry;
  mockupStyle: "card" | "screen";
  extraClasses?: string;
  style?: React.CSSProperties;
}) {
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
            <div className="absolute top-[2.2%] left-1/2 -translate-x-1/2 h-[3%] w-[28%] bg-black rounded-full shadow-xs border border-neutral-800/80 z-20 pointer-events-none" />
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
}

export const BannerPreviewStage = memo(function BannerPreviewStage(
  props: BannerPreviewStageProps,
) {
  const {
    selectedFormat,
    activeFormat,
    spec,
    activeBg,
    background,
    customBg,
    onCustomBgChange,
    showSafeArea,
    safeAreaMargin,
    deviceCount,
    mockupStyle,
    appIconUrl,
    appInitial,
    logoBg,
    onLogoBgChange,
    logoFit,
    onLogoFitChange,
    resolvedLogoBackground,
    textColorMode,
    onTextColorModeChange,
    customTextColor,
    onCustomTextColorChange,
    isLightBg,
    isDarkText,
    effectiveTextColor,
    effectiveSubtextColor,
    effectiveBulletColor,
    effectiveKickerColor,
    kickerText,
    onKickerTextChange,
    kickerColor,
    onKickerColorChange,
    kickerStyle,
    onKickerStyleChange,
    customTitle,
    customHeadline,
    customTagline,
    benefits,
    activeEntry,
    activeCapture,
    secondaryEntry,
    secondaryCapture,
    tertiaryEntry,
    tertiaryCapture,
  } = props;

  return (
    <div className="flex flex-1 items-center justify-center p-6 sm:p-10 overflow-auto bg-neutral-950/20 dark:bg-black/40">
      <div className="flex flex-col items-center gap-4 max-w-full">
        {/* Quick Edit Toolbar Directly Above Banner Card */}
        <div className="w-full max-w-[960px] flex flex-wrap items-center justify-between gap-2 px-1 select-none">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Quick Edit</span>
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/50">
              {activeFormat.shortLabel} · {activeFormat.width}×{activeFormat.height}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md p-1 rounded-xl border border-border/70 shadow-xs">
            {/* Text Color Segmented Control */}
            <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
              <span className="text-[10px] font-semibold text-muted-foreground px-1.5 flex items-center gap-1">
                <Type className="size-3 text-primary" />
                <span>Text:</span>
              </span>

              <button
                type="button"
                onClick={() => onTextColorModeChange("auto")}
                title="Smart Auto-Contrast: Automatically switches text color based on background luminance"
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                  textColorMode === "auto"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto {isLightBg ? "(Dark)" : "(Light)"}
              </button>

              <button
                type="button"
                onClick={() => onTextColorModeChange("dark")}
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

              <button
                type="button"
                onClick={() => onTextColorModeChange("light")}
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
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {customTextColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customTextColor.startsWith("#") ? customTextColor : "#0F172A"}
                      onChange={(e) => {
                        onCustomTextColorChange(e.target.value);
                        onTextColorModeChange("custom");
                      }}
                      className="size-8 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                    />
                    <Input
                      type="text"
                      value={customTextColor}
                      onChange={(e) => {
                        onCustomTextColorChange(e.target.value);
                        onTextColorModeChange("custom");
                      }}
                      className="h-8 flex-1 text-xs font-mono uppercase"
                      placeholder="#0F172A"
                    />
                  </div>
                  <div className="text-[10px] font-medium text-muted-foreground pt-0.5">
                    Quick Swatches
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {QUICK_TEXT_COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          onCustomTextColorChange(c);
                          onTextColorModeChange("custom");
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
                  <span className="max-w-[85px] truncate font-semibold">{kickerText || "Tag"}</span>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">Kicker Tag / Badge</span>
                  </div>
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

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="kicker-tag-input"
                      className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Tag Text
                    </label>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {kickerText.length} chars
                    </span>
                  </div>
                  <Input
                    id="kicker-tag-input"
                    value={kickerText}
                    onChange={(e) => onKickerTextChange(e.target.value)}
                    placeholder="e.g. FINANCE APP, ★ FEATURED"
                    className="h-7.5 text-xs font-semibold uppercase tracking-wider"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Display Style
                  </span>
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
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Presets & Suggestions
                  </span>
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
                              onClick={() => onKickerTextChange(tag)}
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

                <div className="space-y-1.5 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Accent Color
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      {effectiveKickerColor}
                    </span>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {KICKER_COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onKickerColorChange(c)}
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
                      value={
                        kickerColor.startsWith("#")
                          ? kickerColor
                          : isDarkText
                            ? "#0284C7"
                            : "#38BDF8"
                      }
                      onChange={(e) => onKickerColorChange(e.target.value)}
                      className="size-7 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                    />
                    <Input
                      type="text"
                      value={kickerColor}
                      onChange={(e) => onKickerColorChange(e.target.value)}
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
                    {logoBg === "gradient"
                      ? "Grad"
                      : logoBg === "transparent"
                        ? "Clear"
                        : logoBg === "#FFFFFF"
                          ? "White"
                          : logoBg.startsWith("#")
                            ? logoBg.slice(0, 4)
                            : "Custom"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 space-y-2.5" side="bottom" align="end">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-[#FF6B00]" />
                    <span className="text-xs font-bold text-foreground">Logo Background & Fit</span>
                  </div>
                  {logoBg !== "gradient" || logoFit !== "cover" ? (
                    <button
                      type="button"
                      onClick={() => {
                        onLogoBgChange("gradient");
                        onLogoFitChange("cover");
                      }}
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
                    onClick={() => onLogoBgChange("#FFFFFF")}
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
                    onClick={() => onLogoBgChange("#0F172A")}
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
                    onClick={() => onLogoBgChange("gradient")}
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
                        onClick={() => onLogoBgChange(c)}
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
                      onChange={(e) => onLogoBgChange(e.target.value)}
                      className="size-7 rounded cursor-pointer border border-border/80 bg-transparent p-0.5 shrink-0"
                    />
                    <Input
                      type="text"
                      value={logoBg.startsWith("#") ? logoBg : ""}
                      onChange={(e) => onLogoBgChange(e.target.value)}
                      placeholder="#FFFFFF or Hex"
                      className="h-7 text-xs font-mono uppercase flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-border/50">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Icon Fit & Padding
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => onLogoFitChange("cover")}
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
                      onClick={() => onLogoFitChange("contain")}
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
              onChange={onCustomBgChange}
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
                <div className="absolute -top-3.5 left-2 bg-amber-500 text-black text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-md flex items-center gap-1">
                  <span>Safe Zone ({safeAreaMargin})</span>
                </div>
                <div className="absolute -bottom-3.5 right-2 bg-amber-500 text-black text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-md">
                  <span>Keep Core Copy & Brand Inside</span>
                </div>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-amber-400/30" />
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-amber-400/30" />
              </div>

              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/40 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-amber-400" />
                <span>Store Crop Simulator Active</span>
              </div>
            </div>
          ) : null}

          {/* Banner Layout Content */}
          {selectedFormat === "instagram-square" ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-6 sm:p-8 text-center">
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

              <div className="relative flex-1 w-full flex items-end justify-center overflow-hidden pt-2">
                <div className="h-full max-h-[380px] transform hover:-translate-y-1 transition-transform translate-y-3">
                  <PhoneMockupCard
                    entry={activeEntry}
                    capture={activeCapture}
                    spec={spec}
                    mockupStyle={mockupStyle}
                    extraClasses="h-full"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              className="absolute inset-0 z-10 flex items-center justify-between"
              style={{
                paddingLeft: "6cqw",
                paddingRight: "4cqw",
                paddingTop: "5cqh",
                paddingBottom: "5cqh",
              }}
            >
              {/* Left Column */}
              <div
                className="flex flex-col justify-center h-full"
                style={{
                  width: deviceCount === "trio" ? "42cqw" : "45cqw",
                  gap: "2cqh",
                }}
              >
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

                {benefits.length > 0 ? (
                  <div className="flex flex-col" style={{ marginTop: "0.4cqh", gap: "1.2cqh" }}>
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
                style={{ width: deviceCount === "trio" ? "53cqw" : "49cqw" }}
              >
                {deviceCount === "trio" ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div
                      className="absolute z-10 transition-all"
                      style={{
                        height: "79cqh",
                        top: "10cqh",
                        left: "7%",
                        transform: "rotate(-7.5deg)",
                      }}
                    >
                      <PhoneMockupCard
                        entry={secondaryEntry}
                        capture={secondaryCapture}
                        spec={spec}
                        mockupStyle={mockupStyle}
                        extraClasses="h-full opacity-95 shadow-[0_18px_36px_rgba(0,0,0,0.42)]"
                      />
                    </div>
                    <div
                      className="absolute z-10 transition-all"
                      style={{
                        height: "79cqh",
                        top: "10cqh",
                        right: "7%",
                        transform: "rotate(7.5deg)",
                      }}
                    >
                      <PhoneMockupCard
                        entry={tertiaryEntry}
                        capture={tertiaryCapture}
                        spec={spec}
                        mockupStyle={mockupStyle}
                        extraClasses="h-full opacity-95 shadow-[0_18px_36px_rgba(0,0,0,0.42)]"
                      />
                    </div>
                    <div
                      className="relative z-20 transform hover:scale-[1.03] transition-all duration-300"
                      style={{ height: "81cqh", top: "0.5cqh" }}
                    >
                      <PhoneMockupCard
                        entry={activeEntry}
                        capture={activeCapture}
                        spec={spec}
                        mockupStyle={mockupStyle}
                        extraClasses="h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.65)]"
                      />
                    </div>
                  </div>
                ) : deviceCount === "duo" ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div
                      className="absolute z-10 transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        height: "80cqh",
                        top: "10cqh",
                        right: "11%",
                        transform: "rotate(7.5deg)",
                      }}
                    >
                      <PhoneMockupCard
                        entry={secondaryEntry}
                        capture={secondaryCapture}
                        spec={spec}
                        mockupStyle={mockupStyle}
                        extraClasses="h-full opacity-95 shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
                      />
                    </div>
                    <div
                      className="absolute z-20 transform hover:scale-[1.03] transition-all duration-300"
                      style={{
                        height: "80cqh",
                        top: "10cqh",
                        left: "11%",
                        transform: "rotate(-7.5deg)",
                      }}
                    >
                      <PhoneMockupCard
                        entry={activeEntry}
                        capture={activeCapture}
                        spec={spec}
                        mockupStyle={mockupStyle}
                        extraClasses="h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.65)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative z-20 transform hover:scale-[1.03] transition-all duration-300"
                    style={{ height: "82cqh" }}
                  >
                    <PhoneMockupCard
                      entry={activeEntry}
                      capture={activeCapture}
                      spec={spec}
                      mockupStyle={mockupStyle}
                      extraClasses="h-full ring-1 ring-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.6)]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center max-w-lg">
          {activeFormat.description}. Bundled automatically in the Store ZIP package.
        </p>
      </div>
    </div>
  );
});
