import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FolderArchive,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type {
  AuditAction,
  AuditCheckItem,
  StoreAuditResult,
} from "../lib/storeAudit";
import { Button } from "./ui/button";

export interface StoreAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditResult: StoreAuditResult;
  onAction?: (action: AuditAction) => void;
  onExportZip?: () => void;
}

export function StoreAuditModal({
  isOpen,
  onClose,
  auditResult,
  onAction,
  onExportZip,
}: StoreAuditModalProps) {
  const [selectedTab, setSelectedTab] = useState<"all" | "google-play" | "app-store">("all");

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const displayedChecks: AuditCheckItem[] =
    selectedTab === "google-play"
      ? auditResult.playChecks
      : selectedTab === "app-store"
        ? auditResult.appStoreChecks
        : auditResult.checks;

  const scoreColor =
    auditResult.score >= 90
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : auditResult.score >= 70
        ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
        : "text-red-500 bg-red-500/10 border-red-500/20";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Store Pre-Flight Audit"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-xl border flex items-center justify-center shadow-xs ${
                auditResult.isStoreReady
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}
            >
              {auditResult.isStoreReady ? (
                <ShieldCheck className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Store Pre-Flight Audit</h2>
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-bold font-mono tracking-wider ${scoreColor}`}
                >
                  {auditResult.score}% READY
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Zero-rejection policy verification for Google Play Console & Apple App Store Connect
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Status Summary Banner */}
        <div className="p-6 pb-2 shrink-0">
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
              auditResult.isStoreReady
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200"
                : "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-200"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {auditResult.isStoreReady ? (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xs sm:text-sm font-bold">
                {auditResult.isStoreReady
                  ? "🎉 100% Ready for Store Submission!"
                  : `${auditResult.errorCount} Critical Check(s) & ${auditResult.warningCount} Warning(s) Detected`}
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                {auditResult.isStoreReady
                  ? "Your assets comply with Google Play Console and Apple App Store review guidelines. You can export and submit with confidence."
                  : "Resolving these items will ensure your listing looks professional and prevents app review delays or automated console rejections."}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-2 shrink-0 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                selectedTab === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Checks ({auditResult.totalChecks})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("google-play")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                selectedTab === "google-play"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Google Play ({auditResult.playChecks.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("app-store")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                selectedTab === "app-store"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Apple App Store ({auditResult.appStoreChecks.length})
            </button>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground hidden sm:flex items-center gap-2">
            <span className="text-emerald-500 font-semibold">{auditResult.passedCount} Passed</span>
            <span>•</span>
            <span className="text-amber-500 font-semibold">{auditResult.warningCount} Warnings</span>
            <span>•</span>
            <span className="text-red-500 font-semibold">{auditResult.errorCount} Errors</span>
          </div>
        </div>

        {/* Checklist Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {displayedChecks.map((item) => {
            const isError = item.severity === "error";
            const isWarning = item.severity === "warning";
            const isPass = item.severity === "pass";

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  isError
                    ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
                    : isWarning
                      ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                      : "border-border/80 bg-muted/20 hover:border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isPass ? (
                      <CheckCircle2 className="size-4.5 text-emerald-500" />
                    ) : isWarning ? (
                      <AlertCircle className="size-4.5 text-amber-500" />
                    ) : (
                      <XCircle className="size-4.5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      {item.policyRef && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground border border-border/60">
                          {item.policyRef}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.action && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onAction?.(item.action!);
                    }}
                    className="shrink-0 h-7 px-2.5 text-xs font-semibold rounded-lg text-[#007aff] hover:text-[#006ee6] hover:bg-[#007aff]/10 border-[#007aff]/30 cursor-pointer gap-1"
                  >
                    <span>{item.action.label}</span>
                    <ArrowRight className="size-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="size-3.5 text-[#007aff]" />
            <span>Pre-flight audit updates automatically as you edit</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium rounded-xl cursor-pointer"
            >
              Close
            </Button>

            {onExportZip && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onExportZip();
                }}
                className="h-9 px-4 gap-1.5 text-xs font-bold rounded-xl bg-[#007aff] hover:bg-[#006ee6] active:bg-[#0062cc] text-white shadow-xs cursor-pointer"
              >
                <FolderArchive className="size-3.5" />
                <span>Export Store Package (.ZIP)</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
