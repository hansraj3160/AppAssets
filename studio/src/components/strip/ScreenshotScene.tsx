import type React from "react";
import { memo, type ReactNode, useState } from "react";
import { type BacklightConfig, type PatternType, withOpacity } from "../../../../src/background";
import {
  BADGE,
  type Composition,
  compose,
  isTemplateKey,
  type LAYOUTS,
  type LayoutKey,
  resolveScenes,
  SCREEN_SHADOW,
  TYPE,
} from "../../../../src/layouts";
import {
  type Decoration,
  type Design,
  type DesignScene,
  type DeviceCaptures,
  type DeviceEntry,
  type FrameGeometry,
  isRtlLocale,
  type SceneCopy,
  type Theme,
} from "../../manifest";
import { CHECKERBOARD, TRANSPARENT } from "../design-panel/palettes";
import {
  type BadgeConfig,
  cq,
  MAX_SCREENSHOTS,
  rankOf,
  resolveColors,
  type ScreenshotEntry,
} from "./helpers";

function Canvas({
  background,
  fontFamily,
  children,
}: {
  background: string;
  fontFamily: string;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ containerType: "size", background, fontFamily }}
    >
      {children}
    </div>
  );
}

/**
 * Props that make a copy element editable in place. The text is committed
 * on blur or Enter (Shift+Enter keeps a line break, as the export honours
 * newlines); Escape restores the current value and leaves the field.
 */
function editableProps(commit: (text: string) => void, current: string, label: string) {
  return {
    contentEditable: "plaintext-only" as const,
    suppressContentEditableWarning: true,
    role: "textbox",
    "aria-label": label,
    "data-placeholder": label,
    spellCheck: false,
    className: "editable-copy",
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const text = (e.currentTarget.textContent ?? "").replace(/\n+$/, "");
      if (text !== current) commit(text);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.currentTarget.textContent = current;
        e.currentTarget.blur();
      }
    },
  };
}

/** Badge pills in the composition's corners and image layers placed by tile fractions. */
const Decorations = memo(function Decorations({
  decorations,
  tile,
  locale,
  color,
}: {
  decorations: Decoration[];
  tile: { width: number; height: number };
  locale: string;
  color: string;
}) {
  const { w, h } = cq(tile);
  const inset = Math.min(tile.width, tile.height) * BADGE.inset;
  return (
    <>
      {decorations.map((d, i) =>
        d.kind === "badge" ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static list from the config
            key={i}
            style={{
              position: "absolute",
              ...(d.position.endsWith("left") ? { left: w(inset) } : { right: w(inset) }),
              ...(d.position.startsWith("top") ? { top: h(inset) } : { bottom: h(inset) }),
              padding: `${w(tile.width * BADGE.padY)} ${w(tile.width * BADGE.padX)}`,
              borderRadius: "999cqw",
              background: d.background ?? "rgba(255, 255, 255, 0.85)",
              color: d.color ?? color,
              fontSize: `${BADGE.fontSize * 100}cqw`,
              lineHeight: 1.2,
              fontWeight: BADGE.weight,
              whiteSpace: "nowrap",
              direction: isRtlLocale(locale) ? "rtl" : "ltr",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.22)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
            }}
          >
            {d.text[locale] ?? ""}
          </div>
        ) : (
          <img
            // biome-ignore lint/suspicious/noArrayIndexKey: static list from the config
            key={i}
            src={`/${d.src}`}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: w(tile.width * d.x),
              top: h(tile.height * d.y),
              width: w(tile.width * d.width),
              height: "auto",
              transform: d.rotate ? `rotate(${d.rotate}deg)` : undefined,
            }}
          />
        ),
      )}
    </>
  );
});

