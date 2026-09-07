import { describe, expect, test } from "bun:test";
import { formatFfmpegConcatList } from "./render.ts";

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
