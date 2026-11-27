export interface SampleScreenshot {
  id: string;
  orderLabel: string;
  title: string;
  subtitle: string;
  layoutLabel: string;
  src: string;
  alt: string;
}

export const STUDIO_SAMPLE_SCREENSHOTS: readonly SampleScreenshot[] = [
  {
    id: "smart-money-dashboard",
    orderLabel: "01",
    title: "Smart Money Dashboard",
    subtitle: "All your income, expenses & balance in one place",
    layoutLabel: "Single Focus Hero",
    src: "/assets/aistudio/01-screenshot_1792771721_1c5fbabb.png",
    alt: "Smart Money Dashboard App Store screenshot created with AppAssets Studio",
  },
  {
    id: "personal-expenses",
    orderLabel: "02",
    title: "Track Personal Expenses & Income",
    subtitle: "Monitor daily spending & cash flow at a glance",
    layoutLabel: "Angled Focus Left",
    src: "/assets/aistudio/02-screenshot_1792771827_9ba42bbc.png",
    alt: "Track Personal Expenses & Income App Store screenshot created with AppAssets Studio",
  },
  {
    id: "split-bill",
    orderLabel: "03",
    title: "Split Bill",
    subtitle: "Split Bills with Friends & Groups",
    layoutLabel: "Duo Overlap Spread",
    src: "/assets/aistudio/03-screenshot_1792771592_29abc51d.png",
    alt: "Split Bill two-phone overlap App Store screenshot created with AppAssets Studio",
  },
  {
    id: "group-expenses",
    orderLabel: "04",
    title: "Group Expenses",
    subtitle: "Track group expenses, shared balances, and settlements in real time",
    layoutLabel: "Angled Focus Right",
    src: "/assets/aistudio/04-screenshot_1792771774_c1b849c9.png",
    alt: "Group Expenses App Store screenshot created with AppAssets Studio",
  },
  {
    id: "borrow-and-lend",
    orderLabel: "05",
    title: "Borrow & Lend",
    subtitle: "Track lent & borrowed balances with due dates and settlement status",
    layoutLabel: "Full Frame Showcase",
    src: "/assets/aistudio/05-chatgpt_image_aug_5__2026__12_32_29_am_87b6dfcf.png",
    alt: "Borrow & Lend framed iPhone screenshot created with AppAssets Studio",
  },
] as const;

export function stepSampleIndex(current: number, delta: number, total: number): number {
  if (total <= 0) return 0;
  return (((current + delta) % total) + total) % total;
}

export function getSampleAtIndex(index: number): SampleScreenshot {
  const safeIndex = stepSampleIndex(index, 0, STUDIO_SAMPLE_SCREENSHOTS.length);
  return STUDIO_SAMPLE_SCREENSHOTS[safeIndex]!;
}
