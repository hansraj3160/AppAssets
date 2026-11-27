import type { LayoutEntry } from "../../manifest";

/** The background value that exports with an alpha channel instead of a fill. */
export const TRANSPARENT = "transparent";

/** A checkerboard standing in for a transparent background in the UI. */
export const CHECKERBOARD = "repeating-conic-gradient(#c8c8c8 0 25%, #f4f4f4 0 50%) 0 0/12px 12px";

export const GRADIENTS: Array<{ name: string; css: string }> = [
  { name: "Arctic", css: "linear-gradient(160deg, #E8F1FF 0%, #F7FAFF 55%, #FFFFFF 100%)" },
  { name: "Peach", css: "linear-gradient(160deg, #FFE8D6 0%, #FFF7F0 55%, #FFFFFF 100%)" },
  { name: "Mint", css: "linear-gradient(160deg, #D9F9EF 0%, #F2FDF9 55%, #FFFFFF 100%)" },
  { name: "Lavender", css: "linear-gradient(160deg, #E9E4FF 0%, #F7F5FF 55%, #FFFFFF 100%)" },
  { name: "Sand", css: "linear-gradient(160deg, #F7ECDD 0%, #FCF7F0 55%, #FFFFFF 100%)" },
  { name: "Blush", css: "linear-gradient(160deg, #FFE0E9 0%, #FFF5F8 55%, #FFFFFF 100%)" },
  { name: "Lemon", css: "linear-gradient(160deg, #FFF3C4 0%, #FFFBEB 55%, #FFFFFF 100%)" },
  { name: "Silver", css: "linear-gradient(160deg, #E2E8F0 0%, #F1F5F9 55%, #FFFFFF 100%)" },
  { name: "Ocean", css: "linear-gradient(160deg, #0EA5E9 0%, #2563EB 100%)" },
  { name: "Ember", css: "linear-gradient(160deg, #F97316 0%, #DC2626 100%)" },
  { name: "Forest", css: "linear-gradient(160deg, #059669 0%, #065F46 100%)" },
  { name: "Midnight", css: "linear-gradient(160deg, #1E293B 0%, #0F172A 100%)" },
  { name: "Grape", css: "linear-gradient(160deg, #8B5CF6 0%, #4C1D95 100%)" },
  { name: "Berry", css: "linear-gradient(160deg, #EC4899 0%, #831843 100%)" },
  { name: "Aurora", css: "linear-gradient(160deg, #0D9488 0%, #1E3A8A 100%)" },
  { name: "Graphite", css: "linear-gradient(160deg, #3F3F46 0%, #18181B 100%)" },
  { name: "Sky", css: "linear-gradient(160deg, #BAE6FD 0%, #E0F2FE 55%, #FFFFFF 100%)" },
  { name: "Rose", css: "linear-gradient(160deg, #FDA4AF 0%, #FFE4E6 60%, #FFFFFF 100%)" },
  { name: "Sunset", css: "linear-gradient(160deg, #F59E0B 0%, #EF4444 55%, #7C3AED 100%)" },
  { name: "Coral", css: "linear-gradient(160deg, #FB7185 0%, #F97316 100%)" },
  { name: "Teal", css: "linear-gradient(160deg, #2DD4BF 0%, #0F766E 100%)" },
  { name: "Cobalt", css: "linear-gradient(160deg, #3B82F6 0%, #1E1B4B 100%)" },
];

/** Shade labels matching the Tailwind scales below, lightest first. */
export const SHADE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

