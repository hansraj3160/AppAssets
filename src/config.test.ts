import { describe, expect, test } from "bun:test";
import { applyDesign, type LoadedConfig } from "./config.ts";

describe("applyDesign Phase 2 features", () => {
  function makeConfig(): LoadedConfig {
    return {
      app: { name: "TestApp", id: "com.test.app" },
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
