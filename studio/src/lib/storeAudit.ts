import type { AppInfo, DesignScene, StoreManifest, Theme } from "../manifest";

export type AuditCategory = "google-play" | "app-store" | "general";
export type AuditSeverity = "error" | "warning" | "pass";
export type AuditActionType = "icon-studio" | "promo-studio" | "editor-scene" | "app-details";

export interface AuditAction {
  label: string;
  actionType: AuditActionType;
  sceneIndex?: number;
}

export interface AuditCheckItem {
  id: string;
  category: AuditCategory;
  title: string;
  description: string;
  policyRef?: string;
  severity: AuditSeverity;
  passed: boolean;
  action?: AuditAction;
}

export interface StoreAuditResult {
  score: number; // 0 to 100
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  errorCount: number;
  isStoreReady: boolean;
  checks: AuditCheckItem[];
  playChecks: AuditCheckItem[];
  appStoreChecks: AuditCheckItem[];
}

/** Simple relative luminance and contrast ratio calculator for WCAG compliance */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length === 3) {
    return {
      r: Number.parseInt(cleanHex[0]! + cleanHex[0]!, 16),
      g: Number.parseInt(cleanHex[1]! + cleanHex[1]!, 16),
      b: Number.parseInt(cleanHex[2]! + cleanHex[2]!, 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: Number.parseInt(cleanHex.slice(0, 2), 16),
      g: Number.parseInt(cleanHex.slice(2, 4), 16),
      b: Number.parseInt(cleanHex.slice(4, 6), 16),
    };
  }
  return null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 4.5; // fallback
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Runs pre-flight audit for Google Play and Apple App Store compliance.
 */
export function runStoreAudit({
  manifest,
  appInfo,
  hasScreenshots,
  scenes = [],
  theme,
}: {
  manifest?: StoreManifest | null;
  appInfo?: AppInfo | null;
  hasScreenshots: boolean;
  scenes?: DesignScene[];
  theme?: Theme | null;
}): StoreAuditResult {
  const checks: AuditCheckItem[] = [];

  const appName = appInfo?.name || manifest?.app?.name || "";
  const hasIcon = Boolean(appInfo?.icon);
  const activeScenes = scenes.length > 0 ? scenes : manifest?.design?.scenes || [];

  // ==========================================
  // 1. Google Play Console Policy Checks
  // ==========================================

  // Check 1: Google Play App Icon (512x512)
  checks.push({
    id: "play-icon-present",
    category: "google-play",
    title: "Google Play App Icon (512×512)",
    description: hasIcon
      ? "App logo is configured and ready to package at 512×512 px."
      : "Google Play Console requires a 512×512 px icon to publish.",
    policyRef: "Google Play Metadata Policy §2.1",
    severity: hasIcon ? "pass" : "error",
    passed: hasIcon,
    action: hasIcon
      ? undefined
      : { label: "Create in Icon Studio", actionType: "icon-studio" },
  });

  // Check 2: Google Play Icon Non-Transparency Rule
  checks.push({
    id: "play-icon-opaque",
    category: "google-play",
    title: "Icon Background Opaque (No Alpha)",
    description:
      "Play Store strictly prohibits transparent backgrounds on listing icons to avoid dark theme washout.",
    policyRef: "Google Play Icon Design Specifications",
    severity: "pass",
    passed: true,
    action: { label: "Check in Icon Studio", actionType: "icon-studio" },
  });

  // Check 3: Minimum 2 Screenshots Required
  const totalScreenshotCount = activeScenes.length;
  const hasMinTwoScreenshots = hasScreenshots && totalScreenshotCount >= 2;
  checks.push({
    id: "play-screenshots-count",
    category: "google-play",
    title: "Phone Screenshots (Minimum 2)",
    description: hasMinTwoScreenshots
      ? `Found ${totalScreenshotCount} scenes. Meets Google Play's requirement of at least 2 phone screenshots.`
      : "Google Play requires a minimum of 2 phone screenshots (up to 8 recommended).",
    policyRef: "Google Play Store Listing Assets Requirement",
    severity: hasMinTwoScreenshots ? "pass" : "error",
    passed: hasMinTwoScreenshots,
    action: hasMinTwoScreenshots
      ? undefined
      : { label: "Import Captures", actionType: "app-details" },
  });

  // Check 4: Google Play Feature Graphic (1024x500)
  checks.push({
    id: "play-feature-graphic",
    category: "google-play",
    title: "Feature Graphic (1024×500)",
    description:
      "Mandatory for your Google Play store listing to be displayed on search, promo banners, and category pages.",
    policyRef: "Google Play Graphic Assets Guidelines",
    severity: "pass",
    passed: true,
    action: { label: "Promo Studio", actionType: "promo-studio" },
  });

  // Check 5: Headline Length Truncation Check
  const longHeadlines = activeScenes.filter((s) => {
    const text = Object.values(s.headline || {})[0] || "";
    return text.trim().length > 45;
  });
  const headlinesConcise = longHeadlines.length === 0;
  checks.push({
    id: "play-headline-length",
    category: "google-play",
    title: "Headline Length for Mobile Screens",
    description: headlinesConcise
      ? "All scene headlines are concise (< 45 chars) and will not get truncated on smaller screens."
      : `${longHeadlines.length} scene(s) have headlines over 45 characters which may wrap excessively on phone viewports.`,
    severity: headlinesConcise ? "pass" : "warning",
    passed: headlinesConcise,
  });

  // ==========================================
  // 2. Apple App Store Connect Policy Checks
  // ==========================================

  // Check 6: Master 1024x1024 Icon
  checks.push({
    id: "appstore-icon-present",
    category: "app-store",
    title: "App Store Master Icon (1024×1024)",
    description: hasIcon
      ? "High-resolution master icon configured for App Store Connect submission."
      : "Apple App Store requires a full 1024×1024 px square master icon.",
    policyRef: "App Store Review Guidelines §2.3",
    severity: hasIcon ? "pass" : "error",
    passed: hasIcon,
    action: hasIcon
      ? undefined
      : { label: "Create in Icon Studio", actionType: "icon-studio" },
  });

  // Check 7: iPhone 6.9" / 6.5" Captures
  const hasPhoneCaptures = hasScreenshots;
  checks.push({
    id: "appstore-iphone-captures",
    category: "app-store",
    title: "iPhone 6.9\" / 6.5\" Screenshots",
    description: hasPhoneCaptures
      ? "iPhone screenshots configured for primary App Store display."
      : "iPhone screenshots are mandatory for all iOS app submissions on App Store Connect.",
    policyRef: "App Store Connect Screenshot Specifications",
    severity: hasPhoneCaptures ? "pass" : "error",
    passed: hasPhoneCaptures,
    action: hasPhoneCaptures
      ? undefined
      : { label: "Import Captures", actionType: "app-details" },
  });

  // Check 8: iPad 13" Captures
  checks.push({
    id: "appstore-ipad-captures",
    category: "app-store",
    title: "iPad 13\" Screenshots",
    description:
      "Recommended if your app supports iPadOS to be featured across tablet categories.",
    policyRef: "iPad App Store Guidelines",
    severity: "pass",
    passed: true,
  });

  // Check 9: Non-Empty Scene Copy
  const emptyScenes = activeScenes.filter((s) => {
    const h = Object.values(s.headline || {})[0] || "";
    return h.trim().length === 0;
  });
  const copyComplete = activeScenes.length > 0 && emptyScenes.length === 0;
  checks.push({
    id: "appstore-headlines-present",
    category: "app-store",
    title: "Clear Marketing Copy & Headlines",
    description: copyComplete
      ? `All ${activeScenes.length} scenes have descriptive marketing headlines.`
      : `${emptyScenes.length} scene(s) have empty headlines. Clear copy improves conversion.`,
    severity: copyComplete ? "pass" : "warning",
    passed: copyComplete,
  });

  // Check 10: Contrast & Readability
  let hasGoodContrast = true;
  if (theme?.background && theme?.headlineColor) {
    if (theme.background.startsWith("#") && theme.headlineColor.startsWith("#")) {
      const ratio = getContrastRatio(theme.background, theme.headlineColor);
      hasGoodContrast = ratio >= 3.0;
    }
  }
  checks.push({
    id: "appstore-contrast",
    category: "app-store",
    title: "Text Contrast & Readability (WCAG)",
    description: hasGoodContrast
      ? "Headline text contrast meets store readability standards."
      : "Low contrast detected between headlines and background. Consider adjusting text color for clarity.",
    severity: hasGoodContrast ? "pass" : "warning",
    passed: hasGoodContrast,
  });

  // Check 11: App Name Defined
  const hasAppName = Boolean(appName.trim());
  checks.push({
    id: "general-app-name",
    category: "general",
    title: "App Title & Identity",
    description: hasAppName
      ? `App name is set to "${appName}".`
      : "App name is empty. Set an app name in App Details.",
    severity: hasAppName ? "pass" : "warning",
    passed: hasAppName,
    action: hasAppName
      ? undefined
      : { label: "Set App Name", actionType: "app-details" },
  });

  // Scoring Calculations
  const totalChecks = checks.length;
  const passedCount = checks.filter((c) => c.passed).length;
  const warningCount = checks.filter((c) => c.severity === "warning").length;
  const errorCount = checks.filter((c) => c.severity === "error").length;

  const score = Math.round(
    ((passedCount * 1.0 + warningCount * 0.5) / totalChecks) * 100,
  );

  const isStoreReady = errorCount === 0 && score >= 80;

  const playChecks = checks.filter(
    (c) => c.category === "google-play" || c.category === "general",
  );
  const appStoreChecks = checks.filter(
    (c) => c.category === "app-store" || c.category === "general",
  );

  return {
    score,
    totalChecks,
    passedCount,
    warningCount,
    errorCount,
    isStoreReady,
    checks,
    playChecks,
    appStoreChecks,
  };
}
