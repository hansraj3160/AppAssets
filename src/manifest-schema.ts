import type { BacklightConfig, PatternType } from "./background.ts";
import type { FrameGeometry, LayoutKey, TemplateChoice } from "./layouts.ts";
import type { DeviceKey } from "./specs.ts";

export type { BacklightConfig, DeviceKey, FrameGeometry, LayoutKey, PatternType, TemplateChoice };

export type Locale = string;

/**
 * Detects whether a locale uses Right-to-Left (RTL) script (Arabic, Hebrew, Persian, Urdu, etc.).
 * Single shared implementation imported by both CLI/server (`src/`) and Studio (`studio/src/`).
 */
export function isRtlLocale(locale?: string): boolean {
  if (!locale) return false;
  const lang = locale.toLowerCase().split(/[-_]/)[0];
  return (
    lang === "ar" ||
    lang === "he" ||
    lang === "iw" ||
    lang === "fa" ||
    lang === "ur" ||
    lang === "yi"
  );
}

/**
 * A layer drawn over the background and under the device. A badge is a text
 * pill in a corner; an image is any PNG placed by fractions of the tile.
 */
export type Decoration =
  | {
      kind: "badge";
      text: Record<Locale, string>;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      /** Pill fill and text color; default to the headline color on a translucent white. */
      background?: string;
      color?: string;
      /** Slice index in a multi-span scene (defaults to 0 for the first tile). */
      slice?: number;
    }
  | {
      kind: "image";
      /** PNG relative to the config file (or url under out/web in StoreManifest). */
      src: string;
      /** Left and top as fractions of the tile width and height. */
      x: number;
      y: number;
      /** Width as a fraction of the tile width; the height keeps the image's aspect. */
      width: number;
      /** Degrees, clockwise, around the image centre. */
      rotate?: number;
    };

export type Theme = {
  background: string;
  headlineColor: string;
  subheadColor: string;
  fontFamily: string;
  /** Fraction of the frame/screenshot height reserved for copy above the device. */
  copyHeightRatio: number;
  /** Fraction of the frame/screenshot width the device bezel occupies. */
  deviceWidthRatio: number;
  /**
   * The strip's rhythm: a built-in template key from src/layouts.ts, or a
   * custom sequence of layout keys applied to the scenes in order (repeating
   * when shorter). Scenes with their own `layout` are left alone.
   */
  template?: TemplateChoice;
  /** Layout for scenes the template does not cover; a key from src/layouts.ts. Defaults to "classic". */
  layout?: LayoutKey;
  /** Drop the bezel and show the bare screen with a soft shadow. */
  screenOnly?: boolean;
  /** Decoration layers added to every screenshot scene. */
  decorations?: Decoration[];
  /** Scaling multiplier for headline and subhead copy (e.g. 0.85 for Compact, 1 for Normal, 1.2 for Large). */
  fontSizeScale?: number;
  /** Background pattern overlay (dot-grid, isometric-dot, blueprint). */
  backgroundPattern?: PatternType;
  /** Opacity for background pattern (e.g. 0.04). */
  patternOpacity?: number;
  /** Custom stroke / dot color for the pattern. */
  patternColor?: string;
  /** Device backlight halo settings behind phone frame. */
  deviceBacklight?: boolean | BacklightConfig;
  /** Whether backgrounds are rendered as a continuous multi-slice panorama. */
  panoramaMode?: boolean;
};

export type LayoutEntry = {
  key: string;
  label: string;
  description: string;
  span: number;
};

export type TemplateEntry = {
  key: string;
  label: string;
  description: string;
  sequence: string[];
};

export type DeviceEntry<K extends string = string> = {
  key: K;
  label: string;
  platform: "ios" | "ipad" | "android";
  simulatorName: string | null;
  screenshot: { width: number; height: number };
  preview: { width: number; height: number } | null;
  /**
   * Bezel art fixed to this device (Android Pixel / iPad art), with the
   * geometry it composes at. null on devices that render the frame variant
   * the design picks.
   */
  frame: { url: string; geom: FrameGeometry } | null;
};

