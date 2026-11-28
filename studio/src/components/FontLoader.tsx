import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_ACTIVE_PREVIEW_MODES,
  DEFAULT_CJK_FONT_KEY,
  type FontLoadStatus,
  injectCjkStylesheet,
  type PreviewMode,
  resolveCjkStylesheetUrl,
  shouldActivateCjkFontLoader,
} from "../lib/fontLoader";
import type { SceneCopy } from "../manifest";

export interface FontLoaderProps {
  /** Active BCP-47 locale (e.g. "en-US", "zh-CN", "ja-JP", "ko-KR"). */
  locale?: string;
  /** Current studio preview mode ("editor" | "store" | "promo"). */
  previewMode?: PreviewMode;
  /** Preview modes in which CJK lazy-loading is permitted. Defaults to all preview modes. */
  activePreviewModes?: readonly PreviewMode[];
  /** Bundled font key used for deduplicating the injected stylesheet link. */
  fontKey?: string;
  /** Currently selected CSS font-family stack. */
  fontFamily?: string;
  /** Manifest-provided stylesheet URL for chunked WOFF2 CJK subsets. */
  stylesheetUrl?: string;
  /** Optional external CDN base override (defaults to VITE_FONT_CDN_BASE when configured). */
  cdnBase?: string;
  /** Edited per-scene localized copy (inspected for inline CJK glyphs). */
  copy?: Record<string, SceneCopy>;
  /** Manifest scenes (inspected for CJK glyphs in the active locale). */
  scenes?: Array<{
    id: string;
    headline: Record<string, string>;
    subhead?: Record<string, string>;
  }>;
  /** IntersectionObserver rootMargin for preloading just before the preview enters view. */
  rootMargin?: string;
  /** IntersectionObserver visibility threshold. */
  threshold?: number | number[];
  /** Optional callback notified whenever the loader transitions states. */
  onStatusChange?: (status: FontLoadStatus) => void;
  /** Optional preview subtree wrapped by the observed container. */
  children?: ReactNode;
  className?: string;
}

/**
 * Lazy-loads CJK font subsets (Noto Sans SC) from an external CDN via IntersectionObserver
 * only when a CJK locale, CJK copy, or explicit CJK font is active inside a matching preview mode.
 * Zero network requests or observers are created for standard Latin previews.
 */
export const FontLoader = memo(function FontLoader({
  locale,
  previewMode = "editor",
  activePreviewModes = DEFAULT_ACTIVE_PREVIEW_MODES,
  fontKey = DEFAULT_CJK_FONT_KEY,
  fontFamily,
  stylesheetUrl,
  cdnBase,
  copy,
  scenes,
  rootMargin = "200px",
  threshold = 0,
  onStatusChange,
  children,
  className,
}: FontLoaderProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const [status, setStatus] = useState<FontLoadStatus>("idle");

  const shouldActivate = useMemo(
    () =>
      shouldActivateCjkFontLoader({
        locale,
        previewMode,
        activePreviewModes,
        fontFamily,
        copy,
        scenes,
      }),
    [locale, previewMode, activePreviewModes, fontFamily, copy, scenes],
  );

  const resolvedHref = useMemo(() => {
    const envBase =
      typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_FONT_CDN_BASE as string | undefined)
        : undefined;
    return resolveCjkStylesheetUrl({
      fontKey,
      stylesheetUrl,
      cdnBase: cdnBase ?? envBase,
    });
  }, [cdnBase, fontKey, stylesheetUrl]);

  useEffect(() => {
    onStatusChangeRef.current?.(status);
  }, [status]);

  useEffect(() => {
    if (!shouldActivate) {
      setStatus((prev) => (prev === "loaded" ? prev : "idle"));
      return;
    }

    if (typeof document === "undefined") return;

    const existing = document.querySelector<HTMLLinkElement>(
      `link[data-appassets-font="${fontKey}"]`,
    );
    if (existing?.dataset.loaded === "true") {
      setStatus("loaded");
      return;
    }

    let cancelled = false;
    const triggerLoad = () => {
      if (cancelled) return;
      const initial = injectCjkStylesheet(document, {
        fontKey,
        href: resolvedHref,
        onLoad: () => {
          if (!cancelled) setStatus("loaded");
        },
        onError: () => {
          if (!cancelled) setStatus("error");
        },
      });
      setStatus(initial);
    };

    const target = sentinelRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      triggerLoad();
      return () => {
        cancelled = true;
      };
    }

    setStatus("observing");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          triggerLoad();
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(target);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fontKey, resolvedHref, rootMargin, shouldActivate, threshold]);

  if (children !== undefined) {
    return (
      <div
        ref={sentinelRef}
        data-testid="cjk-font-loader"
        data-font-key={fontKey}
        data-font-status={status}
        className={className}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={sentinelRef}
      aria-hidden="true"
      data-testid="cjk-font-loader"
      data-font-key={fontKey}
      data-font-status={status}
      className={className ?? "pointer-events-none absolute top-0 left-0 h-px w-px opacity-0"}
    />
  );
});
