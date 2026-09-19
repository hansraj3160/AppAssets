import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  Database,
  EyeOff,
  Lock,
  Mail,
  MoonIcon,
  ShieldCheck,
  SunIcon,
} from "lucide-react";
import appLogo from "@/assets/logo.png";
import { Button } from "./ui/button";

interface PrivacyPolicyProps {
  onNavigateHome: () => void;
  onNavigateTerms?: () => void;
  onStartDesigning: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function PrivacyPolicy({
  onNavigateHome,
  onNavigateTerms,
  onStartDesigning,
  dark,
  onToggleDark,
}: PrivacyPolicyProps) {
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
              <ShieldCheck className="size-3.5" />
              <span>LEGAL & PRIVACY COMMITMENT</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Last updated: September 13, 2026 • Official policy for{" "}
              <span className="font-semibold text-zinc-900 dark:text-white">App Assets</span> (
              <a href="https://appassetstudio.com" className="text-[#FF6B00] hover:underline">
                appassetstudio.com
              </a>
              )
            </p>
          </div>

          {/* Privacy at a Glance Box */}
          <div className="rounded-3xl border border-[#FF6B00]/30 bg-gradient-to-br from-[#FF6B00]/5 via-transparent to-[#FF8A00]/5 p-6 sm:p-8 mb-12 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                <Lock className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Privacy at a Glance
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  How App Assets protects your privacy by design
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white mb-1">
                  <Cpu className="size-4 text-[#FF6B00]" />
                  <span>100% In-Browser</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Your screenshots and images are processed directly on your device using browser
                  canvas and WebAssembly.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white mb-1">
                  <EyeOff className="size-4 text-[#FF6B00]" />
                  <span>No Image Storage</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  We never store, upload, or inspect your private application screenshots on
                  external servers or databases.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white mb-1">
                  <Database className="size-4 text-[#FF6B00]" />
                  <span>Zero Ad Tracking</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  We do not sell personal data or use third-party advertising tracking networks or
                  cross-site profiling cookies.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Sections */}
          <div className="space-y-10 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {/* 1. Introduction */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">1.</span> Introduction
              </h2>
              <p>
                Welcome to <strong>App Assets</strong> ("we," "our," or "us"), accessible via{" "}
                <a href="https://appassetstudio.com" className="text-[#FF6B00] hover:underline">
                  appassetstudio.com
                </a>
                . App Assets is designed from the ground up with a privacy-first architecture. We
                believe that your application screenshots, branding graphics, and app metadata
                belong solely to you.
              </p>
              <p>
                This Privacy Policy explains what information is collected, how it is handled, and
                how we ensure your design assets remain private and secure when you use AppAssets
                Studio.
              </p>
            </section>

            {/* 2. Client-Side & In-Browser Processing */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">2.</span> Local In-Browser Processing (Screenshots
                & Media)
              </h2>
              <p>
                Unlike traditional cloud design tools, AppAssets Studio runs image manipulation,
                device frame compositing, background rendering, and color space adjustments{" "}
                <strong>locally in your web browser</strong> or on your local machine.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  Your uploaded screenshots, custom backgrounds, and logos remain in your browser's
                  memory and local environment.
                </li>
                <li>
                  We do not transmit your screenshots to remote image analysis servers or public
                  storage buckets.
                </li>
                <li>
                  Exported packages (`.ZIP` archives containing App Store and Google Play folders)
                  are assembled directly on your system or streamed directly to your local download
                  directory.
                </li>
              </ul>
            </section>

