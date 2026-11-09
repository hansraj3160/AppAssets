/**
 * Structured background configuration models, parsing, and serialization
 * for AppAssets Studio screenshot backgrounds.
 */

export type GlowPoint = {
  /** Relative horizontal center position (0..1 across canvas or panorama) */
  x: number;
  /** Relative vertical center position (0..1 across canvas) */
  y: number;
  /** Color string (hex or rgba) */
  color: string;
  /** Radius as fraction of tile width (e.g. 0.6) */
  radius: number;
  /** Opacity 0..1 (default: 0.4) */
  opacity?: number;
};

export type PatternType = "none" | "dot-grid" | "isometric-dot" | "blueprint";

export type PatternConfig = {
  type: PatternType;
  /** Opacity 0..1 (default: 0.04 to 0.08) */
  opacity: number;
  /** Spacing in pixels or fraction of tile width (default: 0.035) */
  spacing?: number;
  /** Pattern color (defaults to white/black based on background luminance) */
  color?: string;
};

export type BacklightConfig = {
  enabled: boolean;
  /** Halo glow color behind phone bezel */
  color?: string;
  /** Intensity multiplier 0..1 (default: 0.45) */
  intensity?: number;
  /** Blur ratio as fraction of tile width (default: 0.08) */
  blurRatio?: number;
};

export type SolidBackground = {
  type: "solid";
  color: string;
};

export type LinearGradientBackground = {
  type: "linear-gradient";
  angle: number;
  stops: Array<{ color: string; at?: number }>;
};

export type AuroraBackground = {
  type: "aurora";
  baseColor: string;
  glowPoints: GlowPoint[];
};

export type TechGridBackground = {
  type: "tech-grid";
  baseColor: string;
  pattern: PatternConfig;
  linearGradient?: LinearGradientBackground;
  glowPoints?: GlowPoint[];
};

export type CustomImageBackground = {
  type: "custom-image";
  src: string;
  fit: "cover" | "contain";
  overlayColor?: string;
};

export type StructuredBackground =
  | SolidBackground
  | LinearGradientBackground
  | AuroraBackground
  | TechGridBackground
  | CustomImageBackground;

export type PanoramaSliceInfo = {
  sliceIndex: number;
  totalSlices: number;
  /** Horizontal offset in pixels of this slice from start of panorama */
  globalX: number;
  /** Total width of all panorama slices combined */
  totalWidth: number;
  sliceWidth: number;
  sliceHeight: number;
};

/**
 * Normalizes a hex color or rgba string with an opacity override.
 */
