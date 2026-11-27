import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveContainedPath, ValidationError } from "../security.ts";

export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_DESIGN_BODY_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_BODY_BYTES = 60 * 1024 * 1024;

/** Error thrown when an incoming HTTP body exceeds its configured byte limit. */
export class PayloadTooLargeError extends Error {
  statusCode = 413;
  constructor(maxBytes: number) {
    const mb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    super(`Request payload too large (limit ${mb} MB).`);
    this.name = "PayloadTooLargeError";
  }
}

export function sendRequestError(res: ServerResponse, err: unknown, asJson = true): void {
  if (res.headersSent || res.writableEnded) return;
  const status =
    err instanceof PayloadTooLargeError || err instanceof ValidationError ? err.statusCode : 500;
  const msg = err instanceof Error ? err.message : String(err);
  res.statusCode = status;
  if (asJson) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: msg }));
  } else {
    res.end(msg);
  }
}

export function readBody(req: IncomingMessage, maxBytes = MAX_JSON_BODY_BYTES): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const contentLength = Number(req.headers?.["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      reject(new PayloadTooLargeError(maxBytes));
      return;
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    req.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        settled = true;
        chunks.length = 0;
        reject(new PayloadTooLargeError(maxBytes));
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolvePromise(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      chunks.length = 0;
      reject(err);
    });
  });
}

export function stream(
  cmd: string,
  args: string[],
  cwd: string,
  res: ServerResponse,
  env: Record<string, string> = {},
): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });
    child.stdout.on("data", (d) => res.write(d));
    child.stderr.on("data", (d) => res.write(d));
    child.on("error", fail);
    child.on("close", (code) => (code === 0 ? done() : fail(new Error(`exit code ${code}`))));
  });
}

export const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

/** Serve `file` with Range support, so the preview video seeks in the browser. */
export function sendFile(
  req: IncomingMessage,
  res: ServerResponse,
  file: string,
  cacheControl?: string,
) {
  const size = statSync(file).size;
  const type = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  const isImmutableAsset = Boolean(req.url?.includes("/assets/") || req.url?.includes("/fonts/"));
  const cc =
    cacheControl ?? (isImmutableAsset ? "public, max-age=31536000, immutable" : "no-store");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "Cache-Control": cc,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": size,
    "Accept-Ranges": "bytes",
    "Cache-Control": cc,
  });
  createReadStream(file).pipe(res);
}

/** Resolve a URL path inside `root`, or null when it escapes or is missing. */
export function fileIn(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const rel = normalize(decoded).replace(/^[/\\]+/, "");
  if (!rel || rel === ".") return null;
  const file = resolveContainedPath(root, [rel]);
  if (!file) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The studio bundle Vite emits; shipped in the npm package. */
export const STUDIO_DIST = resolve(REPO_ROOT, "studio", "dist");
export const STUDIO_PUBLIC = resolve(REPO_ROOT, "studio", "public");
export const STUDIO_INDEX_FALLBACK = resolve(REPO_ROOT, "studio", "index.html");
