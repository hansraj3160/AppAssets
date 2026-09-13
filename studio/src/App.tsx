import {
  CameraIcon,
  Loader2Icon,
  type LucideIcon,
  SmartphoneIcon,
  TabletIcon,
  TriangleAlertIcon,
  UploadIcon,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdBanner } from "./components/AdBanner";
import { AppDetailsModal } from "./components/AppDetailsModal";
import { AuthModal } from "./components/AuthModal";
import { EmptyState } from "./components/EmptyState";
import { Header } from "./components/Header";
import { LandingPage } from "./components/LandingPage";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsAndConditions } from "./components/TermsAndConditions";
import { LocaleManagerModal } from "./components/LocaleManagerModal";
import { PromoBannersStudio } from "./components/PromoBannersStudio";
import { Sidebar } from "./components/Sidebar";
import { StoreMockupPreview } from "./components/StoreMockupPreview";
import { Strip } from "./components/Strip";
import { UpgradeModal } from "./components/UpgradeModal";
import { AuthProvider } from "./context/AuthContext";
import { useHistory } from "./lib/useHistory";
import {
  type AppInfo,
  type BundledFont,
  type Design,
  type DeviceEntry,
  loadDesign,
  loadManifest,
  ManifestError,
  type SavedDesign,
  type SceneCopy,
  type StoreManifest,
  saveDesign,
} from "./manifest";

/** Sentinel for the config's own layout sequence, which the studio can show but not edit. */
export const CUSTOM_TEMPLATE = "__custom__";

export type Platform = "ios" | "ipad" | "android";

/**
 * Shown when a store's tab is selected but its device is not in the config.
 * The chip holds the ask to hand a coding agent, which knows the config
 * changes and capture steps from the appassets skill.
 */
const ENABLE_PLATFORM: Record<
  Platform,
  { icon: LucideIcon; title: string; body: string; command: string }
> = {
  ios: {
    icon: SmartphoneIcon,
    title: "No App Store screenshots yet",
    body: "Ask your coding agent to set them up:",
    command: "create App Store screenshots using appassets",
  },
  ipad: {
    icon: TabletIcon,
    title: "No iPad screenshots yet",
    body: "Ask your coding agent to set them up:",
    command: "create iPad screenshots using appassets",
  },
  android: {
    icon: SmartphoneIcon,
    title: "No Google Play screenshots yet",
    body: "Ask your coding agent to set them up:",
    command: "create Google Play screenshots using appassets",
  },
};

/** How long the design must sit still before it is written to disk. */
const SAVE_DEBOUNCE_MS = 500;

