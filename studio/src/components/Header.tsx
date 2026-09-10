import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderArchive,
  Layers,
  Loader2Icon,
  MoonIcon,
  Package,
  Smartphone,
  SunIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CUSTOM_TEMPLATE } from "../App";
import { fontKey, type StoreManifest } from "../manifest";
import { ImportButton } from "./ImportButton";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function Header({
  manifest,
  dark,
  onDark,
  hasScreenshots,
  background,
  frame,
  fontFamily,
  template,
  layout,
  screenOnly,
  fontSizeScale,
  viewMode = "editor",
  onViewModeChange,
  onSaveDesign,
}: {
  manifest: StoreManifest;
  dark: boolean;
  onDark: (v: boolean) => void;
  hasScreenshots: boolean;
  background: string;
  frame: string;
  fontFamily: string;
  template: string;
  layout: string;
  screenOnly: boolean;
  fontSizeScale?: number;
  viewMode?: "editor" | "store";
  onViewModeChange?: (mode: "editor" | "store") => void;
  onSaveDesign?: () => Promise<void>;
}) {
  const [clearing, setClearing] = useState(false);

  // Export pipeline state
  const [exportBusy, setExportBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<string>("");
  const [exportCompleted, setExportCompleted] = useState(false);
  const [exportLog, setExportLog] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the log changes
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [exportLog]);

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to remove all screenshots?")) return;
    setClearing(true);
    try {
      const res = await fetch("/api/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to remove screenshots");
        setClearing(false);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove screenshots");
      setClearing(false);
    }
  };

  function parseProgress(text: string) {
    if (text.includes("[done]")) {
      setExportProgress(100);
      setExportStage("Packaging complete! Store-ready ZIP downloaded.");
      return;
    }
    if (text.includes("$ zip store package") || text.includes("$ zip")) {
      setExportProgress(88);
      setExportStage("Packaging App Store & Google Play ZIP package...");
      return;
    }
    if (text.includes("$ appassets manifest") || text.includes("$ goldie manifest")) {
      setExportProgress(75);
      setExportStage("Updating store manifest metadata...");
      return;
    }
    if (text.includes("$ appassets preview") || text.includes("$ goldie preview")) {
      setExportProgress(55);
      setExportStage("Checking preview video clips...");
      return;
    }
    if (text.includes("$ appassets frame") || text.includes("$ goldie frame")) {
      const frameMatches = text.match(/frame\s+[\w-]+/g);
      const count = frameMatches ? frameMatches.length : 1;
      setExportProgress(Math.min(50, 15 + count * 8));
      setExportStage(`Framing screenshots (${count} processed)...`);
      return;
    }
    setExportProgress(10);
    setExportStage("Preparing rendering engine...");
  }

  async function exportZip() {
    if (exportBusy) return;
    setExportBusy(true);
    setExportCompleted(false);
    setExportProgress(5);
    setExportStage("Saving latest studio design...");
    setExportLog("");
    setPopoverOpen(true);
    let text = "";

    try {
      if (onSaveDesign) {
        await onSaveDesign().catch(() => {});
      }
      setExportProgress(12);
      setExportStage("Starting store export engine...");

      const font = fontKey(manifest.design, fontFamily);
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background,
          frame,
          font,
          template: template === CUSTOM_TEMPLATE ? undefined : template || "none",
          layout,
          screenOnly,
          fontSizeScale,
        }),
      });

      if (!res.ok || !res.body) {
        setExportLog(`${res.status}: ${await res.text()}`);
        setExportStage("Export failed");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setExportLog(text);
        parseProgress(text);
      }

      if (text.includes("[done]")) {
        setExportCompleted(true);
        const appName = manifest.app?.name?.replace(/[^\w.-]/g, "_") || "AppAssets";
        const downloadUrl = `/api/export/download?filename=${encodeURIComponent(`${appName}-store-package.zip`)}`;
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${appName}-store-package.zip`;
        a.click();
      }
    } catch (err) {
      setExportLog(`${text}\n${err instanceof Error ? err.message : err}`);
      setExportStage("Export encountered an error");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/85 px-6 backdrop-blur-md select-none text-foreground z-30">
      {/* Brand & Theme Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <div className="flex items-center text-lg font-bold tracking-tight leading-tight">
            <span className="text-foreground">App</span>
            <span className="text-amber-500">Assets</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-normal leading-tight mt-0.5">
            Beautiful screenshots for the App Store
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onDark(!dark)}
          aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"}
          className="size-8.5 rounded-full border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </Button>
      </div>

      {/* Center: View Switcher (Studio Canvas vs Store Preview) */}
      <div className="flex items-center gap-1 rounded-xl bg-muted/60 dark:bg-muted/40 p-1 border border-border/60 shadow-2xs">
        <button
          type="button"
          onClick={() => onViewModeChange?.("editor")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            viewMode === "editor"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
          }`}
        >
          <Layers className="size-3.5" />
          <span className="hidden sm:inline">Studio Canvas</span>
          <span className="sm:hidden">Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange?.("store")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            viewMode === "store"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
          }`}
        >
          <Smartphone className="size-3.5 text-blue-500" />
          <span className="hidden sm:inline">Store Preview</span>
          <span className="sm:hidden">Store</span>
          <span className="ml-0.5 rounded-full bg-blue-500/15 px-1.5 py-0.2 text-[9px] font-bold text-blue-600 dark:text-blue-400">
            Live
          </span>
        </button>
      </div>

      {/* Action Buttons: Import, Remove All, Export Screenshots */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* 1. Import screenshots */}
        <ImportButton
          wrapperClassName="shrink-0"
          className="h-9 px-3.5 gap-2 text-xs sm:text-sm font-medium rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground shadow-xs cursor-pointer transition-colors"
          label="Import screenshots"
        />

        {/* 2. Remove all */}
        <Button
          type="button"
          variant="outline"
          onClick={handleClearAll}
          disabled={clearing || !hasScreenshots}
          title={hasScreenshots ? "Remove all screenshots" : "No screenshots to remove"}
          className="h-9 px-3.5 gap-2 text-xs sm:text-sm font-medium rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/25 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? (
            <Loader2Icon className="size-4 animate-spin text-red-600 dark:text-red-400" />
          ) : (
            <Trash2 className="size-4 text-red-600 dark:text-red-400" />
          )}
          <span>{clearing ? "Removing all..." : "Remove all"}</span>
        </Button>

        {/* 3. Export Store Package (.ZIP) */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              className="h-9 px-4 gap-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/20 cursor-pointer transition-all disabled:opacity-85"
              onClick={() => {
                if (!exportBusy) {
                  void exportZip();
                } else {
                  setPopoverOpen(true);
                }
              }}
            >
              {exportBusy ? (
                <>
                  <Loader2Icon className="size-4 animate-spin text-white" />
                  <span>Exporting ({exportProgress}%)</span>
                </>
              ) : exportCompleted ? (
                <>
                  <FolderArchive className="size-4 text-white" />
                  <span>Download ZIP Again</span>
                </>
              ) : (
                <>
                  <Package className="size-4 text-white" />
                  <span>Export All (.ZIP)</span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-84 sm:w-92 p-4 shadow-2xl rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  {exportCompleted ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : exportBusy ? (
                    <Loader2Icon className="size-3.5 animate-spin text-blue-500" />
                  ) : (
                    <Package className="size-4 text-blue-500" />
                  )}
                  {exportCompleted
                    ? "Store Package Ready!"
                    : exportBusy
                      ? "Packaging Store Assets..."
                      : "One-Click Store Export"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground font-medium">
                  {exportProgress}%
                </span>
              </div>

              {/* Target Stores Breakdown Box */}
              <div className="flex flex-col gap-1.5 rounded-xl border border-border/50 bg-muted/40 p-2.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground flex items-center gap-1">
                    🍏 App Store
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    iPhone 6.9" &bull; iPad 13"
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground flex items-center gap-1">
                    🤖 Google Play
                  </span>
                  <span className="text-muted-foreground text-[10px]">Phone (1080×1920)</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="size-3" /> Store Guidelines Included
                  </span>
                  <span className="font-mono text-[9px] bg-background/80 px-1 py-0.5 rounded border border-border/50">
                    STORE_GUIDE.txt
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>

              {exportStage && (
                <p className="text-[11px] text-muted-foreground truncate font-medium">
                  {exportStage}
                </p>
              )}

              {/* Error Banner */}
              {exportLog !== null && !exportBusy && !exportCompleted && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <p className="font-semibold">Export encountered an issue</p>
                  <pre className="mt-1 max-h-24 overflow-auto font-mono text-[10px] whitespace-pre-wrap">
                    {exportLog}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              {!exportBusy && (
                <div className="flex flex-col gap-2 pt-1">
                  {exportCompleted ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const appName = manifest.app?.name?.replace(/[^\w.-]/g, "_") || "AppAssets";
                        const downloadUrl = `/api/export/download?filename=${encodeURIComponent(`${appName}-store-package.zip`)}`;
                        const a = document.createElement("a");
                        a.href = downloadUrl;
                        a.download = `${appName}-store-package.zip`;
                        a.click();
                      }}
                      className="h-8.5 text-xs font-semibold gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                      <FolderArchive className="size-3.5" />
                      <span>Download {manifest.app?.name || "App"} ZIP</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void exportZip()}
                      className="h-8.5 text-xs font-semibold gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                      <Package className="size-3.5" />
                      <span>Generate Store Package</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Collapsible Terminal Output */}
              {exportLog && (
                <div className="flex flex-col gap-1 border-t border-border/40 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLog(!showLog)}
                    className="flex items-center justify-between text-[11px] text-muted-foreground/80 hover:text-foreground cursor-pointer"
                  >
                    <span>Terminal output</span>
                    {showLog ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                  {showLog && (
                    <pre
                      ref={logRef}
                      className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-black/60 p-2 font-mono text-[10px] leading-relaxed text-neutral-200"
                    >
                      {exportLog}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Thin animated progress indicator under the header when exporting */}
      {exportBusy && (
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-blue-500 transition-all duration-300"
          style={{ width: `${exportProgress}%` }}
        />
      )}
    </header>
  );
}
