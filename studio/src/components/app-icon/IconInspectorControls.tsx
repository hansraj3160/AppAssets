import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Download,
  FolderArchive,
  Loader2,
  Move,
  Palette,
  RotateCcw,
  Sparkles,
  Square,
  Upload,
  ZoomIn,
} from "lucide-react";
import { memo, type RefObject } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BG_PRESETS } from "./presets";

interface IconInspectorControlsProps {
  iconSrc: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  cornerRadius: number;
  bgType: "preset" | "custom" | "transparent";
  selectedPreset: string;
  customColor: string;
  clipCornersOnExport: boolean;
  isDragOver: boolean;
  isApplying: boolean;
  downloadingFormat: string | null;
  downloadingFavicon: boolean;
  errorMessage: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDragOverChange: (over: boolean) => void;
  onFileUpload: (file: File) => void;
  onScaleChange: (val: number) => void;
  onOffsetXChange: (updater: (prev: number) => number) => void;
  onOffsetYChange: (updater: (prev: number) => number) => void;
  onResetOffset: () => void;
  onCornerRadiusChange: (val: number) => void;
  onBgTypeChange: (val: "preset" | "custom" | "transparent") => void;
  onSelectPreset: (id: string) => void;
  onCustomColorChange: (val: string) => void;
  onClipCornersChange: (checked: boolean) => void;
  onDownloadIcon: (size: 512 | 1024, formatName: "GooglePlay" | "AppStore") => void;
  onDownloadFaviconBundle: () => void;
  onSaveAndApply: () => void;
}