/** The Tailwind color scales behind the solid swatches' shade popunders. */
export const TAILWIND: Record<string, string[]> = {
  // biome-ignore format: one scale per line reads better
  slate: ["#F8FAFC", "#F1F5F9", "#E2E8F0", "#CBD5E1", "#94A3B8", "#64748B", "#475569", "#334155", "#1E293B", "#0F172A", "#020617"],
  // biome-ignore format: one scale per line reads better
  zinc: ["#FAFAFA", "#F4F4F5", "#E4E4E7", "#D4D4D8", "#A1A1AA", "#71717A", "#52525B", "#3F3F46", "#27272A", "#18181B", "#09090B"],
  // biome-ignore format: one scale per line reads better
  red: ["#FEF2F2", "#FEE2E2", "#FECACA", "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C", "#991B1B", "#7F1D1D", "#450A0A"],
  // biome-ignore format: one scale per line reads better
  orange: ["#FFF7ED", "#FFEDD5", "#FED7AA", "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#C2410C", "#9A3412", "#7C2D12", "#431407"],
  // biome-ignore format: one scale per line reads better
  amber: ["#FFFBEB", "#FEF3C7", "#FDE68A", "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F", "#451A03"],
  // biome-ignore format: one scale per line reads better
  lime: ["#F7FEE7", "#ECFCCB", "#D9F99D", "#BEF264", "#A3E635", "#84CC16", "#65A30D", "#4D7C0F", "#3F6212", "#365314", "#1A2E05"],
  // biome-ignore format: one scale per line reads better
  emerald: ["#ECFDF5", "#D1FAE5", "#A7F3D0", "#6EE7B7", "#34D399", "#10B981", "#059669", "#047857", "#065F46", "#064E3B", "#022C22"],
  // biome-ignore format: one scale per line reads better
  cyan: ["#ECFEFF", "#CFFAFE", "#A5F3FC", "#67E8F9", "#22D3EE", "#06B6D4", "#0891B2", "#0E7490", "#155E75", "#164E63", "#083344"],
  // biome-ignore format: one scale per line reads better
  blue: ["#EFF6FF", "#DBEAFE", "#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A", "#172554"],
  // biome-ignore format: one scale per line reads better
  violet: ["#F5F3FF", "#EDE9FE", "#DDD6FE", "#C4B5FD", "#A78BFA", "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95", "#2E1065"],
  // biome-ignore format: one scale per line reads better
  fuchsia: ["#FDF4FF", "#FAE8FF", "#F5D0FE", "#F0ABFC", "#E879F9", "#D946EF", "#C026D3", "#A21CAF", "#86198F", "#701A75", "#4A044E"],
};

export const SOLIDS: Array<{ name: string; css: string; family?: string }> = [
  { name: "White", css: "#FFFFFF" },
  { name: "Cream", css: "#FAF6EE" },
  { name: "Ash", css: "#E2E8F0", family: "slate" },
  { name: "Slate", css: "#64748B", family: "slate" },
  { name: "Charcoal", css: "#27272A", family: "zinc" },
  { name: "Black", css: "#000000" },
  { name: "Navy", css: "#1E3A8A", family: "blue" },
  { name: "Blue", css: "#2563EB", family: "blue" },
  { name: "Cyan", css: "#06B6D4", family: "cyan" },
  { name: "Emerald", css: "#10B981", family: "emerald" },
  { name: "Lime", css: "#84CC16", family: "lime" },
  { name: "Amber", css: "#F59E0B", family: "amber" },
  { name: "Tangerine", css: "#EA580C", family: "orange" },
  { name: "Crimson", css: "#DC2626", family: "red" },
  { name: "Fuchsia", css: "#D946EF", family: "fuchsia" },
  { name: "Violet", css: "#7C3AED", family: "violet" },
];

