import { describe, expect, test } from "bun:test";
import { createCanvas } from "@napi-rs/canvas";
import {
  drawAuroraGlow,
  drawDeviceBacklight,
  drawDeviceShadow,
  drawPatternOverlay,
  formatFfmpegConcatList,
  paint,
  pick,
  renderBackground,
} from "./render.ts";

describe("formatFfmpegConcatList", () => {
  test("formats standard POSIX paths for FFmpeg concat", () => {
    const paths = ["/out/previews/raw/intro.mp4", "/out/previews/raw/feature.mp4"];
    expect(formatFfmpegConcatList(paths)).toBe(
      "file '/out/previews/raw/intro.mp4'\nfile '/out/previews/raw/feature.mp4'",
    );
  });

  test("normalizes Windows backslashes to forward slashes", () => {
    const windowsPaths = [
      "C:\\Users\\admin\\app\\.goldie\\raw\\iphone-6.9\\01-intro.mp4",
      "D:\\data\\app\\clips\\02-feed.mp4",
    ];
    expect(formatFfmpegConcatList(windowsPaths)).toBe(
      "file 'C:/Users/admin/app/.goldie/raw/iphone-6.9/01-intro.mp4'\nfile 'D:/data/app/clips/02-feed.mp4'",
    );
  });

  test("escapes single quotes correctly alongside Windows backslash normalization", () => {
    const paths = ["C:\\Users\\admin\\app\\let's go\\intro.mp4"];
    expect(formatFfmpegConcatList(paths)).toBe("file 'C:/Users/admin/app/let'\\''s go/intro.mp4'");
  });

  test("handles empty list", () => {
    expect(formatFfmpegConcatList([])).toBe("");
  });
});

