import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import {
  aiCopyHandler,
  bannerExportHandler,
  exportHandler,
  extractLocalesFromConfig,
  findScreenshotFile,
  getClientIp,
  getDimensionsFromBuffer,
  iconHandler,
  importHandler,
  localesHandler,
  MemoryRateLimiter,
  PRESET_LOCALES,
  replaceCaptureHandler,
  resolveDeviceFromDimensions,
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

    await new Promise((r) => setTimeout(r, 50));
    expect(statusCode).toBe(404);
    expect(JSON.parse(endedWith).error).toContain(
      'Screenshot file for scene "nonexistent_scene" not found',
    );

    await rm(tmp, { recursive: true, force: true });
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

    handler("/download")(req, res);
    expect(writtenCode).toBe(200);
    expect(headers["Content-Type"]).toBe("application/zip");
    expect(headers["Content-Disposition"]).toBe('attachment; filename="MyApp-assets.zip"');

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
      await new Promise((r) => setTimeout(r, 20));
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

      await new Promise((r) => setTimeout(r, 40));
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
      await new Promise((r) => setTimeout(r, 20));
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
      await new Promise((r) => setTimeout(r, 30));
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
      const fakePngDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const listeners: Record<string, (...args: any[]) => void> = {};
      const req = {
        method: "POST",
        on: (event: string, cb: (...args: any[]) => void) => {
          listeners[event] = cb;
        },
      } as any;
      const res = { writeHead: () => {}, end: () => {} } as any;

      handler(req, res);
      listeners.data?.(JSON.stringify({ dataUrl: fakePngDataUrl }));
      listeners.end?.();

      await new Promise((r) => setTimeout(r, 40));
      const fs = await import("node:fs");
      const designJson = JSON.parse(fs.readFileSync(designFile, "utf8"));
      expect(designJson.appIcon).toBe("/icon.png");
      expect(designJson.appInfo.icon).toBe("/icon.png");
      expect(designJson.appInfo.name).toBe("Acme App");
    }

    // 2. Delete icon
    {
      const req = { method: "DELETE" } as any;
      const res = { writeHead: () => {}, end: () => {} } as any;

      handler(req, res);
      await new Promise((r) => setTimeout(r, 30));
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
      await new Promise((r) => setTimeout(r, 100));

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

      await new Promise((r) => setTimeout(r, 100));

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

      await new Promise((r) => setTimeout(r, 100));

      expect(statusCode).toBe(200);
      expect(headers["Content-Type"]).toBe("image/png");
      expect(headers["Content-Disposition"]).toContain("google-play-2048x1000@2x.png");
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer!.length).toBeGreaterThan(1000);
    }

    await rm(tmp, { recursive: true, force: true });
  });
});
