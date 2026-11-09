import { describe, expect, test } from "bun:test";
import { applyDesign, type LoadedConfig } from "./config.ts";

function makeConfig(): LoadedConfig {
  return {
    appRoot: "/tmp",
    appPath: "/tmp/app",
    bundleId: "com.test.app",
    appearance: "light",
    frame: { variant: "17-pro-blue" },
    store: {
      name: "TestApp",
      subtitle: { "en-US": "Test" },
      developer: "Dev",
      category: "Productivity",
      rating: 4.9,
      ratingCount: "100",
      ageRating: "4+",
      price: "Free",
      description: { "en-US": "Test Description" },
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
        headline: { "en-US": "Welcome" },
      },
      {
        kind: "screenshot",
        id: "detail",
        flow: "detail",
        headline: { "en-US": "Detail" },
      },
    ],
    theme: {
      background: "#FFFFFF",
      fontFamily: "system",
      headlineColor: "#0E1B2A",
      subheadColor: "#5A6A7D",
      copyHeightRatio: 0.24,
      deviceWidthRatio: 0.84,
      layout: "classic",
      screenOnly: false,
    },
  };
}

describe("applyDesign Phase 2 features", () => {
  test("applies headlineColor and subheadColor overrides", () => {
    const cfg = makeConfig();
    applyDesign(cfg, {
      headlineColor: "#2563EB",
      subheadColor: "#9333EA",
    });
    expect(cfg.theme.headlineColor).toBe("#2563EB");
    expect(cfg.theme.subheadColor).toBe("#9333EA");
  });

  test("applies sceneBackgrounds overrides", () => {
    const cfg = makeConfig();
    applyDesign(cfg, {
      sceneBackgrounds: {
        home: "#000000",
        detail: "linear-gradient(160deg, #0EA5E9 0%, #2563EB 100%)",
      },
    });
    expect((cfg.scenes[0] as any).background).toBe("#000000");
    expect((cfg.scenes[1] as any).background).toBe(
      "linear-gradient(160deg, #0EA5E9 0%, #2563EB 100%)",
    );
  });

  test("preserves un-overridden scenes to inherit global theme background", () => {
    const cfg = makeConfig();
    applyDesign(cfg, {
      background: "#1E293B",
      sceneBackgrounds: {
        home: "#FF0000",
      },
    });
    expect((cfg.scenes[0] as any).background).toBe("#FF0000");
    expect((cfg.scenes[1] as any).background).toBeUndefined();
    expect(cfg.theme.background).toBe("#1E293B");
  });

  test("applies sceneBadges as decorations", () => {
    const cfg = makeConfig();
    applyDesign(cfg, {
      sceneBadges: {
        home: {
          text: "NEW",
          position: "top-right",
          background: "#EF4444",
          color: "#FFFFFF",
        },
      },
    });
    const home = cfg.scenes[0] as any;
    expect(home.decorations).toHaveLength(1);
    expect(home.decorations[0]).toEqual({
      kind: "badge",
      text: { "en-US": "NEW" },
      position: "top-right",
      background: "#EF4444",
      color: "#FFFFFF",
    });
  });

  test("applies rich store trust badges and awards with multi-locale mapping", () => {
    const cfg = makeConfig();
    cfg.locales = ["en-US", "es-ES"];
    applyDesign(cfg, {
      sceneBadges: {
        home: {
          text: "4.9 ★ (50K+ Reviews)",
          position: "top-left",
          background: "#1E293B",
          color: "#FBBF24",
        },
        detail: {
          text: "Editor's Choice 🏆",
          position: "top-right",
          background: "#4338CA",
          color: "#FDE047",
        },
      },
    });
    const home = cfg.scenes[0] as any;
    expect(home.decorations[0]).toEqual({
      kind: "badge",
      text: { "en-US": "4.9 ★ (50K+ Reviews)", "es-ES": "4.9 ★ (50K+ Reviews)" },
      position: "top-left",
      background: "#1E293B",
      color: "#FBBF24",
    });
    const detail = cfg.scenes[1] as any;
    expect(detail.decorations[0]).toEqual({
      kind: "badge",
      text: { "en-US": "Editor's Choice 🏆", "es-ES": "Editor's Choice 🏆" },
      position: "top-right",
      background: "#4338CA",
      color: "#FDE047",
    });
  });

  test("applies per-slice badges for multi-span panorama layouts (e.g. home#1, home#2)", () => {
    const cfg = makeConfig();
    applyDesign(cfg, {
      sceneBadges: {
        "home#1": {
          text: "4.9 ★ (50K+ Reviews)",
          position: "top-right",
          background: "#F59E0B",
          color: "#0F172A",
        },
        "home#2": {
          text: "Apple Design Award 🌟",
          position: "top-left",
          background: "#0EA5E9",
          color: "#FFFFFF",
        },
      },
    });
    const home = cfg.scenes[0] as any;
    expect(home.decorations).toHaveLength(2);
    expect(home.decorations[0]).toEqual({
      kind: "badge",
      text: { "en-US": "4.9 ★ (50K+ Reviews)" },
      position: "top-right",
      background: "#F59E0B",
      color: "#0F172A",
      slice: 0,
    });
    expect(home.decorations[1]).toEqual({
      kind: "badge",
      text: { "en-US": "Apple Design Award 🌟" },
      position: "top-left",
      background: "#0EA5E9",
      color: "#FFFFFF",
      slice: 1,
    });
  });

  test("applies fontSizeScale override to theme", () => {
    const cfg = makeConfig();
    applyDesign(cfg, {
      fontSizeScale: 1.2,
    });
    expect(cfg.theme.fontSizeScale).toBe(1.2);
  });

  test("applies locales overrides to config", () => {
    const cfg = makeConfig();
    expect(cfg.locales).toEqual(["en-US"]);
    applyDesign(cfg, {
      locales: ["en-US", "ar-SA", "ja-JP"],
    });
    expect(cfg.locales).toEqual(["en-US", "ar-SA", "ja-JP"]);
  });
});

