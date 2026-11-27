export type ShowcaseCategoryId =
  | "fitness"
  | "fintech"
  | "social"
  | "music"
  | "productivity";

export interface ShowcaseSlide {
  id: string;
  caption: string;
  subcaption: string;
  screenType:
    | "fitness-rings"
    | "fitness-heart"
    | "fitness-streak"
    | "fintech-balance"
    | "fintech-card"
    | "fintech-flow"
    | "social-thread"
    | "social-channels"
    | "social-huddle"
    | "music-player"
    | "music-eq"
    | "music-mixes"
    | "prod-focus"
    | "prod-board"
    | "prod-velocity";
}

export interface ShowcaseCategory {
  id: ShowcaseCategoryId;
  categoryLabel: string;
  title: string;
  description: string;
  summaryStat: string;
  layoutSequence: string;
  typography: string;
  exportTargets: string;
  presetId: string;
  /** CSS background used for the App Store screenshot tiles in the preview stage. */
  tileBackground: string;
  /** Text polarity inside the screenshot tiles. */
  tileTone: "dark" | "light";
  /** Accent hex color for interactive highlights inside the mock screens. */
  accentColor: string;
  /** Three curated hex swatches displayed in the spec rail. */
  palette: [string, string, string];
  slides: [ShowcaseSlide, ShowcaseSlide, ShowcaseSlide];
}

