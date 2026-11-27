import { CheckIcon, Palette, SunMedium, Trash2, Upload } from "lucide-react";
import { memo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BacklightConfig, PatternType } from "../../../../src/background";
import type { Design } from "../../manifest";
import { Field } from "../Sidebar";
import { SidebarSection } from "../SidebarSection";
import {
  AURORA_SWATCHES,
  backgroundName,
  FRAME_META,
  GRADIENTS,
  SOLIDS,
  TRANSPARENT,
} from "./palettes";
import { CustomBackground, FrameOption, ShadeSwatch, Swatch } from "./Swatches";

interface BackgroundSectionProps {
  design: Design;
  deviceFrame: boolean;
  background: string;
  frame: string;
  screenOnly: boolean;
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
  onBackground: (v: string) => void;
  onFrame: (v: string) => void;
  onScreenOnly: (v: boolean) => void;
  onBackgroundPattern?: (v: PatternType) => void;
  onPatternOpacity?: (v: number) => void;
  onPatternColor?: (v: string) => void;
  onDeviceBacklight?: (v: boolean | BacklightConfig) => void;
  onPanoramaMode?: (v: boolean) => void;
}

export const BackgroundSection = memo(function BackgroundSection({
  design,
  deviceFrame,
  background,
  frame,
  screenOnly,
  backgroundPattern = "none",
  patternOpacity = 0.05,
  patternColor,
  deviceBacklight = false,
  panoramaMode = false,
  onBackground,
  onFrame,
  onScreenOnly,
  onBackgroundPattern,
  onPatternOpacity,
  onPatternColor,
  onDeviceBacklight,
  onPanoramaMode,
}: BackgroundSectionProps) {
  const bgName = backgroundName(background);
  const [backgroundTab, setBackgroundTab] = useState(() => {
    if (
      background.startsWith("data:image/") ||
      background.startsWith("url(") ||
      background.startsWith("http")
    ) {
      return "image";
    }
    if (background.includes("radial-gradient")) {
      return "aurora";
    }
    if (background.startsWith("#")) {
      return "solids";
    }
    return "gradients";
  });

  const frameChoices: Array<[string, string]> = [
    ...design.frameVariants.map((v): [string, string] => [v, FRAME_META[v]?.label ?? v]),
    ...(design.frameVariant === null ? [["", "Custom (from config)"] as [string, string]] : []),
  ];
  const showFrames =
    !screenOnly &&
    !deviceFrame &&
    (design.frameVariants.length > 1 || design.frameVariant === null);

  return (
    <SidebarSection
      id="bg-frame"
      icon={Palette}
      title="Background & Frame"
      summary={`${bgName ?? "Custom"} · ${screenOnly ? "Screen only" : (FRAME_META[frame]?.label ?? "Bezel")}`}
      defaultOpen={false}
    >
      <div className="flex flex-col gap-4">
        <Field label="Background" hint={bgName ?? "Custom"}>
          <Tabs value={backgroundTab} onValueChange={setBackgroundTab}>
            <TabsList className="grid grid-cols-5 w-full h-8 text-[11px] p-0.5">
              <TabsTrigger value="gradients" className="px-1 py-1 text-[11px]">
                Gradients
              </TabsTrigger>
              <TabsTrigger value="aurora" className="px-1 py-1 text-[11px]">
                Aurora
              </TabsTrigger>
              <TabsTrigger value="tech-grids" className="px-1 py-1 text-[11px]">
                Grids
              </TabsTrigger>
              <TabsTrigger value="solids" className="px-1 py-1 text-[11px]">
                Solids
              </TabsTrigger>
              <TabsTrigger value="image" className="px-1 py-1 text-[11px]">
                Image
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {backgroundTab === "gradients" && (
            <div className="grid grid-cols-6 gap-1.5 mt-2">
              {GRADIENTS.map((p) => (
                <Swatch
                  key={p.name}
                  name={p.name}
                  css={p.css}
                  selected={background === p.css}
                  onClick={() => onBackground(p.css)}
                />
              ))}
              <Swatch
                name="Transparent"
                css={TRANSPARENT}
                selected={background === TRANSPARENT}
                onClick={() => onBackground(TRANSPARENT)}
              />
              <CustomBackground
                background={background}
                solid={false}
                selected={
                  !bgName &&
                  !background.startsWith("data:image/") &&
                  !background.startsWith("url(") &&
                  !background.includes("radial-gradient")
                }
                onChange={onBackground}
              />
            </div>
          )}

          {backgroundTab === "aurora" && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="grid grid-cols-3 gap-2">
                {AURORA_SWATCHES.map((swatch) => {
                  const selected = background === swatch.css;
                  return (
                    <button
                      key={swatch.name}
                      type="button"
                      onClick={() => onBackground(swatch.css)}
                      className={cn(
                        "group relative flex flex-col items-start gap-1.5 rounded-xl border p-2 text-left transition-all duration-150 cursor-pointer overflow-hidden",
                        selected
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                          : "border-border/70 bg-card/60 hover:border-primary/40 hover:bg-card",
                      )}
                    >
                      <div
                        className="h-10 w-full rounded-lg border border-black/10 dark:border-white/10 shadow-2xs relative overflow-hidden"
                        style={{ background: swatch.css }}
                      >
                        {selected && (
                          <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs">
                            <CheckIcon className="size-2.5" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-foreground/90 truncate w-full">
                        {swatch.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SunMedium className="size-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      Phone Backlight Halo
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(deviceBacklight)}
                    onClick={() => {
                      if (deviceBacklight) {
                        onDeviceBacklight?.(false);
                      } else {
                        onDeviceBacklight?.({ enabled: true, color: "#38BDF8", intensity: 0.45 });
                      }
                    }}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      deviceBacklight ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                        deviceBacklight ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
                {deviceBacklight ? (
                  <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Halo Tint</span>
                      <div className="flex items-center gap-1.5">
                        {["#38BDF8", "#818CF8", "#34D399", "#F472B6", "#FBBF24"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              const currentObj =
                                typeof deviceBacklight === "object" ? deviceBacklight : {};
                              onDeviceBacklight?.({ ...currentObj, enabled: true, color: c });
                            }}
                            className={cn(
                              "size-4 rounded-full border border-border/80 transition-transform hover:scale-110",
                              typeof deviceBacklight === "object" && deviceBacklight.color === c
                                ? "ring-2 ring-primary ring-offset-1 ring-offset-sidebar"
                                : "",
                            )}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Intensity</span>
                        <span>
                          {Math.round(
                            (typeof deviceBacklight === "object" &&
                            deviceBacklight.intensity !== undefined
                              ? deviceBacklight.intensity
                              : 0.45) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <Slider
                        min={10}
                        max={100}
                        step={5}
                        value={[
                          Math.round(
                            (typeof deviceBacklight === "object" &&
                            deviceBacklight.intensity !== undefined
                              ? deviceBacklight.intensity
                              : 0.45) * 100,
                          ),
                        ]}
                        onValueChange={([val]) => {
                          const currentObj =
                            typeof deviceBacklight === "object" ? deviceBacklight : {};
                          onDeviceBacklight?.({
                            ...currentObj,
                            enabled: true,
                            intensity: val / 100,
                          });
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {backgroundTab === "tech-grids" && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Grid Pattern Style
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "none" as const, label: "None" },
                    { id: "dot-grid" as const, label: "Micro Dot Grid" },
                    { id: "isometric-dot" as const, label: "Isometric Dots" },
                    { id: "blueprint" as const, label: "Blueprint Grid" },
                  ].map((pat) => {
                    const active = (backgroundPattern || "none") === pat.id;
                    return (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => onBackgroundPattern?.(pat.id)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                          active
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/70 bg-card/60 text-foreground/80 hover:bg-card hover:border-border",
                        )}
                      >
                        <span>{pat.label}</span>
                        {active && <CheckIcon className="size-3 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {backgroundPattern && backgroundPattern !== "none" ? (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Pattern Opacity</span>
                      <span>{Math.round((patternOpacity ?? 0.05) * 100)}%</span>
                    </div>
                    <Slider
                      min={2}
                      max={20}
                      step={1}
                      value={[Math.round((patternOpacity ?? 0.05) * 100)]}
                      onValueChange={([val]) => onPatternOpacity?.(val / 100)}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Pattern Color</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: "White", val: "rgba(255,255,255,0.7)" },
                        { name: "Cyan", val: "rgba(34,211,238,0.7)" },
                        { name: "Amber", val: "rgba(245,158,11,0.7)" },
                        { name: "Slate", val: "rgba(148,163,184,0.7)" },
                      ].map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          title={c.name}
                          onClick={() => onPatternColor?.(c.val)}
                          className={cn(
                            "size-4 rounded-full border border-border/80 transition-transform hover:scale-110",
                            patternColor === c.val
                              ? "ring-2 ring-primary ring-offset-1 ring-offset-sidebar"
                              : "",
                          )}
                          style={{ background: c.val }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">
                    Continuous Panorama Flow
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Spans background seamlessly across adjacent tiles
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(panoramaMode)}
                  onClick={() => onPanoramaMode?.(!panoramaMode)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    panoramaMode ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                      panoramaMode ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {backgroundTab === "solids" && (
            <div className="grid grid-cols-6 gap-1.5 mt-2">
              {SOLIDS.map((p) =>
                p.family ? (
                  <ShadeSwatch
                    key={p.name}
                    name={p.name}
                    css={p.css}
                    family={p.family}
                    background={background}
                    onChange={onBackground}
                  />
                ) : (
                  <Swatch
                    key={p.name}
                    name={p.name}
                    css={p.css}
                    selected={background === p.css}
                    onClick={() => onBackground(p.css)}
                  />
                ),
              )}
              <Swatch
                name="Transparent"
                css={TRANSPARENT}
                selected={background === TRANSPARENT}
                onClick={() => onBackground(TRANSPARENT)}
              />
              <CustomBackground
                background={background}
                solid={true}
                selected={!bgName && background.startsWith("#")}
                onChange={onBackground}
              />
            </div>
          )}

          {backgroundTab === "image" && (
            <div className="flex flex-col gap-3 mt-2">
              {background.startsWith("data:image/") ||
              background.startsWith("url(") ||
              background.startsWith("http") ? (
                <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Active Background Image
                    </span>
                    <button
                      type="button"
                      onClick={() => onBackground(GRADIENTS[0].css)}
                      className="flex items-center gap-1 text-[11px] text-destructive hover:underline cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                      Remove
                    </button>
                  </div>
                  <div
                    className="h-20 w-full rounded-lg border border-border overflow-hidden bg-muted/40 relative"
                    style={{
                      backgroundImage: background.startsWith("url(")
                        ? background
                        : `url("${background}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors">
                    <Upload className="size-6 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground">
                        Upload Background Image
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        PNG, JPG or WebP (processed locally)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            onBackground(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </Field>

        <div data-tour="device-frame">
          <Field label="Device Frame">
            <Tabs
              value={screenOnly ? "screen" : "bezel"}
              onValueChange={(v) => onScreenOnly(v === "screen")}
            >
              <TabsList className="w-full">
                <TabsTrigger value="bezel">Bezel</TabsTrigger>
                <TabsTrigger value="screen">Screen only</TabsTrigger>
              </TabsList>
            </Tabs>
            {showFrames ? (
              <div className="mt-2 flex flex-col gap-1 rounded-lg border border-border/50 bg-background/50 p-1.5">
                {frameChoices.map(([key, label]) => (
                  <FrameOption
                    key={key || "custom"}
                    label={label}
                    tint={FRAME_META[key]?.tint}
                    selected={frame === key}
                    onClick={() => onFrame(key)}
                  />
                ))}
              </div>
            ) : null}
          </Field>
        </div>
      </div>
    </SidebarSection>
  );
});