describe("pick localized copy helper", () => {
  test("returns exact locale match when present", () => {
    const map = { "en-US": "Hello", "hi-IN": "नमस्ते" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("नमस्ते");
    expect(pick(map, "en-US", "scene1", "headline")).toBe("Hello");
  });

  test("falls back to language-only prefix if specific region not present", () => {
    const map = { "en-US": "Hello", hi: "नमस्ते" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("नमस्ते");
  });

  test("falls back to en-US when requested locale is completely missing", () => {
    const map = { "en-US": "Default English headline" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("Default English headline");
    expect(pick(map, "ar-SA", "scene1", "headline")).toBe("Default English headline");
  });

  test("falls back to first available locale if en-US not present", () => {
    const map = { "es-ES": "Hola" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("Hola");
  });

  test("throws descriptive error when map is completely empty", () => {
    expect(() => pick({}, "hi-IN", "screenshot_1", "headline")).toThrow(
      'Scene "screenshot_1" has no headline for locale "hi-IN".',
    );
  });
});

describe("paint legacy background regression tests", () => {
  test("preserves solid hex colors as-is without modification", () => {
    const canvas = createCanvas(100, 100);
    const ctx = canvas.getContext("2d");
    expect(paint(ctx, "#FFFFFF", 100, 100)).toBe("#FFFFFF");
    expect(paint(ctx, "#1E3A8A", 100, 100)).toBe("#1E3A8A");
    expect(paint(ctx, "#000000", 100, 100)).toBe("#000000");
  });

  test("creates CanvasGradient for degree-based linear gradients", () => {
    const canvas = createCanvas(200, 400);
    const ctx = canvas.getContext("2d");
    const result = paint(
      ctx,
      "linear-gradient(160deg, #E8F1FF 0%, #F7FAFF 55%, #FFFFFF 100%)",
      200,
      400,
    );
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();

    // Verify it can be applied to fillStyle and drawn without throwing
    ctx.fillStyle = result;
    ctx.fillRect(0, 0, 200, 400);
    const pixel = ctx.getImageData(100, 200, 1, 1).data;
    // Opaque alpha
    expect(pixel[3]).toBe(255);
  });

  test("creates CanvasGradient for direction-based linear gradients (to right, to bottom)", () => {
    const canvas = createCanvas(100, 100);
    const ctx = canvas.getContext("2d");
    const result = paint(ctx, "linear-gradient(to right, #000000 0%, #FFFFFF 100%)", 100, 100);
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();

    ctx.fillStyle = result;
    ctx.fillRect(0, 0, 100, 100);
    const leftPixel = ctx.getImageData(5, 50, 1, 1).data;
    const rightPixel = ctx.getImageData(95, 50, 1, 1).data;
    // Left should be dark, right should be light
    expect(leftPixel[0]).toBeLessThan(rightPixel[0]);
  });
});

describe("modern background rendering system", () => {
  test("drawAuroraGlow renders multi-point radial spotlights", () => {
    const canvas = createCanvas(300, 600);
    const ctx = canvas.getContext("2d");
    // Start with black base
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 300, 600);

    const glowPoints = [
      { x: 0.3, y: 0.3, color: "#22D3EE", radius: 0.5, opacity: 0.5 },
      { x: 0.7, y: 0.7, color: "#8B5CF6", radius: 0.5, opacity: 0.5 },
    ];
    drawAuroraGlow(ctx, glowPoints, 300, 600);

    // Center of first glow (around 90, 180) should have cyan
    const pixel = ctx.getImageData(90, 180, 1, 1).data;
    expect(pixel[2]).toBeGreaterThan(0); // Blue component in cyan
    expect(pixel[3]).toBe(255); // Opaque composite
  });

  test("drawPatternOverlay renders dot-grid, isometric-dot, and blueprint without error", () => {
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext("2d");

    // dot-grid
    expect(() =>
      drawPatternOverlay(
        ctx,
        { type: "dot-grid", opacity: 0.05, spacing: 20, color: "#FFFFFF" },
        200,
        200,
      ),
    ).not.toThrow();

    // isometric-dot
    expect(() =>
      drawPatternOverlay(
        ctx,
        { type: "isometric-dot", opacity: 0.05, spacing: 20, color: "#FFFFFF" },
        200,
        200,
      ),
    ).not.toThrow();

    // blueprint
    expect(() =>
      drawPatternOverlay(
        ctx,
        { type: "blueprint", opacity: 0.05, spacing: 20, color: "#FFFFFF" },
        200,
        200,
      ),
    ).not.toThrow();
  });

  test("drawDeviceBacklight and drawDeviceShadow render behind device without leaking transforms", () => {
    const canvas = createCanvas(400, 800);
    const ctx = canvas.getContext("2d");
    const device: any = {
      frame: { left: 50, top: 100, width: 300, height: 600 },
      screen: { left: 60, top: 110, width: 280, height: 580, radius: 40 },
      rotate: 5,
    };

    expect(() =>
      drawDeviceBacklight(ctx, device, { width: 400 }, { enabled: true, color: "#38BDF8" }),
    ).not.toThrow();
    expect(() => drawDeviceShadow(ctx, device, { width: 400 }, true)).not.toThrow();
    expect(() => drawDeviceShadow(ctx, device, { width: 400 }, false)).not.toThrow();

    // Ensure context transform wasn't leaked
    const transform = ctx.getTransform();
    expect(transform.a).toBe(1);
    expect(transform.d).toBe(1);
    expect(transform.e).toBe(0);
    expect(transform.f).toBe(0);
  });

  test("renderBackground composites structured aurora and tech-grid backgrounds", () => {
    const canvas = createCanvas(300, 600);
    const ctx = canvas.getContext("2d");

    // Structured Aurora
    expect(() =>
      renderBackground(
        ctx,
        {
          type: "aurora",
          baseColor: "#090A0F",
          glowPoints: [{ x: 0.5, y: 0.5, color: "#22D3EE", radius: 0.6 }],
        },
        300,
        600,
      ),
    ).not.toThrow();

    // Structured Tech Grid
    expect(() =>
      renderBackground(
        ctx,
        {
          type: "tech-grid",
          baseColor: "#0A192F",
          pattern: { type: "dot-grid", opacity: 0.05, spacing: 24 },
        },
        300,
        600,
      ),
    ).not.toThrow();
  });

  test("renderBackground handles panorama slice coordinate offsets", () => {
    const canvas1 = createCanvas(200, 400);
    const ctx1 = canvas1.getContext("2d");
    const canvas2 = createCanvas(200, 400);
    const ctx2 = canvas2.getContext("2d");

    const linearBg = {
      type: "linear-gradient" as const,
      angle: 90, // horizontal gradient from left to right
      stops: [
        { color: "#000000", at: 0 },
        { color: "#FFFFFF", at: 1 },
      ],
    };

    const slice1 = {
      sliceIndex: 0,
      totalSlices: 2,
      globalX: 0,
      totalWidth: 400,
      sliceWidth: 200,
      sliceHeight: 400,
    };

    const slice2 = {
      sliceIndex: 1,
      totalSlices: 2,
      globalX: 200,
      totalWidth: 400,
      sliceWidth: 200,
      sliceHeight: 400,
    };

    renderBackground(ctx1, linearBg, 200, 400, { panoramaOffset: slice1 });
    renderBackground(ctx2, linearBg, 200, 400, { panoramaOffset: slice2 });

    // The right edge of slice 1 (at x=199) and left edge of slice 2 (at x=0) should have nearly identical color
    const rightEdgeSlice1 = ctx1.getImageData(195, 200, 1, 1).data[0];
    const leftEdgeSlice2 = ctx2.getImageData(5, 200, 1, 1).data[0];
    expect(Math.abs(rightEdgeSlice1 - leftEdgeSlice2)).toBeLessThan(20);
  });
});


