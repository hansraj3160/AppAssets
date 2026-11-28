import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Mail,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { useState } from "react";
import duoOverlapImg from "@/assets/duo_overlap.webp";
import heroImage from "@/assets/hero_section.webp";
import panoramicImg from "@/assets/panoromic_multi_span.webp";
import showcaseImg from "@/assets/show_case_img.webp";
import singleFocusHeroImg from "@/assets/single_focus_hero.webp";
import trioStoryImg from "@/assets/trio_story.webp";
import type { ShowcaseCategory } from "@/lib/showcaseCategories";
import { isModifiedEvent } from "@/lib/utils";
import { CategoryShowcase } from "./CategoryShowcase";
import { RealSamplesShowcase } from "./RealSamplesShowcase";
import { Button } from "./ui/button";

const appLogo = "/favicon.svg";

interface LandingPageProps {
  onStartDesigning: (style?: ShowcaseCategory) => void;
  dark: boolean;
  onToggleDark: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenAbout?: () => void;
  onOpenContact?: () => void;
  onOpenGuidelines?: () => void;
}

interface TemplatePreview {
  index: string;
  shortLabel: string;
  title: string;
  desc: string;
  role: string;
  spec: string;
  image: string;
}

const TEMPLATE_PREVIEWS: Record<string, TemplatePreview> = {
  single: {
    index: "01",
    shortLabel: "Single Focus",
    title: "Single Focus Hero",
    desc: "Clean centered device frame paired with a balanced top headline for instant legibility in App Store and Google Play search results.",
    role: "Primary Cover Slide",
    spec: "1320 × 2868 · Centered Frame",
    image: singleFocusHeroImg,
  },
  duo: {
    index: "02",
    shortLabel: "Duo Overlap",
    title: "Duo Overlap Spread",
    desc: "Two layered phone bezels positioned in depth to present complementary views side by side — such as Overview and Detail screens.",
    role: "Feature Pairing",
    spec: "1320 × 2868 · Dual Bezel",
    image: duoOverlapImg,
  },
  trio: {
    index: "03",
    shortLabel: "Trio Story",
    title: "Trio Storyline Flow",
    desc: "Three stepped devices walking prospective users through a multi-step onboarding, checkout, or productivity workflow in a single frame.",
    role: "Workflow Narrative",
    spec: "1320 × 2868 · 3-Step Cascade",
    image: trioStoryImg,
  },
  showcase: {
    index: "04",
    shortLabel: "Showcase Angle",
    title: "Showcase Pro Angle",
    desc: "Tilted studio perspective that emphasizes UI hierarchy, surface depth, and crisp edge shadows without sacrificing readability.",
    role: "Visual Accent Slide",
    spec: "1320 × 2868 · Angled Perspective",
    image: showcaseImg,
  },
  panorama: {
    index: "05",
    shortLabel: "Panoramic Span",
    title: "Panoramic Multi-Span",
    desc: "A continuous visual canvas that flows seamlessly across adjacent screenshots in the store gallery carousel.",
    role: "Continuous Carousel",
    spec: "Multi-Slide · Seamless Bleed",
    image: panoramicImg,
  },
};

const FAQS = [
  {
    q: "Is AppAssets completely free to use?",
    a: "Yes. AppAssets is open source and free for personal and commercial apps. You can frame, customize, audit, and export high-resolution store screenshots without creating an account or entering a credit card.",
  },
  {
    q: "Which devices and store resolutions are supported?",
    a: 'Official dimensions for App Store Connect and Google Play Console are built in: 6.9" iPhone 16 Pro Max (1320 × 2868), 6.5" iPhone Plus, 13" iPad Pro (2064 × 2752), Pixel 10 Pro, Android phone/tablet sizes, plus the mandatory 1024 × 500 Google Play Feature Graphic.',
  },
  {
    q: "Are my app screenshots and branding assets kept private?",
    a: "Yes. Screenshot framing, canvas compositing, contrast auditing, and packaging run locally inside your browser and machine. Your raw app captures never need to be uploaded to a third-party server.",
  },
  {
    q: "How does the Store Pre-Flight Audit work?",
    a: "The built-in compliance engine checks your screenshot set and app icons against 11 Apple App Store and Google Play rules — validating required capture counts, target resolutions, opaque icon backgrounds, and WCAG 4.5:1 caption contrast.",
  },
  {
    q: "How are the final assets structured on export?",
    a: "One click exports a submission-ready ZIP archive organized into AppStore/, GooglePlay/, and Favicon Kit folders with exact naming conventions and a plain-text STORE_GUIDE.txt upload checklist.",
  },
];

