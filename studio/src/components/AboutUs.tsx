import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Heart,
  Mail,
  MoonIcon,
  ShieldCheck,
  Sparkles,
  SunIcon,
  Zap,
} from "lucide-react";
import { isModifiedEvent } from "@/lib/utils";
import { Button } from "./ui/button";

const appLogo = "/favicon.svg";

interface AboutUsProps {
  onNavigateHome: () => void;
  onNavigateContact?: () => void;
  onNavigateGuidelines?: () => void;
  onStartDesigning: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function AboutUs({
  onNavigateHome,
  onNavigateContact,
  onNavigateGuidelines,
  onStartDesigning,
  dark,
  onToggleDark,
}: AboutUsProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="/"
            onClick={(e) => {
              if (!isModifiedEvent(e)) {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer group text-left border-none bg-transparent p-0"
            aria-label="AppAssets Studio Home"
          >
            <img
              src={appLogo}
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
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                About Us & Editorial Mission
              </span>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleDark}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="size-9 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
            >
              {dark ? (
                <SunIcon className="size-4 text-amber-400" />
              ) : (
                <MoonIcon className="size-4 text-zinc-600" />
              )}
            </Button>

            <Button
              type="button"
              onClick={onStartDesigning}
              className="bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Open Studio
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full">
        {/* Breadcrumb / Back button */}
        <div className="mb-8">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </button>
        </div>

        {/* Hero title */}
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF6B00]/10 text-[#FF6B00] dark:text-[#FF8A00] border border-[#FF6B00]/20">
            <Sparkles className="size-3.5" />
            <span>Developer Story & Mission</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            About AppAssets Studio
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Empowering mobile developers, indie creators, and product teams to automate
            submission-ready store assets with pixel perfection, uncompromising privacy, and zero
            design friction.
          </p>
        </div>

        {/* Story Section */}
        <section className="space-y-6 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base border-b border-zinc-200 dark:border-zinc-800 pb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Heart className="size-5 text-[#FF6B00]" />
            Why We Built AppAssets Studio
          </h2>
          <p>
            Launching an iOS or Android application requires preparing dozens of screenshots across
            multiple screen dimensions, aspect ratios, and localized languages. For indie developers
            and agile engineering teams, manually adjusting templates in heavy graphic software for
            every release cycle consumes hours of valuable development time.
          </p>
          <p>
            AppAssets Studio was created by <strong>Hans Raj</strong> to turn this tedious ordeal
            into an automated, enjoyable process. Built on modern web technologies, AppAssets Studio
            provides an end-to-end visual canvas that allows creators to import raw screenshots,
            apply high-converting typography, wrap screens in official Apple and Google device
            bezels, and generate submission-compliant ZIP packages in seconds.
          </p>
        </section>

        {/* Founder & Lead Developer Box */}
        <section className="my-10 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0">
              HR
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Hans Raj</h3>
              <p className="text-xs text-[#FF6B00] font-semibold">Founder & Lead Engineer</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Software engineer passionate about developer tooling, mobile app architecture, and
                high-performance web graphics.
              </p>
              <div className="pt-2 flex items-center gap-3 text-xs">
                <a
                  href="mailto:hans.raj.skipq@gmail.com"
                  className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-[#FF6B00] dark:hover:text-[#FF8A00] font-medium transition-colors"
                >
                  <Mail className="size-3.5 text-[#FF6B00]" />
                  <span>hans.raj.skipq@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Core Principles Grid */}
        <section className="space-y-8 my-10">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            Our Core Principles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2.5">
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="size-4" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                Privacy-First Architecture
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Your pre-release application mockups and confidential assets are rendered locally in
                your browser using hardware-accelerated Canvas rendering. We never sell, index, or
                distribute your intellectual property.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2.5">
              <div className="size-8 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
                <CheckCircle2 className="size-4" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                Store Compliance by Default
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Every exported asset strictly adheres to Apple App Store Connect and Google Play
                Console specifications, from exact pixel dimensions (iPhone 16 Pro Max 6.9", iPad
                13", 1024x500 Feature Graphics) to required color profiles and file formats.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2.5">
              <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Zap className="size-4" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                Blazing Fast Workflow
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Multi-batch importing, live side-by-side editing, panoramic storytelling across
                screenshots, and automated AI copywriting powered by Gemini Vision ensure you
                produce world-class assets in minutes.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2.5">
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Code2 className="size-4" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                Open Source & Indie-Friendly
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                AppAssets Studio core CLI and generator library are licensed under the MIT license,
                empowering solo developers and large teams alike to script their release pipelines
                freely.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Links Banner */}
        <section className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-[#FF6B00]/10 via-amber-500/10 to-orange-500/5 border border-[#FF6B00]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Have questions or need technical support?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Reach out directly to Hans Raj for feature requests, bug reports, or partnership
              inquiries.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onNavigateContact && (
              <Button
                type="button"
                variant="outline"
                onClick={onNavigateContact}
                className="text-xs font-semibold h-9 px-4 rounded-xl border-zinc-300 dark:border-zinc-700 cursor-pointer"
              >
                Contact Us
              </Button>
            )}
            {onNavigateGuidelines && (
              <Button
                type="button"
                onClick={onNavigateGuidelines}
                className="bg-[#FF6B00] hover:bg-[#FF8A00] text-white text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer"
              >
                Store Guidelines
              </Button>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 py-8 px-6 mt-auto text-xs text-zinc-500 text-center">
        <p>
          © {new Date().getFullYear()} AppAssets Studio. Created by Hans Raj
          (hans.raj.skipq@gmail.com). All rights reserved.
        </p>
      </footer>
    </div>
  );
}
