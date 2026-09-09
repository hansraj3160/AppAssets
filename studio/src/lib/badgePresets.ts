export type BadgePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type BadgeCategory = "ratings" | "awards" | "rankings" | "trust" | "features";

export type BadgePreset = {
  id: string;
  category: BadgeCategory;
  text: string;
  position: BadgePosition;
  background: string;
  color: string;
  tagline?: string;
};

export const BADGE_CATEGORIES: Array<{ id: BadgeCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "ratings", label: "Ratings ⭐️" },
  { id: "awards", label: "Awards 🏆" },
  { id: "rankings", label: "Rankings 📈" },
  { id: "trust", label: "Trust 🔒" },
  { id: "features", label: "Features ⚡" },
];

export const BADGE_COLOR_PALETTES: Array<{ name: string; bg: string; text: string }> = [
  { name: "Gold Trust", bg: "#1E293B", text: "#FBBF24" },
  { name: "Apple Blue", bg: "#0071E3", text: "#FFFFFF" },
  { name: "Emerald", bg: "#059669", text: "#FFFFFF" },
  { name: "Obsidian", bg: "#09090B", text: "#FACC15" },
  { name: "Royal Indigo", bg: "#4338CA", text: "#FDE047" },
  { name: "Rose Crimson", bg: "#E11D48", text: "#FFFFFF" },
  { name: "Coral Flame", bg: "#EA580C", text: "#FFFFFF" },
  { name: "Clean Light", bg: "rgba(255, 255, 255, 0.92)", text: "#0F172A" },
];

export const BADGE_PRESETS: BadgePreset[] = [
  // Ratings & Reviews
  {
    id: "rating-50k",
    category: "ratings",
    text: "4.9 ★ (50K+ Reviews)",
    position: "top-right",
    background: "#1E293B",
    color: "#FBBF24",
    tagline: "High social proof",
  },
  {
    id: "app-of-day",
    category: "ratings",
    text: "4.8 ★ App of the Day 🏆",
    position: "top-right",
    background: "#0071E3",
    color: "#FFFFFF",
    tagline: "Apple spotlight style",
  },
  {
    id: "loved-users",
    category: "ratings",
    text: "Loved by 1M+ Users ❤️",
    position: "top-right",
    background: "#E11D48",
    color: "#FFFFFF",
    tagline: "Strong user base",
  },
  {
    id: "top-rated",
    category: "ratings",
    text: "Top Rated ★★★★★",
    position: "top-right",
    background: "#0F172A",
    color: "#F59E0B",
    tagline: "Universal 5-star",
  },

  // Awards & Recognition
  {
    id: "editors-choice",
    category: "awards",
    text: "Editor's Choice 🏆",
    position: "top-right",
    background: "#4338CA",
    color: "#FDE047",
    tagline: "Prestigious endorsement",
  },
  {
    id: "apple-design",
    category: "awards",
    text: "Apple Design Award 🌟",
    position: "top-right",
    background: "#09090B",
    color: "#FACC15",
    tagline: "Top tier aesthetic badge",
  },
  {
    id: "featured-store",
    category: "awards",
    text: "Featured on App Store 🚀",
    position: "top-right",
    background: "#0284C7",
    color: "#FFFFFF",
    tagline: "Store prominence",
  },
  {
    id: "best-of-year",
    category: "awards",
    text: "Google Play Best of 2024 ✨",
    position: "top-right",
    background: "#0F9D58",
    color: "#FFFFFF",
    tagline: "Google Play recognition",
  },

  // Rankings & Popularity
  {
    id: "rank-productivity",
    category: "rankings",
    text: "#1 in Productivity 📈",
    position: "top-right",
    background: "#059669",
    color: "#FFFFFF",
    tagline: "Category leader",
  },
  {
    id: "rank-fitness",
    category: "rankings",
    text: "#1 Health & Fitness 🏃",
    position: "top-right",
    background: "#EA580C",
    color: "#FFFFFF",
    tagline: "High-energy category leader",
  },
  {
    id: "rank-finance",
    category: "rankings",
    text: "#1 Finance App 💰",
    position: "top-right",
    background: "#0D9488",
    color: "#F0FDF4",
    tagline: "Finance credibility",
  },
  {
    id: "rank-trending",
    category: "rankings",
    text: "Trending #1 Global 🔥",
    position: "top-right",
    background: "#D97706",
    color: "#FFFFFF",
    tagline: "Viral momentum",
  },

  // Trust & Pricing
  {
    id: "free-no-ads",
    category: "trust",
    text: "100% Free / No Ads ✨",
    position: "top-right",
    background: "#10B981",
    color: "#FFFFFF",
    tagline: "Zero friction install",
  },
  {
    id: "free-trial",
    category: "trust",
    text: "7-Day Free Trial 🎁",
    position: "top-right",
    background: "#7C3AED",
    color: "#FFFFFF",
    tagline: "Risk-free trial",
  },
  {
    id: "no-cc",
    category: "trust",
    text: "No Credit Card Required 🔒",
    position: "top-right",
    background: "#334155",
    color: "#F8FAFC",
    tagline: "Safe onboarding",
  },
  {
    id: "private-secure",
    category: "trust",
    text: "Private & Secure 🛡️",
    position: "top-right",
    background: "#1E3A8A",
    color: "#93C5FD",
    tagline: "Data privacy guarantee",
  },

  // Features & Technology
  {
    id: "ai-powered",
    category: "features",
    text: "AI Powered 🤖",
    position: "top-right",
    background: "#6366F1",
    color: "#FFFFFF",
    tagline: "Next-gen tech highlight",
  },
  {
    id: "offline-mode",
    category: "features",
    text: "Offline Mode ⚡",
    position: "top-right",
    background: "#F59E0B",
    color: "#000000",
    tagline: "Works anywhere",
  },
  {
    id: "new-feature",
    category: "features",
    text: "NEW Feature 🚀",
    position: "top-right",
    background: "#F43F5E",
    color: "#FFFFFF",
    tagline: "Fresh release update",
  },
  {
    id: "mac-ipad",
    category: "features",
    text: "Works on Mac & iPad 💻",
    position: "top-right",
    background: "#27272A",
    color: "#F4F4F5",
    tagline: "Universal ecosystem",
  },
];
