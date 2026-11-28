import { Loader2Icon } from "lucide-react";
import { lazy, memo, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import type { ShowcaseCategory } from "../lib/showcaseCategories";
import type { Screen } from "../lib/studioState";
import { isModifiedEvent } from "../lib/utils";

const LandingPage = lazy(() =>
  import("./LandingPage").then((m) => ({ default: m.LandingPage })),
);
const PrivacyPolicy = lazy(() =>
  import("./PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })),
);
const TermsAndConditions = lazy(() =>
  import("./TermsAndConditions").then((m) => ({ default: m.TermsAndConditions })),
);
const AboutUs = lazy(() => import("./AboutUs").then((m) => ({ default: m.AboutUs })));
const ContactUs = lazy(() => import("./ContactUs").then((m) => ({ default: m.ContactUs })));
const Guidelines = lazy(() => import("./Guidelines").then((m) => ({ default: m.Guidelines })));
const AuthModal = lazy(() => import("./AuthModal").then((m) => ({ default: m.AuthModal })));
const UpgradeModal = lazy(() =>
  import("./UpgradeModal").then((m) => ({ default: m.UpgradeModal })),
);

export type PublicScreen = Exclude<Screen, "studio">;
export type NavigableScreen = Exclude<Screen, "not-found">;

export interface PublicRoutesProps {
  screen: PublicScreen;
  dark: boolean;
  onToggleDark: () => void;
  onNavigate: (view: NavigableScreen) => void;
  onStartDesigning: (style?: ShowcaseCategory) => void;
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
      <Loader2Icon className="size-7 animate-spin text-primary" />
      <span className="text-xs font-semibold text-muted-foreground">Loading...</span>
    </div>
  );
}

export const PublicRoutes = memo(function PublicRoutes({
  screen,
  dark,
  onToggleDark,
  onNavigate,
  onStartDesigning,
}: PublicRoutesProps) {
  const { isAuthModalOpen, isUpgradeModalOpen } = useAuth();
  if (screen === "not-found") {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a
              href="/"
              onClick={(e) => {
                if (!isModifiedEvent(e)) {
                  e.preventDefault();
                  onNavigate("landing");
                }
              }}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <img
                src="/favicon.svg"
                alt="AppAssets Logo"
                className="size-8 rounded-lg object-cover"
              />
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                App<span className="text-[#FF6B00]">Assets</span> Studio
              </span>
            </a>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] text-2xl font-bold">
              404
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
              Page Not Found
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              The page you are looking for does not exist or has been moved.
            </p>
            <div className="pt-2">
              <a
                href="/"
                onClick={(e) => {
                  if (!isModifiedEvent(e)) {
                    e.preventDefault();
                    onNavigate("landing");
                  }
                }}
                className="inline-flex items-center justify-center h-10 px-6 rounded-full font-semibold text-xs bg-[#FF6B00] hover:bg-[#FF8A00] text-white transition-all shadow-xs cursor-pointer"
              >
                Return to Home
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      {screen === "landing" ? (
        <>
          <LandingPage
            onStartDesigning={onStartDesigning}
            onOpenPrivacy={() => onNavigate("privacy")}
            onOpenTerms={() => onNavigate("terms")}
            onOpenAbout={() => onNavigate("about")}
            onOpenContact={() => onNavigate("contact")}
            onOpenGuidelines={() => onNavigate("guidelines")}
            dark={dark}
            onToggleDark={onToggleDark}
          />
          {isAuthModalOpen ? (
            <Suspense fallback={null}>
              <AuthModal />
            </Suspense>
          ) : null}
          {isUpgradeModalOpen ? (
            <Suspense fallback={null}>
              <UpgradeModal />
            </Suspense>
          ) : null}
        </>
      ) : screen === "privacy" ? (
        <PrivacyPolicy
          onNavigateHome={() => onNavigate("landing")}
          onNavigateTerms={() => onNavigate("terms")}
          onStartDesigning={() => onNavigate("studio")}
          dark={dark}
          onToggleDark={onToggleDark}
        />
      ) : screen === "terms" ? (
        <TermsAndConditions
          onNavigateHome={() => onNavigate("landing")}
          onNavigatePrivacy={() => onNavigate("privacy")}
          onStartDesigning={() => onNavigate("studio")}
          dark={dark}
          onToggleDark={onToggleDark}
        />
      ) : screen === "about" ? (
        <AboutUs
          onNavigateHome={() => onNavigate("landing")}
          onNavigateContact={() => onNavigate("contact")}
          onNavigateGuidelines={() => onNavigate("guidelines")}
          onStartDesigning={() => onNavigate("studio")}
          dark={dark}
          onToggleDark={onToggleDark}
        />
      ) : screen === "contact" ? (
        <ContactUs
          onNavigateHome={() => onNavigate("landing")}
          onNavigateAbout={() => onNavigate("about")}
          onStartDesigning={() => onNavigate("studio")}
          dark={dark}
          onToggleDark={onToggleDark}
        />
      ) : (
        <Guidelines
          onNavigateHome={() => onNavigate("landing")}
          onNavigateContact={() => onNavigate("contact")}
          onStartDesigning={() => onNavigate("studio")}
          dark={dark}
          onToggleDark={onToggleDark}
        />
      )}
    </Suspense>
  );
});
