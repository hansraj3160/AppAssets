import assert from "node:assert/strict";
import test from "node:test";
import { hexToRgba, isLightBackground, resolveLogoBg } from "../components/promo-banners/presets";
import type { Design, DeviceEntry, StoreManifest } from "../manifest";
import {
  buildAppInfo,
  buildDesignState,
  buildSavePayload,
  containsCjk,
  CUSTOM_TEMPLATE,
  deviceLabel,
  filterSceneRecord,
  fontFaces,
  initialOrder,
  initialTemplate,
  isCjkLocale,
  resolveScreenFromParts,
  shouldLoadCjkFont,
} from "./studioState";

function mockDesign(overrides: Partial<Design> = {}): Design {
  return {
    theme: {
      background: "#0E1B2A",
      fontFamily: "DM Sans",
      backgroundPattern: "none",
      patternOpacity: 0.05,
      deviceBacklight: false,
      panoramaMode: false,
    },
    frameVariants: ["17-pro-silver", "17-pro-blue"],
    frameVariant: "17-pro-silver",
    fonts: [
      {
        key: "dm-sans",
        family: "DM Sans",
        faces: [
          { weight: 400, url: "/fonts/DMSans-400.ttf" },
          { weight: 700, url: "/fonts/DMSans-700.otf" },
        ],
      },
    ],
    layout: "single",
    layouts: [
      { key: "single", label: "Single", slots: [] },
      { key: "duo", label: "Duo", slots: [] },
    ],
    templates: [
      { key: "hero", label: "Hero", sequence: ["single"] },
      { key: "story", label: "Story", sequence: ["single", "duo"] },
    ],
    template: "hero",
    screenOnly: false,
    scenes: [
      { id: "home", headline: { "en-US": "Home" } },
      { id: "stats", headline: { "en-US": "Stats" } },
      { id: "settings", headline: { "en-US": "Settings" } },
    ],
    captures: {},
    ...overrides,
  } as unknown as Design;
}

test("resolveScreenFromParts resolves pathnames, query views, hashes, and 404", () => {
  assert.equal(resolveScreenFromParts("/"), "landing");
  assert.equal(resolveScreenFromParts("/studio/"), "studio");
  assert.equal(resolveScreenFromParts("/privacy"), "privacy");
  assert.equal(resolveScreenFromParts("/terms"), "terms");
  assert.equal(resolveScreenFromParts("/about"), "about");
  assert.equal(resolveScreenFromParts("/contact"), "contact");
  assert.equal(resolveScreenFromParts("/guidelines"), "guidelines");
  assert.equal(resolveScreenFromParts("/", "?view=studio"), "studio");
  assert.equal(resolveScreenFromParts("/", "", "#guidelines"), "guidelines");
  assert.equal(resolveScreenFromParts("/nonexistent-page"), "not-found");
});

test("initialTemplate handles saved templates, cleared template, and custom array templates", () => {
  const design = mockDesign();
  assert.equal(initialTemplate(design, { template: "story" }), "story");
  assert.equal(initialTemplate(design, { template: "" }), "");
  assert.equal(initialTemplate(design, { template: "removed-template" }), "hero");

  const customArrayDesign = mockDesign({ template: ["single", "duo"] as unknown as string });
  assert.equal(initialTemplate(customArrayDesign, {}), CUSTOM_TEMPLATE);
});

test("initialOrder keeps existing saved scene ids and appends newly added scenes", () => {
  const design = mockDesign();
  assert.deepEqual(initialOrder(design, {}), []);
  assert.deepEqual(initialOrder(design, { order: ["settings", "deleted", "home"] }), [
    "settings",
    "home",
    "stats",
  ]);
});

test("filterSceneRecord strips removed base scene ids while keeping sliced keys", () => {
  const valid = new Set(["home", "stats"]);
  const filtered = filterSceneRecord(
    {
      home: "single",
      "home#1": "duo",
      "removed#1": "single",
      deleted: "duo",
    },
    valid,
  );
  assert.deepEqual(filtered, { home: "single", "home#1": "duo" });
});

test("buildDesignState and buildSavePayload round-trip valid design choices cleanly", () => {
  const design = mockDesign();
  const knownLayout = (key: string | undefined) =>
    key && design.layouts.some((l) => l.key === key) ? key : undefined;

  const state = buildDesignState(
    design,
    {
      background: "#FFFFFF",
      frame: "17-pro-blue",
      layout: "duo",
      template: "story",
      screenOnly: true,
      sceneLayouts: { home: "duo", nonexistent: "single" },
      order: ["stats", "home"],
    },
    knownLayout,
  );

  assert.equal(state.background, "#FFFFFF");
  assert.equal(state.frame, "17-pro-blue");
  assert.equal(state.layout, "duo");
  assert.equal(state.template, "story");
  assert.deepEqual(state.sceneLayouts, { home: "duo" });
  assert.deepEqual(state.order, ["stats", "home", "settings"]);

  const payload = buildSavePayload(state, { name: "BudgetFlow", icon: "/icon.png" });
  assert.equal(payload.background, "#FFFFFF");
  assert.equal(payload.frame, "17-pro-blue");
  assert.equal(payload.appInfo?.name, "BudgetFlow");
  assert.equal(payload.appIcon, "/icon.png");
  assert.equal(payload.fontSizeScale, undefined);
});

