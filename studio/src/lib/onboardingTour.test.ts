import assert from "node:assert/strict";
import test from "node:test";
import {
  clampStepIndex,
  computeSpotlightRect,
  computeTourPopoverPosition,
  getNextStepIndex,
  getPrevStepIndex,
  STUDIO_TOUR_STEPS,
  shouldAutoStartTour,
} from "./onboardingTour";

test("STUDIO_TOUR_STEPS covers dragging screenshots, device framing, and export with unique ids", () => {
  assert.ok(STUDIO_TOUR_STEPS.length >= 5);
  const ids = new Set(STUDIO_TOUR_STEPS.map((s) => s.id));
  assert.equal(ids.size, STUDIO_TOUR_STEPS.length);
  assert.ok(ids.has("drag-drop-screenshots"));
  assert.ok(ids.has("custom-device-framing"));
  assert.ok(ids.has("audit-and-export"));

  const framingStep = STUDIO_TOUR_STEPS.find((s) => s.id === "custom-device-framing");
  assert.equal(framingStep?.expandSectionId, "bg-frame");
  assert.equal(framingStep?.requiresSidebar, true);
});

test("shouldAutoStartTour respects first visit, persistence, and query parameters", () => {
  assert.equal(shouldAutoStartTour({ storageValue: null, search: "" }), true);
  assert.equal(shouldAutoStartTour({ storageValue: "completed", search: "" }), false);
  assert.equal(shouldAutoStartTour({ storageValue: "dismissed", search: "" }), false);

  // Explicit query flags override persistence or first-visit defaults
  assert.equal(shouldAutoStartTour({ storageValue: "completed", search: "?tour=1" }), true);
  assert.equal(shouldAutoStartTour({ storageValue: null, search: "?tour=0" }), false);
  assert.equal(shouldAutoStartTour({ storageValue: null, search: "?autostart=1" }), false);
  assert.equal(shouldAutoStartTour({ storageValue: null, search: "?autostart=1&tour=1" }), true);
});

test("step navigation helpers advance, rewind, and clamp safely", () => {
  assert.equal(clampStepIndex(-2, 6), 0);
  assert.equal(clampStepIndex(99, 6), 5);
  assert.equal(clampStepIndex(3, 6), 3);

  assert.equal(getNextStepIndex(0, 6), 1);
  assert.equal(getNextStepIndex(5, 6), null);
  assert.equal(getPrevStepIndex(0), 0);
  assert.equal(getPrevStepIndex(4), 3);
});

test("computeSpotlightRect clamps cutout cleanly inside viewport bounds", () => {
  const cutout = computeSpotlightRect(
    { top: 2, left: 0, width: 310, height: 220 },
    { width: 1440, height: 900 },
    8,
  );
  assert.equal(cutout.top, 4);
  assert.equal(cutout.left, 4);
  assert.ok(cutout.width > 0);
  assert.ok(cutout.height > 0);
  assert.ok(cutout.left + cutout.width <= 1436);
});

test("computeTourPopoverPosition places to right of sidebar targets and flips near viewport edges", () => {
  const viewport = { width: 1440, height: 900 };
  const popoverSize = { width: 356, height: 240 };

  // Sidebar target on left -> fits cleanly to the right
  const rightPos = computeTourPopoverPosition({
    targetRect: { top: 200, left: 16, width: 280, height: 180 },
    popoverSize,
    viewport,
    preferredPlacement: "right",
  });
  assert.equal(rightPos.placement, "right");
  assert.ok(rightPos.left >= 312);
  assert.ok(rightPos.left + popoverSize.width <= viewport.width - 16);

  // Header right target -> prefers bottom, stays inside right viewport edge
  const headerRightPos = computeTourPopoverPosition({
    targetRect: { top: 12, left: 1120, width: 290, height: 40 },
    popoverSize,
    viewport,
    preferredPlacement: "bottom",
  });
  assert.equal(headerRightPos.placement, "bottom");
  assert.ok(headerRightPos.top >= 68);
  assert.ok(headerRightPos.left + popoverSize.width <= viewport.width - 16);

  // Mobile viewport -> stays within horizontal bounds
  const mobileViewport = { width: 390, height: 844 };
  const mobilePopover = { width: 358, height: 230 };
  const mobilePos = computeTourPopoverPosition({
    targetRect: { top: 80, left: 16, width: 358, height: 280 },
    popoverSize: mobilePopover,
    viewport: mobileViewport,
    preferredPlacement: "right",
  });
  assert.ok(mobilePos.left >= 16);
  assert.ok(mobilePos.left + mobilePopover.width <= mobileViewport.width - 16);
  assert.ok(mobilePos.top >= 16);
  assert.ok(mobilePos.top + mobilePopover.height <= mobileViewport.height - 16);
});
