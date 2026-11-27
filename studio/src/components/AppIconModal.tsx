import { Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackAssetDownloaded, trackExport, trackToolOpened } from "../lib/analytics";
import { IconInspectorControls } from "./app-icon/IconInspectorControls";
import { IconPreviewPane } from "./app-icon/IconPreviewPane";
import {
  type AppIconModalProps,
  BG_PRESETS,
  type IconPreviewMode,
  renderMasterIconCanvas,
} from "./app-icon/presets";
import { Button } from "./ui/button";

export {
  type AppIconModalProps,
  BG_PRESETS,
  type BgPreset,
  type IconPreviewMode,
} from "./app-icon/presets";

export function AppIconModal({
  isOpen,
  onClose,
  currentIcon,
  appName = "App",
  onApplyIcon,
}: AppIconModalProps) {
  const [iconSrc, setIconSrc] = useState<string | null>(currentIcon || null);
  const [bgType, setBgType] = useState<"preset" | "custom" | "transparent">("preset");
  const [selectedPreset, setSelectedPreset] = useState<string>("store-blue");
  const [customColor, setCustomColor] = useState<string>("#FF6B00");
  const [scale, setScale] = useState<number>(72);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [cornerRadius, setCornerRadius] = useState<number>(20);
  const [clipCornersOnExport, setClipCornersOnExport] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [imgAspect, setImgAspect] = useState<number>(1);
  const [previewMode, setPreviewMode] = useState<IconPreviewMode>("google-play");
  const [showSafeArea, setShowSafeArea] = useState<boolean>(true);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadingFavicon, setDownloadingFavicon] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      trackToolOpened("app_icon");
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentIcon) {
      setIconSrc(currentIcon);
    }
  }, [isOpen, currentIcon]);

  useEffect(() => {
    if (!iconSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setImgAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = iconSrc;
  }, [iconSrc]);

  const activeBackground =
    bgType === "transparent"
      ? "transparent"
      : bgType === "custom"
        ? customColor
        : BG_PRESETS.find((p) => p.id === selectedPreset)?.value ||
          "linear-gradient(135deg, #007aff 0%, #0051d5 100%)";

  const handleSelectPreviewMode = useCallback((mode: IconPreviewMode) => {
    setPreviewMode(mode);
    if (mode === "google-play") {
      setCornerRadius(20);
    } else if (mode === "apple-ios") {
      setCornerRadius(22.5);
    } else if (mode === "master-square") {
      setCornerRadius(0);
    } else if (mode === "home-screen") {
      setCornerRadius((prev) => (prev === 0 ? 22.5 : prev));
    }
  }, []);

  const handleSetCornerRadius = useCallback(
    (val: number) => {
      setCornerRadius(val);
      if (previewMode !== "home-screen") {
        if (val === 0) setPreviewMode("master-square");
        else if (val === 20) setPreviewMode("google-play");
        else if (val === 22.5) setPreviewMode("apple-ios");
      }
    },
    [previewMode],
  );

  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIconSrc(reader.result as string);
      setOffsetX(0);
      setOffsetY(0);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!iconSrc) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY, initialX: offsetX, initialY: offsetY });
    },
    [iconSrc, offsetX, offsetY],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStart || !previewStageRef.current) return;
      const rect = previewStageRef.current.getBoundingClientRect();
      const containerSize = rect.width;
      const factor = scale / 100;
      let domW = containerSize * factor;
      let domH = containerSize * factor;
      if (imgAspect > 1) domH = domW / imgAspect;
      else if (imgAspect < 1) domW = domH * imgAspect;

      const deltaPercentX = ((e.clientX - dragStart.x) / domW) * 100;
      const deltaPercentY = ((e.clientY - dragStart.y) / domH) * 100;

      setOffsetX(Math.max(-100, Math.min(100, Math.round(dragStart.initialX + deltaPercentX))));
      setOffsetY(Math.max(-100, Math.min(100, Math.round(dragStart.initialY + deltaPercentY))));
    },
    [dragStart, imgAspect, isDragging, scale],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
        setIsDragging(false);
        setDragStart(null);
      }
    },
    [isDragging],
  );

  const renderCanvas = useCallback(
    (targetSize: number) =>
      renderMasterIconCanvas({
        targetSize,
        iconSrc,
        bgType,
        activeBackground,
        scale,
        offsetX,
        offsetY,
        cornerRadius,
        clipCornersOnExport,
      }),
    [activeBackground, bgType, clipCornersOnExport, cornerRadius, iconSrc, offsetX, offsetY, scale],
  );

  const handleDownloadIcon = useCallback(
    async (size: 512 | 1024, formatName: "GooglePlay" | "AppStore") => {
      setDownloadingFormat(formatName);
      setErrorMessage(null);
      trackExport("started", { export_type: "app_icon", size, format: formatName });
      try {
        const dataUrl = await renderCanvas(size);
        const a = document.createElement("a");
        const safeName = appName.trim().replace(/[^\w.-]/g, "_") || "app";
        const fileName = `${safeName}-${formatName}-icon-${size}x${size}.png`;
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        trackExport("completed", { export_type: "app_icon", size, format: formatName });
        trackAssetDownloaded({ asset_type: "app_icon", file_name: fileName });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to generate icon";
        trackExport("failed", { export_type: "app_icon", size, format: formatName, reason: msg });
        setErrorMessage(msg);
      } finally {
        setDownloadingFormat(null);
      }
    },
    [appName, renderCanvas],
  );

  const handleDownloadFaviconBundle = useCallback(async () => {
    setDownloadingFavicon(true);
    setErrorMessage(null);
    trackExport("started", { export_type: "favicon_zip" });
    try {
      const dataUrl = await renderCanvas(512);
      const res = await fetch("/api/export-favicon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          themeColor: activeBackground.startsWith("#") ? activeBackground : "#007aff",
          iconDataUrl: dataUrl,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let errorMsg = `Server error (${res.status})`;
        try {
          const data = JSON.parse(text);
          if (data.error) errorMsg = data.error;
        } catch {
          if (text) errorMsg = text.slice(0, 120);
        }
        throw new Error(errorMsg);
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const safeName = appName.trim().replace(/[^\w.-]/g, "_") || "app";
      const fileName = `${safeName}-favicon-bundle.zip`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      trackExport("completed", { export_type: "favicon_zip" });
      trackAssetDownloaded({ asset_type: "favicon_zip", file_name: fileName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate Favicon Kit";
      trackExport("failed", { export_type: "favicon_zip", reason: msg });
      setErrorMessage(msg);
    } finally {
      setDownloadingFavicon(false);
    }
  }, [activeBackground, appName, renderCanvas]);

  const handleSaveAndApply = useCallback(async () => {
    setIsApplying(true);
    setErrorMessage(null);
    try {
      const masterDataUrl = await renderCanvas(1024);
      await onApplyIcon(masterDataUrl);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to apply app logo");
    } finally {
      setIsApplying(false);
    }
  }, [onApplyIcon, onClose, renderCanvas]);

  const handleResetOffset = useCallback(() => {
    setOffsetX(0);
    setOffsetY(0);
  }, []);

  const handleSelectPreset = useCallback((id: string) => {
    setSelectedPreset(id);
    setBgType("preset");
  }, []);

  const handleToggleSafeArea = useCallback(() => {
    setShowSafeArea((prev) => !prev);
  }, []);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App Icon Studio & Resizer"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-foreground">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/25 flex items-center justify-center shadow-xs">
              <Sparkles className="size-5 text-[#FFB21A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">App Icon Studio & Resizer</h2>
                <span className="rounded-md bg-[#FF6B00]/15 text-[#FF6B00] dark:text-[#FF8A00] border border-[#FF6B00]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  512×512 & 1024×1024
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate store-compliant icons for Google Play Console and Apple App Store Connect
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          <IconPreviewPane
            appName={appName}
            iconSrc={iconSrc}
            bgType={bgType}
            activeBackground={activeBackground}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            cornerRadius={cornerRadius}
            imgAspect={imgAspect}
            isDragging={isDragging}
            previewMode={previewMode}
            showSafeArea={showSafeArea}
            previewStageRef={previewStageRef}
            onSelectPreviewMode={handleSelectPreviewMode}
            onToggleSafeArea={handleToggleSafeArea}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          <IconInspectorControls
            iconSrc={iconSrc}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            cornerRadius={cornerRadius}
            bgType={bgType}
            selectedPreset={selectedPreset}
            customColor={customColor}
            clipCornersOnExport={clipCornersOnExport}
            isDragOver={isDragOver}
            isApplying={isApplying}
            downloadingFormat={downloadingFormat}
            downloadingFavicon={downloadingFavicon}
            errorMessage={errorMessage}
            fileInputRef={fileInputRef}
            onDragOverChange={setIsDragOver}
            onFileUpload={handleFileUpload}
            onScaleChange={setScale}
            onOffsetXChange={setOffsetX}
            onOffsetYChange={setOffsetY}
            onResetOffset={handleResetOffset}
            onCornerRadiusChange={handleSetCornerRadius}
            onBgTypeChange={setBgType}
            onSelectPreset={handleSelectPreset}
            onCustomColorChange={setCustomColor}
            onClipCornersChange={setClipCornersOnExport}
            onDownloadIcon={handleDownloadIcon}
            onDownloadFaviconBundle={handleDownloadFaviconBundle}
            onSaveAndApply={handleSaveAndApply}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
