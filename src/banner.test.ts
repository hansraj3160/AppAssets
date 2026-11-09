import { describe, expect, test } from "bun:test";
import { renderBannerCanvas, resolveCleanAppName } from "./banner.ts";
import type { LoadedConfig } from "./config.ts";

describe("banner app name resolution", () => {
  const baseConfig: LoadedConfig = {
    root: "/tmp",
    configPath: "/tmp/appassets.config.ts",
    flowsDir: "/tmp/flows",
    outDir: "/tmp/out",
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
    appPath:
      "/Users/dev/Library/Developer/Xcode/DerivedData/<App>-abcd/Build/Products/Release-iphonesimulator/<App>.app",
  };

  test("rejects placeholder <App>.app and falls back to AppAssets when store.name is empty", () => {
    const cfg: LoadedConfig = {
      ...baseConfig,
      store: {
        name: "",
        subtitle: {},
        developer: "",
        category: "",
        rating: 5,
        ratingCount: "1",
        ageRating: "4+",
        price: "Free",
        description: {},
      },
    };

    const resolved = resolveCleanAppName({ cfg, type: "google-play" }, cfg);
    expect(resolved).toBe("AppAssets");
    expect(resolved).not.toContain("<App>");
    expect(resolved).not.toContain(".app");
  });

  test("uses customTitle when provided", () => {
    const cfg: LoadedConfig = { ...baseConfig };
    const resolved = resolveCleanAppName(
      { cfg, type: "google-play", customTitle: "SavvyDivvy" },
      cfg,
    );
    expect(resolved).toBe("SavvyDivvy");
  });

  test("uses options.appName when provided", () => {
    const cfg: LoadedConfig = { ...baseConfig };
    const resolved = resolveCleanAppName({ cfg, type: "google-play", appName: "SavvyDivvy" }, cfg);
    expect(resolved).toBe("SavvyDivvy");
  });

  test("strips .app, .apk, .ipa extensions cleanly", () => {
    const cfg: LoadedConfig = {
      ...baseConfig,
      store: {
        name: "SavvyDivvy.app",
        subtitle: {},
        developer: "",
        category: "",
        rating: 5,
        ratingCount: "1",
        ageRating: "4+",
        price: "Free",
        description: {},
      },
    };

    const resolved = resolveCleanAppName({ cfg, type: "google-play" }, cfg);
    expect(resolved).toBe("SavvyDivvy");
  });

  test("uses real app binary name from appPath when unconfigured without angle brackets", () => {
    const cfg: LoadedConfig = {
      ...baseConfig,
      appPath:
        "/DerivedData/MyFinanceApp-xyz/Build/Products/Release-iphonesimulator/MyFinanceApp.app",
    };

    const resolved = resolveCleanAppName({ cfg, type: "google-play" }, cfg);
    expect(resolved).toBe("MyFinanceApp");
  });

  test("renders 1024x500 banner with resolved app name and valid dimensions", async () => {
    const cfg: LoadedConfig = {
      ...baseConfig,
      store: {
        name: "SavvyDivvy",
        subtitle: { "en-US": "Track Your Finances" },
        developer: "Zunava",
        category: "Finance & Banking",
        rating: 5,
        ratingCount: "1",
        ageRating: "4+",
        price: "Free",
        description: { "en-US": "Finance tracker" },
      },
    };

    const buf = await renderBannerCanvas({
      cfg,
      type: "google-play",
      customTitle: "SavvyDivvy",
    });

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