export const IconInspectorControls = memo(function IconInspectorControls({
  iconSrc,
  scale,
  offsetX,
  offsetY,
  cornerRadius,
  bgType,
  selectedPreset,
  customColor,
  clipCornersOnExport,
  isDragOver,
  isApplying,
  downloadingFormat,
  downloadingFavicon,
  errorMessage,
  fileInputRef,
  onDragOverChange,
  onFileUpload,
  onScaleChange,
  onOffsetXChange,
  onOffsetYChange,
  onResetOffset,
  onCornerRadiusChange,
  onBgTypeChange,
  onSelectPreset,
  onCustomColorChange,
  onClipCornersChange,
  onDownloadIcon,
  onDownloadFaviconBundle,
  onSaveAndApply,
}: IconInspectorControlsProps) {
  return (
    <div className="lg:col-span-5 p-6 flex flex-col justify-between gap-5 bg-card">
      <div className="space-y-5">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Upload className="size-3.5 text-[#FF6B00]" />
            <span>Logo Mark Image</span>
          </span>

          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              onDragOverChange(true);
            }}
            onDragLeave={() => onDragOverChange(false)}
            onDrop={(e) => {
              e.preventDefault();
              onDragOverChange(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onFileUpload(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
              isDragOver
                ? "border-[#FF6B00] bg-[#FF6B00]/10"
                : "border-border/80 hover:border-[#FF6B00]/50 hover:bg-muted/40"
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
            <span className="text-xs font-semibold text-[#FF6B00] px-2.5 py-1 rounded-lg bg-[#FF6B00]/10">
              Browse
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
              }}
              className="sr-only"
            />
          </button>
        </div>

        <div className="space-y-2 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ZoomIn className="size-3.5 text-[#FF6B00]" />
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
            onChange={(e) => onScaleChange(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>25% (Compact)</span>
            <span className="font-medium text-primary">72% Recommended Safe Zone</span>
            <span>125% (Zoom Bleed)</span>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Move className="size-3.5 text-[#FF6B00]" />
              <span>Logo Position & Pan</span>
            </span>
            {(offsetX !== 0 || offsetY !== 0) && (
              <button
                type="button"
                onClick={onResetOffset}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="size-3" />
                <span>Reset (0,0)</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7 rounded-lg cursor-pointer"
                onClick={() => onOffsetXChange((prev) => Math.max(-100, prev - 5))}
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
                onClick={() => onOffsetXChange((prev) => Math.min(100, prev + 5))}
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
                onClick={() => onOffsetYChange((prev) => Math.max(-100, prev - 5))}
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
                onClick={() => onOffsetYChange((prev) => Math.min(100, prev + 5))}
                disabled={!iconSrc}
                title="Move Down 5%"
                aria-label="Move Down"
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                X:{" "}
                <strong className="text-foreground">
                  {offsetX > 0 ? `+${offsetX}` : offsetX}%
                </strong>{" "}
                Y:{" "}
                <strong className="text-foreground">
                  {offsetY > 0 ? `+${offsetY}` : offsetY}%
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Square className="size-3.5 text-[#FF6B00]" />
              <span>Corner Radius & Shape</span>
            </span>
            <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
              {cornerRadius}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {[
              { label: "Square (0%)", val: 0 },
              { label: "Play (20%)", val: 20 },
              { label: "iOS (22.5%)", val: 22.5 },
              { label: "Circle (50%)", val: 50 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onCornerRadiusChange(opt.val)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                  cornerRadius === opt.val
                    ? "bg-[#FF6B00]/10 border-[#FF6B00] text-[#FF6B00] font-bold shadow-2xs"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={50}
            step={0.5}
            value={cornerRadius}
            onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>0% (Flat Square)</span>
            <span className="font-medium text-primary">20% Squircle</span>
            <span>50% (Circle)</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Palette className="size-3.5 text-[#FF6B00]" />
              <span>Background Style</span>
            </span>

            <div className="flex items-center gap-1 text-[11px]">
              {(
                [
                  { id: "preset", label: "Presets" },
                  { id: "custom", label: "Solid" },
                  { id: "transparent", label: "Alpha" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onBgTypeChange(tab.id)}
                  className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                    bgType === tab.id ? "bg-muted text-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {bgType === "preset" ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {BG_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset.id)}
                    className={`group relative size-11 rounded-xl cursor-pointer transition-all border overflow-hidden ${
                      isSelected
                        ? "ring-2 ring-[#FF6B00] ring-offset-2 scale-105 border-white/40"
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
                onChange={(e) => onCustomColorChange(e.target.value)}
                className="size-9 rounded-xl border border-border/80 bg-transparent p-0.5 cursor-pointer shrink-0"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => onCustomColorChange(e.target.value)}
                placeholder="#FF6B00"
                className="h-9 text-xs font-mono uppercase flex-1"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
              ⚠️ Google Play guidelines require opaque backgrounds. Transparent backgrounds can wash
              out on dark mobile themes.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2.5 pt-4 border-t border-border">
        {errorMessage ? (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1.5">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center justify-between px-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clipCornersOnExport}
              onChange={(e) => onClipCornersChange(e.target.checked)}
              className="rounded text-[#FF6B00] focus:ring-[#FF6B00] size-3.5 cursor-pointer accent-[#FF6B00]"
            />
            <span className="text-[11px] font-medium text-foreground">
              Apply corner radius to downloaded PNG ({cornerRadius}%)
            </span>
          </label>
          {clipCornersOnExport && cornerRadius > 0 && (
            <span className="text-[10px] text-[#FF6B00] font-bold bg-[#FF6B00]/10 border border-[#FF6B00]/20 px-2 py-0.5 rounded-md">
              Rounded PNG
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDownloadIcon(512, "GooglePlay")}
            disabled={downloadingFormat !== null || !iconSrc || downloadingFavicon}
            className="h-9 gap-1 text-[11px] font-semibold rounded-xl cursor-pointer border-border"
          >
            {downloadingFormat === "GooglePlay" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5 text-[#FF6B00]" />
            )}
            <span className="truncate">Google Play (512px)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDownloadIcon(1024, "AppStore")}
            disabled={downloadingFormat !== null || !iconSrc || downloadingFavicon}
            className="h-9 gap-1 text-[11px] font-semibold rounded-xl cursor-pointer border-border"
          >
            {downloadingFormat === "AppStore" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5 text-[#FF6B00]" />
            )}
            <span className="truncate">App Store (1024px)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadFaviconBundle}
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

        <Button
          type="button"
          size="lg"
          onClick={onSaveAndApply}
          disabled={isApplying || !iconSrc}
          className="w-full h-10.5 gap-2 text-xs font-bold rounded-xl bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white shadow-xs cursor-pointer transition-colors"
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
  );
});