const AUDIT_CHECKS = [
  {
    label: 'iPhone 6.9" Required Captures',
    detail: "1320 × 2868 px sRGB PNG",
    status: "Passed · 4+ screens",
  },
  {
    label: "Google Play 512 × 512 App Icon",
    detail: "Opaque 32-bit PNG, no alpha bleed",
    status: "Verified",
  },
  {
    label: "Apple 1024 × 1024 Master Icon",
    detail: "Full-bleed square, zero corner mask",
    status: "Verified",
  },
  {
    label: "Caption Text Contrast Ratio",
    detail: "Measured across all active slides",
    status: "Passed · ≥ 4.5:1",
  },
  {
    label: "Feature Graphic & Promo Banner",
    detail: "1024 × 500 safe-area verified",
    status: "Verified",
  },
];

const HERO_SPECS = [
  {
    label: "Apple App Store",
    value: '6.9" iPhone & 13" iPad',
  },
  {
    label: "Google Play Console",
    value: "Pixel Frame + 1024 × 500 Graphic",
  },
  {
    label: "Pre-Flight Compliance",
    value: "11 Automated Store Review Checks",
  },
  {
    label: "Privacy Architecture",
    value: "100% Local Browser Rendering",
  },
];

export function LandingPage({
  onStartDesigning,
  dark,
  onToggleDark,
  onOpenPrivacy,
  onOpenTerms,
  onOpenAbout,
  onOpenContact,
  onOpenGuidelines,
}: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<string>("single");

  const activeTemplate = TEMPLATE_PREVIEWS[selectedTemplateTab] ?? TEMPLATE_PREVIEWS.single;

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-[#FF6B00]/15 selection:text-[#FF6B00] w-full">
      {/* 1. Sticky Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Clean single-line brand wordmark */}
          <button
            type="button"
            onClick={() => onStartDesigning()}
            className="flex items-center gap-2.5 cursor-pointer group text-left border-none bg-transparent p-0 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-lg"
          >
            <img
              src={appLogo}
              alt=""
              aria-hidden="true"
              className="size-7 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-[17px] font-extrabold tracking-tight text-zinc-950 dark:text-white">
              App<span className="text-[#FF6B00]">Assets</span>
            </span>
          </button>

          {/* Zone 2: 5 concise single-line text links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-zinc-400"
          >
            <a
              href="#samples"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Samples
            </a>
            <a
              href="#showcase"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Showcase
            </a>
            <a
              href="#features"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#templates"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Templates
            </a>
            {onOpenGuidelines ? (
              <a
                href="/guidelines"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenGuidelines();
                  }
                }}
                className="hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Guidelines
              </a>
            ) : (
              <a
                href="#faq"
                className="hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                FAQ
              </a>
            )}
          </nav>

          {/* Zone 3: Theme utility + 1 clear primary action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="size-9 inline-flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
            >
              {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </button>

            <Button
              type="button"
              onClick={() => onStartDesigning()}
              className="h-9 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-[#FF6B00] hover:bg-[#E55E00] text-white transition-colors duration-150 active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-none"
            >
              <span>Start Designing</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="relative bg-white dark:bg-[#09090B] border-b border-zinc-200/80 dark:border-zinc-800/80">
          {/* Subtle architectural top sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-zinc-50/90 via-zinc-50/30 to-transparent dark:from-zinc-900/50 dark:via-zinc-950/20 dark:to-transparent"
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 lg:pt-20 pb-12 sm:pb-16 lg:pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Editorial Headline, Value Prop & Action */}
              <div className="lg:col-span-6 text-left">
                {/* Unboxed metadata line (fits cleanly on 1 line even on 390px mobile) */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="text-[#FF6B00] dark:text-[#FF8A00] font-semibold">
                    Free &amp; Open Source
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>iOS &amp; Android</span>
                  <span aria-hidden="true">·</span>
                  <span>No Account Needed</span>
                </div>

                <h1 className="mt-4 text-[clamp(2.25rem,4.1vw,3.5rem)] font-extrabold tracking-[-0.02em] leading-[1.08] text-zinc-950 dark:text-white text-balance">
                  Submission-ready app screenshots, framed in minutes.
                </h1>

                <p className="mt-5 text-base sm:text-[17px] text-zinc-600 dark:text-zinc-400 leading-[1.65] max-w-xl">
                  Turn raw simulator or device captures into pixel-accurate App Store and Google
                  Play galleries, feature graphics, and verified icon sets — directly in your
                  browser with zero uploads.
                </p>

                {/* Primary & Secondary Actions */}
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-5">
                  <Button
                    type="button"
                    onClick={() => onStartDesigning()}
                    className="h-12 px-6 rounded-xl font-semibold text-sm sm:text-[15px] bg-[#FF6B00] hover:bg-[#E55E00] text-white transition-all duration-150 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 w-full sm:w-auto shadow-xs"
                  >
                    <span>Open Screenshot Studio</span>
                    <ArrowRight className="size-4" />
                  </Button>

                  <a
                    href="#samples"
                    className="h-12 px-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition-colors duration-150 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 w-full sm:w-auto"
                  >
                    <span>Inspect Real Exports</span>
                    <ArrowUpRight className="size-4 text-zinc-400" />
                  </a>
                </div>
              </div>

              {/* Right Column: Matted Studio Presentation Frame */}
              <div className="lg:col-span-6 w-full">
                <button
                  type="button"
                  onClick={() => onStartDesigning()}
                  aria-label="Open AppAssets Studio editor"
                  className="group block w-full text-left rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-[#FAF6F1] dark:bg-[#131214] overflow-hidden transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#09090B]"
                >
                  {/* Visual Mat */}
                  <div className="relative px-3 pt-4 pb-2 sm:px-5 sm:pt-6 sm:pb-3 flex items-center justify-center overflow-hidden">
                    <img
                      src={heroImage}
                      alt="AppAssets Studio showcasing five framed iPhone screenshots for App Store and Google Play"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[390px] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.018] select-none"
                      loading="eager"
                      decoding="async"
                    />
                  </div>

                  {/* Architectural Spec Footer Bar */}
                  <div className="px-4 sm:px-5 py-3 border-t border-zinc-200/80 dark:border-zinc-800/90 bg-white/90 dark:bg-zinc-950/90 flex items-center justify-between gap-3 text-[11px] sm:text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      Multi-device canvas · Hardware bezels included
                    </span>
                    <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0">
                      1320 × 2868 · sRGB
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Full-Width 4-Column Specification Strip below Hero Split */}
            <div className="mt-12 sm:mt-16 pt-8 border-t border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {HERO_SPECS.map((spec) => (
                <div key={spec.label} className="space-y-1">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {spec.label}
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Editorial Proof Strip (Attributable Quote + Concrete Platform Metrics) */}
        <section className="py-12 sm:py-16 bg-zinc-50/80 dark:bg-[#0D0D10] border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <blockquote className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.3] text-balance">
                &ldquo;We replaced a fragile Figma file with AppAssets and cut our iOS and Android
                release screenshot prep from an afternoon to ten minutes.&rdquo;
              </blockquote>
              <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                  Daniel Lindqvist
                </span>
                <span aria-hidden="true">·</span>
                <span>Independent iOS Developer, PulseTrack</span>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-x-6 gap-y-5 lg:border-l lg:border-zinc-200/80 dark:lg:border-zinc-800/80 lg:pl-10">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  11
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Apple &amp; Play review rules checked
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  5
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Store-tested layout sequences
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  2
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Stores exported in one ZIP package
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  0 KB
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Uploaded to third-party servers
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Real Sample Screenshots Created with AppAssets Studio */}
        <RealSamplesShowcase onStartDesigning={() => onStartDesigning()} />

        {/* 5. Category Showcase */}
        <CategoryShowcase onDesignStyle={(style) => onStartDesigning(style)} />

        {/* 6. Capabilities Bento Grid */}
        <section
          id="features"
          className="py-16 sm:py-20 lg:py-24 scroll-mt-16 bg-zinc-50/80 dark:bg-[#0D0D10] px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800/80"
        >
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-10 sm:mb-14">
              <p className="text-xs font-semibold tracking-wide text-[#FF6B00] dark:text-[#FF8A00]">
                Capabilities
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[2.5rem] font-extrabold tracking-tight leading-[1.12] text-zinc-950 dark:text-white text-balance">
                Built for shipping store listings without design bottlenecks
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Every workflow from raw simulator capture to localized export bundle lives in one
                fast workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* 01. Marquee Wide Card (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 flex flex-col justify-between gap-8">
                <div>
                  <div className="flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono font-medium text-[#FF6B00] dark:text-[#FF8A00] tabular-nums">
                      01.
                    </span>
                    <span className="font-mono tabular-nums">1320 × 2868 · 2064 × 2752</span>
                  </div>
                  <h3 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white text-balance">
                    100% in-browser compositing with authentic hardware frames
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                    Skip heavy desktop templates. Hardware bezel alignment, dynamic typography
                    scaling, and gradient or pattern backdrops render natively on your machine with
                    full privacy.
                  </p>
                </div>

                <div className="pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <span>iPhone 16 Pro Max (6.9&quot;)</span>
                  <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                    ·
                  </span>
                  <span>iPad Pro 13&quot;</span>
                  <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                    ·
                  </span>
                  <span>Google Pixel 10 Pro</span>
                </div>
              </div>

              {/* 02. Companion Right Card (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 flex flex-col justify-between gap-8">
                <div>
                  <div className="flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono font-medium text-[#FF6B00] dark:text-[#FF8A00] tabular-nums">
                      02.
                    </span>
                    <span className="font-mono tabular-nums">11 checks</span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                    Automated pre-flight store audit
                  </h3>
                  <p className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Validates screenshot counts, exact pixel targets, opaque app icons, and WCAG
                    caption contrast before you upload to App Store Connect or Google Play Console.
                  </p>
                </div>

                <div className="pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Catches review blockers before submission
                </div>
              </div>

              {/* 03. Bottom Row Card (4 cols) */}
              <div className="lg:col-span-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-7 flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono font-medium text-[#FF6B00] dark:text-[#FF8A00] tabular-nums">
                      03.
                    </span>
                    <span className="font-mono">Multi-locale</span>
                  </div>
                  <h3 className="mt-3.5 text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                    Category-tuned headline drafting
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Draft concise marketing captions tailored to your app category and manage
                    localized copy sets across global storefronts.
                  </p>
                </div>
                <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
                  Inline editing directly on every slide
                </div>
              </div>

              {/* 04. Bottom Row Card (4 cols) */}
              <div className="lg:col-span-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-7 flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono font-medium text-[#FF6B00] dark:text-[#FF8A00] tabular-nums">
                      04.
                    </span>
                    <span className="font-mono tabular-nums">1024 × 500</span>
                  </div>
                  <h3 className="mt-3.5 text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                    Feature graphics &amp; promo banners
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Generate the required Google Play Feature Graphic and social launch cards with
                    safe-area overlays and retina export presets.
                  </p>
                </div>
                <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
                  Safe-area guides built in
                </div>
              </div>

              {/* 05. Bottom Row Card (4 cols) */}
              <div className="lg:col-span-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-7 flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono font-medium text-[#FF6B00] dark:text-[#FF8A00] tabular-nums">
                      05.
                    </span>
                    <span className="font-mono">.ZIP Bundle</span>
                  </div>
                  <h3 className="mt-3.5 text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                    Structured console-ready export
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Download clean AppStore/, GooglePlay/, and Favicon Kit folders named to exact
                    platform specifications with an upload guide.
                  </p>
                </div>
                <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
                  Single-click archive generation
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Layout Templates Showcase */}
        <section
          id="templates"
          className="py-16 sm:py-20 lg:py-24 scroll-mt-16 bg-white dark:bg-[#09090B] px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800/80"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-wide text-[#FF6B00] dark:text-[#FF8A00]">
                  Layout Library
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[2.5rem] font-extrabold tracking-tight leading-[1.12] text-zinc-950 dark:text-white text-balance">
                  Five composition systems built for store browsing
                </h2>
                <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Switch compositions per slide without re-importing captures or adjusting margins
                  by hand.
                </p>
              </div>

              {/* Clean Segmented Control */}
              <div
                role="tablist"
                aria-label="Screenshot layout compositions"
                className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 self-start lg:self-end"
              >
                {Object.entries(TEMPLATE_PREVIEWS).map(([key, t]) => {
                  const selected = selectedTemplateTab === key;
                  return (
                    <button
                      key={key}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => setSelectedTemplateTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                        selected
                          ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                      }`}
                    >
                      {t.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Layout Stage (Single-Elevation Editorial Split) */}
            <div
              role="tabpanel"
              aria-label={`${activeTemplate.title} preview`}
              className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80 dark:divide-zinc-800/80">
                {/* Left Details (5 cols) */}
                <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                      <span className="font-mono font-semibold text-[#FF6B00] dark:text-[#FF8A00]">
                        {activeTemplate.index}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                        {activeTemplate.role}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>iOS &amp; Android</span>
                    </div>

                    <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white text-balance">
                      {activeTemplate.title}
                    </h3>

                    <p className="mt-3 text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {activeTemplate.desc}
                    </p>

                    <div className="mt-6 pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">Output Spec</span>
                      <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {activeTemplate.spec}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="button"
                      onClick={() => onStartDesigning()}
                      className="h-11 px-5 rounded-xl text-sm font-semibold bg-[#FF6B00] hover:bg-[#E55E00] text-white cursor-pointer inline-flex items-center gap-2 transition-colors duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 shadow-none"
                    >
                      <span>Use This Layout in Studio</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Right Matted Visual Preview (7 cols, single-elevation surface) */}
                <button
                  type="button"
                  onClick={() => onStartDesigning()}
                  aria-label={`Open ${activeTemplate.title} template in Studio`}
                  className="lg:col-span-7 bg-[#FAF8F5] dark:bg-zinc-900/60 p-6 sm:p-10 flex items-center justify-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6B00]"
                >
                  <img
                    src={activeTemplate.image}
                    alt={activeTemplate.title}
                    referrerPolicy="no-referrer"
                    className="w-full max-w-[480px] max-h-[320px] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03] drop-shadow-sm select-none"
                    loading="lazy"
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Store Pre-Flight Audit Section (Single-Elevation Architectural Split) */}
        <section
          id="audit"
          className="py-16 sm:py-20 lg:py-24 scroll-mt-16 bg-zinc-50/80 dark:bg-[#0D0D10] px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800/80"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold tracking-wide text-[#FF6B00] dark:text-[#FF8A00]">
                Store Compliance Audit
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-extrabold tracking-tight leading-[1.14] text-zinc-950 dark:text-white text-balance">
                Catch review rejections before you upload
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                App Store Connect and Google Play Console enforce strict rules on dimensions,
                minimum screenshot counts, alpha transparency, and caption readability. Run the
                built-in audit inside Studio and resolve issues in one click.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => onStartDesigning()}
                  className="h-11 px-5 rounded-xl font-semibold text-sm bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 cursor-pointer inline-flex items-center gap-2 transition-colors duration-150 whitespace-nowrap shrink-0 shadow-none"
                >
                  <span>Audit Your Store Listing</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Single-Elevation Audit Manifest Panel */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-4">
                <div className="text-sm font-bold text-zinc-950 dark:text-white">
                  Pre-Flight Store Checklist
                </div>
                <div className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                  5 / 5 Checks Passing
                </div>
              </div>

              <ul className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {AUDIT_CHECKS.map((item) => (
                  <li
                    key={item.label}
                    className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.label}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                        {item.detail}
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                      <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" />
                      <span>{item.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 9. FAQ Section (Editorial 2-Column Accordion) */}
        <section
          id="faq"
          className="py-16 sm:py-20 lg:py-24 scroll-mt-16 bg-white dark:bg-[#09090B] px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800/80"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold tracking-wide text-[#FF6B00] dark:text-[#FF8A00]">
                Questions &amp; Answers
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight leading-[1.15] text-zinc-950 dark:text-white text-balance">
                Common questions before you export
              </h2>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Everything you need to know about privacy, supported store sizes, and export output.
              </p>
              {onOpenContact ? (
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-[#FF6B00] dark:hover:text-[#FF8A00] transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  <span>Still have a question? Contact us</span>
                  <ArrowUpRight className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="lg:col-span-8 divide-y divide-zinc-200/90 dark:divide-zinc-800/90 border-y border-zinc-200/90 dark:border-zinc-800/90">
              {FAQS.map((f, i) => {
                const isOpen = activeFaq === i;
                return (
                  <div key={f.q}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setActiveFaq(isOpen ? null : i)}
                      className="w-full py-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-zinc-950 dark:text-white cursor-pointer hover:text-[#FF6B00] dark:hover:text-[#FF8A00] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-sm"
                    >
                      <span>{f.q}</span>
                      <ChevronDown
                        className={`size-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-zinc-950 dark:text-white" : ""
                        }`}
                      />
                    </button>
                    {isOpen ? (
                      <div className="pb-5 pr-8 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {f.a}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 10. High-Contrast Obsidian Final CTA Band */}
        <section className="py-16 sm:py-20 lg:py-24 bg-zinc-950 dark:bg-zinc-900/80 text-white px-4 sm:px-6 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF6B00]/70 to-transparent"
          />
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-[#FF8A00]">Ready to Ship</p>
              <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight leading-[1.1] text-white text-balance">
                Build your next App Store and Google Play release set today.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed">
                Open the browser editor, drop in your captures, verify compliance, and export a
                submission-ready archive in minutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
              <Button
                type="button"
                onClick={() => onStartDesigning()}
                className="h-12 px-7 rounded-xl font-semibold text-sm sm:text-[15px] bg-[#FF6B00] hover:bg-[#FF7F24] text-white transition-all duration-150 active:scale-[0.98] cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 shadow-none"
              >
                <span>Start Designing Free</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 11. Quiet Editorial Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#09090B] py-12 px-4 sm:px-6 text-xs text-zinc-500 dark:text-zinc-400 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-zinc-200/80 dark:border-zinc-800/80">
            {/* Brand Summary */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <img src={appLogo} alt="" className="size-6 rounded-md object-cover shrink-0" />
                <span className="text-sm font-extrabold tracking-tight text-zinc-950 dark:text-white">
                  App<span className="text-[#FF6B00]">Assets</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                Browser-based App Store and Google Play screenshot automation, device framing, and
                store compliance verification.
              </p>
            </div>

            {/* Product Column */}
            <div className="md:col-span-3 space-y-2.5">
              <div className="font-semibold text-zinc-900 dark:text-zinc-200">Product</div>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/studio"
                    onClick={(e) => {
                      if (!isModifiedEvent(e)) {
                        e.preventDefault();
                        onStartDesigning();
                      }
                    }}
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Open Studio
                  </a>
                </li>
                <li>
                  <a
                    href="#samples"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    Real Samples
                  </a>
                </li>
                <li>
                  <a
                    href="#showcase"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    Category Showcase
                  </a>
                </li>
                <li>
                  <a
                    href="#templates"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    Layout Templates
                  </a>
                </li>
                {onOpenGuidelines ? (
                  <li>
                    <a
                      href="/guidelines"
                      onClick={(e) => {
                        if (!isModifiedEvent(e)) {
                          e.preventDefault();
                          onOpenGuidelines();
                        }
                      }}
                      className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Store Guidelines
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>

            {/* Company & Legal Column */}
            <div className="md:col-span-4 space-y-2.5">
              <div className="font-semibold text-zinc-900 dark:text-zinc-200">
                Resources &amp; Contact
              </div>
              <ul className="space-y-2">
                {onOpenAbout ? (
                  <li>
                    <a
                      href="/about"
                      onClick={(e) => {
                        if (!isModifiedEvent(e)) {
                          e.preventDefault();
                          onOpenAbout();
                        }
                      }}
                      className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      About Us
                    </a>
                  </li>
                ) : null}
                {onOpenContact ? (
                  <li>
                    <a
                      href="/contact"
                      onClick={(e) => {
                        if (!isModifiedEvent(e)) {
                          e.preventDefault();
                          onOpenContact();
                        }
                      }}
                      className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Contact Us
                    </a>
                  </li>
                ) : null}
                {onOpenPrivacy ? (
                  <li>
                    <a
                      href="/privacy"
                      onClick={(e) => {
                        if (!isModifiedEvent(e)) {
                          e.preventDefault();
                          onOpenPrivacy();
                        }
                      }}
                      className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Privacy Policy
                    </a>
                  </li>
                ) : null}
                {onOpenTerms ? (
                  <li>
                    <a
                      href="/terms"
                      onClick={(e) => {
                        if (!isModifiedEvent(e)) {
                          e.preventDefault();
                          onOpenTerms();
                        }
                      }}
                      className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </a>
                  </li>
                ) : null}
                <li>
                  <a
                    href="mailto:hans.raj.skipq@gmail.com"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <Mail className="size-3.5 text-[#FF6B00]" aria-hidden="true" />
                    <span>hans.raj.skipq@gmail.com</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            <span>© {new Date().getFullYear()} AppAssets Studio. Open-source screenshot tooling.</span>
            <span className="font-mono tabular-nums">iOS 6.9&quot; · iPad 13&quot; · Google Play</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
