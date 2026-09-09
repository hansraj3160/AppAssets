import { Check, Palette, Sparkles, Tag, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BADGE_CATEGORIES,
  BADGE_COLOR_PALETTES,
  BADGE_PRESETS,
  type BadgeCategory,
  type BadgePosition,
  type BadgePreset,
} from "@/lib/badgePresets";
import { cn } from "@/lib/utils";

export type BadgeData = {
  text: string;
  position: BadgePosition;
  background?: string;
  color?: string;
  slice?: number;
};

export function BadgePickerPopover({
  badge,
  onChange,
  trigger,
  align = "center",
  side = "top",
}: {
  badge?: BadgeData;
  onChange: (b: BadgeData | undefined) => void;
  trigger?: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | "all">("all");
  const [text, setText] = useState(badge?.text ?? "");
  const [position, setPosition] = useState<BadgePosition>(badge?.position ?? "top-right");
  const [background, setBackground] = useState(badge?.background ?? "#1E293B");
  const [color, setColor] = useState(badge?.color ?? "#FBBF24");

  // Sync state when badge prop changes
  useEffect(() => {
    if (badge) {
      setText(badge.text);
      setPosition(badge.position);
      setBackground(badge.background ?? "#1E293B");
      setColor(badge.color ?? "#FBBF24");
    } else {
      setText("");
      setPosition("top-right");
      setBackground("#1E293B");
      setColor("#FBBF24");
    }
  }, [badge]);

  const filteredPresets =
    selectedCategory === "all"
      ? BADGE_PRESETS
      : BADGE_PRESETS.filter((p) => p.category === selectedCategory);

  const handleApplyPreset = (preset: BadgePreset) => {
    setText(preset.text);
    setBackground(preset.background);
    setColor(preset.color);
    setPosition(preset.position);
    // Directly apply preset to scene
    onChange({
      text: preset.text,
      position: preset.position,
      background: preset.background,
      color: preset.color,
      ...(badge?.slice !== undefined ? { slice: badge.slice } : {}),
    });
  };

  const handleApplyCustom = () => {
    if (!text.trim()) {
      onChange(undefined);
    } else {
      onChange({
        text: text.trim(),
        position,
        background,
        color,
        ...(badge?.slice !== undefined ? { slice: badge.slice } : {}),
      });
    }
    setOpen(false);
  };

  const handleRemove = () => {
    onChange(undefined);
    setText("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "cursor-pointer gap-1.5 rounded-lg border-white/20 text-xs text-white backdrop-blur-md transition-all",
              badge
                ? "bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30"
                : "bg-white/10 hover:bg-white/20 hover:text-white",
            )}
          >
            <Tag className="size-3.5 text-amber-400" />
            {badge ? `Badge: ${badge.text}` : "Add Badge"}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[340px] max-h-[540px] overflow-y-auto p-3.5 dark bg-popover text-foreground border-border/80 shadow-2xl rounded-xl z-50 flex flex-col gap-3.5"
      >
        {/* Header with Title & Live Preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-400" />
              <span className="text-xs font-semibold text-foreground">Store Badges & Stickers</span>
            </div>
            {badge ? (
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1 text-[11px] text-destructive hover:underline cursor-pointer"
              >
                <Trash2 className="size-3" />
                Remove
              </button>
            ) : null}
          </div>

          {/* Live Visual Pill Preview */}
          <div className="relative flex items-center justify-center p-3 rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
            <div
              style={{
                backgroundColor: background,
                color: color,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none drop-shadow-sm"
            >
              {text.trim() || "Preview Badge ★"}
            </div>
          </div>
        </div>

        {/* 1-Click Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {BADGE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-medium shrink-0 cursor-pointer transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 1-Click Presets Grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
            1-Click Store Presets
          </span>
          <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
            {filteredPresets.map((preset) => {
              const isActive =
                badge?.text === preset.text &&
                badge?.background === preset.background &&
                badge?.color === preset.color;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    "flex flex-col gap-1 p-2 rounded-lg border text-left transition-all cursor-pointer hover:border-primary/50 hover:bg-card/90",
                    isActive
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border/60 bg-card/40",
                  )}
                >
                  <div
                    style={{ backgroundColor: preset.background, color: preset.color }}
                    className="self-start px-2 py-0.5 rounded-full text-[10px] font-bold truncate max-w-full shadow-xs"
                  >
                    {preset.text}
                  </div>
                  {preset.tagline ? (
                    <span className="text-[9px] text-muted-foreground truncate">
                      {preset.tagline}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Text Field */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
            Badge Text / Copy
          </span>
          <Input
            value={text}
            placeholder="e.g. 4.9 ★, Editor's Choice 🏆"
            onChange={(e) => setText(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Position Selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
            Position on Screenshot
          </span>
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: "top-left", label: "Top Left ↖" },
                { id: "top-right", label: "Top Right ↗" },
                { id: "bottom-left", label: "Bottom Left ↙" },
                { id: "bottom-right", label: "Bottom Right ↘" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPosition(p.id)}
                className={cn(
                  "h-7 rounded-md border text-[10px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1",
                  position === p.id
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "border-border/70 hover:bg-accent text-muted-foreground hover:text-foreground",
                )}
              >
                {position === p.id && <Check className="size-2.5" />}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Palette Swatches & Custom Colors */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
              Pill Color Palette
            </span>
            <Palette className="size-3 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {BADGE_COLOR_PALETTES.map((pal) => (
              <button
                key={pal.name}
                type="button"
                onClick={() => {
                  setBackground(pal.bg);
                  setColor(pal.text);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-1.5 py-1 rounded border text-[9px] font-semibold cursor-pointer truncate transition-transform hover:scale-[1.02]",
                  background === pal.bg ? "ring-2 ring-primary border-primary" : "border-border/60",
                )}
                style={{ backgroundColor: pal.bg, color: pal.text }}
                title={pal.name}
              >
                <span className="truncate">{pal.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-border/40 text-[11px]">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Background</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={background.startsWith("#") ? background : "#1E293B"}
                  onChange={(e) => setBackground(e.target.value.toUpperCase())}
                  className="size-6 rounded border border-border cursor-pointer shrink-0"
                />
                <Input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-6 text-[10px] font-mono uppercase"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Text Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={color.startsWith("#") ? color : "#FFFFFF"}
                  onChange={(e) => setColor(e.target.value.toUpperCase())}
                  className="size-6 rounded border border-border cursor-pointer shrink-0"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-6 text-[10px] font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Apply Action Button */}
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs w-full cursor-pointer font-semibold shadow-xs"
          onClick={handleApplyCustom}
        >
          {badge ? "Update Badge" : "Apply Badge"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
