import type { ReactNode } from "react";
import type { BacklightConfig, PatternType } from "../../../../src/background";
import { CUSTOM_TEMPLATE } from "../../App";
import {
  trackAssetDownloaded,
  trackExport,
  trackScreenshotGeneration,
} from "../../lib/analytics";
import { apiFetch } from "../../lib/api";
import {
  type AppInfo,
  type Design,
  type DeviceCaptures,
  type DeviceEntry,
  fontKey,
  type SceneCopy,
  type StoreManifest,
} from "../../manifest";

/** Tiles shown at once; the App Store product page shows this many before scrolling. */
export const PAGE_SIZE = 5;

/** Apple's cap on screenshots per device family. */
export const MAX_SCREENSHOTS = 10;

export const pageSlide = {
  enter: (direction: number) => ({ x: direction > 0 ? "110%" : "-110%" }),
  center: { x: "0%" },
  exit: (direction: number) => ({ x: direction > 0 ? "-110%" : "110%" }),
};

export interface BadgeConfig {
  text: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  background?: string;
  color?: string;
  slice?: number;
}

export type ScreenshotEntry = {
  key: string;
  sceneId: string;
  slice: number;
  width: number;
  height: number;
  layoutKey: string;
  sceneBg: string;
  render: (editable?: boolean) => ReactNode;
};

export type StripEntry = {
  key: string;
  width: number;
  height: number;
  bad: boolean;
  badReason?: string;
  editable: boolean;
  scene: (editable: boolean) => ReactNode;
  sceneId?: string;
  targetSceneId?: string;
  slice?: number;
  layout?: {
    value: string | undefined;
    defaultKey: string;
    onChange: (key: string | undefined) => void;
  };
};

export interface StripProps {
  manifest?: StoreManifest;
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
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
  sceneBackgrounds?: Record<string, string>;
  onSceneBackground?: (sceneId: string, bg: string | undefined) => void;
  sceneBadges?: Record<string, BadgeConfig>;
  onSceneBadge?: (sceneId: string, badge: BadgeConfig | undefined) => void;
  copy: Record<string, SceneCopy>;
  onCopy: (sceneId: string, field: "headline" | "subhead", text: string) => void;
  order: string[];
  onReorder: (order: string[]) => void;
  template: string | string[];
  layout: string;
  screenOnly: boolean;
  sceneLayouts: Record<string, string>;
  onSceneLayout: (sceneId: string, key: string | undefined) => void;
  iphoneSize?: "1206x2622" | "1320x2868";
  appInfo?: AppInfo;
  onRefresh?: () => Promise<void> | void;
  onToast?: (message: string) => void;
}

/** Container-query units: 1cqw / 1cqh is one percent of a single tile. */
export const cq = (tile: { width: number; height: number }) => ({
  w: (v: number) => `${(v / tile.width) * 100}cqw`,
  h: (v: number) => `${(v / tile.height) * 100}cqh`,
});

/** Position of a scene id in the saved order; unlisted ids sort last, in config order. */
export function rankOf(order: string[], id: string): number {
  const i = order.indexOf(id);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

/**
 * Mirror of the CLI's backgroundLuminance: mean relative luminance of the
 * value's six-digit hex colors, or null when it has none.
 */
export function backgroundLuminance(css: string): number | null {
  const hexes = css.match(/#[0-9a-fA-F]{6}/g);
  if (!hexes || hexes.length === 0) return null;
  const luminance = (hex: string) => {
    const channel = (offset: number) => {
      const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  };
  return hexes.reduce((sum, hex) => sum + luminance(hex), 0) / hexes.length;
}

/** Resolves headline and subhead colors, honoring global overrides or background luminance. */
export function resolveColors({
  bg,
  headlineColor,
  subheadColor,
  themeHeadlineColor,
  themeSubheadColor,
}: {
  bg: string;
  headlineColor?: string;
  subheadColor?: string;
  themeHeadlineColor: string;
  themeSubheadColor: string;
}) {
  const bgLum = backgroundLuminance(bg);
  const isDark = bgLum !== null && bgLum < 0.5;
  const isLight = bgLum !== null && bgLum >= 0.5;
  const lightColor = (c: string) => (backgroundLuminance(c) ?? 0) > 0.5;
  const resolvedHeadline = headlineColor
    ? headlineColor
    : isDark
      ? "#FFFFFF"
      : isLight && lightColor(themeHeadlineColor)
        ? "#0E1B2A"
        : themeHeadlineColor;
  const resolvedSubhead = subheadColor
    ? subheadColor
    : isDark
      ? "#D9E1EA"
      : isLight && lightColor(themeSubheadColor)
        ? "#5A6A7D"
        : themeSubheadColor;
  return { headlineColor: resolvedHeadline, subheadColor: resolvedSubhead };
}

/** Reads a File into a base64 dataUrl and probes its natural dimensions. */
export function readFileData(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ dataUrl, width: 0, height: 0 });
        }
      }, 1000);

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ dataUrl, width: 0, height: 0 });
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Downloads a single full-resolution screenshot with live design parameters. */
export async function downloadSingleScreenshot({
  sceneId,
  slice,
  device,
  size,
  locale,
  background,
  frameUrl,
  fontFamily,
  template,
  layout,
  screenOnly,
  fontSizeScale,
  design,
}: {
  sceneId: string;
  slice?: number;
  device: string;
  size?: string;
  locale: string;
  background?: string;
  frameUrl?: string;
  fontFamily?: string;
  template?: string | string[];
  layout?: string;
  screenOnly?: boolean;
  fontSizeScale?: number;
  design?: Design;
}): Promise<void> {
  const params = new URLSearchParams({
    sceneId,
    device,
    locale,
    force: "1",
  });
  if (size) params.set("size", size);
  if (slice !== undefined) params.set("slice", String(slice));
  if (background) params.set("background", background);
  const cleanFrame =
    design?.frameVariant ||
    (frameUrl ? frameUrl.replace(/^\/?frames\//, "").replace(/\.png$/, "") : undefined);
  if (cleanFrame) params.set("frame", cleanFrame);
  if (design && fontFamily) {
    const font = fontKey(design, fontFamily);
    if (font) params.set("font", font);
  }
  if (template && template !== CUSTOM_TEMPLATE) {
    params.set("template", Array.isArray(template) ? template.join(",") : template);
  }
  if (layout) params.set("layout", layout);
  if (screenOnly) params.set("screenOnly", "true");
  if (fontSizeScale && fontSizeScale !== 1) {
    params.set("fontSizeScale", String(fontSizeScale));
  }

  trackScreenshotGeneration("started", { device, scene_id: sceneId });
  trackExport("started", { export_type: "single_png", device, scene_id: sceneId });

  const res = await apiFetch(`/api/export-single?${params.toString()}`);
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Download failed");
    trackScreenshotGeneration("failed", { device, scene_id: sceneId, reason: errorText });
    trackExport("failed", { export_type: "single_png", device, reason: errorText });
    throw new Error(errorText || "Download failed");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const sliceSuffix = slice && slice > 1 ? `-${slice}` : "";
  const sizeSuffix = size === "1206x2622" ? "-1206x2622" : "";
  const fileName = `${sceneId}${sliceSuffix}-${device}${sizeSuffix}.png`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();

  trackScreenshotGeneration("generated", { device, scene_id: sceneId });
  trackExport("completed", { export_type: "single_png", device });
  trackAssetDownloaded({ asset_type: "png", file_name: fileName });
}
