import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DownloadIcon,
  FolderArchive,
  Loader2Icon,
  MoonIcon,
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
    if (text.includes("$ zip")) {
      setExportProgress(85);
      setExportStage("Creating App Store & Google Play ZIP package...");
      return;
    }
    if (text.includes("$ appassets preview") || text.includes("$ goldie preview")) {
      setExportProgress(60);
      setExportStage("Processing preview videos...");
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
    setExportStage("Starting export pipeline...");
    setExportLog("");
    setPopoverOpen(true);
    let text = "";

    try {
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
        const a = document.createElement("a");
        a.href = "/api/export/download";
        a.download = "AppAssets-export.zip";
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

        {/* 3. Export Screenshots */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              className="h-9 px-4 gap-2 text-xs sm:text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/20 cursor-pointer transition-colors disabled:opacity-85"
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
                  <span>Re-download ZIP</span>
                </>
              ) : (
                <>
                  <DownloadIcon className="size-4 text-white" />
                  <span>Export Screenshots</span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" sideOffset={8} className="w-80 p-4 shadow-xl">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  {exportCompleted ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : exportBusy ? (
                    <Loader2Icon className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <DownloadIcon className="size-4 text-primary" />
                  )}
                  {exportCompleted
                    ? "Export Complete"
                    : exportBusy
                      ? "Exporting Package..."
                      : "Export Store Assets"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {exportProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>

              {exportStage && (
                <p className="text-[11px] text-muted-foreground truncate">{exportStage}</p>
              )}

              {/* Error Banner */}
              {exportLog !== null && !exportBusy && !exportCompleted && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <p className="font-medium">Export failed</p>
                  <pre className="mt-1 max-h-24 overflow-auto font-mono text-[10px] whitespace-pre-wrap">
                    {exportLog}
                  </pre>
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
                      className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-black/50 p-2 font-mono text-[10px] leading-relaxed text-neutral-200"
                    >
                      {exportLog}
                    </pre>
                  )}
                </div>
              )}

              {exportCompleted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/api/export/download";
                    a.download = "AppAssets-export.zip";
                    a.click();
                  }}
                  className="h-8 text-xs gap-1.5 w-full"
                >
                  <FolderArchive className="size-3.5" />
                  <span>Download ZIP Again</span>
                </Button>
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
