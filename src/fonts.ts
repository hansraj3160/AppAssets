import { existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GlobalFonts } from "@napi-rs/canvas";

/**
 * Standard Unicode ranges matching Google Fonts' latin & latin-ext WOFF2 subsets.
 * Browsers only download the subset matching glyphs actually rendered on screen.
 */
export const LATIN_RANGE =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
export const LATIN_EXT_RANGE =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

export const CJK_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap";

export type FontFaceSpec = {
  weight: number;
  file: string;
  unicodeRange?: string;
};

/**
 * Typefaces bundled as compact WOFF2 subsets in assets/fonts/ (Google Fonts, OFL),
 * plus lazy on-demand CJK fonts fetched from object storage/CDN only when Chinese/CJK
 * locales or glyphs are rendered. Both @napi-rs/canvas and browsers support WOFF2.
 */
export type BundledFont = {
  /** CSS family name, as registered with the canvas and declared in @font-face. */
  family: string;
  /** Generic fallbacks appended after the family. */
  fallback: string;
  /** Primary local font files under assets/fonts/ (or cache filenames for lazy fonts), keyed by weight. */
  files: Record<number, string>;
  /** All local WOFF2 subset faces (latin + latin-ext) for browser preview & canvas registration. */
  faces: FontFaceSpec[];
  /** When true, excluded from eager GlobalFonts registration and fetched on demand. */
  lazy?: boolean;
  /** Default remote CDN URLs per weight for on-demand server download (overridable via APPASSETS_FONT_CDN_BASE). */
  remoteUrls?: Record<number, string>;
  /** Remote CSS2 stylesheet serving chunked unicode-range WOFF2 subsets for browser previews. */
  stylesheetUrl?: string;
};

