export const TOUR_STORAGE_KEY = "appassets_studio_tour_v1";

export type TourPlacement = "right" | "left" | "bottom" | "top" | "center";

export type TourStepId =
  | "drag-drop-screenshots"
  | "device-platforms"
  | "layouts-presets"
  | "custom-device-framing"
  | "store-preview-modes"
  | "audit-and-export";

export interface TourStep {
  id: TourStepId;
  /** Primary selector to spotlight. */
  targetSelector: string;
  /** Optional fallback selector if primary is not currently mounted/visible. */
  fallbackSelector?: string;
  /** Quiet unboxed category kicker shown beside the step number. */
  kicker: string;
  title: string;
  description: string;
  /** Actionable interactive hint shown inside the card. */
  interactiveHint: string;
  preferredPlacement: TourPlacement;
  /** Whether the step targets a control inside the left sidebar. */
  requiresSidebar?: boolean;
  /** SidebarSection id that must be expanded before measuring the target. */
  expandSectionId?: string;
  /** Extra inset padding around the spotlight cutout in px. */
  spotlightPadding?: number;
}

export interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SizeBox {
  width: number;
  height: number;
}

export interface PopoverPosition {
  top: number;
  left: number;
  placement: TourPlacement;
}

export const STUDIO_TOUR_STEPS: readonly TourStep[] = [
  {
    id: "drag-drop-screenshots",
    targetSelector: '[data-tour="canvas-dropzone"]',
    fallbackSelector: '[data-tour="canvas-stage"]',
    kicker: "Canvas",
    title: "Drag & Drop Screenshots",
    description:
      "Drop PNG, JPEG, or WebP captures anywhere on the canvas to auto-frame them across iPhone, iPad, and Android. Once loaded, drag tiles directly on the strip to reorder your store narrative.",
    interactiveHint:
      "Try dropping files onto the highlighted zone or click Choose Screenshots directly.",
    preferredPlacement: "right",
    spotlightPadding: 10,
  },
  {
    id: "device-platforms",
    targetSelector: '[data-tour="device-store"]',
    kicker: "Platforms & Locales",
    title: "Switch Devices & Sync Captures",
    description:
      "Toggle between iPhone, iPad, and Android presets at exact App Store and Google Play resolutions, sync captures across devices in one click, and localize captions with the Translation Matrix.",
    interactiveHint: "Click any platform tab inside the highlighted rail to switch target specs.",
    preferredPlacement: "right",
    requiresSidebar: true,
    expandSectionId: "device-store",
    spotlightPadding: 6,
  },
  {
    id: "layouts-presets",
    targetSelector: '[data-tour="layout-templates"]',
    kicker: "Composition",
    title: "High-Converting Layout Sequences",
    description:
      "Apply proven multi-slide App Store templates—Single Focus, Duo Overlap, Trio Storyline, or Panoramic—and pair them with curated one-click theme presets.",
    interactiveHint: "Select any template thumbnail to restyle your entire strip instantaneously.",
    preferredPlacement: "right",
    requiresSidebar: true,
    expandSectionId: "layout-templates",
    spotlightPadding: 6,
  },
  {
    id: "custom-device-framing",
    targetSelector: '[data-tour="device-frame"]',
    fallbackSelector: '[data-tour="bg-frame"]',
    kicker: "Hardware & Backdrop",
    title: "Custom Device Framing",
    description:
      "Frame captures inside authentic titanium bezels (Silver, Deep Blue, Cosmic Orange) or switch to borderless Screen Only mode, paired with gradients, aurora meshes, grids, or custom images.",
    interactiveHint: "Toggle Bezel vs. Screen only below or pick a titanium finish live.",
    preferredPlacement: "right",
    requiresSidebar: true,
    expandSectionId: "bg-frame",
    spotlightPadding: 8,
  },
  {
    id: "store-preview-modes",
    targetSelector: '[data-tour="view-switcher"]',
    kicker: "Live Context",
    title: "Preview Store Listings & Promo Banners",
    description:
      "Switch seamlessly between the Studio Canvas, the mandatory 1024×500 Google Play Promo Banner editor, and a realistic Live Store Preview to check visual pacing before submitting.",
    interactiveHint: "Use the quick switcher below or click any tab in the top bar.",
    preferredPlacement: "bottom",
    spotlightPadding: 6,
  },
  {
    id: "audit-and-export",
    targetSelector: '[data-tour="export-actions"]',
    kicker: "Ship Ready",
    title: "Pre-Flight Audit & One-Click ZIP",
    description:
      "Check your real-time Store Audit score against 11 Apple and Google Play review rules, then export a formatted ZIP package containing store folders, icons, and upload guidelines.",
    interactiveHint: "Click Store Audit anytime to inspect compliance checks before exporting.",
    preferredPlacement: "bottom",
    spotlightPadding: 6,
  },
] as const;

