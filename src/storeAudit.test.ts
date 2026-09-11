import { describe, expect, test } from "bun:test";
import { runStoreAudit } from "../studio/src/lib/storeAudit.ts";

describe("runStoreAudit Engine", () => {
  test("computes audit for an empty manifest with missing screenshots and icon", () => {
    const res = runStoreAudit({
      manifest: {
        devices: [{ key: "iphone-6.9", label: "iPhone 6.9", frame: "default" }],
        locales: ["en-US"],
        scenes: [],
      } as any,
      hasScreenshots: false,
    });

    expect(res.totalChecks).toBeGreaterThan(0);
    expect(res.isStoreReady).toBe(false);
    expect(res.errorCount).toBeGreaterThan(0);
    expect(res.score).toBeLessThan(70);

    const iconCheck = res.checks.find((c) => c.id === "play-icon-present");
    expect(iconCheck?.passed).toBe(false);
    expect(iconCheck?.action?.actionType).toBe("icon-studio");

    const capturesCheck = res.checks.find((c) => c.id === "play-screenshots-count");
    expect(capturesCheck?.passed).toBe(false);
  });

  test("computes passing audit when all requirements are satisfied", () => {
    const res = runStoreAudit({
      manifest: {
        devices: [
          { key: "iphone-6.9", label: "iPhone 6.9", frame: "default" },
          { key: "pixel-10-pro", label: "Pixel 10 Pro", frame: "default" },
        ],
        locales: ["en-US"],
        scenes: [
          { id: "scene1", layout: "hero", headline: { "en-US": "Fast Delivery" } },
          { id: "scene2", layout: "hero", headline: { "en-US": "Track Orders" } },
          { id: "scene3", layout: "hero", headline: { "en-US": "Secure Pay" } },
          { id: "scene4", layout: "hero", headline: { "en-US": "24/7 Support" } },
        ],
        design: {
          theme: {
            background: "#ffffff",
            headlineColor: "#000000",
          },
          copy: {
            "en-US": {
              scene1: { title: "Fast Delivery", subtitle: "Within 15 minutes" },
              scene2: { title: "Track Orders", subtitle: "Live GPS mapping" },
              scene3: { title: "Secure Pay", subtitle: "Credit card & UPI" },
              scene4: { title: "24/7 Support", subtitle: "Always here for you" },
            },
          },
        },
      } as any,
      appInfo: {
        name: "QuickBite",
        category: "Food & Drink",
        subtitle: "Fastest food delivery in town",
        description: "Order your favorite meals with instant delivery directly to your door.",
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
      hasScreenshots: true,
      scenes: [
        { id: "scene1", layout: "hero", headline: { "en-US": "Fast Delivery" } },
        { id: "scene2", layout: "hero", headline: { "en-US": "Track Orders" } },
        { id: "scene3", layout: "hero", headline: { "en-US": "Secure Pay" } },
        { id: "scene4", layout: "hero", headline: { "en-US": "24/7 Support" } },
      ],
      theme: {
        background: "#ffffff",
        headlineColor: "#000000",
      } as any,
    });

    expect(res.score).toBeGreaterThanOrEqual(90);
    expect(res.isStoreReady).toBe(true);
    expect(res.errorCount).toBe(0);

    const playChecks = res.playChecks;
    expect(playChecks.length).toBeGreaterThan(0);
    const appStoreChecks = res.appStoreChecks;
    expect(appStoreChecks.length).toBeGreaterThan(0);
  });

  test("flags low contrast between headline and background", () => {
    const res = runStoreAudit({
      manifest: {
        devices: [{ key: "iphone-6.9", label: "iPhone 6.9", frame: "default" }],
        locales: ["en-US"],
        scenes: [{ id: "scene1", layout: "hero", headline: { "en-US": "Low Contrast" } }],
        design: {
          theme: {
            background: "#ffffff",
            headlineColor: "#fafafa", // Extremely poor contrast!
          },
        },
      } as any,
      appInfo: {
        name: "LowContrastApp",
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
      hasScreenshots: true,
      scenes: [{ id: "scene1", layout: "hero", headline: { "en-US": "Low Contrast" } }],
      theme: {
        background: "#ffffff",
        headlineColor: "#fafafa",
      } as any,
    });

    const contrastCheck = res.checks.find((c) => c.id === "appstore-contrast");
    expect(contrastCheck?.passed).toBe(false);
    expect(contrastCheck?.severity).toBe("warning");
  });
});
