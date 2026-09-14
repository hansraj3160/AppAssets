import { beforeEach, describe, expect, it } from "bun:test";
import {
  getMeasurementId,
  initGA,
  setUserProperties,
  trackAiCopyGenerated,
  trackAppImported,
  trackAssetDownloaded,
  trackAuthEvent,
  trackEvent,
  trackExport,
  trackPageView,
  trackScreenshotGeneration,
  trackToolOpened,
  trackUpgradeEvent,
} from "../studio/src/lib/analytics";

describe("GA4 Analytics Engine", () => {
  beforeEach(() => {
    // Reset global window mocks
    const globalAny = globalThis as any;
    globalAny.window = {
      location: { href: "https://appassetstudio.com/studio" },
      dataLayer: [],
    };
    globalAny.document = {
      title: "AppAssets Studio",
      querySelector: () => null,
      head: {
        appendChild: () => {},
      },
      createElement: () => ({ async: false, src: "", onerror: () => {} }),
    };
  });

  it("handles missing measurement ID gracefully without throwing", () => {
    expect(() => {
      initGA();
      trackPageView("/test");
      trackEvent("custom_event", { key: "val" });
      setUserProperties({ is_pro: true });
    }).not.toThrow();
  });

  it("sanitizes PII keys strictly", () => {
    const pushed: any[] = [];
    const globalAny = globalThis as any;
    globalAny.window.gtag = (...args: any[]) => pushed.push(args);

    trackEvent("user_action", {
      email: "user@example.com",
      password: "secretpassword",
      token: "secrettoken",
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      safe_meta: "allowed_value",
      device: "iphone-16",
    });

    expect(pushed.length).toBe(1);
    expect(pushed[0][0]).toBe("event");
    expect(pushed[0][1]).toBe("user_action");

    const payload = pushed[0][2];
    expect(payload.email).toBeUndefined();
    expect(payload.password).toBeUndefined();
    expect(payload.token).toBeUndefined();
    expect(payload.dataUrl).toBeUndefined();
    expect(payload.safe_meta).toBe("allowed_value");
    expect(payload.device).toBe("iphone-16");
  });

  it("dispatches correct tool_opened events", () => {
    const events: any[] = [];
    (globalThis as any).window.gtag = (...args: any[]) => events.push(args);

    trackToolOpened("screenshot_generator");
    trackToolOpened("promo_banners");
    trackToolOpened("app_icon");
    trackToolOpened("store_audit", { score: 95 });
    trackToolOpened("ai_copywriter", { scene_id: "scene1" });

    expect(events.length).toBe(5);
    expect(events[0][1]).toBe("tool_opened");
    expect(events[0][2].tool_name).toBe("screenshot_generator");
    expect(events[3][2].tool_name).toBe("store_audit");
    expect(events[3][2].score).toBe(95);
  });

  it("dispatches correct auth and conversion funnel events without PII", () => {
    const events: any[] = [];
    (globalThis as any).window.gtag = (...args: any[]) => events.push(args);

    trackAuthEvent("signup_started", "email");
    trackAuthEvent("sign_up", "google");
    trackAuthEvent("login", "email");

    expect(events.length).toBe(3);
    expect(events[0][1]).toBe("signup_started");
    expect(events[0][2].method).toBe("email");
    expect(events[1][1]).toBe("sign_up");
    expect(events[1][2].method).toBe("google");
    expect(events[2][1]).toBe("login");
  });

  it("tracks monetization and purchase conversion accurately", () => {
    const events: any[] = [];
    (globalThis as any).window.gtag = (...args: any[]) => events.push(args);

    trackUpgradeEvent("pricing_viewed", { plan: "pro", price: 9 });
    trackUpgradeEvent("upgrade_clicked", { plan: "pro" });
    trackUpgradeEvent("begin_checkout", { plan: "pro", price: 9 });
    trackUpgradeEvent("purchase", {
      plan: "pro",
      price: 9,
      transaction_id: "txn_12345",
    });

    expect(events.length).toBe(4);
    expect(events[0][1]).toBe("pricing_viewed");
    expect(events[1][1]).toBe("upgrade_clicked");
    expect(events[2][1]).toBe("begin_checkout");
    expect(events[3][1]).toBe("purchase");
    expect(events[3][2].value).toBe(9);
    expect(events[3][2].transaction_id).toBe("txn_12345");
    expect(events[3][2].items[0].item_id).toBe("pro");
  });

  it("tracks export and download lifecycle", () => {
    const events: any[] = [];
    (globalThis as any).window.gtag = (...args: any[]) => events.push(args);

    trackExport("started", { export_type: "store_zip" });
    trackExport("completed", { export_type: "store_zip" });
    trackAssetDownloaded({ asset_type: "zip", file_name: "AppAssets-export.zip" });

    expect(events.length).toBe(3);
    expect(events[0][1]).toBe("export_started");
    expect(events[1][1]).toBe("export_completed");
    expect(events[2][1]).toBe("asset_downloaded");
    expect(events[2][2].file_name).toBe("AppAssets-export.zip");
  });

  it("tracks screenshot generation, imports, and AI copywriting", () => {
    const events: any[] = [];
    (globalThis as any).window.gtag = (...args: any[]) => events.push(args);

    trackScreenshotGeneration("started", { device: "iphone-16", scene_id: "home" });
    trackScreenshotGeneration("generated", { device: "iphone-16", scene_id: "home" });
    trackScreenshotGeneration("failed", { device: "iphone-16", reason: "error" });
    trackAppImported({ source: "file_upload", import_type: "replace_capture" });
    trackAiCopyGenerated({ scene_id: "home", tone: "bold" });

    expect(events.length).toBe(5);
    expect(events[0][1]).toBe("screenshot_generation_started");
    expect(events[1][1]).toBe("screenshot_generated");
    expect(events[2][1]).toBe("screenshot_generation_failed");
    expect(events[3][1]).toBe("app_imported");
    expect(events[4][1]).toBe("ai_copy_generated");
    expect(events[4][2].scene_id).toBe("home");

    expect(getMeasurementId()).toBeDefined();
  });
});
