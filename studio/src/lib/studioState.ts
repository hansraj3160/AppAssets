import type { BacklightConfig, PatternType } from "../../../src/background";
import type {
  AppInfo,
  BundledFont,
  Design,
  DeviceEntry,
  SavedDesign,
  SceneCopy,
  StoreManifest,
} from "../manifest";

/** Sentinel for the config's own layout sequence, which the studio can show but not edit. */
export const CUSTOM_TEMPLATE = "__custom__";

export type Platform = "ios" | "ipad" | "android";

export type Screen =
  | "landing"
  | "studio"
  | "privacy"
  | "terms"
  | "about"
  | "contact"
  | "guidelines"
  | "not-found";

/** How long the design must sit still before it is written to disk. */
export const SAVE_DEBOUNCE_MS = 500;

/** Everything the undo stack tracks: the design choices saved to goldie.design.json. */
export type DesignState = {
  background: string;
  frame: string;
  fontFamily: string;
  headlineColor: string;
  subheadColor: string;
  fontSizeScale: number;
  backgroundPattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  deviceBacklight?: boolean | BacklightConfig;
  panoramaMode?: boolean;
  copy: Record<string, SceneCopy>;
  layout: string;
  /** A built-in template key, "" for none, or CUSTOM_TEMPLATE for the config's own sequence. */
  template: string;
  screenOnly: boolean;
  /** Per-scene layout overrides; a scene absent here follows `layout`. */
  sceneLayouts: Record<string, string>;
  /** Per-scene background overrides. */
  sceneBackgrounds: Record<string, string>;
  /** Per-scene badge decorations. */
  sceneBadges: Record<
    string,
    {
      text: string;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      background?: string;
      color?: string;
      slice?: number;
    }
  >;
  /** Screenshot scene ids as arranged by dragging tiles; empty means the config's order. */
  order: string[];
};

export type SavedView = { platform?: string; device?: string; locale?: string; dark?: boolean };

export function resolveScreenFromParts(pathnameRaw: string, search = "", hash = ""): Screen {
  const pathname = pathnameRaw.replace(/\/+$/, "") || "/";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/terms") return "terms";
  if (pathname === "/about") return "about";
  if (pathname === "/contact") return "contact";
  if (pathname === "/guidelines") return "guidelines";
  if (pathname === "/studio") return "studio";
  if (pathname === "/" || pathname === "") {
    const params = new URLSearchParams(search);
    const view = params.get("view");
    if (view === "privacy" || hash === "#privacy") return "privacy";
    if (view === "terms" || hash === "#terms") return "terms";
    if (view === "about" || hash === "#about") return "about";
    if (view === "contact" || hash === "#contact") return "contact";
    if (view === "guidelines" || hash === "#guidelines") return "guidelines";
    if (view === "studio" || hash === "#studio") return "studio";
    return "landing";
  }
  return "not-found";
}

export function resolveScreenFromLocation(): Screen {
  if (typeof window === "undefined") return "landing";
  return resolveScreenFromParts(
    window.location.pathname,
    window.location.search,
    window.location.hash,
  );
}

export function initialTemplate(design: Design, saved: SavedDesign): string {
  if (saved.template !== undefined && design.templates.some((t) => t.key === saved.template))
    return saved.template;
  if (saved.template === "") return "";
  if (Array.isArray(design.template)) return CUSTOM_TEMPLATE;
  return design.template ?? "";
}

export function initialSceneLayouts(
  design: Design,
  saved: SavedDesign,
  knownLayout: (key: string | undefined) => string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const scene of design.scenes) {
    const key = knownLayout(saved.sceneLayouts?.[scene.id]);
    if (key) out[scene.id] = key;
  }
  return out;
}

