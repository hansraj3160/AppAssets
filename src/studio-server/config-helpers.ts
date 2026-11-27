import { assertValidLocale, escapeRegExp } from "../security.ts";
import type { DeviceKey } from "../specs.ts";
import type { PresetLocale } from "./types.ts";

/** Reads PNG dimensions directly from buffer without disk I/O. */
export function getDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } | null {
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return null;
}

/**
 * Auto-resolution routing based on capture image dimensions.
 */
export function resolveDeviceFromDimensions(
  width: number,
  height: number,
  preferredDevice?: string,
): DeviceKey {
  if (width <= 0 || height <= 0) {
    if (preferredDevice === "ipad-13" || preferredDevice === "pixel-10-pro") {
      return preferredDevice;
    }
    return "iphone-6.9";
  }

  const portraitWidth = Math.min(width, height);
  const portraitHeight = Math.max(width, height);
  const aspect = portraitWidth / portraitHeight;

  if (aspect >= 0.7 && aspect <= 0.82) {
    return "ipad-13";
  }

  if (preferredDevice === "iphone-6.9" || preferredDevice === "pixel-10-pro") {
    if (aspect < 0.65) {
      return preferredDevice;
    }
  }

  if (
    (portraitWidth === 1280 && portraitHeight === 2856) ||
    (portraitWidth === 1080 && (portraitHeight === 1920 || portraitHeight === 2400)) ||
    (aspect >= 0.53 && aspect <= 0.6)
  ) {
    return "pixel-10-pro";
  }

  if (
    (portraitWidth === 1320 && portraitHeight === 2868) ||
    (portraitWidth === 1290 && portraitHeight === 2796) ||
    (portraitWidth === 1179 && portraitHeight === 2556) ||
    (aspect >= 0.44 && aspect <= 0.49)
  ) {
    if (preferredDevice === "pixel-10-pro" && aspect <= 0.455) {
      return "pixel-10-pro";
    }
    return "iphone-6.9";
  }

  if (preferredDevice === "ipad-13" || preferredDevice === "pixel-10-pro") {
    return preferredDevice;
  }
  return "iphone-6.9";
}

/**
 * Assigns clean, collision-free scene IDs to incoming files.
 */
