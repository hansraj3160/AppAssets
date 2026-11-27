import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clampStepIndex,
  computeSpotlightRect,
  computeTourPopoverPosition,
  getNextStepIndex,
  getPrevStepIndex,
  type PopoverPosition,
  type RectBox,
  STUDIO_TOUR_STEPS,
  type TourStep,
} from "@/lib/onboardingTour";

const FRAME_SWATCHES: Array<{ key: string; label: string; tint: string }> = [
  { key: "17-pro-silver", label: "Silver", tint: "#D8D9DD" },
  { key: "17-pro-blue", label: "Deep Blue", tint: "#2B3A5C" },
  { key: "17-pro-orange", label: "Cosmic Orange", tint: "#E0662F" },
];

function findVisibleElement(selector: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return null;
}

function resolveStepTarget(step: TourStep): HTMLElement | null {
  const primary = findVisibleElement(step.targetSelector);
  if (primary) return primary;
  if (step.fallbackSelector) {
    return findVisibleElement(step.fallbackSelector);
  }
  return null;
}

export function StudioOnboardingTour({
  isOpen,
  onComplete,
  onSkip,
  screenOnly,
  onScreenOnly,
  frame,
  onFrame,
  frameVariants,
  viewMode,
  onViewModeChange,
  onRequestMobileSidebar,
}: {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  screenOnly: boolean;
  onScreenOnly: (v: boolean) => void;
  frame: string;
  onFrame: (v: string) => void;
  frameVariants: string[];
  viewMode: "editor" | "store" | "promo";
  onViewModeChange: (mode: "editor" | "store" | "promo") => void;
  onRequestMobileSidebar?: (open: boolean) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<RectBox | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition>({
    top: 120,
    left: 24,
    placement: "center",
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  const safeIndex = clampStepIndex(stepIndex, STUDIO_TOUR_STEPS.length);
  const step = STUDIO_TOUR_STEPS[safeIndex]!;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === STUDIO_TOUR_STEPS.length - 1;

  // Reset to step 0 each time the tour opens
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  const measureAndPosition = useCallback(() => {
    if (!isOpen) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const targetEl = resolveStepTarget(step);
    const rawRect = targetEl ? targetEl.getBoundingClientRect() : null;
    const nextSpotlight =
      rawRect && rawRect.width > 0 && rawRect.height > 0
        ? computeSpotlightRect(
            {
              top: rawRect.top,
              left: rawRect.left,
              width: rawRect.width,
              height: rawRect.height,
            },
            viewport,
            step.spotlightPadding ?? 8,
          )
        : null;

    setSpotlightRect(nextSpotlight);

    const popoverEl = popoverRef.current;
    const width = Math.min(popoverEl?.offsetWidth || 356, viewport.width - 24);
    const height = popoverEl?.offsetHeight || 260;

    setPopoverPos(
      computeTourPopoverPosition({
        targetRect: nextSpotlight,
        popoverSize: { width, height },
        viewport,
        preferredPlacement: step.preferredPlacement,
        padding: viewport.width < 640 ? 12 : 16,
        gap: 16,
      }),
    );
  }, [isOpen, step]);

  // Coordinate sidebar drawer (mobile), collapsible sections, and smooth scroll into view
  useEffect(() => {
    if (!isOpen) return;

    const isMobile = window.innerWidth < 768;
    if (isMobile && onRequestMobileSidebar) {
      onRequestMobileSidebar(Boolean(step.requiresSidebar));
    }

    if (step.expandSectionId) {
      window.dispatchEvent(
        new CustomEvent("appassets:open-sidebar-section", {
          detail: { id: step.expandSectionId },
        }),
      );
    }

    // Wait briefly for section expansion or drawer animation, then scroll target cleanly into view and measure
    const t1 = window.setTimeout(() => {
      const target = resolveStepTarget(step);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      measureAndPosition();
    }, 70);

    const t2 = window.setTimeout(() => {
      measureAndPosition();
    }, 320);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isOpen, step, onRequestMobileSidebar, measureAndPosition]);

  // Re-measure on resize, scroll, or DOM layout updates
  useLayoutEffect(() => {
    if (!isOpen) return;
    measureAndPosition();

    const handleUpdate = () => measureAndPosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && popoverRef.current
        ? new ResizeObserver(handleUpdate)
        : null;
    if (resizeObserver && popoverRef.current) {
      resizeObserver.observe(popoverRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      resizeObserver?.disconnect();
    };
  }, [isOpen, measureAndPosition]);

  const handleCloseMobileDrawer = useCallback(() => {
    if (window.innerWidth < 768 && onRequestMobileSidebar) {
      onRequestMobileSidebar(false);
    }
  }, [onRequestMobileSidebar]);

  const handleNext = useCallback(() => {
    const next = getNextStepIndex(safeIndex, STUDIO_TOUR_STEPS.length);
    if (next === null) {
      handleCloseMobileDrawer();
      onComplete();
    } else {
      setStepIndex(next);
    }
  }, [safeIndex, handleCloseMobileDrawer, onComplete]);

  const handlePrev = useCallback(() => {
    setStepIndex(getPrevStepIndex(safeIndex));
  }, [safeIndex]);

  const handleSkip = useCallback(() => {
    handleCloseMobileDrawer();
    onSkip();
  }, [handleCloseMobileDrawer, onSkip]);

  // Keyboard navigation: Right/Left arrows + Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isEditing && e.key !== "Escape") return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isFirst, handleNext, handlePrev, handleSkip]);

  if (!isOpen) return null;

  const availableSwatches = FRAME_SWATCHES.filter((s) => frameVariants.includes(s.key));
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-none"
      data-testid="studio-onboarding-tour"
      data-tour-step={step.id}
    >
      {/* Visual spotlight scrim with true rounded-corner SVG mask + transparent 4-panel click shields */}
      {spotlightRect ? (
        <>
          <svg
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 size-full text-zinc-950/55 dark:text-black/72 transition-opacity duration-200"
          >
            <defs>
              <mask id="studio-tour-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightRect.left}
                  y={spotlightRect.top}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="currentColor"
              mask="url(#studio-tour-spotlight-mask)"
            />
          </svg>

          {/* Transparent click-blocker panels around the live hole so the highlighted Studio control remains interactive */}
          <div
            aria-hidden="true"
            onClick={handleSkip}
            className="pointer-events-auto fixed left-0 top-0 right-0"
            style={{ height: `${Math.max(0, spotlightRect.top)}px` }}
          />
          <div
            aria-hidden="true"
            onClick={handleSkip}
            className="pointer-events-auto fixed left-0 right-0 bottom-0"
            style={{
              top: `${Math.min(vh, spotlightRect.top + spotlightRect.height)}px`,
            }}
          />
          <div
            aria-hidden="true"
            onClick={handleSkip}
            className="pointer-events-auto fixed left-0"
            style={{
              top: `${spotlightRect.top}px`,
              width: `${Math.max(0, spotlightRect.left)}px`,
              height: `${spotlightRect.height}px`,
            }}
          />
          <div
            aria-hidden="true"
            onClick={handleSkip}
            className="pointer-events-auto fixed right-0"
            style={{
              top: `${spotlightRect.top}px`,
              left: `${Math.min(vw, spotlightRect.left + spotlightRect.width)}px`,
              height: `${spotlightRect.height}px`,
            }}
          />

          {/* Crisp spotlight frame around the live target */}
          <div
            aria-hidden="true"
            data-testid="tour-spotlight-frame"
            className="pointer-events-none fixed rounded-xl border-2 border-[#FF6B00] shadow-[0_0_0_4px_rgba(255,107,0,0.16)] transition-all duration-200 ease-out"
            style={{
              top: `${spotlightRect.top}px`,
              left: `${spotlightRect.left}px`,
              width: `${spotlightRect.width}px`,
              height: `${spotlightRect.height}px`,
            }}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          onClick={handleSkip}
          className="pointer-events-auto fixed inset-0 bg-zinc-950/55 dark:bg-black/72"
        />
      )}

      {/* Floating Tour Popover Card */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="studio-tour-title"
        aria-describedby="studio-tour-description"
        className="pointer-events-auto fixed w-[min(360px,calc(100vw-24px))] rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl transition-transform duration-200 ease-out"
        style={{
          transform: `translate3d(${popoverPos.left}px, ${popoverPos.top}px, 0)`,
          top: 0,
          left: 0,
        }}
      >
        {/* Top segmented progress bar */}
        <nav className="flex gap-1 px-5 pt-4" aria-label="Tour progress">
          {STUDIO_TOUR_STEPS.map((item, idx) => {
            const isCurrent = idx === safeIndex;
            const isCompleted = idx < safeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStepIndex(idx)}
                aria-label={`Go to step ${idx + 1}: ${item.title}`}
                aria-current={isCurrent ? "step" : undefined}
                className="group flex-1 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-xs"
              >
                <span
                  className={`block h-1 w-full rounded-full transition-colors duration-200 ${
                    isCurrent
                      ? "bg-[#FF6B00]"
                      : isCompleted
                        ? "bg-[#FF6B00]/45 group-hover:bg-[#FF6B00]/75"
                        : "bg-border group-hover:bg-muted-foreground/40"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Main Content */}
        <div className="px-5 pt-2.5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium tabular-nums">
              <span>
                Step {safeIndex + 1} of {STUDIO_TOUR_STEPS.length}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#FF6B00] dark:text-[#FF8A00]">{step.kicker}</span>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Close Studio tour"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
            >
              <X className="size-4" />
            </button>
          </div>

          <h2
            id="studio-tour-title"
            className="mt-2 text-base font-semibold tracking-tight text-foreground text-balance"
          >
            {step.title}
          </h2>

          <p
            id="studio-tour-description"
            className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground"
          >
            {step.description}
          </p>

          {/* Interactive live controls for Custom Device Framing */}
          {step.id === "custom-device-framing" ? (
            <div className="mt-3.5 border-t border-border/70 pt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Try framing live</span>
                <div className="inline-flex items-center rounded-lg bg-muted p-0.5 border border-border/60">
                  <button
                    type="button"
                    onClick={() => onScreenOnly(false)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      !screenOnly
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Bezel
                  </button>
                  <button
                    type="button"
                    onClick={() => onScreenOnly(true)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      screenOnly
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Screen only
                  </button>
                </div>
              </div>

              {!screenOnly && availableSwatches.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-muted-foreground">
                    Bezel finish
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {availableSwatches.map((swatch) => {
                      const active = frame === swatch.key;
                      return (
                        <button
                          key={swatch.key}
                          type="button"
                          onClick={() => onFrame(swatch.key)}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? "border-[#FF6B00] bg-[#FF6B00]/10 text-foreground"
                              : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border"
                          }`}
                        >
                          <span
                            className="size-2.5 rounded-full border border-black/15 shrink-0"
                            style={{ backgroundColor: swatch.tint }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{swatch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Interactive live controls for Store Preview & Promo Banner modes */}
          {step.id === "store-preview-modes" ? (
            <div className="mt-3.5 border-t border-border/70 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Switch mode</span>
                <div className="inline-flex items-center rounded-lg bg-muted p-0.5 border border-border/60">
                  {(
                    [
                      { id: "editor", label: "Canvas" },
                      { id: "promo", label: "Promo" },
                      { id: "store", label: "Store" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onViewModeChange(mode.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        viewMode === mode.id
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Actionable hint line */}
          <p className="mt-3 border-t border-border/60 pt-2.5 text-xs text-muted-foreground/90 leading-snug">
            {step.interactiveHint}
          </p>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-5 py-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap px-1 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-3 text-xs font-medium cursor-pointer gap-1 whitespace-nowrap"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back</span>
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-8 px-3.5 text-xs font-semibold bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white cursor-pointer gap-1.5 whitespace-nowrap shadow-xs"
            >
              {isLast ? (
                <>
                  <Check className="size-3.5" />
                  <span>Finish Tour</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