describe("isRtlLocale detection", () => {
  test("identifies RTL locales correctly", async () => {
    const { isRtlLocale } = await import("./config.ts");
    expect(isRtlLocale("ar-SA")).toBe(true);
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("he-IL")).toBe(true);
    expect(isRtlLocale("he")).toBe(true);
    expect(isRtlLocale("iw")).toBe(true);
    expect(isRtlLocale("fa-IR")).toBe(true);
    expect(isRtlLocale("fa")).toBe(true);
    expect(isRtlLocale("ur-PK")).toBe(true);
    expect(isRtlLocale("ur")).toBe(true);
    expect(isRtlLocale("yi")).toBe(true);
  });

  test("identifies LTR locales correctly", async () => {
    const { isRtlLocale } = await import("./config.ts");
    expect(isRtlLocale("en-US")).toBe(false);
    expect(isRtlLocale("en")).toBe(false);
    expect(isRtlLocale("es-ES")).toBe(false);
    expect(isRtlLocale("fr-FR")).toBe(false);
    expect(isRtlLocale("ja-JP")).toBe(false);
    expect(isRtlLocale("zh-Hans")).toBe(false);
    expect(isRtlLocale(undefined)).toBe(false);
    expect(isRtlLocale("")).toBe(false);
  });
});

describe("Config resolution & shadowing prevention", () => {
  test("defaultConfigPath resolves appassets.config.ts or goldie.config.ts", async () => {
    const { defaultConfigPath } = await import("./config.ts");
    const path = defaultConfigPath();
    expect(path.endsWith("appassets.config.ts") || path.endsWith("goldie.config.ts")).toBe(true);
  });

  test("designPath resolves goldie.design.json or appassets.design.json", async () => {
    const { designPath } = await import("./config.ts");
    const path = designPath("/tmp/appassets.config.ts");
    expect(path.endsWith("goldie.design.json") || path.endsWith("appassets.design.json")).toBe(
      true,
    );
  });

  test("loadConfig adopts companion config scenes when primary config scenes are empty", async () => {
    const { mkdir, writeFile, rm } = await import("node:fs/promises");
    const { loadConfig } = await import("./config.ts");
    const tmpDir = `/tmp/goldie-test-${Date.now()}`;
    await mkdir(tmpDir, { recursive: true });
    const appassetsPath = `${tmpDir}/appassets.config.ts`;
    const goldiePath = `${tmpDir}/goldie.config.ts`;

    const baseConfig = `appRoot: "${tmpDir}", appPath: "${tmpDir}/app", bundleId: "com.test", frame: { variant: "17-pro-blue" }, theme: { background: "#fff", fontFamily: "sans-serif", headlineColor: "#000", subheadColor: "#333", copyHeightRatio: 0.2, deviceWidthRatio: 0.8 }, store: { name: "Test", subtitle: { "en-US": "Test" }, developer: "Dev", category: "App", rating: 5, ratingCount: "1", ageRating: "4+", price: "Free", description: { "en-US": "Desc" } }, devices: ["iphone-6.9"], locales: ["en-US"], appearance: "light"`;

    // appassets has empty scenes
    await writeFile(appassetsPath, `export default { ${baseConfig}, scenes: [] };`);

    // companion goldie.config.ts has a scene
    await writeFile(
      goldiePath,
      `export default { ${baseConfig}, scenes: [{ kind: "screenshot", id: "sample", flow: "sample", headline: { "en-US": "Sample" } }] };`,
    );

    const loaded = await loadConfig(appassetsPath);
    expect(loaded.scenes.length).toBe(1);
    expect(loaded.scenes[0].id).toBe("sample");

    await rm(tmpDir, { recursive: true, force: true });
  });

  test("validateLayouts allows single screenshot when multi-device layout is active", async () => {
    const { validateLayouts } = await import("./config.ts");
    const cfg: any = {
      theme: { layout: "duo-tilt" },
      scenes: [
        {
          kind: "screenshot",
          id: "single",
          headline: { "en-US": "Single" },
        },
      ],
    };
    expect(() => validateLayouts(cfg)).not.toThrow();
  });
});