export function App() {
  const [loaded, setLoaded] = useState<{ manifest: StoreManifest; design: SavedDesign } | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);
  const [screen, setScreen] = useState<"landing" | "studio" | "privacy" | "terms">(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "privacy" || window.location.hash === "#privacy") {
      return "privacy";
    }
    if (params.get("view") === "terms" || window.location.hash === "#terms") {
      return "terms";
    }
    if (params.get("view") === "studio" || window.location.hash === "#studio") {
      return "studio";
    }
    return "landing";
  });

  const navigateTo = useCallback((view: "landing" | "studio" | "privacy" | "terms") => {
    setScreen(view);
    const url = new URL(window.location.href);
    if (view === "landing") {
      url.searchParams.delete("view");
      url.hash = "";
    } else {
      url.searchParams.set("view", view);
      url.hash = "";
    }
    window.history.pushState(
      {},
      "",
      url.pathname + (url.search ? url.search : ""),
    );
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "privacy" || window.location.hash === "#privacy") {
        setScreen("privacy");
      } else if (params.get("view") === "terms" || window.location.hash === "#terms") {
        setScreen("terms");
      } else if (params.get("view") === "studio" || window.location.hash === "#studio") {
        setScreen("studio");
      } else {
        setScreen("landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [dark, setDark] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("dark");
    if (param === "1") return true;
    if (param === "0") return false;
    const stored = localStorage.getItem("appassets_theme");
    if (stored) return stored === "dark";
    // Default to clean, bright light mode matching appscreenshots.net
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("appassets_theme", dark ? "dark" : "light");
  }, [dark]);

  const refresh = useCallback(() => {
    Promise.all([loadManifest(), loadDesign()])
      .then(([manifest, design]) => setLoaded({ manifest, design }))
      .catch((e: Error) => setError(e));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (screen === "landing") {
    return (
      <AuthProvider>
        <LandingPage
          onStartDesigning={() => navigateTo("studio")}
          onOpenPrivacy={() => navigateTo("privacy")}
          onOpenTerms={() => navigateTo("terms")}
          dark={dark}
          onToggleDark={() => setDark((prev) => !prev)}
        />
        <AuthModal />
        <UpgradeModal />
      </AuthProvider>
    );
  }

  if (screen === "privacy") {
    return (
      <AuthProvider>
        <PrivacyPolicy
          onNavigateHome={() => navigateTo("landing")}
          onNavigateTerms={() => navigateTo("terms")}
          onStartDesigning={() => navigateTo("studio")}
          dark={dark}
          onToggleDark={() => setDark((prev) => !prev)}
        />
      </AuthProvider>
    );
  }

  if (screen === "terms") {
    return (
      <AuthProvider>
        <TermsAndConditions
          onNavigateHome={() => navigateTo("landing")}
          onNavigatePrivacy={() => navigateTo("privacy")}
          onStartDesigning={() => navigateTo("studio")}
          dark={dark}
          onToggleDark={() => setDark((prev) => !prev)}
        />
      </AuthProvider>
    );
  }

  if (error)
    return (
      <EmptyState
        icon={TriangleAlertIcon}
        title="The studio could not load"
        body={error.message}
        command={error instanceof ManifestError ? error.command : undefined}
      />
    );
  if (!loaded)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <Loader2Icon className="size-7 animate-spin text-primary" />
        <span className="text-xs font-semibold text-muted-foreground">
          Loading AppAssets Studio...
        </span>
      </div>
    );
  return (
    <AuthProvider>
      <Loaded
        manifest={loaded.manifest}
        saved={loaded.design}
        onRefresh={refresh}
        dark={dark}
        setDark={setDark}
        onNavigateToLanding={() => navigateTo("landing")}
      />
      <AuthModal />
      <UpgradeModal />
    </AuthProvider>
  );
}

/**
 * All design state lives here as plain React state: the strip composites the
 * scenes in the browser, so a background or frame change repaints instantly.
 * The CLI only runs when the sidebar's Export button asks for the final files.
 *
 * Two things survive a reload. The design choices (background, frame, font,
 * layout and screen-only mode, per-scene layout overrides, copy edited in the
 * lightbox, the order tiles were dragged into)
 * are written to goldie.design.json next to the config, debounced, so the
 * CLI picks them up too. The view choices (platform, device, locale, dark) only matter
 * here and live in localStorage under the app's name. Either falls back to
 * the config when a stored value no longer applies (a device or frame
 * variant removed from the config, for instance).
 */
function Loaded({
  manifest,
  saved,
  onRefresh,
  dark,
  setDark,
  onNavigateToLanding,
}: {
  manifest: StoreManifest;
  saved: SavedDesign;
  onRefresh: () => void;
  dark: boolean;
  setDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  onNavigateToLanding?: () => void;
}) {
  const design = manifest.design;
  const view = loadView(manifest.app.name);
  // Both store tabs render even when only one platform is configured, so the
  // platform is view state of its own: an unconfigured tab has no device key
  // to derive it from.
  const initialPlatform: Platform =
    view.platform === "ios" || view.platform === "ipad" || view.platform === "android"
      ? view.platform
      : (manifest.devices.find((d) => d.key === view.device)?.platform ??
        manifest.devices[0]?.platform ??
        "ios");
  const [platform, setPlatform] = useState(initialPlatform);
  const [device, setDevice] = useState(() => {
    const devices = manifest.devices.filter((d) => d.platform === initialPlatform);
    return devices.some((d) => d.key === view.device)
      ? (view.device as string)
      : (devices[0]?.key ?? manifest.devices[0]?.key ?? "");
  });
  const selectPlatform = (p: Platform) => {
    setPlatform(p);
    const devices = manifest.devices.filter((d) => d.platform === p);
    if (devices.length > 0 && !devices.some((d) => d.key === device)) setDevice(devices[0]!.key);
  };
  const [locale, setLocale] = useState(
    view.locale && manifest.locales.includes(view.locale)
      ? view.locale
      : (manifest.locales[0] ?? ""),
  );
  const [canvasView, setCanvasView] = useState<"editor" | "store" | "promo">("editor");
  const knownLayout = (key: string | undefined) =>
    key && design.layouts.some((l) => l.key === key) ? key : undefined;
  const { state, set } = useHistory<DesignState>(() => ({
    background: saved.background ?? design.theme.background,
    frame:
      saved.frame && design.frameVariants.includes(saved.frame)
        ? saved.frame
        : (design.frameVariant ?? ""),
    fontFamily: saved.fontFamily ?? design.theme.fontFamily,
    headlineColor: saved.headlineColor ?? "",
    subheadColor: saved.subheadColor ?? "",
    fontSizeScale: saved.fontSizeScale ?? 1,
    copy: saved.copy ?? {},
    layout: knownLayout(saved.layout) ?? design.layout,
    template: initialTemplate(design, saved),
    screenOnly: saved.screenOnly ?? design.screenOnly,
    sceneLayouts: initialSceneLayouts(design, saved, knownLayout),
    sceneBackgrounds: saved.sceneBackgrounds ?? {},
    sceneBadges: saved.sceneBadges ?? {},
    order: initialOrder(design, saved),
  }));
  const {
    background,
    frame,
    fontFamily,
    headlineColor,
    subheadColor,
    fontSizeScale,
    copy,
    layout,
    template,
    screenOnly,
    sceneLayouts,
    sceneBackgrounds,
    sceneBadges,
    order,
  } = state;
  // Each setter names its field so a burst of edits to one control (a drag
  // on the gradient picker) collapses into a single undo step.
  const field =
    <K extends keyof DesignState>(key: K) =>
    (value: DesignState[K]) =>
      set(key, (prev) => ({ ...prev, [key]: value }));
  const setBackground = field("background");
  const setFrame = field("frame");
  const setFontFamily = field("fontFamily");
  const setHeadlineColor = field("headlineColor");
  const setSubheadColor = field("subheadColor");
  const setFontSizeScale = field("fontSizeScale");
  const setLayout = field("layout");
  // Picking a template replaces the strip's layout sequence, so any per-scene
  // overrides made against the previous one are dropped with it.
  const setTemplate = (value: string) =>
    set("template", (prev) => ({ ...prev, template: value, sceneLayouts: {} }));
  const setScreenOnly = field("screenOnly");
  const setOrder = field("order");
  // Per-scene layout overrides; a scene absent there follows the default above.
  const setSceneLayout = (sceneId: string, key: string | undefined) =>
    set("sceneLayouts", (prev) => {
      const next = { ...prev.sceneLayouts };
      if (key) next[sceneId] = key;
      else delete next[sceneId];
      return { ...prev, sceneLayouts: next };
    });
  const setSceneBackground = (sceneId: string, bg: string | undefined) =>
    set("sceneBackgrounds", (prev) => {
      const next = { ...prev.sceneBackgrounds };
      if (bg) next[sceneId] = bg;
      else delete next[sceneId];
      return { ...prev, sceneBackgrounds: next };
    });
  const setSceneBadge = (
    sceneId: string,
    badge:
      | {
          text: string;
          position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
          background?: string;
          color?: string;
          slice?: number;
        }
      | undefined,
  ) =>
    set("sceneBadges", (prev) => {
      const next = { ...prev.sceneBadges };
      if (badge) {
        next[sceneId] = badge;
        if (!sceneId.includes("#")) {
          delete next[`${sceneId}#1`];
        }
      } else {
        delete next[sceneId];
        if (!sceneId.includes("#")) {
          delete next[`${sceneId}#1`];
        }
      }
      return { ...prev, sceneBadges: next };
    });
  const [isLocaleModalOpen, setIsLocaleModalOpen] = useState(false);
  const [isAppDetailsModalOpen, setIsAppDetailsModalOpen] = useState(false);

  const [appInfo, setAppInfo] = useState<AppInfo>(() => ({
    name: saved.appInfo?.name || manifest.app.name || "",
    subtitle:
      saved.appInfo?.subtitle ||
      manifest.app.subtitle?.[locale] ||
      manifest.app.subtitle?.["en-US"] ||
      Object.values(manifest.app.subtitle || {})[0] ||
      "",
    category: saved.appInfo?.category || manifest.app.category || "",
    developer: saved.appInfo?.developer || manifest.app.developer || "",
    description:
      saved.appInfo?.description ||
      manifest.app.description?.[locale] ||
      manifest.app.description?.["en-US"] ||
      Object.values(manifest.app.description || {})[0] ||
      "",
    icon: saved.appInfo?.icon || saved.appIcon || "",
  }));

  const handleUpdateAppInfo = (newInfo: AppInfo) => {
    setAppInfo(newInfo);
    saveDesign({
      background,
      frame: frame || undefined,
      fontFamily,
      headlineColor: headlineColor || undefined,
      subheadColor: subheadColor || undefined,
      fontSizeScale: fontSizeScale !== 1 ? fontSizeScale : undefined,
      copy: Object.keys(copy).length > 0 ? copy : undefined,
      order: order.length > 0 ? order : undefined,
      template: template === CUSTOM_TEMPLATE ? undefined : template,
      layout,
      screenOnly,
      sceneLayouts: Object.keys(sceneLayouts).length > 0 ? sceneLayouts : undefined,
      sceneBackgrounds: Object.keys(sceneBackgrounds).length > 0 ? sceneBackgrounds : undefined,
      sceneBadges: Object.keys(sceneBadges).length > 0 ? sceneBadges : undefined,
      appInfo: newInfo.name?.trim() ? newInfo : undefined,
      appIcon: newInfo.icon || undefined,
    }).catch((e: Error) => setSaveError(e.message));
  };

  const setSceneCopy = (sceneId: string, fieldName: "headline" | "subhead", text: string) =>
    set(`copy:${sceneId}:${fieldName}`, (prev) => ({
      ...prev,
      copy: {
        ...prev.copy,
        [sceneId]: {
          ...prev.copy[sceneId],
          [fieldName]: { ...prev.copy[sceneId]?.[fieldName], [locale]: text },
        },
      },
    }));

  const setLocaleCopy = (
    sceneId: string,
    fieldName: "headline" | "subhead",
    targetLocale: string,
    text: string,
  ) =>
    set(`copy:${sceneId}:${fieldName}:${targetLocale}`, (prev) => ({
      ...prev,
      copy: {
        ...prev.copy,
        [sceneId]: {
          ...prev.copy[sceneId],
          [fieldName]: { ...prev.copy[sceneId]?.[fieldName], [targetLocale]: text },
        },
      },
    }));

  useEffect(() => {
    storeView(manifest.app.name, { platform, device, locale, dark });
  }, [manifest.app.name, platform, device, locale, dark]);

  // Write the design to disk once it has sat still for a moment; a drag on
  // the gradient picker fires many changes a second. Skips the initial mount
  // so opening the studio never creates the file by itself. An empty frame
  // means the config's custom bezel art, which has nothing to save.
  const [saveError, setSaveError] = useState<string | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      saveDesign({
        background,
        frame: frame || undefined,
        fontFamily,
        headlineColor: headlineColor || undefined,
        subheadColor: subheadColor || undefined,
        fontSizeScale: fontSizeScale !== 1 ? fontSizeScale : undefined,
        copy: Object.keys(copy).length > 0 ? copy : undefined,
        order: order.length > 0 ? order : undefined,
        template: template === CUSTOM_TEMPLATE ? undefined : template,
        layout,
        screenOnly,
        sceneLayouts: Object.keys(sceneLayouts).length > 0 ? sceneLayouts : undefined,
        sceneBackgrounds: Object.keys(sceneBackgrounds).length > 0 ? sceneBackgrounds : undefined,
        sceneBadges: Object.keys(sceneBadges).length > 0 ? sceneBadges : undefined,
        appInfo: appInfo.name?.trim() ? appInfo : undefined,
        appIcon: appInfo.icon || undefined,
      }).then(
        () => setSaveError(null),
        (e: Error) => setSaveError(e.message),
      );
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    background,
    frame,
    fontFamily,
    headlineColor,
    subheadColor,
    fontSizeScale,
    copy,
    order,
    template,
    layout,
    screenOnly,
    sceneLayouts,
    sceneBackgrounds,
    sceneBadges,
    appInfo,
  ]);

  const flushDesign = async () => {
    try {
      await saveDesign({
        background,
        frame: frame || undefined,
        fontFamily,
        headlineColor: headlineColor || undefined,
        subheadColor: subheadColor || undefined,
        fontSizeScale: fontSizeScale !== 1 ? fontSizeScale : undefined,
        copy: Object.keys(copy).length > 0 ? copy : undefined,
        order: order.length > 0 ? order : undefined,
        template: template === CUSTOM_TEMPLATE ? undefined : template,
        layout,
        screenOnly,
        sceneLayouts: Object.keys(sceneLayouts).length > 0 ? sceneLayouts : undefined,
        sceneBackgrounds: Object.keys(sceneBackgrounds).length > 0 ? sceneBackgrounds : undefined,
        sceneBadges: Object.keys(sceneBadges).length > 0 ? sceneBadges : undefined,
        appInfo: appInfo.name?.trim() ? appInfo : undefined,
        appIcon: appInfo.icon || undefined,
      });
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // The bundled typefaces' @font-face rules, declared once in <head>.
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = fontFaces(design.fonts);
    document.head.append(style);
    return () => style.remove();
  }, [design.fonts]);

  // The exporter appends the bundled CJK typeface as a per-glyph fallback, so
  // the preview does the same; otherwise the browser would silently substitute
  // a system font for characters the chosen stack cannot draw. Only the bare
  // stack is saved to goldie.design.json.
  const cjk = design.fonts.find((f) => f.key === "noto-sans-sc");
  const rtlFallbacks = `"Geeza Pro", "Damascus", "Arial", sans-serif`;
  let previewFontFamily =
    cjk && !fontFamily.includes(cjk.family) ? `${fontFamily}, "${cjk.family}"` : fontFamily;
  if (!previewFontFamily.includes("Geeza Pro")) {
    previewFontFamily = `${previewFontFamily}, ${rtlFallbacks}`;
  }

  const platformDevices = manifest.devices.filter((d) => d.platform === platform);
  const spec = platformDevices.find((d) => d.key === device) ?? platformDevices[0];
  const captures = spec ? design.captures[spec.key] : undefined;
  const hasScreenshots = Boolean(
    spec &&
      captures &&
      design.scenes.length > 0 &&
      ((captures.screenshots && captures.screenshots.length > 0) ||
        (captures.clips && captures.clips.length > 0)),
  );
  const frameUrl = frame
    ? `frames/${frame}.png`
    : (design.customFrameUrl ?? `frames/${design.frameVariants[0]}.png`);

  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Prevent browser's default behavior of navigating away or rejecting drops on window
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      if (
        e.dataTransfer &&
        Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files")
      ) {
        e.preventDefault();
      }
    };
    const handleGlobalDrop = (e: DragEvent) => {
      if (
        e.dataTransfer &&
        Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("drop", handleGlobalDrop);
    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, []);

  // Display persistent session toast across page reloads
  useEffect(() => {
    const savedToast = sessionStorage.getItem("appassets_toast") || sessionStorage.getItem("goldie_toast");
    if (savedToast) {
      sessionStorage.removeItem("appassets_toast");
      sessionStorage.removeItem("goldie_toast");
      setToastMessage(savedToast);
    }
  }, []);

  const readFileData = (
    file: File,
  ): Promise<{ name: string; dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        let resolved = false;

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ name: file.name, dataUrl, width: 0, height: 0 });
          }
        }, 1000);

        img.onload = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              name: file.name,
              dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
        };
        img.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ name: file.name, dataUrl, width: 0, height: 0 });
          }
        };
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    const hasFiles =
      e.dataTransfer && Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files");
    if (!hasFiles) return;
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOverCanvas(false);

    const droppedFiles: File[] = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      droppedFiles.push(...Array.from(e.dataTransfer.files));
    } else if (e.dataTransfer.items) {
      for (const item of Array.from(e.dataTransfer.items)) {
        const f = item.getAsFile();
        if (f) droppedFiles.push(f);
      }
    }

    const files = droppedFiles.filter(
      (f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(f.name),
    );
    if (files.length === 0) return;

    setIsImporting(true);
    try {
      const payloads = await Promise.all(files.map((file) => readFileData(file)));
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: payloads,
          preferredDevice: device,
          targetMode: "all",
          autoRoute: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }
      const data = (await res.json()) as {
        ok: boolean;
        imported: number;
        targetDevice?: string;
        targetPlatform?: Platform;
      };

      if (data.targetPlatform && data.targetDevice) {
        storeView(manifest.app.name, {
          platform: data.targetPlatform,
          device: data.targetDevice,
          locale,
          dark,
        });
      }
      sessionStorage.setItem(
        "appassets_toast",
        `✨ Successfully imported ${data.imported || files.length} screenshot(s) into ${data.targetDevice || device}!`,
      );
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import images");
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      <Header
        manifest={manifest}
        dark={dark}
        onDark={setDark}
        hasScreenshots={hasScreenshots}
        background={background}
        frame={frame}
        fontFamily={fontFamily}
        template={template}
        layout={layout}
        screenOnly={screenOnly}
        fontSizeScale={fontSizeScale}
        viewMode={canvasView}
        onViewModeChange={setCanvasView}
        onSaveDesign={flushDesign}
        appInfo={appInfo}
        onOpenAppDetails={() => setIsAppDetailsModalOpen(true)}
        onNavigateToLanding={onNavigateToLanding}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          manifest={manifest}
          platform={platform}
          device={device}
          locale={locale}
          background={background}
          frame={frame}
          fontFamily={fontFamily}
          template={template}
          layout={layout}
          screenOnly={screenOnly}
          headlineColor={headlineColor}
          subheadColor={subheadColor}
          fontSizeScale={fontSizeScale}
          onPlatform={selectPlatform}
          onDevice={setDevice}
          onLocale={setLocale}
          onBackground={setBackground}
          onFrame={setFrame}
          onFontFamily={setFontFamily}
          onTemplate={setTemplate}
          onLayout={setLayout}
          onScreenOnly={setScreenOnly}
          onHeadlineColor={setHeadlineColor}
          onSubheadColor={setSubheadColor}
          onFontSizeScale={setFontSizeScale}
          sceneBadges={sceneBadges}
          onSceneBadge={setSceneBadge}
          sceneBackgrounds={sceneBackgrounds}
          onSceneBackground={setSceneBackground}
          onOpenLocaleManager={() => setIsLocaleModalOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main
            className="relative grid flex-1 place-items-center overflow-auto p-10"
            onDragEnter={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                dragCounter.current++;
                setIsDraggingOverCanvas(true);
              }
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
              }
            }}
            onDragLeave={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                dragCounter.current--;
                if (dragCounter.current <= 0) {
                  dragCounter.current = 0;
                  setIsDraggingOverCanvas(false);
                }
              }
            }}
            onDrop={handleCanvasDrop}
          >
            {isDraggingOverCanvas ? (
              <div className="pointer-events-none absolute inset-6 z-50 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary bg-background/90 backdrop-blur-md shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
                <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadIcon className="size-10 animate-bounce" strokeWidth={2.25} />
                </div>
                <h3 className="text-xl font-bold text-foreground">Drop screenshots here</h3>
                <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                  Screenshots will be framed and applied to{" "}
                  <span className="font-semibold text-foreground">All Devices</span> (iPhone, iPad,
                  & Android).
                </p>
              </div>
            ) : null}

            {isImporting ? (
              <div className="pointer-events-none absolute inset-6 z-50 flex flex-col items-center justify-center rounded-3xl bg-background/90 backdrop-blur-md shadow-2xl animate-in fade-in duration-150">
                <Loader2Icon className="size-12 animate-spin text-primary" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Importing captures across all devices…
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Framing for iPhone, iPad, and Android
                </p>
              </div>
            ) : null}
            {hasScreenshots && spec && captures ? (
              canvasView === "store" ? (
                <StoreMockupPreview
                  manifest={manifest}
                  platform={platform}
                  design={design}
                  captures={captures}
                  spec={spec}
                  locale={locale}
                  background={background}
                  frameUrl={frameUrl}
                  fontFamily={previewFontFamily}
                  headlineColor={headlineColor}
                  subheadColor={subheadColor}
                  fontSizeScale={fontSizeScale}
                  copy={copy}
                  order={order}
                  template={
                    template === CUSTOM_TEMPLATE && Array.isArray(design.template)
                      ? design.template
                      : template
                  }
                  layout={layout}
                  screenOnly={screenOnly}
                  sceneLayouts={sceneLayouts}
                  sceneBackgrounds={sceneBackgrounds}
                  sceneBadges={sceneBadges}
                  appInfo={appInfo}
                  onOpenAppDetails={() => setIsAppDetailsModalOpen(true)}
                />
              ) : canvasView === "promo" ? (
                <PromoBannersStudio
                  manifest={manifest}
                  platform={platform}
                  design={design}
                  captures={captures}
                  spec={spec}
                  locale={locale}
                  background={background}
                  frameUrl={frameUrl}
                  fontFamily={previewFontFamily}
                  headlineColor={headlineColor}
                  subheadColor={subheadColor}
                  fontSizeScale={fontSizeScale}
                  copy={copy}
                  order={order}
                  template={
                    template === CUSTOM_TEMPLATE && Array.isArray(design.template)
                      ? design.template
                      : template
                  }
                  layout={layout}
                  screenOnly={screenOnly}
                  sceneLayouts={sceneLayouts}
                  sceneBackgrounds={sceneBackgrounds}
                  sceneBadges={sceneBadges}
                  appInfo={appInfo}
                />
              ) : (
                <div className="w-full max-w-[1400px]">
                  <Strip
                    manifest={manifest}
                    design={design}
                    captures={captures}
                    spec={spec}
                    locale={locale}
                    background={background}
                    frameUrl={frameUrl}
                    fontFamily={previewFontFamily}
                    headlineColor={headlineColor}
                    subheadColor={subheadColor}
                    fontSizeScale={fontSizeScale}
                    copy={copy}
                    onCopy={setSceneCopy}
                    order={order}
                    onReorder={setOrder}
                    template={
                      template === CUSTOM_TEMPLATE && Array.isArray(design.template)
                        ? design.template
                        : template
                    }
                    layout={layout}
                    screenOnly={screenOnly}
                    sceneLayouts={sceneLayouts}
                    onSceneLayout={setSceneLayout}
                    sceneBackgrounds={sceneBackgrounds}
                    onSceneBackground={setSceneBackground}
                    sceneBadges={sceneBadges}
                    onSceneBadge={setSceneBadge}
                    appInfo={appInfo}
                  />
                </div>
              )
            ) : spec ? (
              <EmptyState
                icon={CameraIcon}
                title={`No screenshots for ${deviceLabel(spec)} yet`}
                body="Drag & drop screenshots anywhere to get started, or browse files to auto-frame:"
                deviceKey={spec.key}
                platform={platform}
                appName={manifest.app.name}
              />
            ) : (
              <EmptyState
                {...ENABLE_PLATFORM[platform]}
                platform={platform}
                appName={manifest.app.name}
              />
            )}
          </main>

          {/* Bottom Docked Ad Banner (Hidden for Pro subscribers) */}
          <div className="shrink-0 px-4 pb-2">
            <AdBanner variant="banner" />
          </div>
        </div>
      </div>

      {toastMessage ? (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
      {saveError ? (
        <Toast
          message={`Could not save design: ${saveError}`}
          onDismiss={() => setSaveError(null)}
        />
      ) : null}

      <LocaleManagerModal
        isOpen={isLocaleModalOpen}
        onClose={() => setIsLocaleModalOpen(false)}
        manifest={manifest}
        design={design}
        copy={copy}
        onUpdateLocaleCopy={setLocaleCopy}
        onRefreshManifest={onRefresh}
        activeLocale={locale}
        onSelectLocale={setLocale}
      />

      <AppDetailsModal
        isOpen={isAppDetailsModalOpen}
        onClose={() => setIsAppDetailsModalOpen(false)}
        appInfo={appInfo}
        onSaveAppInfo={handleUpdateAppInfo}
      />
    </div>
  );
}

