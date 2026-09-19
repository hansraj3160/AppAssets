/**
 * Google Analytics 4 (GA4) Analytics Engine for AppAssets Studio.
 *
 * Provides safe, non-blocking, non-PII tracking for page views, user engagement,
 * and the complete conversion funnel (visitor -> tool usage -> signup -> pro purchase).
 *
 * Resilience:
 * - Operates safely in dev/production without throwing if the measurement ID is absent.
 * - Safely handles ad-blockers (Brave Shields, uBlock Origin, etc.) without UI degradation.
 * - Enforces strict non-PII filtering (no emails, passwords, tokens, or binary data).
 */

const PII_KEYS = new Set([
  "email",
  "mail",
  "password",
  "pass",
  "token",
  "secret",
  "auth",
  "credential",
  "credentials",
  "apikey",
  "api_key",
  "dataurl",
  "data_url",
  "base64",
  "image",
  "buffer",
]);

let initialized = false;

export const DEFAULT_MEASUREMENT_ID = "G-DEML3C77ZR";

/** Retrieves the configured GA4 Measurement ID from Vite/Next.js environment variables. */
export function getMeasurementId(): string {
  const nextPublicId =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
      : "";
  const viteId =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_GA_MEASUREMENT_ID
      : "";

  return (nextPublicId || viteId || DEFAULT_MEASUREMENT_ID).trim();
}

/** Sanitizes parameters to guarantee no PII is transmitted to GA4. */
function sanitizeParams(params?: Record<string, any>): Record<string, any> {
  if (!params || typeof params !== "object") return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (PII_KEYS.has(lowerKey)) continue;

    // Prune oversized strings or binary representations
    if (typeof value === "string") {
      if (value.startsWith("data:") || value.length > 200) {
        continue;
      }
      cleaned[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.slice(0, 10).map((item) => {
        if (typeof item === "object" && item !== null) {
          return sanitizeParams(item);
        }
        return item;
      });
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitizeParams(value);
    }
  }

  return cleaned;
}

/**
 * Initializes Google Analytics 4 dynamically.
 * Injects gtag.js script and sets up window.dataLayer and window.gtag.
 * send_page_view is set to false because AppAssets is an SPA where page views
 * are explicitly tracked on client route transitions.
 */
