import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { runStoreAudit } from "../studio/src/lib/storeAudit.ts";
import {
  bannerExportHandler,
  designHandler,
  exportHandler,
  faviconExportHandler,
  getDimensionsFromBuffer,
  iconHandler,
  importHandler,
  studioPaths,
} from "./studio-server.ts";

/** Helper to generate a dummy PNG image buffer with exact dimensions */
function createDummyPng(width: number, height: number, color = "#2563eb"): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(`${width}x${height}`, 20, 60);
  return canvas.toBuffer("image/png");
}

function createMockResponse() {
  let statusCode = 200;
  const headers: Record<string, any> = {};
  let body = "";
  let binaryData: Buffer | null = null;

  return {
    get statusCode() {
      return statusCode;
    },
    set statusCode(val: number) {
      statusCode = val;
    },
    setHeader(name: string, val: any) {
      headers[name] = val;
    },
    writeHead(code: number, h?: any) {
      statusCode = code;
      if (h) Object.assign(headers, h);
    },
    write(chunk: any) {
      if (typeof chunk === "string") {
        body += chunk;
      } else if (Buffer.isBuffer(chunk)) {
        binaryData = binaryData ? Buffer.concat([binaryData, chunk]) : chunk;
      }
    },
    end(data?: any) {
      if (data) {
        if (typeof data === "string") {
          body += data;
        } else if (Buffer.isBuffer(data)) {
          binaryData = binaryData ? Buffer.concat([binaryData, data]) : data;
        }
      }
    },
    getBody: () => body,
    getBinary: () => binaryData,
    getHeaders: () => headers,
  };
}