/** Everything the undo stack tracks: the design choices saved to goldie.design.json. */
type DesignState = {
  background: string;
  frame: string;
  fontFamily: string;
  headlineColor: string;
  subheadColor: string;
  fontSizeScale: number;
  copy: Record<string, SceneCopy>;
  layout: string;
  /** A built-in template key, "" for none, or CUSTOM_TEMPLATE for the config's own sequence. */
  template: string;
  screenOnly: boolean;
  /** Per-scene layout overrides; a scene absent here follows `layout`. */
  sceneLayouts: Record<string, string>;
  /** Per-scene background overrides. */
  sceneBackgrounds: Record<string, string>;
  /** Per-scene badge decorations. */
  sceneBadges: Record<
    string,
    {
      text: string;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      background?: string;
      color?: string;
      slice?: number;
    }
  >;
  /** Screenshot scene ids as arranged by dragging tiles; empty means the config's order. */
  order: string[];
};

function initialTemplate(design: Design, saved: SavedDesign): string {
  if (saved.template !== undefined && design.templates.some((t) => t.key === saved.template))
    return saved.template;
  if (saved.template === "") return "";
  if (Array.isArray(design.template)) return CUSTOM_TEMPLATE;
  return design.template ?? "";
}

function initialSceneLayouts(
  design: Design,
  saved: SavedDesign,
  knownLayout: (key: string | undefined) => string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const scene of design.scenes) {
    const key = knownLayout(saved.sceneLayouts?.[scene.id]);
    if (key) out[scene.id] = key;
  }
  return out;
}

