import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";
import { resolveContainedPath, sanitizeZipEntryName } from "./security.ts";

/**
 * A dependency-free zip writer, so the studio export does not need a `zip`
 * binary on the host (Windows ships none). Entries are deflated and written
 * with plain local headers plus a central directory; every unzip tool reads
 * the result. Files are buffered in memory, which is fine for a handful of
 * screenshots and short preview videos.
 */

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS date and time fields, which is how zip stores mtimes. */
function dosDateTime(date: Date): { date: number; time: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  };
}

export type ZipEntry = { name: string; data: Buffer; mtime?: Date };

/** Builds a zip archive from in-memory entries. `name` uses forward slashes. */
export function zipEntries(entries: ZipEntry[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const safeName = sanitizeZipEntryName(entry.name);
    const name = Buffer.from(safeName, "utf8");
    const packed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const { date, time } = dosDateTime(entry.mtime ?? new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed: 2.0 (deflate)
    local.writeUInt16LE(0x0800, 6); // flags: utf-8 names
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, packed);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4); // version made by
    dir.writeUInt16LE(20, 6); // version needed
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(time, 12);
    dir.writeUInt16LE(date, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(packed.length, 20);
    dir.writeUInt32LE(entry.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30); // extra length
    dir.writeUInt16LE(0, 32); // comment length
    dir.writeUInt16LE(0, 34); // disk number
    dir.writeUInt16LE(0, 36); // internal attributes
    dir.writeUInt32LE(0, 38); // external attributes
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);

    offset += local.length + name.length + packed.length;
  }

  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, ...central, end]);
}

/** Every regular file under `dir` confined to `root`, recursively, in sorted order. */
async function walk(dir: string, root: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    // Skip symbolic links to prevent escaping the archive root directory.
    if (entry.isSymbolicLink()) continue;
    const candidate = resolveContainedPath(root, [relative(root, join(dir, entry.name))]);
    if (!candidate) continue;
    if (entry.isDirectory()) files.push(...(await walk(candidate, root)));
    else if (entry.isFile()) files.push(candidate);
  }
  return files;
}

/**
 * Maps screenshot directories to clear store-ready folder structures inside the ZIP:
 * - screenshots/iphone-6.9/... -> AppStore/iPhone-6.9/...
 * - screenshots/pixel-10-pro/... -> GooglePlay/Phone/...
 * - screenshots/ipad/... -> AppStore/iPad/...
 */
