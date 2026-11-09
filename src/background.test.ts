import { describe, expect, test } from "bun:test";
import {
  type AuroraBackground,
  backgroundToCss,
  type LinearGradientBackground,
  parseBackground,
  type SolidBackground,
  withOpacity,
} from "./background.ts";

describe("src/background.ts structured background models", () => {
  describe("parseBackground legacy solid compatibility", () => {
    test("parses hex color into SolidBackground", () => {
      const bg = parseBackground("#1E3A8A");
      expect(bg.type).toBe("solid");
      expect((bg as SolidBackground).color).toBe("#1E3A8A");
    });

    test("parses transparent into solid transparent", () => {
      const bg = parseBackground("transparent");
      expect(bg.type).toBe("solid");
      expect((bg as SolidBackground).color).toBe("transparent");
    });
  });

  describe("parseBackground legacy linear gradient compatibility", () => {
    test("parses degree-based linear gradient", () => {
      const bg = parseBackground("linear-gradient(160deg, #E8F1FF 0%, #FFFFFF 100%)");
      expect(bg.type).toBe("linear-gradient");
      const lin = bg as LinearGradientBackground;
      expect(lin.angle).toBe(160);
      expect(lin.stops.length).toBe(2);
      expect(lin.stops[0]!.color).toBe("#E8F1FF");
      expect(lin.stops[0]!.at).toBe(0);
      expect(lin.stops[1]!.color).toBe("#FFFFFF");
      expect(lin.stops[1]!.at).toBe(1);
    });

    test("parses direction-based linear gradient (to right)", () => {
      const bg = parseBackground("linear-gradient(to right, #000000 0%, #FFFFFF 100%)");
      expect(bg.type).toBe("linear-gradient");
      const lin = bg as LinearGradientBackground;
      expect(lin.angle).toBe(90);
    });
  });

  describe("parseBackground structured aurora and radial gradients", () => {
    test("parses CSS radial-gradient layered string into AuroraBackground", () => {
      const css =
        "radial-gradient(circle at 30% 40%, rgba(34, 211, 238, 0.4) 0%, transparent 60%), #090A0F";
      const bg = parseBackground(css);
      expect(bg.type).toBe("aurora");
      const aurora = bg as AuroraBackground;
      expect(aurora.baseColor).toBe("#090A0F");
      expect(aurora.glowPoints.length).toBe(1);
      expect(aurora.glowPoints[0]!.x).toBeCloseTo(0.3);
      expect(aurora.glowPoints[0]!.y).toBeCloseTo(0.4);
      expect(aurora.glowPoints[0]!.radius).toBeCloseTo(0.6);
    });
  });

  describe("backgroundToCss serialization", () => {
    test("serializes solid background to exact color", () => {
      expect(backgroundToCss({ type: "solid", color: "#FFFFFF" })).toBe("#FFFFFF");
    });

    test("serializes linear gradient to standard CSS", () => {
      const css = backgroundToCss({
        type: "linear-gradient",
        angle: 180,
        stops: [
          { color: "#000", at: 0 },
          { color: "#fff", at: 1 },
        ],
      });
      expect(css).toBe("linear-gradient(180deg, #000 0%, #fff 100%)");
    });

    test("serializes aurora to layered radial gradients and base color", () => {
      const css = backgroundToCss({
        type: "aurora",
        baseColor: "#090A0F",
        glowPoints: [
          { x: 0.35, y: 0.4, color: "#22D3EE", radius: 0.55, opacity: 0.35 },
          { x: 0.8, y: 0.7, color: "#8B5CF6", radius: 0.5, opacity: 0.3 },
        ],
      });
      expect(css).toContain("radial-gradient(circle at 35% 40%, rgba(34, 211, 238, 0.35)");
      expect(css).toContain("radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3)");
      expect(css).toContain("#090A0F");
    });
  });

  describe("withOpacity helper", () => {
    test("converts 6-digit hex with opacity to rgba", () => {
      expect(withOpacity("#FFFFFF", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
      expect(withOpacity("#000000", 0.25)).toBe("rgba(0, 0, 0, 0.25)");
    });

    test("updates existing rgba opacity", () => {
      expect(withOpacity("rgba(10, 20, 30, 0.8)", 0.4)).toBe("rgba(10, 20, 30, 0.4)");
    });
  });
});
