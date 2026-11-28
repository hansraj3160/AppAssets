import { existsSync } from "node:fs";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { FRAME_VARIANTS, type LoadedConfig, variantFramePath } from "./config.ts";
import { type StoreManifest, WEB_DIR, writeManifest } from "./manifest.ts";

async function makePng(filePath: string, width: number, height: number): Promise<void> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 0, width, height);
  await writeFile(filePath, canvas.toBuffer("image/png"));
}

function createFixtureConfig(root: string, outDir: string): LoadedConfig {
  return {
    root,
    outDir,
    app: { ios: { bundleId: "com.example.budgetflow" } },
    store: {
      name: "BudgetFlow",
      subtitle: { "en-US": "Smart Personal Finance" },
      developer: "AppAssets Labs",
      category: "Finance",
      rating: 4.9,
      ratingCount: "10K",
      ageRating: "4+",
      price: "Free",
      description: { "en-US": "Track spending cleanly." },
    },
    devices: ["iphone-6.9", "pixel-10-pro"],
    locales: ["en-US"],
    appearance: "light",
    frame: { variant: "17-pro-silver" },
    theme: {
      background: "#0E1B2A",
      fontFamily: '"DM Sans", system-ui, sans-serif',
      headlineColor: "#FFFFFF",
      subheadColor: "#94A3B8",
      layout: "classic",
      screenOnly: false,
      decorations: [
        {
          kind: "image",
          src: "theme-logo.png",
          x: 0.1,
          y: 0.1,
          width: 0.2,
        },
      ],
    },
    scenes: [
      {
        id: "home",
        kind: "screenshot",
        headline: { "en-US": "Track Daily Spend" },
        subhead: { "en-US": "Instant budgets" },
        decorations: [
          {
            kind: "image",
            src: "scene-badge.png",
            x: 0.8,
            y: 0.1,
            width: 0.15,
          },
        ],
      },
      {
        id: "preview",
        kind: "preview",
        segments: [{ id: "intro", durationSeconds: 18, steps: [] }],
      },
    ],
  } as unknown as LoadedConfig;
}

