import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CJK_STYLESHEET_URL,
  resolveCjkStylesheetUrl,
  shouldActivateCjkFontLoader,
} from "../lib/fontLoader";
import { FontLoader } from "./FontLoader";

interface ObserverInstance {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (isIntersecting: boolean) => void;
}

describe("FontLoader", () => {
  let observers: ObserverInstance[];
  let originalIO: typeof IntersectionObserver;

  beforeEach(() => {
    observers = [];
    originalIO = globalThis.IntersectionObserver;

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string;
      readonly thresholds: ReadonlyArray<number>;
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
      readonly takeRecords = vi.fn(() => []);

      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.rootMargin = options?.rootMargin ?? "0px";
        this.thresholds = Array.isArray(options?.threshold)
          ? options.threshold
          : [options?.threshold ?? 0];

        const record: ObserverInstance = {
          callback,
          options,
          observe: this.observe,
          unobserve: this.unobserve,
          disconnect: this.disconnect,
          trigger: (isIntersecting: boolean) => {
            const target = this.observe.mock.calls[0]?.[0] as Element;
            callback(
              [{ isIntersecting, target } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
          },
        };
        observers.push(record);
      }
    }

    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    for (const el of document.head.querySelectorAll(
      "link[data-appassets-font], link[data-appassets-preconnect]",
    )) {
      el.remove();
    }
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
    window.IntersectionObserver = originalIO;
    vi.restoreAllMocks();
  });

  it("pure helpers gate activation by locale/previewMode and resolve external CDN URLs", () => {
    expect(
      shouldActivateCjkFontLoader({
        locale: "en-US",
        previewMode: "editor",
        fontFamily: '"DM Sans", sans-serif',
      }),
    ).toBe(false);

    expect(
      shouldActivateCjkFontLoader({
        locale: "zh-CN",
        previewMode: "editor",
        activePreviewModes: ["store"],
      }),
    ).toBe(false);

    expect(
      shouldActivateCjkFontLoader({
        locale: "zh-CN",
        previewMode: "store",
        activePreviewModes: ["store"],
      }),
    ).toBe(true);

    expect(resolveCjkStylesheetUrl({})).toBe(DEFAULT_CJK_STYLESHEET_URL);
    expect(
      resolveCjkStylesheetUrl({
        fontKey: "noto-sans-sc",
        cdnBase: "https://cdn.example.com/fonts/",
      }),
    ).toBe("https://cdn.example.com/fonts/noto-sans-sc.css");
    expect(
      resolveCjkStylesheetUrl({
        cdnBase: "https://cdn.example.com/custom-cjk.css",
      }),
    ).toBe("https://cdn.example.com/custom-cjk.css");
  });

  it("stays idle and never creates an IntersectionObserver or stylesheet for Latin locales", () => {
    render(<FontLoader locale="en-US" previewMode="editor" fontFamily='"DM Sans", sans-serif' />);

    expect(observers).toHaveLength(0);
    expect(document.head.querySelector('link[data-appassets-font="noto-sans-sc"]')).toBeNull();
    expect(screen.getByTestId("cjk-font-loader")).toHaveAttribute("data-font-status", "idle");
  });

  it("stays idle when locale is CJK but previewMode is outside activePreviewModes", () => {
    render(
      <FontLoader locale="zh-CN" previewMode="editor" activePreviewModes={["store", "promo"]} />,
    );

    expect(observers).toHaveLength(0);
    expect(document.head.querySelector('link[data-appassets-font="noto-sans-sc"]')).toBeNull();
    expect(screen.getByTestId("cjk-font-loader")).toHaveAttribute("data-font-status", "idle");
  });

  it("observes sentinel on CJK locale and injects CDN stylesheet only when intersecting", () => {
    const onStatusChange = vi.fn();
    render(
      <FontLoader
        locale="zh-CN"
        previewMode="store"
        rootMargin="150px"
        onStatusChange={onStatusChange}
      />,
    );

    expect(observers).toHaveLength(1);
    expect(observers[0]!.options?.rootMargin).toBe("150px");
    expect(observers[0]!.observe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("cjk-font-loader")).toHaveAttribute("data-font-status", "observing");
    expect(document.head.querySelector('link[data-appassets-font="noto-sans-sc"]')).toBeNull();

    // Non-intersecting callback must NOT load the stylesheet
    act(() => {
      observers[0]!.trigger(false);
    });
    expect(document.head.querySelector('link[data-appassets-font="noto-sans-sc"]')).toBeNull();

    // Entering viewport triggers CDN injection and disconnects the observer
    act(() => {
      observers[0]!.trigger(true);
    });
    expect(observers[0]!.disconnect).toHaveBeenCalledTimes(1);

    const link = document.head.querySelector<HTMLLinkElement>(
      'link[data-appassets-font="noto-sans-sc"]',
    );
    expect(link).not.toBeNull();
    expect(link?.rel).toBe("stylesheet");
    expect(link?.href).toBe(DEFAULT_CJK_STYLESHEET_URL);
    expect(
      document.head.querySelector('link[data-appassets-preconnect="https://fonts.googleapis.com"]'),
    ).not.toBeNull();
    expect(screen.getByTestId("cjk-font-loader")).toHaveAttribute("data-font-status", "loading");

    // Stylesheet load event transitions status to "loaded"
    act(() => {
      link!.dispatchEvent(new Event("load"));
    });
    expect(screen.getByTestId("cjk-font-loader")).toHaveAttribute("data-font-status", "loaded");
    expect(onStatusChange).toHaveBeenCalledWith("loaded");
  });

  it("honors custom external CDN base and deduplicates stylesheets across remounts", () => {
    const { unmount } = render(
      <FontLoader
        locale="en-US"
        previewMode="promo"
        copy={{ home: { headline: { "en-US": "智能预算助手" } } }}
        cdnBase="https://assets.example.com/cjk"
      >
        <div>Preview Stage</div>
      </FontLoader>,
    );

    expect(screen.getByText("Preview Stage")).toBeInTheDocument();
    expect(observers).toHaveLength(1);

    act(() => {
      observers[0]!.trigger(true);
    });

    const link = document.head.querySelector<HTMLLinkElement>(
      'link[data-appassets-font="noto-sans-sc"]',
    );
    expect(link?.href).toBe("https://assets.example.com/cjk/noto-sans-sc.css");

    act(() => {
      link!.dispatchEvent(new Event("load"));
    });
    unmount();

    // Remounting after loaded should immediately report "loaded" with zero duplicate links/observers
    render(
      <FontLoader
        locale="zh-CN"
        previewMode="store"
        cdnBase="https://assets.example.com/cjk"
      />,
    );
    expect(observers).toHaveLength(1);
    expect(
      document.head.querySelectorAll('link[data-appassets-font="noto-sans-sc"]'),
    ).toHaveLength(1);
    expect(screen.getByTestId("cjk-font-loader")).toHaveAttribute("data-font-status", "loaded");
  });

  it("falls back to loading immediately when IntersectionObserver is unavailable", () => {
    // @ts-expect-error simulating legacy browser without IntersectionObserver
    globalThis.IntersectionObserver = undefined;
    // @ts-expect-error simulating legacy browser without IntersectionObserver
    window.IntersectionObserver = undefined;

    render(<FontLoader locale="ja-JP" previewMode="editor" />);

    const link = document.head.querySelector<HTMLLinkElement>(
      'link[data-appassets-font="noto-sans-sc"]',
    );
    expect(link).not.toBeNull();
    expect(screen.getByTestId("cjk-font-loader")).toHaveAttribute("data-font-status", "loading");
  });
});
