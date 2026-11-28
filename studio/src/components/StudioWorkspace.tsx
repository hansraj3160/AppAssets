import {
  CameraIcon,
  Loader2Icon,
  type LucideIcon,
  SmartphoneIcon,
  Sparkles,
  TabletIcon,
  UploadIcon,
  X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StudioUiContext,
  type StudioUiState,
  StudioViewportContext,
  type StudioViewportState,
} from "../context/StudioContext";
import { trackAppImported } from "../lib/analytics";
import { apiFetch } from "../lib/api";
import { shouldAutoStartTour, TOUR_STORAGE_KEY } from "../lib/onboardingTour";
import {
  buildAppInfo,
  buildDesignState,
  buildSavePayload,
  CUSTOM_TEMPLATE,
  type DesignState,
  deviceLabel,
  filterSceneRecord,
  fontFaces,
  initialOrder,
  loadView,
  type Platform,
  readImageFileData,
  SAVE_DEBOUNCE_MS,
  shouldLoadCjkFont,
  storeView,
} from "../lib/studioState";
import { useHistory } from "../lib/useHistory";
import { type AppInfo, type SavedDesign, type StoreManifest, saveDesign } from "../manifest";
import { AdBanner } from "./AdBanner";
import { EmptyState } from "./EmptyState";
import { FontLoader } from "./FontLoader";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Strip } from "./Strip";
import { Toast } from "./Toast";

const StoreMockupPreview = lazy(() =>
  import("./StoreMockupPreview").then((m) => ({ default: m.StoreMockupPreview })),
);
const PromoBannersStudio = lazy(() =>
  import("./PromoBannersStudio").then((m) => ({ default: m.PromoBannersStudio })),
);
const LocaleManagerModal = lazy(() =>
  import("./LocaleManagerModal").then((m) => ({ default: m.LocaleManagerModal })),
);
const AppDetailsModal = lazy(() =>
  import("./AppDetailsModal").then((m) => ({ default: m.AppDetailsModal })),
);
const StudioOnboardingTour = lazy(() =>
  import("./StudioOnboardingTour").then((m) => ({ default: m.StudioOnboardingTour })),
);

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

function CanvasLazyFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2Icon className="size-7 animate-spin text-primary" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

export interface StudioWorkspaceProps {
  manifest: StoreManifest;
  saved: SavedDesign;
  sessionId: string;
  refreshId: number;
  onRefresh: () => Promise<void> | void;
  dark: boolean;
  setDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  toastMessage: string | null;
  onToast: (msg: string | null) => void;
  onNavigateToLanding?: () => void;
}

