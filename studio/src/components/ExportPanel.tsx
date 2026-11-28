import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DownloadIcon,
  FolderArchive,
  Loader2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CUSTOM_TEMPLATE } from "../lib/studioState";
import { trackAssetDownloaded, trackExport } from "../lib/analytics";
import { getSessionId } from "../lib/session";

/**
 * The Export panel re-renders framed screenshots and preview video with
 * the current design, builds store-ready App Store and Google Play packages,
 * and streams live progress and CLI logs to the browser.
 */
export function ExportPanel({
  background,
  frame,
  font,
  template,
  layout,
  screenOnly,
  fontSizeScale,
}: {
  background: string;
  frame: string;
  /** A --font key, or undefined to keep the config's font. */
  font: string | undefined;
  /** A built-in template key, "" for none, or the custom sentinel (left to the sidecar/config). */
  template: string;
  layout: string;
  screenOnly: boolean;
  fontSizeScale?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const logRef = useRef<HTMLPreElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the log text changes
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [log]);

  function parseProgress(text: string) {
    if (text.includes("[done]")) {
      setProgress(100);
      setStage("Packaging complete! Store-ready ZIP downloaded.");
      return;
    }
    if (text.includes("$ zip")) {
      setProgress(85);
      setStage("Creating App Store & Google Play ZIP package...");
      return;
    }
    if (text.includes("$ appassets preview") || text.includes("$ goldie preview")) {
      setProgress(60);
      setStage("Processing preview videos...");
      return;
    }
    if (text.includes("$ appassets frame") || text.includes("$ goldie frame")) {
      const frameMatches = text.match(/frame\s+[\w-]+/g);
      const count = frameMatches ? frameMatches.length : 1;
      setProgress(Math.min(50, 15 + count * 8));
      setStage(`Framing screenshots (${count} processed)...`);
      return;
    }
    setProgress(10);
    setStage("Preparing rendering engine...");
  }

  async function exportZip() {
    if (busy) return;
    setBusy(true);
    setCompleted(false);
    setProgress(5);
    setStage("Starting export pipeline...");
    setLog("");
    let text = "";

    trackExport("started", {
      export_type: "store_zip",
      template: template === CUSTOM_TEMPLATE ? "custom" : template || "none",
      frame,
      background,
    });

    try {
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
        setLog(`${res.status}: ${await res.text()}`);
        setStage("Export failed");
        trackExport("failed", {
          export_type: "store_zip",
          reason: `HTTP ${res.status}`,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setLog(text);
        parseProgress(text);
      }

      if (text.includes("[done]")) {
        setCompleted(true);
        trackExport("completed", {
          export_type: "store_zip",
          template: template === CUSTOM_TEMPLATE ? "custom" : template || "none",
        });
        trackAssetDownloaded({
          asset_type: "zip",
          file_name: "AppAssets-export.zip",
        });
        const a = document.createElement("a");
        a.href = `/api/export/download?filename=AppAssets-export.zip&sessionId=${encodeURIComponent(getSessionId())}`;
        a.download = "AppAssets-export.zip";
        a.click();
      }
    } catch (err) {
      setLog(`${text}\n${err instanceof Error ? err.message : err}`);
      setStage("Export encountered an error");
      trackExport("failed", {
        export_type: "store_zip",
        reason: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {busy || completed ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              {completed ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <Loader2Icon className="size-3.5 animate-spin text-primary" />
              )}
              {completed ? "Export Complete" : "Exporting..."}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[11px] text-muted-foreground truncate">{stage}</p>

          {/* Collapsible CLI Log */}
          {log ? (
            <div className="mt-1 flex flex-col gap-1 border-t border-border/40 pt-1.5">
              <button
                type="button"
                onClick={() => setShowLog(!showLog)}
                className="flex items-center justify-between text-[11px] text-muted-foreground/80 hover:text-foreground cursor-pointer"
              >
                <span>Terminal output</span>
                {showLog ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
              {showLog ? (
                <pre
                  ref={logRef}
                  className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-neutral-300"
                >
                  {log}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {log !== null && !busy && !completed ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <p className="font-medium">Export failed.</p>
          <pre className="mt-1 max-h-24 overflow-auto font-mono text-[10px] whitespace-pre-wrap">
            {log}
          </pre>
        </div>
      ) : null}

      <Button
        size="lg"
        className="w-full cursor-pointer gap-2"
        onClick={() => void exportZip()}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Rendering Assets...
          </>
        ) : completed ? (
          <>
            <FolderArchive className="size-4" />
            Re-download Store ZIP
          </>
        ) : (
          <>
            <DownloadIcon className="size-4" />
            Export Store Screenshots
          </>
        )}
      </Button>
    </div>
  );
}
