import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  _resetFontRegistryForTest,
  containsCjk,
  ensureCjkFontsLoaded,
  FONTS,
  fontFilePath,
  isCjkLocale,
  isCjkRegistered,
  needsCjkFont,
  registerFonts,
  resolveFontCacheDir,
  resolveRemoteFontUrl,
  withGlyphFallback,
} from "./fonts";

test("isCjkLocale identifies Chinese, Japanese, and Korean locales only", () => {
  assert.equal(isCjkLocale("zh-CN"), true);
  assert.equal(isCjkLocale("zh-Hans"), true);
  assert.equal(isCjkLocale("zh_TW"), true);
  assert.equal(isCjkLocale("ja"), true);
  assert.equal(isCjkLocale("ja-JP"), true);
  assert.equal(isCjkLocale("ko-KR"), true);

  assert.equal(isCjkLocale("en-US"), false);
  assert.equal(isCjkLocale("fr-FR"), false);
  assert.equal(isCjkLocale("ar-SA"), false);
  assert.equal(isCjkLocale(""), false);
  assert.equal(isCjkLocale(undefined), false);
});

test("containsCjk detects CJK ideographs, kana, and hangul without false positives", () => {
  assert.equal(containsCjk("轻松管理每日开支"), true);
  assert.equal(containsCjk("アプリを素早く作成"), true);
  assert.equal(containsCjk("간편한 가계부"), true);

  assert.equal(containsCjk("Track daily activity"), false);
  assert.equal(containsCjk("Café naïve Łódź"), false);
  assert.equal(containsCjk("مرحبا بالعالم"), false);
  assert.equal(containsCjk(""), false);
  assert.equal(containsCjk(undefined), false);
});

test("needsCjkFont triggers only for CJK locales, CJK copy, or explicit Noto Sans SC", () => {
  assert.equal(
    needsCjkFont({ locale: "en-US", fontFamily: '"DM Sans", sans-serif', texts: ["Hello World"] }),
    false,
  );
  assert.equal(
    needsCjkFont({ locale: "zh-CN", fontFamily: '"DM Sans", sans-serif', texts: ["Hello"] }),
    true,
  );
  assert.equal(
    needsCjkFont({ locale: "en-US", fontFamily: '"DM Sans", sans-serif', texts: ["Hello 世界"] }),
    true,
  );
  assert.equal(
    needsCjkFont({ locale: "en-US", fontFamily: '"Noto Sans SC", sans-serif', texts: ["Hello"] }),
    true,
  );
});

test("withGlyphFallback omits Noto Sans SC unless CJK is needed or already requested", () => {
  const latin = withGlyphFallback('"DM Sans", sans-serif');
  assert.equal(latin.includes("Noto Sans SC"), false);
  assert.equal(latin.includes("Geeza Pro"), true);

  const cjkOpt = withGlyphFallback('"DM Sans", sans-serif', { includeCjk: true });
  assert.equal(cjkOpt.includes("Noto Sans SC"), true);

  const explicit = withGlyphFallback('"Noto Sans SC", sans-serif');
  assert.equal(explicit.includes("Noto Sans SC"), true);
});

test("resolveFontCacheDir and resolveRemoteFontUrl honor environment overrides", () => {
  const customDir = resolveFontCacheDir({ APPASSETS_FONT_CACHE_DIR: "/var/cache/fonts" });
  assert.equal(customDir, "/var/cache/fonts");

  const defaultDir = resolveFontCacheDir({});
  assert.ok(defaultDir.endsWith("appassets-fonts"));

  assert.equal(
    resolveRemoteFontUrl("NotoSansSC-400.ttf", "https://default.example/400.ttf", ""),
    "https://default.example/400.ttf",
  );
  assert.equal(
    resolveRemoteFontUrl(
      "NotoSansSC-400.ttf",
      "https://default.example/400.ttf",
      "https://cdn.example.com/fonts///",
    ),
    "https://cdn.example.com/fonts/NotoSansSC-400.ttf",
  );
});

test("registerFonts loads compact Latin WOFF2 fonts eagerly without loading CJK into memory", () => {
  _resetFontRegistryForTest();
  registerFonts();
  assert.equal(isCjkRegistered(), false);
});

