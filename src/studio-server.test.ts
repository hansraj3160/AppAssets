import { describe, expect, test } from "bun:test";
import {
  extractLocalesFromConfig,
  findScreenshotFile,
  getDimensionsFromBuffer,
  importHandler,
  localesHandler,
  PRESET_LOCALES,
  replaceCaptureHandler,
  resolveDeviceFromDimensions,
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