export function shouldAutoStartTour({
  storageValue,
  search,
}: {
  storageValue: string | null;
  search: string;
}): boolean {
  const params = new URLSearchParams(search);
  const tourParam = params.get("tour");
  if (tourParam === "1" || tourParam === "true") return true;
  if (tourParam === "0" || tourParam === "false") return false;
  // Respect ultra-mode / direct-entry bypass flag
  if (params.get("autostart") === "1") return false;
  return storageValue !== "completed" && storageValue !== "dismissed";
}

export function clampStepIndex(index: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.max(0, Math.min(index, totalSteps - 1));
}

export function getNextStepIndex(current: number, totalSteps: number): number | null {
  if (totalSteps <= 0) return null;
  if (current >= totalSteps - 1) return null;
  return Math.max(0, current + 1);
}

export function getPrevStepIndex(current: number): number {
  return Math.max(0, current - 1);
}

/**
 * Clamps a target rect + inset padding to the visible viewport bounds.
 */
export function computeSpotlightRect(
  targetRect: RectBox,
  viewport: SizeBox,
  inset = 8,
): RectBox {
  const top = Math.max(4, targetRect.top - inset);
  const left = Math.max(4, targetRect.left - inset);
  const right = Math.min(viewport.width - 4, targetRect.left + targetRect.width + inset);
  const bottom = Math.min(viewport.height - 4, targetRect.top + targetRect.height + inset);
  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function clampCoord(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}

/**
 * Computes a collision-free viewport position for the onboarding popover card.
 * Tries the preferred placement first, then falls back through remaining sides
 * before settling cleanly inside the viewport bounds.
 */
export function computeTourPopoverPosition({
  targetRect,
  popoverSize,
  viewport,
  preferredPlacement = "right",
  padding = 16,
  gap = 16,
}: {
  targetRect: RectBox | null;
  popoverSize: SizeBox;
  viewport: SizeBox;
  preferredPlacement?: TourPlacement;
  padding?: number;
  gap?: number;
}): PopoverPosition {
  const maxLeft = Math.max(padding, viewport.width - popoverSize.width - padding);
  const maxTop = Math.max(padding, viewport.height - popoverSize.height - padding);

  if (!targetRect || targetRect.width <= 0 || targetRect.height <= 0) {
    return {
      top: clampCoord(Math.round((viewport.height - popoverSize.height) / 2), padding, maxTop),
      left: clampCoord(Math.round((viewport.width - popoverSize.width) / 2), padding, maxLeft),
      placement: "center",
    };
  }

  // On narrow mobile viewports, dock cleanly below or above the target (or bottom of viewport)
  const isCompactViewport = viewport.width < 768;
  const order: TourPlacement[] = isCompactViewport
    ? ["bottom", "top", "center"]
    : [
        preferredPlacement,
        ...(
          ["right", "bottom", "left", "top"] as const
        ).filter((p) => p !== preferredPlacement),
      ];

  const spaceRight = viewport.width - (targetRect.left + targetRect.width) - padding;
  const spaceLeft = targetRect.left - padding;
  const spaceBottom = viewport.height - (targetRect.top + targetRect.height) - padding;
  const spaceTop = targetRect.top - padding;

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  for (const candidate of order) {
    if (candidate === "right" && spaceRight >= popoverSize.width + gap) {
      return {
        placement: "right",
        left: clampCoord(Math.round(targetRect.left + targetRect.width + gap), padding, maxLeft),
        top: clampCoord(Math.round(targetCenterY - popoverSize.height / 2), padding, maxTop),
      };
    }
    if (candidate === "left" && spaceLeft >= popoverSize.width + gap) {
      return {
        placement: "left",
        left: clampCoord(Math.round(targetRect.left - popoverSize.width - gap), padding, maxLeft),
        top: clampCoord(Math.round(targetCenterY - popoverSize.height / 2), padding, maxTop),
      };
    }
    if (candidate === "bottom" && spaceBottom >= popoverSize.height + gap) {
      return {
        placement: "bottom",
        left: clampCoord(Math.round(targetCenterX - popoverSize.width / 2), padding, maxLeft),
        top: clampCoord(Math.round(targetRect.top + targetRect.height + gap), padding, maxTop),
      };
    }
    if (candidate === "top" && spaceTop >= popoverSize.height + gap) {
      return {
        placement: "top",
        left: clampCoord(Math.round(targetCenterX - popoverSize.width / 2), padding, maxLeft),
        top: clampCoord(Math.round(targetRect.top - popoverSize.height - gap), padding, maxTop),
      };
    }
  }

  // Fallback when target fills most of the viewport: dock cleanly at bottom-right (desktop) or bottom-center (mobile)
  if (isCompactViewport) {
    return {
      placement: "center",
      left: clampCoord(Math.round((viewport.width - popoverSize.width) / 2), padding, maxLeft),
      top: maxTop,
    };
  }

  return {
    placement: "center",
    left: maxLeft,
    top: maxTop,
  };
}
