import { Check, Tag, Trash2, X } from "lucide-react";
import { AnimatePresence, Reorder } from "motion/react";
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { isTemplateKey, type LayoutKey, resolveScenes } from "../../../src/layouts";
import { useStudioActions } from "../context/StudioContext";
import { trackAppImported, trackAssetDownloaded, trackExport } from "../lib/analytics";
import { apiFetch } from "../lib/api";
import { CUSTOM_TEMPLATE } from "../lib/studioState";
import { type DesignScene, fontKey } from "../manifest";
import { BadgePickerPopover } from "./BadgePickerPopover";
import { SceneBackgroundPopover } from "./SceneBackgroundPopover";
import {
  downloadSingleScreenshot,
  MAX_SCREENSHOTS,
  PAGE_SIZE,
  pageSlide,
  rankOf,
  readFileData,
  type StripEntry,
  type StripProps,
} from "./strip/helpers";
import { Lightbox, PagerButton } from "./strip/Lightbox";
import { buildScreenshotEntries, PreviewScene } from "./strip/ScreenshotScene";
import { FloatingSelectionBar, StripHeaderToolbar } from "./strip/SelectionToolbars";
import { ImportTileCard, Tile } from "./strip/Tile";
import { Button } from "./ui/button";

const AiCopyModal = lazy(() =>
  import("./AiCopyModal").then((m) => ({ default: m.AiCopyModal })),
);

export {
  backgroundLuminance,
  downloadSingleScreenshot,
  MAX_SCREENSHOTS,
  rankOf,
  resolveColors,
  type ScreenshotEntry,
} from "./strip/helpers";
export { buildScreenshotEntries, ScreenshotScene } from "./strip/ScreenshotScene";