export function StudioWorkspace({
  manifest,
  saved,
  sessionId,
  refreshId,
  onRefresh,
  dark,
  setDark,
  toastMessage,
  onToast,
  onNavigateToLanding,
}: StudioWorkspaceProps) {
  const setToastMessage = onToast;
  const design = manifest.design;
  const view = useMemo(() => loadView(manifest.app.name), [manifest.app.name]);

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

  const selectPlatform = useCallback(
    (p: Platform) => {
      setPlatform(p);
      const devices = manifest.devices.filter((d) => d.platform === p);
      setDevice((currentDevice) =>
        devices.length > 0 && !devices.some((d) => d.key === currentDevice)
          ? devices[0]!.key
          : currentDevice,
      );
    },
    [manifest.devices],
  );

  const [locale, setLocale] = useState(
    view.locale && manifest.locales.includes(view.locale)
      ? view.locale
      : (manifest.locales[0] ?? ""),
  );
  const iphoneSize = "1206x2622" as const;
  const [canvasView, setCanvasView] = useState<"editor" | "store" | "promo">("editor");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return shouldAutoStartTour({
        storageValue: localStorage.getItem(TOUR_STORAGE_KEY),
        search: window.location.search,
      });
    } catch {
      return false;
    }
  });
  const [showMobileTip, setShowMobileTip] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("dismissed_mobile_tip");
  });
  const [isLocaleModalOpen, setIsLocaleModalOpen] = useState(false);
  const [isAppDetailsModalOpen, setIsAppDetailsModalOpen] = useState(false);

  const knownLayout = useCallback(
    (key: string | undefined) =>
      key && design.layouts.some((l) => l.key === key) ? key : undefined,
    [design.layouts],
  );

  const { state, set, reset } = useHistory<DesignState>(() =>
    buildDesignState(design, saved, knownLayout),
  );

  const {
    background,
    frame,
    fontFamily,
    headlineColor,
    subheadColor,
    fontSizeScale,
    backgroundPattern,
    patternOpacity,
    patternColor,
    deviceBacklight,
    panoramaMode,
    copy,
    layout,
    template,
    screenOnly,
    sceneLayouts,
    sceneBackgrounds,
    sceneBadges,
    order,
  } = state;

  const setBackground = useCallback(
    (value: DesignState["background"]) => set("background", (prev) => ({ ...prev, background: value })),
    [set],
  );
  const setFrame = useCallback(
    (value: DesignState["frame"]) => set("frame", (prev) => ({ ...prev, frame: value })),
    [set],
  );
  const setFontFamily = useCallback(
    (value: DesignState["fontFamily"]) => set("fontFamily", (prev) => ({ ...prev, fontFamily: value })),
    [set],
  );
  const setHeadlineColor = useCallback(
    (value: DesignState["headlineColor"]) =>
      set("headlineColor", (prev) => ({ ...prev, headlineColor: value })),
    [set],
  );
  const setSubheadColor = useCallback(
    (value: DesignState["subheadColor"]) =>
      set("subheadColor", (prev) => ({ ...prev, subheadColor: value })),
    [set],
  );
  const setFontSizeScale = useCallback(
    (value: DesignState["fontSizeScale"]) =>
      set("fontSizeScale", (prev) => ({ ...prev, fontSizeScale: value })),
    [set],
  );
  const setBackgroundPattern = useCallback(
    (value: DesignState["backgroundPattern"]) =>
      set("backgroundPattern", (prev) => ({ ...prev, backgroundPattern: value })),
    [set],
  );
  const setPatternOpacity = useCallback(
    (value: DesignState["patternOpacity"]) =>
      set("patternOpacity", (prev) => ({ ...prev, patternOpacity: value })),
    [set],
  );
  const setPatternColor = useCallback(
    (value: DesignState["patternColor"]) =>
      set("patternColor", (prev) => ({ ...prev, patternColor: value })),
    [set],
  );
  const setDeviceBacklight = useCallback(
    (value: DesignState["deviceBacklight"]) =>
      set("deviceBacklight", (prev) => ({ ...prev, deviceBacklight: value })),
    [set],
  );
  const setPanoramaMode = useCallback(
    (value: DesignState["panoramaMode"]) =>
      set("panoramaMode", (prev) => ({ ...prev, panoramaMode: value })),
    [set],
  );
  const setLayout = useCallback(
    (value: DesignState["layout"]) => set("layout", (prev) => ({ ...prev, layout: value })),
    [set],
  );
  const setTemplate = useCallback(
    (value: string) => set("template", (prev) => ({ ...prev, template: value, sceneLayouts: {} })),
    [set],
  );
  const setScreenOnly = useCallback(
    (value: DesignState["screenOnly"]) => set("screenOnly", (prev) => ({ ...prev, screenOnly: value })),
    [set],
  );
  const setOrder = useCallback(
    (value: DesignState["order"]) => set("order", (prev) => ({ ...prev, order: value })),
    [set],
  );

  const setSceneLayout = useCallback(
    (sceneId: string, key: string | undefined) =>
      set("sceneLayouts", (prev) => {
        const next = { ...prev.sceneLayouts };
        if (key) next[sceneId] = key;
        else delete next[sceneId];
        return { ...prev, sceneLayouts: next };
      }),
    [set],
  );

  const setSceneBackground = useCallback(
    (sceneId: string, bg: string | undefined) =>
      set("sceneBackgrounds", (prev) => {
        const next = { ...prev.sceneBackgrounds };
        if (bg) next[sceneId] = bg;
        else delete next[sceneId];
        return { ...prev, sceneBackgrounds: next };
      }),
    [set],
  );

  const setSceneBadge = useCallback(
    (
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
          if (!sceneId.includes("#")) delete next[`${sceneId}#1`];
        } else {
          delete next[sceneId];
          if (!sceneId.includes("#")) delete next[`${sceneId}#1`];
        }
        return { ...prev, sceneBadges: next };
      }),
    [set],
  );

  const [appInfo, setAppInfo] = useState<AppInfo>(() => buildAppInfo(manifest, saved, locale));
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasDirtyChangesRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);

  const handleUpdateAppInfo = useCallback(
    (newInfo: AppInfo) => {
      setAppInfo(newInfo);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      hasDirtyChangesRef.current = false;
      saveDesign(buildSavePayload(state, newInfo), sessionId).catch((e: Error) =>
        setSaveError(e.message),
      );
    },
    [sessionId, state],
  );

  const setSceneCopy = useCallback(
    (sceneId: string, fieldName: "headline" | "subhead", text: string) =>
      set(`copy:${sceneId}:${fieldName}`, (prev) => ({
        ...prev,
        copy: {
          ...prev.copy,
          [sceneId]: {
            ...prev.copy[sceneId],
            [fieldName]: { ...prev.copy[sceneId]?.[fieldName], [locale]: text },
          },
        },
      })),
    [locale, set],
  );

  const setLocaleCopy = useCallback(
    (sceneId: string, fieldName: "headline" | "subhead", targetLocale: string, text: string) =>
      set(`copy:${sceneId}:${fieldName}:${targetLocale}`, (prev) => ({
        ...prev,
        copy: {
          ...prev.copy,
          [sceneId]: {
            ...prev.copy[sceneId],
            [fieldName]: { ...prev.copy[sceneId]?.[fieldName], [targetLocale]: text },
          },
        },
      })),
    [set],
  );

  useEffect(() => {
    storeView(manifest.app.name, { platform, device, locale, dark });
  }, [manifest.app.name, platform, device, locale, dark]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    hasDirtyChangesRef.current = true;
    const payload = buildSavePayload(state, appInfo);
    const timer = setTimeout(() => {
      saveTimerRef.current = null;
      hasDirtyChangesRef.current = false;
      saveDesign(payload, sessionId).then(
        () => setSaveError(null),
        (e: Error) => setSaveError(e.message),
      );
    }, SAVE_DEBOUNCE_MS);
    saveTimerRef.current = timer;
    return () => {
      clearTimeout(timer);
      if (saveTimerRef.current === timer) {
        saveTimerRef.current = null;
      }
    };
  }, [state, appInfo, sessionId]);

  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const latestLocaleRef = useRef(locale);
  latestLocaleRef.current = locale;
  const lastRefreshIdRef = useRef(refreshId);

  useEffect(() => {
    if (lastRefreshIdRef.current === refreshId) return;
    lastRefreshIdRef.current = refreshId;

    const curLocale = latestLocaleRef.current;
    const resolvedLocale =
      manifest.locales.length > 0 && !manifest.locales.includes(curLocale)
        ? manifest.locales[0]!
        : curLocale;
    if (resolvedLocale !== curLocale) {
      setLocale(resolvedLocale);
    }

    const validKnownLayout = (key: string | undefined) =>
      key && manifest.design.layouts.some((l) => l.key === key) ? key : undefined;
    const fromServer = buildDesignState(manifest.design, saved, validKnownLayout);
    const validSceneIds = new Set(manifest.design.scenes.map((s) => s.id));
    const serverCleared = validSceneIds.size === 0 && !saved.order?.length;

    if (serverCleared || !hasDirtyChangesRef.current) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      skipNextAutoSaveRef.current = true;
      hasDirtyChangesRef.current = false;
      reset(fromServer);
      setAppInfo(buildAppInfo(manifest, saved, resolvedLocale));
    } else {
      const prev = latestStateRef.current;
      const mergedOrderSource = prev.order.length > 0 ? prev.order : (saved.order ?? []);
      reset({
        ...prev,
        order: initialOrder(manifest.design, { ...saved, order: mergedOrderSource }),
        copy: filterSceneRecord(
          Object.keys(prev.copy).length > 0 ? prev.copy : fromServer.copy,
          validSceneIds,
        ),
        sceneLayouts: filterSceneRecord(prev.sceneLayouts, validSceneIds),
        sceneBackgrounds: filterSceneRecord(prev.sceneBackgrounds, validSceneIds),
        sceneBadges: filterSceneRecord(prev.sceneBadges, validSceneIds),
      });
      if (saved.appInfo || saved.appIcon) {
        setAppInfo(buildAppInfo(manifest, saved, resolvedLocale));
      }
    }
  }, [refreshId, manifest, saved, reset]);

  const flushDesign = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    hasDirtyChangesRef.current = false;
    try {
      await saveDesign(buildSavePayload(state, appInfo), sessionId);
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  }, [appInfo, sessionId, state]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = fontFaces(design.fonts);
    document.head.append(style);
    return () => style.remove();
  }, [design.fonts]);

  const cjkFont = useMemo(
    () => design.fonts.find((f) => f.key === "noto-sans-sc"),
    [design.fonts],
  );
  const needsCjk = useMemo(
    () => shouldLoadCjkFont({ locale, fontFamily, copy, scenes: design.scenes }),
    [locale, fontFamily, copy, design.scenes],
  );

  const previewFontFamily = useMemo(() => {
    const rtlFallbacks = `"Geeza Pro", "Damascus", "Arial", sans-serif`;
    let resolved =
      needsCjk && cjkFont && !fontFamily.includes(cjkFont.family)
        ? `${fontFamily}, "${cjkFont.family}"`
        : fontFamily;
    if (!resolved.includes("Geeza Pro")) {
      resolved = `${resolved}, ${rtlFallbacks}`;
    }
    return resolved;
  }, [cjkFont, fontFamily, needsCjk]);

  const platformDevices = useMemo(
    () => manifest.devices.filter((d) => d.platform === platform),
    [manifest.devices, platform],
  );
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

  const resolvedTemplate =
    template === CUSTOM_TEMPLATE && Array.isArray(design.template) ? design.template : template;

  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const preventFileDrag = (e: DragEvent) => {
      if (
        e.dataTransfer &&
        Array.from(e.dataTransfer.types).some((t) => t.toLowerCase() === "files")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("dragover", preventFileDrag);
    window.addEventListener("drop", preventFileDrag);
    return () => {
      window.removeEventListener("dragover", preventFileDrag);
      window.removeEventListener("drop", preventFileDrag);
    };
  }, []);

  useEffect(() => {
    const savedToast =
      sessionStorage.getItem("appassets_toast") || sessionStorage.getItem("goldie_toast");
    if (savedToast) {
      sessionStorage.removeItem("appassets_toast");
      sessionStorage.removeItem("goldie_toast");
      setToastMessage(savedToast);
    }
  }, [setToastMessage]);

  const handleImportResult = useCallback(
    async (result: { imported?: number; targetDevice?: string; targetPlatform?: Platform }) => {
      if (result.targetPlatform && result.targetDevice) {
        storeView(manifest.app.name, {
          platform: result.targetPlatform,
          device: result.targetDevice,
          locale,
          dark,
        });
        if (result.targetPlatform !== platform) setPlatform(result.targetPlatform);
        if (result.targetDevice !== device) setDevice(result.targetDevice);
      }
      setToastMessage(`✨ Successfully imported ${result.imported || 1} screenshot(s)!`);
      await onRefresh();
    },
    [dark, device, locale, manifest.app.name, onRefresh, platform, setToastMessage],
  );

  const handleCanvasDrop = useCallback(
    async (e: React.DragEvent) => {
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
        const payloads = await Promise.all(files.map((file) => readImageFileData(file)));
        const res = await apiFetch("/api/import", {
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

        trackAppImported({
          source: "file_input",
          import_type: "batch_import",
          count: data.imported || files.length,
          device: data.targetDevice || device,
        });

        if (data.targetPlatform && data.targetDevice) {
          storeView(manifest.app.name, {
            platform: data.targetPlatform,
            device: data.targetDevice,
            locale,
            dark,
          });
          if (data.targetPlatform !== platform) setPlatform(data.targetPlatform);
          if (data.targetDevice !== device) setDevice(data.targetDevice);
        }
        setToastMessage(
          `✨ Successfully imported ${data.imported || files.length} screenshot(s) into ${data.targetDevice || device}!`,
        );
        await onRefresh();
      } catch (err) {
        setToastMessage(
          `Failed to import images: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsImporting(false);
      }
    },
    [dark, device, locale, manifest.app.name, onRefresh, platform, setToastMessage],
  );

  const viewportContextValue = useMemo<StudioViewportState>(
    () => ({
      platform,
      device,
      locale,
      dark,
      setPlatform: selectPlatform,
      setDevice,
      setLocale,
      setDark,
    }),
    [platform, device, locale, dark, selectPlatform, setDark],
  );

  const uiContextValue = useMemo<StudioUiState>(
    () => ({
      canvasView,
      setCanvasView,
      isLocaleModalOpen,
      setIsLocaleModalOpen,
      isAppDetailsModalOpen,
      setIsAppDetailsModalOpen,
      isMobileSidebarOpen,
      setIsMobileSidebarOpen,
      isTourOpen,
      setIsTourOpen,
    }),
    [canvasView, isLocaleModalOpen, isAppDetailsModalOpen, isMobileSidebarOpen, isTourOpen],
  );

  const openLocaleManager = useCallback(() => setIsLocaleModalOpen(true), []);
  const closeLocaleManager = useCallback(() => setIsLocaleModalOpen(false), []);
  const openAppDetails = useCallback(() => setIsAppDetailsModalOpen(true), []);
  const closeAppDetails = useCallback(() => setIsAppDetailsModalOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen((prev) => !prev), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const startTour = useCallback(() => setIsTourOpen(true), []);
  const notifyToast = useCallback((msg: string) => setToastMessage(msg), [setToastMessage]);
  const dismissToast = useCallback(() => setToastMessage(null), [setToastMessage]);
  const dismissSaveError = useCallback(() => setSaveError(null), []);

  const sharedSidebarProps = {
    manifest,
    platform,
    device,
    locale,
    background,
    frame,
    fontFamily,
    template,
    layout,
    screenOnly,
    headlineColor,
    subheadColor,
    fontSizeScale,
    backgroundPattern,
    patternOpacity,
    patternColor,
    deviceBacklight,
    panoramaMode,
    onPlatform: selectPlatform,
    onDevice: setDevice,
    onLocale: setLocale,
    onBackground: setBackground,
    onFrame: setFrame,
    onFontFamily: setFontFamily,
    onTemplate: setTemplate,
    onLayout: setLayout,
    onScreenOnly: setScreenOnly,
    onHeadlineColor: setHeadlineColor,
    onSubheadColor: setSubheadColor,
    onFontSizeScale: setFontSizeScale,
    onBackgroundPattern: setBackgroundPattern,
    onPatternOpacity: setPatternOpacity,
    onPatternColor: setPatternColor,
    onDeviceBacklight: setDeviceBacklight,
    onPanoramaMode: setPanoramaMode,
    sceneBadges,
    onSceneBadge: setSceneBadge,
    sceneBackgrounds,
    onSceneBackground: setSceneBackground,
    onOpenLocaleManager: openLocaleManager,
    onRefresh,
    onToast: notifyToast,
  };

  return (
    <StudioViewportContext.Provider value={viewportContextValue}>
      <StudioUiContext.Provider value={uiContextValue}>
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
            onOpenAppDetails={openAppDetails}
            onNavigateToLanding={onNavigateToLanding}
            onToggleMobileSidebar={toggleMobileSidebar}
            preferredDevice={device}
            onRefresh={onRefresh}
            onToast={notifyToast}
            onStartTour={startTour}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Desktop static sidebar */}
            <div className="hidden md:flex h-full shrink-0">
              <Sidebar {...sharedSidebarProps} />
            </div>

            {/* Mobile Slide-Over Drawer */}
            {isMobileSidebarOpen ? (
              <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                  onClick={closeMobileSidebar}
                  aria-hidden="true"
                />
                <div className="relative z-10 w-[85vw] max-w-[340px] h-full bg-sidebar shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                  <Sidebar {...sharedSidebarProps} onCloseMobile={closeMobileSidebar} />
                </div>
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
              {showMobileTip ? (
                <div className="flex md:hidden items-center justify-between px-3 py-1.5 bg-[#FF6B00]/10 border-b border-[#FF6B00]/20 text-[11px] text-foreground shrink-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <Sparkles className="size-3 text-[#FF6B00] shrink-0" />
                    <span className="truncate">
                      Tip: Studio is best experienced on Mac/Desktop for drag & drop & 4K exports.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTip(false);
                      sessionStorage.setItem("dismissed_mobile_tip", "1");
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer ml-2"
                    aria-label="Dismiss tip"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : null}

              <main
                data-tour="canvas-stage"
                className="relative grid flex-1 place-items-center overflow-auto p-3 sm:p-6 md:p-10"
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
                <FontLoader
                  locale={locale}
                  previewMode={canvasView}
                  fontKey={cjkFont?.key}
                  fontFamily={fontFamily}
                  stylesheetUrl={cjkFont?.stylesheetUrl}
                  copy={copy}
                  scenes={design.scenes}
                />

                {isDraggingOverCanvas ? (
                  <div className="pointer-events-none absolute inset-6 z-50 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary bg-background/90 backdrop-blur-md shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
                    <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadIcon className="size-10 animate-bounce" strokeWidth={2.25} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Drop screenshots here</h3>
                    <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                      Screenshots will be framed and applied to{" "}
                      <span className="font-semibold text-foreground">All Devices</span> (iPhone,
                      iPad, & Android).
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
                    <Suspense fallback={<CanvasLazyFallback label="Loading Store Preview..." />}>
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
                        template={resolvedTemplate}
                        layout={layout}
                        screenOnly={screenOnly}
                        sceneLayouts={sceneLayouts}
                        sceneBackgrounds={sceneBackgrounds}
                        sceneBadges={sceneBadges}
                        appInfo={appInfo}
                        onOpenAppDetails={openAppDetails}
                      />
                    </Suspense>
                  ) : canvasView === "promo" ? (
                    <Suspense
                      fallback={<CanvasLazyFallback label="Loading Promo Banners Studio..." />}
                    >
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
                        template={resolvedTemplate}
                        layout={layout}
                        screenOnly={screenOnly}
                        sceneLayouts={sceneLayouts}
                        sceneBackgrounds={sceneBackgrounds}
                        sceneBadges={sceneBadges}
                        appInfo={appInfo}
                      />
                    </Suspense>
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
                        backgroundPattern={backgroundPattern}
                        patternOpacity={patternOpacity}
                        patternColor={patternColor}
                        deviceBacklight={deviceBacklight}
                        panoramaMode={panoramaMode}
                        copy={copy}
                        onCopy={setSceneCopy}
                        order={order}
                        onReorder={setOrder}
                        template={resolvedTemplate}
                        layout={layout}
                        screenOnly={screenOnly}
                        sceneLayouts={sceneLayouts}
                        onSceneLayout={setSceneLayout}
                        sceneBackgrounds={sceneBackgrounds}
                        onSceneBackground={setSceneBackground}
                        sceneBadges={sceneBadges}
                        onSceneBadge={setSceneBadge}
                        iphoneSize={iphoneSize}
                        appInfo={appInfo}
                        onRefresh={onRefresh}
                        onToast={notifyToast}
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
                    onImportSuccess={handleImportResult}
                  />
                ) : (
                  <EmptyState
                    {...ENABLE_PLATFORM[platform]}
                    platform={platform}
                    appName={manifest.app.name}
                    onImportSuccess={handleImportResult}
                  />
                )}
              </main>

              <div className="shrink-0 px-4 pb-2">
                <AdBanner variant="banner" />
              </div>
            </div>
          </div>

          {toastMessage ? <Toast message={toastMessage} onDismiss={dismissToast} /> : null}
          {saveError ? (
            <Toast message={`Could not save design: ${saveError}`} onDismiss={dismissSaveError} />
          ) : null}

          {isLocaleModalOpen ? (
            <Suspense fallback={null}>
              <LocaleManagerModal
                isOpen={isLocaleModalOpen}
                onClose={closeLocaleManager}
                manifest={manifest}
                design={design}
                copy={copy}
                onUpdateLocaleCopy={setLocaleCopy}
                onRefreshManifest={onRefresh}
                activeLocale={locale}
                onSelectLocale={setLocale}
              />
            </Suspense>
          ) : null}

          {isAppDetailsModalOpen ? (
            <Suspense fallback={null}>
              <AppDetailsModal
                isOpen={isAppDetailsModalOpen}
                onClose={closeAppDetails}
                appInfo={appInfo}
                onSaveAppInfo={handleUpdateAppInfo}
              />
            </Suspense>
          ) : null}

          {isTourOpen ? (
            <Suspense fallback={null}>
              <StudioOnboardingTour
                isOpen={isTourOpen}
                onComplete={() => {
                  setIsTourOpen(false);
                  try {
                    localStorage.setItem(TOUR_STORAGE_KEY, "completed");
                  } catch {
                    // Ignore localStorage errors
                  }
                  setToastMessage("Studio tour complete — drag in screenshots to begin!");
                }}
                onSkip={() => {
                  setIsTourOpen(false);
                  try {
                    localStorage.setItem(TOUR_STORAGE_KEY, "dismissed");
                  } catch {
                    // Ignore localStorage errors
                  }
                }}
                screenOnly={screenOnly}
                onScreenOnly={setScreenOnly}
                frame={frame}
                onFrame={setFrame}
                frameVariants={design.frameVariants}
                viewMode={canvasView}
                onViewModeChange={setCanvasView}
                onRequestMobileSidebar={setIsMobileSidebarOpen}
              />
            </Suspense>
          ) : null}
        </div>
      </StudioUiContext.Provider>
    </StudioViewportContext.Provider>
  );
}