export function storeZipPath(relPath: string): string {
  const norm = relPath.split("\\").join("/");
  if (norm.startsWith("screenshots/iphone-6.9/")) {
    return norm.replace(/^screenshots\/iphone-6\.9\//, "AppStore/iPhone-6.9/");
  }
  if (norm.startsWith("screenshots/iphone-6.3/")) {
    return norm.replace(/^screenshots\/iphone-6\.3\//, "AppStore/iPhone-6.3/");
  }
  if (norm.startsWith("screenshots/pixel-10-pro/")) {
    return norm.replace(/^screenshots\/pixel-10-pro\//, "GooglePlay/Phone/");
  }
  if (norm.startsWith("screenshots/ipad-13/")) {
    return norm.replace(/^screenshots\/ipad-13\//, "AppStore/iPad-13/");
  }
  if (norm.startsWith("screenshots/ipad/")) {
    return norm.replace(/^screenshots\/ipad\//, "AppStore/iPad/");
  }
  if (norm.startsWith("previews/iphone-6.9/")) {
    return norm.replace(/^previews\/iphone-6\.9\//, "AppStore/Previews/iPhone-6.9/");
  }
  if (norm.startsWith("previews/ipad-13/")) {
    return norm.replace(/^previews\/ipad-13\//, "AppStore/Previews/iPad-13/");
  }
  if (norm.startsWith("previews/pixel-10-pro/")) {
    return norm.replace(/^previews\/pixel-10-pro\//, "GooglePlay/PromoVideo/");
  }
  return norm;
}

/**
 * Creates the README/STORE_GUIDE.txt content explaining folder layout and store specifications.
 */
export function createStoreGuideContent(): string {
  return `========================================================================
AppAssets - App Store & Google Play Screenshot Package
========================================================================

📁 FOLDER STRUCTURE & SPECIFICATIONS:

1. Apple App Store Connect:
   - AppStore/iPhone-6.3/
     * Target: iPhone 16 Pro, 15 Pro, 14 Pro (6.3" Display - App Store Required)
     * Resolution: 1206 x 2622 px (Portrait)
     * Upload: App Store Connect > iOS App > Screenshots > 6.3" Display

   - AppStore/iPad-13/
     * Target: iPad Pro 13-inch (M4), iPad Pro 12.9-inch
     * Resolution: 2064 x 2752 px (Portrait)
     * Upload: App Store Connect > iOS App > Screenshots > 13" Display

   - AppStore/app-icon-1024x1024.png
     * Target: Official App Store Connect Marketing Icon
     * Resolution: 1024 x 1024 px (Full Square, No Transparency)
     * Upload: App Store Connect > App Information > App Icon

2. Google Play Console:
   - GooglePlay/app-icon-512x512.png
     * Target: Official Google Play Console High-Res Icon
     * Resolution: 512 x 512 px (32-bit PNG, Full Square)
     * Upload: Google Play Console > Store presence > Main store listing > Graphics > App icon

   - GooglePlay/feature-graphic.png
     * Target: Mandatory Play Store Feature Graphic Banner
     * Resolution: 1024 x 500 px (24-bit PNG / JPEG)
     * Upload: Google Play Console > Store presence > Main store listing > Graphics > Feature graphic

   - GooglePlay/Phone/
     * Target: Android Phones (Pixel, Samsung Galaxy, etc.)
     * Resolution: 1080 x 1920 px (16:9 / 9:16 aspect ratio)
     * Upload: Google Play Console > Store presence > Main store listing > Phone screenshots

3. Marketing & Launch Promo Banners:
   - Marketing/product-hunt-1270x760.png: Product Hunt launch gallery banner
   - Marketing/x-twitter-1200x675.png: X / Twitter promo card (16:9 large image card)
   - Marketing/instagram-square-1080x1080.png: Instagram / LinkedIn square promo post

4. Preview Videos (if generated):
   - AppStore/Previews/: App Store App Previews (.mp4 / H.264)
   - GooglePlay/PromoVideo/: Promo videos for YouTube linking

Generated with AppAssets Studio.
`;
}

/**
 * Zips the named directories under `root` into `out`, with entry names
 * relative to `root` (the same layout `zip -r` produces there). Directories
 * that do not exist are skipped.
 */
export async function zipDirs(
  root: string,
  dirs: string[],
  out: string,
  transformName?: (name: string) => string,
  extraEntries?: ZipEntry[],
  filter?: (name: string, absPath: string) => boolean,
): Promise<number> {
  const resolvedRoot = resolve(root);
  const entries: ZipEntry[] = [];
  if (extraEntries) {
    for (const extra of extraEntries) {
      entries.push({ ...extra, name: sanitizeZipEntryName(extra.name) });
    }
  }
  for (const dir of dirs) {
    const containedDir = resolveContainedPath(resolvedRoot, [dir]);
    if (!containedDir) {
      throw new Error(`Directory escapes archive root: ${dir}`);
    }
    for (const file of await walk(containedDir, resolvedRoot)) {
      let relName = relative(resolvedRoot, file).split("\\").join("/");
      if (transformName) {
        relName = transformName(relName);
      }
      relName = sanitizeZipEntryName(relName);
      if (filter && !filter(relName, file)) {
        continue;
      }
      entries.push({
        name: relName,
        data: await readFile(file),
        mtime: (await stat(file)).mtime,
      });
    }
  }
  await writeFile(out, zipEntries(entries));
  return entries.length;
}