export type DesignScene = {
  id: string;
  headline: Record<Locale, string>;
  subhead?: Record<Locale, string>;
  background?: string;
  layout?: string;
  secondScene?: string;
  decorations?: Decoration[];
};

export type BundledFontFace = {
  weight: number;
  url: string;
  unicodeRange?: string;
};

export type BundledFont = {
  key: string;
  family: string;
  fallback: string;
  faces: BundledFontFace[];
  lazy?: boolean;
  stylesheetUrl?: string;
};

export type DeviceCaptures = {
  screenshots: Array<{ sceneId: string; url: string }>;
  clips: Array<{ segmentId: string; url: string; durationSeconds: number }> | null;
};

export type Design = {
  theme: Theme;
  /** null when the config points at custom bezel art. */
  frameVariant: string | null;
  frameVariants: string[];
  /** Url of the config's custom bezel art; null when a bundled variant is used. */
  customFrameUrl: string | null;
  /** Bundled typefaces, with the @font-face WOFF2 subset sources and lazy CJK metadata. */
  fonts: BundledFont[];
  /** Every layout the studio can pick, in menu order. */
  layouts: LayoutEntry[];
  templates: TemplateEntry[];
  /** The theme's template: a built-in key, null for none, or the config's custom sequence. */
  template: string | string[] | null;
  /** The theme's default layout key. */
  layout: string;
  screenOnly: boolean;
  /** Theme-level decorations; image `src` values are urls under out/web. */
  decorations: Decoration[];
  scenes: DesignScene[];
  preview: {
    sceneId: string;
    segments: Array<{ id: string }>;
  } | null;
  /** Raw capture urls per device key; a device is absent until `appassets capture` ran. */
  captures: Record<string, DeviceCaptures>;
};

export type LocaleAssets = {
  screenshots: Array<{
    sceneId: string;
    url: string;
    width: number;
    height: number;
    bytes: number;
  }>;
  preview: {
    sceneId: string;
    url: string;
    width: number;
    height: number;
    bytes: number;
    durationSeconds: number;
  } | null;
};

export type StoreAppMetadata = {
  name: string;
  subtitle: Record<Locale, string>;
  developer: string;
  category: string;
  rating: number;
  ratingCount: string;
  ageRating: string;
  price: string;
  description: Record<Locale, string>;
};

/**
 * Canonical StoreManifest schema shared between CLI/server (`src/manifest.ts`)
 * and Studio frontend (`studio/src/manifest.ts`) to prevent schema drift.
 */
export type StoreManifest<K extends string = string> = {
  generatedAt: string;
  app: StoreAppMetadata;
  devices: Array<DeviceEntry<K>>;
  locales: string[];
  /** Keyed by device key, then locale. Populated by `writeManifest()`. */
  assets?: Record<string, Record<string, LocaleAssets>>;
  /** Everything the studio needs to composite scenes in the browser. */
  design: Design;
};

export type AppInfo = {
  name?: string;
  subtitle?: string;
  category?: string;
  developer?: string;
  description?: string;
  icon?: string;
};

export type SceneCopy = {
  headline?: Record<Locale, string>;
  subhead?: Record<Locale, string>;
};

export type SceneBadge = {
  text: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  background?: string;
  color?: string;
  slice?: number;
};

/** The design choices saved on disk next to the config; see src/studio-server.ts. */
export type SavedDesign = {
  appInfo?: AppInfo;
  appIcon?: string;
  background?: string;
  frame?: string;
  fontFamily?: string;
  headlineColor?: string;
  subheadColor?: string;
  fontSizeScale?: number;
  /** Copy edited in the lightbox, per screenshot scene id, then locale. */
  copy?: Record<string, SceneCopy>;
  /** Screenshot scene ids in the order the tiles were dragged into. */
  order?: string[];
  /** A built-in template key, or "" for none. */
  template?: string;
  /** Default layout key for scenes the template does not cover. */
  layout?: string;
  screenOnly?: boolean;
  /** Layout overrides per screenshot scene id. */
  sceneLayouts?: Record<string, string>;
  /** Per-scene background overrides. */
  sceneBackgrounds?: Record<string, string>;
  /** Per-scene badge decorations. */
  sceneBadges?: Record<string, SceneBadge>;
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
};
