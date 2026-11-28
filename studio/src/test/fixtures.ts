import { LAYOUTS, TEMPLATES } from "../../../src/layouts";
import type { Design, DeviceCaptures, DeviceEntry, StoreManifest } from "../manifest";

export function createMockDeviceSpec(overrides: Partial<DeviceEntry> = {}): DeviceEntry {
  return {
    key: "iphone-6.9",
    label: "iPhone 6.9",
    platform: "ios",
    simulatorName: "iPhone 17 Pro Max",
    screenshot: { width: 1320, height: 2868 },
    preview: { width: 886, height: 1920 },
    frame: null,
    ...overrides,
  };
}

export function createMockDesign(overrides: Partial<Design> = {}): Design {
  return {
    theme: {
      background: "#0E1B2A",
      headlineColor: "#FFFFFF",
      subheadColor: "#94A3B8",
      fontFamily: '"DM Sans", system-ui, sans-serif',
      copyHeightRatio: 0.24,
      deviceWidthRatio: 0.78,
      backgroundPattern: "none",
      patternOpacity: 0.05,
      deviceBacklight: false,
      panoramaMode: false,
    },
    frameVariant: "17-pro-silver",
    frameVariants: ["17-pro-silver", "17-pro-blue", "17-pro-orange"],
    customFrameUrl: null,
    fonts: [
      {
        key: "dm-sans",
        family: "DM Sans",
        fallback: "system-ui, sans-serif",
        faces: [
          {
            weight: 400,
            url: "fonts/DMSans-latin.woff2",
            unicodeRange: "U+0000-00FF",
          },
        ],
      },
      {
        key: "montserrat",
        family: "Montserrat",
        fallback: "system-ui, sans-serif",
        faces: [
          {
            weight: 700,
            url: "fonts/Montserrat-latin.woff2",
            unicodeRange: "U+0000-00FF",
          },
        ],
      },
    ],
    layouts: Object.values(LAYOUTS).map(({ key, label, description, span }) => ({
      key,
      label,
      description,
      span,
    })),
    templates: Object.values(TEMPLATES),
    template: null,
    layout: "classic",
    screenOnly: false,
    decorations: [],
    scenes: [
      {
        id: "home",
        headline: { "en-US": "Track Daily Expenses" },
        subhead: { "en-US": "Stay on budget automatically" },
      },
      {
        id: "stats",
        headline: { "en-US": "Clear Monthly Insights" },
        subhead: { "en-US": "Spot trends in seconds" },
      },
      {
        id: "settings",
        headline: { "en-US": "Sync Across Devices" },
        subhead: { "en-US": "Encrypted backup everywhere" },
      },
    ],
    preview: null,
    captures: {
      "iphone-6.9": createMockCaptures(),
    },
    ...overrides,
  };
}

export function createMockCaptures(overrides: Partial<DeviceCaptures> = {}): DeviceCaptures {
  return {
    screenshots: [
      { sceneId: "home", url: "/raw/iphone-6.9/home.png" },
      { sceneId: "stats", url: "/raw/iphone-6.9/stats.png" },
      { sceneId: "settings", url: "/raw/iphone-6.9/settings.png" },
    ],
    clips: null,
    ...overrides,
  };
}

export function createMockManifest(overrides: Partial<StoreManifest> = {}): StoreManifest {
  const design = overrides.design ?? createMockDesign();
  return {
    generatedAt: "2026-11-27T00:00:00.000Z",
    app: {
      name: "BudgetFlow",
      subtitle: { "en-US": "Smart Personal Finance" },
      developer: "AppAssets Labs",
      category: "Finance",
      rating: 4.9,
      ratingCount: "12.4K",
      ageRating: "4+",
      price: "Free",
      description: { "en-US": "Effortless budgeting and shared expense tracking." },
    },
    devices: [createMockDeviceSpec()],
    locales: ["en-US"],
    design,
    ...overrides,
  };
}
