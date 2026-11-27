import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Mail,
  MessageSquare,
  MoonIcon,
  Send,
  ShieldCheck,
  SunIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { isModifiedEvent } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const appLogo = "/favicon.svg";

interface ContactUsProps {
  onNavigateHome: () => void;
  onNavigateAbout?: () => void;
  onStartDesigning: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function ContactUs({
  onNavigateHome,
  onNavigateAbout,
  onStartDesigning,
  dark,
  onToggleDark,
}: ContactUsProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const contactEmail = "hans.raj.skipq@gmail.com";

  const handleCopyEmail = () => {
    void navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const mailtoUrl = `mailto:${contactEmail}?subject=${encodeURIComponent(
      subject || "AppAssets Studio Inquiry",
    )}&body=${encodeURIComponent(`From: ${name || "Anonymous"}\n\n${message}`)}`;
    window.location.href = mailtoUrl;
    setSubmitted(true);
  };

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
                Contact & Support
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
            <MessageSquare className="size-3.5" />
            <span>Developer Support & Inquiries</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Contact Hans Raj & AppAssets Team
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Have a question about screenshot export sizes, need help with App Store Connect
            guidelines, or want to suggest a new feature? We are here to help.
          </p>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
            <div className="size-9 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
              <Mail className="size-4" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Direct Email</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 break-all font-mono">
              {contactEmail}
            </p>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="text-[11px] font-semibold text-[#FF6B00] hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copied ? "Copied to clipboard!" : "Copy email address"}</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Response Time</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              We respond to developer inquiries, bug reports, and feedback within{" "}
              <strong>24 to 48 hours</strong>.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
            <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Developer Info</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Maintained by <strong>Hans Raj</strong>.<br />
              AppAssets Studio Developer Tooling.
            </p>
          </div>
        </div>

        {/* Message Form */}
        <section className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            Send a Direct Message
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Fill out the form below to initiate an email directly to Hans Raj at{" "}
            <code>{contactEmail}</code>.
          </p>

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
              <Check className="size-4 shrink-0" />
              <span>
                Email client launched! If it did not open automatically, please write to{" "}
                <strong>{contactEmail}</strong> directly.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-name"
                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Your Name
                  </label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Smith"
                    className="h-10 text-xs rounded-xl border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-subject"
                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Subject / Topic
                  </label>
                  <Input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Feature Suggestion or Bug Report"
                    className="h-10 text-xs rounded-xl border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contact-message"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Message <span className="text-[#FF6B00]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, issue, or feedback in detail..."
                  className="w-full p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#FF6B00]/40 transition-all resize-y"
                />
              </div>

              <Button
                type="submit"
                className="bg-[#FF6B00] hover:bg-[#FF8A00] text-white font-semibold text-xs h-10 px-6 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <Send className="size-3.5" />
                <span>Send via Email Client</span>
              </Button>
            </form>
          )}
        </section>

        {/* FAQ Quick Link */}
        <div className="mt-8 text-center text-xs text-zinc-500">
          Looking for background information about our mission?{" "}
          {onNavigateAbout && (
            <button
              type="button"
              onClick={onNavigateAbout}
              className="text-[#FF6B00] font-semibold hover:underline cursor-pointer"
            >
              Read About AppAssets Studio
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 py-8 px-6 mt-auto text-xs text-zinc-500 text-center">
        <p>
          © {new Date().getFullYear()} AppAssets Studio. Hans Raj (hans.raj.skipq@gmail.com). All
          rights reserved.
        </p>
      </footer>
    </div>
  );
}
