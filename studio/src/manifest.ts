import {
  type AppInfo,
  type BacklightConfig,
  type BundledFont,
  type BundledFontFace,
  type Decoration,
  type Design,
  type DesignScene,
  type DeviceCaptures,
  type DeviceEntry,
  type FrameGeometry,
  isRtlLocale,
  type LayoutEntry,
  type LocaleAssets,
  type PatternType,
  type SavedDesign,
  type SceneBadge,
  type SceneCopy,
  type StoreAppMetadata,
  type StoreManifest,
  type TemplateEntry,
  type Theme,
} from "../../src/manifest-schema";
import { apiFetch } from "./lib/api";

export {
  type AppInfo,
  type BacklightConfig,
  type BundledFont,
  type BundledFontFace,
  type Decoration,
  type Design,
  type DesignScene,
  type DeviceCaptures,
  type DeviceEntry,
  type FrameGeometry,
  isRtlLocale,
  type LayoutEntry,
  type LocaleAssets,
  type PatternType,
  type SavedDesign,
  type SceneBadge,
  type SceneCopy,
  type StoreAppMetadata,
  type StoreManifest,
  type TemplateEntry,
  type Theme,
};

/** A load failure with the CLI command that fixes it, for the empty state. */
export class ManifestError extends Error {
  command?: string;
  constructor(message: string, command?: string) {
    super(message);
    this.name = "ManifestError";
    this.command = command;
  }
}

export async function loadManifest(sessionId?: string): Promise<StoreManifest> {
  const res = await apiFetch("/store.json", {
    cache: "no-store",
    headers: sessionId ? { "X-Session-ID": sessionId } : undefined,
  });
  if (!res.ok) {
    throw new ManifestError(
      "There is no out/store.json yet. Generate the assets first.",
      "appassets all",
    );
  }
  const manifest: StoreManifest = await res.json();
  if (!manifest.design?.fonts || !manifest.design.layouts) {
    throw new ManifestError(
      "out/store.json predates browser-side composition. Regenerate it.",
      "appassets manifest",
    );
  }

  // Raw captures keep their names across a re-capture, so the manifest's
  // timestamp becomes a cache-buster - a capture followed by a manifest
  // reload shows new pixels.
  const v = `?v=${Date.parse(manifest.generatedAt) || 0}`;
  for (const captures of Object.values(manifest.design.captures)) {
    for (const shot of captures.screenshots) shot.url += v;
    for (const clip of captures.clips ?? []) clip.url += v;
  }
  return manifest;
}

export async function loadDesign(sessionId?: string): Promise<SavedDesign> {
  try {
    const res = await apiFetch("/api/design", {
      cache: "no-store",
      headers: sessionId ? { "X-Session-ID": sessionId } : undefined,
    });
    if (!res.ok) return {};
    const parsed = await res.json();
    return parsed && typeof parsed === "object" ? (parsed as SavedDesign) : {};
  } catch {
    return {}; // a static build has no API; the config's values stand
  }
}

export async function saveDesign(design: SavedDesign, sessionId?: string): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["X-Session-ID"] = sessionId;
  const res = await apiFetch("/api/design", {
    method: "PUT",
    headers,
    body: JSON.stringify(design),
  });
  if (!res.ok) throw new Error(`Saving appassets.design.json failed: ${await res.text()}`);
}

/**
 * The CLI's --font key for the current font stack: a bundled font's key when
 * the stack names its family, "system" when it is the config's own stack
 * (the CLI then leaves theme.fontFamily alone), else undefined.
 */
export function fontKey(design: StoreManifest["design"], fontFamily: string): string | undefined {
  if (fontFamily === design.theme.fontFamily) return undefined;
  return design.fonts.find((f) => fontFamily.startsWith(`"${f.family}"`))?.key ?? "system";
}