export const Strip = memo(function Strip({
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
  iphoneSize = "1206x2622",
  appInfo,
  onRefresh,
  onToast,
}: StripProps) {
  const studioActions = useStudioActions();
  const [assetVersion, setAssetVersion] = useState(() => Date.now());
  const [open, setOpenState] = useState<number | null>(null);
  const [named, setNamed] = useState<number | null>(null);
  const dragged = useRef(false);
  const [lifting, setLifting] = useState<string | null>(null);
  const [replacingSceneId, setReplacingSceneId] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [activeAiSceneId, setActiveAiSceneId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkMode, setBulkMode] = useState<"png" | "zip" | null>(null);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importDragOver, setImportDragOver] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const notifyToast = useCallback(
    (msg: string) => {
      if (onToast) onToast(msg);
      else studioActions?.toast(msg);
    },
    [onToast, studioActions],
  );

  const notifyRefresh = useCallback(
    async (msg?: string) => {
      if (onRefresh) await onRefresh();
      else if (studioActions) await studioActions.refresh();
      else window.dispatchEvent(new CustomEvent("appassets:refresh", { detail: { toast: msg } }));
    },
    [onRefresh, studioActions],
  );

  const { scenes, allShots, shots, dropped, entries } = useMemo(() => {
    const orderedScenes =
      order.length > 0
        ? [...design.scenes].sort((a, b) => {
            const ra = rankOf(order, a.id);
            const rb = rankOf(order, b.id);
            return ra === rb ? design.scenes.indexOf(a) - design.scenes.indexOf(b) : ra - rb;
          })
        : design.scenes;

    const templateArg = Array.isArray(template)
      ? (template as LayoutKey[])
      : isTemplateKey(template)
        ? template
        : undefined;

    const resolved = resolveScenes(orderedScenes, {
      template: templateArg,
      layout,
      sceneLayouts,
    });
    const layoutOf = (scene: DesignScene) => resolved.find((r) => r.scene.id === scene.id)!;

    const unforced = resolveScenes(orderedScenes, { template: templateArg, layout });
    const defaultLayoutOf = (scene: DesignScene) =>
      unforced.find((r) => r.scene.id === scene.id)!.layout.key;

    const allShotItems = orderedScenes.flatMap((scene) => {
      const capture = captures.screenshots.find((s) => s.sceneId === scene.id);
      return capture ? [{ scene, capture }] : [];
    });
    let used = 0;
    const keptShots = allShotItems.filter(({ scene }) => {
      used += layoutOf(scene).layout.span;
      return used <= MAX_SCREENSHOTS;
    });

    const segments =
      design.preview && captures.clips
        ? design.preview.segments.flatMap((seg) => {
            const clip = captures.clips!.find((c) => c.segmentId === seg.id);
            return clip ? [{ url: clip.url, durationSeconds: clip.durationSeconds }] : [];
          })
        : [];
    const totalSeconds = segments.reduce((s, c) => s + c.durationSeconds, 0);

    const builtEntries: StripEntry[] = [];
    if (segments.length > 0 && tileSpec.preview) {
      const outOfBounds =
        (tileSpec.platform === "ios" || tileSpec.platform === "ipad") &&
        (totalSeconds < 15 || totalSeconds > 30);
      builtEntries.push({
        key: "preview",
        width: tileSpec.preview.width,
        height: tileSpec.preview.height,
        bad: outOfBounds,
        badReason: "Clips sum outside the 15-30s Apple allows for previews.",
        editable: false,
        scene: () => <PreviewScene segments={segments} />,
      });
    }

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
      const scene = orderedScenes.find((s) => s.id === item.sceneId);
      const layoutControl = scene
        ? {
            value: sceneLayouts[item.sceneId],
            defaultKey: defaultLayoutOf(scene),
            onChange: (key: string | undefined) => onSceneLayout(item.sceneId, key),
          }
        : undefined;
      builtEntries.push({
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

    return {
      scenes: orderedScenes,
      allShots: allShotItems,
      shots: keptShots,
      dropped: allShotItems.length - keptShots.length,
      entries: builtEntries,
    };
  }, [
    assetVersion,
    background,
    backgroundPattern,
    captures,
    copy,
    design,
    deviceBacklight,
    fontFamily,
    fontSizeScale,
    frameUrl,
    headlineColor,
    layout,
    locale,
    onCopy,
    onSceneLayout,
    order,
    panoramaMode,
    patternColor,
    patternOpacity,
    sceneBackgrounds,
    sceneBadges,
    sceneLayouts,
    screenOnly,
    subheadColor,
    template,
    tileSpec,
  ]);

  const setOpen = useCallback((next: number | null) => {
    if (typeof document.startViewTransition !== "function") {
      setNamed(next);
      setOpenState(next);
      return;
    }
    if (next !== null) flushSync(() => setNamed(next));
    const transition = document.startViewTransition(() => flushSync(() => setOpenState(next)));
    if (next === null) transition.finished.finally(() => setNamed(null));
  }, []);

  const handleDelete = useCallback(
    async (sceneId: string) => {
      if (!window.confirm(`Are you sure you want to remove screenshot "${sceneId}"?`)) return;
      try {
        const res = await apiFetch("/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sceneId }),
        });
        if (res.ok) {
          const msg = `Removed screenshot "${sceneId}"`;
          notifyToast(msg);
          await notifyRefresh(msg);
        } else {
          const data = await res.json().catch(() => ({}));
          notifyToast(data.error || "Failed to delete screenshot");
        }
      } catch (err) {
        notifyToast(err instanceof Error ? err.message : "Failed to delete screenshot");
      }
    },
    [notifyRefresh, notifyToast],
  );

  const handleClearAll = useCallback(async () => {
    if (!window.confirm("Are you sure you want to remove all screenshots?")) return;
    try {
      const res = await apiFetch("/api/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const msg = "Removed all screenshots";
        notifyToast(msg);
        await notifyRefresh(msg);
      } else {
        const data = await res.json().catch(() => ({}));
        notifyToast(data.error || "Failed to remove screenshots");
      }
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Failed to remove screenshots");
    }
  }, [notifyRefresh, notifyToast]);

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectableEntries = useMemo(() => entries.filter((e) => e.key !== "preview"), [entries]);
  const isAllSelected =
    selectableEntries.length > 0 && selectableEntries.every((e) => selectedKeys.has(e.key));

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(selectableEntries.map((e) => e.key)));
  }, [isAllSelected, selectableEntries]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const handleDownloadSelectedPngs = useCallback(async () => {
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
          size: tileSpec.key === "iphone-6.9" ? iphoneSize : undefined,
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
      notifyToast(err instanceof Error ? err.message : "Failed to download selected screenshots");
    } finally {
      setIsBulkDownloading(false);
      setBulkMode(null);
      setBulkDownloadProgress(0);
    }
  }, [
    background,
    design,
    entries,
    fontFamily,
    fontSizeScale,
    frameUrl,
    iphoneSize,
    isBulkDownloading,
    layout,
    locale,
    notifyToast,
    sceneBackgrounds,
    screenOnly,
    selectedKeys,
    template,
    tileSpec.key,
  ]);

  const handleDownloadSelectedZip = useCallback(async () => {
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
          size: tileSpec.key === "iphone-6.9" ? iphoneSize : undefined,
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
      notifyToast(
        err instanceof Error ? err.message : "Failed to download selected screenshots ZIP",
      );
    } finally {
      setIsBulkDownloading(false);
      setBulkMode(null);
    }
  }, [
    background,
    design,
    entries,
    fontFamily,
    fontSizeScale,
    frameUrl,
    iphoneSize,
    isBulkDownloading,
    layout,
    locale,
    notifyToast,
    screenOnly,
    selectedKeys,
    template,
    tileSpec.key,
  ]);

  const handleImportFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileList = Array.from(files).filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name));
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
        const msg = `✨ Successfully imported ${count} screenshot(s)!`;
        notifyToast(msg);
        await notifyRefresh(msg);
      } catch (err) {
        notifyToast(err instanceof Error ? err.message : "Failed to import images");
      } finally {
        setIsImporting(false);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    },
    [isImporting, notifyRefresh, notifyToast, tileSpec.key],
  );

  const handleReplaceCapture = useCallback(
    async (sceneId: string, file: File) => {
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
            file: { name: file.name, dataUrl, width, height },
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
        const msg = `✨ Updated screenshot for "${sceneId}" across iPhone, iPad, and Android!`;
        notifyToast(msg);
        await notifyRefresh(msg);
      } catch (err) {
        notifyToast(err instanceof Error ? err.message : "Failed to replace capture");
      } finally {
        setReplacingSceneId(null);
      }
    },
    [notifyRefresh, notifyToast, tileSpec.key],
  );

  const handleSyncCaptures = useCallback(async () => {
    setIsSyncing(true);
    try {
      const targetDevices =
        tileSpec.platform === "android"
          ? ["pixel-10-pro"]
          : tileSpec.platform === "ipad"
            ? ["ipad-13"]
            : ["pixel-10-pro", "ipad-13"];

      const res = await apiFetch("/api/sync-captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDevice: "iphone-6.9", targetDevices }),
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
      notifyToast(`✨ Synced screenshots from iPhone to ${label}!`);
      await notifyRefresh();
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Failed to sync captures");
    } finally {
      setIsSyncing(false);
    }
  }, [notifyRefresh, notifyToast, tileSpec.platform]);

  const handleDownloadScreenshot = useCallback(
    async (entryKey: string, targetSceneId?: string, sceneId?: string) => {
      const parts = entryKey.split("#");
      const resolvedSceneId = targetSceneId ?? sceneId ?? parts[0];
      const slice = parts[1] ? parseInt(parts[1], 10) : undefined;
      setDownloadingKey(entryKey);
      try {
        await downloadSingleScreenshot({
          sceneId: resolvedSceneId,
          slice,
          device: tileSpec.key,
          size: tileSpec.key === "iphone-6.9" ? iphoneSize : undefined,
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
        notifyToast(err instanceof Error ? err.message : "Failed to download screenshot");
      } finally {
        setDownloadingKey(null);
      }
    },
    [
      background,
      design,
      fontFamily,
      fontSizeScale,
      frameUrl,
      iphoneSize,
      layout,
      locale,
      notifyToast,
      sceneBackgrounds,
      screenOnly,
      template,
      tileSpec.key,
    ],
  );

  const pageCells = useMemo(() => {
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
    const pagesArr: Cell[][] = [[]];
    for (const cell of cells) {
      const current = pagesArr[pagesArr.length - 1];
      const used = current.reduce((n, c) => n + c.tiles.length, 0);
      if (used + cell.tiles.length > PAGE_SIZE && current.length > 0) pagesArr.push([cell]);
      else current.push(cell);
    }
    const lastPageUsed = pagesArr[pagesArr.length - 1].reduce((n, c) => n + c.tiles.length, 0);
    if (lastPageUsed === PAGE_SIZE && entries.length < MAX_SCREENSHOTS) {
      pagesArr.push([]);
    }
    return pagesArr;
  }, [entries]);

  const pages = pageCells.length;
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const turnPage = useCallback((delta: number) => {
    setDirection(delta);
    setPage((p) => p + delta);
  }, []);

  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);

  useEffect(() => {
    if (open !== null && open > entries.length - 1) {
      setOpenState(null);
      setNamed(null);
    }
  }, [open, entries.length]);

  const handleImportClick = useCallback(() => importInputRef.current?.click(), []);

  if (entries.length === 0) return null;

  const visible = pageCells[Math.min(page, pages - 1)] || [];
  const visibleIds = visible.flatMap((c) => (c.sceneId ? [c.sceneId] : []));
  const columns = PAGE_SIZE;
  const tilesUsedOnPage = visible.reduce((n, c) => n + c.tiles.length, 0);
  const isLastPage = page === pages - 1;
  const showImportCard =
    isLastPage && tilesUsedOnPage < columns && entries.length < MAX_SCREENSHOTS;

  const reorderPage = (ids: string[]) => {
    const queue = [...ids];
    onReorder(scenes.map((s) => (visibleIds.includes(s.id) ? queue.shift()! : s.id)));
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
                  if (onSceneBackground && targetId) onSceneBackground(targetId, bg);
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
          transitionName={named === i && open === null ? "lightbox-scene" : undefined}
        >
          {entry.scene(false)}
        </Tile>
      </div>
    );
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {selectableEntries.length > 0 && (
        <StripHeaderToolbar
          selectedCount={selectedKeys.size}
          isAllSelected={isAllSelected}
          isImporting={isImporting}
          isSyncing={isSyncing}
          isBulkDownloading={isBulkDownloading}
          bulkMode={bulkMode}
          bulkDownloadProgress={bulkDownloadProgress}
          tileSpec={tileSpec}
          onToggleSelectAll={toggleSelectAll}
          onClearSelection={clearSelection}
          onImportClick={handleImportClick}
          onSyncCaptures={handleSyncCaptures}
          onDownloadSelectedPngs={handleDownloadSelectedPngs}
          onDownloadSelectedZip={handleDownloadSelectedZip}
        />
      )}

      <div className="relative">
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

              {showImportCard && (
                <ImportTileCard
                  nextIndex={entries.length + 1}
                  width={tileSpec.screenshot.width}
                  height={tileSpec.screenshot.height}
                  isImporting={isImporting}
                  importDragOver={importDragOver}
                  importInputRef={importInputRef}
                  onDragOverChange={setImportDragOver}
                  onImportFiles={handleImportFiles}
                />
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
          onStep={(delta) => {
            if (open === null) return;
            const next = Math.min(entries.length - 1, Math.max(0, open + delta));
            setNamed(next);
            setOpenState(next);
          }}
        />
      ) : null}

      {activeAiSceneId ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}

      <FloatingSelectionBar
        selectedCount={selectedKeys.size}
        isAllSelected={isAllSelected}
        isBulkDownloading={isBulkDownloading}
        bulkMode={bulkMode}
        bulkDownloadProgress={bulkDownloadProgress}
        onToggleSelectAll={toggleSelectAll}
        onDownloadSelectedPngs={handleDownloadSelectedPngs}
        onDownloadSelectedZip={handleDownloadSelectedZip}
        onClearSelection={clearSelection}
      />
    </div>
  );
});
