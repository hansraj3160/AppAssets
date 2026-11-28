import {
  Building2,
  Check,
  FolderOpen,
  HelpCircle,
  Loader2,
  Package,
  Sparkles,
  Tag,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AppInfo } from "../manifest";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const AppIconModal = lazy(() =>
  import("./AppIconModal").then((m) => ({ default: m.AppIconModal })),
);

export const CATEGORY_OPTIONS = [
  "VPN & Security",
  "Utilities & Tools",
  "Productivity",
  "Finance & Banking",
  "Health & Fitness",
  "Social Networking",
  "Entertainment",
  "Games",
  "Photo & Video",
  "Shopping & E-Commerce",
  "Education",
  "Business",
  "Travel & Local",
  "Food & Drink",
  "Lifestyle",
  "Music & Audio",
  "News & Magazines",
];

export interface AppDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appInfo: AppInfo;
  onSaveAppInfo: (updated: AppInfo) => void;
}

export function AppDetailsModal({ isOpen, onClose, appInfo, onSaveAppInfo }: AppDetailsModalProps) {
  const [name, setName] = useState(appInfo.name || "");
  const [subtitle, setSubtitle] = useState(appInfo.subtitle || "");
  const [category, setCategory] = useState(appInfo.category || "Utilities & Tools");
  const [developer, setDeveloper] = useState(appInfo.developer || "Developer Studio");
  const [description, setDescription] = useState(appInfo.description || "");
  const [icon, setIcon] = useState<string | null>(appInfo.icon || null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);

  // Sync state when modal opens or appInfo updates
  useEffect(() => {
    if (isOpen) {
      setName(appInfo.name || "");
      setSubtitle(appInfo.subtitle || "");
      setCategory(appInfo.category || "Utilities & Tools");
      setDeveloper(appInfo.developer || "Developer Studio");
      setDescription(appInfo.description || "");
      setIcon(appInfo.icon || null);
      setSavedSuccess(false);
    }
  }, [isOpen, appInfo]);

  if (!isOpen) return null;

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIcon(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const res = await apiFetch("/api/icon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          if (res.ok) {
            const data = await res.json();
            setIcon(data.iconUrl || dataUrl);
          } else {
            setIcon(dataUrl);
          }
        } catch {
          setIcon(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // ignore
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleRemoveIcon = async () => {
    setIcon(null);
    try {
      await apiFetch("/api/icon", { method: "DELETE" });
    } catch {}
  };

  const handleApplyFromStudio = async (dataUrl: string) => {
    setIcon(dataUrl);
    try {
      await apiFetch("/api/icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      onSaveAppInfo({
        name: name.trim(),
        subtitle: subtitle.trim(),
        category: category.trim(),
        developer: developer.trim(),
        description: description.trim(),
        icon: dataUrl,
      });
    } catch (err) {
      console.error("Failed to save icon from Studio:", err);
    }
  };

  const handleReset = async () => {
    setName("");
    setSubtitle("");
    setCategory("");
    setDeveloper("");
    setDescription("");
    setIcon(null);
    try {
      await apiFetch("/api/icon", { method: "DELETE" });
    } catch {}
    onSaveAppInfo({
      name: "",
      subtitle: "",
      category: "",
      developer: "",
      description: "",
      icon: undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const updated: AppInfo = {
      name: trimmedName,
      subtitle: subtitle.trim(),
      category: category.trim(),
      developer: developer.trim(),
      description: description.trim(),
      icon: icon || undefined,
    };

    onSaveAppInfo(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const initial = (name.trim() || "A").charAt(0).toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-details-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#FF6B00]/10 text-[#FF6B00]">
              <Package className="size-5" />
            </div>
            <div>
              <h2 id="app-details-dialog-title" className="text-base font-bold text-foreground">
                App Details & Store Listing
              </h2>
              <p className="text-xs text-muted-foreground">
                App details reflect across Store Previews, Promo Banners, and AI Copy
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/80">
            {/* App Icon Preview */}
            <button
              type="button"
              onClick={() => setIsIconModalOpen(true)}
              className="relative size-16 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#FF6B00] to-[#FF8A00] shadow-md flex items-center justify-center text-white font-bold text-2xl border border-white/20 hover:ring-2 hover:ring-[#FF6B00]/50 transition-all cursor-pointer group"
              title="Click to open Icon Studio & Resizer"
            >
              {icon ? (
                <img src={icon} alt={name || "App Icon"} className="size-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Sparkles className="size-5 text-[#FFB21A]" />
              </div>
            </button>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">App Logo / Icon</h4>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/25">
                  512×512 & 1024×1024
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Square PNG, JPEG, or WebP. Appears on Store pages, Promo Banners, and export ZIP.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsIconModalOpen(true)}
                  className="h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-lg bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white cursor-pointer shadow-2xs shadow-[#FF6B00]/20"
                >
                  <Sparkles className="size-3.5 text-[#FFB21A]" />
                  <span>Icon Studio & Resizer</span>
                </Button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-foreground hover:bg-muted/80 cursor-pointer shadow-2xs border border-border/80 transition-colors">
                  {uploadingIcon ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5 text-muted-foreground" />
                  )}
                  <span>{icon ? "Upload File" : "Quick Upload"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleIconUpload}
                    className="sr-only"
                  />
                </label>

                {icon ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveIcon}
                    className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    <span>Remove</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* App Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="app-details-name"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Type className="size-3.5 text-[#FF6B00]" />
                  App Name
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  e.g. Pocket App, Habitify, TaskMaster
                </span>
              </label>
              <Input
                id="app-details-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My App"
                className="h-9.5 text-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label
                htmlFor="app-details-category"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Tag className="size-3.5 text-[#FF6B00]" />
                  Category
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Guides AI copywriter & Store Listing
                </span>
              </label>
              <div className="flex gap-2">
                <select
                  id="app-details-category"
                  value={CATEGORY_OPTIONS.includes(category) ? category : "custom"}
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      setCategory(e.target.value);
                    }
                  }}
                  className="flex h-9.5 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="custom">Other / Custom...</option>
                </select>

                {!CATEGORY_OPTIONS.includes(category) ? (
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Custom category"
                    className="h-9.5 text-sm max-w-[180px]"
                  />
                ) : null}
              </div>
            </div>

            {/* Subtitle / Marketing Tagline */}
            <div className="space-y-1.5">
              <label
                htmlFor="app-details-subtitle"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#FFB21A]" />
                  Subtitle / Marketing Tagline
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Under App Name in App Store & Banners
                </span>
              </label>
              <Input
                id="app-details-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Fast, Secure & Private WireGuard VPN"
                className="h-9.5 text-sm"
              />
            </div>

            {/* Developer / Studio Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="app-details-developer"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-[#FF6B00]" />
                  Developer / Company Name
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Shown on Store Mockup
                </span>
              </label>
              <Input
                id="app-details-developer"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="e.g. Zunava Technologies"
                className="h-9.5 text-sm"
              />
            </div>

            {/* Description / Summary */}
            <div className="space-y-1.5">
              <label
                htmlFor="app-details-desc"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="size-3.5 text-[#FF6B00]" />
                  App Description / Summary
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Helps AI copywriter understand core benefits
                </span>
              </label>
              <textarea
                id="app-details-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Track daily habits, set smart reminders, and achieve your personal goals with intuitive widgets."
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer h-8 px-2.5"
            >
              Clear Details
            </Button>
            <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <HelpCircle className="size-3.5" />
              Changes sync automatically to all studio modes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="gap-1.5 bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white font-semibold shadow-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="size-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Apply & Save Details</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* App Icon Studio & Resizer Dialog */}
      {isIconModalOpen ? (
        <Suspense fallback={null}>
          <AppIconModal
            isOpen={isIconModalOpen}
            onClose={() => setIsIconModalOpen(false)}
            currentIcon={icon}
            appName={name || "App"}
            onApplyIcon={handleApplyFromStudio}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