describe("Per-scene contrast discrepancy resolution", () => {
  test("flips dark text to light text on dark scene backgrounds", async () => {
    const { resolveCopyColors } = await import("./config.ts");
    const lightTheme: any = {
      background: "#FFFFFF",
      headlineColor: "#0E1B2A",
      subheadColor: "#5A6A7D",
    };

    // Dark background override
    const colors = resolveCopyColors(lightTheme, "#000000");
    expect(colors.headlineColor).toBe("#FFFFFF");
    expect(colors.subheadColor).toBe("#D9E1EA");
  });

  test("flips light text to dark text on light scene backgrounds", async () => {
    const { resolveCopyColors } = await import("./config.ts");
    const darkTheme: any = {
      background: "#121212",
      headlineColor: "#FFFFFF",
      subheadColor: "#D9E1EA",
    };

    // Light background override
    const colors = resolveCopyColors(darkTheme, "#F8FAFC");
    expect(colors.headlineColor).toBe("#0E1B2A");
    expect(colors.subheadColor).toBe("#5A6A7D");
  });

  test("preserves existing colors when contrast is already sufficient", async () => {
    const { resolveCopyColors } = await import("./config.ts");
    const lightTheme: any = {
      background: "#FFFFFF",
      headlineColor: "#0E1B2A",
      subheadColor: "#5A6A7D",
    };

    const colors = resolveCopyColors(lightTheme, "#F0F4F8");
    expect(colors.headlineColor).toBe("#0E1B2A");
    expect(colors.subheadColor).toBe("#5A6A7D");
  });

  test("computes luminance and flips text for layered aurora backgrounds", async () => {
    const { backgroundLuminance, resolveCopyColors } = await import("./config.ts");
    const auroraBg =
      "radial-gradient(circle at 30% 40%, rgba(34, 211, 238, 0.4) 0%, transparent 60%), #090A0F";
    const lum = backgroundLuminance(auroraBg);
    expect(lum).not.toBeNull();
    expect(lum!).toBeLessThan(0.1); // Deep dark obsidian

    const lightTheme: any = {
      background: "#FFFFFF",
      headlineColor: "#0E1B2A",
      subheadColor: "#5A6A7D",
    };
    const colors = resolveCopyColors(lightTheme, auroraBg);
    expect(colors.headlineColor).toBe("#FFFFFF");
    expect(colors.subheadColor).toBe("#D9E1EA");
  });

  test("applyDesign applies modern background options", async () => {
    const cfg = makeConfig();
    applyDesign(cfg, {
      backgroundPattern: "dot-grid",
      patternOpacity: 0.05,
      patternColor: "#FFFFFF",
      deviceBacklight: { enabled: true, color: "#22D3EE", intensity: 0.5 },
      panoramaMode: true,
    });
    expect(cfg.theme.backgroundPattern).toBe("dot-grid");
    expect(cfg.theme.patternOpacity).toBe(0.05);
    expect(cfg.theme.patternColor).toBe("#FFFFFF");
    expect(cfg.theme.deviceBacklight).toEqual({ enabled: true, color: "#22D3EE", intensity: 0.5 });
    expect(cfg.theme.panoramaMode).toBe(true);
  });

  test("applyDesign applies appInfo store identity overrides", () => {
    const cfg = makeConfig();
    cfg.locales = ["en-US", "es-ES"];
    applyDesign(cfg, {
      appInfo: {
        name: "SavvyDivvy",
        subtitle: "Track Your Finances",
        category: "Finance & Banking",
        developer: "Zunava Tech Solution",
        description: "All your income, expenses & balance in one place",
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    });

    expect(cfg.store?.name).toBe("SavvyDivvy");
    expect(cfg.store?.category).toBe("Finance & Banking");
    expect(cfg.store?.developer).toBe("Zunava Tech Solution");
    expect(cfg.store?.subtitle?.["en-US"]).toBe("Track Your Finances");
    expect(cfg.store?.subtitle?.["es-ES"]).toBe("Track Your Finances");
    expect(cfg.store?.description?.["en-US"]).toBe(
      "All your income, expenses & balance in one place",
    );
    expect(cfg.store?.icon).toContain("data:image/png;base64");
  });
});
