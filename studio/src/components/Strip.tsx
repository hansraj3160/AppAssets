import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderArchive,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, Reorder } from "motion/react";
import type React from "react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  BADGE,
  type Composition,
  compose,
  isTemplateKey,
  type LAYOUTS,
  type LayoutKey,
  resolveScenes,
  SCREEN_SHADOW,
  TYPE,
} from "../../../src/layouts";
import { type BacklightConfig, type PatternType, withOpacity } from "../../../src/background";
import { CUSTOM_TEMPLATE } from "../App";
import {
  trackAppImported,
  trackAssetDownloaded,
  trackExport,
  trackScreenshotGeneration,
} from "../lib/analytics";
import {
  type AppInfo,
  type Decoration,
  type Design,
  type DesignScene,
  type DeviceCaptures,
  type DeviceEntry,
  type FrameGeometry,
  fontKey,
  isRtlLocale,
  type SceneCopy,
  type StoreManifest,
  type Theme,
} from "../manifest";
import { AiCopyModal } from "./AiCopyModal";
import { BadgePickerPopover } from "./BadgePickerPopover";
import { CHECKERBOARD, layoutOptions, TRANSPARENT } from "./DesignPanel";
import { SceneBackgroundPopover } from "./SceneBackgroundPopover";
import { Select } from "./Sidebar";
import { Button } from "./ui/button";
import { apiFetch } from "../lib/api";

/** Tiles shown at once; the App Store product page shows this many before scrolling. */
const PAGE_SIZE = 5;
/** Apple's cap on screenshots per device family. */
export const MAX_SCREENSHOTS = 10;

/**
 * Page-turn animation: the incoming page slides in from the side the arrow
 * points at while the outgoing page leaves through the opposite edge. 110%
 * keeps a page's tile shadows clear of the clip edge until it is in motion.
 */
const pageSlide = {
  enter: (direction: number) => ({ x: direction > 0 ? "110%" : "-110%" }),
  center: { x: "0%" },
  exit: (direction: number) => ({ x: direction > 0 ? "-110%" : "110%" }),
};

/**
 * The five-up strip, composited in the browser: each screenshot tile is the
 * raw device capture inside the bezel art on the chosen background, laid out
 * with the exact geometry the CLI renders with (src/frame.ts), so what you see
 * is what an export renders. Background and frame arrive as props from React
 * state - changing them repaints instantly, no CLI involved. The preview tile
 * plays the raw clips as they are: Apple requires a plain screen recording.
 *
 * The App Store allows up to ten screenshots; the strip shows five tiles at a
 * time, and when there are more, arrows page through them like the store's
 * own carousel. Scenes past the tenth are dropped with a note.
 *
 * Every tile is a size-container: the geometry is computed in the device's
 * spec pixels and expressed in cqw/cqh, so the tile is the composition scaled
 * down. Captions under the tiles show the spec size the export will produce;
 * the video's turns red when the clips sum outside Apple's 15-30s window
 * (iOS only; the android video goes to YouTube, which has no bounds).
 *
 * In the lightbox the headline and subhead are editable in place; a change
 * is reported through onCopy for the current locale and layered over the
 * config's copy here and in the CLI, via goldie.design.json.
 *
 * Screenshot tiles can be dragged into a new order; the resulting scene id
 * list is reported through onReorder and saved the same way, so an export
 * numbers the files in the order shown. The preview tile stays first, as
 * the store shows it.
 */

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

export function buildScreenshotEntries({
  design,
  captures,
  spec,
  locale,
  background,
  frameUrl,
  fontFamily,
  headlineColor,
  subheadColor,
  fontSizeScale = 1,
  copy = {},
  order = [],
  template,
  layout,
  screenOnly,
  sceneLayouts = {},
  sceneBackgrounds = {},
  sceneBadges = {},
  onCopy,
  backgroundPattern,
  patternOpacity,
  patternColor,
  deviceBacklight,
  panoramaMode,
  assetVersion,
}: {
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
  copy?: Record<string, SceneCopy>;
  order?: string[];
  template: string | string[];
  layout: string;
  screenOnly: boolean;
  sceneLayouts?: Record<string, string>;
  sceneBackgrounds?: Record<string, string>;
  sceneBadges?: Record<
    string,
    {
      text: string;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      background?: string;
      color?: string;
      slice?: number;
    }
  >;
  onCopy?: (sceneId: string, field: "headline" | "subhead", text: string) => void;
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
  assetVersion?: number;
}): ScreenshotEntry[] {
  const theme: Theme = {
    ...design.theme,
    backgroundPattern: backgroundPattern ?? design.theme.backgroundPattern,
    patternOpacity: patternOpacity ?? design.theme.patternOpacity,
    patternColor: patternColor ?? design.theme.patternColor,
    deviceBacklight: deviceBacklight ?? design.theme.deviceBacklight,
    panoramaMode: panoramaMode ?? design.theme.panoramaMode,
  };
  const scenes =
    order.length > 0
      ? [...design.scenes].sort((a, b) => {
          const ra = rankOf(order, a.id);
          const rb = rankOf(order, b.id);
          return ra === rb
            ? design.scenes.indexOf(a) - design.scenes.indexOf(b)
            : ra - rb;
        })
      : design.scenes;
  const resolved = resolveScenes(scenes, {
    template: Array.isArray(template)
      ? (template as LayoutKey[])
      : isTemplateKey(template)
        ? template
        : undefined,
    layout,
    sceneLayouts,
  });
  const layoutOf = (scene: DesignScene) => resolved.find((r) => r.scene.id === scene.id)!;

  const allShots = scenes.flatMap((scene) => {
    const capture = captures.screenshots.find((s) => s.sceneId === scene.id);
    return capture ? [{ scene, capture }] : [];
  });
  let used = 0;
  const shots = allShots.filter(({ scene }) => {
    used += layoutOf(scene).layout.span;
    return used <= MAX_SCREENSHOTS;
  });

  const deviceFrameUrl = spec.frame?.url ?? frameUrl;
  const geom = spec.frame?.geom;

  const entries: ScreenshotEntry[] = [];
  let globalSliceIndex = 0;
  const totalSlices = shots.reduce((acc, { scene }) => acc + layoutOf(scene).layout.span, 0);
  for (const { scene, capture } of shots) {
    const { layout: layoutSpec, secondScene } = layoutOf(scene);
    const second = secondScene
      ? captures.screenshots.find((s) => s.sceneId === secondScene)
      : undefined;
    const sceneBg = sceneBackgrounds[scene.id] || scene.background || background;
    const colors = resolveColors({
      bg: sceneBg,
      headlineColor,
      subheadColor,
      themeHeadlineColor: theme.headlineColor,
      themeSubheadColor: theme.subheadColor,
    });
    for (let slice = 0; slice < layoutSpec.span; slice++) {
      const currentGlobalSlice = globalSliceIndex++;
      const sliceKey = `${scene.id}#${slice + 1}`;
      const userBadge =
        sceneBadges[sliceKey] ??
        (slice === (sceneBadges[scene.id]?.slice ?? 0) ? sceneBadges[scene.id] : undefined);
      const customBadgeDec: Decoration[] = userBadge
        ? [
            {
              kind: "badge",
              text: { [locale]: userBadge.text },
              position: userBadge.position,
              background: userBadge.background,
              color: userBadge.color,
              slice,
            },
          ]
        : [];
      const decorations = [...design.decorations, ...(scene.decorations ?? []), ...customBadgeDec];
      entries.push({
        key: layoutSpec.span > 1 ? sliceKey : scene.id,
        sceneId: scene.id,
        slice,
        width: spec.screenshot.width,
        height: spec.screenshot.height,
        layoutKey: layoutSpec.key,
        sceneBg,
        render: (editable = false) => (
          <ScreenshotScene
            spec={layoutSpec}
            slice={slice}
            globalSlice={currentGlobalSlice}
            totalSlices={totalSlices}
            tile={spec.screenshot}
            theme={theme}
            screenOnly={screenOnly}
            background={sceneBg}
            frameUrl={deviceFrameUrl}
            geom={geom}
            fontFamily={fontFamily}
            headline={copy[scene.id]?.headline?.[locale] ?? scene.headline[locale] ?? ""}
            subhead={copy[scene.id]?.subhead?.[locale] ?? scene.subhead?.[locale]}
            headlineColor={colors.headlineColor}
            subheadColor={colors.subheadColor}
            fontSizeScale={fontSizeScale}
            captureUrl={capture.url}
            secondCaptureUrl={second?.url}
            secondSceneId={secondScene}
            decorations={decorations}
            locale={locale}
            onEdit={editable && onCopy ? (field, text) => onCopy(scene.id, field, text) : undefined}
            assetVersion={assetVersion}
          />
        ),
      });
    }
  }
  return entries;
}

