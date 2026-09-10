import { Check, Paintbrush, RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export const SCENE_BG_PRESETS = [
  // Clean Solids
  "#FFFFFF",
  "#0E1B2A",
  "#0A0A0C",
  "#1E3A8A",
  "#065F46",
  "#7F1D1D",
  // Sleek Modern Gradients
  "linear-gradient(160deg, #E8F1FF 0%, #F7FAFF 55%, #FFFFFF 100%)",
  "linear-gradient(160deg, #0EA5E9 0%, #2563EB 100%)",
  "linear-gradient(160deg, #6366F1 0%, #A855F7 100%)",
  "linear-gradient(160deg, #F97316 0%, #DC2626 100%)",
  "linear-gradient(160deg, #059669 0%, #065F46 100%)",
  "linear-gradient(160deg, #1E293B 0%, #0F172A 100%)",
  "linear-gradient(160deg, #8B5CF6 0%, #4C1D95 100%)",
  "linear-gradient(160deg, #EC4899 0%, #BE185D 100%)",
  "linear-gradient(160deg, #F8FAFC 0%, #E2E8F0 100%)",
];

export function SceneBackgroundPopover({
  value,
  globalBackground,
  onChange,
  trigger,
  side = "top",
  align = "center",
  sceneName,
}: {
  value?: string;
  globalBackground: string;
  onChange: (bg: string | undefined) => void;
  trigger?: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sceneName?: string;
}) {
  const [open, setOpen] = useState(false);
  const isOverridden = Boolean(value);
  const currentBg = value || globalBackground;
  const [inputVal, setInputVal] = useState(value ?? "");

  useEffect(() => {
    setInputVal(value ?? "");
  }, [value]);

  const handleSelect = (bg: string) => {
    setInputVal(bg);
    onChange(bg);
  };

  const handleReset = () => {
    setInputVal("");
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`h-7 px-2 gap-1.5 rounded-lg text-[11px] font-medium border shadow-2xs cursor-pointer transition-all ${
              isOverridden
                ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                : "border-border/80 bg-background/90 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className="size-3.5 rounded-full border border-black/20 dark:border-white/20 shadow-2xs shrink-0"
              style={{ background: currentBg }}
            />
            <span>{isOverridden ? "Custom BG" : "BG"}</span>
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        className="w-72 p-3.5 shadow-2xl rounded-2xl border border-border/80 bg-popover text-foreground z-50 select-none"
      >
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Paintbrush className="size-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-foreground">
                {sceneName ? `${sceneName} Background` : "Scene Background"}
              </span>
            </div>

            {isOverridden ? (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="size-2.5" />
                <span>Reset</span>
              </button>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted">
                Inherits Global
              </span>
            )}
          </div>

          {/* Current Swatch Display */}
          <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-2 text-xs">
            <div
              className="size-8 rounded-lg border border-black/15 dark:border-white/15 shadow-xs shrink-0"
              style={{ background: currentBg }}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-medium truncate">
                {isOverridden ? "Custom Slide Background" : "Default Theme Background"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                {currentBg}
              </span>
            </div>
          </div>

          {/* Preset Swatches */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Presets & Gradients
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {SCENE_BG_PRESETS.map((preset, idx) => {
                const isSelected = value === preset || (!value && globalBackground === preset);
                return (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: preset list is static
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(preset)}
                    className={`group relative h-7 w-full rounded-md border transition-transform hover:scale-105 cursor-pointer shadow-2xs ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 ring-offset-1"
                        : "border-black/10 dark:border-white/10 hover:border-foreground/30"
                    }`}
                    style={{ background: preset }}
                    title={preset}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check className="size-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Picker & Text Input */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Custom Hex or Gradient
            </span>
            <div className="flex items-center gap-2">
              <label
                className="relative size-8 cursor-pointer rounded-lg border border-border overflow-hidden shrink-0 shadow-2xs hover:border-primary/50 transition-colors"
                title="Pick solid color"
              >
                <input
                  type="color"
                  value={currentBg.startsWith("#") ? currentBg : "#FFFFFF"}
                  onChange={(e) => handleSelect(e.target.value.toUpperCase())}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <span className="absolute inset-0" style={{ background: currentBg }} />
              </label>

              <Input
                value={inputVal}
                placeholder="e.g. #0E1B2A or linear-gradient(...)"
                onChange={(e) => {
                  const val = e.target.value;
                  setInputVal(val);
                  onChange(val || undefined);
                }}
                className="h-8 text-[11px] font-mono"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