/** Ids no longer in the config are dropped, new ones follow the saved order. */
export function initialOrder(design: Design, saved: SavedDesign): string[] {
  const ids = design.scenes.map((s) => s.id);
  if (!saved.order) return [];
  const kept = saved.order.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

export function buildDesignState(
  design: Design,
  saved: SavedDesign,
  knownLayout: (key: string | undefined) => string | undefined,
): DesignState {
  return {
    background: saved.background ?? design.theme.background,
    frame:
      saved.frame && design.frameVariants.includes(saved.frame)
        ? saved.frame
        : (design.frameVariant ?? ""),
    fontFamily: saved.fontFamily ?? design.theme.fontFamily,
    headlineColor: saved.headlineColor ?? "",
    subheadColor: saved.subheadColor ?? "",
    fontSizeScale: saved.fontSizeScale ?? 1,
    backgroundPattern: saved.backgroundPattern ?? design.theme.backgroundPattern ?? "none",
    patternOpacity: saved.patternOpacity ?? design.theme.patternOpacity ?? 0.05,
    patternColor: saved.patternColor ?? design.theme.patternColor,
    deviceBacklight: saved.deviceBacklight ?? design.theme.deviceBacklight ?? false,
    panoramaMode: saved.panoramaMode ?? design.theme.panoramaMode ?? false,
    copy: saved.copy ?? {},
    layout: knownLayout(saved.layout) ?? design.layout,
    template: initialTemplate(design, saved),
    screenOnly: saved.screenOnly ?? design.screenOnly,
    sceneLayouts: initialSceneLayouts(design, saved, knownLayout),
    sceneBackgrounds: saved.sceneBackgrounds ?? {},
    sceneBadges: saved.sceneBadges ?? {},
    order: initialOrder(design, saved),
  };
}

export function buildAppInfo(manifest: StoreManifest, saved: SavedDesign, locale: string): AppInfo {
  return {
    name: saved.appInfo?.name || manifest.app.name || "",
    subtitle:
      saved.appInfo?.subtitle ||
      manifest.app.subtitle?.[locale] ||
      manifest.app.subtitle?.["en-US"] ||
      Object.values(manifest.app.subtitle || {})[0] ||
      "",
    category: saved.appInfo?.category || manifest.app.category || "",
    developer: saved.appInfo?.developer || manifest.app.developer || "",
    description:
      saved.appInfo?.description ||
      manifest.app.description?.[locale] ||
      manifest.app.description?.["en-US"] ||
      Object.values(manifest.app.description || {})[0] ||
      "",
    icon: saved.appInfo?.icon || saved.appIcon || "",
  };
}

export function buildSavePayload(state: DesignState, appInfo: AppInfo): SavedDesign {
  return {
    background: state.background,
    frame: state.frame || undefined,
    fontFamily: state.fontFamily,
    headlineColor: state.headlineColor || undefined,
    subheadColor: state.subheadColor || undefined,
    fontSizeScale: state.fontSizeScale !== 1 ? state.fontSizeScale : undefined,
    backgroundPattern: state.backgroundPattern !== "none" ? state.backgroundPattern : undefined,
    patternOpacity: state.patternOpacity !== 0.05 ? state.patternOpacity : undefined,
    patternColor: state.patternColor || undefined,
    deviceBacklight: state.deviceBacklight || undefined,
    panoramaMode: state.panoramaMode || undefined,
    copy: Object.keys(state.copy).length > 0 ? state.copy : undefined,
    order: state.order.length > 0 ? state.order : undefined,
    template: state.template === CUSTOM_TEMPLATE ? undefined : state.template,
    layout: state.layout,
    screenOnly: state.screenOnly,
    sceneLayouts: Object.keys(state.sceneLayouts).length > 0 ? state.sceneLayouts : undefined,
    sceneBackgrounds:
      Object.keys(state.sceneBackgrounds).length > 0 ? state.sceneBackgrounds : undefined,
    sceneBadges: Object.keys(state.sceneBadges).length > 0 ? state.sceneBadges : undefined,
    appInfo: appInfo.name?.trim() ? appInfo : undefined,
    appIcon: appInfo.icon || undefined,
  };
}

export function filterSceneRecord<T>(
  rec: Record<string, T>,
  validSceneIds: Set<string>,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [key, val] of Object.entries(rec)) {
    const baseId = key.split("#")[0]!;
    if (validSceneIds.has(baseId)) {
      out[key] = val;
    }
  }
  return out;
}

