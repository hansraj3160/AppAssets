import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Gift,
  Globe,
  Image as ImageIcon,
  Layers,
  Mail,
  MoonIcon,
  ShieldCheck,
  Smartphone,
  Star,
  SunIcon,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import duoOverlapImg from "@/assets/duo_overlap.png";
import heroImage from "@/assets/hero_section.png";
import appLogo from "@/assets/logo.png";
import panoramicImg from "@/assets/panoromic_multi_span.png";
import showcaseImg from "@/assets/show_case_img.png";
import singleFocusHeroImg from "@/assets/single_focus_hero.png";
import trioStoryImg from "@/assets/trio_story.png";
import { isModifiedEvent } from "@/lib/utils";
import type { ShowcaseCategory } from "@/lib/showcaseCategories";
import { CategoryShowcase } from "./CategoryShowcase";
import { RealSamplesShowcase } from "./RealSamplesShowcase";
import { Button } from "./ui/button";

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
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<string>("single");

  const faqs = [
    {
      q: "Is AppAssets completely free to use?",
      a: "Yes! AppAssets is open source and completely free for personal and commercial use. You can generate, customize, and export high-resolution screenshots without creating an account or providing a credit card.",
    },
    {
      q: "Which devices and screen resolutions are supported?",
      a: 'We support official dimensions required by App Store Connect and Google Play Console, including 6.9" iPhone 16 Pro Max, 6.5" iPhone Plus, 13" iPad Pro, Pixel 10 Pro, and standard Android phone/tablet specs, as well as the 1024×500 Google Play Feature Graphic.',
    },
    {
      q: "Are my app screenshots and private data safe?",
      a: "100% private. All screenshot rendering, hardware frame compositing, and image transformations happen right inside your browser and local machine. Your screenshots and branding assets never leave your computer.",
    },
    {
      q: "How does the Store Pre-Flight Audit work?",
      a: "The built-in audit engine validates your screenshot collection against 11 real Apple App Store and Google Play Store review guidelines—checking for minimum screenshot count, required device sizes, opaque background icons, and WCAG text contrast to prevent store rejection.",
    },
    {
      q: "How are the final files exported?",
      a: "With a single click on 'Export All (.ZIP)', AppAssets generates a cleanly organized archive containing separate 'AppStore/' and 'GooglePlay/' directories formatted to store specifications, plus a comprehensive STORE_GUIDE.txt.",
    },
  ];

  const templatePreviews: Record<
    string,
    { title: string; desc: string; badge: string; accent: string; image?: string }
  > = {
    single: {
      title: "Single Focus Hero",
      desc: "Clean centered device mockup with bold top caption for maximum visual clarity on store search results.",
      badge: "High Conversion",
      accent: "bg-[#FF6B00]",
      image: singleFocusHeroImg,
    },
    duo: {
      title: "Duo Overlap Spread",
      desc: "Two angled, layered phone chassis showing complementary views (e.g. Dashboard + Details).",
      badge: "Feature Pair",
      accent: "bg-[#FF8A00]",
      image: duoOverlapImg,
    },
    trio: {
      title: "Trio Storyline Flow",
      desc: "Three stepped devices demonstrating an end-to-end user journey or multi-screen workflow.",
      badge: "Storytelling",
      accent: "bg-[#FFB21A]",
      image: trioStoryImg,
    },
    showcase: {
      title: "Showcase Pro Angle",
      desc: "Dynamic tilted isometric perspective highlighting app depth and modern glassmorphism aesthetics.",
      badge: "Visual Punch",
      accent: "bg-[#FF6B00]",
      image: showcaseImg,
    },
    panorama: {
      title: "Panoramic Multi-Span",
      desc: "A continuous graphic background that flows seamlessly across adjacent store listing screenshots.",
      badge: "Trending",
      accent: "bg-[#FF8A00]",
      image: panoramicImg,
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-[#FF6B00]/20 selection:text-[#FF6B00] overflow-x-hidden w-full max-w-full">
      {/* 1. Sticky Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-black/85 backdrop-blur-md px-3.5 sm:px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => onStartDesigning()}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group text-left border-none bg-transparent p-0 shrink-0"
          >
            <img
              src={appLogo}
              alt="AppAssets Logo"
              className="size-7.5 sm:size-8 rounded-lg shadow-xs group-hover:scale-105 transition-transform object-cover"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  App<span className="text-[#FF6B00]">Assets</span>
                </span>
                <span className="text-[10px] font-semibold bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 text-[#FF6B00] dark:text-[#FF8A00] px-1.5 py-0.5 rounded-md border border-[#FF6B00]/20">
                  Studio
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium mt-0.5 hidden xs:inline">
                Screenshot Automation
              </span>
            </div>
          </button>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a
              href="#showcase"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Showcase
            </a>
            <a
              href="#features"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#templates"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Templates
            </a>
            {onOpenGuidelines && (
              <a
                href="/guidelines"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenGuidelines();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Guidelines
              </a>
            )}
            {onOpenAbout && (
              <a
                href="/about"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenAbout();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                About
              </a>
            )}
            {onOpenContact && (
              <a
                href="/contact"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenContact();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Contact
              </a>
            )}
            <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleDark}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="size-8 sm:size-8.5 rounded-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer shadow-2xs shrink-0"
            >
              {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </Button>

            <Button
              type="button"
              onClick={() => onStartDesigning()}
              className="h-8 sm:h-8.5 px-3 sm:px-4 rounded-full font-semibold text-xs bg-[#FF6B00] hover:bg-[#FF8A00] text-white shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Start Designing</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Two-Column Layout inspired by appscreenshots.net with brand accents) */}
      <section className="relative bg-white dark:bg-black text-zinc-900 dark:text-white overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
        {/* Subtle Brand Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-50/80 via-white to-white dark:from-zinc-950/80 dark:via-black dark:to-black pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#FF6B00]/10 dark:from-[#FF6B00]/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            {/* Left Column: Headline, Copy & CTA */}
            <div className="text-left">
              {/* Badges */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 border border-[#FF6B00]/25 px-3.5 py-1.5 text-xs font-medium text-[#FF6B00] dark:text-[#FF8A00] shadow-2xs">
                  <Gift className="size-3.5 text-[#FF6B00] dark:text-[#FF8A00]" />
                  <span>Free plan available</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs">
                  <Globe className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>All Platforms (iOS & Android)</span>
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-zinc-900 dark:text-white break-words">
                App Screenshot Generator for App Store & Google Play
              </h1>

              {/* Subtitle */}
              <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                AppAssets is a professional browser-based editor for creating App Store, Google
                Play, and web screenshots, device mockups, and app icons in minutes.
              </p>

              <h2 className="mt-3 sm:mt-4 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                Create Professional iOS and Android App Screenshots in Minutes
              </h2>

              {/* CTA Button Group with signature brand gradient */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button
                  type="button"
                  onClick={() => onStartDesigning()}
                  className="h-12 sm:h-13 px-7 sm:px-8 rounded-full font-semibold text-sm sm:text-base bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] text-white hover:opacity-95 shadow-lg shadow-[#FF6B00]/25 hover:shadow-xl hover:shadow-[#FF6B00]/35 hover:scale-102 transition-all active:scale-98 cursor-pointer flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <span>Start Designing</span>
                  <ArrowRight className="size-4.5" />
                </Button>

                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Start with free templates;</span>
                  <br className="hidden sm:inline" />
                  <span> no account required.</span>
                </div>
              </div>

              {/* Feature Checkmarks */}
              <div className="mt-6 sm:mt-8 pt-6 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-wrap items-center gap-y-2 gap-x-5 sm:gap-x-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-[#FF6B00] stroke-[2.5]" />
                  6.9" iPhone 16 Pro & iPad 13"
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-[#FF6B00] stroke-[2.5]" />
                  Google Play 1024×500 Graphic
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-[#FF6B00] stroke-[2.5]" />
                  Pre-Flight Store Compliance Audit
                </span>
              </div>
            </div>

            {/* Right Column: 3D Floating Screenshots Graphic */}
            <div className="relative flex items-center justify-center lg:justify-end overflow-hidden w-full">
              <button
                type="button"
                className="relative w-full max-w-2xl group cursor-pointer border-none bg-transparent p-0 text-left"
                onClick={() => onStartDesigning()}
                title="Click to start designing in AppAssets Studio"
                aria-label="Start designing in AppAssets Studio"
              >
                {/* Ambient glow effect behind the phones */}
                <div
                  className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#FF6B00]/20 via-[#FF8A00]/15 to-transparent blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
                  aria-hidden="true"
                />

                <img
                  src={heroImage}
                  alt="AppAssets Studio - Professional App Store and Google Play Screenshots"
                  className="relative w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02] drop-shadow-2xl select-none"
                  loading="eager"
                  decoding="async"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Social Proof / Testimonial Quote */}
      <section className="py-12 sm:py-16 lg:py-20 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800 text-center px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] dark:text-[#FF8A00] bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 px-3 py-1 rounded-full mb-5">
            <Star className="size-3.5 fill-[#FFB21A] text-[#FFB21A]" />
            <span>Loved by Indie Developers on Product Hunt & GitHub</span>
          </div>
          <blockquote className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            &ldquo;For the first time, I didn't dread making store screenshots. I finished a
            polished set in one sitting.&rdquo;
          </blockquote>
          <div className="mt-5 sm:mt-6 flex items-center justify-center gap-1 text-[#FFB21A]">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={`rating-star-${star}`} className="size-4 fill-[#FFB21A] text-[#FFB21A]" />
            ))}
          </div>
        </div>
      </section>

      {/* 3.5 Real Sample Screenshots Created with AppAssets Studio */}
      <RealSamplesShowcase onStartDesigning={() => onStartDesigning()} />

      {/* 4. Showcase Section ("Category Showcase") */}
      <CategoryShowcase onDesignStyle={(style) => onStartDesigning(style)} />

      {/* 5. Bento Grid Features Section ("Everything You Need to Create Stunning Screenshots") */}
      <section
        id="features"
        className="py-16 sm:py-20 lg:py-28 bg-zinc-50 dark:bg-zinc-950 px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00]">
              FEATURES
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mt-2 text-zinc-900 dark:text-white">
              Everything You Need to Create Stunning Screenshots
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              No design skills needed. From raw screenshots to fully compliant store packages in
              seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Large Span (In-Browser & Privacy) */}
            <div className="md:col-span-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="size-10 rounded-xl bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 border border-[#FF6B00]/25 flex items-center justify-center text-[#FF6B00] dark:text-[#FF8A00] mb-4">
                  <Smartphone className="size-5" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Design Anytime Anywhere — 100% In-Browser
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed max-w-xl">
                  Run directly in your browser without installing heavy design software. All
                  hardware frame compositing, background rendering, and packaging execute natively
                  on your machine with total privacy.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-[#FF6B00]" />
                  iPhone 16 Pro Max (6.9")
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-[#FF6B00]" />
                  iPad Pro 13" M4 Display
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-[#FF6B00]" />
                  Google Pixel 10 Pro
                </span>
              </div>
            </div>

            {/* Feature 2: Pre-Flight Store Audit */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="size-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Pre-Flight Store Audit
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  Real-time validation against 11 Apple & Google Play review criteria. Catches
                  missing sizes, transparent icons, and WCAG contrast issues.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Prevents App Store Rejection
              </div>
            </div>

            {/* Feature 3: Automated Copywriter */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="size-10 rounded-xl bg-[#FFB21A]/10 dark:bg-[#FFB21A]/15 border border-[#FFB21A]/25 flex items-center justify-center text-[#FFB21A] mb-4">
                  <Wand2 className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Smart Copy Generation
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  Tailor high-converting headlines and subheads to your app category with 1 click.
                  Never struggle with marketing captions again.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-500">
                ⚡ Category-Optimized Hooks
              </div>
            </div>

            {/* Feature 4: Google Play Feature Graphic */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="size-10 rounded-xl bg-[#FF8A00]/10 dark:bg-[#FF8A00]/15 border border-[#FF8A00]/25 flex items-center justify-center text-[#FF8A00] mb-4">
                  <ImageIcon className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  1024×500 Feature Graphic
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  Instantly outputs the mandatory Google Play promo graphic and App Store promo
                  banner with customizable focal points and hardware bezels.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-[#FF6B00]">
                ★ 100% Play Store Compliant
              </div>
            </div>

            {/* Feature 5: 1-Click ZIP Packaging */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="size-10 rounded-xl bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
                  <Layers className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  1-Click Formatted ZIP
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  Exports cleanly organized folders (`AppStore/`, `GooglePlay/`, `Favicon Kit`) with
                  exact naming conventions and an upload guide.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Ready for Console Upload
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Layout Templates Showcase */}
      <section
        id="templates"
        className="py-16 sm:py-20 lg:py-28 bg-white dark:bg-black px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00]">
              TEMPLATES & LAYOUTS
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mt-2 text-zinc-900 dark:text-white">
              5 High-Converting Layout Sequences
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Pick from industry-standard layouts designed to maximize App Store conversion rates.
            </p>

            {/* Layout Tab Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {Object.entries(templatePreviews).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTemplateTab(key)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedTemplateTab === key
                      ? "bg-[#FF6B00] text-white shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* Active Template Card */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-5 sm:p-10 lg:p-12 shadow-xs flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-10">
            <div className="space-y-4 max-w-md">
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] dark:bg-[#FF6B00]/20 dark:text-[#FF8A00] border border-[#FF6B00]/30 shadow-2xs">
                {templatePreviews[selectedTemplateTab]?.badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                {templatePreviews[selectedTemplateTab]?.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {templatePreviews[selectedTemplateTab]?.desc}
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => onStartDesigning()}
                  className="h-10 px-5 rounded-full text-xs font-semibold bg-[#FF6B00] hover:bg-[#FF8A00] text-white cursor-pointer flex items-center gap-2 shadow-xs transition-all active:scale-95"
                >
                  <span>Use This Layout in Studio</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Visual Mockup in Selected Layout */}
            {templatePreviews[selectedTemplateTab]?.image ? (
              <button
                type="button"
                onClick={() => onStartDesigning()}
                aria-label={`Open ${templatePreviews[selectedTemplateTab]?.title} template in Studio`}
                className="w-full md:w-1/2 max-w-[420px] h-64 sm:h-72 md:h-80 rounded-2xl bg-white border border-zinc-200 dark:border-zinc-700/60 p-3 shadow-md flex items-center justify-center relative overflow-hidden group cursor-pointer transition-all hover:border-[#FF6B00]/50 hover:shadow-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
              >
                <img
                  src={templatePreviews[selectedTemplateTab]?.image}
                  alt={templatePreviews[selectedTemplateTab]?.title}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
                  loading="lazy"
                />
              </button>
            ) : (
              <div className="w-72 h-56 sm:w-80 sm:h-72 rounded-2xl bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="w-36 h-48 rounded-2xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-700 shadow-xl p-3 flex flex-col justify-between text-white text-[9px] font-bold">
                  <div className="w-10 h-2 bg-zinc-800 rounded-full mx-auto" />
                  <div className="text-center font-bold leading-tight text-white">
                    {templatePreviews[selectedTemplateTab]?.title}
                  </div>
                  <div className="bg-[#FF6B00]/20 text-[#FF8A00] rounded-lg p-2 text-[8px] text-center font-bold border border-[#FF6B00]/30">
                    AppAssets Layout
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. Store Pre-Flight Audit Section */}
      <section
        id="audit"
        className="py-16 sm:py-20 lg:py-28 bg-zinc-50 dark:bg-zinc-950 px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800"
      >
        <div className="max-w-5xl mx-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-10 lg:p-12 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00] flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                STORE COMPLIANCE GUARANTEE
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Zero Rejections with Built-in Store Audit
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Both Apple App Store and Google Play have strict listing requirements. AppAssets
                audits your screenshots and app icon in real time, scoring them from 0% to 100%
                store-readiness with 1-click fixes for missing screens, transparent icons, or
                contrast issues.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => onStartDesigning()}
                  className="h-10 px-5 rounded-full font-semibold text-xs bg-[#FF6B00] hover:bg-[#FF8A00] text-white cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  Audit Your Store Listing
                </Button>
              </div>
            </div>

            {/* Checklist Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 space-y-3 shadow-2xs text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 gap-2">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">Pre-Flight Store Checklist</span>
                </div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] shrink-0">
                  100% Store Ready
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 text-[11px] sm:text-xs">
                    iPhone 6.9" Required Captures
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] sm:text-xs shrink-0">
                    Passed (4+)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 text-[11px] sm:text-xs">
                    Google Play 512×512 Opaque Icon
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] sm:text-xs shrink-0">
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 text-[11px] sm:text-xs">
                    Apple 1024×1024 Master Icon
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] sm:text-xs shrink-0">
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 text-[11px] sm:text-xs">
                    WCAG Text Contrast Ratio
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] sm:text-xs shrink-0">
                    Passed (4.5:1)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section (Clean Accordion) */}
      <section
        id="faq"
        className="py-16 sm:py-20 lg:py-28 bg-white dark:bg-black px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00]">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mt-2 text-zinc-900 dark:text-white">
              Got Questions? We've Got Answers
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div
                key={f.q}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 transition-colors"
                >
                  <span>{f.q}</span>
                  <ChevronDown
                    className={`size-4 text-zinc-500 shrink-0 transition-transform duration-200 ${
                      activeFaq === i ? "rotate-180 text-zinc-900 dark:text-white" : ""
                    }`}
                  />
                </button>
                {activeFaq === i ? (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/60 dark:border-zinc-800/60">
                    {f.a}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final Call to Action Banner with signature brand gradient */}
      <section className="py-16 sm:py-20 lg:py-28 bg-zinc-50 dark:bg-zinc-950 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-12 lg:p-16 text-center shadow-md relative overflow-hidden">
          {/* Soft Orange ambient corner glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Ready to Upgrade Your App Store Presence?
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm lg:text-base leading-relaxed">
              Create professional, submission-ready screenshots for iOS and Android in minutes with
              zero design friction.
            </p>
            <div className="pt-3 sm:pt-4 flex justify-center">
              <Button
                type="button"
                onClick={() => onStartDesigning()}
                className="h-12 sm:h-13 px-6 sm:px-8 rounded-full font-semibold text-sm sm:text-base bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] text-white hover:opacity-95 shadow-lg shadow-[#FF6B00]/25 hover:shadow-xl hover:shadow-[#FF6B00]/35 hover:scale-102 transition-all active:scale-98 cursor-pointer flex items-center gap-2"
              >
                <span>Start Designing Now — It's Free</span>
                <ArrowRight className="size-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-black py-10 px-4 sm:px-6 mt-auto text-xs text-zinc-500 overflow-hidden w-full">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Brand & Tagline */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-2.5">
            <img src={appLogo} alt="" className="size-5 rounded-md object-cover shrink-0" />
            <span className="font-bold text-zinc-900 dark:text-white">
              App<span className="text-[#FF6B00]">Assets</span> Studio
            </span>
            <span className="hidden sm:inline text-zinc-400">•</span>
            <span className="text-[11px] sm:text-xs text-zinc-500">
              App Store & Google Play Screenshot Automation
            </span>
          </div>

          {/* Links Row / Grid */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-2.5 text-[11px] sm:text-xs">
            {onOpenAbout && (
              <a
                href="/about"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenAbout();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                About Us
              </a>
            )}
            {onOpenContact && (
              <a
                href="/contact"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenContact();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Contact Us
              </a>
            )}
            {onOpenGuidelines && (
              <a
                href="/guidelines"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenGuidelines();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Store Guidelines
              </a>
            )}
            {onOpenPrivacy ? (
              <a
                href="/privacy"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenPrivacy();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Privacy Policy
              </a>
            ) : null}
            {onOpenTerms ? (
              <a
                href="/terms"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onOpenTerms();
                  }
                }}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Terms & Conditions
              </a>
            ) : null}
            <a
              href="mailto:hans.raj.skipq@gmail.com"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Mail className="size-3.5 text-[#FF6B00]" />
              <span>hans.raj.skipq@gmail.com</span>
            </a>
            <a
              href="/studio"
              onClick={(e) => {
                if (!isModifiedEvent(e)) {
                  e.preventDefault();
                  onStartDesigning();
                }
              }}
              className="text-[#FF6B00] hover:underline cursor-pointer font-semibold"
            >
              Open Studio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
