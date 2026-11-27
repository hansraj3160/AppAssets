import { Palette, Tag, Type } from "lucide-react";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Design } from "../../manifest";
import { type BadgeData, BadgePickerPopover } from "../BadgePickerPopover";
import { FontPicker } from "../FontPicker";
import { SceneBackgroundPopover } from "../SceneBackgroundPopover";
import { Field } from "../Sidebar";
import { SidebarSection } from "../SidebarSection";
import { SYSTEM_FONT } from "./palettes";
import { TextColorPicker } from "./Swatches";

export const TypographySection = memo(function TypographySection({
  design,
  fontFamily,
  fontSizeScale,
  headlineColor,
  subheadColor,
  onFontFamily,
  onFontSizeScale,
  onHeadlineColor,
  onSubheadColor,
}: {
  design: Design;
  fontFamily: string;
  fontSizeScale: number;
  headlineColor?: string;
  subheadColor?: string;
  onFontFamily: (v: string) => void;
  onFontSizeScale: (v: number) => void;
  onHeadlineColor: (v: string) => void;
  onSubheadColor: (v: string) => void;
}) {
  const fontOptions = useMemo(() => {
    const opts: Array<[string, string]> = [
      [SYSTEM_FONT, "System (SF Pro)"],
      ...design.fonts.map((f): [string, string] => [`"${f.family}", ${f.fallback}`, f.family]),
    ];
    if (!opts.some(([css]) => css === fontFamily)) {
      opts.push([fontFamily, "custom (from config)"]);
    }
    return opts;
  }, [design.fonts, fontFamily]);

  return (
    <SidebarSection
      id="typography"
      icon={Type}
      title="Typography & Colors"
      summary={`${fontFamily.split(",")[0]?.replace(/"/g, "") || "System"} · ${Math.round(fontSizeScale * 100)}%`}
      defaultOpen={false}
    >
      <div className="flex flex-col gap-4">
        <Field label="Font Family">
          <FontPicker value={fontFamily} onChange={onFontFamily} options={fontOptions} />
        </Field>

        <Field label="Font Size Scale">
          <Tabs value={String(fontSizeScale)} onValueChange={(v) => onFontSizeScale(Number(v))}>
            <TabsList className="w-full">
              <TabsTrigger value="0.85">Compact</TabsTrigger>
              <TabsTrigger value="1">Normal</TabsTrigger>
              <TabsTrigger value="1.15">Large</TabsTrigger>
            </TabsList>
          </Tabs>
        </Field>

        <Field label="Copy Colors" hint={headlineColor || subheadColor ? "Custom" : "Automatic"}>
          <div className="flex flex-col gap-2.5 rounded-lg border border-border/50 bg-background/50 p-2.5">
            <TextColorPicker
              label="Headline color"
              value={headlineColor}
              onChange={onHeadlineColor}
              defaultHint="Contrast with BG"
            />
            <TextColorPicker
              label="Subhead color"
              value={subheadColor}
              onChange={onSubheadColor}
              defaultHint="Muted"
            />
          </div>
        </Field>
      </div>
    </SidebarSection>
  );
});

export const StoreBadgesSection = memo(function StoreBadgesSection({
  design,
  background,
  sceneBadges,
  sceneBackgrounds,
  onSceneBadge,
  onSceneBackground,
}: {
  design: Design;
  background: string;
  sceneBadges?: Record<string, BadgeData>;
  sceneBackgrounds?: Record<string, string>;
  onSceneBadge?: (sceneId: string, badge: BadgeData | undefined) => void;
  onSceneBackground?: (sceneId: string, bg: string | undefined) => void;
}) {
  return (
    <SidebarSection
      id="store-badges"
      icon={Tag}
      title="Store Badges & Stickers"
      summary={
        (sceneBadges && Object.keys(sceneBadges).length > 0) ||
        (sceneBackgrounds && Object.keys(sceneBackgrounds).length > 0)
          ? `${Object.keys(sceneBadges ?? {}).length} badges · ${Object.keys(sceneBackgrounds ?? {}).length} custom BG`
          : "Trust & Awards"
      }
      defaultOpen={false}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Apply store-tested trust badges, awards, and custom per-scene backgrounds to any scene.
        </p>

        <div className="flex flex-col gap-2">
          {design.scenes.map((scene, idx) => {
            const badge = sceneBadges?.[scene.id] ?? sceneBadges?.[`${scene.id}#1`];
            const headlineSnippet =
              typeof scene.headline === "string"
                ? scene.headline
                : Object.values(scene.headline)[0] || `Scene ${idx + 1}`;

            return (
              <div
                key={scene.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border/70 bg-card/40 gap-2"
              >
                <div className="min-w-0 flex-1 flex flex-col">
                  <span className="text-[11px] font-semibold text-foreground truncate">
                    {headlineSnippet}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">{scene.id}</span>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <SceneBackgroundPopover
                    value={sceneBackgrounds?.[scene.id]}
                    globalBackground={background}
                    onChange={(bg) => onSceneBackground?.(scene.id, bg)}
                    side="left"
                    align="center"
                    sceneName={headlineSnippet}
                    trigger={
                      <button
                        type="button"
                        className="size-6 rounded-md border border-border/80 shadow-xs cursor-pointer hover:scale-105 transition-transform flex items-center justify-center p-0.5 relative overflow-hidden"
                        style={{
                          background: sceneBackgrounds?.[scene.id] || background,
                        }}
                        title={`Scene background: ${sceneBackgrounds?.[scene.id] ? "Custom override" : "Global theme"}`}
                      >
                        <Palette className="size-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                      </button>
                    }
                  />
                  {badge ? (
                    <BadgePickerPopover
                      badge={badge}
                      onChange={(b) => onSceneBadge?.(scene.id, b)}
                      side="left"
                      align="center"
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold max-w-[130px] truncate shadow-xs border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: badge.background, color: badge.color }}
                          title="Edit badge"
                        >
                          <span className="truncate">{badge.text}</span>
                        </button>
                      }
                    />
                  ) : (
                    <BadgePickerPopover
                      badge={undefined}
                      onChange={(b) => onSceneBadge?.(scene.id, b)}
                      side="left"
                      align="center"
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 cursor-pointer border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                        >
                          <Tag className="size-2.5 text-amber-500" />+ Badge
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SidebarSection>
  );
});