test("ensureCjkFontsLoaded downloads lazily, deduplicates concurrent calls, caches to disk, and handles failures", async () => {
  const dir = mkdtempSync(join(tmpdir(), "appassets-fonts-test-"));
  try {
    _resetFontRegistryForTest();
    const fetchedUrls: string[] = [];
    const registered: Array<{ path: string; family: string }> = [];

    const mockFetcher = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      fetchedUrls.push(url);
      await new Promise((r) => setTimeout(r, 15));
      return new Response(new Uint8Array([0, 1, 2, 3]), { status: 200 });
    }) as typeof fetch;

    const [a, b] = await Promise.all([
      ensureCjkFontsLoaded({
        cacheDir: dir,
        cdnBase: "https://cdn.example.com/fonts",
        fetcher: mockFetcher,
        registerPath: (p, fam) => registered.push({ path: p, family: fam }),
      }),
      ensureCjkFontsLoaded({
        cacheDir: dir,
        cdnBase: "https://cdn.example.com/fonts",
        fetcher: mockFetcher,
        registerPath: (p, fam) => registered.push({ path: p, family: fam }),
      }),
    ]);

    assert.equal(a, true);
    assert.equal(b, true);
    assert.equal(isCjkRegistered(), true);
    assert.deepEqual(fetchedUrls, [
      "https://cdn.example.com/fonts/NotoSansSC-400.ttf",
      "https://cdn.example.com/fonts/NotoSansSC-700.ttf",
    ]);
    assert.equal(registered.length, 2);
    assert.equal(existsSync(join(dir, "NotoSansSC-400.ttf")), true);
    assert.equal(existsSync(join(dir, "NotoSansSC-700.ttf")), true);

    // Reset in-memory flag and verify subsequent load hits disk cache with zero network fetches.
    _resetFontRegistryForTest();
    let secondFetches = 0;
    const cachedOk = await ensureCjkFontsLoaded({
      cacheDir: dir,
      fetcher: (async () => {
        secondFetches++;
        return new Response(null, { status: 500 });
      }) as typeof fetch,
      registerPath: (p, fam) => registered.push({ path: p, family: fam }),
    });
    assert.equal(cachedOk, true);
    assert.equal(secondFetches, 0);

    // Offline / CDN failure into an empty cache directory returns false cleanly without throwing.
    _resetFontRegistryForTest();
    const emptyDir = join(dir, "empty-fail");
    const failed = await ensureCjkFontsLoaded({
      cacheDir: emptyDir,
      fetcher: (async () => new Response(null, { status: 503 })) as typeof fetch,
      registerPath: () => {},
    });
    assert.equal(failed, false);
    assert.equal(isCjkRegistered(), false);
  } finally {
    _resetFontRegistryForTest();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bundled Latin fonts exist as compact WOFF2 subsets and assets/fonts stays under 500 KB", () => {
  for (const [key, font] of Object.entries(FONTS)) {
    if ("lazy" in font && font.lazy) {
      assert.equal(font.faces.length, 0, `${key} lazy font should not emit local eager faces`);
      assert.ok(font.stylesheetUrl, `${key} lazy font should define a browser stylesheetUrl`);
      continue;
    }
    assert.ok(font.faces.length > 0, `${key} should declare WOFF2 subset faces`);
    for (const face of font.faces) {
      assert.ok(face.file.endsWith(".woff2"), `${key} face ${face.file} should be WOFF2`);
      assert.ok(face.unicodeRange, `${key} face ${face.file} should declare unicodeRange`);
      assert.equal(
        existsSync(fontFilePath(face.file)),
        true,
        `Missing bundled font file: ${face.file}`,
      );
    }
  }

  const fontsDir = fontFilePath(".");
  const files = readdirSync(fontsDir);
  let totalBytes = 0;
  for (const name of files) {
    assert.equal(
      name.endsWith(".otf") || name.endsWith(".ttf"),
      false,
      `Heavy raw font binary should not be bundled in assets/fonts/: ${name}`,
    );
    totalBytes += statSync(join(fontsDir, name)).size;
  }
  assert.ok(
    totalBytes < 500 * 1024,
    `Expected assets/fonts/ under 500 KB, got ${(totalBytes / 1024).toFixed(1)} KB`,
  );
});