export const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: "fitness",
    categoryLabel: "Fitness & Health",
    title: "Track Daily Activity",
    description:
      "Lead with crisp activity rings, heart-rate zones, and daily readiness telemetry framed in high-contrast dark surfaces built for fast App Store scanning.",
    summaryStat: "8,420 steps · 640 kcal",
    layoutSequence: "Hero Focus → Live Pulse → Weekly Cadence",
    typography: "SF Pro Display · Tabular Numerals",
    exportTargets: "1320 × 2868 · 1080 × 2400",
    presetId: "sunset-kinetic",
    tileBackground:
      "radial-gradient(circle at 22% 14%, rgba(255, 107, 0, 0.42) 0%, transparent 56%), linear-gradient(168deg, #171210 0%, #0D0B0A 100%)",
    tileTone: "dark",
    accentColor: "#FF6B00",
    palette: ["#171210", "#FF6B00", "#FB7185"],
    slides: [
      {
        id: "rings",
        caption: "Close every ring.",
        subcaption: "Daily movement at a glance",
        screenType: "fitness-rings",
      },
      {
        id: "heart",
        caption: "Live heart zones.",
        subcaption: "Real-time recovery telemetry",
        screenType: "fitness-heart",
      },
      {
        id: "streak",
        caption: "Stay consistent.",
        subcaption: "14-day training momentum",
        screenType: "fitness-streak",
      },
    ],
  },
  {
    id: "fintech",
    categoryLabel: "Fintech & Wealth",
    title: "Smart Portfolio",
    description:
      "Communicate institutional trust with deep emerald-slate canvas tones, clear balance hierarchies, and crisp card visuals tailored for financial apps.",
    summaryStat: "$38,450.20 · +18.4%",
    layoutSequence: "Portfolio Overview → Card Control → Cashflow",
    typography: "Montserrat · Monospace Metrics",
    exportTargets: "1320 × 2868 · 1080 × 2400",
    presetId: "emerald-wealth",
    tileBackground:
      "radial-gradient(circle at 78% 12%, rgba(16, 185, 129, 0.34) 0%, transparent 54%), linear-gradient(168deg, #0B1918 0%, #071112 100%)",
    tileTone: "dark",
    accentColor: "#10B981",
    palette: ["#0B1918", "#10B981", "#34D399"],
    slides: [
      {
        id: "balance",
        caption: "Wealth in real time.",
        subcaption: "Track every asset cleanly",
        screenType: "fintech-balance",
      },
      {
        id: "card",
        caption: "Instant transfers.",
        subcaption: "Virtual cards & zero fees",
        screenType: "fintech-card",
      },
      {
        id: "flow",
        caption: "Clear monthly flow.",
        subcaption: "Automated spend insights",
        screenType: "fintech-flow",
      },
    ],
  },
  {
    id: "social",
    categoryLabel: "Social & Chat",
    title: "Team Collaboration",
    description:
      "Highlight threads, voice notes, and live presence indicators with calm obsidian-cobalt depth that keeps messaging interfaces legible at thumbnail size.",
    summaryStat: "Instant sync · E2E encrypted",
    layoutSequence: "Active Thread → Channel Inbox → Voice Huddle",
    typography: "SF Pro Display · Clean Sans",
    exportTargets: "1320 × 2868 · 1080 × 2400",
    presetId: "cyber-aurora",
    tileBackground:
      "radial-gradient(circle at 25% 15%, rgba(79, 70, 229, 0.38) 0%, transparent 56%), linear-gradient(168deg, #0D1021 0%, #080A14 100%)",
    tileTone: "dark",
    accentColor: "#6366F1",
    palette: ["#0D1021", "#6366F1", "#38BDF8"],
    slides: [
      {
        id: "thread",
        caption: "Threads that move.",
        subcaption: "Voice notes & instant replies",
        screenType: "social-thread",
      },
      {
        id: "channels",
        caption: "Every team aligned.",
        subcaption: "Live presence across rooms",
        screenType: "social-channels",
      },
      {
        id: "huddle",
        caption: "Drop in to talk.",
        subcaption: "Zero-latency audio huddles",
        screenType: "social-huddle",
      },
    ],
  },
  {
    id: "music",
    categoryLabel: "Music & Audio",
    title: "Lossless Audio Stream",
    description:
      "Frame album artwork, acoustic visualizers, and curated mixes inside rich studio-plum tones that feel editorial rather than cluttered.",
    summaryStat: "Spatial audio · 24-bit Hi-Res",
    layoutSequence: "Now Playing → Spatial EQ → Daily Mixes",
    typography: "Plus Jakarta Sans · Mono Timecode",
    exportTargets: "1320 × 2868 · 1080 × 2400",
    presetId: "cyber-aurora",
    tileBackground:
      "radial-gradient(circle at 75% 16%, rgba(192, 38, 211, 0.32) 0%, transparent 54%), linear-gradient(168deg, #160D1C 0%, #0B0810 100%)",
    tileTone: "dark",
    accentColor: "#E879F9",
    palette: ["#160D1C", "#C026D3", "#F472B6"],
    slides: [
      {
        id: "player",
        caption: "Studio master sound.",
        subcaption: "Lossless 24-bit playback",
        screenType: "music-player",
      },
      {
        id: "eq",
        caption: "Sculpt every note.",
        subcaption: "Adaptive spatial acoustics",
        screenType: "music-eq",
      },
      {
        id: "mixes",
        caption: "Curated for you.",
        subcaption: "Fresh daily listening shelves",
        screenType: "music-mixes",
      },
    ],
  },
  {
    id: "productivity",
    categoryLabel: "Productivity",
    title: "Effortless Focus",
    description:
      "Showcase task boards, focus timers, and completion streaks on crisp architectural alabaster surfaces with high-contrast ink typography.",
    summaryStat: "Zero distractions · 25m sprints",
    layoutSequence: "Deep Work Timer → Kanban Board → Weekly Output",
    typography: "SF Pro Display · Neutral Ink",
    exportTargets: "1320 × 2868 · 1080 × 2400",
    presetId: "arctic-saas",
    tileBackground:
      "radial-gradient(circle at 80% 10%, rgba(255, 107, 0, 0.1) 0%, transparent 48%), linear-gradient(168deg, #F5F6F8 0%, #E9ECEF 100%)",
    tileTone: "light",
    accentColor: "#18181B",
    palette: ["#F5F6F8", "#18181B", "#FF6B00"],
    slides: [
      {
        id: "focus",
        caption: "Protect deep work.",
        subcaption: "Calm focus blocks & timers",
        screenType: "prod-focus",
      },
      {
        id: "board",
        caption: "Plan with clarity.",
        subcaption: "Prioritized daily checklists",
        screenType: "prod-board",
      },
      {
        id: "velocity",
        caption: "Ship every week.",
        subcaption: "Visual habit & sprint trends",
        screenType: "prod-velocity",
      },
    ],
  },
];

export function getShowcaseCategory(id: string): ShowcaseCategory {
  return (
    SHOWCASE_CATEGORIES.find((item) => item.id === id) ?? SHOWCASE_CATEGORIES[0]!
  );
}
