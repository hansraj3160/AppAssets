import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  FolderArchive,
  Loader2Icon,
  LogOut,
  MoonIcon,
  Package,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  SunIcon,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import appLogo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext";
import { CUSTOM_TEMPLATE } from "../App";
import { apiFetch } from "../lib/api";
import { getSessionId } from "../lib/session";
import { runStoreAudit } from "../lib/storeAudit";
import { type AppInfo, fontKey, type StoreManifest } from "../manifest";
import { ImportButton } from "./ImportButton";
import { StoreAuditModal } from "./StoreAuditModal";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function Header({
  manifest,
  dark,
  onDark,
  hasScreenshots,
  background,
  frame,
  fontFamily,
  template,
  layout,
  screenOnly,
  fontSizeScale,
  viewMode = "editor",
  onViewModeChange,
  onSaveDesign,
  appInfo,
  onOpenAppDetails,
  onNavigateToLanding,
  onToggleMobileSidebar,
  preferredDevice,
  onRefresh,
  onToast,
}: {
  manifest: StoreManifest;
  dark: boolean;
  onDark: (v: boolean) => void;
  hasScreenshots: boolean;
  background: string;
  frame: string;
  fontFamily: string;
  template: string;
  layout: string;
  screenOnly: boolean;
  fontSizeScale?: number;
  viewMode?: "editor" | "store" | "promo";
  onViewModeChange?: (mode: "editor" | "store" | "promo") => void;
  onSaveDesign?: () => Promise<void>;
  appInfo?: AppInfo;
  onOpenAppDetails?: () => void;
  onNavigateToLanding?: () => void;
  onToggleMobileSidebar?: () => void;
  preferredDevice?: string;
  onRefresh?: () => Promise<void> | void;
  onToast?: (message: string) => void;
}) {
  const { user, isPro, aiCreditsRemaining, signOutUser, openAuthModal, openUpgradeModal } =
    useAuth();
  const [clearing, setClearing] = useState(false);

  // Export pipeline state
  const [exportBusy, setExportBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<string>("");
  const [exportCompleted, setExportCompleted] = useState(false);
  const [exportLog, setExportLog] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  // Selective export targets
  const [exportTargets, setExportTargets] = useState<{
    iphone: boolean;
    ipad: boolean;
    googlePlay: boolean;
    marketing: boolean;
    guidelines: boolean;
  }>({
    iphone: true,
    ipad: true,
    googlePlay: true,
    marketing: true,
    guidelines: true,
  });
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [filterScenesOpen, setFilterScenesOpen] = useState(false);

  const scenes = manifest?.design?.scenes || [];
  const allScenesSelected =
    selectedSceneIds.length === 0 || selectedSceneIds.length === scenes.length;
  const activeSceneCount = allScenesSelected ? scenes.length || 1 : selectedSceneIds.length;
  const hasAnyTarget = Object.values(exportTargets).some(Boolean);

  const estimatedFileCount = useMemo(() => {
    let count = 0;
    if (exportTargets.iphone) count += activeSceneCount;
    if (exportTargets.ipad) count += activeSceneCount;
    if (exportTargets.googlePlay) count += activeSceneCount + 1; // phone + feature graphic
    if (exportTargets.marketing) count += 3; // product hunt, twitter, ig
    if (exportTargets.guidelines) count += 1; // store guide
    if (exportTargets.iphone || exportTargets.ipad) count += 1; // 1024x1024 app icon
    if (exportTargets.googlePlay) count += 1; // 512x512 app icon
    return count;
  }, [exportTargets, activeSceneCount]);

  const getDownloadFilename = () => {
    const appName = manifest.app?.name?.replace(/[^\w.-]/g, "_") || "AppAssets";
    const { iphone, ipad, googlePlay, marketing } = exportTargets;
    if (iphone && !ipad && !googlePlay && !marketing) return `${appName}-AppStore-iPhone.zip`;
    if (!iphone && ipad && !googlePlay && !marketing) return `${appName}-AppStore-iPad.zip`;
    if (!iphone && !ipad && googlePlay && !marketing) return `${appName}-GooglePlay.zip`;
    if (!iphone && !ipad && !googlePlay && marketing) return `${appName}-Marketing-Banners.zip`;
    if (iphone && ipad && !googlePlay && !marketing) return `${appName}-AppStore-All.zip`;
    return `${appName}-store-package.zip`;
  };

  // Live Store Pre-Flight Audit checks (Apple App Store + Google Play)
  const auditResult = useMemo(() => {
    return runStoreAudit({
      manifest,
      appInfo,
      hasScreenshots,
      scenes: manifest?.design?.scenes,
      theme: manifest?.design?.theme,
    });
  }, [manifest, appInfo, hasScreenshots]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the log changes
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [exportLog]);

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to remove all screenshots?")) return;
    setClearing(true);
    try {
      const res = await apiFetch("/api/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        if (onToast) onToast("Removed all screenshots");
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to remove screenshots");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove screenshots");
    } finally {
      setClearing(false);
    }
  };

  function parseProgress(text: string) {
    if (text.includes("[done]")) {
      setExportProgress(100);
      setExportStage("Packaging complete! Store-ready ZIP downloaded.");
      return;
    }
    if (text.includes("$ zip store package") || text.includes("$ zip")) {
      setExportProgress(88);
      setExportStage("Packaging App Store & Google Play ZIP package...");
      return;
    }
    if (text.includes("$ appassets manifest") || text.includes("$ goldie manifest")) {
      setExportProgress(75);
      setExportStage("Updating store manifest metadata...");
      return;
    }
    if (text.includes("$ appassets preview") || text.includes("$ goldie preview")) {
      setExportProgress(55);
      setExportStage("Checking preview video clips...");
      return;
    }
    if (text.includes("$ appassets frame") || text.includes("$ goldie frame")) {
      const frameMatches = text.match(/frame\s+[\w-]+/g);
      const count = frameMatches ? frameMatches.length : 1;
      setExportProgress(Math.min(50, 15 + count * 8));
      setExportStage(`Framing screenshots (${count} processed)...`);
      return;
    }
    setExportProgress(10);
    setExportStage("Preparing rendering engine...");
  }

  async function exportZip() {
    if (exportBusy || !hasScreenshots) return;
    if (!hasAnyTarget) return;
    setExportBusy(true);
    setExportCompleted(false);
    setExportProgress(5);
    setExportStage("Saving latest studio design...");
    setExportLog("");
    setPopoverOpen(true);
    let text = "";

    try {
      if (onSaveDesign) {
        await onSaveDesign().catch(() => {});
      }
      setExportProgress(12);
      setExportStage("Starting store export engine...");

      const font = fontKey(manifest.design, fontFamily);
      const res = await apiFetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background,
          frame,
          font,
          template: template === CUSTOM_TEMPLATE ? undefined : template || "none",
          layout,
          screenOnly,
          fontSizeScale,
          targets: exportTargets,
          selectedScenes:
            selectedSceneIds.length > 0 && selectedSceneIds.length < scenes.length
              ? selectedSceneIds
              : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        setExportLog(`${res.status}: ${await res.text()}`);
        setExportStage("Export failed");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setExportLog(text);
        parseProgress(text);
      }

      if (text.includes("[done]")) {
        setExportCompleted(true);
        const filename = getDownloadFilename();
        const downloadUrl = `/api/export/download?filename=${encodeURIComponent(filename)}&sessionId=${encodeURIComponent(getSessionId())}`;
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        a.click();
      }
    } catch (err) {
      setExportLog(`${text}\n${err instanceof Error ? err.message : err}`);
      setExportStage("Export encountered an error");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/85 px-2 sm:px-4 lg:px-6 backdrop-blur-md select-none text-foreground z-30 gap-1 sm:gap-2.5 lg:gap-4 overflow-x-auto min-w-0">
      {/* Brand & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {onToggleMobileSidebar ? (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="flex md:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#FF6B00]/40 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] dark:text-[#FF8A00] text-xs font-semibold shadow-2xs cursor-pointer transition-colors shrink-0"
            aria-label="Open Design Controls"
            title="Open Design Controls"
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden xs:inline">Controls</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onNavigateToLanding}
          className={`flex items-center gap-2 sm:gap-2.5 text-left transition-all ${
            onNavigateToLanding
              ? "cursor-pointer hover:opacity-85 group rounded-lg focus-visible:ring-2 focus-visible:ring-primary p-0.5"
              : "cursor-default"
          }`}
          title={onNavigateToLanding ? "Return to Landing Page" : undefined}
        >
          <img
            src={appLogo}
            alt="AppAssets Logo"
            className="size-7 sm:size-7.5 rounded-lg shadow-xs object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center text-base sm:text-lg font-bold tracking-tight leading-tight">
              <span className="text-foreground">App</span>
              <span className="text-[#FF6B00]">Assets</span>
              {onNavigateToLanding ? (
                <span className="ml-1.5 sm:ml-2 text-[9px] sm:text-[10px] font-semibold bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-md group-hover:bg-[#FF6B00]/10 group-hover:text-[#FF6B00] transition-colors border border-border/50">
                  Home
                </span>
              ) : null}
            </div>
            <span className="text-[11px] text-muted-foreground font-normal leading-tight mt-0.5 hidden lg:inline">
              Beautiful screenshots for the App Store
            </span>
          </div>
        </button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onDark(!dark)}
          aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"}
          className="size-8 sm:size-8.5 rounded-full border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
        >
          {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </Button>

        {/* Dynamic App Info Button & Badge */}
        {onOpenAppDetails ? (
          <>
            {/* Desktop / 2XL with full text */}
            <button
              type="button"
              onClick={onOpenAppDetails}
              className="hidden 2xl:flex items-center gap-2 rounded-xl border border-[#FF6B00]/25 hover:border-[#FF6B00]/50 bg-background/90 hover:bg-[#FF6B00]/5 px-2.5 py-1.5 transition-all cursor-pointer shadow-2xs group max-w-[180px]"
              title="Click to edit App Name, Category, Description, and Logo"
            >
              <div className="relative size-7 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] text-white shadow-xs shadow-[#FF6B00]/25 flex items-center justify-center font-bold text-xs border border-white/20">
                {appInfo?.icon ? (
                  <img src={appInfo.icon} alt="" className="size-full object-cover" />
                ) : appInfo?.name ? (
                  <span className="drop-shadow-xs">{appInfo.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <Sparkles className="size-3.5 text-white fill-white/30 drop-shadow-xs" />
                )}
              </div>

              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold text-foreground leading-tight group-hover:text-[#FF6B00] transition-colors flex items-center gap-1 truncate">
                  <span className="truncate">{appInfo?.name || "App logo"}</span>
                  <Settings2 className="size-3 text-[#FF6B00]/70 group-hover:text-[#FF6B00] group-hover:rotate-45 transition-all shrink-0" />
                </span>
                <span className="text-[10px] text-[#FF6B00] dark:text-[#FF8A00] font-medium leading-tight truncate">
                  {appInfo?.category || (appInfo?.name ? "App Details" : "Tap to configure")}
                </span>
              </div>
            </button>

            {/* Laptop / Tablet compact badge */}
            <button
              type="button"
              onClick={onOpenAppDetails}
              className="flex 2xl:hidden h-8 px-2 sm:px-2.5 rounded-lg border border-[#FF6B00]/25 hover:border-[#FF6B00]/50 bg-background/90 hover:bg-[#FF6B00]/5 items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 group"
              title="Click to edit App Name, Category, Description, and Logo"
            >
              <div className="relative size-5 shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] text-white flex items-center justify-center font-bold text-[9px]">
                {appInfo?.icon ? (
                  <img src={appInfo.icon} alt="" className="size-full object-cover" />
                ) : appInfo?.name ? (
                  <span>{appInfo.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <Sparkles className="size-3 text-white fill-white/30" />
                )}
              </div>
              <span className="text-xs font-semibold text-foreground group-hover:text-[#FF6B00] hidden md:inline max-w-[80px] truncate">
                {appInfo?.name || "Logo"}
              </span>
            </button>
          </>
        ) : null}
      </div>

      {/* Center: View Switcher (Studio Canvas -> Promo Banner -> Store Preview) */}
      <div className="flex items-center gap-0.5 sm:gap-1 rounded-xl bg-muted/60 dark:bg-muted/40 p-0.5 sm:p-1 border border-border/60 shadow-2xs shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange?.("editor")}
          className={`flex items-center whitespace-nowrap rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            viewMode === "editor"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
          }`}
        >
          <span className="hidden sm:inline">Studio Canvas</span>
          <span className="sm:hidden">Studio</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange?.("promo")}
          className={`flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            viewMode === "promo"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
          }`}
        >
          <span className="hidden sm:inline">Promo Banner</span>
          <span className="sm:hidden">Promo</span>
          <span className="hidden sm:inline rounded-full bg-[#FF6B00]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#FF6B00] dark:text-[#FF8A00] leading-none">
            1024×500
          </span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange?.("store")}
          className={`flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            viewMode === "store"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
          }`}
        >
          <span className="hidden sm:inline">Store Preview</span>
          <span className="sm:hidden">Store</span>
          <span className="hidden sm:inline rounded-full bg-[#FF6B00]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#FF6B00] leading-none">
            Live
          </span>
        </button>
      </div>

      {/* Action Buttons: Audit | Remove | Import | Export */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* 1. Store Pre-Flight Audit Badge */}
        <button
          type="button"
          onClick={() => setIsAuditModalOpen(true)}
          title={`Store Pre-Flight Audit Score: ${auditResult.score}%\n${auditResult.passedCount}/${auditResult.totalChecks} checks passed.\nClick to view recommendations for Google Play & App Store approval.`}
          className={`h-8 px-2 sm:px-2.5 gap-1 sm:gap-1.5 text-xs font-semibold rounded-lg border shadow-2xs cursor-pointer transition-all flex items-center whitespace-nowrap shrink-0 ${
            auditResult.score >= 90
              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              : auditResult.score >= 70
                ? "bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] dark:text-[#FF8A00] border-[#FF6B00]/30"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
          }`}
        >
          <span className="hidden xl:inline">Store Audit</span>
          <span className="xl:hidden hidden sm:inline">Audit</span>
          <span className="font-mono text-[11px] font-bold">{auditResult.score}%</span>
          {auditResult.errorCount > 0 && (
            <span
              className="size-1.5 rounded-full bg-red-500 animate-pulse shrink-0"
              title={`${auditResult.errorCount} critical issue(s)`}
            />
          )}
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-border/60 shrink-0 hidden sm:block" />

        {/* 2. Remove all */}
        {(() => {
          const canClear = hasScreenshots || Boolean(appInfo?.name) || Boolean(appInfo?.icon);
          return (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearAll}
              disabled={clearing || !canClear}
              title={canClear ? "Remove all screenshots & reset app details" : "Nothing to remove"}
              className="h-8 px-2 sm:px-2.5 gap-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/25 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 shadow-2xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              {clearing ? (
                <Loader2Icon className="size-3.5 animate-spin text-red-600 dark:text-red-400" />
              ) : (
                <Trash2 className="size-3.5 text-red-600 dark:text-red-400" />
              )}
              <span className="hidden xl:inline">{clearing ? "Removing..." : "Remove all"}</span>
            </Button>
          );
        })()}

        {/* Divider */}
        <div className="h-4 w-px bg-border/60 shrink-0 hidden sm:block" />

        {/* 3. Import screenshots */}
        <ImportButton
          wrapperClassName="shrink-0"
          className="h-8 px-2 sm:px-3 gap-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground shadow-2xs cursor-pointer transition-colors [&_svg]:size-3.5 whitespace-nowrap shrink-0"
          label="Import"
          preferredDevice={preferredDevice}
          onSuccess={async (count) => {
            if (onToast) onToast(`✨ Successfully imported ${count} screenshot(s)!`);
            if (onRefresh) await onRefresh();
          }}
        />

        {/* Divider */}
        <div className="h-4 w-px bg-border/60 shrink-0 hidden sm:block" />

        {/* 4. Export Store Package (.ZIP) */}
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => {
            if (!hasScreenshots && !exportBusy) return;
            setPopoverOpen(open);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              disabled={!hasScreenshots && !exportBusy}
              title={
                !hasScreenshots
                  ? "Upload screenshots first to export"
                  : "Export store-ready package (.ZIP)"
              }
              className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-lg bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white shadow-xs shadow-[#FF6B00]/20 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-auto disabled:shadow-none whitespace-nowrap shrink-0"
              onClick={() => {
                if (!hasScreenshots && !exportBusy) return;
                if (!exportBusy) {
                  void exportZip();
                } else {
                  setPopoverOpen(true);
                }
              }}
            >
              {exportBusy ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin text-white" />
                  <span>Exporting ({exportProgress}%)</span>
                </>
              ) : exportCompleted ? (
                <>
                  <FolderArchive className="size-3.5 text-white" />
                  <span>Download ZIP Again</span>
                </>
              ) : (
                <>
                  <Package className="size-3.5 text-white" />
                  <span>Export</span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-84 sm:w-92 p-4 shadow-2xl rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  {exportCompleted ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : exportBusy ? (
                    <Loader2Icon className="size-3.5 animate-spin text-[#FF6B00]" />
                  ) : (
                    <Package className="size-4 text-[#FF6B00]" />
                  )}
                  {exportCompleted
                    ? "Store Package Ready!"
                    : exportBusy
                      ? "Packaging Store Assets..."
                      : "One-Click Store Export"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground font-medium">
                  {exportProgress}%
                </span>
              </div>

              {/* Target Stores Breakdown Box with interactive checkboxes */}
              <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-[11px]">
                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                  <span className="font-semibold text-foreground text-[11px] tracking-tight">
                    Select Stores & Assets
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setExportTargets({
                          iphone: true,
                          ipad: true,
                          googlePlay: true,
                          marketing: true,
                          guidelines: true,
                        });
                        setExportCompleted(false);
                      }}
                      className="text-[#FF6B00] hover:underline font-medium cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-muted-foreground/50">&bull;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setExportTargets({
                          iphone: false,
                          ipad: false,
                          googlePlay: false,
                          marketing: false,
                          guidelines: false,
                        });
                        setExportCompleted(false);
                      }}
                      className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* iPhone Checkbox */}
                <label className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors group select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportTargets.iphone}
                      onChange={(e) => {
                        setExportTargets((prev) => ({ ...prev, iphone: e.target.checked }));
                        setExportCompleted(false);
                      }}
                      className="size-3.5 rounded border-border text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                    />
                    <span className="font-medium text-foreground flex items-center gap-1 text-[11px]">
                      🍏 App Store (iPhone)
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[10px] group-hover:text-foreground/80">
                    6.9" &bull; 6.7" ({activeSceneCount} screens)
                  </span>
                </label>

                {/* iPad Checkbox */}
                <label className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors group select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportTargets.ipad}
                      onChange={(e) => {
                        setExportTargets((prev) => ({ ...prev, ipad: e.target.checked }));
                        setExportCompleted(false);
                      }}
                      className="size-3.5 rounded border-border text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                    />
                    <span className="font-medium text-foreground flex items-center gap-1 text-[11px]">
                      🍏 iPad Pro (13")
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[10px] group-hover:text-foreground/80">
                    13" &bull; 12.9" ({activeSceneCount} screens)
                  </span>
                </label>

                {/* Google Play Checkbox */}
                <label className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors group select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportTargets.googlePlay}
                      onChange={(e) => {
                        setExportTargets((prev) => ({ ...prev, googlePlay: e.target.checked }));
                        setExportCompleted(false);
                      }}
                      className="size-3.5 rounded border-border text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                    />
                    <span className="font-medium text-foreground flex items-center gap-1 text-[11px]">
                      🤖 Google Play
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[10px] group-hover:text-foreground/80">
                    Phone & Feature Graphic
                  </span>
                </label>

                {/* Marketing Promo Banners */}
                <label className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors group select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportTargets.marketing}
                      onChange={(e) => {
                        setExportTargets((prev) => ({ ...prev, marketing: e.target.checked }));
                        setExportCompleted(false);
                      }}
                      className="size-3.5 rounded border-border text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                    />
                    <span className="font-medium text-foreground flex items-center gap-1 text-[11px]">
                      🎨 Promo Banners
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[10px] group-hover:text-foreground/80">
                    Product Hunt, X, IG
                  </span>
                </label>

                {/* Guidelines Checkbox */}
                <label className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors group select-none border-t border-border/40 pt-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportTargets.guidelines}
                      onChange={(e) => {
                        setExportTargets((prev) => ({ ...prev, guidelines: e.target.checked }));
                        setExportCompleted(false);
                      }}
                      className="size-3.5 rounded border-border text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                    />
                    <span className="font-medium text-foreground flex items-center gap-1 text-[11px]">
                      <FileText className="size-3 text-muted-foreground" /> Guidelines & Icons
                    </span>
                  </div>
                  <span className="font-mono text-[9px] bg-background/80 px-1 py-0.5 rounded border border-border/50 text-muted-foreground">
                    STORE_GUIDE.txt
                  </span>
                </label>

                {/* Optional Individual Screen Filter */}
                {scenes.length > 1 && (
                  <div className="flex flex-col gap-1 border-t border-border/40 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterScenesOpen((prev) => !prev)}
                      className="flex items-center justify-between text-[10px] font-medium text-muted-foreground hover:text-foreground cursor-pointer py-0.5"
                    >
                      <span className="flex items-center gap-1">
                        <Filter className="size-3 text-[#FF6B00]" />
                        Filter Screens (
                        {allScenesSelected
                          ? `All ${scenes.length}`
                          : `${selectedSceneIds.length} of ${scenes.length}`}
                        )
                      </span>
                      {filterScenesOpen ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                    </button>
                    {filterScenesOpen && (
                      <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pl-1 pr-1 py-1 rounded-lg bg-background/70 border border-border/40">
                        {scenes.map((scene, idx) => {
                          const isChecked =
                            selectedSceneIds.length === 0 || selectedSceneIds.includes(scene.id);
                          const title =
                            scene.headline?.["en-US"] || scene.id || `Screen ${idx + 1}`;
                          return (
                            <label
                              key={scene.id}
                              className="flex items-center gap-1.5 text-[10px] text-foreground hover:bg-muted/50 p-1 rounded cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setExportCompleted(false);
                                  const current =
                                    selectedSceneIds.length === 0
                                      ? scenes.map((s) => s.id)
                                      : [...selectedSceneIds];
                                  if (e.target.checked) {
                                    if (!current.includes(scene.id)) current.push(scene.id);
                                  } else {
                                    const index = current.indexOf(scene.id);
                                    if (index > -1) current.splice(index, 1);
                                  }
                                  setSelectedSceneIds(
                                    current.length === scenes.length ? [] : current,
                                  );
                                }}
                                className="size-3 rounded border-border text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                              />
                              <span className="truncate">
                                {idx + 1}. {title}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>

              {exportStage && (
                <p className="text-[11px] text-muted-foreground truncate font-medium">
                  {exportStage}
                </p>
              )}

              {/* Error Banner */}
              {exportLog !== null && !exportBusy && !exportCompleted && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <p className="font-semibold">Export encountered an issue</p>
                  <pre className="mt-1 max-h-24 overflow-auto font-mono text-[10px] whitespace-pre-wrap">
                    {exportLog}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              {!exportBusy && (
                <div className="flex flex-col gap-2 pt-1">
                  {exportCompleted ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const filename = getDownloadFilename();
                        const downloadUrl = `/api/export/download?filename=${encodeURIComponent(filename)}&sessionId=${encodeURIComponent(getSessionId())}`;
                        const a = document.createElement("a");
                        a.href = downloadUrl;
                        a.download = filename;
                        a.click();
                      }}
                      className="h-8.5 text-xs font-semibold gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                      <FolderArchive className="size-3.5" />
                      <span>Download {manifest.app?.name || "App"} ZIP</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!hasAnyTarget}
                      onClick={() => void exportZip()}
                      className="h-8.5 text-xs font-semibold gap-2 w-full bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white rounded-xl shadow-xs shadow-[#FF6B00]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Package className="size-3.5" />
                      <span>
                        {!hasAnyTarget
                          ? "Select at least 1 asset"
                          : `Generate Store Package (${estimatedFileCount} files)`}
                      </span>
                    </Button>
                  )}
                </div>
              )}

              {/* Collapsible Terminal Output */}
              {exportLog && (
                <div className="flex flex-col gap-1 border-t border-border/40 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLog(!showLog)}
                    className="flex items-center justify-between text-[11px] text-muted-foreground/80 hover:text-foreground cursor-pointer"
                  >
                    <span>Terminal output</span>
                    {showLog ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                  {showLog && (
                    <pre
                      ref={logRef}
                      className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-black/60 p-2 font-mono text-[10px] leading-relaxed text-neutral-200"
                    >
                      {exportLog}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Auth Section */}
        {user ? (
          <div className="flex items-center pl-1.5 border-l border-border/60">
            {/* User Dropdown / Avatar */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`size-8 rounded-full border font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs hover:ring-2 hover:ring-foreground/20 transition-all overflow-hidden shrink-0 ${
                    isPro
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00]"
                  }`}
                  title={user.displayName || user.email || "Account"}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="size-full object-cover" />
                  ) : (
                    <span>{(user.displayName || user.email || "U").charAt(0).toUpperCase()}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-60 p-3.5 rounded-2xl shadow-xl border border-border/80 bg-popover/95 backdrop-blur-md"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {user.displayName || "User"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                  </div>

                  {/* Plan & Credits Summary Box */}
                  <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-2.5 border border-border/50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sparkles className="size-3 text-[#FFB21A]" />
                        Plan Status
                      </span>
                      <span className="font-semibold text-foreground">
                        {isPro ? "Pro (Ad-Free)" : "Free (Ads)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        AI Credits
                      </span>
                      <span className="font-bold font-mono">
                        {isPro ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">
                            Unlimited
                          </span>
                        ) : (
                          <span className="text-[#FF6B00]">{aiCreditsRemaining} remaining</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Pro Plan CTA & Signout */}
                  <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
                    <Button
                      type="button"
                      size="sm"
                      onClick={openUpgradeModal}
                      className={`w-full justify-center text-xs font-bold rounded-xl cursor-pointer h-8.5 px-2.5 gap-1.5 ${
                        isPro
                          ? "variant-outline border-border hover:bg-muted text-foreground"
                          : "bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white shadow-xs"
                      }`}
                    >
                      <Sparkles className="size-3.5 fill-current text-[#FFB21A]" />
                      <span>{isPro ? "Manage Pro Plan" : "Upgrade to Pro"}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => signOutUser()}
                      className="w-full justify-start text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer h-8 px-2"
                    >
                      <LogOut className="size-3.5 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAuthModal}
            className="h-8 px-2.5 sm:px-3 gap-1.5 text-xs font-bold rounded-lg border border-[#FF6B00]/40 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] dark:text-[#FF8A00] shadow-2xs cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            <UserIcon className="size-3.5 shrink-0" />
            <span>Sign In</span>
          </Button>
        )}
      </div>

      {/* Thin animated progress indicator under the header when exporting */}
      {exportBusy && (
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#FFB21A] transition-all duration-300"
          style={{ width: `${exportProgress}%` }}
        />
      )}
      {/* Store Pre-Flight Audit Modal */}
      <StoreAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditResult={auditResult}
        onAction={(action) => {
          setIsAuditModalOpen(false);
          if (action.actionType === "icon-studio" || action.actionType === "app-details") {
            onOpenAppDetails?.();
          } else if (action.actionType === "promo-studio") {
            onViewModeChange?.("promo");
          } else if (action.actionType === "editor-scene") {
            onViewModeChange?.("editor");
          }
        }}
        onExportZip={() => {
          setIsAuditModalOpen(false);
          void exportZip();
        }}
      />
    </header>
  );
}