const storageKey = (appName: string) => `appassets-studio:${appName}`;
const legacyStorageKey = (appName: string) => `goldie-studio:${appName}`;

export function loadView(appName: string): SavedView {
  try {
    const raw =
      localStorage.getItem(storageKey(appName)) || localStorage.getItem(legacyStorageKey(appName));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as SavedView) : {};
  } catch {
    return {};
  }
}

export function storeView(appName: string, saved: SavedView): void {
  try {
    localStorage.setItem(storageKey(appName), JSON.stringify(saved));
  } catch {
    // Storage may be unavailable (private mode); the session still works.
  }
}

const CJK_LOCALE_RE = /^(zh|ja|ko)(?:$|[-_])/i;
const CJK_CHAR_RE = /[\u3000-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

export function isCjkLocale(locale?: string): boolean {
  if (!locale) return false;
  return CJK_LOCALE_RE.test(locale.trim());
}

export function containsCjk(text?: string): boolean {
  if (!text) return false;
  return CJK_CHAR_RE.test(text);
}

/**
 * Returns true only when the browser preview should lazy-load CJK WOFF2 subsets:
 * Chinese/Japanese/Korean locale active, user selected Noto Sans SC, or visible copy contains CJK glyphs.
 */
export function shouldLoadCjkFont(opts: {
  locale?: string;
  fontFamily?: string;
  copy?: Record<string, SceneCopy>;
  scenes?: Array<{ id: string; headline: Record<string, string>; subhead?: Record<string, string> }>;
}): boolean {
  if (opts.fontFamily?.includes("Noto Sans SC")) return true;
  if (isCjkLocale(opts.locale)) return true;
  const loc = opts.locale ?? "en-US";
  if (opts.copy) {
    for (const c of Object.values(opts.copy)) {
      if (containsCjk(c.headline?.[loc]) || containsCjk(c.subhead?.[loc])) return true;
    }
  }
  if (opts.scenes) {
    for (const s of opts.scenes) {
      if (containsCjk(s.headline?.[loc]) || containsCjk(s.subhead?.[loc])) return true;
    }
  }
  return false;
}

function fontFormatFromUrl(url: string): string {
  const clean = url.split("?")[0]!.toLowerCase();
  if (clean.endsWith(".woff2")) return "woff2";
  if (clean.endsWith(".woff")) return "woff";
  if (clean.endsWith(".otf")) return "opentype";
  return "truetype";
}

/** @font-face rules for the bundled WOFF2 subsets the manifest lists. */
export function fontFaces(fonts: BundledFont[]): string {
  return fonts
    .flatMap((font) =>
      font.faces.map((face) => {
        const format = fontFormatFromUrl(face.url);
        const range = face.unicodeRange ? `;unicode-range:${face.unicodeRange}` : "";
        return `@font-face{font-family:"${font.family}";font-weight:${face.weight};font-style:normal;font-display:swap;src:url("${face.url}") format("${format}")${range}}`;
      }),
    )
    .join("\n");
}

/** iOS/iPadOS devices are sizes ("iPhone 6.9", "iPad 13"), so they carry an inch mark, as in the sidebar. */
export function deviceLabel(d: DeviceEntry): string {
  return d.platform === "ios" || d.platform === "ipad" ? `${d.label}"` : d.label;
}

export function readImageFileData(
  file: File,
): Promise<{ name: string; dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ name: file.name, dataUrl, width: 0, height: 0 });
        }
      }, 1000);

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            name: file.name,
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ name: file.name, dataUrl, width: 0, height: 0 });
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}
