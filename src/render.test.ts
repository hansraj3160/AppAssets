import { describe, expect, test } from "bun:test";
import { formatFfmpegConcatList, pick } from "./render.ts";

describe("formatFfmpegConcatList", () => {
  test("formats standard POSIX paths for FFmpeg concat", () => {
    const paths = ["/out/previews/raw/intro.mp4", "/out/previews/raw/feature.mp4"];
    expect(formatFfmpegConcatList(paths)).toBe(
      "file '/out/previews/raw/intro.mp4'\nfile '/out/previews/raw/feature.mp4'",
    );
  });

  test("normalizes Windows backslashes to forward slashes", () => {
    const windowsPaths = [
      "C:\\Users\\admin\\app\\.goldie\\raw\\iphone-6.9\\01-intro.mp4",
      "D:\\data\\app\\clips\\02-feed.mp4",
    ];
    expect(formatFfmpegConcatList(windowsPaths)).toBe(
      "file 'C:/Users/admin/app/.goldie/raw/iphone-6.9/01-intro.mp4'\nfile 'D:/data/app/clips/02-feed.mp4'",
    );
  });

  test("escapes single quotes correctly alongside Windows backslash normalization", () => {
    const paths = ["C:\\Users\\admin\\app\\let's go\\intro.mp4"];
    expect(formatFfmpegConcatList(paths)).toBe("file 'C:/Users/admin/app/let'\\''s go/intro.mp4'");
  });

  test("handles empty list", () => {
    expect(formatFfmpegConcatList([])).toBe("");
  });
});

describe("pick localized copy helper", () => {
  test("returns exact locale match when present", () => {
    const map = { "en-US": "Hello", "hi-IN": "नमस्ते" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("नमस्ते");
    expect(pick(map, "en-US", "scene1", "headline")).toBe("Hello");
  });

  test("falls back to language-only prefix if specific region not present", () => {
    const map = { "en-US": "Hello", hi: "नमस्ते" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("नमस्ते");
  });

  test("falls back to en-US when requested locale is completely missing", () => {
    const map = { "en-US": "Default English headline" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("Default English headline");
    expect(pick(map, "ar-SA", "scene1", "headline")).toBe("Default English headline");
  });

  test("falls back to first available locale if en-US not present", () => {
    const map = { "es-ES": "Hola" };
    expect(pick(map, "hi-IN", "scene1", "headline")).toBe("Hola");
  });

  test("throws descriptive error when map is completely empty", () => {
    expect(() => pick({}, "hi-IN", "screenshot_1", "headline")).toThrow(
      'Scene "screenshot_1" has no headline for locale "hi-IN".',
    );
  });
});