test("buildAppInfo falls back cleanly across saved info, locale, and en-US", () => {
  const manifest = {
    app: {
      name: "DefaultApp",
      subtitle: { "en-US": "English Subtitle", "fr-FR": "Sous-titre" },
      category: "Finance",
      developer: "Studio Co",
      description: { "en-US": "English Desc" },
    },
  } as unknown as StoreManifest;

  const infoFr = buildAppInfo(manifest, {}, "fr-FR");
  assert.equal(infoFr.name, "DefaultApp");
  assert.equal(infoFr.subtitle, "Sous-titre");
  assert.equal(infoFr.description, "English Desc");

  const infoSaved = buildAppInfo(
    manifest,
    { appInfo: { name: "CustomName", subtitle: "Custom Sub" }, appIcon: "/custom.png" },
    "fr-FR",
  );
  assert.equal(infoSaved.name, "CustomName");
  assert.equal(infoSaved.subtitle, "Custom Sub");
  assert.equal(infoSaved.icon, "/custom.png");
});

test("deviceLabel and fontFaces format labels and WOFF2 @font-face declarations correctly", () => {
  const iosDevice = { platform: "ios", label: "iPhone 6.9" } as DeviceEntry;
  const androidDevice = { platform: "android", label: "Pixel 10 Pro" } as DeviceEntry;
  assert.equal(deviceLabel(iosDevice), 'iPhone 6.9"');
  assert.equal(deviceLabel(androidDevice), "Pixel 10 Pro");

  const css = fontFaces([
    ...mockDesign().fonts,
    {
      key: "lato",
      family: "Lato",
      fallback: "system-ui, sans-serif",
      faces: [
        { weight: 400, url: "/fonts/Lato-400-latin.woff2", unicodeRange: "U+0000-00FF" },
        { weight: 700, url: "/fonts/Lato-700-latin-ext.woff2", unicodeRange: "U+0100-02BA" },
      ],
    },
  ]);
  assert.ok(css.includes('format("truetype")'));
  assert.ok(css.includes('format("opentype")'));
  assert.ok(css.includes('format("woff2")'));
  assert.ok(css.includes("font-display:swap"));
  assert.ok(css.includes("unicode-range:U+0000-00FF"));
});

test("shouldLoadCjkFont defers CJK loading for Latin locales and activates for CJK locale, glyphs, or font selection", () => {
  assert.equal(isCjkLocale("zh-CN"), true);
  assert.equal(isCjkLocale("en-US"), false);
  assert.equal(containsCjk("快速记账"), true);
  assert.equal(containsCjk("Fast Budgeting"), false);

  const latinScenes = [{ id: "home", headline: { "en-US": "Track Spending" } }];
  assert.equal(
    shouldLoadCjkFont({
      locale: "en-US",
      fontFamily: '"DM Sans", sans-serif',
      scenes: latinScenes,
      copy: {},
    }),
    false,
  );
  assert.equal(
    shouldLoadCjkFont({
      locale: "zh-CN",
      fontFamily: '"DM Sans", sans-serif',
      scenes: latinScenes,
    }),
    true,
  );
  assert.equal(
    shouldLoadCjkFont({
      locale: "en-US",
      fontFamily: '"DM Sans", sans-serif',
      copy: { home: { headline: { "en-US": "智能预算" } } },
    }),
    true,
  );
  assert.equal(
    shouldLoadCjkFont({
      locale: "en-US",
      fontFamily: '"Noto Sans SC", sans-serif',
      scenes: latinScenes,
    }),
    true,
  );
});

test("promo banner pure helpers compute RGBA, background luminance, and logo backgrounds", () => {
  assert.equal(hexToRgba("#38BDF8", 0.5), "rgba(56, 189, 248, 0.5)");
  assert.equal(hexToRgba("#FFF", 0.2), "rgba(255, 255, 255, 0.2)");
  assert.equal(isLightBackground("#FFFFFF"), true);
  assert.equal(isLightBackground("linear-gradient(135deg, #F8FAFC, #E2E8F0)"), true);
  assert.equal(isLightBackground("#0E1B2A"), false);
  assert.equal(resolveLogoBg("transparent"), "transparent");
  assert.ok(resolveLogoBg("gradient").includes("linear-gradient"));
  assert.equal(resolveLogoBg("#0F172A"), "#0F172A");
});
