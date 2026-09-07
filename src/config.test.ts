import { describe, expect, test } from "bun:test";
import { applyDesign, type LoadedConfig } from "./config.ts";

describe("applyDesign Phase 2 features", () => {
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
});