describe("writeManifest", () => {
  it("emits store.json, WOFF2 fonts (pruning legacy OTF/TTF), frames, decorations, captures, and assets", async () => {
    const root = await mkdtemp(join(tmpdir(), "appassets-manifest-"));
    const outDir = join(root, "out");
    try {
      await makePng(join(root, "theme-logo.png"), 64, 64);
      await makePng(join(root, "scene-badge.png"), 48, 48);

      const shotDir = join(outDir, "screenshots", "iphone-6.9", "en-US");
      await mkdir(shotDir, { recursive: true });
      await makePng(join(shotDir, "01-home.png"), 120, 260);

      const rawDir = join(outDir, "raw", "iphone-6.9");
      await mkdir(rawDir, { recursive: true });
      await writeFile(
        join(rawDir, "manifest.json"),
        JSON.stringify({
          device: "iphone-6.9",
          screenshots: [{ sceneId: "home", file: "/tmp/01-home.png" }],
          preview: {
            clips: [{ segmentId: "intro", file: "/tmp/intro.mp4", durationSeconds: 18 }],
          },
        }),
      );

      // Seed stale legacy .otf and .ttf files in out/web/fonts/ to verify pruning
      const staleFontsDir = join(outDir, WEB_DIR, "fonts");
      await mkdir(staleFontsDir, { recursive: true });
      await writeFile(join(staleFontsDir, "NotoSansSC-400.otf"), "stale-otf");
      await writeFile(join(staleFontsDir, "DMSans-400.ttf"), "stale-ttf");

      const cfg = createFixtureConfig(root, outDir);
      const manifestPath = await writeManifest(cfg);
      expect(manifestPath).toBe(join(outDir, WEB_DIR, "store.json"));

      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as StoreManifest;
      expect(manifest.app.name).toBe("BudgetFlow");
      expect(manifest.locales).toEqual(["en-US"]);
      expect(manifest.devices).toHaveLength(2);
      expect(manifest.devices[0]!.frame).toBeNull();
      expect(manifest.devices[1]!.frame?.url.startsWith("frames/pixel-10-pro")).toBe(true);

      // Verify symlinks exist for screenshots, previews, raw
      for (const sub of ["screenshots", "previews", "raw"]) {
        const st = await lstat(join(outDir, WEB_DIR, sub));
        expect(st.isSymbolicLink()).toBe(true);
      }

      // Verify all bundled frame variants were copied
      for (const variant of FRAME_VARIANTS) {
        expect(existsSync(join(outDir, WEB_DIR, "frames", `${variant}.png`))).toBe(true);
      }

      // Verify WOFF2 fonts emitted, legacy OTF/TTF pruned, and Noto Sans SC marked lazy
      const emittedFonts = await readdir(staleFontsDir);
      expect(emittedFonts.length).toBeGreaterThan(0);
      expect(emittedFonts.some((f) => f.endsWith(".otf") || f.endsWith(".ttf"))).toBe(false);
      expect(emittedFonts.every((f) => f.endsWith(".woff2"))).toBe(true);

      const cjkEntry = manifest.design.fonts.find((f) => f.key === "noto-sans-sc");
      expect(cjkEntry).toBeDefined();
      expect(cjkEntry?.lazy).toBe(true);
      expect(cjkEntry?.faces).toHaveLength(0);
      expect(cjkEntry?.stylesheetUrl).toContain("Noto+Sans+SC");

      // Verify decorations copied and rewritten to decor/<name>
      expect(existsSync(join(outDir, WEB_DIR, "decor", "theme-logo.png"))).toBe(true);
      expect(existsSync(join(outDir, WEB_DIR, "decor", "scene-badge.png"))).toBe(true);
      expect(
        manifest.design.decorations[0]?.kind === "image" ? manifest.design.decorations[0].src : "",
      ).toBe("decor/theme-logo.png");
      expect(
        manifest.design.scenes[0]?.decorations?.[0]?.kind === "image"
          ? manifest.design.scenes[0].decorations[0].src
          : "",
      ).toBe("decor/scene-badge.png");

      // Verify rendered PNG assets collected with dimensions and size
      const collectedShots = manifest.assets["iphone-6.9"]?.["en-US"]?.screenshots ?? [];
      expect(collectedShots).toHaveLength(1);
      expect(collectedShots[0]!.sceneId).toBe("home");
      expect(collectedShots[0]!.width).toBe(120);
      expect(collectedShots[0]!.height).toBe(260);
      expect(collectedShots[0]!.bytes).toBeGreaterThan(0);

      // Verify raw capture manifest mapped into design.captures
      const rawCap = manifest.design.captures["iphone-6.9"];
      expect(rawCap).toBeDefined();
      expect(rawCap?.screenshots).toEqual([{ sceneId: "home", url: "raw/iphone-6.9/01-home.png" }]);
      expect(rawCap?.clips).toEqual([
        { segmentId: "intro", url: "raw/iphone-6.9/intro.mp4", durationSeconds: 18 },
      ]);

      // Verify preview scene metadata
      expect(manifest.design.preview).toEqual({
        sceneId: "preview",
        segments: [{ id: "intro" }],
      });

      // Re-running writeManifest cleanly replaces existing symlinks and supports custom bezel path
      const customCfg: LoadedConfig = {
        ...cfg,
        frame: { image: variantFramePath("17-pro-blue") },
      };
      await writeManifest(customCfg);
      const updated = JSON.parse(await readFile(manifestPath, "utf8")) as StoreManifest;
      expect(updated.design.frameVariant).toBeNull();
      expect(updated.design.customFrameUrl).toBe("frames/custom.png");
      expect(existsSync(join(outDir, WEB_DIR, "frames", "custom.png"))).toBe(true);
      expect(existsSync(join(shotDir, "01-home.png"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("handles minimal configs with no raw captures, no screenshots, no preview scene, and badge decorations", async () => {
    const root = await mkdtemp(join(tmpdir(), "appassets-manifest-empty-"));
    const outDir = join(root, "out");
    try {
      const base = createFixtureConfig(root, outDir);
      const minimalCfg: LoadedConfig = {
        ...base,
        devices: ["iphone-6.9"],
        locales: ["en-US", "fr-FR"],
        theme: {
          ...base.theme,
          decorations: [
            {
              kind: "badge",
              text: { "en-US": "NEW", "fr-FR": "NOUVEAU" },
              position: "top-right",
            },
          ],
        },
        scenes: [
          {
            id: "hero",
            kind: "screenshot",
            flow: "hero",
            headline: { "en-US": "Fast Setup", "fr-FR": "Configuration rapide" },
          },
        ],
      } as unknown as LoadedConfig;

      const manifestPath = await writeManifest(minimalCfg);
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as StoreManifest;

      expect(manifest.design.preview).toBeNull();
      expect(manifest.design.captures).toEqual({});
      expect(manifest.design.decorations).toEqual([
        {
          kind: "badge",
          text: { "en-US": "NEW", "fr-FR": "NOUVEAU" },
          position: "top-right",
        },
      ]);
      expect(manifest.assets["iphone-6.9"]?.["en-US"]).toEqual({
        screenshots: [],
        preview: null,
      });
      expect(manifest.assets["iphone-6.9"]?.["fr-FR"]).toEqual({
        screenshots: [],
        preview: null,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("handles iPad fixed bezels, scene layout/secondScene metadata, fallback sceneIds, malformed raw manifests, and pre-existing directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "appassets-manifest-edge-"));
    const outDir = join(root, "out");
    try {
      // Seed a pre-existing real directory at out/web/screenshots (not a symlink)
      await mkdir(join(outDir, WEB_DIR, "screenshots"), { recursive: true });
      await writeFile(join(outDir, WEB_DIR, "screenshots", "stale.txt"), "stale");

      // Seed a valid extra PNG that does not match any scene id + a non-PNG file that should be ignored
      const ipadShotsDir = join(outDir, "screenshots", "ipad-13", "en-US");
      await mkdir(ipadShotsDir, { recursive: true });
      await makePng(join(ipadShotsDir, "99-unmatched-shot.png"), 200, 260);
      await writeFile(join(ipadShotsDir, "notes.txt"), "ignore-me");

      // Seed a corrupted raw capture manifest JSON to verify graceful fallback
      const rawIpadDir = join(outDir, "raw", "ipad-13");
      await mkdir(rawIpadDir, { recursive: true });
      await writeFile(join(rawIpadDir, "manifest.json"), "{ invalid json");

      const base = createFixtureConfig(root, outDir);
      const edgeCfg: LoadedConfig = {
        ...base,
        devices: ["ipad-13"],
        locales: ["en-US"],
        theme: {
          ...base.theme,
          decorations: undefined,
        },
        scenes: [
          {
            id: "overview",
            kind: "screenshot",
            flow: "overview",
            headline: { "en-US": "Dashboard Overview" },
            layout: "duo",
            secondScene: "details",
          },
          {
            id: "details",
            kind: "screenshot",
            flow: "details",
            headline: { "en-US": "Deep Insights" },
          },
        ],
      } as unknown as LoadedConfig;

      const manifestPath = await writeManifest(edgeCfg);
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as StoreManifest;

      // Pre-existing directory replaced cleanly with a symlink
      const linkStat = await lstat(join(outDir, WEB_DIR, "screenshots"));
      expect(linkStat.isSymbolicLink()).toBe(true);

      // iPad fixed bezel frame emitted
      expect(manifest.devices).toHaveLength(1);
      expect(manifest.devices[0]?.frame?.url).toBe("frames/ipad-13.png");
      expect(manifest.devices[0]?.frame?.geom.width).toBeGreaterThan(0);
      expect(existsSync(join(outDir, WEB_DIR, "frames", "ipad-13.png"))).toBe(true);

      // Scene layout & secondScene metadata preserved
      expect(manifest.design.scenes[0]).toMatchObject({
        id: "overview",
        layout: "duo",
        secondScene: "details",
      });

      // Fallback sceneId uses PNG basename without extension, ignoring non-PNG files
      const collected = manifest.assets["ipad-13"]?.["en-US"]?.screenshots ?? [];
      expect(collected).toHaveLength(1);
      expect(collected[0]?.sceneId).toBe("99-unmatched-shot");
      expect(collected[0]?.width).toBe(200);
      expect(collected[0]?.height).toBe(260);

      // Corrupted raw capture manifest skipped gracefully
      expect(manifest.design.captures["ipad-13"]).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