export function withOpacity(color: string, opacity: number): string {
  const c = color.trim();
  const clamped = Math.max(0, Math.min(1, opacity));
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    let r = 0;
    let g = 0;
    let b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0]! + hex[0]!, 16);
      g = parseInt(hex[1]! + hex[1]!, 16);
      b = parseInt(hex[2]! + hex[2]!, 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }
  const rgba = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgba) {
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${clamped})`;
  }
  return c;
}

/**
 * Serializes a StructuredBackground into a standard, valid CSS background string
 * for native browser rendering in previews (e.g. Strip.tsx).
 */
export function backgroundToCss(bg: StructuredBackground): string {
  switch (bg.type) {
    case "solid":
      return bg.color;
    case "linear-gradient": {
      const stopsStr = bg.stops
        .map((s) => `${s.color}${s.at !== undefined ? ` ${Math.round(s.at * 100)}%` : ""}`)
        .join(", ");
      return `linear-gradient(${bg.angle}deg, ${stopsStr})`;
    }
    case "aurora": {
      const layers = bg.glowPoints.map((pt) => {
        const xPct = Math.round(pt.x * 100);
        const yPct = Math.round(pt.y * 100);
        const rPct = Math.round((pt.radius || 0.6) * 100);
        const glowColor = withOpacity(pt.color, pt.opacity ?? 0.4);
        return `radial-gradient(circle at ${xPct}% ${yPct}%, ${glowColor} 0%, transparent ${rPct}%)`;
      });
      return [...layers, bg.baseColor].join(", ");
    }
    case "tech-grid": {
      const layers: string[] = [];
      if (bg.glowPoints && bg.glowPoints.length > 0) {
        for (const pt of bg.glowPoints) {
          const xPct = Math.round(pt.x * 100);
          const yPct = Math.round(pt.y * 100);
          const rPct = Math.round((pt.radius || 0.6) * 100);
          const glowColor = withOpacity(pt.color, pt.opacity ?? 0.35);
          layers.push(
            `radial-gradient(circle at ${xPct}% ${yPct}%, ${glowColor} 0%, transparent ${rPct}%)`,
          );
        }
      }
      if (bg.linearGradient) {
        const stopsStr = bg.linearGradient.stops
          .map((s) => `${s.color}${s.at !== undefined ? ` ${Math.round(s.at * 100)}%` : ""}`)
          .join(", ");
        layers.push(`linear-gradient(${bg.linearGradient.angle}deg, ${stopsStr})`);
      }
      layers.push(bg.baseColor);
      return layers.join(", ");
    }
    case "custom-image":
      return `url("${bg.src}") center/${bg.fit} no-repeat, ${bg.overlayColor || "#000000"}`;
    default:
      return "#000000";
  }
}

/**
 * Splits top-level commas in CSS expressions without breaking parentheses.
 */
function splitCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/**
 * Parses a background string or existing object into a StructuredBackground.
 * Fully supports legacy solid hex colors and linear gradients.
 */
export function parseBackground(input: string | StructuredBackground): StructuredBackground {
  if (typeof input !== "string") {
    return input;
  }

  const str = input.trim();
  if (str === "transparent" || str === "") {
    return { type: "solid", color: "transparent" };
  }

  // Try JSON parsing if encoded as structured JSON
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === "object" && parsed.type) {
        return parsed as StructuredBackground;
      }
    } catch {
      // Fall through to CSS parser
    }
  }

  // Multi-layer CSS gradient containing radial-gradient (Aurora / Glow)
  if (str.includes("radial-gradient")) {
    const layers = splitCommas(str);
    const glowPoints: GlowPoint[] = [];
    let baseColor = "#090A0F";

    for (const layer of layers) {
      const m = layer.match(
        /^radial-gradient\(\s*circle\s+at\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*,\s*(.*?)\s+0%,\s*transparent\s+(\d+(?:\.\d+)?)%\s*\)$/i,
      );
      if (m) {
        const x = Number(m[1]) / 100;
        const y = Number(m[2]) / 100;
        const color = m[3]!;
        const radius = Number(m[4]) / 100;
        glowPoints.push({ x, y, color, radius, opacity: 0.4 });
      } else if (layer.startsWith("#") || layer.startsWith("rgb") || layer.match(/^[a-z]+$/i)) {
        baseColor = layer;
      }
    }

    if (glowPoints.length > 0) {
      return {
        type: "aurora",
        baseColor,
        glowPoints,
      };
    }
  }

  // Linear gradient parsing
  const linMatch = str.match(/^linear-gradient\((.*)\)$/s);
  if (linMatch) {
    const parts = splitCommas(linMatch[1]!);
    let angle = 180;
    const first = parts[0]?.trim() || "";
    const degMatch = first.match(/^(-?\d+(?:\.\d+)?)deg$/i);
    if (degMatch) {
      angle = Number(degMatch[1]);
      parts.shift();
    } else if (first.startsWith("to ")) {
      const sides: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 };
      const words = first.slice(3).split(/\s+/);
      const angles = words.map((w) => sides[w]).filter((a): a is number => a !== undefined);
      if (angles.length === 2 && angles.includes(0) && angles.includes(270)) angle = 315;
      else if (angles.length === 2) angle = (angles[0]! + angles[1]!) / 2;
      else if (angles.length === 1) angle = angles[0]!;
      parts.shift();
    }

    const stops = parts.map((p) => {
      const s = p.trim().match(/^(.*?)(?:\s+(-?\d+(?:\.\d+)?)%)?$/);
      return {
        color: s ? s[1]!.trim() : p.trim(),
        at: s && s[2] !== undefined ? Number(s[2]) / 100 : undefined,
      };
    });

    return {
      type: "linear-gradient",
      angle,
      stops,
    };
  }

  // Custom Image URL
  if (str.startsWith("url(") || str.startsWith("data:image/")) {
    return {
      type: "custom-image",
      src: str.replace(/^url\(["']?/, "").replace(/["']?\).*$/, ""),
      fit: "cover",
    };
  }

  // Default: Solid Color (Hex, named color, rgb)
  return {
    type: "solid",
    color: str,
  };
}
