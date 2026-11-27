import { Check, Download, FolderArchive, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { memo } from "react";
import type { DeviceEntry } from "../../manifest";
import { Button } from "../ui/button";

export const StripHeaderToolbar = memo(function StripHeaderToolbar({
  selectedCount,
  isAllSelected,
  isImporting,
  isSyncing,
  isBulkDownloading,
  bulkMode,
  bulkDownloadProgress,
  tileSpec,
  onToggleSelectAll,
  onClearSelection,
  onImportClick,
  onSyncCaptures,
  onDownloadSelectedPngs,
  onDownloadSelectedZip,
}: {
  selectedCount: number;
  isAllSelected: boolean;
  isImporting: boolean;
  isSyncing: boolean;
  isBulkDownloading: boolean;
  bulkMode: "png" | "zip" | null;
  bulkDownloadProgress: number;
  tileSpec: DeviceEntry;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onImportClick: () => void;
  onSyncCaptures: () => void;
  onDownloadSelectedPngs: () => void;
  onDownloadSelectedZip: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 text-xs select-none">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            selectedCount > 0
              ? "border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00]"
              : "border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <div
            className={`size-3.5 rounded flex items-center justify-center border transition-all ${
              isAllSelected
                ? "bg-[#FF6B00] border-[#FF6B00] text-white"
                : selectedCount > 0
                  ? "bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]"
                  : "border-muted-foreground/50 bg-transparent text-transparent"
            }`}
          >
            <Check className="size-2.5 stroke-[3]" />
          </div>
          <span>
            {isAllSelected
              ? "All Selected"
              : selectedCount > 0
                ? `${selectedCount} Selected`
                : "Select All"}
          </span>
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer underline px-1"
          >
            Clear
          </button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onImportClick}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSyncCaptures}
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
                {tileSpec.platform === "android" || tileSpec.platform === "ipad"
                  ? "Sync from iPhone"
                  : "Sync to Android/iPad"}
              </span>
            </>
          )}
        </Button>

        {tileSpec.key === "iphone-6.9" && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>6.3" · 1206 × 2622 px (App Store Required)</span>
          </span>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 animate-in fade-in duration-150">
          <Button
            size="sm"
            onClick={onDownloadSelectedPngs}
            disabled={isBulkDownloading}
            className="h-7 text-xs px-2.5 gap-1.5 bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-medium cursor-pointer shadow-2xs"
          >
            {isBulkDownloading && bulkMode === "png" ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>
                  ({bulkDownloadProgress}/{selectedCount})
                </span>
              </>
            ) : (
              <>
                <Download className="size-3" />
                <span>Download PNGs ({selectedCount})</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadSelectedZip}
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
  );
});

export const FloatingSelectionBar = memo(function FloatingSelectionBar({
  selectedCount,
  isAllSelected,
  isBulkDownloading,
  bulkMode,
  bulkDownloadProgress,
  onToggleSelectAll,
  onDownloadSelectedPngs,
  onDownloadSelectedZip,
  onClearSelection,
}: {
  selectedCount: number;
  isAllSelected: boolean;
  isBulkDownloading: boolean;
  bulkMode: "png" | "zip" | null;
  bulkDownloadProgress: number;
  onToggleSelectAll: () => void;
  onDownloadSelectedPngs: () => void;
  onDownloadSelectedZip: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 px-3.5 py-2.5 rounded-2xl bg-card/95 border border-border shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200 text-foreground">
      <div className="flex items-center gap-2 pr-2 border-r border-border">
        <span className="size-2 rounded-full bg-[#FF6B00] animate-pulse" />
        <span className="text-xs font-semibold whitespace-nowrap">
          {selectedCount} {selectedCount === 1 ? "Slide" : "Slides"} Selected
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSelectAll}
        className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        {isAllSelected ? "Deselect All" : "Select All"}
      </Button>

      <Button
        size="sm"
        onClick={onDownloadSelectedPngs}
        disabled={isBulkDownloading}
        className="h-8 text-xs px-3 gap-1.5 bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-medium cursor-pointer shadow-xs"
        title="Download selected screenshots as PNG files"
      >
        {isBulkDownloading && bulkMode === "png" ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>
              Downloading ({bulkDownloadProgress}/{selectedCount})...
            </span>
          </>
        ) : (
          <>
            <Download className="size-3.5" />
            <span>Download PNGs ({selectedCount})</span>
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onDownloadSelectedZip}
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
        onClick={onClearSelection}
        className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors ml-1"
        title="Clear selection"
        aria-label="Clear selection"
      >
        <X className="size-4" />
      </button>
    </div>
  );
});
