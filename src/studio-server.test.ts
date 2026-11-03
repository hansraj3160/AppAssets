import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Writable } from "node:stream";
import {
  aiCopyHandler,
  appendScenesToConfig,
  assignUniqueSceneIds,
  bannerExportHandler,
  createStudioRequestHandler,
  exportHandler,
  extractLocalesFromConfig,
  faviconExportHandler,
  findScreenshotFile,
  getClientIp,
  getDimensionsFromBuffer,
  iconHandler,
  importHandler,
  localesHandler,
  MemoryRateLimiter,
  PRESET_LOCALES,
  MIME,
  renderAppIconCanvas,
  replaceCaptureHandler,
  resolveDeviceFromDimensions,
  selectedExportZipHandler,
  singleExportHandler,
  studioPaths,
  updateLocalesInConfig,
} from "./studio-server.ts";

describe("findScreenshotFile", () => {
  const files = [
    "01-intro.png",
    "02-panorama_scene-1.png",
    "03-panorama_scene-2.png",
    "04-settings.png",
  ];

  test("matches single-tile screenshot when no slice is specified", () => {
    expect(findScreenshotFile(files, "intro")).toBe("01-intro.png");
    expect(findScreenshotFile(files, "settings")).toBe("04-settings.png");
  });

  test("matches slice 1 when slice=1 or slice=0 is specified", () => {
    expect(findScreenshotFile(files, "panorama_scene", 1)).toBe("02-panorama_scene-1.png");
    expect(findScreenshotFile(files, "panorama_scene", 0)).toBe("02-panorama_scene-1.png");
  });

  test("matches slice 2 when slice=2 is specified", () => {
    expect(findScreenshotFile(files, "panorama_scene", 2)).toBe("03-panorama_scene-2.png");
  });

  test("defaults to slice 1 for multi-slice scene when slice is omitted", () => {
    expect(findScreenshotFile(files, "panorama_scene")).toBe("02-panorama_scene-1.png");
  });

  test("falls back to single-tile file if slice=1 is requested on a non-multi-slice scene", () => {
    expect(findScreenshotFile(files, "intro", 1)).toBe("01-intro.png");
  });

  test("returns null when sceneId is not present", () => {
    expect(findScreenshotFile(files, "nonexistent")).toBeNull();
    expect(findScreenshotFile(files, "nonexistent", 2)).toBeNull();
  });
});

describe("resolveDeviceFromDimensions", () => {
  test("routes iPad dimensions to ipad-13", () => {
    // 13" iPad Pro portrait
    expect(resolveDeviceFromDimensions(2064, 2752)).toBe("ipad-13");
    // 13" iPad Pro landscape
    expect(resolveDeviceFromDimensions(2752, 2064)).toBe("ipad-13");
    // 12.9" iPad Pro
    expect(resolveDeviceFromDimensions(2048, 2732)).toBe("ipad-13");
  });

  test("routes Android and Pixel dimensions to pixel-10-pro", () => {
    // Pixel 10 / 9 Pro native screen
    expect(resolveDeviceFromDimensions(1280, 2856)).toBe("pixel-10-pro");
    // Play phone 1080x1920
    expect(resolveDeviceFromDimensions(1080, 1920)).toBe("pixel-10-pro");
    // Play video / preview 1080x2400
    expect(resolveDeviceFromDimensions(1080, 2400)).toBe("pixel-10-pro");
  });

  test("routes iPhone dimensions to iphone-6.9", () => {
    // iPhone 17 Pro Max
    expect(resolveDeviceFromDimensions(1320, 2868)).toBe("iphone-6.9");
    // iPhone 16 Pro Max
    expect(resolveDeviceFromDimensions(1290, 2796)).toBe("iphone-6.9");
    // iPhone 15 Pro
    expect(resolveDeviceFromDimensions(1179, 2556)).toBe("iphone-6.9");
  });

  test("respects preferredDevice on ambiguous dimensions or fallback", () => {
    expect(resolveDeviceFromDimensions(0, 0, "ipad-13")).toBe("ipad-13");
    expect(resolveDeviceFromDimensions(0, 0, "pixel-10-pro")).toBe("pixel-10-pro");
    expect(resolveDeviceFromDimensions(0, 0, "invalid")).toBe("iphone-6.9");
  });

  test("honors mobile preferredDevice for phone aspect ratios", () => {
    // 1080x2400 is aspect 0.45; if user prefers iphone-6.9, routes to iphone-6.9
    expect(resolveDeviceFromDimensions(1080, 2400, "iphone-6.9")).toBe("iphone-6.9");
    expect(resolveDeviceFromDimensions(1080, 2400, "pixel-10-pro")).toBe("pixel-10-pro");
    // iPad aspect (~0.75) stays iPad even if iphone was requested
    expect(resolveDeviceFromDimensions(2064, 2752, "iphone-6.9")).toBe("ipad-13");
  });
});

describe("getDimensionsFromBuffer", () => {
  test("extracts width and height from valid PNG header", () => {
    const buf = Buffer.alloc(32);
    // PNG signature
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
    // IHDR chunk length & type
    buf.writeUInt32BE(13, 8);
    buf.write("IHDR", 12, "latin1");
    // Width: 2064, Height: 2752
    buf.writeUInt32BE(2064, 16);
    buf.writeUInt32BE(2752, 20);

    const dim = getDimensionsFromBuffer(buf);
    expect(dim).toEqual({ width: 2064, height: 2752 });
  });

  test("returns null for non-PNG buffer", () => {
    const buf = Buffer.from("not a png file at all");
    expect(getDimensionsFromBuffer(buf)).toBeNull();
  });
});

