import { describe, expect, test } from "bun:test";
import { BANNER_SPECS, renderBannerCanvas } from "./banner.ts";
import type { LoadedConfig } from "./config.ts";
import { getDimensionsFromBuffer } from "./studio-server.ts";

describe("Banner Engine & Specs", () => {
  test("specifies exact Google Play store requirement (1024x500)", () => {
    const spec = BANNER_SPECS["google-play"];
    expect(spec.width).toBe(1024);
    expect(spec.height).toBe(500);
    expect(spec.storePath).toBe("GooglePlay/feature-graphic.png");
  });

  test("specifies standard marketing banner dimensions", () => {
    expect(BANNER_SPECS["product-hunt"].width).toBe(1270);
    expect(BANNER_SPECS["product-hunt"].height).toBe(760);
    expect(BANNER_SPECS["x-twitter"].width).toBe(1200);
    expect(BANNER_SPECS["x-twitter"].height).toBe(675);
    expect(BANNER_SPECS["instagram-square"].width).toBe(1080);
    expect(BANNER_SPECS["instagram-square"].height).toBe(1080);
  });

  function makeMockConfig(): LoadedConfig {
    return {
      appRoot: "/tmp",
      appPath: "/tmp/ExpenseApp",
      bundleId: "com.test.expense",
      appearance: "light",
      frame: { variant: "17-pro-blue" },
      store: {
        name: "Expense Tracker",
        subtitle: { "en-US": "Smart Personal Finance" },
        developer: "StudioDev",
        category: "Finance",
        rating: 4.9,
        ratingCount: "5K Ratings",
        ageRating: "4+",
        price: "Free",
        description: { "en-US": "Smart finance tracker" },
      },
      root: "/tmp",
      configPath: "/tmp/goldie.config.ts",
      flowsDir: "/tmp/flows",
      outDir: "/tmp/out",
      devices: ["iphone-6.9"],
      locales: ["en-US"],
      scenes: [
        {
          kind: "screenshot",
          id: "home",
          flow: "home",
          headline: { "en-US": "Track Spending" },
        },
      ],
      theme: {
        background: "#0E1B2A",
        fontFamily: "system",
        headlineColor: "#FFFFFF",
        subheadColor: "#94A3B8",
        copyHeightRatio: 0.24,
        deviceWidthRatio: 0.84,
        layout: "classic",
        screenOnly: false,
      },
    };
  }

  test("renders valid Google Play Feature Graphic PNG buffer", async () => {
    const cfg = makeMockConfig();
    const buffer = await renderBannerCanvas({
      cfg,
      type: "google-play",
      customHeadline: "Super Expense",
      customTagline: "Manage money effortlessly",
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    const dims = getDimensionsFromBuffer(buffer);
    expect(dims).not.toBeNull();
    expect(dims?.width).toBe(1024);
    expect(dims?.height).toBe(500);
  });

  test("renders valid Product Hunt banner PNG buffer with custom gradient", async () => {
    const cfg = makeMockConfig();
    const buffer = await renderBannerCanvas({
      cfg,
      type: "product-hunt",
      customBackground: "linear-gradient(160deg, #0EA5E9 0%, #2563EB 100%)",
      layout: "center",
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const dims = getDimensionsFromBuffer(buffer);
    expect(dims?.width).toBe(1270);
    expect(dims?.height).toBe(760);
  });

  test("renders valid Instagram square banner PNG buffer", async () => {
    const cfg = makeMockConfig();
    const buffer = await renderBannerCanvas({
      cfg,
      type: "instagram-square",
      customBackground: "#FFFFFF",
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const dims = getDimensionsFromBuffer(buffer);
    expect(dims?.width).toBe(1080);
    expect(dims?.height).toBe(1080);
  });

  test("renders trio multi-phone showcase layout with kicker and benefits bullets", async () => {
    const cfg = makeMockConfig();
    const buffer = await renderBannerCanvas({
      cfg,
      type: "google-play",
      deviceCount: "trio",
      kickerHeadline: "PRODUCTIVITY APP",
      customHeadline: "Achieve More Every Day",
      customTagline: "Smart task and workflow automation",
      benefits: [
        "Automated sync across devices",
        "Bank-grade privacy & encryption",
        "Offline-first performance",
      ],
      mockupStyle: "screen",
      showWaves: true,
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    const dims = getDimensionsFromBuffer(buffer);
    expect(dims?.width).toBe(1024);
    expect(dims?.height).toBe(500);
  });

  test("renders duo phone layout on X / Twitter banner", async () => {
    const cfg = makeMockConfig();
    const buffer = await renderBannerCanvas({
      cfg,
      type: "x-twitter",
      deviceCount: "duo",
      kickerHeadline: "FINANCE & BUDGET",
      customHeadline: "Total Control of Wealth",
      customTagline: "Real-time analytics and alerts",
      benefits: ["Instant spending insights", "Zero hidden transaction fees"],
      mockupStyle: "card",
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const dims = getDimensionsFromBuffer(buffer);
    expect(dims?.width).toBe(1200);
    expect(dims?.height).toBe(675);
  });

  test("renders single phone layout when requested explicitly", async () => {
    const cfg = makeMockConfig();
    const buffer = await renderBannerCanvas({
      cfg,
      type: "google-play",
      deviceCount: "single",
      mockupStyle: "screen",
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const dims = getDimensionsFromBuffer(buffer);
    expect(dims?.width).toBe(1024);
    expect(dims?.height).toBe(500);
  });
});
