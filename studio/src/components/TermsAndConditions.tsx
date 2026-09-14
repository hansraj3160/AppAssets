import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Mail,
  MoonIcon,
  Scale,
  ShieldCheck,
  Sparkles,
  SunIcon,
} from "lucide-react";
import appLogo from "@/assets/logo.png";
import { Button } from "./ui/button";

interface TermsAndConditionsProps {
  onNavigateHome: () => void;
  onNavigatePrivacy: () => void;
  onStartDesigning: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function TermsAndConditions({
  onNavigateHome,
  onNavigatePrivacy,
  onStartDesigning,
  dark,
  onToggleDark,
}: TermsAndConditionsProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateHome}
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
              <span className="text-[10px] text-zinc-500 font-medium mt-0.5">
                Screenshot Automation
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer mr-2"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </button>

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

      {/* Main Content Area */}
      <main className="flex-1 py-12 lg:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Title Header */}
          <div className="mb-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF6B00]/10 text-[#FF6B00] dark:bg-[#FF6B00]/20 dark:text-[#FF8A00] border border-[#FF6B00]/25 mb-4">
              <Scale className="size-3.5" />
              <span>TERMS OF SERVICE AGREEMENT</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Terms and Conditions
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Last updated: September 13, 2026 • Official Terms of Service for{" "}
              <span className="font-semibold text-zinc-900 dark:text-white">App Assets</span> (
              <a href="https://appassetstudio.com" className="text-[#FF6B00] hover:underline">
                appassetstudio.com
              </a>
              )
            </p>
          </div>