const DeviceView = memo(function DeviceView({
  device,
  tile,
  frameUrl,
  captureUrl,
  missing,
  backlight,
  assetVersion,
}: {
  device: Composition["devices"][number];
  tile: { width: number; height: number };
  frameUrl: string | null;
  captureUrl: string | undefined;
  missing: string | undefined;
  backlight?: boolean | BacklightConfig;
  assetVersion?: number;
}) {
  const { w, h } = cq(tile);
  const { frame, screen } = device;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  const haloColor = (typeof backlight === "object" && backlight.color) || "rgba(56, 189, 248, 0.4)";
  const haloIntensity =
    typeof backlight === "object" && backlight.intensity !== undefined ? backlight.intensity : 0.45;
  const blurRatio =
    typeof backlight === "object" && backlight.blurRatio !== undefined
      ? backlight.blurRatio
      : 0.085;

  return (
    <div
      style={{
        position: "absolute",
        left: w(frame.left),
        top: h(frame.top),
        width: w(frame.width),
        height: h(frame.height),
        transform: device.rotate ? `rotate(${device.rotate}deg)` : undefined,
      }}
    >
      {backlight ? (
        <div
          style={{
            position: "absolute",
            left: "-15%",
            top: "-10%",
            width: "130%",
            height: "120%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${withOpacity(haloColor, haloIntensity)} 0%, ${withOpacity(haloColor, haloIntensity * 0.35)} 45%, transparent 70%)`,
            filter: `blur(${w(tile.width * blurRatio)})`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          left: pct(screen.left - frame.left, frame.width),
          top: pct(screen.top - frame.top, frame.height),
          width: pct(screen.width, frame.width),
          height: pct(screen.height, frame.height),
          borderRadius: w(screen.radius),
          overflow: "hidden",
          background: "#000",
          boxShadow: frameUrl
            ? undefined
            : `0 ${w(tile.width * SCREEN_SHADOW.offsetY)} ${w(tile.width * SCREEN_SHADOW.blur)} ${SCREEN_SHADOW.color}`,
        }}
      >
        {captureUrl ? (
          <img
            src={`/${captureUrl}${assetVersion ? `?v=${assetVersion}` : ""}`}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center border-4 border-dashed border-neutral-500 bg-neutral-800 text-center text-neutral-300"
            style={{ fontSize: "3cqw", padding: "4cqw" }}
          >
            no capture for {missing}
          </div>
        )}
      </div>

      {frameUrl ? (
        <img
          src={`/${frameUrl}`}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            filter: `drop-shadow(0 ${w(tile.width * 0.016)} ${w(tile.width * 0.022)} rgba(0, 0, 0, 0.35)) drop-shadow(0 ${w(tile.width * 0.04)} ${w(tile.width * 0.085)} rgba(0, 0, 0, 0.22))`,
          }}
        />
      ) : null}
    </div>
  );
});

