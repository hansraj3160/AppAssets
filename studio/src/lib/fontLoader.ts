import type { SceneCopy } from "../manifest";
import { shouldLoadCjkFont } from "./studioState";

export type PreviewMode = "editor" | "store" | "promo";

export type FontLoadStatus = "idle" | "observing" | "loading" | "loaded" | "error";

export const DEFAULT_CJK_FONT_KEY = "noto-sans-sc";
export const DEFAULT_CJK_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap";
export const DEFAULT_ACTIVE_PREVIEW_MODES: readonly PreviewMode[] = ["editor", "store", "promo"];

export interface CjkActivationOptions {
  locale?: string;
  previewMode?: PreviewMode;
  activePreviewModes?: readonly PreviewMode[];
  fontFamily?: string;
  copy?: Record<string, SceneCopy>;
  scenes?: Array<{
    id: string;
    headline: Record<string, string>;
    subhead?: Record<string, string>;
  }>;
}

/**
 * Determines whether the CJK FontLoader should observe and load Noto Sans SC:
 * requires BOTH an active preview mode AND a CJK locale, CJK copy, or explicit CJK font selection.
 */
export function shouldActivateCjkFontLoader(opts: CjkActivationOptions): boolean {
  const mode = opts.previewMode ?? "editor";
  const allowedModes = opts.activePreviewModes ?? DEFAULT_ACTIVE_PREVIEW_MODES;
  if (!allowedModes.includes(mode)) return false;

  return shouldLoadCjkFont({
    locale: opts.locale,
    fontFamily: opts.fontFamily,
    copy: opts.copy,
    scenes: opts.scenes,
  });
}

/**
 * Resolves the external CDN stylesheet URL for CJK WOFF2 subsets.
 * Honors an explicit `cdnBase` (or VITE_FONT_CDN_BASE), falling back to the manifest's
 * stylesheetUrl or Google Fonts' chunked unicode-range CSS2 endpoint.
 */
export function resolveCjkStylesheetUrl(opts: {
  fontKey?: string;
  stylesheetUrl?: string;
  cdnBase?: string;
}): string {
  const key = opts.fontKey?.trim() || DEFAULT_CJK_FONT_KEY;
  const cleanBase = opts.cdnBase?.trim().replace(/\/+$/, "");
  if (cleanBase) {
    return cleanBase.endsWith(".css") ? cleanBase : `${cleanBase}/${encodeURIComponent(key)}.css`;
  }
  return opts.stylesheetUrl?.trim() || DEFAULT_CJK_STYLESHEET_URL;
}

/**
 * Injects a deduplicated `<link rel="stylesheet">` (plus optional preconnect hint)
 * into `doc.head` to fetch CJK font subsets on demand from an external CDN.
 */
export function injectCjkStylesheet(
  doc: Document,
  opts: {
    fontKey: string;
    href: string;
    onLoad?: () => void;
    onError?: () => void;
  },
): "loading" | "loaded" {
  const selector = `link[data-appassets-font="${opts.fontKey}"]`;
  const existing = doc.querySelector<HTMLLinkElement>(selector);
  if (existing) {
    if (existing.dataset.loaded === "true") {
      opts.onLoad?.();
      return "loaded";
    }
    if (opts.onLoad) existing.addEventListener("load", opts.onLoad, { once: true });
    if (opts.onError) existing.addEventListener("error", opts.onError, { once: true });
    return "loading";
  }

  try {
    const origin = new URL(opts.href).origin;
    if (
      origin &&
      origin !== "null" &&
      !doc.querySelector(`link[data-appassets-preconnect="${origin}"]`)
    ) {
      const preconnect = doc.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = origin;
      preconnect.crossOrigin = "anonymous";
      preconnect.dataset.appassetsPreconnect = origin;
      doc.head.append(preconnect);
    }
  } catch {
    // Ignore non-absolute URLs when computing preconnect origin
  }

  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = opts.href;
  link.dataset.appassetsFont = opts.fontKey;
  link.addEventListener(
    "load",
    () => {
      link.dataset.loaded = "true";
      opts.onLoad?.();
    },
    { once: true },
  );
  link.addEventListener(
    "error",
    () => {
      opts.onError?.();
    },
    { once: true },
  );
  doc.head.append(link);
  return "loading";
}
