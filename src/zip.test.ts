import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exec } from "./exec.ts";
import { zipDirs, zipEntries } from "./zip.ts";

describe("zip", () => {
  test("writes an archive with the expected entries and sizes", () => {
    const buf = zipEntries([{ name: "a/b.txt", data: Buffer.from("hello hello hello") }]);
    expect(buf.readUInt32LE(0)).toBe(0x04034b50); // local header
    expect(buf.readUInt32LE(buf.length - 22)).toBe(0x06054b50); // end of central directory
    expect(buf.readUInt16LE(buf.length - 22 + 10)).toBe(1); // entry count
  });

  test("zipDirs mirrors the directory layout with forward slashes", async () => {
    const root = await mkdtemp(join(tmpdir(), "goldie-zip-"));
    await mkdir(join(root, "screenshots", "iphone-6.9", "en-US"), { recursive: true });
    await writeFile(join(root, "screenshots", "iphone-6.9", "en-US", "1-home.png"), "png");
    await mkdir(join(root, "previews"), { recursive: true });
    await writeFile(join(root, "previews", "clip.mp4"), Buffer.alloc(4096, 7));
    const out = join(root, "export.zip");
    const count = await zipDirs(root, ["screenshots", "previews", "missing"], out);
    expect(count).toBe(2);

    // Verify with the system unzip when it is available (macOS and Linux).
    const listing = await exec("unzip", ["-l", out], { quiet: true });
    if (listing.code === 0) {
      expect(listing.stdout).toContain("screenshots/iphone-6.9/en-US/1-home.png");
      expect(listing.stdout).toContain("previews/clip.mp4");
      const check = await exec("unzip", ["-t", out], { quiet: true });
      expect(check.code).toBe(0);
    }
    expect((await readFile(out)).readUInt32LE(0)).toBe(0x04034b50);
  });

  test("storeZipPath maps directories to AppStore/iPad-13 structures", async () => {
    const { storeZipPath } = await import("./zip.ts");
    expect(storeZipPath("screenshots/ipad-13/en-US/01-home.png")).toBe(
      "AppStore/iPad-13/en-US/01-home.png",
    );
    expect(storeZipPath("previews/ipad-13/en-US/preview.mp4")).toBe(
      "AppStore/Previews/iPad-13/en-US/preview.mp4",
    );
    expect(storeZipPath("screenshots/pixel-10-pro/en-US/01-home.png")).toBe(
      "GooglePlay/Phone/en-US/01-home.png",
    );
  });

  test("createStoreGuideContent provides App Store and Google Play specifications", async () => {
    const { createStoreGuideContent } = await import("./zip.ts");
    const guide = createStoreGuideContent();
    expect(guide).toContain("AppStore/iPhone-6.9/");
    expect(guide).toContain("1320 x 2868");
    expect(guide).toContain("AppStore/iPad-13/");
    expect(guide).toContain("2064 x 2752");
    expect(guide).toContain("GooglePlay/Phone/");
    expect(guide).toContain("1080 x 1920");
    expect(guide).toContain("GooglePlay/feature-graphic.png");
    expect(guide).toContain("1024 x 500");
    expect(guide).toContain("Marketing/product-hunt-1270x760.png");
  });

  test("zipDirs includes extraEntries alongside scanned files", async () => {
    const root = await mkdtemp(join(tmpdir(), "goldie-zip-extra-"));
    await mkdir(join(root, "screenshots"), { recursive: true });
    await writeFile(join(root, "screenshots", "test.png"), "test-png");
    const out = join(root, "export.zip");

    const extra = [
      {
        name: "STORE_GUIDE.txt",
        data: Buffer.from("store instructions"),
      },
    ];

    const count = await zipDirs(root, ["screenshots"], out, undefined, extra);
    expect(count).toBe(2);

    const listing = await exec("unzip", ["-l", out], { quiet: true });
    if (listing.code === 0) {
      expect(listing.stdout).toContain("STORE_GUIDE.txt");
      expect(listing.stdout).toContain("screenshots/test.png");
    }
  });

  test("zipDirs filters entries with custom filter function", async () => {
    const root = await mkdtemp(join(tmpdir(), "goldie-zip-filter-"));
    await mkdir(join(root, "screenshots", "iphone-6.9"), { recursive: true });
    await mkdir(join(root, "screenshots", "pixel-10-pro"), { recursive: true });
    await writeFile(join(root, "screenshots", "iphone-6.9", "1.png"), "iphone");
    await writeFile(join(root, "screenshots", "pixel-10-pro", "1.png"), "android");
    const out = join(root, "export.zip");

    const count = await zipDirs(
      root,
      ["screenshots"],
      out,
      (p) => p.replace(/^screenshots\/iphone-6\.9\//, "AppStore/"),
      undefined,
      (relName) => !relName.includes("pixel-10-pro"),
    );
    expect(count).toBe(1);

    const listing = await exec("unzip", ["-l", out], { quiet: true });
    if (listing.code === 0) {
      expect(listing.stdout).toContain("AppStore/1.png");
      expect(listing.stdout).not.toContain("pixel-10-pro");
    }
  });
});
