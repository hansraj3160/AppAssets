import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "./components/EmptyState";
import { type NavigableScreen, PublicRoutes } from "./components/PublicRoutes";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { StudioActionsContext } from "./context/StudioContext";
import { initGA, trackPageView, trackToolOpened } from "./lib/analytics";
import { getSessionId } from "./lib/session";
import type { ShowcaseCategory } from "./lib/showcaseCategories";
import {
  CUSTOM_TEMPLATE,
  type Platform,
  resolveScreenFromLocation,
  type Screen,
} from "./lib/studioState";
import {
  loadDesign,
  loadManifest,
  ManifestError,
  type SavedDesign,
  type StoreManifest,
  saveDesign,
} from "./manifest";

export { CUSTOM_TEMPLATE, type Platform, resolveScreenFromLocation, type Screen };

const StudioWorkspace = lazy(() =>
  import("./components/StudioWorkspace").then((m) => ({ default: m.StudioWorkspace })),
);
const AuthModal = lazy(() =>
  import("./components/AuthModal").then((m) => ({ default: m.AuthModal })),
);
const UpgradeModal = lazy(() =>
  import("./components/UpgradeModal").then((m) => ({ default: m.UpgradeModal })),
);

const SCREEN_TO_PAGE: Record<Screen, { path: string; title: string }> = {
  landing: { path: "/", title: "AppAssets - App Store & Google Play Screenshot Studio" },
  studio: { path: "/studio", title: "AppAssets Studio - Screenshot Editor" },
  privacy: { path: "/privacy", title: "Privacy Policy - AppAssets" },
  terms: { path: "/terms", title: "Terms and Conditions - AppAssets" },
  about: { path: "/about", title: "About Us - AppAssets Studio" },
  contact: { path: "/contact", title: "Contact Us - AppAssets Studio" },
  guidelines: { path: "/guidelines", title: "Store Guidelines & Specifications - AppAssets" },
  "not-found": { path: "/404", title: "404 Not Found - AppAssets" },
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { sessionId, isAuthModalOpen, isUpgradeModalOpen } = useAuth();
  const [loaded, setLoaded] = useState<{
    manifest: StoreManifest;
    design: SavedDesign;
    sessionId: string;
    refreshId: number;
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [screen, setScreen] = useState<Screen>(resolveScreenFromLocation);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const navigateTo = useCallback((view: NavigableScreen) => {
    setScreen(view);
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.hash = "";
    url.pathname = view === "landing" ? "/" : `/${view}`;
    window.history.pushState({}, "", url.pathname + (url.search ? url.search : ""));
  }, []);

  useEffect(() => {
    const handlePopState = () => setScreen(resolveScreenFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    getSessionId();
    initGA();
    const current = SCREEN_TO_PAGE[screen];
    trackPageView(current.path, current.title);
    if (screen === "studio") {
      trackToolOpened("screenshot_generator");
    }
  }, [screen]);

  const [dark, setDark] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("dark");
    if (param === "1") return true;
    if (param === "0") return false;
    const stored = localStorage.getItem("appassets_theme");
    if (stored) return stored === "dark";
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("appassets_theme", dark ? "dark" : "light");
  }, [dark]);

  const toggleDark = useCallback(() => setDark((prev) => !prev), []);

  const refreshSeqRef = useRef(0);
  const activeSessionRef = useRef(sessionId);
  activeSessionRef.current = sessionId;

  const refresh = useCallback(async (targetSessionId = activeSessionRef.current) => {
    const seq = ++refreshSeqRef.current;
    try {
      const [manifest, design] = await Promise.all([
        loadManifest(targetSessionId),
        loadDesign(targetSessionId),
      ]);
      if (seq !== refreshSeqRef.current || activeSessionRef.current !== targetSessionId) {
        return;
      }
      setError(null);
      setLoaded((prev) => ({
        manifest,
        design,
        sessionId: targetSessionId,
        refreshId: (prev?.refreshId ?? 0) + 1,
      }));
    } catch (e) {
      if (seq !== refreshSeqRef.current || activeSessionRef.current !== targetSessionId) {
        return;
      }
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  const loadedSessionRef = useRef<string | null>(null);
  useEffect(() => {
    if (loadedSessionRef.current !== sessionId) {
      if (loadedSessionRef.current !== null) {
        setLoaded(null);
      }
      loadedSessionRef.current = sessionId;
      void refresh(sessionId);
    }
  }, [sessionId, refresh]);

  useEffect(() => {
    const onRefreshEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ toast?: string }>).detail;
      if (detail?.toast) setToastMessage(detail.toast);
      void refresh();
    };
    window.addEventListener("appassets:refresh", onRefreshEvent);
    return () => window.removeEventListener("appassets:refresh", onRefreshEvent);
  }, [refresh]);

  const studioActions = useMemo(
    () => ({
      refresh: () => refresh(),
      toast: (msg: string) => setToastMessage(msg),
    }),
    [refresh],
  );

  const handleStartDesigning = useCallback(
    async (style?: ShowcaseCategory) => {
      if (style) {
        const { THEME_PRESETS } = await import("./components/ThemePresets");
        const preset = THEME_PRESETS.find((p) => p.id === style.presetId);
        const nextDesign: SavedDesign = {
          ...(loaded?.design ?? {}),
          background: style.tileBackground,
          headlineColor: style.tileTone === "light" ? "#0E1B2A" : "#FFFFFF",
          subheadColor: style.tileTone === "light" ? "#5A6A7D" : "#D4D4D8",
          ...(preset
            ? {
                frame: preset.frame,
                fontFamily: preset.fontFamily,
                fontSizeScale: preset.fontSizeScale,
                deviceBacklight: preset.deviceBacklight,
              }
            : {}),
        };
        setLoaded((prev) =>
          prev
            ? {
                ...prev,
                design: nextDesign,
                refreshId: prev.refreshId + 1,
              }
            : prev,
        );
        void saveDesign(nextDesign, sessionId).catch(() => {});
        setToastMessage(`Applied "${style.categoryLabel}" style`);
      }
      navigateTo("studio");
    },
    [loaded?.design, navigateTo, sessionId],
  );

  const navigateToLanding = useCallback(() => navigateTo("landing"), [navigateTo]);

  if (screen !== "studio") {
    return (
      <PublicRoutes
        screen={screen}
        dark={dark}
        onToggleDark={toggleDark}
        onNavigate={navigateTo}
        onStartDesigning={handleStartDesigning}
      />
    );
  }

  if (error) {
    return (
      <StudioActionsContext.Provider value={studioActions}>
        <EmptyState
          icon={TriangleAlertIcon}
          title="The studio could not load"
          body={error.message}
          command={error instanceof ManifestError ? error.command : undefined}
        />
      </StudioActionsContext.Provider>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <Loader2Icon className="size-7 animate-spin text-primary" />
        <span className="text-xs font-semibold text-muted-foreground">
          Loading AppAssets Studio...
        </span>
      </div>
    );
  }

  return (
    <StudioActionsContext.Provider value={studioActions}>
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
            <Loader2Icon className="size-7 animate-spin text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">
              Loading AppAssets Studio...
            </span>
          </div>
        }
      >
        <StudioWorkspace
          key={loaded.sessionId}
          manifest={loaded.manifest}
          saved={loaded.design}
          sessionId={loaded.sessionId}
          refreshId={loaded.refreshId}
          onRefresh={refresh}
          dark={dark}
          setDark={setDark}
          toastMessage={toastMessage}
          onToast={setToastMessage}
          onNavigateToLanding={navigateToLanding}
        />
      </Suspense>
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
    </StudioActionsContext.Provider>
  );
}
