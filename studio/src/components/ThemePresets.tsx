import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemePreset = {
  id: string;
  name: string;
  tagline: string;
  background: string;
  frame: string;
  fontFamily: string;
  fontName: string;
  headlineColor: string;
  subheadColor: string;
  fontSizeScale: number;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "minimalist-tech",
    name: "Minimalist Tech",
    tagline: "Dark carbon & neon cyan",
    background: "linear-gradient(160deg, #0B0F19 0%, #111827 60%, #1E293B 100%)",
    frame: "17-pro-silver",
    fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    fontName: "SF Pro",
    headlineColor: "#38BDF8",
    subheadColor: "#94A3B8",
    fontSizeScale: 1,
  },
  {
    id: "fintech-crypto",
    name: "Fintech & Crypto",
    tagline: "Deep navy, emerald & gold",
    background: "linear-gradient(160deg, #0A192F 0%, #1E3A8A 55%, #0F172A 100%)",
    frame: "17-pro-orange",
    fontFamily: '"Montserrat", system-ui, sans-serif',
    fontName: "Montserrat",
    headlineColor: "#10B981",
    subheadColor: "#FDE047",
    fontSizeScale: 1,
  },
  {
    id: "health-fitness",
    name: "Health & Fitness",
    tagline: "High-energy coral sunset",
    background: "linear-gradient(160deg, #FB7185 0%, #F97316 50%, #EF4444 100%)",
    frame: "17-pro-orange",
    fontFamily: '"Montserrat", system-ui, sans-serif',
    fontName: "Montserrat",
    headlineColor: "#FFFFFF",
    subheadColor: "#FFF1F2",
    fontSizeScale: 1.15,
  },
  {
    id: "lifestyle-editorial",
    name: "Lifestyle & Editorial",
    tagline: "Warm cream & serif elegance",
    background: "linear-gradient(160deg, #FBF8F3 0%, #F5EFEB 60%, #EFE7DF 100%)",
    frame: "17-pro-silver",
    fontFamily: '"Merriweather", Georgia, serif',
    fontName: "Merriweather",
    headlineColor: "#1C1917",
    subheadColor: "#78716C",
    fontSizeScale: 1,
  },
  {
    id: "clean-classic",
    name: "Clean SaaS",
    tagline: "Arctic light & high contrast",
    background: "linear-gradient(160deg, #E8F1FF 0%, #F7FAFF 55%, #FFFFFF 100%)",
    frame: "17-pro-silver",
    fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    fontName: "SF Pro",
    headlineColor: "#0E1B2A",
    subheadColor: "#64748B",
    fontSizeScale: 1,
  },
];

export function ThemePresets({
  currentBackground,
  currentFrame,
  currentFontFamily,
  currentHeadlineColor,
  currentSubheadColor,
  onApplyPreset,
}: {
  currentBackground: string;
  currentFrame: string;
  currentFontFamily: string;
  currentHeadlineColor?: string;
  currentSubheadColor?: string;
  onApplyPreset: (preset: ThemePreset) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Apply store-tested visual palettes with 1-click. Fine-tune details below anytime.
      </p>

      <div className="grid grid-cols-1 gap-2">
        {THEME_PRESETS.map((preset) => {
          const isActive =
            currentBackground === preset.background &&
            currentFontFamily === preset.fontFamily &&
            currentFrame === preset.frame &&
            (currentHeadlineColor?.toUpperCase() === preset.headlineColor.toUpperCase() ||
              (!currentHeadlineColor && preset.headlineColor === "#0E1B2A")) &&
            (currentSubheadColor?.toUpperCase() === preset.subheadColor.toUpperCase() ||
              (!currentSubheadColor && preset.subheadColor === "#64748B"));

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className={cn(
                "group relative flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/60 p-2 transition-all duration-150 hover:border-primary/50 hover:bg-card hover:shadow-xs cursor-pointer text-left select-none",
                isActive && "ring-2 ring-primary border-primary bg-primary/5 shadow-xs",
              )}
            >
              {/* Mini Visual Gradient & Typography Strip Preview */}
              <div
                className="relative h-11 w-full rounded-lg overflow-hidden flex items-center justify-between px-3 border border-black/10 dark:border-white/10 shadow-2xs"
                style={{ background: preset.background }}
              >
                <div className="flex flex-col z-10">
                  <span
                    style={{ color: preset.headlineColor, fontFamily: preset.fontFamily }}
                    className="text-[11px] font-bold leading-tight drop-shadow-xs"
                  >
                    Headline
                  </span>
                  <span
                    style={{ color: preset.subheadColor, fontFamily: preset.fontFamily }}
                    className="text-[9px] font-medium leading-tight opacity-95"
                  >
                    Subheading copy
                  </span>
                </div>

                {/* Font Specimen Pill */}
                <span
                  style={{ fontFamily: preset.fontFamily }}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/35 text-white backdrop-blur-xs shadow-2xs"
                >
                  {preset.fontName}
                </span>
              </div>

              {/* Name & Tagline */}
              <div className="mt-1.5 flex items-center justify-between px-0.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{preset.tagline}</p>
                </div>

                {isActive && (
                  <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                    <Check className="size-2.5" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
