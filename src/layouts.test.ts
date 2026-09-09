import { describe, expect, test } from "bun:test";
import { compose, LAYOUT_KEYS, LAYOUTS, needsSecondCapture, resolveScenes } from "./layouts.ts";

const tile = { width: 1320, height: 2868 };
const theme = { copyHeightRatio: 0.24, deviceWidthRatio: 0.84 };

describe("compose", () => {
  test("classic reproduces the original single-layout geometry", () => {
    // Frozen from frame.ts's layout() before it was replaced.
    const c = compose(LAYOUTS.classic, tile, theme);
    expect(c.width).toBe(1320);
    expect(c.devices).toHaveLength(1);
    const { frame, screen } = c.devices[0]!;
    expect(frame.left).toBeCloseTo(153.3123642172523, 6);
    expect(frame.top).toBeCloseTo(688.32, 6);
    expect(frame.width).toBeCloseTo(1013.3752715654954, 6);
    expect(frame.height).toBeCloseTo(2093.64, 6);
    expect(screen.left).toBeCloseTo(193.44603833865807, 6);
    expect(screen.top).toBeCloseTo(723.43696485623, 6);
    expect(screen.width).toBeCloseTo(931.4356869009587, 6);
    expect(screen.height).toBeCloseTo(2023.4060702875404, 6);
    expect(screen.radius).toBeCloseTo(137.12338658146967, 6);
    expect(c.copy).toMatchObject({ position: "top", align: "center", x: 660 });
    expect(c.copy!.y).toBeCloseTo(2868 * 0.055);
    expect(c.copy!.maxWidth).toBeCloseTo(1320 - 2 * 1320 * 0.09);
  });

  test("every layout composes to finite geometry and its span", () => {
    for (const key of LAYOUT_KEYS) {
      const spec = LAYOUTS[key];
      const c = compose(spec, tile, theme);
      expect(c.width).toBe(tile.width * spec.span);
      expect(c.height).toBe(tile.height);
      expect(c.devices).toHaveLength(spec.devices.length);
      for (const d of c.devices) {
        for (const v of Object.values({ ...d.frame, ...d.screen }))
          expect(Number.isFinite(v)).toBe(true);
        expect(d.screen.width).toBeLessThanOrEqual(d.frame.width);
      }
      if (spec.copy.position === "none") expect(c.copy).toBeNull();
      else expect(c.copy).not.toBeNull();
    }
  });

  test("screen-only makes the device box the screen itself", () => {
    const c = compose(LAYOUTS.hero, tile, theme, { screenOnly: true });
    const { frame, screen } = c.devices[0]!;
    expect(screen.left).toBe(frame.left);
    expect(screen.top).toBe(frame.top);
    expect(screen.width).toBe(frame.width);
    expect(screen.height).toBe(frame.height);
  });

  test("composes for iPad 13 (2064x2752) with IPAD_FRAME", async () => {
    const { IPAD_FRAME } = await import("./frame.ts");
    const ipadTile = { width: 2064, height: 2752 };
    const c = compose(LAYOUTS.classic, ipadTile, theme, { geom: IPAD_FRAME.geom });
    expect(c.width).toBe(2064);
    expect(c.height).toBe(2752);
    expect(c.devices).toHaveLength(1);
    const { frame, screen } = c.devices[0]!;
    expect(Number.isFinite(frame.left)).toBe(true);
    expect(Number.isFinite(frame.top)).toBe(true);
    expect(screen.width).toBeLessThanOrEqual(frame.width);
    expect(screen.height).toBeLessThanOrEqual(frame.height);
    expect(c.copy).not.toBeNull();
  });

  test("multi-screen layouts need a second capture, the rest do not", () => {
    const multi = LAYOUT_KEYS.filter((k) => needsSecondCapture(LAYOUTS[k]));
    expect(multi.sort()).toEqual(["duo", "duo-flat", "duo-tilt", "duo-v", "panorama-duo", "trio"]);
  });

  test("trio composes 3 devices with center device in foreground", () => {
    const c = compose(LAYOUTS.trio, tile, theme);
    expect(c.devices).toHaveLength(3);
    expect(c.devices[0]!.capture).toBe("secondary");
    expect(c.devices[1]!.capture).toBe("secondary");
    expect(c.devices[2]!.capture).toBe("primary");
    // Left device sits to the left of center, right device sits to the right
    expect(c.devices[0]!.frame.left).toBeLessThan(c.devices[2]!.frame.left);
    expect(c.devices[1]!.frame.left).toBeGreaterThan(c.devices[2]!.frame.left);
    // Center device is largest
    expect(c.devices[2]!.frame.width).toBeGreaterThan(c.devices[0]!.frame.width);
  });

  test("duo-flat composes two upright side-by-side devices", () => {
    const c = compose(LAYOUTS["duo-flat"], tile, theme);
    expect(c.devices).toHaveLength(2);
    expect(c.devices[0]!.rotate).toBe(0);
    expect(c.devices[1]!.rotate).toBe(0);
    expect(c.devices[0]!.frame.left).toBeLessThan(c.devices[1]!.frame.left);
    expect(c.devices[0]!.frame.width).toBeCloseTo(c.devices[1]!.frame.width);
  });

  test("offset-left and tilt-left position devices towards the left", () => {
    const offLeft = compose(LAYOUTS["offset-left"], tile, theme);
    const offRight = compose(LAYOUTS.offset, tile, theme);
    expect(offLeft.devices[0]!.frame.left).toBeLessThan(offRight.devices[0]!.frame.left);

    const tiltLeft = compose(LAYOUTS["tilt-left"], tile, theme);
    expect(tiltLeft.devices[0]!.rotate).toBe(-10);
  });

  test("bottom-sheet allocates generous copy space above device", () => {
    const c = compose(LAYOUTS["bottom-sheet"], tile, theme);
    expect(c.copy!.box.height).toBeCloseTo(tile.height * 0.32);
    expect(c.devices[0]!.frame.top).toBeGreaterThan(tile.height * 0.4);
  });

  test("bottom copy anchors at the bottom edge", () => {
    const c = compose(LAYOUTS["copy-below"], tile, theme);
    expect(c.copy!.position).toBe("bottom");
    expect(c.copy!.box.top + c.copy!.box.height).toBe(tile.height);
    expect(c.copy!.y).toBeCloseTo(tile.height * (1 - 0.05));
  });

  test("on a wide tile left-aligned copy stays at the card's left edge", () => {
    const wide = { width: 1080, height: 1920 };
    const narrow = compose(LAYOUTS.panorama, tile, theme);
    const c = compose(LAYOUTS.panorama, wide, theme);
    // The centring shift moves centred copy but never a left-aligned block.
    expect(c.copy!.box.left).toBeCloseTo(narrow.copy!.box.left * (c.designWidth / tile.width));
    const centred = compose(LAYOUTS.hero, wide, theme);
    expect(centred.copy!.box.left).toBeGreaterThan(0);
  });

  test("on a wide tile the device clears a bottom copy band", () => {
    const wide = { width: 1080, height: 1920 };
    const c = compose(LAYOUTS["copy-below"], wide, theme);
    const { frame } = c.devices[0]!;
    expect(frame.top + frame.height).toBeLessThanOrEqual(c.copy!.box.top - wide.height * 0.015);
  });
});