/** Downloads a single full-resolution screenshot with live design parameters. */
export async function downloadSingleScreenshot({
  sceneId,
  slice,
  device,
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
  const fileName = `${sceneId}${sliceSuffix}-${device}.png`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();

  trackScreenshotGeneration("generated", { device, scene_id: sceneId });
  trackExport("completed", { export_type: "single_png", device });
  trackAssetDownloaded({ asset_type: "png", file_name: fileName });
}

export function Strip({
  manifest,
  design,
  captures,
  spec: tileSpec,
  locale,
  background,
  frameUrl,
  fontFamily,
  copy,
  onCopy,
  headlineColor,
  subheadColor,
  fontSizeScale,
  backgroundPattern,
  patternOpacity,
  patternColor,
  deviceBacklight,
  panoramaMode,
  sceneBackgrounds = {},
  onSceneBackground,
  sceneBadges = {},
  onSceneBadge,
  order,
  onReorder,
  template,
  layout,
  screenOnly,
  sceneLayouts,
  onSceneLayout,
  appInfo,
  onRefresh,
  onToast,
}: {
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
  sceneBadges?: Record<
    string,
    {
      text: string;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      background?: string;
      color?: string;
    }
  >;
  onSceneBadge?: (
    sceneId: string,
    badge:
      | {
          text: string;
          position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
          background?: string;
          color?: string;
        }
      | undefined,
  ) => void;
  copy: Record<string, SceneCopy>;
  onCopy: (sceneId: string, field: "headline" | "subhead", text: string) => void;
  /** Screenshot scene ids in display order; empty means the config's order. */
  order: string[];
  onReorder: (order: string[]) => void;
  /** A built-in template key, "" for none, or a custom layout sequence. */
  template: string | string[];
  /** The default layout key, and per-scene overrides by scene id. */
  layout: string;
  screenOnly: boolean;
  sceneLayouts: Record<string, string>;
  onSceneLayout: (sceneId: string, key: string | undefined) => void;
  appInfo?: AppInfo;
  onRefresh?: () => Promise<void> | void;
  onToast?: (message: string) => void;
}) {
  const scenes =
    order.length > 0
      ? [...design.scenes].sort((a, b) => {
          const ra = rankOf(order, a.id);
          const rb = rankOf(order, b.id);
          return ra === rb
            ? design.scenes.indexOf(a) - design.scenes.indexOf(b)
            : ra - rb;
        })
      : design.scenes;
  // The same resolution the CLI runs, on the scenes in their displayed order.
  const resolved = resolveScenes(scenes, {
    template: Array.isArray(template)
      ? (template as LayoutKey[])
      : isTemplateKey(template)
        ? template
        : undefined,
    layout,
    sceneLayouts,
  });
  const layoutOf = (scene: DesignScene) => resolved.find((r) => r.scene.id === scene.id)!;
  // The same resolution with no per-scene overrides: what the template (or
  // theme layout) gives each scene, which the lightbox names as "Default".
  const unforced = resolveScenes(scenes, {
    template: Array.isArray(template)
      ? (template as LayoutKey[])
      : isTemplateKey(template)
        ? template
        : undefined,
    layout,
  });
  const defaultLayoutOf = (scene: DesignScene) =>
    unforced.find((r) => r.scene.id === scene.id)!.layout.key;

  const allShots = scenes.flatMap((scene) => {
    const capture = captures.screenshots.find((s) => s.sceneId === scene.id);
    return capture ? [{ scene, capture }] : [];
  });
  // Apple's cap counts tiles, so a panorama scene uses two of the ten.
  let used = 0;
  const shots = allShots.filter(({ scene }) => {
    used += layoutOf(scene).layout.span;
    return used <= MAX_SCREENSHOTS;
  });
  const dropped = allShots.length - shots.length;

  const segments =
    design.preview && captures.clips
      ? design.preview.segments.flatMap((seg) => {
          const clip = captures.clips!.find((c) => c.segmentId === seg.id);
          return clip ? [{ url: clip.url, durationSeconds: clip.durationSeconds }] : [];
        })
      : [];

  const totalSeconds = segments.reduce((s, c) => s + c.durationSeconds, 0);

  type Entry = {
    key: string;
    width: number;
    height: number;
    bad: boolean;
    badReason?: string;
    /** Whether the lightbox offers in-place copy editing (screenshots only). */
    editable: boolean;
    /** The composition; editable renders the copy as editable text (lightbox only). */
    scene: (editable: boolean) => ReactNode;
    /** Set on screenshot tiles, which can be dragged into a new order. */
    sceneId?: string;
    /** The underlying screenshot scene id regardless of slice */
    targetSceneId?: string;
    /** Slice index in a multi-span scene (0-indexed) */
    slice?: number;
    /** The lightbox's per-scene layout override control (screenshots only). */
    layout?: {
      value: string | undefined;
      /** The layout the scene gets with no override: the template's pick, or the theme layout. */
      defaultKey: string;
      onChange: (key: string | undefined) => void;
    };
  };
  const entries: Entry[] = [];
  if (segments.length > 0 && tileSpec.preview) {
    const outOfBounds =
      (tileSpec.platform === "ios" || tileSpec.platform === "ipad") &&
      (totalSeconds < 15 || totalSeconds > 30);
    entries.push({
      key: "preview",
      width: tileSpec.preview.width,
      height: tileSpec.preview.height,
      bad: outOfBounds,
      badReason: "Clips sum outside the 15-30s Apple allows for previews.",
      editable: false,
      scene: () => <PreviewScene segments={segments} />,
    });
  }
  const [assetVersion, setAssetVersion] = useState(() => Date.now());

  const screenshotItems = buildScreenshotEntries({
    design,
    captures,
    spec: tileSpec,
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
    onCopy,
    backgroundPattern,
    patternOpacity,
    patternColor,
    deviceBacklight,
    panoramaMode,
    assetVersion,
  });

  for (const item of screenshotItems) {
    const scene = scenes.find((s) => s.id === item.sceneId);
    const layoutControl = scene
      ? {
          value: sceneLayouts[item.sceneId],
          defaultKey: defaultLayoutOf(scene),
          onChange: (key: string | undefined) => onSceneLayout(item.sceneId, key),
        }
      : undefined;
    entries.push({
      key: item.key,
      width: item.width,
      height: item.height,
      bad: false,
      editable: true,
      sceneId: item.slice === 0 ? item.sceneId : undefined,
      targetSceneId: item.sceneId,
      slice: item.slice,
      layout: layoutControl,
      scene: (editable) => item.render(editable),
    });
  }

  const [open, setOpenState] = useState<number | null>(null);
  // The tile that shares its view-transition-name with the lightbox scene.
  // It must already be named in the frame *before* the transition starts,
  // or the old snapshot has nothing to morph from; so it is committed
  // synchronously first, and only cleared once the closing morph is done.
  const [named, setNamed] = useState<number | null>(null);
  const setOpen = (next: number | null) => {
    if (typeof document.startViewTransition !== "function") {
      setNamed(next);
      setOpenState(next);
      return;
    }
    if (next !== null) flushSync(() => setNamed(next));
    const transition = document.startViewTransition(() => flushSync(() => setOpenState(next)));
    if (next === null) transition.finished.finally(() => setNamed(null));
  };
  // A pointer drag on a tile also produces a click when it ends; the click
  // is dropped while a drag is underway or just finished.
  const dragged = useRef(false);
  // The scene being dragged, lifted with a slight scale. Driven through
  // `animate` rather than whileDrag, which can stay applied when the drop
  // coincides with the item's layout animation.
  const [lifting, setLifting] = useState<string | null>(null);

  const handleDelete = async (sceneId: string) => {
    if (!window.confirm(`Are you sure you want to remove screenshot "${sceneId}"?`)) return;
    try {
      const res = await apiFetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId }),
      });
      if (res.ok) {
        if (onToast) onToast(`Removed screenshot "${sceneId}"`);
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete screenshot");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete screenshot");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to remove all screenshots?")) return;
    try {
      const res = await apiFetch("/api/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        if (onToast) onToast("Removed all screenshots");
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to remove screenshots");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove screenshots");
    }
  };

  const [replacingSceneId, setReplacingSceneId] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [activeAiSceneId, setActiveAiSceneId] = useState<string | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkMode, setBulkMode] = useState<"png" | "zip" | null>(null);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectableEntries = entries.filter((e) => e.key !== "preview");
  const isAllSelected =
    selectableEntries.length > 0 && selectableEntries.every((e) => selectedKeys.has(e.key));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(selectableEntries.map((e) => e.key)));
    }
  };

  const handleDownloadSelectedPngs = async () => {
    if (selectedKeys.size === 0 || isBulkDownloading) return;
    setIsBulkDownloading(true);
    setBulkMode("png");
    setBulkDownloadProgress(0);

    const targetEntries = entries.filter((e) => selectedKeys.has(e.key));
    let count = 0;
    try {
      for (const entry of targetEntries) {
        count++;
        setBulkDownloadProgress(count);
        const parts = entry.key.split("#");
        const resolvedSceneId = entry.targetSceneId ?? entry.sceneId ?? parts[0];
        const slice = parts[1] ? parseInt(parts[1], 10) : undefined;
        await downloadSingleScreenshot({
          sceneId: resolvedSceneId,
          slice,
          device: tileSpec.key,
          locale,
          background: (entry.targetSceneId && sceneBackgrounds[entry.targetSceneId]) || background,
          frameUrl,
          fontFamily,
          template,
          layout,
          screenOnly,
          fontSizeScale,
          design,
        });
        if (count < targetEntries.length) {
          await new Promise((r) => setTimeout(r, 450));
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download selected screenshots");
    } finally {
      setIsBulkDownloading(false);
      setBulkMode(null);
      setBulkDownloadProgress(0);
    }
  };

  const handleDownloadSelectedZip = async () => {
    if (selectedKeys.size === 0 || isBulkDownloading) return;
    setIsBulkDownloading(true);
    setBulkMode("zip");
    try {
      const targetEntries = entries.filter((e) => selectedKeys.has(e.key));
      const items = targetEntries.map((e) => {
        const parts = e.key.split("#");
        const resolvedSceneId = e.targetSceneId ?? e.sceneId ?? parts[0];
        const slice = parts[1] ? parseInt(parts[1], 10) : undefined;
        return { sceneId: resolvedSceneId, slice };
      });

      const res = await apiFetch("/api/export-selected-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device: tileSpec.key,
          locale,
          items,
          background,
          frame: frameUrl ? frameUrl.replace(/^\/?frames\//, "").replace(/\.png$/, "") : undefined,
          font: design && fontFamily ? fontKey(design, fontFamily) : undefined,
          template: template === CUSTOM_TEMPLATE ? undefined : template || "none",
          layout,
          screenOnly,
          fontSizeScale,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `ZIP export failed (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = `selected-screenshots-${tileSpec.key}.zip`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      trackExport("completed", { export_type: "selected_zip", count: selectedKeys.size });
      trackAssetDownloaded({ asset_type: "zip", file_name: fileName });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download selected screenshots ZIP");
    } finally {
      setIsBulkDownloading(false);
      setBulkMode(null);
    }
  };

  const readFileData = (
    file: File,
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
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
  };

  const [isImporting, setIsImporting] = useState(false);
  const [importDragOver, setImportDragOver] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) =>
      /\.(png|jpe?g|webp)$/i.test(f.name),
    );
    if (fileList.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      const filePayloads = await Promise.all(
        fileList.map(async (file) => {
          const { dataUrl, width, height } = await readFileData(file);
          return { name: file.name, dataUrl, width, height };
        }),
      );

      const response = await apiFetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filePayloads,
          preferredDevice: tileSpec.key,
          targetMode: "all",
          autoRoute: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      const resData = (await response.json().catch(() => ({}))) as { imported?: number };
      trackAppImported({
        source: "file_upload",
        import_type: "canvas_card",
        device: tileSpec.key,
      });
      const count = resData.imported || filePayloads.length;
      if (onToast) {
        onToast(`✨ Successfully imported ${count} screenshot(s)!`);
      }
      if (onRefresh) {
        await onRefresh();
      } else {
        sessionStorage.setItem(
          "appassets_toast",
          `✨ Successfully imported ${count} screenshot(s)!`,
        );
        window.location.reload();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import images");
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleReplaceCapture = async (sceneId: string, file: File) => {
    setReplacingSceneId(sceneId);
    try {
      const { dataUrl, width, height } = await readFileData(file);
      const res = await apiFetch("/api/replace-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId,
          device: tileSpec.key,
          targetMode: "all",
          autoRoute: false,
          file: {
            name: file.name,
            dataUrl,
            width,
            height,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed with status ${res.status}`);
      }
      trackAppImported({
        source: "file_upload",
        import_type: "replace_capture",
        device: tileSpec.key,
        scene_id: sceneId,
      });
      setAssetVersion(Date.now());
      if (onToast) {
        onToast(`✨ Updated screenshot for "${sceneId}" across iPhone, iPad, and Android!`);
      }
      if (onRefresh) {
        await onRefresh();
      } else {
        sessionStorage.setItem(
          "appassets_toast",
          `✨ Updated screenshot for "${sceneId}" across iPhone, iPad, and Android!`,
        );
        window.location.reload();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to replace capture");
    } finally {
      setReplacingSceneId(null);
    }
  };

  const handleSyncCaptures = async () => {
    setIsSyncing(true);
    try {
      const sourceDevice = "iphone-6.9";
      const targetDevices =
        tileSpec.platform === "android"
          ? ["pixel-10-pro"]
          : tileSpec.platform === "ipad"
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
      setAssetVersion(Date.now());
      const label =
        tileSpec.platform === "android"
          ? "Android"
          : tileSpec.platform === "ipad"
            ? "iPad"
            : "Android & iPad";
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

  const handleDownloadScreenshot = async (
    entryKey: string,
    targetSceneId?: string,
    sceneId?: string,
  ) => {
    const parts = entryKey.split("#");
    const resolvedSceneId = targetSceneId ?? sceneId ?? parts[0];
    const slice = parts[1] ? parseInt(parts[1], 10) : undefined;
    setDownloadingKey(entryKey);
    try {
      await downloadSingleScreenshot({
        sceneId: resolvedSceneId,
        slice,
        device: tileSpec.key,
        locale,
        background: (targetSceneId && sceneBackgrounds[targetSceneId]) || background,
        frameUrl,
        fontFamily,
        template,
        layout,
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

  const tileAt = (i: number) => {
    const entry = entries[i];
    const isDownloading = downloadingKey === entry.key;
    const isSelected = selectedKeys.has(entry.key);
    const targetId = entry.targetSceneId ?? entry.sceneId;
    const customBg = targetId ? sceneBackgrounds[targetId] : undefined;

    const currentBadge =
      entry.slice !== undefined && entry.slice > 0
        ? sceneBadges[entry.key]
        : (sceneBadges[entry.key] ??
          (entry.targetSceneId
            ? sceneBadges[entry.targetSceneId]
            : entry.sceneId
              ? sceneBadges[entry.sceneId]
              : undefined));

    return (
      <div key={entry.key} className="flex flex-col gap-1.5 w-full">
        {/* Card Header Toolbar: Slide # + Checkbox + BG + Badge */}
        {entry.key !== "preview" && targetId ? (
          <div className="flex items-center justify-between px-0.5 text-xs select-none">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(entry.key);
                }}
                className={`size-4 rounded flex items-center justify-center border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-xs"
                    : "border-border/80 bg-background/80 hover:border-[#FF6B00] text-transparent"
                }`}
                aria-label={`Select slide ${i + 1}`}
                title={isSelected ? "Deselect slide" : "Select slide for export"}
              >
                <Check className="size-2.5 stroke-[3]" />
              </button>
              <span className="text-[10px] font-bold font-mono tracking-wider text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/50">
                #{i + 1}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <SceneBackgroundPopover
                value={customBg}
                globalBackground={background}
                onChange={(bg) => {
                  if (onSceneBackground && targetId) {
                    onSceneBackground(targetId, bg);
                  }
                }}
                sceneName={`Slide ${i + 1}`}
                side="bottom"
                align="end"
              />
              <BadgePickerPopover
                badge={currentBadge}
                onChange={(b) => {
                  if (onSceneBadge) {
                    const badgeKey =
                      entry.slice !== undefined && entry.slice > 0
                        ? entry.key
                        : entry.targetSceneId || entry.sceneId || entry.key;
                    onSceneBadge(badgeKey, b);
                  }
                }}
                side="bottom"
                align="end"
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-7 px-2 gap-1 rounded-lg text-[10px] font-medium border shadow-2xs cursor-pointer transition-all ${
                      currentBadge
                        ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                        : "border-border/80 bg-background/90 text-muted-foreground hover:text-foreground"
                    }`}
                    title="Add or edit badge"
                  >
                    <Tag className="size-2.5 text-amber-500 shrink-0" />
                    <span>{currentBadge ? "Badge" : "+Badge"}</span>
                  </Button>
                }
              />
            </div>
          </div>
        ) : null}

        <Tile
          draggable={entry.sceneId !== undefined}
          width={entry.width}
          height={entry.height}
          bad={entry.bad}
          badReason={entry.badReason}
          onOpen={() => {
            if (!dragged.current) setOpen(i);
          }}
          onDelete={entry.sceneId ? () => handleDelete(entry.sceneId!) : undefined}
          onReplace={
            entry.sceneId ? (file) => handleReplaceCapture(entry.sceneId!, file) : undefined
          }
          isReplacing={entry.sceneId ? replacingSceneId === entry.sceneId : false}
          onDownload={
            entry.key !== "preview"
              ? () => handleDownloadScreenshot(entry.key, entry.targetSceneId, entry.sceneId)
              : undefined
          }
          isDownloading={isDownloading}
          onAiCopy={targetId ? () => setActiveAiSceneId(targetId) : undefined}
          sceneId={entry.sceneId}
          isSelected={isSelected}
          onToggleSelect={entry.key !== "preview" ? () => toggleSelect(entry.key) : undefined}
          // Named only while the lightbox is closed: once open, the scene inside
          // it carries the name, and a duplicate would abort the transition.
          transitionName={named === i && open === null ? "lightbox-scene" : undefined}
        >
          {entry.scene(false)}
        </Tile>
      </div>
    );
  };

  // Strip cells: the preview tile, then one cell per scene holding its
  // tile(s), so a panorama's two slices drag together. Cells are paged so a
  // page holds at most PAGE_SIZE tiles without splitting a scene.
  type Cell = { sceneId?: string; tiles: number[] };
  const cells: Cell[] = [];
  entries.forEach((entry, i) => {
    const last = cells[cells.length - 1];
    if (entry.sceneId === undefined && last?.sceneId !== undefined && entry.key.includes("#")) {
      last.tiles.push(i);
    } else {
      cells.push({ sceneId: entry.sceneId, tiles: [i] });
    }
  });
  const pageCells: Cell[][] = [[]];
  for (const cell of cells) {
    const current = pageCells[pageCells.length - 1];
    const used = current.reduce((n, c) => n + c.tiles.length, 0);
    if (used + cell.tiles.length > PAGE_SIZE && current.length > 0) pageCells.push([cell]);
    else current.push(cell);
  }
  const lastPageUsed = pageCells[pageCells.length - 1].reduce((n, c) => n + c.tiles.length, 0);
  if (lastPageUsed === PAGE_SIZE && entries.length < MAX_SCREENSHOTS) {
    pageCells.push([]);
  }
  const pages = pageCells.length;
  const [page, setPage] = useState(0);
  // Which way the last page turn went, so the incoming page slides in from
  // that side and the outgoing one leaves through the other.
  const [direction, setDirection] = useState(0);
  const turnPage = (delta: number) => {
    setDirection(delta);
    setPage((p) => p + delta);
  };
  // A device switch can shrink the tile count; keep the page in range.
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);
  useEffect(() => {
    if (open !== null && open > entries.length - 1) {
      setOpenState(null);
      setNamed(null);
    }
  }, [open, entries.length]);

  if (entries.length === 0) return null;

  const visible = pageCells[Math.min(page, pages - 1)] || [];
  const visibleIds = visible.flatMap((c) => (c.sceneId ? [c.sceneId] : []));
  // Always use PAGE_SIZE (5) columns so tiles keep the exact same size even when screenshots are removed.
  const columns = PAGE_SIZE;
  const tilesUsedOnPage = visible.reduce((n, c) => n + c.tiles.length, 0);
  const isLastPage = page === pages - 1;
  const showImportCard =
    isLastPage && tilesUsedOnPage < columns && entries.length < MAX_SCREENSHOTS;

  // The page's scenes in their new order, spliced back into the full order.
  const reorderPage = (ids: string[]) => {
    const queue = [...ids];
    onReorder(scenes.map((s) => (visibleIds.includes(s.id) ? queue.shift()! : s.id)));
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Quick Select & Multi-Download Header Bar */}
      {selectableEntries.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs select-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                selectedKeys.size > 0
                  ? "border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00]"
                  : "border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`size-3.5 rounded flex items-center justify-center border transition-all ${
                  isAllSelected
                    ? "bg-[#FF6B00] border-[#FF6B00] text-white"
                    : selectedKeys.size > 0
                      ? "bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]"
                      : "border-muted-foreground/50 bg-transparent text-transparent"
                }`}
              >
                <Check className="size-2.5 stroke-[3]" />
              </div>
              <span>
                {isAllSelected
                  ? "All Selected"
                  : selectedKeys.size > 0
                    ? `${selectedKeys.size} Selected`
                    : "Select All"}
              </span>
            </button>

            {selectedKeys.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedKeys(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer underline px-1"
              >
                Clear
              </button>
            )}

            {/* Quick Import Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              className="h-7 text-xs px-2.5 gap-1.5 border-dashed border-[#FF6B00]/40 hover:border-[#FF6B00] bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 text-[#FF6B00] dark:text-[#FF8A00] font-medium cursor-pointer shadow-2xs transition-all"
              title="Import additional screenshots"
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Plus className="size-3 stroke-[2.5]" />
                  <span>Import</span>
                </>
              )}
            </Button>

            {/* Quick Sync Across Platforms Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncCaptures}
              disabled={isSyncing}
              className="h-7 text-xs px-2.5 gap-1.5 border-border/80 hover:border-[#FF6B00]/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground font-medium cursor-pointer shadow-2xs transition-all"
              title={
                tileSpec.platform === "android"
                  ? "Sync latest screenshots from iPhone to Android"
                  : tileSpec.platform === "ipad"
                    ? "Sync latest screenshots from iPhone to iPad"
                    : "Sync iPhone screenshots to Android and iPad"
              }
            >
              {isSyncing ? (
                <>
                  <Loader2 className="size-3 animate-spin text-[#FF6B00]" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-3" />
                  <span>
                    {tileSpec.platform === "android"
                      ? "Sync from iPhone"
                      : tileSpec.platform === "ipad"
                        ? "Sync from iPhone"
                        : "Sync to Android/iPad"}
                  </span>
                </>
              )}
            </Button>
          </div>

          {selectedKeys.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <Button
                size="sm"
                onClick={handleDownloadSelectedPngs}
                disabled={isBulkDownloading}
                className="h-7 text-xs px-2.5 gap-1.5 bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-medium cursor-pointer shadow-2xs"
              >
                {isBulkDownloading && bulkMode === "png" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>({bulkDownloadProgress}/{selectedKeys.size})</span>
                  </>
                ) : (
                  <>
                    <Download className="size-3" />
                    <span>Download PNGs ({selectedKeys.size})</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSelectedZip}
                disabled={isBulkDownloading}
                className="h-7 text-xs px-2.5 gap-1.5 border-border hover:bg-muted cursor-pointer"
              >
                {isBulkDownloading && bulkMode === "zip" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>Zipping...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="size-3 text-[#FF6B00]" />
                    <span>Download ZIP</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        {/* Clips only horizontally, so a sliding page vanishes at the strip's
            edge while tile shadows and the hover lift stay visible; the small
            padding keeps the edge tiles' own shadows out of the clip. */}
        <div className="-mx-2 overflow-x-clip px-2">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <Reorder.Group
              key={page}
              axis="x"
              values={visibleIds}
              onReorder={reorderPage}
              aria-label="Screenshots, drag to reorder"
              className="grid w-full list-none items-start gap-4 p-0"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              custom={direction}
              variants={pageSlide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
            >
              {visible.map((cell) =>
                cell.sceneId ? (
                  <Reorder.Item
                    key={cell.sceneId}
                    value={cell.sceneId}
                    className="relative grid gap-4"
                    style={{
                      zIndex: lifting === cell.sceneId ? 10 : undefined,
                      gridColumn: `span ${cell.tiles.length}`,
                      gridTemplateColumns: `repeat(${cell.tiles.length}, minmax(0, 1fr))`,
                    }}
                    animate={{ scale: lifting === cell.sceneId ? 1.04 : 1 }}
                    onDragStart={() => {
                      dragged.current = true;
                      setLifting(cell.sceneId ?? null);
                    }}
                    onDragEnd={() => {
                      setLifting(null);
                      setTimeout(() => {
                        dragged.current = false;
                      }, 0);
                    }}
                  >
                    {cell.tiles.map(tileAt)}
                  </Reorder.Item>
                ) : (
                  <li key={entries[cell.tiles[0]].key}>{tileAt(cell.tiles[0])}</li>
                ),
              )}

              {/* Import / Add Screenshot Card on right side of screenshots */}
              {showImportCard && (
                <li
                  key="import-card"
                  className="flex flex-col gap-1.5 w-full list-none"
                >
                  {/* Card Header Spacer to align with screenshot card toolbars */}
                  <div className="flex items-center justify-between px-0.5 text-xs select-none h-7">
                    <span className="text-[10px] font-bold font-mono tracking-wider text-muted-foreground/60 px-1.5 py-0.5 rounded-md bg-muted/40 border border-border/40">
                      #{entries.length + 1}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                      Add Screen
                    </span>
                  </div>

                  {/* Dropzone / Clickable Import Card */}
                  <button
                    type="button"
                    aria-label="Import or add screenshots"
                    onClick={() => importInputRef.current?.click()}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setImportDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImportDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImportDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImportDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        void handleImportFiles(e.dataTransfer.files);
                      }
                    }}
                    style={{
                      aspectRatio: `${tileSpec.screenshot.width} / ${tileSpec.screenshot.height}`,
                    }}
                    className={`relative flex flex-col items-center justify-center gap-3.5 p-4 sm:p-6 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center select-none group shadow-2xs w-full ${
                      importDragOver
                        ? "border-[#FF6B00] bg-[#FF6B00]/15 ring-4 ring-[#FF6B00]/25 scale-[1.02]"
                        : "border-border/80 hover:border-[#FF6B00] bg-card/40 hover:bg-[#FF6B00]/5 hover:shadow-md hover:shadow-[#FF6B00]/10 hover:-translate-y-0.5"
                    }`}
                  >
                    <input
                      ref={importInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          void handleImportFiles(e.target.files);
                        }
                      }}
                    />

                    {isImporting ? (
                      <div className="flex flex-col items-center gap-2.5">
                        <Loader2 className="size-10 sm:size-12 animate-spin text-[#FF6B00]" />
                        <span className="text-xs font-semibold text-foreground">
                          Importing images...
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Please wait a moment
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="size-16 sm:size-20 rounded-full border-2 border-dashed border-border group-hover:border-[#FF6B00] bg-background/80 group-hover:bg-[#FF6B00]/15 flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-xs">
                          <Plus className="size-8 sm:size-10 text-muted-foreground group-hover:text-[#FF6B00] transition-colors stroke-[2.2]" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-[#FF6B00] transition-colors tracking-tight">
                            Import
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium max-w-[150px] leading-snug">
                            Drag & drop or click to add screenshot
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-muted/80 text-muted-foreground/80 border border-border/50 group-hover:border-[#FF6B00]/40 group-hover:text-[#FF6B00] transition-colors">
                          PNG &bull; JPG &bull; WebP
                        </span>
                      </>
                    )}
                  </button>
                </li>
              )}
            </Reorder.Group>
          </AnimatePresence>
        </div>

        {pages > 1 ? (
          <>
            <PagerButton
              side="left"
              label="Previous screenshots"
              disabled={page === 0}
              onClick={() => turnPage(-1)}
            />
            <PagerButton
              side="right"
              label="Next screenshots"
              disabled={page === pages - 1}
              onClick={() => turnPage(1)}
            />
          </>
        ) : null}
      </div>

      {dropped > 0 ? (
        <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-center text-[12px] font-medium text-destructive">
            {dropped} more scene{dropped === 1 ? "" : "s"} hidden: the App Store allows{" "}
            {MAX_SCREENSHOTS} screenshots. Remove extra scenes to display them:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {allShots.slice(shots.length).map(({ scene }) => (
              <span
                key={scene.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-xs"
              >
                <span>{scene.id}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(scene.id)}
                  className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title={`Remove ${scene.id}`}
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
              onClick={handleClearAll}
            >
              <Trash2 className="size-3.5" />
              Remove all screenshots
            </Button>
          </div>
        </div>
      ) : null}

      {open !== null && entries[open] ? (
        <Lightbox
          entry={entries[open]}
          layouts={design.layouts}
          index={open}
          count={entries.length}
          globalBackground={background}
          sceneBackground={
            entries[open].targetSceneId ? sceneBackgrounds[entries[open].targetSceneId!] : undefined
          }
          onSceneBackground={(bg) => {
            if (entries[open]?.targetSceneId && onSceneBackground) {
              onSceneBackground(entries[open].targetSceneId!, bg);
            }
          }}
          badge={
            entries[open].slice !== undefined && entries[open].slice > 0
              ? sceneBadges[entries[open].key]
              : (sceneBadges[entries[open].key] ??
                (entries[open].targetSceneId
                  ? sceneBadges[entries[open].targetSceneId!]
                  : undefined))
          }
          onSceneBadge={(b) => {
            if (onSceneBadge) {
              const badgeKey =
                entries[open].slice !== undefined && entries[open].slice > 0
                  ? entries[open].key
                  : entries[open].targetSceneId!;
              onSceneBadge(badgeKey, b);
            }
          }}
          onDownload={() => {
            const parts = entries[open].key.split("#");
            const resolvedSceneId =
              entries[open].targetSceneId ?? entries[open].sceneId ?? parts[0];
            handleDownloadScreenshot(entries[open].key, resolvedSceneId, entries[open].sceneId);
          }}
          isDownloading={downloadingKey === entries[open].key}
          onAiCopy={
            (entries[open]?.targetSceneId ?? entries[open]?.sceneId)
              ? () =>
                  setActiveAiSceneId(
                    (entries[open].targetSceneId ??
                      entries[open].sceneId ??
                      entries[open].key.split("#")[0])!,
                  )
              : undefined
          }
          onClose={() => setOpen(null)}
          // Stepping swaps the scene in place with no morph.
          onStep={(delta) => {
            if (open === null) return;
            const next = Math.min(entries.length - 1, Math.max(0, open + delta));
            setNamed(next);
            setOpenState(next);
          }}
        />
      ) : null}

      {activeAiSceneId ? (
        <AiCopyModal
          isOpen={true}
          onClose={() => setActiveAiSceneId(null)}
          sceneId={activeAiSceneId}
          sceneHeadline={
            copy[activeAiSceneId]?.headline?.[locale] ??
            design.scenes.find((s) => s.id === activeAiSceneId)?.headline[locale]
          }
          sceneSubhead={
            copy[activeAiSceneId]?.subhead?.[locale] ??
            design.scenes.find((s) => s.id === activeAiSceneId)?.subhead?.[locale]
          }
          device={tileSpec.key}
          locale={locale}
          manifest={manifest}
          appInfo={appInfo}
          onApplyCopy={(sId, field, text) => {
            onCopy(sId, field, text);
          }}
        />
      ) : null}

      {/* Floating Selection Bar */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 px-3.5 py-2.5 rounded-2xl bg-card/95 border border-border shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200 text-foreground">
          <div className="flex items-center gap-2 pr-2 border-r border-border">
            <span className="size-2 rounded-full bg-[#FF6B00] animate-pulse" />
            <span className="text-xs font-semibold whitespace-nowrap">
              {selectedKeys.size} {selectedKeys.size === 1 ? "Slide" : "Slides"} Selected
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isAllSelected ? "Deselect All" : "Select All"}
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadSelectedPngs}
            disabled={isBulkDownloading}
            className="h-8 text-xs px-3 gap-1.5 bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-medium cursor-pointer shadow-xs"
            title="Download selected screenshots as PNG files"
          >
            {isBulkDownloading && bulkMode === "png" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Downloading ({bulkDownloadProgress}/{selectedKeys.size})...</span>
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                <span>Download PNGs ({selectedKeys.size})</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSelectedZip}
            disabled={isBulkDownloading}
            className="h-8 text-xs px-3 gap-1.5 border-border hover:bg-muted text-foreground cursor-pointer"
            title="Download selected screenshots in a ZIP archive"
          >
            {isBulkDownloading && bulkMode === "zip" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Creating ZIP...</span>
              </>
            ) : (
              <>
                <FolderArchive className="size-3.5 text-[#FF6B00]" />
                <span>Download ZIP</span>
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setSelectedKeys(new Set())}
            className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors ml-1"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Full-viewport view of one tile: the same composition, rendered as large as
 * the window allows at the spec's aspect ratio. Click outside, Escape, or the
 * close button dismiss it; arrow keys step between tiles. Keys typed into the
 * editable copy are left to the text.
 */
function Lightbox({
  entry,
  layouts,
  index,
  count,
  globalBackground,
  sceneBackground,
  onSceneBackground,
  badge,
  onSceneBadge,
  onDownload,
  isDownloading,
  onAiCopy,
  onClose,
  onStep,
}: {
  entry: {
    key: string;
    sceneId?: string;
    targetSceneId?: string;
    width: number;
    height: number;
    editable: boolean;
    scene: (editable: boolean) => ReactNode;
    layout?: {
      value: string | undefined;
      /** The layout the scene gets with no override: the template's pick, or the theme layout. */
      defaultKey: string;
      onChange: (key: string | undefined) => void;
    };
  };
  layouts: Design["layouts"];
  index: number;
  count: number;
  globalBackground: string;
  sceneBackground?: string;
  onSceneBackground?: (bg: string | undefined) => void;
  badge?: {
    text: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    background?: string;
    color?: string;
  };
  onSceneBadge?: (
    badge:
      | {
          text: string;
          position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
          background?: string;
          color?: string;
        }
      | undefined,
  ) => void;
  onDownload?: () => void;
  isDownloading?: boolean;
  onAiCopy?: () => void;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onStep(-1);
      else if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot preview"
      className="animate-in fade-in fixed inset-0 z-50 flex duration-150 flex-col items-center justify-center gap-3 bg-black/80 p-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
        style={{
          viewTransitionName: "lightbox-scene",
          aspectRatio: `${entry.width} / ${entry.height}`,
          // Sized by width alone so the aspect ratio always holds: a height
          // cap plus flex shrinking would squash the box, stretching the bezel
          // art off the cover-fitted capture (a misaligned camera cutout). The
          // 7.5rem clears the padding, gap and layout row below the scene.
          flexShrink: 0,
          width: `min(calc(100vw - 4rem), calc((100vh - 7.5rem) * ${entry.width / entry.height}))`,
        }}
      >
        {entry.scene(true)}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-neutral-300">
        {entry.layout ? (
          <div className="dark w-44 text-foreground">
            <Select
              value={entry.layout.value ?? ""}
              onChange={(v) => entry.layout?.onChange(v || undefined)}
              options={[
                [
                  "",
                  `Default (${layouts.find((l) => l.key === entry.layout?.defaultKey)?.label ?? entry.layout.defaultKey})`,
                ],
                ...layoutOptions(layouts),
              ]}
            />
          </div>
        ) : null}
        {entry.key !== "preview" && entry.targetSceneId ? (
          <>
            <SceneBackgroundPopover
              value={sceneBackground}
              globalBackground={globalBackground}
              onChange={onSceneBackground ?? (() => {})}
            />
            <BadgePickerPopover badge={badge} onChange={onSceneBadge ?? (() => {})} />
          </>
        ) : null}
        {entry.key !== "preview" && onAiCopy ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5 rounded-lg border-indigo-400/40 bg-indigo-500/20 text-xs text-white backdrop-blur-md hover:bg-indigo-500/30 hover:text-white shadow-sm"
            onClick={onAiCopy}
          >
            <Sparkles className="size-3.5 text-indigo-300" />
            AI Copy
          </Button>
        ) : null}
        {entry.key !== "preview" && onDownload ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloading}
            className="cursor-pointer gap-1.5 rounded-lg border-white/20 bg-white/10 text-xs text-white backdrop-blur-md hover:bg-white/20 hover:text-white disabled:opacity-50"
            onClick={onDownload}
          >
            {isDownloading ? (
              <Loader2 className="size-3.5 text-white animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Download PNG
          </Button>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Close"
        className="absolute top-4 right-4 rounded-full"
        onClick={onClose}
      >
        <X />
      </Button>
      {count > 1 ? (
        <>
          <PagerButton
            side="left"
            label="Previous"
            disabled={index === 0}
            onClick={() => onStep(-1)}
            inset
          />
          <PagerButton
            side="right"
            label="Next"
            disabled={index === count - 1}
            onClick={() => onStep(1)}
            inset
          />
        </>
      ) : null}
    </div>
  );
}

/** Round arrow floating over the strip's edge, like the store carousel's. */
function PagerButton({
  side,
  label,
  disabled,
  onClick,
  inset = false,
}: {
  side: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
  /** Sit inside the edge instead of overhanging it (used in the lightbox). */
  inset?: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  const offset = inset
    ? side === "left"
      ? "left-4"
      : "right-4"
    : side === "left"
      ? "-left-5"
      : "-right-5";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-popover shadow-md transition-none hover:bg-popover focus-visible:ring-0 active:not-aria-[haspopup]:-translate-y-1/2 ${offset}`}
    >
      <Icon />
    </Button>
  );
}

/** Container-query units: 1cqw / 1cqh is one percent of a single tile. */
const cq = (tile: { width: number; height: number }) => ({
  w: (v: number) => `${(v / tile.width) * 100}cqw`,
  h: (v: number) => `${(v / tile.height) * 100}cqh`,
});

function Canvas({
  background,
  fontFamily,
  children,
}: {
  background: string;
  fontFamily: string;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ containerType: "size", background, fontFamily }}
    >
      {children}
    </div>
  );
}

/**
 * Browser twin of renderScreenshots in src/render.ts: the same compose()
 * geometry, expressed in container-query units of one tile. A panorama
 * layout renders the whole span-wide composition and shifts it left by
 * `slice` tiles, so each tile shows its own slice. With onEdit set, the
 * headline and subhead are contentEditable and report their text when
 * editing ends (blur, or Enter).
 */
export function ScreenshotScene({
  spec,
  slice,
  globalSlice,
  totalSlices,
  tile,
  theme,
  screenOnly,
  background,
  frameUrl,
  geom,
  fontFamily,
  headline,
  subhead,
  headlineColor,
  subheadColor,
  fontSizeScale = 1,
  captureUrl,
  secondCaptureUrl,
  secondSceneId,
  decorations,
  locale,
  onEdit,
  assetVersion,
}: {
  spec: (typeof LAYOUTS)[keyof typeof LAYOUTS];
  slice: number;
  globalSlice?: number;
  totalSlices?: number;
  tile: { width: number; height: number };
  theme: Theme;
  screenOnly: boolean;
  background: string;
  frameUrl: string;
  /** The bezel art's geometry; the iOS bundled art's when the device brings none. */
  geom: FrameGeometry | undefined;
  fontFamily: string;
  headline: string;
  subhead: string | undefined;
  headlineColor: string;
  subheadColor: string;
  fontSizeScale?: number;
  captureUrl: string;
  secondCaptureUrl: string | undefined;
  secondSceneId: string | undefined;
  decorations: Decoration[];
  locale: string;
  onEdit?: (field: "headline" | "subhead", text: string) => void;
  assetVersion?: number;
}) {
  const c = compose(spec, tile, theme, { screenOnly, geom });
  const { w, h } = cq(tile);
  const isRtl = isRtlLocale(locale);
  // Wider-than-reference tiles compose at a narrower design width; type follows it.
  const typeScale = (c.designWidth / tile.width) * (fontSizeScale ?? 1);
  const editable = onEdit ? editableProps : () => ({});
  const copy = c.copy;
  const isLeft = copy?.align === "left";
  const align = isRtl && isLeft ? "right" : copy?.align;
  const leftPos =
    isRtl && isLeft && copy
      ? w(tile.width - copy.box.left - copy.box.width)
      : copy
        ? w(copy.box.left)
        : 0;
  const flexAlign = isRtl && isLeft ? "flex-end" : isLeft ? "flex-start" : "center";

  const isContinuousPanorama = Boolean(theme.panoramaMode && totalSlices && totalSlices > 1);
  const bgLeft =
    isContinuousPanorama && globalSlice !== undefined
      ? `${-globalSlice * 100}%`
      : `${-slice * 100}%`;
  const bgWidth =
    isContinuousPanorama && totalSlices ? `${totalSlices * 100}%` : `${spec.span * 100}%`;
  const bgFill =
    background === TRANSPARENT
      ? CHECKERBOARD
      : background.startsWith("data:image/") || background.startsWith("http")
        ? `url("${background}") center/cover no-repeat`
        : background;

  return (
    <Canvas background="transparent" fontFamily={fontFamily}>
      {/* The full composition; the background spans it so a gradient runs across a panorama. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: bgLeft,
          width: bgWidth,
          height: "100%",
          background: bgFill,
        }}
      >
        {/* Subtle Tech Pattern Overlay */}
        {theme.backgroundPattern && theme.backgroundPattern !== "none" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: theme.patternOpacity ?? 0.05,
              backgroundImage:
                theme.backgroundPattern === "blueprint"
                  ? `linear-gradient(to right, ${theme.patternColor || "rgba(255,255,255,0.7)"} 1px, transparent 1px), linear-gradient(to bottom, ${theme.patternColor || "rgba(255,255,255,0.7)"} 1px, transparent 1px)`
                  : theme.backgroundPattern === "isometric-dot"
                    ? `radial-gradient(circle, ${theme.patternColor || "rgba(255,255,255,0.8)"} 1.5px, transparent 1.5px), radial-gradient(circle, ${theme.patternColor || "rgba(255,255,255,0.8)"} 1.5px, transparent 1.5px)`
                    : `radial-gradient(circle, ${theme.patternColor || "rgba(255,255,255,0.8)"} 1.5px, transparent 1.5px)`,
              backgroundSize: "3.5cqw 3.5cqw",
              backgroundPosition:
                theme.backgroundPattern === "isometric-dot" ? "0 0, 1.75cqw 1.75cqw" : "0 0",
            }}
          />
        ) : null}
      </div>

      {/* The scene composition: copy, devices, and decor shifted per slice within layout span */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `${-slice * 100}%`,
          width: `${spec.span * 100}%`,
          height: "100%",
        }}
      >
        {copy ? (
          <div
            dir={isRtl ? "rtl" : "ltr"}
            style={{
              position: "absolute",
              left: leftPos,
              width: w(copy.box.width),
              ...(copy.position === "top"
                ? { top: 0, paddingTop: h(copy.y), justifyContent: "flex-start" }
                : {
                    bottom: 0,
                    paddingBottom: h(tile.height - copy.y),
                    justifyContent: "flex-end",
                  }),
              height: h(copy.box.height),
              display: "flex",
              flexDirection: "column",
              alignItems: flexAlign,
              gap: h(tile.height * TYPE.gap),
              textAlign: align,
            }}
          >
            <h1
              dir={isRtl ? "rtl" : "ltr"}
              style={{
                margin: 0,
                color: headlineColor,
                fontSize: `${TYPE.headlineSize * typeScale * 100}cqw`,
                lineHeight: TYPE.headlineLineHeight,
                fontWeight: TYPE.headlineWeight,
                letterSpacing: `${TYPE.headlineTracking * typeScale * 100}cqw`,
              }}
              {...editable((text) => onEdit?.("headline", text), headline, "Headline")}
            >
              {headline}
            </h1>
            {subhead || onEdit ? (
              <p
                dir={isRtl ? "rtl" : "ltr"}
                style={{
                  margin: 0,
                  color: subheadColor,
                  fontSize: `${TYPE.subheadSize * typeScale * 100}cqw`,
                  lineHeight: TYPE.subheadLineHeight,
                  fontWeight: TYPE.subheadWeight,
                  minWidth: "30cqw",
                }}
                {...editable((text) => onEdit?.("subhead", text), subhead ?? "", "Subhead")}
              >
                {subhead}
              </p>
            ) : null}
          </div>
        ) : null}

        <Decorations
          decorations={decorations.filter((d) => d.kind !== "badge")}
          tile={tile}
          locale={locale}
          color={headlineColor}
        />

        {c.devices.map((device) => {
          const url = device.capture === "secondary" ? secondCaptureUrl : captureUrl;
          return (
            <DeviceView
              key={`${device.capture}-${device.frame.left}-${device.frame.top}`}
              device={device}
              tile={tile}
              frameUrl={screenOnly ? null : frameUrl}
              captureUrl={url}
              missing={url ? undefined : (secondSceneId ?? "secondScene")}
              backlight={theme.deviceBacklight}
              assetVersion={assetVersion}
            />
          );
        })}
      </div>

      <Decorations
        decorations={decorations.filter(
          (d) => d.kind === "badge" && (d.slice === undefined ? slice === 0 : d.slice === slice),
        )}
        tile={tile}
        locale={locale}
        color={headlineColor}
      />
    </Canvas>
  );
}

/**
 * One device: the capture cover-fitted inside the rounded screen, the bezel
 * over it, or a drop shadow under the bare screen when there is no bezel.
 * The box rotates about its centre, matching the canvas transform.
 */
function DeviceView({
  device,
  tile,
  frameUrl,
  captureUrl,
  missing,
  backlight,
  assetVersion,
}: {
  device: Composition["devices"][number];
  tile: { width: number; height: number };
  frameUrl: string | null;
  captureUrl: string | undefined;
  /** Scene id to name in the placeholder when the capture is missing. */
  missing: string | undefined;
  backlight?: boolean | BacklightConfig;
  assetVersion?: number;
}) {
  const { w, h } = cq(tile);
  const { frame, screen } = device;
  // The screen as fractions of the device box, so it rotates with it.
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  const haloColor =
    (typeof backlight === "object" && backlight.color) || "rgba(56, 189, 248, 0.4)";
  const haloIntensity =
    typeof backlight === "object" && backlight.intensity !== undefined
      ? backlight.intensity
      : 0.45;
  const blurRatio =
    typeof backlight === "object" && backlight.blurRatio !== undefined
      ? backlight.blurRatio
      : 0.085;

  return (
    <div
      style={{
        position: "absolute",
        left: w(frame.left),
        top: h(frame.top),
        width: w(frame.width),
        height: h(frame.height),
        transform: device.rotate ? `rotate(${device.rotate}deg)` : undefined,
      }}
    >
      {/* 1. Ambient Backlight Halo behind phone */}
      {backlight ? (
        <div
          style={{
            position: "absolute",
            left: "-15%",
            top: "-10%",
            width: "130%",
            height: "120%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${withOpacity(haloColor, haloIntensity)} 0%, ${withOpacity(haloColor, haloIntensity * 0.35)} 45%, transparent 70%)`,
            filter: `blur(${w(tile.width * blurRatio)})`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      ) : null}

      {/* 2. Screen content */}
      <div
        style={{
          position: "absolute",
          left: pct(screen.left - frame.left, frame.width),
          top: pct(screen.top - frame.top, frame.height),
          width: pct(screen.width, frame.width),
          height: pct(screen.height, frame.height),
          borderRadius: w(screen.radius),
          overflow: "hidden",
          background: "#000",
          boxShadow: frameUrl
            ? undefined
            : `0 ${w(tile.width * SCREEN_SHADOW.offsetY)} ${w(tile.width * SCREEN_SHADOW.blur)} ${SCREEN_SHADOW.color}`,
        }}
      >
        {captureUrl ? (
          <img
            src={`/${captureUrl}${assetVersion ? `?v=${assetVersion}` : ""}`}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center border-4 border-dashed border-neutral-500 bg-neutral-800 text-center text-neutral-300"
            style={{ fontSize: "3cqw", padding: "4cqw" }}
          >
            no capture for {missing}
          </div>
        )}
      </div>

      {/* 3. Bezel with realistic multi-layer contact and ambient drop shadow */}
      {frameUrl ? (
        <img
          src={`/${frameUrl}`}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            filter: `drop-shadow(0 ${w(tile.width * 0.016)} ${w(tile.width * 0.022)} rgba(0, 0, 0, 0.35)) drop-shadow(0 ${w(tile.width * 0.04)} ${w(tile.width * 0.085)} rgba(0, 0, 0, 0.22))`,
          }}
        />
      ) : null}
    </div>
  );
}

/** Badge pills in the composition's corners and image layers placed by tile fractions. */
function Decorations({
  decorations,
  tile,
  locale,
  color,
}: {
  decorations: Decoration[];
  tile: { width: number; height: number };
  locale: string;
  color: string;
}) {
  const { w, h } = cq(tile);
  const inset = Math.min(tile.width, tile.height) * BADGE.inset;
  return (
    <>
      {decorations.map((d, i) =>
        d.kind === "badge" ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static list from the config
            key={i}
            style={{
              position: "absolute",
              ...(d.position.endsWith("left") ? { left: w(inset) } : { right: w(inset) }),
              ...(d.position.startsWith("top") ? { top: h(inset) } : { bottom: h(inset) }),
              padding: `${w(tile.width * BADGE.padY)} ${w(tile.width * BADGE.padX)}`,
              borderRadius: "999cqw",
              background: d.background ?? "rgba(255, 255, 255, 0.85)",
              color: d.color ?? color,
              fontSize: `${BADGE.fontSize * 100}cqw`,
              lineHeight: 1.2,
              fontWeight: BADGE.weight,
              whiteSpace: "nowrap",
              direction: isRtlLocale(locale) ? "rtl" : "ltr",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.22)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
            }}
          >
            {d.text[locale] ?? ""}
          </div>
        ) : (
          <img
            // biome-ignore lint/suspicious/noArrayIndexKey: static list from the config
            key={i}
            src={`/${d.src}`}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: w(tile.width * d.x),
              top: h(tile.height * d.y),
              width: w(tile.width * d.width),
              height: "auto",
              transform: d.rotate ? `rotate(${d.rotate}deg)` : undefined,
            }}
          />
        ),
      )}
    </>
  );
}