            {/* 3. Information We Collect */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">3.</span> Information We Collect
              </h2>
              <p>
                We minimize data collection to the absolute minimum required to operate the service:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>No Account Required for Core Tool:</strong> You can create, customize, and
                  export screenshots completely anonymously without registering or providing an
                  email address.
                </li>
                <li>
                  <strong>Optional Account Data:</strong> If you choose to create an account or sign
                  up for notifications, we collect your email address strictly for authentication,
                  account management, and service updates.
                </li>
                <li>
                  <strong>Support Communications:</strong> If you contact us via{" "}
                  <a
                    href="mailto:support@appassetstudio.com"
                    className="text-[#FF6B00] hover:underline"
                  >
                    support@appassetstudio.com
                  </a>
                  , we collect your email address and message contents solely to resolve your
                  inquiry.
                </li>
                <li>
                  <strong>Technical Server Logs:</strong> Standard HTTP web server logs (such as IP
                  address, user-agent, and requested file path) may be temporarily recorded for
                  server security, error diagnosis, and DDoS mitigation.
                </li>
              </ul>
            </section>

            {/* 4. Local Storage and Session Cookies */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">4.</span> Cookies & Local Storage
              </h2>
              <p>
                We do <strong>not</strong> use invasive third-party tracking cookies or advertising
                pixels. We use standard browser `localStorage` and `sessionStorage` solely to
                preserve your workflow:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>Theme Preference:</strong> Storing whether you prefer Light or Dark mode
                  (`appassets_theme`).
                </li>
                <li>
                  <strong>Design Workspace State:</strong> Remembering active layout, device
                  selections, and typography between browser sessions so you do not lose unsaved
                  work.
                </li>
              </ul>
              <p>You can clear your local storage at any time via your browser settings.</p>
            </section>

            {/* 5. AI Copywriter & Third-Party APIs */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">5.</span> AI Copywriting Services
              </h2>
              <p>
                AppAssets Studio includes an optional smart copywriter feature to help generate
                marketing headlines. If you choose to use this feature:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>
                  Only the specific textual prompt (e.g. app category and target headline context)
                  is transmitted to the language model API.
                </li>
                <li>
                  Your screenshot images are <strong>not</strong> sent to the AI model.
                </li>
                <li>We do not use your inputs to train public foundational AI models.</li>
              </ul>
            </section>

            {/* 6. Data Security */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">6.</span> Data Security & Hosting
              </h2>
              <p>
                All data transmission between your browser and{" "}
                <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[#FF6B00]">
                  appassetstudio.com
                </code>{" "}
                is encrypted in transit using industry-standard Transport Layer Security (TLS/SSL)
                encryption. Our infrastructure is hosted in secure, ISO-certified cloud data centers
                with strict access controls.
              </p>
            </section>

            {/* 7. GDPR & CCPA User Rights */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">7.</span> Your Privacy Rights (GDPR & CCPA)
              </h2>
              <p>
                Depending on your geographic location (including the European Economic Area under
                GDPR and California under CCPA/CPRA), you possess rights regarding your personal
                data:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <li>The right to access, rectify, or delete any personal data we hold.</li>
                <li>The right to restrict or object to the processing of your data.</li>
                <li>
                  The right to data portability and non-discrimination for exercising privacy
                  rights.
                </li>
              </ul>
              <p>
                Because we do not store your app screenshots or build profiles on you, most user
                data remains exclusively in your own hands. To exercise any data rights, contact us
                at{" "}
                <a
                  href="mailto:support@appassetstudio.com"
                  className="text-[#FF6B00] hover:underline"
                >
                  support@appassetstudio.com
                </a>
                .
              </p>
            </section>

            {/* 8. Children's Privacy */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">8.</span> Children's Privacy
              </h2>
              <p>
                AppAssets Studio is intended for software developers, designers, and app publishers.
                We do not knowingly collect personal identifiable information from children under
                the age of 13 (or 16 in certain jurisdictions). If you believe a child has provided
                us with personal data, please notify us immediately.
              </p>
            </section>

            {/* 9. Changes to this Policy */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">9.</span> Changes to This Privacy Policy
              </h2>
              <p>
                We may update this Privacy Policy periodically to reflect enhancements in our
                technology, legal obligations, or service features. Any changes will be posted on
                this page with an updated "Last updated" date.
              </p>
            </section>

            {/* 10. Contact Us */}
            <section className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="text-[#FF6B00]">10.</span> Contact Us
              </h2>
              <p>
                If you have any questions, suggestions, or concerns regarding this Privacy Policy or
                your data privacy, please reach out to us:
              </p>
              <div className="mt-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <Mail className="size-5 text-[#FF6B00] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    App Assets Support & Privacy Team
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
                Ready to generate store screenshots?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Design beautiful, store-compliant assets with complete privacy.
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
            <span>Privacy Policy</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            {onNavigateTerms ? (
              <button
                type="button"
                onClick={onNavigateTerms}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Terms & Conditions
              </button>
            ) : null}
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