describe("resolveScenes", () => {
  const scenes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }];

  test("a template assigns layouts by position and repeats when shorter", () => {
    const r = resolveScenes(scenes, { template: "editorial" });
    expect(r.map((x) => x.layout.key)).toEqual([
      "panorama",
      "hero",
      "offset",
      "minimal",
      "tilt",
      "panorama",
    ]);
  });

  test("a custom sequence works the same way", () => {
    const r = resolveScenes(scenes.slice(0, 3), { template: ["tilt", "minimal"] });
    expect(r.map((x) => x.layout.key)).toEqual(["tilt", "minimal", "tilt"]);
  });

  test("scene layout beats the template, which beats the theme layout", () => {
    const r = resolveScenes([{ id: "a", layout: "hero" }, { id: "b" }, { id: "c" }], {
      template: ["tilt"],
      layout: "minimal",
      sceneLayouts: { c: "offset" },
    });
    expect(r.map((x) => x.layout.key)).toEqual(["hero", "tilt", "offset"]);
    const none = resolveScenes([{ id: "a" }], { layout: "minimal" });
    expect(none[0]!.layout.key).toBe("minimal");
  });

  test("two-screen layouts borrow the next scene's capture unless told otherwise", () => {
    const r = resolveScenes([{ id: "a" }, { id: "b", secondScene: "a" }, { id: "c" }], {
      template: ["duo"],
    });
    expect(r.map((x) => x.secondScene)).toEqual(["b", "a", "a"]);
    expect(resolveScenes([{ id: "only" }], { template: ["duo"] })[0]!.secondScene).toBeUndefined();
  });

  test("trio-flow and showcase-pro assign new layout sequences", () => {
    const r = resolveScenes(scenes.slice(0, 5), { template: "trio-flow" });
    expect(r.map((x) => x.layout.key)).toEqual([
      "trio",
      "offset-left",
      "duo-flat",
      "tilt-left",
      "hero",
    ]);

    const sp = resolveScenes(scenes.slice(0, 5), { template: "showcase-pro" });
    expect(sp.map((x) => x.layout.key)).toEqual([
      "hero",
      "trio",
      "offset",
      "duo-v",
      "bottom-sheet",
    ]);
  });
});