export const ScreenshotScene = memo(function ScreenshotScene({
  spec,
  slice,
  globalSlice,
  totalSlices,
  tile,
  theme,
  screenOnly,
  background,
  frameUrl,
  geom,
  fontFamily,
  headline,
  subhead,
  headlineColor,
  subheadColor,
  fontSizeScale = 1,
  captureUrl,
  secondCaptureUrl,
  secondSceneId,
  decorations,
  locale,
  onEdit,
  assetVersion,
}: {
  spec: (typeof LAYOUTS)[keyof typeof LAYOUTS];
  slice: number;
  globalSlice?: number;
  totalSlices?: number;
  tile: { width: number; height: number };
  theme: Theme;
  screenOnly: boolean;
  background: string;
  frameUrl: string;
  geom: FrameGeometry | undefined;
  fontFamily: string;
  headline: string;
  subhead: string | undefined;
  headlineColor: string;
  subheadColor: string;
  fontSizeScale?: number;
  captureUrl: string;
  secondCaptureUrl: string | undefined;
  secondSceneId: string | undefined;
  decorations: Decoration[];
  locale: string;
  onEdit?: (field: "headline" | "subhead", text: string) => void;
  assetVersion?: number;
}) {
  const c = compose(spec, tile, theme, { screenOnly, geom });
  const { w, h } = cq(tile);
  const isRtl = isRtlLocale(locale);
  const typeScale = (c.designWidth / tile.width) * (fontSizeScale ?? 1);
  const editable = onEdit ? editableProps : () => ({});
  const copy = c.copy;
  const isLeft = copy?.align === "left";
  const align = isRtl && isLeft ? "right" : copy?.align;
  const leftPos =
    isRtl && isLeft && copy
      ? w(tile.width - copy.box.left - copy.box.width)
      : copy
        ? w(copy.box.left)
        : 0;
  const flexAlign = isRtl && isLeft ? "flex-end" : isLeft ? "flex-start" : "center";

  const isContinuousPanorama = Boolean(theme.panoramaMode && totalSlices && totalSlices > 1);
  const bgLeft =
    isContinuousPanorama && globalSlice !== undefined
      ? `${-globalSlice * 100}%`
      : `${-slice * 100}%`;
  const bgWidth =
    isContinuousPanorama && totalSlices ? `${totalSlices * 100}%` : `${spec.span * 100}%`;
  const bgFill =
    background === TRANSPARENT
      ? CHECKERBOARD
      : background.startsWith("data:image/") || background.startsWith("http")
        ? `url("${background}") center/cover no-repeat`
        : background;

  return (
    <Canvas background="transparent" fontFamily={fontFamily}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: bgLeft,
          width: bgWidth,
          height: "100%",
          background: bgFill,
        }}
      >
        {theme.backgroundPattern && theme.backgroundPattern !== "none" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: theme.patternOpacity ?? 0.05,
              backgroundImage:
                theme.backgroundPattern === "blueprint"
                  ? `linear-gradient(to right, ${theme.patternColor || "rgba(255,255,255,0.7)"} 1px, transparent 1px), linear-gradient(to bottom, ${theme.patternColor || "rgba(255,255,255,0.7)"} 1px, transparent 1px)`
                  : theme.backgroundPattern === "isometric-dot"
                    ? `radial-gradient(circle, ${theme.patternColor || "rgba(255,255,255,0.8)"} 1.5px, transparent 1.5px), radial-gradient(circle, ${theme.patternColor || "rgba(255,255,255,0.8)"} 1.5px, transparent 1.5px)`
                    : `radial-gradient(circle, ${theme.patternColor || "rgba(255,255,255,0.8)"} 1.5px, transparent 1.5px)`,
              backgroundSize: "3.5cqw 3.5cqw",
              backgroundPosition:
                theme.backgroundPattern === "isometric-dot" ? "0 0, 1.75cqw 1.75cqw" : "0 0",
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: `${-slice * 100}%`,
          width: `${spec.span * 100}%`,
          height: "100%",
        }}
      >
        {copy ? (
          <div
            dir={isRtl ? "rtl" : "ltr"}
            style={{
              position: "absolute",
              left: leftPos,
              width: w(copy.box.width),
              ...(copy.position === "top"
                ? { top: 0, paddingTop: h(copy.y), justifyContent: "flex-start" }
                : {
                    bottom: 0,
                    paddingBottom: h(tile.height - copy.y),
                    justifyContent: "flex-end",
                  }),
              height: h(copy.box.height),
              display: "flex",
              flexDirection: "column",
              alignItems: flexAlign,
              gap: h(tile.height * TYPE.gap),
              textAlign: align,
            }}
          >
            <h1
              dir={isRtl ? "rtl" : "ltr"}
              style={{
                margin: 0,
                color: headlineColor,
                fontSize: `${TYPE.headlineSize * typeScale * 100}cqw`,
                lineHeight: TYPE.headlineLineHeight,
                fontWeight: TYPE.headlineWeight,
                letterSpacing: `${TYPE.headlineTracking * typeScale * 100}cqw`,
              }}
              {...editable((text) => onEdit?.("headline", text), headline, "Headline")}
            >
              {headline}
            </h1>
            {subhead || onEdit ? (
              <p
                dir={isRtl ? "rtl" : "ltr"}
                style={{
                  margin: 0,
                  color: subheadColor,
                  fontSize: `${TYPE.subheadSize * typeScale * 100}cqw`,
                  lineHeight: TYPE.subheadLineHeight,
                  fontWeight: TYPE.subheadWeight,
                  minWidth: "30cqw",
                }}
                {...editable((text) => onEdit?.("subhead", text), subhead ?? "", "Subhead")}
              >
                {subhead}
              </p>
            ) : null}
          </div>
        ) : null}

        <Decorations
          decorations={decorations.filter((d) => d.kind !== "badge")}
          tile={tile}
          locale={locale}
          color={headlineColor}
        />

        {c.devices.map((device) => {
          const url = device.capture === "secondary" ? secondCaptureUrl : captureUrl;
          return (
            <DeviceView
              key={`${device.capture}-${device.frame.left}-${device.frame.top}`}
              device={device}
              tile={tile}
              frameUrl={screenOnly ? null : frameUrl}
              captureUrl={url}
              missing={url ? undefined : (secondSceneId ?? "secondScene")}
              backlight={theme.deviceBacklight}
              assetVersion={assetVersion}
            />
          );
        })}
      </div>

      <Decorations
        decorations={decorations.filter(
          (d) => d.kind === "badge" && (d.slice === undefined ? slice === 0 : d.slice === slice),
        )}
        tile={tile}
        locale={locale}
        color={headlineColor}
      />
    </Canvas>
  );
});

