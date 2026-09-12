import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Download,
  Eye,
  EyeOff,
  FolderArchive,
  Image as ImageIcon,
  Loader2,
  Move,
  Palette,
  RotateCcw,
  Smartphone,
  Sparkles,
  Square,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export interface AppIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon?: string | null;
  appName?: string;
  onApplyIcon: (dataUrl: string) => Promise<void> | void;
}

export type IconPreviewMode = "google-play" | "apple-ios" | "master-square" | "home-screen";

export interface BgPreset {
  id: string;
  label: string;
  value: string;
  type: "gradient" | "solid";
  isDarkText?: boolean;
}

export const BG_PRESETS: BgPreset[] = [
  {
    id: "store-blue",
    label: "App Store Blue",
    value: "linear-gradient(135deg, #007aff 0%, #0051d5 100%)",
    type: "gradient",
  },
  {
    id: "dark-obsidian",
    label: "Dark Obsidian",
    value: "linear-gradient(135deg, #1f2937 0%, #0f172a 100%)",
    type: "gradient",
  },
  {
    id: "indigo-glow",
    label: "Indigo Glow",
    value: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    type: "gradient",
  },
  {
    id: "royal-violet",
    label: "Royal Violet",
    value: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    type: "gradient",
  },
  {
    id: "emerald-mint",
    label: "Emerald Mint",
    value: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
    type: "gradient",
  },
  {
    id: "sunset-blaze",
    label: "Sunset Blaze",
    value: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    type: "gradient",
  },
  {
    id: "crisp-silver",
    label: "Crisp Silver",
    value: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    type: "gradient",
    isDarkText: true,
  },
  {
    id: "solid-white",
    label: "Pure White",
    value: "#ffffff",
    type: "solid",
    isDarkText: true,
  },
  {
    id: "solid-black",
    label: "Solid Black",
    value: "#000000",
    type: "solid",
  },
  {
    id: "solid-blue",
    label: "Solid Blue",
    value: "#007aff",
    type: "solid",
  },
  {
    id: "solid-emerald",
    label: "Solid Green",
    value: "#10b981",
    type: "solid",
  },
  {
    id: "solid-amber",
    label: "Solid Amber",
    value: "#f59e0b",
    type: "solid",
  },
];

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
  const [customColor, setCustomColor] = useState<string>("#007aff");
  const [scale, setScale] = useState<number>(72); // 72% default safe area, up to 125%
  const [offsetX, setOffsetX] = useState<number>(0); // Relative percentage offset (-100 to 100)
  const [offsetY, setOffsetY] = useState<number>(0);
  const [cornerRadius, setCornerRadius] = useState<number>(20); // 20% default squircle
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);

  // Sync icon when modal opens
  useEffect(() => {
    if (isOpen && currentIcon) {
      setIconSrc(currentIcon);
    }
  }, [isOpen, currentIcon]);

  // Compute image natural aspect ratio whenever iconSrc changes
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

  if (!isOpen) return null;

  const handleSelectPreviewMode = (mode: IconPreviewMode) => {
    setPreviewMode(mode);
    if (mode === "google-play") {
      setCornerRadius(20);
    } else if (mode === "apple-ios") {
      setCornerRadius(22.5);
    } else if (mode === "master-square") {
      setCornerRadius(0);
    } else if (mode === "home-screen") {
      if (cornerRadius === 0) setCornerRadius(22.5);
    }
  };

  const handleSetCornerRadius = (val: number) => {
    setCornerRadius(val);
    if (previewMode !== "home-screen") {
      if (val === 0) {
        setPreviewMode("master-square");
      } else if (val === 20) {
        setPreviewMode("google-play");
      } else if (val === 22.5) {
        setPreviewMode("apple-ios");
      }
    }
  };

  // Active CSS background
  const activeBackground =
    bgType === "transparent"
      ? "transparent"
      : bgType === "custom"
        ? customColor
        : BG_PRESETS.find((p) => p.id === selectedPreset)?.value ||
          "linear-gradient(135deg, #007aff 0%, #0051d5 100%)";

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIconSrc(reader.result as string);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(file);
  };

  /** Direct drag interaction handlers on the preview canvas */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!iconSrc) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialX: offsetX,
      initialY: offsetY,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !previewStageRef.current) return;

    const rect = previewStageRef.current.getBoundingClientRect();
    const containerSize = rect.width;

    const factor = scale / 100;
    let domW = containerSize * factor;
    let domH = containerSize * factor;
    if (imgAspect > 1) {
      domH = domW / imgAspect;
    } else if (imgAspect < 1) {
      domW = domH * imgAspect;
    }

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const deltaPercentX = (deltaX / domW) * 100;
    const deltaPercentY = (deltaY / domH) * 100;

    const nextX = Math.round(dragStart.initialX + deltaPercentX);
    const nextY = Math.round(dragStart.initialY + deltaPercentY);

    setOffsetX(Math.max(-100, Math.min(100, nextX)));
    setOffsetY(Math.max(-100, Math.min(100, nextY)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDragging(false);
      setDragStart(null);
    }
  };

  /**
   * High-resolution offscreen canvas renderer for exporting 512x512 and 1024x1024 PNGs.
   * Clips to cornerRadius when enabled so the exported PNG actually has rounded corners.
   */
  const renderMasterCanvas = async (targetSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not initialize 2D context"));

      // 0. Apply Corner Radius Clipping if enabled
      const effectiveRadius = clipCornersOnExport ? cornerRadius : 0;
      if (effectiveRadius > 0) {
        const radiusPx = (effectiveRadius / 100) * targetSize;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(0, 0, targetSize, targetSize, radiusPx);
        } else {
          const r = radiusPx;
          ctx.moveTo(r, 0);
          ctx.lineTo(targetSize - r, 0);
          ctx.quadraticCurveTo(targetSize, 0, targetSize, r);
          ctx.lineTo(targetSize, targetSize - r);
          ctx.quadraticCurveTo(targetSize, targetSize, targetSize - r, targetSize);
          ctx.lineTo(r, targetSize);
          ctx.quadraticCurveTo(0, targetSize, 0, targetSize - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
        }
        ctx.clip();
      }

      // 1. Draw Background
      if (bgType !== "transparent") {
        if (activeBackground.startsWith("linear-gradient")) {
          // Parse basic linear gradient angle & colors
          const grad = ctx.createLinearGradient(0, 0, targetSize, targetSize);
          const colorMatches = activeBackground.match(/#[0-9a-fA-F]{6}|rgba?\([^)]+\)/g);
          if (colorMatches && colorMatches.length >= 2) {
            grad.addColorStop(0, colorMatches[0]!);
            grad.addColorStop(1, colorMatches[1]!);
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = "#007aff";
          }
        } else {
          ctx.fillStyle = activeBackground;
        }
        ctx.fillRect(0, 0, targetSize, targetSize);
      }

      // 2. Draw Scaled & Centered Logo with Position Offset
      if (!iconSrc) {
        resolve(canvas.toDataURL("image/png"));
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const factor = scale / 100;
        const aspect = img.naturalWidth / img.naturalHeight;
        let drawW = targetSize * factor;
        let drawH = targetSize * factor;

        if (aspect > 1) {
          drawH = drawW / aspect;
        } else if (aspect < 1) {
          drawW = drawH * aspect;
        }

        const drawX = (targetSize - drawW) / 2 + (offsetX / 100) * drawW;
        const drawY = (targetSize - drawH) / 2 + (offsetY / 100) * drawH;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to load icon image"));
      img.src = iconSrc;
    });
  };

  /** Downloads exact store specification icon */
  const handleDownloadIcon = async (size: 512 | 1024, formatName: "GooglePlay" | "AppStore") => {
    setDownloadingFormat(formatName);
    try {
      const dataUrl = await renderMasterCanvas(size);
      const a = document.createElement("a");
      const safeName = appName.trim().replace(/[^\w.-]/g, "_") || "app";
      a.href = dataUrl;
      a.download = `${safeName}-${formatName}-icon-${size}x${size}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate icon");
    } finally {
      setDownloadingFormat(null);
    }
  };

  /** Downloads complete Favicon & Web Kit (.zip) including favicon.ico, apple-touch-icon, webmanifest, html snippet */
  const handleDownloadFaviconBundle = async () => {
    setDownloadingFavicon(true);
    try {
      const dataUrl = await renderMasterCanvas(512);
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
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${safeName}-favicon-bundle.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to generate Favicon Kit:", err);
      alert(err instanceof Error ? err.message : "Failed to generate Favicon Kit");
    } finally {
      setDownloadingFavicon(false);
    }
  };

  /** Saves 1024x1024 master icon and applies it as official app logo */
  const handleSaveAndApply = async () => {
    setIsApplying(true);
    try {
      const masterDataUrl = await renderMasterCanvas(1024);
      await onApplyIcon(masterDataUrl);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to apply app logo");
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20 flex items-center justify-center shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">App Icon Studio & Resizer</h2>
                <span className="rounded-md bg-blue-500/15 text-[#007aff] dark:text-[#0a84ff] border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
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

        {/* Content Body: Left Workspace & Right Controls */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left Column: Interactive Stage & Device Previews (7 Cols) */}
          <div className="lg:col-span-7 p-6 flex flex-col items-center justify-between bg-muted/20 gap-6">
            {/* Preview Device Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSelectPreviewMode("google-play")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  previewMode === "google-play"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Google Play (512px)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreviewMode("apple-ios")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  previewMode === "apple-ios"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>App Store (1024px)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreviewMode("master-square")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  previewMode === "master-square"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Flat Master (1:1)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreviewMode("home-screen")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  previewMode === "home-screen"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="size-3.5 text-[#007aff]" />
                <span>Home Screen</span>
              </button>
            </div>

            {/* Main Stage: Scaled Realistic Icon Preview or Home Screen Mockup */}
            {previewMode === "home-screen" ? (
              <div className="relative flex items-center justify-center py-2 my-auto select-none">
                {/* Simulated Phone Frame */}
                <div className="w-[240px] h-[460px] rounded-[38px] border-[5px] border-neutral-800/90 bg-neutral-950 shadow-2xl relative overflow-hidden flex flex-col justify-between p-3 select-none ring-1 ring-white/10">
                  {/* Wallpaper Background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-black opacity-95" />
                  <div className="absolute -top-10 -right-10 size-44 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />
                  <div className="absolute top-40 -left-10 size-44 rounded-full bg-purple-600/20 blur-2xl pointer-events-none" />

                  {/* Top Status Bar & Dynamic Island */}
                  <div className="relative z-10 w-full flex items-center justify-between text-[9px] font-semibold text-white/90 px-2 pt-0.5">
                    <span>9:41</span>
                    {/* Dynamic Island */}
                    <div className="w-16 h-3.5 bg-black rounded-full border border-neutral-800/50 flex items-center justify-end px-1.5">
                      <div className="size-1.5 rounded-full bg-neutral-900 border border-neutral-700" />
                    </div>
                    <div className="flex items-center gap-1 text-[8px]">
                      <span>5G</span>
                      <div className="w-3.5 h-2 border border-white/70 rounded-xs p-0.2 flex items-center">
                        <div className="w-2 h-full bg-white rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* Date Header */}
                  <div className="relative z-10 px-2 pt-1 text-center">
                    <div className="text-[10px] font-medium text-white/70">Tuesday, September 15</div>
                  </div>

                  {/* App Grid */}
                  <div className="relative z-10 grid grid-cols-4 gap-y-3 gap-x-2 px-1 pt-2 my-auto">
                    {/* Photos */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-white flex items-center justify-center shadow-xs">
                        <div className="size-6 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-sky-400 opacity-90" />
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Photos</span>
                    </div>

                    {/* Camera */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-neutral-800 flex items-center justify-center shadow-xs border border-neutral-700">
                        <div className="size-5 rounded-full border-2 border-neutral-400 bg-neutral-900" />
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Camera</span>
                    </div>

                    {/* Maps */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-xs">
                        <div className="size-4 rotate-45 border-2 border-white rounded-xs" />
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Maps</span>
                    </div>

                    {/* Clock */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-black flex items-center justify-center shadow-xs border border-neutral-800 text-white text-[9px] font-mono font-bold">
                        9:41
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Clock</span>
                    </div>

                    {/* Mail */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-blue-500 flex items-center justify-center shadow-xs">
                        <div className="w-5 h-3.5 border border-white rounded-2xs flex items-center justify-center text-white text-[8px]">✉</div>
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Mail</span>
                    </div>

                    {/* Weather */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-xs text-white text-xs">
                        ☀️
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Weather</span>
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-amber-100 flex flex-col justify-between p-1.5 shadow-xs border border-amber-300">
                        <div className="w-full h-1 bg-amber-400 rounded-full" />
                        <div className="w-3/4 h-0.5 bg-neutral-400 rounded-full" />
                        <div className="w-1/2 h-0.5 bg-neutral-400 rounded-full" />
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Notes</span>
                    </div>

                    {/* Calendar */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-white flex flex-col items-center justify-center shadow-xs border border-neutral-200">
                        <span className="text-[6px] font-bold text-red-500 uppercase leading-none">TUE</span>
                        <span className="text-[11px] font-bold text-neutral-900 leading-none">15</span>
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Calendar</span>
                    </div>

                    {/* Settings */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-neutral-600 flex items-center justify-center shadow-xs border border-neutral-500 text-white text-[11px]">
                        ⚙️
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Settings</span>
                    </div>

                    {/* App Store */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-blue-600 flex items-center justify-center shadow-xs text-white text-[10px] font-bold">
                        A
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">App Store</span>
                    </div>

                    {/* TARGET APP: User's App with Live Rendered Logo! */}
                    <div className="flex flex-col items-center gap-1 relative group cursor-pointer" title="Your App Icon">
                      <div
                        className="size-10 flex items-center justify-center shadow-md relative overflow-hidden ring-2 ring-[#007aff] ring-offset-1 ring-offset-black/60 transition-transform group-hover:scale-105"
                        style={{
                          borderRadius: `${Math.max(18, cornerRadius)}%`,
                          background: activeBackground,
                        }}
                      >
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt={appName}
                            className="max-w-none select-none object-contain pointer-events-none"
                            style={{
                              width: imgAspect >= 1 ? `${scale}%` : `${scale * imgAspect}%`,
                              height: imgAspect >= 1 ? `${scale / imgAspect}%` : `${scale}%`,
                              transform: `translate(${offsetX}%, ${offsetY}%)`,
                            }}
                          />
                        ) : (
                          <Sparkles className="size-4 text-white" />
                        )}
                      </div>
                      <span className="text-[8px] text-white font-bold truncate max-w-[44px] text-center drop-shadow-xs">
                        {appName}
                      </span>
                      {/* Subtle indicator badge */}
                      <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#007aff] border border-white animate-pulse" />
                    </div>

                    {/* Health */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-[10px] bg-white flex items-center justify-center shadow-xs text-rose-500 text-[10px]">
                        ❤️
                      </div>
                      <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">Health</span>
                    </div>
                  </div>

                  {/* Frosted Glass Bottom Dock */}
                  <div className="relative z-10 w-full rounded-2xl bg-white/20 backdrop-blur-md p-1.5 flex items-center justify-around border border-white/20 shadow-lg">
                    {/* Phone */}
                    <div className="size-9 rounded-[9px] bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow-xs">
                      📞
                    </div>
                    {/* Safari */}
                    <div className="size-9 rounded-[9px] bg-white flex items-center justify-center shadow-xs border border-neutral-300 text-[10px]">
                      🧭
                    </div>
                    {/* Messages */}
                    <div className="size-9 rounded-[9px] bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow-xs">
                      💬
                    </div>
                    {/* Music */}
                    <div className="size-9 rounded-[9px] bg-gradient-to-tr from-rose-500 to-red-500 flex items-center justify-center text-white text-[10px] shadow-xs">
                      🎵
                    </div>
                  </div>

                  {/* Home Indicator bar */}
                  <div className="relative z-10 w-24 h-1 bg-white/70 rounded-full mx-auto mt-1" />
                </div>
              </div>
            ) : (
              <div className="relative flex items-center justify-center p-8 my-auto select-none">
                <div
                  ref={previewStageRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`relative size-56 sm:size-64 flex items-center justify-center transition-all duration-300 overflow-hidden touch-none select-none ${
                    cornerRadius > 0
                      ? "shadow-2xl shadow-black/35 ring-1 ring-black/10"
                      : "shadow-xl shadow-black/20 border border-border"
                  } ${
                    iconSrc ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
                  } ${
                    bgType === "transparent"
                      ? "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:12px_12px]"
                      : ""
                  }`}
                  style={{
                    borderRadius: `${cornerRadius}%`,
                    background: activeBackground,
                  }}
                >
                  {/* Logo Image */}
                  {iconSrc ? (
                    <img
                      src={iconSrc}
                      alt="Logo"
                      className={`max-w-none select-none object-contain pointer-events-none ${
                        isDragging ? "transition-none" : "transition-transform duration-100"
                      }`}
                      style={{
                        width: imgAspect >= 1 ? `${scale}%` : `${scale * imgAspect}%`,
                        height: imgAspect >= 1 ? `${scale / imgAspect}%` : `${scale}%`,
                        transform: `translate(${offsetX}%, ${offsetY}%)`,
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4 text-white/90 pointer-events-none">
                      <ImageIcon className="size-12 stroke-1 mb-2 opacity-80" />
                      <span className="text-xs font-bold">No Logo Uploaded</span>
                      <span className="text-[10px] opacity-75 mt-0.5">Upload a PNG or SVG logo</span>
                    </div>
                  )}

                  {/* Safe Area Guides Overlay (72% safe zone recommended circle) */}
                  {showSafeArea && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div
                        className="rounded-full border-2 border-dashed border-white/40 dark:border-black/40 shadow-2xs"
                        style={{ width: "72%", height: "72%" }}
                      />
                    </div>
                  )}

                  {/* Drag to Reposition Badge */}
                  {iconSrc && (
                    <div className="pointer-events-none absolute bottom-2.5 inset-x-0 flex justify-center">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-background/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-border/70 shadow-xs">
                        <Move className="size-3 text-primary shrink-0" />
                        <span>Drag to reposition</span>
                        {(offsetX !== 0 || offsetY !== 0) && (
                          <span className="font-mono text-primary font-bold">
                            ({offsetX > 0 ? `+${offsetX}` : offsetX}%, {offsetY > 0 ? `+${offsetY}` : offsetY}%)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Spec Badge & Safe Area Toggle */}
            <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
              <span className="flex items-center gap-1.5 font-medium">
                {previewMode === "home-screen" ? (
                  <span>Simulated Mobile Home Screen Mockup • Live preview alongside native apps</span>
                ) : cornerRadius === 0 ? (
                  <span>Master Square (Raw 1:1 format required by console validators)</span>
                ) : cornerRadius === 20 ? (
                  <span>Google Play Squircle (20% Corner Radius)</span>
                ) : cornerRadius === 22.5 ? (
                  <span>Apple App Store Squircle (22.5% Corner Radius)</span>
                ) : cornerRadius === 50 ? (
                  <span>Circular App Icon / Avatar (50% Radius)</span>
                ) : (
                  <span>Custom Corner Radius ({cornerRadius}%)</span>
                )}
              </span>

              {previewMode !== "home-screen" && (
                <button
                  type="button"
                  onClick={() => setShowSafeArea(!showSafeArea)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    showSafeArea
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle safe area margin guide"
                >
                  {showSafeArea ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  <span>Safe Area Guide</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Customization Controls (5 Cols) */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between gap-5 bg-card">
            <div className="space-y-5">
              {/* 1. Upload Logo Mark */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Upload className="size-3.5 text-blue-500" />
                  <span>Logo Mark Image</span>
                </span>

                <button
                  type="button"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                    isDragOver
                      ? "border-primary bg-primary/10"
                      : "border-border/80 hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                      {iconSrc ? (
                        <img src={iconSrc} alt="" className="size-8 object-contain rounded" />
                      ) : (
                        <Upload className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-foreground">
                        {iconSrc ? "Replace Logo File" : "Upload Logo Mark"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        PNG (transparent), JPG, SVG, WebP
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10">
                    Browse
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="sr-only"
                  />
                </button>
              </div>

              {/* 2. Scale & Zoom Slider (up to 125%) */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ZoomIn className="size-3.5 text-blue-500" />
                    <span>Logo Scale & Zoom</span>
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                    {scale}%
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={125}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#007aff]"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>25% (Compact)</span>
                  <span className="font-medium text-primary">72% Recommended Safe Zone</span>
                  <span>125% (Zoom Bleed)</span>
                </div>
              </div>

              {/* 3. Position & Pan Controls */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Move className="size-3.5 text-blue-500" />
                    <span>Logo Position & Pan</span>
                  </span>
                  {(offsetX !== 0 || offsetY !== 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="size-3" />
                      <span>Reset Center</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-2xl border border-border/60">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-lg cursor-pointer"
                      onClick={() => setOffsetX((prev) => Math.max(-100, prev - 5))}
                      disabled={!iconSrc}
                      title="Move Left 5%"
                      aria-label="Move Left"
                    >
                      <ArrowLeft className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-lg cursor-pointer"
                      onClick={() => setOffsetX((prev) => Math.min(100, prev + 5))}
                      disabled={!iconSrc}
                      title="Move Right 5%"
                      aria-label="Move Right"
                    >
                      <ArrowRight className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-lg cursor-pointer"
                      onClick={() => setOffsetY((prev) => Math.max(-100, prev - 5))}
                      disabled={!iconSrc}
                      title="Move Up 5%"
                      aria-label="Move Up"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-lg cursor-pointer"
                      onClick={() => setOffsetY((prev) => Math.min(100, prev + 5))}
                      disabled={!iconSrc}
                      title="Move Down 5%"
                      aria-label="Move Down"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                      X: <strong className="text-foreground">{offsetX > 0 ? `+${offsetX}` : offsetX}%</strong>{" "}
                      Y: <strong className="text-foreground">{offsetY > 0 ? `+${offsetY}` : offsetY}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Corner Radius & Shape */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Square className="size-3.5 text-blue-500" />
                    <span>Corner Radius & Shape</span>
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                    {cornerRadius}%
                  </span>
                </div>

                {/* Radius Preset Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleSetCornerRadius(0)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      cornerRadius === 0
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    Square (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCornerRadius(20)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      cornerRadius === 20
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    Play (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCornerRadius(22.5)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      cornerRadius === 22.5
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    iOS (22.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCornerRadius(50)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      cornerRadius === 50
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    Circle (50%)
                  </button>
                </div>

                {/* Corner Radius Slider */}
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={cornerRadius}
                  onChange={(e) => handleSetCornerRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#007aff]"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>0% (Flat Square)</span>
                  <span className="font-medium text-primary">20% Squircle</span>
                  <span>50% (Circle)</span>
                </div>
              </div>

              {/* 5. Background Customizer */}
              <div className="space-y-2.5 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Palette className="size-3.5 text-blue-500" />
                    <span>Background Style</span>
                  </span>

                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setBgType("preset")}
                      className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                        bgType === "preset"
                          ? "bg-muted text-foreground font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgType("custom")}
                      className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                        bgType === "custom"
                          ? "bg-muted text-foreground font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgType("transparent")}
                      className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                        bgType === "transparent"
                          ? "bg-muted text-foreground font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      Alpha
                    </button>
                  </div>
                </div>

                {/* Preset Gradients & Swatches */}
                {bgType === "preset" ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                    {BG_PRESETS.map((preset) => {
                      const isSelected = selectedPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(preset.id);
                            setBgType("preset");
                          }}
                          className={`group relative size-11 rounded-xl cursor-pointer transition-all border overflow-hidden ${
                            isSelected
                              ? "ring-2 ring-[#007aff] ring-offset-2 scale-105 border-white/40"
                              : "border-border/80 hover:scale-105"
                          }`}
                          style={{ background: preset.value }}
                          title={preset.label}
                        >
                          {isSelected && (
                            <Check className="size-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : bgType === "custom" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="size-9 rounded-xl border border-border/80 bg-transparent p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#007AFF"
                      className="h-9 text-xs font-mono uppercase flex-1"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    ⚠️ Google Play guidelines require opaque backgrounds. Transparent backgrounds can
                    wash out on dark mobile themes.
                  </p>
                )}
              </div>
            </div>

            {/* Action Bar: Export Buttons & Apply */}
            <div className="space-y-2.5 pt-4 border-t border-border">
              {/* Export Corner Radius Option */}
              <div className="flex items-center justify-between px-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={clipCornersOnExport}
                    onChange={(e) => setClipCornersOnExport(e.target.checked)}
                    className="rounded text-[#007aff] focus:ring-[#007aff] size-3.5 cursor-pointer accent-[#007aff]"
                  />
                  <span className="text-[11px] font-medium text-foreground">
                    Apply corner radius to downloaded PNG ({cornerRadius}%)
                  </span>
                </label>
                {clipCornersOnExport && cornerRadius > 0 && (
                  <span className="text-[10px] text-[#007aff] font-bold bg-[#007aff]/10 border border-[#007aff]/20 px-2 py-0.5 rounded-md">
                    Rounded PNG
                  </span>
                )}
              </div>

              {/* Direct Store & Web Download Options */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadIcon(512, "GooglePlay")}
                  disabled={downloadingFormat !== null || !iconSrc || downloadingFavicon}
                  className="h-9 gap-1 text-[11px] font-semibold rounded-xl cursor-pointer border-border"
                >
                  {downloadingFormat === "GooglePlay" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5 text-[#007aff]" />
                  )}
                  <span className="truncate">Google Play (512px)</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadIcon(1024, "AppStore")}
                  disabled={downloadingFormat !== null || !iconSrc || downloadingFavicon}
                  className="h-9 gap-1 text-[11px] font-semibold rounded-xl cursor-pointer border-border"
                >
                  {downloadingFormat === "AppStore" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5 text-[#007aff]" />
                  )}
                  <span className="truncate">App Store (1024px)</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadFaviconBundle}
                  disabled={downloadingFormat !== null || !iconSrc || downloadingFavicon}
                  className="h-9 gap-1 text-[11px] font-semibold rounded-xl cursor-pointer border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  title="Download Favicon (.ico), Apple Touch Icon (180x180), Android Chrome icons, site.webmanifest, and ready-to-paste HTML snippet"
                >
                  {downloadingFavicon ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FolderArchive className="size-3.5 text-amber-500" />
                  )}
                  <span className="truncate">Favicon Kit (.zip)</span>
                </Button>
              </div>

              {/* Main Save & Apply to App button */}
              <Button
                type="button"
                size="lg"
                onClick={handleSaveAndApply}
                disabled={isApplying || !iconSrc}
                className="w-full h-10.5 gap-2 text-xs font-bold rounded-xl bg-[#007aff] hover:bg-[#006ee6] active:bg-[#0062cc] text-white shadow-xs cursor-pointer transition-colors"
              >
                {isApplying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4 fill-current" />
                )}
                <span>Set as App Logo Across Studio</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
