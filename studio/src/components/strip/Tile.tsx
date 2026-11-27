import { Check, Download, Loader2, Plus, Sparkles, Upload, X } from "lucide-react";
import type React from "react";
import { memo, type ReactNode, type RefObject, useRef, useState } from "react";

export const Tile = memo(function Tile({
  width,
  height,
  bad,
  badReason,
  onOpen,
  onDelete,
  onReplace,
  isReplacing,
  onDownload,
  isDownloading,
  onAiCopy,
  sceneId,
  transitionName,
  draggable,
  isSelected,
  onToggleSelect,
  children,
}: {
  width: number;
  height: number;
  bad: boolean;
  badReason?: string;
  onOpen: () => void;
  onDelete?: () => void;
  onReplace?: (file: File) => void;
  isReplacing?: boolean;
  onDownload?: () => void;
  isDownloading?: boolean;
  onAiCopy?: () => void;
  sceneId?: string;
  transitionName?: string;
  draggable: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  children: ReactNode;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReplace) {
      onReplace(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop target container
    <div
      className={`group relative transition-all rounded-2xl ${
        isDragOver ? "ring-4 ring-primary scale-[1.02] z-30" : ""
      }`}
      onDragEnter={(e) => {
        const hasFiles =
          e.dataTransfer &&
          Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files");
        if (hasFiles) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }
      }}
      onDragOver={(e) => {
        const hasFiles =
          e.dataTransfer &&
          Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files");
        if (hasFiles) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        const hasFiles =
          e.dataTransfer &&
          Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files");
        if (hasFiles) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          let file: File | undefined = e.dataTransfer.files?.[0];
          if (!file && e.dataTransfer.items) {
            for (const item of Array.from(e.dataTransfer.items)) {
              const f = item.getAsFile();
              if (f) {
                file = f;
                break;
              }
            }
          }
          if (file && onReplace) {
            onReplace(file);
          }
        }
      }}
    >
      {onReplace ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}

      <button
        type="button"
        aria-label={
          draggable ? "Open full-size preview (drag to reorder)" : "Open full-size preview"
        }
        title={draggable ? "Drag to reorder" : undefined}
        onClick={onOpen}
        className={`tile-shadow relative block w-full overflow-hidden rounded-2xl bg-neutral-200 ring-1 transition-[transform,box-shadow,--tw-ring-color] duration-150 select-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none dark:bg-neutral-800 ${
          isSelected
            ? "ring-2 ring-[#FF6B00] ring-offset-2 ring-offset-background shadow-md shadow-[#FF6B00]/15"
            : "ring-black/10 hover:ring-black/25 dark:ring-white/10 dark:hover:ring-white/30"
        } ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        style={{ aspectRatio: `${width} / ${height}`, viewTransitionName: transitionName }}
      >
        {children}
      </button>

      {onToggleSelect && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`absolute top-2 left-2 z-30 flex size-6 cursor-pointer items-center justify-center rounded-lg border shadow-md backdrop-blur-md transition-all ${
            isSelected
              ? "bg-[#FF6B00] border-[#FF6B00] text-white opacity-100 scale-100 ring-2 ring-black/20"
              : "bg-background/85 border-border/90 text-transparent opacity-0 group-hover:opacity-100 hover:border-[#FF6B00] hover:text-muted-foreground"
          }`}
          aria-label={isSelected ? "Deselect screenshot" : "Select screenshot"}
          title={isSelected ? "Deselect screenshot" : "Select screenshot"}
        >
          <Check className="size-3.5 stroke-[3]" />
        </button>
      ) : null}

      {onReplace && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="absolute -top-2 -left-2 z-30 flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
          aria-label={sceneId ? `Replace screenshot for ${sceneId}` : "Replace screenshot"}
          title={sceneId ? `Replace screenshot for "${sceneId}"` : "Replace screenshot"}
        >
          <Upload className="size-3.5" strokeWidth={2.5} />
        </button>
      ) : null}

      {onDelete && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 z-30 flex size-6 cursor-pointer items-center justify-center rounded-full bg-destructive text-white shadow-md ring-2 ring-background transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
          aria-label={sceneId ? `Remove screenshot for ${sceneId}` : "Remove screenshot"}
          title={sceneId ? `Remove screenshot for "${sceneId}"` : "Remove screenshot"}
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      ) : null}

      {onDownload && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          disabled={isDownloading}
          className="absolute bottom-2 right-2 z-30 flex size-7 cursor-pointer items-center justify-center rounded-full bg-background/90 text-foreground border border-border/80 shadow-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 disabled:opacity-50"
          aria-label={sceneId ? `Download screenshot for ${sceneId}` : "Download screenshot"}
          title={sceneId ? `Download screenshot for "${sceneId}"` : "Download screenshot"}
        >
          {isDownloading ? (
            <Loader2 className="size-3.5 text-primary animate-spin" />
          ) : (
            <Download className="size-3.5" strokeWidth={2} />
          )}
        </button>
      ) : null}

      {onAiCopy && !isReplacing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAiCopy();
          }}
          className="absolute bottom-2 left-2 z-30 flex items-center gap-1.5 rounded-full bg-[#FF6B00] text-white hover:bg-[#FF8A00] active:bg-[#e05f00] border border-white/20 px-2.5 py-1 text-[10px] font-semibold shadow-md shadow-[#FF6B00]/20 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label={sceneId ? `AI Copy for ${sceneId}` : "AI Copy"}
          title={sceneId ? `AI Copy Assistant for "${sceneId}"` : "AI Copy Assistant"}
        >
          <Sparkles className="size-3 text-[#FFB21A]" />
          <span>AI Copy</span>
        </button>
      ) : null}

      {isDragOver ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-primary/20 backdrop-blur-xs ring-2 ring-primary ring-offset-2">
          <Upload className="size-8 text-primary animate-bounce" strokeWidth={2.5} />
          <span className="mt-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-semibold text-primary shadow-xs">
            Drop to replace {sceneId ?? "screenshot"}
          </span>
        </div>
      ) : null}

      {isReplacing ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-xs ring-1 ring-primary/30">
          <Loader2 className="size-7 text-primary animate-spin" />
          <span className="mt-2 text-xs font-medium text-foreground">
            Updating {sceneId ?? "screenshot"}…
          </span>
        </div>
      ) : null}

      {bad ? (
        <p className="pt-2 text-center text-[11px] font-medium text-destructive">{badReason}</p>
      ) : null}
    </div>
  );
});

export const ImportTileCard = memo(function ImportTileCard({
  nextIndex,
  width,
  height,
  isImporting,
  importDragOver,
  importInputRef,
  onDragOverChange,
  onImportFiles,
}: {
  nextIndex: number;
  width: number;
  height: number;
  isImporting: boolean;
  importDragOver: boolean;
  importInputRef: RefObject<HTMLInputElement | null>;
  onDragOverChange: (over: boolean) => void;
  onImportFiles: (files: FileList | File[]) => void;
}) {
  return (
    <li key="import-card" className="flex flex-col gap-1.5 w-full list-none">
      <div className="flex items-center justify-between px-0.5 text-xs select-none h-7">
        <span className="text-[10px] font-bold font-mono tracking-wider text-muted-foreground/60 px-1.5 py-0.5 rounded-md bg-muted/40 border border-border/40">
          #{nextIndex}
        </span>
        <span className="text-[10px] text-muted-foreground/60 font-medium">Add Screen</span>
      </div>

      <button
        type="button"
        aria-label="Import or add screenshots"
        onClick={() => importInputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          onDragOverChange(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOverChange(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOverChange(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOverChange(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onImportFiles(e.dataTransfer.files);
          }
        }}
        style={{ aspectRatio: `${width} / ${height}` }}
        className={`relative flex flex-col items-center justify-center gap-3.5 p-4 sm:p-6 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center select-none group shadow-2xs w-full ${
          importDragOver
            ? "border-[#FF6B00] bg-[#FF6B00]/15 ring-4 ring-[#FF6B00]/25 scale-[1.02]"
            : "border-border/80 hover:border-[#FF6B00] bg-card/40 hover:bg-[#FF6B00]/5 hover:shadow-md hover:shadow-[#FF6B00]/10 hover:-translate-y-0.5"
        }`}
      >
        <input
          ref={importInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onImportFiles(e.target.files);
            }
          }}
        />

        {isImporting ? (
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 className="size-10 sm:size-12 animate-spin text-[#FF6B00]" />
            <span className="text-xs font-semibold text-foreground">Importing images...</span>
            <span className="text-[10px] text-muted-foreground">Please wait a moment</span>
          </div>
        ) : (
          <>
            <div className="size-16 sm:size-20 rounded-full border-2 border-dashed border-border group-hover:border-[#FF6B00] bg-background/80 group-hover:bg-[#FF6B00]/15 flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-xs">
              <Plus className="size-8 sm:size-10 text-muted-foreground group-hover:text-[#FF6B00] transition-colors stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-[#FF6B00] transition-colors tracking-tight">
                Import
              </span>
              <span className="text-[11px] text-muted-foreground font-medium max-w-[150px] leading-snug">
                Drag & drop or click to add screenshot
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-muted/80 text-muted-foreground/80 border border-border/50 group-hover:border-[#FF6B00]/40 group-hover:text-[#FF6B00] transition-colors">
              PNG &bull; JPG &bull; WebP
            </span>
          </>
        )}
      </button>
    </li>
  );
});
