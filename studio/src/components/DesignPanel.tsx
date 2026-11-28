import { LayoutTemplate, Sparkles } from "lucide-react";
import { memo, useCallback } from "react";
import type { BacklightConfig, PatternType } from "../../../src/background";
import { CUSTOM_TEMPLATE } from "../lib/studioState";
import type { Design } from "../manifest";
import type { BadgeData } from "./BadgePickerPopover";
import { BackgroundSection } from "./design-panel/BackgroundSection";
import { StoreBadgesSection, TypographySection } from "./design-panel/BadgesAndTypographySections";
import { layoutOptions } from "./design-panel/palettes";
import { Field, Select } from "./Sidebar";
import { SidebarSection } from "./SidebarSection";
import { TemplatePicker } from "./TemplatePicker";
import { THEME_PRESETS, ThemePresets } from "./ThemePresets";

export { CHECKERBOARD, layoutOptions, TRANSPARENT } from "./design-panel/palettes";

export interface DesignPanelProps {
  design: Design;
  /** The shown device brings its own bezel art (android), so the frame picker does not apply. */
  deviceFrame: boolean;
  background: string;
  frame: string;
  fontFamily: string;
  template: string;
  layout: string;
  screenOnly: boolean;
  headlineColor?: string;
  subheadColor?: string;
  fontSizeScale?: number;
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
  sceneBadges?: Record<string, BadgeData>;
  sceneBackgrounds?: Record<string, string>;
  onBackground: (v: string) => void;
  onFrame: (v: string) => void;
  onFontFamily: (v: string) => void;
  onTemplate: (v: string) => void;
  onLayout: (v: string) => void;
  onScreenOnly: (v: boolean) => void;
  onHeadlineColor: (v: string) => void;
  onSubheadColor: (v: string) => void;
  onFontSizeScale: (v: number) => void;
  onBackgroundPattern?: (v: PatternType) => void;
  onPatternOpacity?: (v: number) => void;
  onPatternColor?: (v: string) => void;
  onDeviceBacklight?: (v: boolean | BacklightConfig) => void;
  onPanoramaMode?: (v: boolean) => void;
  onSceneBadge?: (sceneId: string, badge: BadgeData | undefined) => void;
  onSceneBackground?: (sceneId: string, bg: string | undefined) => void;
}

/**
 * The design controls orchestrator: composes memoized subtrees for layout templates,
 * theme presets, backgrounds & device frames, typography & colors, and store badges.
 */
export const DesignPanel = memo(function DesignPanel({
  design,
  deviceFrame,
  background,
  frame,
  fontFamily,
  template,
  layout,
  screenOnly,
  headlineColor,
  subheadColor,
  fontSizeScale = 1,
  backgroundPattern = "none",
  patternOpacity = 0.05,
  patternColor,
  deviceBacklight = false,
  panoramaMode = false,
  onBackground,
  onFrame,
  onFontFamily,
  onTemplate,
  onLayout,
  onScreenOnly,
  onHeadlineColor,
  onSubheadColor,
  onFontSizeScale,
  onBackgroundPattern,
  onPatternOpacity,
  onPatternColor,
  onDeviceBacklight,
  onPanoramaMode,
  sceneBadges,
  onSceneBadge,
  sceneBackgrounds,
  onSceneBackground,
}: DesignPanelProps) {
  const handleApplyPreset = useCallback(
    (preset: (typeof THEME_PRESETS)[number]) => {
      onBackground(preset.background);
      onFrame(preset.frame);
      onFontFamily(preset.fontFamily);
      onHeadlineColor(preset.headlineColor);
      onSubheadColor(preset.subheadColor);
      onFontSizeScale(preset.fontSizeScale);
      if (onBackgroundPattern) onBackgroundPattern(preset.backgroundPattern ?? "none");
      if (onPatternOpacity && preset.patternOpacity !== undefined) {
        onPatternOpacity(preset.patternOpacity);
      }
      if (onDeviceBacklight) onDeviceBacklight(preset.deviceBacklight ?? false);
    },
    [
      onBackground,
      onFrame,
      onFontFamily,
      onHeadlineColor,
      onSubheadColor,
      onFontSizeScale,
      onBackgroundPattern,
      onPatternOpacity,
      onDeviceBacklight,
    ],
  );

  return (
    <div className="flex flex-col gap-3">
      <SidebarSection
        id="layout-templates"
        icon={LayoutTemplate}
        title="Layout & Templates"
        summary={
          template
            ? template === CUSTOM_TEMPLATE
              ? "Custom"
              : (design.templates.find((t) => t.key === template)?.label ?? template)
            : "Basic"
        }
        defaultOpen={true}
      >
        <div className="flex flex-col gap-4">
          <Field label="Template Sequence" hint="Full strip preset">
            <TemplatePicker
              design={design}
              value={template}
              layout={layout}
              onChange={onTemplate}
            />
          </Field>

          {template === "" ? (
            <Field label="Base Layout" hint="Applied to all scenes">
              <Select value={layout} onChange={onLayout} options={layoutOptions(design.layouts)} />
            </Field>
          ) : null}
        </div>
      </SidebarSection>

      <SidebarSection
        id="theme-presets"
        icon={Sparkles}
        title="Theme Presets"
        summary={
          THEME_PRESETS.find(
            (p) =>
              p.background === background &&
              p.fontFamily === fontFamily &&
              (p.headlineColor.toUpperCase() === headlineColor?.toUpperCase() ||
                (!headlineColor && p.headlineColor === "#0E1B2A")),
          )?.name ?? "5 Curated"
        }
        defaultOpen={true}
      >
        <ThemePresets
          currentBackground={background}
          currentFrame={frame}
          currentFontFamily={fontFamily}
          currentHeadlineColor={headlineColor}
          currentSubheadColor={subheadColor}
          onApplyPreset={handleApplyPreset}
        />
      </SidebarSection>

      <BackgroundSection
        design={design}
        deviceFrame={deviceFrame}
        background={background}
        frame={frame}
        screenOnly={screenOnly}
        backgroundPattern={backgroundPattern}
        patternOpacity={patternOpacity}
        patternColor={patternColor}
        deviceBacklight={deviceBacklight}
        panoramaMode={panoramaMode}
        onBackground={onBackground}
        onFrame={onFrame}
        onScreenOnly={onScreenOnly}
        onBackgroundPattern={onBackgroundPattern}
        onPatternOpacity={onPatternOpacity}
        onPatternColor={onPatternColor}
        onDeviceBacklight={onDeviceBacklight}
        onPanoramaMode={onPanoramaMode}
      />

      <TypographySection
        design={design}
        fontFamily={fontFamily}
        fontSizeScale={fontSizeScale}
        headlineColor={headlineColor}
        subheadColor={subheadColor}
        onFontFamily={onFontFamily}
        onFontSizeScale={onFontSizeScale}
        onHeadlineColor={onHeadlineColor}
        onSubheadColor={onSubheadColor}
      />

      <StoreBadgesSection
        design={design}
        background={background}
        sceneBadges={sceneBadges}
        sceneBackgrounds={sceneBackgrounds}
        onSceneBadge={onSceneBadge}
        onSceneBackground={onSceneBackground}
      />
    </div>
  );
});