export function initGA(): boolean {
  if (typeof window === "undefined") return false;
  if (initialized) return true;

  const measurementId = getMeasurementId();
  if (!measurementId?.startsWith("G-")) {
    return false;
  }

  try {
    // Setup dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function gtag() {
        // biome-ignore lint/complexity/noArguments: Google gtag convention requires arguments push
        window.dataLayer?.push(arguments);
      };
    }

    // Inject gtag script if not already in document
    const existingScript = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`,
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.onerror = () => {
        // Silently handle ad-blocker blocking the script
      };
      document.head.appendChild(script);
    }

    // Configure GA4
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false, // Explicitly controlled for SPA
      anonymize_ip: true,
    });

    initialized = true;
    return true;
  } catch (_e) {
    return false;
  }
}

/** Dispatches an SPA page_view event to GA4. */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === "undefined") return;
  if (!initialized) initGA();
  if (!window.gtag) return;

  try {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: title || (typeof document !== "undefined" ? document.title : ""),
      page_location: window.location.href,
    });
  } catch (_e) {
    // Non-blocking fail-safe
  }
}

/** Dispatches a custom or recommended GA4 event safely. */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === "undefined") return;
  if (!initialized) initGA();
  if (!window.gtag) return;

  try {
    const cleaned = sanitizeParams(params);
    window.gtag("event", eventName, cleaned);
  } catch (_e) {
    // Non-blocking fail-safe
  }
}

/** Sets persistent user properties in GA4 (e.g. is_pro: boolean). */
export function setUserProperties(properties: Record<string, any>): void {
  if (typeof window === "undefined") return;
  if (!initialized) initGA();
  if (!window.gtag) return;

  try {
    const cleaned = sanitizeParams(properties);
    window.gtag("set", "user_properties", cleaned);
  } catch (_e) {
    // Non-blocking fail-safe
  }
}

/* ==========================================================================
 * Typed Product & Funnel Event Helpers
 * ========================================================================== */

export type ToolName =
  | "screenshot_generator"
  | "promo_banners"
  | "app_icon"
  | "store_audit"
  | "ai_copywriter";

/** Tracks when a specific creation or auditing tool is opened. */
export function trackToolOpened(toolName: ToolName, details?: Record<string, any>): void {
  trackEvent("tool_opened", {
    tool_name: toolName,
    ...details,
  });
}

/** Tracks screenshot generation lifecycle. */
export function trackScreenshotGeneration(
  status: "started" | "generated" | "failed",
  details?: {
    device?: string;
    scene_id?: string;
    template?: string | string[];
    reason?: string;
    [key: string]: any;
  },
): void {
  const eventName =
    status === "started"
      ? "screenshot_generation_started"
      : status === "generated"
        ? "screenshot_generated"
        : "screenshot_generation_failed";

  trackEvent(eventName, details);
}

/** Tracks asset packaging and export lifecycle. */
export function trackExport(
  status: "started" | "completed" | "failed",
  details: {
    export_type: "store_zip" | "single_png" | "banner" | "favicon_zip" | string;
    template?: string;
    format?: string;
    device?: string;
    [key: string]: any;
  },
): void {
  const eventName =
    status === "started"
      ? "export_started"
      : status === "completed"
        ? "export_completed"
        : "export_failed";

  trackEvent(eventName, details);
}

/** Tracks when an asset file is triggered for client download. */
export function trackAssetDownloaded(details: {
  asset_type: "zip" | "png" | "banner" | "favicon_zip" | string;
  file_name?: string;
  [key: string]: any;
}): void {
  trackEvent("asset_downloaded", details);
}

/** Tracks authentication funnel events (strictly non-PII). */
export function trackAuthEvent(
  action: "signup_started" | "sign_up" | "login",
  method: "google" | "email",
): void {
  trackEvent(action, {
    method,
  });
}

/** Tracks monetization and upgrade conversion funnel. */
export function trackUpgradeEvent(
  action: "pricing_viewed" | "upgrade_clicked" | "begin_checkout" | "purchase",
  details?: {
    plan?: string;
    price?: number;
    currency?: string;
    transaction_id?: string;
    [key: string]: any;
  },
): void {
  if (action === "purchase") {
    trackEvent("purchase", {
      currency: details?.currency || "USD",
      value: details?.price || 9.0,
      transaction_id: details?.transaction_id || `txn_${Date.now()}`,
      items: [
        {
          item_id: details?.plan || "pro_monthly",
          item_name: "AppAssets Studio Pro",
          price: details?.price || 9.0,
          quantity: 1,
        },
      ],
    });
    return;
  }

  if (action === "begin_checkout") {
    trackEvent("begin_checkout", {
      currency: details?.currency || "USD",
      value: details?.price || 9.0,
      items: [
        {
          item_id: details?.plan || "pro_monthly",
          item_name: "AppAssets Studio Pro",
          price: details?.price || 9.0,
          quantity: 1,
        },
      ],
    });
    return;
  }

  trackEvent(action, {
    plan: details?.plan || "pro",
    price: details?.price || 9.0,
    currency: details?.currency || "USD",
    ...details,
  });
}

/** Tracks screenshot and assets imported into the studio. */
export function trackAppImported(details: {
  source: "drag_drop" | "file_input" | "url" | "file_upload" | string;
  import_type: "initial_setup" | "replace_capture" | "batch_import" | string;
  count?: number;
  device?: string;
  [key: string]: any;
}): void {
  trackEvent("app_imported", details);
}

/** Tracks AI Copywriting generation completion. */
export function trackAiCopyGenerated(details: {
  scene_id: string;
  char_count?: number;
  tone?: string;
  [key: string]: any;
}): void {
  trackEvent("ai_copy_generated", details);
}
