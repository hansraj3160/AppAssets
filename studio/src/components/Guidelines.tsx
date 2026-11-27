import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  MoonIcon,
  Smartphone,
  Sparkles,
  SunIcon,
  Tablet,
} from "lucide-react";
import { isModifiedEvent } from "@/lib/utils";
import { Button } from "./ui/button";

const appLogo = "/favicon.svg";

interface GuidelinesProps {
  onNavigateHome: () => void;
  onNavigateContact?: () => void;
  onStartDesigning: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function Guidelines({
  onNavigateHome,
  onNavigateContact,
  onStartDesigning,
  dark,
  onToggleDark,
}: GuidelinesProps) {
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
                Store Guidelines & Specifications
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
        {/* Back button */}
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

        {/* Title */}
        <div className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF6B00]/10 text-[#FF6B00] dark:text-[#FF8A00] border border-[#FF6B00]/20">
            <BookOpen className="size-3.5" />
            <span>Official 2026 Developer Reference</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            App Store & Google Play Screenshot Guidelines
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            The definitive technical guide for pixel-perfect screenshot dimensions, aspect ratios,
            file requirements, and conversion-optimized store assets for iOS 18, iPadOS, and
            Android.
          </p>
        </div>

        {/* Section 1: Apple App Store Requirements */}
        <section className="space-y-6 my-10 border-b border-zinc-200 dark:border-zinc-800 pb-10">
          <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            <Smartphone className="size-6 text-[#FF6B00]" />
            <h2>Apple App Store Screenshot Dimensions (iOS 18)</h2>
          </div>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Apple requires high-resolution screenshots in RGB 72 dpi color space without alpha
            transparency. In modern App Store Connect submissions, providing 6.9-inch (or 6.7-inch)
            and 13-inch iPad screenshots satisfies requirements across most device tiers via Apple's
            automated downscaling.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                <tr>
                  <th className="p-3.5">Device Tier</th>
                  <th className="p-3.5">Portrait Dimensions</th>
                  <th className="p-3.5">Landscape Dimensions</th>
                  <th className="p-3.5">Format & Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                    6.9" Display (iPhone 16 Pro Max)
                  </td>
                  <td className="p-3.5 font-mono">1320 × 2868 px</td>
                  <td className="p-3.5 font-mono">2868 × 1320 px</td>
                  <td className="p-3.5">PNG or JPEG (RGB, No Alpha)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                    6.7" Display (iPhone 15/14 Pro Max)
                  </td>
                  <td className="p-3.5 font-mono">1290 × 2796 px</td>
                  <td className="p-3.5 font-mono">2796 × 1290 px</td>
                  <td className="p-3.5">PNG or JPEG (RGB, No Alpha)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                    6.5" Display (iPhone 11 Pro Max / XS Max)
                  </td>
                  <td className="p-3.5 font-mono">1242 × 2688 px</td>
                  <td className="p-3.5 font-mono">2688 × 1242 px</td>
                  <td className="p-3.5">PNG or JPEG (RGB, No Alpha)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                    5.5" Display (iPhone 8 Plus / 7 Plus)
                  </td>
                  <td className="p-3.5 font-mono">1242 × 2208 px</td>
                  <td className="p-3.5 font-mono">2208 × 1242 px</td>
                  <td className="p-3.5">PNG or JPEG (RGB, No Alpha)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                    13" iPad Pro (M4 Display)
                  </td>
                  <td className="p-3.5 font-mono">2064 × 2752 px</td>
                  <td className="p-3.5 font-mono">2752 × 2064 px</td>
                  <td className="p-3.5">PNG or JPEG (RGB, No Alpha)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                    12.9" iPad Pro (2nd to 6th Gen)
                  </td>
                  <td className="p-3.5 font-mono">2048 × 2732 px</td>
                  <td className="p-3.5 font-mono">2732 × 2048 px</td>
                  <td className="p-3.5">PNG or JPEG (RGB, No Alpha)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Google Play Store Requirements */}
        <section className="space-y-6 my-10 border-b border-zinc-200 dark:border-zinc-800 pb-10">
          <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            <Tablet className="size-6 text-[#FF6B00]" />
            <h2>Google Play Console Screenshot & Feature Graphic Rules</h2>
          </div>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Google Play Console requires a minimum of 4 screenshots for phone listings and up to 8
            per form factor. In addition, a 1024 × 500 promotional Feature Graphic is mandatory for
            featuring in store collections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
              <h3 className="font-bold text-zinc-900 dark:text-white text-base flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Phone Screenshots
              </h3>
              <ul className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-disc pl-4">
                <li>
                  <strong>Aspect Ratio:</strong> 16:9 or 9:16 (minimum dimension: 320 px, maximum
                  dimension: 3840 px).
                </li>
                <li>
                  <strong>Standard Recommended:</strong> 1080 × 1920 px or 1080 × 2400 px (Pixel 10
                  Pro / Galaxy S24).
                </li>
                <li>
                  <strong>Quantity:</strong> Minimum 4 screenshots required for publishing.
                </li>
                <li>
                  <strong>Max File Size:</strong> 8 MB per screenshot (PNG or JPEG).
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
              <h3 className="font-bold text-zinc-900 dark:text-white text-base flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#FF6B00]" />
                Feature Graphic (1024 × 500)
              </h3>
              <ul className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-disc pl-4">
                <li>
                  <strong>Exact Resolution:</strong> 1024 px wide by 500 px high.
                </li>
                <li>
                  <strong>File Format:</strong> JPEG or 24-bit PNG (no transparency / alpha).
                </li>
                <li>
                  <strong>Content Safe Zone:</strong> Keep key logos and headlines centered; avoid
                  edges where store badges may overlap.
                </li>
                <li>
                  <strong>Max File Size:</strong> 1 MB.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: App Store Optimization (ASO) Conversion Blueprint */}
        <section className="space-y-6 my-10">
          <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            <Sparkles className="size-6 text-[#FF6B00]" />
            <h2>App Store Optimization (ASO) Screenshot Best Practices</h2>
          </div>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Data from millions of App Store impressions proves that screenshots drive over 70% of
            conversion decisions. Follow these principles when designing your frames in AppAssets
            Studio:
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                1. The First Screenshot is Your Conversion Lifeline
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                In search results, users only see the first 1 to 3 screenshots before scrolling.
                Highlight your primary value proposition immediately with large, high-contrast
                headline copy.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                2. Use Panoramic Storytelling Across Consecutive Slides
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Connect screenshot 1 and 2 with an overlapping UI card or continuous aurora
                background to entice users to swipe right through your full set of features.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                3. High Contrast & Legible Typography
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Keep headline copy under 5 to 7 words. Use dark headlines on light backgrounds or
                pure white text on deep vibrant gradients. Avoid thin weights that become illegible
                at search scale.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                4. Automated Store Pre-Flight Audit
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Before exporting, use the built-in <strong>Store Pre-Flight Audit</strong> in
                AppAssets Studio to check device dimension compliance, headline contrast ratio, and
                required store assets.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-black text-white text-center space-y-4 border border-zinc-800">
          <h3 className="text-xl font-bold">Ready to Build Store-Compliant Screenshots?</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
            Import your raw mobile app captures and let AppAssets Studio generate the exact
            dimensions for iPhone 16 Pro Max, iPad, and Google Play automatically.
          </p>
          <Button
            type="button"
            onClick={onStartDesigning}
            className="bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-bold text-xs h-10 px-6 rounded-xl shadow-md cursor-pointer"
          >
            Launch Screenshot Studio
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 py-8 px-6 mt-auto text-xs text-zinc-500 text-center">
        <div className="flex justify-center gap-4 mb-3">
          <a
            href="/"
            onClick={(e) => {
              if (isModifiedEvent(e)) return;
              e.preventDefault();
              onNavigateHome();
            }}
            className="hover:underline text-zinc-600 dark:text-zinc-400"
          >
            Home
          </a>
          {onNavigateContact && (
            <a
              href="/contact"
              onClick={(e) => {
                if (isModifiedEvent(e)) return;
                e.preventDefault();
                onNavigateContact();
              }}
              className="hover:underline text-zinc-600 dark:text-zinc-400"
            >
              Contact Support
            </a>
          )}
        </div>
        <p>
          © {new Date().getFullYear()} AppAssets Studio. Hans Raj (hans.raj.skipq@gmail.com). All
          rights reserved.
        </p>
      </footer>
    </div>
  );
}