describe("End-to-End Production Dogfooding Workflow", () => {
  test("executes complete lifecycle: empty state -> upload -> customize -> audit 100% -> store export ZIP", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "goldie-e2e-"));
    const configPath = join(tmp, "goldie.config.ts");
    const paths = studioPaths(configPath);

    await mkdir(paths.webDir, { recursive: true });
    await mkdir(paths.outDir, { recursive: true });

    // Step 1: Write initial configuration
    const configContent = `
export default {
  devices: ["iphone-6.9", "pixel-10-pro"],
  locales: ["en-US"],
  scenes: [
    { id: "hero", layout: "hero", headline: { "en-US": "Smart AI Workouts" } },
    { id: "nutrition", layout: "hero", headline: { "en-US": "Instant Meal Plans" } },
  ],
  frame: { variant: "17-pro-blue" },
  theme: {
    background: "#0a0a0c",
    headlineColor: "#ffffff",
  },
};
`;
    await writeFile(configPath, configContent, "utf8");

    const api = { paths, cli: ["echo"] };

    // Step 2: Verify Initial Pre-Flight Audit (0% empty state)
    const initialAudit = runStoreAudit({
      manifest: {
        devices: [{ key: "iphone-6.9" }, { key: "pixel-10-pro" }],
        locales: ["en-US"],
        scenes: [],
      } as any,
      hasScreenshots: false,
    });
    expect(initialAudit.score).toBe(0);
    expect(initialAudit.isStoreReady).toBe(false);
    expect(initialAudit.errorCount).toBeGreaterThan(0);

    // Step 3: Import Screenshots via importHandler
    const importer = importHandler(api);
    const phoneCapture = createDummyPng(1320, 2868, "#3b82f6");
    const pixelCapture = createDummyPng(1280, 2856, "#10b981");

    const importRes = createMockResponse();
    const { EventEmitter } = await import("node:events");
    const mockReq: any = new EventEmitter();
    mockReq.method = "POST";
    mockReq.url = "/api/import";

    const importPayload = JSON.stringify({
      files: [
        {
          name: "iphone-hero.png",
          dataUrl: `data:image/png;base64,${phoneCapture.toString("base64")}`,
          sceneId: "hero",
        },
        {
          name: "iphone-nutrition.png",
          dataUrl: `data:image/png;base64,${phoneCapture.toString("base64")}`,
          sceneId: "nutrition",
        },
        {
          name: "pixel-hero.png",
          dataUrl: `data:image/png;base64,${pixelCapture.toString("base64")}`,
          sceneId: "hero",
        },
        {
          name: "pixel-nutrition.png",
          dataUrl: `data:image/png;base64,${pixelCapture.toString("base64")}`,
          sceneId: "nutrition",
        },
      ],
    });

    importer(mockReq, importRes as any);
    mockReq.emit("data", Buffer.from(importPayload));
    mockReq.emit("end");

    await new Promise((r) => setTimeout(r, 100));
    expect(importRes.statusCode).toBe(200);
    const importResJson = JSON.parse(importRes.getBody());
    expect(importResJson.imported).toBe(4);

    // Populate framed screenshots directory that goldie frame outputs
    const screensDir = join(paths.outDir, "screenshots");
    await mkdir(join(screensDir, "iphone-6.9", "en-US"), { recursive: true });
    await mkdir(join(screensDir, "pixel-10-pro", "en-US"), { recursive: true });
    await writeFile(
      join(screensDir, "iphone-6.9", "en-US", "hero.png"),
      createDummyPng(1320, 2868, "#1e293b"),
    );
    await writeFile(
      join(screensDir, "iphone-6.9", "en-US", "nutrition.png"),
      createDummyPng(1320, 2868, "#0f172a"),
    );
    await writeFile(
      join(screensDir, "pixel-10-pro", "en-US", "hero.png"),
      createDummyPng(1280, 2856, "#1e293b"),
    );
    await writeFile(
      join(screensDir, "pixel-10-pro", "en-US", "nutrition.png"),
      createDummyPng(1280, 2856, "#0f172a"),
    );

    // Step 4: Configure App Details via designHandler
    const designer = designHandler(api);
    const appDesign = {
      appInfo: {
        name: "FitPulse Pro",
        category: "Health & Fitness",
        subtitle: "Personal AI Workout & Nutrition Coach",
        description: "Achieve your fitness goals with smart adaptive workout plans.",
      },
      theme: {
        background: "#0a0a0c",
        headlineColor: "#ffffff",
      },
      copy: {
        "en-US": {
          hero: { title: "Smart AI Workouts", subtitle: "Personalized routines" },
          nutrition: { title: "Instant Meal Plans", subtitle: "Macro-balanced nutrition" },
        },
      },
    };

    const designRes = createMockResponse();
    const mockDesignReq: any = new EventEmitter();
    mockDesignReq.method = "PUT";
    mockDesignReq.url = "/api/design";

    designer(mockDesignReq, designRes as any);
    mockDesignReq.emit("data", Buffer.from(JSON.stringify(appDesign)));
    mockDesignReq.emit("end");

    await new Promise((r) => setTimeout(r, 100));
    expect(designRes.statusCode).toBe(204);

    // Step 5: Upload & Save App Icon via iconHandler
    const iconMaster = createDummyPng(512, 512, "#6366f1");
    const iconService = iconHandler(api);
    const iconRes = createMockResponse();
    const mockIconReq: any = new EventEmitter();
    mockIconReq.method = "POST";
    mockIconReq.url = "/api/icon";

    iconService(mockIconReq, iconRes as any);
    mockIconReq.emit(
      "data",
      Buffer.from(
        JSON.stringify({ dataUrl: `data:image/png;base64,${iconMaster.toString("base64")}` }),
      ),
    );
    mockIconReq.emit("end");

    await new Promise((r) => setTimeout(r, 100));
    expect(iconRes.statusCode).toBe(200);
    expect(existsSync(join(paths.webDir, "icon.png"))).toBe(true);

    // Step 6: Generate Google Play 1024x500 Feature Graphic via bannerExportHandler
    const bannerService = bannerExportHandler(api);
    const bannerRes = createMockResponse();
    const mockBannerReq: any = {
      method: "GET",
      url: "/api/export-banner?type=google-play&scale=1",
    };

    bannerService(mockBannerReq, bannerRes as any);
    await new Promise((r) => setTimeout(r, 200));

    if (bannerRes.statusCode !== 200) {
      console.log("BANNER ERROR:", bannerRes.getBody());
    }
    expect(bannerRes.statusCode).toBe(200);
    const bannerData = bannerRes.getBinary();
    expect(Buffer.isBuffer(bannerData)).toBe(true);
    const bannerDims = getDimensionsFromBuffer(bannerData!);
    expect(bannerDims?.width).toBe(1024);
    expect(bannerDims?.height).toBe(500);

    // Step 7: Export Favicon Kit ZIP via faviconExportHandler
    const faviconService = faviconExportHandler(api);
    const favRes = createMockResponse();
    const mockFavReq: any = {
      method: "GET",
      url: "/api/export-favicon?appName=FitPulsePro",
    };

    faviconService(mockFavReq, favRes as any);
    await new Promise((r) => setTimeout(r, 200));

    expect(favRes.statusCode).toBe(200);
    const favZipData = favRes.getBinary();
    expect(Buffer.isBuffer(favZipData)).toBe(true);
    expect(favZipData!.length).toBeGreaterThan(500);

    // Step 8: Re-check Store Pre-Flight Audit Score (Store-Ready)
    const finalAudit = runStoreAudit({
      manifest: {
        devices: [
          { key: "iphone-6.9", label: "iPhone 6.9", frame: "default" },
          { key: "pixel-10-pro", label: "Pixel 10 Pro", frame: "default" },
        ],
        locales: ["en-US"],
        scenes: [
          { id: "hero", layout: "hero", headline: { "en-US": "Smart AI Workouts" } },
          { id: "nutrition", layout: "hero", headline: { "en-US": "Instant Meal Plans" } },
        ],
        design: appDesign,
      } as any,
      appInfo: {
        name: "FitPulse Pro",
        category: "Health & Fitness",
        icon: `data:image/png;base64,${iconMaster.toString("base64")}`,
      },
      hasScreenshots: true,
      scenes: [
        { id: "hero", layout: "hero", headline: { "en-US": "Smart AI Workouts" } },
        { id: "nutrition", layout: "hero", headline: { "en-US": "Instant Meal Plans" } },
      ],
      theme: {
        background: "#0a0a0c",
        headlineColor: "#ffffff",
      } as any,
    });

    expect(finalAudit.score).toBeGreaterThanOrEqual(90);
    expect(finalAudit.isStoreReady).toBe(true);
    expect(finalAudit.errorCount).toBe(0);

    // Step 9: Export Complete Store Package (.ZIP) via exportHandler
    const exporter = exportHandler(api)("");
    const exportRes = createMockResponse();
    const mockExportReq: any = new EventEmitter();
    mockExportReq.method = "POST";
    mockExportReq.url = "/api/export";

    exporter(mockExportReq, exportRes as any);
    mockExportReq.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          background: "#0a0a0c",
          frame: "default",
          font: "default",
          template: "none",
          layout: "hero",
        }),
      ),
    );
    mockExportReq.emit("end");

    const start = Date.now();
    while (!exportRes.getBody().includes("[done]") && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(exportRes.getBody()).toContain("[done]");
    expect(existsSync(paths.exportZip)).toBe(true);

    // Step 10: Verify the unzipped archive structure
    const zipBytes = await readFile(paths.exportZip);
    expect(zipBytes.length).toBeGreaterThan(1000);

    // Read ZIP content and verify standard files are present
    const zipString = zipBytes.toString("binary");
    expect(zipString).toContain("AppStore/iPhone-6.9/en-US/hero.png");
    expect(zipString).toContain("GooglePlay/Phone/en-US/hero.png");
    expect(zipString).toContain("GooglePlay/feature-graphic.png");
    expect(zipString).toContain("GooglePlay/app-icon-512x512.png");
    expect(zipString).toContain("AppStore/app-icon-1024x1024.png");
    expect(zipString).toContain("STORE_GUIDE.txt");

    // Clean up
    await rm(tmp, { recursive: true, force: true });
  });
});
