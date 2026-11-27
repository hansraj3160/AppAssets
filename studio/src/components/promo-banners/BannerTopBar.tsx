import { Check, Copy, Download, Loader2 } from "lucide-react";
import { memo } from "react";
import { Button } from "../ui/button";
import { BANNER_FORMATS, type BannerFormat, type BannerFormatMeta } from "./presets";

export interface BannerTopBarProps {
  selectedFormat: BannerFormat;
  activeFormat: BannerFormatMeta;
  exportResolution: "1x" | "2x";
  copied: boolean;
  isDownloading: boolean;
  onSelectFormat: (format: BannerFormat) => void;
  onSelectResolution: (res: "1x" | "2x") => void;
  onCopyClipboard: () => void;
  onDownload: () => void;
}

export const BannerTopBar = memo(function BannerTopBar({
  selectedFormat,
  activeFormat,
  exportResolution,
  copied,
  isDownloading,
  onSelectFormat,
  onSelectResolution,
  onCopyClipboard,
  onDownload,
}: BannerTopBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-6 py-2.5 backdrop-blur-md">
      {/* Left Format Tabs */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5">
        {BANNER_FORMATS.map((fmt) => (
          <button
            key={fmt.key}
            type="button"
            onClick={() => onSelectFormat(fmt.key)}
            className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer select-none ${
              selectedFormat === fmt.key
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>{fmt.shortLabel || fmt.label}</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md font-normal ${
                selectedFormat === fmt.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/80 text-muted-foreground border border-border/50"
              }`}
            >
              {fmt.width}×{fmt.height}
            </span>
            {fmt.badge ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  selectedFormat === fmt.key
                    ? "bg-primary-foreground/25 text-primary-foreground"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}
              >
                {fmt.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Right Actions: Resolution, Copy, Download */}
      <div className="flex shrink-0 items-center gap-2 ml-auto">
        <div className="flex items-center rounded-lg bg-muted/80 p-0.5 border border-border/80 shrink-0 h-7.5">
          <button
            type="button"
            onClick={() => onSelectResolution("1x")}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              exportResolution === "1x"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Store Spec: exact 1024×500 with 2x SSAA downsampling for Google Play Console"
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => onSelectResolution("2x")}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              exportResolution === "2x"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Ultra HD Retina: 2048×1000 crystal clear for marketing and presentations"
          >
            2x
          </button>
        </div>

        <div className="h-4 w-px bg-border/70 mx-0.5 shrink-0" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopyClipboard}
          className="h-7.5 gap-1.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer border-border/80 bg-background/80 hover:bg-muted whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy Image</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onDownload}
          disabled={isDownloading}
          className="h-7.5 gap-1.3 px-1 rounded-lg text-xs font-semibold cursor-pointer bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white shadow-xs shadow-[#FF6B00]/20 whitespace-nowrap shrink-0"
        >
          {isDownloading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          <span>Download PNG</span>
          <span className="font-mono text-[10px] opacity-80 font-normal">
            ({exportResolution === "2x" ? activeFormat.width * 2 : activeFormat.width}×
            {exportResolution === "2x" ? activeFormat.height * 2 : activeFormat.height})
          </span>
        </Button>
      </div>
    </div>
  );
});