          {/* Terms at a Glance Box */}
          <div className="rounded-3xl border border-[#FF6B00]/30 bg-gradient-to-br from-[#FF6B00]/5 via-transparent to-[#FF8A00]/5 p-6 sm:p-8 mb-12 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                <FileText className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Terms at a Glance
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Key rules and ownership rights in simple terms
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white mb-1">
                  <CheckCircle2 className="size-4 text-[#FF6B00]" />
                  <span>100% Asset Ownership</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  You own all intellectual property rights in your screenshots, logos, and exported
                  store packages.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white mb-1">
                  <Sparkles className="size-4 text-[#FF6B00]" />
                  <span>Commercial Use Allowed</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Exported screenshots can be used freely for commercial app store listings,
                  marketing, and advertising.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white mb-1">
                  <ShieldCheck className="size-4 text-[#FF6B00]" />
                  <span>Transparent & Fair</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  No hidden lock-ins. Core tools are free and open source with clear, predictable
                  licensing.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Sections */}
          <div className="space-y-10 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {/* 1. Agreement to Terms */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">1.</span> Agreement to Terms
              </h2>
              <p>
                By accessing or using <strong>App Assets</strong>, our website at{" "}
                <a
                  href="https://appassetstudio.com"
                  className="text-[#FF6B00] hover:underline font-medium"
                >
                  appassetstudio.com
                </a>
                , or the AppAssets Studio application (collectively, the "Service"), you agree to be
                bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms,
                please do not use the Service.
              </p>
            </section>

            {/* 2. Service Description */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">2.</span> Description of Service
              </h2>
              <p>
                App Assets provides an automated, browser-based studio and command-line tools
                designed to generate, frame, style, and format screenshots, app icons, and feature
                graphics for the Apple App Store, Google Play Store, and related application
                marketplaces.
              </p>
              <p>
                The Service operates with a client-first design: rendering and image compositing
                occur within your local browser environment.
              </p>
            </section>

            {/* 3. Intellectual Property & Ownership */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">3.</span> Intellectual Property & Ownership
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>Your Content & Exports:</strong> You retain complete ownership, copyright,
                  and intellectual property rights in all screenshots, logos, brand assets, and
                  final graphics created or exported using AppAssets Studio. We claim zero copyright
                  or licensing rights over your exported materials.
                </li>
                <li>
                  <strong>Commercial Freedom:</strong> You are granted unrestricted rights to use,
                  publish, monetize, distribute, and display exported screenshot packages in the
                  Apple App Store, Google Play Console, press kits, and marketing campaigns.
                </li>
                <li>
                  <strong>Software & Branding:</strong> The AppAssets name, wordmarks, logos, site
                  design, and proprietary interface elements are protected by copyright and
                  trademark laws. The core open-source engine is licensed under the MIT License.
                </li>
              </ul>
            </section>

            {/* 4. Acceptable Use Policy */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">4.</span> Acceptable Use
              </h2>
              <p>When utilizing the Service, you agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  Use the Service to produce deceptive, fraudulent, or counterfeit app store
                  listings designed to impersonate existing brand owners.
                </li>
                <li>
                  Generate content that violates applicable local, state, national, or international
                  laws, or infringes third-party patents, copyrights, or trademarks.
                </li>
                <li>
                  Attempt to probe, compromise, or disrupt the security, integrity, or availability
                  of our hosting infrastructure or servers.
                </li>
                <li>
                  Abuse, spam, or excessively overload the AI copywriter endpoints beyond designated
                  rate limits.
                </li>
              </ul>
            </section>

            {/* 5. AI Services & Third-Party APIs */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">5.</span> AI Features & Content Generation
              </h2>
              <p>
                The optional smart copywriter utilizes artificial intelligence to suggest headline
                copy. You acknowledge that AI-generated copy is provided as suggestions only. You
                are solely responsible for reviewing and ensuring that any marketing claims comply
                with store guidelines and truth-in-advertising regulations.
              </p>
            </section>

            {/* 6. Disclaimer of Store Acceptance */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">6.</span> App Store Compliance & Disclaimers
              </h2>
              <p>
                While AppAssets Studio includes a comprehensive Store Pre-Flight Audit engineered
                according to Apple App Store Connect and Google Play Console specifications:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  Final approval of app submissions remains at the sole discretion of Apple Inc. and
                  Google LLC respectively.
                </li>
                <li>
                  App Assets is an independent developer tool and is not affiliated, endorsed, or
                  sponsored by Apple Inc. or Google LLC.
                </li>
                <li>
                  We do not guarantee that your application will be accepted into any marketplace,
                  as reviews involve app functionality and content guidelines beyond screenshots.
                </li>
              </ul>
            </section>

            {/* 7. Limitation of Liability */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">7.</span> Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, App Assets and its contributors
                shall not be liable for any indirect, incidental, special, consequential, or
                punitive damages, including loss of profits, data, or business opportunities,
                arising out of your access to or use of the Service. The Service is provided on an
                "AS IS" and "AS AVAILABLE" basis.
              </p>
            </section>

            {/* 8. Modifications to Terms */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">8.</span> Changes to Terms
              </h2>
              <p>
                We reserve the right to revise these Terms at any time. When modifications occur, we
                will update the "Last updated" date at the top of this page. Continued use of the
                Service following the posting of revised Terms constitutes your acceptance of the
                changes.
              </p>
            </section>

            {/* 9. Contact Information */}
            <section className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">9.</span> Contact Us
              </h2>
              <p>
                If you have questions, inquiries, or legal concerns regarding these Terms and
                Conditions, please contact:
              </p>
              <div className="mt-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <Mail className="size-5 text-[#FF6B00] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    App Assets Legal & Support
                  </div>
                  <a
                    href="mailto:support@appassetstudio.com"
                    className="text-xs text-[#FF6B00] hover:underline font-semibold"
                  >
                    support@appassetstudio.com
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* Bottom Action CTA */}
          <div className="mt-16 p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Ready to create high-converting screenshots?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Start designing now with full commercial ownership of your assets.
              </p>
            </div>
            <Button
              type="button"
              onClick={onStartDesigning}
              className="h-11 px-6 rounded-full font-semibold text-xs bg-[#FF6B00] hover:bg-[#FF8A00] text-white cursor-pointer shadow-xs transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Launch Studio</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-black py-8 px-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="" className="size-5 rounded-md object-cover" />
            <span className="font-bold text-zinc-900 dark:text-white">
              App<span className="text-[#FF6B00]">Assets</span> Studio
            </span>
            <span>•</span>
            <span>Terms and Conditions</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={onNavigatePrivacy}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <a
              href="mailto:support@appassetstudio.com"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Mail className="size-3.5 text-[#FF6B00]" />
              <span>support@appassetstudio.com</span>
            </a>
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