/**
 * Props that make a copy element editable in place. The text is committed
 * on blur or Enter (Shift+Enter keeps a line break, as the export honours
 * newlines); Escape restores the current value and leaves the field.
 */
function editableProps(commit: (text: string) => void, current: string, label: string) {
  return {
    contentEditable: "plaintext-only" as const,
    suppressContentEditableWarning: true,
    role: "textbox",
    "aria-label": label,
    "data-placeholder": label,
    spellCheck: false,
    className: "editable-copy",
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const text = e.currentTarget.innerText.replace(/\n+$/, "");
      if (text !== current) commit(text);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.currentTarget.innerText = current;
        e.currentTarget.blur();
      }
    },
  };
}

/**
 * Plays the raw clips back to back, unframed, exactly as the exported video
 * joins them. Always muted - the configured audio bed only exists in the
 * exported video.
 */
function PreviewScene({ segments }: { segments: Array<{ url: string; durationSeconds: number }> }) {
  const [index, setIndex] = useState(0);
  const segment = segments[index % segments.length]!;
  return (
    // Remounting on every advance restarts playback even with one clip.
    <video
      key={index}
      src={`/${segment.url}`}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={() => setIndex((i) => i + 1)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

/**
 * One strip tile. Screenshot tiles sit inside a Reorder.Item, which handles
 * the drag; a click still opens the lightbox.
 */
function Tile({
  width,
  height,
  bad,
  badReason,
  onOpen,
  onDelete,
  onReplace,
  isReplacing,
  onDownload,
  isDownloading,
  onAiCopy,
  sceneId,
  transitionName,
  draggable,
  isSelected,
  onToggleSelect,
  children,
}: {
  width: number;
  height: number;
  bad: boolean;
  badReason?: string;
  onOpen: () => void;
  onDelete?: () => void;
  onReplace?: (file: File) => void;
  isReplacing?: boolean;
  onDownload?: () => void;
  isDownloading?: boolean;
  onAiCopy?: () => void;
  sceneId?: string;
  transitionName?: string;
  draggable: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  children: ReactNode;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReplace) {
      onReplace(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop target container
    <div
      className={`group relative transition-all rounded-2xl ${
        isDragOver ? "ring-4 ring-primary scale-[1.02] z-30" : ""
      }`}
      onDragEnter={(e) => {
        const hasFiles =
          e.dataTransfer &&
          Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files");
        if (hasFiles) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }
      }}
      onDragOver={(e) => {
        const hasFiles =
          e.dataTransfer &&
          Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files");
        if (hasFiles) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        const hasFiles =
          e.dataTransfer &&
          Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files");
        if (hasFiles) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          let file: File | undefined = e.dataTransfer.files?.[0];
          if (!file && e.dataTransfer.items) {
            for (const item of Array.from(e.dataTransfer.items)) {
              const f = item.getAsFile();
              if (f) {
                file = f;
                break;
              }
            }
          }
          if (file && onReplace) {
            onReplace(file);
          }
        }
      }}
    >
      {onReplace ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}

      <button
        type="button"
        aria-label={
          draggable ? "Open full-size preview (drag to reorder)" : "Open full-size preview"
        }
        title={draggable ? "Drag to reorder" : undefined}
        onClick={onOpen}
        className={`tile-shadow relative block w-full overflow-hidden rounded-2xl bg-neutral-200 ring-1 transition-[transform,box-shadow,--tw-ring-color] duration-150 select-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none dark:bg-neutral-800 ${
          isSelected
            ? "ring-2 ring-[#FF6B00] ring-offset-2 ring-offset-background shadow-md shadow-[#FF6B00]/15"
            : "ring-black/10 hover:ring-black/25 dark:ring-white/10 dark:hover:ring-white/30"
        } ${
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
        style={{ aspectRatio: `${width} / ${height}`, viewTransitionName: transitionName }}
      >
        {children}
      </button>

      {/* Checkbox toggle on top-left inside tile */}
      {onToggleSelect && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`absolute top-2 left-2 z-30 flex size-6 cursor-pointer items-center justify-center rounded-lg border shadow-md backdrop-blur-md transition-all ${
            isSelected
              ? "bg-[#FF6B00] border-[#FF6B00] text-white opacity-100 scale-100 ring-2 ring-black/20"
              : "bg-background/85 border-border/90 text-transparent opacity-0 group-hover:opacity-100 hover:border-[#FF6B00] hover:text-muted-foreground"
          }`}
          aria-label={isSelected ? "Deselect screenshot" : "Select screenshot"}
          title={isSelected ? "Deselect screenshot" : "Select screenshot"}
        >
          <Check className="size-3.5 stroke-[3]" />
        </button>
      ) : null}

      {/* Hover menu: Replace image on top-left, Delete on top-right */}
      {onReplace && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="absolute -top-2 -left-2 z-30 flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
          aria-label={sceneId ? `Replace screenshot for ${sceneId}` : "Replace screenshot"}
          title={sceneId ? `Replace screenshot for "${sceneId}"` : "Replace screenshot"}
        >
          <Upload className="size-3.5" strokeWidth={2.5} />
        </button>
      ) : null}

      {onDelete && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 z-30 flex size-6 cursor-pointer items-center justify-center rounded-full bg-destructive text-white shadow-md ring-2 ring-background transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
          aria-label={sceneId ? `Remove screenshot for ${sceneId}` : "Remove screenshot"}
          title={sceneId ? `Remove screenshot for "${sceneId}"` : "Remove screenshot"}
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      ) : null}

      {/* 1-Click Instant Screenshot Download button */}
      {onDownload && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          disabled={isDownloading}
          className="absolute bottom-2 right-2 z-30 flex size-7 cursor-pointer items-center justify-center rounded-full bg-background/90 text-foreground border border-border/80 shadow-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 disabled:opacity-50"
          aria-label={sceneId ? `Download screenshot for ${sceneId}` : "Download screenshot"}
          title={sceneId ? `Download screenshot for "${sceneId}"` : "Download screenshot"}
        >
          {isDownloading ? (
            <Loader2 className="size-3.5 text-primary animate-spin" />
          ) : (
            <Download className="size-3.5" strokeWidth={2} />
          )}
        </button>
      ) : null}

      {/* 1-Click Gemini Vision AI Copy Assistant button */}
      {onAiCopy && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAiCopy();
          }}
          className="absolute bottom-2 left-2 z-30 flex items-center gap-1.5 rounded-full bg-[#FF6B00] text-white hover:bg-[#FF8A00] active:bg-[#e05f00] border border-white/20 px-2.5 py-1 text-[10px] font-semibold shadow-md shadow-[#FF6B00]/20 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label={sceneId ? `AI Copy for ${sceneId}` : "AI Copy"}
          title={sceneId ? `AI Copy Assistant for "${sceneId}"` : "AI Copy Assistant"}
        >
          <Sparkles className="size-3 text-[#FFB21A]" />
          <span>AI Copy</span>
        </button>
      ) : null}

      {/* Drag & drop highlight on this specific card */}
      {isDragOver ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-primary/20 backdrop-blur-xs ring-2 ring-primary ring-offset-2">
          <Upload className="size-8 text-primary animate-bounce" strokeWidth={2.5} />
          <span className="mt-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-semibold text-primary shadow-xs">
            Drop to replace {sceneId ?? "screenshot"}
          </span>
        </div>
      ) : null}

      {/* Replacing in progress indicator */}
      {isReplacing ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-xs ring-1 ring-primary/30">
          <Loader2 className="size-7 text-primary animate-spin" />
          <span className="mt-2 text-xs font-medium text-foreground">
            Updating {sceneId ?? "screenshot"}…
          </span>
        </div>
      ) : null}

      {bad ? (
        <p className="pt-2 text-center text-[11px] font-medium text-destructive">{badReason}</p>
      ) : null}
    </div>
  );
}