export const PreviewScene = memo(function PreviewScene({
  segments,
}: {
  segments: Array<{ url: string; durationSeconds: number }>;
}) {
  const [index, setIndex] = useState(0);
  const segment = segments[index % segments.length]!;
  return (
    <video
      key={index}
      src={`/${segment.url}`}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={() => setIndex((i) => i + 1)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
});

export function buildScreenshotEntries({
  design,
  captures,
  spec,
  locale,
  background,
  frameUrl,
  fontFamily,
  headlineColor,
  subheadColor,
  fontSizeScale = 1,
  copy = {},
  order = [],
  template,
  layout,
  screenOnly,
  sceneLayouts = {},
  sceneBackgrounds = {},
  sceneBadges = {},
  onCopy,
  backgroundPattern,
  patternOpacity,
  patternColor,
  deviceBacklight,
  panoramaMode,
  assetVersion,
}: {
  design: Design;
  captures: DeviceCaptures;
  spec: DeviceEntry;
  locale: string;
  background: string;
  frameUrl: string;
  fontFamily: string;
  headlineColor?: string;
  subheadColor?: string;
  fontSizeScale?: number;
  copy?: Record<string, SceneCopy>;
  order?: string[];
  template: string | string[];
  layout: string;
  screenOnly: boolean;
  sceneLayouts?: Record<string, string>;
  sceneBackgrounds?: Record<string, string>;
  sceneBadges?: Record<string, BadgeConfig>;
  onCopy?: (sceneId: string, field: "headline" | "subhead", text: string) => void;
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
  assetVersion?: number;
}): ScreenshotEntry[] {
  const theme: Theme = {
    ...design.theme,
    backgroundPattern: backgroundPattern ?? design.theme.backgroundPattern,
    patternOpacity: patternOpacity ?? design.theme.patternOpacity,
    patternColor: patternColor ?? design.theme.patternColor,
    deviceBacklight: deviceBacklight ?? design.theme.deviceBacklight,
    panoramaMode: panoramaMode ?? design.theme.panoramaMode,
  };
  const scenes =
    order.length > 0
      ? [...design.scenes].sort((a, b) => {
          const ra = rankOf(order, a.id);
          const rb = rankOf(order, b.id);
          return ra === rb ? design.scenes.indexOf(a) - design.scenes.indexOf(b) : ra - rb;
        })
      : design.scenes;
  const resolved = resolveScenes(scenes, {
    template: Array.isArray(template)
      ? (template as LayoutKey[])
      : isTemplateKey(template)
        ? template
        : undefined,
    layout,
    sceneLayouts,
  });
  const layoutOf = (scene: DesignScene) => resolved.find((r) => r.scene.id === scene.id)!;

  const allShots = scenes.flatMap((scene) => {
    const capture = captures.screenshots.find((s) => s.sceneId === scene.id);
    return capture ? [{ scene, capture }] : [];
  });
  let used = 0;
  const shots = allShots.filter(({ scene }) => {
    used += layoutOf(scene).layout.span;
    return used <= MAX_SCREENSHOTS;
  });

  const deviceFrameUrl = spec.frame?.url ?? frameUrl;
  const geom = spec.frame?.geom;

  const entries: ScreenshotEntry[] = [];
  let globalSliceIndex = 0;
  const totalSlices = shots.reduce((acc, { scene }) => acc + layoutOf(scene).layout.span, 0);
  for (const { scene, capture } of shots) {
    const { layout: layoutSpec, secondScene } = layoutOf(scene);
    const second = secondScene
      ? captures.screenshots.find((s) => s.sceneId === secondScene)
      : undefined;
    const sceneBg = sceneBackgrounds[scene.id] || scene.background || background;
    const colors = resolveColors({
      bg: sceneBg,
      headlineColor,
      subheadColor,
      themeHeadlineColor: theme.headlineColor,
      themeSubheadColor: theme.subheadColor,
    });
    for (let slice = 0; slice < layoutSpec.span; slice++) {
      const currentGlobalSlice = globalSliceIndex++;
      const sliceKey = `${scene.id}#${slice + 1}`;
      const userBadge =
        sceneBadges[sliceKey] ??
        (slice === (sceneBadges[scene.id]?.slice ?? 0) ? sceneBadges[scene.id] : undefined);
      const customBadgeDec: Decoration[] = userBadge
        ? [
            {
              kind: "badge",
              text: { [locale]: userBadge.text },
              position: userBadge.position,
              background: userBadge.background,
              color: userBadge.color,
              slice,
            },
          ]
        : [];
      const decorations = [...design.decorations, ...(scene.decorations ?? []), ...customBadgeDec];
      entries.push({
        key: layoutSpec.span > 1 ? sliceKey : scene.id,
        sceneId: scene.id,
        slice,
        width: spec.screenshot.width,
        height: spec.screenshot.height,
        layoutKey: layoutSpec.key,
        sceneBg,
        render: (editable = false) => (
          <ScreenshotScene
            spec={layoutSpec}
            slice={slice}
            globalSlice={currentGlobalSlice}
            totalSlices={totalSlices}
            tile={spec.screenshot}
            theme={theme}
            screenOnly={screenOnly}
            background={sceneBg}
            frameUrl={deviceFrameUrl}
            geom={geom}
            fontFamily={fontFamily}
            headline={copy[scene.id]?.headline?.[locale] ?? scene.headline[locale] ?? ""}
            subhead={copy[scene.id]?.subhead?.[locale] ?? scene.subhead?.[locale]}
            headlineColor={colors.headlineColor}
            subheadColor={colors.subheadColor}
            fontSizeScale={fontSizeScale}
            captureUrl={capture.url}
            secondCaptureUrl={second?.url}
            secondSceneId={secondScene}
            decorations={decorations}
            locale={locale}
            onEdit={editable && onCopy ? (field, text) => onCopy(scene.id, field, text) : undefined}
            assetVersion={assetVersion}
          />
        ),
      });
    }
  }
  return entries;
}
