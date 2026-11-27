import { ChevronLeft, ChevronRight, Download, Loader2, Sparkles, X } from "lucide-react";
import { memo, useEffect } from "react";
import type { Design } from "../../manifest";
import { BadgePickerPopover } from "../BadgePickerPopover";
import { layoutOptions } from "../design-panel/palettes";
import { SceneBackgroundPopover } from "../SceneBackgroundPopover";
import { Select } from "../Sidebar";
import { Button } from "../ui/button";
import type { BadgeConfig, StripEntry } from "./helpers";

/** Round arrow floating over the strip's edge, like the store carousel's. */
export const PagerButton = memo(function PagerButton({
  side,
  label,
  disabled,
  onClick,
  inset = false,
}: {
  side: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
  inset?: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  const offset = inset
    ? side === "left"
      ? "left-4"
      : "right-4"
    : side === "left"
      ? "-left-5"
      : "-right-5";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-popover shadow-md transition-none hover:bg-popover focus-visible:ring-0 active:not-aria-[haspopup]:-translate-y-1/2 ${offset}`}
    >
      <Icon />
    </Button>
  );
});

/**
 * Full-viewport view of one tile: the same composition, rendered as large as
 * the window allows at the spec's aspect ratio.
 */
export const Lightbox = memo(function Lightbox({
  entry,
  layouts,
  index,
  count,
  globalBackground,
  sceneBackground,
  onSceneBackground,
  badge,
  onSceneBadge,
  onDownload,
  isDownloading,
  onAiCopy,
  onClose,
  onStep,
}: {
  entry: StripEntry;
  layouts: Design["layouts"];
  index: number;
  count: number;
  globalBackground: string;
  sceneBackground?: string;
  onSceneBackground?: (bg: string | undefined) => void;
  badge?: BadgeConfig;
  onSceneBadge?: (badge: BadgeConfig | undefined) => void;
  onDownload?: () => void;
  isDownloading?: boolean;
  onAiCopy?: () => void;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onStep(-1);
      else if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot preview"
      className="animate-in fade-in fixed inset-0 z-50 flex duration-150 flex-col items-center justify-center gap-3 bg-black/80 p-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
        style={{
          viewTransitionName: "lightbox-scene",
          aspectRatio: `${entry.width} / ${entry.height}`,
          flexShrink: 0,
          width: `min(calc(100vw - 4rem), calc((100vh - 7.5rem) * ${entry.width / entry.height}))`,
        }}
      >
        {entry.scene(true)}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-neutral-300">
        {entry.layout ? (
          <div className="dark w-44 text-foreground">
            <Select
              value={entry.layout.value ?? ""}
              onChange={(v) => entry.layout?.onChange(v || undefined)}
              options={[
                [
                  "",
                  `Default (${layouts.find((l) => l.key === entry.layout?.defaultKey)?.label ?? entry.layout.defaultKey})`,
                ],
                ...layoutOptions(layouts),
              ]}
            />
          </div>
        ) : null}
        {entry.key !== "preview" && entry.targetSceneId ? (
          <>
            <SceneBackgroundPopover
              value={sceneBackground}
              globalBackground={globalBackground}
              onChange={onSceneBackground ?? (() => {})}
            />
            <BadgePickerPopover badge={badge} onChange={onSceneBadge ?? (() => {})} />
          </>
        ) : null}
        {entry.key !== "preview" && onAiCopy ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5 rounded-lg border-indigo-400/40 bg-indigo-500/20 text-xs text-white backdrop-blur-md hover:bg-indigo-500/30 hover:text-white shadow-sm"
            onClick={onAiCopy}
          >
            <Sparkles className="size-3.5 text-indigo-300" />
            AI Copy
          </Button>
        ) : null}
        {entry.key !== "preview" && onDownload ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloading}
            className="cursor-pointer gap-1.5 rounded-lg border-white/20 bg-white/10 text-xs text-white backdrop-blur-md hover:bg-white/20 hover:text-white disabled:opacity-50"
            onClick={onDownload}
          >
            {isDownloading ? (
              <Loader2 className="size-3.5 text-white animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Download PNG
          </Button>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Close"
        className="absolute top-4 right-4 rounded-full"
        onClick={onClose}
      >
        <X />
      </Button>
      {count > 1 ? (
        <>
          <PagerButton
            side="left"
            label="Previous"
            disabled={index === 0}
            onClick={() => onStep(-1)}
            inset
          />
          <PagerButton
            side="right"
            label="Next"
            disabled={index === count - 1}
            onClick={() => onStep(1)}
            inset
          />
        </>
      ) : null}
    </div>
  );
});
