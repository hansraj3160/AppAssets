import { describe, expect, test } from "bun:test";
import { findScreenshotFile } from "./studio-server.ts";

describe("findScreenshotFile", () => {
  const files = [
    "01-intro.png",
    "02-panorama_scene-1.png",
    "03-panorama_scene-2.png",
    "04-settings.png",
  ];

  test("matches single-tile screenshot when no slice is specified", () => {
    expect(findScreenshotFile(files, "intro")).toBe("01-intro.png");
    expect(findScreenshotFile(files, "settings")).toBe("04-settings.png");
  });

  test("matches slice 1 when slice=1 or slice=0 is specified", () => {
    expect(findScreenshotFile(files, "panorama_scene", 1)).toBe("02-panorama_scene-1.png");
    expect(findScreenshotFile(files, "panorama_scene", 0)).toBe("02-panorama_scene-1.png");
  });

  test("matches slice 2 when slice=2 is specified", () => {
    expect(findScreenshotFile(files, "panorama_scene", 2)).toBe("03-panorama_scene-2.png");
  });

  test("defaults to slice 1 for multi-slice scene when slice is omitted", () => {
    expect(findScreenshotFile(files, "panorama_scene")).toBe("02-panorama_scene-1.png");
  });

  test("falls back to single-tile file if slice=1 is requested on a non-multi-slice scene", () => {
    expect(findScreenshotFile(files, "intro", 1)).toBe("01-intro.png");
  });

  test("returns null when sceneId is not present", () => {
    expect(findScreenshotFile(files, "nonexistent")).toBeNull();
    expect(findScreenshotFile(files, "nonexistent", 2)).toBeNull();
  });
});
