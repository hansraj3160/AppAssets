import {
  Languages,
  type LucideIcon,
  PlayIcon,
  RefreshCw,
  SmartphoneIcon,
  TabletIcon,
  X,
} from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SelectContent,
  SelectItem,
  Select as SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BacklightConfig, PatternType } from "../../../src/background";
import type { Platform } from "../App";
import { apiFetch } from "../lib/api";
import { isRtlLocale, type StoreManifest } from "../manifest";
import { AdBanner } from "./AdBanner";
import type { BadgeData } from "./BadgePickerPopover";
import { DesignPanel } from "./DesignPanel";
import { SidebarSection } from "./SidebarSection";

/**
 * The device-type rows, in display order.
 */
const DEVICE_TYPES: Array<{
  key: string;
  icon: LucideIcon;
  label: string;
  platform?: Platform;
}> = [
  { key: "iphone", icon: SmartphoneIcon, label: "iPhone", platform: "ios" },
  { key: "ipad", icon: TabletIcon, label: "iPad", platform: "ipad" },
  { key: "android", icon: PlayIcon, label: "Android", platform: "android" },
];

/**
 * The left rail: device, locale, and design customization controls.
 */
export function Sidebar({
  manifest,
  platform,
  device,
  locale,
  onPlatform,
  onDevice,
  onLocale,
  background,
  frame,
  fontFamily,
  template,
  layout,
  screenOnly,
  headlineColor,
  subheadColor,
  fontSizeScale,
  backgroundPattern,
  patternOpacity,
  patternColor,
  deviceBacklight,
  panoramaMode,
  onOpenLocaleManager,
  onBackground,
  onFrame,
  onFontFamily,
  onTemplate,
  onLayout,
  onScreenOnly,
  onHeadlineColor,
  onSubheadColor,
  onFontSizeScale,
  onBackgroundPattern,
  onPatternOpacity,
  onPatternColor,
  onDeviceBacklight,
  onPanoramaMode,
  sceneBadges,
  onSceneBadge,
  sceneBackgrounds,
  onSceneBackground,
  iphoneSize = "1206x2622",
  onIphoneSize,
  onCloseMobile,
  onRefresh,
  onToast,
}: {
  manifest: StoreManifest;
  platform: Platform;
  device: string;
  locale: string;
  onPlatform: (v: Platform) => void;
  onDevice: (v: string) => void;
  onLocale: (v: string) => void;
  iphoneSize?: "1206x2622" | "1320x2868";
  onIphoneSize?: (v: "1206x2622" | "1320x2868") => void;
  background: string;
  frame: string;
  fontFamily: string;
  template: string;
  layout: string;
  screenOnly: boolean;
  headlineColor?: string;
  subheadColor?: string;
  fontSizeScale?: number;
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
  onOpenLocaleManager?: () => void;
  onBackground: (v: string) => void;
  onFrame: (v: string) => void;
  onFontFamily: (v: string) => void;
  onTemplate: (v: string) => void;
  onLayout: (v: string) => void;
  onScreenOnly: (v: boolean) => void;
  onHeadlineColor: (v: string) => void;
  onSubheadColor: (v: string) => void;
  onFontSizeScale: (v: number) => void;
  onBackgroundPattern?: (v: PatternType) => void;
  onPatternOpacity?: (v: number) => void;
  onPatternColor?: (v: string) => void;
  onDeviceBacklight?: (v: boolean | BacklightConfig) => void;
  onPanoramaMode?: (v: boolean) => void;
  sceneBadges?: Record<string, BadgeData>;
  onSceneBadge?: (sceneId: string, badge: BadgeData | undefined) => void;
  sceneBackgrounds?: Record<string, string>;
  onSceneBackground?: (sceneId: string, bg: string | undefined) => void;
  onCloseMobile?: () => void;
  onRefresh?: () => Promise<void> | void;
  onToast?: (message: string) => void;
}) {
  const platformDevices = manifest.devices.filter((d) => d.platform === platform);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAcrossPlatforms = async () => {
    setIsSyncing(true);
    try {
      const sourceDevice = "iphone-6.9";
      const targetDevices =
        platform === "android"
          ? ["pixel-10-pro"]
          : platform === "ipad"
            ? ["ipad-13"]
            : ["pixel-10-pro", "ipad-13"];

      const res = await apiFetch("/api/sync-captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDevice, targetDevices }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to sync captures (${res.status})`);
      }
      const label =
        platform === "android" ? "Android" : platform === "ipad" ? "iPad" : "Android & iPad";
      if (onToast) {
        onToast(`✨ Synced screenshots from iPhone to ${label}!`);
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to sync captures");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <aside className="flex w-full md:w-[310px] shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground h-full">
      <div className="sidebar-scroll flex-1 overflow-y-auto p-3.5 space-y-3">
        {onCloseMobile ? (
          <div className="flex md:hidden items-center justify-between pb-2 mb-1 border-b border-border/80">
            <span className="text-xs font-bold text-foreground">Design Settings</span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              aria-label="Close design settings"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {/* Section 1: Device & Store */}
        <SidebarSection
          id="device-store"
          icon={SmartphoneIcon}
          title="Device & Store"
          summary={`${platform.toUpperCase()} · ${locale}`}
          defaultOpen={true}
        >
          <div className="flex flex-col gap-3.5">
            {/* Device Platform Tabs */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Platform</Label>
              <RadioGroupPrimitive.Root
                value={platform === "ios" ? "iphone" : platform === "ipad" ? "ipad" : "android"}
                onValueChange={(key) => {
                  const picked = DEVICE_TYPES.find((t) => t.key === key)?.platform;
                  if (picked) onPlatform(picked);
                }}
                aria-label="Device type"
                className="grid grid-cols-3 gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/60"
              >
                {DEVICE_TYPES.map(({ key, icon: Icon, label, platform: target }) => (
                  <RadioGroupPrimitive.Item
                    key={key}
                    value={key}
                    disabled={!target}
                    className={cn(
                      "group relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs font-medium text-muted-foreground transition-all cursor-pointer",
                      "hover:not-data-[state=checked]:bg-background/50 hover:text-foreground",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      "data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-xs data-[state=checked]:border data-[state=checked]:border-border/60",
                      "data-disabled:pointer-events-none data-disabled:opacity-40",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="text-[11px] leading-none">{label}</span>
                    {target ? null : (
                      <span className="absolute top-1 right-1 text-[8px] font-normal text-muted-foreground/70">
                        Soon
                      </span>
                    )}
                  </RadioGroupPrimitive.Item>
                ))}
              </RadioGroupPrimitive.Root>

              {/* Quick Cross-Platform Sync Action */}
              <div className="flex items-center justify-between px-0.5 pt-0.5">
                <span className="text-[10px] text-muted-foreground/80 font-medium">
                  Screenshots
                </span>
                <button
                  type="button"
                  onClick={handleSyncAcrossPlatforms}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#FF6B00] hover:text-[#FF8A00] hover:underline cursor-pointer disabled:opacity-50 transition-colors"
                  title={
                    platform === "android"
                      ? "Sync latest screenshots from iPhone to Android"
                      : platform === "ipad"
                        ? "Sync latest screenshots from iPhone to iPad"
                        : "Sync screenshots from iPhone to Android and iPad"
                  }
                >
                  <RefreshCw className={cn("size-2.5", isSyncing && "animate-spin")} />
                  <span>
                    {platform === "android"
                      ? "Sync from iPhone"
                      : platform === "ipad"
                        ? "Sync from iPhone"
                        : "Sync to Android/iPad"}
                  </span>
                </button>
              </div>

              {platform === "ios" && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">iPhone Display Size</Label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">App Store Ready</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/60">
                    <button
                      type="button"
                      onClick={() => onIphoneSize?.("1206x2622")}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                        iphoneSize === "1206x2622"
                          ? "bg-background text-foreground shadow-xs border border-border/60"
                          : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                      )}
                    >
                      <span className="font-semibold text-[11px]">6.3" (Required)</span>
                      <span className="font-mono text-[9px] text-muted-foreground">1206 × 2622</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onIphoneSize?.("1320x2868")}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                        iphoneSize === "1320x2868"
                          ? "bg-background text-foreground shadow-xs border border-border/60"
                          : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                      )}
                    >
                      <span className="font-semibold text-[11px]">6.9" Pro Max</span>
                      <span className="font-mono text-[9px] text-muted-foreground">1320 × 2868</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {platformDevices.length > 1 ? (
              <Field label="Screen Size">
                <Select
                  value={device}
                  onChange={onDevice}
                  options={platformDevices.map((d) => [
                    d.key,
                    d.platform === "ios" || d.platform === "ipad" ? `${d.label}"` : d.label,
                  ])}
                />
              </Field>
            ) : null}

            <Field label="Target Locale">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={locale}
                    onChange={onLocale}
                    options={manifest.locales.map((l) => [
                      l,
                      `${l}${isRtlLocale(l) ? " (RTL)" : ""}`,
                    ])}
                  />
                </div>
                {onOpenLocaleManager ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0 border-border hover:border-primary/50 cursor-pointer"
                    title="Manage Locales & Translation Matrix"
                    onClick={onOpenLocaleManager}
                  >
                    <Languages className="size-4 text-muted-foreground" />
                  </Button>
                ) : null}
              </div>
            </Field>

            {onOpenLocaleManager ? (
              <button
                type="button"
                onClick={onOpenLocaleManager}
                className="flex items-center gap-1.5 text-[11px] font-medium text-sky-500 hover:text-sky-400 transition-colors w-fit cursor-pointer"
              >
                <Languages className="size-3.5" />
                <span>
                  Translation Matrix ({manifest.locales.length}{" "}
                  {manifest.locales.length === 1 ? "locale" : "locales"})
                </span>
              </button>
            ) : null}
          </div>
        </SidebarSection>
        <DesignPanel
          design={manifest.design}
          deviceFrame={
            platform === "android" ||
            platform === "ipad" ||
            Boolean(platformDevices.find((d) => d.key === device)?.frame)
          }
          background={background}
          frame={frame}
          fontFamily={fontFamily}
          template={template}
          layout={layout}
          screenOnly={screenOnly}
          headlineColor={headlineColor}
          subheadColor={subheadColor}
          fontSizeScale={fontSizeScale}
          backgroundPattern={backgroundPattern}
          patternOpacity={patternOpacity}
          patternColor={patternColor}
          deviceBacklight={deviceBacklight}
          panoramaMode={panoramaMode}
          onBackground={onBackground}
          onFrame={onFrame}
          onFontFamily={onFontFamily}
          onTemplate={onTemplate}
          onLayout={onLayout}
          onScreenOnly={onScreenOnly}
          onHeadlineColor={onHeadlineColor}
          onSubheadColor={onSubheadColor}
          onFontSizeScale={onFontSizeScale}
          onBackgroundPattern={onBackgroundPattern}
          onPatternOpacity={onPatternOpacity}
          onPatternColor={onPatternColor}
          onDeviceBacklight={onDeviceBacklight}
          onPanoramaMode={onPanoramaMode}
          sceneBadges={sceneBadges}
          onSceneBadge={onSceneBadge}
          sceneBackgrounds={sceneBackgrounds}
          onSceneBackground={onSceneBackground}
        />
        <AdBanner variant="sidebar" />
      </div>
    </aside>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground/70">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Radix Select treats "" as "no value", so the custom-frame option (an empty
 * slug) rides on a sentinel that is mapped back on change.
 */
const EMPTY = "__none__";

export function Select({
  value,
  onChange,
  options,
  size = "default",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <SelectRoot value={value || EMPTY} onValueChange={(v) => onChange(v === EMPTY ? "" : v)}>
      <SelectTrigger size={size} className={className ?? "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v || EMPTY}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}
