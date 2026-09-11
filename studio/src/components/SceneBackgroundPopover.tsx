import { Check, Paintbrush, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type BgCategory = "vibrant" | "light" | "dark" | "solids" | "builder";

export const BG_CATEGORIES: Record<
  Exclude<BgCategory, "builder">,
  { label: string; colors: string[] }
> = {
  vibrant: {
    label: "Vibrant & Gradients",
    colors: [
      "linear-gradient(160deg, #6366F1 0%, #A855F7 100%)", // Indigo Purple
      "linear-gradient(160deg, #4F46E5 0%, #7C3AED 100%)", // Deep Violet
      "linear-gradient(160deg, #0EA5E9 0%, #2563EB 100%)", // Ocean Blue
      "linear-gradient(160deg, #2563EB 0%, #1D4ED8 50%, #0F172A 100%)", // Royal Tech
      "linear-gradient(160deg, #06B6D4 0%, #0D9488 100%)", // Cyber Teal
      "linear-gradient(160deg, #10B981 0%, #047857 100%)", // Emerald FinTech
      "linear-gradient(160deg, #059669 0%, #065F46 100%)", // Forest Money
      "linear-gradient(160deg, #F97316 0%, #DC2626 100%)", // Sunset Orange
      "linear-gradient(160deg, #FB7185 0%, #F43F5E 50%, #E11D48 100%)", // Hot Coral
      "linear-gradient(160deg, #EC4899 0%, #BE185D 100%)", // Fuchsia Pink
      "linear-gradient(160deg, #8B5CF6 0%, #4C1D95 100%)", // Electric Lavender
      "linear-gradient(160deg, #F59E0B 0%, #D97706 100%)", // Gold Amber
      "linear-gradient(160deg, #14B8A6 0%, #0284C7 100%)", // Tropical Cyan
      "linear-gradient(160deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%)", // Neon Tri-Gradient
      "linear-gradient(160deg, #10B981 0%, #3B82F6 100%)", // Mint to Blue
    ],
  },
  light: {
    label: "Clean & Light",
    colors: [
      "#FFFFFF", // Pure White
      "#F8FAFC", // Off White Slate
      "#F1F5F9", // Soft Slate
      "#FAF7F2", // Warm Cream
      "#F5F5F7", // Apple Light Gray
      "linear-gradient(160deg, #E8F1FF 0%, #F7FAFF 55%, #FFFFFF 100%)", // Arctic Ice
      "linear-gradient(160deg, #F0F7FF 0%, #E0EEFE 100%)", // Sky Breeze
      "linear-gradient(160deg, #F5F3FF 0%, #EDE9FE 100%)", // Lilac Mist
      "linear-gradient(160deg, #F0FDF4 0%, #DCFCE7 100%)", // Fresh Mint
      "linear-gradient(160deg, #FFF7ED 0%, #FFEDD5 100%)", // Warm Peach
      "linear-gradient(160deg, #FFF1F2 0%, #FFE4E6 100%)", // Rose Tint
      "linear-gradient(160deg, #F8FAFC 0%, #E2E8F0 100%)", // Slate Gradient
    ],
  },
  dark: {
    label: "Dark & Stealth",
    colors: [
      "#000000", // True Pitch Black
      "#0A0A0C", // Obsidian Black
      "#0E1B2A", // Deep Navy Night
      "#0F172A", // Midnight Slate
      "#1E293B", // Dark Slate
      "linear-gradient(160deg, #0B0F19 0%, #111827 50%, #1E293B 100%)", // Minimalist Tech
      "linear-gradient(160deg, #0A192F 0%, #1E3A8A 55%, #0F172A 100%)", // Deep Fintech
      "linear-gradient(160deg, #1E1B4B 0%, #312E81 50%, #0F172A 100%)", // Night Indigo
      "linear-gradient(160deg, #064E3B 0%, #022C22 100%)", // Dark Emerald
      "linear-gradient(160deg, #450A0A 0%, #1C1917 100%)", // Deep Maroon
      "linear-gradient(160deg, #2E1065 0%, #0F172A 100%)", // Deep Royal Violet
      "linear-gradient(160deg, #18181B 0%, #09090B 100%)", // Space Gray
    ],
  },
  solids: {
    label: "Solid Colors",
    colors: [
      "#FFFFFF",
      "#0F172A",
      "#000000",
      "#1E293B",
      "#2563EB",
      "#0284C7",
      "#0D9488",
      "#059669",
      "#7C3AED",
      "#D97706",
      "#EA580C",
      "#DC2626",
    ],
  },
};

// Exported for backward compatibility
export const SCENE_BG_PRESETS: string[] = [
  ...BG_CATEGORIES.vibrant.colors.slice(0, 8),
  ...BG_CATEGORIES.light.colors.slice(0, 4),
  ...BG_CATEGORIES.dark.colors.slice(0, 4),
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
  const [activeTab, setActiveTab] = useState<BgCategory>("vibrant");

  // Gradient builder state
  const [gradStart, setGradStart] = useState("#4F46E5");
  const [gradEnd, setGradEnd] = useState("#7C3AED");
  const [gradAngle, setGradAngle] = useState(160);

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

  const handleApplyBuilder = () => {
    const built = `linear-gradient(${gradAngle}deg, ${gradStart} 0%, ${gradEnd} 100%)`;
    handleSelect(built);
  };

  const builtPreview = useMemo(() => {
    return `linear-gradient(${gradAngle}deg, ${gradStart} 0%, ${gradEnd} 100%)`;
  }, [gradAngle, gradStart, gradEnd]);

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
        className="w-80 p-3.5 shadow-2xl rounded-2xl border border-border/80 bg-popover text-foreground z-50 select-none"
      >
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Paintbrush className="size-3.5 text-blue-500" />
              <span className="text-xs font-bold text-foreground">
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
              <span className="text-[11px] font-semibold truncate">
                {isOverridden ? "Active Custom Background" : "Default Theme Background"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                {currentBg}
              </span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl border border-border/50 text-[10px] font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("vibrant")}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "vibrant"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vibrant
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("light")}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "light"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dark")}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "dark"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("solids")}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "solids"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Solids
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("builder")}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeTab === "builder"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wand2 className="size-2.5 text-amber-500" />
              <span>Builder</span>
            </button>
          </div>

          {/* Preset Swatches or Builder Tab */}
          {activeTab === "builder" ? (
            /* Custom 2-Color Gradient Builder */
            <div className="flex flex-col gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" />
                  <span>2-Color Gradient Creator</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{gradAngle}°</span>
              </div>

              {/* Live Preview */}
              <div
                className="h-10 w-full rounded-lg border border-border/70 shadow-inner flex items-center justify-center text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                style={{ background: builtPreview }}
              >
                Preview Gradient
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Start Color</span>
                  <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border/60">
                    <input
                      type="color"
                      value={gradStart}
                      onChange={(e) => setGradStart(e.target.value)}
                      className="size-6 rounded cursor-pointer border border-border/60 p-0 bg-transparent shrink-0"
                    />
                    <span className="text-[10px] font-mono uppercase">{gradStart}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">End Color</span>
                  <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border/60">
                    <input
                      type="color"
                      value={gradEnd}
                      onChange={(e) => setGradEnd(e.target.value)}
                      className="size-6 rounded cursor-pointer border border-border/60 p-0 bg-transparent shrink-0"
                    />
                    <span className="text-[10px] font-mono uppercase">{gradEnd}</span>
                  </div>
                </div>
              </div>

              {/* Angle selector pills */}
              <div className="flex items-center justify-between gap-1 pt-1">
                {[90, 135, 160, 180, 225].map((ang) => (
                  <button
                    key={ang}
                    type="button"
                    onClick={() => setGradAngle(ang)}
                    className={`flex-1 py-0.5 text-[9px] font-bold rounded cursor-pointer border ${
                      gradAngle === ang
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                    }`}
                  >
                    {ang}°
                  </button>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleApplyBuilder}
                className="w-full h-7 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
              >
                <Check className="size-3" />
                <span>Apply This Gradient</span>
              </Button>
            </div>
          ) : (
            /* Swatches Grid for selected category */
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>{BG_CATEGORIES[activeTab].label}</span>
                <span className="text-[9px] font-normal font-mono">
                  {BG_CATEGORIES[activeTab].colors.length} options
                </span>
              </span>
              <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {BG_CATEGORIES[activeTab].colors.map((preset, idx) => {
                  const isSelected = value === preset || (!value && globalBackground === preset);
                  return (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: preset list is static
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(preset)}
                      className={`group relative h-7 w-full rounded-lg border transition-transform hover:scale-105 cursor-pointer shadow-2xs ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 ring-offset-1"
                          : "border-black/15 dark:border-white/15 hover:border-foreground/30"
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
          )}

          {/* Custom Hex or CSS Gradient text input & solid color picker */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Custom Hex or CSS Gradient
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
                className="h-8 text-[11px] font-mono flex-1"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
