import { CheckIcon, RotateCcw } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  CHECKERBOARD,
  isLight,
  SHADE_STEPS,
  TAILWIND,
  TEXT_COLORS,
  TRANSPARENT,
} from "./palettes";

const swatchClass =
  "swatch-edge relative aspect-square w-full rounded-lg transition-[transform,box-shadow] duration-150 hover:scale-[1.04] focus-visible:outline-none";

export function SelectedMark({ dark }: { dark: boolean }) {
  return (
    <span
      className={`absolute right-1 bottom-1 grid size-3.5 place-items-center rounded-full ${
        dark ? "bg-black/70 text-white" : "bg-white/90 text-black"
      }`}
    >
      <CheckIcon className="size-2.5" strokeWidth={3} />
    </span>
  );
}

export const Swatch = memo(function Swatch({
  name,
  css,
  selected,
  onClick,
}: {
  name: string;
  css: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={selected}
      onClick={onClick}
      style={{ background: css === TRANSPARENT ? CHECKERBOARD : css }}
      className={`${swatchClass} ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-sidebar" : "focus-visible:ring-2 focus-visible:ring-ring"}`}
    >
      {selected ? <SelectedMark dark={isLight(css)} /> : null}
    </button>
  );
});

export const ShadeSwatch = memo(function ShadeSwatch({
  name,
  css,
  family,
  background,
  onChange,
}: {
  name: string;
  css: string;
  family: string;
  background: string;
  onChange: (css: string) => void;
}) {
  const shades = TAILWIND[family] ?? [];
  const [open, setOpen] = useState(false);
  const selected = background === css;
  const familyLabel = `${family[0].toUpperCase()}${family.slice(1)}`;

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={350} closeDelay={200}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          title={name}
          aria-label={name}
          aria-pressed={selected}
          onClick={() => (selected ? setOpen(true) : onChange(css))}
          style={{ background: css }}
          className={`${swatchClass} ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-sidebar" : "focus-visible:ring-2 focus-visible:ring-ring"}`}
        >
          {selected ? <SelectedMark dark={isLight(css)} /> : null}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="center"
        sideOffset={4}
        collisionPadding={12}
        className="w-auto rounded-lg p-1"
      >
        <div className="flex overflow-hidden rounded-md">
          {shades.map((hex, i) => {
            const label = `${familyLabel} ${SHADE_STEPS[i]}`;
            const on = background.toUpperCase() === hex;
            return (
              <button
                key={hex}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={on}
                onClick={() => onChange(hex)}
                style={{ background: hex }}
                className="grid h-7 w-6 place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {on ? (
                  <span
                    className={`size-1.5 rounded-full ${isLight(hex) ? "bg-black/70" : "bg-white/90"}`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

export const ColorField = memo(function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = (raw: string) => {
    const hex = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex.toUpperCase());
    else setText(value);
  };
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      {label}
      <span className="flex items-center gap-1.5">
        <span className="relative size-8 shrink-0 overflow-hidden rounded-md swatch-edge">
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            aria-label={`${label} color`}
            value={value}
            onChange={(e) => {
              setText(e.target.value.toUpperCase());
              onChange(e.target.value.toUpperCase());
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <Input
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-8 font-mono text-xs uppercase"
        />
      </span>
    </label>
  );
});

export const CustomBackground = memo(function CustomBackground({
  background,
  solid,
  selected,
  onChange,
}: {
  background: string;
  solid: boolean;
  selected: boolean;
  onChange: (css: string) => void;
}) {
  const hexes = background.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const [from, setFrom] = useState(hexes[0] ?? "#E8F1FF");
  const [to, setTo] = useState(hexes[hexes.length - 1] ?? "#FFFFFF");
  const [angle, setAngle] = useState(Number(background.match(/(\d+)deg/)?.[1] ?? 160));
  const css = (f: string, t: string, a: number) =>
    f.toLowerCase() === t.toLowerCase() ? f : `linear-gradient(${a}deg, ${f} 0%, ${t} 100%)`;
  const apply = (f: string, t: string, a: number) => {
    setFrom(f);
    setTo(t);
    setAngle(a);
    onChange(solid ? f : css(f, t, a));
  };
  const preview = solid ? from : css(from, to, angle);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Custom"
          aria-label="Custom background"
          aria-pressed={selected}
          style={{ background: selected ? background : preview }}
          className={`${swatchClass} ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-sidebar" : "focus-visible:ring-2 focus-visible:ring-ring"}`}
        >
          <span className="absolute inset-0 grid place-items-center rounded-lg bg-[conic-gradient(from_180deg,#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa,#f87171)] opacity-90 [mask:radial-gradient(circle,transparent_38%,black_40%)]" />
          {selected ? <SelectedMark dark={isLight(background)} /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={12}
        collisionPadding={12}
        className="w-60"
      >
        <div className="flex flex-col gap-3">
          <div
            className="swatch-edge h-12 w-full rounded-lg"
            style={{ background: preview }}
            aria-hidden
          />
          {solid ? (
            <ColorField label="Color" value={from} onChange={(c) => apply(c, to, angle)} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <ColorField label="From" value={from} onChange={(c) => apply(c, to, angle)} />
                <ColorField label="To" value={to} onChange={(c) => apply(from, c, angle)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Angle</span>
                  <span className="tabular-nums">{angle}°</span>
                </div>
                <Slider
                  aria-label="Gradient angle"
                  min={0}
                  max={360}
                  value={[angle]}
                  onValueChange={([a]) => apply(from, to, a ?? angle)}
                />
              </div>
            </>
          )}
          {!selected ? (
            <button
              type="button"
              onClick={() => onChange(preview)}
              className="h-8 rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Use this background
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
});

export const FrameOption = memo(function FrameOption({
  label,
  tint,
  selected,
  onClick,
}: {
  label: string;
  tint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors ${
        selected ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/60"
      }`}
    >
      <span
        aria-hidden
        className="swatch-edge size-4 shrink-0 rounded-full"
        style={{
          background: tint ?? "repeating-conic-gradient(#999 0 25%, #ddd 0 50%) 0 0/6px 6px",
        }}
      />
      <span className="flex-1 truncate">{label}</span>
      {selected ? <CheckIcon className="size-4 text-primary" /> : null}
    </button>
  );
});

export const TextColorPicker = memo(function TextColorPicker({
  label,
  value,
  onChange,
  defaultHint = "Auto",
}: {
  label: string;
  value?: string;
  onChange: (c: string) => void;
  defaultHint?: string;
}) {
  const isCustom = Boolean(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        {isCustom ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
            title="Reset to automatic color"
          >
            <RotateCcw className="size-2.5" />
            Reset ({defaultHint})
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">{defaultHint}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {TEXT_COLORS.map((tc) => {
          const selected = value?.toUpperCase() === tc.hex;
          return (
            <button
              key={tc.hex}
              type="button"
              title={`${tc.name} (${tc.hex})`}
              aria-label={tc.name}
              onClick={() => onChange(tc.hex)}
              className={`size-6 rounded-full border border-border/80 transition-transform duration-100 hover:scale-110 relative grid place-items-center cursor-pointer ${
                selected ? "ring-2 ring-primary ring-offset-1 ring-offset-sidebar" : ""
              }`}
              style={{ background: tc.hex }}
            >
              {selected ? (
                <CheckIcon
                  className={`size-3 ${isLight(tc.hex) ? "text-black" : "text-white"}`}
                  strokeWidth={3}
                />
              ) : null}
            </button>
          );
        })}
        <label
          title="Custom color"
          className="relative size-6 shrink-0 cursor-pointer rounded-full border border-dashed border-muted-foreground/60 grid place-items-center hover:scale-110 transition-transform overflow-hidden"
          style={{ background: isCustom ? value : "transparent" }}
        >
          <input
            type="color"
            value={value || "#0E1B2A"}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          {!isCustom ? <span className="text-[9px] font-bold text-muted-foreground">+</span> : null}
        </label>
      </div>
    </div>
  );
});