export const AURORA_SWATCHES: Array<{ name: string; css: string; accent: string }> = [
  {
    name: "Cyber Aurora",
    css: "radial-gradient(circle at 35% 35%, rgba(34, 211, 238, 0.38) 0%, transparent 55%), radial-gradient(circle at 75% 65%, rgba(139, 92, 246, 0.35) 0%, transparent 60%), #090A0F",
    accent: "#22D3EE",
  },
  {
    name: "Deep Cosmos",
    css: "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.38) 0%, transparent 55%), radial-gradient(circle at 70% 70%, rgba(99, 102, 241, 0.35) 0%, transparent 60%), #0A0D14",
    accent: "#3B82F6",
  },
  {
    name: "Emerald Flare",
    css: "radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.38) 0%, transparent 55%), radial-gradient(circle at 80% 75%, rgba(245, 158, 11, 0.28) 0%, transparent 50%), #0A192F",
    accent: "#10B981",
  },
  {
    name: "Neon Sunset",
    css: "radial-gradient(circle at 30% 30%, rgba(236, 72, 153, 0.38) 0%, transparent 55%), radial-gradient(circle at 75% 70%, rgba(249, 115, 22, 0.35) 0%, transparent 60%), #180828",
    accent: "#EC4899",
  },
  {
    name: "Arctic Glow",
    css: "radial-gradient(circle at 35% 35%, rgba(56, 189, 248, 0.38) 0%, transparent 55%), radial-gradient(circle at 80% 65%, rgba(34, 211, 238, 0.3) 0%, transparent 60%), #0B132B",
    accent: "#38BDF8",
  },
  {
    name: "Obsidian Ember",
    css: "radial-gradient(circle at 35% 35%, rgba(234, 88, 12, 0.38) 0%, transparent 55%), radial-gradient(circle at 75% 65%, rgba(220, 38, 38, 0.35) 0%, transparent 60%), #120A05",
    accent: "#EA580C",
  },
];

export const PRESETS: Array<{ name: string; css: string }> = [
  ...GRADIENTS,
  ...AURORA_SWATCHES,
  ...SOLIDS,
  { name: "Transparent", css: TRANSPARENT },
];

/** Display names and bezel tints for the bundled variants; unknown slugs fall back to the slug. */
export const FRAME_META: Record<string, { label: string; tint: string }> = {
  "17-pro-silver": { label: "Silver", tint: "#D8D9DD" },
  "17-pro-blue": { label: "Deep Blue", tint: "#2B3A5C" },
  "17-pro-orange": { label: "Cosmic Orange", tint: "#E0662F" },
};

/** The studio's "System" font choice; mirrors SYSTEM_FONT in src/fonts.ts. */
export const SYSTEM_FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';

export const TEXT_COLORS = [
  { name: "Dark Navy", hex: "#0E1B2A" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy Blue", hex: "#1E3A8A" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Emerald", hex: "#059669" },
  { name: "Amber", hex: "#D97706" },
  { name: "Red", hex: "#DC2626" },
];

/**
 * The display name for a background: a preset's name, a Tailwind shade like
 * "Blue 400" when it came from a shade popunder, else undefined (custom).
 */
export function backgroundName(background: string): string | undefined {
  if (
    background.startsWith("data:image/") ||
    background.startsWith("url(") ||
    background.startsWith("http")
  ) {
    return "Custom Image";
  }
  const preset = PRESETS.find((p) => p.css === background);
  if (preset) return preset.name;
  const hex = background.toUpperCase();
  for (const [family, shades] of Object.entries(TAILWIND)) {
    const i = shades.indexOf(hex);
    if (i !== -1) return `${family[0].toUpperCase()}${family.slice(1)} ${SHADE_STEPS[i]}`;
  }
  return undefined;
}

/** Whether a background's stops are light on average, to pick a legible check color. */
export function isLight(css: string): boolean {
  const hexes = css.match(/#[0-9a-fA-F]{6}/g);
  if (!hexes || hexes.length === 0) return true;
  const lum = hexes.reduce((sum, hex) => {
    const c = (o: number) => parseInt(hex.slice(o, o + 2), 16) / 255;
    return sum + 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
  }, 0);
  return lum / hexes.length > 0.6;
}

/** Select options for the layouts; a two-tile layout says so. */
export function layoutOptions(layouts: LayoutEntry[]): Array<[string, string]> {
  return layouts.map((l) => [l.key, l.span > 1 ? `${l.label} · 2 tiles` : l.label]);
}