/** Ids no longer in the config are dropped, new ones follow the saved order. */
function initialOrder(design: Design, saved: SavedDesign): string[] {
  const ids = design.scenes.map((s) => s.id);
  if (!saved.order) return [];
  const kept = saved.order.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

/** Bottom-center notice with auto-dismiss and manual close. */
function Toast({
  message,
  onDismiss,
  duration = 3500,
}: {
  message: string;
  onDismiss?: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  const isSuccess =
    message.includes("✨") ||
    message.toLowerCase().includes("success") ||
    message.toLowerCase().includes("imported");
  const isError =
    message.toLowerCase().includes("could not") ||
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("error");

  const styleClass = isSuccess
    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-background/95 shadow-emerald-500/10"
    : isError
      ? "border-destructive/40 text-destructive bg-background/95 shadow-destructive/10"
      : "border-border text-foreground bg-background/95";

  return (
    <output
      className={`animate-in fade-in slide-in-from-bottom-2 fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border backdrop-blur-md px-4 py-2.5 text-xs font-semibold shadow-xl duration-200 flex items-center gap-3 ${styleClass}`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        className="size-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
        title="Dismiss"
      >
        <X className="size-3" />
      </button>
    </output>
  );
}

type SavedView = { platform?: string; device?: string; locale?: string; dark?: boolean };

const storageKey = (appName: string) => `appassets-studio:${appName}`;
const legacyStorageKey = (appName: string) => `goldie-studio:${appName}`;

function loadView(appName: string): SavedView {
  try {
    const raw =
      localStorage.getItem(storageKey(appName)) ||
      localStorage.getItem(legacyStorageKey(appName));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as SavedView) : {};
  } catch {
    return {};
  }
}

function storeView(appName: string, saved: SavedView): void {
  try {
    localStorage.setItem(storageKey(appName), JSON.stringify(saved));
  } catch {
    // Storage may be unavailable (private mode); the session still works.
  }
}

/** @font-face rules for the bundled typefaces the manifest lists. */
function fontFaces(fonts: BundledFont[]): string {
  return fonts
    .flatMap((font) =>
      font.faces.map((face) => {
        const format = face.url.endsWith(".otf") ? "opentype" : "truetype";
        return `@font-face{font-family:"${font.family}";font-weight:${face.weight};font-style:normal;src:url("${face.url}") format("${format}")}`;
      }),
    )
    .join("\n");
}

/** iOS/iPadOS devices are sizes ("iPhone 6.9", "iPad 13"), so they carry an inch mark, as in the sidebar. */
function deviceLabel(d: DeviceEntry): string {
  return d.platform === "ios" || d.platform === "ipad" ? `${d.label}"` : d.label;
}
