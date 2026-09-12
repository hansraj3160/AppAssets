import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Flame,
  Gift,
  Globe,
  Heart,
  Image as ImageIcon,
  Layers,
  MoonIcon,
  Play,
  ShieldCheck,
  Smartphone,
  Star,
  SunIcon,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface LandingPageProps {
  onStartDesigning: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function LandingPage({
  onStartDesigning,
  dark,
  onToggleDark,
}: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<string>("single");
  const [activeShowcaseCategory, setActiveShowcaseCategory] = useState<string>("fitness");

  const faqs = [
    {
      q: "Is AppAssets completely free to use?",
      a: "Yes! AppAssets is open source and completely free for personal and commercial use. You can generate, customize, and export high-resolution screenshots without creating an account or providing a credit card.",
    },
    {
      q: "Which devices and screen resolutions are supported?",
      a: "We support official dimensions required by App Store Connect and Google Play Console, including 6.9\" iPhone 16 Pro Max, 6.5\" iPhone Plus, 13\" iPad Pro, Pixel 10 Pro, and standard Android phone/tablet specs, as well as the 1024×500 Google Play Feature Graphic.",
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
    { title: string; desc: string; badge: string; accent: string }
  > = {
    single: {
      title: "Single Focus Hero",
      desc: "Clean centered device mockup with bold top caption for maximum visual clarity on store search results.",
      badge: "High Conversion",
      accent: "bg-[#FF6B00]",
    },
    duo: {
      title: "Duo Overlap Spread",
      desc: "Two angled, layered phone chassis showing complementary views (e.g. Dashboard + Details).",
      badge: "Feature Pair",
      accent: "bg-[#FF8A00]",
    },
    trio: {
      title: "Trio Storyline Flow",
      desc: "Three stepped devices demonstrating an end-to-end user journey or multi-screen workflow.",
      badge: "Storytelling",
      accent: "bg-[#FFB21A]",
    },
    showcase: {
      title: "Showcase Pro Angle",
      desc: "Dynamic tilted isometric perspective highlighting app depth and modern glassmorphism aesthetics.",
      badge: "Visual Punch",
      accent: "bg-[#FF6B00]",
    },
    panorama: {
      title: "Panoramic Multi-Span",
      desc: "A continuous graphic background that flows seamlessly across adjacent store listing screenshots.",
      badge: "Trending",
      accent: "bg-[#FF8A00]",
    },
  };

  const showcaseItems = [
    {
      id: "fitness",
      name: "Fitness & Health",
      title: "Track Daily Activity",
      subtitle: "Concentric rings & heart-rate pulse monitoring",
      gradient: "from-[#FF6B00] via-[#FF8A00] to-pink-600",
      stats: "8,420 Steps • 640 kcal",
    },
    {
      id: "fintech",
      name: "Fintech & Wealth",
      title: "Smart Portfolio",
      subtitle: "Real-time balance, instant transfers & analytics",
      gradient: "from-emerald-500 via-teal-600 to-cyan-700",
      stats: "$38,450.20 • +18.4%",
    },
    {
      id: "social",
      name: "Social & Chat",
      title: "Team Collaboration",
      subtitle: "Rich messaging, voice clips & live member presence",
      gradient: "from-blue-600 via-indigo-600 to-violet-700",
      stats: "Instant Sync • E2E Safe",
    },
    {
      id: "music",
      name: "Music & Audio",
      title: "Lossless Audio Stream",
      subtitle: "Dynamic visualizers & personalized daily mixes",
      gradient: "from-purple-600 via-fuchsia-600 to-pink-600",
      stats: "Spatial Audio • 320kbps",
    },
    {
      id: "productivity",
      name: "Productivity",
      title: "Effortless Focus",
      subtitle: "Kanban task boards & daily goal streaks",
      gradient: "from-slate-700 via-zinc-800 to-neutral-900",
      stats: "Zero Distractions",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">
      {/* 1. Sticky Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={onStartDesigning}
            className="flex items-center gap-2.5 cursor-pointer group text-left border-none bg-transparent p-0"
          >
            <img
              src="/logo.png"
              alt="AppAssets Logo"
              className="size-8 rounded-lg shadow-xs group-hover:scale-105 transition-transform object-cover"
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
              <span className="text-[10px] text-zinc-500 font-medium mt-0.5">
                Screenshot Automation
              </span>
            </div>
          </button>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
            <a
              href="#audit"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Store Audit
            </a>
            <a
              href="#faq"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleDark}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="size-8.5 rounded-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer shadow-2xs"
            >
              {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </Button>

            <Button
              type="button"
              onClick={onStartDesigning}
              className="h-8.5 px-4 rounded-full font-semibold text-xs bg-[#FF6B00] hover:bg-[#FF8A00] text-white shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
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

        <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
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
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-zinc-900 dark:text-white">
                App Screenshot Generator for App Store & Google Play
              </h1>

              {/* Subtitle */}
              <p className="mt-5 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                AppAssets is a professional browser-based editor for creating
                App Store, Google Play, and web screenshots, device mockups, and app icons in minutes.
              </p>

              <h2 className="mt-4 text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-300">
                Create Professional iOS and Android App Screenshots in Minutes
              </h2>

              {/* CTA Button Group with signature brand gradient */}
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button
                  type="button"
                  onClick={onStartDesigning}
                  className="h-13 px-8 rounded-full font-semibold text-base bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] text-white hover:opacity-95 shadow-lg shadow-[#FF6B00]/25 hover:shadow-xl hover:shadow-[#FF6B00]/35 hover:scale-102 transition-all active:scale-98 cursor-pointer flex items-center gap-2"
                >
                  <span>Start Designing</span>
                  <ArrowRight className="size-4.5" />
                </Button>

                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Start with free templates;</span>
                  <br />
                  <span>no account required.</span>
                </div>
              </div>

              {/* Feature Checkmarks */}
              <div className="mt-8 pt-6 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
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

            {/* Right Column: 3D Floating Screenshots Fan (Rich Colorful Mockups) */}
            <div className="relative h-[440px] sm:h-[480px] lg:h-[520px] flex items-center justify-center [perspective:1000px]">
              {/* Phone 1 (Left -8deg: Fitness App) */}
              <button
                type="button"
                onClick={onStartDesigning}
                aria-label="Fitness app template"
                className="absolute w-[140px] sm:w-[165px] lg:w-[185px] aspect-[9/19.5] rounded-[28px] p-1.5 bg-zinc-900 border-2 border-zinc-700/80 shadow-2xl transition-transform duration-300 hover:scale-105 hover:z-30 cursor-pointer text-left overflow-hidden group"
                style={{
                  left: "2%",
                  transform: "rotate(-8deg) translateY(18px)",
                  zIndex: 10,
                }}
              >
                <div className="size-full rounded-[22px] bg-gradient-to-b from-[#FF6B00] via-[#FF8A00] to-rose-600 p-2.5 text-white flex flex-col justify-between overflow-hidden relative">
                  <div className="w-10 h-2 mx-auto bg-black/50 rounded-full mb-1" />
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                      Activity
                    </div>
                    <div className="text-xs font-extrabold leading-tight mt-0.5">
                      Daily Goals
                    </div>
                  </div>
                  <div className="my-auto space-y-1.5 bg-black/25 backdrop-blur-xs rounded-xl p-2 border border-white/20">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="flex items-center gap-1">
                        <Flame className="size-3 text-[#FFB21A]" />
                        Move
                      </span>
                      <span>540 kcal</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-[#FFB21A] rounded-full" />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold pt-1">
                      <span className="flex items-center gap-1">
                        <Activity className="size-3 text-emerald-300" />
                        Exercise
                      </span>
                      <span>42 min</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="w-4/5 h-full bg-emerald-300 rounded-full" />
                    </div>
                  </div>
                  <div className="text-[8px] font-bold text-center bg-white text-zinc-950 py-1 rounded-lg shadow-xs">
                    Log Workout
                  </div>
                </div>
              </button>

              {/* Phone 2 (Mid-Left -4deg: Sports / Running App) */}
              <button
                type="button"
                onClick={onStartDesigning}
                aria-label="Sports app template"
                className="absolute w-[145px] sm:w-[170px] lg:w-[190px] aspect-[9/19.5] rounded-[28px] p-1.5 bg-zinc-900 border-2 border-zinc-700/80 shadow-2xl transition-transform duration-300 hover:scale-105 hover:z-30 cursor-pointer text-left overflow-hidden group"
                style={{
                  left: "17%",
                  transform: "rotate(-4deg) translateY(8px)",
                  zIndex: 15,
                }}
              >
                <div className="size-full rounded-[22px] bg-gradient-to-b from-blue-600 via-indigo-600 to-violet-700 p-2.5 text-white flex flex-col justify-between overflow-hidden relative">
                  <div className="w-10 h-2 mx-auto bg-black/50 rounded-full mb-1" />
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                      Running
                    </div>
                    <div className="text-xs font-extrabold leading-tight mt-0.5">
                      GPS Tracking
                    </div>
                  </div>
                  <div className="my-auto bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/20 text-center space-y-1">
                    <div className="text-[10px] opacity-80">Total Distance</div>
                    <div className="text-base font-extrabold leading-none">6.84 km</div>
                    <div className="text-[9px] text-cyan-300 font-semibold">Pace 5'18" /km</div>
                  </div>
                  <div className="flex justify-between items-center text-[8px] bg-white/15 rounded-lg p-1 px-2 border border-white/20">
                    <span>Elevation</span>
                    <span className="font-bold">+184 m</span>
                  </div>
                </div>
              </button>

              {/* Phone 3 (Center Hero 0deg: AppAssets Pro Studio with brand colors) */}
              <button
                type="button"
                onClick={onStartDesigning}
                aria-label="AppAssets Studio featured template"
                className="absolute w-[160px] sm:w-[190px] lg:w-[210px] aspect-[9/19.5] rounded-[32px] p-2 bg-zinc-950 border-2 border-zinc-600 shadow-2xl transition-transform duration-300 hover:scale-105 cursor-pointer text-left overflow-hidden group ring-2 ring-[#FF6B00]/20"
                style={{
                  left: "50%",
                  transform: "translateX(-50%) translateY(-10px)",
                  zIndex: 25,
                }}
              >
                <div className="size-full rounded-[24px] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-3 text-white flex flex-col justify-between overflow-hidden relative">
                  {/* Top Bar with Island */}
                  <div className="w-12 h-2.5 mx-auto bg-zinc-800 rounded-full mb-1" />
                  <div className="text-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider bg-[#FF6B00]/20 text-[#FF8A00] border border-[#FF6B00]/30 px-2 py-0.5 rounded-full inline-block">
                      Featured App
                    </span>
                    <div className="text-sm font-extrabold text-white mt-1">
                      AppAssets Pro
                    </div>
                  </div>

                  {/* App Icon Card */}
                  <div className="my-auto bg-zinc-800/80 rounded-2xl p-2.5 border border-zinc-700/80 text-center space-y-1.5 shadow-md">
                    <img
                      src="/logo.png"
                      alt="AppAssets"
                      className="size-10 rounded-xl mx-auto shadow-md object-cover ring-2 ring-[#FF6B00]/40"
                    />
                    <div className="text-[11px] font-bold text-white">App Store Ready</div>
                    <div className="text-[8px] text-zinc-400 flex items-center justify-center gap-1">
                      <Star className="size-2.5 text-[#FFB21A] fill-[#FFB21A]" />
                      <span>4.9 • 100% Audit Pass</span>
                    </div>
                  </div>

                  <div className="h-7 text-[9px] rounded-xl bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-bold flex items-center justify-center transition-colors shadow-xs">
                    Start Designing
                  </div>
                </div>
              </button>

              {/* Phone 4 (Mid-Right 4deg: Fintech / Wealth App) */}
              <button
                type="button"
                onClick={onStartDesigning}
                aria-label="Fintech app template"
                className="absolute w-[145px] sm:w-[170px] lg:w-[190px] aspect-[9/19.5] rounded-[28px] p-1.5 bg-zinc-900 border-2 border-zinc-700/80 shadow-2xl transition-transform duration-300 hover:scale-105 hover:z-30 cursor-pointer text-left overflow-hidden group"
                style={{
                  right: "17%",
                  transform: "rotate(4deg) translateY(8px)",
                  zIndex: 15,
                }}
              >
                <div className="size-full rounded-[22px] bg-gradient-to-b from-emerald-600 via-teal-700 to-cyan-800 p-2.5 text-white flex flex-col justify-between overflow-hidden relative">
                  <div className="w-10 h-2 mx-auto bg-black/50 rounded-full mb-1" />
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                      Fintech
                    </div>
                    <div className="text-xs font-extrabold leading-tight mt-0.5">
                      Smart Wallet
                    </div>
                  </div>
                  <div className="my-auto bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/20 space-y-1">
                    <div className="text-[8px] opacity-80">Total Balance</div>
                    <div className="text-xs font-extrabold text-white leading-tight">
                      $48,920.00
                    </div>
                    <div className="text-[8px] text-emerald-300 font-bold">
                      +14.2% this month
                    </div>
                  </div>
                  <div className="text-[8px] bg-white/15 rounded-lg py-1 text-center font-semibold border border-white/20">
                    Instant Transfer
                  </div>
                </div>
              </button>

              {/* Phone 5 (Right 8deg: Music Streaming App) */}
              <button
                type="button"
                onClick={onStartDesigning}
                aria-label="Music app template"
                className="absolute w-[140px] sm:w-[165px] lg:w-[185px] aspect-[9/19.5] rounded-[28px] p-1.5 bg-zinc-900 border-2 border-zinc-700/80 shadow-2xl transition-transform duration-300 hover:scale-105 hover:z-30 cursor-pointer text-left overflow-hidden group"
                style={{
                  right: "2%",
                  transform: "rotate(8deg) translateY(18px)",
                  zIndex: 10,
                }}
              >
                <div className="size-full rounded-[22px] bg-gradient-to-b from-purple-600 via-fuchsia-600 to-pink-600 p-2.5 text-white flex flex-col justify-between overflow-hidden relative">
                  <div className="w-10 h-2 mx-auto bg-black/50 rounded-full mb-1" />
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                      Now Playing
                    </div>
                    <div className="text-xs font-extrabold leading-tight mt-0.5">
                      Neon Beats
                    </div>
                  </div>
                  <div className="my-auto bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/20 space-y-1.5">
                    <div className="size-9 rounded-lg bg-white/20 mx-auto flex items-center justify-center">
                      <Play className="size-4 text-white fill-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] font-bold">Midnight Echo</div>
                      <div className="text-[7px] opacity-75">Solaris • Album</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] bg-white/15 rounded-lg p-1 px-2 border border-white/20">
                    <Heart className="size-2.5 text-pink-300 fill-pink-300" />
                    <span className="font-bold">Lossless HD</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Social Proof / Testimonial Quote */}
      <section className="py-16 lg:py-20 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800 text-center px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] dark:text-[#FF8A00] bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 px-3 py-1 rounded-full mb-5">
            <Star className="size-3.5 fill-[#FFB21A] text-[#FFB21A]" />
            <span>Loved by Indie Developers on Product Hunt & GitHub</span>
          </div>
          <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            &ldquo;For the first time, I didn't dread making store screenshots.
            I finished a polished set in one sitting.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-1 text-[#FFB21A]">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={`rating-star-${star}`} className="size-4 fill-[#FFB21A] text-[#FFB21A]" />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Showcase Section ("Showcase for Every App Category") */}
      <section id="showcase" className="py-20 lg:py-28 bg-white dark:bg-black px-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00]">
              SHOWCASE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-zinc-900 dark:text-white">
              Beautiful Screenshots for Every App Category
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              See how modern apps present their features. Select any category to jump straight into designing.
            </p>

            {/* Category Selector Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {showcaseItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveShowcaseCategory(item.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeShowcaseCategory === item.id
                      ? "bg-[#FF6B00] text-white shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Category Display Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {showcaseItems.map((cat) => {
              const isSelected = activeShowcaseCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? "bg-zinc-50 dark:bg-zinc-900/90 border-[#FF6B00]/60 dark:border-[#FF6B00]/70 shadow-md scale-102 ring-2 ring-[#FF6B00]/20"
                      : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {cat.name}
                    </span>
                    <h3 className="text-xl font-bold mt-1 text-zinc-900 dark:text-white">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                      {cat.subtitle}
                    </p>
                  </div>

                  {/* Visual Card Preview */}
                  <div className={`mt-6 h-48 rounded-2xl bg-gradient-to-br ${cat.gradient} p-4 text-white flex flex-col justify-between shadow-inner relative overflow-hidden`}>
                    <div className="flex justify-between items-center text-[10px] font-semibold opacity-90">
                      <span>9:41</span>
                      <span>5G 100%</span>
                    </div>
                    <div className="my-auto space-y-1">
                      <div className="text-base font-extrabold">{cat.title}</div>
                      <div className="text-xs opacity-90 font-medium">{cat.stats}</div>
                    </div>
                    <button
                      type="button"
                      onClick={onStartDesigning}
                      className="h-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/20"
                    >
                      <span>Design This Style</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Bento Grid Features Section ("Everything You Need to Create Stunning Screenshots") */}
      <section id="features" className="py-20 lg:py-28 bg-zinc-50 dark:bg-zinc-950 px-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00]">
              FEATURES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-zinc-900 dark:text-white">
              Everything You Need to Create Stunning Screenshots
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              No design skills needed. From raw screenshots to fully compliant store packages in seconds.
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
                  Run directly in your browser without installing heavy design software.
                  All hardware frame compositing, background rendering, and packaging
                  execute natively on your machine with total privacy.
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
                  Real-time validation against 11 Apple & Google Play review criteria.
                  Catches missing sizes, transparent icons, and WCAG contrast issues.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Prevents App Store Rejection
              </div>
            </div>

            {/* Feature 3: Automated Copywriter */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="size-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <Wand2 className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Smart Copy Generation
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  Tailor high-converting headlines and subheads to your app category
                  with 1 click. Never struggle with marketing captions again.
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
                  Instantly outputs the mandatory Google Play promo graphic and App Store
                  promo banner with customizable focal points and hardware bezels.
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
                  Exports cleanly organized folders (`AppStore/`, `GooglePlay/`, `Favicon Kit`)
                  with exact naming conventions and an upload guide.
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
      <section id="templates" className="py-20 lg:py-28 bg-white dark:bg-black px-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00]">
              TEMPLATES & LAYOUTS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-zinc-900 dark:text-white">
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
          <div className="max-w-4xl mx-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-8 sm:p-12 shadow-xs flex flex-col md:flex-row items-center justify-between gap-10">
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
                  onClick={onStartDesigning}
                  className="h-10 px-5 rounded-full text-xs font-semibold bg-[#FF6B00] hover:bg-[#FF8A00] text-white cursor-pointer flex items-center gap-2 shadow-xs transition-all active:scale-95"
                >
                  <span>Use This Layout in Studio</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Visual Mini Mockup in Selected Layout */}
            <div className="w-72 h-56 rounded-2xl bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-sm">
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
          </div>
        </div>
      </section>

      {/* 7. Store Pre-Flight Audit Section */}
      <section id="audit" className="py-20 lg:py-28 bg-zinc-50 dark:bg-zinc-950 px-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-12 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00] flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                STORE COMPLIANCE GUARANTEE
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Zero Rejections with Built-in Store Audit
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Both Apple App Store and Google Play have strict listing requirements.
                AppAssets audits your screenshots and app icon in real time, scoring
                them from 0% to 100% store-readiness with 1-click fixes for missing
                screens, transparent icons, or contrast issues.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={onStartDesigning}
                  className="h-10 px-5 rounded-full font-semibold text-xs bg-[#FF6B00] hover:bg-[#FF8A00] text-white cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  Audit Your Store Listing
                </Button>
              </div>
            </div>

            {/* Checklist Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6 space-y-3 shadow-2xs text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>Pre-Flight Store Checklist</span>
                </div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-[11px]">
                  100% Store Ready
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300">iPhone 6.9" Required Captures</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Passed (4+)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300">Google Play 512×512 Opaque Icon</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verified</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300">Apple 1024×1024 Master Icon</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verified</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300">WCAG Text Contrast Ratio</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Passed (4.5:1)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section (Clean Accordion) */}
      <section id="faq" className="py-20 lg:py-28 bg-white dark:bg-black px-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] dark:text-[#FF8A00]">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-zinc-900 dark:text-white">
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
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 transition-colors"
                >
                  <span>{f.q}</span>
                  <ChevronDown
                    className={`size-4 text-zinc-500 shrink-0 transition-transform duration-200 ${
                      activeFaq === i ? "rotate-180 text-zinc-900 dark:text-white" : ""
                    }`}
                  />
                </button>
                {activeFaq === i ? (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/60 dark:border-zinc-800/60">
                    {f.a}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final Call to Action Banner with signature brand gradient */}
      <section className="py-20 lg:py-28 bg-zinc-50 dark:bg-zinc-950 px-6">
        <div className="max-w-5xl mx-auto rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 sm:p-16 text-center shadow-md relative overflow-hidden">
          {/* Soft Orange ambient corner glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Ready to Upgrade Your App Store Presence?
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
              Create professional, submission-ready screenshots for iOS and Android
              in minutes with zero design friction.
            </p>
            <div className="pt-4 flex justify-center">
              <Button
                type="button"
                onClick={onStartDesigning}
                className="h-13 px-8 rounded-full font-semibold text-base bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] text-white hover:opacity-95 shadow-lg shadow-[#FF6B00]/25 hover:shadow-xl hover:shadow-[#FF6B00]/35 hover:scale-102 transition-all active:scale-98 cursor-pointer flex items-center gap-2"
              >
                <span>Start Designing Now — It's Free</span>
                <ArrowRight className="size-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-black py-10 px-6 mt-auto text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="size-5 rounded-md object-cover" />
            <span className="font-bold text-zinc-900 dark:text-white">
              App<span className="text-[#FF6B00]">Assets</span> Studio
            </span>
            <span>•</span>
            <span>App Store & Google Play Screenshot Automation</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/hansraj3160/AppAssets"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="size-3" />
            </a>
            <span>MIT License</span>
            <button
              type="button"
              onClick={onStartDesigning}
              className="text-[#FF6B00] hover:underline cursor-pointer font-semibold"
            >
              Open Studio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
