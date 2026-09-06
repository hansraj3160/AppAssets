#!/usr/bin/env node
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

const inputDir = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : null;

if (!inputDir || !existsSync(inputDir)) {
  console.error("Usage: npm run import -- <path-to-images-folder>");
  process.exit(1);
}

const files = readdirSync(inputDir)
  .filter((f) => [".png", ".jpg", ".jpeg", ".webp"].includes(extname(f).toLowerCase()))
  .sort();

if (files.length === 0) {
  console.error(`No images found in: ${inputDir}`);
  process.exit(1);
}

const devices = ["iphone-6.9", "pixel-10-pro"];
const root = process.cwd();

console.log(`Found ${files.length} images in ${inputDir}`);

for (const dev of devices) {
  const targetDir = join(root, "out", "raw", dev);
  mkdirSync(targetDir, { recursive: true });

  const screenshots = [];
  for (const file of files) {
    const name = basename(file, extname(file))
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
    const srcPath = join(inputDir, file);
    const targetFile = `${name}.png`;
    const dstPath = join(targetDir, targetFile);

    copyFileSync(srcPath, dstPath);
    screenshots.push({ sceneId: name, file: dstPath });
  }

  const manifest = {
    device: dev,
    udid: "manual",
    capturedAt: new Date().toISOString(),
    screenshots,
    preview: null,
  };

  writeFileSync(join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`✓ Updated raw captures for ${dev}`);
}

console.log("Updating manifest...");
execSync("goldie manifest", { stdio: "inherit" });
console.log("\nDone! Reload http://localhost:4321 to view your imported screenshots.");
