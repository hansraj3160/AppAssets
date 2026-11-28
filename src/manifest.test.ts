import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { FRAME_VARIANTS, type LoadedConfig, variantFramePath } from "./config.ts";
import { type StoreManifest, writeManifest } from "./manifest.ts";

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

test("writeManifest emits store.json, WOFF2 fonts (pruning legacy OTF/TTF), frames, decorations, captures, and assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "appassets-manifest-"));
  const outDir = join(root, "out");
  try {
    // Prepare decoration images in cfg.root
    await makePng(join(root, "theme-logo.png"), 64, 64);
    await makePng(join(root, "scene-badge.png"), 48, 48);

    // Prepare a rendered screenshot under out/screenshots/iphone-6.9/en-US/
    const shotDir = join(outDir, "screenshots", "iphone-6.9", "en-US");
    await mkdir(shotDir, { recursive: true });
    await makePng(join(shotDir, "01-home.png"), 120, 260);

    // Prepare raw capture manifest under out/raw/iphone-6.9/
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
    const staleFontsDir = join(outDir, "web", "fonts");
    await mkdir(staleFontsDir, { recursive: true });
    await writeFile(join(staleFontsDir, "NotoSansSC-400.otf"), "stale-otf");
    await writeFile(join(staleFontsDir, "DMSans-400.ttf"), "stale-ttf");

    const cfg = createFixtureConfig(root, outDir);
    const manifestPath = await writeManifest(cfg);
    assert.equal(manifestPath, join(outDir, "web", "store.json"));

    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as StoreManifest;
    assert.equal(manifest.app.name, "BudgetFlow");
    assert.deepEqual(manifest.locales, ["en-US"]);
    assert.equal(manifest.devices.length, 2);
    assert.equal(manifest.devices[0]!.frame, null);
    assert.ok(manifest.devices[1]!.frame?.url.startsWith("frames/pixel-10-pro"));

    // Verify symlinks exist for screenshots, previews, raw
    for (const sub of ["screenshots", "previews", "raw"]) {
      const st = await lstat(join(outDir, "web", sub));
      assert.equal(st.isSymbolicLink(), true, `Expected symlink for out/web/${sub}`);
    }

    // Verify all bundled frame variants were copied
    for (const variant of FRAME_VARIANTS) {
      assert.equal(existsSync(join(outDir, "web", "frames", `${variant}.png`)), true);
    }

    // Verify WOFF2 fonts emitted, legacy OTF/TTF pruned, and Noto Sans SC marked lazy
    const emittedFonts = await readdir(staleFontsDir);
    assert.ok(emittedFonts.length > 0);
    assert.equal(
      emittedFonts.some((f) => f.endsWith(".otf") || f.endsWith(".ttf")),
      false,
      "Legacy .otf/.ttf files must be pruned from out/web/fonts",
    );
    assert.ok(emittedFonts.every((f) => f.endsWith(".woff2")));

    const cjkEntry = manifest.design.fonts.find((f) => f.key === "noto-sans-sc");
    assert.ok(cjkEntry);
    assert.equal(cjkEntry.lazy, true);
    assert.equal(cjkEntry.faces.length, 0);
    assert.ok(cjkEntry.stylesheetUrl?.includes("Noto+Sans+SC"));

    // Verify decorations copied and rewritten to decor/<name>
    assert.equal(existsSync(join(outDir, "web", "decor", "theme-logo.png")), true);
    assert.equal(existsSync(join(outDir, "web", "decor", "scene-badge.png")), true);
    assert.equal(
      manifest.design.decorations[0]?.kind === "image" ? manifest.design.decorations[0].src : "",
      "decor/theme-logo.png",
    );
    assert.equal(
      manifest.design.scenes[0]?.decorations?.[0]?.kind === "image"
        ? manifest.design.scenes[0].decorations[0].src
        : "",
      "decor/scene-badge.png",
    );

    // Verify rendered PNG assets collected with dimensions and size
    const collectedShots = manifest.assets["iphone-6.9"]?.["en-US"]?.screenshots ?? [];
    assert.equal(collectedShots.length, 1);
    assert.equal(collectedShots[0]!.sceneId, "home");
    assert.equal(collectedShots[0]!.width, 120);
    assert.equal(collectedShots[0]!.height, 260);
    assert.ok(collectedShots[0]!.bytes > 0);

    // Verify raw capture manifest mapped into design.captures
    const rawCap = manifest.design.captures["iphone-6.9"];
    assert.ok(rawCap);
    assert.deepEqual(rawCap.screenshots, [{ sceneId: "home", url: "raw/iphone-6.9/01-home.png" }]);
    assert.deepEqual(rawCap.clips, [
      { segmentId: "intro", url: "raw/iphone-6.9/intro.mp4", durationSeconds: 18 },
    ]);

    // Verify preview scene metadata
    assert.deepEqual(manifest.design.preview, {
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
    assert.equal(updated.design.frameVariant, null);
    assert.equal(updated.design.customFrameUrl, "frames/custom.png");
    assert.equal(existsSync(join(outDir, "web", "frames", "custom.png")), true);
    // Original screenshot must remain intact after symlink replacement
    assert.equal(existsSync(join(shotDir, "01-home.png")), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
