import {
  CheckIcon,
  CopyIcon,
  ImagePlusIcon,
  Loader2Icon,
  type LucideIcon,
  SmartphoneIcon,
  TabletIcon,
  UploadCloudIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";

function hasFiles(types: readonly string[] | DOMStringList | null | undefined): boolean {
  if (!types) return false;
  return Array.from(types).some((t) => t.toLowerCase() === "files");
}

/**
 * Centered stage placeholder when there are no screenshots yet.
 * Provides a prominent interactive drag & drop dropzone, auto-resolution guidance,
 * direct file upload button, target device mode selector, and copyable CLI command.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  command,
  deviceKey,
  platform: _platform,
  appName,
  onImportSuccess,
}: {
  icon: LucideIcon;
  title: string;
  body?: ReactNode;
  command?: string;
  deviceKey?: string;
  platform?: "ios" | "ipad" | "android";
  appName?: string;
  onImportSuccess?: (result: {
    targetDevice: string;
    targetPlatform: "ios" | "ipad" | "android";
    imported: number;
  }) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<"current" | "auto" | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (
    file: File,
  ): Promise<{ name: string; dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        let resolved = false;

        // Safety timeout so decode never hangs indefinitely
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ name: file.name, dataUrl, width: 0, height: 0 });
          }
        }, 1000);

        img.onload = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              name: file.name,
              dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
        };
        img.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ name: file.name, dataUrl, width: 0, height: 0 });
          }
        };
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(f.name),
    );
    if (validFiles.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const filePayloads = await Promise.all(validFiles.map((file) => readFileAsDataUrl(file)));

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filePayloads,
          preferredDevice: deviceKey,
          targetMode,
          autoRoute: targetMode === "auto",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      const result = (await response.json()) as {
        ok: boolean;
        imported: number;
        devices: string[];
        targetDevice: string;
        targetPlatform: "ios" | "ipad" | "android";
      };

      if (onImportSuccess) {
        onImportSuccess(result);
      } else {
        if (appName && result.targetPlatform && result.targetDevice) {
          const key = `appassets.view.${appName}`;
          const current =
            localStorage.getItem(key) || localStorage.getItem(`goldie.view.${appName}`);
          const parsed = current ? JSON.parse(current) : {};
          localStorage.setItem(
            key,
            JSON.stringify({
              ...parsed,
              platform: result.targetPlatform,
              device: result.targetDevice,
            }),
          );
        }
        sessionStorage.setItem(
          "appassets_toast",
          `✨ Successfully imported ${result.imported || filePayloads.length} screenshot(s) into ${result.targetDevice || deviceKey || "device"}!`,
        );
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import images");
      setLoading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles: File[] = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      droppedFiles.push(...Array.from(e.dataTransfer.files));
    } else if (e.dataTransfer.items) {
      for (const item of Array.from(e.dataTransfer.items)) {
        const f = item.getAsFile();
        if (f) droppedFiles.push(f);
      }
    }
    if (droppedFiles.length > 0) {
      uploadFiles(droppedFiles);
    }
  };

  return (
    <div className="grid h-full place-items-center px-6 py-10 text-center">
      <div className="flex w-full max-w-xl flex-col items-center">
        {/* Header Icon & Title */}
        <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-border/80 bg-background text-primary shadow-sm">
          <Icon className="size-6 text-primary" strokeWidth={2} aria-hidden />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        {body ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
        ) : null}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Target Destination Selector Pills */}
        <div className="mt-4 flex items-center justify-center gap-1 rounded-full border border-border/80 bg-muted/60 p-1 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setTargetMode("all")}
            className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
              targetMode === "all"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "hover:text-foreground"
            }`}
          >
            All Devices (Default)
          </button>
          {deviceKey ? (
            <button
              type="button"
              onClick={() => setTargetMode("current")}
              className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
                targetMode === "current"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              Current Device Only
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setTargetMode("auto")}
            className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
              targetMode === "auto"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "hover:text-foreground"
            }`}
          >
            Auto-detect by Size
          </button>
        </div>

        {/* Prominent Drag & Drop Dropzone Box */}
        {/* biome-ignore lint/a11y/useSemanticElements: custom dropzone container */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !loading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            if (hasFiles(e.dataTransfer.types)) {
              e.preventDefault();
              setIsDragOver(true);
            }
          }}
          onDragOver={(e) => {
            if (hasFiles(e.dataTransfer.types)) {
              e.preventDefault();
              setIsDragOver(true);
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={handleDrop}
          className={`mt-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 transition-all ${
            isDragOver
              ? "border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]"
              : "border-border/80 bg-card/60 hover:border-primary/60 hover:bg-card/90 shadow-xs"
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2Icon className="size-10 animate-spin text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">Importing screenshots…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {targetMode === "current"
                  ? `Routing directly to ${deviceKey}`
                  : targetMode === "all"
                    ? "Applying to all configured devices"
                    : "Auto-detecting screen resolutions and framing"}
              </p>
            </div>
          ) : (
            <>
              <div
                className={`flex size-14 items-center justify-center rounded-2xl transition-colors ${
                  isDragOver
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary group-hover:bg-primary/15"
                }`}
              >
                <UploadCloudIcon className="size-7" strokeWidth={2} />
              </div>

              <p className="mt-4 text-base font-semibold text-foreground">
                Drag & drop screenshots here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click anywhere in this card to browse files (PNG, JPEG, WebP)
              </p>

              {/* Supported Platforms / Auto-Resolution Badges */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground">
                  <SmartphoneIcon className="size-3 text-muted-foreground" />
                  iPhone (1320×2868)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground">
                  <TabletIcon className="size-3 text-muted-foreground" />
                  iPad Pro (2064×2752)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground">
                  <SmartphoneIcon className="size-3 text-muted-foreground" />
                  Android (1080×1920)
                </span>
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                className="mt-5 cursor-pointer gap-2 shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <ImagePlusIcon className="size-4" />
                Choose Screenshots
              </Button>
            </>
          )}
        </div>

        {error ? <p className="mt-3 text-xs font-medium text-destructive">{error}</p> : null}

        {/* CLI Alternative */}
        {command ? (
          <div className="mt-6 flex flex-col items-center">
            <span className="text-xs text-muted-foreground/70">
              — or capture automatically with simulator —
            </span>
            <CommandChip command={command} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The command to run next, with a copy button that flashes a check. */
function CommandChip({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-border/80 bg-background py-1 pr-1 pl-3 shadow-xs">
      <code className="font-mono text-xs text-foreground">{command}</code>
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-green-500" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