export const FONTS = {
  merriweather: {
    family: "Merriweather",
    fallback: "Georgia, serif",
    files: { 400: "Merriweather-latin.woff2", 700: "Merriweather-latin.woff2" },
    faces: [
      { weight: 400, file: "Merriweather-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 400, file: "Merriweather-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
      { weight: 700, file: "Merriweather-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 700, file: "Merriweather-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
    ],
  },
  "dm-mono": {
    family: "DM Mono",
    fallback: "ui-monospace, Menlo, monospace",
    // DM Mono ships no bold; its heaviest cut is 500.
    files: { 400: "DMMono-400-latin.woff2", 500: "DMMono-500-latin.woff2" },
    faces: [
      { weight: 400, file: "DMMono-400-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 400, file: "DMMono-400-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
      { weight: 500, file: "DMMono-500-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 500, file: "DMMono-500-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
    ],
  },
  lato: {
    family: "Lato",
    fallback: "system-ui, sans-serif",
    files: { 400: "Lato-400-latin.woff2", 700: "Lato-700-latin.woff2" },
    faces: [
      { weight: 400, file: "Lato-400-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 400, file: "Lato-400-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
      { weight: 700, file: "Lato-700-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 700, file: "Lato-700-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
    ],
  },
  "dm-sans": {
    family: "DM Sans",
    fallback: "system-ui, sans-serif",
    files: { 400: "DMSans-latin.woff2", 700: "DMSans-latin.woff2" },
    faces: [
      { weight: 400, file: "DMSans-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 400, file: "DMSans-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
      { weight: 700, file: "DMSans-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 700, file: "DMSans-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
    ],
  },
  montserrat: {
    family: "Montserrat",
    fallback: "system-ui, sans-serif",
    files: { 400: "Montserrat-latin.woff2", 700: "Montserrat-latin.woff2" },
    faces: [
      { weight: 400, file: "Montserrat-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 400, file: "Montserrat-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
      { weight: 700, file: "Montserrat-latin.woff2", unicodeRange: LATIN_RANGE },
      { weight: 700, file: "Montserrat-latin-ext.woff2", unicodeRange: LATIN_EXT_RANGE },
    ],
  },
  "noto-sans-sc": {
    family: "Noto Sans SC",
    fallback: '"PingFang SC", "Microsoft YaHei", sans-serif',
    files: { 400: "NotoSansSC-400.ttf", 700: "NotoSansSC-700.ttf" },
    faces: [],
    lazy: true,
    remoteUrls: {
      400: "https://fonts.gstatic.com/s/notosanssc/v41/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf",
      700: "https://fonts.gstatic.com/s/notosanssc/v41/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaGzjCnYw.ttf",
    },
    stylesheetUrl: CJK_STYLESHEET_URL,
  },
} as const satisfies Record<string, BundledFont>;

export type FontKey = keyof typeof FONTS;
export const FONT_KEYS = Object.keys(FONTS) as FontKey[];

/** The system font: what the example config uses and what `--font system` restores. */
export const SYSTEM_FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';

const FONTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");

export function fontFilePath(file: string): string {
  return resolve(FONTS_DIR, file);
}

/** Disk cache directory for on-demand downloaded CJK fonts. */
export function resolveFontCacheDir(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.APPASSETS_FONT_CACHE_DIR?.trim();
  if (configured) return resolve(configured);
  return join(tmpdir(), "appassets-fonts");
}

/** Resolves a remote font URL, honoring optional APPASSETS_FONT_CDN_BASE object-storage override. */
export function resolveRemoteFontUrl(
  file: string,
  defaultUrl: string,
  cdnBase = process.env.APPASSETS_FONT_CDN_BASE,
): string {
  const cleanBase = cdnBase?.trim().replace(/\/+$/, "");
  if (cleanBase) return `${cleanBase}/${encodeURIComponent(file)}`;
  return defaultUrl;
}

const CJK_LOCALE_RE = /^(zh|ja|ko)(?:$|[-_])/i;
const CJK_CHAR_RE = /[\u3000-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

/** Returns true when a BCP 47 locale targets Chinese, Japanese, or Korean scripts. */
export function isCjkLocale(locale?: string): boolean {
  if (!locale) return false;
  return CJK_LOCALE_RE.test(locale.trim());
}

/** Returns true when a string contains any CJK ideographs, kana, or hangul characters. */
export function containsCjk(text?: string): boolean {
  if (!text) return false;
  return CJK_CHAR_RE.test(text);
}

/** Returns true only when rendering requires loading the heavy CJK font into memory. */
export function needsCjkFont(opts: {
  locale?: string;
  fontFamily?: string;
  texts?: Array<string | undefined>;
}): boolean {
  if (opts.fontFamily?.includes(FONTS["noto-sans-sc"].family)) return true;
  if (isCjkLocale(opts.locale)) return true;
  if (opts.texts?.some((t) => containsCjk(t))) return true;
  return false;
}

/** The `theme.fontFamily` value for a bundled font, or the system stack for "system". */
export function fontStack(key: string): string {
  if (key === "system") return SYSTEM_FONT;
  const font = (FONTS as Record<string, BundledFont>)[key];
  if (!font) {
    throw new Error(`Unknown font "${key}". Available: system, ${FONT_KEYS.join(", ")}`);
  }
  return `"${font.family}", ${font.fallback}`;
}

/**
 * The canvas resolves glyphs only against families it knows. Appending the CJK
 * typeface ONLY when CJK is needed (or explicitly requested) avoids forcing
 * Skia to keep ~17 MB of CJK OTF/TTF tables in RAM for Latin renders.
 */
export function withGlyphFallback(stack: string, options?: { includeCjk?: boolean }): string {
  const cjk = FONTS["noto-sans-sc"].family;
  const includeCjk = Boolean(options?.includeCjk) || stack.includes(cjk);
  const fallbacks = includeCjk
    ? [cjk, "Geeza Pro", "Damascus", "Arial", "sans-serif"]
    : ["Geeza Pro", "Damascus", "Arial", "sans-serif"];
  let res = stack;
  for (const fb of fallbacks) {
    if (!res.includes(fb)) res += `, "${fb}"`;
  }
  return res;
}

let latinRegistered = false;
let cjkRegistered = false;
let cjkLoadPromise: Promise<boolean> | null = null;

export function isCjkRegistered(): boolean {
  return cjkRegistered;
}

/** Test-only helper to reset in-memory font registration flags. */
export function _resetFontRegistryForTest(): void {
  latinRegistered = false;
  cjkRegistered = false;
  cjkLoadPromise = null;
}

function registerLocalFontFiles(font: BundledFont): number {
  const seen = new Set<string>();
  let count = 0;
  const candidates =
    font.faces.length > 0 ? font.faces.map((f) => f.file) : Object.values(font.files);
  for (const file of candidates) {
    if (seen.has(file)) continue;
    seen.add(file);
    const fullPath = fontFilePath(file);
    if (existsSync(fullPath)) {
      GlobalFonts.registerFromPath(fullPath, font.family);
      count++;
    }
  }
  return count;
}

/**
 * Registers compact bundled Latin WOFF2 fonts with @napi-rs/canvas.
 * Heavy CJK fonts are skipped unless `includeCjk: true` (and present locally)
 * or loaded lazily on demand via `ensureCjkFontsLoaded()`.
 */
export function registerFonts(options?: { includeCjk?: boolean }): void {
  if (!latinRegistered) {
    latinRegistered = true;
    for (const font of Object.values(FONTS)) {
      if ("lazy" in font && font.lazy) continue;
      registerLocalFontFiles(font);
    }
  }

  if (options?.includeCjk && !cjkRegistered) {
    const cjkFont = FONTS["noto-sans-sc"];
    const registeredCount = registerLocalFontFiles(cjkFont);
    if (registeredCount > 0) {
      cjkRegistered = true;
    }
  }
}

function findLocalCjkOverride(weightFile: string): string | null {
  const candidates = [weightFile, weightFile.replace(/\.ttf$/i, ".otf")];
  for (const name of candidates) {
    const p = fontFilePath(name);
    if (existsSync(p)) return p;
  }
  return null;
}

export interface EnsureCjkOptions {
  fetcher?: typeof fetch;
  cacheDir?: string;
  cdnBase?: string;
  registerPath?: (filePath: string, family: string) => void;
}

/**
 * Lazily loads and registers Noto Sans SC into @napi-rs/canvas ONLY when CJK
 * locales or CJK copy are actually rendered. Checks local overrides first, then
 * disk cache, then downloads on demand from object storage / CDN.
 */
export async function ensureCjkFontsLoaded(options?: EnsureCjkOptions): Promise<boolean> {
  if (cjkRegistered) return true;
  if (cjkLoadPromise) return cjkLoadPromise;

  const task = (async () => {
    const cjkFont = FONTS["noto-sans-sc"];
    const fetcher = options?.fetcher ?? globalThis.fetch;
    const cacheDir = options?.cacheDir ?? resolveFontCacheDir();
    const registerPath =
      options?.registerPath ?? ((p: string, fam: string) => GlobalFonts.registerFromPath(p, fam));

    let loadedWeights = 0;

    for (const [weightStr, file] of Object.entries(cjkFont.files)) {
      const weight = Number(weightStr);
      // 1. Optional local override (e.g. Git LFS checkout or mounted volume)
      const localPath = findLocalCjkOverride(file);
      if (localPath) {
        registerPath(localPath, cjkFont.family);
        loadedWeights++;
        continue;
      }

      // 2. Disk cache hit
      const cachedPath = join(cacheDir, file);
      if (existsSync(cachedPath)) {
        registerPath(cachedPath, cjkFont.family);
        loadedWeights++;
        continue;
      }

      // 3. On-demand download from configured CDN / Google Fonts static CDN
      const defaultUrl = (cjkFont.remoteUrls as Record<number, string> | undefined)?.[weight];
      if (!defaultUrl || typeof fetcher !== "function") continue;
      const remoteUrl = resolveRemoteFontUrl(file, defaultUrl, options?.cdnBase);

      try {
        await mkdir(cacheDir, { recursive: true });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
          const res = await fetcher(remoteUrl, { signal: controller.signal });
          if (!res.ok) {
            console.warn(`Failed to fetch CJK font ${file}: HTTP ${res.status}`);
            continue;
          }
          const buf = Buffer.from(await res.arrayBuffer());
          const tmpPath = `${cachedPath}.${process.pid}.${Date.now()}.tmp`;
          await writeFile(tmpPath, buf);
          await rename(tmpPath, cachedPath);
          registerPath(cachedPath, cjkFont.family);
          loadedWeights++;
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        console.warn(
          `Could not lazy-load CJK font ${file} from ${remoteUrl}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    if (loadedWeights > 0) {
      cjkRegistered = true;
      return true;
    }
    return false;
  })();

  cjkLoadPromise = task;
  try {
    return await task;
  } finally {
    if (cjkLoadPromise === task) {
      cjkLoadPromise = null;
    }
  }
}
