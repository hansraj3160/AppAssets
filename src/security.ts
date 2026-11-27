import { resolve, sep } from "node:path";
import { DEVICES, type DeviceKey } from "./specs.ts";

const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const SAFE_LOCALE_RE = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/;
const SAFE_HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates an identifier such as sceneId so it cannot contain path separators,
 * traversal segments, null bytes, or control characters.
 */
export function assertSafeId(value: unknown, label = "id", maxLen = 128): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > maxLen ||
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0") ||
    !SAFE_ID_RE.test(trimmed)
  ) {
    throw new ValidationError(`Invalid ${label}`);
  }
  return trimmed;
}

/** Validates a device key strictly against the supported DEVICES catalog. */
export function assertValidDeviceKey(
  value: unknown,
  opts: { allowIphoneAliases?: boolean } = {},
): DeviceKey {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Device must be a non-empty string");
  }
  const raw = value.trim();
  if (opts.allowIphoneAliases && (raw === "iphone" || raw === "iphone-6.3")) {
    return "iphone-6.9";
  }
  if (Object.hasOwn(DEVICES, raw)) {
    return raw as DeviceKey;
  }
  throw new ValidationError(`Unsupported device: ${raw}`);
}

/** Validates a BCP-47 locale tag (e.g., en-US, zh-Hans-CN, ar-SA). */
export function assertValidLocale(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("Locale must be a non-empty string");
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32 || !SAFE_LOCALE_RE.test(trimmed)) {
    throw new ValidationError(`Invalid locale: ${trimmed.slice(0, 32)}`);
  }
  return trimmed;
}

/**
 * Resolves `segments` inside `baseDir` and verifies the result stays strictly
 * inside `baseDir` using a trailing path-separator boundary check.
 * Returns null if any segment contains a null byte or escapes `baseDir`.
 */
export function resolveContainedPath(
  baseDir: string,
  segments: string[],
  opts: { allowBase?: boolean } = {},
): string | null {
  for (const seg of segments) {
    if (typeof seg !== "string" || seg.includes("\0")) return null;
  }
  const resolvedBase = resolve(baseDir);
  const resolvedTarget = resolve(resolvedBase, ...segments);
  if (opts.allowBase && resolvedTarget === resolvedBase) {
    return resolvedTarget;
  }
  const prefix = resolvedBase.endsWith(sep) ? resolvedBase : `${resolvedBase}${sep}`;
  return resolvedTarget.startsWith(prefix) ? resolvedTarget : null;
}

/** Escapes special RegExp characters in a literal string. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sanitizes a filename for use in HTTP Content-Disposition headers. */
export function sanitizeDownloadFilename(value: string, fallback = "download"): string {
  const cleaned = value
    .replace(/[\r\n\0]/g, "")
    .replace(/[^\w.-]/g, "_")
    .replace(/^\.+/, "");
  return cleaned || fallback;
}

/** Validates a hex color string before interpolating into HTML/manifest output. */
export function sanitizeThemeColor(value: unknown, fallback = "#007aff"): string {
  if (typeof value === "string" && SAFE_HEX_COLOR_RE.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

/** Validates that a URL uses http: or https: and contains no control characters. */
export function assertSafeHttpUrl(rawUrl: string): string {
  if (typeof rawUrl !== "string" || /[\r\n\0"&|<>^%]/.test(rawUrl)) {
    throw new ValidationError("Unsafe URL");
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ValidationError("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError("Only http and https URLs are allowed");
  }
  return parsed.toString();
}

/**
 * Normalizes and validates a ZIP archive entry path to prevent Zip-Slip
 * traversal (`../`), absolute paths (`/etc/passwd`, `C:\...`), and null bytes.
 */
export function sanitizeZipEntryName(name: string): string {
  if (typeof name !== "string" || name.length === 0 || name.includes("\0")) {
    throw new ValidationError("Invalid ZIP entry name");
  }
  const normalized = name.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new ValidationError(`Absolute ZIP entry path not allowed: ${name}`);
  }
  const parts = normalized.split("/");
  const safeParts: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      throw new ValidationError(`Path traversal in ZIP entry not allowed: ${name}`);
    }
    safeParts.push(part);
  }
  if (safeParts.length === 0) {
    throw new ValidationError(`Empty ZIP entry path not allowed: ${name}`);
  }
  return safeParts.join("/");
}