export function assignUniqueSceneIds<T extends { name: string }>(
  files: T[],
  existingSceneIds: Set<string>,
): Array<{ f: T; id: string; label: string }> {
  const assignments: Array<{ f: T; id: string; label: string }> = [];
  const allocatedIds = new Set(existingSceneIds);

  for (const f of files) {
    const rawName = f.name.replace(/\.[^.]+$/, "");
    let baseId = rawName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    baseId = baseId.replace(/^_+|_+$/g, "");
    if (!baseId) {
      baseId = "screenshot";
    }

    const label =
      rawName
        .replace(/[_-]/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || `Screenshot ${allocatedIds.size + 1}`;

    let candidateId = baseId;
    let counter = 2;
    const numMatch = baseId.match(/^(.*?)_(\d+)$/);
    let prefix = baseId;
    if (numMatch) {
      prefix = numMatch[1]!;
      counter = Number.parseInt(numMatch[2]!, 10) + 1;
    }

    while (allocatedIds.has(candidateId)) {
      candidateId = `${prefix}_${counter}`;
      counter++;
    }

    allocatedIds.add(candidateId);
    assignments.push({ f, id: candidateId, label });
  }

  return assignments;
}

/**
 * Appends new scene definitions to the end of the scenes array in the config file.
 */
export function appendScenesToConfig(
  configContent: string,
  scenesToAdd: Array<{ id: string; label: string }>,
): string {
  if (!scenesToAdd || scenesToAdd.length === 0) return configContent;

  const scenesIdx = configContent.indexOf("scenes:");
  if (scenesIdx === -1) return configContent;

  const openBracket = configContent.indexOf("[", scenesIdx);
  if (openBracket === -1) return configContent;

  let depth = 0;
  let closeBracket = -1;
  for (let i = openBracket; i < configContent.length; i++) {
    if (configContent[i] === "[") depth++;
    else if (configContent[i] === "]") {
      depth--;
      if (depth === 0) {
        closeBracket = i;
        break;
      }
    }
  }

  if (closeBracket === -1) return configContent;

  const scenesToInsert = scenesToAdd.filter(
    (s) => !configContent.includes(`id: "${s.id}"`) && !configContent.includes(`id: '${s.id}'`),
  );

  if (scenesToInsert.length === 0) return configContent;

  const blocks = scenesToInsert
    .map(
      (s) =>
        `    {\n      kind: "screenshot",\n      id: ${JSON.stringify(s.id)},\n      flow: ${JSON.stringify(`store-${s.id}`)},\n      headline: { "en-US": ${JSON.stringify(s.label)} },\n      subhead: { "en-US": "Describe your key benefit here." },\n    },`,
    )
    .join("\n");

  const scenesInside = configContent.slice(openBracket + 1, closeBracket);
  const isEmpty = scenesInside.trim().length === 0;

  if (isEmpty) {
    return `${configContent.slice(0, openBracket + 1)}\n${blocks}\n  ${configContent.slice(closeBracket)}`;
  }

  const beforeClose = configContent.slice(0, closeBracket);
  const trimmedBefore = beforeClose.trimEnd();
  const needsComma = !trimmedBefore.endsWith(",") && !trimmedBefore.endsWith("[");

  return `${trimmedBefore}${needsComma ? "," : ""}\n${blocks}\n  ${configContent.slice(closeBracket).trimStart()}`;
}

export function removeSceneFromConfig(configContent: string, sceneId: string): string {
  const idPattern = new RegExp(`id:\\s*["']${escapeRegExp(sceneId)}["']`);
  const match = idPattern.exec(configContent);
  if (!match) return configContent;

  const idIndex = match.index;
  let startIndex = -1;
  let depth = 0;
  for (let i = idIndex; i >= 0; i--) {
    if (configContent[i] === "}") depth++;
    else if (configContent[i] === "{") {
      if (depth === 0) {
        startIndex = i;
        break;
      }
      depth--;
    }
  }
  if (startIndex === -1) return configContent;

  depth = 0;
  let endIndex = -1;
  for (let i = startIndex; i < configContent.length; i++) {
    if (configContent[i] === "{") depth++;
    else if (configContent[i] === "}") {
      depth--;
      if (depth === 0) {
        let after = i + 1;
        while (
          after < configContent.length &&
          (configContent[after] === " " || configContent[after] === "\t")
        )
          after++;
        if (after < configContent.length && configContent[after] === ",") after++;
        while (
          after < configContent.length &&
          (configContent[after] === " " || configContent[after] === "\t")
        )
          after++;
        if (after < configContent.length && configContent[after] === "\n") after++;
        endIndex = after;
        break;
      }
    }
  }
  if (endIndex === -1) return configContent;
  let lineStart = startIndex;
  while (
    lineStart > 0 &&
    (configContent[lineStart - 1] === " " || configContent[lineStart - 1] === "\t")
  ) {
    lineStart--;
  }
  return configContent.slice(0, lineStart) + configContent.slice(endIndex);
}

/**
 * Finds the screenshot file matching a given scene and optional slice index.
 */
export function findScreenshotFile(
  files: string[],
  sceneId: string,
  slice?: number,
): string | null {
  const escapedId = escapeRegExp(sceneId);
  if (slice !== undefined && !Number.isNaN(slice)) {
    const targetSlice = slice === 0 ? 1 : slice;
    const slicePattern = new RegExp(`(?:^|\\d+-)${escapedId}-${targetSlice}\\.png$`);
    const found = files.find((f) => slicePattern.test(f));
    if (found) return found;
  }

  const slice1Pattern = new RegExp(`(?:^|\\d+-)${escapedId}-1\\.png$`);
  const foundSlice1 = files.find((f) => slice1Pattern.test(f));
  if (foundSlice1 && (slice === undefined || slice === 1 || slice === 0)) return foundSlice1;

  const singlePattern = new RegExp(`(?:^|\\d+-)${escapedId}\\.png$`);
  const foundSingle = files.find((f) => singlePattern.test(f));
  if (foundSingle) return foundSingle;

  return (
    files.find(
      (f) =>
        f.endsWith(".png") &&
        (f.includes(`-${sceneId}.png`) ||
          f.includes(`-${sceneId}-`) ||
          f.startsWith(`${sceneId}.`)),
    ) ?? null
  );
}

export const PRESET_LOCALES: PresetLocale[] = [
  { code: "en-US", label: "English (US)", rtl: false },
  { code: "en-GB", label: "English (UK)", rtl: false },
  { code: "es-ES", label: "Spanish (Spain)", rtl: false },
  { code: "es-MX", label: "Spanish (Mexico)", rtl: false },
  { code: "fr-FR", label: "French (France)", rtl: false },
  { code: "de-DE", label: "German (Germany)", rtl: false },
  { code: "it-IT", label: "Italian (Italy)", rtl: false },
  { code: "pt-BR", label: "Portuguese (Brazil)", rtl: false },
  { code: "ja-JP", label: "Japanese (Japan)", rtl: false },
  { code: "ko-KR", label: "Korean (South Korea)", rtl: false },
  { code: "zh-Hans", label: "Chinese (Simplified)", rtl: false },
  { code: "zh-Hant", label: "Chinese (Traditional)", rtl: false },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)", rtl: true },
  { code: "he-IL", label: "Hebrew (Israel)", rtl: true },
  { code: "ru-RU", label: "Russian (Russia)", rtl: false },
  { code: "hi-IN", label: "Hindi (India)", rtl: false },
  { code: "tr-TR", label: "Turkish", rtl: false },
  { code: "nl-NL", label: "Dutch (Netherlands)", rtl: false },
  { code: "vi-VN", label: "Vietnamese", rtl: false },
  { code: "th-TH", label: "Thai", rtl: false },
  { code: "id-ID", label: "Indonesian", rtl: false },
  { code: "sv-SE", label: "Swedish", rtl: false },
];

export function extractLocalesFromConfig(content: string): string[] {
  const match = content.match(/locales:\s*\[([^\]]*)\]/);
  if (!match) return ["en-US"];
  const rawItems = match[1]!.split(",");
  const locales = rawItems
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter((s) => s.length > 0);
  return locales.length > 0 ? locales : ["en-US"];
}

export function updateLocalesInConfig(content: string, locales: string[]): string {
  const safeLocales = locales.map((l) => assertValidLocale(l));
  const formatted = `locales: [${safeLocales.map((l) => JSON.stringify(l)).join(", ")}]`;
  const regex = /locales:\s*\[[^\]]*\]/;
  if (regex.test(content)) {
    return content.replace(regex, formatted);
  }
  const devicesMatch = content.match(/devices:\s*\[[^\]]*\],?/);
  if (devicesMatch && devicesMatch.index !== undefined) {
    const pos = devicesMatch.index + devicesMatch[0].length;
    return `${content.slice(0, pos)}\n  ${formatted},${content.slice(pos)}`;
  }
  return content;
}
