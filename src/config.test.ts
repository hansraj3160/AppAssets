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

  test("loadConfig loads config with scenes populated and no shadowing loss", async () => {
    const { loadConfig, defaultConfigPath } = await import("./config.ts");
    const loaded = await loadConfig(defaultConfigPath());
    expect(loaded.scenes.length).toBeGreaterThan(0);
    const sceneIds = loaded.scenes.map((s) => s.id);
    expect(sceneIds).toContain("logo_without_label");
    expect(sceneIds).toContain("personal");
    expect(sceneIds).toContain("insights_dashboard");
    expect(sceneIds).toContain("home");
    expect(sceneIds).toContain("groups");
  });
});