describe("replaceCaptureHandler", () => {
  test("rejects non-POST requests with 405", () => {
    const handler = replaceCaptureHandler({
      paths: {
        configPath: "goldie.config.ts",
        configDir: ".",
        outDir: "out",
        webDir: "out/web",
        designFile: "goldie.design.json",
        exportZip: "out/export.zip",
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = { method: "GET" } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    expect(statusCode).toBe(405);
    expect(endedWith).toBe("POST only");
  });
});

describe("importHandler", () => {
  test("rejects non-POST requests with 405", () => {
    const handler = importHandler({
      paths: {
        configPath: "goldie.config.ts",
        configDir: ".",
        outDir: "out",
        webDir: "out/web",
        designFile: "goldie.design.json",
        exportZip: "out/export.zip",
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = { method: "GET" } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    expect(statusCode).toBe(405);
    expect(endedWith).toBe("POST only");
  });

  test("rejects POST with empty files array", async () => {
    const handler = importHandler({
      paths: {
        configPath: "goldie.config.ts",
        configDir: ".",
        outDir: "out",
        webDir: "out/web",
        designFile: "goldie.design.json",
        exportZip: "out/export.zip",
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const listeners: Record<string, (...args: any[]) => void> = {};
    const req = {
      method: "POST",
      on: (event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      },
    } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      setHeader: () => {},
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    listeners.data?.(JSON.stringify({ files: [] }));
    listeners.end?.();

    await new Promise((r) => setTimeout(r, 10));
    expect(statusCode).toBe(400);
    expect(JSON.parse(endedWith).error).toBe("No files provided");
  });

  test("importHandler returns 500 if CLI manifest command fails", async () => {
    // "false" command exits with code 1
    const handler = importHandler({
      paths: {
        configPath: "/tmp/nonexistent-config.ts",
        configDir: "/tmp",
        outDir: "/tmp/out",
        webDir: "/tmp/out/web",
        designFile: "/tmp/goldie.design.json",
        exportZip: "/tmp/out/export.zip",
      },
      cli: ["false"],
    });

    let statusCode = 0;
    let endedWith = "";
    const listeners: Record<string, (...args: any[]) => void> = {};
    const req = {
      method: "POST",
      headers: {},
      on: (event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      },
    } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      setHeader: () => {},
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    listeners.data?.(
      JSON.stringify({
        files: [{ name: "screen.png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" }],
      }),
    );
    listeners.end?.();

    await new Promise((r) => setTimeout(r, 100));
    expect(statusCode).toBe(500);
    expect(JSON.parse(endedWith).error).toContain("Manifest generation failed");
  });

  test("assignUniqueSceneIds allocates unique IDs and prevents overwriting existing scenes", () => {
    // 1. First batch with duplicate generic names
    const batch1 = [{ name: "screenshot.png" }, { name: "screenshot.png" }];
    const existing = new Set<string>();
    const res1 = assignUniqueSceneIds(batch1, existing);
    expect(res1[0]?.id).toBe("screenshot");
    expect(res1[1]?.id).toBe("screenshot_2");

    // Populate existing with batch 1 IDs
    for (const r of res1) existing.add(r.id);

    // 2. Second batch with same generic names
    const batch2 = [{ name: "screenshot.png" }, { name: "screenshot.png" }];
    const res2 = assignUniqueSceneIds(batch2, existing);
    expect(res2[0]?.id).toBe("screenshot_3");
    expect(res2[1]?.id).toBe("screenshot_4");

    // 3. Numbered suffixes (e.g. Screenshot 1.png, Screenshot 2.png)
    const numberedBatch = [{ name: "Screenshot 1.png" }, { name: "Screenshot 2.png" }];
    const numberedExisting = new Set(["screenshot_1", "screenshot_2"]);
    const resNumbered = assignUniqueSceneIds(numberedBatch, numberedExisting);
    expect(resNumbered[0]?.id).toBe("screenshot_3");
    expect(resNumbered[1]?.id).toBe("screenshot_4");

    // 4. Empty/underscore fallback
    const emptyBatch = [{ name: ".png" }, { name: "____.png" }];
    const resEmpty = assignUniqueSceneIds(emptyBatch, new Set());
    expect(resEmpty[0]?.id).toBe("screenshot");
    expect(resEmpty[1]?.id).toBe("screenshot_2");
  });

  test("appendScenesToConfig appends scenes at the end of the array", () => {
    // Empty scenes array
    const emptyConfig = `export default {\n  scenes: [\n  ],\n};\n`;
    const res1 = appendScenesToConfig(emptyConfig, [
      { id: "shot_1", label: "Shot 1" },
      { id: "shot_2", label: "Shot 2" },
    ]);
    expect(res1).toContain(`id: "shot_1"`);
    expect(res1).toContain(`id: "shot_2"`);
    expect(res1.indexOf(`id: "shot_1"`)).toBeLessThan(res1.indexOf(`id: "shot_2"`));

    // Appending to already populated scenes array
    const res2 = appendScenesToConfig(res1, [
      { id: "shot_3", label: "Shot 3" },
      { id: "shot_4", label: "Shot 4" },
    ]);
    expect(res2).toContain(`id: "shot_3"`);
    expect(res2).toContain(`id: "shot_4"`);
    // shot_1 < shot_2 < shot_3 < shot_4
    expect(res2.indexOf(`id: "shot_1"`)).toBeLessThan(res2.indexOf(`id: "shot_2"`));
    expect(res2.indexOf(`id: "shot_2"`)).toBeLessThan(res2.indexOf(`id: "shot_3"`));
    expect(res2.indexOf(`id: "shot_3"`)).toBeLessThan(res2.indexOf(`id: "shot_4"`));
    // Verify trailing scenes array closes cleanly
    expect(res2.indexOf(`id: "shot_4"`)).toBeLessThan(res2.indexOf(`],\n};`));

    // Duplicate scenes are skipped
    const res3 = appendScenesToConfig(res2, [{ id: "shot_3", label: "Shot 3 duplicate" }]);
    expect(res3).toBe(res2);
  });

  test("importHandler preserves earlier screenshots across multiple sequential imports", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-import-test-"));
    const configPath = join(tmp, "appassets.config.ts");
    const outDir = join(tmp, "out");
    const webDir = join(outDir, "web");
    const designFile = join(tmp, "appassets.design.json");

    await mkdir(tmp, { recursive: true });
    await mkdir(outDir, { recursive: true });
    await mkdir(webDir, { recursive: true });

    // Initial empty config
    await writeFile(
      configPath,
      `export default {\n  scenes: [\n  ],\n};\n`,
    );
    // Initial design with order
    await writeFile(
      designFile,
      JSON.stringify({ order: [] }, null, 2),
    );

    const paths = {
      configPath,
      configDir: tmp,
      outDir,
      webDir,
      designFile,
      exportZip: join(outDir, "export.zip"),
    };

    // Use "true" command as mock CLI so manifest step succeeds
    const handler = importHandler({ paths, cli: ["true"] });

    // Helper to send import request
    const sendImport = async (files: Array<{ name: string; dataUrl: string }>) => {
      let statusCode = 0;
      let endedWith = "";
      const listeners: Record<string, (...args: any[]) => void> = {};
      const req = {
        method: "POST",
        headers: {},
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;
      const res = {
        set statusCode(code: number) {
          statusCode = code;
        },
        setHeader: () => {},
        end(body: string) {
          endedWith = body;
        },
      } as any;

      handler(req, res);
      listeners.data?.(JSON.stringify({ files, targetMode: "all", autoRoute: false }));
      listeners.end?.();

      await new Promise((r) => setTimeout(r, 120));
      return { statusCode, response: JSON.parse(endedWith || "{}") };
    };

    // Batch 1: Import 2 screenshots with identical generic names
    const dummyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const res1 = await sendImport([
      { name: "screenshot.png", dataUrl: dummyPng },
      { name: "screenshot.png", dataUrl: dummyPng },
    ]);
    expect(res1.statusCode).toBe(200);
    expect(res1.response.ok).toBe(true);
    expect(res1.response.imported).toBe(2);

    // Verify Batch 1 manifest and config
    const manifestFile = join(outDir, "raw", "iphone-6.9", "manifest.json");
    const manifest1 = JSON.parse(await readFile(manifestFile, "utf8"));
    expect(manifest1.screenshots.length).toBe(2);
    expect(manifest1.screenshots[0].sceneId).toBe("screenshot");
    expect(manifest1.screenshots[1].sceneId).toBe("screenshot_2");

    let configContent = await readFile(configPath, "utf8");
    expect(configContent).toContain(`id: "screenshot"`);
    expect(configContent).toContain(`id: "screenshot_2"`);

    // Batch 2: Import 2 MORE screenshots with the same generic names
    const res2 = await sendImport([
      { name: "screenshot.png", dataUrl: dummyPng },
      { name: "screenshot.png", dataUrl: dummyPng },
    ]);
    expect(res2.statusCode).toBe(200);
    expect(res2.response.ok).toBe(true);
    expect(res2.response.imported).toBe(2);

    // VERIFY ALL 4 SCREENSHOTS PERSIST WITHOUT REMOVING THE EARLIER ONES!
    const manifest2 = JSON.parse(await readFile(manifestFile, "utf8"));
    expect(manifest2.screenshots.length).toBe(4);
    expect(manifest2.screenshots.map((s: { sceneId: string }) => s.sceneId)).toEqual([
      "screenshot",
      "screenshot_2",
      "screenshot_3",
      "screenshot_4",
    ]);

    configContent = await readFile(configPath, "utf8");
    expect(configContent).toContain(`id: "screenshot"`);
    expect(configContent).toContain(`id: "screenshot_2"`);
    expect(configContent).toContain(`id: "screenshot_3"`);
    expect(configContent).toContain(`id: "screenshot_4"`);

    // Verify design order updated with all 4 scene IDs
    const designJson = JSON.parse(await readFile(designFile, "utf8"));
    expect(designJson.order).toEqual([
      "screenshot",
      "screenshot_2",
      "screenshot_3",
      "screenshot_4",
    ]);

    // Clean up temp dir
    await rm(tmp, { recursive: true, force: true });
  });
});

describe("locales helpers and handler", () => {
  test("extractLocalesFromConfig extracts single and multiple locales", () => {
    const single = `
      devices: ["iphone-6.9"],
      locales: ["en-US"],
      appearance: "light",
    `;
    expect(extractLocalesFromConfig(single)).toEqual(["en-US"]);

    const multiple = `
      locales: ["en-US", "ar-SA", "ja-JP"],
    `;
    expect(extractLocalesFromConfig(multiple)).toEqual(["en-US", "ar-SA", "ja-JP"]);

    const missing = `
      devices: ["iphone-6.9"],
    `;
    expect(extractLocalesFromConfig(missing)).toEqual(["en-US"]);
  });

  test("updateLocalesInConfig updates existing locales array in config", () => {
    const initial = `
      devices: ["iphone-6.9"],
      locales: ["en-US"],
      appearance: "light",
    `;
    const updated = updateLocalesInConfig(initial, ["en-US", "ar-SA"]);
    expect(updated).toContain('locales: ["en-US", "ar-SA"]');
    expect(extractLocalesFromConfig(updated)).toEqual(["en-US", "ar-SA"]);
  });

  test("PRESET_LOCALES includes expected App Store locales with RTL markings", () => {
    const ar = PRESET_LOCALES.find((p) => p.code === "ar-SA");
    expect(ar).toBeDefined();
    expect(ar?.rtl).toBe(true);

    const he = PRESET_LOCALES.find((p) => p.code === "he-IL");
    expect(he).toBeDefined();
    expect(he?.rtl).toBe(true);

    const en = PRESET_LOCALES.find((p) => p.code === "en-US");
    expect(en).toBeDefined();
    expect(en?.rtl).toBe(false);
  });

  test("localesHandler rejects non-GET/POST methods with 405", () => {
    const handler = localesHandler({
      paths: {
        configPath: "goldie.config.ts",
        configDir: ".",
        outDir: "out",
        webDir: "out/web",
        designFile: "goldie.design.json",
        exportZip: "out/export.zip",
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    const req = { method: "DELETE" } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      end() {},
    } as any;

    handler(req, res);
    expect(statusCode).toBe(405);
  });
});

describe("singleExportHandler", () => {
  test("returns 400 when sceneId query parameter is omitted", async () => {
    const handler = singleExportHandler({
      paths: {
        configPath: "goldie.config.ts",
        configDir: ".",
        outDir: "out",
        webDir: "out/web",
        designFile: "goldie.design.json",
        exportZip: "out/export.zip",
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = { method: "GET", url: "/api/export-single?device=iphone-6.9" } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    expect(statusCode).toBe(400);
    expect(endedWith).toContain("sceneId query param required");
  });

  test("serves existing screenshot with proper headers when up-to-date", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-test-"));
    const outDir = join(tmp, "out");
    const screenshotsDir = join(outDir, "screenshots", "iphone-6.9", "en-US");
    await mkdir(screenshotsDir, { recursive: true });
    const imgPath = join(screenshotsDir, "01-home.png");
    await writeFile(imgPath, "fake-png-content");

    const handler = singleExportHandler({
      paths: {
        configPath: join(tmp, "goldie.config.ts"),
        configDir: tmp,
        outDir,
        webDir: join(outDir, "web"),
        designFile: join(tmp, "goldie.design.json"),
        exportZip: join(outDir, "export.zip"),
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    const headers: Record<string, string | number> = {};

    const req = {
      method: "GET",
      url: "/api/export-single?sceneId=home&device=iphone-6.9&locale=en-US",
    } as any;
    const res = new PassThrough() as any;
    res.writeHead = (code: number, h: Record<string, string | number>) => {
      statusCode = code;
      Object.assign(headers, h);
    };

    handler(req, res);
    await new Promise((r) => setTimeout(r, 60));

    expect(statusCode).toBe(200);
    expect(headers["Content-Type"]).toBe("image/png");
    expect(headers["Content-Disposition"]).toContain('filename="home-iphone-6.9.png"');
    expect(headers["Cache-Control"]).toBe("no-store");

    await rm(tmp, { recursive: true, force: true });
  });

  test("returns 404 if screenshot not found and frame CLI does not generate it", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-test-"));
    const outDir = join(tmp, "out");
    await mkdir(outDir, { recursive: true });

    const handler = singleExportHandler({
      paths: {
        configPath: join(tmp, "goldie.config.ts"),
        configDir: tmp,
        outDir,
        webDir: join(outDir, "web"),
        designFile: join(tmp, "goldie.design.json"),
        exportZip: join(outDir, "export.zip"),
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = {
      method: "GET",
      url: "/api/export-single?sceneId=missing&device=iphone-6.9&locale=en-US",
    } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    await new Promise((r) => setTimeout(r, 60));

    expect(statusCode).toBe(404);
    expect(endedWith).toContain('Screenshot for scene "missing" not found');

    await rm(tmp, { recursive: true, force: true });
  });
});

describe("selectedExportZipHandler", () => {
  test("rejects non-POST requests with 405", () => {
    const handler = selectedExportZipHandler({
      paths: studioPaths("goldie.config.ts"),
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = { method: "GET" } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    expect(statusCode).toBe(405);
    expect(endedWith).toBe("POST only");
  });

  test("returns 400 when items array is empty", async () => {
    const handler = selectedExportZipHandler({
      paths: studioPaths("goldie.config.ts"),
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = new PassThrough() as any;
    req.method = "POST";
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      setHeader() {},
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    req.end(JSON.stringify({ items: [] }));
    await new Promise((r) => setTimeout(r, 40));

    expect(statusCode).toBe(400);
    expect(JSON.parse(endedWith).error).toBe("items array cannot be empty");
  });

  test("packages selected screenshots into ZIP buffer", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-sel-test-"));
    const outDir = join(tmp, "out");
    const screenshotsDir = join(outDir, "screenshots", "iphone-6.9", "en-US");
    await mkdir(screenshotsDir, { recursive: true });
    await writeFile(join(screenshotsDir, "01-home.png"), "home-image-bytes");
    await writeFile(join(screenshotsDir, "02-features.png"), "features-image-bytes");

    const handler = selectedExportZipHandler({
      paths: {
        configPath: join(tmp, "goldie.config.ts"),
        configDir: tmp,
        outDir,
        webDir: join(outDir, "web"),
        designFile: join(tmp, "goldie.design.json"),
        exportZip: join(outDir, "export.zip"),
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let responseHeaders: Record<string, any> = {};
    let endBuffer: Buffer | null = null;
    const req = new PassThrough() as any;
    req.method = "POST";
    const res = {
      writeHead(code: number, headers: any) {
        statusCode = code;
        responseHeaders = headers;
      },
      end(data: any) {
        endBuffer = data;
      },
    } as any;

    handler(req, res);
    req.end(
      JSON.stringify({
        device: "iphone-6.9",
        locale: "en-US",
        items: [{ sceneId: "home" }],
      }),
    );
    await new Promise((r) => setTimeout(r, 60));

    expect(statusCode).toBe(200);
    expect(responseHeaders["Content-Type"]).toBe("application/zip");
    expect(responseHeaders["Content-Disposition"]).toContain("selected-screenshots-iphone-6.9.zip");
    expect(Buffer.isBuffer(endBuffer)).toBe(true);

    await rm(tmp, { recursive: true, force: true });
  });
});

describe("aiCopyHandler", () => {
  test("rejects non-POST requests with 405", () => {
    const handler = aiCopyHandler({
      paths: {
        configPath: "goldie.config.ts",
        configDir: ".",
        outDir: "out",
        webDir: "out/web",
        designFile: "goldie.design.json",
        exportZip: "out/export.zip",
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = { method: "GET" } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    expect(statusCode).toBe(405);
    expect(endedWith).toBe("POST only");
  });

  test("returns 400 when sceneId is missing in body", async () => {
    const handler = aiCopyHandler({
      paths: {
        configPath: "goldie.config.ts",
        configDir: ".",
        outDir: "out",
        webDir: "out/web",
        designFile: "goldie.design.json",
        exportZip: "out/export.zip",
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const listeners: Record<string, (...args: any[]) => void> = {};
    const req = {
      method: "POST",
      on: (event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      },
    } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      setHeader: () => {},
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    listeners.data?.(JSON.stringify({}));
    listeners.end?.();

    await new Promise((r) => setTimeout(r, 20));
    expect(statusCode).toBe(400);
    expect(JSON.parse(endedWith).error).toBe("sceneId is required");
  });

  test("returns 404 when screenshot image is not found on disk", async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "dummy-test-key-for-unit-test";
    try {
      const tmp = await mkdtemp(join(tmpdir(), "goldie-ai-test-"));
      const outDir = join(tmp, "out");
      await mkdir(outDir, { recursive: true });

      const handler = aiCopyHandler({
        paths: {
          configPath: join(tmp, "goldie.config.ts"),
          configDir: tmp,
          outDir,
          webDir: join(outDir, "web"),
          designFile: join(tmp, "goldie.design.json"),
          exportZip: join(outDir, "export.zip"),
        },
        cli: ["echo"],
      });

      let statusCode = 0;
      let endedWith = "";
      const listeners: Record<string, (...args: any[]) => void> = {};
      const req = {
        method: "POST",
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;
      const res = {
        set statusCode(code: number) {
          statusCode = code;
        },
        setHeader: () => {},
        end(body: string) {
          endedWith = body;
        },
      } as any;

      handler(req, res);
      listeners.data?.(JSON.stringify({ sceneId: "nonexistent_scene" }));
      listeners.end?.();

      for (let i = 0; i < 50 && statusCode === 0; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      expect(statusCode).toBe(404);
      expect(JSON.parse(endedWith).error).toContain(
        'Screenshot file for scene "nonexistent_scene" not found',
      );

      await rm(tmp, { recursive: true, force: true });
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
      else delete process.env.GEMINI_API_KEY;
    }
  });

  test("aiCopyHandler rejects customPrompt exceeding 300 characters with 400", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-test-"));
    const handler = aiCopyHandler({
      paths: {
        outDir: tmp,
        configDir: tmp,
        configPath: join(tmp, "appassets.config.ts"),
        designFile: join(tmp, "goldie.design.json"),
        webDir: join(tmp, "web"),
        exportZip: join(tmp, "export.zip"),
      },
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const listeners: Record<string, (...args: any[]) => void> = {};
    const req = {
      method: "POST",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
      on: (event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      },
    } as any;
    const res = {
      set statusCode(code: number) {
        statusCode = code;
      },
      setHeader: () => {},
      end(body: string) {
        endedWith = body;
      },
    } as any;

    handler(req, res);
    listeners.data?.(
      JSON.stringify({
        sceneId: "home",
        customPrompt: "A".repeat(301),
      }),
    );
    listeners.end?.();

    await new Promise((r) => setTimeout(r, 20));
    expect(statusCode).toBe(400);
    expect(JSON.parse(endedWith).error).toContain("exceeds maximum allowed length");

    await rm(tmp, { recursive: true, force: true });
  });

  test("aiCopyHandler returns 429 and Retry-After when rate limit is exceeded", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-test-"));
    const mockLimiter = new MemoryRateLimiter({ windowMs: 60000, maxRequests: 2 });
    const handler = aiCopyHandler(
      {
        paths: {
          outDir: tmp,
          configDir: tmp,
          configPath: join(tmp, "appassets.config.ts"),
          designFile: join(tmp, "goldie.design.json"),
          webDir: join(tmp, "web"),
          exportZip: join(tmp, "export.zip"),
        },
        cli: ["echo"],
      },
      mockLimiter,
    );

    const headersSent: Record<string, string> = {};
    const makeReq = () => {
      let sc = 0;
      let body = "";
      const listeners: Record<string, (...args: any[]) => void> = {};
      const req = {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.195" },
        socket: { remoteAddress: "127.0.0.1" },
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;
      const res = {
        set statusCode(code: number) {
          sc = code;
        },
        setHeader: (k: string, v: string) => {
          headersSent[k] = v;
        },
        end(b: string) {
          body = b;
        },
      } as any;
      handler(req, res);
      listeners.data?.(JSON.stringify({ sceneId: "test" }));
      listeners.end?.();
      return { getStatusCode: () => sc, getBody: () => body };
    };

    // Request 1: allowed (limit 2, remaining 1)
    makeReq();
    expect(headersSent["X-RateLimit-Remaining"]).toBe("1");

    // Request 2: allowed (limit 2, remaining 0)
    makeReq();
    expect(headersSent["X-RateLimit-Remaining"]).toBe("0");

    // Request 3: blocked (429)
    const req3 = makeReq();
    await new Promise((r) => setTimeout(r, 20));
    expect(req3.getStatusCode()).toBe(429);
    expect(headersSent["Retry-After"]).toBeDefined();
    expect(Number(headersSent["Retry-After"])).toBeGreaterThan(0);
    expect(JSON.parse(req3.getBody()).error).toContain("Rate limit reached");

    mockLimiter.destroy();
    await rm(tmp, { recursive: true, force: true });
  });
});

describe("MemoryRateLimiter", () => {
  test("allows requests up to max and decrements remaining", () => {
    const limiter = new MemoryRateLimiter({ windowMs: 1000, maxRequests: 3 });
    const ip = "192.168.1.1";

    const r1 = limiter.check(ip);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r1.limit).toBe(3);

    const r2 = limiter.check(ip);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check(ip);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = limiter.check(ip);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);

    limiter.destroy();
  });

  test("resets record on reset()", () => {
    const limiter = new MemoryRateLimiter({ windowMs: 1000, maxRequests: 1 });
    const ip = "10.0.0.1";

    expect(limiter.check(ip).allowed).toBe(true);
    expect(limiter.check(ip).allowed).toBe(false);

    limiter.reset(ip);
    expect(limiter.check(ip).allowed).toBe(true);

    limiter.destroy();
  });
});

describe("getClientIp", () => {
  test("extracts IP from single x-forwarded-for header", () => {
    const req = { headers: { "x-forwarded-for": "1.2.3.4" } } as any;
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  test("extracts first IP from comma-separated x-forwarded-for header", () => {
    const req = { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1, 192.168.1.1" } } as any;
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  test("extracts IP from cf-connecting-ip header", () => {
    const req = { headers: { "cf-connecting-ip": "9.8.7.6" } } as any;
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  test("extracts IP from x-real-ip header", () => {
    const req = { headers: { "x-real-ip": "5.6.7.8" } } as any;
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  test("falls back to socket remoteAddress", () => {
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any;
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});

describe("exportHandler", () => {
  test("rejects non-POST methods with 405 on base /api/export", () => {
    const tmp = join(tmpdir(), "goldie-exp-test");
    const handler = exportHandler({
      paths: studioPaths(join(tmp, "goldie.config.ts")),
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = { method: "GET" } as any;
    const res = {
      set statusCode(c: number) {
        statusCode = c;
      },
      end(b: string) {
        endedWith = b;
      },
    } as any;

    handler("")(req, res);
    expect(statusCode).toBe(405);
    expect(endedWith).toBe("POST only");
  });

  test("returns 404 on /download when exportZip does not exist", () => {
    const tmp = join(tmpdir(), `goldie-exp-${Date.now()}`);
    const handler = exportHandler({
      paths: studioPaths(join(tmp, "goldie.config.ts")),
      cli: ["echo"],
    });

    let statusCode = 0;
    let endedWith = "";
    const req = { method: "GET" } as any;
    const res = {
      set statusCode(c: number) {
        statusCode = c;
      },
      end(b: string) {
        endedWith = b;
      },
    } as any;

    handler("/download")(req, res);
    expect(statusCode).toBe(404);
    expect(endedWith).toContain("No export yet");
  });

  test("serves exportZip on /download with proper headers and custom filename", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-exp-dl-"));
    const paths = studioPaths(join(tmp, "goldie.config.ts"));
    await mkdir(paths.outDir, { recursive: true });
    await writeFile(paths.exportZip, Buffer.from("dummy zip data"));

    const handler = exportHandler({
      paths,
      cli: ["echo"],
    });

    const headers: Record<string, any> = {};
    let writtenCode = 0;
    const req = {
      method: "GET",
      url: "/api/export/download?filename=MyApp-assets.zip",
    } as any;
    const res = new PassThrough() as any;
    res.writeHead = (code: number, h: Record<string, any>) => {
      writtenCode = code;
      Object.assign(headers, h);
    };

    const finishPromise = new Promise((resolve) => res.on("finish", resolve));
    handler("/download")(req, res);
    expect(writtenCode).toBe(200);
    expect(headers["Content-Type"]).toBe("application/zip");
    expect(headers["Content-Disposition"]).toBe('attachment; filename="MyApp-assets.zip"');

    await finishPromise;
    await rm(tmp, { recursive: true, force: true });
  });

  test("runs export pipeline and gracefully skips missing video preview", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-exp-stream-"));
    const paths = studioPaths(join(tmp, "goldie.config.ts"));
    await mkdir(join(paths.outDir, "screenshots", "iphone-6.9", "en-US"), { recursive: true });
    await writeFile(
      join(paths.outDir, "screenshots", "iphone-6.9", "en-US", "01-home.png"),
      Buffer.from("mock-png"),
    );
    const testIconPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    await writeFile(join(paths.outDir, "icon.png"), testIconPng);

    // Mock CLI script: exits 0 for frame/manifest, exits 1 for preview
    const cliScript = join(tmp, "mock-cli.js");
    await writeFile(
      cliScript,
      `
      const cmd = process.argv[2];
      if (cmd === "preview") {
        console.error("No preview clips found");
        process.exit(1);
      }
      console.log("ok: " + cmd);
      process.exit(0);
      `,
    );

    const handler = exportHandler({
      paths,
      cli: ["node", cliScript],
    });

    let output = "";
    const listeners: Record<string, (...args: any[]) => void> = {};
    const req = {
      method: "POST",
      on: (event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      },
    } as any;
    const res = {
      writeHead: () => {},
      write: (chunk: string) => {
        output += chunk;
      },
      end: () => {},
    } as any;

    handler("")(req, res);
    listeners.data?.(JSON.stringify({}));
    listeners.end?.();

    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (output.includes("[done]") || output.includes("[failed]")) {
          clearInterval(check);
          resolve(null);
        }
      }, 50);
    });

    expect(output).toContain("$ appassets frame");
    expect(output).toContain("$ appassets preview");
    expect(output).toContain("no preview clips found, skipping video preview");
    expect(output).toContain("$ appassets manifest");
    expect(output).toContain("$ zip store package");
    expect(output).toContain("[done]");

    const { exec } = await import("./exec.ts");
    const listing = await exec("unzip", ["-l", paths.exportZip], { quiet: true });
    if (listing.code === 0) {
      expect(listing.stdout).toContain("AppStore/iPhone-6.9/en-US/01-home.png");
      expect(listing.stdout).toContain("STORE_GUIDE.txt");
      expect(listing.stdout).toContain("GooglePlay/app-icon-512x512.png");
      expect(listing.stdout).toContain("AppStore/app-icon-1024x1024.png");
    }

    await rm(tmp, { recursive: true, force: true });
  });

  test("exportHandler respects targets filtering to exclude unselected platforms and files", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-exp-filtered-"));
    const paths = studioPaths(join(tmp, "goldie.config.ts"));
    await mkdir(join(paths.outDir, "screenshots", "iphone-6.9", "en-US"), { recursive: true });
    await mkdir(join(paths.outDir, "screenshots", "pixel-10-pro", "en-US"), { recursive: true });
    await writeFile(
      join(paths.outDir, "screenshots", "iphone-6.9", "en-US", "01-home.png"),
      Buffer.from("mock-png"),
    );
    await writeFile(
      join(paths.outDir, "screenshots", "pixel-10-pro", "en-US", "01-home.png"),
      Buffer.from("mock-png"),
    );
    const testIconPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    await writeFile(join(paths.outDir, "icon.png"), testIconPng);

    const cliScript = join(tmp, "mock-cli.js");
    await writeFile(
      cliScript,
      `
      console.log("ok");
      process.exit(0);
      `,
    );

    const handler = exportHandler({
      paths,
      cli: ["node", cliScript],
    });

    let output = "";
    const listeners: Record<string, (...args: any[]) => void> = {};
    const req = {
      method: "POST",
      on: (event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      },
    } as any;
    const res = {
      writeHead: () => {},
      write: (chunk: string) => {
        output += chunk;
      },
      end: () => {},
    } as any;

    handler("")(req, res);
    // Request ONLY iPhone, excluding Google Play, guidelines, and marketing
    listeners.data?.(
      JSON.stringify({
        targets: {
          iphone: true,
          ipad: false,
          googlePlay: false,
          marketing: false,
          guidelines: false,
        },
      }),
    );
    listeners.end?.();

    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (output.includes("[done]") || output.includes("[failed]")) {
          clearInterval(check);
          resolve(null);
        }
      }, 50);
    });

    expect(output).toContain("[done]");

    const { exec } = await import("./exec.ts");
    const listing = await exec("unzip", ["-l", paths.exportZip], { quiet: true });
    if (listing.code === 0) {
      expect(listing.stdout).toContain("AppStore/iPhone-6.9/en-US/01-home.png");
      expect(listing.stdout).toContain("AppStore/app-icon-1024x1024.png");
      expect(listing.stdout).not.toContain("GooglePlay/Phone/en-US/01-home.png");
      expect(listing.stdout).not.toContain("GooglePlay/app-icon-512x512.png");
      expect(listing.stdout).not.toContain("STORE_GUIDE.txt");
    }

    await rm(tmp, { recursive: true, force: true });
  });
});

describe("iconHandler", () => {
  test("handles GET, POST, and DELETE for app icon", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-icon-test-"));
    const webDir = join(tmp, "out", "web");
    const outDir = join(tmp, "out");
    const designFile = join(tmp, "goldie.design.json");

    const paths = {
      ...studioPaths(tmp),
      webDir,
      outDir,
      designFile,
    };

    const handler = iconHandler({ paths, cli: ["echo"] });

    // 1. GET initially returns null
    {
      let responseBody = "";
      const req = { method: "GET" } as any;
      const res = {
        writeHead: () => {},
        end: (body: string) => {
          responseBody = body;
        },
      } as any;

      handler(req, res);
      for (let i = 0; i < 50 && responseBody === ""; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      const parsed = JSON.parse(responseBody);
      expect(parsed.iconUrl).toBeNull();
    }

    // 2. POST valid base64 dataUrl saves icon and updates designFile
    {
      let responseBody = "";
      const fakePngDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const listeners: Record<string, (...args: any[]) => void> = {};
      const req = {
        method: "POST",
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;
      const res = {
        writeHead: () => {},
        end: (body: string) => {
          responseBody = body;
        },
      } as any;

      handler(req, res);
      listeners.data?.(JSON.stringify({ dataUrl: fakePngDataUrl }));
      listeners.end?.();

      for (let i = 0; i < 50 && responseBody === ""; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      const parsed = JSON.parse(responseBody);
      expect(parsed.success).toBe(true);
      expect(parsed.iconUrl).toBe("/icon.png");

      const fs = await import("node:fs");
      expect(fs.existsSync(join(webDir, "icon.png"))).toBe(true);
      expect(fs.existsSync(join(outDir, "icon.png"))).toBe(true);
      expect(fs.existsSync(designFile)).toBe(true);
      const designJson = JSON.parse(fs.readFileSync(designFile, "utf8"));
      expect(designJson.appIcon).toBe("/icon.png");
    }

    // 3. GET now returns /icon.png
    {
      let responseBody = "";
      const req = { method: "GET" } as any;
      const res = {
        writeHead: () => {},
        end: (body: string) => {
          responseBody = body;
        },
      } as any;

      handler(req, res);
      for (let i = 0; i < 50 && responseBody === ""; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      const parsed = JSON.parse(responseBody);
      expect(parsed.iconUrl).toBe("/icon.png");
    }

    // 4. DELETE removes icon files and clears appIcon from designFile
    {
      let responseBody = "";
      const req = { method: "DELETE" } as any;
      const res = {
        writeHead: () => {},
        end: (body: string) => {
          responseBody = body;
        },
      } as any;

      handler(req, res);
      for (let i = 0; i < 50 && responseBody === ""; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      const parsed = JSON.parse(responseBody);
      expect(parsed.success).toBe(true);
      expect(parsed.iconUrl).toBeNull();

      const fs = await import("node:fs");
      expect(fs.existsSync(join(webDir, "icon.png"))).toBe(false);
      expect(fs.existsSync(join(outDir, "icon.png"))).toBe(false);
      const designJson = JSON.parse(fs.readFileSync(designFile, "utf8"));
      expect(designJson.appIcon).toBeUndefined();
    }

    await rm(tmp, { recursive: true, force: true });
  });

  test("syncs appInfo.icon when appInfo exists in designFile on upload and delete", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-icon-appinfo-test-"));
    const webDir = join(tmp, "out", "web");
    const outDir = join(tmp, "out");
    const designFile = join(tmp, "goldie.design.json");

    await writeFile(
      designFile,
      JSON.stringify({
        appInfo: {
          name: "Acme App",
          category: "Utility",
        },
      }),
    );

    const paths = {
      ...studioPaths(tmp),
      webDir,
      outDir,
      designFile,
    };

    const handler = iconHandler({ paths, cli: ["echo"] });

    // 1. Upload icon
    {
      let ended = false;
      const fakePngDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const listeners: Record<string, (...args: any[]) => void> = {};
      const req = {
        method: "POST",
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;
      const res = {
        writeHead: () => {},
        end: () => {
          ended = true;
        },
      } as any;

      handler(req, res);
      listeners.data?.(JSON.stringify({ dataUrl: fakePngDataUrl }));
      listeners.end?.();

      for (let i = 0; i < 50 && !ended; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      const fs = await import("node:fs");
      const designJson = JSON.parse(fs.readFileSync(designFile, "utf8"));
      expect(designJson.appIcon).toBe("/icon.png");
      expect(designJson.appInfo.icon).toBe("/icon.png");
      expect(designJson.appInfo.name).toBe("Acme App");
    }

    // 2. Delete icon
    {
      let ended = false;
      const req = { method: "DELETE" } as any;
      const res = {
        writeHead: () => {},
        end: () => {
          ended = true;
        },
      } as any;

      handler(req, res);
      for (let i = 0; i < 50 && !ended; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      const fs = await import("node:fs");
      const designJson = JSON.parse(fs.readFileSync(designFile, "utf8"));
      expect(designJson.appIcon).toBeUndefined();
      expect(designJson.appInfo.icon).toBeUndefined();
      expect(designJson.appInfo.name).toBe("Acme App");
    }

    await rm(tmp, { recursive: true, force: true });
  });
});

describe("bannerExportHandler", () => {
  test("serves banner image via GET and POST", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-banner-test-"));
    const configPath = join(tmp, "goldie.config.ts");
    await writeFile(
      configPath,
      `
      import type { GoldieConfig } from "${join(process.cwd(), "src", "config.ts")}";
      const config: GoldieConfig = {
        appRoot: "${tmp}",
        devices: ["iphone-6.9"],
        locales: ["en-US"],
        appearance: "light",
        frame: { variant: "17-pro-blue" },
        theme: {
          background: "#0E1B2A",
          headlineColor: "#FFFFFF",
          subheadColor: "#D9E1EA",
          fontFamily: "system-ui",
          layout: "classic",
        },
        scenes: [],
      };
      export default config;
      `,
    );

    const paths = {
      ...studioPaths(configPath),
      configPath,
      designFile: join(tmp, "goldie.design.json"),
    };

    const handler = bannerExportHandler({ paths, cli: ["echo"] });

    // 1. GET banner
    {
      let statusCode = 0;
      let headers: Record<string, string> = {};
      let buffer: Buffer | null = null;

      const req = {
        method: "GET",
        url: "/api/export-banner?type=google-play&locale=en-US",
      } as any;

      const res = {
        writeHead: (code: number, h: Record<string, string>) => {
          statusCode = code;
          headers = h;
        },
        end: (data: Buffer) => {
          buffer = data;
        },
      } as any;

      handler(req, res);
      for (let i = 0; i < 50 && statusCode === 0; i++) {
        await new Promise((r) => setTimeout(r, 40));
      }

      expect(statusCode).toBe(200);
      expect(headers["Content-Type"]).toBe("image/png");
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer!.length).toBeGreaterThan(1000);
    }

    // 2. POST banner with JSON payload
    {
      let statusCode = 0;
      let headers: Record<string, string> = {};
      let buffer: Buffer | null = null;
      const listeners: Record<string, (...args: any[]) => void> = {};

      const req = {
        method: "POST",
        url: "/api/export-banner",
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;

      const res = {
        writeHead: (code: number, h: Record<string, string>) => {
          statusCode = code;
          headers = h;
        },
        end: (data: Buffer) => {
          buffer = data;
        },
      } as any;

      handler(req, res);
      listeners.data?.(
        JSON.stringify({
          type: "google-play",
          deviceCount: "trio",
          headline: "Fast Finance",
          tagline: "Split with anyone",
          benefits: ["Speed", "Privacy", "Zero fees"],
        }),
      );
      listeners.end?.();

      for (let i = 0; i < 50 && statusCode === 0; i++) {
        await new Promise((r) => setTimeout(r, 40));
      }

      expect(statusCode).toBe(200);
      expect(headers["Content-Type"]).toBe("image/png");
      expect(headers["Content-Disposition"]).toContain("google-play-1024x500.png");
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer!.length).toBeGreaterThan(1000);
    }

    // 3. POST banner with scale: 2 (Retina Ultra HD)
    {
      let statusCode = 0;
      let headers: Record<string, string> = {};
      let buffer: Buffer | null = null;
      const listeners: Record<string, (...args: any[]) => void> = {};

      const req = {
        method: "POST",
        url: "/api/export-banner",
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;

      const res = {
        writeHead: (code: number, h: Record<string, string>) => {
          statusCode = code;
          headers = h;
        },
        end: (data: Buffer) => {
          buffer = data;
        },
      } as any;

      handler(req, res);
      listeners.data?.(
        JSON.stringify({
          type: "google-play",
          scale: 2,
          retina: true,
          headline: "Retina Sharpness",
        }),
      );
      listeners.end?.();

      for (let i = 0; i < 50 && statusCode === 0; i++) {
        await new Promise((r) => setTimeout(r, 40));
      }

      expect(statusCode).toBe(200);
      expect(headers["Content-Type"]).toBe("image/png");
      expect(headers["Content-Disposition"]).toContain("google-play-2048x1000@2x.png");
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer!.length).toBeGreaterThan(1000);
    }

    await rm(tmp, { recursive: true, force: true });
  });

  describe("renderAppIconCanvas & store packaging", () => {
    test("renders 512x512 Google Play and 1024x1024 App Store icons accurately", async () => {
      // 1x1 test PNG
      const testPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      // Render 512x512 with scaling, corner radius, and background
      const icon512 = await renderAppIconCanvas(testPng, 512, {
        scale: 0.8,
        bg: "#007AFF",
        cornerRadius: 20,
      });
      expect(Buffer.isBuffer(icon512)).toBe(true);
      const dims512 = getDimensionsFromBuffer(icon512);
      expect(dims512).not.toBeNull();
      expect(dims512!.width).toBe(512);
      expect(dims512!.height).toBe(512);

      // Render 1024x1024 with zoom 1.25, offset pan, and cornerRadius
      const icon1024 = await renderAppIconCanvas(testPng, 1024, {
        scale: 1.25,
        offsetX: 10,
        offsetY: -5,
        cornerRadius: 22.5,
      });
      expect(Buffer.isBuffer(icon1024)).toBe(true);
      const dims1024 = getDimensionsFromBuffer(icon1024);
      expect(dims1024).not.toBeNull();
      expect(dims1024!.width).toBe(1024);
      expect(dims1024!.height).toBe(1024);
    });

    test("faviconExportHandler generates complete web & favicon kit ZIP", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "goldie-fav-"));
      const paths = studioPaths(join(tmp, "goldie.config.ts"));
      await mkdir(paths.webDir, { recursive: true });

      const handler = faviconExportHandler({ paths, cli: { run: async () => 0 } as any });

      // 1. Returns 404 when no icon exists
      const mockReqEmpty: any = { method: "GET", url: "/api/export-favicon" };
      let statusCode = 0;
      const mockResEmpty: any = {
        setHeader() {},
        end() {},
        set statusCode(val: number) {
          statusCode = val;
        },
      };
      handler(mockReqEmpty, mockResEmpty);
      await new Promise((r) => setTimeout(r, 50));
      expect(statusCode).toBe(404);

      // 2. Put a test PNG icon in webDir
      const testPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
      await writeFile(join(paths.webDir, "icon.png"), testPng);

      // 3. Request favicon export
      let resHeaders: any = {};
      let writtenData: Buffer | null = null;
      const mockResValid: any = {
        writeHead(code: number, headers: any) {
          statusCode = code;
          resHeaders = headers;
        },
        end(data: any) {
          writtenData = data;
        },
      };
      const mockReqValid: any = { method: "GET", url: "/api/export-favicon?appName=MyTestApp" };
      handler(mockReqValid, mockResValid);
      await new Promise((r) => setTimeout(r, 150));

      expect(statusCode).toBe(200);
      expect(resHeaders["Content-Type"]).toBe("application/zip");
      expect(resHeaders["Content-Disposition"]).toContain("MyTestApp-favicon-web-kit.zip");
      expect(Buffer.isBuffer(writtenData)).toBe(true);
      expect(writtenData!.length).toBeGreaterThan(100);

      // 4. Request favicon export via POST with customDataUrl
      let postStatusCode = 0;
      let postResHeaders: any = {};
      let postWrittenData: Buffer | null = null;
      const mockPostRes: any = {
        writeHead(code: number, headers: any) {
          postStatusCode = code;
          postResHeaders = headers;
        },
        end(data: any) {
          postWrittenData = data;
        },
      };
      const postBody = JSON.stringify({
        appName: "CustomFavApp",
        themeColor: "#ff0055",
        iconDataUrl: `data:image/png;base64,${testPng.toString("base64")}`,
      });
      const { EventEmitter } = await import("node:events");
      const mockPostReq: any = new EventEmitter();
      mockPostReq.method = "POST";
      mockPostReq.url = "/api/export-favicon";

      handler(mockPostReq, mockPostRes);
      mockPostReq.emit("data", Buffer.from(postBody));
      mockPostReq.emit("end");

      await new Promise((r) => setTimeout(r, 150));

      expect(postStatusCode).toBe(200);
      expect(postResHeaders["Content-Type"]).toBe("application/zip");
      expect(postResHeaders["Content-Disposition"]).toContain("CustomFavApp-favicon-web-kit.zip");
      expect(Buffer.isBuffer(postWrittenData)).toBe(true);
      expect(postWrittenData!.length).toBeGreaterThan(100);

      await rm(tmp, { recursive: true, force: true });
    });

    test("healthHandler responds with 200 OK and service status", async () => {
      const { healthHandler } = await import("./studio-server.ts");
      const handler = healthHandler({ paths: {} as any, cli: {} as any });
      let statusCode = 0;
      let headers: any = {};
      let body = "";
      const res: any = {
        writeHead(code: number, h: any) {
          statusCode = code;
          headers = h;
        },
        end(data: string) {
          body = data;
        },
      };
      handler({ method: "GET", url: "/api/health" } as any, res);
      expect(statusCode).toBe(200);
      expect(headers["Content-Type"]).toBe("application/json");
      const parsed = JSON.parse(body);
      expect(parsed.status).toBe("ok");
      expect(parsed.service).toBe("appassets-studio");
      expect(typeof parsed.uptimeSeconds).toBe("number");
      expect(typeof parsed.timestamp).toBe("string");
    });
  });

  describe("Multi-Tenant Session & Workspace Isolation", () => {
    test("getSessionIdFromRequest correctly extracts and sanitizes session ID", async () => {
      const { getSessionIdFromRequest } = await import("./studio-server.ts");

      // Header priority
      const reqWithHeader: any = {
        headers: { "x-session-id": "user_abc-123!@#" },
        url: "/api/design",
      };
      expect(getSessionIdFromRequest(reqWithHeader)).toBe("user_abc-123");

      // Cookie fallback
      const reqWithCookie: any = {
        headers: { cookie: "other=val; appassets_session_id=guest_xyz-789; foo=bar" },
        url: "/api/design",
      };
      expect(getSessionIdFromRequest(reqWithCookie)).toBe("guest_xyz-789");

      // Query param fallback
      const reqWithQuery: any = {
        headers: {},
        url: "/store.json?sessionId=session_999",
      };
      expect(getSessionIdFromRequest(reqWithQuery)).toBe("session_999");

      // Default fallback
      const reqEmpty: any = {
        headers: {},
        url: "/store.json",
      };
      expect(getSessionIdFromRequest(reqEmpty)).toBe("default");
    });

    test("resolveWorkspacePaths provides separate directories per session", async () => {
      const { resolveWorkspacePaths, studioPaths } = await import("./studio-server.ts");
      const tmp = await mkdtemp(join(tmpdir(), "goldie-ws-test-"));
      const configPath = join(tmp, "appassets.config.ts");
      const baseApi = { paths: studioPaths(configPath), cli: ["bun"] };

      const defaultPaths = resolveWorkspacePaths(baseApi, "default");
      expect(defaultPaths.configPath).toBe(baseApi.paths.configPath);

      const sessionAPaths = resolveWorkspacePaths(baseApi, "session-A");
      const sessionBPaths = resolveWorkspacePaths(baseApi, "session-B");

      expect(sessionAPaths.configDir).toContain("workspaces/session-A");
      expect(sessionBPaths.configDir).toContain("workspaces/session-B");
      expect(sessionAPaths.configDir).not.toBe(sessionBPaths.configDir);
      expect(sessionAPaths.designFile).not.toBe(sessionBPaths.designFile);

      await rm(tmp, { recursive: true, force: true });
    });

    test("designHandler isolates design changes between different sessions", async () => {
      const { designHandler, studioPaths } = await import("./studio-server.ts");
      const tmp = await mkdtemp(join(tmpdir(), "goldie-design-ws-"));
      const configPath = join(tmp, "appassets.config.ts");
      await writeFile(configPath, "export default { scenes: [] };\n");
      const api = { paths: studioPaths(configPath), cli: ["bun"] };
      const handler = designHandler(api);

      // Session A saves background red
      const putReqA = new PassThrough() as any;
      putReqA.method = "PUT";
      putReqA.url = "/api/design";
      putReqA.headers = { "x-session-id": "session-A" };
      let _putCodeA = 0;
      const putResA: any = {
        statusCode: 0,
        end() { _putCodeA = this.statusCode || 200; },
      };
      handler(putReqA, putResA);
      putReqA.emit("data", JSON.stringify({ background: "#FF0000", appInfo: { name: "App A" } }));
      putReqA.emit("end");
      await new Promise((r) => setTimeout(r, 50));

      // Session B gets design (should be empty, NOT session A's data)
      const getReqB: any = {
        method: "GET",
        url: "/api/design",
        headers: { "x-session-id": "session-B" },
      };
      let bodyB = "";
      const getResB: any = {
        writeHead() {},
        end(data: string) { bodyB = data; },
      };
      handler(getReqB, getResB);
      await new Promise((r) => setTimeout(r, 50));

      expect(JSON.parse(bodyB)).toEqual({});

      // Session A gets design (should be App A)
      const getReqA: any = {
        method: "GET",
        url: "/api/design",
        headers: { "x-session-id": "session-A" },
      };
      let bodyA = "";
      const getResA: any = {
        writeHead() {},
        end(data: string) { bodyA = data; },
      };
      handler(getReqA, getResA);
      await new Promise((r) => setTimeout(r, 50));

      const parsedA = JSON.parse(bodyA);
      expect(parsedA.background).toBe("#FF0000");
      expect(parsedA.appInfo?.name).toBe("App A");

      await rm(tmp, { recursive: true, force: true });
    });
  });

  describe("Phase 1 AdSense Compliance & Routing", () => {
    test("MIME map includes text/plain for .txt files", () => {
      expect(MIME[".txt"]).toBe("text/plain; charset=utf-8");
    });

    test("ads.txt source file contains verified publisher ID and seller cert", async () => {
      const adsTxtContent = await readFile(join(import.meta.dirname, "..", "studio", "public", "ads.txt"), "utf8");
      expect(adsTxtContent).toContain("pub-9354906754361033");
      expect(adsTxtContent).toContain("f08c47fec0942fa0");
      expect(adsTxtContent).not.toContain("pub-XXXXXXXXXXXXXXXX");
    });

    test("Privacy Policy component contains mandatory AdSense disclosures and opt-out links", async () => {
      const privacyContent = await readFile(join(import.meta.dirname, "..", "studio", "src", "components", "PrivacyPolicy.tsx"), "utf8");
      expect(privacyContent).toContain("ca-pub-9354906754361033");
      expect(privacyContent).toContain("Google AdSense");
      expect(privacyContent).toContain("Google Analytics");
      expect(privacyContent).toContain("G-DEML3C77ZR");
      expect(privacyContent).toContain("google.com/settings/ads");
      expect(privacyContent).toContain("aboutads.info/choices");
      expect(privacyContent).not.toContain("Zero Ad Tracking");
    });

    test("AdBanner component enforces non-empty slot ID and prevents duplicate pushes", async () => {
      const adBannerContent = await readFile(join(import.meta.dirname, "..", "studio", "src", "components", "AdBanner.tsx"), "utf8");
      expect(adBannerContent).toContain("hasValidSlot");
      expect(adBannerContent).toContain("isFullyConfiguredAdSlot");
      expect(adBannerContent).toContain("isPushedRef");
      expect(adBannerContent).toContain("data-adsbygoogle-status");
    });

    class MockServerResponse extends Writable {
      statusCode = 200;
      headers: Record<string, string> = {};
      body = "";

      writeHead(code: number, headers?: any) {
        this.statusCode = code;
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            this.headers[k.toLowerCase()] = String(v);
          }
        }
        return this;
      }

      setHeader(name: string, value: any) {
        this.headers[name.toLowerCase()] = String(value);
        return this;
      }

      getHeader(name: string) {
        return this.headers[name.toLowerCase()];
      }

      override _write(chunk: any, _encoding: string, callback: (err?: any) => void) {
        this.body += chunk.toString();
        callback();
      }
    }

    function testRequest(handler: (req: any, res: any) => void, url: string): Promise<MockServerResponse> {
      return new Promise((resolve) => {
        const req: any = {
          method: "GET",
          url,
          headers: {},
        };
        const res = new MockServerResponse();
        res.on("finish", () => resolve(res));
        handler(req, res);
      });
    }

    test("serves /ads.txt with HTTP 200, text/plain; charset=utf-8, and publisher ID", async () => {
      const handler = createStudioRequestHandler({
        paths: studioPaths(join(import.meta.dirname, "..", "appassets.config.ts")),
        cli: ["echo"],
      });
      const res = await testRequest(handler, "/ads.txt");
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
      expect(res.body).toContain("pub-9354906754361033");
    });

    test("serves known legal and studio routes with HTTP 200 and index.html", async () => {
      const handler = createStudioRequestHandler({
        paths: studioPaths(join(import.meta.dirname, "..", "appassets.config.ts")),
        cli: ["echo"],
      });
      for (const route of ["/", "/privacy", "/terms", "/about", "/contact", "/guidelines", "/studio"]) {
        const res = await testRequest(handler, route);
        expect(res.statusCode).toBe(200);
        expect(res.headers["content-type"]).toContain("text/html");
        expect(res.body).toContain("<!doctype html>");
      }
    });

    test("serves unknown frontend paths with HTTP 404 and index.html", async () => {
      const handler = createStudioRequestHandler({
        paths: studioPaths(join(import.meta.dirname, "..", "appassets.config.ts")),
        cli: ["echo"],
      });
      const res = await testRequest(handler, "/some-random-unknown-page");
      expect(res.statusCode).toBe(404);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.body).toContain("<!doctype html>");
    });

    test("serves unknown API endpoints with HTTP 404 and JSON error", async () => {
      const handler = createStudioRequestHandler({
        paths: studioPaths(join(import.meta.dirname, "..", "appassets.config.ts")),
        cli: ["echo"],
      });
      const res = await testRequest(handler, "/api/unknown-action");
      expect(res.statusCode).toBe(404);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(JSON.parse(res.body).error).toBe("Endpoint not found");
    });
  });
});
